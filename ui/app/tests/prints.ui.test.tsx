import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioProvider } from '../config/StudioContext';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { pluralKey, translate, type StringKey } from '../i18n/strings';
import { SE_REPORT_TABS, SeReport } from '../pages/SeReport';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import { getQuery, type CatalogId } from '../queries/catalog';
import { buildShotPlan, NO_OVERRIDES } from '../features/wrapup/prints/plan/planner';
import { plannerInputsFrom, type PlannerInputs } from '../features/wrapup/prints/plan/usePlannerInputs';
import type { PrintStore } from '../features/wrapup/prints/store/usePrintStore';
import type { CoverInput } from '../features/wrapup/spec';
import type { PrintImage } from '../features/wrapup/prints/deck/slides';
import type { EvidenceQueryResult, ImportReport, LinkCheck, PrintAsset, PrintRecord } from '../features/wrapup/prints/types';
import { ApprovalPanel, type ApprovalPanelProps } from '../features/wrapup/prints/ui/ApprovalPanel';
import { importCounts } from '../features/wrapup/prints/ui/CapturePanels';
import { rowStatus, screenCell } from '../features/wrapup/prints/ui/ShotPlanPanel';
import { PrintDeckPanel } from '../features/wrapup/prints/ui/PrintDeckPanel';
import { evidenceText, identityOk, parsePlanState, slotStatus, type Approvals } from '../features/wrapup/prints/ui/shared';
import { assembleDeck, isFrameOnly, showsPixels, type PrintDeckModel } from '../features/wrapup/prints/ui/usePrintDeckModel';
import type { PrintDeckIdentity } from '../features/wrapup/prints/ui/usePrintDeckIdentity';

/**
 * 3.2.7 — the real-prints tab ("Provas reais" since 3.3.2, spec §2.10): the 4th SE Report tab,
 * loaded lazily, driven through mocked hooks — the planner's inputs (no catalog read), the print
 * store (no Document Service) and the evidence (no Grail). What the harness drives by test id is
 * pinned here: the approval controls carry their ids, never a Chip; a shot list that would be
 * empty is never offered; no button says "PowerPoint"; the guided capture hides when the frame
 * blocks tab sharing.
 */

// ------------------------------------------------------------------ mocks

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId): CatalogQueryResult => {
    const entry = getQuery(id);
    const outcome: QueryOutcome = 'empty';
    return {
      entry,
      records: [],
      raw: undefined,
      quality: CLEAN_QUALITY,
      outcome,
      provenance: 'no-telemetry',
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
      timeframe: { startIso: '2026-10-04T19:00:00.000Z', endIso: '2026-10-05T19:00:00.000Z', label: 'last 24 hours', expression: 'now-24h' },
      missingScopes: [],
      errorMessage: null,
      isLoading: false,
      refetch: () => undefined,
    };
  },
}));

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({ data: undefined, error: undefined, isLoading: false, refetch: () => undefined }),
}));

let currentInputs: PlannerInputs | null = null;
vi.mock('../features/wrapup/prints/plan/usePlannerInputs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/wrapup/prints/plan/usePlannerInputs')>();
  return {
    ...actual,
    usePlannerInputs: () => {
      if (currentInputs === null) throw new Error('planner inputs not set');
      return currentInputs;
    },
  };
});

let currentStore: PrintStore | null = null;
vi.mock('../features/wrapup/prints/store/usePrintStore', () => ({
  usePrintStore: () => {
    if (currentStore === null) throw new Error('print store not set');
    return currentStore;
  },
}));

vi.mock('../features/wrapup/prints/evidence/useEvidencePacks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/wrapup/prints/evidence/useEvidencePacks')>();
  const empty = { bundle: {}, executed: [], loading: false };
  return { ...actual, useEvidencePacks: () => empty };
});

vi.mock('../features/wrapup/templateArt', () => ({ useTemplateArt: () => ({}) }));

// ------------------------------------------------------------------ fixtures

const HOST = 'abc12345.apps.dynatrace.com';
const NOW = Date.parse('2026-10-05T19:00:00.000Z');
const LOGS_SLOT = 'logs-errors--status-error-2h';

