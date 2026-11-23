import { describe, expect, it } from 'vitest';

import { ALL_KEYS } from '../i18n/strings';

import {
  CONFIDENCE_META,
  PROVENANCE_META,
  UNAVAILABLE_LABEL_KEY,
  derived,
  isUnavailable,
  observed,
  unavailable,
  type Provenance,
} from '../models/provenance';
import { TIMEFRAME_PRESETS, formatBytes, formatMicros, formatNanos, resolveRelative } from '../utils/time';

const evidence = {
  queryId: 'test.query',
  source: 'coverage',
  timeframe: 'last 24 hours',
};

describe('provenance model', () => {
  it('describes every provenance value, so no badge can render without a label', () => {
    const all: Provenance[] = [
      'observed',
      'derived',
      'partial',
      'platform-estimate',
      'projection',
      'recommendation',
      'hypothesis',
      'not-configured',
      'no-telemetry',
      'no-permission',
      'loading',
      'failed',
    ];
    for (const provenance of all) {
      // Keys, not text: the badge translates them, so both must resolve.
      expect(ALL_KEYS, provenance).toContain(PROVENANCE_META[provenance].labelKey);
      expect(ALL_KEYS, provenance).toContain(PROVENANCE_META[provenance].descriptionKey);
    }
  });

  it('describes every confidence level', () => {
    for (const level of ['high', 'medium', 'low'] as const) {
      expect(ALL_KEYS, level).toContain(CONFIDENCE_META[level].labelKey);
      expect(ALL_KEYS, level).toContain(CONFIDENCE_META[level].descriptionKey);
    }
  });

  it('treats every unavailable provenance as unavailable', () => {
    for (const provenance of ['not-configured', 'no-telemetry', 'no-permission', 'loading', 'failed'] as const) {
      expect(isUnavailable(unavailable(provenance)), provenance).toBe(true);
      expect(ALL_KEYS, provenance).toContain(UNAVAILABLE_LABEL_KEY[provenance]);
    }
  });

  it('treats a null value as unavailable even when the provenance claims otherwise', () => {
    expect(isUnavailable({ value: null, provenance: 'observed', confidence: 'high' })).toBe(true);
  });

  it('does not treat a measured zero as unavailable', () => {
    expect(isUnavailable(observed(0, evidence))).toBe(false);
  });

  it('attaches evidence to observed facts', () => {
    const fact = observed(67, evidence);
    expect(fact.provenance).toBe('observed');
    expect(fact.evidence?.queryId).toBe('test.query');
    expect(fact.confidence).toBe('high');
  });

  it('requires derived facts to state the calculation performed', () => {
    const fact = derived('9.74', evidence, 'failures divided by requests', { unit: '%' });
    expect(fact.provenance).toBe('derived');
    expect(fact.note).toContain('divided by');
    expect(fact.unit).toBe('%');
  });

  it('records what would have to change for an unavailable fact to become available', () => {
    const fact = unavailable('no-permission', 'Requires storage:security.events:read.');
    expect(fact.requirement).toContain('storage:security.events:read');
    expect(fact.value).toBeNull();
  });
});

describe('resolveRelative', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');

  it('resolves each supported unit', () => {
    expect(resolveRelative('now-30m', 'x', now).startIso).toBe('2026-08-31T11:30:00.000Z');
    expect(resolveRelative('now-6h', 'x', now).startIso).toBe('2026-08-31T06:00:00.000Z');
    expect(resolveRelative('now-7d', 'x', now).startIso).toBe('2026-08-24T12:00:00.000Z');
    expect(resolveRelative('now-1w', 'x', now).startIso).toBe('2026-08-24T12:00:00.000Z');
  });

  it('anchors the end of the window to the reference instant', () => {
    expect(resolveRelative('now-1h', 'x', now).endIso).toBe('2026-08-31T12:00:00.000Z');
  });

  it('throws rather than silently widening an unrecognised expression', () => {
    expect(() => resolveRelative('last week', 'x', now)).toThrow(/Unsupported relative timeframe/);
    expect(() => resolveRelative('now+1h', 'x', now)).toThrow();
    expect(() => resolveRelative('now-0d', 'x', now)).toThrow(/positive amount/);
  });

  it('resolves every preset the app offers', () => {
    for (const preset of TIMEFRAME_PRESETS) {
      expect(() => resolveRelative(preset.expression, preset.labelKey, now)).not.toThrow();
    }
  });
});

describe('unit formatting', () => {
  it('formats nanosecond durations, the unit Grail uses for event durations', () => {
    // 1380000000000 ns is the resolved duration observed on a real problem record.
    expect(formatNanos(1_380_000_000_000)).toBe('23.0 min');
    expect(formatNanos(11_958_300_000)).toBe('12.0 s');
    expect(formatNanos(500_000)).toBe('1 ms');
    expect(formatNanos(null)).toBe('—');
  });

  it('formats microsecond durations, the unit of the service response-time metric', () => {
    expect(formatMicros(793.5)).toBe('1 ms');
    expect(formatMicros(1_477_307)).toBe('1.5 s');
    expect(formatMicros(null)).toBe('—');
  });

  it('formats bytes in decimal units, matching how Grail reports billed bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    // Above 100 in the scaled unit the fraction stops carrying information,
    // so the formatter drops it.
    expect(formatBytes(469_784_341)).toBe('470 MB');
    expect(formatBytes(65_792_362_369)).toBe('65.8 GB');
    expect(formatBytes(6_341_125_968_965)).toBe('6.3 TB');
    expect(formatBytes(null)).toBe('—');
  });

  it('distinguishes zero bytes from unknown bytes', () => {
    expect(formatBytes(0)).not.toBe(formatBytes(null));
  });
});
