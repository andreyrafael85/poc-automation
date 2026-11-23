import { describe, expect, it } from 'vitest';

import { bool, formatRatio, list, num, parseTechnology, ratio, str } from '../utils/records';

/**
 * These accessors exist because Grail delivers 64-bit numbers as strings, absent
 * attributes as null, and multi-valued attributes as arrays.
 *
 * The central rule under test: an absent value must never become a zero. A
 * dashboard that renders "0 problems" when it actually failed to read the field
 * is worse than one that renders nothing.
 */

describe('num', () => {
  it('parses the string-encoded counts Grail returns for 64-bit fields', () => {
    expect(num({ value: '67' }, 'value')).toBe(67);
    expect(num({ value: '16325848504' }, 'value')).toBe(16325848504);
  });

  it('passes through real numbers', () => {
    expect(num({ pct: 9.74498895872261 }, 'pct')).toBeCloseTo(9.745, 3);
  });

  it('returns null rather than zero for absent, empty or unparseable values', () => {
    expect(num({}, 'missing')).toBeNull();
    expect(num({ value: null }, 'value')).toBeNull();
    expect(num({ value: '' }, 'value')).toBeNull();
    expect(num({ value: 'not a number' }, 'value')).toBeNull();
    expect(num(undefined, 'value')).toBeNull();
  });

  it('distinguishes a measured zero from a missing value', () => {
    expect(num({ value: '0' }, 'value')).toBe(0);
    expect(num({ value: null }, 'value')).toBeNull();
  });

  it('rejects non-finite numbers, which would render as NaN', () => {
    expect(num({ value: Number.NaN }, 'value')).toBeNull();
    expect(num({ value: Number.POSITIVE_INFINITY }, 'value')).toBeNull();
  });
});

describe('str', () => {
  it('normalises blank and whitespace-only values to null', () => {
    expect(str({ name: '   ' }, 'name')).toBeNull();
    expect(str({ name: '' }, 'name')).toBeNull();
    expect(str({ name: '  svc-a  ' }, 'name')).toBe('svc-a');
  });

  it('returns null for absent attributes so callers can label them explicitly', () => {
    expect(str({ cloudType: null }, 'cloudType')).toBeNull();
  });
});

describe('bool', () => {
  it('handles both real booleans and their string encodings', () => {
    expect(bool({ hasAccess: true }, 'hasAccess')).toBe(true);
    expect(bool({ hasAccess: 'false' }, 'hasAccess')).toBe(false);
  });

  it('returns null when unknown, so "unknown" is not treated as "false"', () => {
    expect(bool({}, 'hasAccess')).toBeNull();
    expect(bool({ hasAccess: 'maybe' }, 'hasAccess')).toBeNull();
  });
});

describe('list', () => {
  it('reads array attributes as delivered', () => {
    expect(list({ names: ['a', 'b'] }, 'names')).toEqual(['a', 'b']);
  });

  it('normalises a single value into a one-element list', () => {
    expect(list({ names: 'only' }, 'names')).toEqual(['only']);
  });

  it('drops null and empty entries inside arrays', () => {
    expect(list({ names: ['a', null, '', 'b'] }, 'names')).toEqual(['a', 'b']);
  });

  it('returns an empty list for absent attributes', () => {
    expect(list({}, 'names')).toEqual([]);
    expect(list({ names: null }, 'names')).toEqual([]);
  });
});

describe('parseTechnology', () => {
  it('parses the encoding used by softwareTechnologies', () => {
    expect(parseTechnology('type:SPRING,edition:Spring Boot,version:3.2.0')).toEqual({
      type: 'SPRING',
      edition: 'Spring Boot',
      version: '3.2.0',
    });
  });

  it('treats the literal "null" segment as not reported, not as the text null', () => {
    expect(parseTechnology('type:GO,edition:null,version:null')).toEqual({
      type: 'GO',
      edition: null,
      version: null,
    });
  });

  it('keeps versions that contain separators', () => {
    expect(parseTechnology('type:JAVA,edition:null,version:1.8.0_292')?.version).toBe('1.8.0_292');
  });

  it('returns null when there is no usable type', () => {
    expect(parseTechnology(null)).toBeNull();
    expect(parseTechnology('type:null,edition:null,version:null')).toBeNull();
  });
});

describe('ratio', () => {
  it('carries the denominator alongside the percentage', () => {
    const result = ratio(153, 1594208);
    expect(result?.percent).toBeCloseTo(0.0096, 4);
    expect(result?.denominator).toBe(1594208);
  });

  it('refuses to divide by zero rather than returning a misleading 0%', () => {
    expect(ratio(5, 0)).toBeNull();
  });

  it('returns null when either side is unknown', () => {
    expect(ratio(null, 100)).toBeNull();
    expect(ratio(5, null)).toBeNull();
  });
});

describe('formatRatio', () => {
  it('never shows a percentage without its denominator', () => {
    const formatted = formatRatio(ratio(153, 1594208), 2);
    expect(formatted).toContain('%');
    expect(formatted).toContain('1,594,208');
  });

  it('renders an em dash for an unavailable ratio', () => {
    expect(formatRatio(null)).toBe('—');
  });

  it('formats with the active locale: decimal comma, dotted thousands and a translated "of"', () => {
    const ptBR = {
      decimal: (value: number, digits: number) =>
        value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }),
      count: (value: number) => value.toLocaleString('pt-BR'),
      of: 'de',
    };
    expect(formatRatio(ratio(153, 1594208), 2, ptBR)).toBe('0,01% (153 de 1.594.208)');
  });
});
