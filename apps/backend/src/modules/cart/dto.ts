/**
 * Cart DTO helpers.
 * Convert Prisma cart + items into the shared-types Cart shape.
 */
import type {
  Cart as PrismaCart,
  CartItem as PrismaCartItem,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  ProductVariant as PrismaVariant,
} from '@prisma/client';
import type { Cart, CartItem, Money, ProductImage } from '@anzara/shared-types';

type ItemWithRelations = PrismaCartItem & {
  variant: PrismaVariant & {
    product: PrismaProduct & { images: PrismaProductImage[] };
  };
};

const CURRENCY = 'BDT';

function money(paisa: number): Money {
  return { amount: paisa, currency: CURRENCY };
}

function firstImage(p: PrismaProduct & { images: PrismaProductImage[] }): ProductImage | undefined {
  const img = p.images[0];
  if (!img) return undefined;
  return {
    id: img.id,
    url: img.url,
    alt: img.alt,
    position: img.position,
  };
}

export function toCartItemDto(item: ItemWithRelations, maxQuantity: number): CartItem {
  const v = item.variant;
  const p = v.product;
  const nameEn = (p.name as { en?: string }).en ?? p.slug;
  const image = firstImage(p);
  return {
    id: item.id,
    variantId: v.id,
    productId: p.id,
    productName: nameEn,
    productSlug: p.slug,
    variantSku: v.sku,
    ...(v.size ? { size: v.size } : {}),
    ...(v.color ? { color: v.color } : {}),
    ...(image ? { image } : {}),
    unitPrice: money(v.price),
    quantity: item.quantity,
    subtotal: money(v.price * item.quantity),
    maxQuantity,
  };
}

export function toCartDto(
  cart: PrismaCart & { items: ItemWithRelations[] },
  totals: { subtotal: number; discount: number; shipping: number; tax: number; total: number },
): Cart {
  const itemCount = cart.items.reduce((sum, it) => sum + it.quantity, 0);
  return {
    id: cart.id,
    items: cart.items.map((it) => {
      const v = it.variant;
      const stock = v.stockQuantity;
      const max = Math.min(99, stock);
      return toCartItemDto(it, Math.max(1, max));
    }),
    subtotal: money(totals.subtotal),
    discount: money(totals.discount),
    shipping: money(totals.shipping),
    tax: money(totals.tax),
    total: money(totals.total),
    ...(cart.couponCode ? { appliedCouponCode: cart.couponCode } : {}),
    itemCount,
    ...(cart.reservedUntil ? { reservedUntil: cart.reservedUntil.toISOString() } : {}),
    updatedAt: cart.updatedAt.toISOString(),
  };
}
