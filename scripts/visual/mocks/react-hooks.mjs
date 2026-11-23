/**
 * Mock of `@dynatrace-sdk/react-hooks`.
 *
 * `useDql(params, options)` returns what the real hook returns for the fields
 * this app consumes (`data`, `error`, `isLoading`, `refetch` and the usual
 * status flags). The query text is matched against the app's own catalog
 * (`ui/app/queries/catalog.ts`), so a fixture is selected by catalog id, never
 * by guessing.
 *
 * Queries rendered from a parameterised catalog template (TD-08, 3.3.2: their text carries the
 * ids, so it never equals the template) are recognised by their text: the incident's logs and its
 * root cause's callers by the regexes below, and the evidence queries of the real-prints deck
 * (3.2.7) by the app's own `identifyEvidenceQuery` (one source of truth for their shapes). An evidence query is keyed by its window as well, since one text can run over several
 * windows (B6 over the incident, the screen and the problem), and its fixture may be a function of
 * `{ query, startIso, endIso }`.
 *
 * Scenarios (window.__PVS__.scenario):
 *   rich | sparse   -> fixture rows
 *   denied          -> scopes security.events / user.sessions fail with a 403 envelope
 *   error           -> every query fails with a generic 500 envelope
 *   loading         -> promises never resolve (isLoading stays true)
 *   scanlimit       -> rich rows plus a Grail scan-limit notification (metadata.grail.notifications)
 *
 * Everything not mocked is re-exported from the real package.
 */

import { useCallback, useSyncExternalStore } from 'react';

import { identifyEvidenceQuery } from '../../../ui/app/features/wrapup/prints/evidence/registry.ts';
import { CATALOG } from '../../../ui/app/queries/catalog.ts';
import { fixtureFor } from '../fixtures/index.mjs';
import { permissionDeniedError, platformError } from './errors.mjs';

export * from '@pvs-real/react-hooks';

const DENIED_SCOPES = new Set(['storage:security.events:read', 'storage:user.sessions:read']);

