/**
 * Content module - business logic.
 */
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { recordAudit } from '../../lib/audit';
import { logger } from '../../lib/logger';
import { contentRepository } from './repository';
import { toBannerDto, toPageDto } from './dto';
import type {
  BannerFilterInput,
  CreateBannerInput,
  CreatePageInput,
  PageFilterInput,
  UpdateBannerInput,
  UpdatePageInput,
} from './validators';
import type { Banner, Page } from '@anzara/shared-types';

export const contentService = {
  // -------- Banners --------
  async listBanners(query: BannerFilterInput) {
    const { items, total } = await contentRepository.listBanners({
      page: query.page,
      limit: query.limit,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    });
    return {
      data: items.map((b) => toBannerDto(b)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  },

  async listActiveBanners(): Promise<Banner[]> {
    return (await contentRepository.listActiveBanners()).map((b) => toBannerDto(b));
  },

  async getBanner(id: string) {
    const b = await contentRepository.findBannerById(id);
    if (!b) throw new NotFoundError('Banner not found');
    return toBannerDto(b);
  },

  async createBanner(adminId: string, input: CreateBannerInput) {
    const created = await contentRepository.createBanner({
      title: input.title,
      subtitle: input.subtitle ?? null,
      imageUrl: input.imageUrl,
      mobileImageUrl: input.mobileImageUrl || null,
      linkUrl: input.linkUrl || null,
      position: input.position,
      isActive: input.isActive,
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
    });
    try {
      await recordAudit({
        adminId,
        action: 'banner.create',
        entity: 'Banner',
        entityId: created.id,
      });
    } catch (err) {
      logger.warn({ err, id: created.id }, 'Failed to record banner.create audit');
    }
    return toBannerDto(created);
  },

  async updateBanner(adminId: string, id: string, input: UpdateBannerInput) {
    const existing = await contentRepository.findBannerById(id);
    if (!existing) throw new NotFoundError('Banner not found');
    const updated = await contentRepository.updateBanner(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.mobileImageUrl !== undefined
        ? { mobileImageUrl: input.mobileImageUrl || null }
        : {}),
      ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl || null } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
    });
    try {
      await recordAudit({
        adminId,
        action: 'banner.update',
        entity: 'Banner',
        entityId: id,
      });
    } catch (err) {
      logger.warn({ err, id }, 'Failed to record banner.update audit');
    }
    return toBannerDto(updated);
  },

  async deleteBanner(adminId: string, id: string) {
    const existing = await contentRepository.findBannerById(id);
    if (!existing) throw new NotFoundError('Banner not found');
    await contentRepository.deleteBanner(id);
    try {
      await recordAudit({
        adminId,
        action: 'banner.delete',
        entity: 'Banner',
        entityId: id,
      });
    } catch (err) {
      logger.warn({ err, id }, 'Failed to record banner.delete audit');
    }
  },

  // -------- Pages --------
  async listPages(query: PageFilterInput) {
    const { items, total } = await contentRepository.listPages({
      page: query.page,
      limit: query.limit,
      ...(query.isPublished !== undefined ? { isPublished: query.isPublished } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return {
      data: items.map((p) => toPageDto(p)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  },

  async getPageById(id: string) {
    const p = await contentRepository.findPageById(id);
    if (!p) throw new NotFoundError('Page not found');
    return toPageDto(p);
  },

  async getPublishedPageBySlug(slug: string): Promise<Page> {
    const p = await contentRepository.findPageBySlug(slug);
    if (!p || !p.isPublished) throw new NotFoundError('Page not found');
    return toPageDto(p);
  },

  async createPage(adminId: string, input: CreatePageInput) {
    const existing = await contentRepository.findPageBySlug(input.slug);
    if (existing) throw new BadRequestError(`Page with slug "${input.slug}" already exists`);
    const created = await contentRepository.createPage({
      slug: input.slug,
      title: input.title as object as never,
      content: input.content as object as never,
      isPublished: input.isPublished,
    });
    try {
      await recordAudit({
        adminId,
        action: 'page.create',
        entity: 'Page',
        entityId: created.id,
      });
    } catch (err) {
      logger.warn({ err, id: created.id }, 'Failed to record page.create audit');
    }
    return toPageDto(created);
  },

  async updatePage(adminId: string, id: string, input: UpdatePageInput) {
    const existing = await contentRepository.findPageById(id);
    if (!existing) throw new NotFoundError('Page not found');
    const updated = await contentRepository.updatePage(id, {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.title !== undefined ? { title: input.title as object as never } : {}),
      ...(input.content !== undefined ? { content: input.content as object as never } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    });
    try {
      await recordAudit({
        adminId,
        action: 'page.update',
        entity: 'Page',
        entityId: id,
      });
    } catch (err) {
      logger.warn({ err, id }, 'Failed to record page.update audit');
    }
    return toPageDto(updated);
  },

  async deletePage(adminId: string, id: string) {
    const existing = await contentRepository.findPageById(id);
    if (!existing) throw new NotFoundError('Page not found');
    await contentRepository.deletePage(id);
    try {
      await recordAudit({
        adminId,
        action: 'page.delete',
        entity: 'Page',
        entityId: id,
      });
    } catch (err) {
      logger.warn({ err, id }, 'Failed to record page.delete audit');
    }
  },
};
