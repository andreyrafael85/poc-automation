import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { safeWebUrl } from '../config/persistence';
import { AI_ACTION, buildHttpMonitor, buildTriageWorkflow, defaultLocation, wholeSloIds } from '../features/builder/pocAutomation';
import { buildInvestigationNotebook, NOTEBOOK_STEPS, SECTION_HEIGHT, stepVisualization } from '../features/builder/pocDocuments';
import { SPECIALTY_BLUEPRINTS, SPECIALTY_IDS, VALIDATED_DQL } from '../features/dashboard/blueprints';
import { buildDashboard, type DashboardWords } from '../features/dashboard/pocDashboard';
import { capacityGroups } from '../features/infra/CapacityMap';
import { buildWrapupModel, WRAPUP_QUERY_IDS } from '../features/wrapup/model';
import { entryFor } from '../i18n/strings';
import { parsePocPlan } from '../models/pocPlan';
import { getQuery } from '../queries/catalog';

/**
 * 3.7.3 (the owner: "Seguir com a 3.7.3, porém valide estes pontos antes da 3.7.2"; "Tudo na 3.7.3"): the dashboards with
 * their own names and the SLO tiles finding their SLO, the notebook sized as his copy, the Experience pulse and its main
 * SLOs, Kubernetes and Databases dashboards, Dynatrace Assist in the triage workflow, the cost from problems with a root
 * cause only, capacity as a map, HTTP monitors from the customer's addresses, and the GCP name gone from the tests.
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');
const root = (path: string) => readFileSync(join(__dirname, '..', '..', '..', path), 'utf8');

const words = (extra: Partial<DashboardWords> = {}): DashboardWords => ({
  title: 'Board',
  intro: 'Intro',
  objectivesTitle: '',
  objectives: [],
  footer: 'Footer',
  sectionTitle: (section, index) => `${index}. ${section}`,
  tileTitle: (key) => key,
  evidence: new Set(['kubernetes', 'automation', 'experience', 'synthetic', 'security']),
  ...extra,
});

describe('the dashboards keep their own names', () => {
  it('opens each card with its own key, and gives a borrowed name back', () => {
    expect(read('pages/PocBuilder.tsx')).toMatch(/<SpecialtyCard key=\{open\} id=\{open\}/);
    expect(read('features/dashboard/SpecialtyDashboards.tsx')).toMatch(/const borrowed =\s+formerName \|\| \(existing !== null && SPECIALTY_IDS\.some/);
  });
});

describe('the SLO tiles find their SLO', () => {
  it('settles two SLOs that share the first 100 characters by the name the plan kept', () => {
    const prefix = 'p'.repeat(100);
    const cut = { id: prefix, name: 'CPU dos hosts (PoC de acme)' };
    const whole = wholeSloIds([cut], [
      { id: `${prefix}${'a'.repeat(56)}`, name: 'Frontend - Performance' },
      { id: `${prefix}${'b'.repeat(56)}`, name: 'CPU dos hosts (PoC de acme)' },
    ]);
    expect(whole.changed).toBe(true);
    expect(whole.refs[0]?.id).toBe(`${prefix}${'b'.repeat(56)}`);
  });

  it('shows only the main availability and performance SLOs on the Experience dashboard, two to a row', () => {
    const slos = [
      { id: 'a1', name: 'Availability A', kind: 'availability' },
      { id: 'p1', name: 'Performance A', kind: 'performance' },
      { id: 'a2', name: 'Availability B', kind: 'availability' },
      { id: 'c1', name: 'Host CPU', kind: 'hostCpu' },
    ];
    const doc = buildDashboard(SPECIALTY_BLUEPRINTS.experience, words({ slos }));
    const tiles = Object.entries(doc.tiles).filter(([, tile]) => tile.type === 'slo');
    expect(tiles.map(([, tile]) => (tile.type === 'slo' ? tile.input : ''))).toEqual(['a1', 'p1']);
    expect(tiles.map(([id]) => doc.layouts[id]?.w)).toEqual([12, 12]);
    // The overview keeps every SLO.
    expect(Object.values(buildDashboard(SPECIALTY_BLUEPRINTS.overview, words({ slos })).tiles).filter((tile) => tile.type === 'slo')).toHaveLength(4);
  });
});

describe('the Experience pulse', () => {
  it('reads real users from metrics only, with the week before by a shift', () => {
    expect(VALIDATED_DQL.expPulse.dql).toContain('shift: -7d');
    expect(VALIDATED_DQL.expPulse.dql).not.toContain('user.sessions');
    const keys = SPECIALTY_BLUEPRINTS.experience.tiles.filter((tile) => tile.section === 'pulse').map((tile) => tile.key);
    expect(keys).toEqual(['exp.sessionsTotal', 'exp.sessionsChange', 'exp.satisfiedPct', 'exp.frustratedPct', 'exp.errorRatePct', 'exp.lcpMs']);
    // The business events sit beside the experience funnel (12 + 12), not across the whole row.
    expect(SPECIALTY_BLUEPRINTS.experience.tiles.find((tile) => tile.key === 'exp.sessions')).toBeUndefined();
  });
});

describe('two new dashboards', () => {
  it('Kubernetes and containers, Databases and dependencies — on the Builder, from validated queries', () => {
    expect(SPECIALTY_IDS).toEqual(expect.arrayContaining(['kubernetes', 'database']));
    for (const id of ['kubernetes', 'database'] as const) {
      const blueprint = SPECIALTY_BLUEPRINTS[id];
      for (const section of blueprint.sections) expect(blueprint.icons?.[section], `${id}.${section}`).toBeDefined();
      expect(entryFor(`dash3.${id}.name`)['pt-BR']).not.toBe('');
    }
    expect(VALIDATED_DQL.dbCallers.dql).toContain('called_by[dt.entity.service]');
    // Quotas whose sums do not match (memory above its limit) were left out: no figure that is not true (rule 8).
    expect(Object.keys(VALIDATED_DQL).some((key) => /Quota/.test(key))).toBe(false);
  });
});

describe('the notebook, sized as the owner’s copy', () => {
  it('gives each section its height and draws a figure without autoscale', () => {
    const notebook = buildInvestigationNotebook({ title: 't', intro: 'i', chapter: (key, n) => ({ title: `${n}. ${key}`, why: 'w' }), tile: (key) => key, footer: 'f' });
    const dql = notebook.sections.filter((section) => section.type === 'dql');
    expect(dql.every((section) => typeof section.height === 'number')).toBe(true);
    expect(SECTION_HEIGHT.singleValue).toBe(160);
    const single = NOTEBOOK_STEPS.find((step) => step.visual === 'singleValue');
    const settings = single === undefined ? {} : stepVisualization(single);
    expect(JSON.stringify(settings)).not.toContain('autoscale');
  });
});

describe('Dynatrace Assist in the triage workflow', () => {
  it('reads the triage with the platform’s generative AI, and the e-mail gives its reading after the problem even when it does not answer (3.7.4: the problem first)', () => {
    const body = buildTriageWorkflow(
      { title: 't', description: 'd', triageDescription: 'x', taskDescription: 'y', aiDescription: 'ai', aiPrompt: entryFor('builder.wf.aiPrompt')['pt-BR'], aiHeading: '🤖 DYNATRACE ASSIST' },
      ['team@example.com'],
      true,
      true,
      'pt-BR',
    );
    expect(body.tasks['dynatrace_assist']).toMatchObject({ action: AI_ACTION, predecessors: ['poc_triage'] });
    expect(String(body.tasks['dynatrace_assist']?.input['prompt'])).toContain('{{ result("poc_triage")["summary"] }}');
    expect(body.tasks['notify_team']).toMatchObject({ predecessors: ['dynatrace_assist'], conditions: { states: { dynatrace_assist: 'ANY' } } });
    expect(String(body.tasks['notify_team']?.input['content'])).toMatch(/^\{\{ result\("poc_triage"\)\["body"\] \}\}\n\n---\n\n🤖 DYNATRACE ASSIST\n\n\{\{ \(result\("dynatrace_assist"\)\.text \| default\("—"\)\)/);
    expect(entryFor('builder.wf.aiPrompt')['pt-BR']).toContain('não invente números');
  });
});

describe('the operational cost counts only problems with a root cause', () => {
  it('reads two catalog entries that filter on the named root cause, the counts and the MTTR untouched', () => {
    for (const id of ['prob.exposure.rca', 'prob.mttx.rca'] as const) expect(getQuery(id).dql).toContain('isNotNull(root_cause_entity_id)');
    expect(getQuery('prob.mttx').dql).not.toContain('root_cause_entity_id');
    expect(WRAPUP_QUERY_IDS).toEqual(expect.arrayContaining(['prob.exposure.rca', 'prob.mttx.rca']));
    for (const page of ['pages/ExecutiveSummary.tsx', 'pages/ValueReport.tsx', 'pages/ValueRoiEngine.tsx', 'features/problems/ProblemImpact.tsx']) {
      expect(read(page), page).toContain("useCatalogQuery('prob.mttx.rca', scope)");
    }
    expect(entryFor('cost.response.caveat')['pt-BR']).toContain('causa raiz');
  });

  it('prices nothing in the Tech Wrapup when no problem has a root cause', () => {
    const q = (records: Record<string, unknown>[]) => ({ outcome: 'ok' as const, records, evidence: { queryId: 'x' } as never, provenance: 'observed' as never });
    const model = buildWrapupModel(
      {
        'prob.exposure': q([{ activeProblems: 5, totalOpenNs: 7_200_000_000_000 }]),
        'prob.exposure.rca': q([]),
        'prob.mttx.rca': q([]),
      },
      {
        t: (key: string) => key,
        formatNumber: String,
        params: { customerName: 'Contoso', engagementName: 'PoC', scopeDescription: '', pocDescription: '', customerLogoDataUrl: null, brandTone: 'default', partnerName: '', partnerLogoDataUrl: null, customerUrl: '' },
        costModel: { ratePerHour: 100, downtimeRatePerHour: 100, currencyLabel: 'BRL', rateBasis: '' },
      } as never,
    );
    expect(JSON.stringify(model.business.find((section) => section.id === 'executive') ?? {})).not.toContain('BRL');
  });
});

describe('capacity as a map', () => {
  it('groups the hosts by class, the ones that call for action first', () => {
    const groups = capacityGroups([
      { name: 'b', peakCpuPct: 20, peakMemPct: 30, classification: 'balanced' },
      { name: 's', peakCpuPct: 99, peakMemPct: 70, classification: 'saturated' },
      { name: 'o', peakCpuPct: 2, peakMemPct: 5, classification: 'oversized' },
    ]);
    expect(groups.map((group) => group.cls)).toEqual(['saturated', 'oversized', 'balanced']);
    expect(read('pages/InfrastructureAndCloud.tsx')).toContain('<CapacityMap');
  });
});

describe('HTTP monitors of the customer’s addresses', () => {
  it('keeps only an https address and builds a GET monitor from one location, tagged for the PoC', () => {
    expect(safeWebUrl(' https://www.example.com ')).toBe('https://www.example.com/');
    for (const bad of ['http://www.example.com', 'javascript:alert(1)', 'https://user:pw@example.com', 'example.com']) expect(safeWebUrl(bad), bad).toBe('');
    const body = buildHttpMonitor('shop — HTTP', 'https://shop.example.com/', 'SYNTHETIC_LOCATION-1', 15, 'd');
    expect(body).toMatchObject({ type: 'HTTP', frequencyMin: 15, locations: ['SYNTHETIC_LOCATION-1'], steps: [{ url: 'https://shop.example.com/', methodType: 'GET' }] });
    expect(body.tags).toEqual([{ key: 'poc-automation', context: 'CONTEXTLESS', source: 'USER' }]);
    expect(defaultLocation([{ id: '1', name: 'N. Virginia', city: '', capabilities: [] }, { id: '2', name: 'Sao Paulo', city: 'São Paulo', capabilities: [] }])?.id).toBe('2');
    const plan = parsePocPlan({ monitors: [{ id: 'HTTP_CHECK-1', name: 'm', url: 'https://shop.example.com/', locationId: 'L', createdAt: '', shared: true }] });
    expect(plan.monitors?.[0]?.url).toBe('https://shop.example.com/');
  });

  it('declares the two synthetic scopes with their comments', () => {
    const manifest = JSON.parse(root('app.config.json')) as { app: { scopes: { name: string; comment: string }[] } };
    const scopes = new Map(manifest.app.scopes.map((scope) => [scope.name, scope.comment]));
    for (const name of ['environment-api:synthetic:read', 'environment-api:synthetic-monitors:write']) expect(scopes.get(name), name).toMatch(/3\.7\.3/);
  });
});

describe('the words', () => {
  it('no longer carry the lab’s GCP project name in the tests', () => {
    expect(read('tests/prints.contracts.test.ts')).not.toMatch(/sales-engineering/);
  });

  it('keeps 3.7.3 in What’s new among ten releases', () => {
    expect(WHATS_NEW).toContainEqual({ key: 'help.whatsNew.i115', published: '2026-11-23' });
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i115').en.startsWith('3.7.3 — ')).toBe(true);
  });
});
