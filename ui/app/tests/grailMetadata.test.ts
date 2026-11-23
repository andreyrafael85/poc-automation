import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { readQuality } from '../queries/grailMetadata';

/**
 * A result that stopped at its scan ceiling is a floor, not a measurement. Until 3.2.0 the hook
 * looked for `metadata.grail.scanLimitReached`, which the query API never sends, so a truncated
 * read was badged "Observed". These tests feed the shape the SDK actually declares
 * (`notifications`, `sampled`, `scannedBytes`) and check that the outcome and the evidence
 * class follow it.
 */

const metadataWith = (grail: Record<string, unknown>) => ({ grail });

describe('readQuality', () => {
  it('reads a scan-limit notification as a scan-limited result', () => {
    const quality = readQuality(
      metadataWith({ notifications: [{ notificationType: 'SCAN_LIMIT_GBYTES', severity: 'WARN', message: 'x' }] }),
    );
    expect(quality.scanLimited).toBe(true);
    expect(quality.truncated).toBe(false);
    expect(quality.notices).toEqual(['SCAN_LIMIT_GBYTES']);
  });

  it('recognises the condition by its message when the type is spelled differently', () => {
    const quality = readQuality(
      metadataWith({
        notifications: [{ notificationType: 'LIMIT_ADDED', message: 'Your execution was stopped after the scan limit was reached.' }],
      }),
    );
    expect(quality.scanLimited).toBe(true);
  });

  it('reads a result-size notification as truncated rows, not as a scan limit', () => {
    const quality = readQuality(metadataWith({ notifications: [{ notificationType: 'RESULT_TRUNCATED', severity: 'WARN' }] }));
    expect(quality.truncated).toBe(true);
    expect(quality.scanLimited).toBe(false);
  });

  it('keeps sampling and scanned bytes, and stays clean for a plain result', () => {
    expect(readQuality(metadataWith({ sampled: true, scannedBytes: 1234 }))).toMatchObject({
      sampled: true,
      scannedBytes: 1234,
      scanLimited: false,
      truncated: false,
    });
    expect(readQuality(metadataWith({ notifications: [{ notificationType: 'INFO_ONLY', message: 'Fine.' }] }))).toMatchObject({
      scanLimited: false,
      truncated: false,
    });
    expect(readQuality(undefined)).toMatchObject({ scanLimited: false, truncated: false, sampled: false, scannedBytes: null });
  });
});

// ---------------------------------------------------------------------------------------------
// The hook: a notification turns the outcome into `scan-limit` and the badge into "At least".

const hookState = vi.hoisted(() => ({ metadata: {} as unknown }));

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({
    data: { records: [{ total: 10 }], types: [], metadata: hookState.metadata },
    error: null,
    isLoading: false,
    refetch: () => Promise.resolve(undefined),
  }),
}));

vi.mock('@dynatrace-sdk/client-query', () => ({
  isErrorEnvelopeError: () => false,
}));

const scope = {
  globalWindow: {
    startIso: '2026-09-15T11:00:00.000Z',
    endIso: '2026-09-15T12:00:00.000Z',
    label: 'timeframe.now-1h',
    expression: 'now-1h',
  },
  refreshToken: 0,
};

describe('useCatalogQuery and the completeness notifications', () => {
  beforeEach(() => {
    hookState.metadata = {};
  });

  it('badges a scan-limited read "partial", never "observed"', () => {
    hookState.metadata = metadataWith({ notifications: [{ notificationType: 'SCAN_LIMIT_GBYTES', severity: 'WARN' }] });
    const { result } = renderHook(() => useCatalogQuery('log.quality', scope));
    expect(result.current.outcome).toBe('scan-limit');
    expect(result.current.provenance).toBe('partial');
  });

  it('would have missed it with the 3.2.0 field: a result without notifications stays observed', () => {
    // The old check read `scanLimitReached`; the API never sends it, so only notifications count.
    hookState.metadata = metadataWith({});
    const { result } = renderHook(() => useCatalogQuery('log.quality', scope));
    expect(result.current.outcome).toBe('ok');
    expect(result.current.provenance).toBe('observed');
  });

  it('labels a sampled answer as the platform\'s estimate', () => {
    hookState.metadata = metadataWith({ sampled: true });
    const { result } = renderHook(() => useCatalogQuery('log.quality', scope));
    expect(result.current.provenance).toBe('platform-estimate');
    expect(result.current.quality.sampled).toBe(true);
  });
});
