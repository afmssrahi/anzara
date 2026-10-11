/**
 * Auth module - HTTP layer.
 * Thin handlers: parse cookies, call service, set cookies, respond.
 */
import type { Request, Response } from 'express';
import { authService } from './service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { getEnv } from '@anzara/config';
import { recordAudit } from '../../lib/audit';
import type { AuthedRequest } from '../../middleware/auth';
import type {
  CustomerRegisterInput,
  CustomerLoginInput,
  AdminLoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
  EnableTotpInput,
} from '@anzara/validators';

const REFRESH_COOKIE = 'anzara_refresh';

function setRefreshCookie(res: Response, token: string): void {
  const env = getEnv();
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN,
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearRefreshCookie(res: Response): void {
  const env = getEnv();
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN,
    path: '/api/auth',
  });
}

function getRefreshToken(req: Request): string {
  return req.cookies?.[REFRESH_COOKIE] ?? '';
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.registerCustomer(req.body as CustomerRegisterInput);
    setRefreshCookie(res, result.tokens.refreshToken);
    sendCreated(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    });
  },

  async loginCustomer(req: Request, res: Response): Promise<void> {
    const result = await authService.loginCustomer(req.body as CustomerLoginInput);
    setRefreshCookie(res, result.tokens.refreshToken);
    sendSuccess(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    });
  },

  async loginAdmin(req: Request, res: Response): Promise<void> {
    const result = await authService.loginAdmin(req.body as AdminLoginInput);
    setRefreshCookie(res, result.tokens.refreshToken);
    sendSuccess(res, {
      admin: result.admin,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    });
  },

  async requestOtp(req: Request, res: Response): Promise<void> {
    const { email, purpose } = req.body as OtpRequestInput;
    await authService.requestOtp(email, purpose);
    sendSuccess(res, { message: 'OTP sent' });
  },

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const { email, code, purpose } = req.body as OtpVerifyInput;
    await authService.verifyOtp(email, code, purpose);
    sendSuccess(res, { message: 'OTP verified' });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token' },
      });
      return;
    }
    const tokens = await authService.refreshAccessToken(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    sendSuccess(res, {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshToken(req);
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearRefreshCookie(res);
    sendSuccess(res, { message: 'Logged out' });
  },

  // ==================== /me ====================
  async me(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthedRequest;
    if (authReq.admin) {
      const admin = await authService.getCurrentAdmin(authReq.admin.id);
      sendSuccess(res, { type: 'admin', user: admin });
      return;
    }
    if (authReq.user) {
      const user = await authService.getCurrentUser(authReq.user.id);
      sendSuccess(res, { type: 'customer', user });
    }
  },

  // ==================== Forgot / Reset password ====================
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as ForgotPasswordInput;
    await authService.requestPasswordReset(email);
    // Always 200 to prevent email enumeration
    sendSuccess(res, { message: 'If that email exists, a reset link has been sent.' });
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = req.body as ResetPasswordInput;
    await authService.resetPassword(token, newPassword);
    sendSuccess(res, { message: 'Password reset successful' });
  },

  // ==================== Change password (logged in) ====================
  async changePassword(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthedRequest;
    if (!authReq.user) throw new Error('User not found');
    await authService.changePassword(authReq.user.id, req.body as ChangePasswordInput);
    sendSuccess(res, { message: 'Password changed' });
  },

  // ==================== Profile ====================
  async updateProfile(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthedRequest;
    if (!authReq.user) throw new Error('User not found');
    const user = await authService.updateProfile(authReq.user.id, req.body as UpdateProfileInput);
    sendSuccess(res, user);
  },

  // ==================== 2FA ====================
  async setupTotp(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthedRequest;
    if (!authReq.admin) throw new Error('Admin not found');
    const { qrCode, secret } = await authService.setupTotp(authReq.admin.id, authReq.admin.email);
    sendSuccess(res, { qrCode, secret });
  },

  async enableTotp(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthedRequest;
    if (!authReq.admin) throw new Error('Admin not found');
    const { code } = req.body as EnableTotpInput;
    await authService.enableTotp(authReq.admin.id, code);
    await recordAudit({
      adminId: authReq.admin.id,
      action: 'admin.2fa.enable',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { message: '2FA enabled' });
  },

  async disableTotp(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthedRequest;
    if (!authReq.admin) throw new Error('Admin not found');
    await authService.disableTotp(authReq.admin.id);
    await recordAudit({
      adminId: authReq.admin.id,
      action: 'admin.2fa.disable',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { message: '2FA disabled' });
  },
};
