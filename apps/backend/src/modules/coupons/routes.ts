/**
 * Coupons module - route definitions.
 *
 * @openapi
 * tags:
 *   - name: Coupons (customer)
 *   - name: Admin · Coupons
 */
import { Router } from 'express';
import { couponsController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin, requirePermission } from '../../middleware/auth';
import { writeRateLimiter } from '../../middleware/rate-limit';
import {
  couponFilterSchema,
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema,
} from './validators';
import { applyCouponSchema } from '@anzara/validators';

export const customerCouponsRouter: Router = Router();
customerCouponsRouter.use(requireAuth);

/**
 * @openapi
 * /api/coupons/validate:
 *   post:
 *     tags: [Coupons (customer)]
 *     summary: Check if a code is valid for the current cart
 *     description: |
 *       Doesn't actually apply the coupon — use `POST /api/cart/coupon` for that.
 *       This is a "what-if" check used by the storefront's coupon input.
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
 *               code: { type: 'string' }
 *               cartTotal: { type: 'integer', description: 'paisa' }
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid: { type: 'boolean' }
 *                     coupon: { $ref: '#/components/schemas/Coupon' }
 *                     discount: { $ref: '#/components/schemas/Money' }
 *                     reason: { type: 'string', description: 'When valid: false, why' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
customerCouponsRouter.post(
  '/validate',
  writeRateLimiter,
  validate(applyCouponSchema),
  asyncHandler(couponsController.validateCode),
);

export const adminCouponsRouter: Router = Router();
adminCouponsRouter.use(requireAdmin);

/**
 * @openapi
 * /api/admin/coupons:
 *   get:
 *     tags: [Admin · Coupons]
 *     summary: List all coupons (admin)
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
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Coupon' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
adminCouponsRouter.get(
  '/',
  requirePermission('coupon:view'),
  validate(couponFilterSchema, 'query'),
  asyncHandler(couponsController.list),
);

/**
 * @openapi
 * /api/admin/coupons/{id}:
 *   get:
 *     tags: [Admin · Coupons]
 *     summary: Get one coupon (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *                 data: { $ref: '#/components/schemas/Coupon' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminCouponsRouter.get(
  '/:id',
  requirePermission('coupon:view'),
  validate(couponIdParamSchema, 'params'),
  asyncHandler(couponsController.get),
);

/**
 * @openapi
 * /api/admin/coupons:
 *   post:
 *     tags: [Admin · Coupons]
 *     summary: Create a coupon (admin)
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Coupon' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Coupon' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Duplicate code
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
adminCouponsRouter.post(
  '/',
  requirePermission('coupon:manage'),
  validate(createCouponSchema),
  asyncHandler(couponsController.create),
);

/**
 * @openapi
 * /api/admin/coupons/{id}:
 *   patch:
 *     tags: [Admin · Coupons]
 *     summary: Update a coupon (admin)
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
 *           schema: { $ref: '#/components/schemas/Coupon' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Coupon' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminCouponsRouter.patch(
  '/:id',
  requirePermission('coupon:manage'),
  validate(couponIdParamSchema, 'params'),
  validate(updateCouponSchema),
  asyncHandler(couponsController.update),
);

/**
 * @openapi
 * /api/admin/coupons/{id}:
 *   delete:
 *     tags: [Admin · Coupons]
 *     summary: Delete a coupon (admin)
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
adminCouponsRouter.delete(
  '/:id',
  requirePermission('coupon:manage'),
  validate(couponIdParamSchema, 'params'),
  asyncHandler(couponsController.remove),
);
