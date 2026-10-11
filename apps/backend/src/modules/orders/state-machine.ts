/**
 * Order status state machine.
 *
 * Phase 3 allows: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED,
 * plus CANCELLED from PENDING/CONFIRMED/PROCESSING, and AWAITING_CONFIRMATION
 * for ambiguous payment states.
 *
 * Returns/refunds (RETURN_REQUESTED/RETURNED/REFUNDED) are Phase 3.5.
 */
import type { OrderStatus } from '@anzara/shared-types';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'AWAITING_CONFIRMATION', 'CANCELLED'],
  AWAITING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED', 'REFUNDED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}
