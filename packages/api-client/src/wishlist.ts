/**
 * Wishlist API surface.
 */
import type { ApiClient } from './client';
import type { WishlistItem } from '@anzara/shared-types';

export function createWishlistClient({ api }: { api: ApiClient }) {
  return {
    list(token: string) {
      return api.request<WishlistItem[]>('/api/wishlist', { token });
    },
    add(productId: string, token: string) {
      return api.request<WishlistItem>('/api/wishlist/items', {
        method: 'POST',
        body: { productId },
        token,
      });
    },
    remove(productId: string, token: string) {
      return api.request<{ productId: string }>(`/api/wishlist/items/${productId}`, {
        method: 'DELETE',
        token,
      });
    },
    check(productId: string, token: string) {
      return api.request<{ productId: string; inWishlist: boolean }>(
        `/api/wishlist/items/${productId}`,
        { token },
      );
    },
  };
}

export type WishlistClient = ReturnType<typeof createWishlistClient>;
