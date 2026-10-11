/**
 * Categories module - data access layer.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

export const categoriesRepository = {
  list(opts: { onlyActive?: boolean; includeProductCount?: boolean } = {}) {
    return prisma.category.findMany({
      where: opts.onlyActive ? { isActive: true } : undefined,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: opts.includeProductCount ? { _count: { select: { products: true } } } : undefined,
    });
  },

  findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: { children: { orderBy: { position: 'asc' } } },
    });
  },

  findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
      include: { children: { orderBy: { position: 'asc' } } },
    });
  },

  findChildren(parentId: string) {
    return prisma.category.findMany({
      where: { parentId, isActive: true },
      orderBy: { position: 'asc' },
    });
  },

  create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  },

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.category.delete({ where: { id } });
  },
};
