/**
 * Environment variable validation.
 * Fails fast at boot if required variables are missing.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Application
  APP_NAME: z.string().default('Anzara'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),
  API_URL: z.string().url().default('http://localhost:4000'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_DIRECT_URL: z.string().url().optional(),

  // Redis: intentionally not in the schema yet. Nothing consumes it.
  // When a session store or job queue needs it, re-introduce here with
  // `z.string().url().or(z.literal('')).optional()` so empty string is allowed.

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_RESET_SECRET: z
    .string()
    .min(32, 'JWT_RESET_SECRET must be at least 32 characters')
    // Default to JWT_REFRESH_SECRET in dev if not set, so a fresh `.env` boots.
    .default(process.env['JWT_REFRESH_SECRET'] ?? 'dev-only-reset-secret-change-me-32+chars'),
  JWT_ISSUER: z.string().default('anzara'),
  JWT_AUDIENCE: z.string().default('anzara-api'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  // Number of reverse proxies in front of the app. Used so req.ip resolves
  // to the real client IP. Set to 0 in dev (no proxy), or 1+ in prod.
  TRUST_PROXY: z
    .string()
    .default('1')
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : 1;
    }),

  // Email
  // RESEND_API_KEY is optional. With no key, emails are written to the local
  // outbox (./emails-outbox/*.json) so flows work end-to-end with zero setup.
  // Add a key later to switch the EmailProvider to Resend.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Anzara <noreply@anzara.com>'),
  EMAIL_OUTBOX_DIR: z.string().default('./emails-outbox'),

  // Media
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Local uploads (dev / fallback provider). Swap to Cloudinary by setting
  // ASSET_PROVIDER=cloudinary and adding CLOUDINARY_* (no code change needed).
  UPLOAD_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 1024 * 1024), // 8MB
  ASSET_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),

  // Payments (optional - COD works without these)
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  SSLCOMMERZ_SANDBOX: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // Courier
  COURIER_PROVIDER: z.string().default('manual'),
  COURIER_API_KEY: z.string().optional(),
  COURIER_API_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Throws a descriptive error if validation fails.
 */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}

/**
 * Cached parsed environment.
 * Re-parsed if NODE_ENV changes.
 */
let cachedEnv: Env | null = null;
let cachedNodeEnv: string | undefined;

export function getEnv(): Env {
  const currentNodeEnv = process.env['NODE_ENV'];
  if (cachedEnv === null || cachedNodeEnv !== currentNodeEnv) {
    cachedEnv = parseEnv();
    cachedNodeEnv = currentNodeEnv;
  }
  return cachedEnv;
}
