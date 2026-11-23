import React from 'react';

import { Chip, ProgressCircle } from '@dynatrace/strato-components/content';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Link, Text } from '@dynatrace/strato-components/typography';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { ActionPlan } from '../features/opportunities/ActionPlan';

import { SectionIntro } from '../components/SectionIntro';
import { useCommercialVisible } from '../components/SeOnly';
import { forAudience } from '../features/insights/audience';
import { Callout, Cluster, Panel, Stack } from '../engine';
import { ImpactEffortMatrix } from '../engine/chart/ImpactEffortMatrix';
import {
  CATEGORY_KEY,
  deriveInsights,
  prioritise,
  type Insight,
  type Qualitative,
} from '../features/insights/deriveInsights';
import { useInsightSignals } from '../hooks/useInsightSignals';
import type { StringKey } from '../i18n/strings';
import { useTranslation, type Translation } from '../i18n/useTranslation';

/**
 * Improvement opportunities.
 *
 * Every row is generated from a live signal. If a signal is absent, no row
 * appears - the page does not pad itself with generic advice.
 */

/** The dictionary key for a qualitative level, so the chip never prints a raw English word. */
const qualKey = (value: Qualitative): StringKey =>
  value === 'high' ? 'qual.high' : value === 'medium' ? 'qual.medium' : 'qual.low';

const qualitativeChip = (value: Qualitative, t: Translation['t'], invert = false) => {
  const color =
    value === 'high' ? (invert ? 'warning' : 'success') : value === 'medium' ? 'primary' : 'neutral';
  return (
    <Chip color={color} variant="accent" size="condensed">
      {t(qualKey(value))}
    </Chip>
  );
};

type RankedInsight = Insight & { rank: number };

const columns = (t: Translation['t']): DataTableColumnDef<RankedInsight>[] => [
  // 3.3.20: the number the impact × effort matrix shows for this row.
  { id: 'rank', header: '#', accessor: 'rank', width: 56, minWidth: 48, alignment: 'right' },
  { id: 'title', header: t('p.opp.h.opportunity'), accessor: 'title', width: '2fr', minWidth: 200 },
  {
    id: 'category',
    header: t('common.category'),
    accessor: 'category',
    width: 150,
    minWidth: 130,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{t(CATEGORY_KEY[rowData.category])}</DataTable.DefaultCell>
    ),
  },
  { id: 'observation', header: t('p.opp.h.measured'), accessor: 'observation', width: '2.4fr', minWidth: 240 },
  { id: 'subject', header: t('p.opp.h.subject'), accessor: 'subject', width: '1.2fr', minWidth: 140 },
  { id: 'consequence', header: t('p.opp.h.consequence'), accessor: 'consequence', width: '2fr', minWidth: 220 },
  { id: 'recommendation', header: t('common.recommendation'), accessor: 'recommendation', width: '2.4fr', minWidth: 240 },
  {
    id: 'impact',
    header: t('p.opp.h.impact'),
    accessor: 'impact',
    width: 120,
    minWidth: 110,
    cell: ({ rowData }) => <DataTable.DefaultCell>{qualitativeChip(rowData.impact, t)}</DataTable.DefaultCell>,
  },
  {
    id: 'effort',
    header: t('p.opp.h.effort'),
    accessor: 'effort',
    width: 120,
    minWidth: 110,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{qualitativeChip(rowData.effort, t, true)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'confidence',
    header: t('common.confidence'),
    accessor: 'confidence',
    width: 130,
    minWidth: 110,
    // Sorts on the stored level; only the words shown are translated.
    cell: ({ rowData }) => <DataTable.DefaultCell>{t(qualKey(rowData.confidence))}</DataTable.DefaultCell>,
  },
  { id: 'dependencies', header: t('p.opp.h.dependencies'), accessor: 'dependencies', width: '2fr', minWidth: 200 },
  {
    id: 'evidence',
    header: t('common.evidence'),
    accessor: (row) => row.evidence.join(', '),
    width: '1.2fr',
    minWidth: 160,
  },
  {
    id: 'drilldown',
    header: t('p.opp.h.drillDown'),
    accessor: 'drilldown',
    width: 150,
    minWidth: 130,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        <Link as={RouterLink} to={rowData.drilldown}>
          {t('p.opp.openSection')}
        </Link>
      </DataTable.DefaultCell>
    ),
  },
];