const DISABLED: EvidenceQueryResult = { request: null, outcome: 'disabled', records: [], quality: CLEAN_QUALITY, readAtIso: null };
const EMPTY_READ = { outcome: 'empty' as const, records: [] };

function inputs(): PlannerInputs {
  return plannerInputsFrom({
    tenantHost: HOST,
    rcaTop: EMPTY_READ,
    preferredIncident: null,
    problemEvents: DISABLED,
    callers: DISABLED,
    incidentWindow: null,
    frontendIds: EMPTY_READ,
    svcRanking: EMPTY_READ,
    svcTotals: EMPTY_READ,
    clusterIds: EMPTY_READ,
    k8sPressure: EMPTY_READ,
    posture: EMPTY_READ,
    capacity: EMPTY_READ,
    globalWindowLabel: 'last 24 hours',
    locale: 'en',
    timeZone: 'UTC',
    now: NOW,
  });
}

function record(overrides: Partial<PrintRecord> = {}): PrintRecord {
  return {
    id: 'pr-00000000000000a1',
    slotId: LOGS_SLOT,
    kind: 'logs-errors',
    layout: 'logs.filter',
    titleText: { key: 'prt.title.logs', params: {} },
    entity: { id: null, name: null },
    subject: { kind: 'list', list: 'logs-errors' },
    incident: null,
    requestedPath: '/ui/apps/dynatrace.logs/',
    finalPath: '/ui/apps/dynatrace.logs/',
    finalAppId: 'dynatrace.logs',
    linkEvidence: 'verified',
    source: 'companion',
    landing: 'ok',
    capturedAtIso: '2026-10-05T18:40:00.000Z',
    capturedAtApprox: false,
    captureTimeZone: 'UTC',
    screenTimeframeLabel: 'Last 2 hours',
    companion: { version: '1.1.0', planId: null, browser: null },
    image: { sha256: 'a'.repeat(64), mime: 'image/jpeg', bytes: 10, width: 1720, height: 1080, normalization: 'native', partial: false },
    anchors: [],
    screenNumbers: [],
    identity: 'anchor',
    // 3.5.5: the SE placed the pins (approval asks for at least three).
    pins: [{ n: 1, x: 300, y: 200, origin: 'manual' as const }, { n: 2, x: 700, y: 400, origin: 'manual' as const }, { n: 3, x: 1100, y: 600, origin: 'manual' as const }],
    masks: [],
    maskSuggestions: [{ x: 10, y: 10, w: 200, h: 30, reason: 'email' }],
    focus: null,
    lupaOn: false,
    approval: null,
    warnings: [],
    matchedBy: 'id',
    edited: false,
    updatedAtIso: '2026-10-05T18:40:00.000Z',
    ...overrides,
  };
}

const assetOf = (rec: PrintRecord): PrintAsset => ({ record: rec, master: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), thumbUrl: null });

const REPORT: ImportReport = { atIso: '2026-10-05T18:45:00.000Z', planIdMatch: true, counts: { ok: 1 }, orphans: [], problems: [] };

function fakeStore(assets: PrintAsset[], overrides: Partial<PrintStore> = {}): PrintStore {
  return {
    reading: new Set(),
    state: 'ready',
    saveState: 'idle',
    savedAtIso: null,
    set: null,
    assets: new Map(assets.map((asset) => [asset.record.id, asset])),
    staleAnchor: null,
    conflict: false,
    problem: null,
    sizeWarning: false,
    importZip: vi.fn(() => Promise.resolve(REPORT)),
    addManual: vi.fn(() => Promise.resolve()),
    update: vi.fn(),
    approve: vi.fn(() => Promise.resolve()),
    revoke: vi.fn(),
    remove: vi.fn(() => Promise.resolve()),
    rebind: vi.fn(),
    keepStale: vi.fn(),
    clearAll: vi.fn(() => Promise.resolve()),
    exportPackage: vi.fn(() => Promise.resolve(new Blob())),
    reload: vi.fn(),
    ...overrides,
  };
}

const pt = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'pt-BR', params);
const en = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'en', params);
function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Either language: the provider may start in either. */
const anyLang = (key: StringKey, params?: Record<string, string | number>) => new RegExp(`${escape(en(key, params))}|${escape(pt(key, params))}`);

