import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { propagationColumns } from '../features/rca/RcaPropagation';
import { entryFor, type StringKey } from '../i18n/strings';
import type { RcaIncident } from '../models/rca';
import { failureDomain, latencyDomain, quadrantOf, serviceQuadrants } from '../models/serviceQuadrants';
import { NO_CALLERS, type RootCallers } from '../models/trailLinks';

/**
 * 3.5.4 — the second release of the visual proposal v4: Services → "Quadrants" and AIOps & RCA told as a propagation,
 * in tabs. Nothing invented: the points are the ranked list (a top N, never summed as the estate), the propagation's
 * cards are what the platform attached or measured, and no per-entity time is drawn.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) =>
  Object.entries(params ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), entryFor(key).en);
const fmt = (value: number) => String(value);

describe('Services → Quadrants', () => {
  it('places a service by the two review lines of the assumptions registry', () => {
    expect(quadrantOf(3, 1500, 1, 1000)).toBe('both');
    expect(quadrantOf(0.2, 1500, 1, 1000)).toBe('slow');
    expect(quadrantOf(3, 80, 1, 1000)).toBe('failing');
    expect(quadrantOf(0, 80, 1, 1000)).toBe('within');
  });

  it('counts only the points it shows and leaves a service without a response time off the chart, saying so', () => {
    const view = serviceQuadrants(
      [
        { name: 'checkout', serviceId: 'SERVICE-1', totalRequests: 1000, failureRatePct: 11.4, avgResponseTimeUs: 1_400_000 },
        { name: 'cart', serviceId: 'SERVICE-2', totalRequests: 500, failureRatePct: 0.1, avgResponseTimeUs: 90_000 },
        { name: 'search', serviceId: 'SERVICE-3', totalRequests: 300, failureRatePct: 0, avgResponseTimeUs: null },
        { name: 'idle', serviceId: 'SERVICE-4', totalRequests: 0, failureRatePct: 0, avgResponseTimeUs: 1000 },
      ],
      1,
      1000,
    );
    expect(view.points.map((point) => point.name)).toEqual(['checkout', 'cart']);
    expect(view.counts).toEqual({ both: 1, slow: 0, failing: 0, within: 1 });
    expect(view.untimed).toBe(1);
  });

  it('keeps both lines inside the axes', () => {
    const points = serviceQuadrants([{ name: 'a', serviceId: 'S', totalRequests: 10, failureRatePct: 0.2, avgResponseTimeUs: 20_000 }], 1, 1000).points;
    expect(failureDomain(points, 1)).toBeGreaterThanOrEqual(2);
    const [low, high] = latencyDomain(points, 1000);
    expect(low).toBeLessThanOrEqual(20);
    expect(high).toBeGreaterThan(1000);
  });

  it('is a tab of the Services page, drawn by the app with a table for screen readers and the "top N of M" line', () => {
    const page = read('ui/app/pages/ServicesAndTracing.tsx');
    expect(page).toContain("<Tab title={t('p.svc.tab.quadrants')} keepMounted>");
    expect(page).toContain('<ServiceQuadrants />');
    const chart = read('ui/app/features/services/ServiceQuadrants.tsx');
    expect(chart).toContain("assumed('services.failure.good')");
    expect(chart).toContain("assumed('services.latency.attention')");
    expect(chart).toContain('data-pvs-chart="service-quadrants"');
    expect(chart).toContain('<div className="pvs-sr-only">');
    expect(chart).toContain("t('svc.quad.topOfTotal'");
  });
});

const INCIDENT: RcaIncident = {
  displayId: 'P-1',
  name: 'Response time degradation',
  category: 'SLOWDOWN',
  status: 'CLOSED',
  severity: null,
  impactLevels: ['SERVICES'],
  affectedNames: ['payments-db', 'svc-checkout-01', 'svc-cart-02', 'host-eu-01', 'web-shop'],
  affectedTypes: [],
  relatedNames: [],
  affectedIds: ['SERVICE-DB', 'SERVICE-A', 'SERVICE-B', 'HOST-1', 'APPLICATION-1'],
  relatedIds: [],
  rootCauseName: 'payments-db',
  rootCauseId: 'SERVICE-DB',
  eventId: null,
  startIso: '2026-09-15T09:41:00Z',
  endIso: '2026-09-15T16:53:00Z',
  durationNs: 7.2 * 3_600_000_000_000,
  affectedCount: 5,
  clusters: [],
  namespaces: [],
  workloads: [],
  description: null,
};

describe('AIOps & RCA — the propagation', () => {
  it('reads the incident by hop: the cause, the callers with their measured failures, the affected, where users met it', () => {
    const callers: RootCallers = {
      rootType: 'DATABASE_SERVICE',
      callers: [{ id: 'SERVICE-A', name: 'svc-checkout-01', requests: 9000, failures: 3412 }],
    };
    const columns = propagationColumns(INCIDENT, callers, fmt, t);
    expect(columns.map((column) => column.id)).toEqual(['cause', 'callers', 'affected', 'users']);
    expect(columns[0]?.cards[0]).toMatchObject({ name: 'payments-db', kind: 'database' });
    expect(columns[1]?.cards[0]?.figure).toBe('3412 failures');
    // A caller already shown is not repeated among the affected; the root cause is not "affected by" itself.
    expect(columns[2]?.cards.map((card) => card.name)).toEqual(['svc-cart-02', 'host-eu-01']);
    expect(columns[3]?.cards.map((card) => card.name)).toEqual(['web-shop']);
  });

  it('leaves out a column with nothing in it and draws no per-entity time', () => {
    const columns = propagationColumns({ ...INCIDENT, affectedNames: ['svc-cart-02'], affectedIds: ['SERVICE-B'] }, NO_CALLERS, fmt, t);
    expect(columns.map((column) => column.id)).toEqual(['cause', 'affected']);
    const component = read('ui/app/features/rca/RcaPropagation.tsx');
    expect(component).toContain('incident.startIso');
    expect(component).not.toMatch(/reachedAt|entityTime|hopTime/);
  });

  it('puts the RCA page in four tabs, the propagation first, the recommendation below them', () => {
    const page = read('ui/app/pages/ProblemsRca.tsx');
    const tabs = ['rca.tab.propagation', 'rca.tab.investigation', 'rca.tab.affected', 'rca.tab.history'].map((key) => page.indexOf(`<Tab title={t('${key}')} keepMounted>`));
    expect(tabs.every((index) => index > 0)).toBe(true);
    expect([...tabs].sort((a, b) => a - b)).toEqual(tabs);
    expect(page).toContain('<RcaPropagation incident={incident} />');
    expect(page).toContain('<RcaAffectedTable incident={incident} />');
    expect(page.indexOf('</Tabs>')).toBeLessThan(page.indexOf("title={t('p.rca.assist.title')}"));
    // The trail map stays where the incident is printed or photographed.
    expect(read('ui/app/pages/ValueReport.tsx')).toContain('<RcaTrail');
    expect(read('ui/app/features/wrapup/captures.tsx')).toContain('<RcaTrail');
  });
});

describe('What’s new', () => {
  it('kept 3.5.4 among the ten releases until 3.6.4 pushed it out', () => {
    // 3.5.5: newer releases come first; 3.5.4's entry stayed in the ten until 3.6.4.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i96')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i96').en.startsWith('3.5.4 — ')).toBe(true);
  });
});
