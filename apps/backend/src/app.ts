/**
 * Express app factory.
 * Composed of middleware and mounted module routes.
 * Kept small — every feature lives in its own module under src/modules/.
 */
import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { getEnv } from '@anzara/config';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { apiRouter } from './routes';

export function createApp(): Express {
  const env = getEnv();
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: [env.APP_URL, env.ADMIN_URL],
      credentials: true,
    }),
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Static assets (local provider). Switch ASSET_PROVIDER=cloudinary to disable.
  const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use(
    '/uploads',
    express.static(uploadRoot, {
      maxAge: '7d',
      immutable: false,
    }),
  );

  // Request logging
  app.use(requestLogger);

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount all module routes
  app.use('/api', apiRouter);

  // 404
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
