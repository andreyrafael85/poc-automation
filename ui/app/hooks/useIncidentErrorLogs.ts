import { useMemo } from 'react';

import { incidentLogWindow, incidentLogsQuery, summariseIncidentLogs, type IncidentLogs, type RcaIncident } from '../models/rca';
import { useCatalogQuery } from './useCatalogQuery';

export type IncidentLogsOutcome = 'loading' | 'ok' | 'no-permission' | 'error' | 'disabled';

export interface IncidentLogsResult {
  logs: IncidentLogs;
  outcome: IncidentLogsOutcome;
  isLoading: boolean;
  /**
   * 3.2.7: Grail stopped at the scan ceiling or cut the rows, so every count is a floor and an
   * empty result does not prove there are no logs.
   */
  incomplete: boolean;
}

const EMPTY: IncidentLogs = { signatures: [], total: 0, errors: 0, warnings: 0, hasRows: false, hasContent: false };

/** The cache lifetime the incident reads have always had: the window only moves on a refresh. */
const INCIDENT_STALE_MS = 10 * 60 * 1000;

/**
 * Reads the selected incident's own error/warn logs (entity-scoped, over its padded window) — the
 * service/database errors behind the problem, not the environment at large.
 *
 * TD-08 (3.3.2): through the catalog (`rca.incident.logs`, or `rca.incident.logs.services` when an
 * affected entity is a service). The ids are only known once the incident resolves, so they travel
 * as typed parameters that the catalog validates and quotes; the window is the incident's own,
 * at most six hours, and the 10 GB ceiling is the entry's guard. The request is keyed on the
 * incident's ids and window, so it never refetches in a loop.
 */
export function useIncidentErrorLogs(incident: RcaIncident | null, refreshToken: number): IncidentLogsResult {
  // Stable cache key from the incident's ids and window; drives the memoised request.
  const key =
    incident === null
      ? ''
      : [incident.eventId, incident.startIso, incident.endIso, incident.affectedIds.join(','), incident.relatedIds.join(','), refreshToken].join('|');

  const query = useMemo(() => incidentLogsQuery(incident), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const window = useMemo(() => incidentLogWindow(incident), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = useCatalogQuery(query?.id ?? 'rca.incident.logs', {
    refreshToken,
    enabled: query !== null,
    params: query?.params ?? null,
    window,
    staleTimeMs: INCIDENT_STALE_MS,
  });

  const logs = useMemo(() => summariseIncidentLogs(result.records), [result.records]);

  if (query === null) return { logs: EMPTY, outcome: 'disabled', isLoading: false, incomplete: false };
  switch (result.outcome) {
    case 'loading':
      return { logs: EMPTY, outcome: 'loading', isLoading: true, incomplete: false };
    case 'no-permission':
      return { logs: EMPTY, outcome: 'no-permission', isLoading: false, incomplete: false };
    // A refused scope (more ids than the entry allows) ran nothing: the logs could not be read.
    case 'refused':
    case 'error':
      return { logs: EMPTY, outcome: 'error', isLoading: false, incomplete: false };
    default:
      // A read over the first ids only (more than the entry takes) is a floor too (review 3.3.2 #6).
      return { logs, outcome: 'ok', isLoading: false, incomplete: result.outcome === 'scan-limit' || query.truncated };
  }
}
