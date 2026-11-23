/**
 * The only place the real-prints feature touches pixels (3.2.7): decode an image, draw on a
 * canvas, encode a JPEG or PNG.
 *
 * Everything that decides *what* to draw — the crop, the fit, the masks, the bake ladder, the nav
 * edge — is pure and lives next to its caller (`normalize.ts`, `bake.ts`). This file is the thin
 * browser half: `createImageBitmap` to decode, an `OffscreenCanvas` (else a `<canvas>`) to draw,
 * `convertToBlob`/`toBlob` to encode. jsdom has none of them, so the unit tests replace this module
 * with a recording fake (`vi.mock`) and assert on the calls.
 */

/** A decoded image: its size, and the handle a surface can draw. Call `close()` when done. */
export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close(): void;
}

/** The drawing calls the feature uses — a subset of both 2D contexts. */
export interface Surface {
  width: number;
  height: number;
  fillRect(x: number, y: number, w: number, h: number, color: string): void;
  drawImage(image: DecodedImage, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  /** Luminance (0..255) of every pixel, row by row (for the nav edge). */
  gray(): Uint8ClampedArray;
  /** The RGB of one row, `[r, g, b, r, g, b, …]` (for the padding colour). */
  row(y: number): Uint8ClampedArray;
  encode(type: 'image/jpeg' | 'image/png', quality?: number): Promise<Blob>;
  /** 3.5.5: the width of a text in a CSS font (for the screen reading's templates). */
  measureText(text: string, font: string): number;
  /** 3.5.5: draws a text with its top at y (for the screen reading's templates). */
  fillText(text: string, x: number, y: number, font: string, color: string): void;
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** True when this browser can decode and draw images (the manual path needs it; the companion path does not). */
export function hasRaster(): boolean {
  return typeof globalThis.createImageBitmap === 'function' && (typeof globalThis.OffscreenCanvas === 'function' || typeof document !== 'undefined');
}

/** Decodes a PNG/JPEG/WebP Blob (`createImageBitmap`, EXIF orientation applied by the browser). */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof globalThis.createImageBitmap !== 'function') throw new Error('createImageBitmap is not available');
  const bitmap = await globalThis.createImageBitmap(blob);
  return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
}

function canvasOf(width: number, height: number): { ctx: Context2D; encode: Surface['encode'] } {
  if (typeof globalThis.OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('2D canvas is not available');
    return { ctx, encode: (type, quality) => canvas.convertToBlob({ type, ...(quality === undefined ? {} : { quality }) }) };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('2D canvas is not available');
  return {
    ctx,
    encode: (type, quality) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob === null ? reject(new Error('the image could not be encoded')) : resolve(blob)), type, quality);
      }),
  };
}

/** A blank drawing surface of this size. */
export function newSurface(width: number, height: number): Surface {
  const { ctx, encode } = canvasOf(width, height);
  return {
    width,
    height,
    fillRect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    },
    drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image.source, sx, sy, sw, sh, dx, dy, dw, dh);
    },
    gray() {
      const { data } = ctx.getImageData(0, 0, width, height);
      const out = new Uint8ClampedArray(width * height);
      for (let i = 0, p = 0; p < out.length; i += 4, p += 1) out[p] = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
      return out;
    },
    row(y) {
      const { data } = ctx.getImageData(0, Math.max(0, Math.min(height - 1, y)), width, 1);
      const out = new Uint8ClampedArray(width * 3);
      for (let i = 0, p = 0; p < out.length; i += 4, p += 3) {
        out[p] = data[i] ?? 0;
        out[p + 1] = data[i + 1] ?? 0;
        out[p + 2] = data[i + 2] ?? 0;
      }
      return out;
    },
    encode,
    measureText(text, font) {
      ctx.font = font;
      return ctx.measureText(text).width;
    },
    fillText(text, x, y, font, color) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      ctx.fillText(text, x, y);
    },
  };
}
