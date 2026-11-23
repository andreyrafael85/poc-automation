import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { StratoArc, StratoModeProvider, segmentPath, ARC_SEGMENTS } from '../engine/strato';
import { entryFor } from '../i18n/strings';
import { experienceFunnel } from '../models/experienceFunnel';
import { getQuery } from '../queries/catalog';

/**
 * 3.6.2 — the Experience funnel (the v5 proposal, approved 2026-11-21; one new catalog entry, `rum.funnel`, validated on
 * the lab tenant at 0 B) and every dial of the app as an arc of segments (the owner: "os gauges serão reestilizados
 * também … o atual está bem antigo").
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('rum.funnel — the experience funnel', () => {
  it('reads metrics only, validated live at 0 bytes, with a scope already declared', () => {
    const entry = getQuery('rum.funnel');
    expect(entry.requiredScope).toBe('storage:metrics:read');
    expect(entry.validation.scannedBytesOnDemand).toBe(0);
    expect(entry.validation.outcome).toBe('ok');
    expect(entry.dql).toContain('dt.frontend.experience.weight');
    expect(entry.dql).toContain('dt.rum.user_type == "real_user"');
    // A grouped list the platform bounds: no limit of its own, so its rows may be added up.
    expect(entry.dql).not.toMatch(/\|\s*limit\b/);
  });

  const rows = [
    { 'frontend.name': 'shop', actions: 37_396, satisfied: 31_950, tolerating: 5_416, frustrated: 30, requests: 108_350, requestsOk: 108_337, requestsFailed: 13 },
    { 'frontend.name': 'trade', actions: 10_762, satisfied: 4_040, tolerating: 1_362, frustrated: 5_360, requests: 31_922, requestsOk: 31_491, requestsFailed: 431 },
  ];

  it('draws each step as part of the one before, in user actions', () => {
    const funnel = experienceFunnel(rows);
    expect(funnel?.steps.map((step) => step.count)).toEqual([48_158, 42_768, 35_990]);
    expect(funnel?.steps.map((step) => step.drop)).toEqual([0, 5_390, 6_778]);
    expect(funnel?.steps[2]?.share).toBeCloseTo(74.73, 1);
    expect(funnel?.requests).toEqual({ total: 140_272, ok: 139_828, failed: 444 });
    expect(funnel?.mostFrustrated?.name).toBe('trade');
  });

  it('draws no funnel when no action was measured — never a zero', () => {
    expect(experienceFunnel([])).toBeNull();
    expect(experienceFunnel([{ 'frontend.name': 'x', actions: null, satisfied: 0, tolerating: 0, frustrated: 0 }])).toBeNull();
  });

  it('sits on Digital experience, after the headline figures', () => {
    const page = read('ui/app/pages/DigitalExperience.tsx');
    expect(page.indexOf('<ExperienceFunnel />')).toBeGreaterThan(page.indexOf('data-testid="dx-cockpit"'));
    expect(read('ui/app/features/experience/ExperienceFunnel.tsx')).toContain("useCatalogQuery('rum.funnel', scope)");
    expect(entryFor('exp.funnel.step.notFrustrated')['pt-BR']).toBe('Sem frustração');
  });
});

describe('the arc of segments', () => {
  it('lights as many segments as the share rounds to, at least one above zero and all only at the whole', () => {
    const lit = (value: number) => render(<StratoArc value={value} />).container.querySelector('.pvs-sarc')?.getAttribute('data-pvs-arc');
    expect(lit(88)).toBe('26');
    expect(lit(0.4)).toBe('1');
    expect(lit(99.6)).toBe(String(ARC_SEGMENTS - 1));
    expect(lit(100)).toBe(String(ARC_SEGMENTS));
    expect(segmentPath(0)).toMatch(/^M [\d.]+ [\d.]+ A 78 78 0 0 1 /);
  });

  it('comes in one segment after the other on screen only — never in a capture or in print', () => {
    const screen = render(<StratoArc value={50} />).container.querySelector('.pvs-sarc');
    expect(screen?.getAttribute('data-animate')).toBe('true');
    const capture = render(
      <StratoModeProvider mode="capture">
        <StratoArc value={50} />
      </StratoModeProvider>,
    ).container.querySelector('.pvs-sarc');
    expect(capture?.getAttribute('data-animate')).toBeNull();
    const css = read('ui/app/engine/v6.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n {2}\.pvs-sarc__seg \{\n {4}animation: none !important;/);
    expect(css).toMatch(/@media print \{\n {2}\.pvs-sarc__seg \{\n {4}animation: none !important;\n {4}opacity: 1 !important;/);
  });

  it('replaces the platform’s GaugeChart in the shared dials', () => {
    const gauge = read('ui/app/engine/strato/StratoGauge.tsx');
    expect(gauge).not.toContain('<GaugeChart');
    expect(gauge).toContain('<StratoArc');
    expect(read('ui/app/components/spectrum/ThresholdGauge.tsx')).toContain('className="pvs-tgauge__seg"');
  });
});

describe('What’s new', () => {
  it('lets 3.6.2 leave the ten releases', () => {
    // 3.7.2: i114 joined, so i104 left the ten.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i104')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i104').en.startsWith('3.6.2 — ')).toBe(true);
  });
});
