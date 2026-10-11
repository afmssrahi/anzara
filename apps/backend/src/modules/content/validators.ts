/**
 * Content module - Zod validators.
 */
import { z } from 'zod';

const localizedString = z.union([
  z.string().min(1),
  z.object({
    en: z.string().min(1),
    bn: z.string().optional(),
  }),
]);

const localizedRichText = z.union([
  z.string().min(1),
  z.object({
    en: z.string().min(1),
    bn: z.string().optional(),
  }),
]);

const urlOrEmpty = z
  .union([z.literal(''), z.string().url()])
  .optional()
  .or(z.string().url().optional());

const futureOrPast = z.coerce.date().optional();

// -------- Banners --------
export const bannerFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type BannerFilterInput = z.infer<typeof bannerFilterSchema>;

export const createBannerSchema = z
  .object({
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    imageUrl: z.string().url(),
    mobileImageUrl: urlOrEmpty,
    linkUrl: urlOrEmpty,
    position: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
    startsAt: futureOrPast,
    endsAt: futureOrPast,
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.startsAt < v.endsAt, {
    message: 'startsAt must be before endsAt',
    path: ['startsAt'],
  });
export type CreateBannerInput = z.infer<typeof createBannerSchema>;

const bannerBaseSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional(),
  imageUrl: z.string().url(),
  mobileImageUrl: urlOrEmpty,
  linkUrl: urlOrEmpty,
  position: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  startsAt: futureOrPast,
  endsAt: futureOrPast,
});

export const updateBannerSchema = bannerBaseSchema.partial();
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;

export const bannerIdParamSchema = z.object({ id: z.string().min(1) });
export type BannerIdParam = z.infer<typeof bannerIdParamSchema>;

// -------- Pages --------
export const pageFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isPublished: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().optional(),
});
export type PageFilterInput = z.infer<typeof pageFilterSchema>;

export const createPageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, "-"'),
  title: localizedString,
  content: localizedRichText,
  isPublished: z.boolean().default(false),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

const pageBaseSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, "-"')
    .optional(),
  title: localizedString.optional(),
  content: localizedRichText.optional(),
  isPublished: z.boolean().optional(),
});

export const updatePageSchema = pageBaseSchema;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

export const pageIdParamSchema = z.object({ id: z.string().min(1) });
export type PageIdParam = z.infer<typeof pageIdParamSchema>;

export const pageSlugParamSchema = z.object({ slug: z.string().min(1) });
