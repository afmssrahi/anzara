/**
 * Settings module - data access layer.
 * SiteSetting is a generic key/value table, grouped by category.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

export interface SiteSettingDto {
  id: string;
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export const settingsRepository = {
  async listAll() {
    return prisma.siteSetting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  },

  async listByGroup(group: string) {
    return prisma.siteSetting.findMany({ where: { group }, orderBy: { key: 'asc' } });
  },

  async findByKey(key: string) {
    return prisma.siteSetting.findUnique({ where: { key } });
  },

  async upsert(
    key: string,
    value: Prisma.InputJsonValue,
    group: string,
    updatedBy: string | null,
    isPublic = false,
  ) {
    return prisma.siteSetting.upsert({
      where: { key },
      update: { value, group, updatedBy },
      create: { key, value, group, isPublic, updatedBy },
    });
  },
};
