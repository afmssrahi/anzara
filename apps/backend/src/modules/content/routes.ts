/**
 * Content module - route definitions.
 * Banners + CMS pages.
 *
 * @openapi
 * tags:
 *   - name: Content
 *   - name: Admin · Content
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

/**
 * @openapi
 * /api/content/banners:
 *   get:
 *     tags: [Content]
 *     summary: List currently-active banners (time-windowed)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Banner' } }
 */
publicContentRouter.get('/banners', asyncHandler(publicContentController.listActiveBanners));

/**
 * @openapi
 * /api/content/pages/{slug}:
 *   get:
 *     tags: [Content]
 *     summary: Get one published page by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: 'string' }
 *         example: about-us
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Page' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
publicContentRouter.get(
  '/pages/:slug',
  validate(pageSlugParamSchema, 'params'),
  asyncHandler(publicContentController.getPageBySlug),
);

// Admin
export const adminContentRouter: Router = Router();
adminContentRouter.use(requireAdmin);

/**
 * @openapi
 * /api/admin/content/banners:
 *   get:
 *     tags: [Admin · Content]
 *     summary: List ALL banners (admin)
 *     security:
 *       - adminCookie: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Banner' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminContentRouter.get(
  '/banners',
  validate(bannerFilterSchema, 'query'),
  asyncHandler(adminContentController.listBanners),
);

/**
 * @openapi
 * /api/admin/content/banners:
 *   post:
 *     tags: [Admin · Content]
 *     summary: Create a banner (admin)
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Banner' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Banner' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminContentRouter.post(
  '/banners',
  validate(createBannerSchema),
  asyncHandler(adminContentController.createBanner),
);

/**
 * @openapi
 * /api/admin/content/banners/{id}:
 *   get:
 *     tags: [Admin · Content]
 *     summary: Get one banner (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Banner' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminContentRouter.get(
  '/banners/:id',
  validate(bannerIdParamSchema, 'params'),
  asyncHandler(adminContentController.getBanner),
);

/**
 * @openapi
 * /api/admin/content/banners/{id}:
 *   patch:
 *     tags: [Admin · Content]
 *     summary: Update a banner (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Banner' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Banner' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminContentRouter.patch(
  '/banners/:id',
  validate(bannerIdParamSchema, 'params'),
  validate(updateBannerSchema),
  asyncHandler(adminContentController.updateBanner),
);

/**
 * @openapi
 * /api/admin/content/banners/{id}:
 *   delete:
 *     tags: [Admin · Content]
 *     summary: Delete a banner (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminContentRouter.delete(
  '/banners/:id',
  validate(bannerIdParamSchema, 'params'),
  asyncHandler(adminContentController.deleteBanner),
);

/**
 * @openapi
 * /api/admin/content/pages:
 *   get:
 *     tags: [Admin · Content]
 *     summary: List ALL CMS pages (admin)
 *     security:
 *       - adminCookie: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Page' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminContentRouter.get(
  '/pages',
  validate(pageFilterSchema, 'query'),
  asyncHandler(adminContentController.listPages),
);

/**
 * @openapi
 * /api/admin/content/pages:
 *   post:
 *     tags: [Admin · Content]
 *     summary: Create a CMS page (admin)
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Page' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Page' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminContentRouter.post(
  '/pages',
  validate(createPageSchema),
  asyncHandler(adminContentController.createPage),
);

/**
 * @openapi
 * /api/admin/content/pages/{id}:
 *   get:
 *     tags: [Admin · Content]
 *     summary: Get one CMS page (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Page' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminContentRouter.get(
  '/pages/:id',
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminContentController.getPage),
);

/**
 * @openapi
 * /api/admin/content/pages/{id}:
 *   patch:
 *     tags: [Admin · Content]
 *     summary: Update a CMS page (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Page' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Page' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminContentRouter.patch(
  '/pages/:id',
  validate(pageIdParamSchema, 'params'),
  validate(updatePageSchema),
  asyncHandler(adminContentController.updatePage),
);

/**
 * @openapi
 * /api/admin/content/pages/{id}:
 *   delete:
 *     tags: [Admin · Content]
 *     summary: Delete a CMS page (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminContentRouter.delete(
  '/pages/:id',
  validate(pageIdParamSchema, 'params'),
  asyncHandler(adminContentController.deletePage),
);
