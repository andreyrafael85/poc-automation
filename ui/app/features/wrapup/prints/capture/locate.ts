import type { Rect } from '../types';

/**
 * 3.5.5 — reading a screenshot to find the platform's own labels (owner, 2026-11-21: "nem todos parceiros têm
 * conhecimento… precisa por trás ter uma inteligência de interpretação automática… posicionar automaticamente os
 * pins… sem depender de terceiros").
 *
 * Every pin of a layout already names the text it belongs to ("Root cause", the problem's id, the service's name) and
 * the region of the screen it sits in (`plan/pinTemplates.ts`). This module looks for that text in the picture: it
 * draws the text in the platform's typeface at a range of sizes and weights and slides it over the region, scoring
 * each spot by normalised cross-correlation — light text on a dark theme scores as well as dark on light (the absolute
 * value), and the score does not depend on brightness or contrast. A match is kept only above `LOCATE_MIN_SCORE`;
 * a label not found yields no anchor, and its pin is not drawn (never a pin on a guessed spot).
 *
 * Everything runs in the browser on the picture the SE added: nothing is sent anywhere, no external library, no
 * WebAssembly (the AppEngine content security policy allows neither `unsafe-eval` nor `wasm-unsafe-eval` exceptions).
 * The scoring is pure and unit-tested on synthetic arrays; drawing the text needs a canvas (`renderTemplate`).
 */

/** A grayscale picture: one byte per pixel, row by row. */
export interface Gray {
  data: Uint8ClampedArray | Uint8Array | Float32Array;
  width: number;
  height: number;
}

/** What to look for: an anchor key, its candidate texts (first found wins), and its region as fractions. */
export interface LabelTarget {
  key: string;
  texts: readonly string[];
  zone: { x0: number; y0: number; x1: number; y1: number };
  /**
   * 3.5.6: a label that only verifies the screen (its identity) and draws no pin of its own may share its spot with a
   * pin's label ("Vulnerabilities" inside "Vulnerability analytics enabled").
   */
  shares?: boolean;
}

export interface LabelHit {
  key: string;
  /** Index of the text of `texts` that matched (the anchors' `hit`). */
  hit: number;
  rect: Rect;
  score: number;
}

/**
 * The lowest correlation kept as a match inside a label's own region. Calibrated on seven real platform screenshots
 * (dark theme, 2026-11-21): true labels scored 0.77–0.93, the best false spots 0.59–0.71.
 */
export const LOCATE_MIN_SCORE = 0.72;
/** Outside its region a label must score higher and stand alone (the layout moved; a short word may repeat). */
export const LOCATE_GLOBAL_MIN_SCORE = 0.82;
/** …and beat the best other spot, away from it, by this much. */
export const LOCATE_GLOBAL_MARGIN = 0.08;
/** Text heights (font px) searched; a screenshot at 80–180 % of the platform's 14 px UI text. */
export const LOCATE_SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30] as const;
/**
 * The weights the platform uses for labels: regular body text, medium and semibold headings (3.5.6: medium added —
 * the panel titles of the owner's screens matched it best).
 */
export const LOCATE_WEIGHTS = [400, 500, 600] as const;

/** Draws `text` dark on light, cropped to its ink, as a grayscale template; null when nothing was drawn. */
export type TemplateRenderer = (text: string, px: number, weight: number) => Gray | null;

/** Mean of the picture below 2× downscale (box filter); used for the coarse pass. */
export function downscale2(src: Gray): Gray {
  const width = Math.max(1, Math.floor(src.width / 2));
  const height = Math.max(1, Math.floor(src.height / 2));
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = (2 * y) * src.width + 2 * x;
      const b = a + src.width;
      data[y * width + x] = ((src.data[a] ?? 0) + (src.data[a + 1] ?? 0) + (src.data[b] ?? 0) + (src.data[b + 1] ?? 0)) / 4;
    }
  }
  return { data, width, height };
}

/** The template as zero-mean values scaled to unit norm; null for a flat template (nothing to match). */
function normalised(template: Gray): Float32Array | null {
  const n = template.width * template.height;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += template.data[i] ?? 0;
  const mean = sum / n;
  let sq = 0;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const v = (template.data[i] ?? 0) - mean;
    out[i] = v;
    sq += v * v;
  }
  if (sq < 1e-6) return null;
  const norm = Math.sqrt(sq);
  for (let i = 0; i < n; i += 1) out[i] = (out[i] ?? 0) / norm;
  return out;
}

