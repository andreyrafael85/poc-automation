import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { IconChips } from '../components/spectrum/IconChips';
import { NotFoundPage } from '../components/NotFoundPage';
import { RouteBoundary } from '../components/RouteBoundary';
import { SeOnly } from '../components/SeOnly';
import { StatTile } from '../components/StatTile';
import { StudioHeader } from '../components/StudioHeader';
import { OpenAccess, useAccess } from '../config/AccessContext';
import { StudioProvider } from '../config/StudioContext';
import { NAVIGATION } from '../config/navigation';
import { observed, unavailable } from '../models/provenance';
import type { EvidenceRef } from '../models/provenance';

/**
 * PoC Value Studio 3.3.0 — "Fundação e verdade".
 *
 * What this release promised, as tests that fail on the 3.2.7 code: the app survives a page that
 * throws and an address it does not have, a surface outside the access provider starts closed, a
 * measured number is written in the active language, a clipped text keeps its whole text within
 * reach, and executive mode is reachable at phone width.
 */

const EVIDENCE: EvidenceRef = { queryId: 'prob.mttx', source: 'dt.davis.problems', timeframe: 'last 7 d', collectedAt: '2026-11-03T12:00:00.000Z' };

const wrap = (node: React.ReactNode, route = '/') => (
  <AppRoot>
    <MemoryRouter initialEntries={[route]}>
      <OpenAccess>
        <StudioProvider>{node}</StudioProvider>
      </OpenAccess>
    </MemoryRouter>
  </AppRoot>
);

// ------------------------------------------------------------------ TD-24: no white screen

const Boom = (): React.ReactElement => {
  throw new Error('chunk 42 failed to load');
};

