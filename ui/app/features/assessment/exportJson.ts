import type { CatalogQueryResult } from '../../hooks/useCatalogQuery';
import type { AdoptionRow } from './adoption';
import type { CoverageIndex } from './coverageIndex';
import { priorityOf, type AssessmentFinding } from './findings';

/**
 * The Assessment as a file (3.4.2, proposal §C8 F-02): every figure with where it came from — the
 * catalog query id, the DQL sent, how the read went and when it was read — so a reviewer can re-run
 * each number, and a partner can put the assessments of several environments of one customer side by
 * side. For the SE and the partner (decision D-C7: not to the customer before masking exists).
 *
 * Never in the file: a tenant id or URL, a token, a price. The customer and engagement names are
 * the PoC's own labels, as on the PDF cover.
 */

export const ASSESSMENT_FILE_FORMAT = 'pvs.assessment.v1';

export interface AssessmentFileMeta {
  appVersion: string;
  generatedAt: string;
  customer: string;
  engagement: string;
  lens: string;
  window: { label: string; startIso: string; endIso: string };
}

export function buildAssessmentFile(
  input: {
    index: CoverageIndex;
    adoption: readonly AdoptionRow[];
    findings: readonly AssessmentFinding[];
    reads: readonly CatalogQueryResult[];
  },
  meta: AssessmentFileMeta,
): Record<string, unknown> {
  const sources = input.reads.filter((result, position, all) => all.findIndex((other) => other.entry.id === result.entry.id) === position);
  return {
    format: ASSESSMENT_FILE_FORMAT,
    generator: `PoC Automation 3.0 ${meta.appVersion}`,
    generatedAt: meta.generatedAt,
    customer: meta.customer,
    engagement: meta.engagement,
    lens: meta.lens,
    window: meta.window,
    method: 'Every figure was read from Dynatrace through the queries listed in "sources"; nothing is estimated or generated. A domain or capability that was not read is stated as such, never as zero.',
    index: {
      value: input.index.value,
      calculation: '100 × Σ(weight × share) ÷ Σ weight, over the domains measured and applicable',
      measuredWeight: input.index.measuredWeight,
      applicableWeight: input.index.applicableWeight,
      missing: input.index.missing,
      domains: input.index.domains.map((domain) => ({
        id: domain.id,
        weight: domain.weight,
        state: domain.state.kind,
        reason: domain.state.kind === 'unavailable' ? domain.state.reason : null,
        numerator: domain.state.kind === 'measured' ? domain.state.numerator : null,
        denominator: domain.state.kind === 'measured' ? domain.state.denominator : null,
        share: domain.state.kind === 'measured' ? domain.state.share : null,
        points: domain.contribution,
        queryIds: domain.queryIds,
      })),
    },
    platformUsage: input.adoption.map((row) => ({ capability: row.id, state: row.state, measured: row.measured, queryIds: row.evidence })),
    findings: input.findings.map((finding) => ({
      rule: finding.rule,
      class: finding.cls,
      kind: finding.kind,
      priority: priorityOf(finding),
      title: finding.title,
      measured: finding.observation,
      possibleImpact: finding.impact,
      recommendation: finding.recommendation,
      capability: finding.capability,
      impact: finding.impactLevel,
      effort: finding.effort,
      queryIds: finding.evidence,
    })),
    sources: sources.map((result) => ({
      queryId: result.entry.id,
      requiredScope: result.entry.requiredScope,
      outcome: result.outcome,
      window: result.timeframe.label,
      readAt: result.evidence.collectedAt ?? null,
      dql: result.dql ?? result.entry.dql,
    })),
  };
}

/** "assessment-acme-corp-2026-11-18.json": the customer, never an id or a tenant. */
export function assessmentFileName(customerName: string, date: Date): string {
  const slug = customerName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `assessment-${slug === '' ? 'environment' : slug}-${date.toISOString().slice(0, 10)}.json`;
}
