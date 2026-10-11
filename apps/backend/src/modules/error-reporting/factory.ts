/**
 * Resolves the active error reporter. Today: Pino. Future: Sentry.
 *
 * To swap in Sentry:
 *   1. Create `sentry-provider.ts` that lazy-imports `@sentry/node`.
 *   2. Add a case here keyed off SENTRY_DSN.
 *   3. The error handler in `middleware/error-handler.ts` calls
 *      `captureError(err, ctx)` - it doesn't care which reporter wins.
 */
import type { ErrorReporter } from './provider';
import { PinoErrorReporter } from './pino-provider';

let cached: ErrorReporter | null = null;

export function getErrorReporter(): ErrorReporter {
  if (cached) return cached;
  cached = new PinoErrorReporter();
  return cached;
}

/** Convenience used by the error handler. */
export function captureError(
  error: Error,
  context?: Parameters<ErrorReporter['capture']>[1],
): void {
  try {
    getErrorReporter().capture(error, context);
  } catch {
    // The reporter itself must never crash the request.
  }
}

/** Test-only: reset the cached singleton. */
export function resetErrorReporter(): void {
  cached = null;
}
