import { describe, expect, it } from 'vitest';

import { rateCls, rateInp, rateLcp, rateTtfb, summariseRum } from '../models/rum';

/**
 * Digital-experience grading.
 *
 * The Core Web Vitals ratings and the per-app merge feed the experience page,
 * the report and the executive tile, so the thresholds and the "not observed"
 * behaviour are pinned here rather than re-checked on every surface.
 */

const score = (name: string, requests: number, errors: number, actions = 0) => ({
  'frontend.name': name,
  requests,
  errors,
  actions,
  errorRatePct: requests > 0 ? Number(((errors / requests) * 100).toFixed(2)) : 0,
});

const vitals = (name: string, inp: number | null, lcp: number | null = 400) => ({
  'frontend.name': name,
  lcp,
  inp,
  cls: 0,
  load: 280,
  ttfb: 8,
  dom: 120,
  actionDur: 700,
});

describe('Core Web Vitals ratings', () => {
  it('grades LCP against the 2.5s / 4s thresholds', () => {
    expect(rateLcp(400)).toBe('good');
    expect(rateLcp(3000)).toBe('needs-improvement');
    expect(rateLcp(5000)).toBe('poor');
  });

  it('grades INP against the 200ms / 500ms thresholds — the headline finding here', () => {
    expect(rateInp(150)).toBe('good');
    expect(rateInp(300)).toBe('needs-improvement');
    expect(rateInp(6000)).toBe('poor');
  });

  it('grades TTFB and CLS, and returns no-data for a null', () => {
    expect(rateTtfb(500)).toBe('good');
    expect(rateCls(1)).toBe('good');
    expect(rateInp(null)).toBe('no-data');
  });
});

describe('summariseRum', () => {
  it('reports no data for empty inputs, never a fabricated zero rate', () => {
    const summary = summariseRum([], []);
    expect(summary.hasData).toBe(false);
    expect(summary.overallErrorRatePct).toBeNull();
    expect(summary.worstInp).toBeNull();
  });

  it('merges scorecard and web-vitals rows by frontend name', () => {
    const summary = summariseRum(
      [score('app-a', 274, 0, 90), score('app-b', 81, 3, 28)],
      [vitals('app-a', 5376), vitals('app-b', 6392)],
    );
    expect(summary.hasData).toBe(true);
    expect(summary.apps).toHaveLength(2);
    expect(summary.totalRequests).toBe(355);
    expect(summary.totalErrors).toBe(3);
    // Weighted across both apps: 3 / 355.
    expect(summary.overallErrorRatePct).toBeCloseTo(0.85, 2);
    expect(summary.worstInp).toBe(6392);
    expect(summary.poorInpApps).toBe(2);
  });

  it('carries an app that only has web vitals, with traffic shown as not measured', () => {
    const summary = summariseRum([], [vitals('app-a', 300)]);
    expect(summary.apps).toHaveLength(1);
    expect(summary.apps[0]!.requests).toBeNull();
    expect(summary.apps[0]!.inp).toBe(300);
    expect(summary.overallErrorRatePct).toBeNull();
  });

  it('leaves audience null when the estimated_count metrics are unpopulated, never zero', () => {
    // Mirrors abc12345: the audience query returns no rows because the metrics
    // carry only null data points. Sessions/users must read as not observed.
    const summary = summariseRum(
      [score('app-a', 274, 0, 90)],
      [vitals('app-a', 5376)],
      [],
    );
    expect(summary.apps[0]!.sessions).toBeNull();
    expect(summary.apps[0]!.users).toBeNull();
    expect(summary.totalSessions).toBeNull();
    expect(summary.totalUsers).toBeNull();
  });

  const audienceRows = [
    { 'frontend.name': 'app-a', sessions: 120, users: 80 },
    { 'frontend.name': 'app-b', sessions: 30, users: 25 },
  ];
  const scorecard = [score('app-a', 274, 0, 90), score('app-b', 81, 3, 28)];
  const vitalRows = [vitals('app-a', 5376), vitals('app-b', 6392)];

  it('reads the overall audience from the aggregate, never by adding the per-app figures', () => {
    // A user of both apps is one user: 99 + 99 apps was printed as 198 on a real tenant.
    const summary = summariseRum(scorecard, vitalRows, audienceRows, { sessions: 150, users: 90 });
    const appA = summary.apps.find((app) => app.name === 'app-a');
    expect(appA!.sessions).toBe(120);
    expect(appA!.users).toBe(80);
    expect(summary.totalSessions).toBe(150);
    expect(summary.totalUsers).toBe(90);
  });

  it('claims no total of unique users when only per-app figures exist for several apps', () => {
    const summary = summariseRum(scorecard, vitalRows, audienceRows);
    expect(summary.totalUsers).toBeNull();
    expect(summary.totalSessions).toBeNull();
  });

  it('uses the single app figure when there is only one app', () => {
    const summary = summariseRum([score('app-a', 274, 0, 90)], [], [{ 'frontend.name': 'app-a', sessions: 120, users: 80 }]);
    expect(summary.totalUsers).toBe(80);
    expect(summary.totalSessions).toBe(120);
  });
});
