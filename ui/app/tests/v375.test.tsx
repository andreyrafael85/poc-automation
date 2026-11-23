import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { WHATS_NEW } from '../components/HelpPanels';
import { DonutBreakdown, DONUT_SHARE_BLOCKS } from '../components/viz/DonutBreakdown';
import { HEX_SHARE_BLOCKS, hexLayout, shareBlocks, StatusHexMap } from '../components/viz/StatusHexMap';
import { StudioProvider } from '../config/StudioContext';
import { HourHeatmap } from '../engine/chart/HourHeatmap';
import { entryFor } from '../i18n/strings';

/**
 * 3.7.5 (the owner: "encapsular tudo da 'O que falta da v6 (onda 4, parte 2)' … na 3.7.5, tudo em uma única entrega"):
 * the honeycombs as status hex maps, the app's donut with a tabular legend, the hero banners flat and neutral, the value
 * chain, pillars and journey with square icon boxes, the timeline's track in turquoise, the old tiles without a rail and
 * Adoption's heat map in neutral tones.
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');

describe('the status hex map', () => {
  const classes = [
    { key: 'high', label: 'High', color: 'red' },
    { key: 'review', label: 'Review', color: 'orange' },
    { key: 'none', label: 'None', color: 'green' },
  ] as const;

  it('lays the items out class by class, the classes that call for action first', () => {
    const placed = hexLayout(
      [
        { name: 'a', cls: 'none' },
        { name: 'b', cls: 'high' },
        { name: 'c', cls: 'review' },
        { name: 'd', cls: 'none' },
      ],
      ['high', 'review', 'none'],
      3,
    );
    expect(placed.map((hex) => hex.name)).toEqual(['b', 'c', 'a', 'd']);
    expect(placed.map((hex) => [hex.row, hex.col])).toEqual([[0, 0], [0, 1], [0, 2], [1, 0]]);
  });

  it('gives each share ten micro-blocks, at least one above zero and all ten only at the whole', () => {
    expect(shareBlocks(0, 10)).toBe(0);
    expect(shareBlocks(1, 100)).toBe(1);
    expect(shareBlocks(99, 100)).toBe(HEX_SHARE_BLOCKS - 1);
    expect(shareBlocks(5, 5)).toBe(HEX_SHARE_BLOCKS);
  });

  it('draws one hexagon per item with its name, and a legend table with counts and shares', () => {
    const { container } = render(
      <StatusHexMap
        items={[
          { name: 'host-1', cls: 'high' },
          { name: 'host-2', cls: 'none' },
          { name: 'host-3', cls: 'none' },
        ]}
        classes={classes}
        ariaLabel="Hosts by class"
        heads={{ cls: 'Class', count: 'Hosts', share: 'Share' }}
      />,
    );
    expect(container.querySelectorAll('polygon.pvs-hexmap__hex')).toHaveLength(3);
    expect(container.querySelector('polygon title')?.textContent).toBe('host-1 · High');
    const rows = [...container.querySelectorAll('.pvs-hexmap__legend tbody tr')].map((row) => row.textContent);
    // A class with no item is left out of the legend.
    expect(rows).toEqual(['High133%', 'None267%']);
    expect(container.querySelector('[data-pvs-chart="status-hex-map"]')?.getAttribute('aria-label')).toBe('Hosts by class');
  });

  it('replaced the platform honeycomb on Infrastructure and Services', () => {
    expect(read('pages/InfrastructureAndCloud.tsx')).not.toContain('HoneycombChart');
    expect(read('features/services/ServiceHealth.tsx')).not.toContain('HoneycombChart');
    expect(read('pages/InfrastructureAndCloud.tsx')).toContain('<StatusHexMap');
  });
});

describe('the app’s donut', () => {
  it('keeps its legend rows (the Tech Wrapup pins read them) and adds a header and the share in micro-blocks', () => {
    const { container } = render(
      <AppRoot>
        <StudioProvider>
      <DonutBreakdown
        segments={[
          { key: 'a', label: 'AWS', value: 3, display: '3' },
          { key: 'b', label: 'Azure', value: 1, display: '1' },
        ]}
        ariaLabel="Hosts by cloud"
        centerDisplay="4"
        centerLabel="hosts"
        heads={{ name: 'Name', count: 'Count', share: 'Share' }}
      />
        </StudioProvider>
      </AppRoot>,
    );
    expect(container.querySelectorAll('.pvs-legend-list__row')).toHaveLength(2);
    expect(container.querySelector('.pvs-donut__legend-head')?.textContent).toBe('NameCountShare%');
    const firstBlocks = container.querySelectorAll('.pvs-legend-list__row')[0]?.querySelectorAll('.pvs-donut__block');
    expect(firstBlocks).toHaveLength(DONUT_SHARE_BLOCKS);
    expect([...(firstBlocks ?? [])].filter((block) => block.getAttribute('data-on') === 'true')).toHaveLength(8);
  });
});

describe('the heat map and the flat pieces', () => {
  it('outlines the busiest hour', () => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    (grid[1] as number[])[9] = 5;
    (grid[2] as number[])[10] = 2;
    const { container } = render(
      <HourHeatmap grid={grid} weekdays={['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']} caption="c" cellLabel={(count) => String(count)} legend={{ less: 'less', more: 'more' }} />,
    );
    expect(container.querySelectorAll('[data-peak="true"]')).toHaveLength(1);
  });

  it('draws the banners flat with a thin brand strip, square icon boxes and the old tiles without a rail', () => {
    const spectrum = read('engine/spectrum.css');
    expect(spectrum).toMatch(/\.pvs-panel\.pvs-spec-hero \{\s*background:\s*linear-gradient\(90deg, var\(--pvs-spec-a\), var\(--pvs-spec-c\)\) top \/ 100% 3px no-repeat,\s*var\(--dt-colors-background-surface-default\);/);
    const v6 = read('engine/v6.css');
    expect(v6).toMatch(/\.pvs-chain__emblem,\s*\.pvs-pillar__emblem,\s*\.pvs-journey__emblem \{[^}]*border-radius: var\(--dt-borders-radius-field-default/);
    expect(v6).toMatch(/\.pvs-track__fill \{[^}]*background-color: var\(--pvs-v6-edge\)/);
    expect(v6).toMatch(/\.pvs-whenmap-wrap \.pvs-whenmap__cell\[data-peak='true'\]/);
    expect(read('components/FactTile.tsx')).toContain('rail={false}');
    expect(read('components/HeroBanner.tsx')).toContain('<Chip color="neutral" size="condensed">');
  });
});

describe('What’s new', () => {
  it('keeps 3.7.5 among the ten releases', () => {
    expect(WHATS_NEW).toContainEqual({ key: 'help.whatsNew.i117', published: '2026-11-23' });
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i117').en.startsWith('3.7.5 — ')).toBe(true);
  });
});
