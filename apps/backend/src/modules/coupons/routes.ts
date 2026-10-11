/**
 * Coupons module - route definitions.
 *
 * Two routers:
 *  - customerCouponsRouter: /coupons       (auth)
 *  - adminCouponsRouter:    /admin/coupons (admin)
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
customerCouponsRouter.post(
  '/validate',
  writeRateLimiter,
  validate(applyCouponSchema),
  asyncHandler(couponsController.validateCode),
);

export const adminCouponsRouter: Router = Router();
adminCouponsRouter.use(requireAdmin);

adminCouponsRouter.get(
  '/',
  requirePermission('coupon:view'),
  validate(couponFilterSchema, 'query'),
  asyncHandler(couponsController.list),
);
adminCouponsRouter.get(
  '/:id',
  requirePermission('coupon:view'),
  validate(couponIdParamSchema, 'params'),
  asyncHandler(couponsController.get),
);
adminCouponsRouter.post(
  '/',
  requirePermission('coupon:manage'),
  validate(createCouponSchema),
  asyncHandler(couponsController.create),
);
adminCouponsRouter.patch(
  '/:id',
  requirePermission('coupon:manage'),
  validate(couponIdParamSchema, 'params'),
  validate(updateCouponSchema),
  asyncHandler(couponsController.update),
);
adminCouponsRouter.delete(
  '/:id',
  requirePermission('coupon:manage'),
  validate(couponIdParamSchema, 'params'),
  asyncHandler(couponsController.remove),
);
