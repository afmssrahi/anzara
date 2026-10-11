/**
 * Order validators.
 */
import { z } from 'zod';
import { addressSchema } from './auth';

export const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(['COD', 'BKASH', 'NAGAD', 'CARD', 'ROCKET']).default('COD'),
  couponCode: z.string().optional(),
  customerNote: z.string().max(500).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      'PENDING',
      'AWAITING_CONFIRMATION',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURN_REQUESTED',
      'RETURNED',
      'REFUNDED',
    ])
    .optional(),
  paymentStatus: z.enum(['PENDING', 'VERIFIED', 'FAILED', 'REFUNDED']).optional(),
  search: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type OrderFilterInput = z.infer<typeof orderFilterSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'AWAITING_CONFIRMATION',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'RETURN_REQUESTED',
    'RETURNED',
    'REFUNDED',
  ]),
  reason: z.string().max(500).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const createShipmentSchema = z.object({
  orderId: z.string().min(1),
  provider: z.string().min(1),
  trackingNumber: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const orderNoteSchema = z.object({
  content: z.string().min(1).max(1000),
  isInternal: z.boolean().default(true),
});
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;
