import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AppRoot } from '@dynatrace/strato-components/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ActionPlanTable, type PlanActionRow } from '../features/assessment/ActionPlanTable';
import { csvCell, EMPTY_PLAN, mergePlan, parsePlan, planCsv, planFileName, planProgress, type ActionPlan } from '../features/assessment/actionPlan';
import { CAPABILITY_LABEL } from '../features/assessment/adoption';
import { CAPABILITY_DOCS, docFor } from '../features/assessment/docLinks';
import type { ActionPlanState } from '../features/assessment/useActionPlan';
import { EN_TEXT } from '../features/insights/deriveInsights';

/**
 * 3.4.6 — the Assessment's action plan (proposal §C8 F-06) and the Dynatrace documentation beside each
 * recommendation (F-09). No new query, no new scope, no money.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the stored plan is read as untrusted input', () => {
  it('keeps well-formed entries only, and never trusts a field it cannot read', () => {
    const plan = parsePlan(
      JSON.stringify({
        v: 1,
        savedAt: '2026-11-18T16:00:00Z',
        items: {
          'ASM-04': { owner: '  Platform team  ', due: '2026-12-01', status: 'inProgress' },
          'ASM-10': { owner: 'x'.repeat(200), due: '2026-13-45', status: 'whatever' },
          'not-a-rule': { owner: 'ignored', due: null, status: 'done' },
        },
      }),
    );
    expect(plan.items['ASM-04']).toEqual({ owner: 'Platform team', due: '2026-12-01', status: 'inProgress' });
    expect(plan.items['ASM-10']?.owner).toHaveLength(80);
    expect(plan.items['ASM-10']?.due).toBeNull();
    expect(plan.items['ASM-10']?.status).toBe('open');
    expect(plan.items['not-a-rule']).toBeUndefined();
    expect(parsePlan('{not json')).toEqual(EMPTY_PLAN);
    expect(parsePlan({ v: 2, items: {} })).toEqual(EMPTY_PLAN);
  });

  it('lays only the edited entries over the latest stored plan, and drops an entry with nothing agreed', () => {
    const latest: ActionPlan = {
      v: 1,
      savedAt: null,
      items: { 'ASM-04': { owner: 'SRE', due: null, status: 'open' }, 'ASM-13': { owner: 'K8s team', due: null, status: 'done' } },
    };
    const next = mergePlan(latest, { 'ASM-04': { owner: '', due: null, status: 'open' }, 'ASM-26': { owner: 'Security', due: '2026-12-15', status: 'open' } }, 'now');
    expect(Object.keys(next.items).sort()).toEqual(['ASM-13', 'ASM-26']);
    expect(next.savedAt).toBe('now');
  });
});

describe('progress counts the plan exactly over the actions shown', () => {
  it('counts each state, the owners named and the dates to review', () => {
    const plan: ActionPlan = {
      v: 1,
      savedAt: null,
      items: {
        'ASM-04': { owner: 'SRE', due: '2026-11-01', status: 'inProgress' },
        'ASM-13': { owner: '', due: '2026-11-01', status: 'done' },
        'ASM-99': { owner: 'gone', due: null, status: 'done' },
      },
    };
    expect(planProgress(['ASM-04', 'ASM-13', 'ASM-26'], plan, '2026-11-18')).toEqual({ total: 3, done: 1, inProgress: 1, open: 1, overdue: 1, owned: 1 });
  });
});

describe('the CSV', () => {
  it('quotes every cell and never lets a cell run as a formula', () => {
    expect(csvCell('a "b" c')).toBe('"a ""b"" c"');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('-1')).toBe('"\'-1"');
    expect(csvCell(3)).toBe('"3"');
  });

  it('starts with a byte-order mark and ends lines with CRLF; the file name carries no odd character', () => {
    const csv = planCsv(['#', 'Action'], [
      { rank: 1, priority: 'P1', action: 'Fix it', rule: 'ASM-04', finding: 'F', capability: 'C', owner: '', due: '', status: 'To start', docs: '' },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split('\r\n')).toHaveLength(3);
    expect(planFileName('Açme Corp / São Paulo', new Date(2026, 10, 18))).toBe('assessment-plan-acme-corp-sao-paulo-2026-11-18.csv');
  });
});

describe('the Dynatrace documentation beside each recommendation (F-09)', () => {
  it('has a page of docs.dynatrace.com for every capability the Assessment names', () => {
    for (const key of Object.values(CAPABILITY_LABEL)) expect(docFor(key)).not.toBeNull();
    for (const url of Object.values(CAPABILITY_DOCS)) expect(url).toMatch(/^https:\/\/docs\.dynatrace\.com\/docs\/[a-z0-9/-]+$/);
    const capabilities = new Set(read('ui/app/features/assessment/findings.ts').match(/'asm\.cap\.[a-zA-Z]+'/g));
    for (const quoted of capabilities) expect(CAPABILITY_DOCS[quoted.slice(1, -1) as keyof typeof CAPABILITY_DOCS]).toBeDefined();
  });

  it('carries the capability key on every finding', () => {
    expect(read('ui/app/features/assessment/findings.ts')).toContain('capabilityKey: mapping.capability');
    expect(EN_TEXT.t('asm.plan.docsLong', { capability: 'OneAgent' })).toBe('How to set up OneAgent (Dynatrace documentation)');
  });
});

const ROWS: PlanActionRow[] = [
  {
    rank: 1,
    priority: 'P1',
    rule: 'ASM-04',
    title: 'Investigate the failure rate',
    action: 'Open the service',
    capability: 'Distributed tracing',
    capabilityKey: 'asm.cap.tracing',
    evidence: 'svc.ranking',
    drilldown: '/services',
  },
  {
    rank: 2,
    priority: 'P2',
    rule: 'ASM-13',
    title: 'Stabilise the workload',
    action: 'Investigate the restarts',
    capability: 'Kubernetes monitoring',
    capabilityKey: 'asm.cap.kubernetes',
    evidence: 'k8s.restarts',
    drilldown: '/kubernetes',
  },
];

const stateWith = (plan: ActionPlan, save = vi.fn().mockResolvedValue(true)): ActionPlanState => ({ plan, status: 'ready', save });

const renderTable = (state: ActionPlanState, editable: boolean) =>
  render(
    <AppRoot>
    <MemoryRouter>
      <ActionPlanTable
        rows={ROWS}
        state={state}
        editable={editable}
        technical={editable}
        customerName="Acme"
        t={EN_TEXT.t}
        formatNumber={(value) => String(value)}
        formatDay={(day) => String(day)}
      />
    </MemoryRouter>
    </AppRoot>,
  );

describe('the plan on the page', () => {
  it('reads in words for everyone else: "To be agreed" until the SE fills it in', () => {
    renderTable(stateWith({ v: 1, savedAt: null, items: { 'ASM-04': { owner: 'SRE team', due: '2026-12-01', status: 'inProgress' } } }), false);
    expect(screen.getByText('SRE team')).toBeTruthy();
    expect(screen.getAllByText('To be agreed').length).toBeGreaterThan(0);
    expect(screen.getByTestId('asm-plan-progress').textContent).toContain('Plan for the 2 actions: done 0, in progress 1, to start 1');
    expect(screen.queryByTestId('asm-plan-save')).toBeNull();
    expect(screen.getAllByRole('link', { name: /Dynatrace documentation: Distributed tracing/ })[0]?.getAttribute('href')).toBe(CAPABILITY_DOCS['asm.cap.tracing']);
  });

  it('lets the SE edit, and saves only what was edited', () => {
    const save = vi.fn().mockResolvedValue(true);
    renderTable(stateWith(EMPTY_PLAN, save), true);
    const button = screen.getByTestId<HTMLButtonElement>('asm-plan-save');
    expect(button.disabled).toBe(true);
    const owner = screen.getAllByPlaceholderText('Team or role')[0] as HTMLInputElement;
    fireEvent.change(owner, { target: { value: 'Platform team' } });
    expect(screen.getByText('Changes not saved yet.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('asm-plan-save'));
    expect(save).toHaveBeenCalledWith({ 'ASM-04': { owner: 'Platform team', due: null, status: 'open' } });
  });
});

describe('wiring', () => {
  it('keeps the plan in the PoC and clears it with "New PoC"', () => {
    expect(read('ui/app/config/persistence.ts')).toContain("ASSESSMENT_PLAN_KEY = 'pvs.assessment.plan.v1'");
    expect(read('ui/app/config/useTenantPersistence.ts')).toContain("store.remove('app', ASSESSMENT_PLAN_KEY)");
  });

  it('puts the plan in the actions section and lets only the SE and the partner edit it', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect(page).toContain('<ActionPlanTable');
    expect(page).toContain('editable={technical}');
  });
});
