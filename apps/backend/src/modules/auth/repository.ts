/**
 * Auth module - data access layer.
 * All Prisma queries for auth live here. Service code never touches Prisma directly.
 */
import { prisma } from '@anzara/database';

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findAdminByEmail(email: string) {
    return prisma.adminUser.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
  },

  createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    preferredLocale: string;
  }) {
    return prisma.user.create({ data });
  },

  async storeRefreshToken(data: {
    userId?: string;
    adminId?: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    if (data.userId) {
      return prisma.refreshToken.create({
        data: {
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
        },
      });
    }
    if (data.adminId) {
      return prisma.adminRefreshToken.create({
        data: {
          adminId: data.adminId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      });
    }
    throw new Error('storeRefreshToken requires userId or adminId');
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  },

  findAdminRefreshToken(tokenHash: string) {
    return prisma.adminRefreshToken.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });
  },

  revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  createOtp(data: { email: string; code: string; purpose: string; expiresAt: Date }) {
    return prisma.otpCode.create({ data });
  },

  findValidOtp(email: string, code: string, purpose: string) {
    return prisma.otpCode.findFirst({
      where: {
        email,
        code,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  consumeOtp(id: string) {
    return prisma.otpCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  },

  incrementOtpAttempts(id: string) {
    return prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  },

  updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  },

  updateAdminLastLogin(adminId: string) {
    return prisma.adminUser.update({
      where: { id: adminId },
      data: { lastLoginAt: new Date() },
    });
  },

  setUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  setAdminTotpSecret(adminId: string, secret: string) {
    return prisma.adminUser.update({
      where: { id: adminId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
  },

  enableAdminTotp(adminId: string) {
    return prisma.adminUser.update({
      where: { id: adminId },
      data: { twoFactorEnabled: true },
    });
  },

  disableAdminTotp(adminId: string) {
    return prisma.adminUser.update({
      where: { id: adminId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  },
};
