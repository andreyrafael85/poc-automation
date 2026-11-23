import React from 'react';

import { Chip, HealthIndicator } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useQueryScope } from '../../config/StudioContext';
import { useCatalogQuery, type CatalogQueryResult } from '../../hooks/useCatalogQuery';
import type { Confidence } from '../../models/provenance';
import { summarisePosture } from '../../models/security';
import { useCommercialVisible } from '../../components/SeOnly';
import { StatusRadar } from '../../components/spectrum';
import { COMMERCIAL_SCORECARD_ROWS } from '../insights/audience';
import { bool, num, str } from '../../utils/records';
import type { StringKey } from '../../i18n/strings';
import { useTranslation, type Translation } from '../../i18n/useTranslation';

/**
 * PoC Value Scorecard.
 *
 * Ten dimensions, each with its own status, evidence and gap. They are
 * deliberately never combined into a single number: a blended score would hide
 * which dimension is weak, and no weighting methodology has been agreed with
 * anyone. Aggregation stays a decision for the reader.
 *
 * Every status is computed from a live query outcome. Nothing here is hardcoded
 * except the wording of the recommendations.
 *
 * A dimension whose source did not answer says so — status "Not read", the reason, no
 * figure. It never states a count it did not read ("0 buckets enumerated"), never claims
 * "Working" for something it did not look at, and never turns a refusal into a red
 * "Blocked": a missing permission is a limit of the review, not a fault in the estate.
 */

export type DimensionStatus = 'ideal' | 'good' | 'neutral' | 'warning' | 'critical' | 'unread';

export interface Dimension {
  id: string;
  dimension: string;
  status: DimensionStatus;
  statusLabel: string;
  evidence: string;
  source: string;
  gap: string;
  recommendation: string;
  confidence: Confidence;
}

const STATUS_LABEL_KEY: Record<DimensionStatus, StringKey> = {
  ideal: 'f.score.status.ideal',
  good: 'f.score.status.good',
  neutral: 'f.score.status.neutral',
  // Deliberately "worth reviewing" rather than "needs attention": the reader is
  // a customer looking at their own estate, and the dimension row already says
  // what to look at.
  warning: 'f.score.status.warning',
  critical: 'f.score.status.critical',
  unread: 'f.score.status.unread',
};

/** What `buildDimensions` reads from a query: its outcome, rows and the scopes it was refused. */
type Source = Pick<CatalogQueryResult, 'outcome' | 'records' | 'missingScopes'>;

export interface ScorecardSources {
  inventory: Source;
  buckets: Source;
  security: Source;
  workflows: Source;
  capabilities: Source;
  problems: Source;
}

/** Did the query answer (with rows, with none, or cut at its scan ceiling)? */
const answered = (source: Source): boolean =>
  source.outcome === 'ok' || source.outcome === 'empty' || source.outcome === 'scan-limit';

