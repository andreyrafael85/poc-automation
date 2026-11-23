import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import {
  AiIcon,
  DocumentIcon,
  HostsIcon,
  NetworkIcon,
  SparklineIcon,
  TargetFilledIcon,
  ThumbsUpIcon,
  WorkflowIcon,
} from '@dynatrace/strato-icons';

import { KpiHero, SpectrumArea, useChartFormat, type SpectrumFamily } from '../components/spectrum';
import { CriteriaPanel, useCriteriaResults } from '../features/criteria/CriteriaPanel';
import { useSummaryFact } from '../hooks/useSummaryFact';
import {
  adoptionSignals,
  compareWeeks,
  firstAutomationDay,
  inventoryDeltas,
  pocMilestones,
  problemDays,
  trackStops,
  type AdoptionId,
  type PocMilestone,
} from '../models/pocBaseline';
import { pocDay } from '../models/pocPlan';

import { SectionIntro } from '../components/SectionIntro';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { Callout, EVIDENCE, Cluster, Figure, Grid, Panel, Stack } from '../engine';
import type { IconComponent } from '../engine/evidence';
import '../engine/page-a.css';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { diagnoseEntityModel } from '../models/entityHealth';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { formatBytes, windowDays } from '../utils/time';
import { num, str } from '../utils/records';
import { absentCaptionKey } from '../utils/absentCaption';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';

/**
 * The PoC as a story — its own dates first (3.2.5), then seven milestones, one value narrative.
 *
 * With a start date in Settings the page reconstructs the PoC from Grail: the track from the
 * kick-off to today and the planned end, what was monitored on Day 0 against today (the entity
 * model read over the first day), the first days against the latest (problems that began, and how
 * fast they closed), and the agreed objectives judged live. Nothing is snapshotted; every figure
 * says which day it was read for.
 *
 * Each milestone carries a live metric pulled from the tenant where the signal
 * exists, and is a narrative milestone where it does not. A milestone whose metric
 * could not be measured says so (a dash and the reason); it never shows a
 * fabricated number to keep the story tidy.
 *
 * v3.1: an ordered list of flat cards joined by one plain rule, in place of the
 * aurora hero and the per-milestone neon fill. "Live signal" and "Narrative milestone" are
 * told apart by an icon and a word as well as a tone, so the distinction — which
 * is the whole point of the page's honesty — survives a greyscale printout.
 *
 * 3.2.6: the milestones are a journey — an emblem per milestone on one rail, the live figure in
 * painted ink — and the "value momentum" panel that repeated them is gone ("Day 0 → today" says
 * it with the PoC's own dates). The baseline gains the adoption series (automation runs, logs,
 * real-user actions per day) and the first automation joins the track.
 */

const ENTITY_CATEGORIES = [
  'Hosts',
  'Services',
  'Process instances',
  'Kubernetes clusters',
  'Kubernetes workloads',
  'Web applications',
  'Mobile applications',
  'Synthetic monitors',
] as const;

interface DayMetric {
  value: number | null;
  labelKey: StringKey;
  /** Outcome of the query behind the figure, so an absent value says why (3.2.1). */
  outcome?: QueryOutcome;
}

/** Each milestone's emblem and family, in the order the PoC is read (3.2.6). */
const JOURNEY: readonly { Icon: IconComponent; family: SpectrumFamily }[] = [
  { Icon: HostsIcon, family: 'blue' },
  { Icon: TargetFilledIcon, family: 'blue-turquoise' },
  { Icon: AiIcon, family: 'turquoise' },
  { Icon: NetworkIcon, family: 'moss' },
  { Icon: SparklineIcon, family: 'orange' },
  { Icon: WorkflowIcon, family: 'pink-purple' },
  { Icon: ThumbsUpIcon, family: 'purple' },
];

