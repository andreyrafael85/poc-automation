import React, { useEffect, useState } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, renderHook, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { OpenAccess } from '../config/AccessContext';
import { MAX_CAPTURES_PER_SECTION, PRIVATE_KEY, parseCaptureChoice, parsePrivate } from '../config/persistence';
import { createMemoryStore } from '../config/stateStore';
import { StudioProvider, useQueryScope, useStudio } from '../config/StudioContext';
import { CAPTURE_REGISTRY, CaptureStage, buildCaptureTargets, captureOptionsBySection, placePin, resolveCaptureChoice, type CaptureOutcome } from '../features/wrapup/captures';
import {
  CAPTURE_TTL_MS,
  EMPTY_SNAPSHOT,
  boundSnapshot,
  mergeRun,
  parseSnapshot,
  resetCaptureMemory,
  useCaptureStore,
  type CaptureBackend,
  type CaptureRead,
  type CaptureSnapshot,
  type StoredCapture,
} from '../features/wrapup/captureStore';
import type { WrapupModel } from '../features/wrapup/deck';
import { COMMERCIAL_SECTION_IDS, DECK_SECTION_IDS } from '../features/wrapup/model';
import { buildDeckSpec, type CaptureSlide, type DeckCapture } from '../features/wrapup/spec';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { translate, type StringKey } from '../i18n/strings';
import { TechWrapup, sectionReadiness } from '../pages/TechWrapup';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';

/**
 * 3.3.2 — "the capture button does not capture the new charts, so the Tech Wrapup is not updated".
 *
 * The deck photographed a hand-written list of eleven panels, one per section, and kept the pictures
 * in the page's state. These pin the fix: one registry with a contract (every non-commercial deck
 * section has a panel), the SE's choice of up to two panels per section kept in the private
 * configuration, the pictures kept with the read they belong to across leaving the tab and
 * reloading it, and the readiness strip before the download.
 */

interface Canned {
  outcome?: QueryOutcome;
  records?: GrailRecord[];
}
let canned: Partial<Record<CatalogId, Canned>> = {};

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId): CatalogQueryResult => {
    const entry = getQuery(id);
    const given = canned[id] ?? {};
    const records = given.records ?? [];
    const outcome: QueryOutcome = given.outcome ?? (records.length > 0 ? 'ok' : 'empty');
    return {
      entry,
      records,
      raw: undefined,
      quality: CLEAN_QUALITY,
      outcome,
      provenance: outcome === 'ok' ? 'observed' : outcome === 'empty' ? 'no-telemetry' : outcome === 'loading' ? 'loading' : 'failed',
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
      timeframe: { startIso: '2026-10-04T00:00:00.000Z', endIso: '2026-10-05T00:00:00.000Z', label: 'last 24 hours', expression: 'now-24h' },
      missingScopes: [],
      errorMessage: null,
      isLoading: outcome === 'loading',
      refetch: () => undefined,
    };
  },
}));

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({ data: undefined, error: undefined, isLoading: false, refetch: () => undefined }),
}));

/* eslint-disable noSecrets/no-secrets -- test images (a 1x1 PNG, a refused SVG), not secrets */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const CAPTURE: DeckCapture = { dataUrl: PNG, width: 720, height: 360, pins: [{ n: 1, x: 0.2, y: 0.3, label: 'Peak' }] };
const READ: CaptureRead = { windowEnd: '2026-11-16T12:00:00.000Z', locale: 'en' };
const OTHER_READ: CaptureRead = { windowEnd: '2026-11-16T09:00:00.000Z', locale: 'en' };
const SECTION_OF = new Map(CAPTURE_REGISTRY.map((entry) => [entry.captureId, entry.sectionId]));
const sectionOf = (id: string) => SECTION_OF.get(id);

beforeEach(() => {
  canned = {};
  resetCaptureMemory();
});
afterEach(() => resetCaptureMemory());

// ------------------------------------------------------------------ the contract

