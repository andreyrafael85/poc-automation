import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DYNAMIC_EVIDENCE_IDS, EVIDENCE_QUERIES, identifyEvidenceQuery } from '../features/wrapup/prints/evidence/registry';
import { summariseCallers, summariseLogErrors, summariseProblemEvents, summariseRecurrence, summariseServiceMinutes } from '../features/wrapup/prints/evidence/summarise';
import type { GrailRecord } from '../utils/records';
import { REDACTED } from '../utils/sanitize';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM data file of the visual harness, no declaration file
import * as harnessIds from '../../../scripts/visual/fixtures/evidenceIds.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM fixtures of the visual harness, no declaration file
import * as printsFixtures from '../../../scripts/visual/fixtures/prints.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM fixtures of the visual harness, no declaration file
import * as richFixtures from '../../../scripts/visual/fixtures/rich.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM fixtures of the visual harness, no declaration file
import * as sparseFixtures from '../../../scripts/visual/fixtures/sparse.mjs';

/**
 * The visual harness serves the real-prints evidence queries from its fixtures (3.2.7, spec §7.6).
 * It recognises them with the app's own `identifyEvidenceQuery`, and `capture.mjs` treats the ids
 * of `scripts/visual/fixtures/evidenceIds.mjs` as dynamic (not catalog) queries — so that list
 * must be exactly the registry's `DYNAMIC_EVIDENCE_IDS`, or a new query would render empty in the
 * harness (no analysis slide) without anyone noticing.
 */

const EVIDENCE_IDS = (harnessIds as { EVIDENCE_IDS: readonly string[] }).EVIDENCE_IDS;
const ROOT = process.cwd();
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

describe('visual harness — real-prints evidence ids', () => {
  it('lists exactly the registry dynamic evidence ids, in the registry order', () => {
    expect([...EVIDENCE_IDS]).toEqual([...DYNAMIC_EVIDENCE_IDS]);
    expect(EVIDENCE_IDS).toHaveLength(19);
  });

  it('leaves out B3, whose text is the trail callers query the harness resolves first', () => {
    expect(EVIDENCE_IDS).not.toContain('ev.incident.callers');
    expect(EVIDENCE_QUERIES['ev.incident.callers'].sameTextAs).toBe('rca.callers');
  });

  it('resolves dynamic evidence DQL through identifyEvidenceQuery after its own regexes', () => {
    const hooks = read('scripts/visual/mocks/react-hooks.mjs');
    expect(hooks).toContain("import { identifyEvidenceQuery } from '../../../ui/app/features/wrapup/prints/evidence/registry.ts';");
    const resolve = hooks.slice(hooks.indexOf('function resolveId('), hooks.indexOf('function resolveId(') + 600);
    const logs = resolve.indexOf("return 'incident.logs'");
    const callers = resolve.indexOf("return 'rca.callers'");
    const evidence = resolve.indexOf('return identifyEvidenceQuery(query) ?? null');
    expect(logs).toBeGreaterThan(0);
    expect(callers).toBeGreaterThan(logs);
    expect(evidence).toBeGreaterThan(callers);
  });

  it('gives every dynamic evidence id a fixture key in the rich and the sparse estates', () => {
    const rich = read('scripts/visual/fixtures/prints.mjs');
    for (const id of DYNAMIC_EVIDENCE_IDS) expect(rich).toContain(`'${id}':`);
    expect(read('scripts/visual/fixtures/rich.mjs')).toContain('...buildPrintFixtures(');
    expect(read('scripts/visual/fixtures/sparse.mjs')).toContain('...emptyPrintFixtures(EVIDENCE_IDS)');
  });

  it('marks the evidence ids as dynamic in capture.mjs', () => {
    expect(read('scripts/visual/capture.mjs')).toContain("const DYNAMIC = new Set(['incident.logs', 'rca.callers', ...EVIDENCE_IDS]);");
  });

  it('is a list identifyEvidenceQuery can return (each id names a registry entry with its own signature)', () => {
    for (const id of EVIDENCE_IDS) {
      const meta = EVIDENCE_QUERIES[id as keyof typeof EVIDENCE_QUERIES];
      expect(meta, id).toBeDefined();
      expect(meta.sameTextAs).toBeUndefined();
    }
    expect(identifyEvidenceQuery('fetch dt.entity.service | limit 1')).toBeNull();
  });
});

/**
 * What the harness fixtures claim (`scripts/visual/fixtures/prints.mjs`), read through the app's own
 * summarisers: a renamed field on either side would otherwise leave the harness deck without its
 * analysis slides, or without the data that proves redaction, and every run would still pass.
 */

interface Request {
  query?: string;
  startIso?: string | null;
  endIso?: string | null;
}
type Table = { records: GrailRecord[] };
type Fixture = Table | ((request: Request) => Table);

