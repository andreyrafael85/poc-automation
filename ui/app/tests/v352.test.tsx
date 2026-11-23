import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { summaryIcon } from '../components/PageSummary';
import { StatusRadar } from '../components/spectrum/StatusRadar';
import { entryFor } from '../i18n/strings';

/**
 * 3.5.2 — the owner's validation of 3.5.0 and 3.5.1 (2026-11-20): the header gauges drawn again, the brand gradient
 * back on the Overview's header, number cards with life, the scorecard's radar restyled (without inventing a score).
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the Overview’s header', () => {
  it('measures a chart’s block at full width, so a centred gauge is drawn (3.5.1 left it blank)', () => {
    expect(read('ui/app/engine/strato/mode.tsx')).toContain("style={{ width: '100%'");
  });

  it('sits on the Dynatrace brand gradient, tokens only, flat on paper', () => {
    const css = read('ui/app/engine/spectrum.css');
    // 3.7.6: the Executive summary's banner shares the background.
    expect(css).toMatch(/\.pvs-sheader\.pvs-panel,\s*\.pvs-panel\.pvs-spec-hero\[data-brand='true'\] \{[^}]*radial-gradient/);
    expect(css).toMatch(/@media print \{\s*\.pvs-skpi-row > \.pvs-skpi,\s*\.pvs-skpi\[data-accent\],\s*\.pvs-sheader\.pvs-panel,\s*\.pvs-panel\.pvs-spec-hero\[data-brand='true'\] \{\s*background-image: none;/);
  });
});

describe('number cards with life', () => {
  it('gives each figure of a band the platform icon for what it counts', () => {
    const { container } = render(<>{summaryIcon('hosts')}{summaryIcon('failingServices')}{summaryIcon('unknown-key')}</>);
    expect(container.querySelectorAll('svg').length).toBe(3);
    expect(read('ui/app/components/PageSummary.tsx')).toContain('badge={summaryIcon(item.key)}');
    expect(read('ui/app/engine/spectrum.css')).toContain('.pvs-skpi-row > .pvs-skpi:nth-child(6n + 2)');
  });
});

describe('the scorecard’s radar', () => {
  it('says each dimension’s step on the scale (“4/5”), never a percentage nobody measured', () => {
    const { container } = render(
      <AppRoot>
        <StatusRadar
          label="Status"
          rungLabels={['Blocked', 'Worth reviewing', 'In progress', 'Working', 'Demonstrated']}
          axes={[
            { id: 'a', label: 'Coverage', status: 'good', statusLabel: 'Working' },
            { id: 'b', label: 'Automation', status: 'warning', statusLabel: 'Worth reviewing' },
            { id: 'c', label: 'Security', status: null, statusLabel: 'Not read' },
          ]}
        />
      </AppRoot>,
    );
    expect([...container.querySelectorAll('.pvs-rank__value')].map((node) => node.textContent)).toEqual(['—', '2/5', '4/5']);
    expect(container.textContent).not.toMatch(/\d+ ?%/);
    expect(container.querySelector('.pvs-status-radar')).not.toBeNull();
    expect(container.querySelector('.pvs-radar__dot[data-status="good"]')).not.toBeNull();
  });

  it('no longer reads “Partial” in pt-BR (rule 13) — the middle step is “in progress”', () => {
    expect(entryFor('f.score.status.neutral')['pt-BR']).toBe('Em andamento');
  });
});
