/**
 * Small request helpers. Express types `req.params` keys as string | string[] | undefined;
 * this coerces the common case of a single value.
 */
import type { Request } from 'express';

export function param(req: Request, name: string): string {
  const v = req.params[name];
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export function paramOrUndefined(req: Request, name: string): string | undefined {
  const v = req.params[name];
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}
