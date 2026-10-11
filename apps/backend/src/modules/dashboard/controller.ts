/**
 * Dashboard module - HTTP layer.
 */
import type { Response } from 'express';
import { sendSuccess } from '../../lib/response';
import { dashboardService } from './service';

export const dashboardController = {
  async summary(_req: unknown, res: Response): Promise<void> {
    sendSuccess(res, await dashboardService.getSummary());
  },
};
