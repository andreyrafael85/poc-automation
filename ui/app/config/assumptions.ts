/**
 * The one list of every number this app chose.
 *
 * A figure on screen is either read from the tenant or it is the result of a rule someone had to
 * decide: "a host peaking at 90 % is saturated", "a resolution time up to 4 h is good". Those
 * decisions used to sit as bare numbers in a dozen files, and in places they disagreed with each
 * other (the executive verdict and the deck judged the same resolution time differently). They
 * live here now, once, with where each comes from, and the code reads them from here.
 *
 * ## Where a number comes from (`origin`)
 *
 *  - `platform`   — a fact about the product (16 GiB of memory per Host Unit).
 *  - `industry`   — a published convention outside Dynatrace (the Core Web Vitals lines).
 *  - `convention` — chosen for this app. Not a Dynatrace threshold, not an agreed objective; a
 *    customer's own target replaces it. The Help sheet says so next to the number.
 *
 * ## What is not here
 *
 * The public DPS rate card has its own dated source (`PUBLIC_DPS_RATES`). Access-control limits
 * (attempts, lockouts) are security policy and are documented in `config/access.ts`. Layout sizes
 * are not assumptions.
 *
 * `audience: 'se'` entries are commercial: the Help sheet lists them only when the SE has turned
 * commercial data on, like every other commercial figure.
 */

export type AssumptionOrigin = 'platform' | 'industry' | 'convention';
export type AssumptionUnit = 'pct' | 'h' | 'ms' | 'count' | 'gib' | 'days';
export type AssumptionGroup =
  | 'capacity'
  | 'problems'
  | 'findings'
  | 'assessment'
  | 'adoption'
  | 'maturity'
  | 'consumption'
  | 'services'
  | 'experience'
  | 'licensing'
  | 'windows';

export interface AssumptionDef {
  value: number;
  unit: AssumptionUnit;
  origin: AssumptionOrigin;
  /** When the number was last confirmed or chosen (YYYY-MM). */
  asOf: string;
  group: AssumptionGroup;
  audience: 'all' | 'se';
}

const AS_OF = '2026-10';

const convention = (group: AssumptionGroup, value: number, unit: AssumptionUnit): AssumptionDef => ({
  value,
  unit,
  origin: 'convention',
  asOf: AS_OF,
  group,
  audience: 'all',
});

const industry = (group: AssumptionGroup, value: number, unit: AssumptionUnit): AssumptionDef => ({
  ...convention(group, value, unit),
  origin: 'industry',
});

