import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { HeatCalendar } from '../../components/spectrum';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import { StratoGauge } from '../../engine/strato';
import { useTranslation } from '../../i18n/useTranslation';
import { arrivalCalendar, arrivalSeries } from '../../models/problemTimeline';
import { absentCaptionKey } from '../../utils/absentCaption';
import { num, ratio, str } from '../../utils/records';

/**
 * The Dynatrace Intelligence page's rings and heat calendar as panels of their own (3.4.10, owner's report: "no
 * deck de tech wrapup ainda não vem as capturas dos gráficos novos em Dynatrace Intelligence"). The page and the
 * Tech Wrapup's capture stage draw the very same component, so a picture on a slide is the panel the SE saw.
 * Every figure is the page's: closure, recurrence and active share from `prob.summary` and `prob.recurrent.total`
 * (aggregates, nothing capped is summed), the calendar from `prob.timeline` over the pinned 7 days.
 */

/** The share of problems closed, of the recurring volume, and of problems still active — null when not read. */
export function useProblemRings() {
  const scope = useQueryScope();
  const summary = useCatalogQuery('prob.summary', scope);
  const recurrentTotal = useCatalogQuery('prob.recurrent.total', scope);
  const ok = summary.outcome === 'ok';
  const total = summary.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const open = summary.records.filter((record) => str(record, 'event.status') === 'ACTIVE').reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const closed = total - open;
  const recurrentRow = recurrentTotal.records[0];
  const recurringVolume = num(recurrentRow, 'recurringVolume') ?? 0;
  const patternVolume = num(recurrentRow, 'allVolume') ?? 0;
  return {
    summary,
    recurrentTotal,
    closurePct: ok ? (ratio(closed, total)?.percent ?? null) : null,
    activePct: ok ? (ratio(open, total)?.percent ?? null) : null,
    recurrencePct: recurrentTotal.outcome === 'ok' && patternVolume > 0 ? (recurringVolume / patternVolume) * 100 : null,
  };
}

export const ProblemRingsPanel = () => {
  const { t } = useTranslation();
  const factFrom = useSummaryFact();
  const { summary, recurrentTotal, closurePct, recurrencePct, activePct } = useProblemRings();
  const rounded = (value: number | null) => (value === null ? null : Math.round(value));
  // 3.4.18 (DN-6): the platform's GaugeChart, each ratio with its evidence (the rings of 3.2 carried none).
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('ai.rings.title')}
        </Heading>
        <div className="pvs-sgauge-row">
          <StratoGauge
            testId="ai-gauge-closed"
            value={closurePct}
            label={t('ai.ring.reliability.label')}
            caption={t('ai.ring.reliability.caption')}
            fact={factFrom(summary, rounded(closurePct), { unit: '%', calculation: t('ai.ring.reliability.calc') })}
          />
          <StratoGauge
            testId="ai-gauge-recurrence"
            value={recurrencePct}
            label={t('ai.ring.recurrence.label')}
            caption={t('ai.ring.recurrence.caption')}
            fact={factFrom(recurrentTotal, rounded(recurrencePct), { unit: '%', calculation: t('ai.ring.recurrence.calc') })}
          />
          <StratoGauge
            testId="ai-gauge-active"
            value={activePct}
            label={t('ai.ring.active.label')}
            caption={t('ai.ring.active.caption')}
            fact={factFrom(summary, rounded(activePct), { unit: '%', calculation: t('ai.ring.active.calc') })}
          />
        </div>
      </Stack>
    </Panel>
  );
};

export const ProblemCalendarPanel = () => {
  const { t, formatNumber, locale } = useTranslation();
  const scope = useQueryScope();
  const { resolvedTimeframe } = useStudio();
  const timeline = useCatalogQuery('prob.timeline', scope);
  // Problem arrivals per 6 h over the pinned 7 days; a bin the query did not return is a zero.
  const arrivals = timeline.outcome === 'ok' ? arrivalSeries(timeline.records, Date.parse(resolvedTimeframe.endIso)) : [];
  const calendar = arrivalCalendar(arrivals);
  const dayLabel = (ms: number) => new Date(ms).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
  const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}h`;
  const periodLabel = (hour: number) => `${hourLabel(hour)}–${hourLabel((hour + 6) % 24)}`;
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('ai.heat.title')}
        </Heading>
        {timeline.outcome === 'ok' || timeline.outcome === 'empty' ? (
          calendar.total === 0 ? (
            <Text className="pvs-muted">{t('ai.heat.none')}</Text>
          ) : (
            <>
              <Text>
                {t('ai.heat.summary', {
                  total: formatNumber(calendar.total),
                  // Per day over the run's length (28 six-hour bins = 7 days), not over the rows: the first and
                  // last rows are partial days.
                  perDay: formatNumber(Math.round((calendar.total / Math.max(1, (arrivals.length * 6) / 24)) * 10) / 10),
                  day: calendar.busiestDay === null ? '—' : dayLabel(calendar.busiestDay.date),
                  dayTotal: formatNumber(calendar.busiestDay?.total ?? 0),
                  period: calendar.peak === null ? '—' : `${dayLabel(calendar.peak.start)} ${periodLabel(new Date(calendar.peak.start).getHours())}`,
                  count: formatNumber(calendar.peak?.count ?? 0),
                })}
              </Text>
              <HeatCalendar
                calendar={calendar}
                caption={t('ai.heat.title')}
                dayHeader={t('ai.heat.dayHeader')}
                totalHeader={t('ai.heat.totalHeader')}
                dayLabel={dayLabel}
                periodLabel={periodLabel}
                cellLabel={(day, period, count) => t('ai.heat.cell', { day, period, count: formatNumber(count) })}
                outsideLabel={t('ai.heat.outside')}
                legendLow={t('ai.heat.legendLow')}
                legendHigh={t('ai.heat.legendHigh', { max: formatNumber(calendar.max) })}
                format={formatNumber}
              />
            </>
          )
        ) : (
          <Text className="pvs-muted">{t(absentCaptionKey(timeline.outcome))}</Text>
        )}
        <Text className="pvs-caption">{t('ai.heat.caption')}</Text>
      </Stack>
    </Panel>
  );
};
