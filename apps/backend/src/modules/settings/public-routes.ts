/**
 * Public settings endpoint.
 *
 * Only rows where `isPublic = true` are returned. Used by the storefront
 * to fetch the WhatsApp number, brand colors, social handles, etc. without
 * exposing the whole settings table.
 */
import { Router } from 'express';
import { prisma } from '@anzara/database';
import { sendSuccess } from '../../lib/response';

export const publicSettingsRouter: Router = Router();

publicSettingsRouter.get('/', async (_req, res) => {
  const rows = await prisma.siteSetting.findMany({
    where: { isPublic: true },
    select: { key: true, value: true },
  });
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  sendSuccess(res, out);
});
