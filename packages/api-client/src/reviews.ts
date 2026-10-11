/**
 * Reviews API surface.
 */
import type { ApiClient } from './client';
import type { Review, ReviewSummary } from '@anzara/shared-types';

export interface AdminReview extends Review {
  productSlug?: string;
  productName?: string;
  productImage?: string;
  customerEmail?: string;
}

export interface ReviewListResponse {
  data: Review[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: ReviewSummary;
}

export interface AdminReviewListResponse {
  data: AdminReview[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateReviewBody {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
}

export interface UpdateReviewBody {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface ModerateReviewBody {
  isApproved?: boolean;
  isFeatured?: boolean;
  isVerified?: boolean;
}

export function createReviewsClient({ api }: { api: ApiClient }) {
  return {
    // Public
    listForProduct(productId: string, params: { page?: number; limit?: number } = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return api.request<ReviewListResponse>(`/api/reviews/products/${productId}${suffix}`);
    },
    summary(productId: string) {
      return api.request<ReviewSummary>(`/api/reviews/products/${productId}/summary`);
    },
    // Customer
    create(body: CreateReviewBody, token: string) {
      return api.request<Review>('/api/reviews', { method: 'POST', body, token });
    },
    updateMine(id: string, body: UpdateReviewBody, token: string) {
      return api.request<Review>(`/api/reviews/${id}`, { method: 'PATCH', body, token });
    },
    deleteMine(id: string, token: string) {
      return api.request<{ id: string }>(`/api/reviews/${id}`, { method: 'DELETE', token });
    },
    // Admin
    listForAdmin(
      token: string,
      params: {
        page?: number;
        limit?: number;
        isApproved?: boolean;
        productId?: string;
        search?: string;
      } = {},
    ) {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.isApproved !== undefined) qs.set('isApproved', String(params.isApproved));
      if (params.productId) qs.set('productId', params.productId);
      if (params.search) qs.set('search', params.search);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return api.request<AdminReviewListResponse>(`/api/admin/reviews${suffix}`, { token });
    },
    moderate(id: string, body: ModerateReviewBody, token: string) {
      return api.request<AdminReview>(`/api/admin/reviews/${id}/moderate`, {
        method: 'PATCH',
        body,
        token,
      });
    },
    delete(id: string, token: string) {
      return api.request<{ id: string }>(`/api/admin/reviews/${id}`, { method: 'DELETE', token });
    },
  };
}

export type ReviewsClient = ReturnType<typeof createReviewsClient>;
