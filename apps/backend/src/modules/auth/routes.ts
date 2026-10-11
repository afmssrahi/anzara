/**
 * Auth module - route definitions.
 * Maps URL + HTTP method to controller + validation middleware.
 */
import { Router } from 'express';
import { authController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import {
  customerRegisterSchema,
  customerLoginSchema,
  adminLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
} from './validators';

export const authRouter: Router = Router();

authRouter.post(
  '/register',
  validate(customerRegisterSchema),
  asyncHandler(authController.register),
);

authRouter.post(
  '/login',
  validate(customerLoginSchema),
  asyncHandler(authController.loginCustomer),
);

authRouter.post(
  '/admin/login',
  validate(adminLoginSchema),
  asyncHandler(authController.loginAdmin),
);

authRouter.post(
  '/otp/request',
  validate(otpRequestSchema),
  asyncHandler(authController.requestOtp),
);

authRouter.post('/otp/verify', validate(otpVerifySchema), asyncHandler(authController.verifyOtp));

authRouter.post('/refresh', asyncHandler(authController.refresh));

authRouter.post('/logout', asyncHandler(authController.logout));