const mount = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

/** The SE Report opened on the real-prints tab, waiting for the lazy chunk. */
async function openTab(): Promise<void> {
  mount(<SeReport initialTab={SE_REPORT_TABS.prints} />);
  await screen.findByRole('heading', { name: anyLang('prt.title') }, { timeout: 5000 });
}

beforeEach(() => {
  currentInputs = inputs();
  currentStore = fakeStore([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'featurePolicy');
});

// ------------------------------------------------------------------ the tab

describe('the real-prints tab in the SE Report', () => {
  it('is the 4th tab, index 3, and both addresses route to the right tab', () => {
    expect(SE_REPORT_TABS.prints).toBe(3);
    const app = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
    expect(app).toContain('path="/wrapup/prints" element={<SeReport initialTab={3} />}');
    expect(app).toContain('path="/wrapup" element={<SeReport initialTab={2} />}');
  });

  it('mounts through the lazy import with mocked hooks', async () => {
    await openTab();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: anyLang('prt.plan.title') })).toBeTruthy();
    expect(screen.getByRole('heading', { name: anyLang('prt.deck.title') })).toBeTruthy();
  });

  it('has no button that says PowerPoint', async () => {
    currentStore = fakeStore([assetOf(record())]);
    await openTab();
    const labels = screen.getAllByRole('button').map((button) => button.textContent ?? '');
    expect(labels.length).toBeGreaterThan(5);
    expect(labels.filter((label) => /PowerPoint/.test(label))).toEqual([]);
  });

  it('says the tenant did not answer (not "no permission") and offers to read again while no print is held (3.2.7 review RT-1)', async () => {
    const reload = vi.fn();
    currentStore = fakeStore([], { state: 'memory-only', problem: 'prt.store.reason.error', reload });
    await openTab();
    expect(screen.getByText(anyLang('prt.store.memoryOnly.error'))).toBeTruthy();
    expect(screen.queryByText(anyLang('prt.store.memoryOnly'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: anyLang('prt.store.retry') }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('keeps the permission wording for a 403, with no retry; and no retry once a print is held', async () => {
    currentStore = fakeStore([], { state: 'memory-only', problem: 'prt.store.reason.forbidden' });
    const first = await (async () => {
      await openTab();
      return { text: screen.queryByText(anyLang('prt.store.memoryOnly')), retry: screen.queryByRole('button', { name: anyLang('prt.store.retry') }) };
    })();
    expect(first.text).toBeTruthy();
    expect(first.retry).toBeNull();
    cleanup();
    currentStore = fakeStore([assetOf(record())], { state: 'memory-only', problem: 'prt.store.reason.error' });
    await openTab();
    expect(screen.queryByRole('button', { name: anyLang('prt.store.retry') })).toBeNull();
  });

  it('shows the empty state: no print yet, and no deck to download', async () => {
    await openTab();
    expect(screen.getByText(anyLang('prt.gallery.empty'))).toBeTruthy();
    expect(screen.getByText(anyLang('prt.deck.empty'))).toBeTruthy();
    expect(screen.queryByTestId('prt-download-deck')).toBeNull();
    // The plan still offers the logs screen (verified, always planned), with the way to bring its print in.
    expect(screen.getByText(anyLang('prt.plan.howto'))).toBeTruthy();
  });

  it('tells the Customer profile how many prints stay out of its deck', async () => {
    currentStore = fakeStore([assetOf(record())]);
    await openTab();
    expect(screen.getByText(anyLang('prt.profile.dropped', { count: '1' }))).toBeTruthy();
  });

  it('says nothing about dropped prints when there are none', async () => {
    await openTab();
    expect(screen.queryByText(anyLang('prt.profile.dropped', { count: '1' }))).toBeNull();
  });

  it('offers the batch import as one multi-file input that also takes a ZIP (3.3.2)', async () => {
    await openTab();
    const input = screen.getByTestId<HTMLInputElement>('prt-import-batch');
    expect(input.type).toBe('file');
    expect(input.multiple).toBe(true);
    expect(input.accept).toContain('.zip');
    expect(input.accept).toContain('image/png');
    // The companion and the guided tab capture were retired: neither is offered any more.
    expect(screen.queryByTestId('prt-import-zip')).toBeNull();
    expect(screen.queryByTestId('prt-download-plan')).toBeNull();
  });

  it('holds capture and import while the stored prints belong to another PoC', async () => {
    currentStore = fakeStore([], { state: 'stale', staleAnchor: { customer: 'Old Corp', startDate: '2026-09-01' } });
    await openTab();
    // The banner, and the gallery's note in place of "no print yet" (the prints exist, hidden until the SE decides).
    expect(screen.getAllByText(anyLang('prt.stale.title'))).toHaveLength(2);
    expect(screen.queryByText(anyLang('prt.gallery.empty'))).toBeNull();
    expect(screen.getByText(anyLang('prt.cap.staleHold'))).toBeTruthy();
    expect(screen.queryByTestId('prt-import-batch')).toBeNull();
  });

  it('accepts the suggested masks of a print from its gallery card, by test id', async () => {
    const update = vi.fn();
    currentStore = fakeStore([assetOf(record())], { update });
    await openTab();
    fireEvent.click(screen.getByTestId(`prt-accept-masks-${LOGS_SLOT}`));
    expect(update).toHaveBeenCalledWith('pr-00000000000000a1', { masks: [{ x: 10, y: 10, w: 200, h: 30, reason: 'email' }], maskSuggestions: [] });
  });
});

// ------------------------------------------------------------------ the approval controls

describe('the approval panel', () => {
  const props = (rec: PrintRecord, overrides: Partial<ApprovalPanelProps> = {}): ApprovalPanelProps => ({
    record: rec,
    slot: { id: rec.slotId, forced: false },
    name: 'Logs',
    approved: false,
    checklistTicked: false,
    onChecklistChange: vi.fn(),
    onAcceptMasks: vi.fn(),
    onConfirmIdentity: vi.fn(),
    onApprove: vi.fn(() => Promise.resolve()),
    onRevoke: vi.fn(),
    ...overrides,
  });

  it('renders no switch while a blocker remains, and its text instead', () => {
    mount(<ApprovalPanel {...props(record({ identity: 'none' }))} />);
    expect(screen.queryByTestId(`prt-approve-${LOGS_SLOT}`)).toBeNull();
    expect(screen.getByTestId(`prt-accept-masks-${LOGS_SLOT}`).tagName).toBe('BUTTON');
    expect(screen.getByTestId(`prt-identity-${LOGS_SLOT}`)).toBeTruthy();
    expect(screen.getByTestId(`prt-checklist-${LOGS_SLOT}`)).toBeTruthy();
    expect(screen.getAllByText(anyLang('prt.ap.pending', { count: '1' })).length).toBeGreaterThan(0);
  });

  it('confirms the screen and ticks the checklist through the controls', () => {
    const panel = props(record({ identity: 'none', maskSuggestions: [] }));
    mount(<ApprovalPanel {...panel} />);
    fireEvent.click(within(screen.getByTestId(`prt-identity-${LOGS_SLOT}`)).getByRole('checkbox'));
    expect(panel.onConfirmIdentity).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByTestId(`prt-checklist-${LOGS_SLOT}`)).getByRole('checkbox'));
    expect(panel.onChecklistChange).toHaveBeenCalledWith(true);
  });

  it('shows the switch only when nothing blocks it, and approves through it', async () => {
    const panel = props(record({ maskSuggestions: [] }), { checklistTicked: true });
    mount(<ApprovalPanel {...panel} />);
    const root = screen.getByTestId(`prt-approve-${LOGS_SLOT}`);
    expect(screen.queryByTestId(`prt-identity-${LOGS_SLOT}`)).toBeNull();
    await act(() => {
      fireEvent.click(within(root).getByRole('switch'));
      return Promise.resolve();
    });
    expect(panel.onApprove).toHaveBeenCalledTimes(1);
  });

  it('never puts a test id inside a Chip', () => {
    const { container } = mount(<ApprovalPanel {...props(record({ identity: 'none' }))} />);
    for (const chip of container.querySelectorAll('[data-dt-component="Chip"]')) expect(chip.querySelector('[data-testid], [id]')).toBeNull();
  });
});

