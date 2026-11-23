import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StageNav } from '../components/StageNav';
import { StoryPager } from '../components/StoryPager';
import { StudioProvider, useStudio } from '../config/StudioContext';
import { OpenAccess } from '../config/AccessContext';
import {
  EXECUTIVE_HIDDEN_ROUTES,
  NAVIGATION,
  STORY_STAGES,
  sectionFor,
} from '../config/navigation';

/**
 * The story navigation replaced a 25-entry horizontal bar. These guard what that
 * bar could not promise: every page is still reachable, the viewer can tell where
 * they are without colour, and a customer never sees half a screen translated.
 */

const Controls = () => {
  const { setLocale, setExecutiveMode } = useStudio();
  return (
    <>
      <button type="button" onClick={() => setLocale('pt-BR')}>
        to-pt
      </button>
      <button type="button" onClick={() => setExecutiveMode(true)}>
        to-exec
      </button>
    </>
  );
};

const renderNav = (route = '/') =>
  render(
    <AppRoot>
      <MemoryRouter initialEntries={[route]}>
        {/* 3.3.0: `useAccess()` is fail-closed outside a provider (backlog S11); the navigation
            is asserted as the SE sees it, so the SE value is granted here on purpose. */}
        <OpenAccess>
          <StudioProvider>
            <StageNav />
            <StoryPager />
            <Controls />
          </StudioProvider>
        </OpenAccess>
      </MemoryRouter>
    </AppRoot>,
  );

describe('StageNav', () => {
  it('is a named navigation landmark', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: 'The story of this PoC' })).toBeInTheDocument();
  });

  it('links to every page of the app exactly once', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: 'The story of this PoC' });
    for (const section of NAVIGATION) {
      const links = within(nav)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href') === section.route);
      expect(links, section.route).toHaveLength(1);
      expect(links[0], section.route).toHaveTextContent(section.label);
    }
  });

  it('groups the pages into the nine stages, numbered in order', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: 'The story of this PoC' });
    const groups = within(nav).getAllByRole('group');
    expect(groups).toHaveLength(STORY_STAGES.length);
    groups.forEach((group, index) => {
      // The number is part of the visible text, so position never depends on colour.
      expect(group.textContent ?? '', `stage ${index + 1}`).toMatch(new RegExp(`^${index + 1}`));
    });
  });

  it('marks the current page with aria-current', () => {
    renderNav('/coverage');
    const current = screen.getByRole('link', { current: 'page' });
    expect(current).toHaveAttribute('href', '/coverage');
    expect(screen.getAllByRole('link', { current: 'page' })).toHaveLength(1);
  });

  it('translates stage names and page names together', async () => {
    renderNav();
    expect(screen.getByText('Coverage achieved')).toBeInTheDocument();
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'to-pt' }));

    expect(await screen.findByText('Cobertura alcançada')).toBeInTheDocument();
    expect(screen.getAllByText('Visão geral').length).toBeGreaterThan(0);
    expect(screen.queryByText('Coverage achieved')).not.toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
  });

  it('hides the technical pages in executive mode and says so', async () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'to-exec' }));

    const nav = screen.getByRole('navigation', { name: 'The story of this PoC' });
    expect(
      await within(nav).findByText('Technical pages are hidden in executive mode.'),
    ).toBeInTheDocument();

    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    for (const route of EXECUTIVE_HIDDEN_ROUTES) {
      expect(hrefs, route).not.toContain(route);
    }
    // Everything else is still reachable.
    for (const section of NAVIGATION) {
      if (!EXECUTIVE_HIDDEN_ROUTES.has(section.route)) expect(hrefs, section.route).toContain(section.route);
    }
  });

  it('omits a stage whose pages are all technical instead of leaving an empty heading', async () => {
    renderNav();
    // "Evidence" holds only technical pages, so it disappears in executive mode.
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'to-exec' }));
    const nav = screen.getByRole('navigation', { name: 'The story of this PoC' });
    await within(nav).findByText('Technical pages are hidden in executive mode.');
    expect(within(nav).queryByText('Evidence')).not.toBeInTheDocument();
  });
});

describe('StoryPager', () => {
  it('offers the previous and next page in story order', () => {
    renderNav('/coverage');
    const pager = screen.getByRole('navigation', { name: 'Continue the story' });
    const links = within(pager).getAllByRole('link');
    // 3.4.12: the Assessment and Coverage are one page, which opens the Coverage stage after the timeline.
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/timeline', '/topology']);
    expect(sectionFor('/assessment')).toBeUndefined();
    expect(links[0]).toHaveTextContent(`Previous: ${sectionFor('/timeline')?.label ?? ''}`);
    expect(links[1]).toHaveTextContent('Next: Topology');
  });

  it('has no previous link on the first page', () => {
    renderNav('/');
    const pager = screen.getByRole('navigation', { name: 'Continue the story' });
    const links = within(pager).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(/^Next:/);
  });

  it('skips technical pages in executive mode', async () => {
    renderNav('/coverage');
    fireEvent.click(screen.getByRole('button', { name: 'to-exec' }));
    const pager = await screen.findByRole('navigation', { name: 'Continue the story' });
    // `/topology` follows `/coverage` in the full story but is hidden here.
    const hrefs = within(pager)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).not.toContain('/topology');
  });

  it('renders nothing on a route outside the story', () => {
    renderNav('/wrapup');
    expect(screen.queryByRole('navigation', { name: 'Continue the story' })).not.toBeInTheDocument();
  });

  it('renders nothing on the printable report', () => {
    renderNav('/report');
    expect(screen.queryByRole('navigation', { name: 'Continue the story' })).not.toBeInTheDocument();
  });
});
