/**
 * Auth module validators.
 * Re-exports from the shared package so the same Zod schemas are used
 * by the backend (validation) and the frontend (form validation).
 */
export {
  customerRegisterSchema,
  customerLoginSchema,
  adminLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  enableTotpSchema,
} from '@anzara/validators';
