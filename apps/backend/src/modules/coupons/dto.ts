/**
 * Coupon DTO helpers. The shared-types `Coupon` shape is intentionally
 * narrow; we add admin-only fields (raw discountType, rawValue, maxDiscountAmount,
 * usage stats) here for the admin surface only.
 */
import type { Coupon as PrismaCoupon } from '@prisma/client';

export interface AdminCouponDto {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
  firstOrderOnly: boolean;
  createdAt: string;
  updatedAt: string;
  /** Admin-only: how many distinct orders used this coupon. */
  redemptions: number;
}

export function toAdminCouponDto(
  c: PrismaCoupon & { _count?: { usages: number } },
): AdminCouponDto {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discountType as 'PERCENTAGE' | 'FIXED',
    discountValue: c.discountValue,
    minOrderAmount: c.minOrderAmount,
    maxDiscountAmount: c.maxDiscountAmount,
    usageLimit: c.usageLimit,
    usageCount: c.usageCount,
    perUserLimit: c.perUserLimit,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    isActive: c.isActive,
    productIds: c.productIds,
    categoryIds: c.categoryIds,
    firstOrderOnly: c.firstOrderOnly,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    redemptions: c._count?.usages ?? 0,
  };
}
