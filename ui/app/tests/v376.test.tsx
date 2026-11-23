import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { appBilling, queryPractices } from '../features/consumption/queryPractices';
import { buildWeeklyWorkflow, sloLink, TRIAGE_RESULT } from '../features/builder/pocAutomation';
import {
  ANOMALY_APP_LINK,
  buildDetector,
  detectorQuery,
  OPENPIPELINE_LINK,
  OPENPIPELINE_ROUTING_LINK,
  routeMatcher,
  withoutPipelineRoutes,
  withPocRoute,
  type RoutingEntry,
} from '../features/builder/pocSettings';
import { TRIAGE_RULE } from '../features/triage/triage';
import { runWeekly } from '../features/weekly/weekly';
import { entryFor } from '../i18n/strings';
import { ALL_QUERIES, getQuery } from '../queries/catalog';

/**
 * 3.7.6 (the owner's validation of 3.7.5): the e-mails in the right order and the weekly one without the app's links;
 * detectors for every service when none is ticked; the Builder's links absolute on the tenant; the clean-up's "Remove";
 * the OpenPipeline check; one banner on the brand background; the app's consumption in money and its query practices.
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');
const words = { title: 'W', description: 'd', weeklyDescription: 'w', aiDescription: 'a', aiPrompt: 'p', aiHeading: '🤖 H', taskDescription: 'e' };

describe('the e-mails’ order', () => {
  it('sends the triage’s problem, then Dynatrace Assist, then the links and the footer', () => {
    expect(TRIAGE_RESULT.body).toBe('{{ result("poc_triage")["body"] }}');
    expect(TRIAGE_RESULT.closing).toBe('{{ result("poc_triage")["closing"] }}');
    expect(read('features/triage/triage.ts')).toContain('export function triageSummaryParts(');
  });

  it('sends the week, then Dynatrace Assist, then the links — platform pages only, never the app', async () => {
    const result = await runWeekly(
      { customer: 'Acme', language: 'en', dashboardId: 'a1b2c3d4-0000-4000-8000-000000000001' },
      { environmentUrl: 'https://abc.apps.dynatrace.com/', appId: 'my.poc.automation', query: () => Promise.resolve([]) },
    );
    expect(result.body).not.toContain('### Links');
    expect(result.closing.startsWith('### Links')).toBe(true);
    expect(result.closing).toContain('https://abc.apps.dynatrace.com/ui/apps/dynatrace.davis.problems/');
    expect(result.closing).toContain('https://abc.apps.dynatrace.com/ui/apps/dynatrace.dashboards/dashboard/a1b2c3d4-0000-4000-8000-000000000001');
    expect(result.summary).not.toContain('my.poc.automation');
    expect(result.summary).toBe(`${result.body}${TRIAGE_RULE}${result.closing}`);
    const odd = await runWeekly({ dashboardId: 'x"; drop' }, { environmentUrl: 'https://abc', appId: 'a', query: () => Promise.resolve([]) });
    expect(odd.links.dashboard).toBeNull();
    const body = buildWeeklyWorkflow(words, ['t@example.com'], true, true, 'en', 'Acme', 'UTC', 'dash-1-0000');
    expect(body.tasks['poc_weekly']?.input).toMatchObject({ dashboardId: 'dash-1-0000' });
    expect(String(body.tasks['notify_team']?.input['content']).endsWith('{{ result("poc_weekly")["closing"] }}')).toBe(true);
  });
});

describe('the anomaly detectors', () => {
  it('watch every service when none is ticked, and refuse ids that are not service ids', () => {
    const w = { title: 'T', description: 'D', eventName: 'E', eventDescription: 'ED' };
    expect(detectorQuery('traffic', [])).toBe('timeseries requests = sum(dt.service.request.count), by: {dt.entity.service}');
    expect(buildDetector('traffic', [], w, 'user-1')).not.toBeNull();
    expect(buildDetector('traffic', ['nope'], w, 'user-1')).toBeNull();
    expect(read('features/builder/PocSettingsKits.tsx')).not.toContain('chosen.size === 0 || access');
  });
});

describe('the Builder’s links and words', () => {
  it('open the right pages on the tenant (absolute, never resolved inside this app)', () => {
    expect(OPENPIPELINE_LINK).toContain('/ui/apps/dynatrace.settings/settings/openpipeline-logs/pipelines');
    expect(OPENPIPELINE_ROUTING_LINK).toContain('/ui/apps/dynatrace.settings/settings/openpipeline-logs/routing');
    expect(ANOMALY_APP_LINK).toContain('/ui/apps/dynatrace.davis.anomalydetection/');
    expect(sloLink('slo-1')).toContain('/ui/apps/dynatrace.service.level.objectives/intent/view-slo#');
    expect(decodeURIComponent(sloLink('slo-1').split('#')[1] ?? '')).toBe('{"dt.slo.id":"slo-1"}');
  });

  it('says "Remove" on the clean-up and names every kind of item', () => {
    expect(read('features/builder/PocAutomationKits.tsx')).toContain("goLabel={t('builder.clean.remove')}");
    expect(entryFor('builder.clean.remove')['pt-BR']).toBe('Remover');
    for (const type of ['monitor', 'detector', 'pipeline']) expect(entryFor(`builder.clean.type.${type}` as 'builder.clean.type.monitor').en).not.toBe('');
  });

  it('checks the pipeline by the records that went through it', () => {
    const check = getQuery('log.pipeline.check');
    expect(check.dql).toContain('iAny(dt.openpipeline.pipelines[] == "logs:pipeline_poc_automation_log_levels")');
    expect(check.guards).toMatchObject({ scanLimitGbytes: 1, maxResultRecords: 1 });
  });
});

describe('the route to the pipeline (the owner: "esse ponto 2 você não consegue criar junto na automação do pipeline?")', () => {
  it('builds the condition the platform validated: each source on its fields, strings escaped, nothing for an empty source', () => {
    // Validated on the lab with `dtctl create settings --validate-only` (2026-11-23), the Windows path included.
    expect(
      routeMatcher([
        { logSource: 'Container Output', workload: 'easytrade-loadgen', ingest: null },
        { logSource: 'C:\\ProgramData\\audit.log', workload: null, ingest: null },
        { logSource: null, workload: null, ingest: '/api/v2/otlp/v1/logs' },
      ]),
    ).toBe(
      '(matchesValue(log.source, "Container Output") and k8s.workload.name == "easytrade-loadgen") or ' +
        '(matchesValue(log.source, "C:\\\\ProgramData\\\\audit.log")) or ' +
        '(isNull(log.source) and dt.openpipeline.source == "/api/v2/otlp/v1/logs")',
    );
    expect(routeMatcher([{ logSource: 'a"b', workload: null, ingest: null }])).toBe('(matchesValue(log.source, "a\\"b"))');
    expect(routeMatcher([{ logSource: null, workload: null, ingest: null }])).toBeNull();
    expect(routeMatcher([])).toBeNull();
  });

  it('puts the PoC’s route on top, replaces its earlier one, and the clean-up removes only the PoC’s routes', () => {
    const other = (id: string): RoutingEntry => ({ description: id, enabled: true, matcher: 'true', pipelineId: id, pipelineType: 'custom' });
    const poc = { ...other('poc'), description: 'PoC Automation: x' };
    const routed = withPocRoute([other('a'), { ...poc, matcher: 'old' }, other('b')], poc);
    expect(routed.map((entry) => entry.pipelineId)).toEqual(['poc', 'a', 'b']);
    expect(routed[0]?.matcher).toBe('true');
    expect(withoutPipelineRoutes(routed, 'poc').map((entry) => entry.pipelineId)).toEqual(['a', 'b']);
  });

  it('reads the routing with its own scope, writes it back with its update token, and unroutes before deleting the pipeline', () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'app.config.json'), 'utf8')) as { app: { scopes: { name: string; comment: string }[] } };
    expect(manifest.app.scopes.find((scope) => scope.name === 'settings:objects:read')?.comment).toMatch(/3\.7\.6/);
    const settings = read('features/builder/pocSettings.ts');
    expect(settings).toContain("fields=objectId,updateToken,value");
    expect(settings).toContain('updateToken: current.updateToken');
    expect(read('features/builder/PocAutomationKits.tsx')).toContain('unrouteFromPipeline(item.ref.id).then(() => deleteSettingsObject(item.ref.id))');
    expect(getQuery('log.sources.nolevel').guards).toMatchObject({ scanLimitGbytes: 1, maxResultRecords: 12 });
  });
});

describe('the banner and Licensing', () => {
  it('puts the Executive summary’s banner on the Overview’s brand background', () => {
    expect(read('pages/ExecutiveSummary.tsx')).toMatch(/headingAs="h2"\s+brand/);
    expect(read('components/HeroBanner.tsx')).toContain("data-brand={brand ? 'true' : undefined}");
  });

  it('measures what the licence was billed for the app’s queries, and counts the app’s query practices', () => {
    expect(getQuery('app.query.billing').dql).toContain('client.application_context');
    expect(appBilling([{ app: 'my.poc.automation', kind: 'Logs', queries: 1, bytes: 10 }, { app: 'old', kind: 'Logs', queries: 2, bytes: 30 }], 'my.poc.automation')).toEqual({
      totalBytes: 40,
      currentBytes: 10,
      earlierBytes: 30,
      queries: 3,
    });
    const rows = queryPractices(ALL_QUERIES);
    const row = (key: string) => rows.find((entry) => entry.key === key);
    expect(row('catalog')?.met).toBe(ALL_QUERIES.length);
    // Every read that scans Grail data carries a scan ceiling; every log read is sampled or in a short window.
    expect(row('scanCeiling')?.met).toBe(row('scanCeiling')?.of);
    expect(row('logsBounded')?.met).toBe(row('logsBounded')?.of);
  });
});

describe('What’s new', () => {
  it('keeps 3.7.6 among the ten releases', () => {
    // 3.7.7: newer releases come first.
    expect(WHATS_NEW).toContainEqual({ key: 'help.whatsNew.i118', published: '2026-11-23' });
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i118').en.startsWith('3.7.6 — ')).toBe(true);
  });
});
