/**
 * Request validation middleware.
 * Validates body, query, or params against a Zod schema.
 * On failure, the resulting ZodError is caught by the error handler.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace with the parsed (and possibly transformed) value
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}
