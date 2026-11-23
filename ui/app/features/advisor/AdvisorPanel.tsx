import React from 'react';

import { Chip, MessageContainer } from '@dynatrace/strato-components/content';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CriticalIcon, InformationIcon, SuccessIcon, WarningIcon } from '@dynatrace/strato-icons';

import { pageSizeOptions } from '../../components/CatalogTable';
import type { Tone } from '../../design/palette';
import { Cluster, Grid, Panel, Stack } from '../../engine';
import type { IconComponent } from '../../engine/evidence';
import { ALL_QUERIES } from '../../queries/catalog';
import { analyzeCatalog, resolveMessage, type QueryAnalysis, type Severity } from './analyzeQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation, type Translation } from '../../i18n/useTranslation';

/**
 * Renders the DQL Efficiency Advisor over this app's own catalog.
 *
 * Auditing the tool you are presenting with is a stronger position than auditing
 * only the customer's queries, so the advisor is deliberately pointed inward.
 */

type Verdict = 'excellent' | 'good' | 'needsOpt' | 'critical';

/**
 * A verdict is an icon and a word first; the tone is a redundant fourth channel.
 * Four silhouettes (circle-check, circle-i, triangle, octagon) so the ladder reads
 * in greyscale and for anyone who cannot tell the hues apart.
 */
const VERDICT_META: Record<Verdict, { key: StringKey; tone: Tone; Icon: IconComponent }> = {
  excellent: { key: 'f.dql.verdict.excellent', tone: 'success', Icon: SuccessIcon },
  good: { key: 'f.dql.verdict.good', tone: 'primary', Icon: InformationIcon },
  needsOpt: { key: 'f.dql.verdict.needsOpt', tone: 'warning', Icon: WarningIcon },
  critical: { key: 'f.dql.verdict.critical', tone: 'critical', Icon: CriticalIcon },
};

const VERDICT_ORDER: Record<Verdict, number> = { critical: 0, needsOpt: 1, good: 2, excellent: 3 };

function verdictOf(analysis: QueryAnalysis): Verdict {
  const attention = analysis.observations.filter((o) => o.severity === 'attention').length;
  const advice = analysis.observations.filter((o) => o.severity === 'advice').length;
  if (attention >= 2) return 'critical';
  if (attention === 1) return 'needsOpt';
  if (advice > 0) return 'good';
  return 'excellent';
}

interface AdvisorRow {
  queryId: string;
  check: string;
  severity: Severity;
  finding: string;
  recommendation: string;
}

const severityChip = (severity: Severity, t: Translation['t']) =>
  severity === 'attention' ? (
    <Chip color="warning" variant="accent" size="condensed">
      {t('f.advisor.verdict.look')}
    </Chip>
  ) : severity === 'advice' ? (
    <Chip color="primary" variant="accent" size="condensed">
      {t('f.advisor.verdict.consider')}
    </Chip>
  ) : (
    <Chip color="success" variant="accent" size="condensed">
      {t('f.advisor.verdict.fine')}
    </Chip>
  );

const columns = (t: Translation['t']): DataTableColumnDef<AdvisorRow>[] => [
  { id: 'queryId', header: t('common.query'), accessor: 'queryId', width: '1.2fr' },
  { id: 'check', header: t('f.advisor.h.practice'), accessor: 'check', width: '1.2fr' },
  {
    id: 'severity',
    header: t('f.advisor.h.verdict'),
    accessor: 'severity',
    width: 150,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{severityChip(rowData.severity, t)}</DataTable.DefaultCell>
    ),
  },
  { id: 'finding', header: t('f.advisor.h.finding'), accessor: 'finding', width: '2fr' },
  { id: 'recommendation', header: t('common.recommendation'), accessor: 'recommendation', width: '2fr' },
];

export const AdvisorPanel = () => {
  const { t } = useTranslation();
  // Run on every render, not memoised: the analysis pre-formats its numbers in the active
  // locale, and the observations carry dictionary keys that `t()` resolves right below.
  const analyses = analyzeCatalog(ALL_QUERIES);

  const rows: AdvisorRow[] = analyses.flatMap((analysis) =>
    analysis.observations.map((observation) => ({
      queryId: analysis.queryId,
      check: t(observation.check),
      severity: observation.severity,
      finding: resolveMessage(observation.finding, t),
      recommendation: resolveMessage(observation.recommendation, t),
    })),
  );

  const attention = rows.filter((row) => row.severity === 'attention');
  const zeroCost = analyses.filter((analysis) => !analysis.scansGrail);

  const verdicts = analyses
    .map((analysis) => ({ queryId: analysis.queryId, verdict: verdictOf(analysis) }))
    .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]);

  return (
    <Stack gap="group">
      <Heading level={4} as="h2">
        {t('f.advisor.title')}
      </Heading>
      <Paragraph>{t('f.advisor.body')}</Paragraph>

      <MessageContainer variant={attention.length === 0 ? 'success' : 'primary'}>
        <MessageContainer.Title>
          {t('f.advisor.counts', {
            queries: ALL_QUERIES.length,
            findings: attention.length,
            free: zeroCost.length,
          })}
        </MessageContainer.Title>
        <MessageContainer.Description>
          <Text>{t('f.advisor.freeNote')}</Text>
        </MessageContainer.Description>
      </MessageContainer>

      <Panel pad="roomy">
        <Stack gap="group">
          <Stack gap="tight">
            <Heading level={5} as="h3">
              {t('f.dql.center.title')}
            </Heading>
            <Paragraph>{t('f.dql.center.subtitle')}</Paragraph>
          </Stack>
          <Grid min={210} gap="tight">
            {verdicts.map(({ queryId, verdict }) => {
              const { key, tone, Icon } = VERDICT_META[verdict];
              return (
                // An edge only for a condition worth acting on; the icon and the word say the rest.
                <Panel key={queryId} pad="compact" rail={tone === 'warning' || tone === 'critical'} railTone={tone}>
                  <Cluster justify="between">
                    <Text className="pvs-wrap">{queryId}</Text>
                    <Chip color={tone} variant="accent" size="condensed">
                      <Chip.Prefix>
                        <Icon aria-hidden="true" />
                      </Chip.Prefix>
                      {t(key)}
                    </Chip>
                  </Cluster>
                </Panel>
              );
            })}
          </Grid>
        </Stack>
      </Panel>

      <DataTable
        data={rows}
        columns={columns(t)}
        fullWidth
        lineWrap
        sortable
        aria-label={t('f.advisor.tableAria')}
      >
        <DataTable.Pagination defaultPageSize={15} pageSizeOptions={pageSizeOptions(15)} />
      </DataTable>

      <Text className="pvs-caption">{t('f.advisor.staticNote')}</Text>
    </Stack>
  );
};
