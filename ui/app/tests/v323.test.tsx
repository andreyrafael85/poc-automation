import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { FlowMap, type FlowMapNode } from '../components/spectrum/FlowMap';
import { SpectrumArea } from '../components/spectrum/SpectrumArea';
import { ThresholdGauge } from '../components/spectrum/ThresholdGauge';
import { databaseGlyph, vendorGlyph } from '../components/spectrum/brandFor';
import { inventoryDetail } from '../components/spectrum/entityTiles';
import { StudioProvider } from '../config/StudioContext';
import { buildTrail, entityKindOf, TRAIL_AFFECTED_SHOWN } from '../features/rca/RcaTrail';
import { failureBand } from '../features/services/ServiceHealth';
import { buildCallMap } from '../features/topology/CallMap';
import { translate, type StringKey } from '../i18n/strings';
import { fitName, flowLinkWidth, FLOW_GEOMETRY, layoutFlow } from '../models/flowMap';
import { toBucketContext, toQualityRows } from '../models/logQuality';
import { ARRIVAL_BIN_MS, arrivalChange, type ArrivalBin } from '../models/problemTimeline';
import { summariseRca, type RcaIncident } from '../models/rca';
import { combineSeries, niceCeiling, scaleSeries, seriesOf, seriesStats } from '../models/series';

/**
 * 3.2.3 (wave V4): the Spectrum on every page, and the data fixes that came with it. Each rule
 * here was checked by reintroducing the defect it guards against.
 */

const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);
const formatNumber = (value: number) => value.toLocaleString('en-GB');

const wrap = (node: React.ReactNode, routed = false) =>
  render(
    <AppRoot>
      <StudioProvider>{routed ? <MemoryRouter>{node}</MemoryRouter> : node}</StudioProvider>
    </AppRoot>,
  );

// ------------------------------------------------------------------ time series

const HOUR = 3_600_000_000_000;
const record = {
  timeframe: { start: '2026-10-04T00:00:00.000000000Z', end: '2026-10-04T04:00:00.000000000Z' },
  interval: String(HOUR),
  requests: [100, '200', null, 400],
  failures: [1, 4, 2, 0],
};

describe('series from a Grail timeseries record', () => {
  it('aligns every value to start + i × interval and keeps an empty bin as a gap, not a zero', () => {
    const points = seriesOf(record, 'requests');
    const start = Date.parse('2026-10-04T00:00:00Z');
    expect(points.map((point) => point.t)).toEqual([0, 1, 2, 3].map((i) => start + i * 3_600_000));
    expect(points.map((point) => point.v)).toEqual([100, 200, null, 400]);
  });

  it('reads nothing from a record without a frame, an interval or the field', () => {
    expect(seriesOf(undefined, 'requests')).toEqual([]);
    expect(seriesOf({ ...record, interval: undefined }, 'requests')).toEqual([]);
    expect(seriesOf(record, 'nope')).toEqual([]);
  });

  it('combines two series bin by bin and leaves a bin missing when either side is', () => {
    const rate = combineSeries(seriesOf(record, 'failures'), seriesOf(record, 'requests'), (f, r) => (r > 0 ? (f * 100) / r : null));
    expect(rate.map((point) => point.v)).toEqual([1, 2, null, 0]);
    expect(scaleSeries(seriesOf(record, 'requests'), 0.001).map((point) => point.v)).toEqual([0.1, 0.2, null, 0.4]);
  });

  it('states the peak, the last and the mean over the measured bins only', () => {
    const stats = seriesStats(seriesOf(record, 'requests'));
    expect(stats.measured).toBe(3);
    expect(stats.sum).toBe(700);
    expect(stats.mean).toBeCloseTo(233.33, 1);
    expect(stats.peak?.v).toBe(400);
    expect(stats.last?.v).toBe(400);
    expect(seriesStats([{ t: 0, v: null }]).peak).toBeNull();
  });

  it('rounds an axis up to a number a reader can say', () => {
    expect(niceCeiling(0)).toBe(1);
    expect(niceCeiling(7)).toBe(10);
    expect(niceCeiling(232_000)).toBe(250_000);
    expect(niceCeiling(0.42)).toBe(0.5);
    expect(niceCeiling(1_000)).toBe(1_000);
  });
});

