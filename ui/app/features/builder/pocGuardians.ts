import { platformUrl } from '../../utils/deepLinks';
import type { PocSloRef, SloKind } from '../../models/pocPlan';
import { SLO_TAG, sloIndicator, type ScheduleTrigger, type WorkflowBody } from './pocAutomation';
import { serviceFilter } from './pocSettings';

/**
 * 3.8.3 (the owner, 2026-11-27: "uma guia no PoC Builder para 'Guardian' … um de SLOs, um de performance de infra, serviços,
 * aplicações e um quinto guardian de segurança para parte de vulnerabilidades"): five Site Reliability Guardians, each a
 * settings object of the Site Reliability Guardian app (`app:dynatrace.site.reliability.guardian:guardians`), created by the
 * app only on the SE's click after a confirmation (`settings:objects:write`, declared since 3.7.4), kept in the PoC's register
 * and removed by the clean-up; and a validation workflow handed to the Workflows app, which runs the guardians every day.
 *
 * Read on the lab on 2026-11-27 (nothing written): the schema (objectives of type DQL or REFERENCE_SLO, a comparison operator,
 * a target — the line that fails — and a warning), a guardian of this shape passed `dtctl create settings --validate-only`;
 * REFERENCE_SLO accepts only a classic SLO's metric key (`func:slo.…`), not the platform SLOs the PoC Builder creates, so the
 * SLO guardian evaluates each PoC SLO's own indicator as a DQL objective. Every objective's query was run on the lab over 24 h:
 * the metric ones at 0 B; the security ones read the last 2 h of vulnerability reports (0.29 GB each, the same counts as 24 h,
 * which read 3.4 GB). The validation action's inputs were read from the lab's own guardian workflows.
 */

export const GUARDIAN_SCHEMA = 'app:dynatrace.site.reliability.guardian:guardians';
export const GUARDIAN_KINDS = ['slos', 'infra', 'services', 'apps', 'security'] as const;
export type GuardianKind = (typeof GUARDIAN_KINDS)[number];

/** The platform's workflow action that runs a guardian. */
export const VALIDATE_ACTION = 'dynatrace.site.reliability.guardian:validate-guardian-action';
/** Every day at 08:00 in the SE's browser time zone, over the last 24 hours. */
export const GUARDIAN_CRON = '0 8 * * *';
export const GUARDIAN_WINDOW = { from: 'now()-24h', to: 'now()' } as const;

type Unit = { base: string; decimals: number; display: string };
const PERCENT: Unit = { base: 'Percent', decimals: 1, display: 'Percent' };
const MICRO: Unit = { base: 'MicroSecond', decimals: 0, display: 'MilliSecond' };
const MILLI: Unit = { base: 'MilliSecond', decimals: 0, display: 'MilliSecond' };
const COUNT: Unit = { base: 'Count', decimals: 0, display: 'Count' };

export interface GuardianObjective {
  name: string;
  description: string;
  objectiveType: 'DQL';
  dqlQuery: string;
  comparisonOperator: 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN_OR_EQUAL';
  target: number;
  warning: number | null;
  displayUnit: Unit;
  links: never[];
  segments: never[];
}

export interface GuardianValue {
  name: string;
  description: string;
  tags: string[];
  eventKind: 'BIZ_EVENT';
  variables: never[];
  objectives: GuardianObjective[];
}

/** One objective as the app defines it: its key (for its words), query, direction, lines and unit. */
interface ObjectiveSpec {
  key: string;
  dql: string;
  op: GuardianObjective['comparisonOperator'];
  target: number;
  warning: number | null;
  unit: Unit;
}

const AT_MOST = 'LESS_THAN_OR_EQUAL' as const;
const AT_LEAST = 'GREATER_THAN_OR_EQUAL' as const;

/** Container mounts left out of the disks (as the capacity forecast does). */
const DISK_FILTER =
  '| fieldsAdd disk = entityName(dt.entity.disk)\n| filter isNull(disk) or not(matchesValue(disk, "/var/lib/docker*") or matchesValue(disk, "/var/lib/containerd*") or matchesValue(disk, "/var/lib/kubelet*") or matchesValue(disk, "/snap/*"))';
const REAL_USERS = 'filter: (dt.rum.user_type == "real_user")';

