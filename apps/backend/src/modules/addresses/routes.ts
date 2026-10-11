/**
 * Addresses module - route definitions.
 * All endpoints require a logged-in customer.
 *
 * @openapi
 * tags:
 *   - name: Addresses
 */
import { Router } from 'express';
import { z } from 'zod';
import { addressesController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { createAddressSchema, updateAddressSchema } from '@anzara/validators';

const idParamSchema = z.object({ id: z.string().min(1) });

export const addressesRouter: Router = Router();
addressesRouter.use(requireAuth);

/**
 * @openapi
 * /api/addresses:
 *   get:
 *     tags: [Addresses]
 *     summary: List your addresses
 *     security:
 *       - customerCookie: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/Address' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
addressesRouter.get('/', asyncHandler(addressesController.list));

/**
 * @openapi
 * /api/addresses/{id}:
 *   get:
 *     tags: [Addresses]
 *     summary: Get one of your addresses
 *     security:
 *       - customerCookie: []
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
 *                 data: { $ref: '#/components/schemas/Address' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
addressesRouter.get('/:id', asyncHandler(addressesController.getById));

/**
 * @openapi
 * /api/addresses:
 *   post:
 *     tags: [Addresses]
 *     summary: Create an address
 *     security:
 *       - customerCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Address' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Address' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
addressesRouter.post('/', validate(createAddressSchema), asyncHandler(addressesController.create));

/**
 * @openapi
 * /api/addresses/{id}:
 *   patch:
 *     tags: [Addresses]
 *     summary: Update an address
 *     security:
 *       - customerCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Address' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { $ref: '#/components/schemas/Address' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
addressesRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateAddressSchema),
  asyncHandler(addressesController.update),
);

/**
 * @openapi
 * /api/addresses/{id}:
 *   delete:
 *     tags: [Addresses]
 *     summary: Delete an address
 *     security:
 *       - customerCookie: []
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
addressesRouter.delete('/:id', asyncHandler(addressesController.remove));