export const PocTimeline = () => {
  const scope = useQueryScope();
  const { t, formatNumber } = useTranslation();
  const { resolvedTimeframe } = useStudio();
  const windowLabel = t(`timeframe.${resolvedTimeframe.expression}` as StringKey);
  const dayCount = Math.max(1, Math.round(windowDays(resolvedTimeframe)));
  const daysText = dayCount === 1 ? t('tl.dayOne') : t('tl.dayMany', { n: formatNumber(dayCount) });

  const inventory = useCatalogQuery('cov.inventory', scope);
  const problems = useCatalogQuery('prob.summary', scope);
  const workflows = useCatalogQuery('auto.workflows.total', scope);
  const recurringQuery = useCatalogQuery('prob.recurrent.total', scope);
  // 3.2.5: the PoC's own baseline, read only once a start date is set.
  const { pocPlan, pocWindows } = useStudio();
  const day0 = useCatalogQuery('cov.inventory.day0', scope);
  const daily = useCatalogQuery('prob.poc.daily', scope);
  // 3.2.6: adoption since Day 0 (anchored too).
  const signals = useCatalogQuery('poc.daily.signals', scope);
  const rumDaily = useCatalogQuery('poc.daily.rum', scope);
  const criteria = useCriteriaResults(pocPlan.criteria);

  // The same refusal of an entity-model outage as the Overview: every category at zero at
  // once is the model not answering, not an estate with nothing in it.
  const entityOutage = diagnoseEntityModel(inventory.records).state === 'unavailable';

  const categoryCount = (category: string): number | null => {
    if (inventory.outcome !== 'ok' || entityOutage) return null;
    return num(inventory.records.find((item) => str(item, 'category') === category), 'value');
  };

  const entities = ENTITY_CATEGORIES.reduce<number | null>((total, category) => {
    const value = categoryCount(category);
    return value === null ? total : (total ?? 0) + value;
  }, null);

  const coveredTypes =
    inventory.outcome === 'ok' && !entityOutage
      ? ENTITY_CATEGORIES.filter((category) => (categoryCount(category) ?? 0) > 0).length
      : null;

  const totalProblems =
    problems.outcome === 'ok'
      ? problems.records.reduce((total, record) => total + (num(record, 'problems') ?? 0), 0)
      : null;

  const services = categoryCount('Services');
  // A source that answered with no recurring pattern has measured zero; only a query that did
  // not answer is "not measured". (`length || null` turned the first into the second.)
  const recurring =
    recurringQuery.outcome === 'ok' ? num(recurringQuery.records[0], 'patterns') : recurringQuery.outcome === 'empty' ? 0 : null;
  const workflowCount = workflows.outcome === 'ok' ? num(workflows.records[0], 'workflows') : null;

  const days: readonly {
    n: number;
    titleKey: StringKey;
    bodyKey: StringKey;
    impactKey: StringKey;
    metric: DayMetric | null;
  }[] = [
    { n: 1, titleKey: 'tl.day1.title', bodyKey: 'tl.day1.body', impactKey: 'tl.day1.impact', metric: { value: entities, labelKey: 'tl.metric.entities', outcome: inventory.outcome } },
    { n: 2, titleKey: 'tl.day2.title', bodyKey: 'tl.day2.body', impactKey: 'tl.day2.impact', metric: { value: coveredTypes, labelKey: 'tl.metric.coverage', outcome: inventory.outcome } },
    { n: 3, titleKey: 'tl.day3.title', bodyKey: 'tl.day3.body', impactKey: 'tl.day3.impact', metric: { value: totalProblems, labelKey: 'tl.metric.problems', outcome: problems.outcome } },
    { n: 4, titleKey: 'tl.day4.title', bodyKey: 'tl.day4.body', impactKey: 'tl.day4.impact', metric: { value: services, labelKey: 'tl.metric.services', outcome: inventory.outcome } },
    { n: 5, titleKey: 'tl.day5.title', bodyKey: 'tl.day5.body', impactKey: 'tl.day5.impact', metric: { value: recurring, labelKey: 'tl.metric.recurring', outcome: recurringQuery.outcome } },
    { n: 6, titleKey: 'tl.day6.title', bodyKey: 'tl.day6.body', impactKey: 'tl.day6.impact', metric: { value: workflowCount, labelKey: 'tl.metric.workflows', outcome: workflows.outcome } },
    { n: 7, titleKey: 'tl.day7.title', bodyKey: 'tl.day7.body', impactKey: 'tl.day7.impact', metric: null },
  ];

  const live = EVIDENCE.observed;

  return (
    <>
      <SectionIntro titleKey="tl.title" questionKey="tl.subtitle" />

      {pocWindows === null ? (
        <PlanNeeded future={pocPlan.startDate !== null} />
      ) : (
        <PocBaseline
          startDate={pocPlan.startDate ?? pocWindows.startDate}
          effectiveStart={pocWindows.since.startIso.slice(0, 10)}
          clamped={pocWindows.clamped}
          endDate={pocPlan.endDate}
          day0={day0}
          today={inventory}
          daily={daily}
          signals={signals}
          rumDaily={rumDaily}
        />
      )}
      {/* 3.3.14: the criteria met on a ring beside the list (ring + ranking). */}
      <CriteriaPanel results={criteria} ring />

      <Stack as="section" gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('tl.journey.title')}
          </Heading>
          <Paragraph className="pvs-prose pvs-muted">{t('tl.window', { window: windowLabel, days: daysText })}</Paragraph>
        </Stack>
        <ol className="pvs-journey" aria-label={t('tl.aria')}>
          {days.map((day, index) => {
            const value = day.metric === null ? null : day.metric.value;
            const measured = value !== null;
            const look = JOURNEY[index] ?? JOURNEY[0]!;
            // A milestone whose live metric could not be read is drawn like any other absence:
            // dashed and neutral, never amber.
            const state = day.metric === null ? 'narrative' : measured ? 'live' : 'missing';
            const Kind = measured ? live.Icon : DocumentIcon;
            return (
              <li key={day.n} className="pvs-journey__step" data-spectrum={look.family} data-state={state}>
                <div className="pvs-journey__marker" aria-hidden="true">
                  <span className="pvs-journey__rail" />
                  <span className="pvs-journey__emblem">
                    <look.Icon />
                  </span>
                </div>
                <div className="pvs-journey__card">
                  <Text className="pvs-label pvs-journey__kicker">
                    {t('tl.day', { n: day.n })} ·{' '}
                    <span className="pvs-journey__kind">
                      <Kind aria-hidden="true" />
                      {measured ? t('tl.live') : t('tl.narrative')}
                    </span>
                  </Text>
                  <Heading level={5} as="h3" className="pvs-journey__title">
                    {t(day.titleKey)}
                  </Heading>
                  {day.metric !== null && (
                    <Figure
                      value={value === null ? '' : formatNumber(value)}
                      unit={value === null ? undefined : t(day.metric.labelKey)}
                      size="lg"
                      ink="spectrum"
                      missing={!measured}
                      missingLabel={t(absentCaptionKey(day.metric.outcome))}
                    />
                  )}
                  {day.metric !== null && !measured && (
                    <Text className="pvs-caption">
                      {t(day.metric.labelKey)} · {t(absentCaptionKey(day.metric.outcome))}
                    </Text>
                  )}
                  <Text className="pvs-journey__impact">{t(day.impactKey)}</Text>
                  <Text className="pvs-caption">{t(day.bodyKey)}</Text>
                </div>
              </li>
            );
          })}
        </ol>
      </Stack>
    </>
  );
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Without a start date the baseline cannot be read: the page says how to set one. */
const PlanNeeded = ({ future }: { future: boolean }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Callout kind="note" title={future ? t('tl.plan.futureTitle') : t('tl.plan.title')}>
      <Stack gap="tight">
        <Paragraph>{future ? t('tl.plan.futureBody') : t('tl.plan.body')}</Paragraph>
        <Cluster>
          <Button variant="emphasized" onClick={() => void navigate('/settings?tab=plan')}>
            {t('tl.plan.open')}
          </Button>
        </Cluster>
      </Stack>
    </Callout>
  );
};

