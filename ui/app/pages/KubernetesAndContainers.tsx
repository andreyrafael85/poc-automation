import React from 'react';

import { MessageContainer } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { BrandGlyph, InventoryTile, useChartFormat, type SpectrumFamily } from '../components/spectrum';
import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { TrendChart } from '../components/TrendChart';
import { missingFact } from '../hooks/useSummaryFact';
import { observed } from '../models/provenance';
import type { StringKey } from '../i18n/strings';
import { useQueryScope } from '../config/StudioContext';
import { PALETTE } from '../design/palette';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { CatalogTable } from '../components/CatalogTable';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { AssistPanel } from '../components/AssistPanel';
import { SectionIntro } from '../components/SectionIntro';
import { getQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import { k8sTrendSeries } from '../features/trends/trendSeries';
import { StableWorkloads } from '../features/cockpit/panels';
import { Grid, Panel, Stack } from '../engine';

/**
 * Kubernetes and containers.
 *
 * Restart churn, out-of-memory kills and CPU throttling are the three signals
 * that translate cleanly for both audiences: they are unambiguous, measured, and
 * each one points at a specific workload.
 *
 * Right-sizing suggestions are phrased as recommendations, because the evidence
 * shows pressure, not the correct limit.
 */

interface RestartRow extends GrailRecord {
  workload: string;
  cluster: string;
  total: number | null;
}

const restartColumns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<RestartRow>[] => [
  { id: 'workload', header: t('common.workload'), accessor: 'workload', width: '1.6fr' },
  { id: 'cluster', header: t('common.cluster'), accessor: 'cluster', width: '1.4fr' },
  {
    id: 'total',
    header: t('p.k8s.h.restarts'),
    accessor: 'total',
    width: 180,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.total)}</DataTable.DefaultCell>
    ),
  },
];

const toRestartRows = (records: GrailRecord[]): RestartRow[] =>
  records.map((record) => ({
    ...record,
    workload: str(record, 'workload') ?? 'Not reported',
    cluster: str(record, 'cluster') ?? 'Not reported',
    total: num(record, 'total'),
  }));

/**
 * Throttling of one workload as a reader can act on it (3.2.3, Q9): the share of its CPU limit
 * held back, or the throttled millicores when it sets no limit, or a dash.
 */
export function throttleLabel(
  pct: number | null,
  avgMillicores: number | null,
  t: Translation['t'],
  formatDecimal: Translation['formatDecimal'],
): string {
  if (pct !== null) return `${formatDecimal(pct, 1)}%`;
  if ((avgMillicores ?? 0) > 0) return t('p.k8s.throttle.noLimit', { mc: formatDecimal(avgMillicores ?? 0, 0) });
  return '—';
}

interface PressureRow extends GrailRecord {
  workload: string;
  cluster: string;
  totalOom: number | null;
  /** Average throttled CPU over the average CPU limit, in %; null when the workload sets no limit. */
  throttledPct: number | null;
  /** Average throttled CPU, millicores. */
  throttledAvg: number | null;
}

const pressureColumns = (t: Translation['t'], formatDecimal: Translation['formatDecimal']): DataTableColumnDef<PressureRow>[] => [
  { id: 'workload', header: t('common.workload'), accessor: 'workload', width: '1.6fr' },
  { id: 'cluster', header: t('common.cluster'), accessor: 'cluster', width: '1.4fr' },
  {
    id: 'totalOom',
    header: t('p.k8s.h.oom'),
    accessor: 'totalOom',
    width: 180,
    alignment: 'right',
  },
  {
    // 3.2.3 (Q9): a share of the CPU limit, which a reader can act on, instead of a sum of
    // millicores over the hours.
    id: 'throttledPct',
    header: t('p.k8s.h.throttlePct'),
    accessor: 'throttledPct',
    width: 200,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{throttleLabel(rowData.throttledPct, rowData.throttledAvg, t, formatDecimal)}</DataTable.DefaultCell>
    ),
  },
];

const toPressureRows = (records: GrailRecord[]): PressureRow[] =>
  records.map((record) => ({
    ...record,
    workload: str(record, 'workload') ?? 'Not reported',
    cluster: str(record, 'cluster') ?? 'Not reported',
    totalOom: num(record, 'totalOom'),
    throttledPct: num(record, 'throttledPct'),
    throttledAvg: num(record, 'throttledAvg'),
  }));

