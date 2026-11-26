import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { buildTriageWorkflow } from '../features/builder/pocAutomation';
import { buildInvestigationNotebook, buildPocLaunchpad, launchpadId, NOTEBOOK_STEPS } from '../features/builder/pocDocuments';
import { SPECIALTY_BLUEPRINTS, SPECIALTY_IDS } from '../features/dashboard/blueprints';
import { bannerHeading, buildDashboard, type DashboardDocument, type DashboardEvidence, type DashboardWords } from '../features/dashboard/pocDashboard';
import { TRIAGE_RULE, triageSummary } from '../features/triage/triage';
import { ALL_KEYS, entryFor } from '../i18n/strings';
import type { RcaIncident } from '../models/rca';

/**
 * 3.7.1 (the owner: "Seguir com a 3.7.1, porém valide estes pontos antes"): dashboards worth presenting — coloured section
 * banners and richer content —, the environment overview with the SLOs created in the Builder, the security dashboard no
 * longer empty, the notebook with charts, the launchpad accepted by the platform, the triage workflow on and its e-mail in
 * sections, and the overview's heat calendar titled without "dói".
 */

const words = (extra: Partial<DashboardWords> = {}, evidence: ReadonlySet<DashboardEvidence> = new Set()): DashboardWords => ({
  title: 'Board — Acme',
  intro: 'Intro',
  objectivesTitle: 'Objectives',
  objectives: [],
  footer: 'Footer',
  sectionTitle: (section, index) => `${index}. ${section}`,
  tileTitle: (key) => key,
  evidence,
  ...extra,
});

const banners = (doc: DashboardDocument) =>
  Object.values(doc.tiles).flatMap((tile) => {
    const heading = bannerHeading(tile);
    return heading === null ? [] : [{ heading, tile }];
  });

