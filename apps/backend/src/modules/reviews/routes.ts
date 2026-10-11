/**
 * Reviews module - route definitions.
 *
 * Single router for /reviews: public list + summary endpoints are
 * unauthenticated; create / update / delete require the customer to be
 * logged in. Admin actions live under /admin/reviews.
 */
import { Router } from 'express';
import { reviewsController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin, requirePermission } from '../../middleware/auth';
import { writeRateLimiter } from '../../middleware/rate-limit';
import {
  createReviewSchema,
  moderateReviewSchema,
  productIdParamSchema,
  reviewFilterSchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from './validators';

export const reviewsRouter: Router = Router();

// ----- Public -----
reviewsRouter.get(
  '/products/:productId',
  validate(productIdParamSchema, 'params'),
  asyncHandler(reviewsController.listForProduct),
);
reviewsRouter.get(
  '/products/:productId/summary',
  validate(productIdParamSchema, 'params'),
  asyncHandler(reviewsController.summary),
);

// ----- Customer (auth required from here down) -----
const customerRoutes = Router();
customerRoutes.use(requireAuth);
customerRoutes.post(
  '/',
  writeRateLimiter,
  validate(createReviewSchema),
  asyncHandler(reviewsController.create),
);
customerRoutes.patch(
  '/:id',
  writeRateLimiter,
  validate(reviewIdParamSchema, 'params'),
  validate(updateReviewSchema),
  asyncHandler(reviewsController.updateMine),
);
customerRoutes.delete(
  '/:id',
  writeRateLimiter,
  validate(reviewIdParamSchema, 'params'),
  asyncHandler(reviewsController.deleteMine),
);
reviewsRouter.use(customerRoutes);

// ----- Admin -----
export const adminReviewsRouter: Router = Router();
adminReviewsRouter.use(requireAdmin);
adminReviewsRouter.get(
  '/',
  requirePermission('review:moderate'),
  validate(reviewFilterSchema, 'query'),
  asyncHandler(reviewsController.listForAdmin),
);
adminReviewsRouter.patch(
  '/:id/moderate',
  requirePermission('review:moderate'),
  validate(reviewIdParamSchema, 'params'),
  validate(moderateReviewSchema),
  asyncHandler(reviewsController.moderate),
);
adminReviewsRouter.delete(
  '/:id',
  requirePermission('review:moderate'),
  validate(reviewIdParamSchema, 'params'),
  asyncHandler(reviewsController.delete),
);