describe('SpectrumArea', () => {
  const points = seriesOf(record, 'requests');
  const area = (overrides: Partial<React.ComponentProps<typeof SpectrumArea>> = {}) =>
    wrap(
      <SpectrumArea
        points={points}
        label="Requests per hour"
        summary="peak 400"
        format={(value) => `${value} req`}
        formatTime={(ms) => new Date(ms).toISOString().slice(11, 16)}
        {...overrides}
      />,
    );

  it('breaks the line at a missing bin instead of drawing it as a zero', () => {
    const { container } = area();
    // Two runs (100, 200) and (400): two line paths, one area (a single point has no area).
    expect(container.querySelectorAll('.pvs-area__line')).toHaveLength(2);
    expect(container.querySelectorAll('path[fill^="url("]')).toHaveLength(1);
  });

  it('labels the axis from zero to a round number with the caller’s unit, and marks the peak', () => {
    const { container } = area();
    const ticks = Array.from(container.querySelectorAll('.pvs-area__ytick')).map((node) => node.textContent);
    expect(ticks).toEqual(['0 req', '125 req', '250 req', '375 req', '500 req']);
    expect(container.querySelector('.pvs-area__peak-label')?.textContent).toBe('400 req');
  });

  it('names what it shows and its summary for assistive technology', () => {
    area();
    expect(screen.getByRole('img', { name: 'Requests per hour. peak 400' })).toBeTruthy();
  });

  it('draws nothing for fewer than two points or no measured value', () => {
    expect(area({ points: points.slice(0, 1) }).container.querySelector('.pvs-area')).toBeNull();
    expect(area({ points: [{ t: 0, v: null }, { t: 1, v: null }] }).container.querySelector('.pvs-area')).toBeNull();
  });
});

// ------------------------------------------------------------------ threshold gauge

describe('ThresholdGauge', () => {
  const gauge = (value: number | null, rating: 'good' | 'poor' | 'no-data', ratingLabel: string) =>
    wrap(
      <ThresholdGauge
        label="LCP"
        value={value}
        display={value === null ? '—' : String(value / 1000)}
        unit="s"
        good={2500}
        poor={4000}
        max={6000}
        rating={rating}
        ratingLabel={ratingLabel}
        goodLabel="2.5 s"
        poorLabel="4 s"
      />,
    );

  it('draws the three published zones, the reading and the rating as an icon and a word', () => {
    const { container } = gauge(1800, 'good', 'Good');
    // 3.6.2 (v6): the zones as segments in their status colour, lit up to the reading.
    const zones = new Set(Array.from(container.querySelectorAll('.pvs-tgauge__seg')).map((seg) => seg.getAttribute('data-zone')));
    expect([...zones].sort()).toEqual(['good', 'needs-improvement', 'poor']);
    expect(container.querySelectorAll('.pvs-tgauge__seg[data-on="true"]')).toHaveLength(7);
    expect(screen.getByRole('img', { name: 'LCP: 1.8 s, Good' })).toBeTruthy();
    expect(within(container.querySelector('.pvs-tgauge__rating') as HTMLElement).getByText('Good')).toBeTruthy();
    expect(container.querySelector('.pvs-tgauge__rating svg')).not.toBeNull();
  });

  it('draws an unobserved vital as a dashed dial and a dash, never as a "good"', () => {
    const { container } = gauge(null, 'no-data', 'No data');
    expect(container.querySelectorAll('.pvs-tgauge__seg[data-on="true"]')).toHaveLength(0);
    expect(container.querySelector('.pvs-tgauge__seg[data-missing="true"]')).not.toBeNull();
    expect(container.querySelector('.pvs-tgauge__number')?.textContent).toBe('—');
    expect(screen.getByRole('img', { name: 'LCP: No data' })).toBeTruthy();
  });

  it('keeps a reading beyond the dial at its end, still printed as it is', () => {
    const { container } = gauge(9000, 'poor', 'Poor');
    expect(container.querySelectorAll('.pvs-tgauge__seg[data-on="true"]')).toHaveLength(24);
    expect(container.querySelector('.pvs-tgauge__number')?.textContent).toBe('9');
  });
});

// ------------------------------------------------------------------ flow map