/**
 * The best spot of a template in a region of a picture: |normalised cross-correlation| at every position whose window
 * lies inside the region. Pure. `region` is in the picture's pixels; returns null when the template does not fit.
 */
export function bestMatch(image: Gray, template: Gray, region: Rect): { x: number; y: number; score: number; runnerUp: number; top: { x: number; y: number; score: number }[] } | null {
  const t = normalised(template);
  if (t === null) return null;
  const tw = template.width;
  const th = template.height;
  const n = tw * th;
  const x0 = Math.max(0, Math.floor(region.x));
  const y0 = Math.max(0, Math.floor(region.y));
  const x1 = Math.min(image.width - tw, Math.floor(region.x + region.w) - tw);
  const y1 = Math.min(image.height - th, Math.floor(region.y + region.h) - th);
  if (x1 < x0 || y1 < y0) return null;
  // Integral images of the region (plus the template's reach) for each window's sum and sum of squares.
  const rw = x1 - x0 + tw;
  const rh = y1 - y0 + th;
  const S = new Float64Array((rw + 1) * (rh + 1));
  const Q = new Float64Array((rw + 1) * (rh + 1));
  for (let y = 0; y < rh; y += 1) {
    let rowS = 0;
    let rowQ = 0;
    for (let x = 0; x < rw; x += 1) {
      const v = image.data[(y0 + y) * image.width + x0 + x] ?? 0;
      rowS += v;
      rowQ += v * v;
      const at = (y + 1) * (rw + 1) + x + 1;
      S[at] = (S[at - (rw + 1)] ?? 0) + rowS;
      Q[at] = (Q[at - (rw + 1)] ?? 0) + rowQ;
    }
  }
  const box = (A: Float64Array, x: number, y: number) =>
    (A[(y + th) * (rw + 1) + x + tw] ?? 0) - (A[y * (rw + 1) + x + tw] ?? 0) - (A[(y + th) * (rw + 1) + x] ?? 0) + (A[y * (rw + 1) + x] ?? 0);
  let best: { x: number; y: number; score: number; runnerUp: number; top: { x: number; y: number; score: number }[] } | null = null;
  // The eight best spots, for the best score at least a template away from the winner (a second place for the text).
  const TOP = 8;
  const spots: { x: number; y: number; score: number }[] = [];
  let floor = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const lx = x - x0;
      const ly = y - y0;
      const s = box(S, lx, ly);
      const q = box(Q, lx, ly);
      const variance = q - (s * s) / n;
      if (variance < 1e-3) continue;
      let dot = 0;
      for (let j = 0; j < th; j += 1) {
        const row = (y + j) * image.width + x;
        const trow = j * tw;
        for (let i = 0; i < tw; i += 1) dot += (image.data[row + i] ?? 0) * (t[trow + i] ?? 0);
      }
      // Σ(I−μ)·t' = Σ I·t' because t' has zero mean; divide by ‖I−μ‖.
      const score = Math.abs(dot) / Math.sqrt(variance);
      if (score > floor) {
        spots.push({ x, y, score });
        if (spots.length > TOP * 4) {
          spots.sort((p, q) => q.score - p.score);
          spots.length = TOP;
          floor = spots[TOP - 1]?.score ?? 0;
        }
      }
      if (best === null || score > best.score) best = { x, y, score, runnerUp: 0, top: [] };
    }
  }
  if (best !== null) {
    const top = best;
    spots.sort((p, q) => q.score - p.score);
    // The best spots, one per template-sized neighbourhood (for a coarse pass to refine more than one).
    for (const spot of spots) {
      if (top.top.length >= 3) break;
      if (top.top.every((kept) => Math.abs(kept.x - spot.x) >= tw || Math.abs(kept.y - spot.y) >= th)) top.top.push(spot);
    }
    for (const spot of spots) {
      if (Math.abs(spot.x - top.x) >= tw || Math.abs(spot.y - top.y) >= th) top.runnerUp = Math.max(top.runnerUp, spot.score);
    }
  }
  return best;
}

/** The region of a target in a picture, in pixels, widened by `pad` of the picture's size on every side. */
export function zoneRect(zone: LabelTarget['zone'], width: number, height: number, pad = 0.02): Rect {
  const x = Math.max(0, (zone.x0 - pad) * width);
  const y = Math.max(0, (zone.y0 - pad) * height);
  const right = Math.min(width, (zone.x1 + pad) * width);
  const bottom = Math.min(height, (zone.y1 + pad) * height);
  return { x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y) };
}

/** Downscales by 2, `times` times. */
function pyramid(image: Gray, times: number): Gray {
  let out = image;
  for (let i = 0; i < times; i += 1) out = downscale2(out);
  return out;
}

