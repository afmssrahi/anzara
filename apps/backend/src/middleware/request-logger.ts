/**
 * Per-request logging middleware.
 * Logs method, URL, status, and duration. Writes directly to stderr so it works
 * even when pino transport (pino-pretty) is unavailable in non-TTY environments.
 */
import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)\n`;
    process.stderr.write(line);
  });
  next();
}
