/**
 * Wishlist module - route definitions.
 *
 * @openapi
 * tags:
 *   - name: Wishlist
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

/**
 * @openapi
 * /api/wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: List your wishlist
 *     security:
 *       - customerCookie: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
wishlistRouter.get('/', asyncHandler(wishlistController.list));

/**
 * @openapi
 * /api/wishlist/items:
 *   post:
 *     tags: [Wishlist]
 *     summary: Add a product to your wishlist (idempotent)
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: 'string' }
 *     responses:
 *       200:
 *         description: Wishlist (no change if already there)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
wishlistRouter.post(
  '/items',
  writeRateLimiter,
  validate(addToWishlistSchema),
  asyncHandler(wishlistController.add),
);

/**
 * @openapi
 * /api/wishlist/items/{productId}:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove a product from your wishlist
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: Updated wishlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
wishlistRouter.delete(
  '/items/:productId',
  writeRateLimiter,
  validate(productIdParamSchema, 'params'),
  asyncHandler(wishlistController.remove),
);

/**
 * @openapi
 * /api/wishlist/items/{productId}:
 *   get:
 *     tags: [Wishlist]
 *     summary: Check if a product is in your wishlist (used by the heart icon)
 *     security:
 *       - customerCookie: []
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     inWishlist: { type: 'boolean' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
wishlistRouter.get(
  '/items/:productId',
  validate(productIdParamSchema, 'params'),
  asyncHandler(wishlistController.check),
);