describe('the capture registry (the contract)', () => {
  it('lists every section the Tech Wrapup builds, so a new section cannot hide from the registry', () => {
    // 3.4.10: the Assessment's section is built in its own file, from the Assessment's reading.
    const source = ['model.ts', 'assessmentSection.ts'].map((file) => readFileSync(join(process.cwd(), 'ui/app/features/wrapup', file), 'utf8')).join('\n');
    const built = [...source.matchAll(/\bid: '([a-z]+)'/g)].map((match) => match[1]);
    expect([...new Set(built)].sort()).toEqual([...DECK_SECTION_IDS].sort());
  });

  it('has a panel for every deck section that is not commercial, and none for a commercial one', () => {
    const bySection = captureOptionsBySection();
    const uncovered = DECK_SECTION_IDS.filter((id) => !COMMERCIAL_SECTION_IDS.includes(id) && !bySection.has(id));
    expect(uncovered, `sections without a capture: ${uncovered.join(', ')}`).toEqual([]);
    for (const id of COMMERCIAL_SECTION_IDS) expect(bySection.has(id)).toBe(false);
    // The three the owner found missing.
    for (const id of ['cloud', 'technologies', 'executive']) expect(bySection.get(id)?.length ?? 0).toBeGreaterThan(0);
  });

  it('names only deck sections, with unique, well-formed ids under their section', () => {
    const ids = CAPTURE_REGISTRY.map((entry) => entry.captureId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of CAPTURE_REGISTRY) {
      expect(DECK_SECTION_IDS as readonly string[]).toContain(entry.sectionId);
      expect(entry.captureId.startsWith(`${entry.sectionId}.`), entry.captureId).toBe(true);
      // The same shape the private configuration accepts, so a choice can always be saved.
      expect(parseCaptureChoice({ [entry.sectionId]: [entry.captureId] })).toEqual({ [entry.sectionId]: [entry.captureId] });
    }
  });

  it('labels every panel in both languages', () => {
    for (const entry of CAPTURE_REGISTRY) {
      for (const locale of ['en', 'pt-BR'] as const) {
        const label = translate(entry.label, locale);
        expect(label, `${entry.captureId} / ${locale}`).not.toBe(entry.label);
        expect(label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('offers a second panel where the page has two pictures worth a slide', () => {
    const bySection = captureOptionsBySection();
    for (const id of ['cloud', 'technologies', 'executive']) expect(bySection.get(id)?.length).toBe(2);
    // 3.4.10: Dynatrace Intelligence offers its new charts too — heat calendar, rings, arrivals and mix.
    expect(bySection.get('problems')?.length).toBe(4);
    // 3.3.16 (owner: "usar somente os novos"): where a new panel exists, it is the only one.
    for (const id of ['infrastructure', 'kubernetes', 'services', 'experience']) expect(bySection.get(id)?.length).toBe(1);
  });

  it('opens Services, Kubernetes, Infrastructure and Digital experience on the cockpit panels (3.3.15)', () => {
    expect(resolveCaptureChoice('services', {})).toEqual(['services.slowest']);
    expect(resolveCaptureChoice('kubernetes', {})).toEqual(['kubernetes.stable']);
    expect(resolveCaptureChoice('infrastructure', {})).toEqual(['infrastructure.ceiling']);
    expect(resolveCaptureChoice('experience', {})).toEqual(['experience.errors']);
    // 3.4.10: Problems opens on the heat calendar (the slide already draws the arrivals); the rest are options.
    expect(resolveCaptureChoice('problems', {})).toEqual(['problems.calendar']);
    // An SE's earlier choice of a panel the deck no longer offers falls back to the new one (3.3.16).
    expect(resolveCaptureChoice('kubernetes', { kubernetes: ['kubernetes.restarts'] })).toEqual(['kubernetes.stable']);
  });
});

// ------------------------------------------------------------------ the choice

describe('the choice of panels per section', () => {
  it('takes the section default when nothing (valid) was chosen', () => {
    expect(resolveCaptureChoice('cloud', {})).toEqual(['cloud.hosts']);
    expect(resolveCaptureChoice('cloud', { cloud: ['cloud.gone'] })).toEqual(['cloud.hosts']);
    // An id of another section is not this section's choice.
    expect(resolveCaptureChoice('cloud', { cloud: ['services.response-time'] })).toEqual(['cloud.hosts']);
    expect(resolveCaptureChoice('consumption', {})).toEqual([]);
  });

  it('keeps up to two, in the registry order', () => {
    expect(resolveCaptureChoice('cloud', { cloud: ['cloud.services', 'cloud.hosts'] })).toEqual(['cloud.hosts', 'cloud.services']);
    expect(resolveCaptureChoice('cloud', { cloud: ['cloud.services'] })).toEqual(['cloud.services']);
    expect(MAX_CAPTURES_PER_SECTION).toBe(2);
  });

  it('reads a stored choice as untrusted input', () => {
    expect(parseCaptureChoice(null)).toEqual({});
    expect(parseCaptureChoice({ cloud: 'cloud.hosts' })).toEqual({});
    expect(parseCaptureChoice({ cloud: ['cloud.hosts', 'cloud.hosts', 'cloud.services', 'cloud.x'], 'Bad Id': ['x'], services: [42, '<script>'] })).toEqual({
      cloud: ['cloud.hosts', 'cloud.services'],
    });
    const parsed = parsePrivate(JSON.stringify({ v: 1, captureChoice: { executive: ['executive.rings'] } }));
    expect(parsed?.captureChoice).toEqual({ executive: ['executive.rings'] });
    // A document written before 3.3.2 has none.
    expect(parsePrivate(JSON.stringify({ v: 1 }))?.captureChoice).toEqual({});
  });

  it('is kept with the private configuration, never the shared one', async () => {
    const store = createMemoryStore();
    const ref: { current: ReturnType<typeof useStudio> | null } = { current: null };
    const Probe = () => {
      ref.current = useStudio();
      return null;
    };
    render(
      <StudioProvider store={store} saveDelayMs={20}>
        <Probe />
      </StudioProvider>,
    );
    await waitFor(() => expect(ref.current?.persistence.status).toBe('saved'));
    act(() => ref.current?.setCaptureChoice('executive', ['executive.mttr', 'executive.rings']));
    await waitFor(() => expect(store.dump()[`user:${PRIVATE_KEY}`]).toBeDefined());
    const mine = JSON.parse(store.dump()[`user:${PRIVATE_KEY}`] as string) as Record<string, unknown>;
    expect(mine['captureChoice']).toEqual({ executive: ['executive.mttr', 'executive.rings'] });
    expect(Object.keys(store.dump()).some((key) => key.startsWith('app:'))).toBe(false);
    act(() => ref.current?.setCaptureChoice('executive', []));
    expect(ref.current?.captureChoice).toEqual({});
  });
});

// ------------------------------------------------------------------ the deck

const MODEL: WrapupModel = {
  customerName: 'Contoso',
  engagementName: 'PoC',
  windowLabel: 'last 24 hours',
  generatedAtLabel: 'Generated',
  seName: null,
  dtLogo: PNG,
  customerLogo: null,
  customerLogoAspect: null,
  partnerName: '',
  partnerLogo: null,
  partnerLogoAspect: null,
  platformLogos: [],
  agenda: [],
  why: [],
  strings: {
    title: 'Tech Wrapup',
    subtitle: '',
    tagline: '',
    preparedBy: '',
    agendaTitle: 'Agenda',
    whyTitle: '',
    whySubtitle: '',
    assistLabel: 'Dynatrace Assist',
    partnerLabel: '',
    technicalDivider: 'Part one',
    technicalKicker: '',
    businessDivider: 'Part two',
    businessKicker: '',
    closingTitle: '',
    closingBullets: [],
    footer: '',
    measured: '',
    confidential: 'Confidential',
  },
  technical: [{ id: 'cloud', title: 'Cloud', narrative: ['One line'], kpis: [{ label: 'Hosts', value: '12' }] }],
  business: [],
};

describe('two captures of one section on the deck', () => {
  const captureTitles = (captures: Parameters<typeof buildDeckSpec>[1]['captures']) =>
    buildDeckSpec(MODEL, { profile: 'customer', captures })
      .slides.filter((slide): slide is CaptureSlide => slide.kind === 'capture')
      .map((slide) => slide.title);

  it('gives each its own slide, in the chosen order, and says which of the two it is', () => {
    expect(captureTitles({ cloud: [CAPTURE, { ...CAPTURE, width: 900 }] })).toEqual(['Cloud (1/2)', 'Cloud (2/2)']);
  });

  it('opens a captured subject on its capture, titled as the section (3.3.3)', () => {
    expect(captureTitles({ cloud: CAPTURE })).toEqual(['Cloud']);
    expect(captureTitles({ cloud: [CAPTURE] })).toEqual(['Cloud']);
    expect(captureTitles({ cloud: [] })).toEqual([]);
  });

  it('never gives a subject more than two slides, and never the same KPI twice (3.3.3, owner’s 3.3.2 validation)', () => {
    const cases: Readonly<Record<string, DeckCapture | readonly DeckCapture[]>>[] = [{}, { cloud: CAPTURE }, { cloud: [CAPTURE, { ...CAPTURE, width: 900 }] }];
    for (const captures of cases) {
      const slides = buildDeckSpec(MODEL, { profile: 'customer', captures }).slides.filter((slide) => (slide.kind === 'section' || slide.kind === 'capture') && slide.id === 'cloud');
      expect(slides.length).toBeLessThanOrEqual(2);
      const values = slides.flatMap((slide) => ('kpis' in slide ? slide.kpis.map((kpi) => kpi.value) : []));
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

// ------------------------------------------------------------------ the stage

describe('the stage tells "no data" from "not settled"', () => {
  it('reports the panels that settled without data apart from the ones that timed out', async () => {
    const onDone = vi.fn<(outcome: CaptureOutcome) => void>();
    render(
      <CaptureStage
        targets={[
          { sectionId: 'cloud', captureId: 'cloud.hosts', node: <p className="figure">3</p>, ready: () => true, pins: [] },
          { sectionId: 'cloud', captureId: 'cloud.services', node: null, ready: () => false, pins: [] },
          { sectionId: 'technologies', captureId: 'technologies.bars', node: <div role="status" />, ready: () => true, pins: [] },
          // A read that failed is skipped, never "no data" (review 3.3.2 #5).
          { sectionId: 'logs', captureId: 'logs.ingest', node: <div data-capture-state="failed" />, ready: () => false, pins: [] },
        ]}
        onDone={onDone}
        photographer={() => Promise.resolve(PNG)}
        settleMs={20}
        timeoutMs={700}
      />,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const outcome = onDone.mock.calls[0]?.[0] as CaptureOutcome;
    expect(Object.keys(outcome.captures)).toEqual(['cloud.hosts']);
    expect(outcome.noData).toEqual(['cloud.services']);
    expect(outcome.skipped.sort()).toEqual(['cloud.services', 'logs.ingest', 'technologies.bars']);
  });
});

// ------------------------------------------------------------------ the new panels, photographed

describe('the panels of cloud, technologies and executive', () => {
  const HOUR_NS = 3_600_000_000_000;
  const fmt = { compact: String, decimal: (value: number) => String(value), binTime: String, tick: () => String };
  const t = ((key: StringKey, params?: Record<string, string | number>) => translate(key, 'en', params)) as Parameters<typeof buildCaptureTargets>[0];

  it('draws each from the same queries as its page, settles, and pins what matters — with no money on any picture', async () => {
    canned = {
      'cloud.hosts': { records: [{ cloudType: 'AWS', hosts: 30, cores: 120, memBytes: 1e12, fullStack: 20, infra: 10 }, { cloudType: 'AZURE', hosts: 10, cores: 40, memBytes: 3e11, fullStack: 10, infra: 0 }] },
      'cloud.services': { records: [{ type: 'AWS_LAMBDA_FUNCTION', resources: 87 }, { type: 'AWS_S3_BUCKET', resources: 53 }] },
      'proc.technologies': { records: [{ softwareTechnologies: 'type:JAVA, edition:OpenJDK, version:17.0.2', instances: 40 }, { softwareTechnologies: 'type:NODE_JS, version:20', instances: 12 }] },
      'prob.mttx': { records: [{ 'event.category': 'ERROR', problems: 10, mttrNs: 2 * HOUR_NS, totalNs: 20 * HOUR_NS }, { 'event.category': 'SLOWDOWN', problems: 4, mttrNs: 0.5 * HOUR_NS, totalNs: 2 * HOUR_NS }] },
      'cov.inventory': { records: [{ category: 'Hosts', value: 40 }, { category: 'Services', value: 12 }] },
      'prob.summary': { records: [{ 'event.status': 'CLOSED', problems: 9 }, { 'event.status': 'ACTIVE', problems: 1 }] },
    };
    const ids = ['cloud.hosts', 'cloud.services', 'technologies.bars', 'technologies.chips', 'executive.mttr', 'executive.rings'];
    const seen = new Map<string, string>();
    const onDone = vi.fn<(outcome: CaptureOutcome) => void>();
    render(
      <AppRoot>
        <MemoryRouter>
          <OpenAccess>
            <StudioProvider>
              <CaptureStage
                targets={buildCaptureTargets(t, fmt).filter((target) => ids.includes(target.captureId))}
                onDone={onDone}
                photographer={(node) => {
                  seen.set(node.getAttribute('data-capture') ?? '', node.textContent ?? '');
                  return Promise.resolve(PNG);
                }}
                settleMs={20}
                timeoutMs={6000}
              />
            </StudioProvider>
          </OpenAccess>
        </MemoryRouter>
      </AppRoot>,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 8000 });
    const outcome = onDone.mock.calls[0]?.[0] as CaptureOutcome;
    expect(Object.keys(outcome.captures).sort()).toEqual([...ids].sort());
    expect(outcome.noData).toEqual([]);
    expect(seen.get('cloud.hosts')).toContain('AWS');
    expect(seen.get('cloud.services')).toContain('87');
    expect(seen.get('technologies.bars')).toContain('JAVA');
    expect(seen.get('executive.mttr')).toContain('ERROR');
    // AGENTS.md rule 6: no currency on a picture of a non-commercial section.
    for (const [id, content] of seen) expect(content, id).not.toMatch(/[$€£]|R\$|USD|BRL/);
  }, 15_000);
});

// ------------------------------------------------------------------ the store, pure

const stored = (captureId: string, read: CaptureRead, capturedAt: string, dataUrl = PNG): StoredCapture => ({
  captureId,
  sectionId: sectionOf(captureId) as string,
  capture: { ...CAPTURE, dataUrl },
  capturedAt,
  ...read,
});

describe('the capture store, pure', () => {
  it('reads a stored snapshot entry by entry, dropping what is not a safe picture', () => {
    const good = stored('cloud.hosts', READ, '2026-11-16T12:01:00.000Z');
    const parsed = parseSnapshot({
      captures: [
        good,
        { ...good, captureId: 'cloud.services', capture: { ...CAPTURE, dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' } },
        { ...good, captureId: 'Bad Id' },
        { ...good, captureId: 'technologies.bars', capture: { ...CAPTURE, pins: [{ n: 'x' }] } },
        { ...good, captureId: 'executive.mttr', capture: { ...CAPTURE, width: -1 } },
      ],
      noData: [{ captureId: 'overview.stack', sectionId: 'overview', at: '2026-11-16T12:01:00.000Z', ...READ }, { captureId: 'x' }],
    });
    expect(parsed.captures.map((entry) => entry.captureId)).toEqual(['cloud.hosts']);
    expect(parsed.noData.map((mark) => mark.captureId)).toEqual(['overview.stack']);
    expect(parseSnapshot('nonsense')).toEqual(EMPTY_SNAPSHOT);
  });

  it('merges a run: a new picture replaces the old one, and lifts a "no data" mark of the same panel', () => {
    const before: CaptureSnapshot = {
      captures: [stored('cloud.hosts', OTHER_READ, '2026-11-16T09:01:00.000Z')],
      noData: [{ captureId: 'cloud.services', sectionId: 'cloud', at: '2026-11-16T09:01:00.000Z', ...OTHER_READ }],
    };
    const after = mergeRun(before, { captures: { 'cloud.hosts': CAPTURE, 'cloud.services': CAPTURE, 'not.registered': CAPTURE }, noData: ['overview.stack'] }, sectionOf, READ, new Date('2026-11-16T12:05:00.000Z'));
    expect(after.captures.map((entry) => [entry.captureId, entry.windowEnd, entry.capturedAt])).toEqual([
      ['cloud.hosts', READ.windowEnd, '2026-11-16T12:05:00.000Z'],
      ['cloud.services', READ.windowEnd, '2026-11-16T12:05:00.000Z'],
    ]);
    expect(after.noData.map((mark) => mark.captureId)).toEqual(['overview.stack']);
  });

  it('bounds what is written: a picture too large stays out, and a cut keeps this read first, then the newest', () => {
    const big = `${PNG}${'A'.repeat(200)}`;
    const snapshot: CaptureSnapshot = {
      captures: [
        stored('cloud.hosts', OTHER_READ, '2026-11-16T09:30:00.000Z'),
        stored('cloud.services', READ, '2026-11-16T12:00:00.000Z'),
        stored('technologies.bars', OTHER_READ, '2026-11-16T09:00:00.000Z'),
        stored('executive.mttr', READ, '2026-11-16T12:00:00.000Z', big),
      ],
      noData: [],
    };
    const limits = { perCapture: PNG.length + 100, total: PNG.length * 2 + 10 };
    const bounded = boundSnapshot(snapshot, READ, limits);
    expect(bounded.captures.map((entry) => entry.captureId)).toEqual(['cloud.hosts', 'cloud.services']);
    expect(boundSnapshot(snapshot, READ).captures).toHaveLength(4);
  });
});

// ------------------------------------------------------------------ the store, in the browser

function fakeBackend(fail: { write?: boolean } = {}) {
  const data = new Map<string, unknown>();
  const backend: CaptureBackend & { data: Map<string, unknown>; reads: number } = {
    data,
    reads: 0,
    read: (key) => {
      backend.reads += 1;
      return Promise.resolve(data.get(key));
    },
    write: (key, value) => (fail.write === true ? Promise.reject(new Error('QuotaExceededError')) : Promise.resolve(void data.set(key, JSON.parse(JSON.stringify(value))))),
    remove: (key) => Promise.resolve(void data.delete(key)),
    purge: (before) => {
      for (const [key, value] of data) if ((value as { savedAt: number }).savedAt < before) data.delete(key);
      return Promise.resolve();
    },
  };
  return backend;
}

describe('the capture store, across leaving the tab and reloading it', () => {
  it('keeps a run in the tab’s storage, and a reload of the tab reads it back', async () => {
    const backend = fakeBackend();
    const first = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend, storageKey: 'tab-1' }));
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    act(() => first.result.current.record({ captures: { 'cloud.hosts': CAPTURE }, noData: ['overview.stack'] }, READ));
    await waitFor(() => expect(first.result.current.persisted).toBe(true));
    first.unmount();

    // A reload: the JavaScript memory is gone, the tab's storage is not.
    resetCaptureMemory();
    const again = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend, storageKey: 'tab-1' }));
    await waitFor(() => expect(again.result.current.loaded).toBe(true));
    expect(again.result.current.snapshot.captures.map((entry) => [entry.captureId, entry.windowEnd, entry.locale])).toEqual([['cloud.hosts', READ.windowEnd, 'en']]);
    expect(again.result.current.snapshot.noData.map((mark) => mark.captureId)).toEqual(['overview.stack']);
    expect(again.result.current.persisted).toBe(true);

    // Another tab has its own key: it starts empty.
    resetCaptureMemory();
    const other = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend, storageKey: 'tab-2' }));
    await waitFor(() => expect(other.result.current.loaded).toBe(true));
    expect(other.result.current.snapshot).toEqual(EMPTY_SNAPSHOT);
  });

  it('finds the pictures in memory when the tab is left and opened again, without reading storage', async () => {
    const backend = fakeBackend();
    const first = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend, storageKey: 'tab-1' }));
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    act(() => first.result.current.record({ captures: { 'executive.rings': CAPTURE }, noData: [] }, READ));
    first.unmount();
    const reads = backend.reads;
    const back = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend, storageKey: 'tab-1' }));
    expect(back.result.current.loaded).toBe(true);
    expect(back.result.current.snapshot.captures.map((entry) => entry.captureId)).toEqual(['executive.rings']);
    expect(backend.reads).toBe(reads);
  });

  it('says when the browser would not keep them, and still keeps them in memory', async () => {
    const backend = fakeBackend({ write: true });
    const view = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend, storageKey: 'tab-1' }));
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => view.result.current.record({ captures: { 'cloud.hosts': CAPTURE }, noData: [] }, READ));
    await act(() => Promise.resolve());
    expect(view.result.current.persisted).toBe(false);
    expect(view.result.current.snapshot.captures).toHaveLength(1);

    resetCaptureMemory();
    const none = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend: null }));
    expect(none.result.current.loaded).toBe(true);
    act(() => none.result.current.record({ captures: { 'cloud.hosts': CAPTURE }, noData: [] }, READ));
    expect(none.result.current.persisted).toBe(false);
    expect(none.result.current.snapshot.captures).toHaveLength(1);
  });

  it('purges an expired record and drops panels the registry no longer has', async () => {
    const backend = fakeBackend();
    const snapshot = { captures: [stored('cloud.hosts', READ, '2026-11-16T12:00:00.000Z')], noData: [] };
    backend.data.set('old-tab', { savedAt: Date.now() - CAPTURE_TTL_MS - 1000, snapshot });
    backend.data.set('tab-1', { savedAt: Date.now(), snapshot: { captures: [...snapshot.captures, { ...snapshot.captures[0], captureId: 'cloud.retired' }], noData: [] } });
    const view = renderHook(() => useCaptureStore({ sectionOf, read: READ, backend, storageKey: 'tab-1' }));
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    expect(backend.data.has('old-tab')).toBe(false);
    expect(view.result.current.snapshot.captures.map((entry) => entry.captureId)).toEqual(['cloud.hosts']);
    act(() => view.result.current.clear());
    await waitFor(() => expect(backend.data.has('tab-1')).toBe(false));
    expect(view.result.current.snapshot).toEqual(EMPTY_SNAPSHOT);
  });
});

