import { PIN_MIN_GAP_PX } from '../../analysis/pins';
import { PRINT_SPACE } from '../../constants';
import { PRINT_BUDGET } from '../../deck/budget';
import type { PinTemplate } from '../../plan/pinTemplates';
import type { PrintPatch } from '../../store/usePrintStore';
import type { CrossCheck, PrintPin, PrintRecord, Rect } from '../../types';
import { clamp, type Point } from './geometry';

/**
 * What one editor gesture does to a print (3.2.7, spec §7.2), as pure functions of the record:
 * the pins (add, move under the 72 px overlap guard, remove, the SE's own text) and the masks
 * (accept, ignore, draw, move, remove). The editor sends the result to the store's `update`;
 * the store stamps the record, and the approval — bound to the image, masks and focus hashes —
 * is recomputed from it, so a mask or focus change withdraws a standing approval by itself.
 *
 * Pins are the SE's once edited: `record.pins` empty means "the app's suggestions" (`seeds`), so
 * the first edit writes the whole list. A suggested pin the SE removes stays in the list as
 * `hidden` — otherwise removing the last one would empty the list and bring every suggestion
 * back — and a pin the SE adds takes a number above every template number (1..6), so it never
 * inherits a suggested legend it does not stand for, not even one whose number is read later.
 */

/** A pin's centre stays this far inside the print (the deck places pins with the same inset). */
export const PIN_INSET_PX = 16;

/** The pins the editor works on: the SE's own, else the app's suggestions. */
export function editablePins(recordPins: readonly PrintPin[], seeds: readonly PrintPin[]): PrintPin[] {
  return [...(recordPins.length > 0 ? recordPins : seeds)];
}

export const visiblePins = (pins: readonly PrintPin[]): PrintPin[] => pins.filter((pin) => pin.hidden !== true);

/** At most 6 pins on a print, 4 while the lupa is on (`PRINT_BUDGET`). */
export function pinLimit(record: Pick<PrintRecord, 'lupaOn' | 'focus'>): number {
  return record.lupaOn && record.focus !== null ? PRINT_BUDGET.pinsWithZoom : PRINT_BUDGET.pins;
}

export function clampPinPoint(point: Point): Point {
  return {
    x: Math.round(clamp(point.x, PIN_INSET_PX, PRINT_SPACE.width - PIN_INSET_PX)),
    y: Math.round(clamp(point.y, PIN_INSET_PX, PRINT_SPACE.height - PIN_INSET_PX)),
  };
}

/**
 * The app's pins carry their layout template's number (`PinTemplate.n`, 1..6) — the legend of a
 * pin is looked up by it. A pin the SE adds is numbered above every template number, so it never
 * takes the legend of a suggested pin that is missing now (its number still unread) and appears
 * once the evidence arrives.
 */
export const SUGGESTED_PIN_MAX: PinTemplate['n'] = 6;

/** A number no pin of the print uses (hidden ones included), above every template number. */
export function nextPinNumber(pins: readonly PrintPin[]): number {
  return Math.max(SUGGESTED_PIN_MAX, ...pins.map((pin) => pin.n)) + 1;
}

/** Spots tried for a pin added from the keyboard: an 80 px grid, nearest to the print's centre first. */
const FREE_SPOTS: readonly Point[] = (() => {
  const spots: Point[] = [];
  for (let y = 100; y <= PRINT_SPACE.height - 100; y += 80) for (let x = 100; x <= PRINT_SPACE.width - 100; x += 80) spots.push({ x, y });
  const cx = PRINT_SPACE.width / 2;
  const cy = PRINT_SPACE.height / 2;
  return spots.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
})();

/** Where "Adicionar pino" puts a pin: the free spot nearest the centre (then moved with the arrows); null when none is free. */
export function freePinSpot(pins: readonly PrintPin[]): Point | null {
  return FREE_SPOTS.find((spot) => nearestGap(pins, spot) >= PIN_MIN_GAP_PX) ?? null;
}

/** A mask added from the keyboard ("Adicionar tarja"): a strip in the middle of the print, then moved and resized with the arrows. */
export const KEYBOARD_MASK: Rect = { x: 740, y: 516, w: 240, h: 48 };

/** A detail marked from the keyboard when the layout suggests none: a strip in the middle of the print. */
export const KEYBOARD_FOCUS: Rect = { x: 660, y: 480, w: 400, h: 120 };

/** The distance from a point to the nearest other visible pin (Infinity when there is none). */
export function nearestGap(pins: readonly PrintPin[], at: Point, except?: number): number {
  let gap = Number.POSITIVE_INFINITY;
  for (const pin of pins) {
    if (pin.hidden === true || pin.n === except) continue;
    gap = Math.min(gap, Math.hypot(pin.x - at.x, pin.y - at.y));
  }
  return gap;
}

export type AddPinResult = { ok: true; pins: PrintPin[]; n: number } | { ok: false; reason: 'limit' | 'overlap' };

/** A click on the print: a new pin there, unless the print is full or the spot overlaps a pin. */
export function addPin(pins: readonly PrintPin[], at: Point, limit: number): AddPinResult {
  if (visiblePins(pins).length >= limit) return { ok: false, reason: 'limit' };
  const point = clampPinPoint(at);
  if (nearestGap(pins, point) < PIN_MIN_GAP_PX) return { ok: false, reason: 'overlap' };
  const n = nextPinNumber(pins);
  return { ok: true, n, pins: [...pins, { n, x: point.x, y: point.y, origin: 'manual' }] };
}

export interface MovePinResult {
  pins: PrintPin[];
  moved: boolean;
  /** The overlap guard refused the move; the pin stays where it was. */
  blocked: boolean;
}