/** The vulnerabilities still open and not muted, from the last 2 h of state reports (each vulnerability reported in it). */
const OPEN_VULNERABILITIES = [
  'fetch security.events, from: now()-2h',
  '| filter event.provider == "Dynatrace" and event.type == "VULNERABILITY_STATE_REPORT_EVENT" and event.level == "ENTITY"',
  '| dedup {vulnerability.display_id, affected_entity.id}, sort:{timestamp desc}',
  '| filter vulnerability.resolution.status == "OPEN" and vulnerability.mute.status != "MUTED"',
].join('\n');

/** The lines each guardian starts with — a starting point the SE tunes in the Site Reliability Guardian app. */
export const GUARDIAN_LINES = {
  hostCpu: { target: 90, warning: 80 },
  hostMemory: { target: 90, warning: 80 },
  disk: { target: 95, warning: 90 },
  failureRate: { target: 5, warning: 2 },
  responseTimeUs: { target: 1_000_000, warning: 800_000 },
  lcpMs: { target: 4000, warning: 2500 },
  frustrated: { target: 15, warning: 5 },
  requestErrors: { target: 5, warning: 2 },
  critical: { target: 0, warning: null },
  actNow: { target: 0, warning: null },
  high: { target: 10, warning: 5 },
} as const;

/** The SLO targets of the PoC Builder's SLOs (the same as the SLO kit's). */
export type SloTargetsOf = (kind: SloKind) => { target: number; warning: number };

/** The objectives of a guardian. Pure; an empty list when there is nothing to evaluate (the SLO guardian with no SLO). */
export function guardianSpecs(kind: GuardianKind, context: { slos: readonly PocSloRef[]; serviceIds: readonly string[]; targets: SloTargetsOf }): ObjectiveSpec[] {
  const L = GUARDIAN_LINES;
  if (kind === 'slos') {
    return context.slos.flatMap((slo) => {
      const indicator = sloIndicator(slo.kind, slo.serviceId);
      if (indicator === null) return [];
      const lines = context.targets(slo.kind);
      return [{ key: `slo:${slo.id}`, dql: `${indicator}\n| summarize sli = avg(arrayAvg(sli))`, op: AT_LEAST, target: lines.target, warning: lines.warning, unit: PERCENT }];
    });
  }
  if (kind === 'infra') {
    return [
      { key: 'hostCpu', dql: 'timeseries cpu = avg(dt.host.cpu.usage), by: { dt.entity.host }\n| summarize busiest = max(arrayAvg(cpu))', op: AT_MOST, ...L.hostCpu, unit: PERCENT },
      { key: 'hostMemory', dql: 'timeseries mem = avg(dt.host.memory.usage), by: { dt.entity.host }\n| summarize busiest = max(arrayAvg(mem))', op: AT_MOST, ...L.hostMemory, unit: PERCENT },
      { key: 'disk', dql: `timeseries used = avg(dt.host.disk.used.percent), by: { dt.entity.host, dt.entity.disk }\n${DISK_FILTER}\n| summarize fullest = max(arrayAvg(used))`, op: AT_MOST, ...L.disk, unit: PERCENT },
    ];
  }
  if (kind === 'services') {
    const filter = serviceFilter(context.serviceIds);
    return [
      {
        key: 'failureRate',
        dql: `timeseries { total = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }${filter}\n| fields failureRate = 100.0 * failures / total`,
        op: AT_MOST,
        ...L.failureRate,
        unit: PERCENT,
      },
      { key: 'responseTime', dql: `timeseries p90 = percentile(dt.service.request.response_time, 90, scalar: true)${filter}\n| fields p90`, op: AT_MOST, ...L.responseTimeUs, unit: MICRO },
    ];
  }
  if (kind === 'apps') {
    return [
      { key: 'lcp', dql: `timeseries lcp = percentile(dt.frontend.web.page.largest_contentful_paint, 75, rollup: avg, scalar: true), ${REAL_USERS}\n| fields lcp`, op: AT_MOST, ...L.lcpMs, unit: MILLI },
      {
        key: 'frustrated',
        dql: `timeseries w = sum(dt.frontend.experience.weight, scalar: true), by: { experience.level }, ${REAL_USERS}\n| summarize frustrated = 100.0 * sum(if(experience.level == "frustrated", w, else: 0)) / sum(w)`,
        op: AT_MOST,
        ...L.frustrated,
        unit: PERCENT,
      },
      {
        key: 'requestErrors',
        dql: `timeseries { requests = sum(dt.frontend.request.count, scalar: true), errors = sum(dt.frontend.error.count, scalar: true) }, ${REAL_USERS}\n| fields requestErrors = 100.0 * errors / requests`,
        op: AT_MOST,
        ...L.requestErrors,
        unit: PERCENT,
      },
    ];
  }
  return [
    { key: 'critical', dql: `${OPEN_VULNERABILITIES}\n| filter vulnerability.risk.level == "CRITICAL"\n| summarize critical = countDistinct(vulnerability.display_id)`, op: AT_MOST, ...L.critical, unit: COUNT },
    {
      key: 'actNow',
      dql: `${OPEN_VULNERABILITIES}\n| filter vulnerability.davis_assessment.exploit_status == "AVAILABLE" and vulnerability.davis_assessment.exposure_status == "PUBLIC_NETWORK" and vulnerability.davis_assessment.vulnerable_function_status == "IN_USE"\n| summarize actNow = countDistinct(vulnerability.display_id)`,
      op: AT_MOST,
      ...L.actNow,
      unit: COUNT,
    },
    { key: 'high', dql: `${OPEN_VULNERABILITIES}\n| filter vulnerability.risk.level == "HIGH"\n| summarize high = countDistinct(vulnerability.display_id)`, op: AT_MOST, ...L.high, unit: COUNT },
  ];
}

