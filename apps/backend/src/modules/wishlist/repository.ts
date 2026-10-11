/**
 * Wishlist module - data access.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

const ITEM_INCLUDE = {
  product: {
    include: {
      images: { take: 1, orderBy: { position: 'asc' as const } },
    },
  },
} satisfies Prisma.WishlistItemInclude;

export const wishlistRepository = {
  async listForUser(userId: string) {
    return prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: ITEM_INCLUDE,
    });
  },

  async findByUserAndProduct(userId: string, productId: string) {
    return prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  },

  async create(userId: string, productId: string) {
    return prisma.wishlistItem.create({ data: { userId, productId } });
  },

  async deleteByUserAndProduct(userId: string, productId: string) {
    return prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  },

  async countForUser(userId: string) {
    return prisma.wishlistItem.count({ where: { userId } });
  },
};