// ------------------------------------------------------------------ pure pieces

describe('the tab rules', () => {
  it('takes a forced probe-only screen into the customer deck only on the on-screen check', () => {
    expect(identityOk({ identity: 'anchor' }, { forced: true })).toBe(true);
    expect(identityOk({ identity: 'se-confirmed' }, { forced: true })).toBe(false);
    expect(identityOk({ identity: 'se-confirmed' }, { forced: false })).toBe(true);
    expect(identityOk({ identity: 'none' }, { forced: false })).toBe(false);
  });

  it('says the plan is still being read (its screens could still change)', async () => {
    currentInputs = { ...inputs(), loading: true };
    await openTab();
    expect(screen.queryByText(anyLang('prt.plan.howto'))).toBeNull();
    expect(screen.getByText(anyLang('prt.plan.reading'))).toBeTruthy();
  });

  it('reads a stored plan state defensively', () => {
    expect(parsePlanState(null).overrides.excluded).toEqual([]);
    const parsed = parsePlanState({
      overrides: { excluded: ['logs-errors--status-error-2h', 'NOT AN ID', 42], forced: 'x', swapped: { problem: 'P-1', bad: 7 }, custom: [{ url: 'https://h/ui/x', titleRaw: 'T' }, { url: 3 }], hostOptIn: 'yes' },
      preferredIncident: 'drop table',
    });
    expect(parsed.overrides.excluded).toEqual(['logs-errors--status-error-2h']);
    expect(parsed.overrides.forced).toEqual([]);
    expect(parsed.overrides.swapped).toEqual({ problem: 'P-1' });
    expect(parsed.overrides.custom).toHaveLength(1);
    expect(parsed.overrides.custom[0]?.titleText).toEqual({ key: 'prt.title.custom', params: { title: 'T' } });
    expect(parsed.overrides.hostOptIn).toBe(false);
    expect(parsed.preferredIncident).toBeNull();
  });

  it('states where each screen stands', () => {
    const plan = buildShotPlan(inputs(), [], NO_OVERRIDES);
    const logs = plan.slots.find((slot) => slot.id === LOGS_SLOT);
    expect(logs).toBeDefined();
    if (logs === undefined) return;
    expect(slotStatus(logs, null, false, new Set(), [], NOW)).toBe('planned');
    expect(slotStatus(logs, null, false, new Set([LOGS_SLOT]), [], NOW)).toBe('queued');
    expect(slotStatus(logs, record(), false, new Set(), [], NOW)).toBe('review');
    expect(slotStatus(logs, record({ maskSuggestions: [] }), false, new Set(), [], NOW)).toBe('ready');
    expect(slotStatus(logs, record({ maskSuggestions: [] }), true, new Set(), [], NOW)).toBe('approved');
    expect(slotStatus(logs, record({ landing: 'unresolved_link' }), false, new Set(), [], NOW)).toBe('failed');
    expect(slotStatus(logs, record({ warnings: ['corrupt'] }), false, new Set(), [], NOW)).toBe('failed');
    expect(slotStatus(logs, record({ maskSuggestions: [], capturedAtIso: '2026-09-20T00:00:00.000Z' }), false, new Set(), [], NOW)).toBe('stale');
    const smartscape = plan.slots.find((slot) => slot.kind === 'smartscape');
    if (smartscape !== undefined) expect(slotStatus(smartscape, null, false, new Set(), [], NOW)).toBe('probeOnly');
  });

  it('counts an import report as ok / not ok / outside the plan / refused', () => {
    expect(importCounts({ ...REPORT, counts: { ok: 5, session_lost: 1, skipped: 2, orphan: 1, refused: 1 } })).toEqual({ ok: 5, failed: 3, orphans: 1, refused: 1 });
  });

  it('knows a deck that is only its frame', () => {
    expect(isFrameOnly({ profile: 'se', confidential: '', title: '', slides: [{ kind: 'end', partnerLogo: null, partnerLogoAspect: null }] })).toBe(true);
  });
});

