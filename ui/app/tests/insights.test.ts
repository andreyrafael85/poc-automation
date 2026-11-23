import { describe, expect, it } from 'vitest';

import {
  deriveInsights,
  prioritise,
  type InsightSignals,
} from '../features/insights/deriveInsights';

/**
 * The insight engine must stay silent when the evidence is absent.
 *
 * A closing presentation that pads itself with generic advice is the failure mode
 * these tests exist to prevent, alongside any financial or MTTR claim.
 */

const emptySignals: InsightSignals = {
  recurringProblems: [],
  restartingWorkloads: [],
  pressuredWorkloads: [],
  failingServices: [],
  logServiceContextPct: null,
  logUnclassifiedPct: null,
  emptyBuckets: [],
  unreadableBuckets: [],
  failingWorkflows: [],
  pressuredWorkloadsTotal: 0,
  failingWorkflowsTotal: { workflows: 0, failedRuns: 0 },
  inefficientTables: [],
  securityUnreadable: false,
  experienceUnavailable: false,
  windowLabel: 'last 24 hours',
  recurringWindowLabel: 'last 7 days',
};

describe('silence without evidence', () => {
  it('produces nothing at all when no signal is present', () => {
    expect(deriveInsights(emptySignals)).toEqual([]);
  });

  it('ignores a recurring problem below the threshold', () => {
    const insights = deriveInsights({
      ...emptySignals,
      recurringProblems: [{ name: 'Rare blip', occurrences: 3, category: 'ERROR' }],
    });
    expect(insights).toEqual([]);
  });

  it('ignores restart counts below the threshold', () => {
    const insights = deriveInsights({
      ...emptySignals,
      restartingWorkloads: [{ workload: 'w', cluster: 'c', restarts: 4 }],
    });
    expect(insights).toEqual([]);
  });

  it('ignores good log context rather than inventing an improvement', () => {
    const insights = deriveInsights({
      ...emptySignals,
      logServiceContextPct: 92,
      logUnclassifiedPct: 4,
    });
    expect(insights).toEqual([]);
  });

  it('ignores an efficient table', () => {
    const insights = deriveInsights({
      ...emptySignals,
      inefficientTables: [{ table: 'metrics', bytesPerRecord: 12, scannedBytes: 4000 }],
    });
    expect(insights).toEqual([]);
  });
});

describe('insights from real signal shapes', () => {
  it('raises automation for a high-recurrence pattern and names the count', () => {
    const insights = deriveInsights({
      ...emptySignals,
      recurringProblems: [{ name: 'Out-of-memory kills', occurrences: 252, category: 'ERROR' }],
    });
    expect(insights).toHaveLength(1);
    const insight = insights[0];
    expect(insight?.category).toBe('automation');
    expect(insight?.observation).toContain('252');
    expect(insight?.evidence).toContain('prob.recurrent');
    expect(insight?.dependencies).toContain('approval');
  });

  it('raises a log-context opportunity when context is scarce', () => {
    const insights = deriveInsights({ ...emptySignals, logServiceContextPct: 0.0096 });
    const insight = insights.find((candidate) => candidate.id === 'enrich-log-context');
    expect(insight?.category).toBe('data-quality');
    expect(insight?.recommendation).toContain('ingest');
  });

  it('raises a query-efficiency opportunity and reports the scanned volume', () => {
    const insights = deriveInsights({
      ...emptySignals,
      inefficientTables: [
        { table: 'bizevents', bytesPerRecord: 19_024_538, scannedBytes: 6_341_125_968_965 },
      ],
    });
    const insight = insights.find((candidate) => candidate.id === 'improve-query-efficiency');
    expect(insight?.observation).toContain('TB');
    expect(insight?.observation).toContain('bizevents');
  });

  it('raises the security gap when the table is unreadable', () => {
    const insights = deriveInsights({ ...emptySignals, securityUnreadable: true });
    const insight = insights.find((candidate) => candidate.id === 'enable-security-visibility');
    expect(insight?.recommendation).toContain('storage:security.events:read');
  });

  it('raises the experience gap when sessions are unusable', () => {
    const insights = deriveInsights({ ...emptySignals, experienceUnavailable: true });
    expect(insights.some((candidate) => candidate.id === 'instrument-user-journey')).toBe(true);
  });

  it('raises failing workflows with the exact totals, not the sum of the capped list', () => {
    const insights = deriveInsights({
      ...emptySignals,
      // The ranked list stops at 40 rows; here it names two, while the aggregate saw four.
      failingWorkflows: [
        { title: 'Generator A', executions: 576 },
        { title: 'Generator B', executions: 288 },
      ],
      failingWorkflowsTotal: { workflows: 4, failedRuns: 889 },
    });
    const insight = insights.find((candidate) => candidate.id === 'fix-failing-workflows');
    expect(insight?.observation).toContain('889');
    expect(insight?.observation).not.toContain('864');
    expect(insight?.title).toContain('4');
  });

  it('states no workflow count when the aggregate was not read, whatever the list shows', () => {
    const insights = deriveInsights({
      ...emptySignals,
      failingWorkflows: [{ title: 'Generator A', executions: 576 }],
      failingWorkflowsTotal: null,
    });
    expect(insights.some((candidate) => candidate.id === 'fix-failing-workflows')).toBe(false);
  });

  it('counts pressured workloads from the aggregate, not from the 25-row list', () => {
    const insights = deriveInsights({
      ...emptySignals,
      pressuredWorkloads: [{ workload: 'a', cluster: 'lab', oomKills: 1, throttled: 0 }],
      pressuredWorkloadsTotal: 37,
    });
    expect(insights.find((candidate) => candidate.id === 'review-resource-limits')?.title).toContain('37');
  });

  it('describes recurrence with the window its query covers', () => {
    const insights = deriveInsights({
      ...emptySignals,
      recurringProblems: [{ name: 'Backoff event', occurrences: 418, category: 'ERROR' }],
    });
    const insight = insights.find((candidate) => candidate.id === 'automate-recurring-problem');
    expect(insight?.observation).toContain('last 7 days');
    expect(insight?.observation).not.toContain('last 24 hours');
  });
});

