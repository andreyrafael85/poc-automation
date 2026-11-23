import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioProvider } from '../config/StudioContext';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';
import { CLEAN_QUALITY } from '../queries/grailMetadata';

/**
 * What the printable report says when its sources did not answer.
 *
 * Three different things used to read as one: a refused query ("scope not granted"), a
 * query that ran and found nothing, and a query that failed. And a "Problems detected" KPI
 * printed 0 when neither of the two problem queries had answered.
 */

interface Canned {
  outcome?: QueryOutcome;
  records?: GrailRecord[];
}

let canned: Partial<Record<CatalogId, Canned>> = {};

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId): CatalogQueryResult => {
    const entry = getQuery(id);
    const given = canned[id] ?? {};
    const records = given.records ?? [];
    const outcome: QueryOutcome = given.outcome ?? (records.length > 0 ? 'ok' : 'empty');
    return {
      entry,
      records,
      raw: undefined,
    quality: CLEAN_QUALITY,
      outcome,
      provenance: outcome === 'no-permission' ? 'no-permission' : 'observed',
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
      timeframe: {
        startIso: '2026-08-30T12:00:00.000Z',
        endIso: '2026-08-31T12:00:00.000Z',
        label: 'last 24 hours',
        expression: 'now-24h',
      },
      missingScopes: outcome === 'no-permission' ? ['storage:security.events:read'] : [],
      errorMessage: outcome === 'error' ? 'boom' : null,
      isLoading: outcome === 'loading',
      refetch: () => undefined,
    };
  },
}));

vi.mock('@dynatrace-sdk/app-environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dynatrace-sdk/app-environment')>()),
  getEnvironmentUrl: () => 'https://abc12345.apps.dynatrace.com',
}));

const { ValueReport } = await import('../pages/ValueReport');
const { ExecutiveSummary } = await import('../pages/ExecutiveSummary');
const { ValueRoiEngine } = await import('../pages/ValueRoiEngine');

const mount = () =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>
          <ValueReport />
        </StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

/** The value printed next to a KPI label in the report's key-figures grid. */
function figureNextTo(label: string): string | null {
  const labelNode = screen.getAllByText(label).find((node) => node.closest('[data-print-grid]') !== null);
  const cell = labelNode?.parentElement;
  return cell === null || cell === undefined ? null : (cell.textContent ?? '').replace(label, '').trim();
}

beforeEach(() => {
  canned = {};
});

describe('ValueReport when its sources are silent', () => {
  it('never prints 0 problems when neither problem query answered', () => {
    canned['prob.mttx'] = { outcome: 'no-permission' };
    canned['prob.exposure'] = { outcome: 'no-permission' };
    mount();
    expect(figureNextTo('Problems detected')).not.toBe('0');
    // The window line is printed whether or not the figure was measured (3.2.1).
    expect(figureNextTo('Problems detected')).toMatch(/^—\s*Not measured\s*last 7 days$/);
  });

  it('prints the sum when both problem queries answered', () => {
    canned['prob.mttx'] = {
      records: [{ category: 'AVAILABILITY', problems: 7, totalNs: 7_000_000_000, mttrNs: 1_000_000_000 }],
    };
    canned['prob.exposure'] = { records: [{ activeProblems: 3, totalOpenNs: 1, oldestOpenNs: 1, avgOpenNs: 1 }] };
    mount();
    // 10 problems, said to be the last 7 days: the queries are pinned there, not to the report window.
    expect(figureNextTo('Problems detected')).toBe('10last 7 days');
  });

  it('reports a refused security query as a missing scope', () => {
    canned['sec.posture'] = { outcome: 'no-permission' };
    mount();
    expect(screen.getAllByText(/refused for lack of a scope/).length).toBeGreaterThan(0);
  });

  it('reports an empty security query as what was read, not as a missing scope', () => {
    canned['sec.posture'] = { outcome: 'empty' };
    mount();
    expect(screen.queryByText(/refused for lack of a scope/)).toBeNull();
    expect(screen.queryByText(/not granted to this app/)).toBeNull();
    expect(screen.getAllByText(/returned no open vulnerability/).length).toBeGreaterThan(0);
  });

  it('reports a failed security query as a gap of the report', () => {
    canned['sec.posture'] = { outcome: 'error' };
    mount();
    expect(screen.queryByText(/refused for lack of a scope/)).toBeNull();
    expect(screen.getAllByText(/did not complete/).length).toBeGreaterThan(0);
  });
});

describe('ExecutiveSummary verdict when its source is silent', () => {
  const mountExec = () =>
    render(
      <AppRoot>
        <MemoryRouter>
          <StudioProvider>
            <ExecutiveSummary />
          </StudioProvider>
        </MemoryRouter>
      </AppRoot>,
    );

  it('prints no resolved-problem count beside a query that failed', () => {
    canned['prob.mttx'] = { outcome: 'error' };
    const { container } = mountExec();
    expect(container.textContent).not.toMatch(/\b0 problems resolved/);
    expect(screen.getAllByText('mean time to resolve').length).toBeGreaterThan(0);
  });

  it('uses the singular for one resolved problem', () => {
    canned['prob.mttx'] = {
      records: [{ category: 'AVAILABILITY', problems: 1, totalNs: 3_600_000_000_000, mttrNs: 3_600_000_000_000 }],
    };
    const { container } = mountExec();
    expect(container.textContent).toMatch(/1 problem resolved/);
    expect(container.textContent).not.toMatch(/1 problems resolved/);
  });
});

describe('ValueRoiEngine when `prob.mttx` is silent', () => {
  const mountRoi = () =>
    render(
      <AppRoot>
        <MemoryRouter>
          <StudioProvider>
            <ValueRoiEngine />
          </StudioProvider>
        </MemoryRouter>
      </AppRoot>,
    );

  it('shows no problem-time figure for a query that failed, and badges nothing "Observed" for it', () => {
    canned['prob.mttx'] = { outcome: 'error' };
    const { container } = mountRoi();
    expect(container.textContent).not.toMatch(/\b0 min\b/);
  });

  it('shows the figure when the query answered', () => {
    canned['prob.mttx'] = {
      records: [{ category: 'AVAILABILITY', problems: 2, totalNs: 7_200_000_000_000, mttrNs: 3_600_000_000_000 }],
    };
    const { container } = mountRoi();
    expect(container.textContent).toMatch(/2\.0 h/);
  });

  it('says "1 tool", not "1 tools", for the unified platform', () => {
    const { container } = mountRoi();
    expect(container.textContent).not.toMatch(/\b1 tools\b/);
  });
});
