/**
 * Error reporting contract.
 *
 * Today: PinoJsonReporter - structured JSON to stdout, which the host can
 * ship to wherever it wants (CloudWatch, Loki, Datadog free tier, etc).
 * That's free and works on any host.
 *
 * To add Sentry (or Bugsnag / Rollbar / Highlight):
 *   1. Create `apps/backend/src/modules/error-reporting/<name>-provider.ts`.
 *   2. Implement `ErrorReporter` with the same `capture()` signature.
 *   3. Add a case in `./factory.ts` keyed off the relevant env var.
 *   4. Wire `capture()` into `errorHandler()` in `middleware/error-handler.ts`.
 *
 * Until then, the rest of the app just calls `captureError(err, context)`.
 */
export interface ErrorContext {
  /** Request id (matches the X-Request-Id header). */
  requestId?: string;
  /** HTTP method + path of the request, when available. */
  request?: string;
  /** User id (admin or customer) if authenticated. */
  userId?: string;
  /** Anything else useful for triage. */
  extra?: Record<string, unknown>;
  /** Severity. */
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
}

export interface ErrorReporter {
  readonly name: 'pino' | 'sentry' | string;
  capture(error: Error, context?: ErrorContext): void;
}