// ------------------------------------------------------------------ review fixes (3.2.7 WP7a verification)

describe('the tab after review', () => {
  const tCount = (key: StringKey, count: number, params?: Record<string, string | number>) => translate(pluralKey(key, count), 'en', params);
  const COVER: CoverInput = {
    customerName: 'Contoso',
    engagementName: 'Observability PoC',
    seName: null,
    partnerName: '',
    generatedAtLabel: 'Generated on 05/10/2026',
    customerLogo: null,
    customerLogoAspect: null,
    partnerLogo: null,
    partnerLogoAspect: null,
    strings: { title: 'Tech Wrapup', partnerLabel: 'Delivered with', measured: 'Measured live.', confidential: 'CONFIDENTIAL', agendaTitle: 'Agenda' },
  };
  const IDENTITY: PrintDeckIdentity = {
    cover: COVER,
    customerGeneratedAtLabel: 'Generated as of 05/10/2026',
    coverTitle: 'TIP - Contoso - Tech Wrapup · real screens',
    seLabel: 'Solutions Engineer',
    watermark: 'SE INTERNAL',
    dtLogo: '',
    customer: 'Contoso',
    seName: null,
  };
  const IMAGE: PrintImage = { dataUrl: 'data:image/jpeg;base64,/9j/2Q==', width: 1720, height: 1080, mediaKey: 'b'.repeat(64) };
  const NOT_APPROVED: Approvals = { isApproved: () => false, isSettled: () => true };

  it('says "verified on this tenant on {date}" for an address a probe here lifted to verified', () => {
    const base = buildShotPlan(inputs(), [], NO_OVERRIDES).slots.find((slot) => slot.kind === 'smartscape');
    expect(base?.chosen?.evidence).toBe('observed');
    if (base === undefined) return;
    const check: LinkCheck = { templateKey: base.urlTemplateKey, status: 'ok', finalAppId: 'dynatrace.smartscape', checkedAtIso: '2026-10-04T12:00:00.000Z', companionVersion: '1.1.0' };
    const lifted = buildShotPlan(inputs(), [check], NO_OVERRIDES).slots.find((slot) => slot.kind === 'smartscape');
    // The planner hands the UI the lifted level; the chip must still tell where the proof came from.
    expect(lifted?.chosen?.evidence).toBe('verified');
    const day = (value: number | string) => String(value);
    expect(evidenceText('verified', base.urlTemplateKey, [check], NOW, en, day)).toBe(en('prt.ev.verifiedHere', { date: '2026-10-04' }));
    expect(evidenceText('observed', base.urlTemplateKey, [check], NOW, en, day)).toBe(en('prt.ev.verifiedHere', { date: '2026-10-04' }));
    expect(evidenceText('observed', base.urlTemplateKey, [], NOW, en, day)).toBe(en('prt.ev.observed'));
    expect(evidenceText('verified', base.urlTemplateKey, [{ ...check, status: 'error' }], NOW, en, day)).toBe(en('prt.ev.verified'));
  });

  it('keeps a manual print out of the SE deck until the SE confirms its screen (§5.7)', () => {
    const plan = buildShotPlan(inputs(), [], NO_OVERRIDES);
    const kindsFor = (rec: PrintRecord) =>
      assembleDeck({
        plan,
        records: new Map([[LOGS_SLOT, rec]]),
        images: new Map([[rec.id, IMAGE]]),
        approvals: NOT_APPROVED,
        bundle: {},
        executed: [],
        profile: 'se',
        translation: { t: en, tCount, locale: 'en' },
        identity: IDENTITY,
        viewerZone: 'UTC',
      }).spec.slides.map((slide) => slide.kind);
    const manual = record({ source: 'manual', landing: 'unknown', companion: null, identity: 'none', maskSuggestions: [] });
    expect(kindsFor(manual)).not.toContain('print');
    expect(kindsFor({ ...manual, identity: 'se-confirmed' })).toContain('print');
    // A companion print that reached its screen is the SE's to review, verified or not.
    expect(kindsFor(record({ identity: 'none', maskSuggestions: [] }))).toContain('print');
    expect(showsPixels({ source: 'tab-capture', identity: 'none' }, 'customer')).toBe(true);
  });

  it('holds the batch import while the plan is still being read', async () => {
    currentInputs = { ...inputs(), loading: true };
    await openTab();
    expect(screen.queryByTestId('prt-import-batch')).toBeNull();
    expect(screen.getByText(anyLang('prt.cap.importWait'))).toBeTruthy();
  });

  it('says so when a manual image would replace the print a screen already has', async () => {
    await openTab();
    expect(screen.queryByText(anyLang('prt.cap.manual.replaces'))).toBeNull();
    cleanup();
    currentStore = fakeStore([assetOf(record())]);
    await openTab();
    // The logs screen is the only one ticked here, and it already has its companion print.
    expect(screen.getByText(anyLang('prt.cap.manual.replaces'))).toBeTruthy();
  });

  it('does not call an approval withdrawn while its hashes are still being checked', () => {
    const approved = record({
      maskSuggestions: [],
      approval: { atIso: '2026-10-05T18:50:00.000Z', imageSha: 'a'.repeat(64), masksHash: 'm', focusHash: 'f' },
    });
    const base: ApprovalPanelProps = {
      record: approved,
      slot: { id: LOGS_SLOT, forced: false },
      name: 'Logs',
      approved: false,
      checklistTicked: true,
      onChecklistChange: vi.fn(),
      onAcceptMasks: vi.fn(),
      onConfirmIdentity: vi.fn(),
      onApprove: vi.fn(() => Promise.resolve()),
      onRevoke: vi.fn(),
    };
    const { unmount } = mount(<ApprovalPanel {...base} settled={false} />);
    expect(screen.queryByText(anyLang('prt.ap.revoked'))).toBeNull();
    expect(within(screen.getByTestId(`prt-approve-${LOGS_SLOT}`)).getByRole<HTMLInputElement>('switch').checked).toBe(true);
    unmount();
    mount(<ApprovalPanel {...base} settled />);
    expect(screen.getByText(anyLang('prt.ap.revoked'))).toBeTruthy();
    expect(within(screen.getByTestId(`prt-approve-${LOGS_SLOT}`)).getByRole<HTMLInputElement>('switch').checked).toBe(false);
  });

  it('offers neither the file nor the PDF while a print of the deck is still being prepared', () => {
    const model: PrintDeckModel = {
      spec: { profile: 'se', confidential: '', title: '', slides: [{ kind: 'end', partnerLogo: null, partnerLogoAspect: null }] },
      frameOnly: false,
      evidenceLoading: false,
      baking: true,
      bakeFailures: [],
      bundle: {},
      ctx: { locale: 'en', profile: 'se', t: en, tCount, timeZone: 'UTC', numbers: new Map() },
      droppedForCustomer: 0,
    };
    const { unmount } = mount(<PrintDeckPanel model={model} identity={IDENTITY} profile="se" />);
    expect(screen.queryByTestId('prt-download-deck')).toBeNull();
    expect(screen.queryByRole('button', { name: anyLang('prt.deck.print') })).toBeNull();
    expect(screen.getByText(anyLang('prt.deck.baking'))).toBeTruthy();
    unmount();
    mount(<PrintDeckPanel model={{ ...model, baking: false }} identity={IDENTITY} profile="se" />);
    expect(screen.getByTestId('prt-download-deck')).toBeTruthy();
  });
});

