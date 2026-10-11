/**
 * Coupons module - business logic.
 *
 * Three public surfaces:
 *   - admin: list / get / create / update / delete
 *   - customer: preview a code (does it apply to my cart?)
 *   - checkout: validate + atomically redeem (called from orders.service.ts
 *     inside the order-create transaction)
 */
import { BadRequestError, NotFoundError, ValidationError } from '../../lib/errors';
import { couponsRepository } from './repository';
import { toAdminCouponDto } from './dto';
import type { CouponFilterInput, CreateCouponInput, UpdateCouponInput } from './validators';
import type { Prisma } from '@prisma/client';

export interface CouponPreview {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  /** Paisa discount this code would produce against `subtotalPaisa`. */
  discountPaisa: number;
  /** Subtotal after the discount. */
  newSubtotalPaisa: number;
  /** Human-readable description for the cart page. */
  description: string | null;
}

export const couponsService = {
  // ----------------------------------------------------------------
  // Admin
  // ----------------------------------------------------------------
  async list(query: CouponFilterInput) {
    const { items, total } = await couponsRepository.list({
      page: query.page,
      limit: query.limit,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return {
      data: items.map((c) => toAdminCouponDto(c)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  },

  async get(id: string) {
    const c = await couponsRepository.findById(id);
    if (!c) throw new NotFoundError('Coupon not found');
    return toAdminCouponDto(c);
  },

  async create(input: CreateCouponInput) {
    const existing = await couponsRepository.findByCode(input.code);
    if (existing) throw new BadRequestError(`Coupon code "${input.code}" already exists`);
    const created = await couponsRepository.create({
      code: input.code,
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount,
      ...(input.maxDiscountAmount !== undefined
        ? { maxDiscountAmount: input.maxDiscountAmount }
        : {}),
      ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
      ...(input.perUserLimit !== undefined ? { perUserLimit: input.perUserLimit } : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      isActive: input.isActive,
      productIds: input.productIds,
      categoryIds: input.categoryIds,
      firstOrderOnly: input.firstOrderOnly,
    });
    return toAdminCouponDto(created);
  },

  async update(id: string, input: UpdateCouponInput) {
    const existing = await couponsRepository.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found');
    const updated = await couponsRepository.update(id, {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
      ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
      ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
      ...(input.maxDiscountAmount !== undefined
        ? { maxDiscountAmount: input.maxDiscountAmount }
        : {}),
      ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
      ...(input.perUserLimit !== undefined ? { perUserLimit: input.perUserLimit } : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.productIds !== undefined ? { productIds: input.productIds } : {}),
      ...(input.categoryIds !== undefined ? { categoryIds: input.categoryIds } : {}),
      ...(input.firstOrderOnly !== undefined ? { firstOrderOnly: input.firstOrderOnly } : {}),
    });
    return toAdminCouponDto(updated);
  },

  async remove(id: string) {
    const existing = await couponsRepository.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found');
    await couponsRepository.delete(id);
  },

  // ----------------------------------------------------------------
  // Customer: validate + preview (no side effects)
  // ----------------------------------------------------------------
  async validateForUser(args: {
    code: string;
    userId: string;
    subtotalPaisa: number;
    /** Variants currently in the cart (for product/category restrictions). */
    cartVariants: Array<{ productId: string; categoryId: string | null }>;
  }): Promise<CouponPreview> {
    const code = args.code.trim().toUpperCase();
    const c = await couponsRepository.findByCode(code);
    if (!c) throw new BadRequestError(`Coupon "${args.code}" is not valid`);
    if (!c.isActive) throw new BadRequestError(`Coupon "${args.code}" is no longer active`);
    const now = new Date();
    if (c.startsAt && c.startsAt > now) {
      throw new BadRequestError(`Coupon "${args.code}" is not yet active`);
    }
    if (c.expiresAt && c.expiresAt < now) {
      throw new BadRequestError(`Coupon "${args.code}" has expired`);
    }
    if (c.usageLimit !== null && c.usageCount >= c.usageLimit) {
      throw new BadRequestError(`Coupon "${args.code}" has reached its usage limit`);
    }
    if (args.subtotalPaisa < c.minOrderAmount) {
      throw new BadRequestError(
        `Coupon "${args.code}" requires a minimum order of ৳${(c.minOrderAmount / 100).toFixed(2)}`,
      );
    }
    if (c.firstOrderOnly) {
      const orderCount = await couponsRepository.countOrdersForUser(args.userId);
      if (orderCount > 0) {
        throw new BadRequestError(`Coupon "${args.code}" is only valid on your first order`);
      }
    }
    if (c.perUserLimit !== null) {
      const used = await couponsRepository.countUsagesForUser(c.id, args.userId);
      if (used >= c.perUserLimit) {
        throw new BadRequestError(
          `Coupon "${args.code}" can only be used ${c.perUserLimit} time(s) per customer`,
        );
      }
    }
    if (c.productIds.length > 0) {
      const productIdsInCart = new Set(args.cartVariants.map((v) => v.productId));
      const hasMatching = c.productIds.some((id) => productIdsInCart.has(id));
      if (!hasMatching) {
        throw new BadRequestError(`Coupon "${args.code}" is not valid for the items in your cart`);
      }
    }
    if (c.categoryIds.length > 0) {
      const categoryIdsInCart = new Set(
        args.cartVariants.map((v) => v.categoryId).filter((x): x is string => x !== null),
      );
      const hasMatching = c.categoryIds.some((id) => categoryIdsInCart.has(id));
      if (!hasMatching) {
        throw new BadRequestError(`Coupon "${args.code}" is not valid for the items in your cart`);
      }
    }

    const discountPaisa = computeDiscountPaisa(c, args.subtotalPaisa);
    return {
      code: c.code,
      discountType: c.discountType as 'PERCENTAGE' | 'FIXED',
      discountValue: c.discountValue,
      discountPaisa,
      newSubtotalPaisa: Math.max(0, args.subtotalPaisa - discountPaisa),
      description: c.description,
    };
  },

  // ----------------------------------------------------------------
  // Checkout: validate + atomically redeem (called from orders.service.ts)
  // ----------------------------------------------------------------
  /**
   * Validates a coupon against the live cart and reserves it (increments
   * usageCount, records a CouponUsage row) inside the caller's transaction.
   * Returns the discount paisa to apply.
   */
  async txRedeem(args: {
    tx: Prisma.TransactionClient;
    code: string;
    userId: string;
    orderId: string;
    subtotalPaisa: number;
    cartVariants: Array<{ productId: string; categoryId: string | null }>;
  }): Promise<{ code: string; discountPaisa: number }> {
    const code = args.code.trim().toUpperCase();
    const c = await args.tx.coupon.findUnique({ where: { code } });
    if (!c) throw new ValidationError(`Coupon "${args.code}" is not valid`);
    if (!c.isActive) throw new ValidationError(`Coupon "${args.code}" is no longer active`);
    const now = new Date();
    if (c.startsAt && c.startsAt > now) {
      throw new ValidationError(`Coupon "${args.code}" is not yet active`);
    }
    if (c.expiresAt && c.expiresAt < now) {
      throw new ValidationError(`Coupon "${args.code}" has expired`);
    }
    if (c.usageLimit !== null && c.usageCount >= c.usageLimit) {
      throw new ValidationError(`Coupon "${args.code}" has reached its usage limit`);
    }
    if (args.subtotalPaisa < c.minOrderAmount) {
      throw new ValidationError(
        `Coupon "${args.code}" requires a minimum order of ৳${(c.minOrderAmount / 100).toFixed(2)}`,
      );
    }
    if (c.firstOrderOnly) {
      // The order is not yet in the DB at this point, but we already
      // created the row via txCreate. Count other non-cancelled orders.
      const orderCount = await args.tx.order.count({
        where: { userId: args.userId, status: { not: 'CANCELLED' } },
      });
      if (orderCount > 0) {
        throw new ValidationError(`Coupon "${args.code}" is only valid on your first order`);
      }
    }
    if (c.perUserLimit !== null) {
      const used = await args.tx.couponUsage.count({
        where: { couponId: c.id, userId: args.userId },
      });
      if (used >= c.perUserLimit) {
        throw new ValidationError(
          `Coupon "${args.code}" can only be used ${c.perUserLimit} time(s) per customer`,
        );
      }
    }
    if (c.productIds.length > 0) {
      const productIdsInCart = new Set(args.cartVariants.map((v) => v.productId));
      const hasMatching = c.productIds.some((id) => productIdsInCart.has(id));
      if (!hasMatching) {
        throw new ValidationError(`Coupon "${args.code}" is not valid for the items in your cart`);
      }
    }
    if (c.categoryIds.length > 0) {
      const categoryIdsInCart = new Set(
        args.cartVariants.map((v) => v.categoryId).filter((x): x is string => x !== null),
      );
      const hasMatching = c.categoryIds.some((id) => categoryIdsInCart.has(id));
      if (!hasMatching) {
        throw new ValidationError(`Coupon "${args.code}" is not valid for the items in your cart`);
      }
    }

    const discountPaisa = computeDiscountPaisa(c, args.subtotalPaisa);
    await couponsRepository.txIncrementUsage(args.tx, c.id);
    await couponsRepository.recordUsage(args.tx, {
      couponId: c.id,
      userId: args.userId,
      orderId: args.orderId,
      discount: discountPaisa,
    });
    return { code: c.code, discountPaisa };
  },
};

/**
 * Pure helper. Given a coupon and a subtotal in paisa, return the discount
 * in paisa. Honors `maxDiscountAmount` for PERCENTAGE coupons.
 */
function computeDiscountPaisa(
  c: { discountType: string; discountValue: number; maxDiscountAmount: number | null },
  subtotalPaisa: number,
): number {
  if (c.discountType === 'PERCENTAGE') {
    const raw = Math.floor((subtotalPaisa * c.discountValue) / 100);
    return c.maxDiscountAmount !== null ? Math.min(raw, c.maxDiscountAmount) : raw;
  }
  // FIXED: paisa directly.
  return Math.min(c.discountValue, subtotalPaisa);
}
