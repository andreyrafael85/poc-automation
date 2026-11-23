import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { v3313Strings } from '../i18n/v3313';

/**
 * 3.3.13 — the Impact stage and Automation on the chart engine (lot 4): the Executive summary puts
 * the resolution speed beside the Assist, Consumption shows where the billed volume goes, and
 * Automation gains a Dynatrace Assist built from measured signals only. No query, scope, figure or
 * money is added; nothing is removed.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the Impact pages and Automation on the engine', () => {
  it('open on a cockpit row', () => {
    for (const [file, testId] of [
      ['ui/app/pages/ExecutiveSummary.tsx', 'exec-cockpit'],
      ['ui/app/pages/ConsumptionAndLicensing.tsx', 'cons-cockpit'],
      ['ui/app/pages/AutomationAndWorkflows.tsx', 'auto-cockpit'],
    ] as const) {
      expect(read(file), file).toContain(`<CockpitRow data-testid="${testId}"`);
    }
  });

  it('show each Assist only when it has something to say', () => {
    expect(read('ui/app/pages/ExecutiveSummary.tsx')).toMatch(/execAssist\.length > 0 && \(/);
    expect(read('ui/app/pages/AutomationAndWorkflows.tsx')).toMatch(/autoAssist\.length > 0 && \(/);
  });

  it('build the Automation Assist from the aggregate and the failing list, never an invented figure', () => {
    const page = read('ui/app/pages/AutomationAndWorkflows.tsx');
    expect(page).toContain("totals.outcome === 'ok' && executions !== null && executions > 0");
    expect(page).toContain("t('p.auto.assist.s.worst'");
  });

  it('draw the billed volume in bytes from capabilities with a plain byte count, never money', () => {
    const page = read('ui/app/pages/ConsumptionAndLicensing.tsx');
    expect(page).toContain("row.kind === 'volume'");
    expect(page).toContain('display: formatBytes(row.billedBytes)');
    for (const locale of ['en', 'pt-BR'] as const) {
      for (const key of ['cockpit.cons.title', 'p.auto.assist.s.rate', 'p.auto.assist.s.worst', 'p.auto.assist.s.clean'] as const) {
        expect(v3313Strings[key][locale], `${key} ${locale}`).not.toMatch(/[$€£]|R\$|USD|BRL|DPS/);
      }
    }
  });
});
