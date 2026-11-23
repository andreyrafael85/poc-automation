import { LIMITS } from '../constants';

/**
 * Reads a ZIP's directory before anything is extracted (3.2.7, real prints).
 *
 * A companion ZIP comes from a machine the app does not control, and the images document comes
 * back from the tenant; either could be a crafted archive. Before JSZip touches a byte, the end
 * record and the central directory are read here and the archive is refused unless every entry
 * has an expected name (no `..`, no absolute path, no surprise file), a plausible size, a method
 * the browser can read (store or deflate; store only for the images document), no encryption and no ZIP64 — and the entries neither
 * overlap nor run past the directory (the shape of a ZIP bomb). Pure: it reads the bytes only.
 */

export interface ZipEntryInfo {
  name: string;
  method: 0 | 8;
  compressed: number;
  uncompressed: number;
  /** Offset of the entry's local header. */
  offset: number;
}

export type ZipRefusal = 'not_zip' | 'too_many' | 'bad_name' | 'too_large' | 'bad_method' | 'zip64';

export type ZipInspection = { ok: true; entries: ZipEntryInfo[] } | { ok: false; reason: ZipRefusal };

/** A companion ZIP: the manifest and `shots/NN_<shot id>.jpg` (the companion's own file names). */
export const ZIP_NAME = /^(manifest\.json|shots\/\d{2}_[a-z0-9][a-z0-9_-]{0,63}\.jpe?g)$/;

/** A print's id: `pr-` and 16 hex; it also names the master in the images document. */
export const PRINT_ID = /^pr-[0-9a-f]{16}$/;

/** The images document: `img/<printId>.<sha8>.jpg`. */
export const IMAGES_ZIP_NAME = /^img\/pr-[0-9a-f]{16}\.[0-9a-f]{8}\.jpg$/;

export interface ZipRules {
  /** Allowed entry names. */
  names: RegExp;
  maxEntries: number;
  /** The whole archive. */
  maxBytes: number;
  /** One entry, uncompressed. */
  maxEntryBytes: number;
  /** Per-name override of `maxEntryBytes` (the manifest is far smaller than an image). */
  maxBytesFor?: (name: string) => number;
  /** Compression methods accepted (default: store and deflate). */
  methods?: readonly (0 | 8)[];
  /**
   * Names are decoded as UTF-8 (3.3.2, the batch's loose ZIPs: "Captura de Tela … às 10.22.33.png"
   * and the narrow space macOS puts before "PM"); the default reads printable ASCII only.
   */
  utf8Names?: boolean;
  /**
   * An entry whose name fails the rules is left out instead of refusing the archive (loose ZIPs:
   * a `__MACOSX/` resource fork or an odd name must not throw away the screenshots beside it).
   */
  skipBadNames?: boolean;
  /** A name that refuses the whole archive even with `skipBadNames` (a path that climbs out, or an absolute one). */
  forbidden?: RegExp;
}

/** The rules of a companion ZIP (spec §2.7 import step 1). */
export const COMPANION_ZIP_RULES: ZipRules = {
  names: ZIP_NAME,
  maxEntries: LIMITS.zipEntries,
  maxBytes: LIMITS.zipBytes,
  maxEntryBytes: LIMITS.imageBytesIn,
  maxBytesFor: (name) => (name === 'manifest.json' ? LIMITS.manifestBytes : LIMITS.imageBytesIn),
};

/**
 * The rules of the images document read back from the tenant (≤ 16 masters, ≤ 45 MB). The app
 * writes it STORE only (`printStore.imagesZip`), so a deflated entry is refused: its declared size
 * would be all that bounds what JSZip inflates (3.2.7 review PS-6).
 */
export const IMAGES_ZIP_RULES: ZipRules = {
  names: IMAGES_ZIP_NAME,
  maxEntries: LIMITS.prints,
  maxBytes: LIMITS.docHardBytes,
  maxEntryBytes: LIMITS.imageBytesIn,
  methods: [0],
};

/**
 * A ZIP of loose screenshots for the batch import (3.3.2): any printable ASCII path without `..`,
 * a leading slash or a backslash; folders, `__MACOSX/` and dot files are skipped by the reader, and
 * only PNG, JPEG and WebP entries are read. Same caps as the companion's ZIP.
 */
// eslint-disable-next-line no-control-regex -- control characters are what this pattern refuses
export const LOOSE_ZIP_NAME = /^(?![/\\])(?!.*(?:^|\/)\.\.(?:\/|$))[^\u0000-\u001f\u007f\\]{1,255}$/u;

export const LOOSE_ZIP_RULES: ZipRules = {
  names: LOOSE_ZIP_NAME,
  // Folders and `__MACOSX/._*` forks count as entries: room for a batch of 16 screenshots with both.
  maxEntries: 200,
  maxBytes: LIMITS.zipBytes,
  maxEntryBytes: LIMITS.imageBytesIn,
  utf8Names: true,
  skipBadNames: true,
  forbidden: /^[/\\]|(?:^|[/\\])\.\.(?:[/\\]|$)/,
};

const EOCD = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const EOCD_SIZE = 22;
const CENTRAL_SIZE = 46;
const LOCAL_SIZE = 30;
const MAX_COMMENT = 0xffff;

