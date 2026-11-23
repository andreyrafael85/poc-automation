import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ESTATE_DONUT_TOP, estateLayers } from '../features/cockpit/estateLayers';

/**
 * 3.3.12 — the Coverage stage on the chart engine (lot 3): Coverage, Technologies, Cloud, Business
 * events and Digital experience open on cockpit rows; Topology keeps its two maps at full width. No
 * query, scope or figure is added or removed.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const t = ((key: string) => key) as Parameters<typeof estateLayers>[2];
const fmt = ((value: number) => String(value)) as Parameters<typeof estateLayers>[3];

describe('the estate by layer', () => {
  it('names the five largest layers, folds the rest and sums only measured aggregate counts', () => {
    const records = [
      { category: 'hosts', value: 62 },
      { category: 'processes', value: 514 },
      { category: 'services', value: 70 },
      { category: 'applications', value: 4 },
      { category: 'synthetic', value: 73 },
      { category: 'k8s', value: 6 },
      { category: 'databases', value: 0 },
    ];
    const { segments, estate } = estateLayers(records, true, t, fmt);
    expect(ESTATE_DONUT_TOP).toBe(5);
    expect(segments.length).toBeLessThanOrEqual(ESTATE_DONUT_TOP + 1);
    expect(segments.every((segment) => segment.value > 0)).toBe(true);
    expect(segments.reduce((sum, segment) => sum + segment.value, 0)).toBe(estate);
  });

  it('draws nothing when the inventory did not answer', () => {
    expect(estateLayers([], false, t, fmt).segments).toHaveLength(0);
  });

  it('is the one helper the Overview and Coverage both use', () => {
    expect(read('ui/app/features/cockpit/OverviewCockpit.tsx')).toContain('estateLayers(inventory.records');
    expect(read('ui/app/features/assessment/CoverageInventory.tsx')).toContain('estateLayers(inventory.records');
  });
});

describe('the Coverage pages on the engine', () => {
  const rows = {
    'ui/app/features/assessment/CoverageInventory.tsx': 'cov-cockpit',
    'ui/app/pages/ProcessesAndTechnologies.tsx': 'tech-cockpit',
    'ui/app/pages/CloudObservability.tsx': 'cloud-cockpit',
    'ui/app/pages/BusinessObservability.tsx': 'biz-cockpit',
    'ui/app/pages/DigitalExperience.tsx': 'dx-cockpit',
  };

  it('open on a cockpit row', () => {
    for (const [file, testId] of Object.entries(rows)) expect(read(file), file).toContain(`<CockpitRow data-testid="${testId}"`);
  });

  it('keep the Coverage tiles compact with the source stated once, and the Business bars as "top N of M"', () => {
    const coverage = read('ui/app/features/assessment/CoverageInventory.tsx');
    expect(coverage).toContain('<Grid min={130}>');
    expect(coverage).toContain("query: 'cov.inventory'");
    expect(read('ui/app/pages/BusinessObservability.tsx')).toContain("t('cockpit.biz.topOfTotal'");
  });

  it('shows the Digital experience Assist only when it has something to say', () => {
    expect(read('ui/app/pages/DigitalExperience.tsx')).toMatch(/assist\.length > 0 && \(/);
  });
});
