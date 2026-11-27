import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { NAVIGATION, STORY_STAGES } from '../config/navigation';
import type { AssessmentSignals } from '../features/assessment/findings';
import { ValueCycle } from '../features/assessment/ValueCycle';
import { CYCLE_LINKS, parseAutonomyTarget, RING_LINKS, valueCycle, type CycleExtras } from '../features/assessment/valueCycle';
import { ALL_KEYS, entryFor } from '../i18n/strings';
import { parsePocPlan } from '../models/pocPlan';
import { EN_TEXT } from '../features/insights/deriveInsights';

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');

const SIGNALS: AssessmentSignals = {
  hostModes: { fullStack: 30, infra: 10, other: 2, unknown: 0 },
  servicesInModel: 70,
  servicesWithTraffic: 70,
  servicesAboveOnePct: 5,
  clusters: 3,
  clustersWithMetrics: 3,
  webApps: 4,
  frontendsWithRealUsers: 4,
  syntheticMonitors: 6,
  publicDomainServices: 0,
  bizEvents: 1200,
  saturatedHosts: 2,
  resolved: { problems: 6842, meanHours: 6.9 },
  logRecords: 1000,
  logRecordsWithContext: 310,
  topology: { hubs: [], services: 70, isolated: 3, dbServices: 4 },
  vulnerabilities: { total: 128, actNow: 4, critical: 2 },
  ownedServices: 10,
  thirdPartyTools: [],
  vitals: { measured: 4, poor: 1 },
  workflows: { workflows: 12, executions: 3700, succeeded: 3480 },
  cloudProviders: [],
};
const EXTRAS: CycleExtras = { dashboards: 2, slos: 3, monitors: 1, detectors: 0, pipeline: false, planDates: true, criteria: 5, aiServices: 3 };

describe('the Autonomous Value Cycle (3.7.9)', () => {
  it('counts the value events the reads prove, link by link, and turns the rest into next waves — never a level', () => {
    const cycle = valueCycle(SIGNALS, EXTRAS);
    expect(cycle.total).toBe(CYCLE_LINKS.reduce((sum, link) => sum + cycle.demonstrated[link], 0));
    expect(cycle.demonstrated.context).toBeGreaterThan(0);
    expect(cycle.events.find((event) => event.id === 'owners')?.state).toBe('next');
    expect(cycle.events.find((event) => event.id === 'detectors')?.state).toBe('next');
    expect(cycle.events.find((event) => event.id === 'slos')?.state).toBe('demonstrated');
    expect(cycle.rungs).toEqual(['observe', 'explain', 'prioritise', 'propose']);
    expect(cycle.lenses).toEqual({ ai: { services: 3 }, security: { total: 128, actNow: 4 } });
    // A read that did not answer leaves its event out (never a "not met").
    const unread = valueCycle({ ...SIGNALS, bizEvents: null, workflows: null }, EXTRAS);
    expect(unread.events.some((event) => event.id === 'business' || event.id === 'workflows')).toBe(false);
    expect(unread.rungs).toEqual(['observe', 'explain', 'prioritise']);
  });

  it('grows with what the PoC Builder creates', () => {
    const before = valueCycle(SIGNALS, { ...EXTRAS, slos: 0, dashboards: 0 }).total;
    expect(valueCycle(SIGNALS, EXTRAS).total).toBeGreaterThan(before);
  });

  it('draws the ring, the ladder with the agreed target and the cards; Professional Services only when asked', () => {
    const cycle = valueCycle(SIGNALS, EXTRAS);
    const { container, rerender } = render(<ValueCycle reading={cycle} t={EN_TEXT.t} formatNumber={EN_TEXT.formatNumber} showServices target="propose" />);
    expect(container.querySelectorAll('.pvs-cycle__arc')).toHaveLength(RING_LINKS.length);
    expect(container.querySelector('[data-testid="cycle-total"]')?.textContent).toBe(String(cycle.total));
    expect(container.querySelector('.pvs-cycle__rung[data-target="true"]')?.textContent).toContain('Propose');
    expect(container.querySelectorAll('[data-testid^="cycle-card-"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-testid^="cycle-ps-"]')).toHaveLength(6);
    rerender(<ValueCycle reading={cycle} t={EN_TEXT.t} formatNumber={EN_TEXT.formatNumber} showServices={false} target={null} />);
    expect(container.querySelectorAll('[data-testid^="cycle-ps-"]')).toHaveLength(0);
  });

  it('keeps the agreed target in the PoC plan (no new App State key), and nothing else', () => {
    expect(parsePocPlan({ autonomyTarget: 'prioritise' }).autonomyTarget).toBe('prioritise');
    expect(parsePocPlan({ autonomyTarget: 'level 3' }).autonomyTarget).toBeUndefined();
    expect(parseAutonomyTarget('act')).toBe('act');
  });

  it('replaces the journey on the Coverage page, its card, the guide and the Tech Wrapup', () => {
    const page = read('pages/Assessment.tsx');
    expect(page).toContain('<ValueCycle');
    expect(page).not.toContain('<MaturityJourney');
    expect(page).toContain("label: t('cycle.kpi.label')");
    expect(read('features/assessment/personas.ts')).toContain("'asm.persona.fig.valueEvents'");
    expect(read('features/wrapup/assessmentSection.ts')).toContain("t('tw.asm.k.valueEvents')");
    expect(read('features/wrapup/captures.tsx')).toContain("captureId: 'assessment.cycle'");
    expect(read('tests/deckFingerprint.test.ts')).toContain('**3.7.9, `slides` / `package` / `preview`');
  });

  it('speaks of value, never of a step, a level or a reactive environment', () => {
    for (const key of ALL_KEYS.filter((name) => name.startsWith('cycle.') || name === 'asm.persona.fig.valueEvents' || name.startsWith('tw.asm.i.cycle'))) {
      expect(entryFor(key).en, key).not.toMatch(/\blevel\b|\bstep\b|reactive|not met|score/i);
      expect(entryFor(key)['pt-BR'], key).not.toMatch(/\bnível\b|\betapa\b|reativ|não atendid|nota\b/i);
    }
  });
});

