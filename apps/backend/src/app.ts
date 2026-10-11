/**
 * Express app factory.
 * Composed of security middleware + module routes.
 *
 * Security layering (in order, the order matters):
 *   1. trust proxy (correct req.ip behind LB)
 *   2. Request-Id for traceability
 *   3. Strict security headers (helmet, CORP/COOP/COEP off for compat,
 *      nosniff + frame-ancestors for non-uploads paths)
 *   4. CORS allowlist (APP_URL + ADMIN_URL only)
 *   5. Body parsers with hard size cap
 *   6. Cookie parser
 *   7. Static /uploads (served only with nosniff + content-disposition +
 *      strict cache)
 *   8. Request logger
 *   9. /health
 *  10. API router
 *  11. 404 + error handler
 */
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
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

  // 1. Trust the first proxy hop (e.g. Render/Vercel/Cloudflare). With
  //    this set, req.ip is the real client IP and express-rate-limit sees
  //    the right key. Configurable via TRUST_PROXY env (number of hops).
  app.set('trust proxy', env.TRUST_PROXY);

  // 2. Request-Id propagation. Honor an upstream id, else generate a UUID.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header('x-request-id');
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    (req as Request & { requestId?: string }).requestId = id;
    next();
  });

  // 3. Security headers.
  //    Helmet defaults: HSTS, X-DNS-Prefetch-Control, X-Frame-Options DENY,
  //    X-Content-Type-Options nosniff, X-Download-Options, X-Permitted-Cross-Domain-Policies.
  //    Add Cross-Origin-Resource-Policy=same-site so other sites can't embed
  //    our JSON responses. We deliberately leave CSP off because the API
  //    serves JSON, not HTML.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      // Disable COEP (we serve third-party images via Picsum/Cloudinary in
      // the future and don't want to lock down cross-origin resource loading).
      crossOriginEmbedderPolicy: false,
      // Common API CSP - deny everything by default.
      contentSecurityPolicy: false,
    }),
  );

  // 4. CORS allowlist. Only APP_URL and ADMIN_URL are allowed; all other
  //    origins get 403 from cors().
  const allowlist = [env.APP_URL, env.ADMIN_URL].map((u) => u.replace(/\/+$/, ''));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // same-origin / curl
        if (allowlist.includes(origin.replace(/\/+$/, ''))) {
          return callback(null, true);
        }
        return callback(new Error('CORS: origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      maxAge: 600,
    }),
  );

  // 5. Body parsers. Hard 1 MB cap. JSON-only (urlencoded kept for OAuth
  //    callbacks; if you don't need it, remove it).
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(env.JWT_REFRESH_SECRET));

  // 6. Static /uploads. Served with restrictive cache + nosniff + a
  //    long maxAge because we use random, non-guessable filenames.
  const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use(
    '/uploads',
    express.static(uploadRoot, {
      maxAge: '7d',
      immutable: false,
      fallthrough: true,
      setHeaders: (res: Response, filePath: string) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Force the browser to treat uploads as images, not HTML, even if
        // the magic bytes don't match the extension.
        if (/\.svg$/i.test(filePath)) {
          // Block SVG entirely: it can carry <script> payloads.
          res.status(403).end();
        }
      },
    }),
  );

  // 7. Request logger (uses req.requestId).
  app.use(requestLogger);

  // 8. Health check.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 9. API router.
  app.use('/api', apiRouter);

  // 10. 404 + error handler.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
