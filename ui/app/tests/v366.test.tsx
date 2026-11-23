import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { WHATS_NEW } from '../components/HelpPanels';
import { OpenAccess } from '../config/AccessContext';
import { EXECUTIVE_HIDDEN_ROUTES, STORY_STAGES, stageOf } from '../config/navigation';
import { StudioProvider } from '../config/StudioContext';
import { fitLogo, shrinkLogo } from '../features/dashboard/dashboardLogo';
import { buildDashboard, logoMarkdown, POC_BLUEPRINT, type DashboardWords } from '../features/dashboard/pocDashboard';
import { entryFor } from '../i18n/strings';
import { PocBuilder } from '../pages/PocBuilder';

/**
 * 3.6.6 — the owner's requests of 2026-11-22: Settings at the end of the menu in a stage of its own, a page that creates
 * things on the tenant for the PoC (the PoC builder), the dashboards out of the long Settings tab, and the customer's
 * logo in the top-left corner of the dashboards the PoC creates.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
/* eslint-disable noSecrets/no-secrets -- test images (a 1x1 PNG, a refused SVG), not secrets */
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const words = (logo?: { src: string; alt: string }): DashboardWords => ({
  title: 'Value of the PoC — Acme',
  intro: 'intro',
  objectivesTitle: '',
  objectives: [],
  sectionTitle: (section) => section,
  footer: 'footer',
  tileTitle: (key) => key,
  evidence: new Set(),
  ...(logo === undefined ? {} : { logo }),
});

describe('the menu', () => {
  it('closes with a tenth stage, Settings & Build, holding the PoC Builder and Settings', () => {
    const last = STORY_STAGES[STORY_STAGES.length - 1];
    expect(last?.id).toBe('manage');
    expect(last?.routes).toEqual(['/builder', '/settings']);
    expect(STORY_STAGES[0]?.routes).toEqual(['/']);
    // 3.7.9: nine stages; Settings & Build is the ninth.
    expect(stageOf('/settings')?.position).toBe(9);
    expect(entryFor('stage.manage')['pt-BR']).toBe('Configurações & Construção');
    expect(entryFor('stage.manage').en).toBe('Settings & Build');
    expect(entryFor('nav.builder')).toEqual({ en: 'PoC Builder', 'pt-BR': 'PoC Builder' });
  });

  it('never shows the page that writes to the tenant in executive mode', () => {
    expect(EXECUTIVE_HIDDEN_ROUTES.has('/builder')).toBe(true);
    // 3.6.8: Settings leaves executive mode too.
    expect(EXECUTIVE_HIDDEN_ROUTES.has('/settings')).toBe(true);
  });

  it('sends the dashboards’ old address to the builder', () => {
    const app = read('ui/app/App.tsx');
    expect(app).toContain('<Route path="/builder" element={<PocBuilder />} />');
    expect(app).toContain("new URLSearchParams(search).get('tab') === 'dashboards' ? <Navigate to={{ pathname: '/builder' }} replace />");
  });
});

describe('the customer logo in the dashboards', () => {
  it('puts the logo in the top-left corner and the header beside it', () => {
    const doc = buildDashboard(POC_BLUEPRINT, words({ src: LOGO, alt: 'Acme [Corp]' }));
    expect(doc.tiles['0']).toMatchObject({ type: 'markdown', content: `![Acme Corp](${LOGO})` });
    expect(doc.layouts['0']).toMatchObject({ x: 0, y: 0, w: 4 });
    expect(doc.layouts['1']).toMatchObject({ x: 4, y: 0, w: 20 });
  });

  it('keeps the header full width without a logo, or with one that is not a safe raster image', () => {
    expect(buildDashboard(POC_BLUEPRINT, words()).layouts['0']).toMatchObject({ x: 0, w: 24 });
    const svg = buildDashboard(POC_BLUEPRINT, words({ src: 'data:image/svg+xml;base64,PHN2Zz4=', alt: 'x' }));
    expect(svg.layouts['0']).toMatchObject({ x: 0, w: 24 });
    expect(logoMarkdown({ src: LOGO, alt: '' })).toBe(`![Logo](${LOGO})`);
  });

  it('draws the logo at most 320 × 120, never larger than it is', async () => {
    expect(fitLogo(1600, 400)).toEqual({ width: 320, height: 80 });
    expect(fitLogo(300, 600)).toEqual({ width: 60, height: 120 });
    expect(fitLogo(100, 40)).toEqual({ width: 100, height: 40 });
    expect(await shrinkLogo(null)).toBeNull();
    expect(await shrinkLogo('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
  });
});

describe('the PoC Builder', () => {
  const mount = () =>
    render(
      <AppRoot>
        <MemoryRouter initialEntries={['/builder']}>
          <OpenAccess>
            <StudioProvider>
              <PocBuilder />
            </StudioProvider>
          </OpenAccess>
        </MemoryRouter>
      </AppRoot>,
    );

  it('shows the four dashboards as compact cards and opens one card’s details at a time', async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.getByRole('heading', { level: 1, name: 'PoC Builder' })).toBeTruthy();
    // 3.6.7: six dashboards (security and logs joined), and the count covers the notebook and the launchpad too.
    // 3.7.1: the environment overview took the place of "Value of the PoC".
    for (const key of ['overview', 'sre', 'infra', 'experience', 'security', 'logs']) expect(screen.getByTestId(`builder-kit-${key}`)).toBeTruthy();
    // 3.6.9: the SLOs are one kit more (the workflow is saved by the Workflows app).
    // 3.7.3: eight dashboards (Kubernetes and Databases joined), the notebook, the launchpad, the SLOs and the HTTP monitors.
    // 3.7.4: the anomaly detectors and the OpenPipeline pipeline join them.
    expect(screen.getByText('0 of 14 kits on the environment')).toBeTruthy();
    expect(screen.getByTestId('builder-kit-sre').textContent).toContain('7 sections');
    // Nothing is created until a card is opened and its own button pressed (rule 10).
    expect(screen.queryByTestId('dash3-create-sre')).toBeNull();
    await user.click(screen.getByTestId('builder-details-sre'));
    expect(screen.getByTestId('dash3-create-sre')).toBeTruthy();
    expect(screen.queryByTestId('dash3-create-infra')).toBeNull();
    await user.click(screen.getByTestId('builder-details-infra'));
    expect(screen.getByTestId('dash3-create-infra')).toBeTruthy();
    expect(screen.queryByTestId('dash3-create-sre')).toBeNull();
  });

  it('says where to upload the logo when the PoC has none, and keeps a register of what it created', () => {
    mount();
    expect(screen.getByTestId('builder-logo').textContent).toContain('Settings → Customer & engagement');
    expect(screen.getByText('Nothing created yet: the dashboards you create on the first tab appear here.')).toBeTruthy();
  }, 15_000);
});

describe('What’s new', () => {
  it('lets 3.6.6 leave the ten releases (3.7.6), its text kept in the dictionary', () => {
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i108')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i108').en.startsWith('3.6.6 — ')).toBe(true);
  });
});
