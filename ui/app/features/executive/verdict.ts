import type { Verdict } from '../../components/VerdictHero';
import { assumed } from '../../config/assumptions';
import type { EntityModelState } from '../../models/entityHealth';
import type { GrailRecord } from '../../utils/records';
import { num, str } from '../../utils/records';

/**
 * The headline verdict of the Executive summary, and the MTTR it rests on (3.2.4: extracted so
 * the executive page of the SE deck reads the very same rule as the screen).
 *
 * Derived from measured values by rules stated here rather than by judgement, so the same data
 * always produces the same verdict and a reader can check the reasoning. The thresholds are review
 * conventions of the assumptions registry — not Dynatrace thresholds and not customer objectives.
 */

export interface MttrRow {
  category: string;
  problems: number;
  mttrNs: number | null;
  medianNs: number | null;
  p90Ns: number | null;
  totalNs: number;
}

export interface MttrSummary {
  rows: MttrRow[];
  resolvedProblems: number;
  resolvedTotalNs: number;
  /** Weighted across categories, so a category with few slow problems cannot dominate. */
  overallMttrNs: number | null;
}

export function summariseMttr(records: readonly GrailRecord[]): MttrSummary {
  const rows = records.map((record) => ({
    category: str(record, 'event.category') ?? 'Uncategorised',
    problems: num(record, 'problems') ?? 0,
    mttrNs: num(record, 'mttrNs'),
    medianNs: num(record, 'medianNs'),
    p90Ns: num(record, 'p90Ns'),
    totalNs: num(record, 'totalNs') ?? 0,
  }));
  const resolvedProblems = rows.reduce((total, row) => total + row.problems, 0);
  const resolvedTotalNs = rows.reduce((total, row) => total + row.totalNs, 0);
  return { rows, resolvedProblems, resolvedTotalNs, overallMttrNs: resolvedProblems > 0 ? resolvedTotalNs / resolvedProblems : null };
}

export interface VerdictInput {
  mttxOutcome: string;
  exposureOutcome: string;
  overallMttrNs: number | null;
  activeProblems: number | null;
  /** The entity model's state (`diagnoseEntityModel`): problem data can be readable while it is down. */
  entityModel: EntityModelState;
}

/** The verdict and the key of its words (`verdict.{key}`, `verdict.{key}.detail`). */
export function deriveVerdict(input: VerdictInput): { verdict: Verdict; key: string } {
  if (input.mttxOutcome === 'no-permission' || input.exposureOutcome === 'no-permission') return { verdict: 'blocked', key: 'blocked' };
  if (input.overallMttrNs === null || input.activeProblems === null) return { verdict: 'unknown', key: 'unknown' };
  // The entity model can be down while problem data is perfectly readable: a partial assessment.
  if (input.entityModel === 'unavailable') return { verdict: 'mixed', key: 'partial' };
  const mttrHours = input.overallMttrNs / 3_600_000_000_000;
  if (mttrHours <= assumed('problems.mttr.good') && input.activeProblems <= assumed('problems.open.good')) return { verdict: 'strong', key: 'healthy' };
  if (mttrHours <= assumed('problems.mttr.attention') && input.activeProblems <= assumed('problems.open.attention')) return { verdict: 'good', key: 'stable' };
  return { verdict: 'attention', key: 'attention' };
}
