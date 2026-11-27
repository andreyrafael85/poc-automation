import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StoryMap } from '../components/StoryMap';
import { StudioProvider, useStudio } from '../config/StudioContext';
import { EXECUTIVE_HIDDEN_ROUTES, STORY_STAGES } from '../config/navigation';

/**
 * The Overview's story map replaced seven neon "chapter" tiles that sent a viewer
 * into one domain page each. These guard what the replacement promises: nine
 * stages, each one real link into a page of that stage, the same executive-mode
 * rule as the sidebar, and a map that is as translated as the rest of the shell.
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

const renderMap = () =>
  render(
    <AppRoot>
      <MemoryRouter initialEntries={['/']}>
        <StudioProvider>
          <StoryMap />
          <Controls />
        </StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

// 3.8.1: seven stages, every one with a page for this viewer (Licensing and Consumption now sit in Recommendations).
const VISIBLE = STORY_STAGES;

const getMap = () => screen.getByRole('region', { name: 'The story of this PoC' });

describe('StoryMap', () => {
  it('is a named section with an ordered list of the seven stages', () => {
    renderMap();
    const map = getMap();
    expect(within(map).getByRole('heading', { level: 2, name: 'The story of this PoC' })).toBeInTheDocument();
    expect(within(map).getByText(/Seven stages, from context to recommendations/)).toBeInTheDocument();
    expect(within(map).getByRole('list').tagName).toBe('OL');
    expect(within(map).getAllByRole('listitem')).toHaveLength(VISIBLE.length);
  });

  it('links each of the seven stages to a page of that stage', () => {
    renderMap();
    const links = within(getMap()).getAllByRole('link');
    expect(links).toHaveLength(VISIBLE.length);
    links.forEach((link, index) => {
      const stage = VISIBLE[index];
      // The first page of the stage, so the link opens the stage from its start.
      expect(stage?.routes, `stage ${index + 1}`).toContain(link.getAttribute('href'));
      expect(link.getAttribute('href'), `stage ${index + 1}`).toBe(stage?.routes[0]);
    });
  });

  it('names each link by its stage, including the stage number, and counts its pages', () => {
    renderMap();
    const links = within(getMap()).getAllByRole('link');
    expect(links[2]).toHaveAccessibleName('Open Stage 3 of 7 · Coverage achieved');
    // Name and blurb are visible text; the number is the badge, hidden from the tree.
    expect(links[2]).toHaveTextContent('Coverage achieved');
    // 3.7.9: the Coverage stage holds Coverage and Platform adoption.
    expect(links[2]).toHaveTextContent('2 pages');
    expect(links[1]).toHaveTextContent('1 page');
    expect(links[1]).not.toHaveTextContent('1 pages');
  });

  it('leaves the technical pages out in executive mode, and the stage that only had those', async () => {
    renderMap();
    expect(screen.getByText('Settings & Build')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'to-exec' }));
    // 3.7.9: Evidence keeps pages for every audience; the last stage (the PoC Builder and Settings) leaves executive mode.
    await waitFor(() => expect(within(getMap()).queryByText('Settings & Build')).not.toBeInTheDocument());

    const map = getMap();
    const links = within(map).getAllByRole('link');
    expect(within(map).getByText('Evidence')).toBeInTheDocument();
    expect(links).toHaveLength(VISIBLE.length - 1);
    for (const link of links) {
      expect(EXECUTIVE_HIDDEN_ROUTES.has(link.getAttribute('href') ?? ''), link.getAttribute('href') ?? '').toBe(false);
    }

    // Counts only the pages still reachable: Coverage keeps /coverage and /adoption (3.7.9).
    const coverage = links.find((link) => link.textContent?.includes('Coverage achieved'));
    expect(coverage).toHaveTextContent('2 pages');
    // Numbers are positions in the whole story, so they do not shift when a stage is left out.
    expect(within(map).getByRole('link', { name: /Stage 5 of 7 · Demonstrated value/ })).toBeInTheDocument();
  });

  it('translates stage names, blurbs and counts to pt-BR', async () => {
    renderMap();
    expect(screen.getByText('Coverage achieved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'to-pt' }));

    expect(await screen.findByText('Cobertura alcançada')).toBeInTheDocument();
    expect(screen.getByText('Objetivos da PoC')).toBeInTheDocument();
    expect(screen.queryByText('Coverage achieved')).not.toBeInTheDocument();
    expect(screen.queryByText('PoC objectives')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir Etapa 3 de 7 · Cobertura alcançada' })).toBeInTheDocument();
    expect(screen.getAllByText('2 páginas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 página').length).toBeGreaterThan(0);
  });
});
