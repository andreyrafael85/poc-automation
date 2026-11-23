import { describe, expect, it } from 'vitest';

import {
  PILLAR_QUERY_IDS,
  POC_PILLARS,
  coverageFor,
  pillarById,
  queriesForPillars,
  statusFor,
  type PillarId,
  type ValidationPoint,
} from '../models/pillars';
import {
  countRecords,
  distinctOf,
  firstOf,
  inventoryCount,
  maxOf,
  percentOf,
  percentWhere,
  sumOf,
  sumWhere,
  topName,
} from '../models/pillarMetrics';
import { statusFromReadings, type MetricReading } from '../features/pillars/usePillarEvidence';
import { ALL_KEYS } from '../i18n/strings';
import { getQuery } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';

/**
 * The pillars exist to frame the engagement honestly and to measure it. These
 * tests guard both halves: a pillar must never imply it was proven when the app
 * has no data source, and a reducer must never turn missing data into a zero.
 */

const points = POC_PILLARS.flatMap((pillar) => pillar.points);

describe('pillar definitions', () => {
  it('defines the four pillars the sales motion uses', () => {
    const ids = POC_PILLARS.map((pillar) => pillar.id);
    expect(ids).toEqual<PillarId[]>(['resilience', 'productivity', 'cost', 'agility']);
  });

  it('gives every pillar a title, an ROI statement and at least one validation point', () => {
    for (const pillar of POC_PILLARS) {
      expect(pillar.titleKey, pillar.id).toBeTruthy();
      expect(pillar.roiKey, pillar.id).toBeTruthy();
      expect(pillar.points.length, pillar.id).toBeGreaterThan(0);
    }
  });

  it('has a translation for every pillar, point and metric label', () => {
    for (const pillar of POC_PILLARS) {
      expect(ALL_KEYS, pillar.id).toContain(pillar.titleKey);
      expect(ALL_KEYS, pillar.id).toContain(pillar.roiKey);
      for (const point of pillar.points) {
        expect(ALL_KEYS, point.id).toContain(point.labelKey);
        if (point.caveatKey !== undefined) {
          expect(ALL_KEYS, `${point.id} caveat`).toContain(point.caveatKey);
        }
        for (const metric of point.metrics) {
          expect(ALL_KEYS, `${point.id}/${metric.id}`).toContain(metric.labelKey);
        }
      }
    }
  });

  it('references only queries that exist in the catalog', () => {
    for (const point of points) {
      for (const metric of point.metrics) {
        expect(() => getQuery(metric.queryId), `${point.id} -> ${metric.queryId}`).not.toThrow();
        expect(getQuery(metric.queryId).id).toBe(metric.queryId);
      }
    }
  });

  it('gives every point a unique id within its pillar', () => {
    for (const pillar of POC_PILLARS) {
      const ids = pillar.points.map((point) => point.id);
      expect(new Set(ids).size, pillar.id).toBe(ids.length);
    }
  });

  it('states the calculation behind every derived metric', () => {
    // A derived figure without a stated calculation is an unexplained number,
    // which is exactly what this app exists not to produce.
    for (const point of points) {
      for (const metric of point.metrics) {
        if (metric.kind === 'derived') {
          expect(metric.derivationKey, `${point.id}/${metric.id}`).toBeDefined();
          expect(ALL_KEYS).toContain(metric.derivationKey!);
        }
      }
    }
  });
});