describe('flow map layout', () => {
  const columns = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'empty', label: 'Empty' },
  ];
  const nodes = [
    { id: 'a1', column: 'a' },
    { id: 'a2', column: 'a' },
    { id: 'b1', column: 'b' },
  ];

  it('places only the columns that hold a node, never closer than the minimum gap', () => {
    const layout = layoutFlow(columns, nodes, [], 300);
    expect(layout?.columns.map((column) => column.id)).toEqual(['a', 'b']);
    const [a, b] = layout?.columns ?? [];
    expect((b?.x ?? 0) - (a?.x ?? 0)).toBeGreaterThanOrEqual(FLOW_GEOMETRY.nodeWidth + FLOW_GEOMETRY.minGap);
  });

  it('draws a link only between two nodes on the map, its width on a log scale with a floor', () => {
    const layout = layoutFlow(columns, nodes, [
      { from: 'a1', to: 'b1', value: 100 },
      { from: 'a2', to: 'b1', value: 1 },
      { from: 'a1', to: 'nowhere', value: 50 },
    ]);
    expect(layout?.links).toHaveLength(2);
    expect(layout?.links[0]?.width).toBeCloseTo(FLOW_GEOMETRY.maxLink, 5);
    expect(layout?.links[1]?.width).toBeGreaterThan(FLOW_GEOMETRY.minLink);
    expect(flowLinkWidth(0, 10)).toBe(FLOW_GEOMETRY.minLink);
  });

  it('returns nothing to draw for no nodes, and fits a long name with an ellipsis', () => {
    expect(layoutFlow(columns, [], [])).toBeNull();
    expect(fitName('a-very-long-service-name-that-overflows', 12)).toBe('a-very-long…');
    expect(fitName('short')).toBe('short');
  });
});

describe('FlowMap', () => {
  const node = (id: string, column: string, extra: Partial<FlowMapNode> = {}): FlowMapNode => ({
    id,
    column,
    name: `Node ${id}`,
    figure: '3',
    family: 'turquoise',
    icon: null,
    label: `Node ${id}, 3`,
    ...extra,
  });

  it('draws outside a router when no node links anywhere (the RCA trail)', () => {
    const { container } = wrap(
      <FlowMap
        columns={[{ id: 'l', label: 'Left' }, { id: 'r', label: 'Right' }]}
        nodes={[node('1', 'l'), node('2', 'r', { emphasis: true })]}
        links={[{ from: '1', to: '2', value: 1 }]}
        ariaLabel="Trail"
        legend={['What a link means']}
      />,
    );
    expect(screen.getByRole('group', { name: 'Trail' })).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(container.querySelector('[data-emphasis="true"]')?.getAttribute('aria-label')).toBe('Node 2, 3');
    expect(screen.getByText('What a link means')).toBeTruthy();
  });

  it('paints a link between two nodes at the same height (a gradient laid out in user space)', () => {
    // 3.2.2's stack map and the first 3.2.3 trail used bounding-box gradients: on a straight
    // horizontal link the box is empty and nothing paints (the problem → root-cause link vanished).
    const { container } = wrap(
      <FlowMap
        columns={[{ id: 'l', label: 'Left' }, { id: 'r', label: 'Right' }]}
        nodes={[node('1', 'l'), node('2', 'r')]}
        links={[{ from: '1', to: '2', value: 1 }]}
        ariaLabel="Flat"
        legend={[]}
      />,
    );
    const gradient = container.querySelector('linearGradient') as SVGLinearGradientElement;
    expect(gradient.getAttribute('gradientUnits')).toBe('userSpaceOnUse');
    expect(Number(gradient.getAttribute('x2'))).toBeGreaterThan(Number(gradient.getAttribute('x1')));
  });

  it('makes a node with a route a link, reachable from the keyboard', () => {
    wrap(
      <FlowMap
        columns={[{ id: 'l', label: 'Left' }]}
        nodes={[node('1', 'l', { href: '/services' })]}
        links={[]}
        ariaLabel="Map"
        legend={[]}
      />,
      true,
    );
    const link = screen.getByRole('link', { name: /Node 1, 3/ });
    expect(link.getAttribute('tabindex')).toBe('0');
  });
});

// ------------------------------------------------------------------ Topology: who calls what

