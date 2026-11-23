import React from 'react';
import { Heading, Text } from '@dynatrace/strato-components/typography';

import { useQueryScope } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useTranslation } from '../../i18n/useTranslation';
import { problemCategoryLabel } from '../problems/categoryLabel';
import { formatNanos } from '../../utils/time';
import { list, num, str, type GrailRecord } from '../../utils/records';

/**
 * 3.6.0 (v6, wave 3 — the "live console" of the reference dashboards): the most recent problems as console lines —
 * when it began, open or closed, its category, its name and id, what it reached, how long it took. From `prob.list`
 * (the 100 most recent of the last 7 days, already read by Topology); the console shows the first 12 and says so —
 * a list, never a count (rule 7).
 */

export const CONSOLE_ROWS = 12;

export interface ConsoleLine {
  id: string;
  name: string;
  category: string;
  open: boolean;
  startIso: string | null;
  durationNs: number | null;
  affected: string[];
}

/** The console's lines: most recent first (the query sorts them; so does the app), at most `CONSOLE_ROWS`. */
export function consoleLines(records: readonly GrailRecord[], limit = CONSOLE_ROWS): ConsoleLine[] {
  const at = (record: GrailRecord) => {
    const time = Date.parse(str(record, 'start') ?? '');
    return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
  };
  return [...records].sort((a, b) => at(b) - at(a)).slice(0, limit).map((record) => ({
    id: str(record, 'displayId') ?? '—',
    name: str(record, 'name') ?? '—',
    category: str(record, 'category') ?? '',
    open: (str(record, 'status') ?? '').toUpperCase() === 'ACTIVE',
    startIso: str(record, 'start'),
    durationNs: num(record, 'durationNs'),
    affected: list(record, 'affected'),
  }));
}

export const ProblemConsole = () => {
  const { t, formatDateTime, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const problems = useCatalogQuery('prob.list', scope);
  if (problems.outcome === 'loading') return null;
  const lines = problems.outcome === 'ok' ? consoleLines(problems.records) : [];
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <div className="pvs-console__head">
          <Heading level={4} as="h2">
            {t('v6.console.title')}
          </Heading>
          {lines.length > 0 && <span className="pvs-console__live">{t('v6.console.window')}</span>}
        </div>
        {lines.length === 0 ? (
          <Text className="pvs-muted">{t('v6.console.none')}</Text>
        ) : (
          <ol className="pvs-console" aria-label={t('v6.console.title')}>
            {lines.map((line) => (
              <li key={`${line.id}-${line.startIso ?? ''}`} className="pvs-console__row" data-open={line.open ? 'true' : 'false'}>
                <span className="pvs-console__time">{line.startIso === null ? '—' : formatDateTime(line.startIso)}</span>
                <span className="pvs-console__status">{t(line.open ? 'v6.console.open' : 'v6.console.closed')}</span>
                <span className="pvs-console__category">{line.category === '' ? '—' : problemCategoryLabel(line.category, t)}</span>
                <span className="pvs-console__name">
                  {line.name} <span className="pvs-console__id">{line.id}</span>
                </span>
                <span className="pvs-console__affected">
                  {line.affected.length === 0 ? '—' : line.affected.length === 1 ? line.affected[0] : t('v6.console.affected', { first: line.affected[0] ?? '', more: formatNumber(line.affected.length - 1) })}
                </span>
                <span className="pvs-console__duration">{line.open || line.durationNs === null ? '—' : formatNanos(line.durationNs)}</span>
              </li>
            ))}
          </ol>
        )}
        <Text className="pvs-caption">{t('v6.console.caption', { shown: formatNumber(lines.length) })}</Text>
      </Stack>
    </Panel>
  );
};
