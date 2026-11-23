import React from 'react';

import { Chip, CodeSnippet } from '@dynatrace/strato-components/content';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import {
  BugReportIcon,
  ExploitIcon,
  HostsIcon,
  PublicExposureIcon,
  SecurityCriticalIcon,
  SecurityHighIcon,
  SecurityIcon,
  SecurityMediumIcon,
  TechnologiesIcon,
  VulnerableFunctionIcon,
} from '@dynatrace/strato-icons';

import { BarList } from '../components/viz/BarList';
import { AssistPanel } from '../components/AssistPanel';
import { useQueryScope } from '../config/StudioContext';
import { Callout, Cluster, Figure, Panel, Stack } from '../engine';
import type { IconComponent } from '../engine/evidence';
import '../engine/page-b.css';
import { SEVERITY_COLOR, SEVERITY_ORDER, type Severity, type Tone } from '../design/palette';
import { BrandGlyph, KpiHero, SeverityBar, techGlyph, type RiskLevel } from '../components/spectrum';
import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { partial } from '../models/provenance';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SectionIntro } from '../components/SectionIntro';
import { getQuery, VULNERABILITY_LIST_LIMIT } from '../queries/catalog';
import { summariseVulnerabilities, type TopVulnerability } from '../models/security';
import { fixQueue } from '../models/securityQueue';
import { FixQueue } from '../features/security/FixQueue';
import type { StringKey } from '../i18n/strings';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { useTranslation, type Translation } from '../i18n/useTranslation';

/**
 * Security and runtime risk.
 *
 * Shows the distinct open vulnerabilities Dynatrace tracks, graded by Davis
 * severity — the posture a security dashboard reports, not a raw event count.
 * The page is kept in the navigation even when the app cannot read the security
 * table, because removing it would let a permission gap read as a clean bill of
 * health. When the scope is missing the query refuses live and the exact remedy
 * is shown; nothing here is asserted from memory.
 */

const SEVERITY_LABEL: Record<Severity, StringKey> = {
  CRITICAL: 'p.sec.sev.critical',
  HIGH: 'p.sec.sev.high',
  MEDIUM: 'p.sec.sev.medium',
  LOW: 'p.sec.sev.low',
};

/** One silhouette per severity, so the word is never the only thing telling them apart. */
const SEVERITY_ICON: Record<Severity, IconComponent> = {
  CRITICAL: SecurityCriticalIcon,
  HIGH: SecurityHighIcon,
  MEDIUM: SecurityMediumIcon,
  LOW: SecurityIcon,
};

/**
 * Only critical and high are measured faults worth a tone; medium and low stay in
 * neutral ink. A tone is always printed beside the severity word and its icon.
 */
const SEVERITY_TONE: Partial<Record<Severity, Tone>> = {
  CRITICAL: 'critical',
  // 3.2.1: red, as Strato's security risk palette draws "high" in both themes, so the figure
  // and its segment in the severity bar agree. The icon and the word tell it from critical.
  HIGH: 'critical',
};

/** A severity as an icon and its word, for a table cell. */
const SeverityLabel = ({ severity, label }: { severity: Severity; label: string }) => {
  const Icon = SEVERITY_ICON[severity];
  return (
    <span className="pvs-b-sevcell" data-tone={SEVERITY_TONE[severity]}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  );
};

const topColumns = (
  t: Translation['t'],
  formatNumber: Translation['formatNumber'],
): DataTableColumnDef<TopVulnerability>[] => [
  {
    id: 'severity',
    header: t('p.sec.v2.h.severity'),
    accessor: 'severity',
    width: 140,
    cell: ({ rowData }) =>
      rowData.severity === null ? (
        <DataTable.DefaultCell>{t('p.sec.v2.ungraded')}</DataTable.DefaultCell>
      ) : (
        <DataTable.DefaultCell>
          <SeverityLabel severity={rowData.severity} label={t(SEVERITY_LABEL[rowData.severity])} />
        </DataTable.DefaultCell>
      ),
  },
  { id: 'title', header: t('p.sec.v2.h.title'), accessor: 'title', width: '2fr' },
  {
    id: 'score',
    header: t('p.sec.v2.h.score'),
    accessor: 'score',
    width: 120,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {rowData.score === null ? '—' : formatNumber(Number(rowData.score.toFixed(1)))}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: 'technology',
    header: t('p.sec.v2.h.tech'),
    accessor: 'technology',
    width: '1fr',
    cell: ({ rowData }) => <DataTable.DefaultCell>{rowData.technology ?? '—'}</DataTable.DefaultCell>,
  },
];

