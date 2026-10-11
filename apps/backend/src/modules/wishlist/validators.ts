/**
 * Wishlist validators.
 */
import { z } from 'zod';

export const addToWishlistSchema = z.object({
  productId: z.string().min(1),
});
export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;

export const productIdParamSchema = z.object({
  productId: z.string().min(1),
});
