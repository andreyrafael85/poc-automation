import { JPEG_QUALITY, NAV_WIDTH_CSS, PRINT_SPACE } from '../constants';
import type { PrintRecord, Rect } from '../types';
import { blobBytes, jpegBlob, sha256Hex, sniffImage, stripJpegMetadata } from './imageBytes';
import { decodeImage, newSurface, type DecodedImage, type Surface } from './raster';

/**
 * Every print is the platform's content area at 1720×1080 (3.2.7, spec §7.2).
 *
 * A manual snip or a guided frame arrives at whatever size the SE's screen had — 1920×1080 with
 * the navigation, a 4K monitor, a window that was not maximised. It is brought to the print space
 * once: the SE's crop (the left edge pre-detected by `detectNavEdge`, else 200/1920 of the width),
 * then fit to 1720 wide when the aspect is within ±8 % of 1720/1080 (keeping the top 1080 rows, or
 * padding the bottom with the median colour of the last row), else letterboxed (`contain`, and the
 * print is `partial`: template pins are off, the SE places them). One JPEG q82 encode, never two:
 * a JPEG that is already 1720×1080 and is not cropped keeps its picture's bytes, without its
 * metadata (`native`).
 *
 * The decisions are pure (`planNormalization`, `detectNavEdge`, `suggestCrop`) and unit-tested;
 * the drawing goes through `raster.ts`.
 */

/** How far the aspect may stray from 1720/1080 and still be fit to the width. */
export const ASPECT_TOLERANCE = 0.08;

/** Gallery thumbnails (object URLs; the caller revokes them). */
export const THUMB = { width: 344, height: 216 } as const;

const TARGET_ASPECT = PRINT_SPACE.width / PRINT_SPACE.height;
const BLANK = '#FFFFFF';

/** Maps source-image pixels to print pixels: `print = (src − s) × scale + d`. */
export interface Placement {
  sx: number;
  sy: number;
  scale: number;
  dx: number;
  dy: number;
}

export const IDENTITY_PLACEMENT: Placement = { sx: 0, sy: 0, scale: 1, dx: 0, dy: 0 };

export type Normalization = PrintRecord['image']['normalization'];

export interface NormalizationPlan {
  /** The region of the source image that is drawn. */
  source: Rect;
  /** Where it lands in the 1720×1080 print. */
  dest: Rect;
  normalization: Normalization;
  /** The image does not fill the print (letterboxed): template pins are disabled. */
  partial: boolean;
  /** The rows under `dest` are filled with the median colour of its last row. */
  padBottom: boolean;
  placement: Placement;
}

