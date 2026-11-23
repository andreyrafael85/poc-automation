import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { bucketBars } from '../features/logs/BucketRetention';
import { entryFor } from '../i18n/strings';

/**
 * 3.6.3 — the v6 finishing touches (the owner's choice on 2026-11-22): Logs without the tiles that repeated its band and
 * with each bucket's volume and retention as bars; flat panels (no spectrum edge, no wash, no painted title); the app's
 * own areas in one hue. No new query.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('Logs', () => {
  it('no longer repeats the band’s figures in a second row of tiles', () => {
    const page = read('ui/app/pages/LogsAndDataQuality.tsx');
    expect(page).not.toContain('<KpiTile');
    expect(page).toContain('<PageSummary items={headline}');
    // The quality read still says when it was refused or failed.
    expect(page).toContain('<QueryStateBoundary result={quality} permissionImpact={t("st.logs.perm")}>{null}</QueryStateBoundary>');
  });

  it('draws each bucket’s share of the volume held, from every bucket (an uncapped read), largest first', () => {
    const { bars, total } = bucketBars([
      { name: 'small', bytes: 1_000, retentionDays: 10, hasAccess: true },
      { name: 'big', bytes: 3_000, retentionDays: 35, hasAccess: true },
      { name: 'locked', bytes: null, retentionDays: 365, hasAccess: false },
    ]);
    expect(total).toBe(4_000);
    expect(bars.map((bar) => bar.name)).toEqual(['big', 'small', 'locked']);
    expect(bars[0]?.share).toBe(75);
    // A size the platform did not report draws no bar — never a zero.
    expect(bars[2]?.share).toBeNull();
    expect(bars[2]?.readable).toBe(false);
    expect(read('ui/app/queries/catalog.ts')).toMatch(/'log\.buckets': \{[\s\S]*?'\| sort bytes desc',\n {4}\]\.join/);
  });
});

describe('flat panels and one-hue areas', () => {
  const css = read('ui/app/engine/spectrum.css');

  it('draws no spectrum edge, no wash and no painted title', () => {
    expect(css).toMatch(/\.pvs-spec-band__edge \{\n {2}\/\* 3\.6\.3[^\n]*\n {2}display: none;/);
    expect(css).toMatch(/\.pvs-pillar__edge,\n\.pvs-pillarboard__edge \{\n {2}\/\* 3\.6\.3[^\n]*\n {2}display: none;/);
    expect(css).toMatch(/\.pvs-panel\.pvs-spec-hero \.pvs-spec-hero__title \{[^}]*color: var\(--dt-colors-text-neutral-default\);\n\}/);
    expect(css).not.toMatch(/\.pvs-spec-hero__title \{[^}]*background-clip/);
  });

  it('draws the app’s own areas in one hue', () => {
    expect(read('ui/app/engine/v6.css')).toMatch(
      /:root \.pvs-area\.pvs-area\[data-spectrum\] \{\n {2}--pvs-sp-from: var\(--dt-colors-charts-categorical-vivid-color-01-default\);\n {2}--pvs-sp-to: var\(--dt-colors-charts-categorical-vivid-color-01-default\);/,
    );
  });
});

describe('What’s new', () => {
  it('lets 3.6.3 leave the ten releases', () => {
    // 3.7.3: i115 joined, so i105 left the ten.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i105')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i105').en.startsWith('3.6.3 — ')).toBe(true);
  });
});
