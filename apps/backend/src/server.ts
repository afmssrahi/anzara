/**
 * Anzara backend entry point.
 * Loads env, creates the Express app, starts the HTTP server, and
 * installs graceful-shutdown signal handlers so in-flight requests are
 * drained before the process exits.
 */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

// Walk up from this file until we find the monorepo root .env. Works for
// both `tsx src/server.ts` and `node dist/server.js`.
function findEnvFile(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 5; i += 1) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const rootEnv = findEnvFile();
if (rootEnv) {
  loadDotenv({ path: rootEnv });
}
loadDotenv({ path: path.resolve(process.cwd(), '.env'), override: true });

async function bootstrap() {
  const { createApp } = await import('./app');
  const { getEnv } = await import('@anzara/config');
  const { logger } = await import('./lib/logger');
  const { prisma } = await import('@anzara/database');

  const env = getEnv();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Backend listening on http://localhost:${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });

  // Real-world server timeouts: a slowloris or a stuck request should not
  // hold a worker forever.
  server.requestTimeout = 30 * 1000; // 30s
  server.headersTimeout = 31 * 1000; // must be > requestTimeout
  server.keepAliveTimeout = 5 * 1000;

  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Received signal, draining connections...');
    // Stop accepting new connections; finish in-flight requests.
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, 'Error during server close');
        process.exit(1);
      }
      try {
        await prisma.$disconnect();
      } catch (disconnectErr) {
        logger.error({ err: disconnectErr }, 'Error disconnecting prisma');
      }
      logger.info('Shutdown complete');
      process.exit(0);
    });
    // Hard kill if drain takes too long.
    setTimeout(() => {
      logger.error('Forcing exit after 10s drain');
      process.exit(1);
    }, 10 * 1000).unref();
  }

  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => void shutdown(sig));
  }

  // Unhandled promise / exception logs and a hard exit so the platform
  // (Render/Fly/Railway) restarts us cleanly.
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled Rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception');
    void shutdown('uncaughtException');
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
