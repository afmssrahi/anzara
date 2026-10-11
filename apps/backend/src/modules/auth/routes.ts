/**
 * Auth module - route definitions.
 * Maps URL + HTTP method to controller + validation middleware.
 */
import { Router } from 'express';
import { authController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { authRateLimiter, otpRateLimiter } from '../../middleware/rate-limit';
import {
  customerRegisterSchema,
  customerLoginSchema,
  adminLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  enableTotpSchema,
} from './validators';

export const authRouter: Router = Router();

// ==================== Public endpoints (rate-limited) ====================
authRouter.post(
  '/register',
  authRateLimiter,
  validate(customerRegisterSchema),
  asyncHandler(authController.register),
);

authRouter.post(
  '/login',
  authRateLimiter,
  validate(customerLoginSchema),
  asyncHandler(authController.loginCustomer),
);

authRouter.post(
  '/admin/login',
  authRateLimiter,
  validate(adminLoginSchema),
  asyncHandler(authController.loginAdmin),
);

authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

authRouter.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

authRouter.post(
  '/otp/request',
  otpRateLimiter,
  validate(otpRequestSchema),
  asyncHandler(authController.requestOtp),
);

authRouter.post(
  '/otp/verify',
  authRateLimiter,
  validate(otpVerifySchema),
  asyncHandler(authController.verifyOtp),
);

authRouter.post('/refresh', asyncHandler(authController.refresh));

// ==================== Authenticated endpoints ====================
authRouter.get('/me', requireAuth, asyncHandler(authController.me));

authRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

authRouter.patch(
  '/profile',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(authController.updateProfile),
);

authRouter.post('/logout', asyncHandler(authController.logout));

// ==================== Admin-only — 2FA ====================
authRouter.post('/2fa/setup', requireAdmin, asyncHandler(authController.setupTotp));

authRouter.post(
  '/2fa/enable',
  requireAdmin,
  validate(enableTotpSchema),
  asyncHandler(authController.enableTotp),
);

authRouter.post('/2fa/disable', requireAdmin, asyncHandler(authController.disableTotp));
