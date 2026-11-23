/**
 * What an image really is, read from its bytes (3.2.7, real prints).
 *
 * A file's name and its declared type are whatever the SE's machine or a ZIP says; the deck only
 * takes PNG, JPEG or WebP whose real dimensions it has read itself — an SVG or a GIF renamed to
 * `.png` is refused, and a companion manifest that claims 1720×1080 for a HiDPI 3440×2160 capture is
 * caught here. The SHA-256 binds an approval and a companion manifest to the exact bytes.
 *
 * jsdom's `Blob` has no `arrayBuffer()`, and the platform's has; `blobBytes` reads through
 * `FileReader` when it must, so the same code runs in the browser and in the unit tests.
 */

export type SniffedMime = 'image/png' | 'image/jpeg' | 'image/webp';

export interface SniffedImage {
  mime: SniffedMime;
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const u16be = (bytes: Uint8Array, at: number) => ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
const u32be = (bytes: Uint8Array, at: number) => (((bytes[at] ?? 0) << 24) | ((bytes[at + 1] ?? 0) << 16) | ((bytes[at + 2] ?? 0) << 8) | (bytes[at + 3] ?? 0)) >>> 0;
const u16le = (bytes: Uint8Array, at: number) => (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
const u24le = (bytes: Uint8Array, at: number) => (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16);
const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

function sniffPng(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 24 || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) return null;
  // The first chunk must be IHDR: length 13, then width and height (big-endian).
  if (u32be(bytes, 8) !== 13 || ascii(bytes, 12, 4) !== 'IHDR') return null;
  return { mime: 'image/png', width: u32be(bytes, 16), height: u32be(bytes, 20) };
}

/** JPEG: the first frame header (SOF0…SOF15, not DHT/JPG/DAC), walking the marker segments. */
function sniffJpeg(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1] ?? 0;
    if (marker === 0xff) {
      at += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2; // standalone markers
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end of image / scan before any frame header
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { mime: 'image/jpeg', height: u16be(bytes, at + 5), width: u16be(bytes, at + 7) };
    }
    const length = u16be(bytes, at + 2);
    if (length < 2) return null;
    at += 2 + length;
  }
  return null;
}

/** WebP: lossy (`VP8 `), lossless (`VP8L`) or extended (`VP8X`) first chunk. */
function sniffWebp(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return null;
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8 ') {
    // Frame tag (3 bytes) at 20, then the start code 9d 01 2a, then 14-bit width and height.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { mime: 'image/webp', width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return null;
    const bits = ((bytes[21] ?? 0) | ((bytes[22] ?? 0) << 8) | ((bytes[23] ?? 0) << 16) | ((bytes[24] ?? 0) << 24)) >>> 0;
    return { mime: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') return { mime: 'image/webp', width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1 };
  return null;
}

/** The real type and size of an image from its first bytes; null for anything else (SVG, GIF, HTML, a truncated file). */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const found = sniffPng(bytes) ?? sniffJpeg(bytes) ?? sniffWebp(bytes);
  if (found === null || !(found.width > 0) || !(found.height > 0)) return null;
  return found;
}

const EOI = Uint8Array.of(0xff, 0xd9);

/** APP0 `JFIF\0` with its thumbnail fields zeroed (a JFIF thumbnail is a picture of the original). */
function jfifWithoutThumbnail(bytes: Uint8Array, at: number, length: number): Uint8Array | null {
  if (length < 16 || ascii(bytes, at + 4, 5) !== 'JFIF\0') return null;
  if (length === 16 && bytes[at + 16] === 0 && bytes[at + 17] === 0) return bytes.subarray(at, at + 18);
  const out = bytes.slice(at, at + 18);
  out[2] = 0; // length 16: identifier, version, units, density, no thumbnail
  out[3] = 16;
  out[16] = 0;
  out[17] = 0;
  return out;
}

