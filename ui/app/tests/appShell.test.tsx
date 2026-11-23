import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { App } from '../App';
import { DYNATRACE_DOMAIN, type Identity } from '../config/identity';

const SE: Identity = { id: 'u1', name: 'Sam Engineer', email: `sam${DYNATRACE_DOMAIN}`, known: true };

/**
 * The shell as a whole: landmarks, the skip link, and where focus goes.
 *
 * In a single-page app a navigation does not reload the document, so a keyboard or
 * screen-reader user is left on the link they activated with the new page
 * somewhere after it. The shell moves focus to `main` on every route change and
 * offers a skip link; neither is visible in a screenshot, so both are asserted here.
 *
 * The platform SDK is replaced by a query that never answers, so every page sits in
 * its loading state — enough to exercise the shell without a tenant.
 */

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({ data: undefined, error: undefined, isLoading: true, refetch: () => undefined }),
}));

const renderApp = (route = '/coverage') =>
  render(
    <AppRoot>
      <MemoryRouter initialEntries={[route]}>
        <App store={null} identity={SE} />
      </MemoryRouter>
    </AppRoot>,
  );

const STORY = 'The story of this PoC';

/** The focus target: a plain wrapper inside the one `main` landmark Strato provides. */
const focusTarget = () => document.getElementById('pvs-main') as HTMLElement;

describe('app shell', () => {
  it('offers the story navigation, one main landmark and a skip link', async () => {
    renderApp();
    expect(await screen.findByRole('navigation', { name: STORY })).toBeInTheDocument();
    // Two nested `main` landmarks is an accessibility defect: Strato's PageLayout
    // already provides the page's one, and the focus target must live inside it.
    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]).toContainElement(focusTarget());
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
  });

  it('opens a page with exactly one h1, once the section has loaded', async () => {
    renderApp('/coverage');
    // The page is a lazy chunk; give the import time to resolve under jsdom.
    // 3.4.12: Coverage is the page that also prints as a report; its cover (`.pvs-print-only`, hidden on
    // screen by CSS, which jsdom does not apply) carries the report's own h1.
    // 3.5.2: a plain selector — the role query walks every node's accessibility (slow under jsdom since the navigation
    // carries an icon per page); `h1` elements are what it counted.
    const onScreen = () => [...document.querySelectorAll('h1')].filter((heading) => heading.closest('.pvs-print-only') === null);
    await waitFor(() => expect(onScreen().length).toBeGreaterThan(0), { timeout: 10_000 });
    expect(onScreen()).toHaveLength(1);
  }, 15_000);

  it('does not take focus when the app opens', async () => {
    renderApp();
    await screen.findByRole('navigation', { name: STORY });
    expect(document.activeElement).toBe(document.body);
  });

  it('sends keyboard focus to the main region from the skip link, without leaving the page', async () => {
    renderApp();
    const skip = await screen.findByRole('link', { name: 'Skip to content' });
    fireEvent.click(skip);
    expect(document.activeElement).toBe(focusTarget());
  });

  it('moves focus to the main region when the route changes', async () => {
    renderApp('/coverage');
    const nav = await screen.findByRole('navigation', { name: STORY });
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(within(nav).getByRole('link', { name: 'Topology' }));

    await waitFor(() => expect(document.activeElement).toBe(focusTarget()));
    expect(within(nav).getByRole('link', { current: 'page' })).toHaveAttribute('href', '/topology');
  });

  it('keeps the focus target out of the tab order but focusable by script', async () => {
    renderApp();
    await screen.findByRole('navigation', { name: STORY });
    expect(focusTarget()).toHaveAttribute('tabindex', '-1');
  });

  it('closes the story with a pager that leads onward', async () => {
    renderApp('/coverage');
    const pager = await screen.findByRole('navigation', { name: 'Continue the story' });
    expect(within(pager).getAllByRole('link')).toHaveLength(2);
  });
});