const area = (zone: LabelTarget['zone']) => Math.max(0, zone.x1 - zone.x0) * Math.max(0, zone.y1 - zone.y0);

/** Intersection over union of two rectangles. */
function overlap(a: Rect, b: Rect): number {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = w * h;
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

export interface Candidate {
  hit: number;
  rect: Rect;
  score: number;
  runnerUp: number;
  px: number;
}

/**
 * The best spot of one text in a region: a coarse pass on a downscaled picture over every size and weight, then a
 * fine pass at full resolution around the coarse spot. `levels` is how many halvings the coarse pass uses (1 for a
 * label's region, 2 for the whole screen).
 */
function searchText(image: Gray, levels: Gray[], text: string, hit: number, region: Rect, sizes: readonly number[], weights: readonly number[], render: TemplateRenderer, floor: number, wide = false): Candidate[] {
  // 3.5.6: every distinct spot, the best size and weight of each (a label may repeat: a chip, a panel title, a column).
  const found: Candidate[] = [];
  const add = (candidate: Candidate) => {
    const same = found.findIndex((other) => overlap(other.rect, candidate.rect) > 0.3);
    if (same === -1) found.push(candidate);
    else if ((found[same]?.score ?? 0) < candidate.score) found[same] = candidate;
  };
  for (const px of sizes) {
    for (const weight of weights) {
      const template = render(text, px, weight);
      if (template === null || template.width < 4 || template.height < 4) continue;
      // The coarsest level the template still reads at (5 px tall; 3 px on the whole screen, refined below).
      let level = levels.length;
      let small = pyramid(template, level);
      const minHeight = wide ? 3 : 5;
      while (level > 0 && small.height < minHeight) {
        level -= 1;
        small = pyramid(template, level);
      }
      const coarseImage = level === 0 ? image : (levels[level - 1] as Gray);
      const f = 2 ** level;
      const coarse = bestMatch(coarseImage, small, { x: region.x / f, y: region.y / f, w: region.w / f, h: region.h / f });
      if (coarse === null || coarse.score < floor * (wide ? 0.65 : 0.8)) continue;
      // A coarse picture blurs small text: refine its best few spots at full resolution, not only the first.
      const spots = coarse.top.length > 0 ? coarse.top : [{ x: coarse.x, y: coarse.y, score: coarse.score }];
      const fines: { x: number; y: number; score: number }[] = [];
      for (const spot of spots) {
        const around = { x: spot.x * f - 2 * f, y: spot.y * f - 2 * f, w: template.width + 4 * f, h: template.height + 4 * f };
        const fine = bestMatch(image, template, around);
        if (fine !== null) fines.push(fine);
      }
      fines.sort((a, b) => b.score - a.score);
      for (const [index, fine] of fines.entries()) {
        // The runner-up of a spot: on the whole screen, the next refined spot; in a region, the coarse second place.
        const runnerUp = wide ? (index === 0 ? (fines[1]?.score ?? 0) : (fines[0]?.score ?? 0)) : coarse.runnerUp;
        add({ hit, rect: { x: fine.x, y: fine.y, w: template.width, h: template.height }, score: fine.score, runnerUp, px });
      }
    }
  }
  return found.sort((a, b) => b.score - a.score);
}

/** Ties within this much are settled by where the word starts (`startsWord`), not by the correlation alone. */
export const LOCATE_TIE = 0.06;

/**
 * Whether the text at `rect` starts a label: no ink just before it on its line. "Analyze response time" holds
 * "response time", which scores almost as well as the panel title "Response time"; the title has nothing at its left.
 * Pure: the spread of the pixels in a strip one text-height wide, left of the match.
 */
export function startsWord(image: Gray, rect: Rect): boolean {
  const reach = Math.max(4, Math.round(rect.h * 0.9));
  const x0 = Math.max(0, Math.round(rect.x) - reach);
  const x1 = Math.max(0, Math.round(rect.x) - 1);
  const y0 = Math.max(0, Math.round(rect.y + rect.h * 0.15));
  const y1 = Math.min(image.height - 1, Math.round(rect.y + rect.h * 0.85));
  if (x1 - x0 < 2 || y1 <= y0) return true;
  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const v = image.data[y * image.width + x] ?? 0;
      sum += v;
      sq += v * v;
      n += 1;
    }
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sq / n - mean * mean)) < 18;
}

