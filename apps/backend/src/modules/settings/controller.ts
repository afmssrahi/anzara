/**
 * Settings module - HTTP layer.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from './service';
import { sendSuccess } from '../../lib/response';
import { recordAudit } from '../../lib/audit';
import type { AuthedRequest } from '../../middleware/auth';

const upsertSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  group: z.string().min(1).max(50).default('general'),
  isPublic: z.boolean().default(false),
});

export const settingsController = {
  async list(req: Request, res: Response): Promise<void> {
    const group = typeof req.query['group'] === 'string' ? req.query['group'] : undefined;
    sendSuccess(
      res,
      group ? await settingsService.listByGroup(group) : await settingsService.listAll(),
    );
  },

  async upsert(req: Request, res: Response): Promise<void> {
    const body = upsertSchema.parse(req.body);
    const adminId = (req as AuthedRequest).admin?.id ?? null;
    const dto = await settingsService.upsert(body, adminId);
    await recordAudit({
      ...(adminId ? { adminId } : {}),
      action: 'settings.upsert',
      entity: 'SiteSetting',
      entityId: dto.key,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { group: dto.group },
    });
    sendSuccess(res, dto);
  },
};
