/**
 * Orders module - business logic.
 *
 * `place` is the only mutating call on the customer side. It runs in a
 * single Prisma transaction that:
 *   1. Re-validates every cart line against live stock and live prices.
 *   2. Creates the shipping + (optional) billing address rows.
 *   3. Decrements stock atomically.
 *   4. Creates the order + items + payment intent + shipment + status row.
 *   5. Clears the cart.
 *   6. Sends the order-confirmation email.
 *
 * Any failure rolls back the entire transaction - including stock.
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
import type {
  CreateOrderInput,
  OrderFilterInput,
  UpdateOrderStatusInput,
  OrderNoteInput,
} from '@anzara/validators';
import type { OrderStatus } from '@anzara/shared-types';

const MAX_QUANTITY_PER_LINE = 99;

function generateOrderNumber(): string {
  // ANZ-YYMMDD-XXXXXX (random 6 hex)
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ANZ-${yy}${mm}${dd}-${rand}`;
}

export const ordersService = {
  // ----------------------------------------------------------------
  // Customer: place an order (COD only for now)
  // ----------------------------------------------------------------
  async place(userId: string, input: CreateOrderInput) {
    if (input.paymentMethod !== 'COD') {
      throw new BadRequestError('Only COD is supported right now');
    }

    // Load the cart with items (also ensures a cart row exists).
    const cart = await cartsRepository.findActiveByUser(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Cart is empty');
    }

    // All-or-nothing: do the whole thing in one transaction.
    try {
      const { orderId, totals } = await prisma.$transaction(async (tx) => {
        // 1. Re-fetch the variants inside the transaction (live stock + price).
        const variantIds = cart.items.map((i) => i.variantId);
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } },
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

        // 3. Compute totals.
        const subtotal = orderItems.reduce((s, it) => s + it.subtotal, 0);
        const totals = await computeCartTotals({ subtotalPaisa: subtotal });

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

        // 6. (Inventory SALE transactions are created in step 8 after the
        //     order id exists - we need the id as the `reference` field.)

        // 7. Create the order row.
        const orderNumber = generateOrderNumber();
        const orderId = await ordersRepository.txCreate(tx, {
          orderNumber,
          userId,
          status: 'PENDING',
          subtotal: totals.subtotal,
          discount: totals.discount,
          shipping: totals.shipping,
          tax: totals.tax,
          total: totals.total,
          couponCode: null,
          customerNote: input.customerNote ?? null,
          shippingAddressId: shippingAddress.id,
          billingAddressId,
          items: orderItems,
          payment: { method: input.paymentMethod, status: 'PENDING', amount: totals.total },
        });

        // 8. Record SALE inventory rows now that the order id exists.
        await tx.inventoryTransaction.createMany({
          data: stockDecrement.map((it) => ({
            variantId: it.variantId,
            delta: -it.quantity,
            reason: 'SALE',
            reference: orderId,
          })),
        });

        // 9. Clear the cart.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return { orderId, totals };
      });

      // 10. Send the order-confirmation email. We do this OUTSIDE the
      //     transaction (a slow SMTP server should never hold a row lock).
      //     Failures here are logged, not thrown - the order is placed.
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const order = await ordersRepository.findById(orderId);
        if (user && order) {
          await emailService.sendOrderEmail({
            to: user.email,
            subject: `Order ${order.orderNumber} received`,
            html: buildOrderConfirmationHtml(order.orderNumber, totals.total, user.firstName),
            text:
              `Hi ${user.firstName},\n\nThanks for your order ${order.orderNumber}. ` +
              `Total: ৳${(totals.total / 100).toFixed(2)}.\n` +
              `We'll email you when it ships.`,
          });
        }
      } catch (err) {
        logger.error({ err, orderId }, 'Failed to send order confirmation email');
      }

      const order = await ordersRepository.findById(orderId);
      if (!order) throw new NotFoundError('Order not found after creation');
      return toOrderDto(order);
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
  // Internal: status transition + history + email
  // ----------------------------------------------------------------
  async _transition(
    orderId: string,
    fromStatus: string,
    toStatus: string,
    changedById: string | null,
    reason: string | null,
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: toStatus } });
      await tx.orderStatusChange.create({
        data: { orderId, fromStatus, toStatus, changedById, reason },
      });
      // If we cancelled, also mark the payment as failed (manual flow).
      if (toStatus === 'CANCELLED') {
        const payment = await tx.payment.findUnique({ where: { orderId } });
        if (payment && payment.status === 'PENDING') {
          await tx.payment.update({
            where: { orderId },
            data: { status: 'FAILED', failureReason: reason ?? 'Order cancelled' },
          });
        }
      }
      // If delivered, mark the payment paid (only for COD where this is
      // the only signal of completion).
      if (toStatus === 'DELIVERED') {
        const payment = await tx.payment.findUnique({ where: { orderId } });
        if (payment && payment.method === 'COD' && payment.status === 'PENDING') {
          await tx.payment.update({
            where: { orderId },
            data: { status: 'VERIFIED', paidAt: new Date() },
          });
        }
      }
    });

    // Send a status email to the customer (best effort).
    try {
      const order = await ordersRepository.findById(orderId);
      if (order) {
        const user = await prisma.user.findUnique({ where: { id: order.userId } });
        if (user) {
          await emailService.sendOrderEmail({
            to: user.email,
            subject: `Order ${order.orderNumber} is now ${toStatus}`,
            html: buildStatusUpdateHtml(order.orderNumber, toStatus, user.firstName),
            text: `Hi ${user.firstName},\n\nYour order ${order.orderNumber} is now "${toStatus}".`,
          });
        }
      }
    } catch (err) {
      logger.error({ err, orderId, toStatus }, 'Failed to send order status email');
    }

    // Reload (with the actor-aware shape) for the response.
    return ordersService.getForAdmin(orderId);
  },
};

function buildOrderConfirmationHtml(
  orderNumber: string,
  totalPaisa: number,
  firstName: string,
): string {
  const total = (totalPaisa / 100).toFixed(2);
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #0F4C5C; margin: 0 0 24px;">Anzara</h1>
      <p style="color: #333; font-size: 16px;">Hi ${firstName},</p>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Thanks for your order! Your order number is
        <strong style="color:#0F4C5C;">${orderNumber}</strong>.
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Total: <strong>৳${total}</strong> (Cash on Delivery).
      </p>
      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        We'll email you again when your order is confirmed and once it ships.
      </p>
    </div>
  `;
}

function buildStatusUpdateHtml(orderNumber: string, status: string, firstName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #0F4C5C; margin: 0 0 24px;">Anzara</h1>
      <p style="color: #333; font-size: 16px;">Hi ${firstName},</p>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Your order <strong>${orderNumber}</strong> is now <strong>${status}</strong>.
      </p>
    </div>
  `;
}

// Quiet the "unused" lint warnings on constants reserved for Phase 3.5.
void MAX_QUANTITY_PER_LINE;