export interface NormalizedImage {
  blob: Blob;
  normalization: Normalization;
  partial: boolean;
  sha256: string;
  bytes: number;
  /** Source pixels → print pixels (anchors and mask suggestions follow the image). */
  placement: Placement;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The crop clamped to the image; null (or a crop smaller than a pixel) is the whole image. */
export function clampCrop(width: number, height: number, crop: Rect | null): Rect {
  if (crop === null) return { x: 0, y: 0, w: width, h: height };
  const x = clamp(Math.round(crop.x), 0, width - 1);
  const y = clamp(Math.round(crop.y), 0, height - 1);
  const w = clamp(Math.round(crop.w), 0, width - x);
  const h = clamp(Math.round(crop.h), 0, height - y);
  return w < 1 || h < 1 ? { x: 0, y: 0, w: width, h: height } : { x, y, w, h };
}

const isWhole = (rect: Rect, width: number, height: number) => rect.x === 0 && rect.y === 0 && rect.w === width && rect.h === height;

/**
 * How an image of this size, with this crop, becomes a 1720×1080 print (pure). Fit to the width
 * when the aspect is within `ASPECT_TOLERANCE` of the print's; otherwise contain, centred.
 */
export function planNormalization(width: number, height: number, crop: Rect | null): NormalizationPlan {
  const area = clampCrop(width, height, crop);
  const cropped = !isWhole(area, width, height);
  const { width: W, height: H } = PRINT_SPACE;
  const aspect = area.w / area.h;
  if (Math.abs(aspect / TARGET_ASPECT - 1) <= ASPECT_TOLERANCE) {
    const scale = W / area.w;
    const scaledHeight = area.h * scale;
    if (scaledHeight >= H - 0.5) {
      // Keep the top 1080 rows: what is cut is the bottom of a page, never its header.
      const rows = Math.min(area.h, Math.round(H / scale));
      const cut = scaledHeight > H + 0.5;
      return {
        source: { x: area.x, y: area.y, w: area.w, h: rows },
        dest: { x: 0, y: 0, w: W, h: H },
        normalization: cropped || cut ? 'cropped' : 'resized',
        partial: false,
        padBottom: false,
        placement: { sx: area.x, sy: area.y, scale, dx: 0, dy: 0 },
      };
    }
    return {
      source: area,
      dest: { x: 0, y: 0, w: W, h: Math.round(scaledHeight) },
      normalization: cropped ? 'cropped' : 'resized',
      partial: false,
      padBottom: true,
      placement: { sx: area.x, sy: area.y, scale, dx: 0, dy: 0 },
    };
  }
  const scale = Math.min(W / area.w, H / area.h);
  const w = Math.round(area.w * scale);
  const h = Math.round(area.h * scale);
  const dx = Math.round((W - w) / 2);
  const dy = Math.round((H - h) / 2);
  return {
    source: area,
    dest: { x: dx, y: dy, w, h },
    normalization: 'contain',
    partial: true,
    padBottom: false,
    placement: { sx: area.x, sy: area.y, scale, dx, dy },
  };
}

/** A source rectangle in print pixels, clipped to the print; null when nothing of it is left. */
export function placeRect(rect: Rect, placement: Placement): Rect | null {
  const x0 = (rect.x - placement.sx) * placement.scale + placement.dx;
  const y0 = (rect.y - placement.sy) * placement.scale + placement.dy;
  const x1 = x0 + rect.w * placement.scale;
  const y1 = y0 + rect.h * placement.scale;
  const cx0 = clamp(x0, 0, PRINT_SPACE.width);
  const cy0 = clamp(y0, 0, PRINT_SPACE.height);
  const cx1 = clamp(x1, 0, PRINT_SPACE.width);
  const cy1 = clamp(y1, 0, PRINT_SPACE.height);
  if (cx1 - cx0 < 1 || cy1 - cy0 < 1) return null;
  return { x: Math.round(cx0), y: Math.round(cy0), w: Math.round(cx1 - cx0), h: Math.round(cy1 - cy0) };
}

/**
 * The x where the platform's navigation ends, from a luminance image (pure). Scans the left
 * third for the column where the brightness steps between the two columns on each side, on most
 * rows of the body (12 %–95 % of the height, so a browser's own bar does not count); null when no
 * column steps on at least 60 % of them.
 */
export function detectNavEdge(gray: Uint8ClampedArray, width: number, height: number): number | null {
  if (width < 16 || height < 16 || gray.length < width * height) return null;
  const from = Math.max(2, Math.round(width * 0.03));
  const to = Math.min(width - 2, Math.round(width * 0.35));
  const top = Math.round(height * 0.12);
  const bottom = Math.round(height * 0.95);
  const step = Math.max(1, Math.floor((bottom - top) / 240));
  const MIN_STEP = 12;
  let best: { x: number; score: number; share: number; mean: number } | null = null;
  for (let x = from; x <= to; x += 1) {
    let strong = 0;
    let sum = 0;
    let rows = 0;
    for (let y = top; y < bottom; y += step) {
      const at = y * width + x;
      const left = ((gray[at - 2] ?? 0) + (gray[at - 1] ?? 0)) / 2;
      const right = ((gray[at] ?? 0) + (gray[at + 1] ?? 0)) / 2;
      const diff = Math.abs(left - right);
      sum += diff;
      if (diff >= MIN_STEP) strong += 1;
      rows += 1;
    }
    if (rows === 0) continue;
    const share = strong / rows;
    const mean = sum / rows;
    const score = share * mean;
    if (best === null || score > best.score) best = { x, score, share, mean };
  }
  return best !== null && best.share >= 0.6 && best.mean >= MIN_STEP ? best.x : null;
}

/** The crop the dialog opens with: from the detected edge (else 200/1920 of the width) to the right, full height. */
export function suggestCrop(width: number, height: number, edge: number | null): Rect {
  const x = edge ?? Math.round((width * NAV_WIDTH_CSS) / 1920);
  return { x, y: 0, w: Math.max(1, width - x), h: height };
}

/** The median colour of a run of RGB triples, as `#rrggbb`. */
export function medianColor(rgb: Uint8ClampedArray, from = 0, to = rgb.length / 3): string {
  const channel = (offset: number) => {
    const values: number[] = [];
    for (let i = Math.max(0, from); i < Math.min(rgb.length / 3, to); i += 1) values.push(rgb[i * 3 + offset] ?? 0);
    values.sort((a, b) => a - b);
    return values.length === 0 ? 255 : (values[Math.floor(values.length / 2)] ?? 255);
  };
  return `#${[0, 1, 2].map((offset) => channel(offset).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function fillOutside(surface: Surface, dest: Rect, color: string): void {
  const { width: W, height: H } = PRINT_SPACE;
  if (dest.y > 0) surface.fillRect(0, 0, W, dest.y, color);
  if (dest.y + dest.h < H) surface.fillRect(0, dest.y + dest.h, W, H - dest.y - dest.h, color);
  if (dest.x > 0) surface.fillRect(0, dest.y, dest.x, dest.h, color);
  if (dest.x + dest.w < W) surface.fillRect(dest.x + dest.w, dest.y, W - dest.x - dest.w, dest.h, color);
}

/** Draws the image per the plan onto a fresh 1720×1080 surface, padding with the image's own edge colour. */
export function drawNormalized(image: DecodedImage, plan: NormalizationPlan): Surface {
  const surface = newSurface(PRINT_SPACE.width, PRINT_SPACE.height);
  surface.fillRect(0, 0, PRINT_SPACE.width, PRINT_SPACE.height, BLANK);
  const { source, dest } = plan;
  surface.drawImage(image, source.x, source.y, source.w, source.h, dest.x, dest.y, dest.w, dest.h);
  if (plan.padBottom || plan.partial) {
    const color = medianColor(surface.row(dest.y + dest.h - 1), dest.x, dest.x + dest.w);
    fillOutside(surface, dest, color);
  }
  return surface;
}

/**
 * The print master of a manual, guided or off-size companion image: 1720×1080 JPEG q82, encoded
 * once. A JPEG already at 1720×1080 with no crop keeps its picture's bytes (`native`) without its
 * metadata (`stripJpegMetadata`: no EXIF, XMP or comment reaches the store or a deck); one the
 * walk does not understand is encoded through the canvas like any other.
 */
export async function normalizeToTarget(blob: Blob, crop: Rect | null): Promise<NormalizedImage> {
  const bytes = await blobBytes(blob);
  const sniffed = sniffImage(bytes);
  const { width: W, height: H } = PRINT_SPACE;
  if (sniffed !== null && sniffed.mime === 'image/jpeg' && sniffed.width === W && sniffed.height === H && isWhole(clampCrop(W, H, crop), W, H)) {
    const clean = stripJpegMetadata(bytes);
    if (clean !== null) {
      return { blob: jpegBlob(clean), normalization: 'native', partial: false, sha256: await sha256Hex(clean), bytes: clean.length, placement: IDENTITY_PLACEMENT };
    }
  }
  const image = await decodeImage(blob);
  try {
    const plan = planNormalization(image.width, image.height, crop);
    const encoded = await drawNormalized(image, plan).encode('image/jpeg', JPEG_QUALITY);
    const out = await blobBytes(encoded);
    return { blob: jpegBlob(out), normalization: plan.normalization, partial: plan.partial, sha256: await sha256Hex(out), bytes: out.length, placement: plan.placement };
  } finally {
    image.close();
  }
}

/** A 344×216 thumbnail as an object URL (the caller revokes it). */
export async function makeThumb(blob: Blob): Promise<string> {
  const image = await decodeImage(blob);
  try {
    const surface = newSurface(THUMB.width, THUMB.height);
    surface.fillRect(0, 0, THUMB.width, THUMB.height, BLANK);
    const scale = Math.min(THUMB.width / image.width, THUMB.height / image.height);
    const w = Math.round(image.width * scale);
    const h = Math.round(image.height * scale);
    surface.drawImage(image, 0, 0, image.width, image.height, Math.round((THUMB.width - w) / 2), Math.round((THUMB.height - h) / 2), w, h);
    return URL.createObjectURL(await surface.encode('image/jpeg', 0.8));
  } finally {
    image.close();
  }
}

/**
 * 3.5.5 (owner's review of a real deck: three screens cut at their left edge — "problems", "ices (4)"): a manual snip
 * often has no platform navigation (collapsed, or the SE snipped the page only), and a dark page's own panel border
 * can look like the navigation's edge. The edge found is reported only when it can be the navigation's (at most
 * `NAV_EDGE_MAX_SHARE` of the width), and the crop dialog opens on the whole image (`manualCrop`).
 */
export const NAV_EDGE_MAX_SHARE = 0.16;

/** The detected edge when it can be the navigation's, else null. */
export function trustedEdge(edge: number | null, width: number): number | null {
  return edge !== null && edge > 0 && edge <= width * NAV_EDGE_MAX_SHARE ? edge : null;
}

/**
 * The crop a manual snip opens with: the whole image, always. On the owner's own screens a panel border passed for the
 * navigation's edge even within `NAV_EDGE_MAX_SHARE`, and the cut took the start of every label; a partner should not
 * have to fix it. The navigation, when there is one, stays in the picture (the SE may still crop in the dialog).
 */
export function manualCrop(width: number, height: number): Rect {
  return { x: 0, y: 0, w: width, h: height };
}

/** Widest image the nav-edge scan reads at full detail; larger ones are scanned scaled down. */
const EDGE_SCAN_WIDTH = 1920;

/**
 * The crop dialog's starting point for an image: its size, the detected navigation edge (in the
 * image's own pixels) and the suggested crop.
 */
export async function cropSuggestionFor(blob: Blob): Promise<{ width: number; height: number; edge: number | null; crop: Rect }> {
  const image = await decodeImage(blob);
  try {
    const factor = Math.min(1, EDGE_SCAN_WIDTH / image.width);
    const w = Math.max(1, Math.round(image.width * factor));
    const h = Math.max(1, Math.round(image.height * factor));
    const surface = newSurface(w, h);
    surface.drawImage(image, 0, 0, image.width, image.height, 0, 0, w, h);
    const scanned = detectNavEdge(surface.gray(), w, h);
    const edge = scanned === null ? null : Math.round(scanned / factor);
    return { width: image.width, height: image.height, edge: trustedEdge(edge, image.width), crop: manualCrop(image.width, image.height) };
  } finally {
    image.close();
  }
}
