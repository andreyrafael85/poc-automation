import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { EXECUTIVE_HIDDEN_ROUTES, STORY_STAGES, stageOf } from '../config/navigation';
import { BRAND_COLOR, BRAND_TONES } from '../design/palette';
import { centerFontSize } from '../engine/strato/StratoDonut';
import { PROBE_WORDS, buildDetector, checkActor, eventTemplateMap, serviceUsersLink } from '../features/builder/pocSettings';
import { bannerFor } from '../features/dashboard/dashboardLogo';
import { buildDashboard, bannerHeading } from '../features/dashboard/pocDashboard';
import { SPECIALTY_BLUEPRINTS } from '../features/dashboard/blueprints';
import { readinessSteps, requiredSteps } from '../features/setup/readiness';
import { entryFor } from '../i18n/strings';
import { parsePocPlan } from '../models/pocPlan';

/**
 * 3.8.1 — the owner's validation of 3.8.0: the service user set in Settings (the check no longer sends an empty event
 * description), the customer's brand colour on the dashboards' banners, AI Observability in proportion, seven menu stages.
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');
const ACTOR = '00000000-1111-4222-8333-444455556666';

describe('the service user (3.8.1)', () => {
  it('is checked with every field of the probe filled — an empty event description was what the platform refused', async () => {
    for (const value of [PROBE_WORDS.title, PROBE_WORDS.description, PROBE_WORDS.eventName, PROBE_WORDS.eventDescription]) expect(value.trim()).not.toBe('');
    const probe = buildDetector('traffic', [], PROBE_WORDS, ACTOR) as Record<string, unknown>;
    for (const value of Object.values(eventTemplateMap(probe))) expect(value.trim()).not.toBe('');
    expect(await checkActor('not an id')).toBe('not-an-id');
  });

  it('opens the account’s service users when the account UUID is known, else Account Management', () => {
    expect(serviceUsersLink(ACTOR)).toBe(`https://myaccount.dynatrace.com/account/iam/service-user-management?account-uuid=${ACTOR}`);
    expect(serviceUsersLink(undefined)).toBe('https://myaccount.dynatrace.com/');
    expect(serviceUsersLink('nope')).toBe('https://myaccount.dynatrace.com/');
    expect(parsePocPlan({ accountUuid: ACTOR.toUpperCase() }).accountUuid).toBe(ACTOR);
    expect(parsePocPlan({ accountUuid: 'x' }).accountUuid).toBeUndefined();
  });

  it('is a step of the preparation for the SE (8 steps, 6 asked), set in Settings → PoC plan', () => {
    const saved = { customerName: 'Acme', customerLogoDataUrl: null, pocDescription: '', scopeDescription: '', startDate: null, endDate: null, criteria: 0, dashboards: 0, ratePerHour: null };
    const se = readinessSteps({ ...saved, serviceUser: ACTOR }, { canManageAccess: true, commercialVisible: true });
    expect(se).toHaveLength(8);
    expect(se.find((step) => step.key === 'serviceUser')).toEqual({ key: 'serviceUser', done: true, path: '/settings?tab=plan' });
    expect(requiredSteps(8)).toBe(6);
    expect(readinessSteps(saved, { canManageAccess: false, commercialVisible: false }).some((step) => step.key === 'serviceUser')).toBe(false);
    const settings = read('pages/Settings.tsx');
    expect(settings).toContain('<ServiceUserPicker');
    // Apply never overwrites what the service-user panel saved.
    expect(settings).toContain('detectorActor: pocPlan.detectorActor, detectorActorName: pocPlan.detectorActorName, accountUuid: pocPlan.accountUuid');
    expect(read('features/builder/PocSettingsKits.tsx')).toContain('data-testid="builder-ad-actor-settings"');
  });
});

describe('the customer’s brand colour on the dashboards (3.8.1)', () => {
  it('paints every section banner, and the "Default" tone keeps each dashboard’s own', () => {
    expect(bannerFor('default')).toBeUndefined();
    expect(bannerFor('orange')).toBe(BRAND_COLOR.orange);
    const words = {
      title: 'T',
      intro: 'I',
      question: 'Q',
      objectivesTitle: '',
      objectives: [],
      sectionTitle: (section: string) => section,
      footer: 'F',
      tileTitle: (key: string) => key,
      evidence: new Set<never>(),
    };
    const banners = (banner?: string) => {
      const doc = buildDashboard(SPECIALTY_BLUEPRINTS.sre, { ...words, ...(banner === undefined ? {} : { banner }) });
      return Object.values(doc.tiles)
        .filter((tile) => bannerHeading(tile) !== null)
        .map((tile) => JSON.stringify(tile));
    };
    const orange = banners(BRAND_COLOR.orange);
    expect(orange.length).toBeGreaterThan(0);
    for (const tile of orange) expect(tile).toContain(BRAND_COLOR.orange);
    for (const tile of banners()) expect(tile).not.toContain(BRAND_COLOR.orange);
  });

  it('offers two more colours, navy and green, from the platform’s own tokens', () => {
    expect(BRAND_TONES).toEqual(expect.arrayContaining(['navy', 'green']));
    expect(BRAND_COLOR.navy).toMatch(/^var\(--dt-colors-charts-sequential-blue-color-02-default/);
    expect(BRAND_COLOR.green).toMatch(/^var\(--dt-colors-charts-sequential-pear-color-05-default/);
    expect(entryFor('settings.brand.navy')['pt-BR']).toBe('Azul-marinho');
    expect(entryFor('settings.brand.green')['pt-BR']).toBe('Verde');
  });
});

describe('AI Observability in proportion (3.8.1)', () => {
  it('draws tokens over time across the page, then three panels side by side, then the tables', () => {
    const page = read('pages/AiObservability.tsx');
    expect(page).not.toContain('CockpitRow');
    const trio = page.indexOf('className="pvs-ai-trio"');
    expect(page.indexOf('data-testid="ai-cockpit"')).toBeLessThan(trio);
    expect(trio).toBeLessThan(page.indexOf('data-testid="ai-models"'));
    expect(page.indexOf('data-testid="ai-models"')).toBeLessThan(page.indexOf("t('p.ai.table.title')"));
    expect(read('pages/aiObservability.css')).toMatch(/\.pvs-ai-trio \{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  });

  it('fits a donut’s total in its ring', () => {
    expect(centerFontSize('298,1 mi', 180)).toBeLessThanOrEqual(21);
    expect(centerFontSize('298,1 mi', 180) * 0.6 * 8).toBeLessThanOrEqual(180 * 0.55);
    expect(centerFontSize('695', 220)).toBe(28);
    expect(centerFontSize('1.234.567.890 mi', 120)).toBe(14);
  });
});

describe('the menu in seven stages (3.8.1)', () => {
  it('moves the Executive summary to Demonstrated value and Consumption and Licensing to Recommendations', () => {
    expect(STORY_STAGES.map((stage) => stage.id)).toEqual(['context', 'objectives', 'coverage', 'evidence', 'value', 'recommendations', 'manage']);
    expect(STORY_STAGES.find((stage) => stage.id === 'value')?.routes).toEqual(['/executive', '/value', '/report']);
    expect(STORY_STAGES.find((stage) => stage.id === 'recommendations')?.routes).toEqual(['/opportunities', '/consumption', '/licensing']);
    expect(stageOf('/executive')?.position).toBe(5);
    expect(stageOf('/licensing')?.position).toBe(6);
    expect(STORY_STAGES.filter((stage) => stage.routes.every((route) => EXECUTIVE_HIDDEN_ROUTES.has(route))).map((stage) => stage.id)).toEqual(['manage']);
    expect(entryFor('story.map.subtitle')['pt-BR']).toMatch(/^Sete etapas/);
  });
});

describe('What’s new (3.8.1)', () => {
  it('opens on 3.8.1 and keeps ten', () => {
    expect(WHATS_NEW[2]).toEqual({ key: 'help.whatsNew.i123', published: '2026-11-27' }); // 3.8.3 and 3.8.2 open it now
    expect(WHATS_NEW).toHaveLength(10);
    expect(entryFor('help.whatsNew.i123').en.startsWith('3.8.1 — ')).toBe(true);
    expect(entryFor('help.whatsNew.i123')['pt-BR'].startsWith('3.8.1 — ')).toBe(true);
  });
});
