/**
 * Orders module - business logic.
 *
 * `place` is the only mutating call on the customer side. It runs in a
 * single Prisma transaction that:
 *   1. Re-validates every cart line against live stock and live prices.
 *   2. Creates the shipping + (optional) billing address rows.
 *   3. Decrements stock atomically.
 *   4. Creates the order + items + payment intent + shipment + status row.
 *   5. Hands off to the payment provider (COD: no-op; gateways: session).
 *   6. Clears the cart.
 *   7. Sends the order-confirmation email (outside the txn).
 *
 * Any failure inside the txn rolls back stock + order + payment + cart
 * clear together. The status transition method (`_transition`) similarly
 * delegates the payment side effects to the active payment provider.
 */
import crypto from 'node:crypto';
import { prisma } from '@anzara/database';
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { emailService } from '../../lib/email';
import { ordersRepository } from './repository';
import { cartsRepository } from '../cart/repository';
import { toOrderDto } from './dto';
import { computeCartTotals } from '../cart/totals';
import { canTransition } from './state-machine';
import { getPaymentProvider, type PaymentMethodContext } from '../payments';
import { couponsService } from '../coupons';
import { orderConfirmationEmail, orderStatusEmail } from './email-templates';
import type {
  CreateOrderInput,
  OrderFilterInput,
  UpdateOrderStatusInput,
  OrderNoteInput,
} from '@anzara/validators';
import type { OrderStatus } from '@anzara/shared-types';

