import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { StudioProvider } from '../config/StudioContext';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { missingFact, useSummaryFact } from '../hooks/useSummaryFact';
import { isUnavailable } from '../models/provenance';

/**
 * A query that has not answered, or has failed, knows nothing — which is not the same
 * statement as "the environment has no telemetry", "this is not configured" or "this
 * is a count of zero". 2.x collapsed all of them into "No telemetry" / "Not configured"
 * and badged the section "Observed" while a query was still running.
 */

const evidence = { queryId: 'cov.inventory', source: 'entities', timeframe: 'timeframe.now-24h' };

const result = (outcome: QueryOutcome): CatalogQueryResult =>
  ({
    outcome,
    evidence,
    entry: { id: 'cov.inventory', requiredScope: 'storage:entities:read' },
  }) as unknown as CatalogQueryResult;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppRoot>
    <StudioProvider>{children}</StudioProvider>
  </AppRoot>
);

describe('missingFact', () => {
  it.each<[QueryOutcome, string]>([
    ['loading', 'loading'],
    ['error', 'failed'],
    ['no-permission', 'no-permission'],
    ['empty', 'no-telemetry'],
    ['ok', 'no-telemetry'],
  ])('reads a %s query as %s', (outcome, expected) => {
    expect(missingFact(result(outcome)).provenance).toBe(expected);
  });

  it('uses the caller\'s fallback only when the source answered and the value is absent', () => {
    expect(missingFact(result('empty'), 'not-configured').provenance).toBe('not-configured');
    // A running or failed query is never "not configured", whatever the caller prefers.
    expect(missingFact(result('loading'), 'not-configured').provenance).toBe('loading');
    expect(missingFact(result('error'), 'not-configured').provenance).toBe('failed');
  });

  it('always yields an unavailable fact with no value, never a zero', () => {
    for (const outcome of ['loading', 'error', 'no-permission', 'empty'] as const) {
      const fact = missingFact(result(outcome));
      expect(fact.value).toBeNull();
      expect(isUnavailable(fact)).toBe(true);
      expect(fact.evidence?.queryId).toBe('cov.inventory');
    }
  });
});

describe('useSummaryFact', () => {
  const factFor = (outcome: QueryOutcome, value: number | null) => {
    const { result: hook } = renderHook(() => useSummaryFact(), { wrapper });
    return hook.current(result(outcome), value);
  };

  it('says "loading", not "no telemetry", while the query runs', () => {
    expect(factFor('loading', null).provenance).toBe('loading');
  });

  it('says "failed", not "not configured", when the query failed', () => {
    expect(factFor('error', null).provenance).toBe('failed');
  });

  it('keeps naming the missing scope on a refusal', () => {
    const fact = factFor('no-permission', null);
    expect(fact.provenance).toBe('no-permission');
    expect(JSON.stringify(fact)).toContain('storage:entities:read');
  });

  it('keeps a measured zero as a measurement', () => {
    const fact = factFor('ok', 0);
    expect(fact.provenance).toBe('observed');
    expect(fact.value).toBe(0);
  });

  it('shows what a scan-limited query did return, labelled as an estimate with its reason', () => {
    const fact = factFor('scan-limit', 42);
    expect(fact.provenance).toBe('partial');
    expect(fact.value).toBe(42);
    expect(fact.note).toMatch(/scan limit/i);
  });

  it('has nothing to show for a scan-limited query that returned no value', () => {
    expect(isUnavailable(factFor('scan-limit', null))).toBe(true);
  });
});
