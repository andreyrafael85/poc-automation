import { num, str, type GrailRecord } from '../utils/records';

/**
 * `log.quality` rows, grouped by status and bucket since 3.2.3 (C12: every readable log bucket,
 * not only `default_logs`). Both groupings are bounded by the platform and the query has no row
 * limit, so adding the groups up is exact.
 */

export interface QualityRow extends GrailRecord {
  status: string;
  total: number | null;
  withService: number | null;
  withHost: number | null;
  withK8sNamespace: number | null;
}

/** Per status, the buckets added up: the severity table. Largest first. */
export function toQualityRows(records: readonly GrailRecord[]): QualityRow[] {
  const byStatus = new Map<string, QualityRow>();
  for (const record of records) {
    const status = str(record, 'status') ?? 'Not classified';
    const row = byStatus.get(status) ?? { status, total: 0, withService: 0, withHost: 0, withK8sNamespace: 0 };
    row.total = (row.total ?? 0) + (num(record, 'total') ?? 0);
    row.withService = (row.withService ?? 0) + (num(record, 'withService') ?? 0);
    row.withHost = (row.withHost ?? 0) + (num(record, 'withHost') ?? 0);
    row.withK8sNamespace = (row.withK8sNamespace ?? 0) + (num(record, 'withK8sNamespace') ?? 0);
    byStatus.set(status, row);
  }
  return [...byStatus.values()].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
}

export interface BucketContext {
  bucket: string;
  total: number;
  withService: number;
  withHost: number;
  withK8sNamespace: number;
}

/** Per bucket, the statuses added up: how much context each bucket's logs carry. Empty buckets left out. */
export function toBucketContext(records: readonly GrailRecord[]): BucketContext[] {
  const byBucket = new Map<string, BucketContext>();
  for (const record of records) {
    const bucket = str(record, 'bucket') ?? '—';
    const row = byBucket.get(bucket) ?? { bucket, total: 0, withService: 0, withHost: 0, withK8sNamespace: 0 };
    row.total += num(record, 'total') ?? 0;
    row.withService += num(record, 'withService') ?? 0;
    row.withHost += num(record, 'withHost') ?? 0;
    row.withK8sNamespace += num(record, 'withK8sNamespace') ?? 0;
    byBucket.set(bucket, row);
  }
  return [...byBucket.values()].filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
}
