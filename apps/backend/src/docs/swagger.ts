/**
 * swagger-jsdoc setup.
 *
 * - Reads @openapi JSDoc comments from every .ts file under src/.
 * - Merges them with the base spec in openapi.ts.
 * - Returns an Express middleware that serves the UI + the raw JSON.
 *
 * Security notes (audited against VibeSec-Skill):
 *  - The UI + spec are NEVER mounted in production. Gated by `mountSwagger`
 *    in app.ts.
 *  - When SWAGGER_USER + SWAGGER_PASSWORD are set, both endpoints require
 *    HTTP Basic auth (so accidental public exposure on a staging server
 *    doesn't leak the whole schema).
 *  - The spec is small but still IP; we send `Cache-Control: no-store` to
 *    prevent proxies / browsers from caching it.
 *  - Both endpoints are behind `docsRateLimiter` (60/min/IP).
 */
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import swaggerJsdoc, { type SwaggerJsdocOptions } from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express, NextFunction, Request, Response } from 'express';
import { openapiDefinition } from './openapi';
import { docsRateLimiter } from '../middleware/rate-limit';

const isDocsEnabled = (env: { NODE_ENV: string }): boolean => {
  // Only dev + test get the docs UI. Production and unknown envs: no.
  // (If we ever add a 'staging' env that we DO want to expose docs on,
  // add it here — explicitly, not by negative check.)
  return env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
};

// This file is at `apps/backend/src/docs/swagger.ts` so the backend src
// root is `apps/backend/src/`. `__dirname` resolves to `apps/backend/src/docs/`
// at runtime under both `tsx` and compiled CJS, so we can compute the
// src root from the file's own location — no reliance on `process.cwd()`,
// which may be the monorepo root when started via `pnpm --filter ... dev`.
//
// On Windows, the absolute path that `path.resolve` produces has
// backslashes, which glob v10 mis-interprets as escape characters and
// silently returns 0 files. We pass a relative glob with an explicit
// `cwd` instead, which works the same on every platform.
const srcRoot = path.resolve(__dirname, '..').replace(/\\/g, '/');

const options: SwaggerJsdocOptions = {
  definition: openapiDefinition,
  apis: [`${srcRoot}/**/*.ts`, `${srcRoot}/*.ts`],
};

export const openapiSpec = swaggerJsdoc(options);

/**
 * Build a minimal HTTP Basic middleware. The check is constant-time via
 * `timingSafeEqual` so a remote attacker can't time-attack the password.
 *
 * If `user` or `password` is missing, the middleware is a no-op (open
 * access, which is fine in pure local dev).
 */
function basicAuth(user: string | undefined, password: string | undefined) {
  if (!user || !password) {
    return (_req: Request, _res: Response, next: NextFunction): void => next();
  }
  const expectedUser = Buffer.from(user, 'utf8');
  const expectedPass = Buffer.from(password, 'utf8');
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header('authorization');
    if (!header || !header.toLowerCase().startsWith('basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Anzara API docs"');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Docs require HTTP Basic auth' },
      });
      return;
    }
    let decoded: string;
    try {
      decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
    } catch {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid Basic auth header' },
      });
      return;
    }
    const sep = decoded.indexOf(':');
    const providedUser = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const providedPass = sep >= 0 ? decoded.slice(sep + 1) : '';
    const u = Buffer.from(providedUser, 'utf8');
    const p = Buffer.from(providedPass, 'utf8');
    const userOk = u.length === expectedUser.length && timingSafeEqual(u, expectedUser);
    const passOk = p.length === expectedPass.length && timingSafeEqual(p, expectedPass);
    if (!userOk || !passOk) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Anzara API docs"');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid docs credentials' },
      });
      return;
    }
    next();
  };
}

/**
 * Mount the Swagger UI at /api/docs and the raw spec at /api/docs.json.
 *
 * Caller is responsible for the env gate (see app.ts).
 */
export function mountSwagger(app: Express, opts: { user?: string; password?: string } = {}): void {
  const auth = basicAuth(opts.user, opts.password);

  app.get('/api/docs.json', docsRateLimiter, auth, (_req: Request, res: Response) => {
    // The schema is part of the app's intellectual property and may
    // also reveal internal endpoints; tell caches to never store it.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.json(openapiSpec);
  });

  app.use(
    '/api/docs',
    docsRateLimiter,
    auth,
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: 'Anzara API · Swagger UI',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        // Show the "Authorize" button so testers can paste a token if
        // they want; cookies will still be sent by the browser.
        displayRequestDuration: true,
        filter: true, // search/filter bar
        tryItOutEnabled: true,
        // Expand all sections by default; testers usually want to see
        // every operation in every tag.
        docExpansion: 'list',
        // Group by the HTTP method (the tag is the resource).
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    }),
  );
}

export { isDocsEnabled };
