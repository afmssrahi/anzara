/**
 * SEO module - data access for sitemap generation.
 *
 * Only published / active rows are included. We only return the columns
 * the sitemap actually needs (slug, id, updatedAt) so this is cheap.
 */
import { prisma } from '@anzara/database';

export const seoRepository = {
  async listPublishedProducts() {
    return prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, slug: true, updatedAt: true, isFeatured: true },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async listActiveCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { position: 'asc' },
    });
  },

  async listActiveCollections() {
    return prisma.collection.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { position: 'asc' },
    });
  },

  async listPublishedPages() {
    return prisma.page.findMany({
      where: { isPublished: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  },
};
