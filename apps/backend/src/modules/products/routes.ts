/**
 * Products module - route definitions.
 * Public reads under /products, admin CRUD under /admin/products.
 *
 * @openapi
 * tags:
 *   - name: Products
 *   - name: Admin · Products
 */
import { Router } from 'express';
import { productsController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requirePermission } from '../../middleware/auth';
import {
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  productIdParamSchema,
  productSlugParamSchema,
} from './validators';

export const productsRouter: Router = Router();

// Public
/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products (paginated, filterable)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: 'integer', default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: 'integer', default: 20, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: 'string', enum: ['name', '-name', '-createdAt'], default: '-createdAt' }
 *       - in: query
 *         name: status
 *         schema: { type: 'string', enum: [DRAFT, PUBLISHED, ARCHIVED] }
 *       - in: query
 *         name: categoryId
 *         schema: { type: 'string' }
 *       - in: query
 *         name: collectionId
 *         schema: { type: 'string' }
 *       - in: query
 *         name: inStock
 *         schema: { type: 'boolean' }
 *       - in: query
 *         name: minPrice
 *         schema: { type: 'integer', description: 'paisa' }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: 'integer', description: 'paisa' }
 *       - in: query
 *         name: sizes
 *         schema: { type: 'array', items: { type: 'string' } }
 *         style: form
 *         explode: true
 *       - in: query
 *         name: colors
 *         schema: { type: 'array', items: { type: 'string' } }
 *         style: form
 *         explode: true
 *       - in: query
 *         name: search
 *         schema: { type: 'string' }
 *       - in: query
 *         name: isFeatured
 *         schema: { type: 'boolean' }
 *     responses:
 *       200:
 *         description: Paginated list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
 *                     meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 */
productsRouter.get(
  '/',
  validate(productListQuerySchema, 'query'),
  asyncHandler(productsController.list),
);

/**
 * @openapi
 * /api/products/featured:
 *   get:
 *     tags: [Products]
 *     summary: Featured products for the home page
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
 */
productsRouter.get('/featured', asyncHandler(productsController.listFeatured));

/**
 * @openapi
 * /api/products/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Get one product by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: 'string' }
 *         example: linen-eid-borka
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
productsRouter.get(
  '/:slug',
  validate(productSlugParamSchema, 'params'),
  asyncHandler(productsController.getBySlug),
);

export const adminProductsRouter: Router = Router();
/**
 * @openapi
 * /api/admin/products:
 *   get:
 *     tags: [Admin · Products]
 *     summary: List ALL products (including drafts/archived) (admin)
 *     security:
 *       - adminCookie: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: 'integer', default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: 'integer', default: 20, maximum: 100 }
 *       - in: query
 *         name: sort
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
 *                     meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
adminProductsRouter.get(
  '/',
  validate(productListQuerySchema, 'query'),
  asyncHandler(productsController.listAll),
);

/**
 * @openapi
 * /api/admin/products/{id}:
 *   get:
 *     tags: [Admin · Products]
 *     summary: Get one product by id (admin)
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
 *                 data: { $ref: '#/components/schemas/Product' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminProductsRouter.get(
  '/:id',
  requireAdmin,
  requirePermission('product:view'),
  validate(productIdParamSchema, 'params'),
  asyncHandler(productsController.getById),
);

/**
 * @openapi
 * /api/admin/products:
 *   post:
 *     tags: [Admin · Products]
 *     summary: Create a product (admin)
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Product' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Duplicate slug or SKU
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
adminProductsRouter.post(
  '/',
  requireAdmin,
  requirePermission('product:create'),
  validate(createProductSchema),
  asyncHandler(productsController.create),
);

/**
 * @openapi
 * /api/admin/products/{id}:
 *   patch:
 *     tags: [Admin · Products]
 *     summary: Update a product (admin)
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
 *           schema: { $ref: '#/components/schemas/Product' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminProductsRouter.patch(
  '/:id',
  requireAdmin,
  requirePermission('product:update'),
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema),
  asyncHandler(productsController.update),
);

/**
 * @openapi
 * /api/admin/products/{id}:
 *   delete:
 *     tags: [Admin · Products]
 *     summary: Delete a product (admin) — use with care
 *     description: |
 *       Prefer archiving (`status: ARCHIVED`). Deleting removes the record
 *       entirely; orders that reference it will show "Unknown product".
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
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminProductsRouter.delete(
  '/:id',
  requireAdmin,
  requirePermission('product:delete'),
  validate(productIdParamSchema, 'params'),
  asyncHandler(productsController.remove),
);
