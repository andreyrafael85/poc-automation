import { num, str, type GrailRecord } from '../utils/records';

/**
 * The flow of one web frontend (3.2.6): the frontend → the services it calls (its entry points)
 * → what those call next, from the entity model (`rum.app.flow`), with each service's traffic and
 * failures from `svc.ranking` when it is among the busiest. A compact picture per application, in
 * the grammar of Topology's "who calls whom" — but of individual services, so each can be opened.
 */

/** How many applications the Digital experience page puts in the spotlight: the busiest ones. */
export const RUM_FOCUS_APPS = 2;
/** How many next-hop services a flow draws; the rest are one "+N" node. */
export const FLOW_NEXT_SHOWN = 4;

export interface FlowService {
  id: string;
  name: string;
  /** Requests over the window, when the service is among the busiest read by `svc.ranking`. */
  requests: number | null;
  failurePct: number | null;
}

export interface AppFlowModel {
  app: { id: string; name: string };
  entries: FlowService[];
  next: FlowService[];
  /** Next-hop services not drawn. */
  moreNext: number;
  links: { from: string; to: string }[];
}

interface Traffic {
  requests: number | null;
  failurePct: number | null;
}

/** Traffic per service id, from the `svc.ranking` rows. */
export function trafficById(ranking: readonly GrailRecord[]): Map<string, Traffic> {
  const map = new Map<string, Traffic>();
  for (const record of ranking) {
    const id = str(record, 'serviceId');
    if (id === null) continue;
    map.set(id, { requests: num(record, 'totalRequests'), failurePct: num(record, 'failureRatePct') });
  }
  return map;
}

const busiestFirst = (a: FlowService, b: FlowService) => (b.requests ?? -1) - (a.requests ?? -1) || a.name.localeCompare(b.name);

/** One frontend's flow; null when the entity model names no service it calls. */
export function appFlow(records: readonly GrailRecord[], appName: string, ranking: readonly GrailRecord[], shown = FLOW_NEXT_SHOWN): AppFlowModel | null {
  const rows = records.filter((record) => str(record, 'frontend') === appName);
  const first = rows[0];
  const appId = first === undefined ? null : str(first, 'frontendId');
  if (first === undefined || appId === null) return null;
  const traffic = trafficById(ranking);
  const service = (id: string, name: string | null): FlowService => {
    const read = traffic.get(id);
    return { id, name: name ?? id, requests: read?.requests ?? null, failurePct: read?.failurePct ?? null };
  };

  const entries = new Map<string, FlowService>();
  const next = new Map<string, FlowService>();
  const edges = new Set<string>();
  for (const row of rows) {
    const entry = str(row, 'entry');
    if (entry === null) continue;
    if (!entries.has(entry)) entries.set(entry, service(entry, str(row, 'entryName')));
    const hop = str(row, 'hop');
    // A service calling itself, or back into an entry point, is not drawn as a step further on.
    if (hop === null || hop === entry || entries.has(hop)) continue;
    if (!next.has(hop)) next.set(hop, service(hop, str(row, 'hopName')));
    edges.add(`${entry}>${hop}`);
  }
  if (entries.size === 0) return null;

  const allNext = [...next.values()].sort(busiestFirst);
  const drawn = allNext.slice(0, shown);
  const drawnIds = new Set(drawn.map((entry) => entry.id));
  const links = [
    ...[...entries.keys()].map((id) => ({ from: appId, to: id })),
    ...[...edges].map((edge) => edge.split('>') as [string, string]).filter(([, to]) => drawnIds.has(to)).map(([from, to]) => ({ from, to })),
  ];
  return {
    app: { id: appId, name: appName },
    entries: [...entries.values()].sort(busiestFirst),
    next: drawn,
    moreNext: allNext.length - drawn.length,
    links,
  };
}

/** The error rate's band on the absolute scale of the Digital experience page (assumption registry). */
export type ErrorBand = 'good' | 'attention' | 'high';

export function errorBand(ratePct: number, good: number, attention: number): ErrorBand {
  if (ratePct < good) return 'good';
  if (ratePct < attention) return 'attention';
  return 'high';
}

/** A scale that holds the worst rate with headroom, never below the attention line and never past 100 %. */
export function errorScaleMax(rates: readonly number[], attention: number): number {
  const worst = Math.max(0, ...rates);
  const candidates = [attention + 1, 10, 20, 50, 100];
  return candidates.find((candidate) => candidate >= worst * 1.15) ?? 100;
}

const TICK_STEPS = [100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000, 20_000, 50_000] as const;

/** Ticks of a duration axis, in ms: 0 and at most four round steps up to the scale's end. */
export function durationTicks(maxMs: number): { max: number; ticks: number[] } {
  const step = TICK_STEPS.find((candidate) => Math.ceil(maxMs / candidate) <= 4) ?? 100_000;
  const max = Math.max(step * 2, Math.ceil(maxMs / step) * step);
  const ticks: number[] = [];
  for (let tick = 0; tick <= max; tick += step) ticks.push(tick);
  return { max, ticks };
}
