import type { CatalogEntry } from './types';

/**
 * The most rows a catalog query can return: the `| limit N` that ends its DQL or its
 * `maxResultRecords` guard, whichever is smaller. `null` when neither bounds it.
 *
 * A result that has reached its cap stopped there, so the rows are not the whole answer. The
 * app never sums such a list for a total (headline figures come from aggregate queries); this
 * is what lets a table say "top N, more exist" instead of looking complete.
 */
export function resultCap(entry: Pick<CatalogEntry, 'dql' | 'guards'>): number | null {
  const limit = /\|\s*limit\s+(\d+)\s*$/.exec(entry.dql.trim());
  const caps = [limit === null ? null : Number(limit[1]), entry.guards?.maxResultRecords ?? null].filter(
    (cap): cap is number => cap !== null,
  );
  return caps.length === 0 ? null : Math.min(...caps);
}

/** True when `rows` filled the query's cap, so more rows may exist than were returned. */
export function isCapped(entry: Pick<CatalogEntry, 'dql' | 'guards'>, rows: number): boolean {
  const cap = resultCap(entry);
  return cap !== null && rows >= cap;
}
