/**
 * Wishlist DTO helpers.
 */
import type {
  WishlistItem as PrismaWishlistItem,
  Product as PrismaProduct,
  ProductImage as PrismaImage,
} from '@prisma/client';
import type { WishlistItem } from '@anzara/shared-types';

type Row = PrismaWishlistItem & { product: PrismaProduct & { images: PrismaImage[] } };

function pickLocalized(name: unknown): { en: string; bn: string } {
  if (typeof name !== 'object' || name === null) return { en: '', bn: '' };
  const obj = name as Record<string, unknown>;
  return {
    en: typeof obj['en'] === 'string' ? (obj['en'] as string) : '',
    bn: typeof obj['bn'] === 'string' ? (obj['bn'] as string) : '',
  };
}

export function toWishlistItemDto(row: Row): WishlistItem {
  return {
    id: row.id,
    productId: row.productId,
    productSlug: row.product.slug,
    productName: pickLocalized(row.product.name),
    productImage: row.product.images[0]?.url ?? null,
    basePrice: { amount: row.product.basePrice, currency: 'BDT' },
    createdAt: row.createdAt.toISOString(),
  };
}