export const SecurityAndRuntimeRisk = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const findings = useCatalogQuery('sec.vulnerabilities', scope);
  const posture = useCatalogQuery('sec.posture', scope);
  // 3.2.5: the context of the top fixes — component, services and workloads, and service owners.
  const context = useCatalogQuery('sec.context', scope);
  const owners = useCatalogQuery('svc.owners', scope);

  // `sec.posture` counts every open vulnerability inside the query, so it decides the state of
  // the page and supplies every total. The list is only the highest-risk rows. A scan-limited
  // aggregate is partial (not exact); if the aggregate failed outright the list stands in, and
  // its total is exact only while it is shorter than its cap.
  const postureAnswered = posture.outcome === 'ok' || posture.outcome === 'empty' || posture.outcome === 'scan-limit';
  const primary =
    posture.outcome === 'error' && findings.outcome !== 'loading' && findings.outcome !== 'error' ? findings : posture;
  const summary = summariseVulnerabilities(
    findings.records,
    10,
    postureAnswered ? { records: posture.records, complete: posture.outcome !== 'scan-limit' } : null,
  );

  // A scan-limited result is partial but real: it is shown, with the limit stated, rather
  // than hidden behind "not readable". A query still running or failed has no answer yet,
  // and an *empty* answer is not a refused one: each says what it is.
  const readable = primary.outcome === 'ok' || primary.outcome === 'scan-limit';
  const unanswered = primary.outcome === 'loading' || primary.outcome === 'error';
  const noFindings = primary.outcome === 'empty';
  const noPermission = primary.outcome === 'no-permission';
  // The total is exact unless the aggregate could not be read and the list stopped at its cap
  // (then it is a floor, said as "500+"), or the scan limit cut the aggregate short.
  const capped = !summary.exact;
  const totalLabel = `${formatNumber(summary.total)}${capped && primary.outcome !== 'scan-limit' ? '+' : ''}`;
  const totalFact = capped
    ? partial(
        summary.total,
        primary.evidence,
        primary.outcome === 'scan-limit'
          ? t('p.sec.scanLimit.body')
          : t('p.sec.cap.body', { cap: VULNERABILITY_LIST_LIMIT }),
      )
    : factFrom(primary, summary.total);

  // Dynatrace Assist — plain-language sentences, each shown only when its signal
  // exists, so the panel never pads itself with a fabricated observation.
  const topTech = summary.byTechnology[0]?.technology ?? null;
  const assistSentences: string[] = [];
  if (summary.total > 0) {
    assistSentences.push(t('p.sec.assist.s.total', { total: formatNumber(summary.total) }));
    if (summary.bySeverity.CRITICAL > 0) {
      assistSentences.push(t('p.sec.assist.s.critical', { count: formatNumber(summary.bySeverity.CRITICAL) }));
    }
    assistSentences.push(
      summary.actNowCount > 0
        ? t('p.sec.assist.s.actNow', { count: formatNumber(summary.actNowCount) })
        : t('p.sec.assist.s.actNone'),
    );
    if (topTech !== null) {
      assistSentences.push(t('p.sec.assist.s.tech', { tech: topTech }));
    }
  }

  const remediationPractices: StringKey[] = ['p.sec.rem.p1', 'p.sec.rem.p2', 'p.sec.rem.p3', 'p.sec.rem.p4'];

  const stackSegments = SEVERITY_ORDER.map((severity) => ({
    severity,
    count: summary.bySeverity[severity],
    display: formatNumber(summary.bySeverity[severity]),
    label: t(SEVERITY_LABEL[severity]),
  }));

  return (
    <>
      <SectionIntro
        titleKey="p.sec.title"
        questionKey="p.sec.question"
        takeawayKey="p.sec.takeaway"
      />

      {readable ? (
        <>
          {primary.outcome === 'scan-limit' && (
            <Callout kind="limitation" title={t('p.sec.scanLimit.title')}>
              {t('p.sec.scanLimit.body')}
            </Callout>
          )}
          {capped && primary.outcome !== 'scan-limit' && (
            <Callout kind="limitation" title={t('p.sec.cap.title')}>
              {t('p.sec.cap.body', { cap: VULNERABILITY_LIST_LIMIT })}
            </Callout>
          )}
          <div className="pvs-b-lead">
            {/* 3.2.3: the total with the Spectrum skin (no verdict in it), and under it the one
                number that is a verdict: what meets the immediate-action bar. */}
            {/* 3.2.6: the total reads as the alarm it is — the one red family of the skin. */}
            <KpiHero
              family="red"
              fact={totalFact}
              eyebrow={t('p.sec.v2.total')}
              value={totalLabel}
              caption={t('p.sec.v2.totalCaption')}
            />

            {/* Severity ladder + distribution. */}
            <Panel pad="roomy">
              <Stack gap="group">
                <Heading level={4} as="h2">
                  {t('p.sec.v2.severityTitle')}
                </Heading>
                <SeverityStack
                  segments={stackSegments}
                  total={summary.total}
                  ungraded={summary.ungraded}
                  ungradedLabel={`${t('p.sec.v2.ungraded')}: ${formatNumber(summary.ungraded)}`}
                  label={t('p.sec.v2.shareAria')}
                  order={t('p.sec.v2.stackOrder')}
                />
                <ul className="pvs-b-sev">
                  {SEVERITY_ORDER.map((severity) => {
                    const count = summary.bySeverity[severity];
                    const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                    const tone = count > 0 ? SEVERITY_TONE[severity] : undefined;
                    const Icon = SEVERITY_ICON[severity];
                    return (
                      <li key={severity} className="pvs-b-sev__item" data-tone={tone}>
                        <span className="pvs-b-sev__name">
                          <span
                            className="pvs-swatch"
                            aria-hidden="true"
                            style={{ background: SEVERITY_COLOR[severity] }}
                          />
                          <span className="pvs-b-sev__icon">
                            <Icon aria-hidden="true" />
                          </span>
                          <Text className="pvs-label">{t(SEVERITY_LABEL[severity])}</Text>
                        </span>
                        <Figure value={formatNumber(count)} size="md" tone={tone} />
                        <Text className="pvs-caption">
                          {pct}% {t('p.sec.v2.of', { total: totalLabel })}
                        </Text>
                      </li>
                    );
                  })}
                </ul>
              </Stack>
            </Panel>
          </div>

          <ActNow
            count={summary.actNowCount}
            floor={capped && primary.outcome !== 'scan-limit'}
            exploitable={summary.exploitableCount}
            exposed={summary.publicCount}
            inUse={summary.inUseCount}
            twoSignals={summary.twoSignalsCount}
            pairs={summary.pairs}
          />

          {/* 3.3.11: what the findings sit in, beside the Assist (a cockpit row). */}
          <CockpitRow data-testid="sec-cockpit">
            <Panel pad="roomy">
              <Stack gap="group">
                <Heading level={4} as="h2">
                  {t('p.sec.v2.techTitle')}
                </Heading>
                {summary.byTechnology.length > 0 ? (
                  <BarList
                    role="exposure"
                    ariaLabel={t('p.sec.v2.techAria')}
                    items={summary.byTechnology.map((entry) => {
                      const glyph = techGlyph(entry.technology);
                      return {
                        key: entry.technology,
                        label: entry.technology,
                        value: entry.count,
                        display: `${formatNumber(entry.count)} ${t('p.sec.v2.techUnit')}`,
                        icon: glyph === null ? <TechnologiesIcon size={16} /> : <BrandGlyph name={glyph} size={16} />,
                      };
                    })}
                  />
                ) : (
                  <Text className="pvs-muted">{t('p.sec.v2.techEmpty')}</Text>
                )}
              </Stack>
            </Panel>
            {assistSentences.length > 0 && (
              <AssistPanel
                eyebrow={t('p.sec.assist.eyebrow')}
                title={t('p.sec.assist.title')}
                sentences={assistSentences}
                note={t('p.sec.assist.note')}
              />
            )}
          </CockpitRow>

          {summary.top.length > 0 && (
            <Panel pad="roomy">
              <Stack gap="group">
                <Heading level={4} as="h2">
                  {t('p.sec.v2.topTitle')}
                </Heading>
                <DataTable
                  data={summary.top}
                  columns={topColumns(t, formatNumber)}
                  fullWidth
                  aria-label={t('p.sec.v2.topTitle')}
                />
                {summary.total > summary.top.length && (
                  <Text className="pvs-caption">
                    {t('p.sec.top.showing', {
                      shown: formatNumber(summary.top.length),
                      total: totalLabel,
                    })}
                  </Text>
                )}
              </Stack>
            </Panel>
          )}

          {/* 3.2.5: the five fixes to make first, with what to upgrade, where and who answers. */}
          <FixQueue items={fixQueue(findings.records, context.records, owners.records)} context={context} />

          {/* Remediation queue — the short list plus the standing practices. */}
          <Panel pad="roomy">
            <Stack gap="group">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('p.sec.rem.title')}
                </Heading>
                <Text className="pvs-caption pvs-prose">{t('p.sec.rem.subtitle')}</Text>
              </Stack>

              {summary.remediation.length > 0 ? (
                <Stack gap="tight">
                  <Heading level={5} as="h3">
                    {t('p.sec.rem.actNowTitle')}
                  </Heading>
                  {summary.actNowCount > summary.remediation.length && (
                    <Text className="pvs-caption">
                      {t('p.sec.rem.showing', {
                        shown: formatNumber(summary.remediation.length),
                        total: formatNumber(summary.actNowCount),
                      })}
                    </Text>
                  )}
                  <Stack as="ul" gap="tight" className="pvs-b-plain">
                    {summary.remediation.map((vuln) => (
                      <Panel as="li" key={vuln.displayId} pad="compact" rail railTone="critical">
                        <Stack gap="tight">
                          <div className="pvs-b-card__head">
                            <Text textStyle="base-emphasized">{vuln.title}</Text>
                            {vuln.score !== null && (
                              <div className="pvs-b-card__score">
                                <Text className="pvs-caption">{t('p.sec.v2.h.score')}</Text>
                                <Figure value={formatNumber(Number(vuln.score.toFixed(1)))} size="md" />
                              </div>
                            )}
                          </div>
                          <Cluster>
                            {vuln.cve !== null && <RemChip text={vuln.cve} Icon={BugReportIcon} />}
                            <RemChip text={t('p.sec.rem.flag.exploit')} Icon={ExploitIcon} tone="critical" />
                            <RemChip text={t('p.sec.rem.flag.public')} Icon={PublicExposureIcon} tone="critical" />
                            <RemChip text={t('p.sec.rem.flag.inUse')} Icon={VulnerableFunctionIcon} tone="warning" />
                            {vuln.entityCount > 0 && (
                              <RemChip
                                text={t('p.sec.rem.entities', { count: formatNumber(vuln.entityCount) })}
                                Icon={HostsIcon}
                              />
                            )}
                          </Cluster>
                        </Stack>
                      </Panel>
                    ))}
                  </Stack>
                </Stack>
              ) : summary.actNowCount > 0 ? (
                // The aggregate counted them but the list that names them has not answered: say so
                // rather than claiming there is nothing to act on.
                <Callout kind="pending" title={t('p.sec.rem.listTitle', { count: formatNumber(summary.actNowCount) })}>
                  {t('p.sec.rem.listBody')}
                </Callout>
              ) : (
                <Callout kind="note" title={t('p.sec.rem.noneTitle')}>
                  {t('p.sec.rem.noneBody')}
                </Callout>
              )}

              <Stack gap="tight">
                <Heading level={5} as="h3">
                  {t('p.sec.rem.practicesTitle')}
                </Heading>
                <ol className="pvs-list pvs-prose">
                  {remediationPractices.map((key) => (
                    <li key={key}>
                      <Text>{t(key)}</Text>
                    </li>
                  ))}
                </ol>
              </Stack>
            </Stack>
          </Panel>
        </>
      ) : unanswered ? (
        <QueryStateBoundary result={primary}>{null}</QueryStateBoundary>
      ) : noFindings ? (
        // The source answered with nothing. That is not "scope not granted", and it is not
        // proof of a clean estate either: Runtime Vulnerability Analytics may not be on.
        <Callout kind="limitation" title={t('p.sec.empty.title')}>
          {t('p.sec.empty.body')}
        </Callout>
      ) : (
        <>
          {/* A limit of this review, not a fault in the estate: neutral and dashed. */}
          <Callout kind="limitation" title={t('p.sec.readFirst')}>
            <Stack gap="tight">
              <Paragraph>{t('p.sec.readFirstBody1')}</Paragraph>
              <Paragraph>{t('p.sec.readFirstBody2')}</Paragraph>
            </Stack>
          </Callout>

          {noPermission && (
            <Panel evidence="no-permission" pad="roomy">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('p.sec.closeGap')}
                </Heading>
                <Paragraph>{t('p.sec.closeGapBody')}</Paragraph>
                <CodeSnippet showLineNumbers={false} size="condensed">
                  {/* Strato 3.18: copy as an explicit action (the implicit copy button goes away in 4.0). */}
                  <CodeSnippet.ActionsMenu>
                    <CodeSnippet.Copy />
                  </CodeSnippet.ActionsMenu>
                  storage:security.events:read
                </CodeSnippet>
                <Text className="pvs-caption">{t('p.sec.manifestNote')}</Text>
              </Stack>
            </Panel>
          )}
        </>
      )}

      <DqlDisclosure entries={[getQuery('sec.posture'), getQuery('sec.vulnerabilities')]} />
    </>
  );
};

