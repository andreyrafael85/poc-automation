import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as B from '../features/wrapup/prints/evidence/builders';
import { buildIncidentLogsDql, incidentLogsQuery, type RcaIncident } from '../models/rca';
import { buildRootCallersDql } from '../models/trailLinks';
import { ALL_QUERIES, getQuery, renderQuery } from '../queries/catalog';
import { INCIDENT_LOG_MAX_IDS } from '../queries/catalogTemplates';
import { ENTITY_ID_PATTERN, paramsKey, quoteDqlString, renderCatalogDql, renderOrNull, validateParam } from '../queries/params';
import type { CatalogEntry } from '../queries/types';
import { TD08_DQL, TD08_IDS as IDS } from './fixtures/td08.dql';

/**
 * TD-08 (3.3.2): the RCA trail's callers, the incident's logs and the real-prints evidence moved
 * from builders into parameterised catalog entries. These tests pin three promises:
 *
 *  1. the rendered text is byte-identical to what the 3.3.1 builders produced for the same inputs
 *     (`fixtures/td08.dql.ts`, captured from the old code), so their live validations still hold;
 *  2. a value that fails its validator never produces a query — quotes, backslashes, pipes,
 *     newlines, overlong lists, empty values, wrong types and stray parameters are all refused;
 *  3. `useCatalogQuery` sends a refused query nowhere, and only `useCatalogQuery` imports `useDql`.
 */

const dql = vi.hoisted(() => ({
  calls: [] as { params: { query: string; defaultTimeframeStart?: string; defaultTimeframeEnd?: string; defaultScanLimitGbytes?: number; maxResultRecords?: number }; enabled: boolean }[],
}));

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: (params: { query: string }, options: { enabled?: boolean }) => {
    dql.calls.push({ params, enabled: options.enabled !== false });
    return { data: undefined, error: null, isLoading: options.enabled !== false, refetch: () => Promise.resolve(undefined) };
  },
}));

vi.mock('@dynatrace-sdk/client-query', () => ({
  isErrorEnvelopeError: () => false,
}));

const { useCatalogQuery } = await import('../hooks/useCatalogQuery');
const { useIncidentErrorLogs } = await import('../hooks/useIncidentErrorLogs');

beforeEach(() => {
  dql.calls.length = 0;
});

const incident = (affectedIds: string[], relatedIds: string[]): RcaIncident => ({
  displayId: 'P-1',
  name: 'x',
  category: 'ERROR',
  status: 'CLOSED',
  severity: null,
  impactLevels: [],
  affectedNames: [],
  affectedTypes: [],
  relatedNames: [],
  affectedIds,
  relatedIds,
  rootCauseName: null,
  rootCauseId: null,
  eventId: '1_1790116640000V2',
  startIso: '2026-09-22T22:57:00.000Z',
  endIso: '2026-09-22T23:09:00.000Z',
  durationNs: 0,
  affectedCount: affectedIds.length,
  clusters: [],
  namespaces: [],
  workloads: [],
  description: null,
});

// ------------------------------------------------------------------ 1. byte-identical text

