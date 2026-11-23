/**
 * Customer logo validation.
 *
 * The logo is uploaded by the operator and rendered inside the app and the
 * printable report. That makes it user-supplied content displayed as markup, so
 * it needs a real gate rather than a courtesy check.
 *
 * Kept free of browser APIs so it can be unit tested directly.
 */

/**
 * Raster formats only.
 *
 * SVG is deliberately excluded. An SVG is XML that can carry `<script>` and
 * event handlers, and rendering an untrusted one inline is a cross-site
 * scripting vector. Refusing it costs the operator one conversion step and
 * removes the whole class of risk.
 */
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * 256 kB. The logo lives in memory and is inlined into the printable report as a
 * data URL, so an oversized file degrades both. Any real logo fits comfortably.
 */
export const MAX_LOGO_BYTES = 256 * 1024;

export type LogoValidation = { ok: true } | { ok: false; reason: string };

export interface LogoCandidate {
  type: string;
  size: number;
  name?: string;
}

export function validateLogo(file: LogoCandidate): LogoValidation {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name ?? '')) {
    return {
      ok: false,
      reason:
        'SVG is not accepted, because an SVG file can contain script and this logo is rendered as markup. Export the logo as PNG and upload that.',
    };
  }

  if (!ALLOWED_LOGO_TYPES.includes(file.type as (typeof ALLOWED_LOGO_TYPES)[number])) {
    return {
      ok: false,
      reason: `Unsupported format "${file.type || 'unknown'}". Use PNG, JPEG or WebP.`,
    };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      reason: `The file is ${Math.round(file.size / 1024)} kB. Keep it under ${MAX_LOGO_BYTES / 1024} kB so it stays light in the report.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, reason: 'The file is empty.' };
  }

  return { ok: true };
}

/**
 * Confirms a string really is a raster image data URL before it is placed in an
 * `img` src. Guards against a crafted value reaching the DOM.
 */
export function isSafeImageDataUrl(value: string | null): boolean {
  if (value === null) return false;
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
