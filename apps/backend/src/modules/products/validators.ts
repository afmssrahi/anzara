/**
 * Product module validators.
 * Re-export shared Zod schemas and add module-specific filters.
 */
import { z } from 'zod';

// Localized JSON shape reused for name/description fields.
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

const productStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

const productVariantInput = z.object({
  id: z.string().optional(), // present on update to identify the variant
  sku: z.string().min(1).max(64),
  size: z.string().max(32).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().optional().nullable(),
  stockQuantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  isActive: z.boolean().default(true),
  weight: z.number().int().nonnegative().optional().nullable(),
  position: z.number().int().nonnegative().default(0),
});

const productImageInput = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  publicId: z.string().optional().nullable(),
  alt: z.string().min(1).max(200),
  position: z.number().int().nonnegative().default(0),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
});

export const createProductSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  name: localizedString,
  description: localizedString,
  shortDescription: localizedStringOptional,
  status: productStatus.default('DRAFT'),
  basePrice: z.number().int().nonnegative(),
  categoryId: z.string().min(1),
  hasVariants: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(40)).default([]),
  seoTitle: localizedStringOptional,
  seoDescription: localizedStringOptional,
  collectionIds: z.array(z.string().min(1)).default([]),
  variants: z.array(productVariantInput).default([]),
  images: z.array(productImageInput).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z
    .enum(['createdAt', '-createdAt', 'basePrice', '-basePrice', 'name', '-name'])
    .default('-createdAt'),
  status: productStatus.optional(),
  categoryId: z.string().optional(),
  collectionId: z.string().optional(),
  inStock: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sizes: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),
  colors: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),
  search: z.string().optional(),
  isFeatured: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const productIdParamSchema = z.object({
  id: z.string().min(1),
});

export const productSlugParamSchema = z.object({
  slug: z.string().min(1),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
