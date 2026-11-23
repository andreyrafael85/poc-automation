import { assumed } from '../config/assumptions';
import { num, str, type GrailRecord } from '../utils/records';

/**
 * Digital-experience posture, from Classic RUM `dt.frontend.*` metrics.
 *
 * This tenant serves RUM as aggregated metrics (Classic RUM); the New-RUM
 * `user.sessions` / `user.events` tables are empty, so nothing here reads them.
 * Metrics need only `storage:metrics:read`, which the app already holds, so the
 * experience view renders live rather than degrading to a permission gap.
 *
 * Two queries feed this: `rum.scorecard` (traffic + errors per frontend) and
 * `rum.webvitals` (Core Web Vitals + navigation timings per frontend). They are
 * merged by `frontend.name` so each application carries whatever it measured and
 * a dash for what it did not.
 */

export type Rating = 'good' | 'needs-improvement' | 'poor' | 'no-data';

export interface RumApp {
  name: string;
  actions: number | null;
  requests: number | null;
  errors: number | null;
  errorRatePct: number | null;
  /** Largest Contentful Paint p75, ms. */
  lcp: number | null;
  /** Interaction to Next Paint p75, ms. */
  inp: number | null;
  /** Cumulative Layout Shift p75 (metric units, graded like the reference dashboard). */
  cls: number | null;
  /** Load event end p75, ms. */
  load: number | null;
  /** Time to First Byte p75, ms. */
  ttfb: number | null;
  /** DOM interactive p75, ms. */
  dom: number | null;
  /** User-action duration p75, ms. */
  actionDur: number | null;
  /** Estimated active user sessions; null when the tenant does not populate it. */
  sessions: number | null;
  /** Estimated unique active users; null when the tenant does not populate it. */
  users: number | null;
}

export interface RumSummary {
  apps: RumApp[];
  hasData: boolean;
  totalRequests: number;
  totalErrors: number;
  totalActions: number;
  /** Weighted error rate across apps, or null when no requests were measured. */
  overallErrorRatePct: number | null;
  /** Worst (highest) INP p75 across apps, ms — the headline experience risk. */
  worstInp: number | null;
  /** Apps whose INP p75 breaches the "poor" line. */
  poorInpApps: number;
  /** Active user sessions across all apps together (platform estimate), or null when unobserved. */
  totalSessions: number | null;
  /**
   * Unique active users across all apps together (platform estimate), or null when unobserved.
   * Never the sum of the per-app figures: a user of two applications would count twice.
   */
  totalUsers: number | null;
}

function band(value: number | null, good: number, ni: number): Rating {
  if (value === null) return 'no-data';
  if (value < good) return 'good';
  if (value < ni) return 'needs-improvement';
  return 'poor';
}

/** Core Web Vitals thresholds (ms for LCP/INP/TTFB; metric units for CLS), from the assumptions registry. */
export const rateLcp = (ms: number | null): Rating => band(ms, assumed('experience.lcp.good'), assumed('experience.lcp.poor'));
export const rateInp = (ms: number | null): Rating => band(ms, assumed('experience.inp.good'), assumed('experience.inp.poor'));
export const rateCls = (v: number | null): Rating => band(v, assumed('experience.cls.good'), assumed('experience.cls.poor'));
export const rateTtfb = (ms: number | null): Rating => band(ms, assumed('experience.ttfb.good'), assumed('experience.ttfb.poor'));

function mergeApps(
  scorecard: readonly GrailRecord[],
  webvitals: readonly GrailRecord[],
  audience: readonly GrailRecord[],
): RumApp[] {
  const byName = new Map<string, RumApp>();
  const ensure = (name: string): RumApp => {
    const existing = byName.get(name);
    if (existing !== undefined) return existing;
    const created: RumApp = {
      name,
      actions: null,
      requests: null,
      errors: null,
      errorRatePct: null,
      lcp: null,
      inp: null,
      cls: null,
      load: null,
      ttfb: null,
      dom: null,
      actionDur: null,
      sessions: null,
      users: null,
    };
    byName.set(name, created);
    return created;
  };

  for (const record of scorecard) {
    const name = str(record, 'frontend.name');
    if (name === null) continue;
    const app = ensure(name);
    app.actions = num(record, 'actions');
    app.requests = num(record, 'requests');
    app.errors = num(record, 'errors');
    app.errorRatePct = num(record, 'errorRatePct');
  }
  for (const record of webvitals) {
    const name = str(record, 'frontend.name');
    if (name === null) continue;
    const app = ensure(name);
    app.lcp = num(record, 'lcp');
    app.inp = num(record, 'inp');
    app.cls = num(record, 'cls');
    app.load = num(record, 'load');
    app.ttfb = num(record, 'ttfb');
    app.dom = num(record, 'dom');
    app.actionDur = num(record, 'actionDur');
  }
  for (const record of audience) {
    const name = str(record, 'frontend.name');
    if (name === null) continue;
    const app = ensure(name);
    app.sessions = num(record, 'sessions');
    app.users = num(record, 'users');
  }

  return [...byName.values()].sort((a, b) => (b.requests ?? 0) - (a.requests ?? 0));
}

export function summariseRum(
  scorecard: readonly GrailRecord[],
  webvitals: readonly GrailRecord[],
  audience: readonly GrailRecord[] = [],
  /** The `rum.audience.total` row: distinct sessions and users over every frontend at once. */
  audienceTotal: GrailRecord | undefined = undefined,
): RumSummary {
  const apps = mergeApps(scorecard, webvitals, audience);
  const totalRequests = apps.reduce((sum, app) => sum + (app.requests ?? 0), 0);
  const totalErrors = apps.reduce((sum, app) => sum + (app.errors ?? 0), 0);
  const totalActions = apps.reduce((sum, app) => sum + (app.actions ?? 0), 0);
  const inps = apps.map((app) => app.inp).filter((value): value is number => value !== null);
  const sessionVals = apps.map((app) => app.sessions).filter((v): v is number => v !== null);
  const userVals = apps.map((app) => app.users).filter((v): v is number => v !== null);

  return {
    apps,
    hasData: apps.length > 0,
    totalRequests,
    totalErrors,
    totalActions,
    overallErrorRatePct:
      totalRequests > 0 ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : null,
    worstInp: inps.length > 0 ? Math.max(...inps) : null,
    poorInpApps: apps.filter((app) => rateInp(app.inp) === 'poor').length,
    // Distinct users are not additive across applications. With the overall figure the totals
    // are exact; without it there is no honest total, so a single app's value stands only when
    // it is the only app, and otherwise nothing is claimed.
    totalSessions: num(audienceTotal, 'sessions') ?? (sessionVals.length === 1 ? sessionVals[0]! : null),
    totalUsers: num(audienceTotal, 'users') ?? (userVals.length === 1 ? userVals[0]! : null),
  };
}
