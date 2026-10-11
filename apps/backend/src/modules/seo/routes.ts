/**
 * SEO module - public route definitions.
 *
 * Mounted at the API root (not under /api), so the paths are
 * /sitemap.xml and /robots.txt directly. This is what search
 * engines and crawlers expect.
 */
import { Router, type Request, Response } from 'express';
import { getEnv } from '@anzara/config';
import { seoService, sendRobots, sendSitemap } from './service';

export const seoRouter: Router = Router();

seoRouter.get('/sitemap.xml', async (_req: Request, res: Response) => {
  const env = getEnv();
  const baseUrl = env.APP_URL || `http://localhost:${env.PORT}`;
  const { xml, lastModified } = await seoService.buildSitemap(baseUrl);
  sendSitemap(res, xml, lastModified);
});

seoRouter.get('/robots.txt', (_req: Request, res: Response) => {
  const env = getEnv();
  const baseUrl = env.APP_URL || `http://localhost:${env.PORT}`;
  // Disallow admin paths in production. In dev, allow everything.
  const disallowAdmin = env.NODE_ENV === 'production';
  sendRobots(res, seoService.buildRobots(baseUrl, { disallowAdmin }));
});
