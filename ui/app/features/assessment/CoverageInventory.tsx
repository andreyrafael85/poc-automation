import React from 'react';

import { Chip, MessageContainer } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { PageSummary, type SummaryItem } from '../../components/PageSummary';
import { useQueryScope } from '../../config/StudioContext';
import { PALETTE } from '../../design/palette';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { diagnoseEntityModel } from '../../models/entityHealth';
import { EntityModelNotice } from '../../components/EntityModelNotice';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import { CatalogTable } from '../../components/CatalogTable';
import { DqlDisclosure } from '../../components/DqlDisclosure';
import { useTranslation, type Translation } from '../../i18n/useTranslation';
import { getQuery } from '../../queries/catalog';
import { bool, num, str, type GrailRecord } from '../../utils/records';
import { formatBytes } from '../../utils/time';
import { Callout, Grid, Panel, Stack } from '../../engine';
import { ChartFrame } from '../../components/ChartFrame';
import { DonutBreakdown } from '../../components/viz/DonutBreakdown';
import { CockpitRow } from '../../engine/chart/CockpitRow';
import { estateLayers } from '../cockpit/estateLayers';
import { InventoryTile } from '../../components/spectrum';
import { ENTITY_TILES, inventoryDetail } from '../../components/spectrum/entityTiles';
import { observed, unavailable, type Fact } from '../../models/provenance';
import { missingFact } from '../../hooks/useSummaryFact';

/**
 * What Dynatrace maps in this environment — the inventory by category, the estate by layer, the
 * instrumentation depth by host and the data sources — and, more importantly, the gaps.
 *
 * 3.4.12 (owner's order of 2026-11-19): this was the old Coverage page; the Assessment and Coverage
 * became one page, "Coverage" (`pages/Assessment.tsx`), and this is its "What is mapped" tab.
 *
 * The gap table is the honest counterpart to the inventory: it names what could
 * not be read, why, and what it costs the analysis.
 *
 * Column definitions are built from `t` rather than declared at module scope,
 * because a header rendered once at import time would stay in whatever language
 * was active when the module loaded.
 */

interface BucketRow extends GrailRecord {
  name: string;
  table: string;
  retentionDays: number | null;
  includedQueryDays: number | null;
  records: number | null;
  bytes: number | null;
  hasAccess: boolean | null;
}

const bucketColumns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<BucketRow>[] => [
  { id: 'name', header: t('common.bucket'), accessor: 'name', width: '1.4fr' },
  { id: 'table', header: t('common.table'), accessor: 'table', width: 160 },
  {
    id: 'hasAccess',
    header: t('common.readable'),
    accessor: 'hasAccess',
    width: 130,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        <Chip color={rowData.hasAccess === true ? 'success' : 'critical'} variant="accent" size="condensed">
          {rowData.hasAccess === true ? t('common.yes') : t('common.no')}
        </Chip>
      </DataTable.DefaultCell>
    ),
  },
  {
    id: 'retentionDays',
    header: t('common.retentionDays'),
    accessor: 'retentionDays',
    width: 150,
    alignment: 'right',
  },
  {
    id: 'includedQueryDays',
    header: t('p.cov.includedQueryDays'),
    accessor: 'includedQueryDays',
    width: 170,
    alignment: 'right',
  },
  {
    id: 'records',
    header: t('common.records'),
    accessor: 'records',
    width: 150,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.records)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'bytes',
    header: t('common.uncompressed'),
    accessor: 'bytes',
    width: 150,
    alignment: 'right',
    cell: ({ rowData }) => <DataTable.DefaultCell>{formatBytes(rowData.bytes)}</DataTable.DefaultCell>,
  },
];

function toBucketRows(records: GrailRecord[]): BucketRow[] {
  return records.map((record) => ({
    ...record,
    name: str(record, 'name') ?? '—',
    table: str(record, 'table') ?? '—',
    retentionDays: num(record, 'retentionDays'),
    includedQueryDays: num(record, 'includedQueryDays'),
    records: num(record, 'records'),
    bytes: num(record, 'bytes'),
    hasAccess: bool(record, 'hasAccess'),
  }));
}

interface HostBreakdownRow extends GrailRecord {
  osType: string;
  cloudType: string;
  monitoringMode: string;
  hosts: number | null;
}

