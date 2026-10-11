/**
 * Authentication and account validators.
 */
import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema, localeSchema } from './common';

export const customerRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  phone: phoneSchema.optional(),
  preferredLocale: localeSchema.default('en'),
});
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;

export const customerLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const otpRequestSchema = z.object({
  email: emailSchema,
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD']),
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD']),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  phone: phoneSchema.optional(),
  preferredLocale: localeSchema.optional(),
  acceptsMarketing: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const enableTotpSchema = z.object({
  code: z.string().length(6),
});
export type EnableTotpInput = z.infer<typeof enableTotpSchema>;

export const addressSchema = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().min(1).max(100).trim(),
  phone: phoneSchema,
  addressLine1: z.string().min(1).max(200).trim(),
  addressLine2: z.string().max(200).trim().optional(),
  city: z.string().min(1).max(50).trim(),
  district: z.string().min(1).max(50).trim(),
  division: z.string().min(1).max(50).trim(),
  postalCode: z.string().max(10).optional(),
  country: z.string().default('Bangladesh'),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;
