/**
 * Coupons module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { couponsService } from './service';
import { sendSuccess } from '../../lib/response';
import { recordAudit } from '../../lib/audit';
import { prisma } from '@anzara/database';
import { cartsRepository } from '../cart/repository';
import {
  couponFilterSchema,
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema,
} from './validators';
import { validate } from '../../middleware/validate';
import type { AuthedRequest } from '../../middleware/auth';
import { BadRequestError } from '../../lib/errors';
import { applyCouponSchema } from '@anzara/validators';

function adminId(req: Request): string | null {
  return (req as AuthedRequest).admin?.id ?? null;
}

export const couponsController = {
  // ----- Admin -----
  async list(req: Request, res: Response): Promise<void> {
    const q = couponFilterSchema.parse(req.query);
    sendSuccess(res, await couponsService.list(q));
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = couponIdParamSchema.parse(req.params);
    sendSuccess(res, await couponsService.get(id));
  },

  async create(req: Request, res: Response): Promise<void> {
    const body = createCouponSchema.parse(req.body);
    const dto = await couponsService.create(body);
    await recordAudit({
      ...(adminId(req) ? { adminId: adminId(req) as string } : {}),
      action: 'coupon.create',
      entity: 'Coupon',
      entityId: dto.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { code: dto.code, discountType: dto.discountType },
    });
    sendSuccess(res, dto);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = couponIdParamSchema.parse(req.params);
    const body = updateCouponSchema.parse(req.body);
    const dto = await couponsService.update(id, body);
    await recordAudit({
      ...(adminId(req) ? { adminId: adminId(req) as string } : {}),
      action: 'coupon.update',
      entity: 'Coupon',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, dto);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = couponIdParamSchema.parse(req.params);
    await couponsService.remove(id);
    await recordAudit({
      ...(adminId(req) ? { adminId: adminId(req) as string } : {}),
      action: 'coupon.delete',
      entity: 'Coupon',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { id });
  },

  // ----- Customer -----
  /**
   * Validate a coupon code against the user's current cart. No side
   * effects — preview only. The actual redemption happens at checkout.
   */
  async validateCode(req: Request, res: Response): Promise<void> {
    const { code } = applyCouponSchema.parse(req.body);
    const userId = (req as AuthedRequest).user?.id;
    if (!userId) throw new BadRequestError('Login required');
    const cart = await cartsRepository.findActiveByUser(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }
    const subtotalPaisa = cart.items.reduce((s, it) => s + it.quantity * it.variant.price, 0);
    const cartVariants = cart.items.map((it) => {
      const v = it.variant;
      return {
        productId: v.productId,
        categoryId: v.product.categoryId ?? null,
      };
    });
    const preview = await couponsService.validateForUser({
      code,
      userId,
      subtotalPaisa,
      cartVariants,
    });
    sendSuccess(res, preview);
  },
};

// A small helper so the audit helper stops complaining about unused imports.
void prisma;
void validate;
void z;
