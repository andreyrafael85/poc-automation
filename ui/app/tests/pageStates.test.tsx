import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioProvider } from '../config/StudioContext';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { Provenance } from '../models/provenance';
import type { GrailRecord } from '../utils/records';
import { CLEAN_QUALITY } from '../queries/grailMetadata';

/**
 * A page must say what happened to its query. These render the real pages with the one
 * door to Grail (`useCatalogQuery`) answering each way a query can answer, and assert that
 * a query still running, refused, failed or empty never reads as another of those.
 *
 * 2.x collapsed them: `/security` showed "Read this before drawing any conclusion … scope
 * not granted" while loading and for an empty answer, `/rca` showed "No problems in the
 * window" for a refused or failed query, and a result cut off at 500 rows reported its
 * row count as the total.
 */

interface Canned {
  outcome?: QueryOutcome;
  records?: GrailRecord[];
}
let canned: Partial<Record<CatalogId, Canned>> = {};

const PROVENANCE: Record<QueryOutcome, Provenance> = {
  loading: 'loading',
  error: 'failed',
  'no-permission': 'no-permission',
  empty: 'no-telemetry',
  'scan-limit': 'partial',
  ok: 'observed',
  refused: 'failed',
};

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
      provenance: PROVENANCE[outcome],
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
      timeframe: {
        startIso: '2026-08-30T12:00:00.000Z',
        endIso: '2026-08-31T12:00:00.000Z',
        label: 'last 24 hours',
        expression: 'now-24h',
      },
      missingScopes: outcome === 'no-permission' ? [entry.requiredScope] : [],
      errorMessage: outcome === 'error' ? 'boom' : null,
      isLoading: outcome === 'loading',
      refetch: () => undefined,
    };
  },
}));

vi.mock('../hooks/useIncidentErrorLogs', () => ({
  useIncidentErrorLogs: () => ({ outcome: 'disabled', isLoading: false, logs: { signatures: [], total: 0, errors: 0, warnings: 0, hasRows: false, hasContent: false } }),
}));

const { SecurityAndRuntimeRisk } = await import('../pages/SecurityAndRuntimeRisk');
const { ProblemsRca } = await import('../pages/ProblemsRca');

const mount = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

const vuln = (n: number, level: string | null): GrailRecord => ({
  displayId: `S-${n}`,
  title: `Vulnerability ${n}`,
  level,
  score: 5,
  technology: 'Java',
  entityNames: ['host-a'],
});

const READ_FIRST = 'Read this before drawing any conclusion';

beforeEach(() => {
  canned = {};
});

/** One `sec.posture` row: a severity level × technology with its exact count. */
const postureRow = (level: string, count: number, extra: Record<string, unknown> = {}): GrailRecord => ({
  level,
  technology: 'Java',
  vulnerabilities: count,
  actNow: 0,
  exploitable: 0,
  publicExposed: 0,
  inUse: 0,
  ...extra,
});

// 3.5.2: the headline is a StratoKpi (the platform's SingleValue, or the app's dash).
const totalFigure = () => {
  const card = screen.getByText('Open vulnerabilities').closest('[data-pvs-chart="kpi"]');
  return (card?.querySelector('.pvs-skpi__dash') ?? card?.querySelector('[data-testid="single-value-chart-value"]'))?.textContent;
};

