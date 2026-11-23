import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { day0Rows } from '../features/executive/Day0VsToday';
import { entryFor } from '../i18n/strings';
import { propagationGraph } from '../models/rcaGraph';
import { getQuery } from '../queries/catalog';
import { renderCatalogDql } from '../queries/params';
import { TD08_DQL, TD08_IDS } from './fixtures/td08.dql';

/**
 * 3.6.1 — from the v5 proposal (approved 2026-11-21): the RCA propagation v4 (the graph from the cause to the impact,
 * the time on each entity, the ruler) above the 3.5.4 layers, and Day 0 × today on the Executive summary. One new
 * catalog entry, `rca.edges`, validated on the lab tenant at 0 B after a 0 B estimate, with the owner's approval.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('rca.edges — the calls among an incident’s services', () => {
  it('renders from the entity model with the ids as typed, quoted parameters', () => {
    const rendered = renderCatalogDql(getQuery('rca.edges'), { serviceIds: [TD08_IDS.caller, TD08_IDS.root] });
    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.dql).toBe(TD08_DQL['3.6.1 rca.edges']);
    expect(renderCatalogDql(getQuery('rca.edges'), { serviceIds: ['SERVICE-"x'] }).ok).toBe(false);
  });

  it('carries its live validation at 0 bytes and needs only the entity scope already declared', () => {
    const entry = getQuery('rca.edges');
    expect(entry.requiredScope).toBe('storage:entities:read');
    expect(entry.validation.scannedBytesOnDemand).toBe(0);
    expect(entry.validation.validatedOn).toBe('2026-11-21');
    expect(entryFor('catalog.purpose.rca.edges')['pt-BR']).toContain('modelo de entidades');
  });
});

describe('the propagation graph', () => {
  const base = {
    root: { id: 'SERVICE-DB', name: 'payments-db', kind: 'database' as const },
    affected: [
      { id: 'SERVICE-A', name: 'svc-checkout-01', kind: 'service' as const },
      { id: 'SERVICE-B', name: 'svc-orders-03', kind: 'service' as const },
      { id: 'SERVICE-C', name: 'svc-lonely', kind: 'service' as const },
      { id: 'APPLICATION-1', name: 'web-shop', kind: 'application' as const },
    ],
    callers: [{ id: 'SERVICE-A', name: 'svc-checkout-01', failures: 3412 }],
    edges: [{ from: 'SERVICE-B', to: 'SERVICE-A' }],
    events: [
      { source: 'SERVICE-DB', startIso: '2026-09-09T05:03:00Z' },
      { source: 'SERVICE-A', startIso: '2026-09-09T05:11:00Z' },
      { source: 'SERVICE-A', startIso: '2026-09-09T05:20:00Z' },
    ],
    startIso: '2026-09-09T05:16:00Z',
    endIso: null,
    open: true,
  };

  it('places each hop by a recorded call, the unreached apart, the users last', () => {
    const graph = propagationGraph(base);
    expect(graph.columns.map((column) => column.id)).toEqual(['cause', 'hop1', 'hop2', 'also', 'users']);
    expect(graph.columns[1]?.nodes[0]).toMatchObject({ name: 'svc-checkout-01', failures: 3412, firstEventIso: '2026-09-09T05:11:00Z' });
    expect(graph.columns[2]?.nodes.map((node) => node.name)).toEqual(['svc-orders-03']);
    expect(graph.columns[3]?.nodes.map((node) => node.name)).toEqual(['svc-lonely']);
    expect(graph.links).toEqual([
      { from: 'SERVICE-A', to: 'SERVICE-DB' },
      { from: 'SERVICE-B', to: 'SERVICE-A' },
    ]);
  });

  it('keeps the first event of each entity, never an estimate, and a ruler from those times', () => {
    const graph = propagationGraph(base);
    expect(graph.columns[2]?.nodes[0]?.firstEventIso).toBeUndefined();
    expect(graph.ruler).toEqual({ startIso: '2026-09-09T05:16:00Z', endIso: null, open: true, events: ['2026-09-09T05:03:00Z', '2026-09-09T05:11:00Z'] });
  });

  it('draws nothing without a root cause with an id', () => {
    expect(propagationGraph({ ...base, root: null }).columns).toEqual([]);
  });

  it('sits above the 3.5.4 layers on the Propagation tab, with sparks hidden under reduced motion and in print', () => {
    const page = read('ui/app/pages/ProblemsRca.tsx');
    expect(page.indexOf('<RcaPropagationGraph incident={incident} />')).toBeLessThan(page.indexOf('<RcaPropagation incident={incident} />'));
    const css = read('ui/app/engine/v6.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n {2}\.pvs-rgraph__spark \{\n {4}display: none;/);
  });
});

describe('Day 0 and today', () => {
  const inventory = (hosts: number, services: number) => [
    { category: 'Hosts', value: hosts },
    { category: 'Services', value: services },
  ];

  it('draws only indicators measured on both sides, with which way is better', () => {
    const rows = day0Rows(inventory(45, 50), inventory(62, 70), [], null);
    expect(rows.map((row) => [row.key, row.day0, row.today, row.better])).toEqual([
      ['hosts', 45, 62, 'up'],
      ['services', 50, 70, 'up'],
    ]);
    // Without a Day 0 read there is nothing to compare — no row is guessed.
    expect(day0Rows([], inventory(62, 70), [], null)).toEqual([]);
  });

  it('is on the Executive summary, from the PoC timeline’s reads only', () => {
    expect(read('ui/app/pages/ExecutiveSummary.tsx')).toContain('<Day0VsToday />');
    const panel = read('ui/app/features/executive/Day0VsToday.tsx');
    for (const id of ['cov.inventory.day0', 'cov.inventory', 'prob.poc.daily']) expect(panel).toContain(`useCatalogQuery('${id}', scope)`);
  });
});

describe('What’s new', () => {
  it('lets 3.6.1 leave the ten releases', () => {
    // 3.7.1: i113 joined, so i103 left the ten.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i103')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i103').en.startsWith('3.6.1 — ')).toBe(true);
  });
});
