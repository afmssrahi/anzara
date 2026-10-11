/**
 * SEO module - sitemap + robots generation.
 *
 * Public, unauthenticated. Cacheable: includes a Last-Modified header
 * derived from the most-recently-updated row so CDNs and search
 * engines can do conditional GETs.
 */
import type { Response } from 'express';
import { seoRepository } from './repository';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number; // 0.0 - 1.0
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrlEntry(u: SitemapUrl): string {
  const parts = [`  <url>`, `    <loc>${xmlEscape(u.loc)}</loc>`];
  if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
  if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
  if (u.priority !== undefined) parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
  parts.push(`  </url>`);
  return parts.join('\n');
}

export const seoService = {
  async buildSitemap(baseUrl: string): Promise<{ xml: string; lastModified: Date }> {
    const [products, categories, collections, pages] = await Promise.all([
      seoRepository.listPublishedProducts(),
      seoRepository.listActiveCategories(),
      seoRepository.listActiveCollections(),
      seoRepository.listPublishedPages(),
    ]);

    const urls: SitemapUrl[] = [];
    let latest = new Date(0);

    // Static routes
    urls.push({ loc: `${baseUrl}/`, changefreq: 'daily', priority: 1.0 });
    urls.push({ loc: `${baseUrl}/products`, changefreq: 'daily', priority: 0.9 });
    urls.push({ loc: `${baseUrl}/categories`, changefreq: 'weekly', priority: 0.7 });
    urls.push({ loc: `${baseUrl}/collections`, changefreq: 'weekly', priority: 0.7 });
    // Pages: about, terms, privacy, etc. — already under /pages/<slug>
    for (const p of pages) {
      const dt = new Date(p.updatedAt);
      if (dt > latest) latest = dt;
      urls.push({
        loc: `${baseUrl}/pages/${p.slug}`,
        lastmod: dt.toISOString(),
        changefreq: 'monthly',
        priority: 0.4,
      });
    }

    for (const c of categories) {
      const dt = new Date(c.updatedAt);
      if (dt > latest) latest = dt;
      urls.push({
        loc: `${baseUrl}/categories/${c.slug}`,
        lastmod: dt.toISOString(),
        changefreq: 'weekly',
        priority: 0.7,
      });
    }

    for (const c of collections) {
      const dt = new Date(c.updatedAt);
      if (dt > latest) latest = dt;
      urls.push({
        loc: `${baseUrl}/collections/${c.slug}`,
        lastmod: dt.toISOString(),
        changefreq: 'weekly',
        priority: 0.6,
      });
    }

    for (const p of products) {
      const dt = new Date(p.updatedAt);
      if (dt > latest) latest = dt;
      urls.push({
        loc: `${baseUrl}/products/${p.slug}`,
        lastmod: dt.toISOString(),
        // Featured products change more often; weekly is a safe default.
        changefreq: p.isFeatured ? 'weekly' : 'weekly',
        priority: p.isFeatured ? 0.8 : 0.6,
      });
    }

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urls.map(buildUrlEntry),
      `</urlset>`,
    ].join('\n');

    return { xml, lastModified: latest };
  },

  buildRobots(baseUrl: string, opts: { disallowAdmin: boolean }): string {
    const lines = ['User-agent: *'];
    if (opts.disallowAdmin) {
      lines.push('Disallow: /admin/');
      lines.push('Disallow: /api/');
      lines.push('Disallow: /dashboard/');
    }
    // Allow public assets and uploads
    lines.push('Allow: /uploads/');
    lines.push('');
    lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
    return lines.join('\n');
  },
};

export function sendSitemap(res: Response, xml: string, lastModified: Date): void {
  if (lastModified.getTime() > 0) {
    res.setHeader('Last-Modified', lastModified.toUTCString());
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.status(200).send(xml);
}

export function sendRobots(res: Response, body: string): void {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(body);
}
