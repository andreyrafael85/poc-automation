import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { HelpIcon } from '@dynatrace/strato-icons';

import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { useQueryScope } from '../config/StudioContext';
import { Callout, Stack } from '../engine';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { CatalogTable } from '../components/CatalogTable';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SectionIntro } from '../components/SectionIntro';
import { AdvisorPanel } from '../features/advisor/AdvisorPanel';
import { ConsumptionForecast } from '../features/consumption/ConsumptionForecast';
import { getQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { formatBytes } from '../utils/time';
import { ChartFrame } from '../components/ChartFrame';
import { BarList } from '../components/viz/BarList';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { useTranslation, type Translation } from '../i18n/useTranslation';

/**
 * Consumption and licensing.
 *
 * Hard rules held by this page:
 *   - no price, no rate card, no currency, anywhere
 *   - `billed_bytes` is shown as the source reports it, with its unit stated
 *   - "Retain" capability figures are flagged as needing commercial confirmation,
 *     because the platform-reported number for retention is not a plain byte
 *     count and misreading it would overstate consumption by orders of magnitude
 *   - no saving is asserted as a future fact
 */

interface CapabilityRow extends GrailRecord {
  capability: string;
  events: number | null;
  billedBytes: number | null;
  kind: 'volume' | 'unit-uncertain' | 'count-only';
}

/**
 * Capability types whose reported figure is a retention measure rather than an
 * ingest byte count. Their unit is not a plain byte and must not be presented
 * as one.
 */
function classify(capability: string, billedBytes: number | null): CapabilityRow['kind'] {
  if (billedBytes === null || billedBytes === 0) return 'count-only';
  if (/Retain/i.test(capability)) return 'unit-uncertain';
  return 'volume';
}

const capabilityColumns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<CapabilityRow>[] => [
  { id: 'capability', header: t('p.cons.h.capability'), accessor: 'capability', width: '2fr' },
  {
    id: 'events',
    header: t('p.cons.h.usageEvents'),
    accessor: 'events',
    width: 150,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.events)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'billedBytes',
    header: t('p.cons.h.reportedVolume'),
    accessor: 'billedBytes',
    width: 200,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {rowData.kind === 'count-only'
          ? t('p.cons.cell.notVolumeBased')
          : rowData.kind === 'unit-uncertain'
            ? t('p.cons.cell.sourceUnit', { value: formatCount(rowData.billedBytes) })
            : formatBytes(rowData.billedBytes)}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: 'kind',
    header: t('p.cons.h.interpretation'),
    accessor: 'kind',
    width: 260,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {rowData.kind === 'volume' ? (
          <Chip color="primary" variant="accent" size="condensed">
            {t('p.cons.i.byteBased')}
          </Chip>
        ) : rowData.kind === 'unit-uncertain' ? (
          // A unit that still needs confirming is a limit of this review, not a
          // condition measured in the estate, so it is neutral: an icon and the
          // words carry it, and amber stays reserved for what was measured.
          <Chip color="neutral" variant="emphasized" size="condensed">
            <Chip.Prefix>
              <HelpIcon aria-hidden="true" />
            </Chip.Prefix>
            {t('p.cons.i.needsConfirm')}
          </Chip>
        ) : (
          <Chip color="neutral" variant="accent" size="condensed">
            {t('p.cons.i.counted')}
          </Chip>
        )}
      </DataTable.DefaultCell>
    ),
  },
];

const toCapabilityRows = (records: GrailRecord[]): CapabilityRow[] =>
  records.map((record) => {
    const capability = str(record, 'event.type') ?? 'Not reported';
    const billedBytes = num(record, 'billedBytes');
    return {
      ...record,
      capability,
      events: num(record, 'events'),
      billedBytes,
      kind: classify(capability, billedBytes),
    };
  });

interface CostRow extends GrailRecord {
  table: string;
  executions: number | null;
  scannedBytes: number | null;
  avgDurationMs: number | null;
  maxDurationMs: number | null;
  deliveredRecords: number | null;
  bytesPerRecord: number | null;
}

