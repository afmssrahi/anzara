/**
 * Products + Categories + Collections API surface.
 * Centralized so the storefront and admin apps share a single client.
 */
import type { ApiClient, RequestOptions } from './client';
import type {
  Category,
  Collection,
  PaginatedResponse,
  Product,
  ProductFilter,
} from '@anzara/shared-types';

export interface ProductsClientConfig {
  api: ApiClient;
}

export type ProductListParams = Partial<ProductFilter> & {
  page?: number;
  limit?: number;
  sort?: 'createdAt' | '-createdAt' | 'basePrice' | '-basePrice' | 'name' | '-name';
  isFeatured?: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

export interface CreateProductBody {
  slug: string;
  name: { en: string; bn: string };
  description: { en: string; bn: string };
  shortDescription?: { en?: string; bn?: string };
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  basePrice: number;
  categoryId: string;
  hasVariants?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  seoTitle?: { en?: string; bn?: string };
  seoDescription?: { en?: string; bn?: string };
  collectionIds?: string[];
  variants?: Array<{
    sku: string;
    size?: string | null;
    color?: string | null;
    price: number;
    compareAtPrice?: number | null;
    stockQuantity: number;
    lowStockThreshold?: number;
    isActive?: boolean;
    weight?: number | null;
    position?: number;
  }>;
  images?: Array<{
    url: string;
    publicId?: string | null;
    alt: string;
    position?: number;
    width?: number | null;
    height?: number | null;
  }>;
}

export type UpdateProductBody = Partial<CreateProductBody>;

export interface CreateCategoryBody {
  slug: string;
  name: { en: string; bn: string };
  description?: { en?: string; bn?: string };
  image?: string | null;
  parentId?: string | null;
  position?: number;
  isActive?: boolean;
}

export type UpdateCategoryBody = Partial<CreateCategoryBody>;

export interface CreateCollectionBody {
  slug: string;
  name: { en: string; bn: string };
  description?: { en?: string; bn?: string };
  image?: string | null;
  position?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  productIds?: string[];
}

export type UpdateCollectionBody = Partial<CreateCollectionBody>;

export interface UploadedAsset {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  bytes: number;
  mimeType: string;
}

function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length > 0) usp.set(k, v.join(','));
    } else {
      usp.set(k, String(v));
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export function createProductsClient({ api }: ProductsClientConfig) {
  return {
    // ==================== Public products ====================
    list(params: ProductListParams = {}) {
      return api.request<PaginatedResponse<Product>>(
        `/api/products${toQuery(params as Record<string, unknown>)}`,
      );
    },

    featured() {
      return api.request<Product[]>('/api/products/featured');
    },

    getBySlug(slug: string) {
      return api.request<Product>(`/api/products/${encodeURIComponent(slug)}`);
    },

    // ==================== Admin products ====================
    admin: {
      list(params: ProductListParams = {}, token: string) {
        return api.request<PaginatedResponse<Product>>(
          `/api/admin/products${toQuery(params as Record<string, unknown>)}`,
          { token },
        );
      },
      get(id: string, token: string) {
        return api.request<Product>(`/api/admin/products/${id}`, { token });
      },
      create(body: CreateProductBody, token: string) {
        return api.request<Product>('/api/admin/products', {
          method: 'POST',
          body,
          token,
        });
      },
      update(id: string, body: UpdateProductBody, token: string) {
        return api.request<Product>(`/api/admin/products/${id}`, {
          method: 'PATCH',
          body,
          token,
        });
      },
      remove(id: string, token: string) {
        return api.request<{ message: string }>(`/api/admin/products/${id}`, {
          method: 'DELETE',
          token,
        });
      },
    },

    // ==================== Categories (public) ====================
    listCategories() {
      return api.request<Category[]>('/api/categories');
    },

    getCategoryBySlug(slug: string) {
      return api.request<Category>(`/api/categories/${encodeURIComponent(slug)}`);
    },

    // ==================== Admin categories ====================
    adminCategories: {
      list(token: string) {
        return api.request<Category[]>('/api/admin/categories', { token });
      },
      create(body: CreateCategoryBody, token: string) {
        return api.request<Category>('/api/admin/categories', {
          method: 'POST',
          body,
          token,
        });
      },
      update(id: string, body: UpdateCategoryBody, token: string) {
        return api.request<Category>(`/api/admin/categories/${id}`, {
          method: 'PATCH',
          body,
          token,
        });
      },
      remove(id: string, token: string) {
        return api.request<{ message: string }>(`/api/admin/categories/${id}`, {
          method: 'DELETE',
          token,
        });
      },
    },

    // ==================== Collections (public) ====================
    listCollections() {
      return api.request<Collection[]>('/api/collections');
    },

    getCollectionBySlug(slug: string) {
      return api.request<Collection>(`/api/collections/${encodeURIComponent(slug)}`);
    },

    // ==================== Admin collections ====================
    adminCollections: {
      list(token: string) {
        return api.request<Collection[]>('/api/admin/collections', { token });
      },
      create(body: CreateCollectionBody, token: string) {
        return api.request<Collection>('/api/admin/collections', {
          method: 'POST',
          body,
          token,
        });
      },
      update(id: string, body: UpdateCollectionBody, token: string) {
        return api.request<Collection>(`/api/admin/collections/${id}`, {
          method: 'PATCH',
          body,
          token,
        });
      },
      remove(id: string, token: string) {
        return api.request<{ message: string }>(`/api/admin/collections/${id}`, {
          method: 'DELETE',
          token,
        });
      },
    },

    // ==================== Asset upload ====================
    /**
     * Upload a single image file (admin). Uses FormData under the hood,
     * so the `api` client's JSON envelope unwrapping is bypassed.
     */
    async uploadImage(file: File, token: string, folder?: string): Promise<UploadedAsset> {
      const form = new FormData();
      form.append('file', file);
      if (folder) form.append('folder', folder);
      const opts: RequestOptions = {
        method: 'POST',
        body: form,
        token,
        raw: true,
      };
      const response = await api.request<Response>('/api/assets/upload', opts);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${text}`);
      }
      const payload = (await response.json()) as
        { success: true; data: UploadedAsset } | { success: false; error: { message: string } };
      if (payload.success === true) return payload.data;
      throw new Error(payload.error.message);
    },

    removeAsset(publicId: string, token: string) {
      return api.request<{ message: string }>(
        `/api/assets/${publicId.split('/').map(encodeURIComponent).join('/')}`,
        { method: 'DELETE', token },
      );
    },
  };
}

export type ProductsClient = ReturnType<typeof createProductsClient>;
