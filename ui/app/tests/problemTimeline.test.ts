import { describe, expect, it } from 'vitest';

import { buildWrapupModel, type WrapupResults } from '../features/wrapup/model';
import { translate } from '../i18n/strings';
import { ARRIVAL_BIN_MS, ARRIVAL_BINS, arrivalCalendar, arrivalSeries, peakOf } from '../models/problemTimeline';

/**
 * `prob.timeline` returns only the six-hour bins in which some problem began. A bin it leaves
 * out is a measured zero; drawing or averaging the rows as they come closes those gaps up.
 */

const END = '2026-09-07T23:59:00.000Z';
const LAST_BIN = Date.parse('2026-09-07T18:00:00.000Z');
const FIRST_BIN = LAST_BIN - (ARRIVAL_BINS - 1) * ARRIVAL_BIN_MS;
const at = (index: number) => new Date(FIRST_BIN + index * ARRIVAL_BIN_MS).toISOString().replace('.000Z', '.000000000Z');

describe('arrivalSeries', () => {
  it('returns seven days of six-hour bins ending at the bin that holds the end, the gaps as zeros', () => {
    const series = arrivalSeries(
      [
        { interval: at(0), problems: 3 },
        { interval: at(27), problems: 5 },
      ],
      Date.parse(END),
    );
    expect(series).toHaveLength(ARRIVAL_BINS);
    expect(series[0]).toEqual({ start: FIRST_BIN, count: 3 });
    expect(series[27]).toEqual({ start: LAST_BIN, count: 5 });
    expect(series.slice(1, 27).every((bin) => bin.count === 0)).toBe(true);
  });

  it('leaves out problems that began before the run (still open in the window, started earlier)', () => {
    const series = arrivalSeries([{ interval: new Date(FIRST_BIN - ARRIVAL_BIN_MS).toISOString(), problems: 40 }], Date.parse(END));
    expect(series.reduce((sum, bin) => sum + bin.count, 0)).toBe(0);
    expect(peakOf(series)).toBeNull();
  });

  it('names the busiest bin', () => {
    const series = arrivalSeries(
      [
        { interval: at(3), problems: 2 },
        { interval: at(9), problems: 7 },
      ],
      Date.parse(END),
    );
    expect(peakOf(series)).toEqual({ start: FIRST_BIN + 9 * ARRIVAL_BIN_MS, count: 7 });
  });
});

describe('arrivalCalendar', () => {
  // Invariants only: the layout depends on the time zone the tests run in, the facts must not.
  const series = arrivalSeries(
    Array.from({ length: ARRIVAL_BINS }, (_, index) => ({ interval: at(index), problems: index % 5 })),
    Date.parse(END),
  );
  const calendar = arrivalCalendar(series);

  it('places every bin exactly once, in its day and its six-hour column', () => {
    const placed = calendar.days.flatMap((day) => day.cells.filter((cell) => cell !== null));
    expect(placed).toHaveLength(ARRIVAL_BINS);
    expect(new Set(placed.map((cell) => cell?.start)).size).toBe(ARRIVAL_BINS);
    expect(calendar.periods).toHaveLength(4);
    for (const day of calendar.days) {
      expect(day.cells).toHaveLength(calendar.periods.length);
      day.cells.forEach((cell, index) => {
        if (cell !== null) expect(new Date(cell.start).getHours()).toBe(calendar.periods[index]);
      });
    }
  });

  it('keeps the totals of the series, and leaves gaps only at the two ends of the run', () => {
    expect(calendar.total).toBe(series.reduce((sum, bin) => sum + bin.count, 0));
    expect(calendar.days.reduce((sum, day) => sum + day.total, 0)).toBe(calendar.total);
    expect(calendar.max).toBe(4);
    calendar.days.slice(1, -1).forEach((day) => expect(day.cells.every((cell) => cell !== null)).toBe(true));
    expect(calendar.busiestDay?.total).toBe(Math.max(...calendar.days.map((day) => day.total)));
  });

  it('has no busiest day and no peak when nothing began', () => {
    const quiet = arrivalCalendar(arrivalSeries([], Date.parse(END)));
    expect(quiet.total).toBe(0);
    expect(quiet.busiestDay).toBeNull();
    expect(quiet.peak).toBeNull();
  });
});

describe('the deck’s "problem arrival fell" line', () => {
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
    costModel: { ratePerHour: 250, currencyLabel: 'BRL', rateBasis: '', downtimeRatePerHour: 20000, downtimeBasis: '' },
    baseline: { manualMttrHours: 24, annualCostPerAgent: 30000 },
    windowLabel: 'last 7 days',
    generatedAtLabel: 'now',
    commercial: false,
    seName: null,
    dtLogo: 'data:image/png;base64,iVBORw0KGgo=',
    customerLogo: null,
    customerLogoAspect: null,
    partnerLogo: null,
    partnerLogoAspect: null,
  };

  it('counts the quiet periods: busy first half, two arrivals in the second → it fell', () => {
    // Every bin of the first half had 2 arrivals; the second half had arrivals in 2 of 14 bins.
    // Averaged as returned (3.2.0) the halves were 2 and 2 — "no change". Over the real 28 bins
    // they are 2.0 and 0.29: arrivals fell 86 %.
    const records = [
      ...Array.from({ length: 14 }, (_, index) => ({ interval: at(index), problems: 2 })),
      { interval: at(20), problems: 2 },
      { interval: at(27), problems: 2 },
    ];
    const results: WrapupResults = {
      'cov.inventory': { records: [{ category: 'Hosts', value: 10 }], outcome: 'ok' },
      'prob.summary': { records: [{ 'event.category': 'ERROR', 'event.status': 'CLOSED', problems: 18 }], outcome: 'ok' },
      'prob.timeline': { records, outcome: 'ok', timeframe: { endIso: END } },
    };
    const problems = buildWrapupModel(results, ctx).technical.find((section) => section.id === 'problems');
    expect(problems?.narrative.join(' ')).toContain('Problem arrival fell 86%');
  });
});
