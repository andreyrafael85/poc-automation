import { HOURS_PER_YEAR, PUBLIC_DPS_RATES, type LicHost } from '../../models/licensing';
import type { StringKey } from '../../i18n/strings';
import type { AssessmentSignals } from '../assessment/findings';

/**
 * From a gap to its expansion (3.4.11, proposal §C8 F-15, ordered by the owner on 2026-11-18: "ligação lacuna →
 * expansão só no Licenciamento, SE/parceiro, fora do deck e do PDF do cliente"). Each gap the Assessment measures
 * is paired with the DPS capability that closes it and, only where the units were measured, its annual cost at the
 * public list price (`PUBLIC_DPS_RATES`). Where the units depend on the customer (sessions of an application not
 * monitored yet, the pods of a cluster not reporting), the line says "to size with the customer" — never a guess
 * (rule 8). Money appears only on the Licensing page (rule 6).
 */

export interface GapExpansion {
  id: 'fullStack' | 'appsec' | 'rum' | 'synthetic' | 'kubernetes' | 'business';
  /** The Assessment rule the gap comes from. */
  rule: string;
  gapKey: StringKey;
  params: Record<string, number>;
  capability: string;
  /** Annual list price in USD, or null when the units are the customer's to size. */
  annualUsd: number | null;
  /** For the host upgrade: the infrastructure cost that stops counting, already netted out of `annualUsd`. */
  replacesUsd?: number;
}

const rate = (capability: string) => PUBLIC_DPS_RATES[capability]?.usdPerUnit ?? 0;

export function gapExpansions(
  signals: AssessmentSignals,
  input: { hosts: readonly LicHost[] | null; fullStackGib: number | null; appSecActive: boolean },
): GapExpansion[] {
  const out: GapExpansion[] = [];
  const HY = HOURS_PER_YEAR;
  // Hosts in infrastructure mode → Full-Stack: their memory at the Full-Stack rate, less the infrastructure host-hours.
  if (input.hosts !== null) {
    const infra = input.hosts.filter((host) => host.mode === 'infra');
    const count = infra.reduce((sum, host) => sum + host.count, 0);
    const ramGib = infra.reduce((sum, host) => sum + host.ramGib, 0);
    if (count > 0) {
      const fullStack = ramGib * HY * rate('Full-Stack Monitoring');
      const replaces = count * HY * rate('Infrastructure Monitoring');
      out.push({
        id: 'fullStack',
        rule: 'ASM-01',
        gapKey: 'lic.gap.fullStack',
        params: { hosts: count, ram: Math.round(ramGib) },
        capability: 'Full-Stack Monitoring',
        annualUsd: fullStack - replaces,
        replacesUsd: replaces,
      });
    }
  }
  // Runtime security not in view → Runtime Vulnerability Analytics on the full-stack memory already monitored.
  if (!input.appSecActive && input.fullStackGib !== null && input.fullStackGib > 0) {
    out.push({
      id: 'appsec',
      rule: 'ASM-21',
      gapKey: 'lic.gap.appsec',
      params: { gib: Math.round(input.fullStackGib) },
      capability: 'Runtime Vulnerability Analytics',
      annualUsd: input.fullStackGib * HY * rate('Runtime Vulnerability Analytics'),
    });
  }
  // Web applications without real users → RUM: their sessions are the customer's to size.
  if (signals.webApps !== null && signals.frontendsWithRealUsers !== null && signals.webApps > signals.frontendsWithRealUsers) {
    out.push({ id: 'rum', rule: 'ASM-15', gapKey: 'lic.gap.rum', params: { apps: signals.webApps - signals.frontendsWithRealUsers }, capability: 'Real User Monitoring', annualUsd: null });
  }
  // No synthetic monitor → Browser monitors: the journeys and their frequency are the customer's to size.
  if (signals.syntheticMonitors === 0) {
    out.push({ id: 'synthetic', rule: 'ASM-16', gapKey: 'lic.gap.synthetic', params: {}, capability: 'Browser Monitor or Clickpath', annualUsd: null });
  }
  // Clusters without container metrics → Kubernetes Platform Monitoring: their pods are the customer's to size.
  if (signals.clusters !== null && signals.clustersWithMetrics !== null && signals.clusters > signals.clustersWithMetrics) {
    out.push({
      id: 'kubernetes',
      rule: 'ASM-12',
      gapKey: 'lic.gap.kubernetes',
      params: { clusters: signals.clusters - signals.clustersWithMetrics },
      capability: 'Kubernetes Platform Monitoring',
      annualUsd: null,
    });
  }
  // No business event → business observability: the events and their volume are the customer's to size.
  if (signals.bizEvents === 0) {
    out.push({ id: 'business', rule: 'ASM-22', gapKey: 'lic.gap.business', params: {}, capability: 'Business Events', annualUsd: null });
  }
  return out;
}