export const ASSUMPTIONS = {
  // ---------------------------------------------------------------- capacity
  'capacity.saturated': convention('capacity', 90, 'pct'),
  'capacity.pressured': convention('capacity', 75, 'pct'),
  'capacity.oversized': convention('capacity', 25, 'pct'),

  // ---------------------------------------------------------------- problems
  'problems.mttr.good': convention('problems', 4, 'h'),
  'problems.mttr.attention': convention('problems', 12, 'h'),
  'problems.open.good': convention('problems', 25, 'count'),
  'problems.open.attention': convention('problems', 75, 'count'),
  'problems.closed.good': convention('problems', 80, 'pct'),
  'problems.closed.attention': convention('problems', 50, 'pct'),
  'problems.recurring.pattern': convention('problems', 2, 'count'),
  'problems.recurring.candidate': convention('problems', 5, 'count'),
  'problems.stale': convention('problems', 168, 'h'),
  'problems.trend.min': convention('problems', 10, 'pct'),

  // ---------------------------------------------------------------- findings
  'findings.pattern.min': convention('findings', 10, 'count'),
  'findings.entity.min': convention('findings', 20, 'count'),
  'findings.restarts.min': convention('findings', 50, 'count'),
  'findings.logContext.low': convention('findings', 25, 'pct'),
  'findings.logContext.veryLow': convention('findings', 5, 'pct'),
  'findings.unclassified.high': convention('findings', 50, 'pct'),
  'findings.tableShare.min': convention('findings', 25, 'pct'),

  // -------------------------------------------------------------- assessment
  // 3.4.0 (proposal §C2, owner's decision D-C1): the weights of the observable-coverage index. Each
  // is a share of 100 between the domains; a domain that is not read or does not apply leaves the
  // denominator, so the weights of the domains that are measured are what the index divides by.
  'assessment.weight.infra': convention('assessment', 25, 'count'),
  'assessment.weight.apm': convention('assessment', 25, 'count'),
  'assessment.weight.logs': convention('assessment', 15, 'count'),
  'assessment.weight.k8s': convention('assessment', 10, 'count'),
  'assessment.weight.experience': convention('assessment', 15, 'count'),
  'assessment.weight.business': convention('assessment', 5, 'count'),
  // Below this share of the applicable weight measured, the index shows no number.
  'assessment.minWeight': convention('assessment', 50, 'pct'),
  // The lines the assessment findings are judged on.
  'assessment.infraOnly.max': convention('assessment', 30, 'pct'),
  'assessment.idleServices.max': convention('assessment', 30, 'pct'),
  'assessment.failing.critical': convention('assessment', 5, 'count'),
  'assessment.strength.infra': convention('assessment', 90, 'pct'),
  'assessment.strength.services': convention('assessment', 95, 'pct'),
  // 3.4.1: the lines of the rules added for a detailed reading of an existing environment.
  'assessment.hub.callers': convention('assessment', 10, 'count'),
  'assessment.isolated.max': convention('assessment', 30, 'pct'),
  'assessment.ownership.min': convention('assessment', 50, 'pct'),
  'assessment.strength.workflows': convention('assessment', 95, 'pct'),
  // 3.4.3: the words a measured share is read with (radar, executive summary, SRE practices).
  'assessment.band.developing': convention('assessment', 20, 'pct'),
  'assessment.band.moderate': convention('assessment', 40, 'pct'),
  'assessment.band.good': convention('assessment', 60, 'pct'),
  'assessment.band.excellent': convention('assessment', 80, 'pct'),

  // --------------------------------------------------------------- adoption
  // 3.4.4: the targets of the Dynatrace Platform Adoption (DPA) v1.5.0 score, as published in its dashboard.
  'adoption.dpa.users': { ...convention('adoption', 100, 'count'), origin: 'industry' },
  'adoption.dpa.apps': { ...convention('adoption', 84, 'count'), origin: 'industry' },
  'adoption.dpa.appsShare': { ...convention('adoption', 80, 'pct'), origin: 'industry' },
  'adoption.dpa.aiCalls': { ...convention('adoption', 1000, 'count'), origin: 'industry' },
  'adoption.dpa.analyzerCalls': { ...convention('adoption', 100, 'count'), origin: 'industry' },
  'adoption.dpa.apiCalls': { ...convention('adoption', 1000, 'count'), origin: 'industry' },
  'adoption.dpa.stickiness': { ...convention('adoption', 25, 'pct'), origin: 'industry' },
  'adoption.dpa.powerUsers': { ...convention('adoption', 30, 'count'), origin: 'industry' },

  // ---------------------------------------------------------------- maturity
  // 3.4.7: the lines of the maturity journey's four pillars, rising step by step (owner's review of 3.4.6).
  'maturity.fullStack.proficient': convention('maturity', 50, 'pct'),
  'maturity.fullStack.strategic': convention('maturity', 75, 'pct'),
  'maturity.fullStack.visionary': convention('maturity', 90, 'pct'),
  'maturity.logContext.strategic': convention('maturity', 50, 'pct'),
  'maturity.logContext.visionary': convention('maturity', 80, 'pct'),
  'maturity.ownership.visionary': convention('maturity', 80, 'pct'),
  'maturity.rum.strategic': convention('maturity', 50, 'pct'),
  'maturity.rum.visionary': convention('maturity', 90, 'pct'),
  'maturity.automation.visionary': convention('maturity', 5, 'count'),

  // ------------------------------------------------------------ consumption
  // 3.4.11 (F-14): the pre-flight's calibration, measured on the lab tenant on 2026-11-18 (docs/v3.4/CONSUMO-DO-APP.md):
  // logs ingested per hour there, and what one full visit of the app read — logs, Davis problems (included with
  // Full-Stack) and the rest — so another tenant's visit is projected from its own log volume. Bytes only (rule 6).
  'consumption.lab.logsIngestPerHour': { ...convention('consumption', 0.93, 'gib'), origin: 'platform', audience: 'se' },
  'consumption.lab.visitLogs': { ...convention('consumption', 0.82, 'gib'), origin: 'platform', audience: 'se' },
  'consumption.lab.visitEvents': { ...convention('consumption', 2.19, 'gib'), origin: 'platform', audience: 'se' },
  'consumption.lab.visitOther': { ...convention('consumption', 0.51, 'gib'), origin: 'platform', audience: 'se' },
  // 3.6.8: the Logs console's count reads the whole selected window — measured on the lab on 2026-11-22: 1.72 GiB for
  // 24 hours, ≈ 0.072 GiB per hour of window; it scales with the tenant's logs like the rest of the log part.
  'consumption.lab.errorCountPerHour': { ...convention('consumption', 0.072, 'gib'), origin: 'platform', audience: 'se' },
  'consumption.preflight.visitLine': { ...convention('consumption', 10, 'gib'), audience: 'se' },
  // 3.4.13: the PoC's use of the app, for its expected cost on the Licensing page (CONSUMO-DO-APP.md §6: 2 people, ≈ 1 full visit a day each, 30 days).
  'consumption.poc.people': { ...convention('consumption', 2, 'count'), audience: 'se' },
  'consumption.poc.visitsPerDay': { ...convention('consumption', 1, 'count'), audience: 'se' },
  'consumption.poc.days': { ...convention('consumption', 30, 'days'), audience: 'se' },

  // ---------------------------------------------------------------- services
  'services.failure.good': convention('services', 1, 'pct'),
  'services.failure.attention': convention('services', 5, 'pct'),
  'services.latency.good': convention('services', 300, 'ms'),
  'services.latency.attention': convention('services', 1000, 'ms'),
  'services.consumer.good': convention('services', 500, 'ms'),
  'services.consumer.attention': convention('services', 2000, 'ms'),
  'services.restarts.good': convention('services', 20, 'count'),
  'services.restarts.attention': convention('services', 200, 'count'),

  // ------------------------------------------------------------- experience
  'experience.error.good': convention('experience', 1, 'pct'),
  'experience.error.attention': convention('experience', 5, 'pct'),
  'experience.lcp.good': industry('experience', 2500, 'ms'),
  'experience.lcp.poor': industry('experience', 4000, 'ms'),
  'experience.inp.good': industry('experience', 200, 'ms'),
  'experience.inp.poor': industry('experience', 500, 'ms'),
  'experience.cls.good': industry('experience', 1000, 'count'),
  'experience.cls.poor': industry('experience', 2500, 'count'),
  'experience.ttfb.good': industry('experience', 800, 'ms'),
  'experience.ttfb.poor': industry('experience', 1800, 'ms'),

  // --------------------------------------------------------------- licensing
  'licensing.gibPerHostUnit': { ...convention('licensing', 16, 'gib'), origin: 'platform', audience: 'se' },
  'licensing.hoursPerYear': { ...convention('licensing', 8760, 'h'), origin: 'platform', audience: 'se' },

  // ----------------------------------------------------------------- windows
  'windows.maxReportDays': convention('windows', 30, 'days'),
  'windows.problemsDays': convention('windows', 15, 'days'),
  'windows.trendDays': convention('windows', 7, 'days'),
  'windows.incidentSignatures': convention('windows', 8, 'count'),
  // 3.2.5 (M5): the PoC plan and the SE-only consumption projection.
  'windows.pocMaxDays': convention('windows', 90, 'days'),
  'windows.pocCompareDays': convention('windows', 7, 'days'),
  'windows.projectionMinDays': { ...convention('windows', 7, 'days'), audience: 'se' },
} as const satisfies Record<string, AssumptionDef>;