const costColumns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<CostRow>[] => [
  { id: 'table', header: t('common.table'), accessor: 'table', width: '1.2fr' },
  { id: 'executions', header: t('p.cons.h.queries'), accessor: 'executions', width: 120, alignment: 'right' },
  {
    id: 'scannedBytes',
    header: t('p.cons.h.scannedOnDemand'),
    accessor: 'scannedBytes',
    width: 180,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatBytes(rowData.scannedBytes)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'deliveredRecords',
    header: t('p.cons.h.recordsDelivered'),
    accessor: 'deliveredRecords',
    width: 170,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {formatCount(rowData.deliveredRecords)}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: 'bytesPerRecord',
    header: t('p.cons.h.scannedPerRecord'),
    accessor: 'bytesPerRecord',
    width: 180,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatBytes(rowData.bytesPerRecord)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'avgDurationMs',
    header: t('common.avgDuration'),
    accessor: 'avgDurationMs',
    width: 150,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {rowData.avgDurationMs === null ? '—' : `${Math.round(rowData.avgDurationMs)} ms`}
      </DataTable.DefaultCell>
    ),
  },
];

const toCostRows = (records: GrailRecord[]): CostRow[] =>
  records.map((record) => ({
    ...record,
    table: str(record, 'table') ?? 'Not reported',
    executions: num(record, 'queries'),
    scannedBytes: num(record, 'scannedOnDemandBytes'),
    avgDurationMs: num(record, 'avgDurationMs'),
    maxDurationMs: num(record, 'maxDurationMs'),
    deliveredRecords: num(record, 'deliveredRecords'),
    bytesPerRecord: num(record, 'bytesPerDeliveredRecord'),
  }));

/** How many capabilities the volume bars show (3.3.13). */
const VOLUME_TOP = 8;

