import React, { useState } from 'react';

import { Chip, CodeSnippet } from '@dynatrace/strato-components/content';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { Code, ExternalLink, Heading, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { CheckmarkIcon, WarningIcon } from '@dynatrace/strato-icons';

import { Button } from '@dynatrace/strato-components/buttons';
import { BarList } from '../components/viz/BarList';
import { RankedBars } from '../engine/chart/RankedBars';
import { statusAgainst } from '../engine/chart/status';
import { ShareBar } from '../components/viz/ShareBar';
import { ValueCard } from '../components/viz/ValueCard';
import { AssistPanel } from '../components/AssistPanel';
import { SectionIntro } from '../components/SectionIntro';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { Callout, Cluster, EVIDENCE, Figure, Grid, Panel, Stack } from '../engine';
import '../engine/page-b.css';
import { assumed } from '../config/assumptions';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { getQuery } from '../queries/catalog';
import {
  summariseRca,
  parseRcaNarrative,
  buildProblemLink,
  buildLogsLink,
  type RcaIncident,
  type RcaNarrativeBlock,
} from '../models/rca';
import { useIncidentErrorLogs } from '../hooks/useIncidentErrorLogs';
import { RcaAffectedTable, RcaPropagation } from '../features/rca/RcaPropagation';
import { RcaPropagationGraph } from '../features/rca/RcaPropagationGraph';
import { summariseRum } from '../models/rum';
import { formatNanos } from '../utils/time';
import { uiAppsBase } from '../utils/deepLinks';
import { useTranslation } from '../i18n/useTranslation';
import { decimal } from '../utils/activeLocale';
import { IncidentStories } from '../features/rca/IncidentStories';
import { incidentStories } from '../models/incidentStories';
import { problemCategoryLabel } from '../features/problems/categoryLabel';
import { IntelligenceMark } from '../components/IntelligenceMark';
import { num, str } from '../utils/records';

/**
 * Problems & RCA — AIOps.
 *
 * A single, deeply-detailed root-cause story: the most impactful problem
 * Dynatrace Intelligence analysed in the window, with its root-cause entity, the
 * affected/related entity trail, the Kubernetes blast radius, the analysis
 * narrative verbatim, the corroborating error logs and a link that proves the
 * problem exists. Everything is measured from `dt.davis.problems`; the selection
 * rule is deterministic, so the page tells the same kind of story on any tenant.
 */

const WINDOW_DAYS = assumed('windows.problemsDays');


/** The problem status as a chip: an active problem is a measured condition; a closed one is not. */
const StatusChip = ({ status }: { status: string }) => {
  const active = status === 'ACTIVE';
  const closed = status === 'CLOSED';
  return (
    <Chip color={active ? 'critical' : 'neutral'} variant="emphasized" size="condensed">
      {(active || closed) && (
        <Chip.Prefix>{active ? <WarningIcon aria-hidden="true" /> : <CheckmarkIcon aria-hidden="true" />}</Chip.Prefix>
      )}
      {status}
    </Chip>
  );
};

interface SectionPanelProps {
  title: string;
  subtitle?: string;
  /** Content Dynatrace Intelligence produced (its problem explanation): carries the AI mark (3.4.16). */
  ai?: boolean;
  children: React.ReactNode;
}

/** A titled card: a level-2 heading, one line saying what it shows, then the content. */
const SectionPanel = ({ title, subtitle, ai = false, children }: SectionPanelProps) => (
  <Panel pad="roomy">
    <Stack gap="group">
      <Stack gap="tight">
        <Heading level={4} as="h2">
          {title}
        </Heading>
        {/* 3.4.16 (D-21): content Dynatrace Intelligence produced carries its mark; the app's own advice never does. */}
        {ai && (
          <div>
            <IntelligenceMark />
          </div>
        )}
        {subtitle !== undefined && <Text className="pvs-caption">{subtitle}</Text>}
      </Stack>
      {children}
    </Stack>
  </Panel>
);

/** A real-user figure: its label, then the number (or a dash and why it is missing). */
const RumStat = ({
  label,
  value,
  unit,
  missing = false,
  missingLabel,
}: {
  label: string;
  value: string;
  unit?: string;
  missing?: boolean;
  missingLabel: string;
}) => (
  <Panel pad="compact" evidence={missing ? 'no-telemetry' : undefined}>
    <Stack gap="tight">
      <Text className="pvs-label">{label}</Text>
      <Figure value={value} unit={unit} size="md" missing={missing} missingLabel={missingLabel} />
    </Stack>
  </Panel>
);

type NarrativeGroup =
  | { kind: 'heading' | 'label' | 'text' | 'code'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

/** Consecutive bullets become one list, so a screen reader announces "list of 3 items". */
function groupNarrative(blocks: readonly RcaNarrativeBlock[]): NarrativeGroup[] {
  const groups: NarrativeGroup[] = [];
  for (const block of blocks) {
    if (block.kind === 'bullet') {
      const last = groups[groups.length - 1];
      if (last !== undefined && last.kind === 'bullets') last.items.push(block.text);
      else groups.push({ kind: 'bullets', items: [block.text] });
    } else if (block.kind === 'table') {
      groups.push(block);
    } else {
      groups.push({ kind: block.kind, text: block.text });
    }
  }
  return groups;
}

/** Draws inline `code` spans as code, leaving the rest as text. Never injects markup. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? <Code key={index}>{part.slice(1, -1)}</Code> : part,
  );
}

const RECOMMENDATION_COLUMNS = [
  { title: 'p.rca.rec.detect.title', items: ['p.rca.rec.detect.baseline', 'p.rca.rec.detect.lowload', 'p.rca.rec.detect.slo'] },
  { title: 'p.rca.rec.fix.title', items: ['p.rca.rec.fix.rootcause', 'p.rca.rec.fix.timeouts', 'p.rca.rec.fix.probe'] },
  { title: 'p.rca.rec.res.title', items: ['p.rca.rec.res.autoscale', 'p.rca.rec.res.workflow', 'p.rca.rec.res.trace'] },
] as const;

/** How many blocks of the Davis explanation show before "see the full explanation" (3.3.9). */
const RCA_STORY_OPENING = 6;

export const ProblemsRca = () => {
  const scope = useQueryScope();
  const { pocPlan } = useStudio();
  // 3.3.9: the Davis explanation opens on its first blocks; the rest is one click away.
  const [fullStory, setFullStory] = useState(false);
  const { t, tCount, formatNumber, locale } = useTranslation();
  const factFrom = useSummaryFact();

  const top = useCatalogQuery('rca.top', scope);
  const kpi = useCatalogQuery('rca.kpi', scope);
  const logs = useCatalogQuery('rca.logs', scope);
  const trend = useCatalogQuery('rca.trend', scope);
  const catmix = useCatalogQuery('rca.catmix', scope);
  const mttx = useCatalogQuery('prob.mttx', scope);
  const rumScore = useCatalogQuery('rum.scorecard', scope);
  const rumVitals = useCatalogQuery('rum.webvitals', scope);

  // Q7 (3.2.3): the trend's first and last daily bins are partial (the window starts mid-day and
  // today is still running); only complete days feed the sparklines.
  const rca = summariseRca(top.records, kpi.records, logs.records, WINDOW_DAYS, trend.records, [], catmix.records, {
    trendWindow: { startMs: Date.parse(trend.timeframe.startIso), endMs: Date.parse(trend.timeframe.endIso) },
  });
  const incident = rca.incident;
  const incidentLogs = useIncidentErrorLogs(incident, scope.refreshToken);
  const rum = summariseRum(rumScore.records, rumVitals.records);
  const touchesUsers = incident !== null && incident.impactLevels.some((level) => /appl|user|front|experience/i.test(level));

  const problemLink = buildProblemLink(incident?.eventId ?? null, incident?.displayId ?? null, WINDOW_DAYS);
  const problemUrl = problemLink === null ? null : `${uiAppsBase()}${problemLink}`;
  const logsLink = buildLogsLink(incident);
  const logsUrl = logsLink === null ? problemUrl : `${uiAppsBase()}${logsLink}`;

  const durationLabel = incident === null ? '—' : formatNanos(incident.durationNs);
  const avgAffected = rca.kpi.avgAffected;

  // -------------------------------------------------- Dynatrace Assist (technical)
  const assist: string[] = [];
  if (incident !== null) {
    if (incident.rootCauseName !== null)
      assist.push(t('p.rca.assist.s.rootCause', { rc: incident.rootCauseName, count: formatNumber(incident.affectedCount) }));
    if (incident.namespaces.length > 0)
      assist.push(
        t('p.rca.assist.s.k8s', {
          ns: incident.namespaces.join(', '),
          cluster: incident.clusters.join(', ') || t('p.rca.na'),
        }),
      );
    // `rca.logs` reads the last 6 hours (3.2.3), not the incident's own window: the sentence says so.
    const matchingLog = rca.logs.find((row) => row.matchesIncident && row.errors > 0);
    if (matchingLog !== undefined)
      assist.push(t('p.rca.assist.s.logsRecent', { errors: formatNumber(matchingLog.errors), ns: matchingLog.namespace }));
    if (rca.kpi.active !== null && rca.kpi.active > 0)
      assist.push(t('p.rca.assist.s.active', { count: formatNumber(rca.kpi.active) }));
  }

  const catLabel = (category: string): string => problemCategoryLabel(category, t);

  const others = rca.others;
  const RecommendationIcon = EVIDENCE.recommendation.Icon;

  // Median and p90 resolution time per category, from `prob.mttx` (closed problems, 7 days).
  const mttrRows =
    mttx.outcome === 'ok'
      ? mttx.records
          .map((record) => ({
            category: str(record, 'event.category') ?? '—',
            problems: num(record, 'problems') ?? 0,
            medianNs: num(record, 'medianNs'),
            p90Ns: num(record, 'p90Ns'),
          }))
          .filter((row): row is { category: string; problems: number; medianNs: number; p90Ns: number | null } => row.medianNs !== null)
          .sort((a, b) => b.medianNs - a.medianNs)
      : [];

  // 3.3.8: the PoC's MTTR criterion (Settings → PoC plan), when there is one, is the line the
  // per-category medians are read against; without one the bars stay plain — no invented line.
  const mttrCriterion = pocPlan.criteria.find((criterion) => criterion.metric === 'problems.mttr' && criterion.operator === '<=' && criterion.target !== null);
  const mttrLineNs = mttrCriterion?.target == null ? null : mttrCriterion.target * 3_600_000_000_000;

  const mixSegments = rca.categoryMix.map((row) => ({
    key: row.category,
    label: catLabel(row.category),
    value: row.count,
    display: formatNumber(row.count),
  }));

  return (
    <>
      <SectionIntro titleKey="p.rca.sec.title" questionKey="p.rca.question" takeawayKey="p.rca.takeaway" />

      {!rca.hasData || incident === null ? (
        // "No incident in 15 days" is a finding only if the source actually answered. While
        // the query runs, or after it was refused or failed, say that instead.
        top.outcome === 'loading' || top.outcome === 'error' || top.outcome === 'no-permission' ? (
          <QueryStateBoundary result={top}>{null}</QueryStateBoundary>
        ) : (
          <Panel evidence="no-telemetry" pad="roomy">
            <Stack gap="tight">
              <Heading level={4} as="h2">
                {t('p.rca.empty.title')}
              </Heading>
              <Text>{t('p.rca.empty.body', { days: String(WINDOW_DAYS) })}</Text>
            </Stack>
          </Panel>
        )
      ) : (
        <>
          {/* Environment KPIs over the window */}
          <Grid min={190}>
            <ValueCard family="pink-purple" fact={factFrom(kpi, rca.kpi.total)} eyebrow={t('p.rca.kpi.total')} value={rca.kpi.total === null ? '—' : formatNumber(rca.kpi.total)} caption={t('p.rca.kpi.totalCaption', { days: String(WINDOW_DAYS) })} sparkline={rca.trend.opened} sparklineLabel={t('p.rca.kpi.sparkDays', { metric: t('p.rca.kpi.total') })} />
            <ValueCard family="turquoise" fact={factFrom(kpi, rca.kpi.rootCaused)} eyebrow={t('p.rca.kpi.rootCaused')} value={rca.kpi.rootCaused === null ? '—' : formatNumber(rca.kpi.rootCaused)} caption={t('p.rca.kpi.rootCausedCaption')} sparkline={rca.trend.rootCaused} sparklineLabel={t('p.rca.kpi.sparkDays', { metric: t('p.rca.kpi.rootCaused') })} />
            <ValueCard family="orange" fact={factFrom(kpi, rca.kpi.active)} eyebrow={t('p.rca.kpi.active')} value={rca.kpi.active === null ? '—' : formatNumber(rca.kpi.active)} caption={t('p.rca.kpi.activeCaption')} />
            <ValueCard family="blue" fact={factFrom(kpi, avgAffected, { calculation: t('p.rca.kpi.avgCalc') })} eyebrow={t('p.rca.kpi.avgAffected')} value={avgAffected === null ? '—' : decimal(avgAffected, 1)} caption={t('p.rca.kpi.avgAffectedCaption')} sparkline={rca.trend.avgAffected} sparklineLabel={t('p.rca.kpi.sparkDays', { metric: t('p.rca.kpi.avgAffected') })} />
            <ValueCard family="purple" fact={factFrom(top, incident === null ? null : incident.durationNs)} eyebrow={t('p.rca.kpi.duration')} value={durationLabel} caption={t('p.rca.kpi.durationCaption')} />
          </Grid>

          {/* The incident: an edge only while it is still active, a measured condition */}
          <Panel pad="roomy" className="pvs-spec-hero" rail={incident.status === 'ACTIVE'} railTone="critical">
            <Stack gap="group">
              <Cluster justify="between" align="start" gap="group">
                <Stack gap="tight">
                  <Text className="pvs-label">{t('p.rca.incident.eyebrow')}</Text>
                  <Heading level={3} as="h2" className="pvs-spec-hero__title">
                    {incident.name}
                  </Heading>
                  <Cluster>
                    <Chip color="primary" variant="accent" size="condensed">
                      {incident.displayId}
                    </Chip>
                    <Chip color="neutral" variant="emphasized" size="condensed">
                      {incident.category}
                    </Chip>
                    <StatusChip status={incident.status} />
                    {incident.impactLevels.map((level) => (
                      <Chip key={level} color="neutral" variant="emphasized" size="condensed">
                        {level}
                      </Chip>
                    ))}
                  </Cluster>
                </Stack>
                {problemUrl !== null && <ExternalLink href={problemUrl}>{t('p.rca.open')}</ExternalLink>}
              </Cluster>

              <Grid min={200}>
                <Stack gap="tight">
                  <Text className="pvs-label">{t('p.rca.incident.rootCause')}</Text>
                  <Text textStyle="base-emphasized" className={incident.rootCauseName === null ? 'pvs-muted' : undefined}>
                    {incident.rootCauseName ?? t('p.rca.incident.noRootCause')}
                  </Text>
                </Stack>
                <Stack gap="tight">
                  <Text className="pvs-label">{t('p.rca.incident.affected')}</Text>
                  <Figure value={formatNumber(incident.affectedCount)} size="md" />
                </Stack>
                <Stack gap="tight">
                  <Text className="pvs-label">{t('p.rca.incident.duration')}</Text>
                  <Figure value={durationLabel} size="md" />
                </Stack>
              </Grid>
            </Stack>
          </Panel>

          {/* 3.5.4 (visual proposal v4): the incident in tabs — how it propagated, how it was investigated, every
              entity it touched, and the history around it. */}
          <Tabs defaultIndex={0}>
            <Tab title={t('rca.tab.propagation')} keepMounted>
              <Stack gap="section" className="pvs-tabpane">
          {/* 3.6.1 (v5): the propagation as a graph from the cause to the impact; the 3.5.4 layers stay below it. */}
          <RcaPropagationGraph incident={incident} />
          <Panel as="section" pad="roomy" className="pvs-spec-band">
            <span className="pvs-spec-band__edge" aria-hidden="true" />
            <Stack gap="group">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('rca.v4.layers')} — {t('rca.prop.title')}
                </Heading>
                <Text className="pvs-caption">{tCount('p.rca.trail.blast', incident.affectedCount, { count: formatNumber(incident.affectedCount) })}</Text>
              </Stack>
              <RcaPropagation incident={incident} />
            </Stack>
          </Panel>
              </Stack>
            </Tab>
            <Tab title={t('rca.tab.investigation')} keepMounted>
              <Stack gap="section" className="pvs-tabpane">
          {/* 3.3.9: the explanation beside the incident's logs; 3.5.4: the mix and the time to close moved to History. */}
          <div className="pvs-cockpit-grid" data-testid="rca-cockpit">
          {/* Davis narrative */}
          <SectionPanel title={t('p.rca.analysis.title')} subtitle={t('p.rca.analysis.subtitle')} ai>
            {(() => {
              const allGroups = groupNarrative(parseRcaNarrative(incident.description, locale));
              if (allGroups.length === 0) return <Text>{t('p.rca.analysis.none')}</Text>;
              const groups = fullStory ? allGroups : allGroups.slice(0, RCA_STORY_OPENING);
              const more = allGroups.length - RCA_STORY_OPENING;
              return (
                <div className="pvs-b-narrative">
                  {groups.map((group, index) => {
                    if (group.kind === 'heading')
                      return (
                        <Heading key={index} level={5} as="h3">
                          {renderInline(group.text)}
                        </Heading>
                      );
                    if (group.kind === 'label')
                      return (
                        <Paragraph key={index}>
                          <Strong>{renderInline(group.text)}</Strong>
                        </Paragraph>
                      );
                    if (group.kind === 'bullets')
                      return (
                        <ul key={index} className="pvs-list">
                          {group.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                              <Text>{renderInline(item)}</Text>
                            </li>
                          ))}
                        </ul>
                      );
                    if (group.kind === 'code')
                      return (
                        <CodeSnippet key={index} showLineNumbers={false} size="condensed" lineBreaks>
                          {/* Strato 3.18: copy as an explicit action (the implicit copy button goes away in 4.0). */}
                          <CodeSnippet.ActionsMenu>
                            <CodeSnippet.Copy />
                          </CodeSnippet.ActionsMenu>
                          {group.text}
                        </CodeSnippet>
                      );
                    if (group.kind === 'table')
                      return (
                        <div key={index} className="pvs-scroll-x">
                          <table className="pvs-b-md-table">
                            <thead>
                              <tr>
                                {group.header.map((cell, cellIndex) => (
                                  <th key={cellIndex} scope="col">
                                    {renderInline(cell)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {group.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{renderInline(cell)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    return <Paragraph key={index}>{renderInline(group.text)}</Paragraph>;
                  })}
                  {more > 0 && (
                    <Button variant="default" size="condensed" onClick={() => setFullStory((open) => !open)} aria-expanded={fullStory} data-testid="rca-story-toggle">
                      {fullStory ? t('cockpit.rca.storyLess') : t('cockpit.rca.storyMore', { count: String(more) })}
                    </Button>
                  )}
                </div>
              );
            })()}
          </SectionPanel>

          {/* This incident's own error/warn logs (entity-scoped) */}
          <SectionPanel title={t('p.rca.logs.title')} subtitle={t('p.rca.logs.subtitle')}>
            {incidentLogs.outcome === 'loading' ? (
              <Text className="pvs-muted">{t('p.rca.logs.loading')}</Text>
            ) : incidentLogs.logs.hasContent ? (
              <>
                <Text className="pvs-caption">
                  {t('p.rca.logs.incidentTotals', { errors: formatNumber(incidentLogs.logs.errors), warnings: formatNumber(incidentLogs.logs.warnings) })}
                </Text>
                <BarList
                  role="magnitude"
                  ariaLabel={t('p.rca.logs.aria')}
                  items={incidentLogs.logs.signatures.map((row, index) => ({
                    key: `${index}-${row.signature}`,
                    label: row.signature,
                    value: row.count,
                    display: formatNumber(row.count),
                  }))}
                />
              </>
            ) : (
              <Callout kind="limitation" title={t('p.rca.logs.noData.title')}>
                {incidentLogs.outcome === 'no-permission'
                  ? t('p.rca.logs.noPermission')
                  : incidentLogs.outcome === 'error'
                    ? t('p.rca.logs.failed')
                    : incidentLogs.logs.hasRows
                      ? t('p.rca.logs.noContent', { errors: formatNumber(incidentLogs.logs.errors), warnings: formatNumber(incidentLogs.logs.warnings) })
                      : t('p.rca.logs.noLogs')}
              </Callout>
            )}
            {logsUrl !== null && (
              <Cluster>
                <ExternalLink href={logsUrl}>{t('p.rca.logs.viewIncident')}</ExternalLink>
              </Cluster>
            )}
          </SectionPanel>
          </div>
              </Stack>
            </Tab>
            <Tab title={t('rca.tab.affected')} keepMounted>
              <Stack gap="section" className="pvs-tabpane">
                <SectionPanel title={t('rca.affected.title')} subtitle={t('rca.affected.subtitle', { n: formatNumber(incident.affectedCount) })}>
                  <RcaAffectedTable incident={incident} />
                </SectionPanel>
              </Stack>
            </Tab>
            <Tab title={t('rca.tab.history')} keepMounted>
              <Stack gap="section" className="pvs-tabpane">
          <div className="pvs-cockpit-grid" data-testid="rca-history">
          {/* Problem mix by category — an executive read on what dominates */}
          {rca.categoryMix.length > 0 && (
            <SectionPanel title={t('p.rca.mix.title')} subtitle={t('p.rca.mix.subtitle', { days: String(WINDOW_DAYS) })}>
              <ShareBar
                segments={mixSegments}
                ariaLabel={t('p.rca.mix.aria', { items: mixSegments.map((segment) => `${segment.label} ${segment.display}`).join(', ') })}
              />
            </SectionPanel>
          )}

          {/* How long problems take to close: median and p90 per category (3.2.3) */}
          {mttrRows.length > 0 && (
            <SectionPanel title={t('p.rca.mttr.title')} subtitle={t('p.rca.mttr.subtitle')}>
              {mttrLineNs === null ? (
                <BarList
                  role="duration"
                  ariaLabel={t('p.rca.mttr.aria')}
                  items={mttrRows.map((row) => ({
                    key: row.category,
                    label: catLabel(row.category),
                    value: row.medianNs,
                    display: t('p.rca.mttr.row', {
                      median: formatNanos(row.medianNs),
                      p90: row.p90Ns === null ? '—' : formatNanos(row.p90Ns),
                      count: formatNumber(row.problems),
                    }),
                  }))}
                />
              ) : (
                <RankedBars
                  ariaLabel={t('p.rca.mttr.aria')}
                  format={(ns) => formatNanos(ns)}
                  line={{ value: mttrLineNs, label: t('cockpit.rca.line', { target: formatNanos(mttrLineNs) }) }}
                  items={mttrRows.map((row) => ({
                    key: row.category,
                    label: catLabel(row.category),
                    value: row.medianNs,
                    display: t('p.rca.mttr.row', {
                      median: formatNanos(row.medianNs),
                      p90: row.p90Ns === null ? '—' : formatNanos(row.p90Ns),
                      count: formatNumber(row.problems),
                    }),
                    status: statusAgainst(row.medianNs, mttrLineNs, 0.75),
                  }))}
                />
              )}
            </SectionPanel>
          )}
          </div>

          {/* User impact (RUM) — only when the incident touched applications */}
          {touchesUsers && rum.hasData && (
            <SectionPanel title={t('p.rca.rum.title')} subtitle={t('p.rca.rum.subtitle')}>
              <Grid min={180}>
                <RumStat
                  label={t('p.rca.rum.users')}
                  value={rum.totalUsers === null ? '—' : formatNumber(rum.totalUsers)}
                  missing={rum.totalUsers === null}
                  missingLabel={t('c.tile.notMeasuredInline')}
                />
                <RumStat
                  label={t('p.rca.rum.requests')}
                  value={formatNumber(rum.totalRequests)}
                  missingLabel={t('c.tile.notMeasuredInline')}
                />
                <RumStat
                  label={t('p.rca.rum.errorRate')}
                  value={rum.overallErrorRatePct === null ? '—' : String(rum.overallErrorRatePct)}
                  unit="%"
                  missing={rum.overallErrorRatePct === null}
                  missingLabel={t('c.tile.notMeasuredInline')}
                />
                <RumStat
                  label={t('p.rca.rum.inp')}
                  value={rum.worstInp === null ? '—' : formatNumber(Math.round(rum.worstInp))}
                  unit="ms"
                  missing={rum.worstInp === null}
                  missingLabel={t('c.tile.notMeasuredInline')}
                />
              </Grid>
              <Text className="pvs-caption">{t('p.rca.rum.note')}</Text>
            </SectionPanel>
          )}

          {/* 3.2.5: the three most telling incidents, told as stories. */}
          <IncidentStories stories={incidentStories(incident, others)} />

          {/* Other major incidents */}
          {others.length > 0 && (
            <SectionPanel title={t('p.rca.others.title')}>
              <ul className="pvs-b-rows">
                {others.map((other: RcaIncident) => (
                  <li key={other.displayId} className="pvs-b-row">
                    <div className="pvs-b-row__main">
                      <Chip color="primary" variant="accent" size="condensed">
                        {other.displayId}
                      </Chip>
                      <Text textStyle="base-emphasized">{other.name}</Text>
                      <Text className="pvs-caption">{other.category}</Text>
                    </div>
                    <div className="pvs-b-row__side">
                      <Text className="pvs-caption">{t('p.rca.others.affected', { count: formatNumber(other.affectedCount) })}</Text>
                      {other.rootCauseName !== null && (
                        <Chip color="neutral" variant="emphasized" size="condensed">
                          {t('p.rca.others.rc', { name: other.rootCauseName })}
                        </Chip>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionPanel>
          )}
              </Stack>
            </Tab>
          </Tabs>

          {/* Dynatrace Assist (technical) */}
          <AssistPanel
            eyebrow={t('assist.tech.eyebrow')}
            title={t('p.rca.assist.title')}
            sentences={assist}
            note={t('p.rca.assist.note')}
          />

          {/* Recommendations — detect earlier & remediate (best-practice guidance) */}
          <Stack gap="group">
            <Stack gap="tight">
              <Heading level={4} as="h2">
                {t('p.rca.rec.title')}
              </Heading>
              <Text className="pvs-caption">{t('p.rca.rec.subtitle')}</Text>
            </Stack>
            <Grid min={240}>
              {RECOMMENDATION_COLUMNS.map((column) => (
                <Panel key={column.title} evidence="recommendation">
                  <Stack gap="tight">
                    <Cluster>
                      <RecommendationIcon aria-hidden="true" />
                      <Heading level={5} as="h3">
                        {t(column.title)}
                      </Heading>
                    </Cluster>
                    <ul className="pvs-list">
                      {column.items.map((key) => (
                        <li key={key}>
                          <Text>{t(key, { rc: incident.rootCauseName ?? incident.affectedNames[0] ?? t('p.rca.na') })}</Text>
                        </li>
                      ))}
                    </ul>
                  </Stack>
                </Panel>
              ))}
            </Grid>
          </Stack>

        </>
      )}

      <DqlDisclosure entries={[getQuery('rca.top'), getQuery('rca.kpi'), getQuery('rca.trend'), getQuery('rca.catmix'), getQuery('prob.mttx'), getQuery('rca.logs')]} />
    </>
  );
};
