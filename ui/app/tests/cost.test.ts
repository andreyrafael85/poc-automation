import { describe, expect, it } from 'vitest';

import {
  EMPTY_COST_MODEL,
  EMPTY_DOWNTIME_INPUTS,
  estimateDowntimeCost,
  estimateOperationalCost,
  exposureHours,
  formatHours,
  formatMoney,
  isCostConfigured,
  nanosToHours,
  suggestDowntimeRate,
  totalExposure,
  type CostModel,
} from '../models/cost';
import { MAX_REPORT_DAYS, hasCostWarning, resolveRelative, windowDays } from '../utils/time';

/**
 * The operational cost model is the only place in this app where a number on
 * screen depends on an assumption rather than a measurement. These tests exist
 * to keep that boundary visible and impossible to blur:
 *
 *   - hours are always `observed`
 *   - money is always `estimated`, never `derived` or `observed`
 *   - money never appears at all unless a rate was supplied
 *   - the arithmetic is always attached to the figure
 */

const evidence = { queryId: 'prob.exposure', source: 'problems', timeframe: 'last 24 hours' };

// 18,247 problem-hours, the figure actually observed during validation.
const OBSERVED_OPEN_NS = 18_247 * 3_600_000_000_000;

const configured: CostModel = {
  ratePerHour: 250,
  currencyLabel: 'BRL',
  rateBasis: 'blended on-call team cost',
  downtimeRatePerHour: null,
  downtimeBasis: '',
};

/** Availability-only hours: the 3,143 h actually observed during validation. */
const OBSERVED_AVAILABILITY_NS = 11_316_385_050_000_000;

const withDowntime: CostModel = {
  ...configured,
  downtimeRatePerHour: 25_000,
  downtimeBasis: 'lost revenue plus idle headcount',
};

describe('nanosToHours', () => {
  it('converts the platform unit to hours', () => {
    expect(nanosToHours(3_600_000_000_000)).toBe(1);
    expect(nanosToHours(41_457_817_547_088)).toBeCloseTo(11.52, 2);
  });

  it('returns null for unknown input rather than zero', () => {
    expect(nanosToHours(null)).toBeNull();
    expect(nanosToHours(Number.NaN)).toBeNull();
  });
});

describe('isCostConfigured', () => {
  it('treats a missing, zero or negative rate as not configured', () => {
    expect(isCostConfigured(EMPTY_COST_MODEL)).toBe(false);
    expect(isCostConfigured({ ...configured, ratePerHour: 0 })).toBe(false);
    expect(isCostConfigured({ ...configured, ratePerHour: -5 })).toBe(false);
  });

  it('accepts a positive rate', () => {
    expect(isCostConfigured(configured)).toBe(true);
  });
});

describe('exposureHours', () => {
  it('reports problem-hours as observed, because the platform measured them', () => {
    const fact = exposureHours(OBSERVED_OPEN_NS, evidence);
    expect(fact.provenance).toBe('observed');
    expect(fact.value).toBeCloseTo(18_247, 0);
    // No unit on the fact: callers pass a pre-formatted display such as
    // "6,613 h", and a tile that also rendered `unit` produced "6,613 h h".
    expect(fact.unit).toBeUndefined();
  });

  it('states that the clock is still running on open problems', () => {
    expect(exposureHours(OBSERVED_OPEN_NS, evidence).note).toMatch(/grows until they close/);
  });

  it('reports a gap rather than zero when the measurement is missing', () => {
    const fact = exposureHours(null, evidence);
    expect(fact.provenance).toBe('no-telemetry');
    expect(fact.value).toBeNull();
  });
});

