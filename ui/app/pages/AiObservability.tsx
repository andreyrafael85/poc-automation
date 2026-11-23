import React from 'react';

import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { AIModelIcon, ExternalLinkIcon } from '@dynatrace/strato-icons';

import { ChartFrame } from '../components/ChartFrame';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { SectionIntro } from '../components/SectionIntro';
import { TrendChart } from '../components/TrendChart';
import { BarList } from '../components/viz/BarList';
import { useQueryScope } from '../config/StudioContext';
import { Callout, Panel, Stack } from '../engine';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { StratoDonut } from '../engine/strato/StratoDonut';
import { StratoTicks } from '../engine/strato/StratoTicks';
import type { StringKey } from '../i18n/strings';
import './aiObservability.css';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import { aiCallRows, aiCallTotals, aiModelCards, aiTokenRows, aiTotals, tokensByModel, tokensByService, type AiCallRow, type AiTokenRow } from '../models/aiObservability';
import { seriesOf } from '../models/series';
import { getQuery } from '../queries/catalog';
import { platformUrl } from '../utils/deepLinks';

/**
 * 3.7.7 — AI Observability (the owner approved the 3.7.6 proposal): the generative-AI apps of the environment as their
 * OpenTelemetry GenAI metrics report them — tokens in and out, by service and model, over time; the calls and their time.
 * Metrics only (0 B). Tokens, never money (rule 6): a price per token belongs to Licensing, and this page is shown to the
 * customer. Agents and tools live in the traces (`gen_ai.agent.name`, `gen_ai.tool.name`), which the app does not read — the
 * platform's AI Observability app shows them.
 */

export const GENAI_APP_LINK = platformUrl('dynatrace.genai.observability/') ?? '';

const tokenColumns = (t: Translation['t'], formatNumber: (value: number) => string): DataTableColumnDef<AiTokenRow>[] => [
  { id: 'service', header: t('p.ai.h.service'), accessor: 'service', width: '1.3fr' },
  { id: 'model', header: t('p.ai.h.model'), accessor: (row) => row.model ?? t('p.ai.modelNone'), width: '1.3fr' },
  {
    id: 'input',
    header: t('p.ai.h.input'),
    accessor: 'input',
    alignment: 'right',
    width: 160,
    cell: ({ rowData }) => <DataTable.DefaultCell>{formatNumber(rowData.input)}</DataTable.DefaultCell>,
  },
  {
    id: 'output',
    header: t('p.ai.h.output'),
    accessor: 'output',
    alignment: 'right',
    width: 160,
    cell: ({ rowData }) => <DataTable.DefaultCell>{formatNumber(rowData.output)}</DataTable.DefaultCell>,
  },
];

const callColumns = (t: Translation['t'], formatNumber: Translation['formatNumber']): DataTableColumnDef<AiCallRow>[] => [
  { id: 'service', header: t('p.ai.h.service'), accessor: 'service', width: '1.2fr' },
  { id: 'model', header: t('p.ai.h.model'), accessor: (row) => row.model ?? t('p.ai.modelNone'), width: '1.2fr' },
  { id: 'error', header: t('p.ai.h.outcome'), accessor: (row) => row.error ?? t('p.ai.noError'), width: '1fr' },
  {
    id: 'calls',
    header: t('p.ai.h.calls'),
    accessor: 'calls',
    alignment: 'right',
    width: 120,
    cell: ({ rowData }) => <DataTable.DefaultCell>{formatNumber(rowData.calls)}</DataTable.DefaultCell>,
  },
  {
    id: 'avg',
    header: t('p.ai.h.avg'),
    accessor: (row) => row.avgSeconds ?? -1,
    alignment: 'right',
    width: 140,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{rowData.avgSeconds === null ? '—' : t('p.ai.seconds', { n: formatNumber(rowData.avgSeconds, { maximumFractionDigits: 2 }) })}</DataTable.DefaultCell>
    ),
  },
];

