import { assumed } from '../config/assumptions';
import { num, str, type GrailRecord } from '../utils/records';

/**
 * Declared capacity against measured usage, per host.
 *
 * ## The question this answers
 *
 * "Host X has 16 GB and has been sitting at 15 GB for a while — that is
 * saturation. Host Y has 16 GB and has used 2 GB for a long time — that one was
 * over-provisioned." Both are real findings, both are actionable, and neither is
 * visible from an estate average, which is what the Infrastructure page showed
 * before.
 *
 * Dynatrace supplies both halves without any configuration: the agent reports
 * what the host *has* (`cpuCores`, `memoryTotal` on the entity), and metrics
 * report what it *uses*. Putting the two side by side is the whole analysis.
 *
 * ## Why peak and not average
 *
 * An average hides the spike that matters. A host averaging 40% memory but
 * peaking at 97% is saturated, and calling it healthy because of the mean would
 * be exactly the kind of comfortable wrong answer this app exists to avoid. So
 * saturation is judged on the peak, and over-provisioning on the peak too — a
 * host that never once got busy is the safe case to call oversized.
 */

export type CapacityClass =
  /** Peaked at or above the saturation line on at least one dimension. */
  | 'saturated'
  /** Peaked into the pressure band. Worth watching, not yet a fault. */
  | 'pressured'
  /** Used a reasonable share of what it has. */
  | 'balanced'
  /** Never got busy on either dimension. Sized for load it does not see. */
  | 'oversized'
  /** Capacity or usage was not reported, so no judgement is made. */
  | 'unknown';

/**
 * The lines this app draws.
 *
 * These are review conventions chosen for this app. They are not Dynatrace
 * thresholds, not anomaly-detection settings and not an agreed objective, and
 * the page says so wherever a classification is shown. They are exported so a
 * reader can check the number rather than take the label on trust.
 */
export const CAPACITY_THRESHOLDS = {
  /** Peak at or above this is saturation. */
  saturatedPct: assumed('capacity.saturated'),
  /** Peak at or above this is pressure. */
  pressuredPct: assumed('capacity.pressured'),
  /** Peak below this on every dimension means the host never got busy. */
  oversizedPct: assumed('capacity.oversized'),
} as const;

export interface HostCapacity extends Record<string, unknown> {
  hostId: string;
  name: string;
  /** Cores the agent reported. Null when not reported. */
  cores: number | null;
  /** Bytes of memory the agent reported. Null when not reported. */
  memoryBytes: number | null;
  avgCpuPct: number | null;
  peakCpuPct: number | null;
  avgMemPct: number | null;
  peakMemPct: number | null;
  avgDiskPct: number | null;
  peakDiskPct: number | null;
  /** Memory in use at the average, in bytes. Derived. */
  memoryUsedBytes: number | null;
  /** Memory never touched even at peak, in bytes. Derived. */
  memoryHeadroomBytes: number | null;
  classification: CapacityClass;
}

/** Classifies one host. Exported so the rule can be tested directly. */
export function classify(peakCpuPct: number | null, peakMemPct: number | null): CapacityClass {
  // No measurement is not a verdict. Saying "balanced" here would be inventing
  // a conclusion out of an absent signal.
  if (peakCpuPct === null && peakMemPct === null) return 'unknown';

  const peaks = [peakCpuPct, peakMemPct].filter((value): value is number => value !== null);
  const highest = Math.max(...peaks);

  if (highest >= CAPACITY_THRESHOLDS.saturatedPct) return 'saturated';
  if (highest >= CAPACITY_THRESHOLDS.pressuredPct) return 'pressured';

  // Oversized needs *both* dimensions quiet, and needs both to have been
  // measured. One quiet dimension proves nothing about the other.
  if (peakCpuPct !== null && peakMemPct !== null) {
    if (
      peakCpuPct < CAPACITY_THRESHOLDS.oversizedPct &&
      peakMemPct < CAPACITY_THRESHOLDS.oversizedPct
    ) {
      return 'oversized';
    }
  }

  return 'balanced';
}

export function toHostCapacity(records: GrailRecord[]): HostCapacity[] {
  return records.map((record) => {
    const peakCpuPct = num(record, 'maxCpuPct');
    const peakMemPct = num(record, 'maxMemPct');

    return {
      hostId: str(record, 'hostId') ?? '—',
      name: str(record, 'name') ?? str(record, 'hostId') ?? '—',
      cores: num(record, 'cores'),
      memoryBytes: num(record, 'memBytes'),
      avgCpuPct: num(record, 'avgCpuPct'),
      peakCpuPct,
      avgMemPct: num(record, 'avgMemPct'),
      peakMemPct,
      avgDiskPct: num(record, 'avgDiskPct'),
      peakDiskPct: num(record, 'maxDiskPct'),
      memoryUsedBytes: num(record, 'memUsedBytes'),
      memoryHeadroomBytes: num(record, 'memHeadroomBytes'),
      classification: classify(peakCpuPct, peakMemPct),
    };
  });
}

