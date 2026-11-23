import { assumed } from '../../config/assumptions';
import type { StringKey } from '../../i18n/strings';
import { decimal } from '../../utils/activeLocale';
import type { InsightText } from '../insights/deriveInsights';
import type { AssessmentSignals } from './findings';

/**
 * How the Dynatrace platform is used in this environment (3.4.1, owner's order: "avaliar como está o
 * uso da plataforma Dynatrace, descobrir se está monitorando corretamente, gaps, identificar
 * lacunas"). One row per capability, each with a state read from exact counts and the queries
 * behind it:
 *
 *  - `in-use`       — the capability is in use and reaches what it should here;
 *  - `room`         — in use, with room to grow (a measured share below its line);
 *  - `not-detected` — read, and nothing of it was found (a conversation, not a defect);
 *  - `unread`       — not readable in this reading (permission, failure): never "not used".
 *
 * Kept free of React; the lines come from the assumptions registry.
 */

export type AdoptionState = 'in-use' | 'room' | 'not-detected' | 'unread';

export type CapabilityId =
  | 'oneagent'
  | 'tracing'
  | 'logs'
  | 'kubernetes'
  | 'cloud'
  | 'rum'
  | 'synthetic'
  | 'business'
  | 'davis'
  | 'workflows'
  | 'security'
  | 'ownership'
  | 'platform';

export const CAPABILITY_LABEL: Record<CapabilityId, StringKey> = {
  oneagent: 'asm.cap.oneagent',
  tracing: 'asm.cap.tracing',
  logs: 'asm.cap.logs',
  kubernetes: 'asm.cap.kubernetes',
  cloud: 'asm.cap.cloud',
  rum: 'asm.cap.rum',
  synthetic: 'asm.cap.synthetic',
  business: 'asm.cap.business',
  davis: 'asm.cap.davis',
  workflows: 'asm.cap.workflows',
  security: 'asm.cap.security',
  ownership: 'asm.cap.tagging',
  platform: 'asm.cap.platform',
};