/** The levels of the Kubernetes estate (`k8s.inventory`), each with its icon and family. */
const K8S_TILES: readonly { kind: string; labelKey: StringKey; icon: React.ReactNode; family: SpectrumFamily; detailKey?: StringKey }[] = [
  { kind: 'clusters', labelKey: 'p.k8s.inv.clusters', icon: <BrandGlyph name="kubernetes" />, family: 'blue' },
  { kind: 'nodes', labelKey: 'p.k8s.inv.nodes', icon: <BrandGlyph name="k8sNode" />, family: 'purple' },
  { kind: 'namespaces', labelKey: 'p.k8s.inv.namespaces', icon: <BrandGlyph name="k8sNamespace" />, family: 'turquoise' },
  { kind: 'workloads', labelKey: 'p.k8s.inv.workloads', icon: <BrandGlyph name="k8sWorkload" />, family: 'blue-turquoise' },
  { kind: 'pods', labelKey: 'p.k8s.inv.pods', icon: <BrandGlyph name="k8sPod" />, family: 'moss', detailKey: 'p.k8s.inv.podsDetail' },
];

export const KubernetesAndContainers = () => {
  const { t, tCount, formatNumber, formatCount, formatDecimal, tWindow } = useTranslation();
  const fmt = useChartFormat();
  const scope = useQueryScope();
  const clusters = useCatalogQuery('k8s.clusters', scope);
  const inventory = useCatalogQuery('k8s.inventory', scope);
  const restarts = useCatalogQuery('k8s.restarts', scope);
  const restartTotals = useCatalogQuery('k8s.restarts.total', scope);
  const pressureTotals = useCatalogQuery('k8s.pressure.total', scope);
  const factFrom = useSummaryFact();

  // The headline figures are counted in the queries over every workload; the two lists below
  // are the 25 worst of each and are never summed.
  const restartingWorkloads = num(restartTotals.records[0], 'workloads') ?? 0;
  const totalRestarts = num(restartTotals.records[0], 'restarts') ?? 0;
  const oomKills = num(pressureTotals.records[0], 'oomKills') ?? 0;
  const throttled = num(pressureTotals.records[0], 'throttledWorkloads') ?? 0;

  // Dynatrace Assist — where an SRE should stabilise the platform first.
  const worstRestart = [...restarts.records]
    .map((record) => ({
      workload: str(record, 'workload'),
      cluster: str(record, 'cluster'),
      total: num(record, 'total'),
    }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0];
  const k8sAssist: string[] = [];
  if (restartTotals.outcome === 'ok' || pressureTotals.outcome === 'ok' || restartTotals.outcome === 'empty' || pressureTotals.outcome === 'empty') {
    if (worstRestart !== undefined && (worstRestart.total ?? 0) > 0) {
      k8sAssist.push(
        t('p.k8s.assist.s.restart', {
          workload: worstRestart.workload ?? '—',
          cluster: worstRestart.cluster ?? '—',
          restarts: formatNumber(worstRestart.total ?? 0),
          total: formatNumber(totalRestarts),
        }),
      );
    }
    if (oomKills > 0 || throttled > 0) {
      k8sAssist.push(
        t('p.k8s.assist.s.pressure', { oom: formatNumber(oomKills), throttled: formatNumber(throttled) }),
      );
    }
    if ((worstRestart?.total ?? 0) === 0 && oomKills === 0 && throttled === 0 && restartTotals.outcome !== 'loading') {
      k8sAssist.push(t('p.k8s.assist.s.stable'));
    }
  }

  const headline: SummaryItem[] = [
    {
      key: 'clusters',
      label: t('p.k8s.band.clusters'),
      fact: factFrom(clusters, clusters.outcome === 'ok' ? clusters.records.length : null),
      display: clusters.outcome === 'ok' ? formatNumber(clusters.records.length) : undefined,
      detail: t('p.k8s.band.clustersDetail'),
    },
    {
      key: 'restarting',
      label: t('p.k8s.band.restarting'),
      fact: factFrom(restartTotals, restartTotals.outcome === 'ok' ? restartingWorkloads : null),
      display: restartTotals.outcome === 'ok' ? formatNumber(restartingWorkloads) : undefined,
      detail: tCount('p.k8s.band.restartingDetail', totalRestarts, { total: formatNumber(totalRestarts) }),
      tone: restartingWorkloads > 0 ? PALETTE.info : PALETTE.good,
    },
    {
      key: 'oom',
      label: t('p.k8s.band.oom'),
      fact: factFrom(pressureTotals, pressureTotals.outcome === 'ok' ? oomKills : null),
      display: pressureTotals.outcome === 'ok' ? formatNumber(oomKills) : undefined,
      detail: t('p.k8s.band.oomDetail'),
      tone: oomKills > 0 ? PALETTE.review : PALETTE.good,
    },
    {
      key: 'throttled',
      label: t('p.k8s.band.throttled'),
      fact: factFrom(pressureTotals, pressureTotals.outcome === 'ok' ? throttled : null),
      display: pressureTotals.outcome === 'ok' ? formatNumber(throttled) : undefined,
      detail: t('p.k8s.band.throttledDetail'),
      tone: throttled > 0 ? PALETTE.review : PALETTE.good,
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.k8s.title"
        questionKey="p.k8s.question"
        takeawayKey="p.k8s.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.k8s.band.footnote')} />

      {/* 3.2.3: the estate first, with the icons of each level. */}
      <Panel as="section" pad="roomy">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('p.k8s.inv.title')}
          </Heading>
          <QueryStateBoundary result={inventory}>
            <Grid min={130}>
              {K8S_TILES.map(({ kind, labelKey, icon, family, detailKey }) => {
                const value = num(inventory.records.find((record) => str(record, 'kind') === kind), 'value');
                return (
                  <InventoryTile
                    key={kind}
                    label={t(labelKey)}
                    icon={icon}
                    family={family}
                    fact={value === null ? missingFact(inventory) : observed(value, inventory.evidence)}
                    display={value === null ? undefined : formatNumber(value)}
                    detail={detailKey === undefined ? undefined : t(detailKey)}
                    compact
                  />
                );
              })}
            </Grid>
            {/* 3.3.10: the window and the query once for the row (every tile reads k8s.inventory). */}
            <Text className="pvs-caption">{t('cockpit.inv.source', { window: tWindow(inventory.timeframe.label), query: 'k8s.inventory' })}</Text>
          </QueryStateBoundary>
        </Stack>
      </Panel>

      <CockpitRow data-testid="k8s-cockpit">
        <StableWorkloads />
        {k8sAssist.length > 0 && (
          <AssistPanel
            eyebrow={t('assist.tech.eyebrow')}
            title={t('p.k8s.assist.title')}
            sentences={k8sAssist}
            note={t('assist.tech.note')}
          />
        )}
      </CockpitRow>

      <Stack as="section" gap="group">
        <Heading level={3} as="h2">
          {t('p.k8s.trend.title')}
        </Heading>
        <TrendChart
          queryId="k8s.restarts.trend"
          series={k8sTrendSeries(t, fmt)}
        />
      </Stack>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.k8s.clusters')}</Heading>
        <CatalogTable
          queryId="k8s.clusters"
          columns={[
            { id: 'name', header: t('common.cluster'), accessor: 'name', width: '1.6fr' },
            { id: 'id', header: t('common.entityId'), accessor: 'id', width: '1.4fr' },
          ]}
        />
      </Flex>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.k8s.instability')}</Heading>
        <Paragraph>
          {t('p.k8s.instabilityBody')}
        </Paragraph>
        <CatalogTable<RestartRow>
          queryId="k8s.restarts"
          columns={restartColumns(t, formatCount)}
          transform={toRestartRows}
          pageSize={15}
          emptyMessage={t('st.k8s.restarts.empty')}
          summary={(result) => {
            const rows = toRestartRows(result.records);
            const worst = rows[0];
            if (worst === undefined) return null;
            return (
              <MessageContainer variant="warning">
                <MessageContainer.Title>
                  {t('p.k8s.highestTitle', {
                    workload: worst.workload,
                    cluster: worst.cluster,
                  })}
                </MessageContainer.Title>
                <MessageContainer.Description>
                  {t('p.k8s.highestBody', {
                    count: formatNumber(worst.total ?? 0),
                    total: restartingWorkloads,
                  })}
                </MessageContainer.Description>
              </MessageContainer>
            );
          }}
        />
      </Flex>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.k8s.pressure')}</Heading>
        <Paragraph>
          {t('p.k8s.pressureBody')}
        </Paragraph>
        <CatalogTable<PressureRow>
          queryId="k8s.pressure"
          columns={pressureColumns(t, formatDecimal)}
          transform={toPressureRows}
          pageSize={15}
          emptyMessage={t('st.k8s.pressure.empty')}
          summary={() => (
            <Text>
              {t('p.k8s.pressureRec')}
            </Text>
          )}
        />
      </Flex>

      <DqlDisclosure
        entries={[
          getQuery('k8s.inventory'),
          getQuery('k8s.restarts.trend'),
          getQuery('k8s.clusters'),
          getQuery('k8s.restarts.total'),
          getQuery('k8s.restarts'),
          getQuery('k8s.pressure.total'),
          getQuery('k8s.pressure'),
        ]}
      />
    </Stack>
  );
};
