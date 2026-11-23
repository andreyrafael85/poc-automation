/**
 * Helpers shared by the synthetic fixtures.
 *
 * Everything here is deterministic: a seeded PRNG, and timestamps derived from
 * `Date.now()` (which the capture script freezes with Playwright's clock, so two
 * runs produce byte-identical data).
 *
 * DEV-ONLY. Nothing in this directory is imported by the shipped app.
 */

/** Small, fast, seedable PRNG (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rand {
  constructor(seed) {
    this.next = mulberry32(seed);
  }
  float(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }
  int(min, max) {
    return Math.floor(this.float(min, max + 1));
  }
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
  chance(p) {
    return this.next() < p;
  }
  /** Approximately normal (Irwin-Hall), mean 0, sd 1. */
  gauss() {
    let s = 0;
    for (let i = 0; i < 6; i += 1) s += this.next();
    return (s - 3) / 0.7071;
  }
}

export const SEC = 1_000;
export const MIN = 60 * SEC;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
/** Milliseconds -> nanoseconds, the unit Grail uses for durations. */
export const ns = (ms) => Math.round(ms * 1_000_000);

export const nowMs = () => Date.now();
export const isoAgo = (msAgo) => new Date(nowMs() - msAgo).toISOString();

const hex16 = (n) => n.toString(16).toUpperCase().padStart(16, '0');

/** Obviously synthetic entity id, e.g. HOST-000000000000A00F. Never a real tenant id. */
export const entityId = (type, n) => `${type}-${hex16(0xa000 + n)}`;

export const pad2 = (n) => String(n).padStart(2, '0');

/** Throws at load time if a "very long name" fixture is not actually long. */
export function assertLong(name, min = 80) {
  if (name.length < min || /\s/.test(name)) {
    throw new Error(`fixture name must be >= ${min} chars with no spaces: "${name}" (${name.length})`);
  }
  return name;
}

// ---------------------------------------------------------------------------
// Result envelopes (mirror what the real useDql hook returns as `data`).
// ---------------------------------------------------------------------------

const typeOf = (value) => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'double';
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value) ? 'timestamp' : 'string';
  if (typeof value === 'object') return 'record';
  return 'string';
};

function inferMappings(records) {
  const mappings = {};
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (mappings[key] !== undefined) continue;
      const type = typeOf(value);
      if (type !== undefined) mappings[key] = { type };
    }
  }
  return mappings;
}

const grailMetadata = (extra = {}) => ({
  grail: {
    queryId: 'pvs-harness-0000',
    canonicalQuery: '',
    executionTimeMilliseconds: 12,
    scannedRecords: 0,
    scannedBytes: 0,
    scannedDataPoints: 0,
    analysisTimeframe: { startTime: isoAgo(DAY), endTime: isoAgo(0) },
    locale: 'en',
    timezone: 'UTC',
    ...extra,
  },
});

/** A table result: `{ records, types, metadata }`. */
export function table(records, grailExtra) {
  return {
    records,
    types: [{ indexRange: [0, Math.max(records.length - 1, 0)], mappings: inferMappings(records) }],
    metadata: grailMetadata(grailExtra),
  };
}

/**
 * A timeseries result, shaped exactly as Grail returns `timeseries` output and
 * as `convertQueryResultToTimeseries` expects: one record per series with
 * `timeframe`, `interval` (duration, ns as a string) and one array per metric.
 *
 * @param {object} spec
 * @param {number} spec.points      number of buckets
 * @param {number} spec.intervalMs  bucket width
 * @param {{dims?: Record<string,string>, values: Record<string,(number|null)[]>}[]} spec.series
 * @param {{fieldName: string, unit?: string, key?: string}[]} [spec.metrics]
 */
export function timeseries({ points, intervalMs, series, metrics = [] }) {
  const end = nowMs();
  const start = end - points * intervalMs;
  const timeframe = { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
  const records = series.map((entry) => ({
    ...(entry.dims ?? {}),
    timeframe,
    interval: String(ns(intervalMs)),
    ...entry.values,
  }));
  const first = series[0];
  const mappings = {
    ...Object.fromEntries(Object.keys(first?.dims ?? {}).map((key) => [key, { type: 'string' }])),
    timeframe: { type: 'timeframe' },
    interval: { type: 'duration' },
    ...Object.fromEntries(
      Object.keys(first?.values ?? {}).map((key) => [
        key,
        { type: 'array', types: [{ indexRange: [0, points - 1], mappings: { element: { type: 'double' } } }] },
      ]),
    ),
  };
  return {
    records,
    types: [{ indexRange: [0, Math.max(records.length - 1, 0)], mappings }],
    metadata: {
      ...grailMetadata(),
      metrics: metrics.map((metric) => ({
        'metric.key': metric.key ?? metric.fieldName,
        fieldName: metric.fieldName,
        unit: metric.unit ?? 'Unspecified',
        displayName: metric.fieldName,
      })),
    },
  };
}