const DQL_TO_ID = new Map(Object.values(CATALOG).map((entry) => [entry.dql, entry.id]));
const INCIDENT_LOGS = /^fetch logs\n\| filter in\(dt\.source_entity/;
/** 3.2.7: the callers of an incident's root-cause service (`useRootCallers`). */
/** 3.6.1: the calls among an incident's services (`rca.edges`). */
const RCA_EDGES = /^fetch dt\.entity\.service\n\| filter in\(id, array\(/;
const ROOT_CALLERS = /^timeseries \{ requests = sum\(dt\.service\.request\.count, scalar: true\)[^\n]*\n\| lookup \[fetch dt\.entity\.service \| filter id == "SERVICE-/;

const harness = () => {
  const state = (globalThis.__PVS__ ??= { scenario: 'rich', pending: 0, hung: 0, queries: {}, unmatched: [] });
  state.queries ??= {};
  state.unmatched ??= [];
  state.pending ??= 0;
  state.hung ??= 0;
  return state;
};

function resolveId(query) {
  const id = DQL_TO_ID.get(query);
  if (id !== undefined) return id;
  if (INCIDENT_LOGS.test(query)) return 'incident.logs';
  if (ROOT_CALLERS.test(query)) return 'rca.callers';
  if (RCA_EDGES.test(query)) return 'rca.edges';
  // 3.2.7: the real-prints evidence queries (B3 has the callers' text and was resolved just above).
  return identifyEvidenceQuery(query) ?? null;
}

/** An evidence query of the real-prints deck (`ev.*`): its window is part of what it asks. */
const isEvidence = (id) => typeof id === 'string' && id.startsWith('ev.');

const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

const base = (extra) => ({
  state: 'SUCCEEDED',
  progress: 100,
  cancel: () => Promise.resolve(),
  refetch: () => Promise.resolve(undefined),
  forceRefetch: () => Promise.resolve(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
  isLoading: false,
  isLoadingError: false,
  isFetching: false,
  isRefetchError: false,
  isFetched: true,
  isStale: false,
  isPlaceholderData: false,
  data: undefined,
  error: null,
  _getQueryKey: () => [],
  ...extra,
});

const IDLE = base({ isPending: true, isFetched: false });

const store = new Map();

function outcomeFor(id, scenario, request) {
  if (scenario === 'loading') return { kind: 'hang' };
  if (scenario === 'error') return { kind: 'error', error: platformError() };
  if (scenario === 'denied' && id !== null && id !== 'incident.logs') {
    const scope = CATALOG[id]?.requiredScope;
    if (DENIED_SCOPES.has(scope)) return { kind: 'error', error: permissionDeniedError(scope) };
  }
  const stored = id === null ? undefined : fixtureFor(scenario, id);
  // A fixture may depend on what was asked (the entity id in the text, the window).
  const fixture = typeof stored === 'function' ? stored(request) : stored;
  if (fixture === undefined) {
    harness().unmatched.push(id ?? 'unknown-dql');
    console.warn(`[pvs-harness] no fixture for ${id ?? 'an unrecognised query'}; returning an empty table`);
    return { kind: 'data', data: { records: [], types: [{ indexRange: [0, 0], mappings: {} }], metadata: { grail: {} } } };
  }
  if (scenario === 'scanlimit') {
    const notifications = [
      ...(fixture.metadata?.grail?.notifications ?? []),
      { notificationType: 'SCAN_LIMIT_GBYTES', severity: 'WARN', message: 'Your execution was stopped after the scan limit was reached.' },
    ];
    return { kind: 'data', data: { ...fixture, metadata: { ...fixture.metadata, grail: { ...fixture.metadata.grail, notifications } } } };
  }
  // 3.4.11 (F-16): Grail says what it scanned; the mock answers with the bytes the query read when it was
  // validated on the lab tenant, so the session meter has realistic figures to add up.
  const scanned = id === null ? undefined : CATALOG[id]?.validation?.scannedBytesOnDemand;
  if (typeof scanned === 'number' && !(fixture.metadata?.grail?.scannedBytes > 0)) {
    return { kind: 'data', data: { ...fixture, metadata: { ...fixture.metadata, grail: { ...fixture.metadata?.grail, scannedBytes: scanned } } } };
  }
  return { kind: 'data', data: fixture };
}

function entryFor(query, frame) {
  const scenario = harness().scenario;
  const id = resolveId(query);
  // Catalog queries keep their text as the key (their windows follow the app's own scope); an
  // evidence query adds its window, which the app computes once per request key (stable).
  const key = isEvidence(id) ? `${scenario}␟${query}␟${frame.startIso}␟${frame.endIso}` : `${scenario}␟${query}`;
  let entry = store.get(key);
  if (entry === undefined) {
    entry = { key, query, scenario, id, request: { query, ...frame }, snapshot: base({ isPending: true, isLoading: true, isFetching: true, isFetched: false, state: 'RUNNING', progress: 0 }), listeners: new Set() };
    store.set(key, entry);
    run(entry);
  }
  return entry;
}

function run(entry) {
  const h = harness();
  const outcome = outcomeFor(entry.id, entry.scenario, entry.request);
  const label = entry.id ?? entry.query.slice(0, 40);
  if (outcome.kind === 'hang') {
    h.hung += 1;
    h.queries[label] = 'loading';
    return;
  }
  h.pending += 1;
  h.queries[label] = 'loading';
  setTimeout(() => {
    const refetch = () => {
      entry.snapshot = { ...entry.snapshot, isLoading: false, isFetching: true };
      entry.listeners.forEach((listener) => listener());
      run(entry);
      return Promise.resolve(entry.snapshot);
    };
    entry.snapshot =
      outcome.kind === 'error'
        ? base({ isError: true, error: outcome.error, state: 'FAILED', refetch, forceRefetch: refetch })
        : base({ isSuccess: true, data: outcome.data, refetch, forceRefetch: refetch });
    h.queries[label] = outcome.kind === 'error' ? 'error' : outcome.data.records.length === 0 ? 'empty' : 'ok';
    h.pending -= 1;
    entry.listeners.forEach((listener) => listener());
  }, 20 + (hash(entry.key) % 70));
}

export function useDql(queryOrParams, options = {}) {
  const query = typeof queryOrParams === 'string' ? queryOrParams : queryOrParams.query;
  // The window asked for (named `frame`: `window` is the browser's global).
  const frame =
    typeof queryOrParams === 'string'
      ? { startIso: null, endIso: null }
      : { startIso: queryOrParams.defaultTimeframeStart ?? null, endIso: queryOrParams.defaultTimeframeEnd ?? null };
  const enabled = options.enabled !== false;
  const entry = enabled ? entryFor(query, frame) : null;
  const subscribe = useCallback(
    (listener) => {
      if (entry === null) return () => undefined;
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    [entry],
  );
  const getSnapshot = useCallback(() => (entry === null ? IDLE : entry.snapshot), [entry]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
