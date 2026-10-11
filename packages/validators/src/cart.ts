/**
 * Shopping cart validators.
 */
import { z } from 'zod';

export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().nonnegative().max(99),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const removeFromCartSchema = z.object({
  itemId: z.string().min(1),
});
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase().trim(),
});
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

export const cartItemIdParamSchema = z.object({
  itemId: z.string().min(1),
});
export type CartItemIdParam = z.infer<typeof cartItemIdParamSchema>;