describe('estimateOperationalCost', () => {
  it('produces no monetary figure when no rate is configured', () => {
    const fact = estimateOperationalCost(OBSERVED_OPEN_NS, EMPTY_COST_MODEL, evidence);
    expect(fact.value).toBeNull();
    expect(fact.provenance).toBe('not-configured');
    expect(fact.note).toMatch(/never invents a cost/);
  });

  it('directs the operator to Settings rather than showing a zero', () => {
    const fact = estimateOperationalCost(OBSERVED_OPEN_NS, EMPTY_COST_MODEL, evidence);
    expect(fact.value).not.toBe(0);
    expect('requirement' in fact ? String(fact.requirement) : '').toMatch(/Settings/);
  });

  it('marks a configured estimate as estimated with low confidence, never as observed', () => {
    const fact = estimateOperationalCost(OBSERVED_OPEN_NS, configured, evidence);
    expect(fact.provenance).toBe('projection');
    expect(fact.confidence).toBe('low');
    // The arithmetic is exact but one input is an assumption, so it must not
    // claim the stronger provenances.
    expect(fact.provenance).not.toBe('observed');
    expect(fact.provenance).not.toBe('derived');
  });

  it('computes hours multiplied by the supplied rate', () => {
    const fact = estimateOperationalCost(OBSERVED_OPEN_NS, configured, evidence);
    expect(typeof fact.value).toBe('number');
    expect(fact.value as number).toBeCloseTo(18_247 * 250, 0);
  });

  it('attaches the full arithmetic so the figure can be checked', () => {
    const note = estimateOperationalCost(OBSERVED_OPEN_NS, configured, evidence).note ?? '';
    expect(note).toContain('×');
    expect(note).toContain('BRL 250');
    expect(note).toMatch(/measured problem time/);
  });

  it('names the operator as the source of the rate, not the environment', () => {
    const note = estimateOperationalCost(OBSERVED_OPEN_NS, configured, evidence).note ?? '';
    expect(note).toMatch(/supplied by the operator/);
    expect(note).toMatch(/not read from the environment/);
  });

  it('includes the stated rate basis when the operator supplied one', () => {
    const note = estimateOperationalCost(OBSERVED_OPEN_NS, configured, evidence).note ?? '';
    expect(note).toContain('blended on-call team cost');
  });

  it('omits the basis sentence when none was given', () => {
    const note =
      estimateOperationalCost(OBSERVED_OPEN_NS, { ...configured, rateBasis: '' }, evidence).note ??
      '';
    expect(note).not.toContain('Rate basis');
  });

  it('reports a gap when hours are unknown even with a rate configured', () => {
    const fact = estimateOperationalCost(null, configured, evidence);
    expect(fact.provenance).toBe('no-telemetry');
    expect(fact.value).toBeNull();
  });

  it('never describes the estimate as a saving or a projection', () => {
    const note = (estimateOperationalCost(OBSERVED_OPEN_NS, configured, evidence).note ?? '').toLowerCase();
    for (const forbidden of ['saving', 'will save', 'projected', 'guaranteed', 'roi']) {
      expect(note, `mentions "${forbidden}"`).not.toContain(forbidden);
    }
  });
});

describe('formatting', () => {
  it('formats hours at a useful resolution', () => {
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(11.52)).toBe('11.5 h');
    expect(formatHours(18_247)).toBe('18,247 h');
    expect(formatHours(null)).toBe('—');
  });

  it('formats money without assuming a currency symbol', () => {
    expect(formatMoney(4_561_750, 'BRL')).toBe('BRL 4,561,750');
    expect(formatMoney(12.5, '')).toBe('12.5');
  });
});

describe('report window bound', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');

  it('measures the window in days', () => {
    expect(windowDays(resolveRelative('now-30d', 'x', now))).toBeCloseTo(30, 5);
    expect(windowDays(resolveRelative('now-24h', 'x', now))).toBeCloseTo(1, 5);
  });

  it('keeps every preset within the report bound', () => {
    for (const expression of ['now-1h', 'now-6h', 'now-24h', 'now-7d', 'now-30d']) {
      expect(windowDays(resolveRelative(expression, 'x', now))).toBeLessThanOrEqual(
        MAX_REPORT_DAYS,
      );
    }
  });

  it('flags only the widest preset as carrying a cost warning', () => {
    expect(hasCostWarning('now-30d')).toBe(true);
    expect(hasCostWarning('now-24h')).toBe(false);
    expect(hasCostWarning('now-7d')).toBe(false);
  });
});


describe('downtime cost', () => {
  it('reports not-configured rather than zero when no downtime rate is set', () => {
    const fact = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, configured, evidence);
    expect(fact.value).toBeNull();
    expect(fact.provenance).toBe('not-configured');
  });

  it('multiplies only the availability hours by the downtime rate', () => {
    const fact = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence);
    const hours = nanosToHours(OBSERVED_AVAILABILITY_NS)!;
    expect(fact.value).toBeCloseTo(hours * 25_000, 0);
  });

  it('is estimated with low confidence, never observed or derived', () => {
    // One of its inputs is an assumption. The badge has to say so.
    const fact = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence);
    expect(fact.provenance).toBe('projection');
    expect(fact.confidence).toBe('low');
  });

  it('states that only availability problems were counted', () => {
    const fact = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence);
    expect(fact.note).toContain('AVAILABILITY');
  });

  it('never charges downtime at the response rate', () => {
    // The defect this split exists to prevent: on the validation tenant all
    // problem time is roughly twelve times the availability time, so charging
    // one at the other's rate overstates the figure by an order of magnitude.
    const downtime = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence);
    const wrong = nanosToHours(OBSERVED_OPEN_NS)! * 25_000;
    expect(downtime.value).toBeLessThan(wrong);
  });
});