const MILESTONE_KEY: Record<PocMilestone['kind'], StringKey> = {
  kickoff: 'tl.track.kickoff',
  'first-root-cause': 'tl.track.firstRoot',
  'first-automation': 'tl.track.firstAutomation',
  today: 'tl.track.today',
  'planned-end': 'tl.track.end',
};

/** The order of a merged mark's names (the first one draws the dot): today, the kick-off, then what happened. */
const MARK_KIND_ORDER: readonly PocMilestone['kind'][] = ['today', 'kickoff', 'first-root-cause', 'first-automation', 'planned-end'];

/** The PoC from its kick-off to today and its planned end, with the days the data can date. */
const PocTrack = ({ milestones, day }: { milestones: readonly PocMilestone[]; day: number | null }) => {
  const { t, formatDay } = useTranslation();
  const today = milestones.find((milestone) => milestone.kind === 'today');
  const stops = trackStops(milestones);
  const rows = Math.max(1, ...stops.map((stop) => stop.row + 1));
  // A label near either end is aligned to that end, so it is never cut off.
  const align = (position: number) => (position < 0.12 ? 'start' : position > 0.88 ? 'end' : 'center');
  const name = (kind: PocMilestone['kind']) => (kind === 'today' && day !== null ? t('tl.track.todayDay', { day: String(day) }) : t(MILESTONE_KEY[kind]));
  return (
    <figure className="pvs-track" data-rows={String(rows)} aria-label={t('tl.track.aria', { day: day === null ? '—' : String(day) })}>
      <div className="pvs-track__rail" aria-hidden="true">
        <span className="pvs-track__fill" style={{ width: `${Math.round((today?.position ?? 1) * 100)}%` }} />
      </div>
      <ol className="pvs-track__marks">
        {stops.map((stop) => {
          const kinds = [...stop.kinds].sort((a, b) => MARK_KIND_ORDER.indexOf(a) - MARK_KIND_ORDER.indexOf(b));
          return (
            <li key={stop.day} className="pvs-track__mark" data-kind={kinds[0]} data-row={stop.row > 0 ? String(stop.row) : undefined} data-align={align(stop.position)} style={{ left: `${(stop.position * 100).toFixed(2)}%` }}>
              <span className="pvs-track__dot" aria-hidden="true" />
              <span className="pvs-track__label">
                {kinds.map((kind, index) => (index === 0 ? <strong key={kind}>{name(kind)}</strong> : <span key={kind} className="pvs-track__also">{name(kind)}</span>))}
                <span>{formatDay(stop.day)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
};

interface BaselineProps {
  startDate: string;
  /** The first day read: the start date, or later when it is older than the read window. */
  effectiveStart: string;
  clamped: boolean;
  endDate: string | null;
  day0: CatalogQueryResult;
  today: CatalogQueryResult;
  daily: CatalogQueryResult;
  /** Automation runs and log volume per day (`poc.daily.signals`). */
  signals: CatalogQueryResult;
  /** Real-user actions per day (`poc.daily.rum`). */
  rumDaily: CatalogQueryResult;
}

const ADOPTION: Record<AdoptionId, { labelKey: StringKey; family: SpectrumFamily }> = {
  automation: { labelKey: 'tl.adopt.automation', family: 'pink-purple' },
  logs: { labelKey: 'tl.adopt.logs', family: 'turquoise' },
  experience: { labelKey: 'tl.adopt.experience', family: 'orange' },
};

const CATEGORY_KEY: Record<string, StringKey> = {
  Hosts: 'tl.base.hosts',
  Services: 'tl.base.services',
  'Process instances': 'tl.base.processes',
  'Kubernetes workloads': 'tl.base.workloads',
  'Web applications': 'tl.base.webApps',
  'Synthetic monitors': 'tl.base.synthetic',
};

const PocBaseline = ({ startDate, effectiveStart, clamped, endDate, day0, today, daily, signals, rumDaily }: BaselineProps) => {
  const { t, formatNumber, formatDecimal, formatDay } = useTranslation();
  const factFrom = useSummaryFact();
  const fmt = useChartFormat();
  const day = pocDay(startDate);
  const days = problemDays(daily.records, effectiveStart);
  const weeks = compareWeeks(days);
  const firstAutomation = firstAutomationDay(signals.records, effectiveStart);
  const milestones = pocMilestones(startDate, endDate, days, undefined, firstAutomation);
  const adoption = adoptionSignals(signals.records, rumDaily.records, effectiveStart);
  const perDay = (id: AdoptionId, value: number | null) =>
    value === null ? '—' : id === 'logs' ? formatBytes(value) : value >= 10_000 ? fmt.compact(value) : formatNumber(Math.round(value));
  const deltas = inventoryDeltas(day0.records, today.outcome === 'ok' ? today.records : []);
  const startLabel = formatDay(startDate);
  const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;
  const pct = (value: number | null) => {
    if (value === null) return '—';
    const rounded = Math.round(value);
    return rounded === 0 ? '0%' : `${rounded > 0 ? '+' : '−'}${formatNumber(Math.abs(rounded))}%`;
  };
  const hours = (value: number | null) => (value === null ? '—' : `${formatDecimal(value, value >= 10 ? 0 : 1)} h`);
  const points = days.map((entry) => ({ t: entry.day, v: entry.opened }));

  return (
    <Stack gap="section">
      <Panel as="section" pad="roomy" className="pvs-spec-band" data-spectrum="blue-turquoise">
        <span className="pvs-spec-band__edge" aria-hidden="true" />
        <Stack gap="group">
          <Stack gap="tight">
            <Heading level={3} as="h2">
              {t('tl.track.title')}
            </Heading>
            <Paragraph className="pvs-lead">
              {day === null ? t('tl.track.notStarted') : t('tl.track.lead', { day: formatNumber(day), start: startLabel })}
            </Paragraph>
          </Stack>
          <PocTrack milestones={milestones} day={day} />
          {clamped && <Text className="pvs-caption">{t('tl.track.clamped', { from: formatDay(effectiveStart) })}</Text>}
        </Stack>
      </Panel>

      <Stack as="section" gap="group">
        <Stack gap="tight">
          <Heading level={3} as="h2">
            {t('tl.base.title')}
          </Heading>
          <Paragraph className="pvs-prose pvs-muted">{t('tl.base.body', { day0: startLabel })}</Paragraph>
        </Stack>
        <Grid min={200}>
          {deltas.map((entry) => (
            <KpiHero
              key={entry.category}
              family={entry.delta !== null && entry.delta > 0 ? 'turquoise' : 'blue-turquoise'}
              fact={factFrom(today, entry.today)}
              eyebrow={t(CATEGORY_KEY[entry.category] ?? 'tl.base.hosts')}
              value={entry.today === null ? '—' : formatNumber(entry.today)}
              caption={
                entry.day0 === null
                  ? t('tl.base.noHistory')
                  : t('tl.base.caption', { day0: formatNumber(entry.day0), delta: entry.delta === null ? '—' : signed(entry.delta) })
              }
            />
          ))}
        </Grid>
        <Text className="pvs-caption">{t('tl.base.provenance', { day0: startLabel })}</Text>
      </Stack>

      <Stack as="section" gap="group">
        <Stack gap="tight">
          <Heading level={3} as="h2">
            {t('tl.weeks.title')}
          </Heading>
          <Paragraph className="pvs-prose pvs-muted">
            {weeks === null ? t('tl.weeks.tooEarly') : t('tl.weeks.body', { days: String(weeks.span) })}
          </Paragraph>
        </Stack>
        {weeks !== null && (
          <Grid min={240}>
            <KpiHero
              family="pink-purple"
              fact={factFrom(daily, Math.round(weeks.latest.perDay * 10) / 10, { calculation: t('tl.weeks.perDayCalc', { days: String(weeks.span) }) })}
              eyebrow={t('tl.weeks.perDay')}
              value={formatDecimal(weeks.latest.perDay, 1)}
              caption={t('tl.weeks.perDayCaption', { first: formatDecimal(weeks.first.perDay, 1), change: pct(weeks.perDayChangePct) })}
            />
            <KpiHero
              family="purple"
              fact={factFrom(daily, weeks.latest.mttrHours === null ? null : Math.round(weeks.latest.mttrHours * 10) / 10, { calculation: t('tl.weeks.mttrCalc', { days: String(weeks.span) }) })}
              eyebrow={t('tl.weeks.mttr')}
              value={hours(weeks.latest.mttrHours)}
              caption={t('tl.weeks.mttrCaption', { first: hours(weeks.first.mttrHours), change: pct(weeks.mttrChangePct) })}
            />
          </Grid>
        )}
        {points.length > 1 && (
          <Panel pad="roomy" className="pvs-spec-band">
            <span className="pvs-spec-band__edge" aria-hidden="true" />
            <Stack gap="tight">
              <Heading level={4} as="h3">
                {t('tl.weeks.chart')}
              </Heading>
              <SpectrumArea
                points={points}
                family="pink-purple"
                label={t('tl.weeks.chart')}
                format={(value) => fmt.compact(value)}
                formatTime={fmt.binTime}
                formatTick={fmt.tick(points.length * DAY_MS)}
                height={150}
              />
              <Text className="pvs-caption">{t('tl.weeks.chartCaption', { from: formatDay(effectiveStart) })}</Text>
            </Stack>
          </Panel>
        )}
      </Stack>

      {adoption.length > 0 && (
        <Stack as="section" gap="group">
          <Stack gap="tight">
            <Heading level={3} as="h2">
              {t('tl.adopt.title')}
            </Heading>
            <Paragraph className="pvs-prose pvs-muted">{t('tl.adopt.body')}</Paragraph>
            {firstAutomation !== null && <Text className="pvs-lead">{t('tl.adopt.firstAutomation', { date: formatDay(firstAutomation) })}</Text>}
          </Stack>
          <Grid min={260}>
            {adoption.map((signal) => {
              const look = ADOPTION[signal.id];
              const points = signal.days.map((entry) => ({ t: entry.day, v: entry.v }));
              // Today is partial: the headline is the latest period's mean, or the last complete day.
              const lastComplete = [...signal.days].reverse().find((entry) => !entry.partial)?.v ?? null;
              const change =
                signal.changePct === null ? '—' : `${signal.changePct > 0.5 ? '+' : signal.changePct < -0.5 ? '−' : ''}${formatNumber(Math.abs(Math.round(signal.changePct)))}%`;
              return (
                <Panel key={signal.id} pad="roomy" className="pvs-spec-band" data-spectrum={look.family}>
                  <span className="pvs-spec-band__edge" aria-hidden="true" />
                  <Stack gap="tight">
                    <Heading level={5} as="h3">
                      {t(look.labelKey)}
                    </Heading>
                    <Figure value={perDay(signal.id, signal.latest ?? lastComplete)} unit={t('tl.adopt.perDay')} size="lg" ink="spectrum" />
                    {points.length > 1 && (
                      <SpectrumArea
                        points={points}
                        family={look.family}
                        label={t(look.labelKey)}
                        format={(value) => perDay(signal.id, value)}
                        formatTime={fmt.binTime}
                        formatTick={fmt.tick(points.length * DAY_MS)}
                        height={90}
                      />
                    )}
                    <Text className="pvs-caption">
                      {signal.span === 0
                        ? t('tl.adopt.tooEarly')
                        : t('tl.adopt.caption', { first: perDay(signal.id, signal.first), latest: perDay(signal.id, signal.latest), change })}
                    </Text>
                  </Stack>
                </Panel>
              );
            })}
          </Grid>
          <Text className="pvs-caption">{t('tl.adopt.provenance', { from: formatDay(effectiveStart) })}</Text>
        </Stack>
      )}
    </Stack>
  );
};