// ------------------------------------------------------------------ 3.2.7 review, UX batch (medium)

describe('the tab after the UX review', () => {
  it('says a screen is being read, not "out of the plan", while the plan’s reads are out (UX-M6)', async () => {
    const t = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'pt-BR', params);
    const translation = { t, formatDay: (day: string) => day } as unknown as Parameters<typeof screenCell>[3];
    const loadingPlan = buildShotPlan({ ...inputs(), loading: true }, [], NO_OVERRIDES);
    const unchosen = loadingPlan.slots.find((slot) => slot.chosen === null);
    if (unchosen === undefined) throw new Error('a screen with no choice yet expected');
    expect(rowStatus(unchosen, null, false, new Set(), [], NOW, true)).toEqual({ key: 'prt.plan.statusReading', color: 'neutral' });
    const { container, unmount } = mount(<>{screenCell(unchosen, [], NOW, translation, true)}</>);
    expect(container.textContent).toContain(pt('prt.plan.rowReading'));
    expect(container.textContent).not.toContain(pt(unchosen.omittedReason ?? 'prt.why.none.noData'));
    unmount();
    // Control: once the reads are in, the same screen is out of the plan, and says why.
    expect(rowStatus(unchosen, null, false, new Set(), [], NOW, false).key).toBe('prt.status.omitted');
    const after = mount(<>{screenCell(unchosen, [], NOW, translation, false)}</>);
    expect(after.container.textContent).not.toContain(pt('prt.plan.rowReading'));
    after.unmount();

    // The tab: no count of a plan not built yet, and no batch matched against it.
    currentInputs = { ...inputs(), loading: true };
    await openTab();
    expect(screen.queryByText(anyLang('prt.chip.screens', { done: '0', total: '1' }))).toBeNull();
    expect(screen.getByText(anyLang('prt.cap.importWait'))).toBeTruthy();
    cleanup();
    currentInputs = inputs();
    await openTab();
    expect(screen.getByText(anyLang('prt.chip.screens', { done: '0', total: '1' }))).toBeTruthy();
    expect(screen.queryByText(anyLang('prt.cap.importWait'))).toBeNull();
  });

  it('makes the paste and drop zone a named group, never a button that does nothing on click (UX-M5)', async () => {
    await openTab();
    expect(screen.queryByRole('button', { name: anyLang('prt.cap.manual.drop') })).toBeNull();
    const zone = screen.getByRole('group', { name: anyLang('prt.cap.manual.drop') });
    expect(zone.getAttribute('tabindex')).toBe('0');
    // "Enviar imagem" is the control that opens the picker.
    expect(screen.getAllByRole('button', { name: anyLang('prt.cap.manual.upload') }).length).toBeGreaterThan(0);
  });

  it('names each gallery card and its controls by the print’s screen (UX-M8)', async () => {
    currentStore = fakeStore([assetOf(record())]);
    await openTab();
    const title = screen.getAllByText(anyLang('prt.title.logs')).find((element) => element.closest('article.pvs-prt-card') !== null) as HTMLElement;
    const card = title.closest('article') as HTMLElement;
    expect(card.getAttribute('aria-labelledby')).toBe(title.id);
    const name = title.textContent ?? '';
    for (const key of ['prt.gallery.edit', 'prt.gallery.remove'] as const) {
      expect(within(card).getByRole('button', { name: new RegExp(`(${escape(en(key))}|${escape(pt(key))}): ${escape(name)}`) })).toBeTruthy();
    }
    const checklist = within(card).getByTestId(`prt-checklist-${LOGS_SLOT}`).querySelector('input') as HTMLInputElement;
    expect(document.getElementById(checklist.getAttribute('aria-describedby') ?? '')?.textContent).toBe(name);
    expect(within(card).getByTestId(`prt-accept-masks-${LOGS_SLOT}`).getAttribute('aria-describedby')).toBe(title.id);
  });
});

