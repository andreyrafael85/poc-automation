import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioProvider } from '../config/StudioContext';
import { translate, type StringKey } from '../i18n/strings';
import { PIN_MIN_GAP_PX } from '../features/wrapup/prints/analysis/pins';
import { planNormalization } from '../features/wrapup/prints/capture/normalize';
import { PRINT_SPACE } from '../features/wrapup/prints/constants';
import { LUPA_MAX_PX } from '../features/wrapup/prints/plan/pinTemplates';
import type { CrossCheck, EvidenceWindow, MaskRect, PrintAsset, PrintPin, PrintRecord, Sourced } from '../features/wrapup/prints/types';
import type { ApprovalPanelProps } from '../features/wrapup/prints/ui/ApprovalPanel';
import { CropDialog, fitKey, type CropDialogProps } from '../features/wrapup/prints/ui/CropDialog';
import { PrintEditor, type PrintEditorProps } from '../features/wrapup/prints/ui/PrintEditor';
import {
  acceptAllSuggestions,
  acceptSuggestion,
  addMask,
  addPin,
  baseLegend,
  editablePins,
  freePinSpot,
  ignoreSuggestion,
  KEYBOARD_FOCUS,
  KEYBOARD_MASK,
  movePinBy,
  movePinTo,
  nextPinNumber,
  pinLimit,
  removeMask,
  removePin,
  replaceMask,
  restorePinLabel,
  SUGGESTED_PIN_MAX,
  uiLangOf,
  withPinLabel,
} from '../features/wrapup/prints/ui/editor/edits';
import {
  applyMatrix,
  arrowDelta,
  cropEdgeKey,
  cropEdgeRange,
  cropKeyStep,
  drawnFocus,
  drawnRect,
  invertMatrix,
  MIN_CROP_PX,
  moveRect,
  resizeRect,
  screenToViewBox,
  withCropEdge,
  type MatrixLike,
} from '../features/wrapup/prints/ui/editor/geometry';
import type { PinSuggestions } from '../features/wrapup/prints/ui/usePrintDeckModel';

/**
 * 3.2.7 — the print editor and the crop dialog (spec §7.2): the pure geometry (a pointer mapped
 * through a stubbed screen transform, the 72 px overlap guard, the 8×8 mask minimum, the
 * keyboard's 4 / 20 px), the edits each gesture sends to the store, and both dialogs rendered
 * with the store's `update` replaced by a spy.
 */

// ------------------------------------------------------------------ browser stubs

/** jsdom has no PointerEvent; React listens for `pointerdown`/`pointermove`/`pointerup` with clientX/Y. */
class PointerEventStub extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}

/** A stage drawn at half size, 100 px from the left and 50 px from the top of the screen. */
const HALF: MatrixLike = { a: 0.5, b: 0, c: 0, d: 0.5, e: 100, f: 50 };
/** Screen → viewBox for HALF. */
const client = (x: number, y: number) => ({ clientX: x * HALF.a + HALF.e, clientY: y * HALF.d + HALF.f });

function stubCtm(svg: Element, matrix: MatrixLike = HALF): void {
  Object.defineProperty(svg, 'getScreenCTM', { configurable: true, value: () => ({ ...matrix, inverse: () => invertMatrix(matrix) }) });
}

const newCreateUrl = () => vi.fn<(blob: Blob) => string>(() => 'blob:print');
const newRevokeUrl = () => vi.fn<(url: string) => void>();
let createUrl = newCreateUrl();
let revokeUrl = newRevokeUrl();

beforeEach(() => {
  createUrl = newCreateUrl();
  revokeUrl = newRevokeUrl();
  Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: PointerEventStub });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeUrl });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ------------------------------------------------------------------ i18n helpers

const en = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'en', params);
const pt = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'pt-BR', params);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Either language: the provider may start in either. */
const anyLang = (key: StringKey, params?: Record<string, string | number>) => new RegExp(`${escape(en(key, params))}|${escape(pt(key, params))}`);
const exactly = (key: StringKey, params?: Record<string, string | number>) => new RegExp(`^(?:${escape(en(key, params))}|${escape(pt(key, params))})$`);

// ------------------------------------------------------------------ fixtures

const SHOT = 'problem--p-9100100';

const pin = (n: number, x: number, y: number, extra: Partial<PrintPin> = {}): PrintPin => ({ n, x, y, origin: 'anchor', ...extra });

function record(overrides: Partial<PrintRecord> = {}): PrintRecord {
  return {
    id: 'pr-00000000000000b1',
    slotId: SHOT,
    kind: 'problem',
    layout: 'problems.detail',
    titleText: { key: 'prt.title.problem', params: { displayId: 'P-9100100' } },
    entity: { id: null, name: 'P-9100100' },
    subject: { kind: 'incident' },
    incident: null,
    requestedPath: '/ui/apps/dynatrace.davis.problems/problem/1',
    finalPath: '/ui/apps/dynatrace.davis.problems/problem/1',
    finalAppId: 'dynatrace.davis.problems',
    linkEvidence: 'verified',
    source: 'companion',
    landing: 'ok',
    capturedAtIso: '2026-10-05T18:40:00.000Z',
    capturedAtApprox: false,
    captureTimeZone: 'UTC',
    screenTimeframeLabel: null,
    companion: { version: '1.1.0', planId: null, browser: null },
    image: { sha256: 'b'.repeat(64), mime: 'image/jpeg', bytes: 10, width: 1720, height: 1080, normalization: 'native', partial: false },
    anchors: [],
    screenNumbers: [],
    identity: 'anchor',
    pins: [],
    masks: [],
    maskSuggestions: [],
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

const WINDOW: EvidenceWindow = { kind: 'problem', startIso: '2026-09-22T22:57:00.000Z', endIso: '2026-09-22T23:09:00.000Z', source: 'derived', minutes: 12 };
const sourcedOf = (value: number, source: Sourced['source']): Sourced<number> => ({
  value,
  display: String(value),
  source,
  queryId: source === 'screen' ? 'screen' : 'ev.frontend.summary',
  window: source === 'screen' ? null : WINDOW,
  collectedAtIso: null,
  quality: 'exact',
});

const CHECK: CrossCheck = { anchorKey: 'users', screen: sourcedOf(30, 'screen'), grail: sourcedOf(30, 'rum'), agree: true, text: 'checked in Grail' };

const SEEDS: PrintPin[] = [pin(1, 700, 100, { anchorKey: 'identity' }), pin(2, 610, 160, { origin: 'template', anchorKey: 'users' })];

const SUGGESTIONS: PinSuggestions = {
  seeds: SEEDS,
  legendByPin: new Map([
    [1, 'Problem: P-9100100, 12 min'],
    [2, 'Impact: 30 users (checked in Grail)'],
  ]),
  crossChecks: [CHECK],
};

const master = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });

