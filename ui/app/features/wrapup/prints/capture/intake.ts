import type { StringKey } from '../../../../i18n/strings';
import { LIMITS, PRINT_SPACE } from '../constants';
import type { PrintAsset, PrintRecord, Rect, ShotSlot } from '../types';
import { blobBytes, sniffImage, type SniffedImage } from './imageBytes';
import { normalizeToTarget } from './normalize';
import { initialFocus, newPrintId, slotFields } from './record';

/**
 * Manual import (3.2.7, spec §1.3 (c), §7.2; the only way in since 3.3.2, with the batch).
 *
 * The SE opens the planned screen, takes an OS or browser screenshot and brings it here — the file
 * picker, Ctrl+V on the drop zone, a drop, or a batch (`batch.ts`). Whatever arrives
 * is checked by its bytes (PNG, JPEG or WebP; ≤ 10 MB; 640×360 to 7680×4320 — an SVG or a GIF is
 * refused whatever its name says), cropped by the SE, and normalised once to the 1720×1080 JPEG
 * master. There is no final address to check, so the identity starts `none`: the SE ticks "Esta é
 * a tela de {nome}" before the print can be approved.
 *
 * The clipboard is read only from the paste event the SE fired (`clipboardData`), never through
 * `navigator.clipboard.read`, which would prompt for a permission.
 */

export type IntakeWhy = 'type' | 'size' | 'dims' | 'decode';

/** A refused file: `why` keys `prt.err.file.*`, shown as `prt.err.file` `{ name, why }`. */
export class IntakeError extends Error {
  constructor(
    readonly why: IntakeWhy,
    readonly fileName: string,
  ) {
    super(why);
  }

  get whyKey(): StringKey {
    return INTAKE_WHY_KEY[this.why];
  }
}

export const INTAKE_WHY_KEY: Readonly<Record<IntakeWhy, StringKey>> = {
  type: 'prt.err.file.type',
  size: 'prt.err.file.size',
  dims: 'prt.err.file.dims',
  decode: 'prt.err.file.decode',
};

/** The file picker's `accept` (the bytes are checked anyway). */
export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';

const ACCEPTED = new Set(ACCEPTED_IMAGE_TYPES.split(','));

/** Enough of a file to reach a JPEG's frame header past large EXIF/ICC segments. */
const SNIFF_BYTES = 512 * 1024;

/** Checks a file by its bytes; resolves with its real type and size or rejects with `IntakeError`. */
export async function checkImageFile(file: Blob, name: string = file instanceof File ? file.name : ''): Promise<SniffedImage> {
  if (file.size > LIMITS.imageBytesIn) throw new IntakeError('size', name);
  const head = await blobBytes(file.size > SNIFF_BYTES ? file.slice(0, SNIFF_BYTES) : file);
  const sniffed = sniffImage(head);
  if (sniffed === null) throw new IntakeError('type', name);
  const { minImage, maxImage } = LIMITS;
  if (sniffed.width < minImage.width || sniffed.height < minImage.height || sniffed.width > maxImage.width || sniffed.height > maxImage.height) {
    throw new IntakeError('dims', name);
  }
  return sniffed;
}

/**
 * A manual or guided print for a slot: checked, cropped, normalised, with a record whose identity
 * the SE still has to confirm. `capturedAt` is the file's `lastModified` when it has one (marked
 * approximate), else now.
 */
export async function intakeFile(file: File | Blob, slot: ShotSlot, crop: Rect | null, source: 'manual' | 'tab-capture' = 'manual', nowIso: string = new Date().toISOString()): Promise<PrintAsset> {
  const name = file instanceof File ? file.name : '';
  await checkImageFile(file, name);
  let normalized;
  try {
    normalized = await normalizeToTarget(file, crop);
  } catch {
    throw new IntakeError('decode', name);
  }
  const lastModified = file instanceof File && source === 'manual' && Number.isFinite(file.lastModified) && file.lastModified > 0 ? new Date(file.lastModified).toISOString() : null;
  const fields = slotFields(slot);
  const focus = normalized.partial ? null : initialFocus(fields.layout, []);
  const record: PrintRecord = {
    id: newPrintId(),
    ...fields,
    finalPath: null,
    finalAppId: null,
    source,
    landing: 'unknown',
    capturedAtIso: lastModified ?? nowIso,
    capturedAtApprox: lastModified !== null,
    captureTimeZone: null,
    screenTimeframeLabel: null,
    companion: null,
    image: {
      sha256: normalized.sha256,
      mime: 'image/jpeg',
      bytes: normalized.bytes,
      width: PRINT_SPACE.width,
      height: PRINT_SPACE.height,
      normalization: normalized.normalization,
      partial: normalized.partial,
    },
    anchors: [],
    screenNumbers: [],
    identity: 'none',
    pins: [],
    masks: [],
    maskSuggestions: [],
    focus,
    lupaOn: false,
    approval: null,
    warnings: [],
    matchedBy: 'slot',
    edited: false,
    updatedAtIso: nowIso,
  };
  return { record, master: normalized.blob, thumbUrl: null };
}

const isAccepted = (type: string) => ACCEPTED.has(type.toLowerCase());

/**
 * The image of a paste event (`clipboardData.files`, then `items` of kind file), or null — text,
 * HTML and any other non-image item are ignored.
 */
export function pastedImage(event: Pick<ClipboardEvent, 'clipboardData'>): File | null {
  const data = event.clipboardData;
  let found: File | null = null;
  if (data !== null) {
    found = [...Array.from(data.files ?? [])].find((file) => isAccepted(file.type)) ?? null;
    if (found === null) {
      for (const item of Array.from(data.items ?? [])) {
        if (item.kind !== 'file' || !isAccepted(item.type)) continue;
        found = item.getAsFile();
        if (found !== null) break;
      }
    }
  }
  return found;
}

/** The first image of a drop, or null. */
export function droppedImage(event: Pick<DragEvent, 'dataTransfer'>): File | null {
  const files = event.dataTransfer?.files;
  return files === undefined ? null : (Array.from(files).find((file) => isAccepted(file.type)) ?? null);
}

/** Every image or ZIP of a drop, in the order dropped (the batch import, 3.3.2). */
export function droppedFiles(event: Pick<DragEvent, 'dataTransfer'>): File[] {
  const files = event.dataTransfer?.files;
  if (files === undefined) return [];
  return Array.from(files).filter((file) => isAccepted(file.type) || /\.zip$/i.test(file.name) || /zip/.test(file.type));
}