// ------------------------------------------------------------------ 3.2.7 review, UX batch (low)

describe('the tab after the UX review (low)', () => {
  const exactly = (key: StringKey, params?: Record<string, string | number>) => new RegExp(`^(${escape(en(key, params))}|${escape(pt(key, params))})$`);

  it('shows the address rule before the first try, and a refused address as the field’s own error (UX-L6)', async () => {
    await openTab();
    fireEvent.click(screen.getByRole('button', { name: anyLang('prt.plan.addCustom') }));
    const input = (await screen.findByTestId('prt-custom-url')).querySelector('input') as HTMLInputElement;
    // The label names the field; the rule describes it before anything is typed.
    expect(input.labels?.[0]?.textContent).toMatch(anyLang('prt.plan.custom.url'));
    const described = () => (input.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    expect(described()).toMatch(anyLang('prt.plan.custom.urlHint'));
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    fireEvent.change(input, { target: { value: `https://${HOST}/ui/entity/SERVICE-1` } });
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.plan.custom.save') }));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(described()).toMatch(anyLang('prt.err.customUrl'));
    expect(input.getAttribute('aria-errormessage')).not.toBeNull();
    // Typing again clears the error back to the rule.
    fireEvent.change(input, { target: { value: `https://${HOST}/ui/apps/dynatrace.logs/` } });
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    expect(described()).toMatch(anyLang('prt.plan.custom.urlHint'));
  });

});
