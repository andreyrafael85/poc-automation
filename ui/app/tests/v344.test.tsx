import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { assumed } from '../config/assumptions';
import { EXECUTIVE_HIDDEN_ROUTES, NAVIGATION, RESTRICTED_ROUTES, SE_ONLY_ROUTES, STORY_STAGES } from '../config/navigation';
import { appLabel, dpaIndex, toApps, toBreadth } from '../features/platformAdoption/model';
import { getQuery } from '../queries/catalog';

/**
 * 3.4.4 — Platform adoption (owner's order of 2026-11-18: a page of its own, from the "Dynatrace
 * Intelligence feature adoption" and "Dynatrace Platform Adoption" v1.5.0 dashboards). Counts only, no user
 * named; the index follows the DPA method in the open.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const IDS = ['adopt.platform.total', 'adopt.platform.daily', 'adopt.platform.apps', 'adopt.platform.breadth', 'adopt.ai.total', 'adopt.ai.skills'] as const;

describe('the adoption reads', () => {
  it('are catalog entries validated at 0 bytes, reading system events only', () => {
    for (const id of IDS) {
      const entry = getQuery(id);
      expect(entry.requiredScope, id).toBe('storage:system:read');
      expect(entry.dql, id).toContain('fetch dt.system.events');
      expect(entry.validation.scannedBytesOnDemand, id).toBe(0);
      expect(entry.validation.validatedOn, id).toBe('2026-11-18');
    }
  });

  it('never return a user: user ids and e-mails are only counted', () => {
    for (const id of IDS) {
      const dql = getQuery(id).dql;
      for (const field of ['user_email', '`user.id`']) {
        const uses = dql.split(field).length - 1;
        if (uses === 0) continue;
        // Every use is inside a count, a filter on system ids, or a group that is counted away.
        expect(dql.replace(/countDistinctExact\([^)]*\)/g, '').includes('fields user'), id).toBe(false);
      }
      expect(dql).not.toMatch(/\|\s*fields[^\n]*user/);
    }
  });
});

describe('the adoption index (DPA method)', () => {
  const platform = { users: 16, dynatraceUsers: 13, apps: 49, browserActions: 82616, apiCalls: 9155, aiCalls: 2016, analyzerCalls: 573 };

  it('adds seven parts, each capped at its points', () => {
    const index = dpaIndex(platform, 4.36, 8);
    expect(index.parts).toHaveLength(7);
    expect(index.parts.reduce((sum, part) => sum + part.max, 0)).toBe(100);
    for (const part of index.parts) expect(part.points).toBeLessThanOrEqual(part.max);
    expect(index.parts.find((part) => part.id === 'aiVolume')?.points).toBe(10);
    expect(index.parts.find((part) => part.id === 'users')?.points).toBeCloseTo((16 / assumed('adoption.dpa.users')) * 15, 1);
    expect(index.value).toBe(Math.round(index.parts.reduce((sum, part) => sum + part.points, 0)));
  });

  it('shows no number when a read it needs did not answer', () => {
    expect(dpaIndex(null, 4, 8).value).toBeNull();
    expect(dpaIndex(platform, null, 8).value).toBeNull();
    expect(dpaIndex(platform, 4, null).value).toBeNull();
  });

  it('keeps custom apps apart and reads the breadth bands', () => {
    const apps = toApps([
      { app: 'dynatrace.notebooks', actions: 10, users: 2 },
      { app: 'my.poc.value.studio', actions: 50, users: 1 },
    ]);
    expect(apps.find((app) => app.app === 'my.poc.value.studio')?.custom).toBe(true);
    expect(appLabel('dynatrace.davis.problems')).toBe('Davis problems');
    expect(toBreadth([{ segment: '7+', users: 8 }])).toEqual({ '1': 0, '2-3': 0, '4-6': 0, '7+': 8 });
  });
});

describe('the page', () => {
  it('sits in the Impact stage, visible in executive mode, never for a viewer without access, no money', () => {
    expect(NAVIGATION.some((section) => section.route === '/adoption')).toBe(true);
    expect(STORY_STAGES.find((stage) => stage.id === 'impact')?.routes).toEqual(['/executive', '/adoption', '/consumption']);
    expect(EXECUTIVE_HIDDEN_ROUTES.has('/adoption')).toBe(false);
    expect(RESTRICTED_ROUTES.has('/adoption')).toBe(false);
    expect(SE_ONLY_ROUTES.has('/adoption')).toBe(false);
    const page = read('ui/app/pages/PlatformAdoption.tsx');
    expect(page).not.toMatch(/formatMoney|rateCard|useDql\(/);
    expect(page).toContain("t('adopt.privacy.body')");
  });

  it('is not read by the Assessment (owner: keep the subjects apart)', () => {
    expect(read('ui/app/features/assessment/useAssessment.ts')).not.toContain('adopt.');
  });
});
