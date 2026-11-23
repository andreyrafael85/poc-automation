import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { EXECUTIVE_HIDDEN_ROUTES, STORY_STAGES, isRouteVisible } from '../config/navigation';
import { preflight } from '../features/consumption/preflight';
import { logLines } from '../features/logs/ErrorConsole';
import { entryFor } from '../i18n/strings';
import { getQuery } from '../queries/catalog';

/**
 * 3.6.8 — the owner's points of 2026-11-22 before going on: Settings never in executive mode, a count column on the Logs
 * console in the selected window ("Sempre no período"), and the v6 wave 4 (the app's areas on the platform's chart, the
 * maps in the v6 tones).
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('executive mode', () => {
  it('shows the customer the app’s features, never its settings: the whole last stage leaves the menu', () => {
    expect(EXECUTIVE_HIDDEN_ROUTES.has('/settings')).toBe(true);
    const manage = STORY_STAGES.find((stage) => stage.id === 'manage');
    const audience = { executiveMode: true, commercialVisible: true, restricted: false };
    expect(manage?.routes.filter((route) => isRouteVisible(route, audience))).toEqual([]);
    // Outside executive mode the SE still finds both pages.
    expect(manage?.routes.filter((route) => isRouteVisible(route, { ...audience, executiveMode: false }))).toEqual(['/builder', '/settings']);
  });
});

describe('the Logs console counts its errors in the selected window', () => {
  it('reads the window the page is set to, grouped by message, with a ceiling of its own', () => {
    const entry = getQuery('log.errors.grouped');
    expect(entry.timeframe).toBe('global');
    expect(entry.guards).toEqual({ scanLimitGbytes: 20, maxResultRecords: 12 });
    expect(entry.dql).toContain('replacePattern');
    expect(entry.dql).toContain('summarize count = count(), last = max(timestamp), hosts = countDistinct(host.name)');
    expect(entry.dql).toContain('| limit 12');
    expect(entry.validation.scannedBytesOnDemand).toBe(1_851_443_351);
  });

  it('turns each group into a console line with its count and hosts', () => {
    const lines = logLines([
      { message: 'Connection refused to svc-# (attempt # of #)', service: 'svc-a', bucket: 'b', count: 1284, hosts: 3, last: '2026-11-22T14:42:00Z' },
      { message: '[ds:prometheus] DEVICE_CONNECTION_ERROR', service: null, workload: null, bucket: 'default_logs', count: '11517', hosts: '8', last: '2026-11-22T14:40:00Z' },
    ]);
    expect(lines[0]).toEqual({ time: '2026-11-22T14:42:00Z', origin: 'svc-a', message: 'Connection refused to svc-# (attempt # of #)', count: 1284, hosts: 3 });
    expect(lines[1]?.origin).toBe('default_logs');
    expect(lines[1]?.count).toBe(11_517);
  });

  it('adds the count’s read to the visit the pre-flight projects, growing with the window', () => {
    const ingest = [{ 'event.type': 'Log Management & Analytics - Ingest & Process', bytes: String(0.93 * 24 * 1024 ** 3) }];
    const day = preflight(ingest, 24).visitLogsGiB ?? 0;
    const week = preflight(ingest.map((row) => ({ ...row, bytes: String(0.93 * 168 * 1024 ** 3) })), 168).visitLogsGiB ?? 0;
    expect(day).toBeCloseTo(0.82 + 0.072 * 24, 5);
    expect(week).toBeCloseTo(0.82 + 0.072 * 168, 5);
  });
});

describe('v6, wave 4', () => {
  it('keeps the app’s own gradient areas, at the owner’s choice', () => {
    // The owner compared the platform's area with the app's and kept the gradient ("prefiro manter o primeiro degradê").
    expect(read('ui/app/components/spectrum/SpectrumArea.tsx')).toContain('pvs-sp-area-top');
    expect(read('ui/app/engine/v6.css')).toContain(':root .pvs-area.pvs-area[data-spectrum] {');
  });

  it('draws the maps in the v6 tones: neutral nodes and links, the light and the root cause in turquoise', () => {
    const css = read('ui/app/engine/v6.css');
    expect(css).toMatch(/\.pvs-stackmap__link \{\n {2}stroke: var\(--dt-colors-text-neutral-subdued\);/);
    expect(css).toMatch(/\.pvs-stackmap__flow \{\n {2}stroke: var\(--pvs-v6-edge\);/);
    expect(css).toMatch(/\.pvs-stackmap__node\[data-emphasis='true'\] \.pvs-stackmap__box \{\n {2}stroke: var\(--pvs-v6-edge\);\n {2}stroke-width: 2;\n {2}filter: none;/);
    expect(css).toMatch(/\.pvs-stackmap__node:not\(\[data-brand='true'\]\) \.pvs-stackmap__bar \{\n {2}display: none;/);
  });
});

describe('What’s new', () => {
  it('lets 3.6.8 leave the ten releases (3.7.8), its text kept', () => {
    // 3.7.8: i120 opened the list and i110 left it to keep ten.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i110')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i110').en.startsWith('3.6.8 — ')).toBe(true);
  });
});