/** The same inputs the fixture was generated with, run through the catalog. */
const RENDERED: Record<string, string | null> = {
  'B1 eventId': B.problemEventsDql(IDS.eventId),
  'B1 negative eventId': B.problemEventsDql(IDS.eventIdNeg),
  'B2 service root': B.recurrenceDql(IDS.root),
  'B2 host root': B.recurrenceDql(IDS.host),
  'B3 root': B.incidentCallersDql(IDS.root),
  'B4 one': B.serviceMinutesDql([IDS.root]),
  'B4 two': B.serviceMinutesDql([IDS.root, IDS.caller]),
  'B4 six with duplicate': B.serviceMinutesDql([IDS.root, IDS.caller, IDS.broker, IDS.root, IDS.login, IDS.order, IDS.port80]),
  B5: B.serviceEndpointsDql(IDS.caller),
  B6: B.frontendSummaryDql(IDS.frontend),
  B7: B.frontendMinutesDql(IDS.frontend),
  B8: B.serviceScreenDql(IDS.caller),
  'B9 service': B.entityEventsDql(IDS.broker),
  'B9 host': B.entityEventsDql(IDS.host),
  B10: B.k8sCapacityDql(IDS.cluster),
  B11: B.k8sWorkloadsDql(IDS.cluster),
  B12: B.k8sChurnDql(IDS.cluster),
  B13: B.k8sIncidentRestartsDql(IDS.cluster),
  B14: B.failingServicesDql(IDS.broker),
  B14b: B.failingEndpointsDql(IDS.broker),
  B15: B.logErrorsDql(),
  B16: B.failedEndpointsDql(),
  B17: B.topologyBlastDql(IDS.root),
  B18: B.topologyHubsDql(),
  B19: B.hostCpuDql(IDS.host),
  // 3.6.1: the calls between an incident's services, from the entity model.
  '3.6.1 rca.edges': (() => {
    const out = renderCatalogDql(getQuery('rca.edges'), { serviceIds: [IDS.caller, IDS.root] });
    return out.ok ? out.dql : null;
  })(),
  // 3.6.9: the indicators of the SLOs the PoC Builder creates.
  '3.6.9 slo.availability': renderOrNull(getQuery('slo.availability'), { serviceId: IDS.root }),
  '3.6.9 slo.performance': renderOrNull(getQuery('slo.performance'), { serviceId: IDS.root }),
  // 3.7.0: the problem a workflow hands to the triage action.
  '3.7.0 triage.problem': renderOrNull(getQuery('triage.problem'), { problemId: '3317257838245384203_1793609340000V2' }),
  'callers root': buildRootCallersDql(IDS.root),
  'callers caller': buildRootCallersDql(IDS.caller),
  'logs services only': buildIncidentLogsDql(incident([IDS.root, IDS.caller], [])),
  'logs no service': buildIncidentLogsDql(incident([IDS.application], [IDS.host, IDS.pg])),
  'logs mixed with invalid ids dropped': buildIncidentLogsDql(incident([IDS.root, 'SERVICE-1") | fetch secrets', IDS.application], ['not-an-id', IDS.host, IDS.root])),
  'logs services only related': buildIncidentLogsDql(incident([IDS.host], [IDS.caller])),
};

describe('TD-08: the catalog renders exactly the 3.3.1 builder text', () => {
  it('matches every captured fixture byte for byte', () => {
    expect(Object.keys(RENDERED).sort()).toEqual(Object.keys(TD08_DQL).sort());
    for (const [name, expected] of Object.entries(TD08_DQL)) {
      expect(RENDERED[name], name).toBe(expected);
    }
  });

  it('covers every parameterised entry and every evidence entry with a fixture', () => {
    const fixtures = Object.values(TD08_DQL);
    for (const entry of ALL_QUERIES) {
      const timeframe = entry.timeframe;
      if (entry.params === undefined && (timeframe === 'global' || !('caller' in timeframe))) continue;
      // The template's fixed prefix (up to its first placeholder) opens at least one fixture.
      const prefix = entry.dql.split('{{')[0] ?? '';
      expect(fixtures.some((text) => text.startsWith(prefix)), entry.id).toBe(true);
    }
  });

  it('picks the incident-logs entry by whether an affected entity is a service', () => {
    expect(incidentLogsQuery(incident([IDS.root], [IDS.host]))?.id).toBe('rca.incident.logs.services');
    expect(incidentLogsQuery(incident([IDS.application], [IDS.caller]))?.id).toBe('rca.incident.logs');
    expect(incidentLogsQuery(incident(['not-an-id'], []))).toBeNull();
    expect(incidentLogsQuery(null)).toBeNull();
  });
});

// ------------------------------------------------------------------ 2. strict validation

/** The injection attempts every single-value parameter must refuse. */
const attacks = (valid: string): string[] => [
  `${valid}"`,
  `"${valid}`,
  `${valid}" | fetch logs | limit 1 //`,
  `${valid}\\`,
  `${valid}\\" or true`,
  `${valid} | fetch logs`,
  `${valid}|fetch logs`,
  `${valid}\n| fetch logs`,
  `${valid}\n`,
  `\n${valid}`,
  `${valid}\r`,
  `${valid}\u0000`,
  ` ${valid}`,
  `${valid} `,
  valid.toLowerCase(),
  `${valid}0`,
  valid.slice(0, -1),
  '',
  ' ',
  '"',
  '\\',
  '|',
  '{{rootId}}',
  'SERVICE-C44033DE8492CF4５', // a full-width digit
  'SERVICE-C44033DE8492CF45'.repeat(4),
];

