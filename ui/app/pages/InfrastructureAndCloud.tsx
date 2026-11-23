import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';

import { CatalogTable } from '../components/CatalogTable';
import { ChartFrame } from '../components/ChartFrame';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { CapacityMap } from '../features/infra/CapacityMap';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { AssistPanel } from '../components/AssistPanel';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { SectionIntro } from '../components/SectionIntro';
import { TrendChart } from '../components/TrendChart';
import { useChartFormat } from '../components/spectrum';
import { useQueryScope } from '../config/StudioContext';
import { StatusHexMap } from '../components/viz/StatusHexMap';
import { CAPACITY_COLOR, PALETTE, type Tone } from '../design/palette';
import { Callout, Stack } from '../engine';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import {
  CAPACITY_THRESHOLDS,
  attentionOrder,
  capacityTotals,
  toHostCapacity,
  type CapacityClass,
  type HostCapacity,
} from '../models/capacity';
import { CAPACITY_LIST_LIMIT, getQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { formatBytes } from '../utils/time';
import type { StringKey } from '../i18n/strings';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import { decimal } from '../utils/activeLocale';
import { HostsAtCeiling } from '../features/cockpit/panels';
import { infraTrendSeries } from '../features/trends/trendSeries';

/**
 * Infrastructure and cloud.
 *
 * Cloud attribution is only shown where the platform reported a cloud type. A
 * host without that attribute is reported as "not reported" rather than assumed
 * to be on premises.
 */

interface HostRow extends GrailRecord {
  name: string;
  osType: string;
  osVersion: string;
  cloudType: string;
  monitoringMode: string;
  cpuCores: number | null;
  memory: string;
  hostGroup: string;
  networkZone: string;
  state: string;
}

const hostColumns = (t: Translation['t']): DataTableColumnDef<HostRow>[] => [
  { id: 'name', header: t('common.host'), accessor: 'name', width: '1.6fr' },
  { id: 'osType', header: t('p.infra.h.os'), accessor: 'osType', width: 120 },
  { id: 'osVersion', header: t('p.infra.h.osVersion'), accessor: 'osVersion', width: '1.2fr' },
  { id: 'cloudType', header: t('common.cloud'), accessor: 'cloudType', width: 160 },
  { id: 'monitoringMode', header: t('common.monitoringMode'), accessor: 'monitoringMode', width: 180 },
  { id: 'cpuCores', header: t('p.infra.h.cpuCores'), accessor: 'cpuCores', width: 120, alignment: 'right' },
  { id: 'memory', header: t('p.infra.h.memory'), accessor: 'memory', width: 130, alignment: 'right' },
  { id: 'hostGroup', header: t('p.infra.h.hostGroup'), accessor: 'hostGroup', width: '1.2fr' },
  { id: 'networkZone', header: t('p.infra.h.networkZone'), accessor: 'networkZone', width: '1.2fr' },
  // Wide enough for "UNMONITORED"; the default cell translates a "Not reported" fallback.
  { id: 'state', header: t('p.infra.h.state'), accessor: 'state', width: 150 },
];

const CLASS_LABEL: Record<CapacityClass, StringKey> = {
  saturated: 'p.infra.class.saturated',
  pressured: 'p.infra.class.pressured',
  balanced: 'p.infra.class.balanced',
  oversized: 'p.infra.class.oversized',
  unknown: 'p.infra.class.unknown',
};

/**
 * Tone of each capacity class — the verdict chip, the bar in `CapacityBars` and the
 * headline tile all read this one table, so a saturated host is the same colour
 * everywhere (2.x drew it amber in the chip and red in the bar). Red is earned by a
 * saturated host (a measured fault); a pressured one is worth reviewing; over-
 * provisioning is an opportunity, so primary; an unknown class is neutral, because
 * "not measured" must never inherit an alarm.
 */
const CLASS_TONE: Record<CapacityClass, Tone> = {
  saturated: 'critical',
  pressured: 'warning',
  balanced: 'success',
  oversized: 'primary',
  unknown: 'neutral',
};

/** Token colour string handed to `CapacityBars` and the host map: one table, in design/palette. */
const CLASS_COLOR: Record<CapacityClass, string> = CAPACITY_COLOR;

/** Legend order of the host map: the classes that call for action first. */
const HIVE_ORDER: readonly CapacityClass[] = ['saturated', 'pressured', 'balanced', 'oversized', 'unknown'];

const pct = (value: number | null) => (value === null ? '—' : `${decimal(value, 1)}%`);

const capacityColumns = (t: Translation['t']): DataTableColumnDef<HostCapacity>[] => [
  { id: 'name', header: t('common.host'), accessor: 'name', width: '1.8fr' },
  {
    id: 'classification',
    header: t('p.infra.h.verdict'),
    accessor: 'classification',
    width: 180,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        <Chip color={CLASS_TONE[rowData.classification]} variant="accent" size="condensed">
          {t(CLASS_LABEL[rowData.classification])}
        </Chip>
      </DataTable.DefaultCell>
    ),
  },
  {
    id: 'memoryBytes',
    header: t('p.infra.h.memoryHas'),
    accessor: 'memoryBytes',
    width: 130,
    alignment: 'right',
    cell: ({ rowData }) => <DataTable.DefaultCell>{formatBytes(rowData.memoryBytes)}</DataTable.DefaultCell>,
  },
  {
    id: 'memoryUsedBytes',
    header: t('p.infra.h.memoryUses'),
    accessor: 'memoryUsedBytes',
    width: 130,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatBytes(rowData.memoryUsedBytes)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'peakMemPct',
    header: t('p.infra.h.peakMem'),
    accessor: 'peakMemPct',
    width: 120,
    alignment: 'right',
    cell: ({ rowData }) => <DataTable.DefaultCell>{pct(rowData.peakMemPct)}</DataTable.DefaultCell>,
  },
  { id: 'cores', header: t('p.infra.h.cpuCores'), accessor: 'cores', width: 90, alignment: 'right' },
  {
    id: 'peakCpuPct',
    header: t('p.infra.h.peakCpu'),
    accessor: 'peakCpuPct',
    width: 120,
    alignment: 'right',
    cell: ({ rowData }) => <DataTable.DefaultCell>{pct(rowData.peakCpuPct)}</DataTable.DefaultCell>,
  },
  {
    id: 'peakDiskPct',
    header: t('p.infra.h.peakDisk'),
    accessor: 'peakDiskPct',
    width: 110,
    alignment: 'right',
    cell: ({ rowData }) => <DataTable.DefaultCell>{pct(rowData.peakDiskPct)}</DataTable.DefaultCell>,
  },
  {
    id: 'memoryHeadroomBytes',
    header: t('p.infra.h.headroom'),
    accessor: 'memoryHeadroomBytes',
    width: 140,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {rowData.classification === 'oversized' ? formatBytes(rowData.memoryHeadroomBytes) : '—'}
      </DataTable.DefaultCell>
    ),
  },
];

