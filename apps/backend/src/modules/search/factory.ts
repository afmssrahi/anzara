/**
 * Resolves the active search provider.
 *
 * Today: PostgresSearchProvider (free, in-process). When the catalog grows
 * or we need typo tolerance / multi-language relevance:
 *   1. Create `meilisearch-provider.ts` implementing `SearchProvider`.
 *   2. Add a case below keyed off `MEILISEARCH_HOST`.
 *   3. Mirror products into Meili on create / update / delete.
 *
 * No controller, UI, or Prisma query needs to change.
 */
import type { SearchProvider } from './provider';
import { PostgresSearchProvider } from './postgres-provider';

let cached: SearchProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (cached) return cached;
  // Future: switch on env.MEILISEARCH_HOST to return a Meilisearch provider.
  cached = new PostgresSearchProvider();
  return cached;
}

/** Test-only: reset the cached singleton. */
export function resetSearchProvider(): void {
  cached = null;
}
