/**
 * Dashboard module - route definitions.
 *
 * @openapi
 * tags:
 *   - name: Admin · Dashboard
 */
import { Router } from 'express';
import { dashboardController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { requireAdmin, requirePermission } from '../../middleware/auth';

export const adminDashboardRouter: Router = Router();
adminDashboardRouter.use(requireAdmin);

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin · Dashboard]
 *     summary: KPI summary (admin home)
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
 *                 data: { $ref: '#/components/schemas/DashboardSummary' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
adminDashboardRouter.get(
  '/',
  requirePermission('report:view'),
  asyncHandler(dashboardController.summary),
);
