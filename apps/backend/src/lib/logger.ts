/**
 * Centralized logger using pino.
 * Pretty-prints in development, JSON in production.
 */
import pino from 'pino';
import { getEnv } from '@anzara/config';

const env = getEnv();

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