describe('suggestDowntimeRate', () => {
  it('returns nothing when no input was supplied, rather than a default', () => {
    const result = suggestDowntimeRate(EMPTY_DOWNTIME_INPUTS, 'BRL');
    expect(result.totalPerHour).toBeNull();
    expect(result.steps).toEqual([]);
  });

  it('computes revenue per hour from annual revenue and operating hours', () => {
    const result = suggestDowntimeRate(
      { ...EMPTY_DOWNTIME_INPUTS, annualRevenue: 8_760_000, operatingHoursPerYear: 8_760 },
      'BRL',
    );
    expect(result.revenuePerHour).toBe(1000);
    expect(result.totalPerHour).toBe(1000);
  });

  it('applies the interrupted share to the revenue half', () => {
    const result = suggestDowntimeRate(
      {
        ...EMPTY_DOWNTIME_INPUTS,
        annualRevenue: 8_760_000,
        operatingHoursPerYear: 8_760,
        revenueSharePct: 25,
      },
      'BRL',
    );
    expect(result.revenuePerHour).toBe(250);
  });

  it('computes the productivity half independently of revenue', () => {
    const result = suggestDowntimeRate(
      { ...EMPTY_DOWNTIME_INPUTS, employeesAffected: 40, loadedHourlyWage: 60 },
      'BRL',
    );
    expect(result.revenuePerHour).toBeNull();
    expect(result.productivityPerHour).toBe(2400);
    expect(result.totalPerHour).toBe(2400);
  });

  it('applies a productivity loss below 100%', () => {
    const result = suggestDowntimeRate(
      {
        ...EMPTY_DOWNTIME_INPUTS,
        employeesAffected: 40,
        loadedHourlyWage: 60,
        productivityLossPct: 50,
      },
      'BRL',
    );
    expect(result.productivityPerHour).toBe(1200);
  });

  it('adds both halves when both are supplied', () => {
    const result = suggestDowntimeRate(
      {
        annualRevenue: 8_760_000,
        operatingHoursPerYear: 8_760,
        revenueSharePct: 100,
        employeesAffected: 40,
        loadedHourlyWage: 60,
        productivityLossPct: 100,
      },
      'BRL',
    );
    expect(result.totalPerHour).toBe(3400);
  });

  it('shows every step of the arithmetic so it can be checked', () => {
    const result = suggestDowntimeRate(
      { ...EMPTY_DOWNTIME_INPUTS, employeesAffected: 10, loadedHourlyWage: 100 },
      'BRL',
    );
    expect(result.steps.join(' ')).toContain('1,000');
  });

  it('ignores a zero or negative input rather than producing a zero rate', () => {
    const result = suggestDowntimeRate(
      { ...EMPTY_DOWNTIME_INPUTS, annualRevenue: 0, operatingHoursPerYear: 8_760 },
      'BRL',
    );
    expect(result.totalPerHour).toBeNull();
  });
});

describe('totalExposure', () => {
  it('is not-configured when neither rate is set', () => {
    const response = estimateOperationalCost(OBSERVED_OPEN_NS, EMPTY_COST_MODEL, evidence);
    const downtime = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, EMPTY_COST_MODEL, evidence);
    const total = totalExposure(response, downtime, EMPTY_COST_MODEL, evidence);
    expect(total.value).toBeNull();
    expect(total.provenance).toBe('not-configured');
  });

  it('adds response and downtime rather than taking the larger', () => {
    const response = estimateOperationalCost(OBSERVED_OPEN_NS, withDowntime, evidence);
    const downtime = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence);
    const total = totalExposure(response, downtime, withDowntime, evidence);
    expect(total.value).toBeCloseTo((response.value as number) + (downtime.value as number), 0);
  });

  it('says so when only one half is configured', () => {
    const response = estimateOperationalCost(OBSERVED_OPEN_NS, configured, evidence);
    const downtime = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, configured, evidence);
    const total = totalExposure(response, downtime, configured, evidence);
    expect(total.value).toBe(response.value);
    expect(total.note).toContain('partial');
  });

  it('is always an estimate', () => {
    const response = estimateOperationalCost(OBSERVED_OPEN_NS, withDowntime, evidence);
    const downtime = estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence);
    expect(totalExposure(response, downtime, withDowntime, evidence).provenance).toBe('projection');
  });
});

describe('currency is printed exactly once', () => {
  /**
   * A customer reported `brl 20.148.576 brl` on the Problems page against 0.6.0.
   *
   * The cause was a money `Fact` carrying `unit: currencyLabel` while the caller
   * already passed a `formatMoney` display that prefixes the currency. `StatTile`
   * renders both, so the label appeared on either side of the number.
   *
   * The rule: a money fact never carries a currency unit. The formatted display
   * owns the currency.
   */
  const moneyFacts = () => [
    estimateOperationalCost(OBSERVED_OPEN_NS, withDowntime, evidence),
    estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence),
    totalExposure(
      estimateOperationalCost(OBSERVED_OPEN_NS, withDowntime, evidence),
      estimateDowntimeCost(OBSERVED_AVAILABILITY_NS, withDowntime, evidence),
      withDowntime,
      evidence,
    ),
  ];

  it('leaves the currency off every money fact', () => {
    for (const fact of moneyFacts()) {
      expect(fact.unit, String(fact.note)).toBeUndefined();
    }
  });

  it('still names the currency inside the stated arithmetic', () => {
    // Removing the unit must not remove the currency from the explanation.
    for (const fact of moneyFacts()) {
      expect(fact.note).toContain('BRL');
    }
  });

  it('mentions the currency once per amount in a formatted value', () => {
    expect(formatMoney(1234, 'BRL')).toBe('BRL 1,234');
    expect(formatMoney(1234, '')).toBe('1,234');
  });
});
