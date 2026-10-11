/**
 * Wishlist module - business logic.
 */
import { prisma } from '@anzara/database';
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { wishlistRepository } from './repository';
import { toWishlistItemDto } from './dto';
import type { AddToWishlistInput } from './validators';
import type { WishlistItem } from '@anzara/shared-types';

export const wishlistService = {
  async list(userId: string): Promise<WishlistItem[]> {
    const items = await wishlistRepository.listForUser(userId);
    return items.map((it) => toWishlistItemDto(it));
  },

  async add(userId: string, input: AddToWishlistInput): Promise<WishlistItem> {
    // 1. Product must exist and be buyable.
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, status: true },
    });
    if (!product) throw new NotFoundError('Product not found');
    if (product.status === 'ARCHIVED') {
      throw new BadRequestError('This product is no longer available');
    }
    // 2. Idempotent: add returns the existing row if already there.
    const existing = await wishlistRepository.findByUserAndProduct(userId, input.productId);
    if (existing) {
      const fresh = await wishlistRepository.listForUser(userId);
      const match = fresh.find((it) => it.id === existing.id);
      if (!match) throw new NotFoundError('Wishlist item not found');
      return toWishlistItemDto(match);
    }
    await wishlistRepository.create(userId, input.productId);
    const items = await wishlistRepository.listForUser(userId);
    const created = items.find((it) => it.productId === input.productId);
    if (!created) throw new NotFoundError('Wishlist item not found after create');
    return toWishlistItemDto(created);
  },

  async remove(userId: string, productId: string): Promise<void> {
    const result = await wishlistRepository.deleteByUserAndProduct(userId, productId);
    if (result.count === 0) throw new NotFoundError('Wishlist item not found');
  },
};
