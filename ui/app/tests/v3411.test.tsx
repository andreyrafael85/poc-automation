import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import type { AssessmentSignals } from '../features/assessment/findings';
import { preflight } from '../features/consumption/preflight';
import { GIB, groupReads, meterSnapshot, recordRead, resetMeter, setMeterPage } from '../features/consumption/sessionMeter';
import { gapExpansions } from '../features/licensing/gapExpansion';

/**
 * 3.4.11 — the cost pre-flight (F-14), the session meter (F-16 layer 1) and the gap → expansion link in Licensing
 * (F-15), from the owner's orders of 2026-11-18. No new query, no new scope; money only in Licensing.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the session meter counts what Grail already said it read', () => {
  beforeEach(() => resetMeter());

  it('counts an answer once, however many panels share it, and a refetch again', () => {
    setMeterPage('/coverage');
    const answer = {};
    expect(recordRead(answer, 'log.quality', 0.5 * GIB)).toBe(true);
    expect(recordRead(answer, 'log.quality', 0.5 * GIB)).toBe(false);
    setMeterPage('/logs');
    expect(recordRead({}, 'log.quality', 0.5 * GIB)).toBe(true);
    expect(recordRead({}, 'cov.inventory', 0)).toBe(true);
    expect(recordRead({}, 'rum.sessions', null)).toBe(false);
    const byQuery = groupReads(meterSnapshot(), 'id');
    expect(byQuery[0]).toEqual({ key: 'log.quality', reads: 2, bytes: GIB });
    expect(groupReads(meterSnapshot(), 'page').map((group) => group.key).sort()).toEqual(['/coverage', '/logs']);
  });

  it('is fed by every catalog read and never runs a query of its own', () => {
    const hook = read('ui/app/hooks/useCatalogQuery.ts');
    expect(hook).toContain('recordRead(result.data, entry.id, quality.scannedBytes)');
    expect(read('ui/app/features/consumption/sessionMeter.ts')).not.toMatch(/useCatalogQuery|useDql|queryExecute/);
  });
});

const ingest = (gibPerHour: number, hours: number, billedQueryGib = 0) => [
  { 'event.type': 'Log Management & Analytics - Ingest & Process', bytes: gibPerHour * hours * GIB, events: 1 },
  ...(billedQueryGib > 0 ? [{ 'event.type': 'Log Management & Analytics - Query', bytes: billedQueryGib * GIB, events: 1 }] : []),
];

describe('the pre-flight projects a full visit from the tenant’s own log volume', () => {
  it('gives back the lab visit on the lab tenant', () => {
    const plan = preflight(ingest(0.93, 24), 24);
    expect(plan.ratio).toBeCloseTo(1, 5);
    // 3.6.8: the Logs console's count adds 0.072 GiB per hour of window to the log part (24 h here).
    expect(plan.visitGiB).toBeCloseTo(0.82 + 0.072 * 24 + 2.19 + 0.51, 5);
    expect(plan.large).toBe(false);
    expect(plan.billedLogQueryGiB).toBe(0);
  });

  it('flags a tenant twenty times larger as one to read with a plan, and says when logs are billed per query', () => {
    const plan = preflight(ingest(0.93 * 20, 24, 3), 24);
    expect(plan.visitLogsGiB).toBeCloseTo((0.82 + 0.072 * 24) * 20, 5);
    expect(plan.large).toBe(true);
    expect(plan.billedLogQueryGiB).toBeCloseTo(3, 5);
  });

  it('projects nothing from a read that did not answer', () => {
    expect(preflight(null, 24).visitGiB).toBeNull();
    expect(preflight(ingest(1, 24), 0).visitGiB).toBeNull();
  });
});

const SIGNALS = {
  webApps: 4,
  frontendsWithRealUsers: 3,
  syntheticMonitors: 0,
  clusters: 3,
  clustersWithMetrics: 2,
  bizEvents: 0,
} as unknown as AssessmentSignals;

describe('each gap beside the capability that closes it (Licensing only)', () => {
  it('prices only what was measured and leaves the rest to size with the customer', () => {
    const gaps = gapExpansions(SIGNALS, {
      hosts: [
        { mode: 'infra', count: 2, ramGib: 32, hostUnitsEach: 2 },
        { mode: 'full-stack', count: 5, ramGib: 80, hostUnitsEach: 1 },
      ],
      fullStackGib: 80,
      appSecActive: false,
    });
    expect(gaps.map((gap) => gap.id)).toEqual(['fullStack', 'appsec', 'rum', 'synthetic', 'kubernetes', 'business']);
    const fullStack = gaps.find((gap) => gap.id === 'fullStack');
    // 32 GiB × 8,760 h × 0.01 USD, less 2 hosts × 8,760 h × 0.04 USD of infrastructure monitoring.
    expect(fullStack?.annualUsd).toBeCloseTo(32 * 8760 * 0.01 - 2 * 8760 * 0.04, 5);
    expect(gaps.find((gap) => gap.id === 'appsec')?.annualUsd).toBeCloseTo(80 * 8760 * 0.00225, 5);
    for (const id of ['rum', 'synthetic', 'kubernetes', 'business']) expect(gaps.find((gap) => gap.id === id)?.annualUsd).toBeNull();
  });

  it('lives on the Licensing projection tab, with the app consumption a Licensing tab since 3.4.13 (SE and partner only)', () => {
    const licensing = read('ui/app/pages/Licensing.tsx');
    expect(licensing).toContain('data-testid="lic-gaps"');
    expect(licensing.indexOf('data-testid="lic-gaps"')).toBeGreaterThan(licensing.indexOf("<Tab title={t('p.lic.tab.projection')}>"));
    // 3.4.13 (owner's order): the consumption tab moved from Settings to Licensing, an SE-only page.
    expect(licensing).toContain("<Tab title={t('settings.tab.consumption')}>");
    expect(read('ui/app/config/navigation.ts')).toContain("SE_ONLY_ROUTES: ReadonlySet<string> = new Set(['/licensing'");
    // 3.7.6 (the owner asked for the app's consumption in money on this tab): money only inside Licensing, only through the
    // rate card (localValue answers null with the rate card off) — the panel is rendered by Licensing alone (rule 6).
    const panel = read('ui/app/features/consumption/ConsumptionPanel.tsx');
    expect(panel).not.toMatch(/PUBLIC_DPS_RATES|formatMoney\(/);
    expect(panel).toMatch(/localValue\(usd, rateCard\)/);
  });
});
