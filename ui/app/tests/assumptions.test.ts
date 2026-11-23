import { describe, expect, it } from 'vitest';

import {
  ASSUMPTIONS,
  ASSUMPTION_GROUPS,
  ASSUMPTION_IDS,
  assumed,
  readingHighIsGood,
  readingLowIsGood,
  readingReaches,
  visibleAssumptions,
} from '../config/assumptions';
import { ALL_KEYS, entryFor, type StringKey } from '../i18n/strings';
import { CAPACITY_THRESHOLDS } from '../models/capacity';
import { getQuery } from '../queries/catalog';
import { rateInp, rateLcp } from '../models/rum';

const entry = (key: string) => (ALL_KEYS.includes(key as StringKey) ? entryFor(key as StringKey) : undefined);

describe('the assumptions registry', () => {
  it('has a label and a basis in both languages for every entry', () => {
    for (const id of ASSUMPTION_IDS) {
      for (const key of [`assumption.${id}`, `assumption.${id}.basis`]) {
        const text = entry(key);
        expect(text?.en, key).toBeTruthy();
        expect(text?.['pt-BR'], key).toBeTruthy();
      }
    }
  });

  it('has a heading for every group and a word for every origin', () => {
    for (const group of ASSUMPTION_GROUPS) expect(entry(`assumption.group.${group}`)?.en, group).toBeTruthy();
    for (const origin of ['platform', 'industry', 'convention']) expect(entry(`assumption.origin.${origin}`)?.en, origin).toBeTruthy();
  });

  it('holds only positive, finite numbers with a stated origin and date', () => {
    for (const id of ASSUMPTION_IDS) {
      const a = ASSUMPTIONS[id];
      expect(Number.isFinite(a.value) && a.value > 0, id).toBe(true);
      expect(a.asOf, id).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('keeps each pair of lines in order, so a verdict can never skip a band', () => {
    const pairs: [string, string][] = [
      ['capacity.pressured', 'capacity.saturated'],
      ['problems.mttr.good', 'problems.mttr.attention'],
      ['problems.open.good', 'problems.open.attention'],
      ['problems.closed.attention', 'problems.closed.good'],
      ['services.failure.good', 'services.failure.attention'],
      ['services.latency.good', 'services.latency.attention'],
      ['services.consumer.good', 'services.consumer.attention'],
      ['services.restarts.good', 'services.restarts.attention'],
      ['experience.error.good', 'experience.error.attention'],
      ['experience.lcp.good', 'experience.lcp.poor'],
      ['experience.inp.good', 'experience.inp.poor'],
      ['experience.cls.good', 'experience.cls.poor'],
      ['experience.ttfb.good', 'experience.ttfb.poor'],
      ['findings.logContext.veryLow', 'findings.logContext.low'],
    ];
    for (const [low, high] of pairs) {
      expect(assumed(low as keyof typeof ASSUMPTIONS), `${low} < ${high}`).toBeLessThan(assumed(high as keyof typeof ASSUMPTIONS));
    }
  });

  it('shows licence sizing only when commercial data is on', () => {
    const ids = (commercial: boolean) => visibleAssumptions(commercial).flatMap((entry) => entry.ids);
    expect(ids(false).some((id) => id.startsWith('licensing.'))).toBe(false);
    expect(ids(true)).toContain('licensing.gibPerHostUnit');
    expect(ids(false)).toContain('capacity.saturated');
  });
});

describe('the code reads its numbers from the registry', () => {
  it('capacity classification uses the registry lines', () => {
    expect(CAPACITY_THRESHOLDS.saturatedPct).toBe(assumed('capacity.saturated'));
    expect(CAPACITY_THRESHOLDS.pressuredPct).toBe(assumed('capacity.pressured'));
    expect(CAPACITY_THRESHOLDS.oversizedPct).toBe(assumed('capacity.oversized'));
  });

  it('the recurrence queries are written with the registry numbers, so a figure and its label agree', () => {
    const pattern = assumed('problems.recurring.pattern');
    const candidate = assumed('problems.recurring.candidate');
    const total = getQuery('prob.recurrent.total').dql;
    expect(total).toContain(`patterns = countIf(occurrences >= ${pattern})`);
    expect(total).toContain(`candidates = countIf(occurrences >= ${candidate})`);
    expect(getQuery('prob.recurrent').dql).toContain(`occurrences >= ${pattern}`);
  });

  it('every pinned window is named for the days it really covers', () => {
    // `rca.trend` once read seven days and said "last 24 hours".
    for (const id of ['rca.trend', 'prob.recurrent.total']) {
      const { timeframe } = getQuery(id as Parameters<typeof getQuery>[0]);
      if (timeframe === 'global' || 'anchor' in timeframe || 'caller' in timeframe) continue;
      expect(timeframe.label, id).toBe(`timeframe.pinned.${timeframe.relative.replace('now-', '')}`);
    }
  });

  it('Core Web Vitals are rated on the registry lines', () => {
    expect(rateLcp(assumed('experience.lcp.good') - 1)).toBe('good');
    expect(rateLcp(assumed('experience.lcp.good'))).toBe('needs-improvement');
    expect(rateLcp(assumed('experience.lcp.poor'))).toBe('poor');
    expect(rateInp(assumed('experience.inp.good'))).toBe('needs-improvement');
  });
});

describe('readings', () => {
  it('a figure that reaches a line is judged by that line: exactly 90 is saturated', () => {
    expect(readingReaches(74.9, 75, 90)).toBe('good');
    expect(readingReaches(75, 75, 90)).toBe('attention');
    expect(readingReaches(89.9, 75, 90)).toBe('attention');
    expect(readingReaches(90, 75, 90)).toBe('poor');
    expect(readingReaches(null, 75, 90)).toBeNull();
  });

  it('low is good: up to the line is good, above the second is poor', () => {
    expect(readingLowIsGood(4, 4, 12)).toBe('good');
    expect(readingLowIsGood(12, 4, 12)).toBe('attention');
    expect(readingLowIsGood(12.1, 4, 12)).toBe('poor');
  });

  it('high is good: from the line up is good', () => {
    expect(readingHighIsGood(80, 80, 50)).toBe('good');
    expect(readingHighIsGood(50, 80, 50)).toBe('attention');
    expect(readingHighIsGood(49, 80, 50)).toBe('poor');
  });
});

describe('names say what they measure', () => {
  it('no label calls a problem "auto-resolved": the figure is problems no longer open', () => {
    // Closed = all problems minus those still open. It says nothing about who or what closed them.
    // The changelog (`help.whatsNew.*`) names the old labels on purpose, to say they were renamed.
    const offenders = ALL_KEYS.filter(
      (key) =>
        !key.startsWith('help.whatsNew.') &&
        /auto-?resol|resolvidos? automatic|resolveu automatic|resolved by dynatrace|resolvidos? pel[oa] dynatrace/i.test(`${entryFor(key).en} ${entryFor(key)['pt-BR']}`),
    );
    expect(offenders).toEqual([]);
  });

  it('never credits the product with a closure or a saving it did not measure, in any word order', () => {
    // 3.2.0 removed "Auto-resolved" but kept "closed by Dynatrace Intelligence", "Dynatrace resolved
    // … without a person paged" and "cutting on-call effort": the first guard matched one spelling.
    const CLAIMS = [
      /\b(dynatrace|davis)(\s+intelligence)?\s+(resolved|closed|fixed|cut|reduced|solved|resolveu|encerrou|fechou|corrigiu|reduziu)\b/i,
      /\b(closed|resolved|fixed|fechad[oa]s?|resolvid[oa]s?|encerrad[oa]s?|corrigid[oa]s?)\s+(by|pel[oa])\s+(o\s+|a\s+)?(dynatrace|davis)/i,
      // An effect claimed as achieved. Capability statements ("mapped without anyone drawing them")
      // and recommendations ("wire a workflow to cut toil") are not claims of a measured result.
      /without an? (human|person) paged|sem acionar (uma )?pessoa/i,
      /cutting on-call|reduzindo o esforço de plantão|resolved themselves|se resolveu sozinha/i,
      /nothing was (declared|imported)|nada foi (declarado|importado)/i,
    ];
    const offenders = ALL_KEYS.filter((key) => {
      if (key.startsWith('help.whatsNew.')) return false;
      const text = `${entryFor(key).en} ${entryFor(key)['pt-BR']}`;
      return CLAIMS.some((claim) => claim.test(text));
    });
    expect(offenders).toEqual([]);
  });

  it('the share of entity categories is not called "coverage"', () => {
    for (const key of ['cc.ring.coverage.label', 'tw.overview.k.coverage'] as const) {
      expect(entryFor(key).en, key).toMatch(/categories with telemetry/i);
    }
  });
});
