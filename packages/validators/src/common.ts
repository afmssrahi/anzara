/**
 * Common reusable validators.
 */
import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^(\+?880|0)?1[3-9]\d{8}$/, 'Invalid Bangladesh phone number')
  .transform((v) => v.replace(/\s|-/g, ''));

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug (lowercase, numbers, hyphens only)');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const localeSchema = z.enum(['en', 'bn']);

export const localizedStringSchema = z.object({
  en: z.string().min(1),
  bn: z.string().min(1),
});

export const optionalLocalizedStringSchema = z
  .object({
    en: z.string().optional(),
    bn: z.string().optional(),
  })
  .optional();
