/**
 * Resolves the active payment provider.
 *
 * Today: only COD is enabled. The factory exists so when SSLCommerz / bKash
 * / Nagad / Card credentials land, adding them is a one-case change here +
 * a new provider file. No call site, controller, service, UI, or schema
 * needs to change.
 *
 * To add SSLCommerz:
 *   1. Add `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` to env.
 *   2. Create `sslcommerz-provider.ts` that implements `PaymentProvider`.
 *   3. Add a case below keyed off `SSLCOMMERZ_STORE_ID` being set.
 *   4. Append the method to `ENABLED_PAYMENT_METHODS`.
 *   5. Add it to `PaymentMethod` in @anzara/shared-types if not present.
 */
import type { PaymentProvider } from './provider';
import { codPaymentProvider } from './cod-provider';

const CURRENCY = 'BDT' as const;
export type { PaymentMethodContext, PaymentProvider } from './provider';

/**
 * The set of payment methods the storefront exposes today.
 * Mirrors the `PaymentMethod` enum in @anzara/shared-types. Keep in sync.
 */
export const ENABLED_PAYMENT_METHODS = ['COD'] as const;
export type EnabledPaymentMethod = (typeof ENABLED_PAYMENT_METHODS)[number];

const REGISTRY: Record<EnabledPaymentMethod, PaymentProvider> = {
  COD: codPaymentProvider,
  // When SSLCOMMERZ_STORE_ID is set, add:  SSLCOMMERZ: sslCommerzProvider,
};

/**
 * Returns the payment provider for a given method, or throws if the method
 * is not enabled. The orders service calls this once per order placement.
 */
export function getPaymentProvider(method: string): PaymentProvider {
  if (method in REGISTRY) {
    return REGISTRY[method as EnabledPaymentMethod];
  }
  throw new Error(
    `Payment method "${method}" is not enabled. ` +
      `Enabled methods: ${ENABLED_PAYMENT_METHODS.join(', ')}. ` +
      `See apps/backend/src/modules/payments/factory.ts to add a new provider.`,
  );
}

export const PAYMENT_CURRENCY = CURRENCY;
