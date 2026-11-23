import { describe, expect, it } from 'vitest';

import { rankDiscoveries, type Rankable } from '../features/discoveries/ranking';

const measured = (id: string, severity: Rankable['severity']) => ({ id, severity });
const gap = (id: string, severity: Rankable['severity'] = 'critical') => ({ id, severity, gap: 'no-permission' as const });

describe('rankDiscoveries', () => {
  it('ranks measured findings by severity', () => {
    const ranked = rankDiscoveries([measured('w', 'warning'), measured('c', 'critical'), measured('p', 'positive')]);
    expect(ranked.map((item) => item.id)).toEqual(['c', 'w', 'p']);
  });

  it('never ranks a limitation of the review above a measured finding, whatever its severity', () => {
    // 2.x listed "security not readable" (critical) above a measured warning.
    const ranked = rankDiscoveries([gap('security-gap'), measured('recurrence', 'warning'), measured('restarts', 'critical')]);
    expect(ranked.map((item) => item.id)).toEqual(['restarts', 'recurrence', 'security-gap']);
  });

  it('keeps a limitation on the list even when measured findings fill it', () => {
    const many = [1, 2, 3, 4, 5, 6].map((n) => measured(`m${n}`, 'critical'));
    const ranked = rankDiscoveries([...many, gap('security-gap')]);
    expect(ranked).toHaveLength(6);
    expect(ranked.some((item) => item.id === 'security-gap')).toBe(true);
    // The strongest measured findings survive; the weakest makes room.
    expect(ranked.filter((item) => item.id.startsWith('m'))).toHaveLength(5);
  });

  it('keeps both limitations when two exist and the list is full', () => {
    const many = [1, 2, 3, 4, 5, 6].map((n) => measured(`m${n}`, 'critical'));
    const ranked = rankDiscoveries([...many, gap('a'), gap('b', 'warning')]);
    expect(ranked).toHaveLength(6);
    expect(ranked.filter((item) => 'gap' in item)).toHaveLength(2);
  });

  it('returns everything when there is room, and nothing when there is nothing', () => {
    expect(rankDiscoveries([measured('a', 'warning'), gap('g')])).toHaveLength(2);
    expect(rankDiscoveries([])).toEqual([]);
  });
});
