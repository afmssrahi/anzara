/**
 * Collection module validators.
 */
import { z } from 'zod';

const localizedString = z
  .object({
    en: z.string().min(1),
    bn: z.string().min(1),
  })
  .strict();

const localizedStringOptional = z
  .object({
    en: z.string().optional(),
    bn: z.string().optional(),
  })
  .strict()
  .optional();

export const createCollectionSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  name: localizedString,
  description: localizedStringOptional,
  image: z.string().url().optional().nullable(),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  productIds: z.array(z.string().min(1)).default([]),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const collectionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const collectionSlugParamSchema = z.object({
  slug: z.string().min(1),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
