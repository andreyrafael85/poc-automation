import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { compareWeeks, inventoryDeltas, problemDays } from '../../models/pocBaseline';
import type { GrailRecord } from '../../utils/records';

/**
 * 3.6.1 — Day 0 × today on the Executive summary (the v5 proposal, from v4: "o Dia 0 ao lado de hoje"): each indicator
 * read on both sides — the PoC's first day (or first days) in grey, now in colour, the change in a chip, its tone from
 * which way is better. Only indicators with both sides measured are drawn; one without a Day 0 is left out, never
 * guessed (rule 8). From the reads the PoC timeline already makes (`cov.inventory.day0`, `cov.inventory`,
 * `prob.poc.daily`), shown only once a PoC start date is set.
 */

export interface Day0Row {
  key: string;
  label: StringKey;
  hint: StringKey;
  day0: number;
  today: number;
  /** Which way is better. */
  better: 'up' | 'down';
  /** One decimal for a daily average, none for a count. */
  decimals: 0 | 1;
}

/** The indicators measured on both sides, in the order they are read. */
export function day0Rows(day0: readonly GrailRecord[], today: readonly GrailRecord[], daily: readonly GrailRecord[], startDate: string | null, now: Date = new Date()): Day0Row[] {
  const rows: Day0Row[] = [];
  const deltas = inventoryDeltas(day0, today);
  const count = (category: 'Hosts' | 'Services' | 'Process instances', key: string, label: StringKey) => {
    const entry = deltas.find((item) => item.category === category);
    if (entry?.day0 != null && entry.today != null) rows.push({ key, label, hint: 'exec.d0.hint.count', day0: entry.day0, today: entry.today, better: 'up', decimals: 0 });
  };
  count('Hosts', 'hosts', 'exec.d0.hosts');
  count('Services', 'services', 'exec.d0.services');
  count('Process instances', 'processes', 'exec.d0.processes');
  if (startDate !== null) {
    const weeks = compareWeeks(problemDays(daily, startDate, now), now);
    if (weeks !== null) rows.push({ key: 'problems', label: 'exec.d0.problems', hint: 'exec.d0.hint.problems', day0: weeks.first.perDay, today: weeks.latest.perDay, better: 'down', decimals: 1 });
  }
  return rows;
}

export const Day0VsToday = () => {
  const { t, formatNumber, formatDay } = useTranslation();
  const scope = useQueryScope();
  const { pocWindows } = useStudio();
  const day0 = useCatalogQuery('cov.inventory.day0', scope);
  const today = useCatalogQuery('cov.inventory', scope);
  const daily = useCatalogQuery('prob.poc.daily', scope);
  if (pocWindows === null) return null;
  const effectiveStart = pocWindows.since.startIso.slice(0, 10);
  const rows = day0Rows(day0.outcome === 'ok' ? day0.records : [], today.outcome === 'ok' ? today.records : [], daily.outcome === 'ok' ? daily.records : [], effectiveStart);
  if (rows.length === 0) return null;
  const shown = (row: Day0Row, value: number) => formatNumber(row.decimals === 1 ? Math.round(value * 10) / 10 : Math.round(value));
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('exec.d0.title')}
          </Heading>
          <Text className="pvs-caption">{t('exec.d0.caption', { day0: formatDay(pocWindows.startDate) })}</Text>
        </Stack>
        <div className="pvs-d0" role="list">
          {rows.map((row) => {
            const max = Math.max(row.day0, row.today) || 1;
            const change = row.today - row.day0;
            const good = change === 0 ? 'neutral' : (change > 0) === (row.better === 'up') ? 'good' : 'bad';
            const sign = change > 0 ? '+' : change < 0 ? '−' : '';
            return (
              <div key={row.key} className="pvs-d0__row" role="listitem">
                <div className="pvs-d0__head">
                  <span className="pvs-d0__label">{t(row.label)}</span>
                  <span className="pvs-d0__hint">{t(row.hint)}</span>
                </div>
                <div className="pvs-d0__bars">
                  <span className="pvs-d0__tag">{t('exec.d0.day0')}</span>
                  <span className="pvs-d0__track">
                    <span className="pvs-d0__bar" data-side="day0" style={{ width: `${((row.day0 / max) * 100).toFixed(1)}%` }} />
                  </span>
                  <span className="pvs-d0__value">{shown(row, row.day0)}</span>
                  <span className="pvs-d0__tag">{t('exec.d0.today')}</span>
                  <span className="pvs-d0__track">
                    <span className="pvs-d0__bar" data-side="today" style={{ width: `${((row.today / max) * 100).toFixed(1)}%` }} />
                  </span>
                  <span className="pvs-d0__value">{shown(row, row.today)}</span>
                </div>
                <span className="pvs-skpi__delta" data-tone={good}>
                  <span aria-hidden="true">{change > 0 ? '▲' : change < 0 ? '▼' : '='}</span>
                  {sign}
                  {shown(row, Math.abs(change))}
                </span>
              </div>
            );
          })}
        </div>
        <Text className="pvs-caption">{t('exec.d0.source')}</Text>
      </Stack>
    </Panel>
  );
};
