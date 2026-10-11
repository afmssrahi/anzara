/**
 * Anzara backend entry point.
 * Loads env, creates the Express app, and starts the HTTP server.
 */
import 'dotenv/config';

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
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
