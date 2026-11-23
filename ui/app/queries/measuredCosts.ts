import type { CatalogEntry } from './types';

/**
 * The scan cost of the catalog entries that had none (3.3.4, TD-17/Q14 — the "40 cost records"),
 * measured on the lab tenant on 2026-11-16 at **0 bytes of cost to measure**: every query the app
 * runs is recorded in `dt.system.events` (`QUERY_EXECUTION_EVENT`, `client.application_context =
 * my.poc.value.studio.v31`) with its `scanned_bytes.on_demand`, so the cost of each entry is the
 * largest it actually scanned, as the app ran it, over 14 days of real use (2026-11-02 → 11-16).
 *
 * Matched by the first 120 characters of the query with its literals masked (the platform masks
 * them). The three security entries share their head (`VULNERABILITY_ROLLUP`) and the same 30-minute
 * scan of `security.events`, so they carry the same figure. Queries on metrics (`timeseries`) and on
 * the entity model read 0 bytes, as every such run in the period did.
 *
 * Not measured (the app did not run them in the period; each needs ids, and running them by hand
 * would cost a scan for a figure the next real use records for free): `ev.problem.recurrence`,
 * `ev.entity.events`, `ev.logs.errors`.
 */
export const MEASURED_COSTS: Readonly<Record<string, { bytes: number; runs: number; window: string }>> = {
  'cov.inventory': { bytes: 0, runs: 32, window: 'entity model' },
  'cov.inventory.day0': { bytes: 0, runs: 32, window: 'entity model (same query as cov.inventory)' },
  'prob.topentities.total': { bytes: 341_640_977, runs: 117, window: '7 d' },
  'rca.top': { bytes: 652_214_634, runs: 102, window: '15 d' },
  'rca.kpi': { bytes: 649_811_373, runs: 9, window: '15 d' },
  'rca.logs': { bytes: 665_525_179, runs: 9, window: '6 h' },
  'rca.trend': { bytes: 338_710_061, runs: 9, window: '7 d' },
  'rca.catmix': { bytes: 649_811_373, runs: 9, window: '15 d' },
  'svc.topology.calls': { bytes: 0, runs: 3, window: 'entity model' },
  'k8s.inventory': { bytes: 0, runs: 2, window: 'entity model' },
  'log.quality': { bytes: 1_204_923_401, runs: 174, window: '30 min' },
  'biz.events.total': { bytes: 345_944_981, runs: 5, window: '6 h' },
  'sec.vulnerabilities': { bytes: 120_497_290, runs: 125, window: '30 min (shared head)' },
  'sec.posture': { bytes: 120_497_290, runs: 125, window: '30 min (shared head)' },
  'sec.context': { bytes: 120_497_290, runs: 125, window: '30 min (shared head)' },
  'rum.sessions': { bytes: 328_613_806, runs: 30, window: 'up to 30 d' },
  'prob.poc.daily': { bytes: 1_694_637_076, runs: 21, window: 'since the PoC start (up to 39 d)' },
  'svc.owners': { bytes: 0, runs: 3, window: 'entity model' },
  'rum.app.flow': { bytes: 0, runs: 2, window: 'entity model' },
  'rca.incident.logs': { bytes: 816_971_294, runs: 12, window: 'the incident, up to 6 h' },
  'rca.incident.logs.services': { bytes: 666_324_620, runs: 16, window: 'the incident, up to 6 h' },
  'ev.problem.events': { bytes: 558_044_179, runs: 24, window: 'the incident, up to 17 h observed' },
  'ev.service.minutes': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.service.endpoints': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.service.screen': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.frontend.summary': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.frontend.minutes': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.k8s.capacity': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.k8s.workloads': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.k8s.churn': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.k8s.incidentRestarts': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.failing.services': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.failing.endpoints': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.failed.endpoints': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.host.cpu': { bytes: 0, runs: 0, window: 'metrics' },
  'ev.topology.blast': { bytes: 0, runs: 0, window: 'entity model' },
  'ev.topology.hubs': { bytes: 0, runs: 0, window: 'entity model' },
};

/** The entries with their measured cost written into their validation record. */
export function withMeasuredCosts<T extends Record<string, CatalogEntry>>(entries: T): T {
  const out: Record<string, CatalogEntry> = {};
  for (const [id, entry] of Object.entries(entries)) {
    const measured = MEASURED_COSTS[id];
    out[id] =
      measured === undefined || entry.validation.scannedBytesOnDemand !== null
        ? entry
        : {
            ...entry,
            validation: {
              ...entry.validation,
              scannedBytesOnDemand: measured.bytes,
              notes: `${entry.validation.notes} Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, ${measured.window}${measured.runs > 0 ? `, ${measured.runs} runs` : ''}).`.trim(),
            },
          };
  }
  return out as T;
}