describe('a page that fails to draw (TD-24)', () => {
  it('shows a recovery card with both ways out instead of blanking the app', () => {
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      wrap(
        <RouteBoundary resetKey="/value">
          <Boom />
        </RouteBoundary>,
      ),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This section could not be drawn');
    expect(screen.getByRole('button', { name: 'Try this section again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload the app' })).toBeInTheDocument();
    console_.mockRestore();
  });

  it('keeps the exception text out of the body and offers it only as a technical detail', () => {
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      wrap(
        <RouteBoundary resetKey="/value">
          <Boom />
        </RouteBoundary>,
      ),
    );
    // The message is in the collapsed <details>, never in the paragraph the customer reads.
    const summary = screen.getByText('Technical detail');
    expect(summary.closest('details')).toHaveTextContent('chunk 42 failed to load');
    expect(screen.getByText(/The rest of the app is working/)).not.toHaveTextContent('chunk 42');
    console_.mockRestore();
  });

  it('is armed again once the route changes, without committing the card on the new page', () => {
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      wrap(
        <RouteBoundary resetKey="/value">
          <Boom />
        </RouteBoundary>,
      ),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This section could not be drawn');
    rerender(
      wrap(
        <RouteBoundary resetKey="/roadmap">
          <p>the next page</p>
        </RouteBoundary>,
      ),
    );
    expect(screen.getByText('the next page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    console_.mockRestore();
  });

  it('resets during render, so the fallback is never committed for the new address', () => {
    // A reset in componentDidUpdate would render the fallback once for the new route and commit
    // it — a flash of "This section could not be drawn" over a page that is fine. Derived state
    // is computed before the render that React commits, so the very first paint is the new page.
    const next = RouteBoundary.getDerivedStateFromProps({ resetKey: '/roadmap', children: null }, { failed: true, detail: 'boom', seenKey: '/value' });
    expect(next).toEqual({ failed: false, detail: null, seenKey: '/roadmap' });
    // Same address: nothing is derived, so a re-render of the failed page keeps the card.
    expect(RouteBoundary.getDerivedStateFromProps({ resetKey: '/value', children: null }, { failed: true, detail: 'boom', seenKey: '/value' })).toBeNull();
  });

  it('names an address the app does not have, and echoes it', () => {
    render(
      wrap(
        <Routes>
          <Route path="/" element={<p>the overview</p>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>,
        '/problems-classic',
      ),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This address is not part of the app');
    expect(screen.getByText('/problems-classic')).toBeInTheDocument();
  });

  it('left no navigation entry pointing at the retired classic problems page', () => {
    expect(NAVIGATION.map((section) => section.route)).not.toContain('/problems-classic');
  });
});

// ------------------------------------------------------------------ S11: fail-closed access

const Probe = () => {
  const access = useAccess();
  return <span data-testid="probe">{`${access.level}|${String(access.canWork)}|${String(access.commercialVisible)}|${String(access.canManageAccess)}`}</span>;
};

describe('access outside the provider (S11)', () => {
  it('starts closed, not as an SE with commercial data on screen', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('loading|false|false|false');
  });

  it('shows nothing commercial to a surface mounted outside the provider', () => {
    render(
      <SeOnly>
        <span>DPS cost projection</span>
      </SeOnly>,
    );
    expect(screen.queryByText('DPS cost projection')).not.toBeInTheDocument();
  });

  it('still shows it under the explicit open value', () => {
    render(
      <OpenAccess>
        <SeOnly>
          <span>DPS cost projection</span>
        </SeOnly>
      </OpenAccess>,
    );
    expect(screen.getByText('DPS cost projection')).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ §17-b: numbers read as numbers

describe('a measured number on a tile (§17-b)', () => {
  it('is written in the active language even when the caller passes no display string', () => {
    render(wrap(<StatTile label="Problems resolved in window" fact={observed(6842, EVIDENCE, { unit: 'problems' })} />));
    expect(screen.getByText('6,842')).toBeInTheDocument();
    expect(screen.queryByText('6842')).not.toBeInTheDocument();
  });

  it('leaves a display string the caller passed alone', () => {
    render(wrap(<StatTile label="Mean time to resolve" fact={observed(6.9, EVIDENCE)} display="6.9 h" />));
    expect(screen.getByText('6.9 h')).toBeInTheDocument();
  });

  it('still renders a dash and the reason when nothing was measured', () => {
    render(wrap(<StatTile label="Problems resolved in window" fact={unavailable('no-telemetry')} />));
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ A9: executive mode on a phone

describe('executive mode at phone width (A9)', () => {
  it('renders the switch twice — the strip and the row under it — each named and operable', async () => {
    render(wrap(<StudioHeader />));
    const toggles = screen.getAllByRole('switch', { name: 'Executive mode' });
    expect(toggles).toHaveLength(2);
    // Distinct ids, so neither instance duplicates the other's label or description.
    const labelled = toggles.map((toggle) => toggle.getAttribute('aria-labelledby'));
    expect(new Set(labelled).size).toBe(2);
    await userEvent.click(toggles[1] as HTMLElement);
    for (const toggle of screen.getAllByRole('switch', { name: 'Executive mode' })) expect(toggle).toBeChecked();
  });

  it('swaps the strip instance for the row under the header below 640 px', async () => {
    const css = await import('node:fs').then((fs) => fs.readFileSync('ui/app/engine/shell.css', 'utf8'));
    const mobile = css.slice(css.indexOf('@media (max-width: 640px)'));
    const hidden = mobile.slice(0, mobile.indexOf('display: none !important;'));
    // Below the breakpoint the strip instance goes…
    expect(hidden).toContain('.pvs-hdr__executive--strip');
    // …and the row takes over. Above it, the row is the one that is hidden.
    expect(mobile).toContain('.pvs-hdr__mobilebar {\n    display: flex;');
    expect(css).toContain('.pvs-hdr__mobilebar {\n  display: none;');
  });
});

// ------------------------------------------------------------------ §17-c: clipped text stays reachable

describe('a text the layout has to clip (§17-c)', () => {
  it('keeps the whole name on a chip, for the pointer and for assistive technology', () => {
    const long = 'checkout-orchestration-service.payments.prod.internal';
    render(
      wrap(
        <IconChips
          label="Callers"
          items={[
            { key: 'a', name: long, icon: <span />, display: '1,412' },
            { key: 'b', name: 'svc-gateway-01', icon: <span />, href: 'https://example.invalid/x' },
          ]}
        />,
      ),
    );
    expect(screen.getByText(long)).toHaveAttribute('title', long);
    expect(screen.getByRole('link', { name: 'svc-gateway-01' })).toHaveAttribute('title', 'svc-gateway-01');
  });

  it('writes the whole name into a flow-map node, which clips it at 24 characters', async () => {
    const { fitName } = await import('../models/flowMap');
    const long = 'payments-db.prod.internal.acme';
    expect(fitName(long)).toMatch(/…$/);
    expect(fitName(long).length).toBeLessThanOrEqual(24);
    // FlowMap prints the clipped text and carries the whole one in the node's <title>
    // (components/spectrum/FlowMap.tsx) — v327.test.tsx asserts that pairing for the unit.
    expect(fitName('payments-db')).toBe('payments-db');
  });
});
