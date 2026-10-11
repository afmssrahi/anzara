/**
 * Cart API surface (customer only).
 */
import type { ApiClient } from './client';
import type { Cart } from '@anzara/shared-types';

export interface AddToCartBody {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemBody {
  itemId: string;
  quantity: number;
}

export interface ApplyCouponBody {
  code: string;
}

export function createCartClient({ api }: { api: ApiClient }) {
  return {
    get(token: string) {
      return api.request<Cart>('/api/cart', { token });
    },
    addItem(body: AddToCartBody, token: string) {
      return api.request<Cart>('/api/cart/items', {
        method: 'POST',
        body,
        token,
      });
    },
    updateItem(itemId: string, body: UpdateCartItemBody, token: string) {
      return api.request<Cart>(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        body,
        token,
      });
    },
    removeItem(itemId: string, token: string) {
      return api.request<Cart>(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        token,
      });
    },
    clear(token: string) {
      return api.request<Cart>('/api/cart', {
        method: 'DELETE',
        token,
      });
    },
    applyCoupon(body: ApplyCouponBody, token: string) {
      return api.request<Cart>('/api/cart/coupon', {
        method: 'POST',
        body,
        token,
      });
    },
    removeCoupon(token: string) {
      return api.request<Cart>('/api/cart/coupon', {
        method: 'DELETE',
        token,
      });
    },
  };
}

export type CartClient = ReturnType<typeof createCartClient>;
