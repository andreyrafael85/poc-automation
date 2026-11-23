import { describe, expect, it } from 'vitest';

import { normaliseProvider, summariseCloud } from '../models/cloud';

/**
 * Cloud attribution must group by provider from the platform's raw cloud type,
 * and must never invent a cloud for a host that has none.
 */

describe('normaliseProvider', () => {
  it('maps platform cloud types to display providers', () => {
    expect(normaliseProvider('EC2')).toBe('AWS');
    expect(normaliseProvider('GOOGLE_CLOUD_PLATFORM')).toBe('GCP');
    expect(normaliseProvider('AZURE')).toBe('Azure');
  });

  it('falls back to Other for unknown or null', () => {
    expect(normaliseProvider('ORACLE_CLOUD')).toBe('Other');
    expect(normaliseProvider(null)).toBe('Other');
  });
});

describe('summariseCloud', () => {
  it('aggregates hosts, cores and memory per provider', () => {
    const view = summariseCloud([
      { cloudType: 'EC2', hosts: 14, cores: 30, memBytes: 100, fullStack: 8, infra: 4 },
      { cloudType: 'GOOGLE_CLOUD_PLATFORM', hosts: 3, cores: 6, memBytes: 50, fullStack: 3, infra: 0 },
      { cloudType: 'AZURE', hosts: 2, cores: 4, memBytes: 20, fullStack: 2, infra: 0 },
    ]);
    expect(view.providerCount).toBe(3);
    expect(view.totalHosts).toBe(19);
    expect(view.totalCores).toBe(40);
    // Ranked hosts-first, so AWS leads.
    expect(view.providers[0]?.provider).toBe('AWS');
    expect(view.providers[0]?.hosts).toBe(14);
  });

  it('returns an empty footprint for no cloud hosts', () => {
    const view = summariseCloud([]);
    expect(view.providerCount).toBe(0);
    expect(view.totalHosts).toBe(0);
  });
});
