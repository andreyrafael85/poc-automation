import React from 'react';

import { Chip, MessageContainer } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { WorkflowIcon } from '@dynatrace/strato-icons';

import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { TrendChart } from '../components/TrendChart';
import { useChartFormat } from '../components/spectrum';
import { BarList } from '../components/viz/BarList';
import { seriesOf } from '../models/series';
import { useQueryScope } from '../config/StudioContext';
import { PALETTE } from '../design/palette';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { CatalogTable } from '../components/CatalogTable';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SectionIntro } from '../components/SectionIntro';
import { getQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { formatNanos } from '../utils/time';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import { Callout, Stack } from '../engine';
import { AssistPanel } from '../components/AssistPanel';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { RingRankPanel } from '../engine/chart/RingRankPanel';
import { decimal } from '../utils/activeLocale';

/**
 * Automation and workflows.
 *
 * Measured automation, not promised automation. Failing workflows are shown as
 * prominently as succeeding ones: presenting automation as proven while some of
 * it is failing on a schedule would not survive scrutiny.
 *
 * Nothing on this page executes, triggers or modifies a workflow.
 */

interface WorkflowRow extends GrailRecord {
  title: string;
  state: string;
  trigger: string;
  executions: number | null;
  avgDuration: string;
}

const columns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<WorkflowRow>[] => [
  { id: 'title', header: t('p.auto.h.workflow'), accessor: 'title', width: '2.2fr' },
  {
    id: 'state',
    header: t('p.auto.h.finalState'),
    accessor: 'state',
    width: 140,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        <Chip
          color={rowData.state === 'SUCCESS' ? 'success' : rowData.state === 'ERROR' ? 'critical' : 'neutral'}
          variant="accent"
          size="condensed"
        >
          {rowData.state}
        </Chip>
      </DataTable.DefaultCell>
    ),
  },
  { id: 'trigger', header: t('p.auto.h.trigger'), accessor: 'trigger', width: 150 },
  {
    id: 'executions',
    header: t('p.auto.h.executions'),
    accessor: 'executions',
    width: 140,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.executions)}</DataTable.DefaultCell>
    ),
  },
  { id: 'avgDuration', header: t('common.avgDuration'), accessor: 'avgDuration', width: 150, alignment: 'right' },
];

const toRows = (records: GrailRecord[]): WorkflowRow[] =>
  records.map((record) => ({
    ...record,
    title: str(record, 'title') ?? 'Untitled workflow',
    state: str(record, 'state') ?? 'Not reported',
    trigger: str(record, 'trigger') ?? 'Not reported',
    executions: num(record, 'executions'),
    avgDuration: formatNanos(num(record, 'avgDurationNs')),
  }));

