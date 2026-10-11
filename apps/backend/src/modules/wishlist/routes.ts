/**
 * Wishlist module - route definitions.
 */
import { Router } from 'express';
import { wishlistController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { writeRateLimiter } from '../../middleware/rate-limit';
import { addToWishlistSchema, productIdParamSchema } from './validators';

export const wishlistRouter: Router = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get('/', asyncHandler(wishlistController.list));
wishlistRouter.post(
  '/items',
  writeRateLimiter,
  validate(addToWishlistSchema),
  asyncHandler(wishlistController.add),
);
wishlistRouter.delete(
  '/items/:productId',
  writeRateLimiter,
  validate(productIdParamSchema, 'params'),
  asyncHandler(wishlistController.remove),
);
wishlistRouter.get(
  '/items/:productId',
  validate(productIdParamSchema, 'params'),
  asyncHandler(wishlistController.check),
);