export function buildDimensions(
  sources: ScorecardSources,
  t: Translation['t'],
  formatNumber: Translation['formatNumber'],
): Omit<Dimension, 'statusLabel'>[] {
  const { inventory, buckets, security, workflows, capabilities, problems } = sources;

  /** The evidence sentence of a row whose source(s) did not answer, by the first one that did not. */
  const unreadEvidence = (...needed: Source[]): string =>
    needed.find((source) => !answered(source))?.outcome === 'no-permission'
      ? t('f.score.unread.refused')
      : t('f.score.unread.failed');
  const allAnswered = (...needed: Source[]): boolean => needed.every(answered);

  const countOf = (category: string): number | null =>
    num(
      inventory.records.find((record) => str(record, 'category') === category),
      'value',
    );

  const bucketsByTable = (table: string) =>
    buckets.records.filter((record) => str(record, 'table') === table);

  const readableBuckets = (table: string) =>
    bucketsByTable(table).filter((record) => bool(record, 'hasAccess') === true);

  const unreadableBuckets = buckets.records.filter((record) => bool(record, 'hasAccess') === false);

  const hosts = countOf('Hosts');
  const services = countOf('Services');
  const clusters = countOf('Kubernetes clusters');
  const workloads = countOf('Kubernetes workloads');
  const webApps = countOf('Web applications');
  const mobileApps = countOf('Mobile applications');
  const syntheticMonitors = countOf('Synthetic monitors');
  const processes = countOf('Process instances');

  const spanBuckets = readableBuckets('spans');
  const spanRecords = spanBuckets.reduce((total, record) => total + (num(record, 'records') ?? 0), 0);
  const shortestSpanRetention = spanBuckets.reduce<number | null>((shortest, record) => {
    const days = num(record, 'retentionDays');
    if (days === null) return shortest;
    return shortest === null ? days : Math.min(shortest, days);
  }, null);

  const logBuckets = readableBuckets('logs');
  const logRecords = logBuckets.reduce((total, record) => total + (num(record, 'records') ?? 0), 0);

  const sessionBuckets = bucketsByTable('user.sessions');
  const sessionsReadable = sessionBuckets.some((record) => bool(record, 'hasAccess') === true);
  const sessionRecords = sessionBuckets.reduce(
    (total, record) => total + (num(record, 'records') ?? 0),
    0,
  );

  // Totals over every finished execution (`auto.workflows.total`). Until 3.2.0 these were summed
  // from the 40 rows of the ranked list, which stops at its `limit` (exactness rule, KT §6.2).
  const workflowTotals = workflows.records[0];
  const successfulWorkflowRuns = workflowTotals === undefined ? 0 : num(workflowTotals, 'succeeded') ?? 0;
  const failedWorkflowRuns = workflowTotals === undefined ? 0 : num(workflowTotals, 'failed') ?? 0;

  const capabilityCount = capabilities.records.length;

  const rawDimensions: Omit<Dimension, 'statusLabel'>[] = [
    {
      id: 'observational-coverage',
      dimension: t('f.score.d.coverage'),
      status: !answered(inventory)
        ? 'unread'
        : hosts !== null && hosts > 0 && services !== null && services > 0
          ? 'good'
          : 'neutral',
      evidence: answered(inventory)
        ? t('f.score.d.coverage.evidence', {
            hosts: hosts ?? '—',
            services: services ?? '—',
            processes: processes ?? '—',
          })
        : unreadEvidence(inventory),
      source: 'cov.inventory (entity model, 0 bytes scanned)',
      gap: t('f.score.d.coverage.gap'),
      recommendation: t('f.score.d.coverage.rec'),
      confidence: 'high',
    },
    {
      id: 'topological-context',
      dimension: t('f.score.d.topology'),
      status: !answered(inventory)
        ? 'unread'
        : services !== null && services > 0 && clusters !== null && clusters > 0
          ? 'good'
          : 'neutral',
      evidence: answered(inventory)
        ? t('f.score.d.topology.evidence', {
            services: services ?? '—',
            clusters: clusters ?? '—',
            workloads: workloads ?? '—',
          })
        : unreadEvidence(inventory),
      source: 'cov.inventory, prob.list (smartscape.affected_entities)',
      gap: t('f.score.d.topology.gap'),
      recommendation: t('f.score.d.topology.rec'),
      confidence: 'high',
    },
    {
      id: 'anomaly-detection',
      dimension: t('f.score.d.anomaly'),
      // "Working" needs problems that were actually read; a feed that answered with none says
      // nothing about detection, and one that did not answer says nothing at all.
      status: !answered(problems) ? 'unread' : problems.records.length > 0 ? 'good' : 'neutral',
      evidence: !answered(problems)
        ? unreadEvidence(problems)
        : problems.records.length > 0
          ? t('f.score.d.anomaly.evidence')
          : t('f.score.d.anomaly.empty'),
      source: 'prob.summary, prob.recurrent (7-day window)',
      gap: t('f.score.d.anomaly.gap'),
      recommendation: t('f.score.d.anomaly.rec'),
      confidence: 'high',
    },
    {
      id: 'diagnostic-capability',
      dimension: t('f.score.d.diagnostic'),
      status: !answered(buckets) ? 'unread' : spanRecords > 0 ? 'good' : 'warning',
      evidence: !answered(buckets)
        ? unreadEvidence(buckets)
        : spanRecords > 0
          ? t('f.score.d.diagnostic.evidence', { spans: formatNumber(spanRecords) })
          : t('f.score.d.diagnostic.none'),
      source: 'cov.buckets (spans)',
      gap:
        shortestSpanRetention === null
          ? t('f.score.d.diagnostic.gapUnknown')
          : t('f.score.d.diagnostic.gap', { days: shortestSpanRetention }),
      recommendation: t('f.score.d.diagnostic.rec'),
      confidence: 'high',
    },
    {
      id: 'digital-experience',
      dimension: t('f.score.d.dx'),
      // Sessions the identity cannot read are a limit of the review ("Not read"), not a fault
      // in the estate; sessions that were read but are few are worth a look.
      status: !allAnswered(inventory, buckets)
        ? 'unread'
        : !sessionsReadable
          ? 'unread'
          : sessionRecords > 100
            ? 'good'
            : 'warning',
      evidence: !allAnswered(inventory, buckets)
        ? unreadEvidence(inventory, buckets)
        : t('f.score.d.dx.evidence', {
            web: webApps ?? '—',
            mobile: mobileApps ?? '—',
            sessions: sessionsReadable ? formatNumber(sessionRecords) : t('f.score.d.dx.denied'),
            synthetic: syntheticMonitors ?? '—',
          }),
      source: 'cov.inventory, cov.buckets (user.sessions)',
      gap: t('f.score.d.dx.gap'),
      recommendation: t('f.score.d.dx.rec'),
      confidence: 'high',
    },
    {
      id: 'automation',
      dimension: t('f.score.d.automation'),
      status: !answered(workflows)
        ? 'unread'
        : successfulWorkflowRuns > 0 && failedWorkflowRuns === 0
          ? 'ideal'
          : successfulWorkflowRuns > 0
            ? 'warning'
            : 'neutral',
      evidence: !answered(workflows)
        ? unreadEvidence(workflows)
        : workflows.outcome === 'ok'
          ? t('f.score.d.automation.evidence', {
              success: formatNumber(successfulWorkflowRuns),
              failed: formatNumber(failedWorkflowRuns),
            })
          : t('f.score.d.automation.none'),
      source: 'auto.workflows.total (WORKFLOW_EVENT)',
      gap:
        failedWorkflowRuns > 0
          ? t('f.score.d.automation.gapFailing')
          : t('f.score.d.automation.gapOk'),
      recommendation:
        failedWorkflowRuns > 0
          ? t('f.score.d.automation.recFailing')
          : t('f.score.d.automation.recOk'),
      confidence: 'high',
    },
    {
      id: 'security',
      dimension: t('f.score.d.security'),
      status: !answered(security) ? 'unread' : security.outcome === 'ok' ? 'good' : 'neutral',
      evidence: !answered(security)
        ? security.outcome === 'no-permission'
          ? t('f.score.d.security.denied')
          : unreadEvidence(security)
        : t('f.score.d.security.evidence', { count: summarisePosture(security.records).total }),
      source: 'sec.posture (security.events)',
      gap:
        security.outcome === 'no-permission'
          ? t('f.score.d.security.gapScope', { scopes: security.missingScopes.join(', ') })
          : t('f.score.d.security.gapOk'),
      recommendation: t('f.score.d.security.rec'),
      confidence: 'high',
    },
    {
      id: 'data-governance',
      dimension: t('f.score.d.governance'),
      status: !answered(buckets) ? 'unread' : unreadableBuckets.length > 0 ? 'warning' : 'good',
      evidence: !answered(buckets)
        ? unreadEvidence(buckets)
        : t('f.score.d.governance.evidence', {
            buckets: buckets.records.length,
            unreadable: unreadableBuckets.length,
            records: formatNumber(logRecords),
          }),
      source: 'cov.buckets (dt.system.buckets)',
      gap: t('f.score.d.governance.gap'),
      recommendation: t('f.score.d.governance.rec'),
      confidence: 'medium',
    },
    {
      id: 'consumption-sustainability',
      dimension: t('f.score.d.consumption'),
      status: answered(capabilities) ? 'neutral' : 'unread',
      evidence: !answered(capabilities)
        ? unreadEvidence(capabilities)
        : capabilities.outcome === 'ok'
          ? t('f.score.d.consumption.evidence', { count: capabilityCount })
          : t('f.score.d.consumption.none'),
      source: 'cons.capabilities (BILLING_USAGE_EVENT)',
      gap: t('f.score.d.consumption.gap'),
      recommendation: t('f.score.d.consumption.rec'),
      confidence: 'medium',
    },
    {
      id: 'expansion-readiness',
      dimension: t('f.score.d.expansion'),
      status: allAnswered(capabilities, inventory) ? 'neutral' : 'unread',
      evidence: !allAnswered(capabilities, inventory)
        ? unreadEvidence(capabilities, inventory)
        : t('f.score.d.expansion.evidence', {
            capabilities: capabilityCount,
            clusters: clusters ?? '—',
            services: services ?? '—',
          }),
      source: 'cons.capabilities, cov.inventory',
      gap: t('f.score.d.expansion.gap'),
      recommendation: t('f.score.d.expansion.rec'),
      confidence: 'medium',
    },
  ];
  return rawDimensions;
}