export const AutomationAndWorkflows = () => {
  const { t, tCount, formatNumber, formatCount } = useTranslation();
  const scope = useQueryScope();
  const totals = useCatalogQuery('auto.workflows.total', scope);
  const failing = useCatalogQuery('auto.failing', scope);
  const fmt = useChartFormat();
  const factFrom = useSummaryFact();

  // The totals are counted in the query over every finished execution. The list below is the
  // busiest workflow/state/trigger combinations only, so it is never summed.
  const totalsRow = totals.records[0];
  const distinct = num(totalsRow, 'workflows');
  const executions = num(totalsRow, 'executions');
  const failed = num(totalsRow, 'failed');
  const successRate =
    executions !== null && failed !== null && executions > 0 ? ((executions - failed) * 100) / executions : null;

  // 3.3.13: Dynatrace Assist — where an automation owner should look first, from measured signals only.
  const worstWorkflow = failing.records
    .map((record) => ({ name: str(record, 'title') ?? t('p.auto.untitled'), failed: num(record, 'failed') ?? 0, runs: num(record, 'executions') ?? 0 }))
    .filter((row) => row.failed > 0)
    .sort((a, b) => b.failed - a.failed)[0];
  const autoAssist: string[] = [];
  if (totals.outcome === 'ok' && executions !== null && executions > 0 && successRate !== null) {
    autoAssist.push(t('p.auto.assist.s.rate', { executions: formatNumber(executions), rate: decimal(successRate, 1) }));
    if (worstWorkflow !== undefined) {
      autoAssist.push(t('p.auto.assist.s.worst', { name: worstWorkflow.name, failed: formatNumber(worstWorkflow.failed), runs: formatNumber(worstWorkflow.runs) }));
    } else if (failed === 0) {
      autoAssist.push(t('p.auto.assist.s.clean'));
    }
  }

  const headline: SummaryItem[] = [
    {
      key: 'workflows',
      label: t('p.auto.band.workflows'),
      fact: factFrom(totals, distinct),
      display: distinct === null ? undefined : formatNumber(distinct),
      detail: t('p.auto.band.workflowsDetail'),
    },
    {
      key: 'executions',
      label: t('p.auto.band.executions'),
      fact: factFrom(totals, executions),
      display: executions === null ? undefined : formatNumber(executions),
      detail: t('p.auto.band.executionsDetail'),
    },
    {
      key: 'rate',
      label: t('p.auto.band.rate'),
      fact: factFrom(totals, successRate === null ? null : Number(successRate.toFixed(1)), {
        calculation: t('p.auto.band.rateCalc'),
        unit: '%',
      }),
      display: successRate === null ? undefined : `${decimal(successRate, 1)}%`,
      detail: t('p.auto.band.rateDetail'),
      tone: successRate !== null && successRate >= 99 ? PALETTE.good : PALETTE.info,
    },
    {
      key: 'failed',
      label: t('p.auto.band.failed'),
      fact: factFrom(totals, failed),
      display: failed === null ? undefined : formatNumber(failed),
      detail: t('p.auto.band.failedDetail'),
      tone: failed !== null && failed > 0 ? PALETTE.review : PALETTE.good,
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.auto.title"
        questionKey="p.auto.question"
        takeawayKey="p.auto.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.auto.band.footnote')} />

      {/* 3.3.13: the success ring and the workflows that fail first beside the Assist (a cockpit row). */}
      <CockpitRow data-testid="auto-cockpit">
        <RingRankPanel
          data-testid="auto-ringrank"
          title={t('p.auto.failing.title')}
          provenance={failing.provenance}
          evidence={failing.evidence}
          ring={{
            family: 'moss',
            value: successRate,
            valueDisplay: successRate === null ? undefined : `${decimal(successRate, 1)}%`,
            label: t('p.auto.ring.label'),
            caption: executions === null ? undefined : t('p.auto.ring.caption', { count: formatNumber(executions) }),
            ariaLabel: t('p.auto.ring.aria'),
            missingLabel: t('tl.notMeasured'),
            fact: factFrom(totals, successRate === null ? null : Number(successRate.toFixed(1)), {
              calculation: t('p.auto.band.rateCalc'),
              unit: '%',
            }),
          }}
        >
          <QueryStateBoundary result={failing}>
            {failing.records.length === 0 ? (
              <Text>{t('p.auto.failing.none')}</Text>
            ) : (
              <>
                <Text className="pvs-caption">{t('p.auto.failing.caption')}</Text>
                <BarList
                  role="exposure"
                  ariaLabel={t('p.auto.failing.title')}
                  items={failing.records.map((record) => {
                    const title = str(record, 'title') ?? t('p.auto.untitled');
                    const failed = num(record, 'failed') ?? 0;
                    const runs = num(record, 'executions') ?? 0;
                    const rate = num(record, 'failureRatePct');
                    return {
                      key: title,
                      label: title,
                      value: failed,
                      display: t('p.auto.failing.row', {
                        failed: formatNumber(failed),
                        runs: formatNumber(runs),
                        rate: rate === null ? '—' : decimal(rate, rate >= 99.95 ? 0 : 1),
                      }),
                      icon: <WorkflowIcon size={16} />,
                    };
                  })}
                />
              </>
            )}
          </QueryStateBoundary>
        </RingRankPanel>
        {autoAssist.length > 0 && (
          <AssistPanel
            eyebrow={t('assist.tech.eyebrow')}
            title={t('p.auto.assist.title')}
            sentences={autoAssist}
            note={t('assist.tech.note')}
          />
        )}
      </CockpitRow>

      <Stack as="section" gap="group">
        <Heading level={3} as="h2">
          {t('p.auto.trend.title')}
        </Heading>
        <TrendChart
          queryId="auto.trend"
          series={[
            {
              key: 'succeeded',
              title: t('p.auto.trend.succeeded'),
              family: 'moss',
              headline: 'sum',
              read: (records) => seriesOf(records[0], 'succeeded'),
              format: (value) => fmt.compact(value),
            },
            {
              key: 'failed',
              title: t('p.auto.trend.failed'),
              family: 'orange',
              headline: 'sum',
              read: (records) => seriesOf(records[0], 'failed'),
              format: (value) => fmt.compact(value),
            },
          ]}
        />
      </Stack>

      <Callout kind="note" title={t('p.auto.noExecTitle')}>
        {t('p.auto.noExecBody')}
      </Callout>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.auto.executions')}</Heading>
        <CatalogTable<WorkflowRow>
          queryId="auto.workflows"
          columns={columns(t, formatCount)}
          transform={toRows}
          pageSize={20}
          permissionImpact={t('st.auto.perm')}
          emptyMessage={t('st.auto.empty')}
          summary={(result) => {
            // Counts come from the exact totals; the rows only name the failing workflows. Without
            // the totals the page states nothing here rather than a zero ("all good") it never read.
            if (totals.outcome !== 'ok' || totalsRow === undefined) return null;
            const failing = toRows(result.records).filter((row) => row.state === 'ERROR');
            const failingCount = num(totalsRow, 'failingWorkflows') ?? failing.length;
            const failedRuns = failed ?? 0;
            const successfulRuns = num(totalsRow, 'succeeded') ?? 0;

            if (failingCount === 0) {
              return (
                <Text>
                  {t('p.auto.allGoodLine', {
                    runs: formatNumber(successfulRuns),
                    count: distinct ?? 0,
                  })}
                </Text>
              );
            }
            return (
              <MessageContainer variant="critical">
                <MessageContainer.Title>
                  {tCount('p.auto.failingCount', failingCount, { count: failingCount })}
                </MessageContainer.Title>
                <MessageContainer.Description>
                  <Flex flexDirection="column" gap={4}>
                    <Paragraph>
                      {t('p.auto.failingBody', {
                        failed: formatNumber(failedRuns),
                        success: formatNumber(successfulRuns),
                      })}
                    </Paragraph>
                    <Text>
                      {t('p.auto.failingList', {
                        list: failing.map((row) => row.title).join(', '),
                      })}
                    </Text>
                  </Flex>
                </MessageContainer.Description>
              </MessageContainer>
            );
          }}
        />
      </Flex>

      <Flex flexDirection="column" gap={8}>
        <Heading level={3} as="h2">{t('p.auto.whereNext')}</Heading>
        <Paragraph>
          {t('p.auto.whereNextBody')}
        </Paragraph>
        <Text>
          {t('p.auto.whereNextRec')}
        </Text>
      </Flex>

      <DqlDisclosure
        entries={[getQuery('auto.workflows.total'), getQuery('auto.failing'), getQuery('auto.trend'), getQuery('auto.workflows'), getQuery('prob.recurrent')]}
      />
    </Stack>
  );
};
