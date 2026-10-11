/**
 * Collections module - route definitions.
 *
 * @openapi
 * tags:
 *   - name: Collections
 *   - name: Admin · Collections
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

/**
 * @openapi
 * /api/collections:
 *   get:
 *     tags: [Collections]
 *     summary: List active collections
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Collection' } }
 */
collectionsRouter.get('/', asyncHandler(collectionsController.list));

/**
 * @openapi
 * /api/collections/{slug}:
 *   get:
 *     tags: [Collections]
 *     summary: Get one collection by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: 'string' }
 *         example: summer-picks
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Collection' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
collectionsRouter.get(
  '/:slug',
  validate(collectionSlugParamSchema, 'params'),
  asyncHandler(collectionsController.getBySlug),
);

export const adminCollectionsRouter: Router = Router();

/**
 * @openapi
 * /api/admin/collections:
 *   get:
 *     tags: [Admin · Collections]
 *     summary: List ALL collections (admin)
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
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Collection' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminCollectionsRouter.get('/', asyncHandler(collectionsController.listAll));

/**
 * @openapi
 * /api/admin/collections:
 *   post:
 *     tags: [Admin · Collections]
 *     summary: Create a collection (admin)
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Collection' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Collection' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
adminCollectionsRouter.post(
  '/',
  requireAdmin,
  validate(createCollectionSchema),
  asyncHandler(collectionsController.create),
);

/**
 * @openapi
 * /api/admin/collections/{id}:
 *   patch:
 *     tags: [Admin · Collections]
 *     summary: Update a collection (admin)
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
 *           schema: { $ref: '#/components/schemas/Collection' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Collection' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
adminCollectionsRouter.patch(
  '/:id',
  requireAdmin,
  validate(collectionIdParamSchema, 'params'),
  validate(updateCollectionSchema),
  asyncHandler(collectionsController.update),
);

/**
 * @openapi
 * /api/admin/collections/{id}:
 *   delete:
 *     tags: [Admin · Collections]
 *     summary: Delete a collection (admin)
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
adminCollectionsRouter.delete(
  '/:id',
  requireAdmin,
  validate(collectionIdParamSchema, 'params'),
  asyncHandler(collectionsController.remove),
);
