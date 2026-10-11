/**
 * Public settings surface.
 *
 * Returns only the keys where SiteSetting.isPublic = true. Used by the
 * storefront to read brand colors, social handles, and the WhatsApp
 * number without admin auth.
 */
import type { ApiClient } from './client';

export type PublicSettings = Record<string, unknown>;

export function createPublicSettingsClient({ api }: { api: ApiClient }) {
  return {
    all() {
      return api.request<PublicSettings>('/api/settings');
    },
  };
}

export type PublicSettingsClient = ReturnType<typeof createPublicSettingsClient>;
