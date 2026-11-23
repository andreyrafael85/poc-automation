import type { StringKey } from '../../i18n/strings';
import type { CatalogEntry } from '../../queries/types';
import { decimal } from '../../utils/activeLocale';

/**
 * DQL Efficiency Advisor.
 *
 * Statically inspects the app's own catalog queries against the practices that
 * actually drive Grail cost, and cross-references the platform's recorded cost
 * for each query where available.
 *
 * It only ever produces recommendations. It never rewrites a query, and it never
 * changes a bucket, retention setting or pipeline. Rewriting a query on the
 * basis of a heuristic is how a "cost optimisation" silently changes what a
 * number means.
 *
 * Kept free of React so it can be unit tested directly. It is also free of
 * language: an observation carries dictionary keys and params, never a sentence.
 * The panel resolves them with `t()` at render time (see `resolveMessage`), so
 * the same analysis reads in English or Portuguese.
 */

export type Severity = 'ok' | 'advice' | 'attention';

/**
 * A message parameter. Numbers are pre-formatted by the analysis (so they follow
 * the active locale); a `{ key }` is another dictionary entry to translate at
 * render time, for a value that is itself prose (a window label such as
 * "last 7 days").
 */
export type MessageParam = string | number | { readonly key: StringKey };

/** A sentence, as a dictionary key plus the values its `{placeholders}` take. */
export interface Message {
  key: StringKey;
  params?: Readonly<Record<string, MessageParam>>;
}

export interface Observation {
  /** Which practice was checked. */
  check: StringKey;
  severity: Severity;
  /** What was actually found in the query text or its recorded validation. */
  finding: Message;
  /** Suggested change. Never applied automatically. */
  recommendation: Message;
}

export interface QueryAnalysis {
  queryId: string;
  /** `null` when the table this query reads scans no Grail bytes. */
  scansGrail: boolean;
  observations: Observation[];
  /** Count of observations that warrant a look. Not a score. */
  attentionCount: number;
}

/** The shape of `useTranslation().t` / `translate` with a locale applied. */
export type Translate = (key: StringKey, params?: Readonly<Record<string, string | number>>) => string;

/**
 * Turns a `Message` into text with the given translator. Nested `{ key }` params
 * are translated first, so a window label follows the language too.
 */
export function resolveMessage(message: Message, t: Translate): string {
  if (message.params === undefined) return t(message.key);
  const params: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(message.params)) {
    params[name] = typeof value === 'object' ? t(value.key) : value;
  }
  return t(message.key, params);
}

const msg = (key: StringKey, params?: Message['params']): Message => (params === undefined ? { key } : { key, params });

/**
 * A plain number in the active locale, keeping exactly the decimals it has: `25` stays
 * "25" (no grouping), `0.5` reads "0.5" / "0,5".
 */
function plainNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const digits = Math.min(6, (String(value).split('.')[1] ?? '').length);
  return decimal(value, digits);
}

/** Tables that are metadata or entity reads and cost no scanned bytes. */
const ZERO_COST_SOURCES = [
  'dt.entity.',
  'dt.system.buckets',
  'dt.system.data_objects',
  'metric.series',
  'timeseries ',
  'smartscapeNodes',
];

function readsZeroCostSourceOnly(dql: string): boolean {
  const usesZeroCost = ZERO_COST_SOURCES.some((source) => dql.includes(source));
  const usesScannedTable = /fetch\s+(logs|spans|bizevents|events|security\.events|user\.sessions|dt\.davis\.problems|dt\.system\.events)/.test(
    dql,
  );
  return usesZeroCost && !usesScannedTable;
}

/**
 * Note on locale: decimal params (`{gb}`, `{ratio}`, `{limit}`) are formatted here, when
 * the analysis runs. Run it during render (as `AdvisorPanel` does) rather than caching the
 * result across a language switch.
 */
