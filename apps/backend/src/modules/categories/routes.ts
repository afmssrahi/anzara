/**
 * Categories module - route definitions.
 *
 * @openapi
 * tags:
 *   - name: Categories
 *   - name: Admin · Categories
 */
import { Router } from 'express';
import { categoriesController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  categorySlugParamSchema,
} from './validators';

export const categoriesRouter: Router = Router();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List active categories
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Category' } }
 */
categoriesRouter.get('/', asyncHandler(categoriesController.list));

/**
 * @openapi
 * /api/categories/{slug}:
 *   get:
 *     tags: [Categories]
 *     summary: Get one category by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: 'string' }
 *         example: abayas
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
categoriesRouter.get(
  '/:slug',
  validate(categorySlugParamSchema, 'params'),
  asyncHandler(categoriesController.getBySlug),
);

// Admin
const adminRouter = Router();
/**
 * @openapi
 * /api/admin/categories:
 *   get:
 *     tags: [Admin · Categories]
 *     summary: List ALL categories (admin)
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
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Category' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminRouter.get('/', asyncHandler(categoriesController.listAll));

/**
 * @openapi
 * /api/admin/categories:
 *   post:
 *     tags: [Admin · Categories]
 *     summary: Create a category (admin)
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Category' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminRouter.post(
  '/',
  requireAdmin,
  validate(createCategorySchema),
  asyncHandler(categoriesController.create),
);

/**
 * @openapi
 * /api/admin/categories/{id}:
 *   patch:
 *     tags: [Admin · Categories]
 *     summary: Update a category (admin)
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
 *           schema: { $ref: '#/components/schemas/Category' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminRouter.patch(
  '/:id',
  requireAdmin,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  asyncHandler(categoriesController.update),
);

/**
 * @openapi
 * /api/admin/categories/{id}:
 *   delete:
 *     tags: [Admin · Categories]
 *     summary: Delete a category (admin)
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
adminRouter.delete(
  '/:id',
  requireAdmin,
  validate(categoryIdParamSchema, 'params'),
  asyncHandler(categoriesController.remove),
);

export const adminCategoriesRouter: Router = adminRouter;
