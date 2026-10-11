/**
 * Coupon admin validators (Zod). The customer apply validator already
 * lives in @anzara/validators (`applyCouponSchema`).
 */
import { z } from 'zod';

const discountType = z.enum(['PERCENTAGE', 'FIXED']);
const futureOrPast = z.coerce.date().optional();

export const couponFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().optional(),
});
export type CouponFilterInput = z.infer<typeof couponFilterSchema>;

const createCouponBaseSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .toUpperCase()
    .trim()
    .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, numbers, "-" and "_"'),
  description: z.string().max(500).optional(),
  discountType: discountType,
  discountValue: z.coerce.number().int().positive(),
  minOrderAmount: z.coerce.number().int().nonnegative().default(0),
  maxDiscountAmount: z.coerce.number().int().positive().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  perUserLimit: z.coerce.number().int().positive().optional(),
  startsAt: futureOrPast,
  expiresAt: futureOrPast,
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().min(1)).default([]),
  categoryIds: z.array(z.string().min(1)).default([]),
  firstOrderOnly: z.boolean().default(false),
});

export const createCouponSchema = createCouponBaseSchema
  .refine((v) => v.discountType !== 'PERCENTAGE' || v.discountValue <= 100, {
    message: 'PERCENTAGE discountValue must be ≤ 100',
    path: ['discountValue'],
  })
  .refine((v) => !v.startsAt || !v.expiresAt || v.startsAt < v.expiresAt, {
    message: 'startsAt must be before expiresAt',
    path: ['startsAt'],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = createCouponBaseSchema.partial();
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export const couponIdParamSchema = z.object({ id: z.string().min(1) });
export type CouponIdParam = z.infer<typeof couponIdParamSchema>;
