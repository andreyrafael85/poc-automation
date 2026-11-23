import { str, type GrailRecord } from '../utils/records';

/**
 * Competitor overlap classification.
 *
 * Shared by the Competitor Intelligence page and the Value & ROI consolidation
 * calculator so both read the same evidence the same way. Strictly a lookup over
 * the process-group names the platform actually reported — no claim is made
 * about a vendor beyond an agent found running.
 */

export type RiskCategory = 'apm' | 'metrics' | 'logs' | 'infra' | 'viz';

interface Signature {
  vendor: string;
  category: RiskCategory;
  match: readonly string[];
}

export const COMPETITOR_SIGNATURES: readonly Signature[] = [
  { vendor: 'Datadog', category: 'apm', match: ['datadog'] },
  { vendor: 'New Relic', category: 'apm', match: ['newrelic', 'new relic'] },
  { vendor: 'AppDynamics', category: 'apm', match: ['appdynamics'] },
  { vendor: 'Splunk', category: 'logs', match: ['splunk'] },
  { vendor: 'Elastic', category: 'logs', match: ['filebeat', 'metricbeat', 'elastic-agent', 'logstash'] },
  { vendor: 'Zabbix', category: 'infra', match: ['zabbix'] },
  { vendor: 'Prometheus', category: 'metrics', match: ['prometheus', 'node_exporter'] },
  { vendor: 'Grafana', category: 'viz', match: ['grafana'] },
  { vendor: 'Nagios', category: 'infra', match: ['nagios'] },
  { vendor: 'collectd', category: 'metrics', match: ['collectd'] },
];

export function classifyCompetitor(name: string): { vendor: string; category: RiskCategory } {
  const lower = name.toLowerCase();
  const hit = COMPETITOR_SIGNATURES.find((signature) =>
    signature.match.some((token) => lower.includes(token)),
  );
  return hit ?? { vendor: 'Other', category: 'infra' };
}

export interface VendorGroup {
  vendor: string;
  category: RiskCategory;
  names: string[];
  count: number;
}

export interface CompetitorSummary {
  totalAgents: number;
  vendors: VendorGroup[];
}

/** Aggregate the raw `comp.agents` records into vendor groups, sorted by count. */
export function summariseCompetitors(records: readonly GrailRecord[]): CompetitorSummary {
  const byVendor = new Map<string, VendorGroup>();
  for (const record of records) {
    const name = str(record, 'name');
    if (name === null) continue;
    const { vendor, category } = classifyCompetitor(name);
    const entry = byVendor.get(vendor) ?? { vendor, category, names: [], count: 0 };
    entry.names.push(name);
    entry.count = entry.names.length;
    byVendor.set(vendor, entry);
  }
  const vendors = [...byVendor.values()].sort((a, b) => b.count - a.count);
  return { totalAgents: vendors.reduce((sum, entry) => sum + entry.count, 0), vendors };
}