const entryWith = (params: CatalogEntry['params'], dqlText: string): Pick<CatalogEntry, 'dql' | 'params'> => ({ dql: dqlText, params });

describe('TD-08: a refused value never produces a query', () => {
  const single: [string, string][] = [
    ['rca.callers', IDS.root],
    ['ev.service.endpoints', IDS.caller],
    ['ev.frontend.summary', IDS.frontend],
    ['ev.k8s.capacity', IDS.cluster],
    ['ev.host.cpu', IDS.host],
    ['ev.entity.events', IDS.broker],
    ['ev.problem.recurrence', IDS.root],
  ];

  it('refuses quotes, backslashes, pipes, newlines, control characters, case, length and empty values', () => {
    for (const [id, valid] of single) {
      const entry = getQuery(id as Parameters<typeof getQuery>[0]);
      const name = Object.keys(entry.params ?? {})[0] ?? '';
      expect(renderCatalogDql(entry, { [name]: valid }).ok, `${id} accepts its valid id`).toBe(true);
      for (const attack of attacks(valid)) {
        const result = renderCatalogDql(entry, { [name]: attack });
        expect(result.ok, `${id}: ${JSON.stringify(attack)}`).toBe(false);
        expect(renderQuery(id as Parameters<typeof renderQuery>[0], { [name]: attack }), `${id}: ${JSON.stringify(attack)}`).toBeNull();
      }
    }
  });

  it('refuses an event id that is not a Davis event.id', () => {
    const entry = getQuery('ev.problem.events');
    expect(renderCatalogDql(entry, { eventId: IDS.eventId }).ok).toBe(true);
    for (const attack of [...attacks(IDS.eventId), 'P-260914359', '1495944828232761706_1790117520000', '1_1790117520000V2V2', `1_${'9'.repeat(14)}V2`]) {
      expect(renderCatalogDql(entry, { eventId: attack }).ok, JSON.stringify(attack)).toBe(false);
    }
  });

  it('refuses the wrong entity type', () => {
    expect(renderCatalogDql(getQuery('rca.callers'), { rootId: IDS.host })).toEqual({ ok: false, refusal: { param: 'rootId', reason: 'wrong-entity-type' } });
    expect(renderCatalogDql(getQuery('ev.k8s.capacity'), { clusterId: 'KUBERNETES_CLUSTER-87E7E0B19F2B0431' }).ok).toBe(false);
    expect(renderCatalogDql(getQuery('ev.frontend.summary'), { frontendId: IDS.application }).ok).toBe(false);
    // An entity of any type is welcome where the parameter names none.
    expect(renderCatalogDql(getQuery('ev.entity.events'), { entityId: IDS.host }).ok).toBe(true);
  });

  it('refuses missing, unexpected, mistyped and prototype-borne parameters', () => {
    const callers = getQuery('rca.callers');
    expect(renderCatalogDql(callers, {})).toEqual({ ok: false, refusal: { param: 'rootId', reason: 'missing' } });
    expect(renderCatalogDql(callers, null)).toEqual({ ok: false, refusal: { param: 'rootId', reason: 'missing' } });
    expect(renderCatalogDql(callers, { rootId: IDS.root, extra: IDS.root })).toEqual({ ok: false, refusal: { param: 'extra', reason: 'unexpected' } });
    expect(renderCatalogDql(callers, { rootId: [IDS.root] })).toEqual({ ok: false, refusal: { param: 'rootId', reason: 'wrong-type' } });
    expect(renderCatalogDql(callers, { rootId: 42 as unknown as string }).ok).toBe(false);
    expect(renderCatalogDql(callers, Object.create({ rootId: IDS.root }) as Record<string, string>).ok).toBe(false);
    // An entry without parameters runs its own text and takes no value at all.
    const hubs = getQuery('ev.topology.hubs');
    expect(renderCatalogDql(hubs, null)).toEqual({ ok: true, dql: hubs.dql });
    expect(renderCatalogDql(hubs, { rootId: IDS.root }).ok).toBe(false);
    expect(renderCatalogDql(getQuery('prob.summary'), { x: 'y' }).ok).toBe(false);
  });

  it('bounds every list: empty, overlong, a bad item, a wrong type, a list where one value goes', () => {
    const minutes = getQuery('ev.service.minutes');
    expect(renderCatalogDql(minutes, { serviceIds: [] })).toEqual({ ok: false, refusal: { param: 'serviceIds', reason: 'too-few' } });
    const seven = Array.from({ length: 7 }, (_, index) => `SERVICE-${String(index).padStart(16, '0')}`);
    expect(renderCatalogDql(minutes, { serviceIds: seven })).toEqual({ ok: false, refusal: { param: 'serviceIds', reason: 'too-many' } });
    expect(renderCatalogDql(minutes, { serviceIds: seven.slice(0, 6) }).ok).toBe(true);
    expect(renderCatalogDql(minutes, { serviceIds: [IDS.root, `${IDS.caller}"), array("x`] }).ok).toBe(false);
    expect(renderCatalogDql(minutes, { serviceIds: [IDS.root, IDS.host] })).toEqual({ ok: false, refusal: { param: 'serviceIds', reason: 'wrong-entity-type' } });
    expect(renderCatalogDql(minutes, { serviceIds: IDS.root })).toEqual({ ok: false, refusal: { param: 'serviceIds', reason: 'wrong-type' } });

    const logs = getQuery('rca.incident.logs');
    const many = Array.from({ length: INCIDENT_LOG_MAX_IDS + 1 }, (_, index) => `HOST-${index.toString(16).toUpperCase().padStart(16, '0')}`);
    expect(renderCatalogDql(logs, { entityIds: many.slice(0, INCIDENT_LOG_MAX_IDS) }).ok).toBe(true);
    expect(renderCatalogDql(logs, { entityIds: many })).toEqual({ ok: false, refusal: { param: 'entityIds', reason: 'too-many' } });
    for (const attack of attacks(IDS.root)) {
      expect(renderCatalogDql(logs, { entityIds: [IDS.host, attack] }).ok, JSON.stringify(attack)).toBe(false);
    }
  });

  it('refuses a template placeholder the entry does not declare', () => {
    const entry = entryWith({ a: { kind: 'entityId', description: 'An id for the test.' } }, 'fetch x | filter id == {{a}} or id == {{b}}');
    expect(renderCatalogDql(entry, { a: IDS.root })).toEqual({ ok: false, refusal: { param: 'b', reason: 'template' } });
  });

  it('renders a placeholder as often as the template uses it, and only as a quoted literal', () => {
    const entry = entryWith({ a: { kind: 'entityId', description: 'An id for the test.' } }, 'x == {{a}} or y == {{a}}');
    expect(renderCatalogDql(entry, { a: IDS.root })).toEqual({ ok: true, dql: `x == "${IDS.root}" or y == "${IDS.root}"` });
  });

  it('quotes with escapes, and refuses control characters outright', () => {
    expect(quoteDqlString('SERVICE-0123456789ABCDEF')).toBe('"SERVICE-0123456789ABCDEF"');
    expect(quoteDqlString('a"b')).toBe('"a\\"b"');
    expect(quoteDqlString('a\\b')).toBe('"a\\\\b"');
    expect(quoteDqlString('a\\"b')).toBe('"a\\\\\\"b"');
    expect(() => quoteDqlString('a\nb')).toThrow();
    expect(() => quoteDqlString('a\u0000b')).toThrow();
    expect(() => quoteDqlString('a\u007fb')).toThrow();
  });

  it('validates one value at a time with the same rules', () => {
    expect(validateParam({ kind: 'entityId', description: 'x' }, undefined)).toBe('missing');
    expect(validateParam({ kind: 'entityId', description: 'x' }, '')).toBe('invalid');
    expect(validateParam({ kind: 'entityId', entityType: 'HOST', description: 'x' }, IDS.host)).toBeNull();
    expect(ENTITY_ID_PATTERN.test(`${IDS.host}\n`)).toBe(false);
  });

  it('keys the values by content, whatever the key order or the array identity', () => {
    expect(paramsKey({ a: 'x', b: ['y'] })).toBe(paramsKey({ b: ['y'], a: 'x' }));
    expect(paramsKey({ a: 'x' })).not.toBe(paramsKey({ a: 'y' }));
    expect(paramsKey(null)).toBe('');
  });
});

