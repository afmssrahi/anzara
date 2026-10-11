/**
 * Public payments endpoint.
 *
 * @openapi
 * tags:
 *   - name: Payments (public)
 */
import { Router } from 'express';
import { ENABLED_PAYMENT_METHODS, PAYMENT_CURRENCY } from './factory';
import { sendSuccess } from '../../lib/response';

export const publicPaymentsRouter: Router = Router();

const LABEL: Record<(typeof ENABLED_PAYMENT_METHODS)[number], string> = {
  COD: 'Cash on Delivery',
};

/**
 * @openapi
 * /api/payments/methods:
 *   get:
 *     tags: [Payments (public)]
 *     summary: List enabled payment methods + currency
 *     description: Driven by the registry in `factory.ts` so the storefront's picker stays in sync with what the orders service will accept.
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
 *                     methods:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: 'string', example: COD }
 *                           label: { type: 'string', example: Cash on Delivery }
 *                           provider: { type: 'string', example: cod }
 *                     currency: { type: 'string', example: BDT }
 */
publicPaymentsRouter.get('/methods', (_req, res) => {
  sendSuccess(res, {
    methods: ENABLED_PAYMENT_METHODS.map((id) => ({
      id,
      label: LABEL[id] ?? id,
      provider: id.toLowerCase(),
    })),
    currency: PAYMENT_CURRENCY,
  });
});