describe('/security says what happened to its query', () => {
  it('does not claim "scope not granted" while the query is still running', () => {
    canned['sec.posture'] = { outcome: 'loading' };
    canned['sec.vulnerabilities'] = { outcome: 'loading' };
    const { container } = mount(<SecurityAndRuntimeRisk />);
    expect(screen.queryByText(READ_FIRST)).not.toBeInTheDocument();
    expect(screen.queryByText('storage:security.events:read')).not.toBeInTheDocument();
    expect(container.querySelector('.pvs-b-sev')).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows a failure as a failure, with a retry, not as a missing scope', () => {
    canned['sec.posture'] = { outcome: 'error' };
    canned['sec.vulnerabilities'] = { outcome: 'error' };
    mount(<SecurityAndRuntimeRisk />);
    expect(screen.queryByText(READ_FIRST)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('keeps naming the scope on a real refusal', () => {
    canned['sec.posture'] = { outcome: 'no-permission' };
    canned['sec.vulnerabilities'] = { outcome: 'no-permission' };
    mount(<SecurityAndRuntimeRisk />);
    expect(screen.getByText(READ_FIRST)).toBeInTheDocument();
    expect(screen.getByText('storage:security.events:read')).toBeInTheDocument();
  });

  it('says an empty answer is neither a refusal nor proof of a clean estate', () => {
    canned['sec.posture'] = { outcome: 'empty' };
    canned['sec.vulnerabilities'] = { outcome: 'empty' };
    mount(<SecurityAndRuntimeRisk />);
    expect(screen.getByText('No open vulnerabilities were returned')).toBeInTheDocument();
    expect(screen.getByText(/not proof of a clean estate/i)).toBeInTheDocument();
    expect(screen.queryByText(READ_FIRST)).not.toBeInTheDocument();
    expect(screen.queryByText('storage:security.events:read')).not.toBeInTheDocument();
  });

  it('shows what a scan-limited query returned and says it is partial', () => {
    canned['sec.posture'] = { outcome: 'scan-limit', records: [postureRow('HIGH', 1), postureRow('LOW', 1)] };
    canned['sec.vulnerabilities'] = { outcome: 'scan-limit', records: [vuln(1, 'HIGH'), vuln(2, 'LOW')] };
    mount(<SecurityAndRuntimeRisk />);
    expect(screen.getByText('Partial result: the scan limit was reached')).toBeInTheDocument();
    expect(totalFigure()).toBe('2');
  });

  it('prints the real total when it is far past the 500-row list: no "500+", no cap warning', () => {
    // 2,000 open vulnerabilities: the list holds the 500 highest-risk, the aggregate counts all.
    canned['sec.posture'] = {
      records: [postureRow('CRITICAL', 40), postureRow('HIGH', 360), postureRow('MEDIUM', 1100), postureRow('LOW', 500)],
    };
    canned['sec.vulnerabilities'] = {
      records: Array.from({ length: 500 }, (_, index) => vuln(index, index % 2 === 0 ? 'HIGH' : 'LOW')),
    };
    const { container } = mount(<SecurityAndRuntimeRisk />);
    expect(totalFigure()).toBe('2,000');
    expect(screen.queryByText(/The exact totals could not be read/)).not.toBeInTheDocument();
    expect(screen.queryByText('The list is capped at 500')).not.toBeInTheDocument();
    // Every share is of the real total: 1,100 / 2,000 = 55%.
    expect(container.querySelector('.pvs-b-sev')?.textContent).toContain('55% of 2,000');
    expect(container.textContent).toContain('Showing the 10 highest-risk of 2,000 open vulnerabilities');
  });

  it('counts a 508-vulnerability tenant as 508, not as the 500 its list is cut to', () => {
    canned['sec.posture'] = { records: [postureRow('HIGH', 300), postureRow('MEDIUM', 208)] };
    canned['sec.vulnerabilities'] = { records: Array.from({ length: 500 }, (_, index) => vuln(index, 'HIGH')) };
    mount(<SecurityAndRuntimeRisk />);
    expect(totalFigure()).toBe('508');
  });

  it('falls back to a floor ("500+") only when the aggregate failed AND the list is at its cap', () => {
    canned['sec.posture'] = { outcome: 'error' };
    canned['sec.vulnerabilities'] = { records: Array.from({ length: 500 }, (_, index) => vuln(index, index % 2 === 0 ? 'HIGH' : 'LOW')) };
    const { container } = mount(<SecurityAndRuntimeRisk />);
    expect(totalFigure()).toBe('500+');
    expect(screen.getByText('The exact totals could not be read')).toBeInTheDocument();
    expect(container.textContent).toContain('of 500+');
  });

  it('is exact from the list alone when the aggregate failed but the list is complete', () => {
    canned['sec.posture'] = { outcome: 'error' };
    canned['sec.vulnerabilities'] = { records: Array.from({ length: 12 }, (_, index) => vuln(index, 'LOW')) };
    mount(<SecurityAndRuntimeRisk />);
    expect(totalFigure()).toBe('12');
    expect(screen.queryByText(/The exact totals could not be read/)).not.toBeInTheDocument();
  });

  it('keeps the exact count, and says the names have not loaded, when only the list is missing', () => {
    canned['sec.posture'] = {
      records: [postureRow('CRITICAL', 3, { actNow: 3, exploitable: 3, publicExposed: 3, inUse: 3 })],
    };
    canned['sec.vulnerabilities'] = { outcome: 'loading' };
    mount(<SecurityAndRuntimeRisk />);
    expect(totalFigure()).toBe('3');
    expect(screen.getByText(/3 vulnerabilities meet all three conditions/)).toBeInTheDocument();
    expect(screen.queryByText('No immediate action needed')).not.toBeInTheDocument();
  });

  it('draws the bar and the legend against the same total, with the ungraded remainder visible', () => {
    // 4 graded + 4 ungraded: the bar must not stretch the graded four to fill it.
    canned['sec.posture'] = {
      records: [postureRow('HIGH', 2), postureRow('LOW', 2), postureRow('NONE', 4)],
    };
    canned['sec.vulnerabilities'] = { records: [vuln(1, 'HIGH'), vuln(2, 'HIGH'), vuln(3, 'LOW'), vuln(4, 'LOW')] };
    const { container } = mount(<SecurityAndRuntimeRisk />);
    // Each segment grows with its count (`flex: <count> 1 0`), so its share of the bar is its
    // share of all eight.
    const grows = Array.from(container.querySelectorAll<HTMLElement>('.pvs-sev__bar .pvs-sev__seg')).map((segment) =>
      parseFloat(segment.style.flex),
    );
    const sum = grows.reduce((total, grow) => total + grow, 0);
    const widths = grows.map((grow) => Math.round((grow / sum) * 100));
    expect(widths).toEqual([25, 25, 50]); // high, low, ungraded — of the same 8
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(100);
    // The legend's HIGH share is the same 25%.
    expect(container.querySelector('.pvs-b-sev')?.textContent).toContain('25% of 8');
    expect(container.textContent).toContain('Ungraded: 4');
  });
});

describe('/rca says what happened to its query', () => {
  it('does not say "no problems" while the query is still running', () => {
    canned['rca.top'] = { outcome: 'loading' };
    mount(<ProblemsRca />);
    expect(screen.queryByText('No problems in the window')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not say "no problems" after a failed query', () => {
    canned['rca.top'] = { outcome: 'error' };
    mount(<ProblemsRca />);
    expect(screen.queryByText('No problems in the window')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('does not say "no problems" for a refused query: it names the scope', () => {
    canned['rca.top'] = { outcome: 'no-permission' };
    mount(<ProblemsRca />);
    expect(screen.queryByText('No problems in the window')).not.toBeInTheDocument();
    expect(screen.getByText(/storage:events:read/)).toBeInTheDocument();
  });

  it('still says "no problems" when the source answered with none', () => {
    canned['rca.top'] = { outcome: 'empty' };
    mount(<ProblemsRca />);
    expect(screen.getByText('No problems in the window')).toBeInTheDocument();
  });
});

const { DigitalExperience } = await import('../pages/DigitalExperience');

describe('/experience says what happened to its query', () => {
  it('does not say "not observed" while the scorecard query runs, fails or is refused', () => {
    for (const outcome of ['loading', 'error', 'no-permission'] as const) {
      canned['rum.scorecard'] = { outcome };
      const { unmount } = mount(<DigitalExperience />);
      expect(screen.queryByText(/not observed/i), outcome).not.toBeInTheDocument();
      unmount();
    }
  });

  it('still says "not observed" when the source answered with nothing', () => {
    canned['rum.scorecard'] = { outcome: 'empty' };
    mount(<DigitalExperience />);
    expect(screen.getAllByText(/not observed/i).length).toBeGreaterThan(0);
  });
});

const { CommandCenter } = await import('../pages/CommandCenter');

/** The Overview shows its stage crumb, which reads the route. */
const mountRouted = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

/** 3.4.18: the Overview's KPIs are `StratoKpi` (the platform's SingleValue); a missing figure is the app's dash. */
const kpiValue = (label: string): string | null | undefined => {
  const card = screen.getByText(label).closest<HTMLElement>('[data-pvs-chart="kpi"]');
  return (card?.querySelector('.pvs-skpi__dash') ?? card?.querySelector('[data-testid="single-value-chart-value"]'))?.textContent;
};

describe('/ (Overview) refuses the zeros of an entity-model outage', () => {
  const zeroInventory = [
    'Hosts',
    'Services',
    'Process instances',
    'Kubernetes clusters',
    'Kubernetes workloads',
    'Web applications',
    'Mobile applications',
    'Synthetic monitors',
  ].map((category) => ({ category, value: 0 }));

  it('shows a dash, not "0 entities" or "0% coverage", when every category answers zero at once', () => {
    canned['cov.inventory'] = { records: zeroInventory };
    const { container } = mountRouted(<CommandCenter />);
    expect(kpiValue('Monitored entities')).toBe('—');
    // The coverage gauge: a dash that says "not measured" and no dial at all, never 0 %.
    const coverage = container.querySelector('[data-testid="cc-gauge-coverage"]') as HTMLElement;
    expect(coverage.dataset.pvsState).toBe('unavailable');
    expect(coverage.querySelector('.pvs-sgauge__dash')?.textContent).toBe('—');
    // The reason is the one the entity-model outage gives — a reason, never "0 %".
    expect(coverage.querySelector('[role="img"]')?.getAttribute('aria-label')).toMatch(/^Categories with telemetry: \D/);
    expect(coverage.textContent).not.toMatch(/\b0 ?%/);
    expect(coverage.querySelector('.pvs-sarc')).toBeNull();
    expect(kpiValue('Services traced')).toBe('—');
  });

  it('still shows real counts when the model answers', () => {
    canned['cov.inventory'] = { records: zeroInventory.map((row, index) => ({ ...row, value: index < 3 ? 5 : 0 })) };
    mountRouted(<CommandCenter />);
    expect(kpiValue('Monitored entities')).toBe('15');
  });
});

describe('/ (Overview) draws the Value Spectrum only from what the tenant said', () => {
  const inventoryRows: GrailRecord[] = (
    [
      ['Hosts', 77],
      ['Services', 76],
      ['Process instances', 1375],
      ['Kubernetes clusters', 6],
      ['Kubernetes workloads', 304],
      ['Web applications', 3],
      ['Mobile applications', 0],
      ['Synthetic monitors', 42],
    ] as const
  ).map(([category, value]) => ({ category, value }));

  const ring = (container: HTMLElement, name: string) =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-pvs-chart="gauge"]')).find((el) => el.textContent?.includes(name)) as HTMLElement;

  it('reads service health from the exact totals: 72 services with traffic, 5 above 1% → 93%', () => {
    canned['cov.inventory'] = { records: inventoryRows };
    canned['svc.ranking.total'] = { records: [{ services: 72, failing: 23, aboveOnePct: 5, weightedResponseUs: 144000 }] };
    const { container } = mountRouted(<CommandCenter />);
    const services = ring(container, 'Services under 1% failures');
    // 3.6.2: the app's arc of segments, the reading the app's text.
    expect(services.querySelector('.pvs-sarc')).not.toBeNull();
    expect(services.querySelector('.pvs-sgauge__reading')?.textContent).toBe('93 %');
    expect(services.textContent).toContain('of the 72 services that handled traffic');
    // A ratio is a calculation, and it says so.
    expect(services.querySelector('button[aria-label^="Evidence class"]')?.getAttribute('aria-label')).toMatch(/Derived/);
  });

  it('says "not measured" on the service ring when its query failed, never 0 %', () => {
    canned['cov.inventory'] = { records: inventoryRows };
    canned['svc.ranking.total'] = { outcome: 'error' };
    const { container } = mountRouted(<CommandCenter />);
    const services = ring(container, 'Services under 1% failures');
    expect(services.querySelector('.pvs-sgauge__dash')?.textContent).toBe('—');
    // The reason says the read failed (3.4.18: the gauge names what happened, as every KPI does) — never "0 %".
    expect(services.querySelector('[role="img"]')?.getAttribute('aria-label')).toMatch(/^Services under 1% failures: .*fail/i);
    expect(services.textContent).not.toMatch(/\b0 ?%/);
    expect(services.querySelector('.pvs-sarc')).toBeNull();
  });

  it('no longer opens with a figure about this app instead of the estate', () => {
    canned['cov.inventory'] = { records: inventoryRows };
    mountRouted(<CommandCenter />);
    expect(screen.queryByText(/Query efficiency/)).toBeNull();
  });

  it('maps the estate from the user to the cloud (3.5.3: as the environment flow) and leaves out what was measured as zero', () => {
    canned['cov.inventory'] = { records: inventoryRows };
    canned['cloud.hosts'] = {
      records: [
        { cloudType: 'EC2', hosts: 14 },
        { cloudType: 'GOOGLE_CLOUD_PLATFORM', hosts: 3 },
        { cloudType: 'AZURE', hosts: 2 },
      ],
    };
    mountRouted(<CommandCenter />);
    const map = screen.getByRole('group', { name: /The environment as a flow of layers/ });
    expect(within(map).getByRole('link', { name: /^AWS: 14 hosts/ })).toBeInTheDocument();
    // 77 hosts, 19 of them attributed to a cloud.
    expect(within(map).getByRole('link', { name: /^No cloud attribution: 58 hosts/ })).toBeInTheDocument();
    expect(within(map).getByRole('link', { name: /^Process instances: 1,375 instances/ })).toBeInTheDocument();
    // Zero mobile apps were measured: no mobile node, rather than a node that says 0.
    expect(within(map).queryByRole('link', { name: /Mobile/ })).toBeNull();
  });

  it('draws no stack map at all when nothing on it was measured', () => {
    canned['cov.inventory'] = { outcome: 'error' };
    mountRouted(<CommandCenter />);
    expect(screen.queryByRole('group', { name: /The environment as a flow of layers/ })).toBeNull();
  });

  it('splits the active problems by category from the same read, never with a line of another measure (3.4.18, DN-4)', () => {
    canned['prob.summary'] = {
      records: [
        { 'event.status': 'ACTIVE', 'event.category': 'ERROR', problems: 4 },
        { 'event.status': 'ACTIVE', 'event.category': 'SLOWDOWN', problems: 2 },
        { 'event.status': 'CLOSED', 'event.category': 'ERROR', problems: 9 },
      ],
    };
    canned['prob.timeline'] = {
      records: [
        { interval: '2026-08-31T00:00:00.000000000Z', problems: 3 },
        { interval: '2026-08-31T06:00:00.000000000Z', problems: 5 },
      ],
    };
    mountRouted(<CommandCenter />);
    // The arrivals line (problems that began per 6 h) measured something else: it left the tile.
    expect(screen.queryByRole('img', { name: /began in each 6-hour period/ })).toBeNull();
    const active = screen.getByTestId('cc-kpi-active');
    expect(active.querySelector('[data-testid="single-value-chart-value"]')?.textContent).toBe('6');
    expect(within(active).getByRole('img', { name: /Active problems: Errors 4, Slowdown 2/ })).toBeInTheDocument();
  });
});

const { PocTimeline } = await import('../pages/PocTimeline');

describe('/timeline keeps a measured zero a zero', () => {
  // 3.2.6: the milestones are a journey of steps.
  const dayFigure = (container: HTMLElement, index: number) =>
    container.querySelectorAll('.pvs-journey__step')[index]?.querySelector('.pvs-figure') as HTMLElement;

  it('shows "0 recurring patterns" when the source answered with none', () => {
    canned['prob.recurrent.total'] = { outcome: 'empty' };
    const { container } = mountRouted(<PocTimeline />);
    const figure = dayFigure(container, 4);
    expect(figure.dataset.missing).toBeUndefined();
    expect(figure.querySelector('.pvs-figure__value')?.textContent).toBe('0');
  });

  it('shows "not measured" only when that query did not answer', () => {
    for (const outcome of ['loading', 'error', 'no-permission'] as const) {
      canned['prob.recurrent.total'] = { outcome };
      const { container, unmount } = mountRouted(<PocTimeline />);
      expect(dayFigure(container, 4).dataset.missing, outcome).toBe('true');
      unmount();
    }
  });

  it('counts the patterns it was given', () => {
    // Counted in the query over every recurring pattern: 29 patterns, not the 25 a list would hold.
    canned['prob.recurrent.total'] = { records: [{ patterns: 29, candidates: 20, recurringVolume: 2799, allVolume: 2802, worst: 554 }] };
    const { container } = mountRouted(<PocTimeline />);
    expect(dayFigure(container, 4).querySelector('.pvs-figure__value')?.textContent).toBe('29');
  });
});

const { AiInsightsCenter } = await import('../pages/AiInsightsCenter');

describe('/problems lenses carry their evidence', () => {
  it('badges every lens card with the class of the query behind it', () => {
    canned['prob.summary'] = { records: [{ 'event.status': 'ACTIVE', 'event.category': 'ERROR', problems: 3 }, { 'event.status': 'CLOSED', 'event.category': 'SLOWDOWN', problems: 7 }] };
    const { container } = mountRouted(<AiInsightsCenter />);
    const lenses = Array.from(container.querySelectorAll('[data-testid="ai-lenses"] [data-pvs-chart="kpi"]'));
    expect(lenses).toHaveLength(6);
    for (const lens of lenses) expect(lens.querySelector('button[aria-label^="Evidence class"]'), lens.textContent ?? '').not.toBeNull();
  });

  it('says "loading" or "failed to read" on a lens whose query has not answered — not "no telemetry"', () => {
    for (const [outcome, label] of [['loading', 'Loading'], ['error', 'Failed to read']] as const) {
      canned['prob.summary'] = { outcome };
      const { container, unmount } = mountRouted(<AiInsightsCenter />);
      const impact = container.querySelector('[data-testid="ai-lens-impact"]') as HTMLElement;
      expect(impact.querySelector('button')?.getAttribute('aria-label'), outcome).toContain(label);
      expect(impact.querySelector('.pvs-skpi__dash')?.textContent).toBe('—');
      unmount();
    }
  });
});
