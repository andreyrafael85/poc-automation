import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { SpectrumSpark, useChartFormat } from '../../components/spectrum';
import { QueryStateBoundary } from '../../components/QueryStateBoundary';
import { useQueryScope } from '../../config/StudioContext';
import { Callout, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { MIN_PROJECTION_DAYS, summariseConsumption, type CapabilityConsumption, type ConsumptionUnit } from '../../models/consumptionForecast';
import { formatBytes } from '../../utils/time';

/**
 * Daily consumption per capability and its projection (3.2.5, milestone M5) — SE only: commercial
 * data, never shown to a customer nor in executive mode. Volume in each capability's own billing
 * unit, never money (the priced projection lives in Licensing only, 3.2.6); the projection is a
 * straight line through the complete days, labelled as a projection.
 */

const UNIT_KEY: Record<ConsumptionUnit, StringKey> = {
  gibHours: 'cons.unit.gibHours',
  hostHours: 'cons.unit.hostHours',
  podHours: 'cons.unit.podHours',
  containerHours: 'cons.unit.containerHours',
  sessions: 'cons.unit.sessions',
  requests: 'cons.unit.requests',
  actions: 'cons.unit.actions',
  invocations: 'cons.unit.invocations',
  dataPoints: 'cons.unit.dataPoints',
  bytes: 'cons.unit.bytes',
  bytesRetained: 'cons.unit.bytesRetained',
  events: 'cons.unit.events',
};

export const ConsumptionForecast = () => {
  const { t, formatNumber, formatDecimal } = useTranslation();
  const fmt = useChartFormat();
  const scope = useQueryScope();
  const daily = useCatalogQuery('cons.daily', scope);
  const rows = summariseConsumption(daily.records);
  // Past a million a count reads better compact ("2.1M"); a byte volume always carries its unit.
  const count = (value: number) => (value >= 1_000_000 ? fmt.compact(value) : value >= 100 ? formatNumber(Math.round(value)) : formatDecimal(value, 1));
  const amount = (value: number | null, unit: ConsumptionUnit) => {
    if (value === null) return '—';
    if (unit === 'bytes' || unit === 'bytesRetained') return formatBytes(value);
    return count(value);
  };
  // A retained volume projects to byte-days: read as GiB held for a day.
  const projected = (value: number | null, unit: ConsumptionUnit) =>
    value === null ? '—' : unit === 'bytesRetained' ? t('cons.unit.gibDays', { value: count(value / 2 ** 30) }) : amount(value, unit);
  const pct = (value: number | null) => {
    if (value === null) return '—';
    const rounded = Math.round(value);
    return rounded === 0 ? '0%' : `${rounded > 0 ? '+' : '−'}${formatNumber(Math.abs(rounded))}%`;
  };

  const columns: DataTableColumnDef<CapabilityConsumption>[] = [
    {
      id: 'capability',
      header: t('cons.f.h.capability'),
      accessor: 'capability',
      width: '2fr',
      cell: ({ rowData }) => (
        <DataTable.DefaultCell>
          <Stack gap="tight">
            <Text>{rowData.capability}</Text>
            <Text className="pvs-caption">{t(UNIT_KEY[rowData.unit])}</Text>
          </Stack>
        </DataTable.DefaultCell>
      ),
    },
    {
      id: 'trend',
      header: t('cons.f.h.trend'),
      accessor: (row) => row.daily.length,
      width: '1.4fr',
      cell: ({ rowData }) => (
        <DataTable.DefaultCell>
          <div className="pvs-cons__spark" data-spectrum="blue-turquoise">
            <SpectrumSpark points={rowData.daily} label={t('cons.f.sparkLabel', { capability: rowData.capability })} />
          </div>
        </DataTable.DefaultCell>
      ),
    },
    { id: 'avg', header: t('cons.f.h.avg'), accessor: (row) => row.last7Avg ?? -1, width: '1fr', cell: ({ rowData }) => <DataTable.DefaultCell>{amount(rowData.last7Avg, rowData.unit)}</DataTable.DefaultCell> },
    { id: 'change', header: t('cons.f.h.change'), accessor: (row) => row.trendPct ?? 0, width: '0.8fr', cell: ({ rowData }) => <DataTable.DefaultCell>{pct(rowData.trendPct)}</DataTable.DefaultCell> },
    { id: 'next30', header: t('cons.f.h.next30'), accessor: (row) => row.next30 ?? -1, width: '1fr', cell: ({ rowData }) => <DataTable.DefaultCell>{projected(rowData.next30, rowData.unit)}</DataTable.DefaultCell> },
    { id: 'next365', header: t('cons.f.h.next365'), accessor: (row) => row.next365 ?? -1, width: '1fr', cell: ({ rowData }) => <DataTable.DefaultCell>{projected(rowData.next365, rowData.unit)}</DataTable.DefaultCell> },
  ];

  return (
    <Stack as="section" gap="group">
      <Stack gap="tight">
        <Heading level={3} as="h2">
          {t('cons.f.title')}{' '}
          <Chip color="warning" variant="emphasized" size="condensed">
            {t('cons.f.projection')}
          </Chip>
        </Heading>
        <Paragraph className="pvs-prose pvs-muted">{t('cons.f.body', { days: String(MIN_PROJECTION_DAYS) })}</Paragraph>
      </Stack>
      <QueryStateBoundary result={daily}>
        <DataTable data={rows} columns={columns} sortable fullWidth>
          <DataTable.EmptyState>{t('cons.f.empty')}</DataTable.EmptyState>
        </DataTable>
      </QueryStateBoundary>
      <Callout kind="estimate" title={t('cons.f.assumptionsTitle')}>
        {t('cons.f.assumptions')}
      </Callout>
    </Stack>
  );
};