export const ImprovementOpportunities = () => {
  const { t, tCount, formatNumber } = useTranslation();
  const { signals, isLoading, unavailable } = useInsightSignals();
  const commercialVisible = useCommercialVisible();
  const insights = forAudience(prioritise(deriveInsights(signals, { t, formatNumber })), commercialVisible);
  const ranked: RankedInsight[] = insights.map((insight, index) => ({ ...insight, rank: index + 1 }));
  // 3.7.9: the 30-60-90 action plan (the Roadmap page until 3.7.8) is this page's second tab; `/roadmap` opens it.
  const { search } = useLocation();
  const planFirst = new URLSearchParams(search).get('tab') === 'plan';

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.opp.title"
        questionKey="p.opp.question"
        takeawayKey="p.opp.takeaway"
      />

      {/* 3.4.3: the full reading (coverage, maturity, SRE, every finding) is the Assessment's; this page is the shortlist to discuss. */}
      <Text className="pvs-caption" data-testid="opp-assessment-link">
        {t('xref.toAssessment.opportunities')}{' '}
        <Link as={RouterLink} to="/coverage">
          {t('xref.openAssessment')}
        </Link>
      </Text>

      {/* What this page deliberately does not claim: a statement about the review itself. */}
      <Callout kind="limitation" title={t('p.opp.noClaimsTitle')}>
        {t('p.opp.noClaimsBody')}
      </Callout>

      {/* Sources this synthesis could not read: a limit of the review, not a fault in the estate. */}
      {unavailable.length > 0 && (
        <Callout kind="limitation" title={t('p.opp.incompleteTitle')}>
          {t('p.opp.incompleteLine', {
            count: unavailable.length,
            list: unavailable.join(', '),
          })}
        </Callout>
      )}

      <Tabs defaultIndex={planFirst ? 1 : 0}>
        <Tab title={t('p.opp.tab.list')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
            {isLoading ? (
              <Cluster justify="center" gap="tight">
                <ProgressCircle aria-label={t('p.opp.derivingAria')} />
                <Text>{t('p.opp.deriving')}</Text>
              </Cluster>
            ) : insights.length === 0 ? (
              <Callout kind="note" title={t('p.opp.noneTitle')}>
                {t('p.opp.noneBody')}
              </Callout>
            ) : (
              <Stack as="section" gap="group">
                <Heading level={4} as="h2">
                  {tCount('p.opp.count', insights.length, { count: insights.length })}
                </Heading>
                {/* Twelve columns of free text cannot be squeezed into the canvas: each has a
                    minimum width, and the table scrolls inside its own region instead of
                    rendering one character per line. */}
                {/* 3.3.20 (Opportunities on the chart engine): where to act first, before the detail. */}
                <Panel pad="roomy">
                  <Stack gap="group">
                    <Heading level={4} as="h3">
                      {t('opp.matrix.title')}
                    </Heading>
                    <Text className="pvs-caption">{t('opp.matrix.caption')}</Text>
                    <ImpactEffortMatrix
                      items={ranked.map((insight) => ({ key: insight.id, rank: insight.rank, title: insight.title, impact: insight.impact, effort: insight.effort }))}
                      labels={{
                        impact: t('roadmap.impact'),
                        effort: t('roadmap.effort'),
                        level: { high: t('qual.high'), medium: t('qual.medium'), low: t('qual.low') },
                        quickWins: t('opp.matrix.quickWins'),
                      }}
                      caption={t('opp.matrix.title')}
                    />
                  </Stack>
                </Panel>
                <DataTable
                  data={ranked}
                  columns={columns(t)}
                  fullWidth
                  lineWrap
                  sortable
                  aria-label={t('p.opp.tableAria')}
                >
                  <DataTable.Pagination defaultPageSize={10} />
                </DataTable>
              </Stack>
            )}
          </Stack>
        </Tab>
        <Tab title={t('p.opp.tab.plan')} keepMounted>
          <div className="pvs-tabpane">
            <ActionPlan insights={insights} isLoading={isLoading} unavailable={unavailable} />
          </div>
        </Tab>
      </Tabs>
    </Stack>
  );
};
