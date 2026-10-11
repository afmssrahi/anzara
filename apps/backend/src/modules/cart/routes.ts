/**
 * Cart module - route definitions.
 * All endpoints require a logged-in customer. Guest cart is a Phase 3.5 item.
 */
import { Router } from 'express';
import { cartController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { writeRateLimiter } from '../../middleware/rate-limit';
import {
  addToCartSchema,
  applyCouponSchema,
  updateCartItemSchema,
  cartItemIdParamSchema,
} from '@anzara/validators';

export const cartRouter: Router = Router();

cartRouter.use(requireAuth);

cartRouter.get('/', asyncHandler(cartController.get));
cartRouter.post(
  '/items',
  writeRateLimiter,
  validate(addToCartSchema),
  asyncHandler(cartController.addItem),
);
cartRouter.patch(
  '/items/:itemId',
  writeRateLimiter,
  validate(cartItemIdParamSchema, 'params'),
  validate(updateCartItemSchema),
  asyncHandler(cartController.updateItem),
);
cartRouter.delete(
  '/items/:itemId',
  writeRateLimiter,
  validate(cartItemIdParamSchema, 'params'),
  asyncHandler(cartController.removeItem),
);
cartRouter.delete('/', writeRateLimiter, asyncHandler(cartController.clear));

// Coupons on the cart (apply / remove)
cartRouter.post(
  '/coupon',
  writeRateLimiter,
  validate(applyCouponSchema),
  asyncHandler(cartController.applyCoupon),
);
cartRouter.delete('/coupon', writeRateLimiter, asyncHandler(cartController.removeCoupon));
