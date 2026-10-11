/**
 * Settings module - admin route definitions.
 *
 * The PUBLIC settings router lives in `public-routes.ts` (one file per
 * logical concern: public reads, admin writes). It's mounted at /settings
 * by the top-level router and has its own @openapi JSDoc.
 *
 * @openapi
 * tags:
 *   - name: Admin · Settings
 */
import { Router } from 'express';
import { z } from 'zod';
import { settingsController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requirePermission } from '../../middleware/auth';

const upsertSchema = z.object({
  items: z.array(
    z.object({
      key: z.string().min(1),
      value: z.unknown(),
      isPublic: z.boolean().optional(),
      group: z.string().optional(),
      description: z.string().optional(),
    }),
  ),
});

export const adminSettingsRouter: Router = Router();
adminSettingsRouter.use(requireAdmin);

/**
 * @openapi
 * /api/admin/settings:
 *   get:
 *     tags: [Admin · Settings]
 *     summary: List ALL settings (admin)
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
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/SiteSetting' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
adminSettingsRouter.get(
  '/',
  requirePermission('settings:view'),
  asyncHandler(settingsController.list),
);

/**
 * @openapi
 * /api/admin/settings:
 *   put:
 *     tags: [Admin · Settings]
 *     summary: Upsert one or many settings (admin)
 *     security:
 *       - adminCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/SiteSetting' }
 *     responses:
 *       200:
 *         description: Upserted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data: { type: 'array', items: { $ref: '#/components/schemas/SiteSetting' } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
adminSettingsRouter.put(
  '/',
  requirePermission('settings:update'),
  validate(upsertSchema),
  asyncHandler(settingsController.upsert),
);
