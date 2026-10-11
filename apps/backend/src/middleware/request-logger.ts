/**
 * Per-request logging middleware.
 * Includes the request id, method, status, and duration. The path is
 * always the raw URL (not parsed) so any sensitive query params stay
 * opaque — we never log full query strings.
 *
 * Writes to stderr so it works without pino-pretty in non-TTY envs.
 */
import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const requestId = (req as Request & { requestId?: string }).requestId ?? '-';
    // Only log the path, never the full query (no token leak).
    const line =
      `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path} ` +
      `-> ${res.statusCode} (${duration}ms)\n`;
    process.stderr.write(line);
  });
  next();
}