export const AiObservability = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const tokens = useCatalogQuery('ai.tokens', scope);
  const calls = useCatalogQuery('ai.calls', scope);
  const factFrom = useSummaryFact();

  const rows = aiTokenRows(tokens.records);
  const totals = aiTotals(rows);
  const byModel = tokensByModel(rows);
  const byService = tokensByService(rows);
  const callRows = aiCallRows(calls.records);
  const callTotals = aiCallTotals(callRows);
  const cards = aiModelCards(rows, callRows);
  const read = tokens.outcome === 'ok';
  const callsRead = calls.outcome === 'ok';
  const none = read && rows.length === 0;
  const compact = (value: number) => formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 });
  // Output tokens per thousand sent: how much the models write back for what they are given.
  const ratio = totals.input > 0 ? (1000 * totals.output) / totals.input : null;
  const errorPct = callTotals.calls > 0 ? (100 * callTotals.failed) / callTotals.calls : null;

  // 3.7.8 (the owner: "bem diferente das demais da v6 … poucas informações ricas"): six figures, as the other Evidence pages.
  const headline: SummaryItem[] = [
    { key: 'input', label: t('p.ai.band.input'), fact: factFrom(tokens, read ? totals.input : null), display: read ? compact(totals.input) : undefined, detail: t('p.ai.band.inputDetail') },
    { key: 'output', label: t('p.ai.band.output'), fact: factFrom(tokens, read ? totals.output : null), display: read ? compact(totals.output) : undefined, detail: t('p.ai.band.outputDetail') },
    {
      key: 'ratio',
      label: t('p.ai.band.ratio'),
      fact: factFrom(tokens, read ? ratio : null, { calculation: t('p.ai.band.ratioCalc') }),
      display: ratio === null ? undefined : formatNumber(ratio, { maximumFractionDigits: 0 }),
      detail: t('p.ai.band.ratioDetail'),
    },
    { key: 'services', label: t('p.ai.band.services'), fact: factFrom(tokens, read ? totals.services : null), display: read ? formatNumber(totals.services) : undefined, detail: t('p.ai.band.models', { n: formatNumber(totals.models) }) },
    {
      key: 'calls',
      label: t('p.ai.band.calls'),
      fact: factFrom(calls, callsRead ? callTotals.calls : null),
      display: callsRead ? compact(callTotals.calls) : undefined,
      detail: callTotals.meanSeconds === null ? t('p.ai.band.callsNone') : t('p.ai.band.meanTime', { s: formatNumber(callTotals.meanSeconds, { maximumFractionDigits: 2 }) }),
    },
    {
      key: 'errors',
      label: t('p.ai.band.errors'),
      fact: factFrom(calls, callsRead ? errorPct : null, { calculation: t('p.ai.band.errorsCalc') }),
      display: errorPct === null ? undefined : `${formatNumber(errorPct, { maximumFractionDigits: 2 })}%`,
      detail: t('p.ai.band.errorsDetail', { n: formatNumber(callTotals.failed) }),
    },
  ];

  return (
    <Stack gap="section" data-testid="ai-observability">
      <SectionIntro titleKey="p.ai.title" questionKey="p.ai.question" takeawayKey="p.ai.takeaway" />

      <PageSummary items={headline} footnote={t('p.ai.band.footnote')} />

      {none && (
        <Callout kind="note" title={t('p.ai.none.title')}>
          {t('p.ai.none.body')}
        </Callout>
      )}

      {!none && (
        <CockpitRow data-testid="ai-cockpit" split="even">
          <Panel as="section" pad="roomy">
            <Stack gap="group">
              <Heading level={3} as="h2">
                {t('p.ai.trend.title')}
              </Heading>
              <TrendChart
                queryId="ai.tokens.trend"
                minWidth={360}
                height={140}
                series={(['input', 'output'] as const).map((kind) => ({
                  key: kind,
                  title: t(kind === 'input' ? 'p.ai.trend.input' : 'p.ai.trend.output'),
                  family: kind === 'input' ? ('blue-turquoise' as const) : ('purple' as const),
                  headline: 'sum' as const,
                  read: (records) => seriesOf(records.find((record) => record['gen_ai.token.type'] === kind), 'tokens'),
                  format: (value: number) => formatNumber(value),
                }))}
              />
            </Stack>
          </Panel>
          <Stack gap="section">
            {byModel.length > 0 && (
              <ChartFrame role="magnitude" title={t('p.ai.byModel.title')} caption={t('p.ai.byModel.caption')} provenance={tokens.provenance} evidence={tokens.evidence}>
                <BarList
                  role="magnitude"
                  ariaLabel={t('p.ai.byModel.title')}
                  items={byModel.slice(0, 8).map((row, index) => ({ key: `${row.model ?? 'none'}-${index}`, label: row.model ?? t('p.ai.modelNone'), value: row.tokens, display: compact(row.tokens) }))}
                />
              </ChartFrame>
            )}
            {byService.length > 0 && (
              <ChartFrame role="category" title={t('p.ai.byService.title')} caption={t('p.ai.byService.caption')} provenance={tokens.provenance} evidence={tokens.evidence}>
                <StratoDonut
                  slices={byService.slice(0, 6).map((row) => ({ label: row.service, value: row.tokens, display: compact(row.tokens) }))}
                  centerValue={compact(totals.input + totals.output)}
                  centerLabel={t('p.ai.byService.center')}
                  height={180}
                  formatter={compact}
                  ariaLabel={t('p.ai.byService.title')}
                />
              </ChartFrame>
            )}
          </Stack>
        </CockpitRow>
      )}

      {cards.length > 0 && (
        <Stack as="section" gap="group" data-testid="ai-models">
          <Heading level={3} as="h2">
            {t('p.ai.models.title')}
          </Heading>
          <Paragraph className="pvs-caption">{t('p.ai.models.caption')}</Paragraph>
          <div className="pvs-aimodels">
            {cards.map((card) => (
              <Panel key={card.model ?? 'none'} as="article" pad="roomy" className="pvs-aimodel">
                <Stack gap="tight">
                  <span className="pvs-aimodel__head">
                    <AIModelIcon />
                    <Text className="pvs-aimodel__name">{card.model ?? t('p.ai.modelNone')}</Text>
                  </span>
                  <Text className="pvs-aimodel__figure">{compact(card.input + card.output)}</Text>
                  <Text className="pvs-caption">{t('p.ai.models.tokens', { input: compact(card.input), output: compact(card.output) })}</Text>
                  <StratoTicks
                    value={card.share}
                    max={100}
                    ticks={20}
                    name={t('p.ai.models.shareName')}
                    reading={t('p.ai.models.share', { pct: formatNumber(card.share, { maximumFractionDigits: 1 }) })}
                  />
                  <Text className="pvs-caption">{t('p.ai.models.share', { pct: formatNumber(card.share, { maximumFractionDigits: 1 }) })}</Text>
                  <dl className="pvs-aimodel__facts">
                    <dt>{t('p.ai.h.calls')}</dt>
                    <dd>{card.calls === null ? '—' : formatNumber(card.calls)}</dd>
                    <dt>{t('p.ai.h.avg')}</dt>
                    <dd>{card.meanSeconds === null ? '—' : t('p.ai.seconds', { n: formatNumber(card.meanSeconds, { maximumFractionDigits: 2 }) })}</dd>
                    <dt>{t('p.ai.models.errors')}</dt>
                    <dd>{card.calls === null ? '—' : formatNumber(card.failed)}</dd>
                  </dl>
                  <Text className="pvs-caption">{t('p.ai.models.services', { list: card.services.join(', ') })}</Text>
                </Stack>
              </Panel>
            ))}
          </div>
        </Stack>
      )}

      {(rows.length > 0 || callRows.length > 0) && (
        <Stack gap="section" data-testid="ai-tables">
          {rows.length > 0 && (
            <Panel as="section" pad="roomy">
              <Stack gap="group">
                <Heading level={3} as="h2">
                  {t('p.ai.table.title')}
                </Heading>
                <Paragraph className="pvs-caption">{t('p.ai.table.caption')}</Paragraph>
                <DataTable data={rows} columns={tokenColumns(t, compact)} sortable fullWidth />
              </Stack>
            </Panel>
          )}
          {callRows.length > 0 && (
            <Panel as="section" pad="roomy">
              <Stack gap="group">
                <Heading level={3} as="h2">
                  {t('p.ai.calls.title')}
                </Heading>
                <Paragraph className="pvs-caption">{t('p.ai.calls.caption')}</Paragraph>
                <DataTable data={callRows} columns={callColumns(t, formatNumber)} sortable fullWidth />
              </Stack>
            </Panel>
          )}
        </Stack>
      )}

      <Panel as="section" pad="roomy" className="pvs-aideeper">
        <Stack gap="group">
          <Heading level={3} as="h2">
            {t('p.ai.deeper.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('p.ai.deeper.body')}</Paragraph>
          <ol className="pvs-aideeper__steps" data-own-numbers>
            {(['instrument', 'trace', 'govern'] as const).map((step, index) => (
              <li key={step}>
                <span className="pvs-aideeper__n" aria-hidden="true">
                  {formatNumber(index + 1)}
                </span>
                <span>
                  <Text className="pvs-aideeper__title">{t(`p.ai.deeper.${step}.title` as StringKey)}</Text>
                  <Text className="pvs-caption">{t(`p.ai.deeper.${step}.body` as StringKey)}</Text>
                </span>
              </li>
            ))}
          </ol>
          {GENAI_APP_LINK !== '' && (
            <div>
              <Link href={GENAI_APP_LINK} target="_blank" rel="noopener noreferrer" data-testid="ai-open-app">
                {t('p.ai.deeper.open')} <ExternalLinkIcon />
              </Link>
            </div>
          )}
        </Stack>
      </Panel>

      <DqlDisclosure entries={[getQuery('ai.tokens'), getQuery('ai.tokens.trend'), getQuery('ai.calls')]} />
    </Stack>
  );
};
