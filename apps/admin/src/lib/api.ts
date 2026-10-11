import {
  createApiClient,
  createAuthClient,
  createProductsClient,
  createOrdersClient,
  createSettingsClient,
} from '@anzara/api-client';

const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export const api = createApiClient(baseUrl);
export const auth = createAuthClient({ api });
export const products = createProductsClient({ api });
export const orders = createOrdersClient({ api });
export const settings = createSettingsClient({ api });
