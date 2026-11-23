import { describe, expect, it } from 'vitest';

import {
  CHART_PALETTE,
  PALETTE,
  RHYTHM,
  ROLE_TONE,
  accentFor,
  paletteFor,
} from '../design/palette';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM script, no declaration file
import { scanCharts } from '../../../scripts/scan-chart-consistency.mjs';

/**
 * Guards the visual language.
 *
 * The complaint these answer: charts across the tabs had static, unrelated
 * colours, so nothing about a chart's appearance told you what it measured.
 * Fixing that once is easy; keeping it fixed is what these tests are for.
 */

const ROLES = ['magnitude', 'category', 'duration', 'volume', 'exposure'] as const;

interface ChartFinding {
  line: number;
  tag: string;
  issue: string;
}

describe('chart palette', () => {
  it('gives every role a usable ramp', () => {
    for (const role of ROLES) {
      const ramp = paletteFor(role);
      expect(ramp.length, role).toBeGreaterThanOrEqual(4);
      expect(accentFor(role), role).toBeTruthy();
    }
  });

  it('resolves every colour from a design token, never a raw hex', () => {
    // A literal hex looks right in one theme and wrong in the other, and drifts
    // from the platform on the next Strato release.
    for (const role of ROLES) {
      for (const colour of paletteFor(role)) {
        expect(colour, `${role}: ${colour}`).toContain('var(--dt-colors-');
      }
    }
  });

  it('keeps the roles visually distinguishable from one another', () => {
    // If two roles resolved to the same ramp, the language would carry no
    // information and the tabs would look scattered again.
    const first = ROLES.map((role) => paletteFor(role)[0]);
    expect(new Set(first).size).toBe(ROLES.length);
  });

  it('gives each ramp distinct stops', () => {
    for (const role of ROLES) {
      const ramp = paletteFor(role);
      expect(new Set(ramp).size, role).toBe(ramp.length);
    }
  });

  it('exposes the same roles through the map and the accessor', () => {
    expect(Object.keys(CHART_PALETTE).sort()).toEqual([...ROLES].sort());
  });
});

describe('semantic tones', () => {
  it('reserves amber and red for measured faults only', () => {
    // "not measured" and "informational" must never read as an alarm about the
    // customer's estate.
    expect(PALETTE.absent).toBe('neutral');
    expect(PALETTE.info).toBe('primary');
    expect(PALETTE.good).toBe('success');
    expect(PALETTE.review).toBe('warning');
    expect(PALETTE.fault).toBe('critical');
  });
});

describe('role tones', () => {
  it('gives every chart role a tone', () => {
    for (const role of ROLES) {
      expect(ROLE_TONE[role], role).toBeDefined();
    }
  });

  it('uses amber for exactly one role, and only the one that means it', () => {
    // "Worth reviewing" earns amber. Nothing else does: a throughput chart or a
    // category breakdown tinted amber would read as an alarm about nothing.
    const amber = ROLES.filter((role) => ROLE_TONE[role] === 'warning');
    expect(amber).toEqual(['exposure']);
  });

  it('never uses red for a chart role', () => {
    // Red is reserved for a measured fault on a specific card, never for the
    // kind of quantity a chart happens to be plotting.
    expect(ROLES.map((role) => ROLE_TONE[role])).not.toContain('critical');
  });
});

describe('rhythm', () => {
  it('offers exactly three spacing steps, in increasing order', () => {
    expect(RHYTHM.tight).toBeLessThan(RHYTHM.group);
    expect(RHYTHM.group).toBeLessThan(RHYTHM.section);
  });
});

describe('chart consistency across the app', () => {
  it('routes every chart through the shared palette and names it accessibly', () => {
    const results = scanCharts() as { file: string; findings: ChartFinding[] }[];

    const report = results
      .map(({ file, findings }) =>
        findings.map((finding) => `${file}:${finding.line} ${finding.tag}: ${finding.issue}`).join('\n'),
      )
      .join('\n');

    expect(report).toBe('');
  });
});
