import { assumed } from '../../config/assumptions';
import type { StringKey } from '../../i18n/strings';
import type { AssessmentSignals } from './findings';

/**
 * The observability maturity journey (3.4.3; redrawn in 3.4.5; rebuilt in 3.4.7 at the owner's review of 3.4.6).
 *
 * Dynatrace's journey "From Reactive Monitoring to Intelligent Control Plane" — Reactive, Foundational, Proficient,
 * Strategic, Visionary — moves an organisation forward on several fronts at once, not one tool at a time. So since
 * 3.4.7 every step asks the same four pillars to advance, each with a higher line than the step before:
 *
 *  - **Visibility** — how much of the estate is observed, and how deeply (full-stack share, coverage index,
 *    Kubernetes reporting);
 *  - **Context** — whether the signals arrive connected (logs with service context, one platform, ownership);
 *  - **Digital experience & business** — whether users and the business are in view (web apps, real users,
 *    synthetic checks, business events);
 *  - **AI & automated operations** — how problems are found, resolved and prevented (Davis problems, time to
 *    resolve, workflows that succeed, runtime security, automation at scale).
 *
 * Four criteria per step, sixteen in all; a step is reached when every criterion of it and of the steps before is
 * met, so Visionary asks for near-complete full-stack coverage, an excellent coverage index, connected and owned
 * data, real users on almost every web app, business events, fast resolution and automation at scale. A criterion
 * is met only when each of its checks is met; a check not read (no permission, failed read) makes it "not read",
 * never "not met". Every line lives in the assumptions register (group `maturity`). Nothing here is a score.
 */

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;
export type CriterionState = 'met' | 'open' | 'unread';
export type MaturityPillar = 'visibility' | 'context' | 'experience' | 'operations';

export const PILLARS: readonly MaturityPillar[] = ['visibility', 'context', 'experience', 'operations'];

export const PILLAR_KEY: Record<MaturityPillar, StringKey> = {
  visibility: 'asm.mat.p.visibility',
  context: 'asm.mat.p.context',
  experience: 'asm.mat.p.experience',
  operations: 'asm.mat.p.operations',
};

export interface MaturityCriterion {
  /** `<pillar><level>`, e.g. `visibility3`; the label is `asm.mat.c.<id>`. */
  id: string;
  pillar: MaturityPillar;
  level: 2 | 3 | 4 | 5;
  state: CriterionState;
  /** The lines the label names ("{fs} %"), from the assumptions register. */
  params: Record<string, string>;
}

export interface MaturityReading {
  level: MaturityLevel;
  /** The next level has criteria not read and none open: the level may be higher than shown. */
  mayBeHigher: boolean;
  criteria: MaturityCriterion[];
  perLevel: { level: MaturityLevel; met: number; open: number; unread: number; total: number }[];
  /** For each pillar, the highest step whose criteria of that pillar are met up to it (1 when none). */
  pillars: { pillar: MaturityPillar; level: MaturityLevel }[];
}

export const LEVEL_KEY: Record<MaturityLevel, { name: StringKey; tag: StringKey; text: StringKey }> = {
  1: { name: 'asm.mat.l1', tag: 'asm.mat.l1.tag', text: 'asm.mat.l1.text' },
  2: { name: 'asm.mat.l2', tag: 'asm.mat.l2.tag', text: 'asm.mat.l2.text' },
  3: { name: 'asm.mat.l3', tag: 'asm.mat.l3.tag', text: 'asm.mat.l3.text' },
  4: { name: 'asm.mat.l4', tag: 'asm.mat.l4.tag', text: 'asm.mat.l4.text' },
  5: { name: 'asm.mat.l5', tag: 'asm.mat.l5.tag', text: 'asm.mat.l5.text' },
};

/** Every check met → met; any check not met → open; otherwise (some not read) → not read. */
export const allOf = (...checks: (boolean | null)[]): CriterionState =>
  checks.some((check) => check === false) ? 'open' : checks.every((check) => check === true) ? 'met' : 'unread';

const share = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
const pct = (value: number) => String(value);

