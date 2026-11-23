import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { HelpPanels, type HelpPanelId } from '../components/HelpPanels';
import { StudioProvider } from '../config/StudioContext';
import { APP_CREATOR } from '../config/appInfo';
import { EVIDENCE_ORDER } from '../engine';

/**
 * The help sheets cover the whole viewport and Strato closes a sheet only on Escape.
 * A visual review found no way out for a mouse or touch user, so the close control is
 * asserted, along with the content each panel is supposed to carry.
 */

const renderPanel = (panel: HelpPanelId | null, onClose = vi.fn()) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>
          <HelpPanels panel={panel} onClose={onClose} />
        </StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

const PANELS: [HelpPanelId, RegExp][] = [
  ['guide', /How to use this app/],
  ['methodology', /Methodology/],
  ['sources', /Data sources/],
  ['whatsNew', /What’s new in 3\.7/],
  ['about', /About PoC Automation 3\.0/],
];

describe('HelpPanels', () => {
  it('renders nothing while no panel is open', () => {
    renderPanel(null);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it.each(PANELS)('opens the %s panel with a titled body and a Close button', (panel, title) => {
    renderPanel(panel);
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('closes from the button', () => {
    const onClose = vi.fn();
    renderPanel('guide', onClose);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('teaches the evidence language in the methodology: every class by name', () => {
    renderPanel('methodology');
    for (const provenance of EVIDENCE_ORDER) {
      // The legend lists each class with its word and its description.
      expect(document.body.textContent ?? '', provenance).toMatch(/Observed|Calculated|Estimated|Recommendation|Hypothesis|Not configured|No telemetry|No permission/);
    }
    expect(screen.getByText(/Solid border: measured or calculated\./)).toBeInTheDocument();
    expect(screen.getByText(/Dashed border: an estimate, a hypothesis, or a value that is not available\./)).toBeInTheDocument();
  });

  it('credits the creator and offers a real mail link in About', () => {
    renderPanel('about');
    expect(screen.getByText(APP_CREATOR.name, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: APP_CREATOR.email })).toHaveAttribute('href', `mailto:${APP_CREATOR.email}`);
  });
});
