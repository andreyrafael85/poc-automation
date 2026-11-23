import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression guard for the bug that made every section load forever.
 *
 * `useDql` derives its cache key from the request it is given. The first version
 * of `useCatalogQuery` converted `now-24h` into absolute timestamps *during
 * render*, so every render produced a different `defaultTimeframeStart` /
 * `defaultTimeframeEnd` pair. That changed the cache key, which triggered a
 * refetch, which caused another render — a loop that never left the loading
 * state and never displayed data.
 *
 * The fix resolves the window once and passes it down as a stable value. These
 * tests assert that property directly, because it is invisible in a type check
 * and easy to reintroduce.
 */

const useDqlSpy = vi.fn<(params: unknown, options: unknown) => void>();

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: (params: unknown, options: unknown) => {
    useDqlSpy(params, options);
    return {
      data: undefined,
      error: null,
      isLoading: true,
      state: 'RUNNING',
      progress: 0,
      cancel: () => Promise.resolve(undefined),
      refetch: () => Promise.resolve(undefined),
      forceRefetch: () => Promise.resolve(undefined),
      isPending: true,
      isSuccess: false,
      isError: false,
      isLoadingError: false,
      isFetching: true,
      isRefetchError: false,
      isFetched: false,
      isStale: false,
      isPlaceholderData: false,
      _getQueryKey: () => [],
    };
  },
}));

vi.mock('@dynatrace-sdk/client-query', () => ({
  isErrorEnvelopeError: () => false,
}));

const { StudioProvider, useStudio, useQueryScope } = await import('../config/StudioContext');
const { useCatalogQuery } = await import('../hooks/useCatalogQuery');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StudioProvider>{children}</StudioProvider>
);

beforeEach(() => {
  useDqlSpy.mockClear();
});

describe('resolved window stability', () => {
  it('returns the same window object across re-renders', () => {
    const { result, rerender } = renderHook(() => useStudio(), { wrapper });

    const first = result.current.resolvedTimeframe;
    rerender();
    rerender();
    rerender();

    // Referential equality, not just value equality: the cache key depends on it.
    expect(result.current.resolvedTimeframe).toBe(first);
  });

  it('resolves to absolute ISO timestamps rather than a relative expression', () => {
    const { result } = renderHook(() => useStudio(), { wrapper });
    const { startIso, endIso } = result.current.resolvedTimeframe;

    expect(startIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(endIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(startIso).getTime()).toBeLessThan(new Date(endIso).getTime());
  });

  it('produces a new window only when refresh is called', () => {
    const { result } = renderHook(() => useStudio(), { wrapper });
    const before = result.current.resolvedTimeframe;

    act(() => {
      result.current.refresh();
    });

    expect(result.current.resolvedTimeframe).not.toBe(before);
    expect(result.current.refreshToken).toBe(1);
  });

  it('produces a new window when the preset changes', () => {
    const { result } = renderHook(() => useStudio(), { wrapper });
    const before = result.current.resolvedTimeframe;

    act(() => {
      result.current.setTimeframe('now-7d');
    });

    expect(result.current.resolvedTimeframe).not.toBe(before);
    expect(result.current.timeframeLabel).toBe('timeframe.now-7d');
  });

  it('ignores a timeframe that is not one of the presets', () => {
    const { result } = renderHook(() => useStudio(), { wrapper });

    act(() => {
      result.current.setTimeframe('now-365d');
    });

    // An unbounded window must not be reachable by accident.
    expect(result.current.timeframe).toBe('now-24h');
  });
});

describe('useCatalogQuery request stability', () => {
  it('passes an identical request object to useDql on every re-render', () => {
    const { rerender } = renderHook(
      () => {
        const scope = useQueryScope();
        return useCatalogQuery('cov.inventory', scope);
      },
      { wrapper },
    );

    rerender();
    rerender();

    expect(useDqlSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    const firstRequest = useDqlSpy.mock.calls[0]?.[0];
    for (const call of useDqlSpy.mock.calls) {
      // If this fails, the query cache key changes every render and the app
      // refetches forever.
      expect(call[0]).toBe(firstRequest);
    }
  });

  it('sends the timeframe as request fields, never inside the query text', () => {
    renderHook(
      () => {
        const scope = useQueryScope();
        return useCatalogQuery('cov.inventory', scope);
      },
      { wrapper },
    );

    const request = useDqlSpy.mock.calls[0]?.[0] as {
      query: string;
      defaultTimeframeStart: string;
      defaultTimeframeEnd: string;
    };

    expect(request.defaultTimeframeStart).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(request.defaultTimeframeEnd).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(request.query).not.toContain('now-');
    expect(request.query).not.toContain(request.defaultTimeframeStart);
  });

  it('keeps a pinned window stable too', () => {
    const { rerender } = renderHook(
      () => {
        const scope = useQueryScope();
        // prob.summary is pinned to 7 days regardless of the global selector.
        return useCatalogQuery('prob.summary', scope);
      },
      { wrapper },
    );

    rerender();
    rerender();

    const firstRequest = useDqlSpy.mock.calls[0]?.[0];
    for (const call of useDqlSpy.mock.calls) {
      expect(call[0]).toBe(firstRequest);
    }
  });

  it('applies the entry scan ceiling as a request guard', () => {
    renderHook(
      () => {
        const scope = useQueryScope();
        return useCatalogQuery('prob.summary', scope);
      },
      { wrapper },
    );

    const request = useDqlSpy.mock.calls[0]?.[0] as { defaultScanLimitGbytes?: number };
    expect(request.defaultScanLimitGbytes).toBe(25);
  });

  it('returns a stable evidence reference across re-renders', () => {
    const { result, rerender } = renderHook(
      () => {
        const scope = useQueryScope();
        return useCatalogQuery('cov.inventory', scope);
      },
      { wrapper },
    );

    const first = result.current.evidence;
    rerender();
    expect(result.current.evidence).toBe(first);
  });
});
