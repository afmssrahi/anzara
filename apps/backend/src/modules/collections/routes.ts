/**
 * Collections module - route definitions.
 */
import { Router } from 'express';
import { collectionsController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth';
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionIdParamSchema,
  collectionSlugParamSchema,
} from './validators';

export const collectionsRouter: Router = Router();

collectionsRouter.get('/', asyncHandler(collectionsController.list));
collectionsRouter.get(
  '/:slug',
  validate(collectionSlugParamSchema, 'params'),
  asyncHandler(collectionsController.getBySlug),
);

export const adminCollectionsRouter: Router = Router();
adminCollectionsRouter.get('/', asyncHandler(collectionsController.listAll));
adminCollectionsRouter.post(
  '/',
  requireAdmin,
  validate(createCollectionSchema),
  asyncHandler(collectionsController.create),
);
adminCollectionsRouter.patch(
  '/:id',
  requireAdmin,
  validate(collectionIdParamSchema, 'params'),
  validate(updateCollectionSchema),
  asyncHandler(collectionsController.update),
);
adminCollectionsRouter.delete(
  '/:id',
  requireAdmin,
  validate(collectionIdParamSchema, 'params'),
  asyncHandler(collectionsController.remove),
);
