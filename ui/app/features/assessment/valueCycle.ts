import { assumed } from '../../config/assumptions';
import type { StringKey } from '../../i18n/strings';
import type { AssessmentSignals } from './findings';

/**
 * 3.7.9 — the Autonomous Value Cycle (the owner's CVA framework document, approved 2026-11-23 with the
 * decisions D1–D3 as recommended), in place of the maturity journey on the Coverage page: "a escada mede onde o cliente
 * falha; o ciclo mede o que ele já ganhou".
 *
 * The Foundation, then five links — Context, Cause, Impact, Action, Prevention — each answering one question, each with
 * its value event. A value event is **demonstrated** when a read the app already does proves it (nothing new is queried),
 * a **next wave** when the read answered and does not prove it yet (an opportunity with an owner, never a failure), and
 * left out when its read did not answer. The count of value events demonstrated only grows over a PoC. There is no level,
 * no step, no score: the autonomy ladder (Observe → Explain → Prioritise → Propose → Act) shows the rungs the PoC
 * demonstrated and the target the SE agreed with the customer for this PoC (D2).
 */

export type CycleLink = 'foundation' | 'context' | 'cause' | 'impact' | 'action' | 'prevention';
export const CYCLE_LINKS: readonly CycleLink[] = ['foundation', 'context', 'cause', 'impact', 'action', 'prevention'];
/** The five links of the ring (the Foundation sits in its centre). */
export const RING_LINKS: readonly Exclude<CycleLink, 'foundation'>[] = ['context', 'cause', 'impact', 'action', 'prevention'];

export type EventState = 'demonstrated' | 'next';

export interface ValueEvent {
  /** `cycle.ev.<id>`: the event's words; `cycle.ev.<id>.next` when it is still the next wave. */
  id: string;
  link: CycleLink;
  state: EventState;
  /** The measured figure beside it ("62 hosts · 70 services"), already formatted by the caller's `fig` — or none. */
  figure: { key: StringKey; params: Record<string, number> } | null;
}

export type AutonomyRung = 'observe' | 'explain' | 'prioritise' | 'propose' | 'act';
export const AUTONOMY_RUNGS: readonly AutonomyRung[] = ['observe', 'explain', 'prioritise', 'propose', 'act'];

export interface CycleExtras {
  /** What the PoC Builder created on the tenant (the register). */
  dashboards: number;
  slos: number;
  monitors: number;
  detectors: number;
  pipeline: boolean;
  /** The PoC plan: dates and agreed criteria. */
  planDates: boolean;
  criteria: number;
  /** Services sending generative-AI tokens (`ai.tokens`), null when not read. */
  aiServices: number | null;
}

export interface ValueCycleReading {
  events: ValueEvent[];
  /** Value events demonstrated, per link and in all. */
  demonstrated: Record<CycleLink, number>;
  total: number;
  /** The rungs of the ladder the PoC demonstrated, in order (a rung counts when the ones below it do). */
  rungs: AutonomyRung[];
  lenses: { ai: { services: number } | null; security: { total: number; actNow: number } | null };
}

const share = (part: number, whole: number) => (whole === 0 ? 0 : (100 * part) / whole);

