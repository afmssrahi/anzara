/**
 * Auth module - HTTP layer.
 * Thin handlers: parse cookies, call service, set cookies, respond.
 */
import type { Request, Response } from 'express';
import { authService } from './service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { getEnv } from '@anzara/config';
import type {
  CustomerRegisterInput,
  CustomerLoginInput,
  AdminLoginInput,
  OtpRequestInput,
  OtpVerifyInput,
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
};
