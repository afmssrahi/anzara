/**
 * Settings API surface (admin only).
 */
import type { ApiClient } from './client';

export interface SiteSetting {
  id: string;
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UpsertSettingBody {
  key: string;
  value: unknown;
  group?: string;
  isPublic?: boolean;
}

export function createSettingsClient({ api }: { api: ApiClient }) {
  return {
    list(params: { group?: string } = {}, token: string) {
      const usp = new URLSearchParams();
      if (params.group) usp.set('group', params.group);
      const q = usp.toString();
      return api.request<SiteSetting[]>(`/api/admin/settings${q ? `?${q}` : ''}`, { token });
    },
    upsert(body: UpsertSettingBody, token: string) {
      return api.request<SiteSetting>('/api/admin/settings', {
        method: 'PUT',
        body,
        token,
      });
    },
  };
}

export type SettingsClient = ReturnType<typeof createSettingsClient>;
