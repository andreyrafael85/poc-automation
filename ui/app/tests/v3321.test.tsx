import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReadinessList } from '../engine/chart/ReadinessList';

/**
 * 3.3.21 — the owner's order "pode antecipar a 3.3.20 e 3.3.21": Licensing and Settings on the
 * chart engine. Settings opens on what is ready to present; Licensing on what its sizing rests on
 * and, in the cost projection only, where the estimate goes (rule 6: money stays in Licensing).
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the readiness list', () => {
  it('says the state of each item in words, never by the mark alone', () => {
    render(
      <ReadinessList
        ariaLabel="Ready to present"
        doneLabel="set"
        openLabel="to fill in"
        items={[
          { key: 'customer', label: 'Customer name', where: 'Customer & engagement', done: true },
          { key: 'logo', label: 'Customer logo', where: 'Customer & engagement', done: false },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Ready to present' });
    const rows = list.querySelectorAll('.pvs-ready__item');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute('data-done')).toBe('true');
    expect(rows[0]?.textContent).toContain('set');
    expect(rows[1]?.textContent).toContain('to fill in');
  });

  it('draws nothing without items', () => {
    const { container } = render(<ReadinessList ariaLabel="x" doneLabel="a" openLabel="b" items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('the pages', () => {
  it('Settings opens on what is ready, the commercial item only when commercial data is visible', () => {
    const page = read('ui/app/pages/Settings.tsx');
    expect(page).toContain('data-testid="settings-ready"');
    // 3.7.7: the readiness lives in features/setup/readiness.ts (shared with the first-run wizard).
    expect(read('ui/app/features/setup/readiness.ts')).toMatch(/if \(who\.commercialVisible\) steps\.push\(\{ key: 'rate'/);
    expect(page).toContain('useReadiness()');
  });

  it('Licensing shows the sizing basis in the DPS tab and the split by capability only inside the cost projection', () => {
    const page = read('ui/app/pages/Licensing.tsx');
    expect(page).toContain('data-testid="lic-basis"');
    const projection = page.slice(page.indexOf("t('p.lic.tab.projection')"));
    expect(projection).toContain('data-testid="lic-split"');
    expect(page.indexOf('data-testid="lic-split"')).toBeGreaterThan(page.indexOf("t('p.lic.tab.projection')"));
  });
});
