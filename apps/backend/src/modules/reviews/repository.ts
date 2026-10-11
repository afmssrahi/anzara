/**
 * Reviews module - data access layer.
 */
import { prisma } from '@anzara/database';
import type { Prisma, Review } from '@prisma/client';

const REVIEW_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ReviewInclude;

export type ReviewWithUser = Review & { user: { id: string; firstName: string; lastName: string } };

export const reviewsRepository = {
  async findById(id: string) {
    return prisma.review.findUnique({ where: { id }, include: REVIEW_INCLUDE });
  },

  async findByUserAndProduct(userId: string, productId: string) {
    return prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
      include: REVIEW_INCLUDE,
    });
  },

  async listForProduct(productId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const where: Prisma.ReviewWhereInput = { productId, isApproved: true };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: REVIEW_INCLUDE,
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },

  /** Summary aggregates for a product (over approved reviews). */
  async summaryForProduct(productId: string) {
    const rows = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: { rating: true },
    });
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    let sum = 0;
    for (const r of rows) {
      const n = r._count.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        breakdown[r.rating as 1 | 2 | 3 | 4 | 5] = n;
      }
      count += n;
      sum += n * r.rating;
    }
    return {
      productId,
      count,
      average: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      breakdown,
    };
  },

  async listForAdmin(params: {
    page: number;
    limit: number;
    isApproved?: boolean;
    productId?: string;
    search?: string;
  }) {
    const { page, limit, isApproved, productId, search } = params;
    const where: Prisma.ReviewWhereInput = {};
    if (typeof isApproved === 'boolean') where.isApproved = isApproved;
    if (productId) where.productId = productId;
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...REVIEW_INCLUDE,
          product: { select: { id: true, slug: true, name: true, images: { take: 1 } } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: Prisma.ReviewUncheckedCreateInput) {
    return prisma.review.create({ data, include: REVIEW_INCLUDE });
  },

  async update(id: string, data: Prisma.ReviewUpdateInput) {
    return prisma.review.update({ where: { id }, data, include: REVIEW_INCLUDE });
  },

  async delete(id: string) {
    return prisma.review.delete({ where: { id } });
  },

  /** Has this user ever ordered a product they can review? Returns true
   *  for any non-cancelled order that contains the product. */
  async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        items: { some: { productId } },
      },
      select: { id: true },
    });
    return order !== null;
  },
};
