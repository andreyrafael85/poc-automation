import React, { useSyncExternalStore } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioProvider } from '../config/StudioContext';
import { HoursBreakdown } from '../features/value/HoursBreakdown';
import { CaptureStage, buildCaptureTargets, type CaptureOutcome } from '../features/wrapup/captures';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { translate, type StringKey } from '../i18n/strings';
import { problemHours } from '../models/problemHours';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';

/**
 * 3.2.7 regression review: two defects the 3.2.7 changes brought into pages that 3.2.6 had right.
 * Each case below fails on the code before its fix.
 */

// ------------------------------------------------------------------ mocks

const DATABASE_ROOT: GrailRecord = {
  displayId: 'P-260914359',
  name: 'Failure rate increase',
  category: 'ERROR',
  status: 'CLOSED',
  rootCauseName: 'TradeManagement',
  rootCauseId: 'SERVICE-E1990917A56EB6C5',
  eventId: '-1234567890123456789_1727000000000',
  start: '2026-09-14T10:00:00.000Z',
  end: '2026-09-14T11:00:00.000Z',
  durationNs: 3_600_000_000_000,
  affectedNames: ['easyTradeManager'],
  affectedIds: ['SERVICE-C44033DE8492CF45'],
  affectedCount: 1,
};

let rcaTop: GrailRecord[] = [DATABASE_ROOT];

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId): CatalogQueryResult => {
    const entry = getQuery(id);
    // TD-08 (3.3.2): the trail's callers read through the catalog (`rca.callers`); they answer when the test says so.
    const callers = useSyncExternalStore(
      (listener) => {
        callersQuery.listeners.add(listener);
        return () => callersQuery.listeners.delete(listener);
      },
      () => callersQuery.state,
    );
    if (id === 'rca.callers') {
      const rows = (callers.data as { records?: GrailRecord[] } | undefined)?.records ?? [];
      const pending: QueryOutcome = callers.isLoading ? 'loading' : rows.length > 0 ? 'ok' : 'empty';
      return {
        entry,
        records: rows,
        raw: callers.data as CatalogQueryResult['raw'],
        quality: CLEAN_QUALITY,
        outcome: pending,
        provenance: pending === 'ok' ? 'observed' : pending === 'loading' ? 'loading' : 'no-telemetry',
        evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
        timeframe: { startIso: '2026-10-04T00:00:00.000Z', endIso: '2026-10-05T00:00:00.000Z', label: 'last 24 hours', expression: 'now-24h' },
        missingScopes: [],
        errorMessage: null,
        isLoading: callers.isLoading,
        refetch: () => undefined,
      };
    }
    const records = id === 'rca.top' ? rcaTop : [];
    const outcome: QueryOutcome = records.length > 0 ? 'ok' : 'empty';
    return {
      entry,
      records,
      raw: undefined,
      quality: CLEAN_QUALITY,
      outcome,
      provenance: outcome === 'ok' ? 'observed' : 'no-telemetry',
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
      timeframe: { startIso: '2026-10-04T00:00:00.000Z', endIso: '2026-10-05T00:00:00.000Z', label: 'last 24 hours', expression: 'now-24h' },
      missingScopes: [],
      errorMessage: null,
      isLoading: false,
      refetch: () => undefined,
    };
  },
}));

/** The trail's callers query (`useRootCallers`): pending until the test answers it. */
const callersQuery = {
  state: { data: undefined, error: undefined, isLoading: true } as { data: unknown; error: undefined; isLoading: boolean },
  listeners: new Set<() => void>(),
  hold() {
    this.state = { data: undefined, error: undefined, isLoading: true };
  },
  answer() {
    this.state = {
      data: {
        records: [
          { id: 'SERVICE-C44033DE8492CF45', name: 'easyTradeManager', requests: 5979, failures: 341, rootType: 'DATABASE_SERVICE' },
          { id: 'SERVICE-735D88A54ACBBC95', name: 'easyTradeLoginService', requests: 413, failures: 14, rootType: 'DATABASE_SERVICE' },
        ],
      },
      error: undefined,
      isLoading: false,
    };
    this.listeners.forEach((listener) => listener());
  },
};

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () =>
    useSyncExternalStore(
      (listener) => {
        callersQuery.listeners.add(listener);
        return () => callersQuery.listeners.delete(listener);
      },
      () => callersQuery.state,
    ),
}));

const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);
const fmt = { compact: String, decimal: (value: number) => String(value), binTime: String, tick: () => String } as never;

afterEach(() => {
  rcaTop = [DATABASE_ROOT];
  callersQuery.hold();
});

// ------------------------------------------------------------------ REG-1

/** `prob.mttx` as the lab tenant answered it on 2026-10-06 (7 days, closed problems; mttrNs = avg, totalNs = sum). */
const LAB_TENANT = [
  { 'event.category': 'ERROR', problems: 1703, mttrNs: 28482148932472, totalNs: 48505099632000000 },
  { 'event.category': 'RESOURCE_CONTENTION', problems: 446, mttrNs: 78618826858744, totalNs: 35063996779000000 },
  { 'event.category': 'AVAILABILITY', problems: 184, mttrNs: 17547882777173, totalNs: 3228810431000000 },
  { 'event.category': 'SLOWDOWN', problems: 154, mttrNs: 3748734590909, totalNs: 577305127000000 },
];