export interface AdoptionRow {
  id: CapabilityId;
  state: AdoptionState;
  /** What was measured, in words with its figures; the reason when unread. */
  measured: string;
  evidence: readonly string[];
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

export function platformAdoption(signals: AssessmentSignals, text: InsightText): AdoptionRow[] {
  const { t, formatNumber } = text;
  const rows: AdoptionRow[] = [];
  const unread = (id: CapabilityId, evidence: readonly string[]) => rows.push({ id, state: 'unread', measured: t('asm.adopt.unread'), evidence });
  const row = (id: CapabilityId, state: AdoptionState, key: StringKey, params: Record<string, string>, evidence: readonly string[]) =>
    rows.push({ id, state, measured: t(key, params), evidence });

  // OneAgent depth: share of the hosts with a reported mode in full-stack.
  const modes = signals.hostModes;
  if (modes === null) unread('oneagent', ['cov.hosts.breakdown']);
  else {
    const reported = modes.fullStack + modes.infra + modes.other;
    const all = reported + modes.unknown;
    if (all === 0) row('oneagent', 'not-detected', 'asm.adopt.oneagent.none', {}, ['cov.hosts.breakdown']);
    else {
      const share = pct(modes.fullStack, reported);
      row('oneagent', reported > 0 && share >= 50 ? 'in-use' : 'room', 'asm.adopt.oneagent', {
        full: formatNumber(modes.fullStack),
        infra: formatNumber(modes.infra),
        unknown: formatNumber(modes.unknown),
        total: formatNumber(all),
      }, ['cov.hosts.breakdown']);
    }
  }

  // Distributed tracing: services that handled traffic of the services in the model.
  if (signals.servicesInModel === null || signals.servicesWithTraffic === null) unread('tracing', ['svc.ranking.total', 'svc.topology.total']);
  else if (signals.servicesInModel === 0) row('tracing', 'not-detected', 'asm.adopt.tracing.none', {}, ['svc.topology.total']);
  else {
    const share = pct(signals.servicesWithTraffic, signals.servicesInModel);
    row('tracing', share >= 100 - assumed('assessment.idleServices.max') ? 'in-use' : 'room', 'asm.adopt.tracing', {
      traffic: formatNumber(signals.servicesWithTraffic),
      total: formatNumber(signals.servicesInModel),
      pct: decimal(share, 0),
    }, ['svc.ranking.total', 'svc.topology.total']);
  }

  // Log Management: records read and the share with service context.
  if (signals.logRecords === null || signals.logRecordsWithContext === null) unread('logs', ['log.quality']);
  else if (signals.logRecords === 0) row('logs', 'not-detected', 'asm.adopt.logs.none', {}, ['log.quality']);
  else {
    const share = pct(signals.logRecordsWithContext, signals.logRecords);
    row('logs', share >= assumed('findings.logContext.low') ? 'in-use' : 'room', 'asm.adopt.logs', {
      records: formatNumber(signals.logRecords),
      pct: share > 0 && share < 10 ? decimal(share, 1) : decimal(share, 0),
    }, ['log.quality']);
  }

  // Kubernetes: clusters reporting container metrics.
  if (signals.clusters === null || signals.clustersWithMetrics === null) unread('kubernetes', ['k8s.inventory', 'k8s.cluster.ids']);
  else if (signals.clusters === 0) row('kubernetes', 'not-detected', 'asm.adopt.kubernetes.none', {}, ['k8s.inventory']);
  else
    row('kubernetes', signals.clustersWithMetrics >= signals.clusters ? 'in-use' : 'room', 'asm.adopt.kubernetes', {
      metrics: formatNumber(Math.min(signals.clustersWithMetrics, signals.clusters)),
      total: formatNumber(signals.clusters),
    }, ['k8s.inventory', 'k8s.cluster.ids']);

  // Cloud: hosts attributed to a provider.
  if (signals.cloudProviders === null) unread('cloud', ['cloud.hosts']);
  else if (signals.cloudProviders.length === 0) row('cloud', 'not-detected', 'asm.adopt.cloud.none', {}, ['cloud.hosts']);
  else
    row('cloud', 'in-use', 'asm.adopt.cloud', {
      providers: signals.cloudProviders.map((entry) => `${entry.provider} (${formatNumber(entry.hosts)})`).join(', '),
    }, ['cloud.hosts']);

  // Real User Monitoring: frontends with real users of the web applications.
  if (signals.webApps === null || signals.frontendsWithRealUsers === null) unread('rum', ['rum.scorecard', 'cov.inventory']);
  else if (signals.frontendsWithRealUsers === 0) row('rum', 'not-detected', 'asm.adopt.rum.none', { apps: formatNumber(signals.webApps) }, ['rum.scorecard', 'cov.inventory']);
  else
    row('rum', signals.frontendsWithRealUsers >= signals.webApps ? 'in-use' : 'room', 'asm.adopt.rum', {
      real: formatNumber(signals.frontendsWithRealUsers),
      apps: formatNumber(signals.webApps),
    }, ['rum.scorecard', 'cov.inventory']);

  // Synthetic: monitors in the model.
  if (signals.syntheticMonitors === null) unread('synthetic', ['cov.inventory']);
  else if (signals.syntheticMonitors === 0) row('synthetic', 'not-detected', 'asm.adopt.synthetic.none', {}, ['cov.inventory']);
  else row('synthetic', 'in-use', 'asm.adopt.synthetic', { count: formatNumber(signals.syntheticMonitors) }, ['cov.inventory']);

  // Business events.
  if (signals.bizEvents === null) unread('business', ['biz.events.total']);
  else if (signals.bizEvents === 0) row('business', 'not-detected', 'asm.adopt.business.none', {}, ['biz.events.total']);
  else row('business', 'in-use', 'asm.adopt.business', { count: formatNumber(signals.bizEvents) }, ['biz.events.total']);

  // Davis AI: problems detected and resolved with a measured time.
  if (signals.resolved === null) unread('davis', ['prob.mttx']);
  else
    row('davis', 'in-use', 'asm.adopt.davis', { count: formatNumber(signals.resolved.problems), hours: decimal(signals.resolved.meanHours, 1) }, ['prob.mttx']);

  // Workflows: runs and success.
  if (signals.workflows === null) unread('workflows', ['auto.workflows.total']);
  else if (signals.workflows.workflows === 0) row('workflows', 'not-detected', 'asm.adopt.workflows.none', {}, ['auto.workflows.total']);
  else {
    const share = pct(signals.workflows.succeeded, signals.workflows.executions);
    row('workflows', share >= assumed('assessment.strength.workflows') ? 'in-use' : 'room', 'asm.adopt.workflows', {
      workflows: formatNumber(signals.workflows.workflows),
      runs: formatNumber(signals.workflows.executions),
      pct: decimal(share, 1),
    }, ['auto.workflows.total']);
  }

  // Application Security: vulnerabilities read (the scope answers) and how many to act on now.
  if (signals.vulnerabilities === null) unread('security', ['sec.posture']);
  else if (signals.vulnerabilities.total === 0) row('security', 'not-detected', 'asm.adopt.security.none', {}, ['sec.posture']);
  else
    row('security', signals.vulnerabilities.actNow === 0 ? 'in-use' : 'room', 'asm.adopt.security', {
      total: formatNumber(signals.vulnerabilities.total),
      actNow: formatNumber(signals.vulnerabilities.actNow),
    }, ['sec.posture']);

  // Ownership: services with an owner or team tag.
  if (signals.ownedServices === null || signals.servicesInModel === null) unread('ownership', ['svc.owners', 'svc.topology.total']);
  else if (signals.ownedServices === 0) row('ownership', 'not-detected', 'asm.adopt.ownership.none', { total: formatNumber(signals.servicesInModel) }, ['svc.owners', 'svc.topology.total']);
  else
    row('ownership', pct(signals.ownedServices, signals.servicesInModel) >= assumed('assessment.ownership.min') ? 'in-use' : 'room', 'asm.adopt.ownership', {
      owned: formatNumber(signals.ownedServices),
      total: formatNumber(signals.servicesInModel),
    }, ['svc.owners', 'svc.topology.total']);

  // One platform: other monitoring tools found running beside Dynatrace.
  if (signals.thirdPartyTools === null) unread('platform', ['comp.agents']);
  else if (signals.thirdPartyTools.length === 0) row('platform', 'in-use', 'asm.adopt.platform.none', {}, ['comp.agents']);
  else row('platform', 'room', 'asm.adopt.platform', { tools: signals.thirdPartyTools.join(', ') }, ['comp.agents']);

  return rows;
}

export const ADOPTION_STATE_LABEL: Record<AdoptionState, StringKey> = {
  'in-use': 'asm.adopt.state.inUse',
  room: 'asm.adopt.state.room',
  'not-detected': 'asm.adopt.state.notDetected',
  unread: 'asm.adopt.state.unread',
};
