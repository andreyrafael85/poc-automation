import { useEffect, useMemo } from 'react';
import { useDql, type DqlQueryParams, type TypedQueryResult } from '@dynatrace-sdk/react-hooks';
import { isErrorEnvelopeError } from '@dynatrace-sdk/client-query';

import { getQuery, type CatalogId } from '../queries/catalog';
import { readQuality, type GrailReadQuality } from '../queries/grailMetadata';
import { paramsKey, renderCatalogDql, type ParamRefusal } from '../queries/params';
import type { CatalogEntry, CatalogParamValues } from '../queries/types';
import type { PocWindows } from '../models/pocPlan';
import type { EvidenceRef, Provenance } from '../models/provenance';
import type { GrailRecord } from '../utils/records';
import { recordRead } from '../features/consumption/sessionMeter';
import { resolveRelative, type ResolvedTimeframe } from '../utils/time';

/**
 * The only way this app reads Grail.
 *
 * Responsibilities that would otherwise be duplicated across every page:
 *   - resolves the timeframe policy (global window, a pinned window, or the caller's window)
 *   - renders a parameterised entry (TD-08): the values are validated and quoted by
 *     `queries/params.ts`, and a refused value runs nothing (outcome `refused`)
 *   - applies the entry's cost guards as request fields, never as DQL text
 *   - classifies failures, so "you lack a scope" never renders as "no data"
 *   - emits the `EvidenceRef` that every displayed fact must carry
 *
 * ## Stability matters here
 *
 * Every value that feeds the query request is memoised. `useDql` derives its
 * cache key from the request, so a request object rebuilt with fresh timestamps
 * on each render would refetch forever and never leave the loading state. The
 * absolute window arrives pre-resolved from `StudioContext`; pinned windows are
 * resolved here but only when `refreshToken` changes.
 */

/** Why a query produced nothing. Drives which empty state is rendered. */
export type QueryOutcome =
  | 'loading'
  | 'ok'
  | 'empty'
  | 'no-permission'
  | 'scan-limit'
  | 'error'
  /** TD-08: a parameter or the caller's window failed validation, so no query was sent. */
  | 'refused';

export interface CatalogQueryResult {
  entry: CatalogEntry;
  records: GrailRecord[];
  /**
   * The untouched query result. Only chart adapters need this, because
   * `convertQueryResultToTimeseries` requires the field types alongside records.
   */
  raw: TypedQueryResult | undefined;
  outcome: QueryOutcome;
  /** Provenance implied by the outcome. Pages pass this straight into facts. */
  provenance: Provenance;
  evidence: EvidenceRef;
  timeframe: ResolvedTimeframe;
  /** Scopes the platform itself said were missing. Empty unless denied. */
  missingScopes: readonly string[];
  /** What the platform reported about completeness (scan ceiling, truncation, sampling, bytes). */
  quality: GrailReadQuality;
  errorMessage: string | null;
  isLoading: boolean;
  refetch: () => void;
  /**
   * TD-08: the text actually sent (the entry's `dql`, or its template rendered with the validated
   * values); null when a value was refused. Optional so hand-made results in tests stay valid.
   */
  dql?: string | null;
  /** TD-08: why the query was refused; null when it was not. */
  refusal?: ParamRefusal | null;
}

interface ErrorLike {
  body?: { error?: { missingScopes?: string[]; errorType?: string; errorMessage?: string } };
  message?: string;
}

/** Extracts the scopes the platform reported as missing, if any. */
function readMissingScopes(error: unknown): string[] {
  if (!error) return [];
  if (isErrorEnvelopeError(error)) {
    const scopes = (error as unknown as ErrorLike).body?.error?.missingScopes;
    if (Array.isArray(scopes)) return scopes;
  }
  return [];
}

function isPermissionDenied(error: unknown, missingScopes: readonly string[]): boolean {
  if (missingScopes.length > 0) return true;
  const candidate = error as ErrorLike | null;
  const errorType = candidate?.body?.error?.errorType ?? '';
  if (errorType === 'NOT_AUTHORIZED_FOR_TABLE') return true;
  const message = candidate?.message ?? '';
  return /Missing OAuth scope|NOT_AUTHORIZED|Access Denied/i.test(message);
}

/**
 * When this app first held each result.
 *
 * `useDql` does not say when a result arrived, and the end of the analysis window is not that
 * moment (a "last 24 h" window ends when the page opened, not when Grail answered). Every fetch
 * returns a new result object, so the first time one is seen is when it was read; a cached
 * result seen again keeps its original time instead of being stamped afresh on every render.
 */
const firstSeen = new WeakMap<object, string>();

function readAt(data: object | undefined): string | undefined {
  if (data === undefined) return undefined;
  let at = firstSeen.get(data);
  if (at === undefined) {
    at = new Date().toISOString();
    firstSeen.set(data, at);
  }
  return at;
}

