import JSZip from 'jszip';

import { LIMITS } from '../constants';
import { blobBytes, sha256Hex, sniffImage } from './imageBytes';
import { checkImageFile, IntakeError } from './intake';
import type { BatchImage } from './match';
import { EntryError, extractEntry } from './zipImport';
import { inspectZipDirectory, LOOSE_ZIP_RULES } from './zipDirectory';

/**
 * The batch import's intake (3.3.2): files, a folder's files, or a ZIP of loose screenshots become
 * a list of checked images, each with its bytes' SHA-256 and its size, ready for `matchBatch`.
 *
 * A ZIP that carries the old companion's `manifest.json` is not unpacked here: it goes to the
 * companion import (`readCompanionZip`), which checks the manifest's tenant and its hashes — the
 * ZIPs already produced keep working.
 *
 * Nothing in a batch is trusted: a ZIP's directory is inspected before any byte is inflated, each
 * entry is capped at the size its directory declared, and every image is sniffed from its bytes
 * (type, size, dimensions) exactly as a single manual import is.
 */

export interface BatchFile {
  key: string;
  file: File;
  image: BatchImage;
}

export type BatchRefusal = { name: string; why: 'type' | 'size' | 'dims' | 'decode' | 'zip' | 'too_many' | 'nested_manifest' };

/** A companion ZIP whose manifest is not at the root: refused, never read as loose screenshots. */
export class NestedManifestError extends Error {
  constructor() {
    super('nested_manifest');
  }
}

export interface BatchIntake {
  files: BatchFile[];
  /** ZIPs with a companion manifest, to import through the companion path. */
  companionZips: File[];
  refused: BatchRefusal[];
}

const IMAGE_NAME = /\.(png|jpe?g|webp)$/i;
const isZip = (file: File) => /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

/** The most images one batch takes: the prints a set can hold. */
export const BATCH_MAX = LIMITS.prints;

/** JSZip hands a name as bytes (or, without typed arrays, as an array of byte strings). */
function utf8FileName(name: string[] | Uint8Array | ArrayLike<number>): string {
  const bytes = name instanceof Uint8Array ? name : Uint8Array.from(Array.from(name as ArrayLike<string | number>, (c) => (typeof c === 'string' ? c.charCodeAt(0) : c)));
  return new TextDecoder('utf-8').decode(bytes);
}

/** Loose images of a ZIP, or `null` when it is the companion's (has a manifest). */
export async function looseImagesOf(file: File): Promise<File[] | null> {
  // Checked before a byte is read: a multi-gigabyte drop must not take the tab down (review 3.3.2 #3).
  if (file.size > LOOSE_ZIP_RULES.maxBytes) throw new EntryError('too_large');
  const bytes = await blobBytes(file);
  const directory = inspectZipDirectory(bytes, LOOSE_ZIP_RULES);
  if (!directory.ok) throw new Error(directory.reason);
  if (directory.entries.some((entry) => entry.name === 'manifest.json')) return null;
  // A companion ZIP re-zipped inside a folder: its manifest (tenant check, hashes) would be skipped,
  // so the archive is refused and the SE is told to import the original (review 3.3.2 #4, rule 11).
  if (directory.entries.some((entry) => (entry.name.split('/').pop() ?? '') === 'manifest.json')) throw new NestedManifestError();
  const wanted = directory.entries.filter((entry) => {
    const base = entry.name.split('/').pop() ?? '';
    return !entry.name.endsWith('/') && !entry.name.startsWith('__MACOSX/') && !base.startsWith('.') && IMAGE_NAME.test(base) && entry.uncompressed > 0;
  });
  // Names read as UTF-8, as the directory check read them, so every entry it kept is found again.
  const zip = await JSZip.loadAsync(bytes, { decodeFileName: utf8FileName });
  const out: File[] = [];
  for (const entry of wanted) {
    const data = await extractEntry(zip, entry);
    const sniffed = sniffImage(data);
    const base = entry.name.split('/').pop() ?? entry.name;
    // The ZIP's own time of the entry, when it has one: it orders a batch taken in sequence.
    const date = zip.file(entry.name)?.date;
    out.push(new File([data as BlobPart], base, { type: sniffed?.mime ?? 'application/octet-stream', lastModified: date instanceof Date ? date.getTime() : Date.now() }));
  }
  return out;
}

/** Checks every file of a batch and hashes it; ZIPs are opened (loose) or set aside (companion). */
export async function intakeBatch(input: readonly File[]): Promise<BatchIntake> {
  const result: BatchIntake = { files: [], companionZips: [], refused: [] };
  const images: File[] = [];
  for (const file of input) {
    if (isZip(file)) {
      try {
        const loose = await looseImagesOf(file);
        if (loose === null) result.companionZips.push(file);
        else images.push(...loose);
      } catch (error) {
        result.refused.push({
          name: file.name,
          why: error instanceof NestedManifestError ? 'nested_manifest' : error instanceof EntryError && error.code === 'too_large' ? 'size' : 'zip',
        });
      }
    } else images.push(file);
  }
  for (const [index, file] of images.entries()) {
    if (result.files.length >= BATCH_MAX) {
      result.refused.push({ name: file.name, why: 'too_many' });
      continue;
    }
    try {
      const sniffed = await checkImageFile(file, file.name);
      const sha256 = await sha256Hex(await blobBytes(file));
      const key = `b${index}-${sha256.slice(0, 12)}`;
      result.files.push({
        key,
        file,
        image: { key, name: file.name, lastModified: Number.isFinite(file.lastModified) && file.lastModified > 0 ? file.lastModified : null, sha256, width: sniffed.width, height: sniffed.height },
      });
    } catch (error) {
      result.refused.push({ name: file.name, why: error instanceof IntakeError ? error.why : 'decode' });
    }
  }
  return result;
}
