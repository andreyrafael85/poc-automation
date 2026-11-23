import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { StudioProvider } from '../config/StudioContext';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';
import { CLEAN_QUALITY } from '../queries/grailMetadata';

/**
 * Smoke and contract tests for the group-B pages after the v3.1 restyle:
 * Problems (AI Insights Center), Root-cause analysis, Security and Competitor.
 *
 * Data is mocked at `useCatalogQuery`, the one door through which every page reads
 * Grail, so these render the real page, real engine and real Strato components
 * with canned records. What they pin is what a restyle can silently break: one
 * `h1`, an outline that never skips a level, the headline total in neutral ink,
 * no glyph icons, a limitation (not a fault) when the scope is missing.
 */

interface Canned {
  outcome?: QueryOutcome;
  records?: GrailRecord[];
  missingScopes?: string[];
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
      missingScopes: given.missingScopes ?? [],
      errorMessage: null,
      isLoading: outcome === 'loading',
      refetch: () => undefined,
    };
  },
}));

vi.mock('../hooks/useIncidentErrorLogs', () => ({
  useIncidentErrorLogs: () => ({
    outcome: 'ok',
    isLoading: false,
    logs: {
      signatures: [{ signature: 'java.net.SocketTimeoutException: connect timed out', count: 12 }],
      total: 12,
      errors: 12,
      warnings: 3,
      hasRows: true,
      hasContent: true,
    },
  }),
}));

vi.mock('@dynatrace-sdk/app-environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dynatrace-sdk/app-environment')>()),
  getEnvironmentUrl: () => 'https://abc12345.apps.dynatrace.com',
}));

const { SecurityAndRuntimeRisk } = await import('../pages/SecurityAndRuntimeRisk');
const { CompetitorIntelligence } = await import('../pages/CompetitorIntelligence');
const { ProblemsRca } = await import('../pages/ProblemsRca');
const { AiInsightsCenter } = await import('../pages/AiInsightsCenter');

const mount = (node: React.ReactElement) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

/** Heading levels in document order. */
const outline = (root: HTMLElement): number[] =>
  Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((node) => Number(node.tagName.slice(1)));

/** An outline is sound when it starts at 1, has one h1 and never jumps down more than one level. */
function expectSoundOutline(root: HTMLElement): void {
  const levels = outline(root);
  expect(levels.filter((level) => level === 1)).toHaveLength(1);
  expect(levels[0]).toBe(1);
  levels.forEach((level, index) => {
    if (index > 0) expect(level, `heading #${index} jumps from h${levels[index - 1]} to h${level}`).toBeLessThanOrEqual(levels[index - 1]! + 1);
  });
}

const vuln = (displayId: string, level: string, score: number, extra: Record<string, unknown> = {}): GrailRecord => ({
  displayId,
  title: `Vulnerability ${displayId}`,
  level,
  score,
  technology: 'Java',
  cve: ['CVE-2026-0001'],
  exploitStatus: 'NOT_AVAILABLE',
  exposureStatus: 'NOT_PUBLIC',
  functionStatus: 'NOT_IN_USE',
  entityNames: ['host-a'],
  ...extra,
});

beforeEach(() => {
  canned = {};
});

