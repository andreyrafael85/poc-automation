import { describe, expect, it } from 'vitest';

import { VULNERABILITY_LIST_LIMIT, CATALOG } from '../queries/catalog';
import { summarisePosture, summariseVulnerabilities } from '../models/security';

/**
 * Grading of open vulnerabilities.
 *
 * The page and the report both read severity through this one function, so the
 * rules that matter — total equals the row count, Davis level wins over the
 * legacy risk level, an unknown level is counted but never mis-graded — are
 * pinned here rather than re-checked on every surface.
 */

const row = (level: string | null, score: number | null, extra: Record<string, unknown> = {}) => ({
  displayId: 'S-1',
  title: 'Example',
  level,
  score,
  ...extra,
});

describe('summariseVulnerabilities', () => {
  it('counts the total as the number of open rows, not a summed field', () => {
    const summary = summariseVulnerabilities([
      row('CRITICAL', 9.8),
      row('HIGH', 7.1),
      row('HIGH', 7.0),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.bySeverity.HIGH).toBe(2);
    expect(summary.bySeverity.CRITICAL).toBe(1);
  });

  it('grades by Davis level and is case-insensitive', () => {
    const summary = summariseVulnerabilities([row('critical', 9), row('Medium', 5), row('low', 2)]);
    expect(summary.bySeverity.CRITICAL).toBe(1);
    expect(summary.bySeverity.MEDIUM).toBe(1);
    expect(summary.bySeverity.LOW).toBe(1);
  });

  it('falls back to the legacy risk level when Davis has not scored it', () => {
    const summary = summariseVulnerabilities([{ ...row(null, null), riskLevel: 'HIGH' }]);
    expect(summary.bySeverity.HIGH).toBe(1);
    expect(summary.ungraded).toBe(0);
  });

  it('counts an unknown level as ungraded rather than forcing it into a tier', () => {
    const summary = summariseVulnerabilities([row('NONE', 0), row(null, null)]);
    expect(summary.ungraded).toBe(2);
    expect(summary.bySeverity.CRITICAL + summary.bySeverity.HIGH).toBe(0);
    // The total still reconciles: graded tiers plus the ungraded remainder.
    const graded = summary.bySeverity.CRITICAL + summary.bySeverity.HIGH + summary.bySeverity.MEDIUM + summary.bySeverity.LOW;
    expect(graded + summary.ungraded).toBe(summary.total);
  });

  it('caps the top list but never the total', () => {
    const rows = Array.from({ length: 15 }, (_, index) => row('HIGH', 10 - index * 0.1));
    const summary = summariseVulnerabilities(rows, 10);
    expect(summary.total).toBe(15);
    expect(summary.top).toHaveLength(10);
  });

  it('reports zero for an empty result without inventing a severity', () => {
    const summary = summariseVulnerabilities([]);
    expect(summary.total).toBe(0);
    expect(summary.bySeverity).toEqual({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  });
});

const postureRow = (level: string | null, technology: string | null, vulnerabilities: number, extra: Record<string, unknown> = {}) => ({
  level,
  technology,
  vulnerabilities,
  actNow: 0,
  exploitable: 0,
  publicExposed: 0,
  inUse: 0,
  ...extra,
});

describe('summarisePosture (the exact aggregate)', () => {
  it('sums counts, which arrive as strings, across levels and technologies', () => {
    const summary = summarisePosture([
      postureRow('CRITICAL', 'Java', '40' as unknown as number),
      postureRow('HIGH', 'Java', 360),
      postureRow('HIGH', 'Node.js', 140),
      postureRow('MEDIUM', 'Node.js', 1100),
      postureRow('LOW', null, 360),
    ]);
    expect(summary.total).toBe(2000);
    expect(summary.bySeverity).toEqual({ CRITICAL: 40, HIGH: 500, MEDIUM: 1100, LOW: 360 });
    // A technology split across levels is one technology.
    expect(summary.byTechnology[0]).toEqual({ technology: 'Node.js', count: 1240 });
    expect(summary.byTechnology[1]).toEqual({ technology: 'Java', count: 400 });
  });

  it('counts what has no level as ungraded and keeps the total reconciled', () => {
    const summary = summarisePosture([postureRow('HIGH', 'Java', 3), postureRow('NONE', 'Java', 4), postureRow(null, null, 1)]);
    expect(summary.ungraded).toBe(5);
    const graded = Object.values(summary.bySeverity).reduce((a, b) => a + b, 0);
    expect(graded + summary.ungraded).toBe(summary.total);
  });

  it('reads the immediate-action and signal counts', () => {
    const summary = summarisePosture([
      postureRow('CRITICAL', 'Java', 10, { actNow: 4, exploitable: 6, publicExposed: 7, inUse: 9 }),
      postureRow('HIGH', 'Go', 5, { actNow: 1, exploitable: 2, publicExposed: 2, inUse: 3 }),
    ]);
    expect(summary.actNowCount).toBe(5);
    expect(summary.exploitableCount).toBe(8);
    expect(summary.publicCount).toBe(9);
    expect(summary.inUseCount).toBe(12);
  });

  it('is an honest zero for no rows, not an invented severity', () => {
    const summary = summarisePosture([]);
    expect(summary.total).toBe(0);
    expect(summary.byTechnology).toEqual([]);
  });
});

describe('summariseVulnerabilities with the aggregate', () => {
  const list = Array.from({ length: VULNERABILITY_LIST_LIMIT }, (_, index) => row('HIGH', 9 - index / 1000));

  it('takes every total from the aggregate and only the names from the list', () => {
    const summary = summariseVulnerabilities(list, 10, {
      records: [postureRow('HIGH', 'Java', 800), postureRow('MEDIUM', 'Java', 1200)],
      complete: true,
    });
    expect(summary.total).toBe(2000);
    expect(summary.listed).toBe(VULNERABILITY_LIST_LIMIT);
    expect(summary.exact).toBe(true);
    expect(summary.top).toHaveLength(10);
  });

  it('is a floor, and says so, when the list is at its cap and no aggregate exists', () => {
    const summary = summariseVulnerabilities(list);
    expect(summary.total).toBe(VULNERABILITY_LIST_LIMIT);
    expect(summary.exact).toBe(false);
  });

  it('is exact from the list when it is shorter than its cap', () => {
    expect(summariseVulnerabilities(list.slice(0, VULNERABILITY_LIST_LIMIT - 1)).exact).toBe(true);
  });

  it('is not exact when the aggregate itself was cut short by a scan limit', () => {
    const summary = summariseVulnerabilities(list, 10, { records: [postureRow('HIGH', 'Java', 7)], complete: false });
    expect(summary.exact).toBe(false);
    expect(summary.total).toBe(7);
  });
});

describe('the two security queries share one definition of "open"', () => {
  it('start from the same rollup, so the list can never disagree with the aggregate', () => {
    const rollupEnd = 'filter resolutionStatus == "OPEN" and muteStatus != "MUTED"';
    const list = CATALOG['sec.vulnerabilities']!.dql;
    const posture = CATALOG['sec.posture']!.dql;
    const head = (dql: string) => dql.slice(0, dql.indexOf(rollupEnd) + rollupEnd.length);
    expect(head(list)).toBe(head(posture));
  });

  it('aggregate in the query, with no row limit', () => {
    const posture = CATALOG['sec.posture']!.dql;
    expect(posture).toMatch(/\| summarize \{\s+vulnerabilities = count\(\)/);
    expect(posture).not.toMatch(/\| limit/);
  });
});