// ------------------------------------------------------------------ 3. the hook

const WINDOW = { startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z' };

describe('TD-08: useCatalogQuery with parameters', () => {
  it('sends the rendered text, the caller window and the entry guards', () => {
    const { result } = renderHook(() => useCatalogQuery('rca.callers', { refreshToken: 0, params: { rootId: IDS.root }, window: WINDOW }));
    const sent = dql.calls.at(-1);
    expect(sent?.enabled).toBe(true);
    expect(sent?.params).toMatchObject({
      query: TD08_DQL['callers root'],
      defaultTimeframeStart: WINDOW.startIso,
      defaultTimeframeEnd: WINDOW.endIso,
      defaultScanLimitGbytes: 1,
      maxResultRecords: 5,
    });
    expect(result.current.dql).toBe(TD08_DQL['callers root']);
    expect(result.current.refusal).toBeNull();
    expect(result.current.evidence.queryId).toBe('rca.callers');
  });

  it('refuses an injected value: outcome "refused", nothing enabled, the value never in any request', () => {
    const attack = `${IDS.root}" | fetch logs | limit 1 //`;
    const { result } = renderHook(() => useCatalogQuery('rca.callers', { refreshToken: 0, params: { rootId: attack }, window: WINDOW }));
    expect(result.current.outcome).toBe('refused');
    expect(result.current.provenance).toBe('failed');
    expect(result.current.refusal).toEqual({ param: 'rootId', reason: 'invalid' });
    expect(result.current.dql).toBeNull();
    expect(result.current.records).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(dql.calls.length).toBeGreaterThan(0);
    for (const call of dql.calls) {
      expect(call.enabled).toBe(false);
      expect(call.params.query).not.toContain('fetch logs');
      expect(call.params.query).not.toContain(attack);
    }
  });

  it('refuses a missing, reversed or too-long caller window', () => {
    const cases = [null, { startIso: WINDOW.endIso, endIso: WINDOW.startIso }, { startIso: '2026-09-22T00:00:00.000Z', endIso: '2026-09-22T07:00:00.001Z' }, { startIso: 'x', endIso: WINDOW.endIso }];
    for (const window of cases) {
      dql.calls.length = 0;
      const { result, unmount } = renderHook(() => useCatalogQuery('rca.callers', { refreshToken: 0, params: { rootId: IDS.root }, window }));
      expect(result.current.outcome, JSON.stringify(window)).toBe('refused');
      expect(result.current.refusal).toEqual({ param: 'window', reason: 'window' });
      expect(dql.calls.every((call) => !call.enabled)).toBe(true);
      unmount();
    }
    // Exactly the entry's ceiling is allowed.
    const { result } = renderHook(() => useCatalogQuery('rca.callers', { refreshToken: 0, params: { rootId: IDS.root }, window: { startIso: '2026-09-22T00:00:00.000Z', endIso: '2026-09-22T07:00:00.000Z' } }));
    expect(result.current.refusal).toBeNull();
  });

  it('stays quiet when disabled, whatever the values', () => {
    const { result } = renderHook(() => useCatalogQuery('rca.callers', { refreshToken: 0, enabled: false, params: null, window: null }));
    expect(result.current.outcome).not.toBe('refused');
    expect(result.current.refusal).toBeNull();
    expect(dql.calls.every((call) => !call.enabled)).toBe(true);
  });

  it('keeps one request object while callers rebuild their values and window on every render', () => {
    const { rerender } = renderHook(() =>
      useCatalogQuery('ev.service.minutes', { refreshToken: 0, params: { serviceIds: [IDS.root, IDS.caller] }, window: { ...WINDOW } }),
    );
    rerender();
    rerender();
    const sent = dql.calls.map((call) => call.params);
    expect(sent.length).toBeGreaterThanOrEqual(3);
    for (const params of sent) expect(params).toBe(sent[0]);
    expect(sent[0]?.query).toBe(TD08_DQL['B4 two']);
  });

  it('leaves the call signature of every fixed entry unchanged', () => {
    const globalWindow = { startIso: '2026-08-30T12:00:00.000Z', endIso: '2026-08-31T12:00:00.000Z', label: 'last 24 hours', expression: 'now-24h' };
    const { result } = renderHook(() => useCatalogQuery('prob.summary', { globalWindow, refreshToken: 0 }));
    expect(dql.calls.at(-1)?.params.query).toBe(getQuery('prob.summary').dql);
    expect(dql.calls.at(-1)?.enabled).toBe(true);
    expect(result.current.refusal).toBeNull();
    // A fixed entry that follows the app window does not run without one.
    dql.calls.length = 0;
    expect(getQuery('svc.breakdown').timeframe).toBe('global');
    const missing = renderHook(() => useCatalogQuery('svc.breakdown', { refreshToken: 0 }));
    expect(missing.result.current.outcome).toBe('refused');
    expect(dql.calls.every((call) => !call.enabled)).toBe(true);
  });
});

describe('TD-08: the incident logs read through the catalog', () => {
  it('sends the 3.3.1 text over the padded window at the 10 GB ceiling', () => {
    renderHook(() => useIncidentErrorLogs(incident([IDS.root, IDS.caller], []), 0));
    const sent = dql.calls.find((call) => call.enabled)?.params;
    expect(sent?.query).toBe(TD08_DQL['logs services only']);
    expect(sent).toMatchObject({ defaultTimeframeStart: '2026-09-22T22:32:00.000Z', defaultTimeframeEnd: '2026-09-22T23:24:00.000Z', defaultScanLimitGbytes: 10 });
  });

  it('is disabled without ids; past the id ceiling it reads the first ids and says its counts are a floor (review 3.3.2 #6)', () => {
    const none = renderHook(() => useIncidentErrorLogs(incident(['not-an-id'], []), 0));
    expect(none.result.current.outcome).toBe('disabled');
    dql.calls.length = 0;
    const many = Array.from({ length: INCIDENT_LOG_MAX_IDS + 1 }, (_, index) => `HOST-${index.toString(16).toUpperCase().padStart(16, '0')}`);
    const cut = renderHook(() => useIncidentErrorLogs(incident(many, []), 0));
    // The query runs (it is no longer refused): enabled, with exactly the ceiling's worth of ids.
    expect(dql.calls.some((call) => call.enabled)).toBe(true);
    expect(cut.result.current.outcome).not.toBe('error');
  });
});

// ------------------------------------------------------------------ 4. one door to Grail

/** Walks a directory for TypeScript sources. */
function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'tests' && name !== 'node_modules') out.push(...sources(path));
    } else if (/\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe('TD-08: useDql is imported only by useCatalogQuery', () => {
  it('finds no other import of useDql (or of the raw query client) in the app', () => {
    const app = join(process.cwd(), 'ui', 'app');
    const offenders: string[] = [];
    for (const file of sources(app)) {
      const path = relative(app, file).split(sep).join('/');
      const text = readFileSync(file, 'utf8');
      const importsUseDql = /import\s*\{[^}]*\buseDql\b[^}]*\}\s*from\s*'@dynatrace-sdk\/react-hooks'/.test(text);
      const importsQueryClient = /\bqueryClient\b[^;]*from\s*'@dynatrace-sdk\/client-query'/.test(text) || /from\s*'@dynatrace-sdk\/client-query'[^;]*\bqueryClient\b/.test(text);
      if ((importsUseDql || importsQueryClient) && path !== 'hooks/useCatalogQuery.ts') offenders.push(path);
    }
    // The dashboard tiles (features/dashboard/pocDashboard.ts) build DQL for a dashboard document;
    // they never query Grail from the app, so they are not an offender here.
    expect(offenders).toEqual([]);
  });
});