export interface GuardianWords {
  name: string;
  description: string;
  /** An objective's name and description by its key (`slo:<id>` for an SLO, with the SLO's own name). */
  objective: (key: string) => { name: string; description: string };
}

/** The guardian the platform stores, or null when it would have no objective. Pure. */
export function buildGuardian(kind: GuardianKind, context: Parameters<typeof guardianSpecs>[1], words: GuardianWords): GuardianValue | null {
  const specs = guardianSpecs(kind, context).slice(0, 50);
  if (specs.length === 0) return null;
  const seen = new Set<string>();
  const objectives = specs.map((spec, index): GuardianObjective => {
    const text = words.objective(spec.key);
    // The platform refuses two objectives of one name (two SLOs may share one).
    let name = text.name.slice(0, 190);
    if (seen.has(name)) name = `${name} (${index + 1})`;
    seen.add(name);
    return {
      name,
      description: text.description.slice(0, 250),
      objectiveType: 'DQL',
      dqlQuery: spec.dql,
      comparisonOperator: spec.op,
      target: spec.target,
      warning: spec.warning,
      displayUnit: spec.unit,
      links: [],
      segments: [],
    };
  });
  return { name: words.name.slice(0, 200), description: words.description.slice(0, 250), tags: [SLO_TAG], eventKind: 'BIZ_EVENT', variables: [], objectives };
}

/** A guardian's validations in the Site Reliability Guardian app (its documented intent). */
export const guardianLink = (id: string) =>
  platformUrl(`dynatrace.site.reliability.guardian/intent/view_validation#${encodeURIComponent(JSON.stringify({ 'guardian.id': id }))}`) ?? '';

export interface GuardianWorkflowWords {
  title: string;
  description: string;
  /** A validation task's description, by the guardian's name. */
  task: (name: string) => string;
}

/**
 * The validation workflow: every day at 08:00 in the SE's time zone, one task per guardian the PoC created, each validating
 * the last 24 hours (the inputs the lab's own guardian workflows use). The results stay in the Site Reliability Guardian app
 * and in Grail. Handed to the Workflows app by its intent, or downloaded — never written by the app. Pure.
 */
export function buildGuardianWorkflow(
  guardians: readonly { id: string; name: string; kind: string }[],
  choice: { shared: boolean; timezone: string },
  words: GuardianWorkflowWords,
): WorkflowBody<ScheduleTrigger> {
  const tasks: WorkflowBody<ScheduleTrigger>['tasks'] = {};
  guardians.forEach((guardian, index) => {
    // One guardian per kind, so the kind names its task.
    const name = `validate_${guardian.kind.replace(/[^a-z0-9]/gi, '_')}`;
    tasks[name] = {
      name,
      action: VALIDATE_ACTION,
      description: words.task(guardian.name).slice(0, 200),
      input: { executionId: '{{ execution().id }}', objectId: guardian.id, timeframeInputType: 'timeframeSelector', timeframeSelector: { ...GUARDIAN_WINDOW } },
      position: { x: index, y: 1 },
      predecessors: [],
    };
  });
  return {
    title: words.title.slice(0, 200),
    description: words.description.slice(0, 500),
    isPrivate: !choice.shared,
    trigger: {
      schedule: {
        isActive: true,
        isFaulty: false,
        timezone: choice.timezone === '' ? 'UTC' : choice.timezone,
        trigger: { type: 'cron', cron: GUARDIAN_CRON },
        filterParameters: {},
        inputs: {},
      },
    },
    tasks,
  };
}
