import React, { useEffect, useRef, useState } from 'react';

import { MASK_FILL, PRINT_SPACE } from '../../constants';
import { LUPA_MAX_PX } from '../../plan/pinTemplates';
import type { MaskRect, PrintPin, Rect } from '../../types';
import { movePinBy, movePinTo, visiblePins } from './edits';
import { arrowDelta, containsPoint, drawnFocus, drawnRect, insideBounds, isDeleteKey, moveRect, rectBetween, resizeRect, screenPoint, screenToViewBox, type Point } from './geometry';
import { minTargetUnits, useDisplayScale } from './useDisplayScale';

/**
 * The editor's stage (3.2.7, spec §7.2): the unmasked master as an `<img>` under an
 * `<svg viewBox="0 0 1720 1080">` in print space, so every coordinate the SE touches is a print
 * pixel — the pointer goes through `getScreenCTM().inverse()`.
 *
 * Only the current mode's things are interactive (the others are drawn, inert):
 * - Pins: a click on the print adds one (not one in the letterbox around it), a drag moves one
 *   (the 72 px overlap guard holds it at its last allowed spot);
 *   each pin is a `<g role="button" tabIndex={0}>` with its own focus outline — arrows 4 px
 *   (Shift 20 px), Enter / Space opens its text, Delete removes it.
 * - Masks: a drag draws one (≥ 8×8, solid `MASK_FILL`, never a blur); a drag on a mask moves it;
 *   arrows move it, Alt+arrows resize it, Delete removes it. Suggestions are dashed and numbered
 *   like their rows in the list below.
 * - Focus (lupa): a drag draws the one region (≤ 520 px wide), a drag on it moves it; arrows move
 *   it, Alt+arrows resize it.
 * A drag is drawn live on the stage and handed to the editor once, when the pointer is released.
 */

export type EditorMode = 'pins' | 'masks' | 'focus';

export type StageBlock = 'overlap' | 'tooSmall';

export interface EditorStageProps {
  mode: EditorMode;
  /** The screen's title: the image's alt text and the stage's name. */
  title: string;
  stageLabel: string;
  url: string | null;
  /** Every pin the editor works on (hidden ones are not drawn). */
  pins: readonly PrintPin[];
  selectedPin: number | null;
  /** Shown number (slide order) and accessible name of a pin. */
  pinNumber: (pin: PrintPin) => number;
  pinName: (pin: PrintPin) => string;
  /** The tooltip of a pin at its layout's fallback position. */
  estimatedText: string;
  masks: readonly MaskRect[];
  maskName: (mask: MaskRect, index: number) => string;
  suggestions: readonly MaskRect[];
  focus: Rect | null;
  focusName: string;
  onAddPin: (at: Point) => void;
  onPins: (pins: PrintPin[]) => void;
  onSelectPin: (n: number) => void;
  onEditPin: (n: number) => void;
  onRemovePin: (n: number) => void;
  onAddMask: (rect: Rect) => void;
  onReplaceMask: (index: number, rect: Rect) => void;
  onRemoveMask: (index: number) => void;
  onFocus: (rect: Rect) => void;
  onBlocked: (reason: StageBlock) => void;
}

type Drag =
  /**
   * `start`: the pointer when pressed; `origin`: the pin's centre then (the pin keeps its offset to
   * the pointer); `at`: where it is dragged to — null until the pointer leaves the click slop, so a
   * click that only selects the pin never moves it. Only the position is held: the list it lands in
   * is the current one.
   */
  | { kind: 'pin'; n: number; start: Point; origin: Point; at: Point | null; blocked: boolean }
  | { kind: 'draw'; from: Point; to: Point }
  | { kind: 'mask'; index: number; start: Point; origin: Rect; rect: Rect }
  | { kind: 'focus'; start: Point; origin: Rect; rect: Rect }
  | { kind: 'click'; at: Point; to: Point };

/** A pointer that travelled less than this between press and release was a click: 6 print px, and never under 4 screen px (a finger on a phone). */
const CLICK_SLOP = 6;
const CLICK_SLOP_SCREEN_PX = 4;