describe('the Smartscape call map', () => {
  const rows = [
    { row: 'link', source: 'WEB_REQUEST_SERVICE', target: 'WEB_SERVICE', targetType: 'WEB_SERVICE', calls: 11 },
    { row: 'link', source: 'WEB_REQUEST_SERVICE', target: 'SQL Server', targetType: 'DATABASE_SERVICE', calls: 6 },
    { row: 'link', source: 'QUEUE_LISTENER_SERVICE', target: 'MESSAGING_SERVICE', targetType: 'MESSAGING_SERVICE', calls: 5 },
    { row: 'link', source: 'WEB_REQUEST_SERVICE', target: '[declared unavailable by agent]', targetType: 'DATABASE_SERVICE', calls: 2 },
    { row: 'caller', source: 'WEB_REQUEST_SERVICE', services: 16 },
    { row: 'caller', source: 'QUEUE_LISTENER_SERVICE', services: 1 },
    { row: 'callee', target: 'WEB_SERVICE', targetType: 'WEB_SERVICE', services: 7 },
    { row: 'callee', target: 'SQL Server', targetType: 'DATABASE_SERVICE', services: 2 },
    { row: 'callee', target: 'MESSAGING_SERVICE', targetType: 'MESSAGING_SERVICE', services: 5 },
    { row: 'callee', target: '[declared unavailable by agent]', targetType: 'DATABASE_SERVICE', services: 1 },
    { row: 'total', services: 76, withCalls: 23 },
  ];
  const model = buildCallMap(rows, t, formatNumber);

  it('puts callers on the left and what they call on the right: services, then messaging, then databases', () => {
    expect(model.nodes.filter((node) => node.column === 'callers').map((node) => node.name)).toEqual([
      'Web request services',
      'Queue listeners',
    ]);
    expect(model.nodes.filter((node) => node.column === 'callees').map((node) => node.name)).toEqual([
      'Web services',
      'Messaging',
      'SQL Server',
      'Database (vendor not declared by the agent)',
    ]);
  });

  it('draws one link per measured pair, sized by its calls, and counts services in the singular when one', () => {
    expect(model.links).toContainEqual({ from: 'from:WEB_REQUEST_SERVICE', to: 'to:SQL Server', value: 6 });
    expect(model.links).toHaveLength(4);
    expect(model.nodes.find((node) => node.id === 'from:QUEUE_LISTENER_SERVICE')?.unit).toBe('service');
    expect(model.services).toBe(76);
    expect(model.withCalls).toBe(23);
  });

  it('names a database by its vendor and its official glyph, and an unknown vendor by the database icon', () => {
    expect(databaseGlyph('SQL Server')).toBe('sqlServer');
    expect(databaseGlyph('PostgreSQL')).toBe('postgresql');
    expect(databaseGlyph('Some DB')).toBeNull();
    expect(vendorGlyph('New Relic')).toBe('newRelic');
    expect(vendorGlyph('Datadog')).toBeNull();
  });
});

// ------------------------------------------------------------------ RCA trail

const incident: RcaIncident = {
  displayId: 'P-1',
  name: 'Request error rate increase',
  category: 'ERROR',
  status: 'CLOSED',
  severity: null,
  impactLevels: ['Services'],
  affectedNames: ['svcA', 'web', 'svcB', 'c', 'd', 'e', 'f', 'g'],
  affectedTypes: [],
  relatedNames: [],
  affectedIds: ['SERVICE-1', 'APPLICATION-2', 'SERVICE-3', 'HOST-4', 'SERVICE-5', 'SERVICE-6', 'SERVICE-7', 'SERVICE-8'],
  relatedIds: [],
  rootCauseName: 'TradeManagement',
  rootCauseId: 'SERVICE-E1990917A56EB6C5',
  eventId: 'e',
  startIso: null,
  endIso: null,
  durationNs: 720_000_000_000,
  affectedCount: 8,
  clusters: [],
  namespaces: [],
  workloads: [],
  description: null,
};

describe('the root-cause trail', () => {
  it('runs problem → root cause → affected, the root cause raised, the rest in one "+N" node', () => {
    const { nodes, links } = buildTrail(incident, t, formatNumber);
    expect(nodes.map((node) => node.column)).toEqual(['problem', 'root', ...Array.from({ length: TRAIL_AFFECTED_SHOWN + 1 }, () => 'affected')]);
    expect(nodes.find((node) => node.id === 'root')?.emphasis).toBe(true);
    expect(nodes.find((node) => node.id === 'affected-more')?.figure).toBe('+2');
    expect(links.filter((link) => link.from === 'root')).toHaveLength(TRAIL_AFFECTED_SHOWN + 1);
    expect(nodes.find((node) => node.id === 'affected-1')?.figure).toBe('Application');
  });

  it('links the problem to the affected entities directly when Davis named no root cause', () => {
    const { nodes, links } = buildTrail({ ...incident, rootCauseName: null, rootCauseId: null }, t, formatNumber);
    expect(nodes.some((node) => node.column === 'root')).toBe(false);
    expect(links.every((link) => link.from === 'problem')).toBe(true);
  });

  it('reads the kind of an entity from its id', () => {
    expect(entityKindOf('SERVICE-1')).toBe('service');
    expect(entityKindOf('APPLICATION-1')).toBe('application');
    expect(entityKindOf('CLOUD_APPLICATION-1')).toBe('workload');
    expect(entityKindOf('PROCESS_GROUP_INSTANCE-1')).toBe('process');
    expect(entityKindOf('KUBERNETES_CLUSTER-1')).toBe('kubernetes');
    expect(entityKindOf(null)).toBe('entity');
  });
});

