/**
 * Search provider contract.
 *
 * Right now there is exactly one impl: PostgresSearchProvider. It is enough
 * for the small catalog (a few thousand SKUs) and ships with zero extra
 * process. When the catalog grows past what ILIKE is comfortable with, drop
 * in Meilisearch (or Algolia / Typesense / Elastic) by:
 *
 *   1. Create `apps/backend/src/modules/search/<name>-provider.ts`.
 *   2. Implement `SearchProvider` with the same `searchProducts()` shape.
 *   3. Add a case in `./factory.ts` that keys off env.
 *   4. The products module's `searchProducts()` is the only call site.
 *
 * No controller, no UI code, and no schema needs to change.
 */
import type { Prisma } from '@prisma/client';

export interface SearchProductHit {
  id: string;
  slug: string;
  score?: number;
  /** The Prisma where fragment to combine with the caller's existing filters. */
  where: Prisma.ProductWhereInput;
}

export interface SearchProvider {
  readonly name: 'postgres' | 'meilisearch' | string;
  /**
   * Build a `where` fragment for a free-text search term.
   * Empty / short queries should return an empty fragment (no constraint).
   * The result is merged into the caller's `where` via `{ AND: [callerWhere, searchWhere] }`
   * so existing filters (category, price, inStock, ...) keep working.
   */
  searchProducts(query: string): SearchProductHit | null;
}