function approvalProps(rec: PrintRecord): ApprovalPanelProps {
  return {
    record: rec,
    slot: { id: rec.slotId, forced: false },
    name: 'P-9100100',
    approved: false,
    checklistTicked: false,
    onChecklistChange: vi.fn(),
    onAcceptMasks: vi.fn(),
    onConfirmIdentity: vi.fn(),
    onApprove: vi.fn(() => Promise.resolve()),
    onRevoke: vi.fn(),
  };
}

const mount = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

function openEditor(rec: PrintRecord = record(), overrides: Partial<PrintEditorProps> = {}) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const asset: PrintAsset = { record: rec, master: master(), thumbUrl: null };
  const props: PrintEditorProps = {
    show: true,
    asset,
    slot: null,
    title: 'Problem P-9100100',
    suggestions: SUGGESTIONS,
    approval: approvalProps(rec),
    onChange,
    onClose,
    ...overrides,
  };
  // The slot only gates the approval panel; a minimal stand-in is enough here.
  const withSlot = { ...props, slot: overrides.slot === undefined ? ({ id: rec.slotId, forced: false } as PrintEditorProps['slot']) : overrides.slot };
  const view = mount(<PrintEditor {...withSlot} />);
  const stage = document.querySelector('svg[data-prt-stage]');
  if (stage === null) throw new Error('stage not rendered');
  stubCtm(stage);
  return { view, onChange, onClose, stage, props: withSlot };
}

/** The editor over a record that follows its own patches, as the store's `update` does. */
function LiveEditor({ initial, spy }: { initial: PrintRecord; spy: (patch: unknown) => void }) {
  const [rec, setRec] = React.useState(initial);
  const [blob] = React.useState(master);
  return (
    <PrintEditor
      show
      asset={{ record: rec, master: blob, thumbUrl: null }}
      slot={{ id: rec.slotId, forced: false } as PrintEditorProps['slot']}
      title="Problem P-9100100"
      suggestions={SUGGESTIONS}
      approval={approvalProps(rec)}
      onChange={(patch) => {
        spy(patch);
        setRec((previous) => ({ ...previous, ...patch }));
      }}
      onClose={() => undefined}
    />
  );
}

function openLiveEditor(rec: PrintRecord = record()) {
  const onChange = vi.fn();
  const view = mount(<LiveEditor initial={rec} spy={onChange} />);
  const stage = document.querySelector('svg[data-prt-stage]');
  if (stage === null) throw new Error('stage not rendered');
  stubCtm(stage);
  return { view, onChange, stage };
}

const pinButtons = () => Array.from(document.querySelectorAll<SVGGElement>('g[data-prt-pin]'));
const lastPatch = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls[spy.mock.calls.length - 1]?.[0] as Record<string, unknown>;

/** The mode group's items are radios (Strato ToggleButtonGroup). */
function chooseMode(key: StringKey): void {
  fireEvent.click(screen.getByRole('radio', { name: exactly(key) }));
}

// ------------------------------------------------------------------ geometry

