/**
 * Cart module - route definitions.
 * All endpoints require a logged-in customer.
 *
 * @openapi
 * tags:
 *   - name: Cart
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

/**
 * @openapi
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current cart
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
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
cartRouter.get('/', asyncHandler(cartController.get));

/**
 * @openapi
 * /api/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add a variant to the cart
 *     description: |
 *       Stock is reserved for `CART_RESERVATION_MINUTES` (15 min by default)
 *       and released if the cart sits idle past that.
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variantId, quantity]
 *             properties:
 *               variantId: { type: 'string' }
 *               quantity: { type: 'integer', minimum: 1, default: 1 }
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       400:
 *         description: Out of stock or invalid input
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
cartRouter.post(
  '/items',
  writeRateLimiter,
  validate(addToCartSchema),
  asyncHandler(cartController.addItem),
);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update a cart item's quantity
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: 'integer', minimum: 1 }
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
cartRouter.patch(
  '/items/:itemId',
  writeRateLimiter,
  validate(cartItemIdParamSchema, 'params'),
  validate(updateCartItemSchema),
  asyncHandler(cartController.updateItem),
);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove an item from the cart
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
cartRouter.delete(
  '/items/:itemId',
  writeRateLimiter,
  validate(cartItemIdParamSchema, 'params'),
  asyncHandler(cartController.removeItem),
);

/**
 * @openapi
 * /api/cart:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear the cart
 *     security:
 *       - customerCookie: []
 *     responses:
 *       200:
 *         description: Empty cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
cartRouter.delete('/', writeRateLimiter, asyncHandler(cartController.clear));

/**
 * @openapi
 * /api/cart/coupon:
 *   post:
 *     tags: [Cart]
 *     summary: Apply a coupon to the cart
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: 'string', example: EID2026 }
 *     responses:
 *       200:
 *         description: Coupon applied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       400:
 *         description: Invalid / expired / not applicable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
cartRouter.post(
  '/coupon',
  writeRateLimiter,
  validate(applyCouponSchema),
  asyncHandler(cartController.applyCoupon),
);

/**
 * @openapi
 * /api/cart/coupon:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove the applied coupon
 *     security:
 *       - customerCookie: []
 *     responses:
 *       200:
 *         description: Coupon removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
cartRouter.delete('/coupon', writeRateLimiter, asyncHandler(cartController.removeCoupon));
