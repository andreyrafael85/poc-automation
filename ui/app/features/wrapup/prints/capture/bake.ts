import { DOWNSCALE, JPEG_LADDER, JPEG_QUALITY, LIMITS, MASK_FILL, PRINT_SPACE } from '../constants';
import type { MaskRect, Rect } from '../types';
import { blobBytes, blobDataUrl, jpegBlob, sha256Hex, sha256Text, sniffImage, stripJpegMetadata } from './imageBytes';
import { decodeImage, newSurface } from './raster';

/**
 * The deck's image of a print (3.2.7, spec §7.2 "Bake", §5.8).
 *
 * Masks are burned into the pixels here, at deck build only — the master is never changed and the
 * unmasked master never reaches the deck. A print with no masks and no ladder step is the master's
 * own bytes (no second lossy encode). The deck's media budget is kept by a ladder: a print over
 * 600 KB is re-encoded at q72; still over, it is downscaled to 1290×810 (pins and focus are
 * fractions, so they do not move); and while all prints together pass 6 MB, the largest one that
 * can still shrink takes its next step. The ladder's decisions are pure (`bakeLadder`); the
 * preview and the PPTX use the same baked data URL.
 *
 * `hashMasks` and `hashFocus` are what an approval is bound to (`approval.ts`).
 */

export type BakeStage = 'q82' | 'q72' | 'downscale';

export interface BakeResult {
  /** `data:image/jpeg;base64,…` */
  dataUrl: string;
  bytes: number;
  quality: number;
  downscaled: boolean;
  width: number;
  height: number;
  /** SHA-256 of the baked bytes: the deck's media key (one part per distinct image). */
  sha256: string;
}

const [Q_MASTER, Q_LADDER] = JPEG_LADDER;

/** The quality and size of each ladder stage. */
export const STAGE: Readonly<Record<BakeStage, { quality: number; downscale: boolean }>> = {
  q82: { quality: Q_MASTER ?? JPEG_QUALITY, downscale: false },
  q72: { quality: Q_LADDER ?? 0.72, downscale: false },
  downscale: { quality: Q_LADDER ?? 0.72, downscale: true },
};

const NEXT: Readonly<Record<BakeStage, BakeStage | null>> = { q82: 'q72', q72: 'downscale', downscale: null };

/**
 * The next re-encodes, from the baked sizes and the stage each print is at (pure). First every
 * print over the per-print cap takes its next step; only when none is over does the total count,
 * and then the largest print that can still shrink takes one step. Empty when nothing is over, or
 * nothing can shrink any more.
 */
export function bakeLadder(sizes: readonly number[], stages: readonly BakeStage[] = sizes.map(() => 'q82')): { index: number; step: 'q72' | 'downscale' }[] {
  const nextOf = (index: number) => NEXT[stages[index] ?? 'q82'] as 'q72' | 'downscale' | null;
  const steps: { index: number; step: 'q72' | 'downscale' }[] = [];
  sizes.forEach((size, index) => {
    const step = nextOf(index);
    if (size > LIMITS.imageBytesDeck && step !== null) steps.push({ index, step });
  });
  if (steps.length > 0) return steps;
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total <= LIMITS.deckMediaBytes) return [];
  const largest = sizes
    .map((size, index) => ({ size, index }))
    .sort((a, b) => b.size - a.size || a.index - b.index)
    .find(({ index }) => nextOf(index) !== null);
  const step = largest === undefined ? null : nextOf(largest.index);
  return largest === undefined || step === null ? [] : [{ index: largest.index, step }];
}