const { FAKE_EMAIL, FAKE_IP } = printsFixtures as { FAKE_EMAIL: string; FAKE_IP: string };
const rich = (richFixtures as { buildRich: () => Record<string, Fixture> }).buildRich();
const sparse = (sparseFixtures as { buildSparse: () => Record<string, Fixture> }).buildSparse();
const records = (estate: Record<string, Fixture>, id: string, request: Request = {}): GrailRecord[] => {
  const fixture = estate[id];
  if (fixture === undefined) throw new Error(`no fixture ${id}`);
  return (typeof fixture === 'function' ? fixture(request) : fixture).records;
};

describe('visual harness — the rich evidence fixtures, read by the app', () => {
  const incident = records(rich, 'rca.top')[0] as { rootCauseId: string };
  const rootId = incident.rootCauseId;
  const callers = summariseCallers(records(rich, 'rca.callers'));
  const callerId = callers.rows[0]?.id ?? '';

  it('B1: five events and the problem row (users 52); the fake e-mail and IP it carries are redacted', () => {
    const raw = records(rich, 'ev.problem.events');
    expect(JSON.stringify(raw)).toContain(FAKE_EMAIL);
    const summary = summariseProblemEvents(raw);
    expect(summary.problem?.events).toHaveLength(5);
    expect(summary.problem?.davisUsers).toBe(52);
    expect(summary.problem?.events[0]?.sourceId).toBe(rootId);
    expect(summary.problem?.events.some((event) => event.detail === `Contact ${REDACTED} on ${REDACTED}.`)).toBe(true);
    expect(JSON.stringify(summary)).not.toContain(FAKE_EMAIL);
    expect(JSON.stringify(summary)).not.toContain(FAKE_IP);
  });

  it('B2: the root ranks first, 3.0x the next; B3: a database root with 4 callers', () => {
    const recurrence = summariseRecurrence(records(rich, 'ev.problem.recurrence'));
    expect(recurrence.rank[0]?.id).toBe(rootId);
    expect((recurrence.rank[0]?.problems ?? 0) / (recurrence.rank[1]?.problems ?? 1)).toBe(3);
    expect(callers.rootType).toBe('DATABASE_SERVICE');
    expect(callers.rows).toHaveLength(4);
  });

  it('B4: one bin per minute of the window asked, for the ids in the text, with a 5-minute 100 % block and a 4-minute gap', () => {
    const startIso = '2026-09-15T05:00:00.000Z';
    const endIso = '2026-09-15T06:10:00.000Z';
    const query = `timeseries … filter in(dt.entity.service, array("${rootId}", "${callerId}"))`;
    const services = summariseServiceMinutes(records(rich, 'ev.service.minutes', { query, startIso, endIso }));
    expect(services.map((service) => service.id)).toEqual([rootId, callerId]);
    for (const service of services) {
      expect(service.requests.startIso).toBe(startIso);
      expect(service.requests.stepMs).toBe(60_000);
      expect(service.requests.values).toHaveLength(70);
    }
    const [root, caller] = services;
    const allFailed = root?.requests.values.map((value, index) => value !== null && value > 0 && root.failures.values[index] === value) ?? [];
    expect(allFailed.join('')).toContain('truetruetruetruetrue');
    expect(allFailed.filter(Boolean)).toHaveLength(5);
    const gap = caller?.requests.values.map((value) => value === null) ?? [];
    expect(gap.filter(Boolean)).toHaveLength(4);
    expect(gap.join('')).toContain('truetruetruetrue');
  });

  it('B15: six log signatures; the one with the fake e-mail and IP is redacted', () => {
    const raw = records(rich, 'ev.logs.errors');
    expect(JSON.stringify(raw)).toContain(FAKE_IP);
    const logs = summariseLogErrors(raw);
    expect(logs.signatures).toHaveLength(6);
    // Redacted, not dropped: the e-mail leads the signature, so a slide's ~30-character label would show a leak.
    expect(logs.signatures.some((row) => row.signature.startsWith(`${REDACTED} ${REDACTED}: payment callback rejected`))).toBe(true);
    expect(JSON.stringify(logs)).not.toContain(FAKE_EMAIL);
    expect(JSON.stringify(logs)).not.toContain(FAKE_IP);
  });

  it('serves every evidence id and the cluster ids in rich; sparse has them all as empty tables', () => {
    for (const id of ['k8s.cluster.ids', ...EVIDENCE_IDS]) {
      expect(rich[id], id).toBeDefined();
      expect(records(sparse, id), id).toEqual([]);
    }
    expect(records(rich, 'k8s.cluster.ids').length).toBeGreaterThan(0);
  });
});
