/**
 * Auth module - business logic.
 * No HTTP here. Receives parsed input, throws AppError, returns plain data.
 */
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { getEnv } from '@anzara/config';
import { authRepository } from './repository';
import { emailService } from '../../lib/email';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../lib/errors';
import type { CustomerRegisterInput, CustomerLoginInput, AdminLoginInput } from '@anzara/validators';

const BCRYPT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

// In-memory OTP cooldown tracker. Use Redis in production.
const otpCooldowns = new Map<string, number>();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  type: 'customer' | 'admin';
  permissions?: string[];
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateOtpCode(): string {
  const max = Math.pow(10, OTP_LENGTH);
  const min = Math.pow(10, OTP_LENGTH - 1);
  return Math.floor(min + Math.random() * (max - min)).toString();
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signAccessToken(payload: JwtAccessPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

function signRefreshToken(payload: { sub: string; type: 'customer' | 'admin' }): {
  token: string;
  expiresAt: Date;
} {
  const env = getEnv();
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
  // Decode to get expiry - simple parse since JWT format is known
  const decoded = jwt.decode(token) as { exp: number } | null;
  const expiresAt = decoded ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return { token, expiresAt };
}

function buildAccessExpiresIn(): number {
  const env = getEnv();
  // Parse "15m" or "1h" to seconds
  const match = env.JWT_ACCESS_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
}

export const authService = {
  // ==================== Customer registration ====================
  async registerCustomer(input: CustomerRegisterInput): Promise<{
    user: { id: string; email: string; firstName: string; lastName: string };
    tokens: AuthTokens;
  }> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email is already registered');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      preferredLocale: input.preferredLocale,
    });
    const tokens = await this.issueCustomerTokens(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens,
    };
  },

  // ==================== Customer login ====================
  async loginCustomer(input: CustomerLoginInput): Promise<{
    user: { id: string; email: string; firstName: string; lastName: string };
    tokens: AuthTokens;
  }> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('Account is suspended');
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }
    await authRepository.updateLastLogin(user.id);
    const tokens = await this.issueCustomerTokens(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens,
    };
  },

  // ==================== Admin login ====================
  async loginAdmin(input: AdminLoginInput): Promise<{
    admin: { id: string; email: string; firstName: string; lastName: string; role: string; permissions: string[] };
    tokens: AuthTokens;
  }> {
    const admin = await authRepository.findAdminByEmail(input.email);
    if (!admin) {
      throw new UnauthorizedError('Invalid credentials');
    }
    if (!admin.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }
    const valid = await verifyPassword(input.password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }
    // 2FA check
    if (admin.twoFactorEnabled) {
      if (!input.totpCode) {
        throw new BadRequestError('2FA code required', { code: 'TWO_FACTOR_REQUIRED' });
      }
      // TOTP verification will be added with 2FA implementation
      // For now, placeholder - the full TOTP verification is in Phase 1.5
    }
    await authRepository.updateAdminLastLogin(admin.id);
    const permissions = admin.role.permissions.map((p) => p.permission.key);
    const tokens = await this.issueAdminTokens(admin.id, admin.email, permissions);
    return {
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role.name,
        permissions,
      },
      tokens,
    };
  },

  // ==================== OTP request ====================
  async requestOtp(email: string, purpose: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD'): Promise<void> {
    const cooldownKey = `${email}:${purpose}`;
    const lastSent = otpCooldowns.get(cooldownKey);
    if (lastSent && Date.now() - lastSent < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      throw new BadRequestError(`Please wait ${OTP_RESEND_COOLDOWN_SECONDS}s before requesting another code`);
    }
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await authRepository.createOtp({ email, code, purpose, expiresAt });
    otpCooldowns.set(cooldownKey, Date.now());
    // Send via email (SMS deferred to later phase)
    await emailService.sendOtp(email, code, purpose);
  },

  // ==================== OTP verify ====================
  async verifyOtp(email: string, code: string, purpose: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD'): Promise<void> {
    const otp = await authRepository.findValidOtp(email, code, purpose);
    if (!otp) {
      throw new BadRequestError('Invalid or expired code');
    }
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestError('Too many attempts. Request a new code.');
    }
    await authRepository.consumeOtp(otp.id);
  },

  // ==================== Refresh token ====================
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const env = getEnv();
    let payload: { sub: string; type: 'customer' | 'admin' };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as typeof payload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
    const tokenHash = hashToken(refreshToken);
    if (payload.type === 'customer') {
      const stored = await authRepository.findRefreshToken(tokenHash);
      if (!stored || stored.revokedAt) {
        throw new UnauthorizedError('Refresh token revoked');
      }
      const user = stored.user;
      return this.issueCustomerTokens(user.id, user.email);
    }
    const stored = await authRepository.findAdminRefreshToken(tokenHash);
    if (!stored || stored.revokedAt) {
      throw new UnauthorizedError('Refresh token revoked');
    }
    const admin = stored.admin;
    const fresh = await authRepository.findAdminByEmail(admin.email);
    const permissions = fresh?.role.permissions.map((p) => p.permission.key) ?? [];
    return this.issueAdminTokens(admin.id, admin.email, permissions);
  },

  // ==================== Logout ====================
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await authRepository.revokeRefreshToken(tokenHash);
  },

  // ==================== Helpers ====================
  async issueCustomerTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = signAccessToken({ sub: userId, email, type: 'customer' });
    const { token: refreshToken, expiresAt } = signRefreshToken({ sub: userId, type: 'customer' });
    await authRepository.storeRefreshToken({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });
    return { accessToken, refreshToken, expiresIn: buildAccessExpiresIn() };
  },

  async issueAdminTokens(adminId: string, email: string, permissions: string[]): Promise<AuthTokens> {
    const accessToken = signAccessToken({ sub: adminId, email, type: 'admin', permissions });
    const { token: refreshToken, expiresAt } = signRefreshToken({ sub: adminId, type: 'admin' });
    await authRepository.storeRefreshToken({
      adminId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });
    return { accessToken, refreshToken, expiresIn: buildAccessExpiresIn() };
  },
};
