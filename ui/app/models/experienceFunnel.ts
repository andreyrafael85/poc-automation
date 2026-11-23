import type { GrailRecord } from '../utils/records';
import { num, str } from '../utils/records';

/**
 * 3.6.2 — the Experience funnel (the v5 proposal, approved on 2026-11-21), as data. Pure.
 *
 * One unit per funnel, each step part of the one before: every user action of real users → the actions not frustrated
 * (satisfied or tolerating) → the satisfied ones, by the experience level the platform gives each action
 * (`rum.funnel`); and the requests → those answered without a 4xx or 5xx. The rows are one per application, a grouped
 * list the platform bounds (no limit), so they may be added up. An application whose actions were not measured is left
 * out; with none measured there is no funnel — never a zero.
 */

export interface FunnelStep {
  key: 'actions' | 'notFrustrated' | 'satisfied';
  count: number;
  /** Of the first step, 0–100. */
  share: number;
  /** Left at this step (the step before minus this one); 0 for the first. */
  drop: number;
}

export interface FunnelApp {
  name: string;
  actions: number;
  frustrated: number;
  /** Of the app's actions, 0–100. */
  frustratedShare: number;
}

export interface ExperienceFunnel {
  steps: FunnelStep[];
  tolerating: number;
  frustrated: number;
  requests: { total: number; ok: number; failed: number } | null;
  apps: number;
  /** The application with the most frustrated actions, when any action was frustrated. */
  mostFrustrated: FunnelApp | null;
}

export function experienceFunnel(records: readonly GrailRecord[]): ExperienceFunnel | null {
  let actions = 0;
  let satisfied = 0;
  let tolerating = 0;
  let frustrated = 0;
  let apps = 0;
  let requests = 0;
  let ok = 0;
  let failed = 0;
  let requestsMeasured = false;
  let worst: FunnelApp | null = null;
  for (const record of records) {
    const a = num(record, 'actions');
    const s = num(record, 'satisfied');
    const tl = num(record, 'tolerating');
    const f = num(record, 'frustrated');
    const r = num(record, 'requests');
    if (r !== null && r > 0) {
      requestsMeasured = true;
      requests += r;
      ok += num(record, 'requestsOk') ?? 0;
      failed += num(record, 'requestsFailed') ?? 0;
    }
    if (a === null || !(a > 0) || s === null || tl === null || f === null) continue;
    apps += 1;
    actions += a;
    satisfied += s;
    tolerating += tl;
    frustrated += f;
    if (f > 0 && (worst === null || f > worst.frustrated)) {
      worst = { name: str(record, 'frontend.name') ?? '—', actions: a, frustrated: f, frustratedShare: (f / a) * 100 };
    }
  }
  if (apps === 0 || !(actions > 0)) return null;
  const notFrustrated = satisfied + tolerating;
  const share = (count: number) => (count / actions) * 100;
  return {
    steps: [
      { key: 'actions', count: actions, share: 100, drop: 0 },
      { key: 'notFrustrated', count: notFrustrated, share: share(notFrustrated), drop: actions - notFrustrated },
      { key: 'satisfied', count: satisfied, share: share(satisfied), drop: notFrustrated - satisfied },
    ],
    tolerating,
    frustrated,
    requests: requestsMeasured ? { total: requests, ok, failed } : null,
    apps,
    mostFrustrated: worst,
  };
}
