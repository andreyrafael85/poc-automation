import React from 'react';

import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { ChartFrame } from '../components/ChartFrame';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { SectionIntro } from '../components/SectionIntro';
import { BarList } from '../components/viz/BarList';
import { useAccess } from '../config/AccessContext';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { Callout, Panel, Stack } from '../engine';
import { DailyLine } from '../engine/chart/DailyLine';
import { HourHeatmap } from '../engine/chart/HourHeatmap';
import { RingRankPanel } from '../engine/chart/RingRankPanel';
import '../engine/page-d.css';
import { appLabel, BREADTH_ORDER, DPA_LABEL, dpaIndex, toAiTotals, toApps, toBreadth, toPlatformTotals } from '../features/platformAdoption/model';
import { byArea, gridPeak, summariseTrend, toDailySeries, toHourGrid, workingHoursShare } from '../features/platformAdoption/trend';
import '../features/assessment/assessment.css';
import { useCatalogQuery, type CatalogQueryResult } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { derived } from '../models/provenance';
import { getQuery } from '../queries/catalog';
import { decimal } from '../utils/activeLocale';
import { num, str } from '../utils/records';

/**
 * Platform adoption (3.4.4, owner's order of 2026-11-18): how people use the Dynatrace platform — in a
 * customer's environment or in a PoC — composed from the "Dynatrace Intelligence feature adoption" and the
 * "Dynatrace Platform Adoption" (DPA) v1.5.0 dashboards, on its own page so it does not mix with the
 * Assessment (the owner's call).
 *
 * Six catalog reads of `dt.system.events`, each validated on the lab tenant at 0 scanned bytes. Users are
 * counted, never named; the Dynatrace organisation's users (the SE and the partner in a customer's tenant)
 * are shown apart. No money (rule 6).
 */

const SKILL_KEY: Record<string, StringKey> = {
  chat: 'adopt.skill.chat',
  operator: 'adopt.skill.operator',
  nl2dql: 'adopt.skill.nl2dql',
  dql2nl: 'adopt.skill.dql2nl',
  'document-search': 'adopt.skill.documentSearch',
};

