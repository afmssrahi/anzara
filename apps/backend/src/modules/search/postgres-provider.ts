/**
 * Postgres search provider.
 *
 * Free, in-process, zero setup. Combines:
 *   1. Slug ILIKE (case-insensitive contains) on `Product.slug`.
 *   2. Tag array match (case-sensitive and lowercased) on `Product.tags`.
 *
 * Sufficient up to a few thousand SKUs. When the catalog outgrows this
 * (slow listings, fuzzy / typo tolerance, multi-language relevance), swap
 * to Meilisearch via the factory.
 *
 * Note: `Product.name` is a `Json` field. Prisma can't ILIKE on a Json
 * column, and raw SQL would defeat the point of a swappable provider. So
 * a multi-language relevance rank lives in the future Meilisearch adapter
 * where it's actually supported.
 */
import type { Prisma } from '@prisma/client';
import type { SearchProductHit, SearchProvider } from './provider';

const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 64;

function normalize(raw: string): string {
  return raw.trim().slice(0, MAX_QUERY_LEN);
}

export class PostgresSearchProvider implements SearchProvider {
  readonly name = 'postgres' as const;

  searchProducts(query: string): SearchProductHit | null {
    const term = normalize(query);
    if (term.length < MIN_QUERY_LEN) return null;

    const where: Prisma.ProductWhereInput = {
      OR: [
        { slug: { contains: term, mode: 'insensitive' } },
        { tags: { has: term } },
        { tags: { has: term.toLowerCase() } },
      ],
    };

    return { id: '', slug: '', where };
  }
}