describe('the menu in nine stages, and the Roadmap as the 30-60-90 action plan', () => {
  it('keeps Coverage and Platform adoption in stage 3, joins Discoveries and Evidence, and has no Roadmap page', () => {
    expect(STORY_STAGES.map((stage) => stage.id)).toEqual(['context', 'objectives', 'coverage', 'evidence', 'value', 'recommendations', 'manage'] /* 3.8.1: seven */);
    expect(STORY_STAGES.find((stage) => stage.id === 'coverage')?.routes).toEqual(['/coverage', '/adoption']);
    expect(STORY_STAGES.find((stage) => stage.id === 'evidence')?.routes).toEqual(expect.arrayContaining(['/problems', '/rca', '/topology', '/services', '/ai-observability', '/competitor']));
    expect(NAVIGATION.some((section) => section.route === '/roadmap')).toBe(false);
    expect(entryFor('stage.evidence')['pt-BR']).toBe('Evidências');
  });

  it('opens the plan as a tab of Opportunities, and sends /roadmap there', () => {
    expect(read('pages/ImprovementOpportunities.tsx')).toContain('<ActionPlan insights={insights}');
    expect(read('App.tsx')).toContain("<Route path=\"/roadmap\" element={<Navigate to={{ pathname: '/opportunities', search: '?tab=plan' }} replace />} />");
    expect(entryFor('p.opp.tab.plan')['pt-BR']).toBe('Plano de ação 30-60-90');
    for (const key of ['p.roadmap.title', 'nav.roadmap', 'p.roadmap.howToRead'] as const) expect(entryFor(key)['pt-BR'], key).not.toMatch(/roadmap/i);
  });
});

describe('What’s new', () => {
  it('keeps 3.7.9 among the ten, after 3.8.0', () => {
    expect(WHATS_NEW[4]?.key).toBe('help.whatsNew.i121'); // 3.8.3: after 3.8.3, 3.8.2, 3.8.1 and 3.8.0
    expect(WHATS_NEW).toHaveLength(10);
    expect(entryFor('help.whatsNew.i121').en).toMatch(/^3\.7\.9 — /);
  });
});