describe('the stage geometry', () => {
  it('maps a screen point into print space through the stage’s inverse screen transform', () => {
    const svg = { getScreenCTM: () => ({ ...HALF, inverse: () => invertMatrix(HALF) as MatrixLike }) };
    expect(screenToViewBox(svg, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(screenToViewBox(svg, 100 + 430, 50 + 270)).toEqual({ x: 860, y: 540 });
    // Outside the image (the letterbox, or a drag past the edge) clamps to the print.
    expect(screenToViewBox(svg, 5000, -10)).toEqual({ x: PRINT_SPACE.width, y: 0 });
    // A transform without `inverse()` (an SVGMatrix-like stub) is inverted by hand.
    expect(screenToViewBox({ getScreenCTM: () => HALF }, 530, 320)).toEqual({ x: 860, y: 540 });
    // Not laid out yet, or collapsed to nothing: no point.
    expect(screenToViewBox({ getScreenCTM: () => null }, 1, 1)).toBeNull();
    expect(screenToViewBox({ getScreenCTM: () => ({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 }) }, 1, 1)).toBeNull();
    expect(screenToViewBox(null, 1, 1)).toBeNull();
  });

  it('inverts any affine transform (scale, skew, offset)', () => {
    const m: MatrixLike = { a: 0.8, b: 0.1, c: -0.2, d: 0.6, e: 33, f: -12 };
    const inverse = invertMatrix(m);
    expect(inverse).not.toBeNull();
    const back = applyMatrix(inverse as MatrixLike, applyMatrix(m, { x: 412, y: 97 }));
    expect(back.x).toBeCloseTo(412, 9);
    expect(back.y).toBeCloseTo(97, 9);
  });

  it('turns a drag into a mask only when it is at least 8 × 8, in either direction', () => {
    expect(drawnRect({ x: 100, y: 100 }, { x: 107, y: 140 })).toBeNull();
    expect(drawnRect({ x: 100, y: 100 }, { x: 140, y: 107 })).toBeNull();
    expect(drawnRect({ x: 100, y: 100 }, { x: 108, y: 108 })).toEqual({ x: 100, y: 100, w: 8, h: 8 });
    expect(drawnRect({ x: 300.4, y: 220.6 }, { x: 100, y: 100 })).toEqual({ x: 100, y: 100, w: 200, h: 121 });
  });

  it('caps a drawn lupa at 520 px wide, keeping the side the drag started from', () => {
    expect(drawnFocus({ x: 100, y: 100 }, { x: 900, y: 140 })).toEqual({ x: 100, y: 100, w: LUPA_MAX_PX, h: 40 });
    expect(drawnFocus({ x: 900, y: 100 }, { x: 100, y: 140 })).toEqual({ x: 900 - LUPA_MAX_PX, y: 100, w: LUPA_MAX_PX, h: 40 });
    expect(drawnFocus({ x: 0, y: 0 }, { x: 5, y: 5 })).toBeNull();
  });

  it('moves 4 px per arrow and 20 px with Shift; other keys do nothing', () => {
    expect(arrowDelta('ArrowRight', false)).toEqual([4, 0]);
    expect(arrowDelta('ArrowLeft', true)).toEqual([-20, 0]);
    expect(arrowDelta('ArrowUp', false)).toEqual([0, -4]);
    expect(arrowDelta('ArrowDown', true)).toEqual([0, 20]);
    expect(arrowDelta('Enter', false)).toBeNull();
  });

  it('keeps a moved or resized rectangle inside the print, at least 8 × 8, the lupa ≤ 520 wide', () => {
    expect(moveRect({ x: 1700, y: 10, w: 100, h: 20 }, 50, -40)).toEqual({ x: 1620, y: 0, w: 100, h: 20 });
    expect(resizeRect({ x: 10, y: 10, w: 10, h: 10 }, -20, -20)).toEqual({ x: 10, y: 10, w: 8, h: 8 });
    expect(resizeRect({ x: 10, y: 10, w: 510, h: 30 }, 20, 0, { maxW: LUPA_MAX_PX })).toEqual({ x: 10, y: 10, w: LUPA_MAX_PX, h: 30 });
    expect(resizeRect({ x: 1700, y: 1070, w: 16, h: 8 }, 20, 20)).toEqual({ x: 1700, y: 1070, w: 20, h: 10 });
  });
});

describe('the crop edges', () => {
  const size = { width: 1920, height: 1080 };
  const crop = { x: 200, y: 0, w: 1720, h: 1080 };

  it('moves one edge and keeps the opposite one, never closer than the minimum crop', () => {
    expect(withCropEdge(crop, 'left', 260, size)).toEqual({ x: 260, y: 0, w: 1660, h: 1080 });
    expect(withCropEdge(crop, 'left', 5000, size)).toEqual({ x: 1920 - MIN_CROP_PX, y: 0, w: MIN_CROP_PX, h: 1080 });
    expect(withCropEdge(crop, 'right', -10, size)).toEqual({ x: 200, y: 0, w: MIN_CROP_PX, h: 1080 });
    expect(withCropEdge(crop, 'top', 90.6, size)).toEqual({ x: 200, y: 91, w: 1720, h: 989 });
    expect(withCropEdge(crop, 'bottom', 2000, size)).toEqual(crop);
    expect(cropEdgeRange(crop, 'left', size)).toEqual({ min: 0, max: 1920 - MIN_CROP_PX });
  });

  it('steps with the keyboard in proportion to the image: 4 px of a 1920 px image, ×5 with Shift', () => {
    expect(cropKeyStep(1920, false)).toBe(4);
    expect(cropKeyStep(1920, true)).toBe(20);
    expect(cropKeyStep(3840, false)).toBe(8);
    expect(cropKeyStep(300, false)).toBe(1);
    expect(cropEdgeKey(crop, 'left', 'ArrowRight', false, size)).toBe(204);
    expect(cropEdgeKey(crop, 'left', 'ArrowLeft', true, size)).toBe(180);
    expect(cropEdgeKey(crop, 'left', 'Home', false, size)).toBe(0);
    expect(cropEdgeKey(crop, 'top', 'ArrowDown', false, size)).toBe(2);
    expect(cropEdgeKey(crop, 'bottom', 'ArrowUp', false, size)).toBe(1078);
    expect(cropEdgeKey(crop, 'right', 'End', false, size)).toBe(1920);
    expect(cropEdgeKey(crop, 'right', 'a', false, size)).toBeNull();
  });

  it('names how the crop becomes the print', () => {
    const plan = (c: typeof crop) => planNormalization(1920, 1080, c);
    expect(fitKey(plan(crop), crop)).toBe('prt.crop.fit.resized');
    const tall = { x: 200, y: 0, w: 1720, h: 1080 };
    expect(fitKey(planNormalization(1920, 1200, { ...tall, h: 1150 }), { ...tall, h: 1150 })).toBe('prt.crop.fit.cut');
    const short = { x: 200, y: 0, w: 1720, h: 1030 };
    expect(fitKey(plan(short), short)).toBe('prt.crop.fit.pad');
    const strip = { x: 200, y: 0, w: 1720, h: 400 };
    expect(fitKey(plan(strip), strip)).toBe('prt.crop.fit.contain');
  });
});

// ------------------------------------------------------------------ edits

describe('the pin edits', () => {
  it('works on the suggestions until the SE edits, then on the SE’s own list', () => {
    expect(editablePins([], SEEDS)).toEqual(SEEDS);
    const own = [pin(3, 10, 10, { origin: 'manual' })];
    expect(editablePins(own, SEEDS)).toEqual(own);
  });

  it('adds a pin on a click unless it lands within 72 px of another, or the print is full', () => {
    const pins = [pin(1, 500, 500)];
    expect(addPin(pins, { x: 500 + PIN_MIN_GAP_PX - 1, y: 500 }, 6)).toEqual({ ok: false, reason: 'overlap' });
    const added = addPin(pins, { x: 500 + PIN_MIN_GAP_PX, y: 500 }, 6);
    expect(added).toEqual({ ok: true, n: 7, pins: [pins[0], { n: 7, x: 572, y: 500, origin: 'manual' }] });
    const six = [1, 2, 3, 4, 5, 6].map((n) => pin(n, n * 200, 100));
    expect(addPin(six, { x: 900, y: 900 }, 6)).toEqual({ ok: false, reason: 'limit' });
    // Hidden pins do not count, and do not block the spot.
    const hidden = six.map((item) => (item.n === 6 ? { ...item, hidden: true } : item));
    expect(addPin(hidden, { x: 1200, y: 100 }, 6)).toMatchObject({ ok: true, n: 7 });
  });

  it('allows 6 pins, 4 while the lupa is on with a region', () => {
    expect(pinLimit({ lupaOn: false, focus: null })).toBe(6);
    expect(pinLimit({ lupaOn: true, focus: null })).toBe(6);
    expect(pinLimit({ lupaOn: true, focus: { x: 0, y: 0, w: 100, h: 20 } })).toBe(4);
  });

  it('numbers a new pin above every template number and every pin, so it never inherits a suggested legend', () => {
    // A template pin missing now (its number not read yet) may appear later with its legend: 1..6 are never reused.
    expect(SUGGESTED_PIN_MAX).toBe(6);
    expect(nextPinNumber([])).toBe(7);
    expect(nextPinNumber([pin(2, 0, 0), pin(5, 0, 0, { hidden: true })])).toBe(7);
    expect(nextPinNumber([pin(1, 0, 0), pin(9, 0, 0, { hidden: true })])).toBe(10);
  });

  it('finds a free spot for a pin added from the keyboard, nearest the centre and clear of the 72 px guard', () => {
    expect(freePinSpot([])).toEqual({ x: 820, y: 500 });
    const spot = freePinSpot([pin(1, 820, 500), pin(2, 900, 540)]);
    expect(spot).not.toBeNull();
    for (const other of [pin(1, 820, 500), pin(2, 900, 540)]) expect(Math.hypot((spot?.x ?? 0) - other.x, (spot?.y ?? 0) - other.y)).toBeGreaterThanOrEqual(PIN_MIN_GAP_PX);
  });

  it('stops a move that would bring a pin within 72 px of another (the overlap guard)', () => {
    const pins = [pin(1, 500, 500), pin(2, 700, 500)];
    const blocked = movePinTo(pins, 2, { x: 560, y: 500 });
    expect(blocked.blocked).toBe(true);
    expect(blocked.pins).toEqual(pins);
    const moved = movePinTo(pins, 2, { x: 572, y: 500 });
    expect(moved).toMatchObject({ moved: true, blocked: false });
    expect(moved.pins[1]).toEqual({ n: 2, x: 572, y: 500, origin: 'manual' });
  });

  it('lets a pin that already overlaps move away, never closer', () => {
    const pins = [pin(1, 500, 500), pin(2, 530, 500)];
    expect(movePinTo(pins, 2, { x: 540, y: 500 })).toMatchObject({ moved: true, blocked: false });
    expect(movePinTo(pins, 2, { x: 520, y: 500 })).toMatchObject({ moved: false, blocked: true });
  });

  it('moves with the keyboard by 4 px (Shift 20 px) and keeps the pin 16 px inside the print', () => {
    const pins = [pin(1, 500, 500)];
    expect(movePinBy(pins, 1, 4, 0).pins[0]).toMatchObject({ x: 504, y: 500, origin: 'manual' });
    expect(movePinBy(pins, 1, 0, -20).pins[0]).toMatchObject({ x: 500, y: 480 });
    expect(movePinBy([pin(1, 20, 20)], 1, -20, -20).pins[0]).toMatchObject({ x: 16, y: 16 });
    expect(movePinBy(pins, 9, 4, 0)).toMatchObject({ moved: false, blocked: false });
  });

  it('hides a suggested pin on Delete (restorable, numbering kept) and drops the SE’s own', () => {
    const pins = [...SEEDS, pin(7, 900, 900, { origin: 'manual' })];
    expect(removePin(pins, 1)[0]).toMatchObject({ n: 1, hidden: true });
    // A suggested pin the SE moved (origin manual) is still a suggested one.
    expect(removePin([pin(2, 10, 10, { origin: 'manual' }), pin(7, 900, 900, { origin: 'manual' })], 2)[0]).toMatchObject({ n: 2, hidden: true });
    expect(removePin(pins, 7).map((item) => item.n)).toEqual([1, 2]);
    // The last pin is hidden, not dropped: an empty list would bring the app's suggestions back.
    expect(removePin([pin(7, 900, 900, { origin: 'manual' })], 7)).toEqual([{ n: 7, x: 900, y: 900, origin: 'manual', hidden: true }]);
  });

  it('keeps the SE’s text to 130 characters; an empty text or the suggestion itself is no override', () => {
    const pins = [pin(1, 0, 0)];
    expect(withPinLabel(pins, 1, 'x'.repeat(200), 'Problem: P-1')[0]?.labelOverride).toHaveLength(130);
    expect(withPinLabel(pins, 1, '   ', 'Problem: P-1')[0]).not.toHaveProperty('labelOverride');
    expect(withPinLabel(pins, 1, 'Problem: P-1 ', 'Problem: P-1')[0]).not.toHaveProperty('labelOverride');
    expect(withPinLabel(pins, 1, 'Root: the database', null)[0]?.labelOverride).toBe('Root: the database');
    expect(restorePinLabel([pin(1, 0, 0, { labelOverride: 'mine' })], 1)[0]).not.toHaveProperty('labelOverride');
  });

  it('takes the screen–Grail note off a suggested legend before it becomes the SE’s text', () => {
    expect(baseLegend('Impact: 30 users (checked in Grail)', 'users', [CHECK])).toBe('Impact: 30 users');
    expect(baseLegend('Impact: 30 users', 'users', [CHECK])).toBe('Impact: 30 users');
    expect(baseLegend('Problem: P-1', 'identity', [CHECK])).toBe('Problem: P-1');
    expect(baseLegend(undefined, 'users', [CHECK])).toBeNull();
  });

  it('reads the platform language a companion capture warned about', () => {
    expect(uiLangOf(['normalized:resized', 'ui_lang:pt-BR'])).toBe('pt-BR');
    expect(uiLangOf(['off_tenant'])).toBeNull();
  });
});

describe('the mask edits', () => {
  const email: MaskRect = { x: 10, y: 10, w: 200, h: 30, reason: 'email' };
  const ip: MaskRect = { x: 10, y: 60, w: 120, h: 30, reason: 'ipv4' };
  const base = { masks: [] as MaskRect[], maskSuggestions: [email, ip] };

  it('accepts or ignores one suggestion, or accepts them all', () => {
    expect(acceptSuggestion(base, 1)).toEqual({ masks: [ip], maskSuggestions: [email] });
    expect(ignoreSuggestion(base, 0)).toEqual({ maskSuggestions: [ip] });
    expect(acceptAllSuggestions(base)).toEqual({ masks: [email, ip], maskSuggestions: [] });
    expect(acceptSuggestion(base, 5)).toEqual({});
  });

  it('adds a drawn mask as manual, moves one keeping its reason, removes one', () => {
    expect(addMask({ masks: [email] }, { x: 1, y: 2, w: 30, h: 40 })).toEqual({ masks: [email, { x: 1, y: 2, w: 30, h: 40, reason: 'manual' }] });
    expect(replaceMask({ masks: [email, ip] }, 1, { x: 90, y: 90, w: 50, h: 9 })).toEqual({ masks: [email, { x: 90, y: 90, w: 50, h: 9, reason: 'ipv4' }] });
    expect(removeMask({ masks: [email, ip] }, 0)).toEqual({ masks: [ip] });
  });
});

// ------------------------------------------------------------------ the editor, rendered

describe('the print editor', () => {
  it('draws the suggested pins as focusable buttons, each with its own name and the estimated tooltip', () => {
    openEditor();
    const pins = pinButtons();
    expect(pins).toHaveLength(2);
    for (const element of pins) {
      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('tabindex')).toBe('0');
    }
    expect(pins[0]?.getAttribute('aria-label')).toMatch(anyLang('prt.ed.pinAria', { n: '1', label: 'Problem: P-9100100, 12 min' }));
    // The screen–Grail note is not part of the pin's own text.
    expect(pins[1]?.getAttribute('aria-label')).toMatch(anyLang('prt.ed.pinAria', { n: '2', label: 'Impact: 30 users' }));
    expect(pins[1]?.querySelector('title')?.textContent).toMatch(anyLang('prt.ed.estimated'));
    expect(pins[0]?.querySelector('title')).toBeNull();
  });

  it('moves a pin 4 px with an arrow and 20 px with Shift, and saves the whole list', () => {
    const { onChange } = openEditor();
    fireEvent.keyDown(pinButtons()[0] as Element, { key: 'ArrowRight' });
    expect(lastPatch(onChange)).toEqual({ pins: [{ ...SEEDS[0], x: 704, origin: 'manual' }, SEEDS[1]] });
    fireEvent.keyDown(pinButtons()[0] as Element, { key: 'ArrowDown', shiftKey: true });
    expect(lastPatch(onChange)).toEqual({ pins: [{ ...SEEDS[0], y: 120, origin: 'manual' }, SEEDS[1]] });
  });

  it('refuses a keyboard move into the 72 px guard and says why', () => {
    const rec = record({ pins: [pin(1, 500, 500), pin(2, 574, 500, { origin: 'manual' })] });
    const { onChange } = openEditor(rec);
    fireEvent.keyDown(pinButtons()[1] as Element, { key: 'ArrowLeft' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(anyLang('prt.ed.pins.overlap'));
  });

  it('removes a pin with Delete: a suggested one is hidden', () => {
    const { onChange } = openEditor();
    fireEvent.keyDown(pinButtons()[0] as Element, { key: 'Delete' });
    expect(lastPatch(onChange)).toEqual({ pins: [{ ...SEEDS[0], hidden: true }, SEEDS[1]] });
  });

  it('adds a pin where the stage is clicked, mapped through the screen transform', () => {
    const { onChange, stage } = openEditor();
    const at = client(1200, 800);
    fireEvent.pointerDown(stage, at);
    fireEvent.pointerUp(stage, at);
    expect(lastPatch(onChange)).toEqual({ pins: [...SEEDS, { n: 7, x: 1200, y: 800, origin: 'manual' }] });
  });

  it('adds no pin for a click in the letterbox around the picture', () => {
    const { onChange, stage } = openEditor();
    const outside = client(-60, 500);
    fireEvent.pointerDown(stage, outside);
    fireEvent.pointerUp(stage, outside);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a pin without the pointer ("Adicionar pino") and gives it the focus, so the arrows move it', () => {
    const { onChange } = openLiveEditor();
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.pins.add') }));
    expect(lastPatch(onChange)).toEqual({ pins: [...SEEDS, { n: 7, x: 820, y: 500, origin: 'manual' }] });
    expect(document.activeElement?.getAttribute('data-prt-pin')).toBe('7');
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft', shiftKey: true });
    expect(lastPatch(onChange)).toEqual({ pins: [...SEEDS, { n: 7, x: 800, y: 500, origin: 'manual' }] });
  });

  it('refuses "Adicionar pino" past the limit and says why', () => {
    const four = [1, 2, 3, 4].map((n) => pin(n, n * 200, 600, { origin: 'manual' }));
    const { onChange } = openEditor(record({ pins: four, lupaOn: true, focus: { x: 100, y: 100, w: 300, h: 40 } }));
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.pins.add') }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(anyLang('prt.ed.pins.limitLupa', { max: '4' }));
  });

  it('says in the Pins mode that only the first 4 pins go on the slide while the lupa is on', () => {
    const five = [1, 2, 3, 4, 5].map((n) => pin(n, n * 200, 600, { origin: 'manual' }));
    openEditor(record({ pins: five, lupaOn: true, focus: { x: 100, y: 100, w: 300, h: 40 } }));
    expect(screen.getByText(anyLang('prt.ed.focus.cut', { max: '4' }))).toBeTruthy();
  });

  it('does not add a pin on top of another, nor past the limit', () => {
    const { onChange, stage } = openEditor();
    const near = client(700 + 40, 100);
    fireEvent.pointerDown(stage, near);
    fireEvent.pointerUp(stage, near);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(anyLang('prt.ed.pins.overlap'));
    cleanup();

    const four = [1, 2, 3, 4].map((n) => pin(n, n * 200, 600, { origin: 'manual' }));
    const full = openEditor(record({ pins: four, lupaOn: true, focus: { x: 100, y: 100, w: 300, h: 40 } }));
    const free = client(1400, 1000);
    fireEvent.pointerDown(full.stage, free);
    fireEvent.pointerUp(full.stage, free);
    expect(full.onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(anyLang('prt.ed.pins.limitLupa', { max: '4' }));
  });

  it('drags a pin and stops it at the overlap guard instead of jumping past its neighbour', () => {
    const rec = record({ pins: [pin(1, 500, 500, { origin: 'manual' }), pin(2, 800, 500, { origin: 'manual' })] });
    const { onChange, stage } = openEditor(rec);
    fireEvent.pointerDown(pinButtons()[1] as Element, client(800, 500));
    fireEvent.pointerMove(stage, client(700, 500));
    fireEvent.pointerMove(stage, client(540, 500));
    fireEvent.pointerUp(stage, client(540, 500));
    expect(lastPatch(onChange)).toEqual({ pins: [rec.pins[0], { n: 2, x: 700, y: 500, origin: 'manual' }] });
    expect(screen.getByRole('status').textContent).toMatch(anyLang('prt.ed.pins.overlap'));
  });

  it('selects a pin on a click with a little jitter, without moving it; a drag keeps the grab offset', () => {
    const { onChange, stage } = openEditor();
    fireEvent.pointerDown(pinButtons()[1] as Element, client(610, 160));
    fireEvent.pointerMove(stage, client(613, 161));
    fireEvent.pointerUp(stage, client(613, 161));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(exactly('prt.ed.pin.text', { n: '2' }))).toBeTruthy();
    // Grabbed 10 px right of and 5 px below its centre, dropped 300 px lower: the centre moves by 300 px.
    fireEvent.pointerDown(pinButtons()[1] as Element, client(620, 165));
    fireEvent.pointerMove(stage, client(620, 300));
    fireEvent.pointerMove(stage, client(620, 465));
    fireEvent.pointerUp(stage, client(620, 465));
    expect(lastPatch(onChange)).toEqual({ pins: [SEEDS[0], { ...SEEDS[1], y: 460, origin: 'manual' }] });
  });

  it('edits a pin’s text (≤ 130 characters) and saves it after a pause', () => {
    vi.useFakeTimers();
    const { onChange } = openEditor();
    fireEvent.keyDown(pinButtons()[0] as Element, { key: 'Enter' });
    const area = screen.getByLabelText<HTMLTextAreaElement>(exactly('prt.ed.pin.text', { n: '1' }));
    expect(area.value).toBe('Problem: P-9100100, 12 min');
    expect(area.maxLength).toBe(130);
    fireEvent.change(area, { target: { value: 'Problem: the outage the customer saw' } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(lastPatch(onChange)).toEqual({ pins: [{ ...SEEDS[0], labelOverride: 'Problem: the outage the customer saw' }, SEEDS[1]] });
  });

  it('keeps the text saved while a pin was being dragged (the drag writes positions, not a stale list)', () => {
    vi.useFakeTimers();
    const { onChange, stage } = openLiveEditor();
    fireEvent.keyDown(pinButtons()[0] as Element, { key: 'Enter' });
    fireEvent.change(screen.getByLabelText(exactly('prt.ed.pin.text', { n: '1' })), { target: { value: 'Problem: mine' } });
    // The drag starts, then the pause saves the text (as a blur would), then the pin moves.
    fireEvent.pointerDown(pinButtons()[1] as Element, client(610, 160));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(lastPatch(onChange)).toEqual({ pins: [{ ...SEEDS[0], labelOverride: 'Problem: mine' }, SEEDS[1]] });
    fireEvent.pointerMove(stage, client(610, 400));
    fireEvent.pointerUp(stage, client(610, 400));
    expect(lastPatch(onChange)).toEqual({ pins: [{ ...SEEDS[0], labelOverride: 'Problem: mine' }, { ...SEEDS[1], y: 400, origin: 'manual' }] });
  });

  it('saves the text being typed when Esc closes the editor', () => {
    const { onChange, onClose } = openEditor();
    fireEvent.keyDown(pinButtons()[1] as Element, { key: ' ' });
    const area = screen.getByLabelText(exactly('prt.ed.pin.text', { n: '2' }));
    fireEvent.change(area, { target: { value: 'Impact: my words' } });
    fireEvent.keyDown(area, { key: 'Escape' });
    expect(lastPatch(onChange)).toEqual({ pins: [SEEDS[0], { ...SEEDS[1], labelOverride: 'Impact: my words' }] });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0] ?? 0);
  });

  it('moves the focus into a pin’s text on Enter, and not again when the Pins mode comes back', () => {
    openEditor();
    fireEvent.keyDown(pinButtons()[0] as Element, { key: 'Enter' });
    const area = screen.getByLabelText(exactly('prt.ed.pin.text', { n: '1' }));
    expect(document.activeElement).toBe(area);
    chooseMode('prt.ed.mode.masks');
    const radio = screen.getByRole('radio', { name: exactly('prt.ed.mode.pins') });
    act(() => radio.focus());
    fireEvent.click(radio);
    expect(screen.getByLabelText(exactly('prt.ed.pin.text', { n: '1' }))).toBeTruthy();
    expect(document.activeElement).toBe(radio);
  });

  it('offers "Restaurar sugestão" for a pin with the SE’s own text', () => {
    const rec = record({ pins: [{ ...SEEDS[0], labelOverride: 'Problem: mine' } as PrintPin, SEEDS[1] as PrintPin] });
    const { onChange } = openEditor(rec);
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.pin.edit', { n: '1' }) }));
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.restore') }));
    expect(lastPatch(onChange)).toEqual({ pins: [SEEDS[0], SEEDS[1]] });
    // The SE's own list exists: the app's pins can come back as a whole.
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.pins.restoreAll') }));
    expect(lastPatch(onChange)).toEqual({ pins: [] });
  });

  it('draws a mask by dragging (≥ 8 × 8), and refuses a smaller one with a reason', () => {
    const { onChange, stage } = openEditor();
    chooseMode('prt.ed.mode.masks');
    fireEvent.pointerDown(stage, client(100, 200));
    fireEvent.pointerMove(stage, client(300, 260));
    fireEvent.pointerUp(stage, client(300, 260));
    expect(lastPatch(onChange)).toEqual({ masks: [{ x: 100, y: 200, w: 200, h: 60, reason: 'manual' }] });
    onChange.mockClear();
    fireEvent.pointerDown(stage, client(100, 200));
    fireEvent.pointerMove(stage, client(130, 205));
    fireEvent.pointerUp(stage, client(130, 205));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(anyLang('prt.ed.mask.tooSmall'));
  });

  it('lists the companion’s suggestions with their reason in a Chip (no id or test id of ours inside) and accepts or ignores them', () => {
    const email: MaskRect = { x: 10, y: 10, w: 200, h: 30, reason: 'email' };
    const ip: MaskRect = { x: 10, y: 60, w: 120, h: 30, reason: 'ipv4' };
    const { onChange } = openEditor(record({ maskSuggestions: [email, ip] }));
    chooseMode('prt.ed.mode.masks');
    // Dashed on the stage, solid fill only once accepted.
    expect(document.querySelectorAll('.pvs-ped-suggestion rect')).toHaveLength(2);
    const chips = Array.from(document.querySelectorAll('[data-dt-component="Chip"]'));
    expect(chips.map((chip) => chip.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(anyLang('prt.ed.reason.email')), expect.stringMatching(anyLang('prt.ed.reason.ipv4'))]));
    // Nothing of ours inside a Chip carries a test id, and no id repeats anywhere (a Chip renders its content twice).
    for (const chip of chips) expect(chip.querySelector('[data-testid]')).toBeNull();
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
    fireEvent.click(screen.getAllByRole('button', { name: exactly('prt.ed.suggest.accept') })[1] as Element);
    expect(lastPatch(onChange)).toEqual({ masks: [ip], maskSuggestions: [email] });
    fireEvent.click(screen.getAllByRole('button', { name: exactly('prt.ed.suggest.ignore') })[0] as Element);
    expect(lastPatch(onChange)).toEqual({ maskSuggestions: [ip] });
    // The approval panel's own "Aceitar todas" is there too; the editor's sends the same patch.
    fireEvent.click(screen.getAllByRole('button', { name: exactly('prt.ed.suggest.acceptAll') })[0] as Element);
    expect(lastPatch(onChange)).toEqual({ masks: [email, ip], maskSuggestions: [] });
  });

  it('adds a mask without the pointer ("Adicionar tarja") and gives it the focus', () => {
    const { onChange } = openLiveEditor();
    chooseMode('prt.ed.mode.masks');
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.masks.add') }));
    expect(lastPatch(onChange)).toEqual({ masks: [{ ...KEYBOARD_MASK, reason: 'manual' }] });
    expect(document.activeElement?.getAttribute('data-prt-mask')).toBe('0');
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight', altKey: true });
    expect(lastPatch(onChange)).toEqual({ masks: [{ ...KEYBOARD_MASK, w: KEYBOARD_MASK.w + 4, reason: 'manual' }] });
  });

  it('marks a detail without the pointer where the layout suggests none', () => {
    const { onChange } = openEditor(record({ layout: 'free' }));
    chooseMode('prt.ed.mode.focus');
    expect(screen.queryByRole('button', { name: exactly('prt.ed.focus.restore') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.focus.add') }));
    expect(lastPatch(onChange)).toEqual({ focus: KEYBOARD_FOCUS });
  });

  it('moves an accepted mask with the arrows, resizes it with Alt, removes it with Delete', () => {
    const mask: MaskRect = { x: 100, y: 100, w: 60, h: 20, reason: 'ipv4' };
    const { onChange } = openEditor(record({ masks: [mask] }));
    chooseMode('prt.ed.mode.masks');
    const target = document.querySelector('g[data-prt-mask="0"]') as Element;
    expect(target.getAttribute('role')).toBe('button');
    expect(target.querySelector('rect')?.getAttribute('fill')).toBe('#1B1C22');
    fireEvent.keyDown(target, { key: 'ArrowRight', shiftKey: true });
    expect(lastPatch(onChange)).toEqual({ masks: [{ ...mask, x: 120 }] });
    fireEvent.keyDown(target, { key: 'ArrowDown', altKey: true });
    expect(lastPatch(onChange)).toEqual({ masks: [{ ...mask, h: 24 }] });
    fireEvent.keyDown(target, { key: 'Delete' });
    expect(lastPatch(onChange)).toEqual({ masks: [] });
  });

  it('offers the lupa only while the pins fit (≤ 4), and turns it on', () => {
    const focus = { x: 574, y: 121, w: 481, h: 41 };
    const { onChange } = openEditor(record({ focus }));
    chooseMode('prt.ed.mode.focus');
    fireEvent.click(screen.getByText(anyLang('prt.ed.lupa')));
    expect(lastPatch(onChange)).toEqual({ lupaOn: true });
    expect(document.querySelector('svg.pvs-ped-zoom')?.getAttribute('viewBox')).toBe('574 121 481 41');
    cleanup();

    const five = [1, 2, 3, 4, 5].map((n) => pin(n, n * 200, 600, { origin: 'manual' }));
    openEditor(record({ focus, pins: five }));
    chooseMode('prt.ed.mode.focus');
    expect(screen.queryByText(anyLang('prt.ed.lupa'))).toBeNull();
    expect(screen.getByText(anyLang('prt.ed.focus.pinsOver', { max: '4', count: '5' }))).toBeTruthy();
  });

  it('draws the lupa region by dragging and offers the layout’s default back', () => {
    const { onChange, stage } = openEditor();
    chooseMode('prt.ed.mode.focus');
    expect(screen.getByText(anyLang('prt.ed.focus.none'))).toBeTruthy();
    fireEvent.pointerDown(stage, client(100, 100));
    fireEvent.pointerMove(stage, client(900, 140));
    fireEvent.pointerUp(stage, client(900, 140));
    expect(lastPatch(onChange)).toEqual({ focus: { x: 100, y: 100, w: LUPA_MAX_PX, h: 40 } });
    // A slip smaller than 8 × 8 is refused, in the words of the detail (not of a mask).
    fireEvent.pointerDown(stage, client(1200, 700));
    fireEvent.pointerMove(stage, client(1230, 704));
    fireEvent.pointerUp(stage, client(1230, 704));
    expect(screen.getByRole('status').textContent).toMatch(anyLang('prt.ed.focus.tooSmall'));
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.focus.restore') }));
    // problems.detail: {0.334, 0.112, 0.280, 0.038} of 1720 × 1080.
    expect(lastPatch(onChange)).toEqual({ focus: { x: 574, y: 121, w: 482, h: 41 } });
  });

  it('shows the numbers the screen showed beside Grail’s, with Grail’s source and window', () => {
    openEditor();
    const table = screen.getByRole('table');
    expect(within(table).getByText(anyLang('prt.ed.numbers.screen'))).toBeTruthy();
    expect(within(table).getByText(anyLang('prt.ed.numbers.grail'))).toBeTruthy();
    expect(within(table).getByText(anyLang('prt.ed.numbers.state'))).toBeTruthy();
    expect(within(table).getByText(new RegExp(`${escape(en('prt.ed.pin.title', { n: '2' }))}|${escape(pt('prt.ed.pin.title', { n: '2' }))}`))).toBeTruthy();
    expect(within(table).getByText(/^30 · RUM · /)).toBeTruthy();
    expect(within(table).getByText(exactly('prt.an.agree'))).toBeTruthy();
  });

  it('holds the approval panel of the tab, and says why there is none outside the plan', () => {
    openEditor();
    // The editor's panel carries no test ids (the gallery card's panel holds them), but its controls are there.
    expect(document.querySelector(`[name="prt-checklist-${SHOT}"]`)).not.toBeNull();
    expect(screen.queryByTestId(`prt-checklist-${SHOT}`)).toBeNull();
    cleanup();
    openEditor(record(), { slot: null, approval: null });
    expect(document.querySelector(`[name="prt-checklist-${SHOT}"]`)).toBeNull();
    expect(screen.getByText(anyLang('prt.ed.orphan'))).toBeTruthy();
  });

  it('says why the pins are estimated or off: another platform language, a letterboxed image', () => {
    openEditor(record({ warnings: ['ui_lang:pt-BR'], image: { ...record().image, partial: true } }));
    expect(screen.getByText(anyLang('prt.ed.uiLang', { lang: 'pt-BR' }))).toBeTruthy();
    expect(screen.getByText(anyLang('prt.ed.partial'))).toBeTruthy();
  });

  it('revokes the master’s object URL when it closes', () => {
    const { view } = openEditor();
    expect(createUrl).toHaveBeenCalled();
    view.unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:print');
  });
});

// ------------------------------------------------------------------ the crop dialog, rendered

describe('the crop dialog', () => {
  const SUGGESTION = { width: 1920, height: 1080, edge: 200, crop: { x: 200, y: 0, w: 1720, h: 1080 } };

  function openCrop(overrides: Partial<CropDialogProps> = {}) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    mount(<CropDialog show image={master()} suggestion={SUGGESTION} title="Problem P-9100100" onConfirm={onConfirm} onCancel={onCancel} {...overrides} />);
    const stage = document.querySelector('.pvs-ped-crop__svg');
    if (stage === null) throw new Error('crop stage not rendered');
    stubCtm(stage);
    return { onConfirm, onCancel, stage };
  }

  const slider = (key: StringKey) => screen.getByRole('slider', { name: exactly(key) });

  it('starts at the detected navigation edge and names each edge as a slider', () => {
    openCrop();
    expect(screen.getByText(anyLang('prt.crop.detected', { x: '200' }))).toBeTruthy();
    expect(screen.getAllByRole('slider')).toHaveLength(4);
    expect(slider('prt.crop.edge.left').getAttribute('aria-valuenow')).toBe('200');
    expect(slider('prt.crop.edge.right').getAttribute('aria-valuenow')).toBe('1920');
    expect(slider('prt.crop.edge.left').getAttribute('tabindex')).toBe('0');
    expect(screen.getByText(exactly('prt.crop.fit.resized'))).toBeTruthy();
  });

  it('says when it fell back to 200/1920 of the width', () => {
    openCrop({ suggestion: { ...SUGGESTION, edge: null } });
    expect(screen.getByText(anyLang('prt.crop.fallback', { x: '200' }))).toBeTruthy();
  });

  it('moves an edge with the keyboard and confirms the crop in the image’s own pixels', () => {
    const { onConfirm } = openCrop();
    fireEvent.keyDown(slider('prt.crop.edge.left'), { key: 'ArrowRight', shiftKey: true });
    expect(slider('prt.crop.edge.left').getAttribute('aria-valuenow')).toBe('220');
    fireEvent.keyDown(slider('prt.crop.edge.top'), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.crop.confirm') }));
    expect(onConfirm).toHaveBeenCalledWith({ x: 220, y: 2, w: 1700, h: 1078 });
  });

  it('drags an edge through the screen transform, and shows how the print changes', () => {
    openCrop();
    const left = slider('prt.crop.edge.left');
    const stage = document.querySelector('.pvs-ped-crop__svg') as Element;
    fireEvent.pointerDown(left, client(200, 540));
    fireEvent.pointerMove(stage, client(400, 540));
    fireEvent.pointerUp(stage, client(400, 540));
    expect(left.getAttribute('aria-valuenow')).toBe('400');
    // 1520 × 1080 is far from 1720 × 1080: the print would get margins.
    expect(screen.getByText(exactly('prt.crop.fit.contain'))).toBeTruthy();
    const result = document.querySelector('svg[data-prt-crop-result] svg');
    expect(result?.getAttribute('viewBox')).toBe('400 0 1520 1080');
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.ed.restore') }));
    expect(left.getAttribute('aria-valuenow')).toBe('200');
  });

  it('shows the replace warning it is given, and offers Refazer only for guided capture', () => {
    const onRetake = vi.fn();
    openCrop({ note: en('prt.cap.manual.replaces'), onRetake, confirmLabel: en('prt.cap.guided.keep') });
    expect(screen.getByText(en('prt.cap.manual.replaces'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: exactly('prt.cap.guided.retake') }));
    expect(onRetake).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: en('prt.cap.guided.keep') })).toBeTruthy();
    cleanup();
    openCrop();
    expect(screen.queryByRole('button', { name: exactly('prt.cap.guided.retake') })).toBeNull();
  });

  it('drags only with the main button', () => {
    openCrop();
    const left = slider('prt.crop.edge.left');
    const stage = document.querySelector('.pvs-ped-crop__svg') as Element;
    fireEvent.pointerDown(left, { ...client(200, 540), button: 2 });
    fireEvent.pointerMove(stage, client(400, 540));
    expect(left.getAttribute('aria-valuenow')).toBe('200');
  });

  it('cancels with Esc', () => {
    const { onCancel } = openCrop();
    fireEvent.keyDown(slider('prt.crop.edge.left'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
