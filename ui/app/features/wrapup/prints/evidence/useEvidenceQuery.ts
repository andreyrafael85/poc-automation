import { useMemo } from 'react';

import { useCatalogQuery, type QueryOutcome } from '../../../../hooks/useCatalogQuery';
import { CLEAN_QUALITY } from '../../../../queries/grailMetadata';
import type { EvidenceOutcome, EvidenceQueryResult } from '../types';
import type { CatalogEvidenceRequest } from './plan';

/**
 * Runs one evidence query (3.2.7): the catalog entry and values `planEvidenceRequests` chose for a
 * fixed slot, over the slot's window.
 *
 * TD-08 (3.3.2): it reads through `useCatalogQuery`, like every other query of the app — the entry
 * renders its template with the request's validated values, sends the window and the entry's cost
 * guards as request fields, and classifies the result (a refused read is `no-permission`, a read
 * that stopped at its scan ceiling or whose rows were cut is `partial`, "at least", never "no
 * data"). The request is memoised on its key alone (`id|start|end|hash8(dql)|refreshToken`), so a
 * request object rebuilt on every render never changes the `useDql` cache key and never refetches
 * in a loop. A null request is a disabled slot: nothing runs.
 */

/** The `useDql` cache lifetime: windows are absolute and only move on a deliberate refresh. */
export const EVIDENCE_STALE_MS = 15 * 60 * 1000;

/** The catalog id a disabled slot passes, so the hook order and shape never change (nothing runs). */
const DISABLED_ID = 'ev.topology.hubs';

const EMPTY: EvidenceQueryResult['records'] = [];

const OUTCOME: Readonly<Record<QueryOutcome, EvidenceOutcome>> = {
  loading: 'loading',
  ok: 'ok',
  empty: 'empty',
  'no-permission': 'no-permission',
  'scan-limit': 'partial',
  error: 'error',
  // A value or window the catalog refused never ran: the slot could not be read.
  refused: 'error',
};

export function useEvidenceQuery(request: CatalogEvidenceRequest | null): EvidenceQueryResult {
  const key = request?.key ?? '';
  // Keyed on the request key alone: the key already encodes the id, the window, the DQL and the refresh.
  const stable = useMemo(() => request, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const window = useMemo(() => (stable === null ? null : { startIso: stable.window.startIso, endIso: stable.window.endIso }), [stable]);

  const query = useCatalogQuery(stable?.catalogId ?? DISABLED_ID, {
    refreshToken: 0,
    enabled: stable !== null,
    params: stable?.params ?? null,
    window,
    staleTimeMs: EVIDENCE_STALE_MS,
  });

  // "Printed = executed": the catalog's text must be the request's, or the slot is not read.
  const mismatch = stable !== null && query.dql !== undefined && query.dql !== null && query.dql !== stable.dql;
  let outcome: EvidenceOutcome;
  if (stable === null) outcome = 'disabled';
  else if (mismatch) outcome = 'error';
  // No answer yet (the platform cache hands back nothing until the read lands) is still loading.
  else if (query.outcome === 'empty' && query.raw === undefined) outcome = 'loading';
  else outcome = OUTCOME[query.outcome];

  const records = outcome === 'ok' || outcome === 'partial' ? query.records : EMPTY;
  const quality = query.raw === undefined ? CLEAN_QUALITY : query.quality;
  const readAtIso = outcome === 'disabled' || outcome === 'loading' ? null : (query.evidence.collectedAt ?? null);

  return useMemo<EvidenceQueryResult>(() => ({ request: stable, outcome, records, quality, readAtIso }), [stable, outcome, records, quality, readAtIso]);
}