describe('the dashboards', () => {
  it('open each section on a coloured banner with an icon, in the platform’s own colour tokens', () => {
    const doc = buildDashboard(SPECIALTY_BLUEPRINTS.sre, words());
    const first = banners(doc)[0];
    expect(first?.heading).toBe('1. pulse');
    const settings = first?.tile.type === 'data' ? first.tile.visualizationSettings : undefined;
    expect(settings?.singleValue).toMatchObject({ prefixIcon: 'HeartIcon', isIconVisible: true, colorThresholdTarget: 'background', labelMode: 'none' });
    expect(JSON.stringify(settings?.coloring)).toMatch(/var\(--dt-colors-charts-categorical-themed-blue-steel-color-04-default, #[0-9a-f]{6}\)/);
    // Every section of every dashboard names an icon of its own.
    for (const id of SPECIALTY_IDS) {
      for (const section of SPECIALTY_BLUEPRINTS[id].sections) expect(SPECIALTY_BLUEPRINTS[id].icons?.[section], `${id}.${section}`).toBeDefined();
    }
  });

  it('shows the security dashboard whole even when the tenant proved nothing (3.6.7’s gate left it empty)', () => {
    const doc = buildDashboard(SPECIALTY_BLUEPRINTS.security, words());
    expect(banners(doc).map((banner) => banner.heading)).toEqual(['1. posture', '2. distribution', '3. queue', '4. context', '5. technology']);
    const titles = Object.values(doc.tiles).flatMap((tile) => (tile.type === 'data' && tile.title !== '' ? [tile.title] : []));
    expect(titles).toEqual(expect.arrayContaining(['secCritical', 'secHigh', 'secByLevel', 'secByTechnology', 'techVersions']));
  });

  it('opens the logs dashboard on the last 2 hours and labels every sampled read “1:100”', () => {
    const doc = buildDashboard(SPECIALTY_BLUEPRINTS.logs, words());
    expect(doc.settings?.defaultTimeframe?.value).toEqual({ from: 'now()-2h', to: 'now()' });
    for (const key of ['logStatusTrend', 'logTracePct', 'logServicePct', 'logExceptions', 'logHiddenErrors', 'logSources'] as const) {
      expect(entryFor(`dash2.tile.${key}`).en, key).toContain('1:100');
      expect(entryFor(`dash2.tile.${key}`)['pt-BR'], key).toContain('amostra 1:100');
    }
  });

  it('places the SLOs on the platform’s SLO tiles, or a note until they are created', () => {
    const none = buildDashboard(SPECIALTY_BLUEPRINTS.overview, words({ sloNone: 'Create the SLOs first' }));
    expect(Object.values(none.tiles).some((tile) => tile.type === 'markdown' && tile.content.includes('Create the SLOs first'))).toBe(true);
    expect(Object.values(none.tiles).some((tile) => tile.type === 'slo')).toBe(false);

    const slos = [
      { id: 'slo-1', name: 'Availability — checkout' },
      { id: 'slo-2', name: 'Host CPU' },
      { id: 'slo-3', name: 'Kubernetes restarts' },
      { id: 'slo-4', name: 'Performance — checkout' },
    ];
    const withSlos = buildDashboard(SPECIALTY_BLUEPRINTS.overview, words({ slos, sloNone: 'Create the SLOs first' }));
    const tiles = Object.entries(withSlos.tiles).filter(([, tile]) => tile.type === 'slo');
    expect(tiles.map(([, tile]) => (tile.type === 'slo' ? tile.input : ''))).toEqual(['slo-1', 'slo-2', 'slo-3', 'slo-4']);
    // Three to a row, under the SLO banner, before the pulse.
    const layouts = tiles.map(([id]) => withSlos.layouts[id]);
    expect(layouts.map((layout) => layout?.w)).toEqual([8, 8, 8, 8]);
    expect(layouts[3]?.y).toBeGreaterThan(layouts[0]?.y ?? 0);
    expect(banners(withSlos)[0]?.heading).toBe('1. slos');
  });
});

describe('the overview on the PoC Builder', () => {
  it('takes the place of “Value of the PoC”, kept in the code only until a later release', () => {
    expect(SPECIALTY_IDS[0]).toBe('overview');
    const builder = readFileSync(join(__dirname, '..', 'pages', 'PocBuilder.tsx'), 'utf8');
    expect(builder).not.toMatch(/import[^;]*(PocDashboardSection|POC_BLUEPRINT)/);
    expect(builder).not.toMatch(/<PocDashboardSection/);
    const section = readFileSync(join(__dirname, '..', 'features', 'dashboard', 'PocDashboardSection.tsx'), 'utf8');
    expect(section).toMatch(/RETIRED FROM THE BUILDER in 3\.7\.1/);
    expect(entryFor('dash3.overview.name')['pt-BR']).toBe('Saúde do ambiente e SLOs'); // renamed in 3.7.7
  });
});

describe('the notebook and the launchpad', () => {
  it('opens the notebook with its charts already chosen', () => {
    // 3.7.2: every step names its own visualization (the golden signals: single values, a health map, lines and bars).
    const notebook = buildInvestigationNotebook({ title: 't', intro: 'i', chapter: (key, n) => ({ title: `${n}. ${key}`, why: 'w' }), tile: (key) => key, footer: 'f' });
    const queries = notebook.sections.filter((section) => section.type === 'dql');
    expect(queries.length).toBe(NOTEBOOK_STEPS.length);
    for (const query of queries) expect(query.state?.visualizationSettings.autoSelectVisualization).toBe(false);
    expect(NOTEBOOK_STEPS.filter((step) => step.visual !== 'table').length).toBeGreaterThanOrEqual(10);
  });

  it('builds a launchpad the platform accepts: a layout weight and an id of the expected shape on every block', () => {
    const launchpad = buildPocLaunchpad({
      title: 't',
      intro: 'i',
      appIcon: '/platform/app-engine/registry/v1/app-icons/my.poc.automation',
      groups: [{ heading: 'Dashboards', description: 'd', items: [{ title: 'Overview', description: 'd', documentId: 'x', category: 'dashboards' }] }],
      footer: 'f',
    });
    expect(launchpad.containerList.containers[0]?.horizontalLayoutWeight).toBe(1);
    const ids = (launchpad.containerList.containers[0]?.blocks ?? []).flatMap((block) => [block.id, ...(block.type === 'links' ? block.content.map((link) => link.id) : [])]);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(ids.length);
    expect(launchpadId(26)).toBe('00000000-0000-4000-8000-00000000001a');
  });
});

describe('the triage workflow', () => {
  it('comes from the Builder with its problem trigger on', () => {
    const kit = readFileSync(join(__dirname, '..', 'features', 'builder', 'PocAutomationKits.tsx'), 'utf8');
    expect(kit).toMatch(/recipients\.valid,[^,]*\n\s*true,/);
    const body = buildTriageWorkflow({ title: 't', description: 'd', triageDescription: 'x', taskDescription: 'y' }, ['team@example.com'], true, true);
    expect(body.trigger.eventTrigger.isActive).toBe(true);
    expect(entryFor('builder.wf.step3')['pt-BR']).toContain('gatilho de problemas já ligado');
  });

  it('writes the e-mail in Markdown sections, without an emoji (3.7.7)', () => {
    const incident = {
      eventId: 'e',
      displayId: 'P-1',
      name: 'Failure rate increase',
      category: 'ERROR',
      status: 'ACTIVE',
      rootCauseId: 'SERVICE-1',
      rootCauseName: 'checkout',
      affectedCount: 7,
      affectedNames: ['a', 'b', 'c', 'd', 'e', 'f'],
      clusters: ['prod'],
      namespaces: ['shop'],
      workloads: ['checkout'],
    } as unknown as RcaIncident;
    const text = triageSummary(incident, null, [{ name: 'frontend', failures: 3, requests: 90 }] as never, { problem: 'https://x/p', app: 'https://x/a' }, 'pt-BR');
    // 3.7.7 (the owner: no emoji, "mais formal ao cliente"): Markdown headings, lists and a rule before the links.
    const lines = text.split('\n');
    expect(lines[0]).toBe('## P-1 · Failure rate increase');
    expect(lines).toContain('| **Categoria** | ERROR |');
    expect(lines).toContain('> ● Aberto · causa raiz **checkout** · 7 entidades atingidas');
    expect(lines.filter((line) => line.startsWith('### '))).toEqual(['### Causa raiz', '### Alcance — 7 entidades', '### Logs em torno do incidente', '### Quem chama checkout', '### Links']);
    expect(text).toContain(TRIAGE_RULE);
    expect(lines).toContain('- e mais 2');
    expect(lines).toContain('| **Kubernetes** | prod / shop / checkout |');
    expect(lines).toContain('| frontend | 3 | 90 |');
    expect(lines[lines.length - 1]).toMatch(/^_Lido pela ação de triagem/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('the words', () => {
  it('no longer asks “A que horas dói”', () => {
    for (const key of ALL_KEYS) expect(entryFor(key)['pt-BR'], key).not.toMatch(/que horas dói|está doendo/);
    expect(entryFor('cockpit.heat.title')['pt-BR']).toBe('Quando os problemas acontecem — por dia e faixa de 6 horas');
  });

  it('keeps 3.7.1 among the ten releases', () => {
    // 3.7.2: newer releases come first.
    expect(WHATS_NEW).toContainEqual({ key: 'help.whatsNew.i113', published: '2026-11-22' });
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i113').en.startsWith('3.7.1 — ')).toBe(true);
    expect(entryFor('help.whatsNew.title').en).toBe('What’s new in 3.8');
  });
});

describe('the banner colours', () => {
  it('keeps the logs and security banners in calm tones, never the orange or red that read as a problem', () => {
    const colour = (id: 'logs' | 'security') => JSON.stringify(SPECIALTY_BLUEPRINTS[id].banner);
    expect(colour('logs')).toContain('categorical-themed-tide-color-04');
    expect(colour('security')).toContain('categorical-themed-blue-steel-color-06');
    for (const id of SPECIALTY_IDS) expect(JSON.stringify(SPECIALTY_BLUEPRINTS[id].banner), id).not.toMatch(/status-critical|status-warning|categorical-color-1[24]-/);
  });
});