export interface CapacitySummary {
  hosts: number;
  saturated: number;
  pressured: number;
  balanced: number;
  oversized: number;
  unknown: number;
  /** Memory declared across every host that reported it. */
  declaredMemoryBytes: number | null;
  /** Memory in use at the average, summed. */
  usedMemoryBytes: number | null;
  /** Memory never touched even at peak, summed over oversized hosts only. */
  reclaimableMemoryBytes: number | null;
  /** Cores on hosts classified as oversized. */
  oversizedCores: number | null;
  /** Weighted mean memory utilisation across the estate, as a percentage. */
  memoryUtilisationPct: number | null;
}

export function summarise(hosts: HostCapacity[]): CapacitySummary {
  const count = (klass: CapacityClass) =>
    hosts.filter((host) => host.classification === klass).length;

  const sum = (pick: (host: HostCapacity) => number | null, only?: CapacityClass) => {
    let total = 0;
    let seen = false;
    for (const host of hosts) {
      if (only !== undefined && host.classification !== only) continue;
      const value = pick(host);
      if (value !== null) {
        total += value;
        seen = true;
      }
    }
    return seen ? total : null;
  };

  const declared = sum((host) => host.memoryBytes);
  const used = sum((host) => host.memoryUsedBytes);

  return {
    hosts: hosts.length,
    saturated: count('saturated'),
    pressured: count('pressured'),
    balanced: count('balanced'),
    oversized: count('oversized'),
    unknown: count('unknown'),
    declaredMemoryBytes: declared,
    usedMemoryBytes: used,
    // Only oversized hosts contribute: headroom on a busy host is not spare, it
    // is the margin that keeps it from falling over.
    reclaimableMemoryBytes: sum((host) => host.memoryHeadroomBytes, 'oversized'),
    oversizedCores: sum((host) => host.cores, 'oversized'),
    memoryUtilisationPct:
      declared === null || used === null || declared === 0 ? null : (used * 100) / declared,
  };
}

/**
 * The same summary read from `infra.capacity.summary`, which classifies every host inside the
 * query. The per-host list stops at its row limit (the largest hosts by memory), so counting
 * its rows would under-count a large estate; this is the exact figure over all of them.
 */
export function summariseCapacityRow(record: GrailRecord | undefined): CapacitySummary | null {
  const hosts = num(record, 'hosts');
  if (hosts === null) return null;
  const declared = num(record, 'declaredMemBytes');
  const used = num(record, 'usedMemBytes');
  return {
    hosts,
    saturated: num(record, 'saturated') ?? 0,
    pressured: num(record, 'pressured') ?? 0,
    balanced: num(record, 'balanced') ?? 0,
    oversized: num(record, 'oversized') ?? 0,
    unknown: num(record, 'unknown') ?? 0,
    declaredMemoryBytes: declared,
    usedMemoryBytes: used,
    reclaimableMemoryBytes: num(record, 'reclaimableMemBytes'),
    oversizedCores: num(record, 'oversizedCores'),
    memoryUtilisationPct: declared === null || used === null || declared === 0 ? null : (used * 100) / declared,
  };
}

/**
 * The capacity totals to print: the exact aggregate when it answered; otherwise the list's own
 * count, which is exact only while the list is shorter than its limit (`exact` says which).
 */
export function capacityTotals(
  summaryRecord: GrailRecord | undefined,
  listed: HostCapacity[],
  listLimit: number,
): CapacitySummary & { exact: boolean } {
  const exactRow = summariseCapacityRow(summaryRecord);
  if (exactRow !== null) return { ...exactRow, exact: true };
  return { ...summarise(listed), exact: listed.length < listLimit };
}

/** Hosts worth naming, worst first. Saturation before waste. */
export function attentionOrder(hosts: HostCapacity[]): HostCapacity[] {
  const rank: Record<CapacityClass, number> = {
    saturated: 0,
    pressured: 1,
    oversized: 2,
    balanced: 3,
    unknown: 4,
  };
  return [...hosts].sort((a, b) => {
    const byClass = rank[a.classification] - rank[b.classification];
    if (byClass !== 0) return byClass;
    // Within saturation, the busiest first. Within waste, the biggest waste first.
    if (a.classification === 'oversized') {
      return (b.memoryHeadroomBytes ?? 0) - (a.memoryHeadroomBytes ?? 0);
    }
    return (b.peakMemPct ?? 0) + (b.peakCpuPct ?? 0) - ((a.peakMemPct ?? 0) + (a.peakCpuPct ?? 0));
  });
}
