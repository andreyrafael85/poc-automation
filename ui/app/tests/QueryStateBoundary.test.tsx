import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { StudioProvider } from '../config/StudioContext';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { getQuery } from '../queries/catalog';
import { CLEAN_QUALITY } from '../queries/grailMetadata';

/**
 * The UI contract this app is built on: a permission failure, an empty result and
 * a truncated result must all look different, and none of them may look like a
 * healthy zero.
 */

function resultFor(outcome: QueryOutcome, overrides: Partial<CatalogQueryResult> = {}): CatalogQueryResult {
  const entry = getQuery('sec.vulnerabilities');
  return {
    entry,
    records: [],
    raw: undefined,
    quality: CLEAN_QUALITY,
    outcome,
    provenance: 'observed',
    evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
    timeframe: {
      startIso: '2026-08-30T12:00:00.000Z',
      endIso: '2026-08-31T12:00:00.000Z',
      label: 'last 24 hours',
      expression: 'now-24h',
    },
    missingScopes: [],
    errorMessage: null,
    isLoading: outcome === 'loading',
    refetch: () => undefined,
    ...overrides,
  };
}

const renderBoundary = (result: CatalogQueryResult, children = <div>PAYLOAD</div>) =>
  render(
    <AppRoot>
      <StudioProvider>
        <QueryStateBoundary result={result}>{children}</QueryStateBoundary>
      </StudioProvider>
    </AppRoot>,
  );

describe('QueryStateBoundary', () => {
  it('renders children only when the query returned usable records', () => {
    renderBoundary(resultFor('ok', { records: [{ a: 1 }] }));
    expect(screen.getByText('PAYLOAD')).toBeInTheDocument();
  });

  it('shows a loading state and withholds the payload', () => {
    renderBoundary(resultFor('loading'));
    expect(screen.queryByText('PAYLOAD')).not.toBeInTheDocument();
    expect(screen.getByText(/Querying/)).toBeInTheDocument();
  });

  it('names the exact missing scope on a permission failure', () => {
    renderBoundary(
      resultFor('no-permission', { missingScopes: ['storage:security.events:read'] }),
    );
    expect(screen.getByText(/Insufficient permission/)).toBeInTheDocument();
    expect(screen.getByText('storage:security.events:read')).toBeInTheDocument();
  });

  it('states explicitly that a permission failure is not evidence of no findings', () => {
    renderBoundary(resultFor('no-permission', { missingScopes: ['storage:security.events:read'] }));
    expect(screen.getByText(/not evidence that the environment is free of findings/)).toBeInTheDocument();
  });

  it('does not render the payload when permission is denied', () => {
    renderBoundary(resultFor('no-permission', { missingScopes: ['x:y:read'] }));
    expect(screen.queryByText('PAYLOAD')).not.toBeInTheDocument();
  });

  it('distinguishes an empty result from a permission failure', () => {
    renderBoundary(resultFor('empty'));
    expect(screen.getByText(/No data available in the current PoC scope/)).toBeInTheDocument();
    expect(screen.queryByText(/Insufficient permission/)).not.toBeInTheDocument();
  });

  it('titles an empty or denied state as an h2, so it does not skip a level under the page h1', () => {
    for (const result of [resultFor('empty'), resultFor('no-permission', { missingScopes: ['x:y:read'] })]) {
      const { unmount } = renderBoundary(result);
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
      expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('says an empty result implies nothing about health', () => {
    renderBoundary(resultFor('empty'));
    expect(screen.getByText(/says nothing about whether the underlying capability is healthy/)).toBeInTheDocument();
  });

  it('renders a page-specific empty message when supplied', () => {
    render(
      <AppRoot>
        <StudioProvider>
          <QueryStateBoundary result={resultFor('empty')} emptyMessage="Nothing in this namespace.">
            <div>PAYLOAD</div>
          </QueryStateBoundary>
        </StudioProvider>
      </AppRoot>,
    );
    expect(screen.getByText('Nothing in this namespace.')).toBeInTheDocument();
  });

  it('shows the payload alongside a warning when the scan limit was reached', () => {
    renderBoundary(resultFor('scan-limit', { records: [{ a: 1 }] }));
    expect(screen.getByText('PAYLOAD')).toBeInTheDocument();
    expect(screen.getByText(/Partial result: scan limit reached/)).toBeInTheDocument();
  });

  it('surfaces the platform error message and offers a retry', () => {
    renderBoundary(resultFor('error', { errorMessage: 'Gateway timeout while fetching' }));
    expect(screen.getByText('Gateway timeout while fetching')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    expect(screen.queryByText('PAYLOAD')).not.toBeInTheDocument();
  });

  it('always names the query id, so any state is traceable', () => {
    for (const outcome of ['no-permission', 'empty', 'error'] as const) {
      const { unmount } = renderBoundary(
        resultFor(outcome, { missingScopes: ['x:y:read'], errorMessage: 'boom' }),
      );
      expect(screen.getByText(/sec\.vulnerabilities/), outcome).toBeInTheDocument();
      unmount();
    }
  });
});
