import { type GrailRecord } from '../utils/records';
import { summariseCloud } from './cloud';
import { PROVIDER_META, type CloudProvider } from './cloud';
import { sizeClassic, toLicHosts, totalHosts } from './licensing';
import { summariseCloudServices, type CloudService } from './cloudServices';

/**
 * A compact estate-sizing summary shared across the consolidated surfaces
 * (Overview, Executive summary, value report, first-day message, Tech Wrapup).
 *
 * It composes the same measured signals the Cloud and Licensing pages use so the
 * headline numbers never diverge between a deep page and its summary. Every field
 * is honest about absence: `hasCloud` / `hasSizing` gate whether a surface shows
 * the line at all, so an estate with no cloud attribution or no readable hosts
 * omits the summary rather than printing a zero.
 */
export interface EstateSizing {
  /** Hosts carrying a cloud-provider attribution. */
  cloudHosts: number;
  /** Short provider labels present, ordered by host count (e.g. AWS, GCP, Azure). */
  providerShorts: string[];
  /** Cloud provider keys present, ordered by host count, for logos. */
  cloudProviders: CloudProvider[];
  hasCloud: boolean;
  /** Distinct monitored cloud service families, or null when none were read. */
  cloudServices: number | null;
  /** The most-monitored cloud service families, for a compact findings line. */
  topCloudServices: CloudService[];
  /** Total Classic Host Units estimated from measured RAM, or null when unknown. */
  classicHostUnits: number | null;
  fullStackHosts: number;
  infraHosts: number;
  hasSizing: boolean;
}

export function summariseEstate(
  cloudRecords: readonly GrailRecord[],
  licRecords: readonly GrailRecord[],
  serviceRecords: readonly GrailRecord[] = [],
): EstateSizing {
  const cloud = summariseCloud(cloudRecords);
  const presentProviders = cloud.providers.filter((row) => row.hosts > 0);
  const providerShorts = presentProviders.map((row) => PROVIDER_META[row.provider].short);
  const cloudProviders = presentProviders.map((row) => row.provider);

  const services = summariseCloudServices(serviceRecords);

  const hosts = toLicHosts(licRecords);
  const classic = sizeClassic(hosts);
  const hasSizing = totalHosts(hosts) > 0 && classic.totalHostUnits > 0;

  return {
    cloudHosts: cloud.totalHosts,
    providerShorts,
    cloudProviders,
    hasCloud: cloud.totalHosts > 0 || services.serviceFamilyCount > 0,
    cloudServices: services.serviceFamilyCount > 0 ? services.serviceFamilyCount : null,
    topCloudServices: services.topServices,
    classicHostUnits: hasSizing ? classic.totalHostUnits : null,
    fullStackHosts: classic.fullStackHosts,
    infraHosts: classic.infraHosts,
    hasSizing,
  };
}
