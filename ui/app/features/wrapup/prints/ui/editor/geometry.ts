import { MIN_MASK_PX } from '../../capture/record';
import { PRINT_SPACE } from '../../constants';
import { LUPA_MAX_PX } from '../../plan/pinTemplates';
import type { Rect } from '../../types';

/**
 * The pure geometry of the print editor and the crop dialog (3.2.7, spec §7.2): where a pointer
 * lands in the stage's own units, the rectangles a drag draws, how the keyboard moves and resizes
 * them, and how the crop's four edges move. No DOM, so every rule is unit-tested; the components
 * only wire events to these.
 *
 * Units: the editor's stage is the 1720×1080 print space (`PRINT_SPACE`); the crop dialog's stage
 * is the image's own pixels. Both map a client point through `getScreenCTM().inverse()`, which
 * already accounts for the `preserveAspectRatio` letterbox and any CSS scale.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** The six numbers of a 2-D affine matrix (`DOMMatrix` / `SVGMatrix` have them). */
export interface MatrixLike {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** What `screenToViewBox` needs from an `<svg>`: its screen transform (null before layout). */
export interface ScreenCtmSource {
  getScreenCTM(): (MatrixLike & { inverse?: () => MatrixLike }) | null;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** The inverse of an affine matrix; null when it has none (a zero-size element). */
export function invertMatrix(m: MatrixLike): MatrixLike | null {
  const det = m.a * m.d - m.b * m.c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

export function applyMatrix(m: MatrixLike, point: Point): Point {
  return { x: m.a * point.x + m.c * point.y + m.e, y: m.b * point.x + m.d * point.y + m.f };
}

/**
 * A client (screen) point in the stage's viewBox units, through `getScreenCTM().inverse()`, not
 * clamped: it may lie in the letterbox around the picture. Null when the stage has no transform yet
 * (not laid out) or a singular one.
 */
export function screenPoint(svg: ScreenCtmSource | null | undefined, clientX: number, clientY: number): Point | null {
  const ctm = typeof svg?.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
  if (ctm === null || ctm === undefined) return null;
  const inverse = typeof ctm.inverse === 'function' ? ctm.inverse() : invertMatrix(ctm);
  if (inverse === null) return null;
  const point = applyMatrix(inverse, { x: clientX, y: clientY });
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return point;
}

export function insideBounds(point: Point, bounds: Size = PRINT_SPACE): boolean {
  return point.x >= 0 && point.x <= bounds.width && point.y >= 0 && point.y <= bounds.height;
}

/**
 * A client (screen) point in the stage's viewBox units, through `getScreenCTM().inverse()`,
 * clamped to the box (a drag past the picture's edge stops at the edge). Null when the stage has
 * no transform yet (not laid out) or a singular one.
 */
export function screenToViewBox(svg: ScreenCtmSource | null | undefined, clientX: number, clientY: number, bounds: Size = PRINT_SPACE): Point | null {
  const point = screenPoint(svg, clientX, clientY);
  return point === null ? null : { x: clamp(point.x, 0, bounds.width), y: clamp(point.y, 0, bounds.height) };
}

/** The rectangle two corners span, in either drag direction. */
export function rectBetween(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function roundRect(rect: Rect): Rect {
  return { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) };
}

/** The rectangle kept inside the bounds (moved in first, then cut to fit). */
export function clampRect(rect: Rect, bounds: Size = PRINT_SPACE): Rect {
  const w = clamp(rect.w, 0, bounds.width);
  const h = clamp(rect.h, 0, bounds.height);
  return { x: clamp(rect.x, 0, bounds.width - w), y: clamp(rect.y, 0, bounds.height - h), w, h };
}

/**
 * A mask drawn by a drag: the rectangle between the two points, rounded and inside the print; null
 * when it is smaller than 8×8 (`MIN_MASK_PX`) — a slip of the pointer never becomes a mask.
 */
export function drawnRect(from: Point, to: Point, min: number = MIN_MASK_PX, bounds: Size = PRINT_SPACE): Rect | null {
  const rect = roundRect(clampRect(rectBetween(from, to), bounds));
  return rect.w < min || rect.h < min ? null : rect;
}

/**
 * The lupa region a drag draws: like a mask (≥ 8×8), but never wider than the widest lupa
 * (`LUPA_MAX_PX`, 520 px) — the slide's detail box enlarges a strip, not half the screen. A wider
 * drag keeps the side it started from.
 */
export function drawnFocus(from: Point, to: Point, bounds: Size = PRINT_SPACE): Rect | null {
  const rect = drawnRect(from, to, MIN_MASK_PX, bounds);
  if (rect === null) return null;
  if (rect.w <= LUPA_MAX_PX) return rect;
  const x = to.x < from.x ? Math.round(from.x) - LUPA_MAX_PX : rect.x;
  return clampRect({ ...rect, x, w: LUPA_MAX_PX }, bounds);
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

/** The rectangle moved by (dx, dy), stopping at the print's edges (its size never changes). */
export function moveRect(rect: Rect, dx: number, dy: number, bounds: Size = PRINT_SPACE): Rect {
  return roundRect(clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy }, bounds));
}

/** The rectangle resized by (dw, dh) from its top-left corner: ≥ `min` on each side, ≤ `maxW` wide, inside the print. */
export function resizeRect(rect: Rect, dw: number, dh: number, opts: { min?: number; maxW?: number; bounds?: Size } = {}): Rect {
  const min = opts.min ?? MIN_MASK_PX;
  const bounds = opts.bounds ?? PRINT_SPACE;
  const maxW = Math.min(opts.maxW ?? bounds.width, bounds.width - rect.x);
  const w = clamp(rect.w + dw, min, Math.max(min, maxW));
  const h = clamp(rect.h + dh, min, Math.max(min, bounds.height - rect.y));
  return roundRect({ ...rect, w, h });
}

// ------------------------------------------------------------------ keyboard

/** Arrow keys move a pin, a mask or the detail 4 px; with Shift, 20 px (spec §2.10). */
export const KEY_STEP = 4;
export const KEY_STEP_SHIFT = 20;

/** The (dx, dy) of an arrow key, or null for any other key. */
export function arrowDelta(key: string, shift: boolean, step: number = shift ? KEY_STEP_SHIFT : KEY_STEP): [number, number] | null {
  switch (key) {
    case 'ArrowLeft':
      return [-step, 0];
    case 'ArrowRight':
      return [step, 0];
    case 'ArrowUp':
      return [0, -step];
    case 'ArrowDown':
      return [0, step];
    default:
      return null;
  }
}

export const isDeleteKey = (key: string): boolean => key === 'Delete' || key === 'Backspace';

// ------------------------------------------------------------------ crop (image pixels)

export type CropEdge = 'left' | 'right' | 'top' | 'bottom';

export const CROP_EDGES: readonly CropEdge[] = ['left', 'right', 'top', 'bottom'];

/** The smallest crop side, in the image's pixels: a slip never collapses the crop. */
export const MIN_CROP_PX = 64;

/** Where an edge of the crop sits, in the image's pixels. */
export function cropEdgeValue(crop: Rect, edge: CropEdge): number {
  switch (edge) {
    case 'left':
      return crop.x;
    case 'right':
      return crop.x + crop.w;
    case 'top':
      return crop.y;
    case 'bottom':
      return crop.y + crop.h;
  }
}

/** How far an edge may go: inside the image, and `min` away from the opposite edge. */
export function cropEdgeRange(crop: Rect, edge: CropEdge, size: Size, min: number = MIN_CROP_PX): { min: number; max: number } {
  const minW = Math.min(min, size.width);
  const minH = Math.min(min, size.height);
  switch (edge) {
    case 'left':
      return { min: 0, max: crop.x + crop.w - minW };
    case 'right':
      return { min: crop.x + minW, max: size.width };
    case 'top':
      return { min: 0, max: crop.y + crop.h - minH };
    case 'bottom':
      return { min: crop.y + minH, max: size.height };
  }
}

/** The crop with one edge moved to `value` (clamped to its range); the opposite edge stays put. */
export function withCropEdge(crop: Rect, edge: CropEdge, value: number, size: Size, min: number = MIN_CROP_PX): Rect {
  const range = cropEdgeRange(crop, edge, size, min);
  const v = Math.round(clamp(value, range.min, range.max));
  switch (edge) {
    case 'left':
      return { ...crop, x: v, w: crop.x + crop.w - v };
    case 'right':
      return { ...crop, w: v - crop.x };
    case 'top':
      return { ...crop, y: v, h: crop.y + crop.h - v };
    case 'bottom':
      return { ...crop, h: v - crop.y };
  }
}

/** One arrow press on a crop edge: ≈ 4 px of a 1920 px wide image, scaled to the image; ×5 with Shift. */
export function cropKeyStep(dimension: number, shift: boolean): number {
  const step = Math.max(1, Math.round(dimension / 480));
  return shift ? step * 5 : step;
}

/**
 * The new value of an edge after a key press; null for a key the edge ignores. Home / End: as far
 * as the edge goes. Arrows move the edge the way they point: Left / Right on every edge (x, or the
 * slider's decrease / increase), Up / Down move the top and bottom edges up and down, and on the
 * left and right edges they increase / decrease like any slider.
 */
export function cropEdgeKey(crop: Rect, edge: CropEdge, key: string, shift: boolean, size: Size, min: number = MIN_CROP_PX): number | null {
  const horizontal = edge === 'left' || edge === 'right';
  const value = cropEdgeValue(crop, edge);
  const range = cropEdgeRange(crop, edge, size, min);
  const step = cropKeyStep(horizontal ? size.width : size.height, shift);
  switch (key) {
    case 'Home':
      return range.min;
    case 'End':
      return range.max;
    case 'ArrowLeft':
      return value - step;
    case 'ArrowRight':
      return value + step;
    case 'ArrowUp':
      return horizontal ? value + step : value - step;
    case 'ArrowDown':
      return horizontal ? value - step : value + step;
    default:
      return null;
  }
}
