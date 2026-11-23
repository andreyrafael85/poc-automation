import { num, str, type GrailRecord } from '../utils/records';

/**
 * Cloud footprint, derived from the `cloudType` the platform attributes to each
 * host. Only hosts Dynatrace tagged with a cloud are counted; a host without the
 * attribute is on-prem or undetected, never assumed to be in a cloud.
 *
 * `cloudType` values are provider-specific (`EC2`, `GOOGLE_CLOUD_PLATFORM`,
 * `AZURE`, …); they are normalised to a small display set so the page groups by
 * provider rather than by raw enum.
 */

export type CloudProvider = 'AWS' | 'Azure' | 'GCP' | 'Other';

export interface CloudProviderRow {
  provider: CloudProvider;
  hosts: number;
  cores: number;
  memBytes: number;
  fullStack: number;
  infra: number;
}

export interface CloudSummary {
  providers: CloudProviderRow[];
  totalHosts: number;
  totalCores: number;
  totalMemBytes: number;
  providerCount: number;
}

const NORMALISE: Record<string, CloudProvider> = {
  EC2: 'AWS',
  AWS: 'AWS',
  AMAZON_WEB_SERVICES: 'AWS',
  AZURE: 'Azure',
  MICROSOFT_AZURE: 'Azure',
  GOOGLE_CLOUD_PLATFORM: 'GCP',
  GCP: 'GCP',
};

export function normaliseProvider(cloudType: string | null): CloudProvider {
  if (cloudType === null) return 'Other';
  return NORMALISE[cloudType.toUpperCase()] ?? 'Other';
}

export function summariseCloud(records: readonly GrailRecord[]): CloudSummary {
  const byProvider = new Map<CloudProvider, CloudProviderRow>();
  for (const record of records) {
    const provider = normaliseProvider(str(record, 'cloudType'));
    const row =
      byProvider.get(provider) ?? { provider, hosts: 0, cores: 0, memBytes: 0, fullStack: 0, infra: 0 };
    row.hosts += num(record, 'hosts') ?? 0;
    row.cores += num(record, 'cores') ?? 0;
    row.memBytes += num(record, 'memBytes') ?? 0;
    row.fullStack += num(record, 'fullStack') ?? 0;
    row.infra += num(record, 'infra') ?? 0;
    byProvider.set(provider, row);
  }
  const providers = [...byProvider.values()].sort((a, b) => b.hosts - a.hosts);
  return {
    providers,
    totalHosts: providers.reduce((sum, row) => sum + row.hosts, 0),
    totalCores: providers.reduce((sum, row) => sum + row.cores, 0),
    totalMemBytes: providers.reduce((sum, row) => sum + row.memBytes, 0),
    providerCount: providers.length,
  };
}

/**
 * Display metadata per provider. Colour only — no trademarked logo asset is
 * shipped; the provider is signalled by its brand colour and short name.
 */
export const PROVIDER_META: Record<CloudProvider, { fullName: string; color: string; short: string }> = {
  AWS: { fullName: 'Amazon Web Services', color: '#FF9900', short: 'AWS' },
  Azure: { fullName: 'Microsoft Azure', color: '#0078D4', short: 'Azure' },
  GCP: { fullName: 'Google Cloud', color: '#4285F4', short: 'GCP' },
  Other: { fullName: 'Other cloud', color: '#8A94A6', short: 'Cloud' },
};
