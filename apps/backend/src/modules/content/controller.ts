/**
 * Content module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { contentService } from './service';
import { sendSuccess } from '../../lib/response';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth';
import { BadRequestError } from '../../lib/errors';
import type { AuthedRequest } from '../../middleware/auth';
import {
  bannerFilterSchema,
  bannerIdParamSchema,
  createBannerSchema,
  createPageSchema,
  pageFilterSchema,
  pageIdParamSchema,
  pageSlugParamSchema,
  updateBannerSchema,
  updatePageSchema,
} from './validators';

function adminId(req: Request): string {
  const id = (req as AuthedRequest).admin?.id;
  if (!id) throw new BadRequestError('Admin access required');
  return id;
}

export const publicContentController = {
  async listActiveBanners(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await contentService.listActiveBanners());
  },

  async getPageBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = pageSlugParamSchema.parse(req.params);
    sendSuccess(res, await contentService.getPublishedPageBySlug(slug));
  },
};

export const adminContentController = {
  // Banners
  async listBanners(req: Request, res: Response): Promise<void> {
    const q = bannerFilterSchema.parse(req.query);
    sendSuccess(res, await contentService.listBanners(q));
  },
  async getBanner(req: Request, res: Response): Promise<void> {
    const { id } = bannerIdParamSchema.parse(req.params);
    sendSuccess(res, await contentService.getBanner(id));
  },
  async createBanner(req: Request, res: Response): Promise<void> {
    const body = createBannerSchema.parse(req.body);
    sendSuccess(res, await contentService.createBanner(adminId(req), body));
  },
  async updateBanner(req: Request, res: Response): Promise<void> {
    const { id } = bannerIdParamSchema.parse(req.params);
    const body = updateBannerSchema.parse(req.body);
    sendSuccess(res, await contentService.updateBanner(adminId(req), id, body));
  },
  async deleteBanner(req: Request, res: Response): Promise<void> {
    const { id } = bannerIdParamSchema.parse(req.params);
    await contentService.deleteBanner(adminId(req), id);
    sendSuccess(res, { id });
  },

  // Pages
  async listPages(req: Request, res: Response): Promise<void> {
    const q = pageFilterSchema.parse(req.query);
    sendSuccess(res, await contentService.listPages(q));
  },
  async getPage(req: Request, res: Response): Promise<void> {
    const { id } = pageIdParamSchema.parse(req.params);
    sendSuccess(res, await contentService.getPageById(id));
  },
  async createPage(req: Request, res: Response): Promise<void> {
    const body = createPageSchema.parse(req.body);
    sendSuccess(res, await contentService.createPage(adminId(req), body));
  },
  async updatePage(req: Request, res: Response): Promise<void> {
    const { id } = pageIdParamSchema.parse(req.params);
    const body = updatePageSchema.parse(req.body);
    sendSuccess(res, await contentService.updatePage(adminId(req), id, body));
  },
  async deletePage(req: Request, res: Response): Promise<void> {
    const { id } = pageIdParamSchema.parse(req.params);
    await contentService.deletePage(adminId(req), id);
    sendSuccess(res, { id });
  },
};

void requireAdmin;
void validate;