export type AssumptionId = keyof typeof ASSUMPTIONS;

/** The number behind an id. The type of the result is the literal, so a misuse is a type error. */
export const assumed = <K extends AssumptionId>(id: K): (typeof ASSUMPTIONS)[K]['value'] => ASSUMPTIONS[id].value;

export const ASSUMPTION_IDS = Object.keys(ASSUMPTIONS) as AssumptionId[];

export const ASSUMPTION_GROUPS: readonly AssumptionGroup[] = [
  'capacity',
  'problems',
  'findings',
  'assessment',
  'adoption',
  'maturity',
  'consumption',
  'services',
  'experience',
  'licensing',
  'windows',
];

export const UNIT_SYMBOL: Record<AssumptionUnit, string> = {
  pct: '%',
  h: 'h',
  ms: 'ms',
  count: '',
  gib: 'GiB',
  days: 'd',
};

/** The assumptions an audience may be shown, grouped in reading order. */
export function visibleAssumptions(commercial: boolean): { group: AssumptionGroup; ids: AssumptionId[] }[] {
  return ASSUMPTION_GROUPS.map((group) => ({
    group,
    ids: ASSUMPTION_IDS.filter(
      (id) => ASSUMPTIONS[id].group === group && (ASSUMPTIONS[id].audience === 'all' || commercial),
    ),
  })).filter((entry) => entry.ids.length > 0);
}

/**
 * A traffic-light reading of a value against two lines, **low is good**: at or below `good` it is
 * good, at or below `attention` it needs attention, above that it is poor. `null` stays `null`.
 */
export type Reading = 'good' | 'attention' | 'poor';

export function readingLowIsGood(value: number | null, good: number, attention: number): Reading | null {
  if (value === null) return null;
  if (value <= good) return 'good';
  if (value <= attention) return 'attention';
  return 'poor';
}

/**
 * The same, for a figure judged by where it **reaches** a line: below `pressure` is good, from
 * `pressure` up to (not including) `saturation` needs attention, from `saturation` it is poor.
 * Capacity uses this reading: "a peak at or above 90 % is saturated" must make exactly 90 poor.
 */
export function readingReaches(value: number | null, pressure: number, saturation: number): Reading | null {
  if (value === null) return null;
  if (value >= saturation) return 'poor';
  if (value >= pressure) return 'attention';
  return 'good';
}

/** A traffic-light reading where **high is good** (the share of problems closed). */
export function readingHighIsGood(value: number | null, good: number, attention: number): Reading | null {
  if (value === null) return null;
  if (value >= good) return 'good';
  if (value >= attention) return 'attention';
  return 'poor';
}
