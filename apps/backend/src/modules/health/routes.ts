/**
 * Health check module.
 * Used for liveness/readiness probes and a quick connectivity test.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendSuccess } from '../../lib/response';
import { prisma } from '@anzara/database';

export const healthRouter: Router = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    // Quick DB check
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  }),
);