describe('SecurityAndRuntimeRisk', () => {
  it('shows the total in neutral ink and only critical/high severities carry a tone', () => {
    canned['sec.vulnerabilities'] = {
      records: [
        vuln('S-1', 'CRITICAL', 9.8, { exploitStatus: 'AVAILABLE', exposureStatus: 'PUBLIC_NETWORK', functionStatus: 'IN_USE' }),
        vuln('S-2', 'HIGH', 7.5),
        vuln('S-3', 'MEDIUM', 5.1),
        vuln('S-4', 'LOW', 2.0),
      ],
    };
    canned['sec.posture'] = {
      records: [
        { level: 'CRITICAL', technology: 'Java', vulnerabilities: 1, actNow: 1, exploitable: 1, publicExposed: 1, inUse: 1 },
        { level: 'HIGH', technology: 'Java', vulnerabilities: 1, actNow: 0, exploitable: 0, publicExposed: 0, inUse: 0 },
        { level: 'MEDIUM', technology: 'Node.js', vulnerabilities: 1, actNow: 0, exploitable: 0, publicExposed: 0, inUse: 0 },
        { level: 'LOW', technology: 'Node.js', vulnerabilities: 1, actNow: 0, exploitable: 0, publicExposed: 0, inUse: 0 },
      ],
    };
    const { container } = mount(<SecurityAndRuntimeRisk />);

    expectSoundOutline(container);

    // The headline total (3.5.2: a StratoKpi) in neutral ink: no tone colour on its value.
    const total = screen.getByText('Open vulnerabilities').closest('[data-pvs-chart="kpi"]') as HTMLElement;
    const figure = total.querySelector('[data-testid="single-value-chart-value"]') as HTMLElement;
    expect(figure.textContent).toBe('4');
    expect(figure.style.color).toBe('');

    // Severity words are printed, in order, in the legend.
    const legend = container.querySelector('.pvs-b-sev') as HTMLElement;
    const names = Array.from(legend.querySelectorAll('.pvs-b-sev__name')).map((node) => node.textContent);
    expect(names).toEqual(['Critical', 'High', 'Medium', 'Low']);
    const tones = Array.from(legend.querySelectorAll('.pvs-b-sev__item')).map((node) => node.getAttribute('data-tone'));
    // High is red since 3.2.1, as Strato's security risk palette draws it; icon and word tell it from critical.
    expect(tones).toEqual(['critical', 'critical', null, null]);

    // The act-now card (3.2.3) carries the three measured conditions as words, each with its count,
    // and the one vulnerability that meets all three as its figure, in the critical tone.
    const actNow = screen.getByText('Act now').closest('.pvs-panel') as HTMLElement;
    expect(within(actNow).getByText('exploit available')).toBeTruthy();
    expect(within(actNow).getByText('public exposure')).toBeTruthy();
    expect(within(actNow).getByText('function in use')).toBeTruthy();
    expect(within(actNow).getByText('1', { selector: '.pvs-figure__value' })).toBeTruthy();
    // The queue under it repeats them per vulnerability.
    expect(screen.getAllByText('exploit available').length).toBeGreaterThan(1);

    // No glyph icons stand in for meaning.
    expect(container.textContent).not.toMatch(/[✕✓›◈▣●]/);
  });

  it('renders a missing scope as a neutral limitation, with the scope to grant', () => {
    canned['sec.posture'] = { outcome: 'no-permission', missingScopes: ['storage:security.events:read'] };
    canned['sec.vulnerabilities'] = { outcome: 'no-permission', missingScopes: ['storage:security.events:read'] };
    const { container } = mount(<SecurityAndRuntimeRisk />);

    expectSoundOutline(container);
    const limitation = container.querySelector('.pvs-callout[data-kind="limitation"]') as HTMLElement;
    expect(limitation).toBeTruthy();
    expect(limitation.getAttribute('data-style')).toBe('dashed');
    expect(within(limitation).getByText('Read this before drawing any conclusion')).toBeTruthy();
    expect(screen.getByText('storage:security.events:read')).toBeTruthy();
    // No severity figures are invented while the table cannot be read.
    expect(container.querySelector('.pvs-b-sev')).toBeNull();
  });
});

