import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 3.3.18 — the SE Report on the chart engine: the general report prints the same cockpit panels as
 * the pages and the Tech Wrapup (`features/cockpit/panels.tsx`), each kept whole on a page, and
 * "How problems behave" keeps its eight figures together (the owner's 3.3.17 review).
 */

const report = readFileSync(join(process.cwd(), 'ui/app/pages/ValueReport.tsx'), 'utf8');

describe('the SE Report on the chart engine', () => {
  it('prints the page panels, never a second copy of their arithmetic', () => {
    expect(report).toContain("from '../features/cockpit/panels'");
    for (const panel of ['<SlowestServices />', '<HostsAtCeiling />', '<ProblemArrivals />', '<FrontendErrors />']) {
      const at = report.indexOf(panel);
      expect(at, panel).toBeGreaterThan(-1);
      // Each sits in an atom, so print never splits a panel across two pages.
      expect(report.slice(Math.max(0, at - 160), at), panel).toContain('<div data-print-atom>');
    }
  });

  it('keeps "How problems behave" together: its figure grid is one print atom', () => {
    const section = report.slice(report.indexOf("{t('report.s2.title')}"));
    const grid = section.indexOf('<Grid data-print-grid min={150}>');
    expect(section.slice(0, grid)).toContain('<div data-print-atom>');
  });

  it('truncates a long name in print as it does on screen (no sideways overflow)', () => {
    // 3.4.1: the rules moved to `engine/printStyles.ts`, shared with the Assessment report.
    const styles = readFileSync(join(process.cwd(), 'ui/app/engine/printStyles.ts'), 'utf8');
    expect(styles).toContain('.pvs-errmeter__name');
    expect(styles).toContain('text-overflow: ellipsis !important');
    expect(styles).toContain('.pvs-sr-only { display: none !important; }');
    // The error meter takes the page's width in print, with the ring above it.
    expect(styles).toContain("[data-testid='dx-ringrank'] .pvs-svc-health");
  });

  it('closes the Overview Assist card on where its figure comes from, not on the app\'s money rule', () => {
    const cockpit = readFileSync(join(process.cwd(), 'ui/app/features/cockpit/OverviewCockpit.tsx'), 'utf8');
    expect(cockpit).toContain("footnote={t('cockpit.assist.footnote')}");
    expect(cockpit).not.toContain('noMoney');
  });
});