describe('claims the engine must never make', () => {
  const populated: InsightSignals = {
    recurringProblems: [{ name: 'Backoff event', occurrences: 418, category: 'ERROR' }],
    restartingWorkloads: [{ workload: 'python-backend', cluster: 'lab', restarts: 2375 }],
    pressuredWorkloads: [{ workload: 'sqs-demo', cluster: 'lab', oomKills: 7, throttled: 320 }],
    failingServices: [{ name: 'TradeManagement', failureRatePct: 9.74 }],
    logServiceContextPct: 0.01,
    logUnclassifiedPct: 95.2,
    emptyBuckets: ['audit_teste', 'banco_events'],
    unreadableBuckets: ['default_securityevents_builtin'],
    failingWorkflows: [{ title: 'Generator', executions: 576 }],
    pressuredWorkloadsTotal: 1,
    failingWorkflowsTotal: { workflows: 1, failedRuns: 576 },
    inefficientTables: [{ table: 'spans', bytesPerRecord: 5_777_102_966, scannedBytes: 17_331_308_898 }],
    securityUnreadable: true,
    experienceUnavailable: true,
    windowLabel: 'last 24 hours',
    recurringWindowLabel: 'last 7 days',
  };

  const allText = () =>
    deriveInsights(populated)
      .flatMap((insight) => [
        insight.title,
        insight.observation,
        insight.consequence,
        insight.recommendation,
        insight.dependencies,
      ])
      .join(' ')
      .toLowerCase();

  it('produces a full set of insights from realistic signals', () => {
    expect(deriveInsights(populated).length).toBeGreaterThanOrEqual(8);
  });

  it('never mentions a currency', () => {
    const text = allText();
    for (const forbidden of ['$', '€', '£', 'usd', 'eur', 'dollar', 'cheaper', 'roi']) {
      expect(text, `mentions "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('never asserts a saving', () => {
    const text = allText();
    // Matches a claimed saving, not a sentence that forbids claiming one.
    for (const forbidden of [
      'will save',
      'saves ',
      'cost saving',
      'savings',
      'reduce cost',
      'lower cost',
    ]) {
      expect(text, `asserts "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('never claims a reduction in mean time to resolve', () => {
    const text = allText();
    expect(text).not.toContain('mttr');
    expect(text).not.toContain('mean time');
  });

  it('never promises a quantified improvement', () => {
    const text = allText();
    for (const forbidden of ['% faster', '% reduction', '% improvement', 'guaranteed']) {
      expect(text, `mentions "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('keeps effort and impact qualitative', () => {
    for (const insight of deriveInsights(populated)) {
      expect(['low', 'medium', 'high'], insight.id).toContain(insight.effort);
      expect(['low', 'medium', 'high'], insight.id).toContain(insight.impact);
    }
  });

  it('gives every insight evidence, a subject and a drilldown route', () => {
    for (const insight of deriveInsights(populated)) {
      expect(insight.evidence.length, insight.id).toBeGreaterThan(0);
      expect(insight.subject, insight.id).toBeTruthy();
      expect(insight.drilldown, insight.id).toMatch(/^\//);
    }
  });
});

describe('prioritise', () => {
  it('orders by impact first, then by ascending effort', () => {
    const insights = prioritise(
      deriveInsights({
        ...emptySignals,
        securityUnreadable: true,
        emptyBuckets: ['a'],
        logServiceContextPct: 0.5,
      }),
    );
    const impacts = insights.map((insight) => insight.impact);
    const rank = { high: 3, medium: 2, low: 1 } as const;
    for (let index = 1; index < impacts.length; index += 1) {
      const previous = impacts[index - 1];
      const current = impacts[index];
      if (previous !== undefined && current !== undefined) {
        expect(rank[previous]).toBeGreaterThanOrEqual(rank[current]);
      }
    }
  });

  it('does not mutate its input', () => {
    const insights = deriveInsights({ ...emptySignals, securityUnreadable: true, emptyBuckets: ['a'] });
    const before = insights.map((insight) => insight.id);
    prioritise(insights);
    expect(insights.map((insight) => insight.id)).toEqual(before);
  });
});
