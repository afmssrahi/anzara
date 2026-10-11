/**
 * Categories module - route definitions.
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

// Public reads
categoriesRouter.get('/', asyncHandler(categoriesController.list));
categoriesRouter.get(
  '/:slug',
  validate(categorySlugParamSchema, 'params'),
  asyncHandler(categoriesController.getBySlug),
);

// Admin
const adminRouter = Router();
adminRouter.get('/', asyncHandler(categoriesController.listAll));
adminRouter.post(
  '/',
  requireAdmin,
  validate(createCategorySchema),
  asyncHandler(categoriesController.create),
);
adminRouter.patch(
  '/:id',
  requireAdmin,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  asyncHandler(categoriesController.update),
);
adminRouter.delete(
  '/:id',
  requireAdmin,
  validate(categoryIdParamSchema, 'params'),
  asyncHandler(categoriesController.remove),
);

export const adminCategoriesRouter: Router = adminRouter;