describe('the incident logs past the id ceiling (review 3.3.2 #6)', () => {
  it('deduplicates, reads the first ids in Davis’s order and says the counts are a floor, instead of refusing', () => {
    const many = Array.from({ length: INCIDENT_LOG_MAX_IDS + 40 }, (_, index) => `PROCESS_GROUP_INSTANCE-${index.toString(16).toUpperCase().padStart(16, '0')}`);
    const incident = { affectedIds: ['SERVICE-0000000000000001', 'SERVICE-0000000000000001'], relatedIds: many } as unknown as Parameters<typeof incidentLogsQuery>[0];
    const query = incidentLogsQuery(incident)!;
    expect(query.truncated).toBe(true);
    expect(query.params.entityIds).toHaveLength(INCIDENT_LOG_MAX_IDS);
    expect(new Set(query.params.entityIds).size).toBe(INCIDENT_LOG_MAX_IDS);
    // Within the ceiling a list is kept exactly as 3.3.1 built it (its text is pinned byte for byte).
    expect(query.params.serviceIds).toEqual(['SERVICE-0000000000000001', 'SERVICE-0000000000000001']);
    const small = incidentLogsQuery({ affectedIds: ['SERVICE-0000000000000001'], relatedIds: [] } as unknown as Parameters<typeof incidentLogsQuery>[0])!;
    expect(small.truncated).toBe(false);
  });
});
