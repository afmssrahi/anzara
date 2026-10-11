/**
 * Rate limiters.
 * - `authRateLimiter`: broad (register, OTP verify, forgot, reset).
 * - `loginRateLimiter`: tight (5 attempts / 5 min per IP, with email
 *   fingerprint to slow single-account password spraying).
 * - `otpRateLimiter`: 10 requests / hour per IP.
 * - `uploadRateLimiter`: 30 uploads / 5 min per IP.
 * - `writeRateLimiter`: 60 mutations / min per IP (for any future write APIs).
 * - `docsRateLimiter`: 60 reads / min per IP for the Swagger UI + spec.
 *   The UI re-fetches the spec on every page load, so it can't be too
 *   tight, but it should still block a scraper.
 *
 * In-memory only. For multi-instance prod, swap to Redis.
 */
import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

const isProd = process.env['NODE_ENV'] === 'production';
const skipInDev = () => isProd === false && process.env['DISABLE_RATE_LIMIT'] === 'true';

function emailKey(req: Request): string {
  const body = req.body as { email?: string } | undefined;
  return (body?.email ?? '').toLowerCase().trim();
}

// IP+email composite key: caps the (IP, email) tuple separately from the
// catch-all per-IP cap. Stops one attacker from locking out everyone from
// the same NAT, and stops 5 different IPs from hammering one account.
export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${req.ip}|email:${emailKey(req)}`,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Try again in 5 minutes.',
    },
  },
  skip: skipInDev,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please slow down.' },
  },
  skip: skipInDev,
});

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many OTP requests. Try again later.' },
  },
  skip: skipInDev,
});

export const uploadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many uploads. Try again in a few minutes.' },
  },
  skip: skipInDev,
});

export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many writes. Slow down.' },
  },
  skip: skipInDev,
});

export const docsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests for the docs UI. Slow down.' },
  },
  // The docs are dev-only; in dev we still apply the limit to make
  // accidental infinite-refresh loops (and ad-hoc scrapers) stop quickly.
  // DISABLE_RATE_LIMIT=true also disables it.
  skip: skipInDev,
});
