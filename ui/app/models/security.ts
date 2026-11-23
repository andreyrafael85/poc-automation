import { SEVERITY_ORDER, type Severity } from '../design/palette';
import { VULNERABILITY_LIST_LIMIT } from '../queries/catalog';
import { list, num, str, type GrailRecord } from '../utils/records';

/**
 * Vulnerability posture, in two parts that must never be confused.
 *
 *  - `summarisePosture` reads `sec.posture`, which the query aggregates over EVERY open,
 *    non-muted vulnerability: one row per severity level and technology stack, each carrying
 *    an exact count. Every total, share and severity count in the app comes from here, so no
 *    row cap can turn a total into a floor.
 *  - `summariseVulnerabilities` reads `sec.vulnerabilities`, the detail list of the
 *    highest-risk vulnerabilities (capped at `VULNERABILITY_LIST_LIMIT`). It supplies the
 *    "top N" table and the remediation queue and is never summed for a total — unless the
 *    aggregate could not be read AND the list is complete (fewer rows than the cap), the one
 *    case in which counting its rows is exact.
 *
 * Severity comes from the level the query derives from the Davis risk score; anything
 * ungraded is counted but never mis-tiered, so a total always reconciles with the sum of
 * tiers plus the ungraded remainder. The exploit / public-exposure / in-use signals are the
 * ones that turn a long list into a short remediation queue.
 */

export interface TopVulnerability {
  displayId: string;
  title: string;
  severity: Severity | null;
  score: number | null;
  technology: string | null;
  cve: string | null;
  /** A weaponised exploit is publicly available. */
  exploitable: boolean;
  /** The affected entity is reachable from a public network. */
  publicExposure: boolean;
  /** The vulnerable function is actually called at runtime. */
  functionInUse: boolean;
  /** How many entities this vulnerability affects. */
  entityCount: number;
}

export interface TechnologyExposure {
  technology: string;
  count: number;
}

/** Totals over every open vulnerability: the shape both the aggregate and the list can fill. */
export interface PostureSummary {
  total: number;
  bySeverity: Record<Severity, number>;
  /** Open vulnerabilities the query could not assign a level to. */
  ungraded: number;
  /** Technology stacks carrying the most open vulnerabilities. */
  byTechnology: TechnologyExposure[];
  /** Count of vulnerabilities meeting the immediate-action bar: exploitable AND public AND in-use. */
  actNowCount: number;
  /** A weaponised exploit is publicly available. */
  exploitableCount: number;
  /** The affected entity is reachable from a public network. */
  publicCount: number;
  /** The vulnerable function is actually called at runtime. */
  inUseCount: number;
  /**
   * Vulnerabilities with two of the three signals at once (3.2.6): the next queue when none has
   * all three — the vulnerable function is assessed only where code-level analysis exists, so a
   * public, exploitable flaw in another stack never reaches "act now". Exact, from the pairs.
   */
  twoSignalsCount: number;
  pairs: { exploitPublic: number; exploitInUse: number; publicInUse: number };
}

export interface VulnerabilitySummary extends PostureSummary {
  /** The highest-risk vulnerabilities, highest first, capped by `topLimit`. */
  top: TopVulnerability[];
  /** The immediate-action queue, highest risk first. */
  remediation: TopVulnerability[];
  /** How many rows the detail list holds (at most `VULNERABILITY_LIST_LIMIT`). */
  listed: number;
  /**
   * True when `total` and the counts are exact over every open vulnerability: they were read
   * from the aggregate query, or counted from a list that is complete. False only when the
   * aggregate is unavailable and the list stopped at its cap, so the total is a floor.
   */
  exact: boolean;
}

const severityCounts = (): Record<Severity, number> => ({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });

/** Folds the aggregate's rows (one per severity level × technology) into exact totals. */
export function summarisePosture(records: readonly GrailRecord[]): PostureSummary {
  const bySeverity = severityCounts();
  let total = 0;
  let ungraded = 0;
  let actNowCount = 0;
  let exploitableCount = 0;
  let publicCount = 0;
  let inUseCount = 0;
  const pairs = { exploitPublic: 0, exploitInUse: 0, publicInUse: 0 };
  const techCounts = new Map<string, number>();

  for (const record of records) {
    const count = num(record, 'vulnerabilities') ?? 0;
    pairs.exploitPublic += num(record, 'exploitPublic') ?? 0;
    pairs.exploitInUse += num(record, 'exploitInUse') ?? 0;
    pairs.publicInUse += num(record, 'publicInUse') ?? 0;
    total += count;
    const severity = normaliseSeverity(str(record, 'level'));
    if (severity === null) ungraded += count;
    else bySeverity[severity] += count;
    actNowCount += num(record, 'actNow') ?? 0;
    exploitableCount += num(record, 'exploitable') ?? 0;
    publicCount += num(record, 'publicExposed') ?? 0;
    inUseCount += num(record, 'inUse') ?? 0;
    const technology = str(record, 'technology');
    if (technology !== null) techCounts.set(technology, (techCounts.get(technology) ?? 0) + count);
  }

  return {
    total,
    bySeverity,
    ungraded,
    byTechnology: topTechnologies(techCounts),
    actNowCount,
    exploitableCount,
    publicCount,
    inUseCount,
    twoSignalsCount: twoOfThree(pairs, actNowCount),
    pairs,
  };
}

