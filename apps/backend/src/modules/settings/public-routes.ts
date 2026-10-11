/**
 * Public settings endpoint.
 *
 * Only rows where `isPublic = true` are returned. Used by the storefront
 * to fetch the WhatsApp number, brand colors, social handles, etc. without
 * exposing the whole settings table.
 *
 * @openapi
 * tags:
 *   - name: Settings (public)
 */
import { Router } from 'express';
import { prisma } from '@anzara/database';
import { sendSuccess } from '../../lib/response';

export const publicSettingsRouter: Router = Router();

/**
 * @openapi
 * /api/settings:
 *   get:
 *     tags: [Settings (public)]
 *     summary: Public site settings (brand, contact, social, analytics)
 *     description: |
 *       Only rows with `isPublic: true` are returned. This is what the
 *       storefront reads to render its brand color, social links, the
 *       WhatsApp button, and the analytics IDs.
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
 *                   additionalProperties: true
 *                   example:
 *                     brand.name: Anzara
 *                     brand.primaryColor: '#0F4C5C'
 *                     social.whatsapp: '+8801711111111'
 *                     analytics.ga4.measurementId: G-XXXXX
 */
publicSettingsRouter.get('/', async (_req, res) => {
  const rows = await prisma.siteSetting.findMany({
    where: { isPublic: true },
    select: { key: true, value: true },
  });
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  sendSuccess(res, out);
});
