import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioProvider, useStudio } from '../config/StudioContext';
import { IncidentSpotlight } from '../features/executive/IncidentSpotlight';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { translate, type StringKey } from '../i18n/strings';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';

/**
 * 3.2.7 final review — the remaining visible defects of the "pages" share. Each case below fails
 * on the code before its fix.
 */

// ------------------------------------------------------------------ mocks

const DAVIS_DETECTED: GrailRecord = {
  displayId: 'P-26086733',
  name: 'Response time degradation',
  category: 'SLOWDOWN',
  status: 'CLOSED',
  rootCauseName: 'easyTradeManager',
  rootCauseId: 'SERVICE-C44033DE8492CF45',
  eventId: '-1234567890123456789_1727000000000',
  start: '2026-09-14T10:00:00.000Z',
  end: '2026-09-14T11:00:00.000Z',
  durationNs: 3_600_000_000_000,
  affectedNames: ['easyTradeManager', 'easyTradeLoginService', 'frontend'],
  affectedIds: ['SERVICE-C44033DE8492CF45'],
  affectedCount: 3,
};

/** A problem a user-written alerting rule raised: `rca.top` ranks it first when it is the one root-caused. */
const CUSTOM_ALERT: GrailRecord = { ...DAVIS_DETECTED, displayId: 'P-26090001', name: 'Order queue above 500', category: 'CUSTOM_ALERT' };

let rcaTop: GrailRecord[] = [DAVIS_DETECTED];

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId): CatalogQueryResult => {
    const entry = getQuery(id);
    const records = id === 'rca.top' ? rcaTop : [];
    const outcome: QueryOutcome = records.length > 0 ? 'ok' : 'empty';
    return {
      entry,
      records,
      raw: undefined,
      quality: CLEAN_QUALITY,
      outcome,
      provenance: outcome === 'ok' ? 'observed' : 'no-telemetry',
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 15 days' },
      timeframe: { startIso: '2026-09-01T00:00:00.000Z', endIso: '2026-09-15T00:00:00.000Z', label: 'last 15 days', expression: 'now-15d' },
      missingScopes: [],
      errorMessage: null,
      isLoading: false,
      refetch: () => undefined,
    };
  },
}));

// The trail's callers query: answered, with no callers (the lead does not depend on it).
vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({ data: { records: [] }, error: undefined, isLoading: false }),
}));

afterEach(() => {
  rcaTop = [DAVIS_DETECTED];
});

const en = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);
const pt = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'pt-BR', params);

const InLocale = ({ locale, children }: { locale: 'en' | 'pt-BR'; children: React.ReactNode }) => {
  const { setLocale } = useStudio();
  useEffect(() => setLocale(locale), [locale, setLocale]);
  return <>{children}</>;
};

const renderSpotlight = (locale: 'en' | 'pt-BR' = 'en') =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>
          <InLocale locale={locale}>
            <IncidentSpotlight />
          </InLocale>
        </StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

const lead = (container: HTMLElement) => container.querySelector('.pvs-lead')?.textContent ?? '';

// ------------------------------------------------------------------ P1

describe('the Executive spotlight says "no alerting rule written" only when no rule raised the incident (P1)', () => {
  it('keeps the Davis lead for a problem Davis detected by itself', () => {
    const { container } = renderSpotlight();
    expect(lead(container)).toBe(en('exec3.spot.lead', { name: 'Response time degradation', root: 'easyTradeManager', count: '3' }));
    expect(lead(container)).toContain('no alerting rule written');
  });

  it('drops the clause for a CUSTOM_ALERT problem, with and without a root cause', () => {
    rcaTop = [CUSTOM_ALERT];
    const first = renderSpotlight();
    expect(lead(first.container)).toBe(en('exec3.spot.leadCustom', { name: 'Order queue above 500', root: 'easyTradeManager', count: '3' }));
    expect(lead(first.container)).not.toMatch(/alerting rule/i);
    first.unmount();

    rcaTop = [{ ...CUSTOM_ALERT, rootCauseName: null, rootCauseId: null }];
    const second = renderSpotlight();
    expect(lead(second.container)).toBe(en('exec3.spot.leadCustomNoRoot', { name: 'Order queue above 500', count: '3' }));
    expect(lead(second.container)).not.toMatch(/alerting rule/i);
    second.unmount();

    // The category is matched as Grail writes it, and in any case.
    rcaTop = [{ ...CUSTOM_ALERT, category: 'custom_alert' }];
    const third = renderSpotlight();
    expect(lead(third.container)).not.toMatch(/alerting rule/i);
  });

  it('keeps the no-root Davis lead for a Davis problem without a root cause', () => {
    rcaTop = [{ ...DAVIS_DETECTED, rootCauseName: null, rootCauseId: null }];
    const { container } = renderSpotlight();
    expect(lead(container)).toBe(en('exec3.spot.leadNoRoot', { name: 'Response time degradation', count: '3' }));
  });

  it('says the same in pt-BR: no "regra de alerta" for a custom alert, kept for a Davis detection', async () => {
    rcaTop = [CUSTOM_ALERT];
    const custom = renderSpotlight('pt-BR');
    await waitFor(() => expect(screen.getByText(pt('exec3.spot.title'))).toBeTruthy());
    expect(lead(custom.container)).toBe(pt('exec3.spot.leadCustom', { name: 'Order queue above 500', root: 'easyTradeManager', count: '3' }));
    expect(lead(custom.container)).not.toMatch(/regra de alerta/i);
    custom.unmount();

    rcaTop = [DAVIS_DETECTED];
    const davis = renderSpotlight('pt-BR');
    await waitFor(() => expect(screen.getByText(pt('exec3.spot.title'))).toBeTruthy());
    expect(lead(davis.container)).toContain('sem regra de alerta escrita');
  });

  it('words the custom-alert leads in both languages without the clause', () => {
    for (const key of ['exec3.spot.leadCustom', 'exec3.spot.leadCustomNoRoot'] as const) {
      expect(en(key, { name: 'x', root: 'y', count: '1' })).not.toMatch(/alerting rule/i);
      expect(pt(key, { name: 'x', root: 'y', count: '1' })).not.toMatch(/regra de alerta/i);
      expect(pt(key, { name: 'x', root: 'y', count: '1' })).not.toBe(en(key, { name: 'x', root: 'y', count: '1' }));
    }
  });
});

// ------------------------------------------------------------------ P2 / P3 (layout, verified in the harness)

const APP = join(__dirname, '..');
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the layout fixes stay in place (P2, P3)', () => {
  it('caps a bar reading at its row, so a long one wraps instead of widening the page on a phone (P2)', () => {
    const css = stripComments(readFileSync(join(APP, 'engine/viz.css'), 'utf8'));
    const rule = /\.pvs-bars__value\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/max-width:\s*100%/);
    // The line it sits on still wraps, so the reading moves under the name first.
    expect(/\.pvs-bars__line\s*\{([^}]*)\}/.exec(css)?.[1] ?? '').toMatch(/flex-wrap:\s*wrap/);
  });

  it('wraps the Licensing usage tables, so no category, capability or volume ends in an ellipsis (P3)', () => {
    const tsx = readFileSync(join(APP, 'pages/Licensing.tsx'), 'utf8');
    for (const columns of ['dpsColumns', 'classicColumns', 'dpsPricedColumns']) {
      const table = new RegExp(`<DataTable\\b[^>]*columns=\\{${columns}\\}[^>]*>`).exec(tsx)?.[0] ?? '';
      expect(table, columns).not.toBe('');
      expect(table, columns).toMatch(/\blineWrap\b/);
    }
  });
});
