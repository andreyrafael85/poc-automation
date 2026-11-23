import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import {
  AI_ACTION,
  aiAnswer,
  buildTriageWorkflow,
  buildWeeklyWorkflow,
  TRIAGE_RESULT,
  WEEKLY_ACTION,
  WEEKLY_CRON,
} from '../features/builder/pocAutomation';
import { buildDetector, buildLogLevelPipeline, DETECTOR_KINDS, detectorQuery, LOG_LEVEL_MATCHER } from '../features/builder/pocSettings';
import { TRIAGE_RULE } from '../features/triage/triage';
import { change, runWeekly, weekFigures } from '../features/weekly/weekly';
import { entryFor, type StringKey } from '../i18n/strings';
import { parsePocPlan } from '../models/pocPlan';
import { getQuery } from '../queries/catalog';

/**
 * 3.7.4 (the owner: "Seguir com a 3.7.4, porém valide estes pontos antes da 3.7.3"): Settings' buttons visible in the dark
 * theme and the readiness without the retired dashboard; the triage e-mail with the problem first and Dynatrace Assist
 * after it; the PoC Builder one subject per tab, with the weekly summary, anomaly detectors on the golden signals and an
 * OpenPipeline pipeline for logs without a level; and every text the Builder writes in the app's own language.
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');
const root = (path: string) => readFileSync(join(__dirname, '..', '..', '..', path), 'utf8');
const SERVICE = `SERVICE-${'A'.repeat(16)}`;

describe('Settings', () => {
  it('gives the two buttons a filled background and counts a dashboard of the PoC Builder, not the retired one', () => {
    const settings = read('pages/Settings.tsx');
    expect(settings).toMatch(/variant="accent"\s+color="primary"[\s\S]{0,200}data-testid="settings-apply-all"/);
    expect(settings).toMatch(/variant="emphasized"\s+color="neutral"[\s\S]{0,200}data-testid="settings-discard"/);
    // 3.7.7: the readiness moved to features/setup/readiness.ts (shared with the first-run wizard).
    const readiness = read('features/setup/readiness.ts');
    expect(readiness).toContain("dashboard: 'settings.ready.builderDashboards'");
    expect(readiness).toContain('pocPlan.specialtyDashboards');
    expect(settings).toContain('useReadiness()');
    expect(entryFor('settings.ready.builderDashboards').en).toBe('A dashboard created on the PoC Builder');
  });
});

describe('the triage e-mail', () => {
  it('opens with the problem and gives Dynatrace Assist’s reading after it, without the AI’s own note', () => {
    const body = buildTriageWorkflow(
      { title: 't', description: 'd', triageDescription: 'x', taskDescription: 'y', aiDescription: 'ai', aiPrompt: 'p', aiHeading: '🤖 DYNATRACE ASSIST' },
      ['team@example.com'],
      true,
      true,
      'en',
    );
    const content = String(body.tasks['notify_team']?.input['content']);
    // 3.7.6: the problem's sections first, the AI's reading next, the links and the footer last.
    expect(content.startsWith(TRIAGE_RESULT.body)).toBe(true);
    expect(content.indexOf('🤖 DYNATRACE ASSIST')).toBeGreaterThan(content.indexOf(TRIAGE_RULE));
    // A note the AI appends after a "---" rule (the language-support line) is cut.
    expect(aiAnswer('dynatrace_assist')).toBe('{{ (result("dynatrace_assist").text | default("—")).split("---")[0] | trim }}');
    expect(content.indexOf(aiAnswer('dynatrace_assist'))).toBeLessThan(content.indexOf(TRIAGE_RESULT.closing));
    expect(content.endsWith(TRIAGE_RESULT.closing)).toBe(true);
  });
});

describe('the weekly summary', () => {
  it('is a Monday schedule: the app’s action, then Dynatrace Assist, then the e-mail with the summary first', () => {
    const body = buildWeeklyWorkflow(
      { title: 'W', description: 'd', weeklyDescription: 'w', aiDescription: 'a', aiPrompt: 'prompt', aiHeading: '🤖 H', taskDescription: 'e' },
      ['team@example.com'],
      true,
      false,
      'en',
      'Acme',
      'America/Sao_Paulo',
    );
    expect(body.trigger.schedule).toMatchObject({ isActive: true, timezone: 'America/Sao_Paulo', trigger: { type: 'cron', cron: WEEKLY_CRON } });
    expect(WEEKLY_CRON).toBe('0 9 * * 1');
    expect(body.isPrivate).toBe(true);
    expect(body.tasks['poc_weekly']).toMatchObject({ action: WEEKLY_ACTION, input: { customer: 'Acme', language: 'en' } });
    expect(body.tasks['weekly_assist']).toMatchObject({ action: AI_ACTION, predecessors: ['poc_weekly'], conditions: { states: { poc_weekly: 'OK' } } });
    expect(body.tasks['notify_team']).toMatchObject({ predecessors: ['weekly_assist'], conditions: { states: { weekly_assist: 'ANY' } } });
    const content = String(body.tasks['notify_team']?.input['content']);
    expect(content.startsWith('{{ result("poc_weekly")["body"] }}')).toBe(true);
    expect(content.endsWith('{{ result("poc_weekly")["closing"] }}')).toBe(true);
    expect(content.indexOf(aiAnswer('weekly_assist'))).toBeLessThan(content.indexOf('["closing"]'));
  });

  it('declares its action in the manifest beside the triage’s', () => {
    const manifest = JSON.parse(root('app.config.json')) as { app: { actions: { name: string; title: string }[] } };
    expect(manifest.app.actions.map((action) => action.name)).toEqual(['poc-triage', 'poc-weekly']);
    expect(root('actions/poc-weekly.action.ts')).toContain("from '../ui/app/features/weekly/weekly'");
  });

  it('reads the week against the week before through the catalog, and leaves out what it could not read', async () => {
    const calls: string[] = [];
    const now = Date.UTC(2026, 10, 23, 9);
    const result = await runWeekly(
      { customer: 'Acme', language: 'en' },
      {
        environmentUrl: 'https://abc.apps.dynatrace.com/',
        appId: 'my.poc.automation',
        now,
        query: (id, dql, window) => {
          calls.push(`${id}@${window.startIso.slice(0, 10)}`);
          expect(dql).toBe(getQuery(id).dql);
          const thisWeek = window.endIso.startsWith('2026-11-23');
          if (id === 'prob.summary')
            return Promise.resolve([
              { 'event.category': 'ERROR', 'event.status': 'CLOSED', problems: thisWeek ? 8 : 10 },
              { 'event.category': 'ERROR', 'event.status': 'ACTIVE', problems: 2 },
            ]);
          if (id === 'prob.mttx') return Promise.resolve([{ problems: thisWeek ? 8 : 10, totalNs: (thisWeek ? 8 : 20) * 3600e9 }]);
          if (id === 'prob.mttx.rca') return Promise.reject(new Error('refused'));
          if (id === 'svc.ranking') return Promise.resolve([{ name: 'checkout', failureRatePct: 4.2, totalRequests: 900 }, { name: 'quiet', failureRatePct: 9, totalRequests: 3 }]);
          return Promise.resolve([]);
        },
      },
    );
    expect(calls).toEqual([
      'prob.summary@2026-11-16',
      'prob.mttx@2026-11-16',
      'prob.mttx.rca@2026-11-16',
      'prob.summary@2026-11-09',
      'prob.mttx@2026-11-09',
      'prob.mttx.rca@2026-11-09',
      'prob.recurrent@2026-11-16',
      'svc.ranking@2026-11-16',
    ]);
    expect(result.thisWeek).toMatchObject({ problems: 10, open: 2, closed: 8, rootCausePct: null });
    expect(result.lastWeek.problems).toBe(12);
    // A service with too little traffic is not a failing service.
    expect(result.failing.map((row) => row.name)).toEqual(['checkout']);
    // 3.7.6: no link to the app (the customer has no access to it) — the Problems app instead.
    expect(result.appLink).toBe('https://abc.apps.dynatrace.com');
    expect(result.closing).toContain('https://abc.apps.dynatrace.com/ui/apps/dynatrace.davis.problems/');
    expect(result.summary).not.toContain('my.poc.automation');
    expect(result.subject).toContain('Acme');
    expect(result.subject).toContain('10 problems');
    expect(result.summary).toContain(TRIAGE_RULE);
    expect(result.summary).toContain('checkout');
  });

  it('says a change only when both weeks were measured', () => {
    expect(change(10, 12, 'count')).toBe('−2');
    expect(change(12, 10, 'percent')).toBe('+20 %');
    expect(change(10, 10, 'count')).toBe('=');
    expect(change(null, 10, 'count')).toBe('');
    expect(weekFigures(null, null, null)).toEqual({ problems: null, open: null, closed: null, mttrNs: null, rootCausePct: null });
  });
});

describe('the anomaly detectors on the golden signals', () => {
  const words = { title: 'T', description: 'D', eventName: 'E', eventDescription: 'ED' };

  it('watches only real service ids, one series per service, run as the SE', () => {
    expect(detectorQuery('failureRate', [SERVICE, 'x"); drop'])).toContain(`array("${SERVICE}")`);
    expect(detectorQuery('failureRate', [SERVICE, 'x"); drop'])).not.toContain('drop');
    expect(buildDetector('traffic', [SERVICE], words, '')).toBeNull();
    expect(buildDetector('traffic', ['nope'], words, 'user-1')).toBeNull();
    const kinds = DETECTOR_KINDS.map((kind) => buildDetector(kind, [SERVICE], words, 'user-1'));
    expect(kinds.map((value) => (value?.['analyzer'] as { name: string }).name.split('.').pop())).toEqual([
      expect.stringMatching(/^StaticThreshold/),
      expect.stringMatching(/^AutoAdaptive/),
      expect.stringMatching(/^AutoAdaptive/),
    ]);
    const conditions = kinds.map((value) => (value?.['analyzer'] as { input: { key: string; value: string }[] }).input.find((input) => input.key === 'alertCondition')?.value);
    expect(conditions).toEqual(['ABOVE', 'ABOVE', 'BELOW']);
    expect(kinds[0]).toMatchObject({ executionSettings: { actor: 'user-1' }, source: 'PoC Automation (poc-automation)' });
  });
});

describe('the OpenPipeline pipeline', () => {
  it('gives a level only to records without one, and holds no route', () => {
    const value = buildLogLevelPipeline('Name', 'Processor');
    const processor = (value['processing'] as { processors: { matcher: string; dql: { script: string } }[] }).processors[0];
    expect(processor?.matcher).toBe(LOG_LEVEL_MATCHER);
    expect(processor?.dql.script).toContain('"ERROR"');
    expect(JSON.stringify(value)).not.toMatch(/routing|routes/i);
    expect(getQuery('log.levels.preview').guards).toMatchObject({ scanLimitGbytes: 1, maxResultRecords: 1 });
  });
});

describe('the PoC Builder, one subject per tab', () => {
  it('has a tab for SLOs, Workflows, Synthetic, OpenPipeline and Anomaly detection, and the plan keeps what they create', () => {
    const builder = read('pages/PocBuilder.tsx');
    for (const key of ['slos', 'workflows', 'synthetic', 'openpipeline', 'anomaly']) expect(builder).toContain(`builder.tab.${key}`);
    expect(read('features/builder/PocAutomationKits.tsx')).toContain("t('builder.mon.fromSettings'");
    // Both ends say where the main address comes from and where it goes.
    expect(read('pages/Settings.tsx')).toContain("t('settings.customer.urlUse')");
    const plan = parsePocPlan({
      detectors: [{ id: `det-${'a'.repeat(60)}`, name: 'd', kind: 'traffic', createdAt: '2026-11-23T00:00:00Z' }],
      pipeline: { id: `pipe-${'b'.repeat(60)}`, name: 'p', createdAt: '2026-11-23T00:00:00Z' },
    });
    expect(plan.detectors?.[0]?.kind).toBe('traffic');
    expect(plan.pipeline?.name).toBe('p');
  });
});

describe('an SE or partner working in English', () => {
  // Every text the Builder writes on the tenant (dashboards, notebook, launchpad, SLOs, workflows, monitors, detectors and
  // the pipeline) comes from a dictionary key in the app's language; the workflow actions write in the language the
  // workflow passes them. So the English side of each of those keys must be English.
  const PORTUGUESE = /[ãõçáéíóúâêô]|\b(não|para|dos|das|sem|está|você|então|serviços|problemas)\b/i;
  const builderFiles = [
    'pages/PocBuilder.tsx',
    'features/builder/PocAutomationKits.tsx',
    'features/builder/PocSettingsKits.tsx',
    'features/builder/PocDocumentKit.tsx',
    'features/dashboard/SpecialtyDashboards.tsx',
  ];

  it('writes every Builder text in English when the app is in English', () => {
    const keys = new Set<string>();
    for (const file of builderFiles) for (const match of read(file).matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) keys.add(match[1] ?? '');
    expect(keys.size).toBeGreaterThan(80);
    const offenders = [...keys].filter((key) => key !== '' && PORTUGUESE.test(entryFor(key as StringKey).en));
    expect(offenders).toEqual([]);
  });

  it('asks Dynatrace Assist to answer in English and the actions to write English', async () => {
    expect(entryFor('builder.wf.aiPrompt').en).toContain('Answer in English');
    expect(entryFor('builder.weekly.aiPrompt').en).toContain('Answer in English');
    const result = await runWeekly({ customer: 'Acme', language: 'en' }, { environmentUrl: 'https://abc.apps.dynatrace.com', appId: 'a', query: () => Promise.resolve([]) });
    expect(result.summary).not.toMatch(PORTUGUESE);
    expect(result.subject).not.toMatch(PORTUGUESE);
  });

  it('builds the Builder’s generated words from the screen’s language, never a fixed one', () => {
    const kits = read('features/builder/PocAutomationKits.tsx');
    expect(kits.match(/locale === 'pt-BR' \? 'pt-BR' : 'en'/g)?.length).toBe(2);
  });
});

describe('What’s new', () => {
  it('keeps 3.7.4 among the ten releases', () => {
    expect(WHATS_NEW).toContainEqual({ key: 'help.whatsNew.i116', published: '2026-11-23' });
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i116').en.startsWith('3.7.4 — ')).toBe(true);
  });
});