/**
 * A JPEG without its metadata (3.2.7 review PS-3), before it is stored or placed in a deck.
 *
 * Kept — what draws the picture as it was seen: SOI, APP0 `JFIF` (its thumbnail dropped), the ICC
 * colour profile (APP2 `ICC_PROFILE`; Chromium's own encoder writes an sRGB one into every canvas
 * and screenshot JPEG), APP14 `Adobe` (12 fixed bytes that decide the colour transform), the frame,
 * tables and restart interval (SOFn, DHT, DAC, DQT, DRI, DNL, DHP, EXP), every scan with its
 * entropy-coded data, and EOI. Dropped: EXIF and XMP (APP1), every other APPn (Photoshop blocks,
 * FlashPix and MPF previews, JFXX thumbnails…), comments (COM), the JPEG extension markers and
 * anything after EOI — an SE who redacted a screenshot in another editor and saved it at exactly
 * 1720×1080 would otherwise hand the customer its EXIF thumbnail of the unredacted original, the
 * author or the file's path.
 *
 * The input itself when nothing had to go (same bytes, same SHA-256); null when the bytes are not
 * a JPEG this walk understands — the caller then re-encodes through the canvas, which writes none of it.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let scanned = false;
  let at = 2;
  for (;;) {
    if (at >= bytes.length) {
      // Data ended inside a scan: close the image, nothing follows it.
      if (!scanned) return null;
      parts.push(EOI);
      break;
    }
    if (at + 1 >= bytes.length || bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1] ?? 0;
    if (marker === 0xff) {
      at += 1; // fill byte
      continue;
    }
    if (marker === 0xd9) {
      if (!scanned) return null;
      parts.push(EOI); // anything after EOI is dropped
      break;
    }
    if (marker === 0x01) {
      at += 2; // TEM: carries nothing
      continue;
    }
    if (marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) return null; // not where a segment starts
    const length = u16be(bytes, at + 2);
    const end = at + 2 + length;
    if (length < 2 || end > bytes.length) return null;
    if (marker === 0xda) {
      // SOS: the segment, then its entropy-coded data up to the next marker (FF00 is a stuffed byte, FFD0–FFD7 a restart).
      let next = end;
      while (next < bytes.length) {
        if (bytes[next] !== 0xff) {
          next += 1;
          continue;
        }
        const after = bytes[next + 1];
        if (after === 0x00 || after === 0xff || (after !== undefined && after >= 0xd0 && after <= 0xd7)) {
          next += after === 0xff ? 1 : 2;
          continue;
        }
        break;
      }
      parts.push(bytes.subarray(at, next));
      scanned = true;
      at = next;
      continue;
    }
    if (marker === 0xe0) {
      const jfif = jfifWithoutThumbnail(bytes, at, length);
      if (jfif !== null) parts.push(jfif);
    } else if (marker === 0xee) {
      if (length === 14 && ascii(bytes, at + 4, 5) === 'Adobe') parts.push(bytes.subarray(at, end));
    } else if (marker === 0xe2) {
      if (length >= 16 && ascii(bytes, at + 4, 12) === 'ICC_PROFILE\0') parts.push(bytes.subarray(at, end));
    } else if ((marker >= 0xc0 && marker <= 0xcf) || (marker >= 0xdb && marker <= 0xdf)) {
      parts.push(bytes.subarray(at, end));
    }
    // APP1–APP15, COM (FE) and the JPGn extensions (F0–FD) are left out.
    at = end;
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  if (total === bytes.length) return bytes;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** SHA-256 as lower-case hex, through `crypto.subtle` (AppEngine pages are a secure context). */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new Error('crypto.subtle is not available in this context');
  // A fresh copy: a view of a larger buffer (or one from another realm) hashes exactly its own bytes.
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  return hex(await subtle.digest('SHA-256', view.slice()));
}

/** SHA-256 of a UTF-8 text (mask and focus hashes). */
export async function sha256Text(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text));
}

/** The bytes of a Blob or File: `arrayBuffer()` when the platform has it, else `FileReader`. */
export async function blobBytes(blob: Blob): Promise<Uint8Array> {
  const withBuffer = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof withBuffer.arrayBuffer === 'function') return new Uint8Array(await withBuffer.arrayBuffer());
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('the file could not be read'));
    reader.readAsArrayBuffer(blob);
  });
}

/** A `data:` URL of a Blob (the deck embeds baked prints this way). */
export async function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('the image could not be read')));
    reader.onerror = () => reject(reader.error ?? new Error('the image could not be read'));
    reader.readAsDataURL(blob);
  });
}

/** A JPEG Blob over these bytes (a copy, so the caller's buffer can be reused). */
export function jpegBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes.slice()], { type: 'image/jpeg' });
}
