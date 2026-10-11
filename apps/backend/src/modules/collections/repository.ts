/**
 * Collections module - data access layer.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

export const collectionsRepository = {
  list(opts: { onlyActive?: boolean } = {}) {
    return prisma.collection.findMany({
      where: opts.onlyActive ? { isActive: true } : undefined,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { products: { include: { product: true } } },
    });
  },

  findById(id: string) {
    return prisma.collection.findUnique({
      where: { id },
      include: { products: { include: { product: true }, orderBy: { position: 'asc' } } },
    });
  },

  findBySlug(slug: string) {
    return prisma.collection.findUnique({
      where: { slug },
      include: { products: { include: { product: true }, orderBy: { position: 'asc' } } },
    });
  },

  create(data: Prisma.CollectionCreateInput) {
    return prisma.collection.create({ data });
  },

  update(id: string, data: Prisma.CollectionUpdateInput) {
    return prisma.collection.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.collection.delete({ where: { id } });
  },

  setProducts(collectionId: string, productIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.collectionProduct.deleteMany({ where: { collectionId } });
      if (productIds.length > 0) {
        await tx.collectionProduct.createMany({
          data: productIds.map((productId, position) => ({ collectionId, productId, position })),
        });
      }
    });
  },
};