describe('CompetitorIntelligence', () => {
  it('lists vendors, compares risk with the unified case using icons plus text, and ends in a recommendation', () => {
    canned['comp.agents'] = {
      records: [{ name: 'datadog-agent' }, { name: 'datadog-trace' }, { name: 'splunk-forwarder' }],
    };
    const { container } = mount(<CompetitorIntelligence />);

    expectSoundOutline(container);
    expect(screen.getByRole('heading', { level: 3, name: 'Datadog' })).toBeTruthy();
    expect(container.querySelectorAll('.pvs-b-points svg').length).toBeGreaterThanOrEqual(8);
    expect(container.textContent).not.toMatch(/[✕✓]/);
    expect(screen.getByText(/Retire 3 agents across 2 tools/)).toBeTruthy();
  });

  it('uses the singular for a single agent and a single tool', () => {
    canned['comp.agents'] = { records: [{ name: 'datadog-agent' }] };
    const { container } = mount(<CompetitorIntelligence />);
    expect(screen.getByText(/Retire 1 agent across 1 tool and/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/\b1 agents\b/);
    expect(container.textContent).toMatch(/\b1 agent\b/);
  });

  it('says the plural when one tool runs several agents', () => {
    canned['comp.agents'] = { records: [{ name: 'datadog-agent' }, { name: 'datadog-trace' }] };
    mount(<CompetitorIntelligence />);
    expect(screen.getByText(/Retire 2 agents across 1 tool and/)).toBeTruthy();
  });

  it('says plainly when nothing was found, without a success tone', () => {
    // Rows that name no agent leave the total at zero: the query ran, and found no one.
    canned['comp.agents'] = { records: [{ unnamed: true }] };
    const { container } = mount(<CompetitorIntelligence />);
    expect(container.querySelector('.pvs-callout[data-kind="note"]')).toBeTruthy();
    expect(screen.getByText('No third-party observability agents detected')).toBeTruthy();
  });
});

describe('ProblemsRca', () => {
  const incident: GrailRecord = {
    displayId: 'P-1',
    name: 'Response time degradation',
    category: 'SLOWDOWN',
    status: 'ACTIVE',
    severity: 3,
    impact: ['Services'],
    affectedNames: ['svcA', 'svcB'],
    affectedTypes: ['dt.entity.service'],
    relatedNames: [],
    affectedIds: ['SERVICE-1'],
    relatedIds: [],
    rootCauseName: 'offer_service',
    rootCauseId: 'SERVICE-9',
    eventId: '-123_456V2',
    start: '2026-08-26T18:48:00.000000000Z',
    end: '2026-08-26T19:43:00.000000000Z',
    durationNs: 3_300_000_000_000,
    affectedCount: 2,
    cluster: ['loan-app'],
    namespace: ['easytrade'],
    workload: ['offerservice'],
    description: '# Response time degradation\n\nA root-cause was detected:\n\n- unexpected load\n- slow database',
  };

  it('tells one incident: header chips, a real link, the blast-radius map and the evidence', () => {
    canned['rca.top'] = { records: [incident] };
    canned['rca.kpi'] = { records: [{ total: 100, rootCaused: 40, active: 5, resolved: 95, avgAffected: 1.2 }] };
    canned['rca.catmix'] = { records: [{ category: 'SLOWDOWN', count: 7 }, { category: 'ERROR', count: 3 }] };
    const { container } = mount(<ProblemsRca />);

    expectSoundOutline(container);

    // The external link is a real anchor with an accessible name and a safe rel.
    const link = screen.getByRole('link', { name: /Open in Dynatrace/ });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/abc12345\.apps\.dynatrace\.com\/ui\/apps\//);
    expect(link.getAttribute('rel')).toContain('noopener');

    // 3.5.4: the incident as a propagation by hop (the trail map stays on the SE Report and the deck's capture): the
    // root cause, then the entities it affected, each a card with its kind; the columns are a named list.
    const propagation = container.querySelector('[data-testid="rca-propagation"]') as HTMLElement;
    expect([...propagation.querySelectorAll('.pvs-prop__col')].map((column) => column.getAttribute('data-col'))).toEqual(['cause', 'affected']);
    expect(propagation.querySelector('[data-col="cause"] .pvs-prop__name')?.textContent).toBe('offer_service');
    expect([...propagation.querySelectorAll('[data-col="affected"] .pvs-prop__name')].map((node) => node.textContent)).toEqual(['svcA', 'svcB']);
    expect(screen.getByRole('list', { name: 'The incident by hop, from the root cause to the users' })).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Kubernetes context' })).getByText('easytrade')).toBeTruthy();

    // Bullets of the Davis narrative are one list; the log signatures and category mix are drawn by the shared charts.
    expect(screen.getByText('unexpected load').closest('ul')?.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('.pvs-bars')).toBeTruthy();
    expect(container.querySelector('.pvs-share')).toBeTruthy();

    // No glyph icons, no hand-drawn arrows.
    expect(container.textContent).not.toMatch(/[◈▣◐◉●⬡⬢▤↗→›]/);
  });

  it('draws a markdown table, a code block and inline code instead of raw characters', () => {
    canned['rca.top'] = {
      records: [
        {
          ...incident,
          description: ['# Slow checkout', '', '| Signal | Observed |', '| --- | --- |', '| p95 | 480 ms |', '', '```', 'fetch logs', '```', '', '- the `checkout` service restarted'].join('\n'),
        },
      ],
    };
    const { container } = mount(<ProblemsRca />);
    expectSoundOutline(container);

    const table = container.querySelector('table.pvs-b-md-table') as HTMLElement;
    // 3.5.4: the explanation sits in the "Investigation" tab, kept mounted (hidden until chosen).
    expect(within(table).getAllByRole('columnheader', { hidden: true }).map((cell) => cell.textContent)).toEqual(['Signal', 'Observed']);
    expect(within(table).getByRole('cell', { name: '480 ms', hidden: true })).toBeTruthy();
    expect(container.textContent).not.toMatch(/\|\s*---|\|\s*Signal/);
    expect(screen.getByText('fetch logs')).toBeTruthy();
    expect(container.querySelector('code')?.textContent).toBe('checkout');
    expect(container.textContent).not.toContain('`');
  });

  it('shows a neutral empty state when there are no problems to tell a story about', () => {
    const { container } = mount(<ProblemsRca />);
    expectSoundOutline(container);
    expect(screen.getByRole('heading', { level: 2, name: 'No problems in the window' })).toBeTruthy();
    expect(container.querySelector('.pvs-panel[data-evidence="unavailable"]')).toBeTruthy();
  });
});

describe('AiInsightsCenter', () => {
  it('has a single h1 (the section intro), three rings and six lenses', () => {
    canned['prob.summary'] = {
      records: [
        { 'event.status': 'ACTIVE', 'event.category': 'SLOWDOWN', problems: 4 },
        { 'event.status': 'CLOSED', 'event.category': 'ERROR', problems: 16 },
      ],
    };
    canned['prob.recurrent'] = { records: [{ 'event.name': 'High CPU', 'event.category': 'RESOURCE', occurrences: 9 }] };
    const { container } = mount(<AiInsightsCenter />);

    expectSoundOutline(container);
    // 3.4.18: the three rings behind StratoGauge (3.6.2: the app's arc of segments).
    expect(container.querySelectorAll('[data-pvs-chart="gauge"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-testid="ai-lenses"] [data-pvs-chart="kpi"]')).toHaveLength(6);
    // The inline Assist block was replaced by the shared panel.
    expect(container.querySelector('.pvs-panel[aria-label="Where SRE, DevOps and Cloud teams should act"]')).toBeTruthy();
  });
});