function generateOrderNumber(): string {
  // ANZ-YYMMDD-XXXXXX (random 6 hex)
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ANZ-${yy}${mm}${dd}-${rand}`;
}

/**
 * Internal sentinel used by the place() transaction. Thrown on the
 * unlikely "payment row not created" path so the surrounding catch
 * (which only re-throws known app errors) does not let it slip through
 * as a 500 with a confusing message.
 */
class InternalOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalOrderError';
  }
}

export const ordersService = {
  // ----------------------------------------------------------------
  // Customer: place an order
  // ----------------------------------------------------------------
  async place(userId: string, input: CreateOrderInput) {
    // Resolve + validate the payment method up front. The provider decides
    // whether the method is enabled (today: only COD) and any limits.
    const paymentProvider = getPaymentProvider(input.paymentMethod);

    // Load the cart with items (also ensures a cart row exists).
    const cart = await cartsRepository.findActiveByUser(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Cart is empty');
    }

    // All-or-nothing: do the whole thing in one transaction.
    let orderId: string;
    let orderNumberForEmail: string;
    let totalsForEmail: { total: number };
    let userForEmail: { email: string; firstName: string } = { email: '', firstName: '' };

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Re-fetch the variants inside the transaction (live stock + price).
        const variantIds = cart.items.map((i) => i.variantId);
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } },
          },
        });
        const byId = new Map(variants.map((v) => [v.id, v]));

        // 2. Build the order line items, validating stock + price.
        const orderItems: Array<{
          productId: string;
          variantId: string;
          productName: unknown;
          variantSku: string;
          size: string | null;
          color: string | null;
          image: string | null;
          unitPrice: number;
          quantity: number;
          subtotal: number;
        }> = [];
        const stockDecrement: Array<{ variantId: string; quantity: number }> = [];

        for (const line of cart.items) {
          const v = byId.get(line.variantId);
          if (!v) throw new ValidationError('A cart item is no longer available');
          if (!v.isActive) throw new ValidationError(`"${v.sku}" is no longer for sale`);
          if (v.product.status !== 'PUBLISHED') {
            throw new ValidationError(`"${v.product.name}" is not available for purchase`);
          }
          if (line.quantity > v.stockQuantity) {
            throw new ConflictError(`Only ${v.stockQuantity} of "${v.sku}" left in stock`, {
              available: v.stockQuantity,
              requested: line.quantity,
            });
          }

          // Snapshot price (don't trust the cart's price if it changed).
          orderItems.push({
            productId: v.productId,
            variantId: v.id,
            productName: v.product.name,
            variantSku: v.sku,
            size: v.size,
            color: v.color,
            image: v.product.images?.[0]?.url ?? null,
            unitPrice: v.price,
            quantity: line.quantity,
            subtotal: v.price * line.quantity,
          });
          stockDecrement.push({ variantId: v.id, quantity: line.quantity });
        }

        // 3. Compute totals. If a coupon is attached to the cart, validate
        //    it and redeem it (increment usageCount + record CouponUsage
        //    inside this same transaction so a failure rolls everything
        //    back). The redemption happens AFTER the order row exists
        //    because the CouponUsage row needs the orderId.
        const subtotal = orderItems.reduce((s, it) => s + it.subtotal, 0);

        // Pass 1: compute totals without the coupon so we know the
        // post-shipping total. The coupon discount is then applied on top
        // of that (capped at subtotal in computeCartTotals).
        const cartVariants = orderItems.map((it) => {
          const v = byId.get(it.variantId);
          return {
            productId: it.productId as string,
            categoryId: v?.product.categoryId ?? null,
          };
        });
        let couponCode: string | null = null;
        let discountPaisa = 0;
        if (cart.couponCode) {
          const preview = await couponsService.validateForUser({
            code: cart.couponCode,
            userId,
            subtotalPaisa: subtotal,
            cartVariants,
          });
          // We do NOT redeem yet (no orderId). We'll do it right after
          // the order row is created, inside this same transaction.
          couponCode = preview.code;
          discountPaisa = preview.discountPaisa;
        }
        const totals = await computeCartTotals({ subtotalPaisa: subtotal, discountPaisa });

        // 3b. Provider gate-check (e.g. COD cap, gateway health).
        paymentProvider.validateMethod({ amountPaisa: totals.total });

        // 4. Create shipping + optional billing addresses.
        const shippingAddress = await tx.address.create({
          data: {
            userId,
            label: input.shippingAddress.label ?? null,
            fullName: input.shippingAddress.fullName,
            phone: input.shippingAddress.phone,
            addressLine1: input.shippingAddress.addressLine1,
            addressLine2: input.shippingAddress.addressLine2 ?? null,
            city: input.shippingAddress.city,
            district: input.shippingAddress.district,
            division: input.shippingAddress.division,
            postalCode: input.shippingAddress.postalCode ?? null,
            country: input.shippingAddress.country,
            isDefault: false, // Don't auto-promote checkout addresses to default.
          },
        });
        let billingAddressId: string | null = null;
        if (input.billingAddress) {
          const billing = await tx.address.create({
            data: {
              userId,
              fullName: input.billingAddress.fullName,
              phone: input.billingAddress.phone,
              addressLine1: input.billingAddress.addressLine1,
              addressLine2: input.billingAddress.addressLine2 ?? null,
              city: input.billingAddress.city,
              district: input.billingAddress.district,
              division: input.billingAddress.division,
              postalCode: input.billingAddress.postalCode ?? null,
              country: input.billingAddress.country,
              isDefault: false,
            },
          });
          billingAddressId = billing.id;
        }

        // 5. Decrement stock atomically (also fails if any line is short).
        for (const it of stockDecrement) {
          const res = await tx.productVariant.updateMany({
            where: { id: it.variantId, stockQuantity: { gte: it.quantity } },
            data: { stockQuantity: { decrement: it.quantity } },
          });
          if (res.count === 0) {
            const v = await tx.productVariant.findUnique({ where: { id: it.variantId } });
            throw new ConflictError(`"${v?.sku ?? it.variantId}" just sold out`, {
              available: v?.stockQuantity ?? 0,
            });
          }
        }

        // 6. Create the order row + payment intent + shipment.
        const orderNumber = generateOrderNumber();
        const createdOrderId = await ordersRepository.txCreate(tx, {
          orderNumber,
          userId,
          status: 'PENDING',
          subtotal: totals.subtotal,
          discount: totals.discount,
          shipping: totals.shipping,
          tax: totals.tax,
          total: totals.total,
          couponCode,
          customerNote: input.customerNote ?? null,
          shippingAddressId: shippingAddress.id,
          billingAddressId,
          items: orderItems,
          payment: { method: input.paymentMethod, status: 'PENDING', amount: totals.total },
        });

        // 6b. If a coupon was attached, atomically redeem it now. This
        //     increments usageCount and inserts a CouponUsage row in the
        //     SAME transaction. If the user has already used up the
        //     perUserLimit or the usage limit was hit between the preview
        //     and now, this throws and rolls back the order.
        if (couponCode) {
          await couponsService.txRedeem({
            tx,
            code: couponCode,
            userId,
            orderId: createdOrderId,
            subtotalPaisa: subtotal,
            cartVariants,
          });
        }

        // 7. Hand off to the payment provider. COD is a no-op. Gateways
        //    may open a session and update the Payment row with a
        //    transactionId inside the same transaction.
        const createdPayment = await tx.payment.findUnique({ where: { orderId: createdOrderId } });
        if (!createdPayment) throw new InternalOrderError('Payment row not created');
        const paymentCtx: PaymentMethodContext = {
          paymentId: createdPayment.id,
          orderId: createdOrderId,
          orderNumber,
          userId,
          amountPaisa: totals.total,
          currency: 'BDT',
          paymentMethod: paymentProvider.id,
        };
        await paymentProvider.onOrderPlaced(paymentCtx, tx);

        // 8. Record SALE inventory rows now that the order id exists.
        await tx.inventoryTransaction.createMany({
          data: stockDecrement.map((it) => ({
            variantId: it.variantId,
            delta: -it.quantity,
            reason: 'SALE',
            reference: createdOrderId,
          })),
        });

        // 9. Clear the cart.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return { orderId: createdOrderId, orderNumber, totals };
      });

      orderId = result.orderId;
      orderNumberForEmail = result.orderNumber;
      totalsForEmail = result.totals;
    } catch (err) {
      if (
        err instanceof BadRequestError ||
        err instanceof ConflictError ||
        err instanceof NotFoundError ||
        err instanceof ValidationError
      ) {
        throw err;
      }
      logger.error({ err, userId }, 'Unexpected error placing order');
      throw err;
    }

    // 10. Send the order-confirmation email. OUTSIDE the transaction
    //     so a slow SMTP / provider call never holds a row lock. Email
    //     failures are logged, not thrown - the order is placed.
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const tpl = orderConfirmationEmail({
          orderNumber: orderNumberForEmail,
          totalPaisa: totalsForEmail.total,
          firstName: user.firstName,
          paymentMethod: input.paymentMethod,
        });
        await emailService.sendOrderEmail({
          to: user.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        });
        userForEmail = { email: user.email, firstName: user.firstName };
      }
    } catch (err) {
      logger.error({ err, orderId }, 'Failed to send order confirmation email');
    }
    void userForEmail; // logged below in case support needs it

    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found after creation');
    return toOrderDto(order);
  },

  // ----------------------------------------------------------------
  // Customer: list / get / cancel
  // ----------------------------------------------------------------
  async listForCustomer(userId: string, query: OrderFilterInput) {
    const { items, total } = await ordersRepository.listForCustomer(userId, {
      page: query.page,
      limit: query.limit,
      ...(query.status ? { status: query.status } : {}),
    });
    return {
      data: items.map((o) => toOrderDto(o)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  },

  async getForCustomer(orderId: string, userId: string) {
    const o = await ordersRepository.findForCustomer(orderId, userId);
    if (!o) throw new NotFoundError('Order not found');
    return toOrderDto(o);
  },

  async cancelByCustomer(orderId: string, userId: string) {
    const o = await ordersRepository.findForCustomer(orderId, userId);
    if (!o) throw new NotFoundError('Order not found');
    if (!['PENDING', 'AWAITING_CONFIRMATION'].includes(o.status)) {
      throw new BadRequestError(`Order cannot be cancelled in status ${o.status}`);
    }
    return this._transition(o.id, o.status, 'CANCELLED', null, 'Cancelled by customer');
  },

  // ----------------------------------------------------------------
  // Admin: list / get / status / shipment / notes
  // ----------------------------------------------------------------
  async listForAdmin(query: OrderFilterInput) {
    const { items, total } = await ordersRepository.listForAdmin({
      page: query.page,
      limit: query.limit,
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.startDate ? { startDate: query.startDate } : {}),
      ...(query.endDate ? { endDate: query.endDate } : {}),
    });
    return {
      data: items.map((o) => {
        const customer = (
          o as unknown as {
            user?: {
              id: string;
              email: string;
              firstName: string;
              lastName: string;
              phone: string | null;
            };
          }
        ).user;
        return {
          ...toOrderDto(o),
          ...(customer ? { customer } : {}),
        };
      }),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  },

  async getForAdmin(orderId: string) {
    const o = await ordersRepository.findById(orderId);
    if (!o) throw new NotFoundError('Order not found');
    const dto = toOrderDto(o);
    const user = await prisma.user.findUnique({
      where: { id: o.userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });
    return { ...dto, customer: user };
  },

  async updateStatus(orderId: string, adminId: string | null, input: UpdateOrderStatusInput) {
    const o = await ordersRepository.findById(orderId);
    if (!o) throw new NotFoundError('Order not found');
    if (!canTransition(o.status as OrderStatus, input.status as OrderStatus)) {
      throw new ValidationError(`Cannot move order from ${o.status} to ${input.status}`);
    }
    return this._transition(o.id, o.status, input.status, adminId, input.reason ?? null);
  },

  async updateShipment(
    orderId: string,
    adminId: string | null,
    data: { status?: string; trackingNumber?: string; notes?: string },
  ) {
    const o = await ordersRepository.findById(orderId);
    if (!o) throw new NotFoundError('Order not found');

    const updated = await ordersRepository.updateShipment(orderId, {
      ...(data.status ? { status: data.status } : {}),
      ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });

    if (data.status) {
      await ordersRepository.appendShipmentEvent(orderId, data.status, data.notes ?? '');
    }
    if (data.trackingNumber) {
      await ordersRepository.appendShipmentEvent(
        orderId,
        updated.status,
        `Tracking number set: ${data.trackingNumber}`,
      );
    }

    // Auto-advance the order status when the shipment moves to SHIPPED.
    if (data.status === 'SHIPPED' && o.status === 'PROCESSING') {
      await this._transition(
        o.id,
        o.status,
        'SHIPPED',
        adminId,
        'Auto-advanced on shipment dispatch',
      );
    } else if (data.status === 'DELIVERED' && o.status === 'SHIPPED') {
      await this._transition(
        o.id,
        o.status,
        'DELIVERED',
        adminId,
        'Auto-advanced on delivery confirmation',
      );
    }

    return this.getForAdmin(orderId);
  },

  async addNote(orderId: string, adminId: string, input: OrderNoteInput) {
    const o = await ordersRepository.findById(orderId);
    if (!o) throw new NotFoundError('Order not found');
    await ordersRepository.addNote(orderId, adminId, input.content, input.isInternal);
    return this.getForAdmin(orderId);
  },

  // ----------------------------------------------------------------
  // Internal: status transition + history + payment side effects + email
  // ----------------------------------------------------------------
  async _transition(
    orderId: string,
    fromStatus: string,
    toStatus: string,
    changedById: string | null,
    reason: string | null,
  ) {
    // 1. Inside one transaction: update the order, record the status
    //    change, and apply the payment-side effect (COD flips VERIFIED
    //    on DELIVERED, FAILED on CANCELLED). Gateway providers get a
    //    chance to hook the same lifecycle point.
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: toStatus } });
      await tx.orderStatusChange.create({
        data: { orderId, fromStatus, toStatus, changedById, reason },
      });

      const payment = await tx.payment.findUnique({ where: { orderId } });
      if (payment) {
        const provider = getPaymentProvider(payment.method);
        const ctx: PaymentMethodContext = {
          paymentId: payment.id,
          orderId: payment.orderId,
          orderNumber: '',
          userId: '',
          amountPaisa: payment.amount,
          currency: 'BDT',
          paymentMethod: provider.id,
        };
        if (toStatus === 'CANCELLED') {
          // Inline the COD-style FAILED flip so it's atomic with the
          // status change. Gateway providers can implement their own
          // behavior via the provider interface.
          await tx.payment.updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: { status: 'FAILED', failureReason: reason ?? 'Order cancelled' },
          });
        } else if (toStatus === 'DELIVERED') {
          if (payment.status === 'PENDING' && payment.method === 'COD') {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'VERIFIED', paidAt: new Date() },
            });
          } else {
            await provider.onOrderDelivered(ctx, tx);
          }
        }
      }
    });

    // 2. Send a status email to the customer (best effort, outside txn).
    try {
      const order = await ordersRepository.findById(orderId);
      if (order) {
        const user = await prisma.user.findUnique({ where: { id: order.userId } });
        if (user) {
          const tpl = orderStatusEmail({
            orderNumber: order.orderNumber,
            status: toStatus as OrderStatus,
            firstName: user.firstName,
          });
          await emailService.sendOrderEmail({
            to: user.email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
          });
        }
      }
    } catch (err) {
      logger.error({ err, orderId, toStatus }, 'Failed to send order status email');
    }

    // 3. Reload for the response.
    return this.getForAdmin(orderId);
  },
};
