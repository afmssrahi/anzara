/**
 * Dashboard module - route definitions.
 */
import { Router } from 'express';
import { dashboardController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { requireAdmin, requirePermission } from '../../middleware/auth';

export const adminDashboardRouter: Router = Router();
adminDashboardRouter.use(requireAdmin);
adminDashboardRouter.get(
  '/',
  requirePermission('report:view'),
  asyncHandler(dashboardController.summary),
);
