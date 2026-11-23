import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { KpiTile } from '../components/KpiTile';
import { PageSummary } from '../components/PageSummary';
import { StudioProvider } from '../config/StudioContext';
import { observed, unavailable } from '../models/provenance';

/**
 * The contract of the two components that carry a headline number.
 *
 * Context: a customer reported against 0.5.0 that the Overview tiles showed a
 * label, a provenance badge and a query footer but no figure — *"Hosts /
 * Observado / cov.inventory — mas quantos hosts?"*. The cause was `SingleValue`,
 * whose height defaults to `100%` and resolves to zero inside a column flex
 * container, so the chart drew an empty SVG.
 *
 * ## What these tests do and do not prove
 *
 * They do **not** catch that bug. Reintroducing `SingleValue` here leaves all of
 * them green, because jsdom performs no layout: the text is in the DOM either
 * way, and a zero-height container is a rendering outcome jsdom cannot model.
 * That was checked rather than assumed.
 *
 * The layout defect is caught statically instead, by the `height` rule in
 * `scripts/scan-chart-consistency.mjs` — verified by reintroducing the bug and
 * watching the scanner fail.
 *
 * What these tests do guard is the provenance contract, which is the part a
 * refactor is most likely to break: a measured zero renders as `0`, an
 * unmeasured value renders a dash and its reason, and the query id stays
 * visible next to the figure.
 */

const evidence = { queryId: 'cov.inventory', source: 'entities', timeframe: 'last 24 hours' };

// Strato components read from an `IntlProvider` that `AppRoot` installs, and
// these tiles read the locale from `StudioProvider`. Both are required.
const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

describe('KpiTile', () => {
  it('renders the measured number, not just its label and provenance', () => {
    wrap(<KpiTile label="Hosts" fact={observed(63, evidence)} display="63" />);
    expect(screen.getByText('63')).toBeTruthy();
    expect(screen.getByText('Hosts')).toBeTruthy();
  });

  it('renders a measured zero as a zero, not as a dash', () => {
    // Zero hosts of a category is a finding. It is not a missing measurement.
    wrap(<KpiTile label="Mobile applications" fact={observed(0, evidence)} display="0" />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders a dash and the reason when the value was never measured', () => {
    wrap(
      <KpiTile
        label="Security findings"
        fact={unavailable('no-permission', 'Requires storage:security.events:read.', evidence)}
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('Requires storage:security.events:read.')).toBeTruthy();
  });

  it('shows the secondary detail line when one is supplied', () => {
    wrap(
      <KpiTile
        label="Problems open"
        fact={observed(114, evidence)}
        display="114"
        detail="of 3,379 in the window"
      />,
    );
    expect(screen.getByText('of 3,379 in the window')).toBeTruthy();
  });

  it('still discloses the query behind the figure', () => {
    // The number being visible must not come at the cost of traceability.
    wrap(<KpiTile label="Hosts" fact={observed(63, evidence)} display="63" />);
    expect(screen.getByText(/cov\.inventory/)).toBeTruthy();
  });
});

describe('PageSummary', () => {
  it('renders every figure in the band', () => {
    wrap(
      <PageSummary
        items={[
          { key: 'a', label: 'Requests', fact: observed(3918313, evidence), display: '3,918,313' },
          { key: 'b', label: 'Failures', fact: observed(19776, evidence), display: '19,776' },
          { key: 'c', label: 'Failure rate', fact: observed(0.5, evidence), display: '0.50%' },
        ]}
      />,
    );
    // 3.5.0: each figure is the platform's SingleValue on screen (and the same text on paper).
    const shown = [...document.querySelectorAll('[data-testid="single-value-chart-value"]')].map((node) => node.textContent);
    expect(shown).toEqual(expect.arrayContaining(['3,918,313', '19,776', '0.50%']));
  });

  it('renders nothing at all rather than an empty band', () => {
    const { container } = wrap(<PageSummary items={[]} />);
    expect(container.textContent).toBe('');
  });

  it('marks an unmeasured figure instead of showing a zero', () => {
    wrap(
      <PageSummary
        items={[
          {
            key: 'blocked',
            label: 'Critical',
            fact: unavailable('no-permission', undefined, evidence),
          },
        ]}
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders the footnote when one is supplied', () => {
    wrap(
      <PageSummary
        items={[{ key: 'a', label: 'Hosts', fact: observed(63, evidence), display: '63' }]}
        footnote="Read from the entity model, so this costs nothing to refresh."
      />,
    );
    expect(
      screen.getByText('Read from the entity model, so this costs nothing to refresh.'),
    ).toBeTruthy();
  });
});
