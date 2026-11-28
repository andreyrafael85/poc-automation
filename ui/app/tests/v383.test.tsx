import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { createdItems, withoutItems } from '../features/builder/PocAutomationKits';
import {
  GUARDIAN_CRON,
  GUARDIAN_KINDS,
  GUARDIAN_SCHEMA,
  VALIDATE_ACTION,
  buildGuardian,
  buildGuardianWorkflow,
  guardianSpecs,
  type GuardianWords,
} from '../features/builder/pocGuardians';
import { USERS_SHOWN, actorLabel } from '../features/builder/ServiceUserPicker';
import { buildCapacityWorkflow, eventScript, type CapacityWords } from '../features/builder/pocCapacity';
import { DETECTOR_ACTOR_POLICY, DETECTOR_MIN_REQUESTS, PROBE_WORDS, buildDetector, detectorQuery, serviceUsersOf } from '../features/builder/pocSettings';
import { tokenWords } from '../features/builder/TokenKit';
import { AUDIT_SOURCE, HIGH_PRIVILEGE_SCOPES, TOKEN_CRON, TOKEN_MARKDOWN_SOURCE, auditScript, buildTokenWorkflow, mailWordsOf } from '../features/builder/pocTokens';
import { entryFor, translate, type StringKey } from '../i18n/strings';
import { EMPTY_POC_PLAN, parsePocPlan, type PocSloRef } from '../models/pocPlan';