export const PlatformAdoption = () => {
  const { t, tWindow, formatNumber, locale } = useTranslation();
  const scope = useQueryScope();
  const { executiveMode } = useStudio();
  const access = useAccess();
  const technical = !executiveMode && access.canWork;
  const factFrom = useSummaryFact();

  const totalsRead = useCatalogQuery('adopt.platform.total', scope);
  const dailyRead = useCatalogQuery('adopt.platform.daily', scope);
  const appsRead = useCatalogQuery('adopt.platform.apps', scope);
  const breadthRead = useCatalogQuery('adopt.platform.breadth', scope);
  const aiRead = useCatalogQuery('adopt.ai.total', scope);
  const skillsRead = useCatalogQuery('adopt.ai.skills', scope);
  // 3.4.7: use over time and by hour (owner's review of 3.4.6).
  const trendRead = useCatalogQuery('adopt.platform.trend', scope);
  const hoursRead = useCatalogQuery('adopt.platform.hours', scope);
  const reads: CatalogQueryResult[] = [totalsRead, dailyRead, trendRead, hoursRead, appsRead, breadthRead, aiRead, skillsRead];

  const platform = totalsRead.outcome === 'ok' ? toPlatformTotals(totalsRead.records[0]) : null;
  const avgDau = dailyRead.outcome === 'ok' ? num(dailyRead.records[0] ?? {}, 'avgDau') : dailyRead.outcome === 'empty' ? 0 : null;
  const activeDays = dailyRead.outcome === 'ok' ? num(dailyRead.records[0] ?? {}, 'activeDays') : null;
  const breadth = breadthRead.outcome === 'ok' || breadthRead.outcome === 'empty' ? toBreadth(breadthRead.records) : null;
  const ai = aiRead.outcome === 'ok' ? toAiTotals(aiRead.records[0]) : null;
  const apps = appsRead.outcome === 'ok' ? toApps(appsRead.records) : [];
  const index = dpaIndex(platform, avgDau, breadth === null ? null : breadth['7+']);
  const stickiness = platform !== null && avgDau !== null && platform.users > 0 ? (avgDau / platform.users) * 100 : null;
  const window = tWindow('timeframe.pinned.30d');

  // ------------------------------------------------------------------ 3.4.7: over time, by hour, by area
  const trendOk = trendRead.outcome === 'ok' || trendRead.outcome === 'empty';
  const series = trendOk ? toDailySeries(trendRead.records, trendRead.timeframe.startIso, trendRead.timeframe.endIso) : [];
  const trend = summariseTrend(series);
  const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  const hoursOk = hoursRead.outcome === 'ok' || hoursRead.outcome === 'empty';
  const grid = hoursOk ? toHourGrid(hoursRead.records) : null;
  const peakHour = grid === null ? null : gridPeak(grid);
  const working = grid === null ? null : workingHoursShare(grid);
  const weekdays = Array.from({ length: 7 }, (_, day) => new Date(Date.UTC(2026, 10, 15 + day)).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const areaBars = byArea(apps).map((entry) => ({
    key: entry.area,
    label: t(`adopt.area.${entry.area}` as StringKey),
    value: entry.actions,
    display: t('adopt.area.value', { actions: formatNumber(entry.actions), apps: formatNumber(entry.apps), users: formatNumber(entry.usersAtLeast) }),
  }));

  // ------------------------------------------------------------------ the band
  const band: SummaryItem[] = [
    {
      key: 'users',
      label: t('adopt.band.users'),
      fact: factFrom(totalsRead, platform === null ? null : platform.users),
      display: platform === null ? undefined : formatNumber(platform.users),
      detail: platform === null ? undefined : t('adopt.band.usersDetail', { dynatrace: formatNumber(platform.dynatraceUsers) }),
    },
    {
      key: 'apps',
      label: t('adopt.band.apps'),
      fact: factFrom(totalsRead, platform === null ? null : platform.apps),
      display: platform === null ? undefined : formatNumber(platform.apps),
    },
    {
      key: 'dau',
      label: t('adopt.band.dau'),
      fact: factFrom(dailyRead, avgDau === null ? null : Number(avgDau.toFixed(1))),
      display: avgDau === null ? undefined : decimal(avgDau, 1),
      detail: activeDays === null ? undefined : t('adopt.band.dauDetail', { days: formatNumber(activeDays) }),
    },
    {
      key: 'stickiness',
      label: t('adopt.band.stickiness'),
      fact:
        stickiness === null
          ? factFrom(dailyRead, null)
          : derived(Number(stickiness.toFixed(1)), dailyRead.evidence, t('adopt.band.stickinessCalc'), { unit: '%' }),
      display: stickiness === null ? undefined : `${decimal(stickiness, 1)}%`,
    },
    {
      key: 'api',
      label: t('adopt.band.api'),
      fact: factFrom(totalsRead, platform === null ? null : platform.apiCalls),
      display: platform === null ? undefined : formatNumber(platform.apiCalls),
      detail: platform === null ? undefined : t('adopt.band.apiDetail', { actions: formatNumber(platform.browserActions) }),
    },
    {
      key: 'ai',
      label: t('adopt.band.ai'),
      fact: factFrom(aiRead, ai === null ? null : ai.invocations),
      display: ai === null ? undefined : formatNumber(ai.invocations),
      detail: ai === null ? undefined : t('adopt.band.aiDetail', { users: formatNumber(ai.users) }),
    },
  ];

  // ------------------------------------------------------------------ lists
  const appBars = apps
    .filter((entry) => !entry.custom)
    .slice(0, 10)
    .map((entry) => ({ key: entry.app, label: appLabel(entry.app), value: entry.users, display: t('adopt.apps.value', { users: formatNumber(entry.users), actions: formatNumber(entry.actions) }) }));
  const customApps = apps.filter((entry) => entry.custom).length;
  const breadthBars =
    breadth === null
      ? []
      : BREADTH_ORDER.map((band) => ({ key: band, label: t(`adopt.breadth.${band}` as StringKey), value: breadth[band], display: formatNumber(breadth[band]) }));
  const skillBars =
    skillsRead.outcome === 'ok'
      ? skillsRead.records.map((record) => {
          const skill = str(record, 'skill') ?? '—';
          const invocations = num(record, 'invocations') ?? 0;
          const succeeded = num(record, 'succeeded') ?? 0;
          return {
            key: skill,
            label: SKILL_KEY[skill] === undefined ? skill : t(SKILL_KEY[skill]),
            value: invocations,
            display: t('adopt.skills.value', {
              invocations: formatNumber(invocations),
              pct: invocations === 0 ? '0' : decimal((succeeded / invocations) * 100, 1),
              users: formatNumber(num(record, 'users') ?? 0),
            }),
          };
        })
      : [];

  return (
    <Stack gap="section">
      <SectionIntro titleKey="adopt.title" questionKey="adopt.question" takeawayKey="adopt.takeaway" />

      <PageSummary items={band} footnote={t('adopt.band.footnote', { window })} />

      {/* The adoption index, after the DPA method: seven parts, each up to its points. */}
      <RingRankPanel
        data-testid="adopt-index"
        title={t('adopt.index.title')}
        caption={t('adopt.index.caption')}
        ring={{
          family: 'turquoise',
          value: index.value,
          valueDisplay: index.value === null ? undefined : formatNumber(index.value),
          label: t('adopt.index.ring'),
          caption: index.value === null ? t('p.asm.index.notCalculated') : t('adopt.index.ringCaption'),
          ariaLabel: t('adopt.index.aria'),
          missingLabel: t('p.asm.index.notCalculated'),
          fact: index.value === null ? factFrom(totalsRead, null) : derived(index.value, totalsRead.evidence, t('adopt.index.calc')),
        }}
      >
        {index.parts.length === 0 ? (
          <Text>{t('p.asm.gap.loading')}</Text>
        ) : (
          <ul className="pvs-domains" aria-label={t('adopt.index.title')}>
            {index.parts.map((entry) => (
              <li key={entry.id} className="pvs-domains__row" data-state="measured" data-testid={`adopt-dpa-${entry.id}`}>
                <span className="pvs-domains__name">
                  {t(DPA_LABEL[entry.id])}
                  <span className="pvs-domains__weight">{t('adopt.index.points', { max: String(entry.max) })}</span>
                </span>
                <span className="pvs-domains__track" aria-hidden="true">
                  <span className="pvs-domains__fill" style={{ width: `${((entry.points / entry.max) * 100).toFixed(1)}%` }} />
                </span>
                <span className="pvs-domains__value">{decimal(entry.points, 1)}</span>
                <span className="pvs-domains__line">
                  {t('adopt.index.line', {
                    value: entry.id === 'stickiness' ? `${decimal(entry.value, 1)}%` : formatNumber(Math.round(entry.value)),
                    target: entry.id === 'stickiness' ? `${decimal(entry.target, 0)}%` : formatNumber(Math.round(entry.target)),
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </RingRankPanel>

      {/* 3.4.7 — use over time: one chart per measure on the same days, never two axes. */}
      <ChartFrame
        role="volume"
        title={t('adopt.trend.title')}
        caption={t('adopt.trend.caption')}
        provenance={trendRead.provenance}
        evidence={trendRead.evidence}
        windowLabel={window}
      >
        {series.length < 2 ? (
          <Text>{trendRead.isLoading ? t('p.asm.gap.loading') : trendOk ? t('adopt.none') : t('adopt.unread')}</Text>
        ) : (
          <div className="pvs-adopt-trend" data-testid="adopt-trend">
            <dl className="pvs-adopt-trend__stats">
              <div>
                <dt>{t('adopt.trend.stat.peak')}</dt>
                <dd>
                  {trend.peakActions === null
                    ? '—'
                    : t('adopt.trend.stat.peakValue', { day: shortDay(trend.peakActions.day), actions: formatNumber(trend.peakActions.actions), users: formatNumber(trend.peakActions.users) })}
                </dd>
              </div>
              <div>
                <dt>{t('adopt.trend.stat.active')}</dt>
                <dd>{t('adopt.trend.stat.activeValue', { active: formatNumber(trend.activeDays), days: formatNumber(trend.days) })}</dd>
              </div>
              <div>
                <dt>{t('adopt.trend.stat.rhythm')}</dt>
                <dd>
                  {trend.weekdayAvg === null || trend.weekendAvg === null
                    ? '—'
                    : t('adopt.trend.stat.rhythmValue', { weekday: formatNumber(Math.round(trend.weekdayAvg)), weekend: formatNumber(Math.round(trend.weekendAvg)) })}
                </dd>
              </div>
            </dl>
            {/* 3.4.8: the two measures side by side on the same days (owner's review of 3.4.7). */}
            <div className="pvs-adopt-row">
            <div className="pvs-adopt-trend__chart">
              <Text className="pvs-label">{t('adopt.trend.users')}</Text>
              <DailyLine
                points={series.map((entry) => ({ day: entry.day, value: entry.users }))}
                label={t('adopt.trend.users')}
                format={(value) => formatNumber(Math.round(value))}
                formatDay={shortDay}
                peakLabel={(value, day) => t('adopt.trend.peak', { value, day })}
                family="blue"
                height={190}
                width={480}
              />
            </div>
            <div className="pvs-adopt-trend__chart">
              <Text className="pvs-label">{t('adopt.trend.actions')}</Text>
              <DailyLine
                points={series.map((entry) => ({ day: entry.day, value: entry.actions }))}
                label={t('adopt.trend.actions')}
                format={(value) => formatNumber(Math.round(value))}
                formatDay={shortDay}
                peakLabel={(value, day) => t('adopt.trend.peak', { value, day })}
                family="purple"
                height={190}
                width={480}
              />
            </div>
            </div>
          </div>
        )}
      </ChartFrame>

      {/* 3.4.8: apps, areas and breadth in one row of three compact tiles (owner's review of 3.4.7). */}
      <div className="pvs-adopt-row pvs-adopt-compact" data-cols="3" data-testid="adopt-usage">
        <ChartFrame
          role="magnitude"
          title={t('adopt.apps.title')}
          caption={t('adopt.apps.caption', { custom: formatNumber(customApps) })}
          provenance={appsRead.provenance}
          evidence={appsRead.evidence}
          windowLabel={window}
        >
          {appBars.length === 0 ? <Text>{t('adopt.none')}</Text> : <BarList role="magnitude" ariaLabel={t('adopt.apps.title')} items={appBars} />}
        </ChartFrame>
        <ChartFrame
          role="magnitude"
          title={t('adopt.area.title')}
          caption={t('adopt.area.caption')}
          provenance={appsRead.provenance}
          evidence={appsRead.evidence}
          windowLabel={window}
        >
          {areaBars.length === 0 ? <Text>{t('adopt.none')}</Text> : <BarList role="magnitude" ariaLabel={t('adopt.area.title')} items={areaBars} />}
        </ChartFrame>
        <ChartFrame
          role="category"
          title={t('adopt.breadth.title')}
          caption={t('adopt.breadth.caption')}
          provenance={breadthRead.provenance}
          evidence={breadthRead.evidence}
          windowLabel={window}
        >
          {breadthBars.length === 0 ? <Text>{t('adopt.none')}</Text> : <BarList role="category" ranked={false} ariaLabel={t('adopt.breadth.title')} items={breadthBars} />}
        </ChartFrame>
      </div>

      {/* 3.4.8: when people use the platform beside Dynatrace Intelligence in daily use. */}
      <div className="pvs-adopt-row pvs-adopt-compact">
      {/* 3.4.7 — when the platform is used: weekday × hour in the viewer's time zone. */}
      <ChartFrame
        role="category"
        title={t('adopt.hours.title')}
        caption={t('adopt.hours.caption', { tz: timeZone })}
        provenance={hoursRead.provenance}
        evidence={hoursRead.evidence}
        windowLabel={window}
      >
        {grid === null ? (
          <Text>{hoursRead.isLoading ? t('p.asm.gap.loading') : t('adopt.unread')}</Text>
        ) : (
          <div className="pvs-adopt-hours" data-testid="adopt-hours">
            {peakHour !== null && (
              <Text>
                {t('adopt.hours.peak', {
                  weekday: weekdays[peakHour.weekday] ?? '',
                  hour: String(peakHour.hour).padStart(2, '0'),
                  count: formatNumber(peakHour.actions),
                  pct: working === null ? '—' : decimal(working, 0),
                })}
              </Text>
            )}
            <HourHeatmap
              grid={grid}
              weekdays={weekdays}
              caption={t('adopt.hours.title')}
              cellLabel={(count, weekday, hour) => t('adopt.hours.cell', { count: formatNumber(count), weekday, hour: String(hour).padStart(2, '0') })}
              legend={{ less: t('adopt.hours.less'), more: t('adopt.hours.more') }}
            />
          </div>
        )}
      </ChartFrame>

      {/* Dynatrace Intelligence: the AI in daily use. */}
      <Panel as="section" pad="roomy" data-testid="adopt-ai">
        <Stack gap="group">
          <Heading level={3} as="h2">
            {t('adopt.ai.title')}
          </Heading>
          <Text className="pvs-caption">{t('adopt.ai.caption')}</Text>
          {ai === null ? (
            <Text>{aiRead.isLoading ? t('p.asm.gap.loading') : t('adopt.unread')}</Text>
          ) : (
            <>
              <Text>
                {ai.invocations === 0
                  ? t('adopt.ai.none')
                  : t('adopt.ai.summary', {
                      invocations: formatNumber(ai.invocations),
                      pct: decimal((ai.succeeded / ai.invocations) * 100, 1),
                      users: formatNumber(ai.users),
                      skills: formatNumber(ai.skills),
                    })}
              </Text>
              <Text className="pvs-caption">
                {ai.feedback === 0 ? t('adopt.ai.noFeedback') : t('adopt.ai.feedback', { positive: formatNumber(ai.positive), negative: formatNumber(ai.negative) })}
              </Text>
              {skillBars.length > 0 && <BarList role="magnitude" ariaLabel={t('adopt.ai.title')} items={skillBars} />}
              {platform !== null && (
                <Text className="pvs-caption">{t('adopt.ai.davis', { davis: formatNumber(platform.aiCalls), analyzers: formatNumber(platform.analyzerCalls) })}</Text>
              )}
            </>
          )}
        </Stack>
      </Panel>
      </div>

      <Callout kind="note" title={t('adopt.privacy.title')}>
        {t('adopt.privacy.body')}
      </Callout>

      {/* Method and sources, as on the Assessment. */}
      <Panel as="section" pad="roomy" data-testid="adopt-method">
        <Stack gap="group">
          <Heading level={3} as="h2">
            {t('p.asm.method.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('adopt.method.body')}</Paragraph>
          <div className="pvs-asm-table-wrap">
            <table className="pvs-asm-table">
              <thead>
                <tr>
                  <th scope="col">{t('p.asm.method.query')}</th>
                  <th scope="col">{t('p.asm.method.purpose')}</th>
                  <th scope="col" data-num>
                    {t('p.asm.method.state')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reads.map((result) => (
                  <tr key={result.entry.id}>
                    <td data-code>{result.entry.id}</td>
                    <td>{t(`catalog.purpose.${result.entry.id}` as StringKey)}</td>
                    <td data-num>{t(`p.asm.method.${result.outcome}` as StringKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {technical && <DqlDisclosure entries={reads.map((result) => getQuery(result.entry.id as Parameters<typeof getQuery>[0]))} />}
        </Stack>
      </Panel>
    </Stack>
  );
};
