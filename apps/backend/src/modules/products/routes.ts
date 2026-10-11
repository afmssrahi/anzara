/**
 * Products module - route definitions.
 * Public reads under /products, admin CRUD under /admin/products.
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
productsRouter.get(
  '/',
  validate(productListQuerySchema, 'query'),
  asyncHandler(productsController.list),
);
productsRouter.get('/featured', asyncHandler(productsController.listFeatured));
productsRouter.get(
  '/:slug',
  validate(productSlugParamSchema, 'params'),
  asyncHandler(productsController.getBySlug),
);

export const adminProductsRouter: Router = Router();
adminProductsRouter.get(
  '/',
  validate(productListQuerySchema, 'query'),
  asyncHandler(productsController.listAll),
);
adminProductsRouter.get(
  '/:id',
  requireAdmin,
  requirePermission('product:view'),
  validate(productIdParamSchema, 'params'),
  asyncHandler(productsController.getById),
);
adminProductsRouter.post(
  '/',
  requireAdmin,
  requirePermission('product:create'),
  validate(createProductSchema),
  asyncHandler(productsController.create),
);
adminProductsRouter.patch(
  '/:id',
  requireAdmin,
  requirePermission('product:update'),
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema),
  asyncHandler(productsController.update),
);
adminProductsRouter.delete(
  '/:id',
  requireAdmin,
  requirePermission('product:delete'),
  validate(productIdParamSchema, 'params'),
  asyncHandler(productsController.remove),
);
