import { describe, expect, it } from 'vitest';

import { buildCaptureTargets, CAPTURE_REGISTRY } from '../features/wrapup/captures';
import { buildWrapupModel, type WrapupResults } from '../features/wrapup/model';
import { translate } from '../i18n/strings';

/**
 * 3.3.16 — the owner's answers to the deck proposal (2026-11-17): the Tech Wrapup uses **only the
 * new graphics** where one exists, each new capture reads itself in three pins, and each of these
 * slides opens on a measured sentence that says what its picture shows ("contexto e riqueza").
 */

const t = ((key: Parameters<typeof translate>[0], params?: Record<string, string | number>) => translate(key, 'en', params)) as Parameters<typeof buildCaptureTargets>[0];
const fmt = { compact: (value: number) => String(value) } as unknown as Parameters<typeof buildCaptureTargets>[1];

describe('only the new graphics in the deck', () => {
  it('drops the older captures where a new panel exists', () => {
    const ids = CAPTURE_REGISTRY.map((entry) => entry.captureId);
    for (const gone of ['infrastructure.cpu', 'infrastructure.memory', 'kubernetes.restarts', 'kubernetes.oom', 'services.failure-rate', 'services.response-time', 'experience.vitals']) {
      expect(ids, gone).not.toContain(gone);
    }
    for (const kept of ['problems.arrivals', 'problems.mix', 'infrastructure.ceiling', 'kubernetes.stable', 'services.slowest', 'experience.errors']) expect(ids, kept).toContain(kept);
  });

  it('reads each new capture in three to five pins (3.5.6: four or five, with their reading)', () => {
    const targets = buildCaptureTargets(t, fmt);
    for (const id of ['kubernetes.stable', 'experience.errors', 'problems.mix', 'infrastructure.ceiling', 'services.slowest', 'problems.arrivals']) {
      const pins = targets.find((target) => target.captureId === id)?.pins ?? [];
      expect(pins.length, id).toBeGreaterThanOrEqual(4);
      expect(pins.length, id).toBeLessThanOrEqual(5);
      for (const pin of pins) expect(pin.detail?.length ?? 0, id).toBeGreaterThan(20);
    }
  });
});

describe('each slide opens on what its picture reads', () => {
  const ctx = {
    t: (key: Parameters<typeof translate>[0], params?: Record<string, string | number>) => translate(key, 'en', params),
    formatNumber: (value: number) => value.toLocaleString('en-US'),
    params: {
      customerName: 'Contoso',
      engagementName: 'PoC',
      scopeDescription: '',
      pocDescription: '',
      customerLogoDataUrl: null,
      brandTone: 'default' as const,
      partnerName: '',
      partnerLogoDataUrl: null,
      customerUrl: '',
    },
    costModel: { ratePerHour: 0, currencyLabel: '', rateBasis: '', downtimeRatePerHour: 0, downtimeBasis: '' },
    baseline: { manualMttrHours: 0, annualCostPerAgent: 0 },
    windowLabel: 'last 24 hours',
    generatedAtLabel: 'now',
    commercial: false,
    seName: '',
    dtLogo: 'data:image/png;base64,iVBORw0KGgo=',
    customerLogo: null,
    customerLogoAspect: null,
    partnerLogo: null,
    partnerLogoAspect: null,
  };
  const q = (records: Record<string, unknown>[]) => ({ records, outcome: 'ok' });

  it('leads Kubernetes with the share of workloads that did not restart, from the two aggregates', () => {
    const results: WrapupResults = {
      'cov.inventory': q([
        { category: 'Kubernetes clusters', value: 3 },
        { category: 'Kubernetes workloads', value: 100 },
      ]),
      'k8s.restarts': q([
        { workload: 'wl-a', cluster: 'c1', total: 120 },
        { workload: 'wl-b', cluster: 'c1', total: 10 },
      ]),
      'k8s.restarts.total': q([{ workloads: 2, restarts: 130 }]),
    };
    const k8s = buildWrapupModel(results, ctx).technical.find((section) => section.id === 'kubernetes');
    expect(k8s?.narrative[0]).toBe(
      '98% of the 100 workloads did not restart in the window; of the 2 that did, 1 passed 50 restarts — the place to start.',
    );
  });

  it('leads Problems with the leading category’s share of every problem', () => {
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Hosts', value: 10 }]),
      'prob.summary': q([
        { 'event.category': 'ERROR', 'event.status': 'CLOSED', problems: 75 },
        { 'event.category': 'SLOWDOWN', 'event.status': 'CLOSED', problems: 25 },
      ]),
    };
    const problems = buildWrapupModel(results, ctx).technical.find((section) => section.id === 'problems');
    expect(problems?.narrative[0]).toMatch(/^The Errors category accounts for 75% of the 100 problems/);
  });
});
