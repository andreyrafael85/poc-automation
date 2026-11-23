import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { WHATS_NEW } from '../components/HelpPanels';
import { StudioProvider } from '../config/StudioContext';
import { filledTicks, StratoTicks } from '../engine/strato';
import { periodOptions, slicePoints } from '../engine/strato/StratoTimeseries';
import { entryFor } from '../i18n/strings';

/**
 * 3.5.9 — the visual proposal v6, wave 2 (approved by the owner on 2026-11-21): smooth areas with a period selector over
 * what was read, donuts with a tabular legend, segment bars for "x of y".
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const HOUR = 3_600_000;

describe('the period selector narrows what is drawn, never what is read', () => {
  it('offers the periods shorter than the read, then the whole read', () => {
    expect(periodOptions(0, 7 * 24 * HOUR).map((option) => option.key)).toEqual(['24h', 'all']);
    expect(periodOptions(0, 31 * 24 * HOUR).map((option) => option.key)).toEqual(['24h', '7d', 'all']);
    // A read of one day offers nothing to narrow.
    expect(periodOptions(0, 24 * HOUR)).toEqual([]);
  });

  it('keeps the bins that end inside the period, and every bin for the whole read', () => {
    const points = Array.from({ length: 28 }, (_, index) => ({ start: index * 6 * HOUR, end: (index + 1) * 6 * HOUR, value: index }));
    const end = 28 * 6 * HOUR;
    expect(slicePoints(points, end, 24 * HOUR)).toHaveLength(4);
    expect(slicePoints(points, end, null)).toHaveLength(28);
  });

  it('is on the problem arrivals and the evidence trends, smooth, on screen only', () => {
    const chart = read('ui/app/engine/strato/StratoTimeseries.tsx');
    expect(chart).toContain("curve={variant === 'bar' ? undefined : 'smooth'}");
    expect(chart).toContain('const options = periods && !still');
    expect(read('ui/app/features/cockpit/panels.tsx')).toMatch(/reference=\{\{ value: mean, label: meanText \}\}\n\s+periods/);
    expect(read('ui/app/components/TrendChart.tsx')).toMatch(/height=\{Math\.max\(height, 180\)\}\n\s+periods/);
    expect(entryFor('v6.period.note')['pt-BR']).toContain('janela inteira');
  });
});

describe('segment bars and the tabular legend', () => {
  it('fills at least one tick for any positive share and all of them only at the whole', () => {
    expect(filledTicks(7652, 7693, 24)).toBe(23);
    expect(filledTicks(1, 1000, 24)).toBe(1);
    expect(filledTicks(1000, 1000, 24)).toBe(24);
    expect(filledTicks(0, 1000, 24)).toBe(0);
  });

  it('draws the ticks with one reading for assistive technology, and nothing for a share not measured', () => {
    const wrap = (node: React.ReactNode) =>
      render(
        <AppRoot>
          <StudioProvider>{node}</StudioProvider>
        </AppRoot>,
      );
    const { container } = wrap(<StratoTicks value={7652} max={7693} name="Problems closed" reading="7,652 of 7,693" />);
    expect(container.querySelectorAll('.pvs-sticks__tick[data-on="true"]')).toHaveLength(23);
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Problems closed: 7,652 of 7,693');
    expect(wrap(<StratoTicks value={null} max={10} name="x" reading="x" />).container.querySelector('.pvs-sticks')).toBeNull();
  });

  it('heads the donut legend with name, count and share, hidden from assistive technology', () => {
    const donut = read('ui/app/engine/strato/StratoDonut.tsx');
    expect(donut).toContain('<li className="pvs-sdonut__head" aria-hidden="true">');
    // 3.6.0 (owner: "veja que está diferente dos demais"): the Overview's closed problems use the same bar as the other
    // cards; the segment ticks stay available for an "x of y" that is not a split.
    expect(read('ui/app/pages/CommandCenter.tsx')).not.toContain('<StratoTicks');
  });
});

describe('What’s new', () => {
  it('keeps 3.5.9 in the key list once it leaves the ten releases', () => {
    // 3.6.9: the ten releases shown start at 3.6.0 now; 3.5.9's text stays in the strings.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i101')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i101').en.startsWith('3.5.9 — ')).toBe(true);
  });
});
