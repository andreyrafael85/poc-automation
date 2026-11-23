import { assumed } from '../../config/assumptions';
import type { StringKey } from '../../i18n/strings';
import { decimal } from '../../utils/activeLocale';
import {
  deriveInsights,
  EN_TEXT,
  type Insight,
  type InsightCategory,
  type InsightSignals,
  type InsightText,
  type Qualitative,
} from '../insights/deriveInsights';

/**
 * The Assessment's findings (3.4.0, proposal §C3): one list, each finding classed Critical,
 * Attention, Opportunity or Strength, with what was measured, the possible impact, the
 * recommendation, the Dynatrace capability it relates to and the catalog queries behind it.
 *
 * Two sources, one result: the twelve rules every synthesis page already uses (`deriveInsights`,
 * unchanged — the same finding reads the same on Opportunities, Roadmap and here) are given their
 * class and capability, and the rules only the Assessment needs (coverage depth, idle services,
 * clusters without metrics, frontends without real users, synthetic checks, business events,
 * saturated hosts and the strengths) are evaluated on the exact counts of aggregate queries.
 *
 * Every rule fires only when its signal was read; a signal that was not read produces nothing,
 * never a "0" finding (rule 8). No rule carries money (rule 6): the billing-framed rule
 * (`improve-query-efficiency`) stays with the SE on the commercial pages.
 */

export type FindingClass = 'critical' | 'warning' | 'opportunity' | 'strength';

export const CLASS_ORDER: readonly FindingClass[] = ['critical', 'warning', 'opportunity', 'strength'];

export interface AssessmentFinding {
  /** Stable rule id (ASM-01…, STR-01…), as in the proposal's rule catalogue. */
  rule: string;
  cls: FindingClass;
  /** `gap` = a limit of this reading (access, permission), not a statement about the environment. */
  kind: 'finding' | 'gap';
  title: string;
  observation: string;
  impact: string;
  recommendation: string;
  /** The Dynatrace capability the finding relates to, already translated. */
  capability: string;
  /** 3.4.6: the capability's key, which names its documentation page (`docLinks.ts`). */
  capabilityKey: StringKey;
  evidence: readonly string[];
  category: InsightCategory;
  impactLevel: Qualitative;
  effort: Qualitative;
  /** In-app route that shows the evidence. */
  drilldown: string;
}

/** Signals only the Assessment reads, every count exact (aggregate queries) or null when unread. */
export interface AssessmentSignals {
  /** Hosts by monitoring mode (`cov.hosts.breakdown`); `unknown` = the attribute was not reported. */
  hostModes: { fullStack: number; infra: number; other: number; unknown: number } | null;
  /** Services in the entity model (`svc.topology.total`). */
  servicesInModel: number | null;
  /** Services that handled traffic in the window, and those above the 1 % line (`svc.ranking.total`). */
  servicesWithTraffic: number | null;
  servicesAboveOnePct: number | null;
  /** Kubernetes clusters in the model (`k8s.inventory`) and those reporting container metrics (`k8s.cluster.ids`). */
  clusters: number | null;
  clustersWithMetrics: number | null;
  /** Web applications (`cov.inventory`) and frontends with real-user traffic (`rum.scorecard`). */
  webApps: number | null;
  frontendsWithRealUsers: number | null;
  /** Synthetic monitors (`cov.inventory`) and services with a public domain (`svc.topology.total`). */
  syntheticMonitors: number | null;
  publicDomainServices: number | null;
  /** Business events captured (`biz.events.total`). */
  bizEvents: number | null;
  /** Hosts saturated at peak (`infra.capacity.summary`). */
  saturatedHosts: number | null;
  /** Closed problems with a measured resolution time and their mean, in hours (`prob.mttx`). */
  resolved: { problems: number; meanHours: number } | null;
  // ---- 3.4.1: more of the existing catalog, for a detailed reading of an existing environment
  /** Log records read and those with service context (`log.quality`). */
  logRecords: number | null;
  logRecordsWithContext: number | null;
  /** The busiest services by connections and the model's totals (`ev.topology.hubs`, entity model). */
  topology: { hubs: { name: string; callers: number; callees: number }[]; services: number; isolated: number; dbServices: number } | null;
  /** Open vulnerabilities, those to act on now and those of critical level (`sec.posture`, exact). */
  vulnerabilities: { total: number; actNow: number; critical: number } | null;
  /** Services carrying an owner or team tag (`svc.owners`). */
  ownedServices: number | null;
  /** Third-party monitoring tools detected as running processes (`comp.agents`). */
  thirdPartyTools: string[] | null;
  /** Frontends with Core Web Vitals read, and those with LCP or INP rated poor (`rum.webvitals`). */
  vitals: { measured: number; poor: number } | null;
  /** Workflows executed in the window, their runs and the successful runs (`auto.workflows.total`). */
  workflows: { workflows: number; executions: number; succeeded: number } | null;
  /** Hosts per cloud provider (`cloud.hosts`). */
  cloudProviders: { provider: string; hosts: number }[] | null;
}