describe('query selection', () => {
  it('runs nothing when no pillar is selected', () => {
    expect(queriesForPillars([]).size).toBe(0);
  });

  it('runs only the queries the selected pillars need', () => {
    const agility = queriesForPillars(['agility']);
    expect(agility.has('rum.sessions')).toBe(true);
    // A resilience-only query must not be fetched for an agility-only scope.
    expect(agility.has('prob.recurrent')).toBe(false);
  });

  it('lists every pillar query exactly once', () => {
    expect(new Set(PILLAR_QUERY_IDS).size).toBe(PILLAR_QUERY_IDS.length);
    const all = queriesForPillars(POC_PILLARS.map((pillar) => pillar.id));
    expect([...all].sort()).toEqual([...PILLAR_QUERY_IDS].sort());
  });

  it('keeps the hook and the model in step', async () => {
    // The hook must declare a `useCatalogQuery` line for every pillar query.
    // Rules of hooks forbid building that list dynamically, so this guards the
    // one thing that can silently drift.
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync('ui/app/features/pillars/usePillarEvidence.ts', 'utf8'),
    );
    for (const id of PILLAR_QUERY_IDS) {
      expect(source, `usePillarEvidence is missing ${id}`).toContain(`useCatalogQuery('${id}'`);
    }
  });
});

describe('metric reducers', () => {
  const records: GrailRecord[] = [
    { category: 'Hosts', value: 12, mode: 'FULL_STACK', hosts: 8, name: 'a' },
    { category: 'Services', value: 30, mode: 'INFRASTRUCTURE', hosts: 2, name: 'b' },
    { category: 'Hosts', value: null, mode: 'FULL_STACK', hosts: 5, name: null },
  ];

  it('counts records, including an empty result as zero', () => {
    expect(countRecords(records)).toBe(3);
    expect(countRecords([])).toBe(0);
  });

  it('returns null rather than zero when no record carries the field', () => {
    // The whole point: an absent measurement must not read as a measured zero.
    expect(sumOf('missing')(records)).toBeNull();
    expect(maxOf('missing')(records)).toBeNull();
    expect(firstOf('missing')(records)).toBeNull();
  });

  it('sums only the values that are present', () => {
    expect(sumOf('value')(records)).toBe(42);
    expect(sumOf('hosts')(records)).toBe(15);
  });

  it('takes the maximum and the first value', () => {
    expect(maxOf('value')(records)).toBe(30);
    expect(firstOf('value')(records)).toBe(12);
  });

  it('counts distinct non-null strings', () => {
    expect(distinctOf('category')(records)).toBe(2);
    expect(distinctOf('name')(records)).toBe(2);
    expect(distinctOf('category')([])).toBeNull();
  });

  it('reads one inventory category and reports a genuinely absent one as null', () => {
    expect(inventoryCount('Services')(records)).toBe(30);
    expect(inventoryCount('Kubernetes clusters')(records)).toBeNull();
  });

  it('distinguishes a measured zero from an unmeasured one when filtering', () => {
    // Rows came back but none matched: that is a real zero.
    expect(sumWhere('mode', ['DISCOVERY'], 'hosts')(records)).toBe(0);
    // No rows at all: nothing was measured.
    expect(sumWhere('mode', ['DISCOVERY'], 'hosts')([])).toBeNull();
    expect(sumWhere('mode', ['FULL_STACK'], 'hosts')(records)).toBe(13);
  });

  it('computes shares against the measured total', () => {
    expect(percentWhere('mode', ['FULL_STACK'], 'hosts')(records)).toBeCloseTo((13 / 15) * 100, 6);
    expect(percentWhere('mode', ['FULL_STACK'], 'hosts')([])).toBeNull();
    expect(percentOf('hosts', 'value')(records)).toBeCloseTo((15 / 42) * 100, 6);
  });

  it('never divides by a zero denominator', () => {
    const zeroes: GrailRecord[] = [{ a: 5, b: 0 }];
    expect(percentOf('a', 'b')(zeroes)).toBeNull();
  });

  it('names the top-ranked record', () => {
    expect(topName('category')(records)).toBe('Hosts');
    expect(topName('category')([])).toBeNull();
  });
});