const PIN_RADIUS = 26;
/** A pin is at least this many screen pixels across to the pointer (an invisible ring around the drawn one). */
const PIN_TARGET_PX = 24;

/** The pins with the dragged one at its live position; the SE placed it, so its origin becomes `manual`. */
function withDragged(pins: readonly PrintPin[], n: number, at: Point | null): PrintPin[] {
  return at === null ? [...pins] : pins.map((pin) => (pin.n === n ? { ...pin, x: at.x, y: at.y, origin: 'manual' as const } : pin));
}

const indexOf = (element: Element | null, attribute: string): number | null => {
  const raw = element?.getAttribute(attribute);
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
};

export const EditorStage = (props: EditorStageProps) => {
  const { mode, title, stageLabel, url, pins, selectedPin, pinNumber, pinName, estimatedText, masks, maskName, suggestions, focus, focusName } = props;
  const svg = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Where the keyboard focus goes once a removed pin or mask has left the stage (else it would drop to the page).
  const refocus = useRef<string | null>(null);
  const scale = useDisplayScale(svg, PRINT_SPACE.width, PRINT_SPACE.height);
  const hitRadius = minTargetUnits(PIN_TARGET_PX / 2, scale, PIN_RADIUS);
  const slop = minTargetUnits(CLICK_SLOP_SCREEN_PX, scale, CLICK_SLOP);

  useEffect(() => {
    const selector = refocus.current;
    if (selector === null) return;
    refocus.current = null;
    const target = selector === '' ? null : svg.current?.querySelector<SVGGElement>(selector);
    if (target !== null && target !== undefined) target.focus();
    else svg.current?.focus();
  });

  const point = (event: React.PointerEvent) => screenToViewBox(svg.current, event.clientX, event.clientY);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const at = point(event);
    if (at === null) return;
    const target = event.target as Element;
    const capture = () => {
      const element = event.currentTarget;
      if (typeof element.setPointerCapture === 'function') element.setPointerCapture(event.pointerId);
    };
    if (mode === 'pins') {
      const n = indexOf(target.closest?.('[data-prt-pin]') ?? null, 'data-prt-pin');
      const grabbed = n === null ? undefined : pins.find((pin) => pin.n === n);
      if (n !== null && grabbed !== undefined) {
        capture();
        setDrag({ kind: 'pin', n, start: at, origin: { x: grabbed.x, y: grabbed.y }, at: null, blocked: false });
        return;
      }
      // A click in the letterbox around the picture is not a spot on the print: no pin there.
      const raw = screenPoint(svg.current, event.clientX, event.clientY);
      if (raw === null || !insideBounds(raw)) return;
      capture();
      setDrag({ kind: 'click', at, to: at });
      return;
    }
    if (mode === 'masks') {
      const index = indexOf(target.closest?.('[data-prt-mask]') ?? null, 'data-prt-mask');
      const mask = index === null ? undefined : masks[index];
      capture();
      if (index !== null && mask !== undefined) setDrag({ kind: 'mask', index, start: at, origin: mask, rect: mask });
      else setDrag({ kind: 'draw', from: at, to: at });
      return;
    }
    capture();
    if (focus !== null && containsPoint(focus, at)) setDrag({ kind: 'focus', start: at, origin: focus, rect: focus });
    else setDrag({ kind: 'draw', from: at, to: at });
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drag === null) return;
    const at = point(event);
    if (at === null) return;
    switch (drag.kind) {
      case 'pin': {
        if (drag.at === null && Math.hypot(at.x - drag.start.x, at.y - drag.start.y) <= slop) return;
        const to = { x: drag.origin.x + at.x - drag.start.x, y: drag.origin.y + at.y - drag.start.y };
        const result = movePinTo(withDragged(pins, drag.n, drag.at), drag.n, to);
        // The guard keeps the pin at its last allowed spot.
        const moved = result.moved ? result.pins.find((pin) => pin.n === drag.n) : undefined;
        if (result.blocked) {
          if (!drag.blocked) setDrag({ ...drag, blocked: true });
        } else if (moved !== undefined) setDrag({ ...drag, at: { x: moved.x, y: moved.y } });
        return;
      }
      case 'draw':
        setDrag({ ...drag, to: at });
        return;
      case 'click':
        setDrag({ ...drag, to: at });
        return;
      case 'mask':
        setDrag({ ...drag, rect: moveRect(drag.origin, at.x - drag.start.x, at.y - drag.start.y) });
        return;
      case 'focus':
        setDrag({ ...drag, rect: moveRect(drag.origin, at.x - drag.start.x, at.y - drag.start.y) });
        return;
    }
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = drag;
    setDrag(null);
    if (current === null) return;
    const at = point(event) ?? (current.kind === 'draw' ? current.to : null);
    switch (current.kind) {
      case 'pin':
        // The current list (a text saved during the drag included), with the pin where it was dropped.
        if (current.at !== null) props.onPins(withDragged(pins, current.n, current.at));
        else props.onSelectPin(current.n);
        if (current.blocked) props.onBlocked('overlap');
        return;
      case 'click': {
        const end = at ?? current.to;
        if (Math.hypot(end.x - current.at.x, end.y - current.at.y) <= slop) props.onAddPin(current.at);
        return;
      }
      case 'draw': {
        const end = at ?? current.to;
        const travelled = Math.hypot(end.x - current.from.x, end.y - current.from.y);
        const rect = mode === 'focus' ? drawnFocus(current.from, end) : drawnRect(current.from, end);
        if (rect === null) {
          if (travelled > slop) props.onBlocked('tooSmall');
          return;
        }
        if (mode === 'focus') props.onFocus(rect);
        else props.onAddMask(rect);
        return;
      }
      case 'mask':
        if (!sameRect(current.rect, current.origin)) props.onReplaceMask(current.index, current.rect);
        return;
      case 'focus':
        if (!sameRect(current.rect, current.origin)) props.onFocus(current.rect);
        return;
    }
  };

  const onPointerCancel = () => setDrag(null);

  // Live geometry while a drag is under way.
  const shownPins = visiblePins(drag?.kind === 'pin' ? withDragged(pins, drag.n, drag.at) : pins);
  const shownMasks = masks.map((mask, index) => (drag?.kind === 'mask' && drag.index === index ? { ...mask, ...drag.rect } : mask));
  const shownFocus = drag?.kind === 'focus' ? drag.rect : focus;
  const draft = drag?.kind === 'draw' ? rectBetween(drag.from, drag.to) : null;
  const draftFocus = draft !== null && mode === 'focus' ? clampDraftFocus(draft, drag) : draft;

  const pinKey = (pin: PrintPin) => (event: React.KeyboardEvent<SVGGElement>) => {
    const delta = arrowDelta(event.key, event.shiftKey);
    if (delta !== null) {
      event.preventDefault();
      const result = movePinBy(pins, pin.n, delta[0], delta[1]);
      if (result.blocked) props.onBlocked('overlap');
      else if (result.moved) props.onPins(result.pins);
      return;
    }
    if (isDeleteKey(event.key)) {
      event.preventDefault();
      const order = visiblePins(pins).sort((a, b) => a.n - b.n);
      const at = order.findIndex((item) => item.n === pin.n);
      const next = order[at + 1] ?? order[at - 1];
      refocus.current = next === undefined ? '' : `[data-prt-pin="${next.n}"]`;
      props.onRemovePin(pin.n);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onEditPin(pin.n);
    }
  };

  const removeMaskAt = (index: number) => {
    // After the removal the next mask takes this index; the last one hands the focus back.
    const next = index < masks.length - 1 ? index : index - 1;
    refocus.current = next < 0 ? '' : `[data-prt-mask="${next}"]`;
    props.onRemoveMask(index);
  };

  const rectKey = (rect: Rect, apply: (next: Rect) => void, maxW?: number, onDelete?: () => void) => (event: React.KeyboardEvent<SVGGElement>) => {
    const delta = arrowDelta(event.key, event.shiftKey);
    if (delta !== null) {
      event.preventDefault();
      const next = event.altKey ? resizeRect(rect, delta[0], delta[1], { maxW }) : moveRect(rect, delta[0], delta[1]);
      if (!sameRect(next, rect)) apply(next);
      return;
    }
    if (onDelete !== undefined && isDeleteKey(event.key)) {
      event.preventDefault();
      onDelete();
    }
  };

  return (
    <div className="pvs-ped-stage" data-mode={mode}>
      {url !== null && <img className="pvs-ped-stage__image" src={url} alt={title} draggable={false} />}
      <svg
        ref={svg}
        className="pvs-ped-stage__svg"
        viewBox={`0 0 ${PRINT_SPACE.width} ${PRINT_SPACE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={stageLabel}
        tabIndex={-1}
        data-prt-stage=""
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
      >
        {shownMasks.map((mask, index) =>
          mode === 'masks' ? (
            <g
              key={`m${index}`}
              data-prt-mask={index}
              role="button"
              tabIndex={0}
              aria-label={maskName(mask, index)}
              className="pvs-ped-mask"
              onKeyDown={rectKey(mask, (next) => props.onReplaceMask(index, next), undefined, () => removeMaskAt(index))}
            >
              <rect x={mask.x} y={mask.y} width={mask.w} height={mask.h} fill={MASK_FILL} />
            </g>
          ) : (
            <rect key={`m${index}`} x={mask.x} y={mask.y} width={mask.w} height={mask.h} fill={MASK_FILL} aria-hidden="true" />
          ),
        )}
        {suggestions.map((mask, index) => (
          <g key={`s${index}`} className="pvs-ped-suggestion" aria-hidden="true">
            <rect x={mask.x} y={mask.y} width={mask.w} height={mask.h} />
            {mode === 'masks' && (
              <text x={mask.x + mask.w + 6} y={mask.y} dominantBaseline="hanging">
                {index + 1}
              </text>
            )}
          </g>
        ))}

        {shownFocus !== null &&
          (mode === 'focus' ? (
            <g
              role="button"
              tabIndex={0}
              aria-label={focusName}
              className="pvs-ped-focus is-active"
              data-prt-focus=""
              onKeyDown={rectKey(shownFocus, props.onFocus, LUPA_MAX_PX)}
            >
              <rect x={shownFocus.x} y={shownFocus.y} width={shownFocus.w} height={shownFocus.h} />
            </g>
          ) : (
            <rect className="pvs-ped-focus" x={shownFocus.x} y={shownFocus.y} width={shownFocus.w} height={shownFocus.h} aria-hidden="true" />
          ))}

        {draftFocus !== null && <rect className="pvs-ped-draft" x={draftFocus.x} y={draftFocus.y} width={draftFocus.w} height={draftFocus.h} aria-hidden="true" />}

        {shownPins.map((pin) => {
          const shown = String(pinNumber(pin));
          const body = (
            <>
              {hitRadius > PIN_RADIUS && <circle className="pvs-ped-pin__hit" r={hitRadius} />}
              <circle r={PIN_RADIUS} />
              <text textAnchor="middle" dominantBaseline="central">
                {shown}
              </text>
            </>
          );
          return mode === 'pins' ? (
            <g
              key={pin.n}
              data-prt-pin={pin.n}
              role="button"
              tabIndex={0}
              aria-label={pinName(pin)}
              className={`pvs-ped-pin${pin.n === selectedPin ? ' is-selected' : ''}`}
              data-origin={pin.origin}
              transform={`translate(${pin.x} ${pin.y})`}
              onKeyDown={pinKey(pin)}
            >
              {pin.origin === 'template' && <title>{estimatedText}</title>}
              {body}
            </g>
          ) : (
            <g key={pin.n} className="pvs-ped-pin is-inert" data-origin={pin.origin} transform={`translate(${pin.x} ${pin.y})`} aria-hidden="true">
              {body}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** The live outline of a lupa being drawn: capped at the widest lupa, like the region it will become. */
function clampDraftFocus(draft: Rect, drag: Drag | null): Rect {
  if (drag?.kind !== 'draw' || draft.w <= LUPA_MAX_PX) return draft;
  const leftward = drag.to.x < drag.from.x;
  return { ...draft, x: leftward ? drag.from.x - LUPA_MAX_PX : draft.x, w: LUPA_MAX_PX };
}
