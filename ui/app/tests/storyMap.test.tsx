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

const getMap = () => screen.getByRole('region', { name: 'The story of this PoC' });

describe('StoryMap', () => {
  it('is a named section with an ordered list of the nine stages', () => {
    renderMap();
    const map = getMap();
    expect(within(map).getByRole('heading', { level: 2, name: 'The story of this PoC' })).toBeInTheDocument();
    expect(within(map).getByText(/Nine stages, from context to next steps/)).toBeInTheDocument();
    expect(within(map).getByRole('list').tagName).toBe('OL');
    expect(within(map).getAllByRole('listitem')).toHaveLength(STORY_STAGES.length);
  });

  it('links each of the nine stages to a page of that stage', () => {
    renderMap();
    const links = within(getMap()).getAllByRole('link');
    expect(links).toHaveLength(STORY_STAGES.length);
    links.forEach((link, index) => {
      const stage = STORY_STAGES[index];
      // The first page of the stage, so the link opens the stage from its start.
      expect(stage?.routes, `stage ${index + 1}`).toContain(link.getAttribute('href'));
      expect(link.getAttribute('href'), `stage ${index + 1}`).toBe(stage?.routes[0]);
    });
  });

  it('names each link by its stage, including the stage number, and counts its pages', () => {
    renderMap();
    const links = within(getMap()).getAllByRole('link');
    expect(links[2]).toHaveAccessibleName('Open Stage 3 of 10 · Coverage achieved');
    // Name and blurb are visible text; the number is the badge, hidden from the tree.
    expect(links[2]).toHaveTextContent('Coverage achieved');
    // 3.4.0: the Assessment joined the stage.
    expect(links[2]).toHaveTextContent('6 pages');
    expect(links[1]).toHaveTextContent('1 page');
    expect(links[1]).not.toHaveTextContent('1 pages');
  });

  it('leaves the technical pages out in executive mode, and the stage that only had those', async () => {
    renderMap();
    expect(screen.getByText('Evidence')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'to-exec' }));
    // "Evidence" holds only technical pages, so it goes once the mode is on.
    await waitFor(() => expect(within(getMap()).queryByText('Evidence')).not.toBeInTheDocument());

    const map = getMap();
    const links = within(map).getAllByRole('link');
    // 3.6.8: the last stage (the PoC Builder and Settings) leaves executive mode too.
    expect(links).toHaveLength(STORY_STAGES.length - 2);
    for (const link of links) {
      expect(EXECUTIVE_HIDDEN_ROUTES.has(link.getAttribute('href') ?? ''), link.getAttribute('href') ?? '').toBe(false);
    }

    // Counts only the pages still reachable: Coverage keeps /coverage (one page with the Assessment since 3.4.12) and /cloud.
    const coverage = links.find((link) => link.textContent?.includes('Coverage achieved'));
    expect(coverage).toHaveTextContent('2 pages');
    // Numbers are positions in the whole story, so they do not shift when a stage is left out.
    expect(within(map).getByRole('link', { name: /Stage 6 of 10 · Impact/ })).toBeInTheDocument();
  });

  it('translates stage names, blurbs and counts to pt-BR', async () => {
    renderMap();
    expect(screen.getByText('Coverage achieved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'to-pt' }));

    expect(await screen.findByText('Cobertura alcançada')).toBeInTheDocument();
    expect(screen.getByText('Objetivos da PoC')).toBeInTheDocument();
    expect(screen.queryByText('Coverage achieved')).not.toBeInTheDocument();
    expect(screen.queryByText('PoC objectives')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir Etapa 3 de 10 · Cobertura alcançada' })).toBeInTheDocument();
    expect(screen.getAllByText('6 páginas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 página').length).toBeGreaterThan(0);
  });
});