/**
 * The candidate kept for a label. Among the spots within `LOCATE_TIE` of the best, one that starts a word wins over
 * one inside a sentence, and then the larger text wins: the same word is a panel's title above, a column header or
 * a chip below ("Endpoints" over the table's "Endpoint"), and a pin belongs to the title.
 */
export function choose(image: Gray, candidates: readonly Candidate[], floor: number): Candidate | null {
  const best = candidates[0];
  if (best === undefined || best.score < floor) return null;
  const close = candidates.filter((other) => other.score >= floor && other.score >= best.score - LOCATE_TIE);
  const starting = close.filter((other) => startsWord(image, other.rect));
  const pool = starting.length > 0 ? starting : close;
  return pool.reduce((kept, other) => (other.rect.h > kept.rect.h + 1 || (Math.abs(other.rect.h - kept.rect.h) <= 1 && other.score > kept.score) ? other : kept));
}

/**
 * Finds each target's text in the picture, smallest region first, every size and weight. A label is kept in its region above
 * `LOCATE_MIN_SCORE`; failing that, on the whole screen above `LOCATE_GLOBAL_MIN_SCORE` and only when no other spot
 * comes close (`LOCATE_GLOBAL_MARGIN`). Two labels never share a spot: the better score keeps it. Yields between
 * targets (`yieldEvery`) so the page stays responsive.
 */
export async function locateLabels(
  image: Gray,
  targets: readonly LabelTarget[],
  render: TemplateRenderer,
  options: { minScore?: number; globalMinScore?: number; sizes?: readonly number[]; weights?: readonly number[]; global?: boolean; yieldEvery?: () => Promise<void> } = {},
): Promise<LabelHit[]> {
  const minScore = options.minScore ?? LOCATE_MIN_SCORE;
  const globalMin = options.globalMinScore ?? LOCATE_GLOBAL_MIN_SCORE;
  const weights = options.weights ?? LOCATE_WEIGHTS;
  const sizes: readonly number[] = options.sizes ?? LOCATE_SIZES;
  const levels = [downscale2(image)];
  levels.push(downscale2(levels[0] as Gray));
  const whole: Rect = { x: 0, y: 0, w: image.width, h: image.height };
  const ordered = [...targets].sort((a, b) => area(a.zone) - area(b.zone));
  const hits: LabelHit[] = [];
  const sharing = new Set(targets.filter((target) => target.shares === true).map((target) => target.key));
  const keep = (key: string, chosen: Candidate): boolean => {
    const clash = sharing.has(key) ? -1 : hits.findIndex((other) => !sharing.has(other.key) && overlap(other.rect, chosen.rect) > 0.3);
    if (clash !== -1 && (hits[clash]?.score ?? 0) >= chosen.score) return false;
    if (clash !== -1) hits.splice(clash, 1);
    hits.push({ key, hit: chosen.hit, rect: chosen.rect, score: chosen.score });
    return true;
  };
  // Phase 1: each label in its own region.
  const missing: LabelTarget[] = [];
  for (const target of ordered) {
    const region = zoneRect(target.zone, image.width, image.height);
    const regionLevels = area(target.zone) > 0.25 ? levels : levels.slice(0, 1);
    let best: Candidate | null = null;
    for (const [index, text] of target.texts.entries()) {
      if (text.trim() === '') continue;
      const candidate = choose(image, searchText(image, regionLevels, text, index, region, sizes, weights, render, minScore, area(target.zone) > 0.25), minScore);
      if (candidate !== null && (best === null || candidate.score > best.score)) best = candidate;
    }
    // 3.5.6: every label is searched at every size. 3.5.5 narrowed the sizes around the first label found, and a
    // chip found first (small text) hid the panel titles (larger) of the same screen.
    if (best !== null) keep(target.key, best);
    else {
      missing.push(target);
    }
    if (options.yieldEvery !== undefined) await options.yieldEvery();
  }
  // Phase 2: a label its region did not hold (the layout moved), on the whole screen, stricter.
  if (options.global !== false) {
    for (const target of missing) {
      if (area(target.zone) >= 0.9) continue;
      let best: Candidate | null = null;
      for (const [index, text] of target.texts.entries()) {
        if (text.trim() === '') continue;
        const candidate = searchText(image, levels, text, index, whole, sizes, weights, render, globalMin, true)[0] ?? null;
        if (candidate !== null && candidate.score >= globalMin && candidate.score - candidate.runnerUp >= LOCATE_GLOBAL_MARGIN && (best === null || candidate.score > best.score)) best = candidate;
      }
      if (best !== null) keep(target.key, best);
      if (options.yieldEvery !== undefined) await options.yieldEvery();
    }
  }
  return hits;
}