describe('live evidence status', () => {
  const point = (over: Partial<ValidationPoint> = {}): ValidationPoint => ({
    id: 'x',
    labelKey: 'pillar.cost.p2',
    metrics: [
      {
        id: 'm',
        labelKey: 'pillar.m.hosts',
        queryId: 'cov.inventory',
        reduce: countRecords,
        unit: 'count',
      },
    ],
    ...over,
  });

  const reading = (value: number | string | null): MetricReading => ({
    metric: point().metrics[0]!,
    value,
    fact: { value, provenance: value === null ? 'no-telemetry' : 'observed', confidence: 'high' },
  });

  it('marks a point with no metric as not evidenced', () => {
    expect(statusFromReadings(point({ metrics: [] }), [], [])).toBe('not-evidenced');
  });

  it('reports measuring while any query is still running', () => {
    expect(statusFromReadings(point(), [reading(4)], ['loading'])).toBe('measuring');
  });

  it('never claims evidence from a refused query', () => {
    // A permission gap is a statement about us, not a result about the estate.
    expect(statusFromReadings(point(), [reading(null)], ['no-permission'])).toBe('not-evidenced');
  });

  it('never claims evidence when nothing came back', () => {
    expect(statusFromReadings(point(), [reading(null)], ['empty'])).toBe('not-evidenced');
  });

  it('stays partial when the point carries a caveat, even with every figure measured', () => {
    const withCaveat = point({ caveatKey: 'pillar.cost.p1.caveat' });
    expect(statusFromReadings(withCaveat, [reading(4)], ['ok'])).toBe('partial');
  });

  it('is partial when only some figures were measured', () => {
    expect(statusFromReadings(point(), [reading(4), reading(null)], ['ok', 'ok'])).toBe('partial');
  });

  it('is evidenced only when every figure came back from a working query', () => {
    expect(statusFromReadings(point(), [reading(4)], ['ok'])).toBe('evidenced');
  });

  it('treats a measured zero as evidence', () => {
    // Zero problems is a finding. It is not the same as no measurement.
    expect(statusFromReadings(point(), [reading(0)], ['ok'])).toBe('evidenced');
  });
});

describe('recorded-validation fallback', () => {
  it('marks a point with no metric as not evidenced', () => {
    expect(statusFor({ id: 'x', labelKey: 'pillar.cost.p4', metrics: [] })).toBe('not-evidenced');
  });

  it('marks a point as partial when it carries a caveat, even with working queries', () => {
    const withCaveat = points.filter(
      (candidate) => candidate.caveatKey !== undefined && candidate.metrics.length > 0,
    );
    expect(withCaveat.length).toBeGreaterThan(0);
    for (const candidate of withCaveat) {
      expect(statusFor(candidate), candidate.id).not.toBe('evidenced');
    }
  });

  it('never marks a point evidenced when its only query was refused', () => {
    // rum.sessions was refused for lack of a scope during validation.
    const sessions = points.find(
      (candidate) =>
        candidate.metrics.length > 0 &&
        candidate.metrics.every((metric) => metric.queryId === 'rum.sessions'),
    );
    expect(sessions).toBeDefined();
    expect(statusFor(sessions!)).toBe('not-evidenced');
  });

  it('does not claim full coverage for the business agility pillar', () => {
    const coverage = coverageFor(POC_PILLARS[3]!);
    expect(coverage.evidenced).toBeLessThan(coverage.total);
  });

  it('counts every point exactly once', () => {
    for (const pillar of POC_PILLARS) {
      const coverage = coverageFor(pillar);
      expect(coverage.evidenced + coverage.partial + coverage.notEvidenced, pillar.id).toBe(
        coverage.total,
      );
      expect(coverage.total).toBe(pillar.points.length);
    }
  });
});

describe('pillarById', () => {
  it('finds every declared pillar and nothing else', () => {
    for (const pillar of POC_PILLARS) {
      expect(pillarById(pillar.id)?.id).toBe(pillar.id);
    }
    expect(pillarById('nope' as PillarId)).toBeUndefined();
  });
});
