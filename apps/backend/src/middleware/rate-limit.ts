/**
 * Rate limiter for authentication endpoints.
 * Uses in-memory storage for dev. For production, swap to Redis-backed.
 */
import rateLimit from 'express-rate-limit';

const isProd = process.env['NODE_ENV'] === 'production';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isProd === false && process.env['DISABLE_RATE_LIMIT'] === 'true',
});

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 OTP requests per hour per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many OTP requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
