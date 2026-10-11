/**
 * Centralized error handler.
 * - Turns AppError instances into structured JSON responses.
 * - Hides internal details (stack, query params, error.message) from clients
 *   in production; full error is still logged server-side.
 * - Redacts emails and token-like strings from server-side logs to avoid
 *   PII in error streams.
 * - Hands the error to the active ErrorReporter (Pino by default). A future
 *   Sentry adapter can plug in without changing this file.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { getEnv } from '@anzara/config';
import { AppError, InternalError } from '../lib/errors';
import { captureError } from '../modules/error-reporting/factory';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_RE = /Bearer\s+[A-Za-z0-9._-]+/g;
const LONG_HEX_RE = /\b[0-9a-f]{32,}\b/gi;

function redact(value: string): string {
  return value
    .replace(EMAIL_RE, '[email]')
    .replace(TOKEN_RE, 'Bearer [token]')
    .replace(LONG_HEX_RE, '[hash]');
}

function dumpContext(req: Request, err: Error): string {
  const requestId = (req as Request & { requestId?: string }).requestId ?? '-';
  const url = redact(req.originalUrl ?? req.url ?? '');
  const msg = redact(err.stack || err.message || String(err));
  return `[ERROR] [${requestId}] ${req.method} ${url}\n${msg}\n`;
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Always log server-side (redacted).
  process.stderr.write(dumpContext(req, err));

  // Hand off to the active ErrorReporter (Pino by default; Sentry later).
  // Skip 4xx - they are client mistakes, not server faults - to keep the
  // signal-to-noise ratio high.
  const status = err instanceof AppError ? err.statusCode : 500;
  if (status >= 500) {
    captureError(err, {
      requestId: (req as Request & { id?: string }).id,
      request: `${req.method} ${req.path}`,
      level: 'error',
    });
  }

  // Zod validation errors -> 422 with field details.
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      details[path] = issue.message;
    }
    res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
    return;
  }

  // Known application errors.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Unknown errors: in production, return generic; in dev, include message
  // for faster debugging.
  const isProd = getEnv().NODE_ENV === 'production';
  const safe = new InternalError();
  if (isProd) {
    res.status(safe.statusCode).json({
      success: false,
      error: { code: safe.code, message: safe.message },
    });
    return;
  }
  res.status(safe.statusCode).json({
    success: false,
    error: { code: safe.code, message: err.message || safe.message },
  });
}
