import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';

import { AssistPanel } from '../components/AssistPanel';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { SectionIntro } from '../components/SectionIntro';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { ProblemImpact } from '../features/problems/ProblemImpact';
import { useQueryScope } from '../config/StudioContext';
import { Stack } from '../engine';
import { StratoKpi, StratoKpiRow } from '../engine/strato';
import { useCatalogQuery, type CatalogQueryResult } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { getQuery } from '../queries/catalog';
import { summarisePosture } from '../models/security';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { num, ratio, str } from '../utils/records';
import { absentCaptionKey } from '../utils/absentCaption';
import { ProblemCalendarPanel, ProblemRingsPanel } from '../features/cockpit/aiPanels';
import { ProblemConsole } from '../features/cockpit/ProblemConsole';
import { StatusRows } from '../features/cockpit/StatusRows';
import { ProblemArrivals, ProblemMix } from '../features/cockpit/panels';

/**
 * AI Insights Center.
 *
 * The premium face of Problems & Davis: three posture rings and six executive
 * lenses (Impact · Risk · Savings · Reliability · Performance · Security), each a
 * single live signal Davis produced with no alerting rule written. A lens with
 * no measured signal shows a dash and its reason — never a zero — and causality
 * is only ever what Davis attached, never inferred here.
 */

const PERFORMANCE_CATEGORIES = ['SLOW', 'RESOURCE', 'PERF'];

interface Lens {
  key: string;
  labelKey: StringKey;
  findingKey: StringKey;
  /** The query the lens reads, so its card can say where the number came from. */
  source: CatalogQueryResult;
  /** What was calculated, in words: every lens is arithmetic over measured rows. */
  calcKey: StringKey;
  value: number | null;
  unitKey?: StringKey;
  overrideCaptionKey?: StringKey;
}

