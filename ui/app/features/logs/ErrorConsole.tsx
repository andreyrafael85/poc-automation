import React from 'react';
import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { useQueryScope } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import { useTranslation } from '../../i18n/useTranslation';
import { num, str, type GrailRecord } from '../../utils/records';

/**
 * 3.6.4 (v6, the Logs model's console; the owner approved the new read on 2026-11-22): error lines — when, where from
 * (service, workload, host or bucket), the message. 3.6.8 (owner: "era legal ter uma coluna de count dos erros conforme o
 * período está selecionado"; he chose "always in the period"): the lines come from `log.errors.grouped` — the errors of
 * the selected window grouped by message (numbers as #, ids as <id>, so a repeat counts once), the 12 most recently seen,
 * each with how many times it appeared and on how many hosts. Each count is its own group's and the lines are never summed
 * (rule 7); the 30-minute total stays `log.quality`'s ERROR rows. A window that reached the read's ceiling shows its
 * counts as "at least". Screen only: the Logs page is not printed.
 */

export interface LogLine {
  time: string | null;
  origin: string;
  message: string;
  /** Times this error appeared in the window (grouped reads only). */
  count: number | null;
  /** Distinct hosts it came from (grouped reads only). */
  hosts: number | null;
}

export function logLines(records: readonly GrailRecord[]): LogLine[] {
  return records.map((record) => ({
    time: str(record, 'last') ?? str(record, 'timestamp'),
    origin: str(record, 'service') ?? str(record, 'workload') ?? str(record, 'host') ?? str(record, 'bucket') ?? '—',
    message: (str(record, 'message') ?? str(record, 'content') ?? '').replace(/\s+/g, ' ').trim() || '—',
    count: num(record, 'count'),
    hosts: num(record, 'hosts'),
  }));
}

/** Every ERROR record of the window, from the aggregate (`log.quality`), or null when it was not read. */
export function errorTotal(records: readonly GrailRecord[]): number | null {
  const rows = records.filter((record) => (str(record, 'status') ?? '').toUpperCase() === 'ERROR');
  if (records.length === 0) return null;
  return rows.reduce((sum, record) => sum + (num(record, 'total') ?? 0), 0);
}

export const ErrorConsole = () => {
  const { t, formatNumber, formatDateTime } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const recent = useCatalogQuery('log.errors.grouped', scope);
  const quality = useCatalogQuery('log.quality', scope);
  if (recent.outcome !== 'ok') return null;
  const lines = logLines(recent.records);
  const atLeast = recent.quality.scanLimited;
  const total = quality.outcome === 'ok' ? errorTotal(quality.records) : null;
  const fact = factFrom(recent, lines.length);
  return (
    <Panel pad="roomy" data-testid="logs-console">
      <Stack gap="group">
        <div className="pvs-console__head">
          <Heading level={4} as="h2">
            {t('v6.logconsole.title')}
          </Heading>
          <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
        </div>
        {lines.length === 0 ? (
          <Text className="pvs-muted">{t('v6.logconsole.noneWindow')}</Text>
        ) : (
          <ol className="pvs-console pvs-console--logs" aria-label={t('v6.logconsole.title')}>
            <li className="pvs-console__row pvs-console__row--head" aria-hidden="true">
              <span>{t('v6.logconsole.col.last')}</span>
              <span />
              <span>{t('v6.logconsole.col.origin')}</span>
              <span>{t('v6.logconsole.col.message')}</span>
              <span className="pvs-console__count">{t('v6.logconsole.col.count')}</span>
            </li>
            {lines.map((line, index) => (
              <li key={`${line.time ?? ''}-${index}`} className="pvs-console__row" data-open="true">
                <span className="pvs-console__time">{line.time === null ? '—' : formatDateTime(line.time)}</span>
                <span className="pvs-console__status">{t('v6.logconsole.level')}</span>
                <span className="pvs-console__category" title={line.origin}>
                  {line.origin}
                  {line.hosts !== null && line.hosts > 1 && <span className="pvs-console__id"> · {t('v6.logconsole.hosts', { n: formatNumber(line.hosts) })}</span>}
                </span>
                <span className="pvs-console__name" title={line.message}>
                  {line.message}
                </span>
                <span className="pvs-console__count" aria-label={line.count === null ? undefined : t('v6.logconsole.countAria', { n: formatNumber(line.count) })}>
                  {line.count === null ? '—' : atLeast ? t('v6.logconsole.atLeast', { n: formatNumber(line.count) }) : formatNumber(line.count)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <Text className="pvs-caption">
          {total === null
            ? t('v6.logconsole.grouped', { shown: formatNumber(lines.length) })
            : t('v6.logconsole.groupedTotal', { shown: formatNumber(lines.length), total: formatNumber(total) })}
        </Text>
      </Stack>
    </Panel>
  );
};