/**
 * A pin moved to a point (drag) — the overlap guard: it may go where no other visible pin is
 * closer than 72 px, or anywhere farther from its nearest neighbour than it is now (a pin that
 * already overlaps can always get out). The SE placed it, so its origin becomes `manual`.
 */
export function movePinTo(pins: readonly PrintPin[], n: number, at: Point): MovePinResult {
  const pin = pins.find((item) => item.n === n);
  if (pin === undefined) return { pins: [...pins], moved: false, blocked: false };
  const point = clampPinPoint(at);
  if (point.x === pin.x && point.y === pin.y) return { pins: [...pins], moved: false, blocked: false };
  const after = nearestGap(pins, point, n);
  if (after < PIN_MIN_GAP_PX && after < nearestGap(pins, pin, n)) return { pins: [...pins], moved: false, blocked: true };
  return { pins: pins.map((item) => (item.n === n ? { ...item, x: point.x, y: point.y, origin: 'manual' } : item)), moved: true, blocked: false };
}

/** A pin moved by the keyboard (4 px, Shift 20 px), under the same guard. */
export function movePinBy(pins: readonly PrintPin[], n: number, dx: number, dy: number): MovePinResult {
  const pin = pins.find((item) => item.n === n);
  return pin === undefined ? { pins: [...pins], moved: false, blocked: false } : movePinTo(pins, n, { x: pin.x + dx, y: pin.y + dy });
}

/**
 * Delete: a suggested pin (a template number) is hidden — it stays restorable and keeps its number;
 * the SE's own is dropped, unless it is the last pin of the list: an empty list means "the app's
 * suggestions", which would bring back pins the SE never asked for.
 */
export function removePin(pins: readonly PrintPin[], n: number): PrintPin[] {
  const rest = pins.filter((pin) => pin.n !== n);
  const hide = n <= SUGGESTED_PIN_MAX || rest.length === 0;
  return hide ? pins.map((pin) => (pin.n === n ? { ...pin, hidden: true } : pin)) : rest;
}

/**
 * The SE's text for a pin (≤ 130 characters, the budget's pin label — the stored set refuses
 * more). An empty text, or the suggestion itself, is no override: the computed legend stays.
 */
export function withPinLabel(pins: readonly PrintPin[], n: number, text: string, suggested: string | null): PrintPin[] {
  const clean = text.slice(0, PRINT_BUDGET.pinLabel).trim();
  const same = suggested !== null && clean === suggested.trim();
  return pins.map((pin) => {
    if (pin.n !== n) return pin;
    return clean === '' || same ? withoutLabel(pin) : { ...pin, labelOverride: clean };
  });
}

/** "Restaurar sugestão": the pin's own text is dropped; the computed legend is back. */
export function restorePinLabel(pins: readonly PrintPin[], n: number): PrintPin[] {
  return pins.map((pin) => (pin.n === n ? withoutLabel(pin) : pin));
}

function withoutLabel(pin: PrintPin): PrintPin {
  const next = { ...pin };
  delete next.labelOverride;
  return next;
}

/**
 * The suggested legend of a pin without the screen–Grail note `pinsFor` appends to it ("(conferido
 * no Grail)"): the deck appends that note again, so it must not become part of the SE's text.
 */
export function baseLegend(line: string | undefined, anchorKey: string | undefined, checks: readonly CrossCheck[]): string | null {
  if (line === undefined) return null;
  const check = anchorKey === undefined ? undefined : checks.find((item) => item.anchorKey === anchorKey);
  const suffix = check === undefined ? '' : ` (${check.text})`;
  return suffix !== '' && line.endsWith(suffix) ? line.slice(0, -suffix.length) : line;
}

// ------------------------------------------------------------------ masks

type MaskFields = Pick<PrintRecord, 'masks' | 'maskSuggestions'>;

export function acceptSuggestion(record: MaskFields, index: number): PrintPatch {
  const suggestion = record.maskSuggestions[index];
  if (suggestion === undefined) return {};
  return { masks: [...record.masks, suggestion], maskSuggestions: record.maskSuggestions.filter((_, at) => at !== index) };
}

export function ignoreSuggestion(record: MaskFields, index: number): PrintPatch {
  return { maskSuggestions: record.maskSuggestions.filter((_, at) => at !== index) };
}

/** "Aceitar todas": the patch the tab's approval panel sends too. */
export function acceptAllSuggestions(record: MaskFields): PrintPatch {
  return { masks: [...record.masks, ...record.maskSuggestions], maskSuggestions: [] };
}

export function addMask(record: Pick<PrintRecord, 'masks'>, rect: Rect): PrintPatch {
  return { masks: [...record.masks, { ...rect, reason: 'manual' }] };
}

/** A mask moved or resized; it keeps its reason. */
export function replaceMask(record: Pick<PrintRecord, 'masks'>, index: number, rect: Rect): PrintPatch {
  return { masks: record.masks.map((mask, at) => (at === index ? { ...mask, x: rect.x, y: rect.y, w: rect.w, h: rect.h } : mask)) };
}

export function removeMask(record: Pick<PrintRecord, 'masks'>, index: number): PrintPatch {
  return { masks: record.masks.filter((_, at) => at !== index) };
}

/** The `ui_lang:<lang>` warning of a companion 1.1 capture made in another platform language; null otherwise. */
export function uiLangOf(warnings: readonly string[]): string | null {
  const warning = warnings.find((item) => item.startsWith('ui_lang:'));
  return warning === undefined ? null : warning.slice('ui_lang:'.length);
}
