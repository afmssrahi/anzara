/**
 * Storefront API client. Created once on the server using NEXT_PUBLIC_API_URL
 * so that server-rendered code and browser code both reach the same backend.
 */
import { createApiClient, createAuthClient } from '@anzara/api-client';

const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export const api = createApiClient(baseUrl);
export const auth = createAuthClient({ api });
