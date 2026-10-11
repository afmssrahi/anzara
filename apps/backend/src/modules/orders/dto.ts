/**
 * Order DTO helpers.
 * Convert Prisma rows to the shared-types Order shape.
 */
import type {
  Address as PrismaAddress,
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  OrderNote as PrismaOrderNote,
  OrderStatusChange as PrismaOrderStatusChange,
  Payment as PrismaPayment,
  Shipment as PrismaShipment,
  ShipmentEvent as PrismaShipmentEvent,
} from '@prisma/client';
import type {
  Order,
  OrderItem,
  OrderNote,
  OrderStatus,
  OrderStatusChange,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  ShipmentEvent,
  ShipmentRecord,
  UserAddress,
} from '@anzara/shared-types';

const CURRENCY = 'BDT' as const;

function money(paisa: number): { amount: number; currency: typeof CURRENCY } {
  return { amount: paisa, currency: CURRENCY };
}

function toAddressDto(a: PrismaAddress): UserAddress {
  return {
    id: a.id,
    ...(a.label ? { label: a.label } : {}),
    fullName: a.fullName,
    phone: a.phone,
    addressLine1: a.addressLine1,
    ...(a.addressLine2 ? { addressLine2: a.addressLine2 } : {}),
    city: a.city,
    district: a.district,
    division: a.division,
    ...(a.postalCode ? { postalCode: a.postalCode } : {}),
    country: a.country,
    isDefault: a.isDefault,
  };
}

function toItemDto(i: PrismaOrderItem): OrderItem {
  return {
    id: i.id,
    productId: i.productId,
    variantId: i.variantId,
    productName: i.productName as OrderItem['productName'],
    variantSku: i.variantSku,
    ...(i.size ? { size: i.size } : {}),
    ...(i.color ? { color: i.color } : {}),
    ...(i.image ? { image: i.image } : {}),
    unitPrice: money(i.unitPrice),
    quantity: i.quantity,
    subtotal: money(i.subtotal),
  };
}

function toPaymentDto(p: PrismaPayment): PaymentRecord {
  return {
    id: p.id,
    method: p.method as PaymentMethod,
    status: p.status as PaymentStatus,
    amount: money(p.amount),
    ...(p.transactionId ? { transactionId: p.transactionId } : {}),
    ...(p.paidAt ? { paidAt: p.paidAt.toISOString() } : {}),
    ...(p.failureReason ? { failureReason: p.failureReason } : {}),
  };
}

function toShipmentEventDto(e: PrismaShipmentEvent): ShipmentEvent {
  return {
    status: e.status,
    description: e.description,
    ...(e.location ? { location: e.location } : {}),
    occurredAt: e.occurredAt.toISOString(),
  };
}

function toShipmentDto(s: PrismaShipment & { events: PrismaShipmentEvent[] }): ShipmentRecord {
  return {
    id: s.id,
    provider: s.provider,
    ...(s.trackingNumber ? { trackingNumber: s.trackingNumber } : {}),
    status: s.status as ShipmentRecord['status'],
    ...(s.shippedAt ? { shippedAt: s.shippedAt.toISOString() } : {}),
    ...(s.deliveredAt ? { deliveredAt: s.deliveredAt.toISOString() } : {}),
    events: s.events.map(toShipmentEventDto),
  };
}

function toNoteDto(n: PrismaOrderNote): OrderNote {
  return {
    id: n.id,
    authorId: n.authorId,
    content: n.content,
    isInternal: n.isInternal,
    createdAt: n.createdAt.toISOString(),
  };
}

function toStatusChangeDto(s: PrismaOrderStatusChange): OrderStatusChange {
  return {
    fromStatus: (s.fromStatus ?? null) as OrderStatus | null,
    toStatus: s.toStatus as OrderStatus,
    changedBy: s.changedById ?? 'system',
    ...(s.reason ? { reason: s.reason } : {}),
    changedAt: s.changedAt.toISOString(),
  };
}

export function toOrderDto(
  o: PrismaOrder & {
    items: PrismaOrderItem[];
    payment: PrismaPayment | null;
    shipment: (PrismaShipment & { events: PrismaShipmentEvent[] }) | null;
    statusHistory: PrismaOrderStatusChange[];
    notes: PrismaOrderNote[];
    shippingAddress: PrismaAddress;
    billingAddress: PrismaAddress | null;
  },
): Order {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.userId,
    status: o.status as OrderStatus,
    items: o.items.map(toItemDto),
    totals: {
      subtotal: money(o.subtotal),
      discount: money(o.discount),
      shipping: money(o.shipping),
      tax: money(o.tax),
      total: money(o.total),
    },
    shippingAddress: toAddressDto(o.shippingAddress),
    ...(o.billingAddress ? { billingAddress: toAddressDto(o.billingAddress) } : {}),
    // Every order we create also creates a Payment row, so this is always present.
    // The Prisma include is left nullable only because the include is permissive.
    payment: o.payment
      ? toPaymentDto(o.payment)
      : ({
          id: '',
          method: 'COD',
          status: 'PENDING',
          amount: money(0),
        } as unknown as PaymentRecord),
    ...(o.shipment ? { shipment: toShipmentDto(o.shipment) } : {}),
    ...(o.couponCode ? { couponCode: o.couponCode } : {}),
    ...(o.customerNote ? { customerNote: o.customerNote } : {}),
    internalNotes: o.notes.map(toNoteDto),
    statusHistory: o.statusHistory.map(toStatusChangeDto),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
