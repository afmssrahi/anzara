/**
 * Order, payment, and shipment types.
 */
import type { ISODateString, Money, LocalizedString } from './common';
import type { UserAddress } from './user';

export type OrderStatus =
  | 'PENDING'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED';

export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD' | 'CARD' | 'ROCKET';

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  productName: LocalizedString;
  variantSku: string;
  size?: string;
  color?: string;
  image?: string;
  unitPrice: Money;
  quantity: number;
  subtotal: Money;
}

export interface OrderTotals {
  subtotal: Money;
  discount: Money;
  shipping: Money;
  tax: Money;
  total: Money;
}

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Money;
  transactionId?: string;
  paidAt?: ISODateString;
  failureReason?: string;
}

export interface ShipmentRecord {
  id: string;
  provider: string;
  trackingNumber?: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED';
  shippedAt?: ISODateString;
  deliveredAt?: ISODateString;
  events: ShipmentEvent[];
}

export interface ShipmentEvent {
  status: string;
  description: string;
  location?: string;
  occurredAt: ISODateString;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  totals: OrderTotals;
  shippingAddress: UserAddress;
  billingAddress?: UserAddress;
  payment: PaymentRecord;
  shipment?: ShipmentRecord;
  couponCode?: string;
  customerNote?: string;
  internalNotes: OrderNote[];
  statusHistory: OrderStatusChange[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface OrderNote {
  id: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  createdAt: ISODateString;
}

export interface OrderStatusChange {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string;
  reason?: string;
  changedAt: ISODateString;
}
