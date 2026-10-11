/**
 * Auth module - route definitions.
 * Maps URL + HTTP method to controller + validation middleware.
 *
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Login, logout, profile, password, 2FA
 */
import { Router } from 'express';
import { authController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { authRateLimiter, loginRateLimiter, otpRateLimiter } from '../../middleware/rate-limit';
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

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create a customer account
 *     description: |
 *       Public. Sets httpOnly `accessToken` and `refreshToken` cookies on
 *       success. The response body also includes the tokens (for
 *       non-browser clients like the smoke scripts).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AuthRegisterRequest' }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthLoginResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  '/register',
  authRateLimiter,
  validate(customerRegisterSchema),
  asyncHandler(authController.register),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Customer login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AuthLoginRequest' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthLoginResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401:
 *         description: Wrong email or password
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  '/login',
  loginRateLimiter,
  validate(customerLoginSchema),
  asyncHandler(authController.loginCustomer),
);

/**
 * @openapi
 * /api/auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin login
 *     description: |
 *       Sets httpOnly `adminAccessToken` and `adminRefreshToken` cookies.
 *       If the admin has 2FA enabled, include `totp` in the body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AuthAdminLoginRequest' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthLoginResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401:
 *         description: Wrong credentials, or 2FA required / wrong TOTP code
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  '/admin/login',
  loginRateLimiter,
  validate(adminLoginSchema),
  asyncHandler(authController.loginAdmin),
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password-reset email
 *     description: |
 *       Always returns 200, even if the email doesn't exist, to avoid
 *       email enumeration. In dev the reset link is written to
 *       `emails-outbox/` instead of being sent.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: 'string', format: 'email' }
 *     responses:
 *       200: { description: Always 200 }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset a password using a token from the email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: 'string' }
 *               password: { type: 'string', minLength: 8, format: 'password' }
 *     responses:
 *       200: { description: Password changed }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401:
 *         description: Token invalid or expired
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

/**
 * @openapi
 * /api/auth/otp/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request a phone OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: 'string', example: '+8801712345678' }
 *     responses:
 *       200: { description: OTP sent (in dev, written to emails-outbox/) }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  '/otp/request',
  otpRateLimiter,
  validate(otpRequestSchema),
  asyncHandler(authController.requestOtp),
);

/**
 * @openapi
 * /api/auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify a phone OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone: { type: 'string' }
 *               code: { type: 'string', example: '123456' }
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
 *                     verified: { type: 'boolean' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401:
 *         description: Wrong or expired OTP
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  '/otp/verify',
  authRateLimiter,
  validate(otpVerifySchema),
  asyncHandler(authController.verifyOtp),
);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new access+refresh pair
 *     description: |
 *       Works for both customer and admin. Pass the httpOnly cookie
 *       `refreshToken` (or `adminRefreshToken`).
 *     responses:
 *       200:
 *         description: New pair issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthLoginResponse' }
 *       401:
 *         description: Refresh token invalid or expired
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
authRouter.post('/refresh', asyncHandler(authController.refresh));

// ==================== Authenticated endpoints ====================
/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current customer profile
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
 *                 data: { $ref: '#/components/schemas/AuthLoginResponse/properties/data/properties/user' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
authRouter.get('/me', requireAuth, asyncHandler(authController.me));

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the current password
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: 'string', format: 'password' }
 *               newPassword: { type: 'string', format: 'password', minLength: 8 }
 *     responses:
 *       200: { description: Password changed }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
authRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

/**
 * @openapi
 * /api/auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Update the current customer profile
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: 'string' }
 *               lastName: { type: 'string' }
 *               phone: { type: 'string' }
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: 'string' }
 *                     email: { type: 'string' }
 *                     firstName: { type: 'string' }
 *                     lastName: { type: 'string' }
 *                     phone: { type: 'string' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
authRouter.patch(
  '/profile',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(authController.updateProfile),
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out (clears cookies)
 *     responses:
 *       200: { description: Always 200 }
 */
authRouter.post('/logout', asyncHandler(authController.logout));

// ==================== Admin-only — 2FA ====================
/**
 * @openapi
 * /api/auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Generate a 2FA TOTP secret + QR code (admin only)
 *     description: Returns the secret, the otpauth URL, and a data-URL QR. Verify with `POST /2fa/enable` to actually turn it on.
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret: { type: 'string' }
 *                     otpauthUrl: { type: 'string' }
 *                     qrCodeDataUrl: { type: 'string', description: 'PNG data URL' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
authRouter.post('/2fa/setup', requireAdmin, asyncHandler(authController.setupTotp));

/**
 * @openapi
 * /api/auth/2fa/enable:
 *   post:
 *     tags: [Auth]
 *     summary: Enable 2FA on the current admin account
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: 'string', example: '123456' }
 *     responses:
 *       200: { description: 2FA enabled }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
authRouter.post(
  '/2fa/enable',
  requireAdmin,
  validate(enableTotpSchema),
  asyncHandler(authController.enableTotp),
);

/**
 * @openapi
 * /api/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Disable 2FA on the current admin account
 *     security:
 *       - adminCookie: []
 *     responses:
 *       200: { description: 2FA disabled }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
authRouter.post('/2fa/disable', requireAdmin, asyncHandler(authController.disableTotp));
