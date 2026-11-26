import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { buildTriageWorkflow, TRIAGE_ACTION, TRIAGE_RESULT } from '../features/builder/pocAutomation';
import { runTriage, triageText, type TriageQuery } from '../features/triage/triage';
import { entryFor } from '../i18n/strings';
import { getQuery } from '../queries/catalog';

/**
 * 3.7.0 — the owner: "seguir com a ação customizada na próxima release": the app's own workflow action, PoC Automation ·
 * Triage, reading a problem with the workflow actor's permissions through the app's catalog, and the PoC Builder's triage
 * workflow using it.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const EVENT = '3317257838245384203_1793609340000V2';
const ROOT = 'SERVICE-465C3BFC3AB9DDBD';
const CALLER = 'SERVICE-911FA59770CD747F';

const problemRecord = {
  displayId: 'P-2611386',
  name: 'Failure rate increase',
  category: 'ERROR',
  status: 'ACTIVE',
  affectedNames: ['easyTradeManager', 'AccountControllerV2'],
  affectedTypes: ['dt.entity.service', 'dt.entity.service'],
  affectedIds: [ROOT, CALLER],
  rootCauseName: 'easyTradeManager',
  rootCauseId: ROOT,
  eventId: EVENT,
  start: '2026-11-22T17:00:00.000Z',
  end: null,
  affectedCount: 2,
};

function fakeQuery(problem: Record<string, unknown> | null, failLogs = false) {
  const calls: { id: string; dql: string; start: string; end: string }[] = [];
  const query: TriageQuery = (id, dql, window) => {
    calls.push({ id, dql, start: window.startIso, end: window.endIso });
    if (id === 'triage.problem') return Promise.resolve(problem === null ? [] : [problem]);
    if (id.startsWith('rca.incident.logs')) {
      if (failLogs) return Promise.reject(new Error('refused'));
      return Promise.resolve([
        { sig: 'java.sql.SQLTransientConnectionException: pool exhausted', count: 41, errors: 41 },
        { sig: 'Connection reset by peer', count: 7, errors: 2 },
        { isTotal: true, count: 48, errors: 43 },
      ]);
    }
    if (id === 'rca.callers') return Promise.resolve([{ id: CALLER, name: 'AccountControllerV2', requests: 1200, failures: 96, rootType: 'WEB_REQUEST_SERVICE' }]);
    return Promise.resolve([]);
  };
  return { query, calls };
}

const deps = (query: TriageQuery) => ({ query, environmentUrl: 'https://abc12345.apps.dynatrace.com/', appId: 'my.poc.automation', now: Date.parse('2026-11-22T18:00:00Z') });

describe('the manifest and the action files', () => {
  it('declares the action, with no new scope (its reads use the app’s declared storage scopes)', () => {
    const manifest = JSON.parse(read('app.config.json')) as { app: { actions: { name: string; title: string }[]; scopes: unknown[] } };
    expect(manifest.app.actions).toEqual(
      // 3.7.4 added the weekly summary's action beside it.
      expect.arrayContaining([expect.objectContaining({ name: 'poc-triage', title: 'PoC Automation · Triage' })]),
    );
    // 3.7.3 added the two synthetic scopes, 3.7.4 settings:objects:write and 3.7.6 settings:objects:read; the action still needs none of its own.
    expect(manifest.app.scopes).toHaveLength(25);
    expect(read('actions/poc-triage.action.ts')).toContain("from '../ui/app/features/triage/triage'");
    expect(read('actions/poc-triage.widget.tsx')).toContain('{{ event()["event.id"] }}');
  });

  it('reads the problem through a catalog template, one record of the last day', () => {
    const entry = getQuery('triage.problem');
    expect(entry.params?.['problemId']).toMatchObject({ kind: 'eventId' });
    expect(entry.guards).toEqual({ scanLimitGbytes: 1, maxResultRecords: 1 });
    expect(entry.validation.scannedBytesOnDemand).toBe(20976792);
  });
});

describe('the triage', () => {
  it('reads the problem, then its logs and the callers of its root cause, and writes a summary with every figure read', async () => {
    const { query, calls } = fakeQuery(problemRecord);
    const result = await runTriage({ problemId: EVENT, language: 'en' }, deps(query));
    expect(calls.map((call) => call.id)).toEqual(['triage.problem', 'rca.incident.logs.services', 'rca.callers']);
    expect(calls[0]?.dql).toContain(`filter event.id == "${EVENT}"`);
    expect(result.found).toBe(true);
    expect(result.subject).toBe('P-2611386 — Failure rate increase · easyTradeManager');
    expect(result.summary).toContain('Root cause named by Dynatrace Intelligence: **easyTradeManager**.');
    expect(result.summary).toContain('48 error and warning records, 43 of them errors');
    expect(result.summary).toContain('| 41 | `java.sql.SQLTransientConnectionException: pool exhausted` |');
    expect(result.summary).toContain('| AccountControllerV2 | 96 | 1,200 |');
    expect(result.problemLink).toMatch(/^https:\/\/abc12345\.apps\.dynatrace\.com\/ui\/apps\/dynatrace\.davis\.problems\/problem\//);
    expect(result.appLink).toBe('https://abc12345.apps.dynatrace.com/ui/apps/my.poc.automation/rca');
  });

  it('writes Portuguese when asked', async () => {
    const { query } = fakeQuery(problemRecord);
    const result = await runTriage({ problemId: EVENT, language: 'pt-BR' }, deps(query));
    expect(result.summary).toContain('Causa raiz apontada pela Dynatrace Intelligence: **easyTradeManager**.');
    expect(result.summary).toContain('| AccountControllerV2 | 96 | 1.200 |');
  });

  it('leaves out a part whose read failed, never inventing it', async () => {
    const { query } = fakeQuery(problemRecord, true);
    const lines: string[] = [];
    const result = await runTriage({ problemId: EVENT }, deps(query), (line) => lines.push(line));
    expect(result.logs).toBeNull();
    expect(result.summary).toContain(triageText('triage.logsNone', 'en'));
    expect(lines.some((line) => line.startsWith('logs not read'))).toBe(true);
  });

  it('refuses anything that is not an event id, and says when the problem is not found', async () => {
    const { query, calls } = fakeQuery(problemRecord);
    const bad = await runTriage({ problemId: '" or true or "' }, deps(query));
    expect(bad.found).toBe(false);
    expect(calls).toHaveLength(0);
    const missing = await runTriage({ problemId: EVENT }, deps(fakeQuery(null).query));
    expect(missing.found).toBe(false);
    expect(missing.summary).toContain('No record of problem');
  });
});

describe('the PoC Builder’s triage workflow', () => {
  it('runs the triage action on the trigger’s problem and sends its subject and summary', () => {
    const body = buildTriageWorkflow({ title: 't', description: 'd', triageDescription: 'x', taskDescription: 'y' }, ['team@example.com'], false, true, 'pt-BR');
    expect(body.tasks['poc_triage']).toMatchObject({ action: TRIAGE_ACTION, input: { problemId: '{{ event()["event.id"] }}', language: 'pt-BR' } });
    // 3.7.3: without the AI words the e-mail still sends the triage's summary, after the Dynatrace Assist task.
    expect(body.tasks['notify_team']).toMatchObject({ predecessors: ['dynatrace_assist'], input: { subject: TRIAGE_RESULT.subject, content: TRIAGE_RESULT.summary } });
  });
});

describe('What’s new', () => {
  it('keeps the 3.7.0 entry in its fragment', () => {
    // 3.7.1: newer releases come first.
    // 3.8.0: i112 left the ten What's new shows (the entry stays in its fragment).
    expect(WHATS_NEW).not.toContainEqual({ key: 'help.whatsNew.i112', published: '2026-11-22' });
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i112').en.startsWith('3.7.0 — ')).toBe(true);
    expect(entryFor('help.whatsNew.title').en).toBe('What’s new in 3.8'); // 3.8.0: the minor bump
  });
});
