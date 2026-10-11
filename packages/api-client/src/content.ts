/**
 * Content API surface (public + admin).
 */
import type { ApiClient } from './client';
import type { Banner, Page } from '@anzara/shared-types';

export interface BannerListResponse {
  data: Banner[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PageListResponse {
  data: Page[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateBannerBody {
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  position?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}

export type UpdateBannerBody = Partial<CreateBannerBody>;

export interface CreatePageBody {
  slug: string;
  title: string | { en: string; bn?: string };
  content: string | { en: string; bn?: string };
  isPublished?: boolean;
}

export type UpdatePageBody = Partial<CreatePageBody>;

export function createContentClient({ api }: { api: ApiClient }) {
  return {
    // Public
    activeBanners() {
      return api.request<Banner[]>('/api/content/banners');
    },
    pageBySlug(slug: string) {
      return api.request<Page>(`/api/content/pages/${encodeURIComponent(slug)}`);
    },
    // Admin banners
    listBanners(token: string, params: { page?: number; limit?: number; isActive?: boolean } = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return api.request<BannerListResponse>(`/api/admin/content/banners${suffix}`, { token });
    },
    createBanner(body: CreateBannerBody, token: string) {
      return api.request<Banner>('/api/admin/content/banners', { method: 'POST', body, token });
    },
    updateBanner(id: string, body: UpdateBannerBody, token: string) {
      return api.request<Banner>(`/api/admin/content/banners/${id}`, {
        method: 'PATCH',
        body,
        token,
      });
    },
    deleteBanner(id: string, token: string) {
      return api.request<{ id: string }>(`/api/admin/content/banners/${id}`, {
        method: 'DELETE',
        token,
      });
    },
    // Admin pages
    listPages(
      token: string,
      params: { page?: number; limit?: number; isPublished?: boolean; search?: string } = {},
    ) {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.isPublished !== undefined) qs.set('isPublished', String(params.isPublished));
      if (params.search) qs.set('search', params.search);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return api.request<PageListResponse>(`/api/admin/content/pages${suffix}`, { token });
    },
    getPage(id: string, token: string) {
      return api.request<Page>(`/api/admin/content/pages/${id}`, { token });
    },
    createPage(body: CreatePageBody, token: string) {
      return api.request<Page>('/api/admin/content/pages', { method: 'POST', body, token });
    },
    updatePage(id: string, body: UpdatePageBody, token: string) {
      return api.request<Page>(`/api/admin/content/pages/${id}`, {
        method: 'PATCH',
        body,
        token,
      });
    },
    deletePage(id: string, token: string) {
      return api.request<{ id: string }>(`/api/admin/content/pages/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  };
}

export type ContentClient = ReturnType<typeof createContentClient>;
