import React from 'react';

import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Text } from '@dynatrace/strato-components/typography';

import { useCatalogQuery, type CatalogQueryResult } from '../hooks/useCatalogQuery';
import { useQueryScope } from '../config/StudioContext';
import { useTranslation } from '../i18n/useTranslation';
import type { StringKey } from '../i18n/strings';
import { localizeSentinel } from '../utils/sentinels';
import type { CatalogId } from '../queries/catalog';
import { isCapped, resultCap } from '../queries/resultCap';
import { localizedPurpose } from '../queries/purpose';
import type { GrailRecord } from '../utils/records';
import { ProvenanceBadge } from './ProvenanceBadge';
import { QueryStateBoundary } from './QueryStateBoundary';

/**
 * Binds a catalog query to a `DataTable` with all five result states handled.
 *
 * Pages use this instead of calling `useDql` themselves, which is what keeps
 * every table in the app consistent about provenance, timeframe disclosure and
 * permission failures.
 */

export interface CatalogTableProps<T extends GrailRecord> {
  queryId: CatalogId;
  columns: DataTableColumnDef<T>[];
  /** Reshapes raw Grail records before display. Must stay a pure function. */
  transform?: (records: GrailRecord[]) => T[];
  enabled?: boolean;
  emptyMessage?: string;
  permissionImpact?: string;
  /** Rendered above the table, typically a derived summary line. */
  summary?: (result: CatalogQueryResult) => React.ReactNode;
  sortable?: boolean;
  pageSize?: number;
}

/**
 * The sizes offered in the page-size select. A table's own `pageSize` (15, 20…) must
 * be among them, or the select has nothing to show for the current value and
 * displays "Select an option".
 */
export function pageSizeOptions(current: number): number[] {
  return [...new Set([10, 25, 50, 100, current])].sort((a, b) => a - b);
}

type CellProps = {
  value: unknown;
  format: (value: unknown) => string;
  detectLinks: (value: string) => React.ReactNode;
};

/**
 * What the default cell prints. An absent value is a dash (it rendered blank, which reads
 * as "empty" or "zero"), and the English placeholders a row transformer wrote ("Not
 * reported"…) are shown in the app's language. A zero is a value and is kept. A number is
 * formatted in the app's locale: Strato's own `format` logs "can not be formatted" for a column
 * with no `columnType` and prints the bare digits ("1594208").
 */
export function cellContent(
  { value, format, detectLinks }: CellProps,
  t: (key: StringKey) => string,
  formatNumber: (value: number) => string,
): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return detectLinks(localizeSentinel(value, t, { booleans: true }));
  if (typeof value === 'number' && Number.isFinite(value)) return formatNumber(value);
  return format(value);
}

export function CatalogTable<T extends GrailRecord>({
  queryId,
  columns,
  transform,
  enabled = true,
  emptyMessage,
  permissionImpact,
  summary,
  sortable = true,
  pageSize = 20,
}: CatalogTableProps<T>) {
  const scope = useQueryScope();
  const result = useCatalogQuery(queryId, { ...scope, enabled });
  const { t, tWindow, formatNumber, formatTime } = useTranslation();

  const rows = (transform ? transform(result.records) : (result.records as unknown as T[])) ?? [];

  // The first column identifies the row (a bucket, a service, a host). With fixed widths
  // on its neighbours it was left the remainder — "default_…" at ~80px — so it gets a
  // floor, as does every other column; a table that cannot fit then scrolls inside its
  // own region instead of truncating the identifier.
  const sized = columns.map((column, index) => {
    // Group columns (headers over child columns) have no width of their own.
    if (!('accessor' in column)) return column;
    return {
      ...column,
      minWidth: column.minWidth ?? (index === 0 ? 180 : 90),
      // A column with no cell of its own gets the default one, with two corrections: an absent
      // value is a dash (it rendered blank, which reads as "empty" or "zero"), and the English
      // placeholders a row transformer wrote ("Not reported"…) are shown in the app's language.
      cell:
        column.cell ??
        function DefaultCellWithFallbacks(props: CellProps) {
          return <DataTable.DefaultCell>{cellContent(props, t, formatNumber)}</DataTable.DefaultCell>;
        },
    };
  });

  return (
    <Flex flexDirection="column" gap={12}>
      <Flex justifyContent="space-between" alignItems="center" gap={8}>
        <Text>
          {localizedPurpose(result.entry, t)}
        </Text>
        <ProvenanceBadge
          provenance={result.provenance}
          confidence="high"
          evidence={result.evidence}
        />
      </Flex>

      <QueryStateBoundary
        result={result}
        emptyMessage={emptyMessage}
        permissionImpact={permissionImpact}
      >
        <Flex flexDirection="column" gap={8}>
          {summary?.(result)}
          {/* 3.6.5: no column resizing — the app sizes the columns, and the platform's resize handles (8–16 px wide,
              without a visible focus) were the app's last small targets and keyboard flags. */}
          <DataTable
            data={rows}
            columns={sized}
            sortable={sortable}
            fullWidth
            variant={{ rowSeparation: 'zebraStripes', verticalDividers: false }}
          >
            {rows.length > pageSize && (
              <DataTable.Pagination defaultPageSize={pageSize} pageSizeOptions={pageSizeOptions(pageSize)} />
            )}
            <DataTable.EmptyState>{t('c.table.empty')}</DataTable.EmptyState>
          </DataTable>
          <Text>
            {t('c.table.footer', {
              window: tWindow(result.timeframe.label),
              query: result.entry.id,
              rows: rows.length,
            })}
            {result.evidence.collectedAt !== undefined ? t('c.read.at', { time: formatTime(result.evidence.collectedAt) }) : ''}
            {isCapped(result.entry, result.records.length)
              ? ` · ${t('c.table.capped', { cap: formatNumber(resultCap(result.entry) ?? 0) })}`
              : ''}
          </Text>
        </Flex>
      </QueryStateBoundary>
    </Flex>
  );
}