/**
 * 3.8.3 — the PoC Builder's Guardian tab (the owner, 2026-11-27): five Site Reliability Guardians created on the SE's click,
 * kept in the register and removed by the clean-up, and a daily validation workflow handed to Workflows. The guardian's shape
 * passed `dtctl create settings --validate-only` on the lab (nothing written); its objectives' queries were run there.
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');

const SERVICE = `SERVICE-${'0A'.repeat(8)}`;
const SLOS: PocSloRef[] = [
  { id: 'slo-a', name: 'Availability · checkout', kind: 'availability', serviceId: SERVICE, createdAt: '', createdBy: null, shared: true },
  { id: 'slo-b', name: 'Host CPU', kind: 'hostCpu', serviceId: '', createdAt: '', createdBy: null, shared: true },
];
const TARGETS = () => ({ target: 95, warning: 98 });
const WORDS: GuardianWords = { name: 'PoC · guardian', description: 'D', objective: (key) => ({ name: key.startsWith('slo:') ? 'SLO' : key, description: 'd' }) };
const context = (serviceIds: string[] = []) => ({ slos: SLOS, serviceIds, targets: TARGETS });

describe('the five guardians (3.8.3)', () => {
  it('has a set of objectives for each kind, and none for the SLO guardian until the PoC has SLOs', () => {
    expect(GUARDIAN_KINDS).toEqual(['slos', 'infra', 'services', 'apps', 'security']);
    expect(guardianSpecs('slos', { slos: [], serviceIds: [], targets: TARGETS })).toEqual([]);
    expect(buildGuardian('slos', { slos: [], serviceIds: [], targets: TARGETS }, WORDS)).toBeNull();
    expect(guardianSpecs('infra', context()).map((spec) => spec.key)).toEqual(['hostCpu', 'hostMemory', 'disk']);
    expect(guardianSpecs('services', context()).map((spec) => spec.key)).toEqual(['failureRate', 'responseTime']);
    expect(guardianSpecs('apps', context()).map((spec) => spec.key)).toEqual(['lcp', 'frustrated', 'requestErrors']);
    expect(guardianSpecs('security', context()).map((spec) => spec.key)).toEqual(['critical', 'actNow', 'high']);
  });

  it('evaluates each PoC SLO by its own indicator, as DQL (the platform takes only classic SLO keys as a reference)', () => {
    const guardian = buildGuardian('slos', context(), WORDS);
    expect(guardian?.objectives).toHaveLength(2);
    for (const objective of guardian?.objectives ?? []) {
      expect(objective.objectiveType).toBe('DQL');
      expect(objective.comparisonOperator).toBe('GREATER_THAN_OR_EQUAL');
      expect(objective.dqlQuery).toMatch(/\| summarize sli = avg\(arrayAvg\(sli\)\)$/);
    }
    expect(guardian?.objectives[0]?.dqlQuery).toContain(SERVICE);
    // Two objectives of one name are refused by the platform, so a repeated name is numbered.
    expect(new Set(guardian?.objectives.map((objective) => objective.name)).size).toBe(2);
  });

  it('writes the value the schema takes, tagged for the PoC, every query reading metrics or the last 2 h of vulnerability reports', () => {
    for (const kind of GUARDIAN_KINDS) {
      const guardian = buildGuardian(kind, context(), WORDS);
      expect(guardian).toMatchObject({ eventKind: 'BIZ_EVENT', tags: ['poc-automation'], variables: [] });
      for (const objective of guardian?.objectives ?? []) {
        expect(objective.dqlQuery.startsWith('timeseries ') || objective.dqlQuery.startsWith('fetch security.events, from: now()-2h')).toBe(true);
        expect(objective.warning === null || typeof objective.warning === 'number').toBe(true);
      }
    }
    expect(GUARDIAN_SCHEMA).toBe('app:dynatrace.site.reliability.guardian:guardians');
    expect(buildGuardian('services', context([SERVICE, 'not-an-id']), WORDS)?.objectives[0]?.dqlQuery).toContain(`filter: { in(dt.entity.service, array("${SERVICE}")) }`);
    expect(buildGuardian('services', context(), WORDS)?.objectives[0]?.dqlQuery).not.toContain('filter:');
  });

  it('validates each guardian every day over the last 24 h, in a workflow handed to Workflows', () => {
    const workflow = buildGuardianWorkflow(
      [
        { id: 'g1', name: 'Infra', kind: 'infra' },
        { id: 'g2', name: 'Security', kind: 'security' },
      ],
      { shared: false, timezone: 'America/Sao_Paulo' },
      { title: 'T', description: 'D', task: (name) => `Validates ${name}` },
    );
    expect(workflow.isPrivate).toBe(true);
    expect(workflow.trigger.schedule).toMatchObject({ isActive: true, timezone: 'America/Sao_Paulo', trigger: { type: 'cron', cron: GUARDIAN_CRON } });
    expect(Object.keys(workflow.tasks)).toEqual(['validate_infra', 'validate_security']);
    expect(workflow.tasks['validate_infra']).toMatchObject({
      action: VALIDATE_ACTION,
      input: { executionId: '{{ execution().id }}', objectId: 'g1', timeframeInputType: 'timeframeSelector', timeframeSelector: { from: 'now()-24h', to: 'now()' } },
    });
    const kit = read('features/builder/GuardianKit.tsx');
    expect(kit).toContain('openInWorkflows(workflow())');
    expect(kit).toContain(['createSettingsObject', '(GUARDIAN_SCHEMA, guardian)'].join(''));
  });
});

describe('the register and the clean-up (3.8.3)', () => {
  it('keeps the guardians in the plan, lists them in the register and forgets the ones removed', () => {
    const ref = { id: 'obj-1', name: 'PoC · Infra', kind: 'infra', createdAt: '2026-11-27T20:00:00Z', createdBy: null, shared: true };
    const plan = parsePocPlan({ ...EMPTY_POC_PLAN, guardians: [ref, { id: '', name: 'x', kind: 'apps' }, { id: 'obj-2', name: 'y' }] });
    expect(plan.guardians).toEqual([ref]);
    const items = createdItems(plan, () => null);
    expect(items.map((item) => [item.key, item.type])).toEqual([['grd-obj-1', 'guardian']]);
    expect(items[0]?.link).toContain('dynatrace.site.reliability.guardian/intent/view_validation');
    expect(withoutItems(plan, new Set(['grd-obj-1'])).guardians).toBeUndefined();
    expect(read('features/builder/PocAutomationKits.tsx')).toContain("item.type === 'guardian') return deleteSettingsObject(item.ref.id)");
  });

  it('is a tab of the PoC Builder, for the SE', () => {
    const page = read('pages/PocBuilder.tsx');
    expect(page).toContain("t('builder.tab.guardian')");
    expect(page).toContain('<GuardianKit />');
    expect(read('features/builder/GuardianKit.tsx')).toContain('access.canManageAccess');
  });
});

describe('from the owner’s validation of 3.8.2 (3.8.3)', () => {
  it('names the service’s problem in the detectors’ events, never the PoC', () => {
    for (const kind of ['failureRate', 'responseTime', 'traffic'] as const) {
      for (const locale of ['en', 'pt-BR'] as const) {
        expect(translate(`builder.ad.event.${kind}`, locale)).not.toMatch(/PoC/);
        expect(translate(`builder.ad.eventText.${kind}`, locale, { line: '5' })).not.toMatch(/PoC/);
      }
    }
    expect(translate('builder.ad.event.failureRate', 'pt-BR')).toBe('Taxa de falha alta no serviço');
    expect(read('features/builder/PocSettingsKits.tsx')).toContain('builder.ad.eventText.${kind}');
  });

  it('makes the automatic detectors robust: a floor of requests, longer windows and a wider tolerance for traffic', () => {
    expect(DETECTOR_MIN_REQUESTS).toBe(10);
    expect(detectorQuery('failureRate', [])).toContain('iCollectArray(if(r[] >= 10, 100 * f[] / r[]))');
    expect(detectorQuery('responseTime', [])).toContain('iCollectArray(if(r[] >= 10, t[]))');
    expect(detectorQuery('traffic', [])).toContain('| filter arrayAvg(requests) >= 10');
    const input = (kind: 'failureRate' | 'responseTime' | 'traffic') => {
      const value = buildDetector(kind, [], PROBE_WORDS, ['00000000', '1111', '4222', '8333', '444455556666'].join('-')) as { analyzer: { input: { key: string; value: string }[] } };
      return Object.fromEntries(value.analyzer.input.map((entry) => [entry.key, entry.value]));
    };
    expect(input('failureRate')).toMatchObject({ violatingSamples: '3', slidingWindow: '5', threshold: '5' });
    expect(input('responseTime')).toMatchObject({ violatingSamples: '5', slidingWindow: '10', numberOfSignalFluctuations: '3', alertCondition: 'ABOVE' });
    expect(input('traffic')).toMatchObject({ violatingSamples: '10', slidingWindow: '15', numberOfSignalFluctuations: '4', alertCondition: 'BELOW' });
  });

  it('gives the service user the least policy a detector’s actor needs', () => {
    expect(DETECTOR_ACTOR_POLICY.split('\n')).toEqual([
      'ALLOW davis:analyzers:execute;',
      'ALLOW storage:buckets:read;',
      'ALLOW storage:metrics:read;',
      'ALLOW storage:entities:read;',
      'ALLOW storage:smartscape:read;',
    ]);
    expect(read('features/builder/ServiceUserPicker.tsx')).toContain('data-testid="su-policy"');
  });

  it('reads the service users by name from the IAM service and shows the saved one as name and id', () => {
    const id = ['7a1c2e3d', '4b5f', '4c6a', '8d7e', '9f0a1b2c3d4e'].join('-');
    const other = ['5e6f7a8b', '9c0d', '4e1f', 'a2b3', 'c4d5e6f7a8b9'].join('-');
    expect(
      serviceUsersOf({
        results: [
          { uid: id.toUpperCase(), email: `${id}@service.sso.dynatrace.com`, name: 'detectors-bot' },
          { email: `${other}@service.sso.dynatrace.com`, name: 'poc-automation', surname: '' },
          { uid: 'not-an-id', name: 'x' },
        ],
      }),
    ).toEqual([
      { id, name: 'detectors-bot' },
      { id: other, name: 'poc-automation' },
    ]);
    expect(serviceUsersOf(null)).toEqual([]);
    expect(actorLabel(id, 'detectors-bot')).toBe(`detectors-bot (${id})`);
    expect(actorLabel(id, undefined)).toBe(id);
    const plan = parsePocPlan({ ...EMPTY_POC_PLAN, detectorActor: id, detectorActorName: 'detectors-bot' });
    expect(plan.detectorActorName).toBe('detectors-bot');
    expect(parsePocPlan({ ...EMPTY_POC_PLAN, detectorActorName: 'orphan' }).detectorActorName).toBeUndefined();
  });

  it('always raises a predictive event, titled and described for the customer, for a series over the line now or crossing it', () => {
    const words = {
      eventTitleNow: translate('cap.ev.titleNow', 'en', { signal: 'Disk' }),
      eventTitleLikely: translate('cap.ev.titleLikely', 'en', { signal: 'Disk' }),
      eventTextNow: translate('cap.ev.textNow', 'en', { signal: 'Disk' }),
      eventTextLikely: translate('cap.ev.textLikely', 'en', { signal: 'Disk' }),
    } as CapacityWords;
    // Every other word of the workflow: a placeholder (only the event's words are under test here).
    const full = new Proxy(words, { get: (target, key) => (target as unknown as Record<string, string>)[String(key)] ?? 'x' });
    const script = eventScript({ threshold: 90, horizon: 7 }, words);
    expect(script).toContain('row.status === "now" || row.status === "likely"');
    expect(script).toContain('"dt.event.description"');
    expect(script).toContain('timeout: 300');
    expect(script).toContain('Forecast: Disk reaches {line}% in {days} days — {name}');
    expect(script).not.toMatch(/poc\./);
    expect(read('features/builder/CapacityKit.tsx')).toContain('raiseEvents: true');
    expect(buildCapacityWorkflow({ kind: 'disk', threshold: 90, horizon: 7, recipients: ['se@example.com'], raiseEvents: true, shared: true, timezone: 'UTC' }, full).tasks['raise_event']).toBeDefined();
  });
});

type Audit = { api: Record<string, number>; activeGate: Record<string, number>; vault: { total: number; shared: number }; rows: { name: string; kind: string; findings: string[]; action: string; broad: string[] }[]; unread: string[] };
const loadFn = <T,>(source: string, name: string): T => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the workflow's own script source, under test
  const factory = new Function(`${source}; return ${name};`) as () => T;
  return factory();
};

describe('the token security agent (3.8.3)', () => {
  const NOW = Date.parse('2026-11-27T12:00:00Z');
  const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
  const audit = loadFn<(input: object, cfg: object) => Audit>(AUDIT_SOURCE, 'auditTokens');
  const cfg = { nowMs: NOW, broad: [...HIGH_PRIVILEGE_SCOPES], lines: { unusedDays: 30, disableUnusedDays: 90, expiringDays: 14, neverUsedAfterDays: 7 } };

  it('audits each active token and recommends: disable, set an expiry and rotate, or review', () => {
    const result = audit(
      {
        apiTokens: [
          { id: 'dt0c01.NEVER', name: 'never', enabled: true, creationDate: day(30), scopes: ['metrics.read'] },
          { id: 'dt0c01.BROAD', name: 'broad', enabled: true, creationDate: day(60), lastUsedDate: day(1), scopes: ['WriteConfig'] },
          { id: 'dt0c01.STALE', name: 'stale', enabled: true, creationDate: day(400), lastUsedDate: day(120), expirationDate: day(-200), scopes: [] },
          { id: 'dt0c01.SOON', name: 'soon', enabled: true, creationDate: day(30), lastUsedDate: day(1), expirationDate: day(-5), scopes: ['metrics.read'] },
          { id: 'dt0c01.CLEAN', name: 'clean', enabled: true, creationDate: day(30), lastUsedDate: day(1), expirationDate: day(-90), scopes: ['metrics.read'] },
          { id: 'dt0c01.OFF', name: 'off', enabled: false, creationDate: day(30) },
          { id: 'dt0c01.PAT', name: 'pat', enabled: true, personalAccessToken: true, creationDate: day(30), lastUsedDate: day(40), expirationDate: day(-30), scopes: [] },
        ],
        activeGateTokens: [{ id: 'dt0g02.AG', name: 'ag', creationDate: day(30), lastUsedDate: day(2) }],
        credentials: [{ ownerAccessOnly: false }, { ownerAccessOnly: true }],
      },
      cfg,
    );
    expect(result.api).toMatchObject({ total: 7, active: 6, personal: 1, noExpiry: 2, expiring: 1, neverUsed: 1, unused: 2, broad: 1 });
    expect(result.rows.map((row) => [row.name, row.action])).toEqual([
      ['never', 'disable'],
      ['stale', 'disable'],
      ['broad', 'rotate'],
      ['pat', 'review'],
      ['ag', 'review'],
      ['soon', 'review'],
    ]);
    expect(result.rows.find((row) => row.name === 'pat')?.kind).toBe('personal');
    expect(result.vault).toEqual({ total: 2, shared: 1 });
  });

  it('writes the e-mail in the screen’s language, with the account’s checks, and names a list it could not read', () => {
    const t = (key: StringKey, values?: Record<string, string>) => translate(key, 'pt-BR', values);
    const words = tokenWords(t, 'Acme');
    const mailWords = mailWordsOf(words);
    const markdown = loadFn<(a: Audit, c: object) => { subject: string; body: string }>(TOKEN_MARKDOWN_SOURCE, 'tokenMarkdown');
    const result = audit({ apiTokens: [{ id: 'dt0c01.NEVER', name: 'never', enabled: true, creationDate: day(30) }], unread: ['credential vault (environment-api:credentials:read)'] }, cfg);
    const mail = markdown({ ...result, unread: ['credential vault (environment-api:credentials:read)'] }, { shown: 25, words: mailWords });
    expect(mail.subject).toBe('Segurança de tokens (Acme): 1 achado(s), 1 para desativar');
    expect(mail.body).toContain('| never · dt0c01.NEVER… | API |');
    expect(mail.body).toContain('**Desativar**');
    expect(mail.body).toContain('Clientes OAuth');
    expect(mail.body).toContain('Não legível com as permissões do workflow: credential vault');
    expect(mail.body).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('runs daily, reads metadata only through the SDK, never writes a token, and acts only on a finding', () => {
    const words = tokenWords((key, values) => translate(key, 'en', values), 'Acme');
    const workflow = buildTokenWorkflow({ recipients: ['se@example.com'], shared: false, timezone: 'UTC' }, words);
    expect(workflow.isPrivate).toBe(true);
    expect(workflow.trigger.schedule).toMatchObject({ trigger: { cron: TOKEN_CRON } });
    expect(Object.keys(workflow.tasks)).toEqual(['token_audit', 'token_assist', 'notify_team']);
    const script = auditScript(words);
    expect(script).toContain('accessTokensApiTokensClient.listApiTokens');
    expect(script).not.toMatch(/createApiToken|deleteApiToken|updateApiToken|revoke/);
    expect(workflow.tasks['notify_team']?.conditions).toMatchObject({ custom: '{{ result("token_audit").risk }}', else: 'SKIP' });
    expect(read('pages/PocBuilder.tsx')).toContain('<TokenKit />');
  });
});

describe('from the owner’s validation of 3.8.3 (3.8.4)', () => {
  it('asks the detectors’ queries for one-minute samples (the p90 detector failed without it)', () => {
    for (const kind of ['failureRate', 'responseTime', 'traffic'] as const) expect(detectorQuery(kind, [])).toContain('by: {dt.entity.service}, interval: 1m');
    expect(detectorQuery('responseTime', [`SERVICE-${'0A'.repeat(8)}`])).toContain('interval: 1m, filter: { in(dt.entity.service, array(');
  });

  it('reads the infrastructure guardian as the mean over every host, as the services guardian reads every service', () => {
    const specs = guardianSpecs('infra', context());
    expect(specs.map((spec) => spec.dql)).toEqual([
      'timeseries cpu = avg(dt.host.cpu.usage)\n| fields cpu = arrayAvg(cpu)',
      'timeseries mem = avg(dt.host.memory.usage)\n| fields mem = arrayAvg(mem)',
      expect.stringContaining('| summarize used = avg(arrayAvg(used))'),
    ]);
    expect(specs.map((spec) => [spec.target, spec.warning])).toEqual([
      [80, 70],
      [85, 75],
      [85, 75],
    ]);
  });

  it('offers the top five service users, saves the id checked whatever was chosen before, and updates the guardians in place', () => {
    expect(USERS_SHOWN).toBe(5);
    const picker = read('features/builder/ServiceUserPicker.tsx');
    expect(picker).toContain("setCheck({ state: 'ok', reason: actorLabel(actor, name) })");
    expect(picker).toContain('names.get(actor)');
    const kit = read('features/builder/GuardianKit.tsx');
    expect(kit).toContain('updateSettingsObject(guardian.id, value)');
    expect(kit).toContain('data-testid="builder-guardian-automate"');
    expect(translate('grd.automate', 'en')).toContain('guardian.validation.triggered');
  });
});

describe('What’s new (3.8.3)', () => {
  it('keeps 3.8.3 second, under 3.8.4, and ten in all', () => {
    expect(WHATS_NEW[0]).toEqual({ key: 'help.whatsNew.i126', published: '2026-11-28' });
    expect(entryFor('help.whatsNew.i126').en.startsWith('3.8.4 — ')).toBe(true);
    expect(WHATS_NEW[1]).toEqual({ key: 'help.whatsNew.i125', published: '2026-11-27' });
    expect(WHATS_NEW).toHaveLength(10);
    expect(entryFor('help.whatsNew.i125').en.startsWith('3.8.3 — ')).toBe(true);
    expect(entryFor('help.whatsNew.i125')['pt-BR'].startsWith('3.8.3 — ')).toBe(true);
  });
});
