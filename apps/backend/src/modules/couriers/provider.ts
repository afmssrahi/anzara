/**
 * CourierProvider contract.
 *
 * Every delivery rail (manual entry, Pathao, Steadfast, RedX) lives behind
 * this interface. The orders service calls `dispatchOrder` when the order
 * moves to SHIPPED (or when the admin dispatches a shipment) and
 * `cancelDispatch` when the order is cancelled after dispatch.
 *
 * Adding a courier = one new file in this folder + one case in
 * `factory.ts`. No changes in controllers, service, UI, schema.
 */
import type { UserAddress } from '@anzara/shared-types';

export type CourierProviderId = 'manual' | 'pathao' | 'steadfast' | 'redx';

export interface DispatchItem {
  /** Human-readable product name (snapshot at order time). */
  productName: string;
  variantSku: string;
  size?: string;
  color?: string;
  quantity: number;
}

export interface DispatchContext {
  orderId: string;
  orderNumber: string;
  amountPaisa: number;
  /** Pre-formatted, e.g. "৳1,950.00". Use this in the courier's API. */
  amountDisplay: string;
  customer: { name: string; phone: string; email: string };
  shippingAddress: UserAddress;
  items: DispatchItem[];
  /** Free-form note to pass to the courier (e.g. customer note from order). */
  note?: string;
}

export interface DispatchResult {
  /** Tracking number to store on the Shipment row. */
  trackingNumber: string;
  /** Optional external id (e.g. Pathao consignment id) for debugging. */
  externalId?: string;
}

export interface CourierProvider {
  readonly id: CourierProviderId;
  /** Label shown in admin UIs. */
  readonly label: string;

  /**
   * Place a delivery request. For `manual` this is a no-op: the admin has
   * already typed the tracking number into the form. For real couriers this
   * is the HTTP call to the merchant API.
   */
  dispatchOrder(
    ctx: DispatchContext,
    args: { trackingNumber?: string; notes?: string },
  ): Promise<DispatchResult>;

  /**
   * Cancel a previously-dispatched delivery. `manual` is a no-op (admin
   * marks the shipment CANCELLED by hand).
   */
  cancelDispatch(ctx: DispatchContext, reason: string): Promise<void>;
}
