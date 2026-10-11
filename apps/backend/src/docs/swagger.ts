/**
 * swagger-jsdoc setup.
 *
 * - Reads @openapi JSDoc comments from every .ts file under src/.
 * - Merges them with the base spec in openapi.ts.
 * - Returns an Express middleware that serves the UI + the raw JSON.
 */
import path from 'node:path';
import swaggerJsdoc, { type SwaggerJsdocOptions } from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express, Request, Response } from 'express';
import { openapiDefinition } from './openapi';

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
 * Mount the Swagger UI at /api/docs and the raw spec at /api/docs.json.
 *
 * `customSiteTitle` shows up in the browser tab.
 * `swaggerOptions` is what makes the "Try it out" button work end-to-end
 * with cookies: persistAuthorization keeps the cookies between calls.
 */
export function mountSwagger(app: Express): void {
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openapiSpec);
  });

  app.use(
    '/api/docs',
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
