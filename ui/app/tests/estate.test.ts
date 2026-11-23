import { describe, expect, it } from 'vitest';

import { summariseEstate } from '../models/estate';

/**
 * The consolidated cloud + licensing summary shown on Overview, the Executive
 * summary, the value report, the first-day message and the Tech Wrapup. The
 * headline numbers must match the Cloud and Licensing pages, and absence must
 * read as omission (hasCloud / hasSizing false), never as zero.
 */
describe('summariseEstate', () => {
  it('reports no cloud and no sizing for empty inputs', () => {
    const estate = summariseEstate([], []);
    expect(estate.hasCloud).toBe(false);
    expect(estate.hasSizing).toBe(false);
    expect(estate.classicHostUnits).toBeNull();
    expect(estate.cloudHosts).toBe(0);
  });

  it('summarises cloud hosts by provider, ordered by host count', () => {
    const estate = summariseEstate(
      [
        { cloudType: 'EC2', hosts: 14, cores: 56, memBytes: 0, fullStack: 10, infra: 4 },
        { cloudType: 'GOOGLE_CLOUD_PLATFORM', hosts: 3, cores: 12, memBytes: 0, fullStack: 3, infra: 0 },
        { cloudType: 'AZURE', hosts: 2, cores: 8, memBytes: 0, fullStack: 2, infra: 0 },
      ],
      [],
    );
    expect(estate.hasCloud).toBe(true);
    expect(estate.cloudHosts).toBe(19);
    expect(estate.providerShorts).toEqual(['AWS', 'GCP', 'Azure']);
  });

  it('estimates Classic Host Units from measured RAM, never a zero when nothing is readable', () => {
    const GIB = 1024 ** 3;
    const estate = summariseEstate(
      [],
      // `lic.hosts` groups hosts by monitoring mode and Host-Unit band (16 GiB steps).
      [
        { hosts: 1, memoryBytes: 64 * GIB, huBucket: 4, monitoringMode: 'FULL_STACK' }, // 4 HU
        { hosts: 1, memoryBytes: 8 * GIB, huBucket: 1, monitoringMode: 'FULL_STACK' }, // 1 HU
        { hosts: 1, memoryBytes: 128 * GIB, huBucket: 8, monitoringMode: 'INFRASTRUCTURE' }, // 1 HU
      ],
    );
    expect(estate.hasSizing).toBe(true);
    expect(estate.classicHostUnits).toBe(6);
    expect(estate.fullStackHosts).toBe(2);
    expect(estate.infraHosts).toBe(1);
  });
});
