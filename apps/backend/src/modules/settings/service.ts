/**
 * Settings module - business logic.
 */
import { z } from 'zod';
import { settingsRepository, type SiteSettingDto } from './repository';

const settingInputSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  group: z.string().min(1).max(50).default('general'),
  isPublic: z.boolean().default(false),
});
export type SettingInput = z.infer<typeof settingInputSchema>;

function toDto(row: {
  id: string;
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
  updatedAt: Date;
  updatedBy: string | null;
}): SiteSettingDto {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    group: row.group,
    isPublic: row.isPublic,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export const settingsService = {
  async listAll() {
    const rows = await settingsRepository.listAll();
    return rows.map(toDto);
  },

  async listByGroup(group: string) {
    const rows = await settingsRepository.listByGroup(group);
    return rows.map(toDto);
  },

  async upsert(input: SettingInput, updatedBy: string | null) {
    const parsed = settingInputSchema.parse(input);
    const row = await settingsRepository.upsert(
      parsed.key,
      parsed.value as never,
      parsed.group,
      updatedBy,
      parsed.isPublic,
    );
    return toDto(row);
  },
};