/** A fact about a vulnerability, as a chip with an icon: the colour is only a redundant channel. */
const RemChip = ({ text, Icon, tone }: { text: string; Icon: IconComponent; tone?: 'critical' | 'warning' }) => (
  <Chip color={tone ?? 'neutral'} variant="emphasized" size="condensed">
    <Chip.Prefix>
      <Icon aria-hidden="true" />
    </Chip.Prefix>
    {text}
  </Chip>
);

interface StackSegment {
  severity: Severity;
  count: number;
  /** The count, formatted for the active locale. */
  display: string;
  label: string;
}

/** The platform's security risk level for each severity, for the Spectrum bar. */
const RISK: Record<Severity, RiskLevel> = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

/**
 * A single 100%-stacked bar of the four severities, worst on the left (3.2.1: the Spectrum
 * `SeverityBar`, in Strato's security risk colours).
 *
 * The bar is never the only carrier: the legend beside it names every severity, in the same
 * order, with its icon, count and share, and the bar announces the same counts. The ungraded
 * remainder takes its own grey segment against the same total, so the graded levels are never
 * stretched to fill the bar.
 */
const SeverityStack = ({
  segments,
  total,
  ungraded,
  ungradedLabel,
  label,
  order,
}: {
  segments: readonly StackSegment[];
  /** Every open vulnerability, graded or not: the one denominator the legend also uses. */
  total: number;
  ungraded: number;
  ungradedLabel: string;
  label: string;
  order: string;
}) => {
  if (total === 0) return null;
  return (
    <Stack gap="tight">
      <SeverityBar
        label={label}
        segments={[
          ...segments.map((segment) => ({
            level: RISK[segment.severity],
            count: segment.count,
            label: segment.label,
            display: segment.display,
          })),
          { level: 'none' as const, count: ungraded, label: ungradedLabel, display: '' },
        ]}
      />
      <Text className="pvs-caption">
        {order}
        {ungraded > 0 ? ` · ${ungradedLabel}` : ''}
      </Text>
    </Stack>
  );
};

