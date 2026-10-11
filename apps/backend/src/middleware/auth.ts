/**
 * Authentication middleware.
 * Reads the access token from the Authorization header, verifies it,
 * and attaches `req.user` (or `req.admin`).
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '@anzara/config';
import { prisma } from '@anzara/database';
import { UnauthorizedError } from '../lib/errors';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  type: 'customer' | 'admin';
  permissions?: string[];
}

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; firstName: string; lastName: string };
  admin?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    permissions: string[];
    role: string;
  };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.substring(7);
  }
  return null;
}

/** Require any authenticated user (customer or admin). */
export async function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const env = getEnv();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError('Authentication required');

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;

    if (payload.type === 'admin') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: payload.sub },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });
      if (!admin || !admin.isActive) {
        throw new UnauthorizedError('Account is disabled');
      }
      req.admin = {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role.name,
        permissions: admin.role.permissions.map((p) => p.permission.key),
      };
    } else {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedError('Account is disabled');
      }
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
      return;
    }
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/** Require admin authentication. */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    if (!req.admin) {
      next(new UnauthorizedError('Admin access required'));
      return;
    }
    next();
  });
}

/** Require a specific permission (admin only). */
export function requirePermission(permission: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.admin) {
      next(new UnauthorizedError('Admin access required'));
      return;
    }
    if (!req.admin.permissions.includes(permission)) {
      next(new UnauthorizedError(`Missing permission: ${permission}`));
      return;
    }
    next();
  };
}
