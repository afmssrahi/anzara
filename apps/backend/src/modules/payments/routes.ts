/**
 * Public payments endpoint.
 *
 * Used by the storefront to render the payment-method picker on the
 * checkout page. Driven by the registry in `factory.ts` so the answer
 * is always in sync with what the orders service will accept.
 */
import { Router } from 'express';
import { ENABLED_PAYMENT_METHODS, PAYMENT_CURRENCY } from './factory';
import { sendSuccess } from '../../lib/response';

export const publicPaymentsRouter: Router = Router();

const LABEL: Record<(typeof ENABLED_PAYMENT_METHODS)[number], string> = {
  COD: 'Cash on Delivery',
};

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