/** The value cycle of what was read. Pure. */
export function valueCycle(signals: AssessmentSignals, extras: CycleExtras): ValueCycleReading {
  const events: ValueEvent[] = [];
  const push = (id: string, link: CycleLink, proven: boolean | null, figure: ValueEvent['figure'] = null) => {
    if (proven === null) return;
    events.push({ id, link, state: proven ? 'demonstrated' : 'next', figure: proven ? figure : null });
  };
  const modes = signals.hostModes;
  const hosts = modes === null ? null : modes.fullStack + modes.infra + modes.other;
  const fullStack = modes === null || hosts === null || hosts === 0 ? null : share(modes.fullStack, hosts);
  const logContext = signals.logRecords === null || signals.logRecordsWithContext === null || signals.logRecords === 0 ? null : share(signals.logRecordsWithContext, signals.logRecords);
  const owned = signals.ownedServices === null || signals.servicesInModel === null || signals.servicesInModel === 0 ? null : share(signals.ownedServices, signals.servicesInModel);

  // 00 — Foundation: the PoC's plan agreed, the data arriving.
  push('plan', 'foundation', extras.planDates && extras.criteria > 0, { key: 'cycle.fig.criteria', params: { n: extras.criteria } });
  push('data', 'foundation', hosts === null && signals.logRecords === null ? null : (hosts ?? 0) > 0 || (signals.logRecords ?? 0) > 0);

  // 01 — Context: what exists and who owns it.
  push('mapped', 'context', hosts === null || signals.servicesWithTraffic === null ? null : hosts > 0 && signals.servicesWithTraffic > 0, {
    key: 'cycle.fig.mapped',
    params: { hosts: hosts ?? 0, services: signals.servicesWithTraffic ?? 0 },
  });
  push('fullStack', 'context', fullStack === null ? null : fullStack >= assumed('maturity.fullStack.proficient'), { key: 'cycle.fig.pct', params: { pct: Math.round(fullStack ?? 0) } });
  push('logContext', 'context', logContext === null ? null : logContext >= assumed('findings.logContext.low'), { key: 'cycle.fig.pct', params: { pct: Math.round(logContext ?? 0) } });
  push('owners', 'context', owned === null ? null : owned >= assumed('assessment.ownership.min'), { key: 'cycle.fig.pct', params: { pct: Math.round(owned ?? 0) } });
  push('dashboards', 'context', extras.dashboards > 0, { key: 'cycle.fig.count', params: { n: extras.dashboards } });
  push('pipeline', 'context', extras.pipeline);

  // 02 — Cause: why it happened.
  push('problems', 'cause', signals.resolved === null ? null : signals.resolved.problems > 0, { key: 'cycle.fig.count', params: { n: signals.resolved?.problems ?? 0 } });
  push('resolved', 'cause', signals.resolved === null || signals.resolved.problems === 0 ? null : signals.resolved.meanHours <= assumed('problems.mttr.attention'), {
    key: 'cycle.fig.hours',
    params: { h: Math.round((signals.resolved?.meanHours ?? 0) * 10) / 10 },
  });
  push('dependencies', 'cause', signals.topology === null ? null : signals.topology.services > 0, { key: 'cycle.fig.count', params: { n: signals.topology?.services ?? 0 } });
  push('detectors', 'cause', extras.detectors > 0, { key: 'cycle.fig.count', params: { n: extras.detectors } });

  // 03 — Impact: who was affected, and how much.
  push('realUsers', 'impact', signals.frontendsWithRealUsers === null ? null : signals.frontendsWithRealUsers > 0, { key: 'cycle.fig.count', params: { n: signals.frontendsWithRealUsers ?? 0 } });
  push('vitals', 'impact', signals.vitals === null ? null : signals.vitals.measured > 0, { key: 'cycle.fig.count', params: { n: signals.vitals?.measured ?? 0 } });
  const synthetic = signals.syntheticMonitors === null ? null : signals.syntheticMonitors + extras.monitors;
  push('synthetic', 'impact', synthetic === null ? (extras.monitors > 0 ? true : null) : synthetic > 0, { key: 'cycle.fig.count', params: { n: synthetic ?? extras.monitors } });
  push('business', 'impact', signals.bizEvents === null ? null : signals.bizEvents > 0, { key: 'cycle.fig.count', params: { n: signals.bizEvents ?? 0 } });

  // 04 — Action: what to do, and who does it.
  const workflows = signals.workflows;
  push('workflows', 'action', workflows === null ? null : workflows.executions > 0, { key: 'cycle.fig.runs', params: { n: workflows?.executions ?? 0 } });
  push(
    'automationRate',
    'action',
    workflows === null || workflows.executions === 0 ? null : share(workflows.succeeded, workflows.executions) >= assumed('assessment.strength.workflows'),
    { key: 'cycle.fig.pct', params: { pct: workflows === null || workflows.executions === 0 ? 0 : Math.round(share(workflows.succeeded, workflows.executions)) } },
  );

  // 05 — Prevention: how to avoid it happening again.
  push('slos', 'prevention', extras.slos > 0, { key: 'cycle.fig.count', params: { n: extras.slos } });
  push('runtimeSecurity', 'prevention', signals.vulnerabilities === null ? null : true, { key: 'cycle.fig.count', params: { n: signals.vulnerabilities?.total ?? 0 } });

  const demonstrated = Object.fromEntries(CYCLE_LINKS.map((link) => [link, events.filter((event) => event.link === link && event.state === 'demonstrated').length])) as Record<CycleLink, number>;
  const total = Object.values(demonstrated).reduce((sum, n) => sum + n, 0);

  // The ladder: a rung counts when the PoC demonstrated it and every rung below it. "Act" (low-risk actions run on their
  // own by a pre-approved rule) is never inferred from a read: it is only ever the agreed target.
  const proven = (id: string) => events.some((event) => event.id === id && event.state === 'demonstrated');
  const ladder: [AutonomyRung, boolean][] = [
    ['observe', proven('mapped') || proven('data')],
    ['explain', proven('problems')],
    ['prioritise', proven('realUsers') || proven('business') || proven('synthetic')],
    ['propose', proven('workflows')],
  ];
  const rungs: AutonomyRung[] = [];
  for (const [rung, ok] of ladder) {
    if (!ok) break;
    rungs.push(rung);
  }

  return {
    events,
    demonstrated,
    total,
    rungs,
    lenses: {
      ai: extras.aiServices === null || extras.aiServices === 0 ? null : { services: extras.aiServices },
      security: signals.vulnerabilities === null ? null : { total: signals.vulnerabilities.total, actNow: signals.vulnerabilities.actNow },
    },
  };
}