const hostBreakdownColumns = (t: Translation['t']): DataTableColumnDef<HostBreakdownRow>[] => [
  { id: 'osType', header: t('p.cov.operatingSystem'), accessor: 'osType', width: '1fr' },
  { id: 'cloudType', header: t('common.cloud'), accessor: 'cloudType', width: '1fr' },
  { id: 'monitoringMode', header: t('common.monitoringMode'), accessor: 'monitoringMode', width: '1fr' },
  { id: 'hosts', header: t('common.hosts'), accessor: 'hosts', width: 110, alignment: 'right' },
];

function toHostBreakdownRows(records: GrailRecord[], t: Translation['t']): HostBreakdownRow[] {
  return records.map((record) => ({
    ...record,
    osType: str(record, 'osType') ?? t('common.notReported'),
    // A null attribute is not the same as "no cloud" - say so explicitly.
    cloudType: str(record, 'cloudType') ?? t('common.attributeNotReported'),
    monitoringMode: str(record, 'monitoringMode') ?? t('common.attributeNotReported'),
    hosts: num(record, 'hosts'),
  }));
}

export const CoverageInventory = () => {
  const { t, tCount, formatNumber, formatCount, tWindow } = useTranslation();
  const scope = useQueryScope();
  const inventory = useCatalogQuery('cov.inventory', scope);
  const buckets = useCatalogQuery('cov.buckets', scope);
  const factFrom = useSummaryFact();

  // Every category answering zero at once is the entity model not answering, not an empty
  // estate: the same guard the Overview applies, so this page cannot print "0 · Observed" (3.2.1).
  const entityModel = diagnoseEntityModel(inventory.records);
  const entitiesRead = inventory.outcome === 'ok' && entityModel.state !== 'unavailable';
  const estateDonut = estateLayers(inventory.records, inventory.outcome === 'ok', t, formatNumber);
  // Only the eight categories: `cov.inventory` also carries the browser/HTTP split of the synthetic
  // monitors (3.2.3), which summing every row would count twice.
  const categoryValues = ENTITY_TILES.map(({ inventoryCategory }) =>
    num(inventory.records.find((record) => str(record, 'category') === inventoryCategory), 'value'),
  );
  const entityTotal = categoryValues.reduce<number>((total, value) => total + (value ?? 0), 0);
  const categoriesFound = categoryValues.filter((value) => (value ?? 0) > 0).length;
  const unreadable = buckets.records.filter((record) => bool(record, 'hasAccess') === false).length;

  const categoryFact = (category: string): Fact<number | string | null> => {
    if (inventory.outcome === 'no-permission') {
      return unavailable('no-permission', t('req.scope', { scope: 'storage:entities:read' }), inventory.evidence);
    }
    const value = num(
      inventory.records.find((record) => str(record, 'category') === category),
      'value',
    );
    if (inventory.outcome !== 'ok' || value === null) return missingFact(inventory);
    // The zeros of an entity-model outage are not counts.
    if (!entitiesRead) return unavailable('no-telemetry', t('req.entityOutage'), inventory.evidence);
    return observed(value, inventory.evidence);
  };
  const bucketRecords = buckets.records.reduce(
    (total, record) => total + (num(record, 'records') ?? 0),
    0,
  );

  /**
   * Scope in one line, including the part that is missing.
   *
   * Unreadable buckets are the honest counterpart to the entity count, so the
   * band carries both: how much this review can see, and how much it cannot.
   */
  const headline: SummaryItem[] = [
    {
      key: 'entities',
      label: t('p.cov.band.entities'),
      fact: factFrom(inventory, entitiesRead ? entityTotal : null),
      display: entitiesRead ? formatNumber(entityTotal) : undefined,
      detail: entitiesRead ? t('p.cov.band.entitiesDetail', { categories: categoriesFound }) : undefined,
    },
    {
      key: 'sources',
      label: t('p.cov.band.sources'),
      fact: factFrom(buckets, buckets.outcome === 'ok' ? buckets.records.length : null),
      display: buckets.outcome === 'ok' ? formatNumber(buckets.records.length) : undefined,
      detail: t('p.cov.band.sourcesDetail'),
    },
    {
      key: 'records',
      label: t('p.cov.band.records'),
      fact: factFrom(buckets, buckets.outcome === 'ok' ? bucketRecords : null),
      display: buckets.outcome === 'ok' ? formatNumber(bucketRecords) : undefined,
      detail: t('p.cov.band.recordsDetail'),
    },
    {
      key: 'unreadable',
      label: t('p.cov.band.unreadable'),
      fact: factFrom(buckets, buckets.outcome === 'ok' ? unreadable : null),
      display: buckets.outcome === 'ok' ? formatNumber(unreadable) : undefined,
      detail: t('p.cov.band.unreadableDetail'),
      tone: unreadable > 0 ? PALETTE.review : PALETTE.good,
    },
  ];

  return (
    <Stack gap="section">
      <Heading level={2} as="h2" className="pvs-asm-tabtitle">
        {t('asm.tab.mapped')}
      </Heading>
      <Paragraph className="pvs-prose">{t('p.cov.takeaway')}</Paragraph>
      <div data-print-atom>
        <PageSummary items={headline} footnote={t('p.cov.band.footnote')} />
      </div>
      <EntityModelNotice diagnosis={entityModel} />

      {/* 3.3.12 (the Coverage stage on the chart engine): every category on compact tiles beside the
          estate by layer — the Overview's donut, from the same aggregate. */}
      <div data-print-section>
      <CockpitRow data-testid="cov-cockpit" align="start">
        <Panel as="section" pad="roomy">
          <Stack gap="group">
            <Heading level={3} as="h2">{t('p.cov.entities')}</Heading>
            {/* Every category, gaps included: on this page a category with nothing in it is the
                finding, so it stays on screen as "None detected" instead of being hidden. */}
            <Grid min={130}>
              {ENTITY_TILES.map(({ inventoryCategory: category, labelKey, icon, family }) => {
                const fact = categoryFact(category);
                const none = fact.value === 0;
                return (
                  <InventoryTile
                    key={category}
                    label={t(labelKey)}
                    icon={icon}
                    family={none ? 'grey' : family}
                    fact={fact}
                    display={typeof fact.value === 'number' ? (none ? t('common.noneDetected') : formatNumber(fact.value)) : undefined}
                    detail={none ? undefined : inventoryDetail(category, inventory.records, t, formatNumber)}
                    compact
                  />
                );
              })}
            </Grid>
            <Text className="pvs-caption">{t('cockpit.inv.source', { window: tWindow(inventory.timeframe.label), query: 'cov.inventory' })}</Text>
          </Stack>
        </Panel>
        {estateDonut.segments.length > 0 && (
          <ChartFrame role="category" title={t('cockpit.donut.title')} provenance={inventory.provenance} evidence={inventory.evidence} windowLabel={tWindow(inventory.timeframe.label)}>
            <DonutBreakdown
                heads={{ name: t('v6.legend.name'), count: t('v6.legend.count'), share: t('v6.hex.share') }} segments={estateDonut.segments} ariaLabel={t('cockpit.donut.title')} centerDisplay={formatNumber(estateDonut.estate)} centerLabel={t('cockpit.donut.center')} />
          </ChartFrame>
        )}
      </CockpitRow>
      </div>

      <Flex flexDirection="column" gap={12} data-print-section data-testid="cov-depth">
        <Heading level={3} as="h2">{t('p.cov.depth')}</Heading>
        <Paragraph>{t('p.cov.depthBody')}</Paragraph>
        <CatalogTable<HostBreakdownRow>
          queryId="cov.hosts.breakdown"
          columns={hostBreakdownColumns(t)}
          transform={(records) => toHostBreakdownRows(records, t)}
        />
      </Flex>

      {/* The data sources are a long technical table: on screen only, the PDF keeps the band above. */}
      <Flex flexDirection="column" gap={12} data-print-hide data-testid="cov-sources">
        <Heading level={3} as="h2">{t('p.cov.sources')}</Heading>
        <MessageContainer variant="warning">
          <MessageContainer.Title>{t('p.cov.zeroDaysTitle')}</MessageContainer.Title>
          <MessageContainer.Description>{t('p.cov.zeroDaysBody')}</MessageContainer.Description>
        </MessageContainer>
        <CatalogTable<BucketRow>
          queryId="cov.buckets"
          columns={bucketColumns(t, formatCount)}
          transform={toBucketRows}
          pageSize={15}
          summary={(result) => {
            const unreadable = result.records.filter((record) => bool(record, 'hasAccess') === false);
            if (unreadable.length === 0) return null;
            return (
              <Callout kind="limitation" title={tCount('p.cov.unreadableTitle', unreadable.length, { count: unreadable.length })}>
                <Stack gap="tight">
                  <Paragraph>{t('p.cov.unreadableBody')}</Paragraph>
                  <Text>{unreadable.map((record) => str(record, 'name')).join(', ')}</Text>
                </Stack>
              </Callout>
            );
          }}
        />
      </Flex>

      <div data-print-hide>
        <DqlDisclosure entries={[getQuery('cov.inventory'), getQuery('cov.hosts.breakdown'), getQuery('cov.buckets')]} />
      </div>
    </Stack>
  );
};
