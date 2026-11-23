import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { depthGroups, modeOf } from '../features/assessment/DepthMap';
import { errorTotal, logLines } from '../features/logs/ErrorConsole';
import { presentationSteps, stepPhrase } from '../features/presentation/Presentation';
import { entryFor } from '../i18n/strings';
import { statusRows } from '../models/statusRows';
import { getQuery } from '../queries/catalog';

/**
 * 3.6.4 — the owner's choice on 2026-11-22: the discreet presentation mode and Coverage's depth map (no new read), the
 * status rows of Dynatrace Intelligence and the log console (two new reads, validated on the lab tenant within the
 * estimate he approved), and the harness states that were not reached.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the two new reads', () => {
  it('validated live within the approved estimates, on scopes already declared', () => {
    const rows = getQuery('prob.status.rows');
    expect(rows.requiredScope).toBe('storage:events:read');
    expect(rows.validation.scannedBytesOnDemand).toBeLessThan(1_000_000_000);
    expect(rows.dql).toContain('dedup event.id');
    expect(rows.dql).not.toMatch(/\|\s*limit\b/);
    const console = getQuery('log.errors.recent');
    expect(console.requiredScope).toBe('storage:logs:read');
    expect(console.timeframe).toEqual(getQuery('log.quality').timeframe);
    expect(console.validation.scannedBytesOnDemand).toBeLessThan(1_000_000_000);
  });
});

describe('status rows', () => {
  it('draws one bar per 3-hour slot of the window, counts the open ones whenever they began', () => {
    const model = statusRows(
      [
        { category: 'ERROR', slot: '2026-11-22T03:00:00Z', problems: 11, open: 6 },
        { category: 'ERROR', slot: '2026-11-21T21:00:00Z', problems: 16, open: 2 },
        { category: 'AVAILABILITY', slot: '2026-11-22T00:00:00Z', problems: 6, open: 0 },
        // Began before the window, still open: counted as open, not drawn.
        { category: 'ERROR', slot: '2026-10-31T15:00:00Z', problems: 2, open: 2 },
      ],
      '2026-11-22T05:32:00Z',
    );
    expect(model?.slotStarts).toHaveLength(56);
    expect(model?.rows.map((row) => row.category)).toEqual(['ERROR', 'AVAILABILITY']);
    const error = model?.rows[0];
    expect(error?.inWindow).toBe(27);
    expect(error?.open).toBe(10);
    expect(error?.slots[55]).toBe(11);
    expect(model?.openBefore).toBe(2);
    expect(statusRows([], '2026-11-22T05:32:00Z')).toBeNull();
  });
});

describe('the log console', () => {
  it('names where each error came from and takes the total from the aggregate', () => {
    const lines = logLines([
      { timestamp: '2026-11-22T05:31:55Z', content: 'Endpoint  down\n', service: null, host: 'ip-1', workload: null, bucket: 'default_logs' },
      { timestamp: '2026-11-22T05:31:49Z', content: 'x', service: 'svc-a', host: 'ip-2', workload: 'wl', bucket: 'b' },
    ]);
    expect(lines.map((line) => line.origin)).toEqual(['ip-1', 'svc-a']);
    expect(lines[0]?.message).toBe('Endpoint down');
    expect(errorTotal([{ status: 'ERROR', bucket: 'a', total: 9_000 }, { status: 'ERROR', bucket: 'b', total: 494 }, { status: 'INFO', total: 5 }])).toBe(9_494);
    expect(errorTotal([])).toBeNull();
    expect(read('ui/app/tests/catalogCaps.test.ts')).toMatch(/LIST_ONLY = new Set\(\[[\s\S]*'log\.errors\.recent'/);
  });
});

describe('the depth map', () => {
  it('groups every host by cloud and colours it by monitoring mode, a mode not reported said so', () => {
    const groups = depthGroups([
      { osType: 'LINUX', cloudType: 'EC2', monitoringMode: 'FULL_STACK', hosts: 30 },
      { osType: 'LINUX', cloudType: 'EC2', monitoringMode: 'INFRASTRUCTURE', hosts: 8 },
      { osType: 'WINDOWS', cloudType: null, monitoringMode: null, hosts: 5 },
    ]);
    expect(groups.map((group) => group.cloud)).toEqual(['EC2', null]);
    expect(groups[0]?.byMode).toEqual({ FULL_STACK: 30, INFRASTRUCTURE: 8, DISCOVERY: 0, UNKNOWN: 0 });
    expect(groups[1]?.byMode.UNKNOWN).toBe(5);
    expect(modeOf('infrastructure')).toBe('INFRASTRUCTURE');
    expect(read('ui/app/pages/Assessment.tsx')).toContain("<Tab title={t('asm.tab.depth')} keepMounted>");
  });
});

describe('the presentation mode', () => {
  it('takes the page’s top-level panels as steps and names each by its own heading', () => {
    const root = document.createElement('div');
    const outer = document.createElement('section');
    outer.className = 'pvs-panel';
    const title = document.createElement('h2');
    title.textContent = '  How the incident   spread ';
    const inner = document.createElement('div');
    inner.className = 'pvs-panel';
    outer.append(title, inner);
    root.append(outer);
    document.body.append(root);
    // jsdom lays nothing out: a laid-out panel is what counts.
    outer.getClientRects = () => [{}] as unknown as DOMRectList;
    expect(presentationSteps(root)).toEqual([outer]);
    expect(stepPhrase(outer)).toBe('How the incident spread');
    root.remove();
  });

  it('changes no figure and stays off paper', () => {
    const css = read('ui/app/engine/v6.css');
    expect(css).toMatch(/@media print \{\n {2}\.pvs-present \{\n {4}display: none !important;/);
    expect(css).toMatch(/@media screen \{\n {2}\.pvs-presenting \[data-present-step\]:not\(\[data-present-focus\]\)/);
    const header = read('ui/app/components/StudioHeader.tsx');
    expect(header).toContain('data-testid="present-start"');
    expect(read('ui/app/App.tsx')).toContain('<PresentationBar />');
    expect(React).toBeDefined();
  });
});

describe('What’s new', () => {
  it('lets 3.6.4 leave the ten releases (3.7.4), its text kept in the dictionary', () => {
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i106')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i106').en.startsWith('3.6.4 — ')).toBe(true);
  });
});