// ------------------------------------------------------------------ data rules

describe('the RCA trend counts complete days only (Q7)', () => {
  const day = (iso: string, opened: number) => ({ day: iso, opened, rootCaused: 0, avgAffected: 1 });
  const trend = [
    day('2026-09-27T00:00:00.000Z', 90), // starts before the window: partial
    day('2026-09-28T00:00:00.000Z', 800),
    day('2026-09-29T00:00:00.000Z', 810),
    day('2026-10-04T00:00:00.000Z', 120), // today, still running: partial
  ];

  it('leaves out the partial first and last days when the window is known', () => {
    const rca = summariseRca([], [], [], 15, trend, [], [], {
      trendWindow: { startMs: Date.parse('2026-09-27T21:00:00Z'), endMs: Date.parse('2026-10-04T21:00:00Z') },
    });
    expect(rca.trend.opened).toEqual([800, 810]);
  });

  it('keeps every bin when the window is not given (3.2.2 behaviour, for callers that cannot know it)', () => {
    expect(summariseRca([], [], [], 15, trend).trend.opened).toEqual([90, 800, 810, 120]);
  });
});

describe('arrival change between the two halves of the week', () => {
  const bins = (counts: number[]): ArrivalBin[] => counts.map((count, index) => ({ start: index * ARRIVAL_BIN_MS, count }));

  it('compares averages over every bin, the quiet ones as zeros', () => {
    expect(arrivalChange(bins([2, 2, 2, 2, 0, 0, 2, 0]))?.fallPct).toBe(75);
    expect(arrivalChange(bins([1, 1, 2, 2]))?.fallPct).toBe(-100);
  });

  it('states no change when the first half had nothing to compare against', () => {
    expect(arrivalChange(bins([0, 0, 3, 3]))).toBeNull();
    expect(arrivalChange(bins([5]))).toBeNull();
  });
});

describe('log quality over every bucket (C12)', () => {
  const records = [
    { status: 'NONE', bucket: 'default_logs', total: 1_500, withService: 30, withHost: 300, withK8sNamespace: 0 },
    { status: 'NONE', bucket: 'logs_teste', total: 40, withService: 0, withHost: 40, withK8sNamespace: 40 },
    { status: 'INFO', bucket: 'logs_teste', total: 260, withService: 80, withHost: 200, withK8sNamespace: 260 },
    { status: 'INFO', bucket: 'empty_bucket', total: 0, withService: 0, withHost: 0, withK8sNamespace: 0 },
  ];

  it('adds the buckets up per status for the severity table', () => {
    const rows = toQualityRows(records);
    expect(rows.map((row) => [row.status, row.total, row.withK8sNamespace])).toEqual([
      ['NONE', 1_540, 40],
      ['INFO', 260, 260],
    ]);
  });

  it('adds the statuses up per bucket, and leaves an empty bucket out', () => {
    expect(toBucketContext(records).map((row) => [row.bucket, row.total, row.withK8sNamespace])).toEqual([
      ['default_logs', 1_500, 0],
      ['logs_teste', 300, 300],
    ]);
  });
});

describe('service failure bands', () => {
  it('uses the 1 % and 5 % lines of the assumptions registry, and a service with no failure is "none"', () => {
    expect(failureBand(0, 0)).toBe('none');
    expect(failureBand(null, null)).toBe('none');
    expect(failureBand(3, 0.4)).toBe('under');
    expect(failureBand(30, 1)).toBe('review');
    expect(failureBand(300, 4.99)).toBe('review');
    expect(failureBand(900, 5)).toBe('high');
  });
});

describe('synthetic monitors: browser and HTTP', () => {
  const inventory = [
    { category: 'Synthetic monitors', value: 67 },
    { category: 'Synthetic monitors (browser)', value: 42 },
    { category: 'Synthetic monitors (HTTP)', value: 25 },
  ];

  it('prints the split under the synthetic tile and nowhere else', () => {
    expect(inventoryDetail('Synthetic monitors', inventory, t, formatNumber)).toBe('42 browser · 25 HTTP');
    expect(inventoryDetail('Hosts', inventory, t, formatNumber)).toBeUndefined();
    expect(inventoryDetail('Synthetic monitors', inventory.slice(0, 1), t, formatNumber)).toBeUndefined();
  });
});