/**
 * Vulnerabilities with at least two of the three signals, from the pair counts: one with all three
 * is in each of the three pairs, so it is taken away twice (inclusion-exclusion).
 */
export function twoOfThree(pairs: { exploitPublic: number; exploitInUse: number; publicInUse: number }, all: number): number {
  return Math.max(all, pairs.exploitPublic + pairs.exploitInUse + pairs.publicInUse - 2 * all);
}

function topTechnologies(counts: ReadonlyMap<string, number>): TechnologyExposure[] {
  return [...counts.entries()]
    .map(([technology, count]) => ({ technology, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function normaliseSeverity(value: string | null): Severity | null {
  if (value === null) return null;
  const upper = value.toUpperCase();
  return (SEVERITY_ORDER as readonly string[]).includes(upper) ? (upper as Severity) : null;
}

export function toVulnerability(record: GrailRecord): TopVulnerability {
  const cves = list(record, 'cve');
  return {
    displayId: str(record, 'displayId') ?? '—',
    title: str(record, 'title') ?? '—',
    severity: normaliseSeverity(str(record, 'level')) ?? normaliseSeverity(str(record, 'riskLevel')),
    score: num(record, 'score'),
    technology: str(record, 'technology'),
    cve: cves.length > 0 ? cves.join(', ') : str(record, 'cve'),
    exploitable: str(record, 'exploitStatus') === 'AVAILABLE',
    publicExposure: str(record, 'exposureStatus') === 'PUBLIC_NETWORK',
    functionInUse: str(record, 'functionStatus') === 'IN_USE',
    entityCount: list(record, 'entityNames').length,
  };
}

/**
 * The detail list as a summary. `posture`, when the aggregate answered, supplies every total;
 * without it the totals are counted from the list, which is exact only while the list is
 * shorter than its cap.
 */
export function summariseVulnerabilities(
  records: readonly GrailRecord[],
  topLimit = 10,
  posture: { records: readonly GrailRecord[]; complete: boolean } | null = null,
): VulnerabilitySummary {
  const bySeverity = severityCounts();
  let ungraded = 0;
  let exploitableCount = 0;
  let publicCount = 0;
  let inUseCount = 0;
  const pairs = { exploitPublic: 0, exploitInUse: 0, publicInUse: 0 };
  const top: TopVulnerability[] = [];
  const remediation: TopVulnerability[] = [];
  const techCounts = new Map<string, number>();

  for (const record of records) {
    const vuln = toVulnerability(record);
    if (vuln.severity === null) ungraded += 1;
    else bySeverity[vuln.severity] += 1;

    if (top.length < topLimit) top.push(vuln);

    if (vuln.technology !== null && vuln.technology !== '') {
      techCounts.set(vuln.technology, (techCounts.get(vuln.technology) ?? 0) + 1);
    }
    if (vuln.exploitable) exploitableCount += 1;
    if (vuln.publicExposure) publicCount += 1;
    if (vuln.functionInUse) inUseCount += 1;
    if (vuln.exploitable && vuln.publicExposure) pairs.exploitPublic += 1;
    if (vuln.exploitable && vuln.functionInUse) pairs.exploitInUse += 1;
    if (vuln.publicExposure && vuln.functionInUse) pairs.publicInUse += 1;

    // The immediate-action bar: a weaponised, reachable, actually-called flaw.
    if (vuln.exploitable && vuln.publicExposure && vuln.functionInUse) {
      remediation.push(vuln);
    }
  }

  const fromList: PostureSummary = {
    total: records.length,
    bySeverity,
    ungraded,
    byTechnology: topTechnologies(techCounts),
    actNowCount: remediation.length,
    exploitableCount,
    publicCount,
    inUseCount,
    twoSignalsCount: twoOfThree(pairs, remediation.length),
    pairs,
  };

  return {
    ...(posture === null ? fromList : summarisePosture(posture.records)),
    top,
    remediation: remediation.slice(0, 8),
    listed: records.length,
    exact: posture === null ? records.length < VULNERABILITY_LIST_LIMIT : posture.complete,
  };
}