export const Scorecard = () => {
  const scope = useQueryScope();
  const { t, formatNumber } = useTranslation();

  // Every query below either scans zero Grail bytes or carries a small scan
  // ceiling, so opening this page is cheap by construction.
  const inventory = useCatalogQuery('cov.inventory', scope);
  const buckets = useCatalogQuery('cov.buckets', scope);
  const security = useCatalogQuery('sec.posture', scope);
  const workflows = useCatalogQuery('auto.workflows.total', scope);
  const capabilities = useCatalogQuery('cons.capabilities', scope);
  const problems = useCatalogQuery('prob.summary', scope);

  const isLoading =
    inventory.isLoading ||
    buckets.isLoading ||
    security.isLoading ||
    workflows.isLoading ||
    capabilities.isLoading ||
    problems.isLoading;

  const commercial = useCommercialVisible();
  const dimensions: Dimension[] = buildDimensions(
    { inventory, buckets, security, workflows, capabilities, problems },
    t,
    formatNumber,
  )
    // Rows framed around licences and expansion are for the SE, not for a customer.
    .filter((dimension) => commercial || !COMMERCIAL_SCORECARD_ROWS.has(dimension.id))
    .map((dimension) => ({
      ...dimension,
      statusLabel: t(STATUS_LABEL_KEY[dimension.status]),
    }));

  const columns: DataTableColumnDef<Dimension>[] = [
    {
      id: 'dimension',
      header: t('f.score.h.dimension'),
      accessor: 'dimension',
      width: '1.4fr',
      // A column narrower than its longest word breaks it mid-word ("Observatio-nal").
      minWidth: 180,
      cell: ({ rowData }) => (
        <DataTable.DefaultCell>
          <Flex alignItems="center" gap={8}>
            <HealthIndicator status={rowData.status === 'unread' ? 'neutral' : rowData.status} aria-label={rowData.statusLabel} />
            <Text>{rowData.dimension}</Text>
          </Flex>
        </DataTable.DefaultCell>
      ),
    },
    {
      id: 'statusLabel',
      header: t('common.status'),
      accessor: 'statusLabel',
      width: 140,
      minWidth: 130,
      cell: ({ rowData }) => (
        <DataTable.DefaultCell>
          <Chip
            color={
              rowData.status === 'critical'
                ? 'critical'
                : rowData.status === 'warning'
                  ? 'warning'
                  : rowData.status === 'neutral' || rowData.status === 'unread'
                    ? 'neutral'
                    : 'success'
            }
            variant="accent"
            size="condensed"
          >
            {rowData.statusLabel}
          </Chip>
        </DataTable.DefaultCell>
      ),
    },
    { id: 'evidence', header: t('common.evidence'), accessor: 'evidence', width: '2fr', minWidth: 170 },
    { id: 'source', header: t('common.source'), accessor: 'source', width: '1.2fr', minWidth: 140 },
    { id: 'gap', header: t('f.score.h.gap'), accessor: 'gap', width: '2fr', minWidth: 170 },
    { id: 'recommendation', header: t('common.recommendation'), accessor: 'recommendation', width: '2fr', minWidth: 170 },
    { id: 'confidence', header: t('common.confidence'), accessor: 'confidence', width: 110, minWidth: 100 },
  ];

  return (
    <Flex flexDirection="column" gap={12}>
      <Heading level={4} as="h2">{t('f.score.title')}</Heading>
      <Paragraph>{t('f.score.bodyCount', { count: formatNumber(dimensions.length) })}</Paragraph>
      {isLoading ? (
        <Text>{t('f.score.evaluating')}</Text>
      ) : (
        <>
          {/* 3.2.1: the same statuses as a profile, worst first beside it. Ordinal on purpose. */}
          <Flex flexDirection="column" gap={4}>
            <Heading level={5} as="h3">{t('f.score.radar.title')}</Heading>
            <StatusRadar
              axes={dimensions.map((dimension) => ({
                id: dimension.id,
                label: dimension.dimension,
                status: dimension.status === 'unread' ? null : dimension.status,
                statusLabel: dimension.statusLabel,
              }))}
              rungLabels={[
                t('f.score.status.critical'),
                t('f.score.status.warning'),
                t('f.score.status.neutral'),
                t('f.score.status.good'),
                t('f.score.status.ideal'),
              ]}
              label={t('f.score.radar.aria', {
                list: dimensions.map((dimension) => `${dimension.dimension}: ${dimension.statusLabel}`).join('; '),
              })}
            />
            <Text className="pvs-caption">{t('f.score.radar.caption')}</Text>
          </Flex>
          <DataTable
            data={dimensions}
            columns={columns}
            fullWidth
            lineWrap
            aria-label={t('f.score.tableAria')}
          />
        </>
      )}
    </Flex>
  );
};