interface InsightMapping {
  rule: string;
  cls: FindingClass;
  kind: 'finding' | 'gap';
  capability: StringKey;
}

/** The twelve shared rules, as the Assessment classes them. `improve-query-efficiency` is left out (rule 6). */
const INSIGHT_RULES: Readonly<Record<string, InsightMapping>> = {
  'investigate-failing-service': { rule: 'ASM-04', cls: 'warning', kind: 'finding', capability: 'asm.cap.tracing' },
  'enrich-log-context': { rule: 'ASM-10', cls: 'warning', kind: 'finding', capability: 'asm.cap.logs' },
  'classify-log-severity': { rule: 'ASM-11', cls: 'warning', kind: 'finding', capability: 'asm.cap.openpipeline' },
  'stabilise-restarting-workload': { rule: 'ASM-13', cls: 'critical', kind: 'finding', capability: 'asm.cap.kubernetes' },
  'review-resource-limits': { rule: 'ASM-14', cls: 'warning', kind: 'finding', capability: 'asm.cap.kubernetes' },
  'automate-recurring-problem': { rule: 'ASM-19', cls: 'opportunity', kind: 'finding', capability: 'asm.cap.workflows' },
  'resolve-access-gaps': { rule: 'ASM-20', cls: 'warning', kind: 'gap', capability: 'asm.cap.grail' },
  'enable-security-visibility': { rule: 'ASM-21', cls: 'warning', kind: 'gap', capability: 'asm.cap.security' },
  'fix-failing-workflows': { rule: 'ASM-23', cls: 'warning', kind: 'finding', capability: 'asm.cap.workflows' },
  'instrument-user-journey': { rule: 'ASM-24', cls: 'opportunity', kind: 'gap', capability: 'asm.cap.rum' },
  'consolidate-empty-buckets': { rule: 'ASM-25', cls: 'opportunity', kind: 'finding', capability: 'asm.cap.grail' },
};

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

function fromInsight(insight: Insight, signals: AssessmentSignals, t: InsightText['t']): AssessmentFinding | null {
  const mapping = INSIGHT_RULES[insight.id];
  if (mapping === undefined) return null;
  // ASM-04: many services above the line at once is critical; one or a few is attention.
  const cls =
    mapping.rule === 'ASM-04' && signals.servicesAboveOnePct !== null && signals.servicesAboveOnePct >= assumed('assessment.failing.critical')
      ? 'critical'
      : mapping.cls;
  return {
    rule: mapping.rule,
    cls,
    kind: mapping.kind,
    title: insight.title,
    observation: insight.observation,
    impact: insight.consequence,
    recommendation: insight.recommendation,
    capability: t(mapping.capability),
    capabilityKey: mapping.capability,
    evidence: insight.evidence,
    category: insight.category,
    impactLevel: insight.impact,
    effort: insight.effort,
    drilldown: insight.drilldown,
  };
}

