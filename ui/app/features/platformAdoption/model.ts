import { assumed } from '../../config/assumptions';
import type { StringKey } from '../../i18n/strings';
import { num, str, type GrailRecord } from '../../utils/records';

/**
 * Platform adoption (3.4.4, owner's order of 2026-11-18: "adoção da plataforma … seja quando instalado em
 * um cliente ativo, seja em PoC", from two dashboards — "Dynatrace Intelligence feature adoption" and the
 * "Dynatrace Platform Adoption" (DPA) v1.5.0 — composed into one page, separate from the Assessment).
 *
 * Every figure is a count from `dt.system.events` (audit, AI and query events) — never a user's name: the
 * queries count `user.id` and `user_email`, they never return them. Users of the Dynatrace organisation
 * (in a customer's tenant: the SE and the partner) are counted apart, so the customer's own use reads clear.
 *
 * The adoption index follows the DPA score's method in the open: seven parts, each capped at its points,
 * the targets in the assumptions registry; a part whose read failed leaves the index unshown.
 */

export interface PlatformTotals {
  users: number;
  dynatraceUsers: number;
  apps: number;
  browserActions: number;
  apiCalls: number;
  aiCalls: number;
  analyzerCalls: number;
}

export interface AiTotals {
  invocations: number;
  succeeded: number;
  failed: number;
  blocked: number;
  users: number;
  skills: number;
  feedback: number;
  positive: number;
  negative: number;
}

export const toPlatformTotals = (record: GrailRecord | undefined): PlatformTotals | null =>
  record === undefined
    ? null
    : {
        users: num(record, 'users') ?? 0,
        dynatraceUsers: num(record, 'dynatraceUsers') ?? 0,
        apps: num(record, 'apps') ?? 0,
        browserActions: num(record, 'browserActions') ?? 0,
        apiCalls: num(record, 'apiCalls') ?? 0,
        aiCalls: num(record, 'aiCalls') ?? 0,
        analyzerCalls: num(record, 'analyzerCalls') ?? 0,
      };

export const toAiTotals = (record: GrailRecord | undefined): AiTotals | null =>
  record === undefined
    ? null
    : {
        invocations: num(record, 'invocations') ?? 0,
        succeeded: num(record, 'succeeded') ?? 0,
        failed: num(record, 'failed') ?? 0,
        blocked: num(record, 'blocked') ?? 0,
        users: num(record, 'users') ?? 0,
        skills: num(record, 'skills') ?? 0,
        feedback: num(record, 'feedback') ?? 0,
        positive: num(record, 'positive') ?? 0,
        negative: num(record, 'negative') ?? 0,
      };

export interface AppUse {
  app: string;
  actions: number;
  users: number;
  /** A custom app (`my.…`) rather than a Dynatrace one. */
  custom: boolean;
}

export const toApps = (records: readonly GrailRecord[]): AppUse[] =>
  records
    .map((record) => {
      const app = str(record, 'app') ?? '—';
      return { app, actions: num(record, 'actions') ?? 0, users: num(record, 'users') ?? 0, custom: app.startsWith('my.') || app === 'local-dev-mode' };
    })
    .sort((a, b) => b.users - a.users || b.actions - a.actions);

/** "dynatrace.davis.problems" → "Davis problems": the app's own id, made readable; no name is invented. */
export const appLabel = (app: string): string =>
  app
    .replace(/^dynatrace\./, '')
    .replace(/^my\./, '')
    .split(/[.\-_]/)
    .filter((part) => part !== '')
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');

export const BREADTH_ORDER = ['1', '2-3', '4-6', '7+'] as const;
export type BreadthBand = (typeof BREADTH_ORDER)[number];

export const toBreadth = (records: readonly GrailRecord[]): Record<BreadthBand, number> => {
  const out: Record<BreadthBand, number> = { '1': 0, '2-3': 0, '4-6': 0, '7+': 0 };
  for (const record of records) {
    const segment = str(record, 'segment') as BreadthBand | null;
    if (segment !== null && segment in out) out[segment] = num(record, 'users') ?? 0;
  }
  return out;
};

export type DpaPartId = 'users' | 'apps' | 'aiVolume' | 'aiQuality' | 'api' | 'stickiness' | 'power';

export interface DpaPart {
  id: DpaPartId;
  /** The measured value, as a number (stickiness in %). */
  value: number;
  target: number;
  max: number;
  points: number;
}

export interface DpaIndex {
  value: number | null;
  parts: DpaPart[];
}

export const DPA_LABEL: Record<DpaPartId, StringKey> = {
  users: 'adopt.dpa.users',
  apps: 'adopt.dpa.apps',
  aiVolume: 'adopt.dpa.aiVolume',
  aiQuality: 'adopt.dpa.aiQuality',
  api: 'adopt.dpa.api',
  stickiness: 'adopt.dpa.stickiness',
  power: 'adopt.dpa.power',
};

const part = (id: DpaPartId, value: number, target: number, max: number): DpaPart => ({
  id,
  value,
  target,
  max,
  points: Math.round(Math.min(max, (value / target) * max) * 10) / 10,
});

/**
 * The adoption index, after the DPA score's method: users, breadth of apps, AI volume and quality, API
 * use, stickiness (daily ÷ monthly users) and power users, each worth its points up to its target. Null
 * when a read it needs did not answer — a missing part is never a zero.
 */
export function dpaIndex(platform: PlatformTotals | null, avgDau: number | null, powerUsers: number | null): DpaIndex {
  if (platform === null || avgDau === null || powerUsers === null) return { value: null, parts: [] };
  const stickiness = platform.users === 0 ? 0 : (avgDau / platform.users) * 100;
  const parts = [
    part('users', platform.users, assumed('adoption.dpa.users'), 15),
    part('apps', platform.apps, (assumed('adoption.dpa.apps') * assumed('adoption.dpa.appsShare')) / 100, 20),
    part('aiVolume', platform.aiCalls, assumed('adoption.dpa.aiCalls'), 10),
    part('aiQuality', platform.analyzerCalls, assumed('adoption.dpa.analyzerCalls'), 10),
    part('api', platform.apiCalls, assumed('adoption.dpa.apiCalls'), 15),
    part('stickiness', stickiness, assumed('adoption.dpa.stickiness'), 15),
    part('power', powerUsers, assumed('adoption.dpa.powerUsers'), 15),
  ];
  return { value: Math.round(parts.reduce((sum, entry) => sum + entry.points, 0)), parts };
}
