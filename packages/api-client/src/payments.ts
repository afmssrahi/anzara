/**
 * Payments surface.
 *
 * Today this is a tiny read-only endpoint that tells the storefront which
 * payment methods the backend has enabled (today: just COD). When
 * SSLCommerz / bKash / Nagad are integrated they will appear here
 * automatically - no frontend change needed beyond consuming the list.
 */
import type { ApiClient } from './client';

export interface EnabledPaymentMethodsResponse {
  methods: Array<{
    /** e.g. "COD", "SSLCOMMERZ", "BKASH". */
    id: string;
    /** e.g. "Cash on Delivery". */
    label: string;
    /** Provider identifier; for analytics, not for payment routing. */
    provider: string;
  }>;
  currency: 'BDT';
}

export function createPaymentsClient({ api }: { api: ApiClient }) {
  return {
    enabled() {
      return api.request<EnabledPaymentMethodsResponse>('/api/payments/methods');
    },
  };
}

export type PaymentsClient = ReturnType<typeof createPaymentsClient>;