/** The rules only the Assessment evaluates, in rule order. */
function assessmentRules(signals: AssessmentSignals, text: InsightText): AssessmentFinding[] {
  const { t, formatNumber } = text;
  const out: AssessmentFinding[] = [];
  const add = (
    rule: string,
    cls: FindingClass,
    keyBase: string,
    params: Record<string, string>,
    rest: Pick<AssessmentFinding, 'evidence' | 'category' | 'impactLevel' | 'effort' | 'drilldown'> & { capability: StringKey },
  ) => {
    out.push({
      rule,
      cls,
      kind: 'finding',
      title: t(`${keyBase}.title` as StringKey, params),
      observation: t(`${keyBase}.obs` as StringKey, params),
      impact: t(`${keyBase}.impact` as StringKey, params),
      recommendation: t(`${keyBase}.rec` as StringKey, params),
      ...rest,
      capability: t(rest.capability),
      capabilityKey: rest.capability,
    });
  };

  const modes = signals.hostModes;
  if (modes !== null) {
    const reported = modes.fullStack + modes.infra + modes.other;
    // ASM-01 — hosts in infrastructure-only mode above the line.
    if (reported > 0 && pct(modes.infra, reported) > assumed('assessment.infraOnly.max')) {
      add('ASM-01', 'warning', 'asm.rule.infraOnly', { count: formatNumber(modes.infra), total: formatNumber(reported), pct: decimal(pct(modes.infra, reported), 0) }, {
        capability: 'asm.cap.oneagent',
        evidence: ['cov.hosts.breakdown'],
        category: 'coverage',
        impactLevel: 'high',
        effort: 'medium',
        drilldown: '/infrastructure',
      });
    }
    // ASM-02 — hosts whose mode was not reported: a gap in the data, never "unmonitored".
    if (modes.unknown > 0) {
      add('ASM-02', 'warning', 'asm.rule.modeUnknown', { count: formatNumber(modes.unknown) }, {
        capability: 'asm.cap.oneagent',
        evidence: ['cov.hosts.breakdown'],
        category: 'data-quality',
        impactLevel: 'low',
        effort: 'low',
        drilldown: '/coverage',
      });
    }
  }

  // ASM-03 — services in the model that handled no traffic in the window.
  if (signals.servicesInModel !== null && signals.servicesWithTraffic !== null && signals.servicesInModel > 0) {
    const idle = signals.servicesInModel - signals.servicesWithTraffic;
    if (idle > 0 && pct(idle, signals.servicesInModel) > assumed('assessment.idleServices.max')) {
      add('ASM-03', 'warning', 'asm.rule.idleServices', { count: formatNumber(idle), total: formatNumber(signals.servicesInModel), pct: decimal(pct(idle, signals.servicesInModel), 0) }, {
        capability: 'asm.cap.serviceDetection',
        evidence: ['svc.topology.total', 'svc.ranking.total'],
        category: 'coverage',
        impactLevel: 'medium',
        effort: 'medium',
        drilldown: '/services',
      });
    }
  }

  // ASM-12 — clusters in the model without container metrics.
  if (signals.clusters !== null && signals.clustersWithMetrics !== null && signals.clusters > signals.clustersWithMetrics) {
    add('ASM-12', 'warning', 'asm.rule.clusterMetrics', { count: formatNumber(signals.clusters - signals.clustersWithMetrics), total: formatNumber(signals.clusters) }, {
      capability: 'asm.cap.kubernetes',
      evidence: ['k8s.inventory', 'k8s.cluster.ids'],
      category: 'coverage',
      impactLevel: 'medium',
      effort: 'low',
      drilldown: '/kubernetes',
    });
  }

  // ASM-15 — web applications without real-user traffic in the window.
  if (signals.webApps !== null && signals.frontendsWithRealUsers !== null && signals.webApps > signals.frontendsWithRealUsers) {
    add('ASM-15', 'opportunity', 'asm.rule.rumApps', { count: formatNumber(signals.webApps - signals.frontendsWithRealUsers), total: formatNumber(signals.webApps) }, {
      capability: 'asm.cap.rum',
      evidence: ['cov.inventory', 'rum.scorecard'],
      category: 'experience',
      impactLevel: 'medium',
      effort: 'medium',
      drilldown: '/experience',
    });
  }

  // ASM-16 — something public to check and no synthetic monitor at all.
  if (signals.syntheticMonitors === 0 && ((signals.webApps ?? 0) > 0 || (signals.publicDomainServices ?? 0) > 0)) {
    add('ASM-16', 'opportunity', 'asm.rule.synthetic', { apps: formatNumber(signals.webApps ?? 0), domains: formatNumber(signals.publicDomainServices ?? 0) }, {
      capability: 'asm.cap.synthetic',
      evidence: ['cov.inventory', 'svc.topology.total'],
      category: 'experience',
      impactLevel: 'medium',
      effort: 'low',
      drilldown: '/experience',
    });
  }

  // ASM-18 — hosts saturated at peak.
  if (signals.saturatedHosts !== null && signals.saturatedHosts > 0) {
    add('ASM-18', 'warning', 'asm.rule.saturated', { count: formatNumber(signals.saturatedHosts), line: formatNumber(assumed('capacity.saturated')) }, {
      capability: 'asm.cap.infrastructure',
      evidence: ['infra.capacity.summary'],
      category: 'capacity',
      impactLevel: 'medium',
      effort: 'medium',
      drilldown: '/infrastructure',
    });
  }

  // ASM-22 — no business event captured in the window.
  if (signals.bizEvents === 0) {
    add('ASM-22', 'opportunity', 'asm.rule.bizEvents', {}, {
      capability: 'asm.cap.business',
      evidence: ['biz.events.total'],
      category: 'coverage',
      impactLevel: 'medium',
      effort: 'medium',
      drilldown: '/business',
    });
  }

  // ASM-05 — a hub: many services call one service.
  const hub = signals.topology?.hubs[0];
  if (hub !== undefined && hub.callers >= assumed('assessment.hub.callers')) {
    add('ASM-05', 'warning', 'asm.rule.hub', { name: hub.name, callers: formatNumber(hub.callers) }, {
      capability: 'asm.cap.smartscape',
      evidence: ['ev.topology.hubs'],
      category: 'reliability',
      impactLevel: 'high',
      effort: 'medium',
      drilldown: '/topology',
    });
  }

  // ASM-07 — services with no call in or out in the model.
  if (signals.topology !== null && signals.topology.services > 0) {
    const share = pct(signals.topology.isolated, signals.topology.services);
    if (share > assumed('assessment.isolated.max')) {
      add('ASM-07', 'warning', 'asm.rule.isolated', { count: formatNumber(signals.topology.isolated), total: formatNumber(signals.topology.services), pct: decimal(share, 0) }, {
        capability: 'asm.cap.tracing',
        evidence: ['ev.topology.hubs'],
        category: 'coverage',
        impactLevel: 'medium',
        effort: 'medium',
        drilldown: '/topology',
      });
    }
  }

  // ASM-26 — vulnerabilities: to act on now (exploit, public, in use) is critical; critical level open is attention.
  const vulns = signals.vulnerabilities;
  if (vulns !== null && (vulns.actNow > 0 || vulns.critical > 0)) {
    add('ASM-26', vulns.actNow > 0 ? 'critical' : 'warning', 'asm.rule.vulns', { actNow: formatNumber(vulns.actNow), critical: formatNumber(vulns.critical), total: formatNumber(vulns.total) }, {
      capability: 'asm.cap.security',
      evidence: ['sec.posture'],
      category: 'security',
      impactLevel: 'high',
      effort: 'medium',
      drilldown: '/security',
    });
  }

  // ASM-27 — few services say who answers for them.
  if (signals.ownedServices !== null && signals.servicesInModel !== null && signals.servicesInModel > 0) {
    const share = pct(signals.ownedServices, signals.servicesInModel);
    if (share < assumed('assessment.ownership.min')) {
      add('ASM-27', 'opportunity', 'asm.rule.ownership', { count: formatNumber(signals.ownedServices), total: formatNumber(signals.servicesInModel), pct: decimal(share, 0) }, {
        capability: 'asm.cap.tagging',
        evidence: ['svc.owners', 'svc.topology.total'],
        category: 'governance',
        impactLevel: 'medium',
        effort: 'low',
        drilldown: '/security',
      });
    }
  }

  // ASM-28 — other monitoring tools run beside Dynatrace.
  if (signals.thirdPartyTools !== null && signals.thirdPartyTools.length > 0) {
    add('ASM-28', 'opportunity', 'asm.rule.tools', { count: formatNumber(signals.thirdPartyTools.length), tools: signals.thirdPartyTools.slice(0, 6).join(', ') }, {
      capability: 'asm.cap.platform',
      evidence: ['comp.agents'],
      category: 'governance',
      impactLevel: 'medium',
      effort: 'high',
      drilldown: '/competitor',
    });
  }

  // ASM-29 — frontends with a Core Web Vital rated poor.
  if (signals.vitals !== null && signals.vitals.poor > 0) {
    add('ASM-29', 'warning', 'asm.rule.vitals', { count: formatNumber(signals.vitals.poor), total: formatNumber(signals.vitals.measured) }, {
      capability: 'asm.cap.rum',
      evidence: ['rum.webvitals'],
      category: 'experience',
      impactLevel: 'high',
      effort: 'medium',
      drilldown: '/experience',
    });
  }

  // ASM-30 — no workflow ran in the window.
  if (signals.workflows !== null && signals.workflows.workflows === 0) {
    add('ASM-30', 'opportunity', 'asm.rule.noWorkflows', {}, {
      capability: 'asm.cap.workflows',
      evidence: ['auto.workflows.total'],
      category: 'automation',
      impactLevel: 'medium',
      effort: 'medium',
      drilldown: '/automation',
    });
  }

  // STR-01 — infrastructure observed in depth.
  if (modes !== null) {
    const reported = modes.fullStack + modes.infra + modes.other;
    const observedShare = pct(modes.fullStack + modes.infra, reported);
    if (reported > 0 && observedShare >= assumed('assessment.strength.infra')) {
      add('STR-01', 'strength', 'asm.rule.strInfra', { pct: decimal(observedShare, 0), total: formatNumber(reported) }, {
        capability: 'asm.cap.oneagent',
        evidence: ['cov.hosts.breakdown'],
        category: 'coverage',
        impactLevel: 'medium',
        effort: 'low',
        drilldown: '/infrastructure',
      });
    }
  }

  // STR-02 — almost every service with traffic below the 1 % line.
  if (signals.servicesWithTraffic !== null && signals.servicesAboveOnePct !== null && signals.servicesWithTraffic > 0) {
    const share = pct(signals.servicesWithTraffic - signals.servicesAboveOnePct, signals.servicesWithTraffic);
    if (share >= assumed('assessment.strength.services')) {
      add('STR-02', 'strength', 'asm.rule.strServices', { pct: decimal(share, 1), total: formatNumber(signals.servicesWithTraffic) }, {
        capability: 'asm.cap.slo',
        evidence: ['svc.ranking.total'],
        category: 'reliability',
        impactLevel: 'medium',
        effort: 'low',
        drilldown: '/services',
      });
    }
  }

  // STR-03 — problems resolved with a measured time to resolve.
  if (signals.resolved !== null && signals.resolved.problems > 0) {
    add('STR-03', 'strength', 'asm.rule.strResolved', { count: formatNumber(signals.resolved.problems), hours: decimal(signals.resolved.meanHours, 1) }, {
      capability: 'asm.cap.davis',
      evidence: ['prob.mttx'],
      category: 'reliability',
      impactLevel: 'medium',
      effort: 'low',
      drilldown: '/problems',
    });
  }

  // STR-04 — security read, nothing to act on now.
  if (vulns !== null && vulns.total > 0 && vulns.actNow === 0) {
    add('STR-04', 'strength', 'asm.rule.strSecurity', { total: formatNumber(vulns.total) }, {
      capability: 'asm.cap.security',
      evidence: ['sec.posture'],
      category: 'security',
      impactLevel: 'medium',
      effort: 'low',
      drilldown: '/security',
    });
  }

  // STR-05 — automation that runs and succeeds.
  if (signals.workflows !== null && signals.workflows.executions > 0) {
    const share = pct(signals.workflows.succeeded, signals.workflows.executions);
    if (share >= assumed('assessment.strength.workflows')) {
      add('STR-05', 'strength', 'asm.rule.strWorkflows', { pct: decimal(share, 1), runs: formatNumber(signals.workflows.executions), workflows: formatNumber(signals.workflows.workflows) }, {
        capability: 'asm.cap.workflows',
        evidence: ['auto.workflows.total'],
        category: 'automation',
        impactLevel: 'medium',
        effort: 'low',
        drilldown: '/automation',
      });
    }
  }

  return out;
}

