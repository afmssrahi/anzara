/**
 * Anzara backend entry point.
 * Loads env, creates the Express app, and starts the HTTP server.
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

  const env = getEnv();
  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`Backend listening on http://localhost:${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
