import { describe, expect, it } from 'vitest';

import {
  CAPACITY_THRESHOLDS,
  capacityTotals,
  summariseCapacityRow,
  toHostCapacity,
} from '../models/capacity';
import { CAPACITY_LIST_LIMIT, CATALOG } from '../queries/catalog';

const GIB = 1024 ** 3;

describe('capacityTotals', () => {
  const summaryRow = {
    hosts: '24',
    saturated: '3',
    pressured: '1',
    balanced: '11',
    oversized: '9',
    unknown: '0',
    declaredMemBytes: 465 * GIB,
    usedMemBytes: 90 * GIB,
    reclaimableMemBytes: 220 * GIB,
    oversizedCores: '34',
  };

  it('reads every count and total from the aggregate over all hosts', () => {
    const view = summariseCapacityRow(summaryRow)!;
    expect(view.hosts).toBe(24);
    expect(view.saturated).toBe(3);
    expect(view.oversized).toBe(9);
    expect(view.reclaimableMemoryBytes).toBe(220 * GIB);
    expect(view.memoryUtilisationPct).toBeCloseTo((90 / 465) * 100, 5);
  });

  it('does not count the rows of a list that stops at its limit when the aggregate answered', () => {
    // 3,000 hosts, of which the list holds only the largest 200.
    const list = toHostCapacity(
      Array.from({ length: CAPACITY_LIST_LIMIT }, (_, index) => ({
        hostId: `H-${index}`,
        name: `host-${index}`,
        memBytes: 64 * GIB,
        maxCpuPct: 50,
        maxMemPct: 50,
      })),
    );
    const view = capacityTotals({ ...summaryRow, hosts: 3000, saturated: 410 }, list, CAPACITY_LIST_LIMIT);
    expect(view.hosts).toBe(3000);
    expect(view.saturated).toBe(410);
    expect(view.exact).toBe(true);
  });

  it('falls back to the list, exact only while it is shorter than its limit', () => {
    const short = toHostCapacity([{ hostId: 'H-1', name: 'a', memBytes: 8 * GIB, maxCpuPct: 95, maxMemPct: 40 }]);
    expect(capacityTotals(undefined, short, CAPACITY_LIST_LIMIT)).toMatchObject({ hosts: 1, saturated: 1, exact: true });
    const full = toHostCapacity(
      Array.from({ length: CAPACITY_LIST_LIMIT }, (_, i) => ({ hostId: `H-${i}`, name: `h${i}`, memBytes: GIB, maxCpuPct: 10, maxMemPct: 10 })),
    );
    expect(capacityTotals(undefined, full, CAPACITY_LIST_LIMIT).exact).toBe(false);
  });
});

describe('infra.capacity queries', () => {
  it('classify with the thresholds the page prints, so the DQL and the labels cannot drift', () => {
    const dql = CATALOG['infra.capacity.summary']!.dql;
    expect(dql).toContain(`peakCpu >= ${CAPACITY_THRESHOLDS.saturatedPct}`);
    expect(dql).toContain(`peakCpu >= ${CAPACITY_THRESHOLDS.pressuredPct}`);
    expect(dql).toContain(`peakCpu < ${CAPACITY_THRESHOLDS.oversizedPct}`);
  });

  it('take the peak as the maximum of each hour, not the largest hourly average', () => {
    for (const id of ['infra.capacity', 'infra.capacity.summary'] as const) {
      const dql = CATALOG[id]!.dql;
      expect(dql, id).toContain('max(dt.host.cpu.usage)');
      expect(dql, id).toContain('max(dt.host.memory.usage)');
    }
  });
});