const u16 = (bytes: Uint8Array, at: number) => (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
const u32 = (bytes: Uint8Array, at: number) => ((bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16) | ((bytes[at + 3] ?? 0) << 24)) >>> 0;

/** The end-of-central-directory record: the last signature whose comment runs exactly to the end. */
function findEnd(bytes: Uint8Array): number | null {
  const last = bytes.length - EOCD_SIZE;
  const first = Math.max(0, last - MAX_COMMENT);
  for (let at = last; at >= first; at -= 1) {
    if (u32(bytes, at) === EOCD && at + EOCD_SIZE + u16(bytes, at + 20) === bytes.length) return at;
  }
  return null;
}

/** Entry names are ASCII by the rules above; anything else (or a NUL) can never match them. */
/** A name as UTF-8 (strict: a malformed sequence is no name at all), with no NUL or control character. */
function utf8NameOf(bytes: Uint8Array, at: number, length: number): string | null {
  try {
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(at, at + length));
    // eslint-disable-next-line no-control-regex -- refusing control characters in a ZIP entry name is the point
    return /[\u0000-\u001f\u007f]/.test(name) ? null : name;
  } catch {
    return null;
  }
}

function nameOf(bytes: Uint8Array, at: number, length: number): string | null {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const code = bytes[at + i] ?? 0;
    if (code === 0 || code > 0x7e) return null;
    out += String.fromCharCode(code);
  }
  return out;
}

/**
 * The entries of a ZIP, or why it is refused. Sizes come from the central directory and are
 * checked against the archive itself: a stored entry must say the same size twice, every entry's
 * data must lie before the directory and after the previous entry's, and the sum of what would be
 * extracted is capped like the archive.
 */
export function inspectZipDirectory(bytes: Uint8Array, rules: ZipRules = COMPANION_ZIP_RULES): ZipInspection {
  const refuse = (reason: ZipRefusal): ZipInspection => ({ ok: false, reason });
  if (bytes.length > rules.maxBytes) return refuse('too_large');
  if (bytes.length < EOCD_SIZE) return refuse('not_zip');
  const end = findEnd(bytes);
  if (end === null) return refuse('not_zip');
  if (end >= 20 && u32(bytes, end - 20) === ZIP64_LOCATOR) return refuse('zip64');
  const disk = u16(bytes, end + 4);
  const directoryDisk = u16(bytes, end + 6);
  const onDisk = u16(bytes, end + 8);
  const total = u16(bytes, end + 10);
  const size = u32(bytes, end + 12);
  const offset = u32(bytes, end + 16);
  if (total === 0xffff || onDisk === 0xffff || size === 0xffffffff || offset === 0xffffffff) return refuse('zip64');
  if (disk !== 0 || directoryDisk !== 0 || onDisk !== total) return refuse('not_zip');
  if (total > rules.maxEntries) return refuse('too_many');
  if (offset + size > end) return refuse('not_zip');

  const entries: ZipEntryInfo[] = [];
  const seen = new Set<string>();
  let at = offset;
  let extracted = 0;
  for (let index = 0; index < total; index += 1) {
    if (at + CENTRAL_SIZE > offset + size || u32(bytes, at) !== CENTRAL) return refuse('not_zip');
    const flags = u16(bytes, at + 8);
    const method = u16(bytes, at + 10);
    const compressed = u32(bytes, at + 20);
    const uncompressed = u32(bytes, at + 24);
    const nameLength = u16(bytes, at + 28);
    const extraLength = u16(bytes, at + 30);
    const commentLength = u16(bytes, at + 32);
    const local = u32(bytes, at + 42);
    const next = at + CENTRAL_SIZE + nameLength + extraLength + commentLength;
    if (next > offset + size) return refuse('not_zip');
    if (compressed === 0xffffffff || uncompressed === 0xffffffff || local === 0xffffffff) return refuse('zip64');
    const name = (rules.utf8Names === true ? utf8NameOf : nameOf)(bytes, at + CENTRAL_SIZE, nameLength);
    if (name !== null && rules.forbidden?.test(name) === true) return refuse('bad_name');
    if (name === null || !rules.names.test(name) || seen.has(name)) {
      if (rules.skipBadNames !== true) return refuse('bad_name');
      at = next;
      continue;
    }
    seen.add(name);
    if ((flags & 0x1) !== 0 || (method !== 0 && method !== 8) || !(rules.methods ?? [0, 8]).includes(method)) return refuse('bad_method');
    const cap = rules.maxBytesFor?.(name) ?? rules.maxEntryBytes;
    if (uncompressed > cap || (method === 0 && compressed !== uncompressed)) return refuse('too_large');
    extracted += uncompressed;
    if (extracted > rules.maxBytes) return refuse('too_large');
    entries.push({ name, method, compressed, uncompressed, offset: local });
    at = next;
  }

  // Each entry's local header and data lie before the directory, one after the other, never shared.
  let floor = 0;
  for (const entry of [...entries].sort((a, b) => a.offset - b.offset)) {
    if (entry.offset < floor || entry.offset + LOCAL_SIZE > offset || u32(bytes, entry.offset) !== LOCAL) return refuse('not_zip');
    const dataStart = entry.offset + LOCAL_SIZE + u16(bytes, entry.offset + 26) + u16(bytes, entry.offset + 28);
    const dataEnd = dataStart + entry.compressed;
    if (dataEnd > offset) return refuse('too_large');
    floor = dataEnd;
  }
  return { ok: true, entries };
}

/** The 22-byte ZIP with no entries: the images document's tombstone (a document's content must be > 0 bytes). */
export function emptyZip(): Uint8Array {
  const bytes = new Uint8Array(EOCD_SIZE);
  bytes.set([0x50, 0x4b, 0x05, 0x06]);
  return bytes;
}