/** An absolute window the reading screen computed (TD-08, `{ caller: true }` entries). */
export interface CallerWindow {
  startIso: string;
  endIso: string;
  /** Shown next to the figures; defaults to the entry's label key. */
  label?: string;
}

export interface UseCatalogQueryOptions {
  /**
   * Pre-resolved absolute window from `StudioContext`. Must be stable. Required by every entry
   * that follows the app's window or the PoC's; an entry with a caller window does not read it,
   * and an entry that needs it refuses to run without it.
   */
  globalWindow?: ResolvedTimeframe;
  /** The windows anchored to the PoC's start date (3.2.5); null until one is set. Must be stable. */
  pocWindows?: PocWindows | null;
  /** Bumped by a deliberate refresh; re-resolves pinned windows. */
  refreshToken: number;
  /** Skips execution. Pages use this so inactive sections cost nothing. */
  enabled?: boolean;
  /**
   * TD-08: the values of a parameterised entry. Validated and quoted by `queries/params.ts`; the
   * hook memoises on their content, so callers may rebuild the object on every render.
   */
  params?: CatalogParamValues | null;
  /** TD-08: the absolute window of a `{ caller: true }` entry. Longer than its `maxMs`, it is refused. */
  window?: CallerWindow | null;
  /** Overrides the cache lifetime derived from the recorded cost (the evidence reads keep 15 min). */
  staleTimeMs?: number;
}

/** Placeholder window for an entry that cannot run (no global window given): never sent. */
const NO_WINDOW: ResolvedTimeframe = { startIso: new Date(0).toISOString(), endIso: new Date(0).toISOString(), label: '', expression: '' };

/** The caller's window as a resolved timeframe, or null when it is missing, unreadable, reversed or too long. */
function callerTimeframe(window: CallerWindow | null | undefined, maxMs: number, label: string): ResolvedTimeframe | null {
  if (window === null || window === undefined) return null;
  const start = Date.parse(window.startIso);
  const end = Date.parse(window.endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > maxMs) return null;
  return { startIso: window.startIso, endIso: window.endIso, label: window.label ?? label, expression: 'caller' };
}