const toHostRows = (records: GrailRecord[]): HostRow[] =>
  records.map((record) => ({
    ...record,
    name: str(record, 'name') ?? 'Unnamed host',
    osType: str(record, 'osType') ?? 'Not reported',
    osVersion: str(record, 'osVersion') ?? 'Not reported',
    cloudType: str(record, 'cloudType') ?? 'Not reported',
    monitoringMode: str(record, 'monitoringMode') ?? 'Not reported',
    cpuCores: num(record, 'cpuCores'),
    memory: formatBytes(num(record, 'memoryTotal')),
    hostGroup: str(record, 'hostGroupName') ?? '—',
    networkZone: str(record, 'networkZone') ?? '—',
    state: str(record, 'state') ?? 'Not reported',
  }));

export const InfrastructureAndCloud = () => {
  const { t, formatNumber, tWindow } = useTranslation();
  const fmt = useChartFormat();
  const scope = useQueryScope();
  const capacity = useCatalogQuery('infra.capacity', scope);
  const capacityExact = useCatalogQuery('infra.capacity.summary', scope);
  const totals = useCatalogQuery('infra.capacity.total', scope);
  const factFrom = useSummaryFact();

  // Every count and total comes from the aggregate over all hosts; the list is the largest
  // hosts by memory, drawn as bars. The two agree whenever the estate fits the list.
  const hosts = toHostCapacity(capacity.records);
  const view = capacityTotals(capacityExact.records[0], hosts, CAPACITY_LIST_LIMIT);
  const capacityRead = capacityExact.outcome === 'ok' || capacity.outcome === 'ok';
  const capacitySource = capacityExact.outcome === 'ok' ? capacityExact : capacity;
  const totalsRow = totals.records[0];
  const declaredCores = num(totalsRow, 'totalCores');
  const declaredMemory = num(totalsRow, 'totalMemBytes');
  const hostCount = num(totalsRow, 'hosts');

  // Dynatrace Assist — where a platform engineer should act on capacity first.
  const infraAssist: string[] = [];
  if (capacityRead && view.hosts > 0) {
    const atRisk = view.saturated + view.pressured;
    if (atRisk > 0) {
      infraAssist.push(
        t('p.infra.assist.s.risk', {
          saturated: formatNumber(view.saturated),
          pressured: formatNumber(view.pressured),
          pct:
            view.memoryUtilisationPct === null
              ? '—'
              : formatNumber(Number(view.memoryUtilisationPct.toFixed(1))),
        }),
      );
    }
    if (view.oversized > 0) {
      infraAssist.push(
        t('p.infra.assist.s.reclaim', {
          count: formatNumber(view.oversized),
          memory: formatBytes(view.reclaimableMemoryBytes),
        }),
      );
    }
    if (atRisk === 0 && view.oversized === 0) {
      infraAssist.push(t('p.infra.assist.s.balanced'));
    }
  }

  /**
   * Capacity in one line: what the estate has, how much of it is actually
   * used, and how many hosts sit at either extreme.
   *
   * Saturated carries amber because it is a measured condition in the estate.
   * Over-provisioned carries blue: it is money on the table, not a fault, and
   * colouring it as a fault would make a cost opportunity read as an incident.
   */
  const headline: SummaryItem[] = [
    {
      key: 'hosts',
      label: t('p.infra.band.hosts'),
      fact: factFrom(totals, hostCount),
      display: hostCount === null ? undefined : formatNumber(hostCount),
      detail: t('p.infra.band.hostsDetail', { cores: declaredCores ?? '—' }),
    },
    {
      key: 'memory',
      label: t('p.infra.band.memory'),
      fact: factFrom(totals, declaredMemory),
      display: formatBytes(declaredMemory),
      detail: t('p.infra.band.memoryDetail'),
    },
    {
      key: 'used',
      label: t('p.infra.band.used'),
      fact: factFrom(
        capacitySource,
        view.memoryUtilisationPct === null ? null : Number(view.memoryUtilisationPct.toFixed(1)),
        { calculation: t('p.infra.band.usedCalc'), unit: '%' },
      ),
      display:
        view.memoryUtilisationPct === null ? undefined : `${decimal(view.memoryUtilisationPct, 1)}%`,
      detail: t('p.infra.band.usedDetail', { used: formatBytes(view.usedMemoryBytes) }),
    },
    {
      key: 'saturated',
      label: t('p.infra.band.saturated'),
      fact: factFrom(capacitySource, capacityRead ? view.saturated + view.pressured : null, {
        calculation: t('p.infra.band.saturatedCalc', {
          saturated: CAPACITY_THRESHOLDS.saturatedPct,
          pressured: CAPACITY_THRESHOLDS.pressuredPct,
        }),
      }),
      display: capacityRead ? formatNumber(view.saturated + view.pressured) : undefined,
      detail: t('p.infra.band.saturatedDetail', { atCeiling: view.saturated }),
      // A host at the ceiling is a measured fault; hosts that are only pressured are worth reviewing.
      tone: view.saturated > 0 ? PALETTE.fault : view.pressured > 0 ? PALETTE.review : PALETTE.good,
    },
    {
      key: 'oversized',
      label: t('p.infra.band.oversized'),
      fact: factFrom(capacitySource, capacityRead ? view.oversized : null, {
        calculation: t('p.infra.band.oversizedCalc', { pct: CAPACITY_THRESHOLDS.oversizedPct }),
      }),
      display: capacityRead ? formatNumber(view.oversized) : undefined,
      detail: t('p.infra.band.oversizedDetail', {
        memory: formatBytes(view.reclaimableMemoryBytes),
      }),
      tone: view.oversized > 0 ? PALETTE.info : PALETTE.absent,
    },
  ];

  // 3.7.3: the capacity map draws every host with a peak reading, grouped by class (`CapacityMap`).
  const mappedHosts = hosts.filter((host) => host.peakCpuPct !== null || host.peakMemPct !== null);

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.infra.title"
        questionKey="p.infra.question"
        takeawayKey="p.infra.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.infra.band.footnote')} />

      {/* 3.5.3 (visual proposal v4): a long page in tabs at the top, as the Coverage page. */}
      <Tabs defaultIndex={0}>
        <Tab title={t('p.infra.tab.overview')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      {/* 3.3.10: the shape of the estate beside the Assist, as a cockpit row. */}
      <CockpitRow data-testid="infra-cockpit">
        {hosts.length > 0 && (
          // 3.2.1 ("Value Spectrum", wave 3): one hexagon per host of the list, coloured by its
          // capacity class, so the shape of the estate reads before the bars. Strato's own chart.
          <ChartFrame
            role="category"
            title={t('p.infra.hive.title')}
            caption={t('p.infra.hive.caption', {
              shown: formatNumber(hosts.length),
              total: formatNumber(Math.max(view.hosts, hosts.length)),
            })}
            provenance={capacity.provenance}
            evidence={capacity.evidence}
            windowLabel={tWindow(capacity.timeframe.label)}
          >
            {/* 3.7.5 (v6): the honeycomb as a status hex map — the classes that call for action first, a table beside. */}
            <StatusHexMap
              items={hosts.map((host) => ({ name: host.name, cls: host.classification }))}
              classes={HIVE_ORDER.map((klass) => ({ key: klass, label: t(CLASS_LABEL[klass]), color: CLASS_COLOR[klass] }))}
              heads={{ cls: t('v6.hex.class'), count: t('v6.hex.hosts'), share: t('v6.hex.share') }}
              ariaLabel={t('p.infra.hive.aria', {
                list: HIVE_ORDER.map(
                  (klass) =>
                    `${t(CLASS_LABEL[klass])}: ${formatNumber(hosts.filter((host) => host.classification === klass).length)}`,
                ).join(', '),
              })}
            />
          </ChartFrame>
        )}
        {infraAssist.length > 0 && (
          <AssistPanel
            eyebrow={t('assist.tech.eyebrow')}
            title={t('p.infra.assist.title')}
            sentences={infraAssist}
            note={t('assist.tech.note')}
          />
        )}
      </CockpitRow>

      {/* 3.3.14: ring + ranking — the hosts below the line at peak beside the ones at their ceiling. */}
      <HostsAtCeiling />
          </Stack>
        </Tab>
        <Tab title={t('p.infra.tab.capacity')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('p.infra.capacityTitle')}
        </Heading>
        <Paragraph className="pvs-prose">{t('p.infra.capacityBody')}</Paragraph>

        {mappedHosts.length > 0 && (
          <ChartFrame
            role="exposure"
            title={t('p.infra.peakChartTitle')}
            caption={t('p.infra.peakChartCaption', {
              saturated: CAPACITY_THRESHOLDS.saturatedPct,
              oversized: CAPACITY_THRESHOLDS.oversizedPct,
            })}
            provenance={capacity.provenance}
            evidence={capacity.evidence}
            windowLabel={tWindow(capacity.timeframe.label)}
          >
            <CapacityMap
              hosts={mappedHosts.map((host) => ({ name: host.name, peakCpuPct: host.peakCpuPct, peakMemPct: host.peakMemPct, classification: host.classification }))}
              colors={CLASS_COLOR}
              words={{
                classLabel: (cls) => t(CLASS_LABEL[cls]),
                cpu: t('p.infra.capmap.cpu'),
                memory: t('p.infra.capmap.memory'),
                more: (count) => t('p.infra.capmap.more', { count: formatNumber(count) }),
                less: t('p.infra.capmap.less'),
                aria: t('p.infra.peakChartAria'),
                reading: (cpu, memory) => t('p.infra.capmap.reading', { cpu, memory }),
              }}
            />
          </ChartFrame>
        )}
        {view.hosts > hosts.length && hosts.length > 0 && (
          <Text className="pvs-caption">
            {t('p.infra.cap.showing', { shown: formatNumber(hosts.length), total: formatNumber(view.hosts) })}
          </Text>
        )}

        <CatalogTable<HostCapacity>
          queryId="infra.capacity"
          columns={capacityColumns(t)}
          transform={(records) => attentionOrder(toHostCapacity(records))}
          pageSize={15}
          emptyMessage={t('st.infra.capacity.empty')}
          permissionImpact={t('st.infra.capacity.perm')}
        />
        {/* The thresholds are this app's own review conventions, so the note is an assumption. */}
        <Callout kind="assumption" title={t('callout.assumption')}>
          {t('p.infra.thresholdNote', {
            saturated: CAPACITY_THRESHOLDS.saturatedPct,
            pressured: CAPACITY_THRESHOLDS.pressuredPct,
            oversized: CAPACITY_THRESHOLDS.oversizedPct,
          })}
        </Callout>
      </Stack>
          </Stack>
        </Tab>
        <Tab title={t('p.infra.tab.trend')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('p.infra.saturation')}
        </Heading>
        <TrendChart
          queryId="infra.trend"
          series={infraTrendSeries(t, fmt)}
        />
        <Callout kind="note" title={t('p.infra.saturationHowTo')}>
          {t('p.infra.saturationBody')}
        </Callout>
      </Stack>

      {/* What this page does not do: it converts nothing into money. A limit of the review, not a fault. */}
      <Callout kind="limitation" title={t('p.infra.cloudCost')}>
        {t('p.infra.cloudCostBody')}
      </Callout>
          </Stack>
        </Tab>
        <Tab title={t('p.infra.tab.inventory')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('p.infra.inventory')}
        </Heading>
        <CatalogTable<HostRow>
          queryId="cov.hosts.table"
          columns={hostColumns(t)}
          transform={toHostRows}
          pageSize={20}
        />
      </Stack>
          </Stack>
        </Tab>
      </Tabs>

      <DqlDisclosure
        entries={[
          getQuery('infra.capacity'),
          getQuery('infra.capacity.summary'),
          getQuery('infra.capacity.total'),
          getQuery('infra.trend'),
          getQuery('cov.hosts.table'),
        ]}
      />
    </Stack>
  );
};
