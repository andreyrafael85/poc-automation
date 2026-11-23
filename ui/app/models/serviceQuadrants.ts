import { num, str, type GrailRecord } from '../utils/records';

/**
 * 3.5.4 (visual proposal v4, "each service as a point, before the review lines"): the busiest services placed by
 * failure rate (x) and response time (y), sized by requests, read against the two review lines of the assumptions
 * registry (`services.failure.good` 1 %, `services.latency.attention` 1 s). The points are `svc.ranking` — the 50
 * busiest, a capped list: the chart says "top N of M" and counts quadrants only over the points it shows (rule 7).
 */
export type Quadrant = 'both' | 'slow' | 'failing' | 'within';

export interface QuadrantPoint {
  name: string;
  id: string;
  requests: number;
  failureRatePct: number;
  responseMs: number;
  quadrant: Quadrant;
}

export interface QuadrantView {
  points: QuadrantPoint[];
  /** Services of the list without a response time (left off the chart, said in the caption). */
  untimed: number;
  counts: Record<Quadrant, number>;
  lines: { failurePct: number; latencyMs: number };
}

export function quadrantOf(failureRatePct: number, responseMs: number, failurePct: number, latencyMs: number): Quadrant {
  const failing = failureRatePct >= failurePct;
  const slow = responseMs >= latencyMs;
  return failing && slow ? 'both' : slow ? 'slow' : failing ? 'failing' : 'within';
}

export function serviceQuadrants(records: readonly GrailRecord[], failurePct: number, latencyMs: number): QuadrantView {
  const counts: Record<Quadrant, number> = { both: 0, slow: 0, failing: 0, within: 0 };
  const points: QuadrantPoint[] = [];
  let untimed = 0;
  for (const record of records) {
    const requests = num(record, 'totalRequests');
    const rate = num(record, 'failureRatePct');
    const us = num(record, 'avgResponseTimeUs');
    if (requests === null || requests <= 0 || rate === null) continue;
    if (us === null || us <= 0) {
      untimed += 1;
      continue;
    }
    const responseMs = us / 1000;
    const quadrant = quadrantOf(rate, responseMs, failurePct, latencyMs);
    counts[quadrant] += 1;
    points.push({
      name: str(record, 'name') ?? str(record, 'serviceId') ?? '—',
      id: str(record, 'serviceId') ?? '',
      requests,
      failureRatePct: rate,
      responseMs,
      quadrant,
    });
  }
  return { points, untimed, counts, lines: { failurePct, latencyMs } };
}

/** The failure-rate axis: a square-root scale, so 0.1 %, 1 % and 20 % all stay readable. Ticks a person reads. */
export const FAILURE_TICKS = [0, 0.5, 1, 2, 5, 10, 20, 50, 100] as const;

export function failureDomain(points: readonly QuadrantPoint[], linePct: number): number {
  const most = Math.max(linePct * 2, ...points.map((point) => point.failureRatePct));
  return FAILURE_TICKS.find((tick) => tick >= most) ?? 100;
}

/** The response-time axis: logarithmic, from the decade under the fastest to the decade over the slowest (and the line). */
export function latencyDomain(points: readonly QuadrantPoint[], lineMs: number): [number, number] {
  const values = [...points.map((point) => point.responseMs), lineMs];
  const low = 10 ** Math.floor(Math.log10(Math.max(0.01, Math.min(...values))));
  const high = 10 ** Math.ceil(Math.log10(Math.max(...values) * 1.01));
  return [low, Math.max(high, low * 10)];
}
