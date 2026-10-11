/**
 * Content module - route definitions.
 */
import { Router } from 'express';
import { adminContentController, publicContentController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth';
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

// Public
export const publicContentRouter: Router = Router();
publicContentRouter.get('/banners', asyncHandler(publicContentController.listActiveBanners));
publicContentRouter.get(
  '/pages/:slug',
  validate(pageSlugParamSchema, 'params'),
  asyncHandler(publicContentController.getPageBySlug),
);

// Admin
export const adminContentRouter: Router = Router();
adminContentRouter.use(requireAdmin);

adminContentRouter.get(
  '/banners',
  validate(bannerFilterSchema, 'query'),
  asyncHandler(adminContentController.listBanners),
);
adminContentRouter.post(
  '/banners',
  validate(createBannerSchema),
  asyncHandler(adminContentController.createBanner),
);
adminContentRouter.get(
  '/banners/:id',
  validate(bannerIdParamSchema, 'params'),
  asyncHandler(adminContentController.getBanner),
);
adminContentRouter.patch(
  '/banners/:id',
  validate(bannerIdParamSchema, 'params'),
  validate(updateBannerSchema),
  asyncHandler(adminContentController.updateBanner),
);
adminContentRouter.delete(
  '/banners/:id',
  validate(bannerIdParamSchema, 'params'),
  asyncHandler(adminContentController.deleteBanner),
);

adminContentRouter.get(
  '/pages',
  validate(pageFilterSchema, 'query'),
  asyncHandler(adminContentController.listPages),
);
adminContentRouter.post(
  '/pages',
  validate(createPageSchema),
  asyncHandler(adminContentController.createPage),
);
adminContentRouter.get(
  '/pages/:id',
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminContentController.getPage),
);
adminContentRouter.patch(
  '/pages/:id',
  validate(pageIdParamSchema, 'params'),
  validate(updatePageSchema),
  asyncHandler(adminContentController.updatePage),
);
adminContentRouter.delete(
  '/pages/:id',
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminContentController.deletePage),
);
