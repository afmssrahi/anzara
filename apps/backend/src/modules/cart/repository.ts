/**
 * Cart module - data access layer.
 * All Prisma queries for carts/cart items live here.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

export const cartsRepository = {
  /** Get the active cart for a user, with items + the variant + the product. */
  async findActiveByUser(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { position: 'asc' }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async ensureCart(userId: string) {
    // Upsert guarantees a single cart per user (model has @unique on userId).
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  },

  async findItem(itemId: string) {
    return prisma.cartItem.findUnique({ where: { id: itemId } });
  },

  /**
   * Atomically add a variant to the cart. If a CartItem already exists for
   * the (cartId, variantId) pair, the quantity is incremented. Returns the
   * (possibly updated) item.
   *
   * `variantId` MUST be checked by the caller for existence + isActive.
   */
  async upsertItem(
    cartId: string,
    variantId: string,
    quantityToAdd: number,
  ): Promise<{ id: string; quantity: number }> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId, variantId } },
      });
      if (existing) {
        const next = existing.quantity + quantityToAdd;
        return tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: next },
          select: { id: true, quantity: true },
        });
      }
      return tx.cartItem.create({
        data: { cartId, variantId, quantity: quantityToAdd },
        select: { id: true, quantity: true },
      });
    });
  },

  /** Update an item's quantity. Returns the updated row, or null if not in this cart. */
  async updateQuantity(itemId: string, cartId: string, quantity: number) {
    return prisma.cartItem.updateMany({
      where: { id: itemId, cartId },
      data: { quantity },
    });
  },

  async removeItem(itemId: string, cartId: string) {
    return prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  },

  async clear(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId } });
  },

  /** Set or clear the couponCode on a cart. Pass `null` to clear. */
  async setCouponCode(cartId: string, code: string | null) {
    return prisma.cart.update({ where: { id: cartId }, data: { couponCode: code } });
  },

  /** Used by checkout to atomically decrement stock. */
  async txDecrementStock(
    tx: Prisma.TransactionClient,
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    for (const it of items) {
      // Decrement only if there's enough stock. Returns 0 rows when stock is short.
      const result = await tx.productVariant.updateMany({
        where: { id: it.variantId, stockQuantity: { gte: it.quantity } },
        data: { stockQuantity: { decrement: it.quantity } },
      });
      if (result.count === 0) {
        const v = await tx.productVariant.findUnique({ where: { id: it.variantId } });
        throw new Error(
          `INSUFFICIENT_STOCK:${it.variantId}:${v?.stockQuantity ?? 0}:${it.quantity}`,
        );
      }
    }
  },

  async txRecordInventorySale(
    tx: Prisma.TransactionClient,
    items: Array<{ variantId: string; quantity: number; orderId: string }>,
  ) {
    for (const it of items) {
      await tx.inventoryTransaction.create({
        data: {
          variantId: it.variantId,
          delta: -it.quantity,
          reason: 'SALE',
          reference: it.orderId,
        },
      });
    }
  },
};
