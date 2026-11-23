import { describe, expect, it } from 'vitest';

import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_BYTES,
  isSafeImageDataUrl,
  validateLogo,
} from '../utils/logo';

/**
 * The customer logo is user-supplied content rendered as markup, so it gets a
 * real gate rather than a courtesy check.
 *
 * The rule that matters most: SVG is refused. An SVG is XML that can carry
 * script, and this app renders the uploaded value in an `img` tag inside a page
 * shown to a customer.
 */

describe('validateLogo', () => {
  it('accepts every format the app claims to support', () => {
    for (const type of ALLOWED_LOGO_TYPES) {
      expect(validateLogo({ type, size: 20_000 }).ok, type).toBe(true);
    }
  });

  it('refuses SVG by MIME type and explains why', () => {
    const result = validateLogo({ type: 'image/svg+xml', size: 1_000 });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toMatch(/can contain script/);
  });

  it('refuses SVG by extension even when the MIME type is disguised', () => {
    // A file can be served as image/png while actually being SVG, so the
    // extension is checked as well.
    const result = validateLogo({ type: 'image/png', size: 1_000, name: 'brand.SVG' });
    expect(result.ok).toBe(false);
  });

  it('refuses other formats outright', () => {
    for (const type of ['application/pdf', 'text/html', 'image/gif', '']) {
      expect(validateLogo({ type, size: 1_000 }).ok, type).toBe(false);
    }
  });

  it('refuses a file above the size ceiling and states the limit', () => {
    const result = validateLogo({ type: 'image/png', size: MAX_LOGO_BYTES + 1 });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toContain(String(MAX_LOGO_BYTES / 1024));
  });

  it('accepts a file exactly at the ceiling', () => {
    expect(validateLogo({ type: 'image/png', size: MAX_LOGO_BYTES }).ok).toBe(true);
  });

  it('refuses an empty file', () => {
    expect(validateLogo({ type: 'image/png', size: 0 }).ok).toBe(false);
  });
});

describe('isSafeImageDataUrl', () => {
  it('accepts base64 raster data URLs', () => {
    expect(isSafeImageDataUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBe(true);
    expect(isSafeImageDataUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
    expect(isSafeImageDataUrl('data:image/webp;base64,UklGRh4AAABXRUJQ')).toBe(true);
  });

  it('rejects an SVG data URL, which is the vector that matters', () => {
    expect(
      isSafeImageDataUrl('data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pjwvc2NyaXB0Pjwvc3ZnPg=='),
    ).toBe(false);
  });

  it('rejects non-base64 and script-bearing URLs', () => {
    expect(isSafeImageDataUrl('data:image/svg+xml,<svg onload="alert(1)"/>')).toBe(false);
    expect(isSafeImageDataUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageDataUrl('https://example.com/logo.png')).toBe(false);
    expect(isSafeImageDataUrl('data:text/html;base64,PGgxPmhpPC9oMT4=')).toBe(false);
  });

  it('rejects null, so an absent logo never reaches an img src', () => {
    expect(isSafeImageDataUrl(null)).toBe(false);
  });

  it('rejects a data URL whose payload contains characters outside base64', () => {
    expect(isSafeImageDataUrl('data:image/png;base64,abc<>def')).toBe(false);
  });
});
