import { assumed } from '../../config/assumptions';
import type { StringKey } from '../../i18n/strings';
import type { InsightText } from '../insights/deriveInsights';
import { decimal } from '../../utils/activeLocale';
import type { CoverageIndex } from './coverageIndex';
import type { AssessmentSignals } from './findings';

/**
 * The state of SRE and platform engineering here (3.4.3, owner's order of 2026-11-18, after Dynatrace's
 * "State of SRE and Platform Engineering" report): seven practices, each read from what the Assessment
 * measured — established, developing, early, or not read. Service-level objectives cannot be read without a
 * scope the app does not hold (proposal F-12), so that practice says so instead of guessing.
 */

export type PracticeState = 'established' | 'developing' | 'early' | 'unread';

export type PracticeId = 'observability' | 'incidents' | 'reliability' | 'automation' | 'slo' | 'platform' | 'security';

export interface Practice {
  id: PracticeId;
  state: PracticeState;
  /** What was measured, in words; the reason when not read. */
  measured: string;
  evidence: readonly string[];
}

export const PRACTICE_LABEL: Record<PracticeId, StringKey> = {
  observability: 'asm.sre.observability',
  incidents: 'asm.sre.incidents',
  reliability: 'asm.sre.reliability',
  automation: 'asm.sre.automation',
  slo: 'asm.sre.slo',
  platform: 'asm.sre.platform',
  security: 'asm.sre.security',
};

export const PRACTICE_STATE_LABEL: Record<PracticeState, StringKey> = {
  established: 'asm.sre.state.established',
  developing: 'asm.sre.state.developing',
  early: 'asm.sre.state.early',
  unread: 'asm.sre.state.unread',
};

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

export function srePractices(signals: AssessmentSignals, index: CoverageIndex, text: InsightText): Practice[] {
  const { t, formatNumber } = text;
  const out: Practice[] = [];
  const unread = (id: PracticeId, evidence: readonly string[], reason: StringKey = 'asm.sre.unread') =>
    out.push({ id, state: 'unread', measured: t(reason), evidence });

  // Observability as the base: the coverage index.
  if (index.value === null) unread('observability', ['cov.inventory']);
  else
    out.push({
      id: 'observability',
      state: index.value >= assumed('assessment.band.excellent') ? 'established' : index.value >= assumed('assessment.band.good') ? 'developing' : 'early',
      measured: t('asm.sre.observability.m', { index: formatNumber(index.value) }),
      evidence: ['cov.inventory', 'cov.hosts.breakdown', 'svc.ranking.total'],
    });

  // Incident response: the measured time to resolve.
  if (signals.resolved === null) unread('incidents', ['prob.mttx']);
  else {
    const hours = signals.resolved.meanHours;
    out.push({
      id: 'incidents',
      state: hours <= assumed('problems.mttr.good') ? 'established' : hours <= assumed('problems.mttr.attention') ? 'developing' : 'early',
      measured: t('asm.sre.incidents.m', { count: formatNumber(signals.resolved.problems), hours: decimal(hours, 1) }),
      evidence: ['prob.mttx'],
    });
  }

  // Service reliability: services with traffic below the 1 % line.
  if (signals.servicesWithTraffic === null || signals.servicesAboveOnePct === null || signals.servicesWithTraffic === 0) unread('reliability', ['svc.ranking.total']);
  else {
    const share = pct(signals.servicesWithTraffic - signals.servicesAboveOnePct, signals.servicesWithTraffic);
    out.push({
      id: 'reliability',
      state: share >= assumed('assessment.strength.services') ? 'established' : share >= assumed('assessment.band.excellent') ? 'developing' : 'early',
      measured: t('asm.sre.reliability.m', { pct: decimal(share, 1), total: formatNumber(signals.servicesWithTraffic) }),
      evidence: ['svc.ranking.total'],
    });
  }

  // Automation and toil: workflows that run and succeed.
  if (signals.workflows === null) unread('automation', ['auto.workflows.total']);
  else {
    const runs = signals.workflows.executions;
    const share = pct(signals.workflows.succeeded, runs);
    out.push({
      id: 'automation',
      state: runs > 0 && share >= assumed('assessment.strength.workflows') ? 'established' : runs > 0 ? 'developing' : 'early',
      measured:
        runs === 0
          ? t('asm.sre.automation.none')
          : t('asm.sre.automation.m', { workflows: formatNumber(signals.workflows.workflows), runs: formatNumber(runs), pct: decimal(share, 1) }),
      evidence: ['auto.workflows.total'],
    });
  }

  // Service-level objectives: not readable with the scopes this app holds.
  unread('slo', [], 'asm.sre.slo.unread');

  // Platform engineering: standards that make the platform self-service.
  const modes = signals.hostModes;
  const reported = modes === null ? 0 : modes.fullStack + modes.infra + modes.other;
  const standards: (boolean | null)[] = [
    modes === null || reported === 0 ? null : pct(modes.fullStack, reported) >= 50,
    signals.clusters === null || signals.clustersWithMetrics === null ? null : signals.clusters === 0 ? null : signals.clustersWithMetrics >= signals.clusters,
    signals.ownedServices === null || signals.servicesInModel === null || signals.servicesInModel === 0
      ? null
      : pct(signals.ownedServices, signals.servicesInModel) >= assumed('assessment.ownership.min'),
  ];
  const read = standards.filter((value): value is boolean => value !== null);
  if (read.length === 0) unread('platform', ['cov.hosts.breakdown', 'k8s.cluster.ids', 'svc.owners']);
  else {
    const met = read.filter(Boolean).length;
    out.push({
      id: 'platform',
      state: met === read.length ? 'established' : met > 0 ? 'developing' : 'early',
      measured: t('asm.sre.platform.m', { met: formatNumber(met), total: formatNumber(read.length) }),
      evidence: ['cov.hosts.breakdown', 'k8s.cluster.ids', 'svc.owners'],
    });
  }

  // Security in operations: runtime vulnerabilities in view, nothing to act on now.
  if (signals.vulnerabilities === null) unread('security', ['sec.posture']);
  else
    out.push({
      id: 'security',
      state: signals.vulnerabilities.actNow === 0 ? 'established' : 'developing',
      measured: t('asm.sre.security.m', { total: formatNumber(signals.vulnerabilities.total), actNow: formatNumber(signals.vulnerabilities.actNow) }),
      evidence: ['sec.posture'],
    });

  return out;
}
