/**
 * Orders module - data access layer.
 * All Prisma queries for orders/payments/shipments live here.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

const ORDER_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' as const } },
  payment: true,
  shipment: { include: { events: { orderBy: { occurredAt: 'asc' as const } } } },
  statusHistory: { orderBy: { changedAt: 'asc' as const } },
  notes: { orderBy: { createdAt: 'asc' as const } },
  shippingAddress: true,
  billingAddress: true,
} satisfies Prisma.OrderInclude;

export const ordersRepository = {
  async findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  },

  async findByOrderNumber(orderNumber: string) {
    return prisma.order.findUnique({ where: { orderNumber }, include: ORDER_INCLUDE });
  },

  async findForCustomer(orderId: string, userId: string) {
    return prisma.order.findFirst({ where: { id: orderId, userId }, include: ORDER_INCLUDE });
  },

  async listForCustomer(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: string;
    },
  ) {
    const { page, limit, status } = params;
    const where: Prisma.OrderWhereInput = { userId };
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: ORDER_INCLUDE,
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },

  async listForAdmin(params: {
    page: number;
    limit: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page, limit, status, paymentStatus, search, startDate, endDate } = params;
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (paymentStatus) where.payment = { status: paymentStatus };
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...ORDER_INCLUDE,
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },

  /**
   * Create the order, items, payment intent, shipment, status change, in a
   * single transaction. Stock decrement is done by the caller via the cart
   * repository, on the same `tx`.
   */
  async txCreate(
    tx: Prisma.TransactionClient,
    data: {
      orderNumber: string;
      userId: string;
      status: string;
      subtotal: number;
      discount: number;
      shipping: number;
      tax: number;
      total: number;
      couponCode: string | null;
      customerNote: string | null;
      shippingAddressId: string;
      billingAddressId: string | null;
      items: Array<{
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
      }>;
      payment: { method: string; status: string; amount: number };
    },
  ) {
    const order = await tx.order.create({
      data: {
        orderNumber: data.orderNumber,
        userId: data.userId,
        status: data.status,
        subtotal: data.subtotal,
        discount: data.discount,
        shipping: data.shipping,
        tax: data.tax,
        total: data.total,
        couponCode: data.couponCode,
        customerNote: data.customerNote,
        shippingAddressId: data.shippingAddressId,
        billingAddressId: data.billingAddressId,
        items: {
          create: data.items.map((it) => ({
            productId: it.productId,
            variantId: it.variantId,
            productName: it.productName as Prisma.InputJsonValue,
            variantSku: it.variantSku,
            size: it.size,
            color: it.color,
            image: it.image,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            subtotal: it.subtotal,
          })),
        },
      },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        method: data.payment.method,
        status: data.payment.status,
        amount: data.payment.amount,
      },
    });

    await tx.shipment.create({
      data: { orderId: order.id, provider: 'manual', status: 'PENDING' },
    });

    await tx.orderStatusChange.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: data.status,
        changedById: null,
        reason: 'Order placed',
      },
    });

    return order.id;
  },

  /** Append a row to the order status history. */
  async appendStatusChange(
    orderId: string,
    fromStatus: string,
    toStatus: string,
    changedById: string | null,
    reason: string | null,
  ) {
    return prisma.orderStatusChange.create({
      data: { orderId, fromStatus, toStatus, changedById, reason },
    });
  },

  async updateStatus(orderId: string, status: string) {
    return prisma.order.update({ where: { id: orderId }, data: { status } });
  },

  async updatePaymentStatus(orderId: string, status: string, paidAt?: Date) {
    return prisma.payment.update({
      where: { orderId },
      data: { status, ...(paidAt ? { paidAt } : {}) },
    });
  },

  async updateShipment(
    orderId: string,
    data: { status?: string; trackingNumber?: string | null; notes?: string | null },
  ) {
    return prisma.shipment.update({ where: { orderId }, data });
  },

  async appendShipmentEvent(
    orderId: string,
    status: string,
    description: string,
    location?: string,
  ) {
    const shipment = await prisma.shipment.findUnique({ where: { orderId } });
    if (!shipment) return null;
    return prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status,
        description,
        ...(location ? { location } : {}),
      },
    });
  },

  async addNote(orderId: string, authorId: string, content: string, isInternal: boolean) {
    return prisma.orderNote.create({
      data: { orderId, authorId, content, isInternal },
    });
  },
};