/** A mask in pixels of an image `k` times the print, covering every pixel it touches. */
function scaledMask(mask: Rect, kx: number, ky: number, width: number, height: number): Rect | null {
  const x0 = Math.max(0, Math.floor(mask.x * kx));
  const y0 = Math.max(0, Math.floor(mask.y * ky));
  const x1 = Math.min(width, Math.ceil((mask.x + mask.w) * kx));
  const y1 = Math.min(height, Math.ceil((mask.y + mask.h) * ky));
  return x1 - x0 < 1 || y1 - y0 < 1 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The deck image of a master: masks burned in as a solid fill, at the given quality, optionally
 * downscaled. No masks, the master quality and no downscale → the master's own picture bytes,
 * never its metadata (`stripJpegMetadata`); a master the walk cannot clean is drawn and encoded.
 */
export async function bakePrint(master: Blob, masks: readonly Rect[], opts: { quality?: number; downscale?: boolean } = {}): Promise<BakeResult> {
  const quality = opts.quality ?? STAGE.q82.quality;
  const downscale = opts.downscale === true;
  const kept = masks.length === 0 && quality === STAGE.q82.quality && !downscale ? stripJpegMetadata(await blobBytes(master)) : null;
  if (kept !== null) {
    const size = sniffImage(kept);
    return {
      dataUrl: await blobDataUrl(jpegBlob(kept)),
      bytes: kept.length,
      quality,
      downscaled: false,
      width: size?.width ?? PRINT_SPACE.width,
      height: size?.height ?? PRINT_SPACE.height,
      sha256: await sha256Hex(kept),
    };
  }
  const target = downscale ? DOWNSCALE : PRINT_SPACE;
  const image = await decodeImage(master);
  try {
    const surface = newSurface(target.width, target.height);
    surface.drawImage(image, 0, 0, image.width, image.height, 0, 0, target.width, target.height);
    const kx = target.width / PRINT_SPACE.width;
    const ky = target.height / PRINT_SPACE.height;
    for (const mask of masks) {
      const rect = scaledMask(mask, kx, ky, target.width, target.height);
      if (rect !== null) surface.fillRect(rect.x, rect.y, rect.w, rect.h, MASK_FILL);
    }
    const bytes = await blobBytes(await surface.encode('image/jpeg', quality));
    return { dataUrl: await blobDataUrl(jpegBlob(bytes)), bytes: bytes.length, quality, downscaled: downscale, width: target.width, height: target.height, sha256: await sha256Hex(bytes) };
  } finally {
    image.close();
  }
}

const round = (value: number) => Math.round(value);

/** The canonical text of a mask list: sorted by x, y, w, h, reason; whole pixels. */
export function canonicalMasks(masks: readonly MaskRect[]): string {
  const rows = masks.map((mask) => [round(mask.x), round(mask.y), round(mask.w), round(mask.h), mask.reason] as const);
  rows.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3] || (a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : 0));
  return JSON.stringify(rows);
}

/** SHA-256 of the canonical masks (an approval is bound to it). */
export async function hashMasks(masks: readonly MaskRect[]): Promise<string> {
  return sha256Text(canonicalMasks(masks));
}

/**
 * SHA-256 of the focus (the lupa region), `null` included, and of whether the lupa shows it: an
 * approval is bound to both (3.2.7 review PS-5 — turning the lupa on puts a magnified copy of that
 * region on the slide, which the SE has not approved). With the lupa off the hash is the region's
 * alone, as before.
 */
export async function hashFocus(focus: Rect | null, lupaOn = false): Promise<string> {
  const region = focus === null ? null : [round(focus.x), round(focus.y), round(focus.w), round(focus.h)];
  return sha256Text(JSON.stringify(lupaOn ? { lupa: region } : region));
}

/** One print to bake for the deck. `key` identifies the master and its masks (e.g. `${image.sha256}|${masksHash}`). */
export interface BakeInput {
  key: string;
  master: Blob;
  masks: readonly MaskRect[];
}

/** Baked images, memoised by master, masks and stage; at most `max` kept (the deck model's memory cap). */
export class BakeCache {
  private readonly entries = new Map<string, Promise<BakeResult>>();

  constructor(private readonly max = 12) {}

  get(input: BakeInput, stage: BakeStage): Promise<BakeResult> {
    const key = `${input.key}|${stage}`;
    const found = this.entries.get(key);
    if (found !== undefined) {
      // Most recently used last.
      this.entries.delete(key);
      this.entries.set(key, found);
      return found;
    }
    const { quality, downscale } = STAGE[stage];
    const baked = bakePrint(input.master, input.masks, { quality, downscale });
    // A failed bake is not remembered.
    baked.catch(() => this.entries.delete(key));
    this.entries.set(key, baked);
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return baked;
  }
}

/**
 * Bakes every print of the deck and runs the ladder until each is under 600 KB and all together
 * under 6 MB, or nothing can shrink further. Results are in input order, with the stage reached.
 */
export async function bakeAll(inputs: readonly BakeInput[], cache: BakeCache = new BakeCache(Math.max(12, inputs.length * 3))): Promise<{ result: BakeResult; stage: BakeStage }[]> {
  const stages: BakeStage[] = inputs.map(() => 'q82');
  const results = await Promise.all(inputs.map((input) => cache.get(input, 'q82')));
  // Each print can step at most twice.
  for (let pass = 0; pass <= inputs.length * 2; pass += 1) {
    const steps = bakeLadder(
      results.map((result) => result.bytes),
      stages,
    );
    if (steps.length === 0) break;
    await Promise.all(
      steps.map(async ({ index, step }) => {
        const input = inputs[index];
        if (input === undefined) return;
        stages[index] = step;
        results[index] = await cache.get(input, step);
      }),
    );
  }
  return results.map((result, index) => ({ result, stage: stages[index] ?? 'q82' }));
}