export function useCatalogQuery(
  id: CatalogId,
  { globalWindow, pocWindows = null, refreshToken, enabled = true, params: values = null, window: callerWindow = null, staleTimeMs }: UseCatalogQueryOptions,
): CatalogQueryResult {
  const entry = getQuery(id);
  const policy = entry.timeframe;
  // A query anchored to the PoC's start date has nothing to read until a start date is set.
  const anchoredWindow = policy !== 'global' && 'anchor' in policy ? (pocWindows === null ? null : policy.anchor === 'poc' ? pocWindows.since : pocWindows.day0) : undefined;

  // TD-08: the text to run. Keyed on the values' content, so a rebuilt object never changes it.
  const valuesKey = paramsKey(values);
  const rendered = useMemo(() => renderCatalogDql(entry, values), [entry, valuesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The caller's window (TD-08), keyed on its strings for the same reason.
  const callerStart = callerWindow?.startIso ?? '';
  const callerEnd = callerWindow?.endIso ?? '';
  const callerLabel = callerWindow?.label ?? '';
  const fromCaller = useMemo(
    () => (policy !== 'global' && 'caller' in policy ? callerTimeframe(callerWindow, policy.maxMs, policy.label) : undefined),
    [policy, callerStart, callerEnd, callerLabel], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const needsGlobal = policy === 'global';

  // A refusal is reported only for a query that was asked to run; a disabled one stays quiet.
  const blocked: ParamRefusal | null = !rendered.ok
    ? rendered.refusal
    : fromCaller === null || (needsGlobal && globalWindow === undefined)
      ? { param: 'window', reason: 'window' }
      : null;
  const refusal = enabled ? blocked : null;
  const runnable = enabled && anchoredWindow !== null && blocked === null;

  const timeframe = useMemo<ResolvedTimeframe>(() => {
    const base = globalWindow ?? NO_WINDOW;
    if (policy === 'global') return base;
    if ('caller' in policy) return fromCaller ?? { ...base, label: policy.label, expression: 'caller' };
    if ('anchor' in policy) return anchoredWindow ?? { ...base, label: policy.label, expression: policy.anchor };
    return resolveRelative(policy.relative, policy.label);
    // `refreshToken` is a deliberate dependency: it is how a pinned window moves
    // forward when the user asks for fresh data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy, globalWindow, anchoredWindow, fromCaller, refreshToken]);

  // A refused template is never sent: the request carries the fixed template text, disabled.
  const queryText = rendered.ok ? rendered.dql : entry.dql;
  const params = useMemo<DqlQueryParams>(
    () => ({
      query: queryText,
      defaultTimeframeStart: timeframe.startIso,
      defaultTimeframeEnd: timeframe.endIso,
      ...(entry.guards?.scanLimitGbytes !== undefined
        ? { defaultScanLimitGbytes: entry.guards.scanLimitGbytes }
        : {}),
      ...(entry.guards?.maxResultRecords !== undefined
        ? { maxResultRecords: entry.guards.maxResultRecords }
        : {}),
      ...(entry.guards?.fetchTimeoutSeconds !== undefined
        ? { fetchTimeoutSeconds: entry.guards.fetchTimeoutSeconds }
        : {}),
    }),
    [entry, queryText, timeframe],
  );

  // Self-tuning cache lifetime, derived from the cost the platform actually
  // recorded for this query during validation.
  //
  // Added after a real incident: a refetch loop executed the 7-day problem query
  // 462 times in ten minutes and scanned 72 GB on demand. The per-query scan
  // ceiling did not help, because it bounds one execution and not their number.
  // Stable cache keys are the actual fix; this is defence in depth, so that even
  // if something does refetch unexpectedly, the expensive queries are the ones
  // most likely to be served from cache.
  const staleTime = useMemo(() => {
    if (staleTimeMs !== undefined) return staleTimeMs;
    const recorded = entry.validation.scannedBytesOnDemand;
    if (recorded !== null && recorded > 100_000_000) return 15 * 60 * 1000;
    if (recorded === 0) return 5 * 60 * 1000;
    return 10 * 60 * 1000;
  }, [entry, staleTimeMs]);

  const result = useDql(params, {
    enabled: runnable,
    // The window is already absolute and only moves on a deliberate refresh, so
    // a long stale time is safe and keeps navigation free of re-scans.
    staleTime,
  });

  const refused = refusal !== null;
  const records = useMemo(() => (refused ? [] : ((result.data?.records ?? []) as GrailRecord[])), [refused, result.data]);
  const missingScopes = useMemo(() => readMissingScopes(result.error), [result.error]);
  // A read that stopped at its ceiling, or whose rows the platform cut, is a partial result —
  // not an absence of data — and must be labelled "at least" (see queries/grailMetadata.ts).
  const quality = useMemo(() => readQuality(result.data?.metadata), [result.data]);
  // 3.4.11 (F-16): the session meter counts the bytes of every new answer once; it reads nothing itself.
  useEffect(() => {
    if (result.data !== undefined && result.data !== null) recordRead(result.data, entry.id, quality.scannedBytes);
  }, [result.data, entry.id, quality.scannedBytes]);

  let outcome: QueryOutcome;
  if (refusal !== null) {
    outcome = 'refused';
  } else if (result.isLoading) {
    outcome = 'loading';
  } else if (result.error) {
    outcome = isPermissionDenied(result.error, missingScopes) ? 'no-permission' : 'error';
  } else if (quality.scanLimited || quality.truncated) {
    outcome = 'scan-limit';
  } else if (records.length === 0) {
    outcome = 'empty';
  } else {
    outcome = 'ok';
  }

  // What kind of statement the section's evidence badge may make. A query that is still
  // running or has failed knows nothing, so it must not be badged "Observed".
  const provenance: Provenance =
    outcome === 'refused'
      ? 'failed'
      : outcome === 'no-permission'
      ? 'no-permission'
      : outcome === 'loading'
        ? 'loading'
        : outcome === 'error'
          ? 'failed'
          : outcome === 'empty'
            ? 'no-telemetry'
            : outcome === 'scan-limit'
              ? 'partial'
              : quality.sampled
                ? 'platform-estimate'
                : 'observed';

  // Stable per (query, window, result): recreating this each render would churn every
  // provenance badge in the tree for no reason. `collectedAt` is absent until there is a result.
  const collectedAt = readAt(result.data);
  const evidence = useMemo<EvidenceRef>(
    () => ({
      queryId: entry.id,
      source: entry.domain,
      timeframe: timeframe.label,
      ...(collectedAt !== undefined ? { collectedAt } : {}),
    }),
    [entry, timeframe, collectedAt],
  );

  const effectiveMissingScopes = useMemo(
    () =>
      missingScopes.length > 0
        ? missingScopes
        : outcome === 'no-permission'
          ? [entry.requiredScope]
          : [],
    [missingScopes, outcome, entry],
  );

  return {
    entry,
    records,
    raw: result.data,
    outcome,
    provenance,
    evidence,
    timeframe,
    missingScopes: effectiveMissingScopes,
    quality,
    errorMessage: result.error?.message ?? null,
    isLoading: refusal === null && result.isLoading,
    refetch: () => {
      if (runnable) void result.refetch();
    },
    dql: rendered.ok ? rendered.dql : null,
    refusal,
  };
}
