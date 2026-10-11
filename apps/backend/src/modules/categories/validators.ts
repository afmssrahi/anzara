/**
 * Category module validators.
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

export const createCategorySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  name: localizedString,
  description: localizedStringOptional,
  image: z.string().url().optional().nullable(),
  parentId: z.string().optional().nullable(),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({
  id: z.string().min(1),
});

export const categorySlugParamSchema = z.object({
  slug: z.string().min(1),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
