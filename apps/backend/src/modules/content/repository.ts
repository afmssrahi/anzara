/**
 * Content module - data access (Pages, Banners).
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

export const contentRepository = {
  // -------- Banners --------
  async listBanners(params: { page: number; limit: number; isActive?: boolean }) {
    const { page, limit, isActive } = params;
    const where: Prisma.BannerWhereInput = {};
    if (typeof isActive === 'boolean') where.isActive = isActive;
    const [items, total] = await Promise.all([
      prisma.banner.findMany({
        where,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.banner.count({ where }),
    ]);
    return { items, total };
  },

  async listActiveBanners() {
    const now = new Date();
    return prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { position: 'asc' },
    });
  },

  async findBannerById(id: string) {
    return prisma.banner.findUnique({ where: { id } });
  },

  async createBanner(data: Prisma.BannerUncheckedCreateInput) {
    return prisma.banner.create({ data });
  },

  async updateBanner(id: string, data: Prisma.BannerUpdateInput) {
    return prisma.banner.update({ where: { id }, data });
  },

  async deleteBanner(id: string) {
    return prisma.banner.delete({ where: { id } });
  },

  // -------- Pages --------
  async listPages(params: { page: number; limit: number; isPublished?: boolean; search?: string }) {
    const { page, limit, isPublished, search } = params;
    const where: Prisma.PageWhereInput = {};
    if (typeof isPublished === 'boolean') where.isPublished = isPublished;
    if (search) {
      where.OR = [
        { slug: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.page.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.page.count({ where }),
    ]);
    return { items, total };
  },

  async findPageById(id: string) {
    return prisma.page.findUnique({ where: { id } });
  },

  async findPageBySlug(slug: string) {
    return prisma.page.findUnique({ where: { slug } });
  },

  async createPage(data: Prisma.PageUncheckedCreateInput) {
    return prisma.page.create({ data });
  },

  async updatePage(id: string, data: Prisma.PageUpdateInput) {
    return prisma.page.update({ where: { id }, data });
  },

  async deletePage(id: string) {
    return prisma.page.delete({ where: { id } });
  },
};
