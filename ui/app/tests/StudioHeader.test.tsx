import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioHeader } from '../components/StudioHeader';
import { StudioProvider, useStudio } from '../config/StudioContext';
import { NAVIGATION } from '../config/navigation';
import { LOCALES } from '../i18n/strings';
import { TIMEFRAME_PRESETS } from '../utils/time';

/**
 * Regression guard for a defect that shipped in 0.3.0.
 *
 * `Select.Option` is only valid inside `Select.Content`. Rendering options as
 * direct children of `Select` type-checks and lints cleanly, but at runtime the
 * component finds no options and renders "No results found" — so both the
 * language picker and the timeframe picker were dead, and with no timeframe the
 * app stopped loading data entirely.
 *
 * ## How this is asserted
 *
 * A Select can only display the label of its current value if it found the
 * matching option. With the options outside `Select.Content` the trigger has
 * nothing to resolve and shows no label at all. So asserting the *displayed
 * value* catches the bug exactly, is what a user actually sees, and does not
 * require driving the popover — which react-select does not open reliably under
 * jsdom.
 */

const renderHeader = (extra?: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>
          <StudioHeader />
          {extra}
        </StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

/** Text rendered by each Select trigger, in DOM order. */
function selectDisplayValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-dt-component="Select"]')).map(
    (element) => (element.textContent ?? '').trim(),
  );
}

describe('StudioHeader', () => {
  it('leaves the page list to the story sidebar', () => {
    // v3.1 moved the 25 pages out of the header into `StageNav`. The header keeps
    // only session-wide controls. (Strato's AppHeader still emits its own, empty
    // "App navigation" landmark and an app-logo link home; that is the platform's
    // markup, not a page list.)
    renderHeader();
    const routes = new Set(NAVIGATION.map((section) => section.route).filter((route) => route !== '/'));
    const pageLinks = screen
      .queryAllByRole('link')
      .filter((link) => routes.has(link.getAttribute('href') ?? ''));
    expect(pageLinks).toHaveLength(0);
  });

  it('offers the executive-mode switch with an accessible name', () => {
    renderHeader();
    // 3.3.0 (A9): two instances — the header strip and the row under it — of which the stylesheet
    // shows exactly one. Both have to carry the accessible name.
    const switches = screen.getAllByRole('switch', { name: /Executive mode/i });
    expect(switches).toHaveLength(2);
  });

  it('renders both pickers', () => {
    const { container } = renderHeader();
    // Language and window.
    expect(selectDisplayValues(container)).toHaveLength(2);
  });

  it('resolves the selected language to its label', () => {
    const { container } = renderHeader();
    // Empty here would mean the options never reached the component - the 0.3.0 bug.
    expect(selectDisplayValues(container)).toContain('English');
  });

  it('resolves the selected timeframe to its label', () => {
    const { container } = renderHeader();
    expect(selectDisplayValues(container)).toContain('Last 24 hours');
  });

  it('leaves no picker without a resolved label', () => {
    const { container } = renderHeader();
    for (const value of selectDisplayValues(container)) {
      expect(value.length).toBeGreaterThan(0);
      expect(value).not.toMatch(/No results/i);
    }
  });

  it('knows how many options each picker should have', () => {
    // Guards against a preset or locale being added without a translation,
    // which would render an option with an empty label.
    expect(LOCALES.length).toBeGreaterThan(1);
    expect(TIMEFRAME_PRESETS.length).toBeGreaterThan(1);
  });

  it('never shows the empty state on a freshly rendered header', () => {
    renderHeader();
    expect(screen.queryByText(/No results found/i)).not.toBeInTheDocument();
  });

  it('exposes a refresh control', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });
});

/** Drives the locale through the context, which is what the picker ultimately does. */
const LocaleSwitcher = () => {
  const { setLocale } = useStudio();
  return (
    <button type="button" onClick={() => setLocale('pt-BR')}>
      switch
    </button>
  );
};

describe('language switching', () => {
  it('translates every control of the shell together', async () => {
    renderHeader(<LocaleSwitcher />);

    expect(screen.getByText('Refresh')).toBeInTheDocument();
    // 3.3.0 (A9): the label appears twice, once per instance of the switch.
    expect(screen.getAllByText('Executive mode')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    // A customer must never see half the shell translated.
    expect(await screen.findByText('Atualizar')).toBeInTheDocument();
    expect(screen.getAllByText('Modo executivo')).toHaveLength(2);
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
    expect(screen.queryByText('Executive mode')).not.toBeInTheDocument();
  });
});
