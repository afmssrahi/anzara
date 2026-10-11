/**
 * Centralized error handler.
 * Turns AppError instances into structured JSON, hides internals from clients in production.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, InternalError } from '../lib/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
   
  _next: NextFunction,
): void {
  // Zod validation errors -> 422 with field details
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      details[path] = issue.message;
    }
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Unknown errors - log full, return generic
  process.stderr.write(`[ERROR] ${req.method} ${req.originalUrl}\n${err.stack || err.message}\n`);
  const safe = new InternalError();
  res.status(safe.statusCode).json({
    success: false,
    error: { code: safe.code, message: safe.message },
  });
}
