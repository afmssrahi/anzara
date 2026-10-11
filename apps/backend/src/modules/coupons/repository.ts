/**
 * Coupons module - data access layer.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

const COUPON_INCLUDE = {
  usages: {
    select: { id: true, userId: true, orderId: true, discount: true, usedAt: true },
  },
} satisfies Prisma.CouponInclude;

export const couponsRepository = {
  async findById(id: string) {
    return prisma.coupon.findUnique({ where: { id }, include: COUPON_INCLUDE });
  },

  async findByCode(code: string) {
    return prisma.coupon.findUnique({ where: { code }, include: COUPON_INCLUDE });
  },

  async list(params: { page: number; limit: number; isActive?: boolean; search?: string }) {
    const { page, limit, isActive, search } = params;
    const where: Prisma.CouponWhereInput = {};
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { usages: true } } },
      }),
      prisma.coupon.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: Prisma.CouponUncheckedCreateInput) {
    return prisma.coupon.create({ data });
  },

  async update(id: string, data: Prisma.CouponUpdateInput) {
    return prisma.coupon.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.coupon.delete({ where: { id } });
  },

  /**
   * Atomically increment a coupon's usageCount by 1, only if it has room
   * left under its `usageLimit` (or no limit set). Returns the updated row.
   * Throws when the limit has been hit, so the caller's transaction can
   * roll back the order creation.
   */
  async txIncrementUsage(
    tx: Prisma.TransactionClient,
    couponId: string,
  ): Promise<{ id: string; usageCount: number }> {
    const updated = await tx.coupon.updateMany({
      where: {
        id: couponId,
        OR: [{ usageLimit: null }, { usageLimit: { gt: 0 } }] as Prisma.CouponWhereInput[],
      },
      data: { usageCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new Error(`Coupon ${couponId} usage limit reached`);
    }
    const c = await tx.coupon.findUnique({
      where: { id: couponId },
      select: { id: true, usageCount: true, usageLimit: true },
    });
    if (!c) throw new Error(`Coupon ${couponId} not found after increment`);
    // If a usageLimit was set and we just crossed it, flip usageLimit to 0
    // so the next order cannot accidentally use this coupon. (We use 0 as
    // the "exhausted" sentinel because `usageLimit` is a positive int;
    // null means "unlimited".)
    if (c.usageLimit !== null && c.usageCount >= c.usageLimit) {
      await tx.coupon.update({ where: { id: couponId }, data: { isActive: false } });
    }
    return { id: c.id, usageCount: c.usageCount };
  },

  async recordUsage(
    tx: Prisma.TransactionClient,
    data: { couponId: string; userId: string; orderId: string; discount: number },
  ) {
    return tx.couponUsage.create({ data });
  },

  async countUsagesForUser(couponId: string, userId: string) {
    return prisma.couponUsage.count({ where: { couponId, userId } });
  },

  async countOrdersForUser(userId: string) {
    // A "first order" is an order that isn't cancelled. Returns the count.
    return prisma.order.count({
      where: { userId, status: { not: 'CANCELLED' } },
    });
  },
};
