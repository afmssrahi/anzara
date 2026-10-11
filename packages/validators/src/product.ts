/**
 * Product catalog validators.
 */
import { z } from 'zod';
import {
  slugSchema,
  localizedStringSchema,
  optionalLocalizedStringSchema,
  paginationSchema,
} from './common';

export const productVariantSchema = z.object({
  sku: z.string().min(1).max(50),
  size: z.string().max(20).optional(),
  color: z.string().max(30).optional(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().optional(),
  stockQuantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  isActive: z.boolean().default(true),
  weight: z.number().positive().optional(),
});
export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const productImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  alt: z.string().min(1).max(200),
  position: z.number().int().nonnegative().default(0),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

export const productCreateSchema = z.object({
  slug: slugSchema,
  name: localizedStringSchema,
  description: localizedStringSchema,
  shortDescription: optionalLocalizedStringSchema,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  basePrice: z.number().int().nonnegative(),
  categoryId: z.string().min(1),
  collectionIds: z.array(z.string()).default([]),
  variants: z.array(productVariantSchema).min(1, 'At least one variant is required'),
  images: z.array(productImageSchema).default([]),
  tags: z.array(z.string()).default([]),
  seoTitle: optionalLocalizedStringSchema,
  seoDescription: optionalLocalizedStringSchema,
  hasVariants: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productFilterSchema = paginationSchema.extend({
  categoryId: z.string().optional(),
  collectionId: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  inStock: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});
export type ProductFilterInput = z.infer<typeof productFilterSchema>;

export const categoryCreateSchema = z.object({
  slug: slugSchema,
  name: localizedStringSchema,
  description: optionalLocalizedStringSchema,
  image: z.string().url().optional(),
  parentId: z.string().optional(),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const collectionCreateSchema = z.object({
  slug: slugSchema,
  name: localizedStringSchema,
  description: optionalLocalizedStringSchema,
  image: z.string().url().optional(),
  productIds: z.array(z.string()).default([]),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
export type CollectionCreateInput = z.infer<typeof collectionCreateSchema>;