export const AiInsightsCenter = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();

  const summary = useCatalogQuery('prob.summary', scope);
  const recurrent = useCatalogQuery('prob.recurrent', scope);
  const recurrentTotal = useCatalogQuery('prob.recurrent.total', scope);
  const security = useCatalogQuery('sec.posture', scope);

  const ok = summary.outcome === 'ok';
  const total = summary.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const open = summary.records
    .filter((record) => str(record, 'event.status') === 'ACTIVE')
    .reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const closed = total - open;

  const performance = summary.records
    .filter((record) => {
      const category = (str(record, 'event.category') ?? '').toUpperCase();
      return PERFORMANCE_CATEGORIES.some((term) => category.includes(term));
    })
    .reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);

  // Counts and volumes come from the aggregate over every recurring pattern, not the 25 listed.
  const recurrentRow = recurrentTotal.records[0];
  const patterns = recurrentTotal.outcome === 'ok' ? num(recurrentRow, 'patterns') : null;
  // Automation candidates: patterns frequent enough to be worth a workflow, not
  // every recurrence. Keeps the Savings lens from mirroring the Risk lens.
  const automationCandidates =
    recurrentTotal.outcome === 'ok' ? num(recurrentRow, 'candidates') : null;

  const closurePct = ok ? ratio(closed, total)?.percent ?? null : null;

  const securityReadable = security.outcome === 'ok';
  const securityCount = securityReadable ? summarisePosture(security.records).total : null;

  const lenses: Lens[] = [
    { key: 'impact', labelKey: 'ai.lens.impact.label', findingKey: 'ai.lens.impact.finding', source: summary, calcKey: 'ai.lens.impact.calc', value: ok ? open : null, unitKey: 'ai.unit.problems' },
    { key: 'risk', labelKey: 'ai.lens.risk.label', findingKey: 'ai.lens.risk.finding', source: recurrentTotal, calcKey: 'ai.lens.risk.calc', value: patterns, unitKey: 'ai.unit.patterns' },
    { key: 'savings', labelKey: 'ai.lens.savings.label', findingKey: 'ai.lens.savings.finding', source: recurrentTotal, calcKey: 'ai.lens.savings.calc', value: automationCandidates, unitKey: 'ai.unit.patterns' },
    { key: 'reliability', labelKey: 'ai.lens.reliability.label', findingKey: 'ai.lens.reliability.finding', source: summary, calcKey: 'ai.lens.reliability.calc', value: closurePct === null ? null : Math.round(closurePct), unitKey: 'ai.unit.percent' },
    { key: 'performance', labelKey: 'ai.lens.performance.label', findingKey: 'ai.lens.performance.finding', source: summary, calcKey: 'ai.lens.performance.calc', value: ok ? performance : null, unitKey: 'ai.unit.problems' },
    {
      key: 'security',
      labelKey: 'ai.lens.security.label',
      findingKey: 'ai.lens.security.finding',
      source: security,
      calcKey: 'ai.lens.security.calc',
      value: securityCount,
      overrideCaptionKey: security.outcome === 'no-permission' ? 'ai.lens.security.permission' : undefined,
    },
  ];

  // Dynatrace Assist: a technical restatement for SRE/DevOps/Cloud teams, built
  // from the measured signals. Each line only appears when its signal exists.
  const categoryTotals = new Map<string, number>();
  for (const record of summary.records) {
    const category = str(record, 'event.category');
    if (category !== null) {
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + (num(record, 'problems') ?? 0));
    }
  }
  const dominantCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topRecurringName = str(recurrent.records[0], 'event.name');
  const topRecurringCount = num(recurrent.records[0], 'occurrences');

  const assist: { key: StringKey; params?: Record<string, string | number> }[] = [];
  if (topRecurringName !== null && topRecurringCount !== null) {
    assist.push({ key: 'assist.s.recurring', params: { name: topRecurringName, count: formatNumber(topRecurringCount) } });
  }
  if (dominantCategory !== null) {
    assist.push({ key: 'assist.s.category', params: { category: dominantCategory } });
  }
  if (closurePct !== null) {
    assist.push({ key: 'assist.s.closure', params: { pct: Math.round(closurePct) } });
  }
  if (ok && open > 0) {
    assist.push({ key: 'assist.s.active', params: { count: formatNumber(open) } });
  }

  const assistSentences = assist.map((statement) => t(statement.key, statement.params));


  /**
   * 3.3.11 (the Discoveries stage on the chart engine): the same 7 days as an area with the
   * window's mean dashed (a derived line, never data), and the problems by category from the
   * aggregate (`prob.summary` counts every problem by category and status — nothing capped is summed).
   */

  return (
    <>
      <SectionIntro
        titleKey="p.prob.title"
        questionKey="p.prob.question"
        takeawayKey="p.prob.takeaway"
      />

      {/* 3.5.3 (visual proposal v4): a long page in tabs at the top, as the Coverage page — the picture, the six
          lenses, when problems arrive, their impact. */}
      <Tabs defaultIndex={0}>
        <Tab title={t('ai.tab.overview')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      {/* 3.3.11: the arrivals beside the Assist, then the rings beside the mix — the Overview's cockpit rows. */}
      <CockpitRow data-testid="ai-cockpit-1">
        <ProblemArrivals />
        {assistSentences.length > 0 && (
          <AssistPanel
            eyebrow={t('assist.eyebrow')}
            title={t('assist.title')}
            sentences={assistSentences}
            note={t('assist.note')}
          />
        )}
      </CockpitRow>

      <CockpitRow data-testid="ai-cockpit-2">
        {/* 3.4.10: one component for the page and the Tech Wrapup's capture. */}
        <ProblemRingsPanel />
        <ProblemMix />
      </CockpitRow>

      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('ai.lens.title')}
          </Heading>
          <Text className="pvs-caption">{t('ai.lens.subtitle')}</Text>
        </Stack>
        {/* 3.4.18: the six lenses on the one KPI anatomy (the platform's SingleValue). */}
        <StratoKpiRow min={220} testId="ai-lenses">
          {lenses.map((lens) => (
            <StratoKpi
              key={lens.key}
              testId={`ai-lens-${lens.key}`}
              label={t(lens.labelKey)}
              fact={factFrom(lens.source, lens.value, { calculation: t(lens.calcKey) })}
              value={lens.value}
              formatter={(value) => formatNumber(value)}
              unit={lens.unitKey ? t(lens.unitKey) : undefined}
              caption={
                lens.overrideCaptionKey
                  ? t(lens.overrideCaptionKey)
                  : lens.value === null
                    ? t(absentCaptionKey(lens.source.outcome))
                    : t(lens.findingKey)
              }
            />
          ))}
        </StratoKpiRow>
      </Stack>
      {/* 3.6.4 (v6): the status rows — each category, one bar per 3-hour slot of the week. */}
      <StatusRows />
      {/* 3.6.0 (v6): the most recent problems as console lines. */}
      <ProblemConsole />
          </Stack>
        </Tab>
        <Tab title={t('ai.tab.when')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
            <ProblemCalendarPanel />
          </Stack>
        </Tab>
        <Tab title={t('ai.tab.impact')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
            <ProblemImpact hideActiveCount />
          </Stack>
        </Tab>
      </Tabs>

      <DqlDisclosure
        entries={[getQuery('prob.summary'), getQuery('prob.timeline'), getQuery('prob.recurrent.total'), getQuery('prob.recurrent')]}
      />
    </>
  );
};
