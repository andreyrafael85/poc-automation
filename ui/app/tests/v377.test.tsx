import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { EMPTY_ACCESS, isEntryValid, MASTER_PASSWORD_VERSION, MASTER_VERIFIER, verifyPassword } from '../config/access';
import { EXECUTIVE_HIDDEN_ROUTES, STORY_STAGES } from '../config/navigation';
import { buildTriageWorkflow } from '../features/builder/pocAutomation';
import { readinessSteps, requiredSteps, SETUP_OPEN_ROUTES } from '../features/setup/readiness';
import { mdText, TRIAGE_RULE } from '../features/triage/triage';
import { runWeekly, weeklySummary } from '../features/weekly/weekly';
import { buildWeeklyNotebook, notebookLink, WEEKLY_NOTEBOOK_STEPS } from '../features/weekly/weeklyNotebook';
import { entryFor } from '../i18n/strings';
import { v370Strings } from '../i18n/v370';
import { v374Strings } from '../i18n/v374';
import { aiCallRows, aiCallTotals, aiTokenRows, aiTotals, tokensByModel } from '../models/aiObservability';
import { getQuery } from '../queries/catalog';

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');
const EMOJI = /\p{Extended_Pictographic}/u;

describe('the master password (3.7.7, the owner’s order)', () => {
  it('ships only its PBKDF2 verifier, never the password, and refuses anything else', async () => {
    expect(MASTER_VERIFIER.iterations).toBeGreaterThanOrEqual(600_000);
    expect(MASTER_VERIFIER.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(MASTER_VERIFIER.version).toBe(MASTER_PASSWORD_VERSION);
    expect(await verifyPassword('not the master password', MASTER_VERIFIER)).toBe(false);
    // The owner's password itself is never in the repository; a run that has it checks it from the environment only.
    const fromEnv = process.env['PVS_MASTER_PASSWORD'];
    if (fromEnv !== undefined && fromEnv !== '') expect(await verifyPassword(fromEnv, MASTER_VERIFIER)).toBe(true);
  });

  it('lets a partner in beside the SE’s own password, and keeps them in until the entry expires', () => {
    const context = read('config/AccessContext.tsx');
    expect(context).toContain('masterVerifier');
    const now = Date.parse('2026-11-24T12:00:00Z');
    const entry = { email: 'p@x.com', name: 'P', unlockedAt: '2026-11-24T10:00:00Z', expiresAt: '2026-11-29T10:00:00Z', passwordVersion: MASTER_PASSWORD_VERSION };
    expect(isEntryValid(entry, EMPTY_ACCESS, now)).toBe(true);
    expect(isEntryValid({ ...entry, expiresAt: '2026-11-24T11:00:00Z' }, EMPTY_ACCESS, now)).toBe(false);
  });
});

describe('the first-run wizard', () => {
  it('asks five of seven steps, the share kept when fewer are listed', () => {
    expect(requiredSteps(7)).toBe(5);
    expect(requiredSteps(6)).toBe(5);
    expect(requiredSteps(5)).toBe(4);
    const saved = { customerName: 'Acme', customerLogoDataUrl: null, pocDescription: '', scopeDescription: 'x', startDate: '2026-11-01', endDate: '2026-12-01', criteria: 0, dashboards: 0, ratePerHour: null };
    const se = readinessSteps(saved, { canManageAccess: true, commercialVisible: true });
    expect(se.map((step) => step.key)).toEqual(['customer', 'logo', 'description', 'dates', 'criteria', 'dashboard', 'rate']);
    expect(se.filter((step) => step.done)).toHaveLength(3);
    expect(readinessSteps(saved, { canManageAccess: false, commercialVisible: false })).toHaveLength(5);
  });

  it('shows the wizard instead of the pages while the PoC is prepared, Settings and the Builder open', () => {
    const app = read('App.tsx');
    expect(app).toMatch(/access\.canWork && !executiveMode && !readiness\.ready/);
    expect(app).toContain('<SetupWizard readiness={readiness} />');
    expect(SETUP_OPEN_ROUTES).toEqual(['/settings', '/builder']);
    for (const key of ['setup.title', 'setup.lead', 'setup.why.customer', 'setup.why.rate'] as const) expect(entryFor(key)['pt-BR']).not.toBe(entryFor(key).en);
  });
});

describe('the names the owner asked for', () => {
  it('Smart Dashboards, Environment health and SLOs, Consumption and events', () => {
    expect(entryFor('builder.tab.dashboards').en).toMatch(/^Smart Dashboards/);
    expect(entryFor('dash3.overview.name')['pt-BR']).toBe('Saúde do ambiente e SLOs');
    expect(entryFor('dash3.overview.name').en).toBe('Environment health and SLOs');
    expect(entryFor('p.cons.title')['pt-BR']).toBe('Consumo e eventos');
    expect(read('features/dashboard/SpecialtyDashboards.tsx')).toContain('Visão geral do ambiente e SLOs|Environment overview and SLOs');
  });

  it('keeps commercial words off the pages a customer may see', () => {
    for (const key of ['cockpit.cons.title', 'cons.unit.events', 'cons.f.empty', 'p.cons.title', 'p.cons.question', 'p.logs.band.ingestedDetail', 'cap.d.logs.total', 'exec.interp.downtime'] as const) {
      expect(entryFor(key)['pt-BR'], key).not.toMatch(/faturad|cobrad|faturamento/i);
      expect(entryFor(key).en, key).not.toMatch(/billed|billing|charged/i);
    }
  });
});

describe('the formal e-mails', () => {
  it('carry no emoji: Markdown headings, lists and tables instead', () => {
    for (const [key, entry] of Object.entries({ ...v370Strings, ...v374Strings })) {
      if (!key.startsWith('triage.') && !key.startsWith('weekly.')) continue;
      expect(entry.en, key).not.toMatch(EMOJI);
      expect(entry['pt-BR'], key).not.toMatch(EMOJI);
    }
    for (const key of ['builder.wf.aiHeading', 'builder.wf.aiPrompt', 'builder.weekly.aiPrompt'] as const) expect(entryFor(key)['pt-BR'], key).not.toMatch(EMOJI);
    expect(entryFor('builder.wf.aiPrompt').en).toContain('no emoji');
    expect(TRIAGE_RULE).toBe('\n\n---\n\n');
    expect(mdText('a|b *c*')).toBe('a\\|b \\*c\\*');
  });

  it('send the week as tables, the week before beside it', () => {
    const week = { problems: 10, open: 2, closed: 8, mttrNs: 3.6e12, rootCausePct: 25 };
    const text = weeklySummary(
      { thisWeek: week, lastWeek: { ...week, problems: 8, rootCausePct: 20 }, recurring: [{ name: 'OOM', occurrences: 4, rootCause: null }], failing: [], appLink: 'x', links: { problems: 'https://t/p', dashboard: null } },
      'Acme',
      'en',
      '2026-11-16',
      '2026-11-23',
    );
    expect(text).toContain('| Indicator | This week | Week before | Change |');
    expect(text).toContain('| Problems | 10 | 8 | ▲ +2 · worse |');
    expect(text).toContain('| Closed with a root cause named by Dynatrace Intelligence | 25% | 20% | ▲ +5 pp · better |');
    expect(text).toContain('| OOM | 4 | not named yet |');
    expect(text).not.toMatch(EMOJI);
    const body = buildTriageWorkflow({ title: 't', description: 'd', triageDescription: 'x', taskDescription: 'y', aiDescription: 'a', aiPrompt: 'p', aiHeading: '### H' }, ['a@b.com'], true, true, 'en');
    expect(String(body.tasks['notify_team']?.input['content'])).toContain(`${TRIAGE_RULE}### H\n\n`);
  });
});

describe('the weekly report notebook', () => {
  it('reads the same week with catalog entries or validated queries, and keeps its week (absolute timeframe)', () => {
    const notebook = buildWeeklyNotebook('## T', { startIso: '2026-11-16T09:00:00.000Z', endIso: '2026-11-23T09:00:00.000Z' }, {
      titles: { mix: 'a', recurring: 'b', responseTime: 'c', failureRate: 'd', services: 'e' },
      chartsNote: 'n',
      footer: 'f',
    });
    expect(notebook.defaultTimeframe).toEqual({ from: '2026-11-16T09:00:00.000Z', to: '2026-11-23T09:00:00.000Z' });
    expect(notebook.sections).toHaveLength(WEEKLY_NOTEBOOK_STEPS.length + 2);
    for (const step of WEEKLY_NOTEBOOK_STEPS) if (step.queryId !== undefined) expect(getQuery(step.queryId).id).toBe(step.queryId);
    expect(notebookLink('https://t.apps.dynatrace.com/', 'a1b2c3d4-0000-4000-8000-000000000002')).toBe('https://t.apps.dynatrace.com/ui/apps/dynatrace.notebooks/notebook/a1b2c3d4-0000-4000-8000-000000000002');
    expect(notebookLink('https://t', 'x"; drop')).toBeNull();
  });

  it('is linked first in the closing when written, and the e-mail goes on when it is not', async () => {
    const deps = { environmentUrl: 'https://t.apps.dynatrace.com', appId: 'a', query: () => Promise.resolve([]), runNotebook: () => Promise.resolve(null) };
    const written = await runWeekly({ customer: 'Acme', language: 'en' }, { ...deps, writeNotebook: () => Promise.resolve('a1b2c3d4-0000-4000-8000-000000000001') });
    expect(written.closing).toContain('[The week’s report, with its charts (notebook)](https://t.apps.dynatrace.com/ui/apps/dynatrace.notebooks/notebook/a1b2c3d4-0000-4000-8000-000000000001)');
    const lines: string[] = [];
    const failed = await runWeekly({ customer: 'Acme' }, { ...deps, writeNotebook: () => Promise.reject(new Error('forbidden')) }, (line) => lines.push(line));
    expect(failed.closing).not.toContain('notebook');
    expect(lines.some((line) => line.startsWith('notebook not written'))).toBe(true);
    const off = await runWeekly({ customer: 'Acme', notebook: 'off' }, { ...deps, writeNotebook: () => Promise.reject(new Error('must not be called')) }, (line) => lines.push(line));
    expect(off.links.notebook ?? null).toBeNull();
  });
});

describe('AI Observability', () => {
  it('reads three metric entries (0 B, scopes already declared) and counts tokens as read', () => {
    for (const id of ['ai.tokens', 'ai.tokens.trend', 'ai.calls'] as const) {
      expect(getQuery(id).requiredScope).toBe('storage:metrics:read');
      expect(getQuery(id).validation.scannedBytesOnDemand).toBe(0);
    }
    const rows = aiTokenRows([
      { 'service.name': 's', 'gen_ai.request.model': 'm', 'gen_ai.token.type': 'input', total: 100 },
      { 'service.name': 's', 'gen_ai.request.model': 'm', 'gen_ai.token.type': 'output', total: 7 },
      { 'service.name': 't', 'gen_ai.request.model': null, 'gen_ai.token.type': 'input', total: 5 },
    ]);
    expect(rows).toEqual([
      { service: 's', model: 'm', input: 100, output: 7 },
      { service: 't', model: null, input: 5, output: 0 },
    ]);
    expect(aiTotals(rows)).toEqual({ input: 105, output: 7, services: 2, models: 1 });
    expect(tokensByModel(rows)[0]).toEqual({ model: 'm', tokens: 107 });
    const calls = aiCallRows([
      { 'service.name': 's', 'gen_ai.request.model': 'm', 'error.type': null, calls: 3, avgSeconds: 1 },
      { 'service.name': 's', 'gen_ai.request.model': 'm', 'error.type': 'timeout', calls: 1, avgSeconds: 5 },
      { 'service.name': 'u', 'gen_ai.request.model': 'm', 'error.type': null, calls: 0, avgSeconds: null },
    ]);
    expect(aiCallTotals(calls)).toEqual({ calls: 4, failed: 1, meanSeconds: 2 });
  });

  it('is an Evidence page, out of executive mode, with no money on it', () => {
    expect(STORY_STAGES.find((stage) => stage.id === 'evidence')?.routes).toContain('/ai-observability');
    expect(EXECUTIVE_HIDDEN_ROUTES.has('/ai-observability')).toBe(true);
    const page = read('pages/AiObservability.tsx');
    expect(page).not.toMatch(/USD|localValue|formatMoney|rateCard/);
    expect(page).toContain("platformUrl('dynatrace.genai.observability/')");
  });
});

describe('What’s new', () => {
  it('keeps 3.7.7 among the ten', () => {
    // 3.7.8: newer releases come first.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i119')).toBe(true);
    expect(WHATS_NEW).toHaveLength(10);
    expect(entryFor('help.whatsNew.i119').en).toMatch(/^3\.7\.7 — /);
  });
});
