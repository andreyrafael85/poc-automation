import type { CatalogEntry } from '../../queries/types';

/**
 * 3.7.6 (the owner: "se está totalmente aderente às melhores práticas de dados, DQLs da Dynatrace"): how the app's own
 * queries follow the platform's query practices, counted from the catalog itself — every read the app makes is an entry of
 * it (rule 9, enforced by the tests), so these counts describe the app as it is, not a claim about it. Pure.
 */
export type PracticeKey = 'catalog' | 'scanCeiling' | 'recordLimit' | 'logsBounded' | 'metricsFirst' | 'measured' | 'zeroScan' | 'parameterised';

export interface PracticeRow {
  key: PracticeKey;
  /** Entries that follow the practice. */
  met: number;
  /** Entries the practice applies to. */
  of: number;
}

const readsLogs = (entry: CatalogEntry) => /\bfetch\s+logs\b/.test(entry.dql);
const readsMetrics = (entry: CatalogEntry) => /^\s*(timeseries|metrics)\b/.test(entry.dql);

/** A log read is bounded when it is sampled, pinned to a short window, or read in a window the caller fixes. */
function logBounded(entry: CatalogEntry): boolean {
  if (/samplingRatio/.test(entry.dql)) return true;
  const tf = entry.timeframe;
  if (typeof tf === 'object' && 'relative' in tf) return /now-(\d+m|[1-9]h|1\dh|2[0-4]h)$/.test(tf.relative);
  if (typeof tf === 'object' && 'caller' in tf) return true;
  return entry.guards?.scanLimitGbytes !== undefined && entry.guards.scanLimitGbytes <= 20;
}

export function queryPractices(entries: readonly CatalogEntry[]): PracticeRow[] {
  const all = entries.length;
  const logs = entries.filter(readsLogs);
  // A ceiling matters on a read that scans Grail data; a read measured at 0 bytes (entities, metrics) needs none.
  const scanning = entries.filter((entry) => entry.validation.scannedBytesOnDemand !== 0);
  return [
    { key: 'catalog', met: all, of: all },
    { key: 'scanCeiling', met: scanning.filter((entry) => entry.guards?.scanLimitGbytes !== undefined).length, of: scanning.length },
    { key: 'recordLimit', met: entries.filter((entry) => entry.guards?.maxResultRecords !== undefined).length, of: all },
    { key: 'logsBounded', met: logs.filter(logBounded).length, of: logs.length },
    { key: 'metricsFirst', met: entries.filter(readsMetrics).length, of: all },
    { key: 'measured', met: entries.filter((entry) => entry.validation.scannedBytesOnDemand !== null).length, of: all },
    { key: 'zeroScan', met: entries.filter((entry) => entry.validation.scannedBytesOnDemand === 0).length, of: all },
    { key: 'parameterised', met: entries.filter((entry) => entry.params !== undefined).length, of: all },
  ];
}

export interface AppBillingRow {
  app: string;
  kind: string;
  queries: number;
  bytes: number;
}

/** The billed query consumption of the app's ids, the current install apart (a missing figure is 0 only when the read answered). */
export function appBilling(rows: readonly AppBillingRow[], currentAppId: string): { totalBytes: number; currentBytes: number; earlierBytes: number; queries: number } {
  const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
  const currentBytes = rows.filter((row) => row.app === currentAppId).reduce((sum, row) => sum + row.bytes, 0);
  return { totalBytes, currentBytes, earlierBytes: totalBytes - currentBytes, queries: rows.reduce((sum, row) => sum + row.queries, 0) };
}