/**
 * The immediate-action bar (3.2.3): open vulnerabilities with a public exploit, on an entity
 * reachable from a public network, whose vulnerable function is actually called. Red only when
 * there is at least one: a measured fault in the estate. Each criterion keeps its own count and
 * icon, so the card says why the number is what it is.
 *
 * 3.2.6: "act now" stayed at zero on estates full of exploit and exposure flags, because the three
 * signals never met on one vulnerability — the vulnerable function is assessed only where
 * code-level analysis exists. The bar now names the next queue as well: the vulnerabilities with
 * two of the three signals (exact, from the pairs), and each pair's count.
 */
const ActNow = ({
  count,
  floor,
  exploitable,
  exposed,
  inUse,
  twoSignals,
  pairs,
}: {
  count: number;
  /** The count comes from the capped list, so it is a floor ("8+"). */
  floor: boolean;
  exploitable: number;
  exposed: number;
  inUse: number;
  twoSignals: number;
  pairs: { exploitPublic: number; exploitInUse: number; publicInUse: number };
}) => {
  const { t, formatNumber } = useTranslation();
  const urgent = count > 0;
  const next = twoSignals - count;
  const plus = floor ? '+' : '';
  const criteria = [
    { key: 'exploit', Icon: ExploitIcon, label: t('p.sec.rem.flag.exploit'), value: exploitable },
    { key: 'public', Icon: PublicExposureIcon, label: t('p.sec.rem.flag.public'), value: exposed },
    { key: 'inUse', Icon: VulnerableFunctionIcon, label: t('p.sec.rem.flag.inUse'), value: inUse },
  ];
  const combos = [
    { key: 'exploitPublic', label: t('p.sec3.pair.exploitPublic'), value: pairs.exploitPublic },
    { key: 'exploitInUse', label: t('p.sec3.pair.exploitInUse'), value: pairs.exploitInUse },
    { key: 'publicInUse', label: t('p.sec3.pair.publicInUse'), value: pairs.publicInUse },
  ];
  return (
    <Panel as="section" pad="roomy" tone={urgent ? 'critical' : next > 0 ? 'warning' : 'neutral'} rail={urgent || next > 0}>
      <div className="pvs-actnow__grid">
        <Stack gap="tight">
          <Cluster>
            <SecurityCriticalIcon aria-hidden="true" />
            <Text className="pvs-label">{t('p.sec.act.title')}</Text>
          </Cluster>
          <Figure value={`${formatNumber(count)}${plus}`} size="xl" tone={urgent ? 'critical' : undefined} />
          <Text className="pvs-caption">{t(urgent ? 'p.sec.act.caption' : 'p.sec.act.none')}</Text>
          <div className="pvs-actnow__next" data-tone={next > 0 ? 'warning' : 'neutral'}>
            <Text className="pvs-label">{t('p.sec3.next.title')}</Text>
            <Figure value={`${formatNumber(Math.max(0, next))}${plus}`} size="lg" tone={next > 0 ? 'warning' : undefined} />
            <Text className="pvs-caption">{t(next > 0 ? 'p.sec3.next.caption' : 'p.sec3.next.none')}</Text>
          </div>
        </Stack>
        <Stack gap="group">
          <ul className="pvs-actnow">
            {criteria.map(({ key, Icon, label, value }) => (
              <li key={key} className="pvs-actnow__row">
                <Icon aria-hidden="true" />
                <Text>{label}</Text>
                <Text className="pvs-actnow__count">
                  {formatNumber(value)}
                  {plus}
                </Text>
              </li>
            ))}
          </ul>
          <Stack gap="tight">
            <Text className="pvs-label">{t('p.sec3.pairs.title')}</Text>
            <ul className="pvs-actnow">
              {combos.map(({ key, label, value }) => (
                <li key={key} className="pvs-actnow__row" data-pair="true">
                  <span className="pvs-actnow__pair" aria-hidden="true" />
                  <Text>{label}</Text>
                  <Text className="pvs-actnow__count">
                    {formatNumber(value)}
                    {plus}
                  </Text>
                </li>
              ))}
            </ul>
            <Text className="pvs-caption">{t('p.sec3.pairs.note')}</Text>
          </Stack>
        </Stack>
      </div>
    </Panel>
  );
};
