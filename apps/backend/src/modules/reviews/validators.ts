/**
 * Reviews module - Zod validators.
 */
import { z } from 'zod';

export const productIdParamSchema = z.object({
  productId: z.string().min(1),
});

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(2).max(120).optional(),
  comment: z.string().min(10).max(2000),
  images: z.array(z.string().url()).max(5).default([]),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().min(2).max(120).optional(),
  comment: z.string().min(10).max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const reviewFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isApproved: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  productId: z.string().optional(),
  search: z.string().optional(),
});
export type ReviewFilterInput = z.infer<typeof reviewFilterSchema>;

export const reviewIdParamSchema = z.object({ id: z.string().min(1) });
export type ReviewIdParam = z.infer<typeof reviewIdParamSchema>;

export const moderateReviewSchema = z.object({
  isApproved: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
