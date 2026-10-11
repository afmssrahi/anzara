/**
 * Health check module.
 * Used for liveness/readiness probes and a quick connectivity test.
 *
 * @openapi
 * tags:
 *   - name: Health
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendSuccess } from '../../lib/response';
import { prisma } from '@anzara/database';

export const healthRouter: Router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness + DB ping
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: 'string', example: ok }
 *                     database: { type: 'string', example: connected }
 *                     timestamp: { type: 'string', format: 'date-time' }
 *       503:
 *         description: DB unreachable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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