export function maturity(signals: AssessmentSignals, coverageIndex: number | null = null): MaturityReading {
  const modes = signals.hostModes;
  const reported = modes === null ? 0 : modes.fullStack + modes.infra + modes.other;
  const fullStack = modes === null || reported === 0 ? null : share(modes.fullStack, reported);
  const fullStackAtLeast = (line: number) => (fullStack === null ? null : fullStack >= line);
  const indexAtLeast = (line: number) => (coverageIndex === null ? null : coverageIndex >= line);
  const logContext =
    signals.logRecords === null || signals.logRecordsWithContext === null || signals.logRecords === 0
      ? null
      : share(signals.logRecordsWithContext, signals.logRecords);
  const logContextAtLeast = (line: number) => (logContext === null ? null : logContext >= line);
  const owned = signals.ownedServices === null || signals.servicesInModel === null || signals.servicesInModel === 0 ? null : share(signals.ownedServices, signals.servicesInModel);
  const ownedAtLeast = (line: number) => (owned === null ? null : owned >= line);
  const rumShare =
    signals.webApps === null || signals.frontendsWithRealUsers === null
      ? null
      : signals.webApps === 0
        ? signals.frontendsWithRealUsers > 0
          ? 100
          : 0
        : share(Math.min(signals.frontendsWithRealUsers, signals.webApps), signals.webApps);
  const rumAtLeast = (line: number) => (rumShare === null ? null : rumShare >= line);
  const mttrAtMost = (line: number) => (signals.resolved === null ? null : signals.resolved.problems > 0 && signals.resolved.meanHours <= line);
  const workflowsSucceed =
    signals.workflows === null
      ? null
      : signals.workflows.executions > 0 && share(signals.workflows.succeeded, signals.workflows.executions) >= assumed('assessment.strength.workflows');
  const clustersReporting =
    signals.clusters === null ? null : signals.clusters === 0 || (signals.clustersWithMetrics !== null && signals.clustersWithMetrics >= signals.clusters);

  const L = {
    fs3: assumed('maturity.fullStack.proficient'),
    fs4: assumed('maturity.fullStack.strategic'),
    fs5: assumed('maturity.fullStack.visionary'),
    good: assumed('assessment.band.good'),
    excellent: assumed('assessment.band.excellent'),
    ctx3: assumed('findings.logContext.low'),
    ctx4: assumed('maturity.logContext.strategic'),
    ctx5: assumed('maturity.logContext.visionary'),
    own4: assumed('assessment.ownership.min'),
    own5: assumed('maturity.ownership.visionary'),
    rum4: assumed('maturity.rum.strategic'),
    rum5: assumed('maturity.rum.visionary'),
    wf5: assumed('maturity.automation.visionary'),
  };

  const criteria: MaturityCriterion[] = [
    // ---------------------------------------------------------------- 2 — Foundational: the base is in view
    {
      id: 'visibility2',
      pillar: 'visibility',
      level: 2,
      params: {},
      state: allOf(modes === null ? null : modes.fullStack + modes.infra > 0, signals.servicesWithTraffic === null ? null : signals.servicesWithTraffic > 0),
    },
    { id: 'context2', pillar: 'context', level: 2, params: {}, state: allOf(signals.logRecords === null ? null : signals.logRecords > 0) },
    {
      id: 'experience2',
      pillar: 'experience',
      level: 2,
      params: {},
      state: allOf(
        signals.webApps === null && signals.syntheticMonitors === null
          ? null
          : (signals.webApps ?? 0) > 0 || (signals.syntheticMonitors ?? 0) > 0 || (signals.frontendsWithRealUsers ?? 0) > 0,
      ),
    },
    { id: 'operations2', pillar: 'operations', level: 2, params: {}, state: allOf(signals.resolved === null ? null : signals.resolved.problems > 0) },
    // ---------------------------------------------------------------- 3 — Proficient: unified and in real time
    { id: 'visibility3', pillar: 'visibility', level: 3, params: { fs: pct(L.fs3), index: pct(L.good) }, state: allOf(fullStackAtLeast(L.fs3), indexAtLeast(L.good)) },
    {
      id: 'context3',
      pillar: 'context',
      level: 3,
      params: { ctx: pct(L.ctx3) },
      state: allOf(logContextAtLeast(L.ctx3), signals.thirdPartyTools === null ? null : signals.thirdPartyTools.length === 0),
    },
    { id: 'experience3', pillar: 'experience', level: 3, params: {}, state: allOf(signals.frontendsWithRealUsers === null ? null : signals.frontendsWithRealUsers > 0) },
    { id: 'operations3', pillar: 'operations', level: 3, params: { h: String(assumed('problems.mttr.attention')) }, state: allOf(mttrAtMost(assumed('problems.mttr.attention'))) },
    // ---------------------------------------------------------------- 4 — Strategic: preventive, AI-driven, governed
    { id: 'visibility4', pillar: 'visibility', level: 4, params: { fs: pct(L.fs4) }, state: allOf(fullStackAtLeast(L.fs4), clustersReporting) },
    { id: 'context4', pillar: 'context', level: 4, params: { ctx: pct(L.ctx4), own: pct(L.own4) }, state: allOf(logContextAtLeast(L.ctx4), ownedAtLeast(L.own4)) },
    {
      id: 'experience4',
      pillar: 'experience',
      level: 4,
      params: { rum: pct(L.rum4) },
      state: allOf(rumAtLeast(L.rum4), signals.syntheticMonitors === null ? null : signals.syntheticMonitors > 0),
    },
    { id: 'operations4', pillar: 'operations', level: 4, params: {}, state: allOf(workflowsSucceed, signals.vulnerabilities === null ? null : true) },
    // ---------------------------------------------------------------- 5 — Visionary: the control plane
    { id: 'visibility5', pillar: 'visibility', level: 5, params: { fs: pct(L.fs5), index: pct(L.excellent) }, state: allOf(fullStackAtLeast(L.fs5), indexAtLeast(L.excellent)) },
    { id: 'context5', pillar: 'context', level: 5, params: { ctx: pct(L.ctx5), own: pct(L.own5) }, state: allOf(logContextAtLeast(L.ctx5), ownedAtLeast(L.own5)) },
    {
      id: 'experience5',
      pillar: 'experience',
      level: 5,
      params: { rum: pct(L.rum5) },
      state: allOf(rumAtLeast(L.rum5), signals.bizEvents === null ? null : signals.bizEvents > 0),
    },
    {
      id: 'operations5',
      pillar: 'operations',
      level: 5,
      params: { h: String(assumed('problems.mttr.good')), wf: String(L.wf5) },
      state: allOf(
        mttrAtMost(assumed('problems.mttr.good')),
        workflowsSucceed === null || signals.workflows === null ? null : workflowsSucceed && signals.workflows.workflows >= L.wf5,
        signals.vulnerabilities === null ? null : signals.vulnerabilities.actNow === 0,
      ),
    },
  ];

  const perLevel = ([1, 2, 3, 4, 5] as const).map((level) => {
    const inLevel = criteria.filter((criterion) => criterion.level === level);
    return {
      level,
      met: inLevel.filter((criterion) => criterion.state === 'met').length,
      open: inLevel.filter((criterion) => criterion.state === 'open').length,
      unread: inLevel.filter((criterion) => criterion.state === 'unread').length,
      total: inLevel.length,
    };
  });

  let level: MaturityLevel = 1;
  for (const entry of perLevel.slice(1)) {
    if (entry.met === entry.total) level = entry.level;
    else break;
  }
  const next = perLevel.find((entry) => entry.level === level + 1);

  const pillars = PILLARS.map((pillar) => {
    let reached: MaturityLevel = 1;
    for (const step of [2, 3, 4, 5] as const) {
      if (criteria.find((criterion) => criterion.pillar === pillar && criterion.level === step)?.state === 'met') reached = step;
      else break;
    }
    return { pillar, level: reached };
  });

  return { level, mayBeHigher: next !== undefined && next.unread > 0 && next.open === 0, criteria, perLevel, pillars };
}
