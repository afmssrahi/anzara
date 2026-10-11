/**
 * Reviews module - route definitions.
 *
 * @openapi
 * tags:
 *   - name: Reviews
 *   - name: Admin · Reviews
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

/**
 * @openapi
 * /api/reviews/products/{productId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Approved reviews for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Review' } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
reviewsRouter.get(
  '/products/:productId',
  validate(productIdParamSchema, 'params'),
  asyncHandler(reviewsController.listForProduct),
);

/**
 * @openapi
 * /api/reviews/products/{productId}/summary:
 *   get:
 *     tags: [Reviews]
 *     summary: Rating summary (count + average + histogram)
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/ReviewSummary' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
reviewsRouter.get(
  '/products/:productId/summary',
  validate(productIdParamSchema, 'params'),
  asyncHandler(reviewsController.summary),
);

// Customer (auth required)
const customerRoutes = Router();
customerRoutes.use(requireAuth);

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a review (verified-buyer only)
 *     description: You can only review products you've actually ordered. The server checks this.
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, rating]
 *             properties:
 *               productId: { type: 'string' }
 *               rating: { type: 'integer', minimum: 1, maximum: 5 }
 *               title: { type: 'string', maxLength: 120 }
 *               comment: { type: 'string', maxLength: 2000 }
 *               images: { type: 'array', items: { type: 'string', format: 'uri' } }
 *     responses:
 *       201:
 *         description: Created (pending approval)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Review' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not a verified buyer
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
customerRoutes.post(
  '/',
  writeRateLimiter,
  validate(createReviewSchema),
  asyncHandler(reviewsController.create),
);

/**
 * @openapi
 * /api/reviews/{id}:
 *   patch:
 *     tags: [Reviews]
 *     summary: Update your own review
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: 'integer', minimum: 1, maximum: 5 }
 *               title: { type: 'string', maxLength: 120 }
 *               comment: { type: 'string', maxLength: 2000 }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Review' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
customerRoutes.patch(
  '/:id',
  writeRateLimiter,
  validate(reviewIdParamSchema, 'params'),
  validate(updateReviewSchema),
  asyncHandler(reviewsController.updateMine),
);

/**
 * @openapi
 * /api/reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete your own review
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
customerRoutes.delete(
  '/:id',
  writeRateLimiter,
  validate(reviewIdParamSchema, 'params'),
  asyncHandler(reviewsController.deleteMine),
);
reviewsRouter.use(customerRoutes);

// Admin
export const adminReviewsRouter: Router = Router();
adminReviewsRouter.use(requireAdmin);

/**
 * @openapi
 * /api/admin/reviews:
 *   get:
 *     tags: [Admin · Reviews]
 *     summary: List ALL reviews (admin) — with `?status=pending` to see the moderation queue
 *     security:
 *       - adminCookie: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Review' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
adminReviewsRouter.get(
  '/',
  requirePermission('review:moderate'),
  validate(reviewFilterSchema, 'query'),
  asyncHandler(reviewsController.listForAdmin),
);

/**
 * @openapi
 * /api/admin/reviews/{id}/moderate:
 *   patch:
 *     tags: [Admin · Reviews]
 *     summary: Approve / reject / feature a review (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isApproved: { type: 'boolean' }
 *               isFeatured: { type: 'boolean' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Review' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminReviewsRouter.patch(
  '/:id/moderate',
  requirePermission('review:moderate'),
  validate(reviewIdParamSchema, 'params'),
  validate(moderateReviewSchema),
  asyncHandler(reviewsController.moderate),
);

/**
 * @openapi
 * /api/admin/reviews/{id}:
 *   delete:
 *     tags: [Admin · Reviews]
 *     summary: Delete a review (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminReviewsRouter.delete(
  '/:id',
  requirePermission('review:moderate'),
  validate(reviewIdParamSchema, 'params'),
  asyncHandler(reviewsController.delete),
);
