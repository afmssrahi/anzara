/**
 * PaymentProvider contract.
 *
 * Every payment rail (COD, SSLCommerz, bKash, Nagad, Card) lives behind
 * this interface so the orders module never branches on the method.
 *
 * Lifecycle hooks are called by the orders service:
 *   - `validateMethod`        : gate-check at order placement time
 *   - `onOrderPlaced`         : after the order row is created (e.g. create a
 *                               gateway session; no-op for COD)
 *   - `onOrderCancelled`      : when the order moves to CANCELLED
 *   - `onOrderDelivered`      : when the order moves to DELIVERED
 *                               (COD: money realized; gateways: capture)
 *
 * Adding a new gateway = one new file in this folder + one case in
 * `factory.ts`. Zero changes in controllers, service, UI, schema.
 */
import type { Prisma } from '@prisma/client';

export type PaymentProviderId = 'cod' | 'sslcommerz' | 'bkash' | 'nagad' | 'card';

export interface PaymentMethodContext {
  /** The Payment row that was just created. */
  paymentId: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  amountPaisa: number;
  currency: 'BDT';
  paymentMethod: PaymentProviderId;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;

  /** Gate-check at order placement. Throw to refuse this method for this order. */
  validateMethod(args: { amountPaisa: number }): void;

  /**
   * After the order is created and a Payment row exists. COD is a no-op;
   * gateways may open a session here and persist a `transactionId`.
   */
  onOrderPlaced(ctx: PaymentMethodContext, tx: Prisma.TransactionClient): Promise<void>;

  /** Order was cancelled. Flip the payment to FAILED. */
  onOrderCancelled(ctx: PaymentMethodContext, reason: string): Promise<void>;

  /** Order delivered. COD marks VERIFIED + paidAt; gateways capture/refund as needed. */
  onOrderDelivered(ctx: PaymentMethodContext, tx: Prisma.TransactionClient): Promise<void>;
}
