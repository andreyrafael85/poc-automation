import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { WHATS_NEW } from '../components/HelpPanels';
import { OpenAccess } from '../config/AccessContext';
import { StudioProvider } from '../config/StudioContext';
import { appPageUrl, LAUNCHPAD_PAGES } from '../features/builder/PocDocumentKit';
import { buildInvestigationNotebook, buildPocLaunchpad, NOTEBOOK_CHAPTERS, NOTEBOOK_STEPS, NOTEBOOK_TIMEFRAME, sectionTimeframe, stepQuery } from '../features/builder/pocDocuments';
import { SPECIALTY_BLUEPRINTS, SPECIALTY_IDS } from '../features/dashboard/blueprints';
import { entryFor } from '../i18n/strings';
import { parsePocPlan } from '../models/pocPlan';
import { PocBuilder } from '../pages/PocBuilder';
import { getQuery } from '../queries/catalog';

/**
 * 3.6.7 — the PoC Builder grows (the owner: "Seguir com a 3.6.7 com suas recomendações"): two dashboards (runtime
 * security; logs and data quality), the investigation notebook and the PoC launchpad — documents only, from catalog
 * queries only, each created by the SE's click.
 */

/* eslint-disable noSecrets/no-secrets -- a 1x1 test image, not a secret */
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('the two new dashboards', () => {
  it('read catalog queries only, nothing commercial', () => {
    expect(SPECIALTY_IDS).toEqual(['overview', 'sre', 'infra', 'experience', 'security', 'logs', 'kubernetes', 'database']);
    for (const id of ['security', 'logs'] as const) {
      for (const tile of SPECIALTY_BLUEPRINTS[id].tiles) {
        // 3.7.1: a catalog entry, or a dashboard query with its validation record (tests/dashboards.test.ts).
        expect(tile.queryId !== undefined || tile.dql !== undefined, tile.key).toBe(true);
        expect(tile.queryId ?? '', tile.key).not.toMatch(/^(lic|cons)\./);
        expect(SPECIALTY_BLUEPRINTS[id].sections, tile.key).toContain(tile.section);
      }
    }
    expect(entryFor('dash3.security.name')['pt-BR']).toBe('Segurança em runtime');
    expect(entryFor('dash3.logs.name')['pt-BR']).toBe('Logs e qualidade de dados');
  });

  it('are kept in the PoC plan like the others', () => {
    const plan = parsePocPlan({
      specialtyDashboards: { security: { id: 'a', name: 'S', createdAt: '', shared: true }, logs: { id: 'b', name: 'L', createdAt: '', shared: false } },
      notebook: { id: 'n', name: 'N', createdAt: '2026-11-22T14:00:00Z', shared: true },
      launchpad: { id: 'l', name: 'P', createdAt: '', shared: true },
    });
    expect(plan.specialtyDashboards?.security?.id).toBe('a');
    expect(plan.specialtyDashboards?.logs?.id).toBe('b');
    expect(plan.notebook?.id).toBe('n');
    expect(plan.launchpad?.id).toBe('l');
  });
});

describe('the investigation notebook', () => {
  const notebook = buildInvestigationNotebook({
    title: 'PoC investigation — Acme',
    intro: 'intro',
    logo: { src: LOGO, alt: 'Acme' },
    chapter: (key, n) => ({ title: `${n}. ${key}`, why: 'why' }),
    tile: (key) => key,
    footer: 'footer',
  });

  it('runs each step’s query exactly as the app (or the dashboards) run it, with its own window and ceiling', () => {
    const queries = notebook.sections.filter((section) => section.type === 'dql');
    expect(queries).toHaveLength(NOTEBOOK_STEPS.length);
    // 3.7.2: the steps follow the chapters (the golden signals first); each a catalog entry or a validated dashboard query.
    const ordered = NOTEBOOK_CHAPTERS.flatMap((chapter) => NOTEBOOK_STEPS.filter((step) => step.chapter === chapter));
    ordered.forEach((step, index) => {
      expect(queries[index]?.state?.input.value).toBe(stepQuery(step));
      if (step.queryId !== undefined) {
        expect(stepQuery(step).startsWith(getQuery(step.queryId).dql)).toBe(true);
        expect(queries[index]?.state?.input.timeframe).toEqual(sectionTimeframe(step.queryId) ?? NOTEBOOK_TIMEFRAME);
      } else {
        expect(step.dql).toBeDefined();
      }
    });
    expect(sectionTimeframe('log.errors.recent')).toEqual({ from: 'now()-30m', to: 'now()' });
    expect(sectionTimeframe('svc.ranking')).toBeUndefined();
  });

  it('opens with the customer logo and the title', () => {
    expect(notebook.sections[0]?.markdown).toContain(`![Acme](${LOGO})`);
    expect(notebook.sections[0]?.markdown).toContain('# PoC investigation — Acme');
    expect(notebook.version).toBe('7');
  });
});

describe('the PoC launchpad', () => {
  it('has a list of links per group, leaving an empty group out', () => {
    const launchpad = buildPocLaunchpad({
      title: 'PoC launchpad — Acme',
      intro: 'intro',
      appIcon: '/platform/app-engine/registry/v1/app-icons/my.poc.automation',
      groups: [
        { heading: 'Dashboards', description: 'd', items: [{ title: 'Overview', description: 'd', documentId: 'doc-1', category: 'dashboards' }] },
        { heading: 'Investigation', description: 'd', items: [] },
        { heading: 'App', description: 'd', items: LAUNCHPAD_PAGES.map((page) => ({ title: page.key, description: 'd', url: appPageUrl(page.route) })) },
      ],
      footer: 'footer',
    });
    const blocks = launchpad.containerList.containers[0]?.blocks ?? [];
    expect(launchpad.schemaVersion).toBe(2);
    // 3.7.2: lists, as the platform's own launchpads list documents (no card waits for an image).
    expect(blocks.map((block) => block.type)).toEqual(['markdown', 'links', 'links', 'markdown']);
    const dashboards = blocks[1];
    expect(dashboards?.type === 'links' ? dashboards.content[0] : null).toMatchObject({ type: 'doc', action: { type: 'openDocument', documentId: 'doc-1' }, categoryId: 'dashboards' });
    const app = blocks[2];
    expect(app?.type === 'links' ? app.content.map((link) => (link.type === 'link' ? link.action.url : '')) : []).toEqual(LAUNCHPAD_PAGES.map((page) => appPageUrl(page.route)));
    expect(appPageUrl('/rca')).toMatch(/^\/ui\/apps\/[^/]+\/rca$/);
  });
});

describe('the PoC Builder', () => {
  it('shows the notebook and the launchpad on a tab of their own, each created only after a confirmation', async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole('tab', { name: 'Notebook and launchpad' }));
    expect(screen.getByTestId('builder-doc-notebook')).toBeTruthy();
    expect(screen.getByTestId('builder-doc-launchpad')).toBeTruthy();
    await user.click(screen.getByTestId('builder-create-notebook'));
    expect(screen.getByTestId('builder-confirm-notebook')).toBeTruthy();
  }, 20_000);
});

describe('What’s new', () => {
  it('lets 3.6.7 leave the ten releases (3.7.7), its text kept', () => {
    // 3.7.7: i119 opened the list and i109 left it to keep ten.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i109')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i109').en.startsWith('3.6.7 — ')).toBe(true);
  });
});
