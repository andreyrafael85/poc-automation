import { describe, expect, it } from 'vitest';

import { translate } from '../i18n/strings';

import {
  EMPTY_RATE_CARD,
  buildClassicUnits,
  buildDpsResultSummary,
  localValue,
  rateCardCurrency,
  resultSummaryTotalUsd,
  sizeClassic,
  toLicHosts,
  totalHosts,
  type LicHost,
} from '../models/licensing';

const GIB = 1024 ** 3;

/**
 * The licence sizer turns measured hosts into billing units, and only produces
 * money when a rate card is explicitly enabled.
 */

describe('sizeClassic (Host Units)', () => {
  const hosts: LicHost[] = [
    { count: 1, ramGib: 64, mode: 'full-stack', hostUnitsEach: 4 }, // 64/16 = 4 HU
    { count: 1, ramGib: 8, mode: 'full-stack', hostUnitsEach: 1 }, //  ceil(0.5) → min 1 HU
    { count: 1, ramGib: 128, mode: 'infra', hostUnitsEach: 8 }, //     capped at 1 HU
    { count: 1, ramGib: 32, mode: 'other', hostUnitsEach: 2 }, //      not counted
  ];

  it('applies 16 GiB per Host Unit for full-stack and caps infra at 1', () => {
    const view = sizeClassic(hosts);
    expect(view.fullStackHosts).toBe(2);
    expect(view.fullStackHostUnits).toBe(5); // 4 + 1
    expect(view.infraHosts).toBe(1);
    expect(view.infraHostUnits).toBe(1);
    expect(view.totalHostUnits).toBe(6);
  });

  it('never counts a host without a reported mode', () => {
    const view = sizeClassic([{ count: 5, ramGib: 999, mode: 'other', hostUnitsEach: 63 }]);
    expect(view.totalHostUnits).toBe(0);
  });
});

describe('toLicHosts', () => {
  it('reads count, memory, Host-Unit band and mode from the grouped records', () => {
    const hosts = toLicHosts([
      { hosts: '3', memoryBytes: 48 * GIB, huBucket: 1, monitoringMode: 'FULL_STACK' },
      { hosts: '2', memoryBytes: 8 * GIB, huBucket: 1, monitoringMode: 'INFRASTRUCTURE' },
      { hosts: '60', memoryBytes: 200 * GIB, huBucket: 2, monitoringMode: null },
    ]);
    expect(hosts[0]).toEqual({ count: 3, ramGib: 48, mode: 'full-stack', hostUnitsEach: 1 });
    expect(hosts[1]).toEqual({ count: 2, ramGib: 8, mode: 'infra', hostUnitsEach: 1 });
    expect(hosts[2]).toEqual({ count: 60, ramGib: 200, mode: 'other', hostUnitsEach: 2 });
    expect(totalHosts(hosts)).toBe(65);
  });

  it('is exact for an estate far larger than any row limit, because it sums counts not rows', () => {
    // 12,000 hosts arrive as three rows: a per-host list capped at 1,000 would have sized 1/12 of them.
    const view = sizeClassic(
      toLicHosts([
        { hosts: '9000', memoryBytes: 9000 * 32 * GIB, huBucket: 2, monitoringMode: 'FULL_STACK' },
        { hosts: '2000', memoryBytes: 2000 * 8 * GIB, huBucket: 1, monitoringMode: 'FULL_STACK' },
        { hosts: '1000', memoryBytes: 1000 * 64 * GIB, huBucket: 4, monitoringMode: 'INFRASTRUCTURE' },
      ]),
    );
    expect(view.fullStackHosts).toBe(11000);
    expect(view.fullStackHostUnits).toBe(9000 * 2 + 2000 * 1);
    expect(view.infraHosts).toBe(1000);
    expect(view.infraHostUnits).toBe(1000);
  });
});

