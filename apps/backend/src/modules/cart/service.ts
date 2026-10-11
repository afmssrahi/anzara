/**
 * Cart module - business logic.
 *
 * Stock is re-validated on every add/update. We never trust the price the
 * client sent; the unit price is always read from the variant row.
 */
import { prisma } from '@anzara/database';
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { cartsRepository } from './repository';
import { toCartDto } from './dto';
import { computeCartTotals } from './totals';
import { couponsService } from '../coupons';
import type { AddToCartInput } from '@anzara/validators';

export const cartService = {
  async get(userId: string) {
    const cart = await cartsRepository.ensureCart(userId);
    const full = await cartsRepository.findActiveByUser(userId);
    if (!full) throw new NotFoundError('Cart not found');

    // If a coupon is attached, validate it against the current cart. If it
    // is invalid (expired, exhausted, no longer meets min-order, restricted),
    // drop it from the cart so the customer sees a clean total.
    let discountPaisa = 0;
    if (full.couponCode) {
      try {
        const subtotalPaisa = sumSubtotal(full.items);
        const cartVariants = full.items.map((it) => ({
          productId: it.variant.productId,
          categoryId: it.variant.product.categoryId ?? null,
        }));
        const preview = await couponsService.validateForUser({
          code: full.couponCode,
          userId,
          subtotalPaisa,
          cartVariants,
        });
        discountPaisa = preview.discountPaisa;
      } catch {
        // Coupon no longer applies - drop it silently.
        await cartsRepository.setCouponCode(cart.id, null);
        full.couponCode = null;
      }
    }

    const subtotal = sumSubtotal(full.items);
    const totals = await computeCartTotals({ subtotalPaisa: subtotal, discountPaisa });
    return toCartDto({ ...full, items: full.items }, totals);
  },

  async addItem(userId: string, input: AddToCartInput) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: { product: true },
    });
    if (!variant || !variant.isActive) {
      throw new NotFoundError('Variant not found or inactive');
    }
    if (variant.product.status !== 'PUBLISHED') {
      throw new BadRequestError('Product is not available for purchase');
    }
    // Cap the in-cart quantity at available stock + existing cart quantity.
    const cart = await cartsRepository.ensureCart(userId);
    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    });
    const currentQty = existingItem?.quantity ?? 0;
    const targetQty = currentQty + input.quantity;
    if (targetQty > variant.stockQuantity) {
      throw new BadRequestError(
        `Only ${Math.max(0, variant.stockQuantity - currentQty)} more available`,
        { available: Math.max(0, variant.stockQuantity - currentQty) },
      );
    }
    await cartsRepository.upsertItem(cart.id, variant.id, input.quantity);
    return this.get(userId);
  },

  async updateItem(userId: string, itemId: string, quantity: number) {
    if (quantity === 0) {
      return this.removeItem(userId, itemId);
    }
    const cart = await cartsRepository.ensureCart(userId);
    const item = await cartsRepository.findItem(itemId);
    if (!item || item.cartId !== cart.id) throw new NotFoundError('Cart item not found');
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (!variant || !variant.isActive) throw new BadRequestError('Variant is no longer available');
    if (quantity > variant.stockQuantity) {
      throw new BadRequestError(`Only ${variant.stockQuantity} in stock`, {
        available: variant.stockQuantity,
      });
    }
    await cartsRepository.updateQuantity(itemId, cart.id, quantity);
    return this.get(userId);
  },

  async removeItem(userId: string, itemId: string) {
    const cart = await cartsRepository.ensureCart(userId);
    const result = await cartsRepository.removeItem(itemId, cart.id);
    if (result.count === 0) throw new NotFoundError('Cart item not found');
    return this.get(userId);
  },

  async clear(userId: string) {
    const cart = await cartsRepository.ensureCart(userId);
    await cartsRepository.clear(cart.id);
    return this.get(userId);
  },

  // ----------------------------------------------------------------
  // Coupon apply / remove
  // ----------------------------------------------------------------
  async applyCoupon(userId: string, code: string) {
    const cart = await cartsRepository.ensureCart(userId);
    const full = await cartsRepository.findActiveByUser(userId);
    if (!full || full.items.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }
    const subtotalPaisa = sumSubtotal(full.items);
    const cartVariants = full.items.map((it) => ({
      productId: it.variant.productId,
      categoryId: it.variant.product.categoryId ?? null,
    }));
    // validateForUser throws BadRequestError with a human-readable reason
    // if the code is not applicable. The caller (controller) wraps it.
    await couponsService.validateForUser({ code, userId, subtotalPaisa, cartVariants });
    await cartsRepository.setCouponCode(cart.id, code.trim().toUpperCase());
    return this.get(userId);
  },

  async removeCoupon(userId: string) {
    const cart = await cartsRepository.ensureCart(userId);
    await cartsRepository.setCouponCode(cart.id, null);
    return this.get(userId);
  },
};

function sumSubtotal(items: Array<{ quantity: number; variant: { price: number } }>): number {
  return items.reduce((sum, it) => sum + it.quantity * it.variant.price, 0);
}
