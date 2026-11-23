import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { WHATS_NEW } from '../components/HelpPanels';
import { StudioProvider } from '../config/StudioContext';
import { StratoKpi } from '../engine/strato';
import { observed } from '../models/provenance';
import { entryFor } from '../i18n/strings';

/**
 * 3.5.8 — the visual proposal v6, wave 1 (approved by the owner on 2026-11-21): the side menu, the neutral dark
 * surfaces and the number cards with their icon box and the change chip from a measured "before".
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const evidence = { queryId: 'cov.inventory', source: 'grail', timeframe: { from: 'now()-24h', to: 'now()' } } as never;

describe('the v6 look, wave 1', () => {
  it('loads its stylesheet after the spectrum one, with tokens only', () => {
    const gate = read('ui/app/components/AccessGate.tsx');
    expect(gate.indexOf("import '../engine/v6.css';")).toBeGreaterThan(gate.indexOf("import '../engine/spectrum.css';"));
    const css = read('ui/app/engine/v6.css');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // The dark surfaces are Strato's own, darkened; the light theme is left to the platform.
    expect(css).toContain("--dt-colors-background-base-default: color-mix(in srgb, var(--dt-colors-theme-background-shell-default)");
    expect(css).not.toMatch(/:root\[data-theme='light'\]/);
  });

  it('draws the menu with small uppercase stage headings and the current page on a turquoise edge', () => {
    const css = read('ui/app/engine/v6.css');
    expect(css).toMatch(/\.pvs-nav__stage-title \{[^}]*text-transform: uppercase;/);
    expect(css).toMatch(/\.pvs-nav__link\[aria-current='page'\] \{[^}]*box-shadow: inset 2px 0 0 var\(--pvs-v6-edge\);/);
  });

  it('puts the card’s icon in a box at its right and keeps the cards flat', () => {
    const css = read('ui/app/engine/v6.css');
    expect(css).toMatch(/\.pvs-skpi \.pvs-skpi__badge \{[^}]*order: 2;[^}]*border: 1px solid/);
    expect(css).toMatch(/\.pvs-skpi-row > \.pvs-skpi::after,\n\.pvs-skpi\[data-accent\]::after \{\n {2}content: none;/);
  });
});

describe('the change chip', () => {
  const wrap = (node: React.ReactNode) =>
    render(
      <AppRoot>
        <StudioProvider>{node}</StudioProvider>
      </AppRoot>,
    );

  it('shows a measured change with its arrow, its sign and the words for assistive technology', () => {
    const { container } = wrap(
      <StratoKpi label="Hosts" fact={observed(62, evidence)} value={62} delta={{ value: 17, display: '+17', words: '+17 since the PoC’s Day 0', tone: 'good' }} />,
    );
    const chip = container.querySelector('.pvs-skpi__delta');
    expect(chip?.getAttribute('data-tone')).toBe('good');
    expect(chip?.getAttribute('data-direction')).toBe('up');
    expect(chip?.textContent).toContain('▲');
    expect(screen.getByText('+17 since the PoC’s Day 0')).toBeTruthy();
  });

  it('shows no chip on a card whose number was not measured', () => {
    const { container } = wrap(<StratoKpi label="Hosts" fact={observed(null, evidence)} value={null} delta={{ value: 3, display: '+3', words: 'x', tone: 'good' }} />);
    expect(container.querySelector('.pvs-skpi__delta')).toBeNull();
  });

  it('compares the Overview’s inventory with the PoC’s Day 0 only through the existing catalog read', () => {
    const page = read('ui/app/pages/CommandCenter.tsx');
    expect(page).toContain("useCatalogQuery('cov.inventory.day0', scope)");
    expect(page).toContain('inventoryDeltas(day0.records, inventory.records)');
    expect(page).toContain('delta={deltaFor(category)}');
    expect(entryFor('v6.delta.day0')['pt-BR']).toBe('{change} desde o Dia 0 da PoC');
  });
});

describe('What’s new', () => {
  it('keeps 3.5.8 in the key list once it leaves the ten releases', () => {
    // 3.6.8: the ten releases shown start at 3.5.9 now; 3.5.8's text stays in the strings.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i100')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i100').en.startsWith('3.5.8 — ')).toBe(true);
  });
});