const CLASS_RANK: Record<FindingClass, number> = { critical: 0, warning: 1, opportunity: 2, strength: 3 };
const LEVEL_RANK: Record<Qualitative, number> = { high: 0, medium: 1, low: 2 };

/**
 * Class first, then a measured finding before a limit of the reading (a gap never outranks what was
 * found), then impact high → low, then effort low → high, then rule id for a stable order.
 */
export function orderFindings(findings: readonly AssessmentFinding[]): AssessmentFinding[] {
  return [...findings].sort(
    (a, b) =>
      CLASS_RANK[a.cls] - CLASS_RANK[b.cls] ||
      (a.kind === b.kind ? 0 : a.kind === 'finding' ? -1 : 1) ||
      LEVEL_RANK[a.impactLevel] - LEVEL_RANK[b.impactLevel] ||
      LEVEL_RANK[b.effort] - LEVEL_RANK[a.effort] ||
      a.rule.localeCompare(b.rule),
  );
}

export function deriveAssessmentFindings(
  insightSignals: InsightSignals,
  signals: AssessmentSignals,
  text: InsightText = EN_TEXT,
): AssessmentFinding[] {
  const shared = deriveInsights(insightSignals, text)
    .map((insight) => fromInsight(insight, signals, text.t))
    .filter((finding): finding is AssessmentFinding => finding !== null);
  return orderFindings([...shared, ...assessmentRules(signals, text)]);
}

/** P1 = act now (critical, or high impact); P2 = plan (attention, opportunity of high impact); P3 = the rest. Strengths are not actions. */
export type Priority = 'P1' | 'P2' | 'P3';

export function priorityOf(finding: AssessmentFinding): Priority | null {
  if (finding.cls === 'strength') return null;
  if (finding.cls === 'critical') return 'P1';
  if (finding.cls === 'warning') return finding.impactLevel === 'high' ? 'P1' : 'P2';
  return finding.impactLevel === 'high' ? 'P2' : 'P3';
}