export function analyzeQuery(entry: CatalogEntry): QueryAnalysis {
  const dql = entry.dql;
  const observations: Observation[] = [];
  const scansGrail = !readsZeroCostSourceOnly(dql);

  // --- Timeframe ---------------------------------------------------------
  if (entry.timeframe === 'global') {
    observations.push({
      check: 'f.advisor.chk.timeframe',
      severity: 'ok',
      finding: msg('f.advisor.find.timeframeGlobal'),
      recommendation: msg('f.advisor.rec.timeframeGlobal'),
    });
  } else if ('caller' in entry.timeframe) {
    // TD-08: the reading screen computes the window (an incident's, a screenshot's); the catalog caps it.
    observations.push({
      check: 'f.advisor.chk.timeframe',
      severity: 'ok',
      finding: msg('f.advisor.find.timeframeCaller', {
        label: { key: entry.timeframe.label as StringKey },
        hours: String(Math.round(entry.timeframe.maxMs / 3_600_000)),
      }),
      recommendation: msg('f.advisor.rec.timeframeCaller'),
    });
  } else if ('anchor' in entry.timeframe) {
    observations.push({
      check: 'f.advisor.chk.timeframe',
      severity: 'ok',
      finding: msg('f.advisor.find.timeframeAnchored', { label: { key: entry.timeframe.label as StringKey } }),
      recommendation: msg('f.advisor.rec.timeframeAnchored'),
    });
  } else {
    observations.push({
      check: 'f.advisor.chk.timeframe',
      severity: 'ok',
      finding: msg('f.advisor.find.timeframePinned', {
        window: entry.timeframe.relative,
        // The catalog stores the label as a dictionary key (`timeframe.pinned.7d`).
        label: { key: entry.timeframe.label as StringKey },
      }),
      recommendation: msg('f.advisor.rec.timeframePinned'),
    });
  }

  // --- Bucket scoping ----------------------------------------------------
  const scopesBucket = /bucket\s*:/.test(dql);
  if (scansGrail && !scopesBucket) {
    const readsLogsOrSpans = /fetch\s+(logs|spans)/.test(dql);
    observations.push({
      check: 'f.advisor.chk.bucket',
      severity: readsLogsOrSpans ? 'attention' : 'advice',
      finding: msg('f.advisor.find.bucketNone'),
      recommendation: msg(readsLogsOrSpans ? 'f.advisor.rec.bucketLogs' : 'f.advisor.rec.bucketOther'),
    });
  } else if (scopesBucket) {
    observations.push({
      check: 'f.advisor.chk.bucket',
      severity: 'ok',
      finding: msg('f.advisor.find.bucketScoped'),
      recommendation: msg('f.advisor.rec.noChange'),
    });
  }

  // --- Scan ceiling ------------------------------------------------------
  const limit = entry.guards?.scanLimitGbytes;
  if (scansGrail && limit === undefined) {
    observations.push({
      check: 'f.advisor.chk.ceiling',
      severity: 'attention',
      finding: msg('f.advisor.find.ceilingNone'),
      recommendation: msg('f.advisor.rec.ceilingNone'),
    });
  } else if (limit !== undefined) {
    observations.push({
      check: 'f.advisor.chk.ceiling',
      severity: 'ok',
      finding: msg('f.advisor.find.ceilingSet', { limit: plainNumber(limit) }),
      recommendation: msg('f.advisor.rec.noChange'),
    });
  }

  // --- Early filtering ---------------------------------------------------
  const filterIndex = dql.indexOf('| filter');
  const summarizeIndex = dql.search(/\|\s*(summarize|makeTimeseries)/);
  if (scansGrail) {
    if (filterIndex === -1 && summarizeIndex === -1) {
      observations.push({
        check: 'f.advisor.chk.earlyFilter',
        severity: 'advice',
        finding: msg('f.advisor.find.earlyNone'),
        recommendation: msg('f.advisor.rec.earlyNone'),
      });
    } else if (filterIndex !== -1 && summarizeIndex !== -1 && filterIndex > summarizeIndex) {
      observations.push({
        check: 'f.advisor.chk.earlyFilter',
        severity: 'attention',
        finding: msg('f.advisor.find.earlyAfter'),
        recommendation: msg('f.advisor.rec.earlyAfter'),
      });
    } else {
      observations.push({
        check: 'f.advisor.chk.earlyFilter',
        severity: 'ok',
        finding: msg('f.advisor.find.earlyOk'),
        recommendation: msg('f.advisor.rec.noChange'),
      });
    }
  }

  // --- String transformation in filters ---------------------------------
  if (/filter[^|]*\b(lower|upper|toString)\s*\(/.test(dql)) {
    observations.push({
      check: 'f.advisor.chk.filterEff',
      severity: 'attention',
      finding: msg('f.advisor.find.filterFn'),
      recommendation: msg('f.advisor.rec.filterFn'),
    });
  }

  // --- Field projection --------------------------------------------------
  const projectsFields = /\|\s*(fields|fieldsKeep|fieldsRemove)\b/.test(dql);
  const aggregates = summarizeIndex !== -1;
  if (!projectsFields && !aggregates) {
    observations.push({
      check: 'f.advisor.chk.projection',
      severity: 'advice',
      finding: msg('f.advisor.find.projectNone'),
      recommendation: msg('f.advisor.rec.projectNone'),
    });
  } else {
    observations.push({
      check: 'f.advisor.chk.projection',
      severity: 'ok',
      finding: msg(aggregates ? 'f.advisor.find.projectAgg' : 'f.advisor.find.projectList'),
      recommendation: msg('f.advisor.rec.noChange'),
    });
  }

  // --- Sort placement ----------------------------------------------------
  const sortIndex = dql.lastIndexOf('| sort');
  if (sortIndex !== -1 && summarizeIndex !== -1 && sortIndex < summarizeIndex) {
    observations.push({
      check: 'f.advisor.chk.sort',
      severity: 'attention',
      finding: msg('f.advisor.find.sortBefore'),
      recommendation: msg('f.advisor.rec.sortBefore'),
    });
  }

  // --- limit before aggregation -----------------------------------------
  const limitIndex = dql.indexOf('| limit');
  if (limitIndex !== -1 && summarizeIndex !== -1 && limitIndex < summarizeIndex) {
    observations.push({
      check: 'f.advisor.chk.truncation',
      severity: 'attention',
      finding: msg('f.advisor.find.limitBefore'),
      recommendation: msg('f.advisor.rec.limitBefore'),
    });
  }

  // --- Joins and lookups -------------------------------------------------
  if (/\|\s*(join|lookup)\b/.test(dql)) {
    observations.push({
      check: 'f.advisor.chk.joins',
      severity: 'advice',
      finding: msg('f.advisor.find.joinsUsed'),
      recommendation: msg('f.advisor.rec.joins'),
    });
  } else {
    observations.push({
      check: 'f.advisor.chk.joins',
      severity: 'ok',
      finding: msg('f.advisor.find.joinsNone'),
      recommendation: msg('f.advisor.rec.noChange'),
    });
  }

  // --- Recorded cost -----------------------------------------------------
  const scanned = entry.validation.scannedBytesOnDemand;
  if (scanned !== null && scanned > 100_000_000) {
    observations.push({
      check: 'f.advisor.chk.cost',
      severity: 'attention',
      finding: msg('f.advisor.find.costHigh', { gb: decimal(scanned / 1_000_000_000, 2) }),
      recommendation: msg('f.advisor.rec.costHigh'),
    });
  } else if (scanned === 0) {
    observations.push({
      check: 'f.advisor.chk.cost',
      severity: 'ok',
      finding: msg('f.advisor.find.costZero'),
      recommendation: msg('f.advisor.rec.costZero'),
    });
  }

  // --- Result reuse ------------------------------------------------------
  observations.push({
    check: 'f.advisor.chk.reuse',
    severity: 'ok',
    finding: msg('f.advisor.find.reuse'),
    recommendation: msg('f.advisor.rec.reuse'),
  });

  return {
    queryId: entry.id,
    scansGrail,
    observations,
    attentionCount: observations.filter((observation) => observation.severity === 'attention').length,
  };
}

export function analyzeCatalog(entries: readonly CatalogEntry[]): QueryAnalysis[] {
  return entries.map(analyzeQuery).sort((a, b) => b.attentionCount - a.attentionCount);
}