const HOUR_NS = 3_600_000_000_000;

const mathLines = (records: GrailRecord[]): string[] => {
  const { container } = render(
    <MemoryRouter>
      <StudioProvider>
        <HoursBreakdown rows={problemHours(records)} />
      </StudioProvider>
    </MemoryRouter>,
  );
  return [...container.querySelectorAll('.pvs-hours__math')].map((element) => element.textContent ?? '');
};

/**
 * count × mean, as printed, against the total as printed, in hours; and how far apart rounding
 * alone can put them: half the mean's last digit on every problem, plus half the total's.
 */
const checkOut = (line: string) => {
  const match = /^([\d,]+) problems × ([\d.,]+) (h|min) on average ≈ ([\d.,]+) (h|min)$/.exec(line);
  if (match === null) return null;
  const [, count = '', mean = '', meanUnit = 'h', total = '', totalUnit = 'h'] = match;
  const read = (value: string, unit: string) => Number(value.replace(/,/g, '')) / (unit === 'min' ? 60 : 1);
  const halfDigit = (value: string, unit: string) => (0.5 * 10 ** -(value.split('.')[1] ?? '').length) / (unit === 'min' ? 60 : 1);
  const problems = Number(count.replace(/,/g, ''));
  return {
    gap: Math.abs(problems * read(mean, meanUnit) - read(total, totalUnit)),
    rounding: problems * halfDigit(mean, meanUnit) + halfDigit(total, totalUnit),
  };
};

describe('the problem hours, explained: problems × mean ≈ hours checks out (REG-1)', () => {
  it('prints the mean precise enough that the product lands on the total, on the tenant\'s real answer', () => {
    const lines = mathLines(LAB_TENANT);
    expect(lines).toEqual([
      '1,703 problems × 7.91 h on average ≈ 13,474 h',
      '446 problems × 21.84 h on average ≈ 9,740 h',
      '184 problems × 4.87 h on average ≈ 897 h',
      '154 problems × 1.04 h on average ≈ 160 h',
    ]);
    for (const line of lines) {
      const sum = checkOut(line);
      expect(sum, line).not.toBeNull();
      // Within rounding of what is printed; with the mean at 1 decimal (3.2.7 as built) ERROR was 20 h off.
      expect(sum?.gap ?? Infinity, line).toBeLessThanOrEqual(sum?.rounding ?? 0);
    }
  });

  it('gives a mean under an hour in minutes, and the harness figures multiply out exactly', () => {
    const lines = mathLines([
      { 'event.category': 'ERROR', problems: 2480, mttrNs: 11.5 * HOUR_NS, totalNs: 2480 * 11.5 * HOUR_NS },
      { 'event.category': 'SLOWDOWN', problems: 540, mttrNs: (55 / 60) * HOUR_NS, totalNs: 540 * (55 / 60) * HOUR_NS },
    ]);
    expect(lines).toEqual(['2,480 problems × 11.50 h on average ≈ 28,520 h', '540 problems × 55.0 min on average ≈ 495 h']);
    for (const line of lines) expect(checkOut(line)?.gap ?? Infinity, line).toBeLessThan(1e-9);
  });
});

// ------------------------------------------------------------------ REG-2

const captureRca = (seen: string[]) => {
  const onDone = vi.fn<(outcome: CaptureOutcome) => void>();
  const view = render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>
          <CaptureStage
            targets={buildCaptureTargets(t, fmt).filter((target) => target.sectionId === 'rca')}
            onDone={onDone}
            photographer={(node) => {
              seen.push(node.textContent ?? '');
              return Promise.resolve('data:image/png;base64,AAAA');
            }}
            settleMs={50}
            timeoutMs={8000}
          />
        </StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );
  return { onDone, ...view };
};

describe('the deck photographs the root-cause trail only once its callers have answered (REG-2)', () => {
  it('waits for the callers of a database root, then draws it as a database with the services calling it', async () => {
    const seen: string[] = [];
    const { onDone } = captureRca(seen);
    // Well past the stage's quiet window: with the callers still out, nothing is photographed.
    await act(() => new Promise((resolve) => setTimeout(resolve, 900)));
    expect(seen).toEqual([]);
    expect(onDone).not.toHaveBeenCalled();

    await act(async () => {
      callersQuery.answer();
      await Promise.resolve();
    });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(Object.keys(onDone.mock.calls[0]?.[0]?.captures ?? {})).toEqual(['rca.trail']);
    const photographed = seen[0] ?? '';
    expect(photographed).toContain('Database');
    expect(photographed).toContain('Who calls TradeManagement');
    expect(photographed).toContain('easyTradeManager');
  });

  it('does not wait on a root that is not a service: there is no callers query to wait for', async () => {
    rcaTop = [{ ...DATABASE_ROOT, rootCauseName: 'host-eu-03', rootCauseId: 'HOST-C44033DE8492CF45' }];
    const seen: string[] = [];
    const { onDone } = captureRca(seen);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(Object.keys(onDone.mock.calls[0]?.[0]?.captures ?? {})).toEqual(['rca.trail']);
    expect(seen[0]).toContain('host-eu-03');
  });
});
