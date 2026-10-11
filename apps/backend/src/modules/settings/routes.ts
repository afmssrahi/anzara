/**
 * Settings module - route definitions (admin only).
 */
import { Router } from 'express';
import { settingsController } from './controller';
import { asyncHandler } from '../../lib/async-handler';
import { requireAdmin, requirePermission } from '../../middleware/auth';

export const adminSettingsRouter: Router = Router();
adminSettingsRouter.use(requireAdmin);

adminSettingsRouter.get(
  '/',
  requirePermission('settings:view'),
  asyncHandler(settingsController.list),
);

adminSettingsRouter.put(
  '/',
  requirePermission('settings:update'),
  asyncHandler(settingsController.upsert),
);