export const ConsumptionAndLicensing = () => {
  const { t, formatNumber, formatCount, tWindow } = useTranslation();
  const scope = useQueryScope();
  const capabilities = useCatalogQuery('cons.capabilities', scope);
  // 3.3.13: where the billed volume goes — the capabilities that report a plain byte count, top
  // first. `cons.capabilities` is bounded (one row per capability), so the count beside is exact.
  const capabilityRows = capabilities.outcome === 'ok' ? toCapabilityRows(capabilities.records) : [];
  const volumeBars = capabilityRows
    .filter((row): row is CapabilityRow & { billedBytes: number } => row.kind === 'volume' && row.billedBytes !== null && row.billedBytes > 0)
    .sort((a, b) => b.billedBytes - a.billedBytes)
    .slice(0, VOLUME_TOP);
  const factFrom = useSummaryFact();

  /**
   * 3.3.1 (backlog Q8): the headline figures come from the aggregate, never from adding up the
   * per-table rows. The platform writes one record per table a query touched, so a query over two
   * tables was counted twice — measured on the lab tenant over 24 h, 33,974 added rows against
   * 33,154 distinct queries.
   */
  const totals = useCatalogQuery('cons.advisor.total', scope);
  const totalRow = totals.records[0];
  const queries = num(totalRow, 'queries');
  const scanned = num(totalRow, 'scannedOnDemandBytes');
  const delivered = num(totalRow, 'deliveredRecords');

  /**
   * Volume and effort, never money. There is no pricing in a Dynatrace
   * environment, so a currency figure here would be invented.
   */
  const headline: SummaryItem[] = [
    {
      key: 'capabilities',
      label: t('p.cons.band.capabilities'),
      fact: factFrom(capabilities, capabilities.outcome === 'ok' ? capabilities.records.length : null),
      display: capabilities.outcome === 'ok' ? formatNumber(capabilities.records.length) : undefined,
      detail: t('p.cons.band.capabilitiesDetail'),
    },
    {
      key: 'queries',
      label: t('p.cons.band.queries'),
      fact: factFrom(totals, totals.outcome === 'ok' ? queries : null),
      display: totals.outcome === 'ok' && queries !== null ? formatNumber(queries) : undefined,
      detail: t('p.cons.band.queriesDetail'),
    },
    {
      key: 'scanned',
      label: t('p.cons.band.scanned'),
      fact: factFrom(totals, totals.outcome === 'ok' ? scanned : null),
      display: scanned === null ? undefined : formatBytes(scanned),
      detail: t('p.cons.band.scannedDetail'),
    },
    {
      key: 'efficiency',
      label: t('p.cons.band.efficiency'),
      fact: factFrom(totals, scanned !== null && delivered !== null && delivered > 0 ? Math.round(scanned / delivered) : null, {
        calculation: t('p.cons.band.efficiencyCalc'),
      }),
      display: scanned !== null && delivered !== null && delivered > 0 ? formatBytes(scanned / delivered) : undefined,
      detail: t('p.cons.band.efficiencyDetail', { records: delivered === null ? '—' : formatNumber(delivered) }),
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.cons.title"
        questionKey="p.cons.question"
        takeawayKey="p.cons.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.cons.band.footnote')} />

      {/* 3.3.13: where the billed volume goes, beside what this review cannot say (a cockpit row). */}
      <CockpitRow data-testid="cons-cockpit">
        {volumeBars.length > 0 && (
          <ChartFrame
            role="magnitude"
            title={t('cockpit.cons.title')}
            provenance={capabilities.provenance}
            evidence={capabilities.evidence}
            windowLabel={tWindow(capabilities.timeframe.label)}
            trailing={<span className="pvs-caption">{t('cockpit.cons.topOf', { shown: formatNumber(volumeBars.length), total: formatNumber(capabilityRows.length) })}</span>}
          >
            <BarList
              role="magnitude"
              ariaLabel={t('cockpit.cons.title')}
              items={volumeBars.map((row, index) => ({ key: `${row.capability}-${index}`, label: row.capability, value: row.billedBytes, display: formatBytes(row.billedBytes) }))}
            />
          </ChartFrame>
        )}
        <Callout kind="limitation" title={t('p.cons.notTell')}>
          <Stack gap="tight">
            <Paragraph>{t('p.cons.notTellBody1')}</Paragraph>
            <Paragraph>{t('p.cons.notTellBody2')}</Paragraph>
          </Stack>
        </Callout>
      </CockpitRow>

      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('p.cons.capabilities')}
        </Heading>
        <Paragraph>{t('p.cons.capabilitiesBody')}</Paragraph>
        <CatalogTable<CapabilityRow>
          queryId="cons.capabilities"
          columns={capabilityColumns(t, formatCount)}
          transform={toCapabilityRows}
          pageSize={20}
          permissionImpact={t('st.cons.perm')}
          summary={(result) => {
            const uncertain = toCapabilityRows(result.records).filter(
              (row) => row.kind === 'unit-uncertain',
            );
            if (uncertain.length === 0) return null;
            return (
              <Callout kind="assumption" title={t('p.cons.unitWarningCount', { count: uncertain.length })}>
                {t('p.cons.unitWarningBody')}
              </Callout>
            );
          }}
        />
      </Stack>

      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('p.cons.queryCost')}
        </Heading>
        <Paragraph>{t('p.cons.queryCostBody')}</Paragraph>
        <Callout kind="note" title={t('p.cons.privacyTitle')}>
          {t('p.cons.privacyBody')}
        </Callout>
        <CatalogTable<CostRow>
          queryId="cons.advisor"
          columns={costColumns(t, formatCount)}
          transform={toCostRows}
          pageSize={15}
          summary={(result) => {
            const rows = toCostRows(result.records);
            const worst = rows
              .filter((row) => (row.bytesPerRecord ?? 0) > 0)
              .sort((a, b) => (b.bytesPerRecord ?? 0) - (a.bytesPerRecord ?? 0))[0];
            if (worst === undefined) return null;
            return (
              <Text>
                {t('p.cons.leastEfficientLine', {
                  table: worst.table,
                  value: formatBytes(worst.bytesPerRecord),
                })}
              </Text>
            );
          }}
        />
      </Stack>

      {/* 3.2.5: daily consumption per capability and its labelled projection (volume, no money). */}
      <ConsumptionForecast />

      <AdvisorPanel />

      <DqlDisclosure entries={[getQuery('cons.capabilities'), getQuery('cons.daily'), getQuery('cons.advisor'), getQuery('cons.advisor.total')]} />
    </Stack>
  );
};