// ------------------------------------------------------------------ the readiness strip

describe('the readiness strip before the download', () => {
  it('ranks a section by what is left: to capture, from another read, captured, no data', () => {
    expect(sectionReadiness(['current', 'missing'])).toBe('missing');
    expect(sectionReadiness(['current', 'stale'])).toBe('stale');
    expect(sectionReadiness(['current', 'noData'])).toBe('captured');
    expect(sectionReadiness(['noData'])).toBe('noData');
  });

  const INVENTORY: GrailRecord[] = [
    { category: 'Hosts', value: 77 },
    { category: 'Services', value: 76 },
    { category: 'Kubernetes clusters', value: 6 },
    { category: 'Kubernetes workloads', value: 90 },
  ];

  /** Seeds the app's pictures for the read on screen (and one from another read), then opens the Tech Wrapup. */
  const Seeded = () => {
    const scope = useQueryScope();
    const { locale } = useStudio();
    const read = { windowEnd: scope.globalWindow.endIso, locale };
    const store = useCaptureStore({ sectionOf, read, backend: null });
    const [ready, setReady] = useState(false);
    useEffect(() => {
      store.record({ captures: { 'kubernetes.stable': CAPTURE }, noData: ['overview.stack'] }, read);
      store.record({ captures: { 'roi.chain': CAPTURE }, noData: [] }, OTHER_READ);
      setReady(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return ready ? <TechWrapup embedded /> : null;
  };

  const readinessOf = (section: string) => document.querySelector(`[data-readiness][data-section="${section}"]`)?.getAttribute('data-readiness');

  it('shows each included section, puts only this read’s pictures on the slides, and offers to capture the rest', async () => {
    canned = { 'cov.inventory': { records: INVENTORY } };
    const view = render(
      <AppRoot>
        <MemoryRouter>
          <OpenAccess>
            <StudioProvider>
              <Seeded />
            </StudioProvider>
          </OpenAccess>
        </MemoryRouter>
      </AppRoot>,
    );
    await waitFor(() => expect(readinessOf('kubernetes')).toBe('captured'));
    expect(readinessOf('overview')).toBe('noData');
    expect(readinessOf('roi')).toBe('stale');
    expect(readinessOf('executive')).toBe('missing');
    // The picture of another read is listed, not used: only the Kubernetes one reaches a slide.
    const kinds = [...document.querySelectorAll('[data-wrap-slide]')].map((slide) => slide.getAttribute('data-slide-kind'));
    expect(kinds.filter((kind) => kind === 'capture')).toHaveLength(1);
    expect(view.getByRole('button', { name: /Capture what is missing \(\d+\)|Capturar o que falta \(\d+\)/ })).toBeTruthy();

    // 3.3.16: Kubernetes has one panel (only the new graphics), so no choice; the Executive summary keeps two.
    expect(document.querySelector('[data-choice="kubernetes"]')).toBeNull();
    const group = view.getByRole('group', {
      name: new RegExp(
        (['en', 'pt-BR'] as const)
          .map((locale) => translate('deck.choice.aria', locale, { section: translate('tw.exec.title', locale) }).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|'),
      ),
    });
    const boxes = within(group).getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    // Choosing both Executive panels still leaves them to capture.
    fireEvent.click(boxes[1] as HTMLElement);
    await waitFor(() => expect(readinessOf('executive')).toBe('missing'));
  });
});

describe('pins never cover the number they point at (3.3.3, owner’s 3.3.2 validation, slide 12)', () => {
  const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

  it('keeps the preferred spot when it is free', () => {
    expect(placePin({ x: 10, y: 10 }, box(50, 50, 90, 70), [box(50, 50, 90, 70)], [])).toEqual({ x: 10, y: 10 });
  });

  it('moves off a text box (the donut’s centre figure) to the first free spot around the target', () => {
    const figure = box(100, 100, 140, 130);
    const placed = placePin({ x: 120, y: 115 }, figure, [figure], []);
    expect(placed.x < 100 - 11 || placed.x > 140 + 11 || placed.y < 100 - 11 || placed.y > 130 + 11).toBe(true);
  });

  it('never stacks two pins on the same spot', () => {
    const target = box(100, 100, 140, 130);
    const first = placePin({ x: 89, y: 94 }, target, [target], []);
    const second = placePin({ x: 89, y: 94 }, target, [target], [first]);
    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThanOrEqual(2 * 11);
  });
});
