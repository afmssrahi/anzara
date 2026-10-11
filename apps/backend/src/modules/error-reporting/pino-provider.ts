/**
 * Pino-backed error reporter. The default. Free, no third-party SDK.
 */
import { logger } from '../../lib/logger';
import type { ErrorContext, ErrorReporter } from './provider';

type PinoLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_MAP: Record<NonNullable<ErrorContext['level']>, PinoLevel> = {
  debug: 'debug',
  info: 'info',
  warning: 'warn',
  error: 'error',
  fatal: 'fatal',
};

export class PinoErrorReporter implements ErrorReporter {
  readonly name = 'pino' as const;

  capture(error: Error, context: ErrorContext = {}): void {
    const pinoLevel: PinoLevel = LEVEL_MAP[context.level ?? 'error'];
    const payload = {
      requestId: context.requestId,
      request: context.request,
      userId: context.userId,
      ...(context.extra ?? {}),
    };
    logger[pinoLevel]({ err: error, ...payload }, error.message);
  }
}
