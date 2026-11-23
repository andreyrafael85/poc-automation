import { useMemo } from 'react';

import { useQueryScope } from '../config/StudioContext';
import { incidentLogWindow, type RcaIncident } from '../models/rca';
import { NO_CALLERS, frontendIdMap, summariseRootCallers, type RootCallers } from '../models/trailLinks';
import { entityType } from '../utils/deepLinks';
import { useCatalogQuery } from './useCatalogQuery';

/** The callers of a root cause, and whether their query is still on its first answer. */
export interface RootCallersState {
  callers: RootCallers;
  /** True while the callers query has not answered yet (never for a root that is not a service). */
  pending: boolean;
}

/** The cache lifetime the trail's callers have always had: the window only moves on a refresh. */
const CALLERS_STALE_MS = 10 * 60 * 1000;

/**
 * The callers of an incident's root-cause service over the incident's own window (padded as the
 * incident logs are, at most six hours). TD-08 (3.3.2): the catalog's `rca.callers`, with the root
 * id as its validated parameter; keyed on that id and window so it never refetches in a loop.
 * Metrics and the entity model only: no Grail bytes scanned.
 */
export function useRootCallers(incident: RcaIncident | null): RootCallers {
  return useRootCallersState(incident).callers;
}

/**
 * `useRootCallers` with its loading state (3.2.7). The deck's photograph of the trail waits on it:
 * a database root is drawn as a database, with the services that call it, only once the callers
 * have answered — photographed earlier, it would show a plain service with no callers.
 */
export function useRootCallersState(incident: RcaIncident | null): RootCallersState {
  const { refreshToken } = useQueryScope();
  const key = incident === null ? '' : [incident.rootCauseId, incident.startIso, incident.endIso, refreshToken].join('|');
  const rootId = incident !== null && entityType(incident.rootCauseId) === 'SERVICE' ? (incident.rootCauseId as string) : null;
  const params = useMemo(() => (rootId === null ? null : { rootId }), [rootId]);
  const window = useMemo(() => incidentLogWindow(incident), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = useCatalogQuery('rca.callers', {
    refreshToken,
    enabled: rootId !== null,
    params,
    window,
    staleTimeMs: CALLERS_STALE_MS,
  });
  const answered = rootId !== null && result.raw !== undefined && (result.outcome === 'ok' || result.outcome === 'empty' || result.outcome === 'scan-limit');
  const callers = useMemo(() => (answered ? summariseRootCallers(result.records) : NO_CALLERS), [answered, result.records]);
  const pending = rootId !== null && result.isLoading;
  return useMemo(() => ({ callers, pending }), [callers, pending]);
}

/** `APPLICATION-…` → `FRONTEND-…` for the tenant's web frontends (`rum.frontend.ids`). */
export function useFrontendIds(): ReadonlyMap<string, string> {
  const scope = useQueryScope();
  const query = useCatalogQuery('rum.frontend.ids', scope);
  return useMemo(() => frontendIdMap(query.records), [query.records]);
}