/** Each link's question, value event, next waves and Professional Services offer (`cycle.<link>.*`). */
export const LINK_KEY: Record<CycleLink, { name: StringKey; question: StringKey; value: StringKey; ps: StringKey }> = {
  foundation: { name: 'cycle.foundation.name', question: 'cycle.foundation.question', value: 'cycle.foundation.value', ps: 'cycle.foundation.ps' },
  context: { name: 'cycle.context.name', question: 'cycle.context.question', value: 'cycle.context.value', ps: 'cycle.context.ps' },
  cause: { name: 'cycle.cause.name', question: 'cycle.cause.question', value: 'cycle.cause.value', ps: 'cycle.cause.ps' },
  impact: { name: 'cycle.impact.name', question: 'cycle.impact.question', value: 'cycle.impact.value', ps: 'cycle.impact.ps' },
  action: { name: 'cycle.action.name', question: 'cycle.action.question', value: 'cycle.action.value', ps: 'cycle.action.ps' },
  prevention: { name: 'cycle.prevention.name', question: 'cycle.prevention.question', value: 'cycle.prevention.value', ps: 'cycle.prevention.ps' },
};

/** The next wave every link always offers, with Dynatrace (whatever the PoC already showed). */
export const LINK_ONWARD: Record<CycleLink, StringKey> = {
  foundation: 'cycle.foundation.onward',
  context: 'cycle.context.onward',
  cause: 'cycle.cause.onward',
  impact: 'cycle.impact.onward',
  action: 'cycle.action.onward',
  prevention: 'cycle.prevention.onward',
};

export const RUNG_KEY: Record<AutonomyRung, StringKey> = {
  observe: 'cycle.rung.observe',
  explain: 'cycle.rung.explain',
  prioritise: 'cycle.rung.prioritise',
  propose: 'cycle.rung.propose',
  act: 'cycle.rung.act',
};

/** A stored autonomy target, or null for anything else. */
export function parseAutonomyTarget(value: unknown): AutonomyRung | null {
  return typeof value === 'string' && (AUTONOMY_RUNGS as readonly string[]).includes(value) ? (value as AutonomyRung) : null;
}