describe('DPS Result Summary + public rate card', () => {
  const rows = buildDpsResultSummary({
    fullStackGib: 100, // 100 GiB
    infraHosts: 2,
    k8sPods: 10,
    k8sPodHours: null,
    logGibPerDay: 5,
    sessionsPerDay: 1000,
    syntheticActionsPerDay: null,
    appSecActive: true,
  });

  it('computes annual usage per capability in the estimator layout', () => {
    const fullStack = rows.find((r) => r.id === 'fullstack');
    // 100 GiB × 8760 h = 876,000 memory-GiB-hours/year, at $0.01 → $8,760
    expect(fullStack?.annualUsage).toBe(876000);
    expect(fullStack?.annualUsd).toBeCloseTo(8760, 5);
    const infra = rows.find((r) => r.id === 'infra');
    expect(infra?.annualUsage).toBe(2 * 8760);
    // Synthetic actions were not measurable → dash (null), like the estimator.
    expect(rows.find((r) => r.id === 'synthetic')?.annualUsage).toBeNull();
  });

  it('keeps money out until the rate card is enabled, then converts the USD list price', () => {
    const totalUsd = resultSummaryTotalUsd(rows);
    expect(totalUsd).toBeGreaterThan(0);
    // Disabled → no local value.
    expect(localValue(totalUsd, EMPTY_RATE_CARD)).toBeNull();
    // Enabled with a USD→BRL rate of 5 → USD × 5.
    const rate = { enabled: true, currencyLabel: 'BRL', usdToLocalRate: 5 };
    expect(localValue(totalUsd, rate)).toBeCloseTo(totalUsd * 5, 5);
    // A capability with no measured usage contributes nothing to the total.
    expect(localValue(rows.find((r) => r.id === 'synthetic')!.annualUsd, rate)).toBeNull();
  });

  it('shows USD by default when enabled without a conversion rate', () => {
    const totalUsd = resultSummaryTotalUsd(rows);
    // Enabled, no currency/rate → the estimate is the USD list price itself.
    const usdOnly = { enabled: true, currencyLabel: '', usdToLocalRate: null };
    expect(localValue(totalUsd, usdOnly)).toBe(totalUsd);
    expect(rateCardCurrency(usdOnly)).toBe('USD');
    // Adding a currency + rate switches to the converted currency.
    expect(rateCardCurrency({ enabled: true, currencyLabel: 'BRL', usdToLocalRate: 5 })).toBe('BRL');
    // Disabled always reads USD-none.
    expect(rateCardCurrency(EMPTY_RATE_CARD)).toBe('USD');
  });
});

describe('classic unit drivers', () => {
  const rows = buildClassicUnits({
    totalHostUnits: 10,
    sessionsPerYear: 1000,
    syntheticMonitors: 3,
    logGibPerYear: 120,
    appSecActive: true,
    appSecGibHoursPerYear: 5000,
  });

  it('every driver that is not composed by the page has a dictionary key, translated in Portuguese', () => {
    for (const row of rows.filter((entry) => entry.unit !== 'HU')) {
      expect(row.driverKey, row.driver).not.toBeNull();
      const pt = translate(row.driverKey!, 'pt-BR');
      expect(pt, row.driver).not.toBe(row.driver);
    }
  });

  it('a unit of measure that is a word is translated; a symbol is left alone', () => {
    const sessions = rows.find((entry) => entry.measureUnit === 'sessions');
    expect(translate(sessions!.measureUnitKey!, 'pt-BR')).toBe('sessões');
    const logs = rows.find((entry) => entry.driver === 'Log volume');
    expect(logs?.measureUnitKey).toBeNull();
    expect(logs?.measureUnit).toBe('GiB');
  });
});

describe('sizing when the host query did not answer', () => {
  it('leaves the host-based Result Summary rows unmeasured, never 0', () => {
    const rows = buildDpsResultSummary({
      fullStackGib: null,
      infraHosts: null,
      k8sPods: null,
      k8sPodHours: null,
      logGibPerDay: null,
      sessionsPerDay: null,
      syntheticActionsPerDay: null,
      appSecActive: true,
    });
    for (const id of ['fullstack', 'infra', 'appsec']) {
      expect(rows.find((row) => row.id === id)?.annualUsage, id).toBeNull();
      expect(rows.find((row) => row.id === id)?.annualUsd, id).toBeNull();
    }
  });

  it('keeps a measured zero as a zero', () => {
    const rows = buildDpsResultSummary({
      fullStackGib: 0,
      infraHosts: 0,
      k8sPods: 0,
      k8sPodHours: null,
      logGibPerDay: 0,
      sessionsPerDay: null,
      syntheticActionsPerDay: null,
      appSecActive: false,
    });
    expect(rows.find((row) => row.id === 'fullstack')?.annualUsage).toBe(0);
    expect(rows.find((row) => row.id === 'infra')?.annualUsage).toBe(0);
  });

  it('leaves the Host Units driver unmeasured', () => {
    const rows = buildClassicUnits({
      totalHostUnits: null,
      sessionsPerYear: null,
      syntheticMonitors: null,
      logGibPerYear: null,
      appSecActive: false,
      appSecGibHoursPerYear: null,
    });
    expect(rows.find((row) => row.unit === 'HU')?.value).toBeNull();
  });
});
