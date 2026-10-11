/**
 * Coupons API surface (admin + customer preview).
 */
import type { ApiClient } from './client';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
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
  redemptions: number;
}

export interface CouponPreview {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountPaisa: number;
  newSubtotalPaisa: number;
  description: string | null;
}

export interface CreateCouponBody {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  productIds?: string[];
  categoryIds?: string[];
  firstOrderOnly?: boolean;
}

export type UpdateCouponBody = Partial<CreateCouponBody>;

export interface CouponListResponse {
  data: AdminCoupon[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createCouponsClient({ api }: { api: ApiClient }) {
  return {
    // ----- Customer -----
    validateCode(code: string, token: string) {
      return api.request<CouponPreview>('/api/coupons/validate', {
        method: 'POST',
        body: { code },
        token,
      });
    },
    // ----- Admin -----
    list(
      token: string,
      params: { page?: number; limit?: number; isActive?: boolean; search?: string } = {},
    ) {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
      if (params.search) qs.set('search', params.search);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return api.request<CouponListResponse>(`/api/admin/coupons${suffix}`, { token });
    },
    get(id: string, token: string) {
      return api.request<AdminCoupon>(`/api/admin/coupons/${id}`, { token });
    },
    create(body: CreateCouponBody, token: string) {
      return api.request<AdminCoupon>('/api/admin/coupons', {
        method: 'POST',
        body,
        token,
      });
    },
    update(id: string, body: UpdateCouponBody, token: string) {
      return api.request<AdminCoupon>(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        body,
        token,
      });
    },
    remove(id: string, token: string) {
      return api.request<{ id: string }>(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  };
}

export type CouponsClient = ReturnType<typeof createCouponsClient>;
