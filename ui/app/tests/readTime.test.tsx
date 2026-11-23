import React from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * "Read at HH:MM" must be the moment the app received the result — not the end of the analysis
 * window, and not the time of the latest render.
 */

let current: { records: unknown[]; metadata: object } | undefined;

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({
    data: current,
    error: null,
    isLoading: current === undefined,
    refetch: () => Promise.resolve(undefined),
  }),
}));

vi.mock('@dynatrace-sdk/client-query', () => ({
  isErrorEnvelopeError: () => false,
}));

const { StudioProvider, useQueryScope } = await import('../config/StudioContext');
const { useCatalogQuery } = await import('../hooks/useCatalogQuery');

const wrapper = ({ children }: { children: React.ReactNode }) => <StudioProvider>{children}</StudioProvider>;
const hook = () => renderHook(() => useCatalogQuery('cov.inventory', useQueryScope()), { wrapper });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T10:02:00Z'));
  current = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the time a result was read', () => {
  it('has none while the query is still running', () => {
    const { result } = hook();
    expect(result.current.evidence.collectedAt).toBeUndefined();
  });

  it('is when the result was first seen, and does not move when the page renders again', () => {
    current = { records: [{ a: 1 }], metadata: {} };
    const { result, rerender } = hook();
    expect(result.current.evidence.collectedAt).toBe('2026-10-04T10:02:00.000Z');

    vi.setSystemTime(new Date('2026-10-04T10:30:00Z'));
    rerender();
    expect(result.current.evidence.collectedAt).toBe('2026-10-04T10:02:00.000Z');
  });

  it('moves forward when a new result arrives', () => {
    current = { records: [{ a: 1 }], metadata: {} };
    const { result, rerender } = hook();
    vi.setSystemTime(new Date('2026-10-04T10:30:00Z'));
    current = { records: [{ a: 2 }], metadata: {} };
    rerender();
    expect(result.current.evidence.collectedAt).toBe('2026-10-04T10:30:00.000Z');
  });

  it('is not the end of the analysis window, which was fixed when the page opened', () => {
    const { result, rerender } = hook();
    const windowEnd = result.current.timeframe.endIso;

    vi.setSystemTime(new Date('2026-10-04T10:09:00Z'));
    current = { records: [{ a: 1 }], metadata: {} };
    rerender();

    expect(result.current.timeframe.endIso).toBe(windowEnd);
    expect(result.current.evidence.collectedAt).toBe('2026-10-04T10:09:00.000Z');
    expect(result.current.evidence.collectedAt).not.toBe(windowEnd);
  });
});
