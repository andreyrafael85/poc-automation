import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip } from '@dynatrace/strato-components/content';
import { Select } from '@dynatrace/strato-components/forms';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { ExternalLink, Heading, Link, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { DownloadIcon } from '@dynatrace/strato-icons';
import { Link as RouterLink } from 'react-router-dom';

import { HeroBanner } from '../components/HeroBanner';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { SectionIntro } from '../components/SectionIntro';
import { BarList } from '../components/viz/BarList';
import { useAccess } from '../config/AccessContext';
import { installedVersion } from '../config/appInfo';
import { assumed } from '../config/assumptions';
import { useStudio } from '../config/StudioContext';
import { Callout, Cluster, Panel, Stack } from '../engine';
import { ImpactHeatmap } from '../engine/chart/ImpactHeatmap';
import { RadialBars } from '../engine/chart/RadialBars';
import { RingRankPanel } from '../engine/chart/RingRankPanel';
import '../engine/page-d.css';
import { PRINT_STYLES } from '../engine/printStyles';
import { ActionPlanTable, type PlanActionRow } from '../features/assessment/ActionPlanTable';
import { AdoptionList } from '../features/assessment/AdoptionList';
import { DepthMap } from '../features/assessment/DepthMap';
import { CoverageInventory } from '../features/assessment/CoverageInventory';
import { CAPABILITY_LABEL } from '../features/assessment/adoption';
import { ValueCycle } from '../features/assessment/ValueCycle';
import type { AutonomyRung } from '../features/assessment/valueCycle';
import type { PocPlan } from '../models/pocPlan';
import { PersonaGuide } from '../features/assessment/PersonaGuide';
import { PracticeList } from '../features/assessment/PracticeList';
import { bandOf, radialBarsFor } from '../features/assessment/radar';
import { ComparisonView } from '../features/assessment/ComparisonView';
import { assessmentFileName, buildAssessmentFile } from '../features/assessment/exportJson';
import { compareSnapshots, toSnapshot } from '../features/assessment/history';
import { useActionPlan } from '../features/assessment/useActionPlan';
import { useAssessmentHistory } from '../features/assessment/useAssessmentHistory';
import { docFor } from '../features/assessment/docLinks';
import { DOMAIN_LABEL, DomainList, domainLine, shareDisplay } from '../features/assessment/DomainList';
import { CLASS_ORDER, priorityOf, type AssessmentFinding, type FindingClass, type Priority } from '../features/assessment/findings';
import { LENSES, LENS_LABEL, domainOrderFor, findingsFor, isLensDomain, type Lens } from '../features/assessment/lenses';
import { useAssessment } from '../features/assessment/useAssessment';
import '../features/assessment/assessment.css';
import type { CatalogQueryResult } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { derived } from '../models/provenance';
import { getQuery } from '../queries/catalog';
import { decimal } from '../utils/activeLocale';
import { isSafeImageDataUrl } from '../utils/logo';
import { num, str } from '../utils/records';

/**
 * The Assessment (3.4.0, owner's order "Sim, iniciar 3.4.0" on `docs/v3.4/PROPOSTA-3.4.md` Part C).
 *
 * One vertical page that answers "what exists in this environment, what can Dynatrace observe of
 * it, what did we find and what do we recommend?" with the data the app already reads: no new
 * query, no new scope, no money (rule 6). Discover → understand → assess → findings → risks and
 * opportunities → summary → actions.
 *
 * Every figure is a `Fact` with its query (rule 8); the index divides only measured, applicable
 * domains and shows its formula and weights; every finding names its rule, its measurement and the
 * queries behind it. Executive mode keeps the page (the proposal's D-C3) without the technical
 * discovery section and without DQL (`DqlDisclosure` hides itself there).
 */

const CLASS_LABEL: Record<FindingClass, StringKey> = {
  critical: 'p.asm.class.critical',
  warning: 'p.asm.class.warning',
  opportunity: 'p.asm.class.opportunity',
  strength: 'p.asm.class.strength',
};

const PRIORITY_ORDER: Record<Priority, number> = { P1: 0, P2: 1, P3: 2 };

const FindingCard = ({ finding }: { finding: AssessmentFinding }) => {
  const { t } = useTranslation();
  return (
    <article className="pvs-asm-finding" data-testid={`asm-finding-${finding.rule}`}>
      <span className="pvs-asm-finding__rule">
        <span>{finding.rule}</span>
        {finding.kind === 'gap' && (
          <Chip size="condensed" color="neutral">
            {t('p.asm.finding.gap')}
          </Chip>
        )}
      </span>
      <span className="pvs-asm-finding__title">{finding.title}</span>
      <Text className="pvs-asm-finding__field">
        <strong>{t('p.asm.finding.measured')}:</strong> {finding.observation}
      </Text>
      <Text className="pvs-asm-finding__field">
        <strong>{t('p.asm.finding.impact')}:</strong> {finding.impact}
      </Text>
      <Text className="pvs-asm-finding__field">
        <strong>{t('p.asm.finding.rec')}:</strong> {finding.recommendation}
      </Text>
      <span className="pvs-asm-finding__meta">
        {t('p.asm.finding.capability')}: {finding.capability} · {t('p.asm.finding.evidence', { queries: finding.evidence.join(', ') })}
      </span>
      <Cluster gap="tight">
        <Link as={RouterLink} to={finding.drilldown}>
          {t('p.asm.finding.open')}
        </Link>
        {/* 3.4.6 (F-09): how to set the capability up, in the Dynatrace documentation. */}
        {docFor(finding.capabilityKey) !== null && (
          <span className="pvs-doc">
            <ExternalLink href={docFor(finding.capabilityKey) ?? ''} data-testid={`asm-doc-${finding.rule}`}>
              {t('asm.plan.docsLong', { capability: finding.capability })}
            </ExternalLink>
          </span>
        )}
      </Cluster>
    </article>
  );
};

/** 3.7.9: the plan with the autonomy target the SE agreed (none removes it). */
function withTarget(plan: PocPlan, rung: AutonomyRung | null): PocPlan {
  const rest: PocPlan = { ...plan };
  delete rest.autonomyTarget;
  return rung === null ? rest : { ...rest, autonomyTarget: rung };
}

export const Assessment = () => {
  const { t, tWindow, formatNumber, formatDateTime, formatDay } = useTranslation();
  const { parameters, timeframeLabel, executiveMode, resolvedTimeframe, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  // The conversation guide and the query ids are SE and partner material: not for executive mode or a viewer without access.
  const technical = !executiveMode && access.canWork;
  const factFrom = useSummaryFact();
  const assessment = useAssessment();
  const { reads, index, signals } = assessment;
  const [lens, setLens] = useState<Lens>('general');
  const historyState = useAssessmentHistory();
  const [compareWith, setCompareWith] = useState<string | null>(null);

  const findings = findingsFor(lens, assessment.findings);
  const countIn = (cls: FindingClass, list: readonly AssessmentFinding[]) => list.filter((finding) => finding.cls === cls).length;
  const allFindingsRead = !assessment.isLoading;

  // ------------------------------------------------------------------ snapshot band
  const category = (name: string) => {
    if (reads.inventory.outcome !== 'ok') return null;
    const record = reads.inventory.records.find((entry) => str(entry, 'category') === name);
    return record === undefined ? 0 : num(record, 'value');
  };
  const bandItem = (key: string, labelKey: StringKey, value: number | null): SummaryItem => ({
    key,
    label: t(labelKey),
    fact: factFrom(reads.inventory, value),
    display: value === null ? undefined : formatNumber(value),
  });
  const band: SummaryItem[] = [
    bandItem('hosts', 'p.asm.band.hosts', category('Hosts')),
    bandItem('services', 'p.asm.band.services', category('Services')),
    bandItem('webApps', 'p.asm.band.webApps', category('Web applications')),
    bandItem('clusters', 'p.asm.band.clusters', category('Kubernetes clusters')),
    bandItem('synthetic', 'p.asm.band.synthetic', category('Synthetic monitors')),
    {
      key: 'findings',
      label: t('p.asm.band.findings'),
      fact: allFindingsRead
        ? derived(assessment.findings.length, reads.inventory.evidence, t('p.asm.band.findingsCalc'))
        : factFrom(reads.inventory, null),
      display: allFindingsRead ? formatNumber(assessment.findings.length) : undefined,
      detail: allFindingsRead
        ? t('p.asm.band.findingsDetail', {
            critical: formatNumber(countIn('critical', assessment.findings)),
            warning: formatNumber(countIn('warning', assessment.findings)),
          })
        : undefined,
    },
  ];

  // ------------------------------------------------------------------ the index
  const domains = domainOrderFor(lens, index.domains);
  const measuredDomains = index.domains.filter((domain) => domain.state.kind === 'measured');
  const applicableDomains = index.domains.filter((domain) => domain.state.kind !== 'not-applicable');
  const indexFact =
    index.value === null
      ? factFrom(reads.inventory, null)
      : derived(index.value, reads.inventory.evidence, t('p.asm.index.calc'));

  // ------------------------------------------------------------------ actions (one numbering for matrix and table)
  const actionable = findings
    .map((finding) => ({ finding, priority: priorityOf(finding) }))
    .filter((entry): entry is { finding: AssessmentFinding; priority: Priority } => entry.priority !== null)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const actionRows: PlanActionRow[] = actionable.map(({ finding, priority }, position) => ({
    rank: position + 1,
    priority,
    rule: finding.rule,
    title: finding.title,
    action: finding.recommendation,
    capability: finding.capability,
    capabilityKey: finding.capabilityKey,
    evidence: finding.evidence.join(', '),
    drilldown: finding.drilldown,
  }));
  const planState = useActionPlan();
  // ------------------------------------------------------------------ summary (fixed sentences, measured figures)
  const summary: string[] = [];
  const hosts = category('Hosts');
  const services = category('Services');
  const apps = category('Web applications');
  if (hosts !== null && services !== null && apps !== null) {
    summary.push(t('p.asm.summary.estate', { hosts: formatNumber(hosts), services: formatNumber(services), apps: formatNumber(apps) }));
  }
  if (!assessment.isLoading) {
    summary.push(
      index.value !== null
        ? t('p.asm.summary.index', { index: formatNumber(index.value), domains: formatNumber(measuredDomains.length) })
        : t('p.asm.summary.noIndex', { read: formatNumber(measuredDomains.length), total: formatNumber(applicableDomains.length) }),
    );
    summary.push(
      t('p.asm.summary.findings', {
        critical: formatNumber(countIn('critical', assessment.findings)),
        warning: formatNumber(countIn('warning', assessment.findings)),
        opportunity: formatNumber(countIn('opportunity', assessment.findings)),
        strength: formatNumber(countIn('strength', assessment.findings)),
      }),
    );
    const firstAction = assessment.findings.find((finding) => priorityOf(finding) !== null && finding.kind === 'finding');
    if (firstAction !== undefined) summary.push(t('p.asm.summary.first', { title: firstAction.title }));
    const strength = assessment.findings.find((finding) => finding.cls === 'strength');
    if (strength !== undefined) summary.push(t('p.asm.summary.strength', { title: strength.title }));
    const unread = applicableDomains.filter((domain) => domain.state.kind === 'unavailable');
    if (unread.length > 0) summary.push(t('p.asm.summary.unread', { domains: unread.map((domain) => t(DOMAIN_LABEL[domain.id])).join(', ') }));
  }

  const readAt = reads.inventory.evidence.collectedAt;
  const queryEntries = [...new Set(index.domains.flatMap((domain) => domain.queryIds))].map((id) => getQuery(id as Parameters<typeof getQuery>[0]));

  // ------------------------------------------------------------------ 3.4.1: platform usage, dependencies, guide, method
  const adoptionCount = (state: string) => assessment.adoption.filter((row) => row.state === state).length;
  const topology = signals.topology;
  const hubBars = (topology?.hubs ?? [])
    .filter((hub) => hub.callers > 0)
    .map((hub, position) => ({ key: `${hub.name}-${position}`, label: hub.name, value: hub.callers, display: t('p.asm.deps.callers', { count: formatNumber(hub.callers) }) }));
  const guideRows = findings.filter((finding) => finding.kind === 'finding' || finding.cls !== 'strength');
  const methodReads = (Object.values(reads) as CatalogQueryResult[]).filter(
    (result, position, all) => all.findIndex((other) => other.entry.id === result.entry.id) === position,
  );

  // ------------------------------------------------------------------ 3.4.2: before × after, JSON
  const windowShown = tWindow(timeframeLabel);
  const appVersion = installedVersion();
  const snapshotNow =
    readAt === undefined || assessment.isLoading
      ? null
      : toSnapshot(
          { index, adoption: assessment.adoption, findings: assessment.findings },
          { readAt, savedAt: readAt, savedBy: access.identity.known ? access.identity.email : null, appVersion, window: windowShown },
        );
  const kept = historyState.history.snapshots;
  const chosen = kept.find((entry) => entry.readAt === compareWith) ?? null;
  const comparison = chosen !== null && snapshotNow !== null ? compareSnapshots(chosen, snapshotNow) : null;
  const keepReading = () => {
    if (snapshotNow === null) return;
    void historyState.save({ ...snapshotNow, savedAt: new Date().toISOString() });
  };
  const downloadJson = () => {
    const file = buildAssessmentFile(
      { index, adoption: assessment.adoption, findings: assessment.findings, reads: Object.values(reads) as CatalogQueryResult[] },
      {
        appVersion,
        generatedAt: new Date().toISOString(),
        customer: parameters.customerName,
        engagement: parameters.engagementName,
        lens,
        window: { label: windowShown, startIso: resolvedTimeframe.startIso, endIso: resolvedTimeframe.endIso },
      },
    );
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(file, null, 2)}\n`], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = assessmentFileName(parameters.customerName, new Date());
    anchor.click();
    // Revoked a moment later: an immediate revoke can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const partnerLogo = isSafeImageDataUrl(parameters.partnerLogoDataUrl) ? parameters.partnerLogoDataUrl : null;
  const customerLogo = isSafeImageDataUrl(parameters.customerLogoDataUrl) ? parameters.customerLogoDataUrl : null;

  // ------------------------------------------------------------------ 3.4.3: the assessment at a glance
  const adoptionIn = (state: string) => assessment.adoption.filter((row) => row.state === state);
  const established = assessment.practices.filter((practice) => practice.state === 'established').length;
  const loadingValue = '—';
  const execKpis = [
    {
      key: 'coverage',
      label: t('asm.radar.centre'),
      value: assessment.isLoading || index.value === null ? loadingValue : formatNumber(index.value),
      detail: index.value === null ? t('p.asm.index.notCalculated') : t(bandOf(index.value)),
    },
    {
      // 3.7.9: the value events the PoC demonstrated (the Value cycle), in place of the maturity step — a number that only grows.
      key: 'valueEvents',
      label: t('cycle.kpi.label'),
      value: assessment.isLoading ? loadingValue : formatNumber(assessment.valueCycle.total),
      detail: t('cycle.kpi.detail'),
    },
    {
      key: 'capabilities',
      label: t('asm.exec.capabilities'),
      value: assessment.isLoading ? loadingValue : `${formatNumber(adoptionIn('in-use').length)}/${formatNumber(assessment.adoption.length)}`,
      detail: t('asm.exec.capabilitiesDetail', { room: formatNumber(adoptionIn('room').length), none: formatNumber(adoptionIn('not-detected').length) }),
    },
    {
      key: 'sre',
      label: t('asm.exec.sre'),
      value: assessment.isLoading ? loadingValue : `${formatNumber(established)}/${formatNumber(assessment.practices.length)}`,
      detail: t('asm.exec.sreDetail'),
    },
    {
      key: 'findings',
      label: t('asm.exec.findings'),
      value: assessment.isLoading ? loadingValue : formatNumber(countIn('critical', assessment.findings)),
      detail: t('asm.exec.findingsDetail', {
        warning: formatNumber(countIn('warning', assessment.findings)),
        opportunity: formatNumber(countIn('opportunity', assessment.findings)),
      }),
    },
  ];
  // Achievements and gaps, each line with what it is (a strength, a capability in use, a critical or attention
  // finding, a capability not detected yet): the marker and the words say it, never the colour alone.
  type GlanceLine = { text: string; kind: 'strength' | 'inUse' | 'critical' | 'warning' | 'notDetected' };
  const wins: GlanceLine[] = assessment.isLoading
    ? []
    : [
        ...assessment.findings.filter((finding) => finding.cls === 'strength').map((finding) => ({ text: finding.title, kind: 'strength' as const })),
        ...adoptionIn('in-use').map((row) => ({ text: t('asm.exec.inUse', { name: t(CAPABILITY_LABEL[row.id]) }), kind: 'inUse' as const })),
      ];
  const gaps: GlanceLine[] = assessment.isLoading
    ? []
    : [
        ...assessment.findings
          .filter((finding) => (finding.cls === 'critical' || finding.cls === 'warning') && finding.kind === 'finding')
          .map((finding) => ({ text: finding.title, kind: finding.cls === 'critical' ? ('critical' as const) : ('warning' as const) })),
        ...adoptionIn('not-detected').map((row) => ({ text: t('asm.exec.notDetected', { name: t(CAPABILITY_LABEL[row.id]) }), kind: 'notDetected' as const })),
      ];
  const GLANCE_SHOWN = 5;
  // The quick wins (high impact, low effort), by their number in the actions table: where to start.
  const quickWins = actionable
    .map(({ finding }, position) => ({ finding, rank: position + 1 }))
    .filter(({ finding }) => finding.impactLevel === 'high' && finding.effort === 'low')
    .map(({ rank }) => rank);

  return (
    <Stack gap="section">
      {/* 3.4.1: the page prints as a report, with the SE Report's print rules (the Coverage report since 3.4.12). */}
      <style>{PRINT_STYLES}</style>
      {/* On screen the page intro; on paper the report's cover (the SE Report's banner), as in the SE Report. */}
      <div data-print-hide>
        <SectionIntro titleKey="p.asm.title" questionKey="p.asm.question" takeawayKey="p.asm.takeaway" />
      </div>
      <div className="pvs-print-only" data-print-section>
        <HeroBanner
          windowLabel={tWindow(timeframeLabel)}
          asOfIso={readAt}
          title={parameters.customerName.trim() === '' ? t('p.asm.report.titleAnon') : t('p.asm.report.title', { customer: parameters.customerName })}
          subtitle={t('p.asm.question')}
          headingAs="h1"
        />
        {/* 3.4.2 (F-10): the partner beside the customer on the cover, as on the SE Report. */}
        {(partnerLogo !== null || parameters.partnerName.trim() !== '') && (
          <Panel pad="roomy" data-testid="asm-cobrand">
            <Cluster justify="between" gap="section">
              {customerLogo !== null && (
                <img
                  className="pvs-hero__logo"
                  src={customerLogo}
                  alt={parameters.customerName === '' ? t('c.hero.customerLogoAlt') : t('c.hero.namedLogoAlt', { name: parameters.customerName })}
                />
              )}
              <Cluster gap="group">
                <Text className="pvs-label">{t('report.partner.label')}</Text>
                {partnerLogo !== null ? (
                  <img
                    className="pvs-hero__logo"
                    src={partnerLogo}
                    alt={parameters.partnerName === '' ? t('report.partner.logoAlt') : t('report.partner.namedLogoAlt', { name: parameters.partnerName })}
                  />
                ) : (
                  <Strong>{parameters.partnerName}</Strong>
                )}
              </Cluster>
            </Cluster>
          </Panel>
        )}
      </div>

      {/* 1 — whose assessment, which window, how much of it was read; the lens. */}
      <Panel as="section" pad="roomy" data-testid="asm-header" data-print-atom>
        <Stack gap="group">
          <div className="pvs-asm-head">
            <div className="pvs-asm-head__facts">
              {parameters.customerName.trim() !== '' && (
                <span className="pvs-asm-head__fact">
                  <span className="pvs-asm-head__label">{t('p.asm.header.environment')}</span>
                  <span className="pvs-asm-head__value">
                    {parameters.engagementName.trim() === '' ? parameters.customerName : `${parameters.customerName} · ${parameters.engagementName}`}
                  </span>
                </span>
              )}
              {parameters.partnerName.trim() !== '' && (
                <span className="pvs-asm-head__fact">
                  <span className="pvs-asm-head__label">{t('p.asm.pdf.preparedBy')}</span>
                  <span className="pvs-asm-head__value">{parameters.partnerName}</span>
                </span>
              )}
              <span className="pvs-asm-head__fact">
                <span className="pvs-asm-head__label">{t('p.asm.pdf.lens')}</span>
                <span className="pvs-asm-head__value">{t(LENS_LABEL[lens])}</span>
              </span>
              <span className="pvs-asm-head__fact">
                <span className="pvs-asm-head__label">{t('p.asm.header.window')}</span>
                <span className="pvs-asm-head__value">
                  {tWindow(timeframeLabel)}
                  {readAt === undefined ? '' : ` · ${formatDateTime(readAt)}`}
                </span>
              </span>
            </div>
            <Chip color={assessment.isLoading ? 'neutral' : 'primary'} variant="accent" size="condensed" data-testid="asm-sources">
              {assessment.isLoading
                ? t('p.asm.header.reading')
                : t('p.asm.header.sources', { read: formatNumber(assessment.sourcesRead), total: formatNumber(assessment.sourcesTotal) })}
            </Chip>
          </div>
          <Stack gap="tight" data-print-hide>
            <Text id="asm-lens-label">{t('p.asm.lens.label')}</Text>
            {/* A select, not a toggle group: six lenses fit on every width without an unnamed overflow button. */}
            <div className="pvs-asm-lens">
              <Select
                value={lens}
                onChange={(value) => {
                  if (typeof value === 'string' && (LENSES as readonly string[]).includes(value)) setLens(value);
                }}
                aria-labelledby="asm-lens-label"
              >
                <Select.Content>
                  {LENSES.map((entry) => (
                    <Select.Option key={entry} value={entry}>
                      {t(LENS_LABEL[entry])}
                    </Select.Option>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Text className="pvs-caption">{t('p.asm.lens.note')}</Text>
          </Stack>
          <div className="pvs-asm-head" data-print-hide>
            <Text className="pvs-caption">{t('p.asm.pdf.hint')}</Text>
            <Cluster gap="tight">
              {technical && (
                <Button onClick={downloadJson} disabled={assessment.isLoading} data-testid="asm-json" title={t('p.asm.json.hint')}>
                  <Button.Prefix>
                    <DownloadIcon />
                  </Button.Prefix>
                  {t('p.asm.json.button')}
                </Button>
              )}
              <Button variant="emphasized" onClick={() => window.print()} data-testid="asm-pdf">
                <Button.Prefix>
                  <DownloadIcon />
                </Button.Prefix>
                {t('p.asm.pdf.button')}
              </Button>
            </Cluster>
          </div>
        </Stack>
      </Panel>


      {/* 3.4.3 — five tabs keep the page short on screen; on paper every tab prints, in order, under its title. */}
      <div className="pvs-asm-tabs" data-testid="asm-tabs">
        <Tabs defaultIndex={0}>
          <Tab title={t('asm.tab.summary')} keepMounted>
            <Stack gap="section">
          <Heading level={2} as="h2" className="pvs-asm-tabtitle">
            {t('asm.tab.summary')}
          </Heading>
          {/* 3.4.3 — the assessment at a glance: coverage, maturity, platform usage, SRE practices and findings. */}
          <Panel as="section" pad="roomy" data-testid="asm-exec" data-print-section>
            <Stack gap="group">
              <Heading level={3} as="h2">
                {t('asm.exec.title')}
              </Heading>
              <div className="pvs-asm-exec" data-print-atom>
                {execKpis.map((kpi) => (
                  <div key={kpi.key} className="pvs-asm-exec__kpi" data-testid={`asm-exec-${kpi.key}`}>
                    <span className="pvs-asm-exec__label">{kpi.label}</span>
                    <span className="pvs-asm-exec__value">{kpi.value}</span>
                    <span className="pvs-asm-exec__detail">{kpi.detail}</span>
                  </div>
                ))}
              </div>
              {/* 3.4.5: one grid instead of loose blocks — the radar on the left, what is going well and what to
                  work on beside it, each line marked by what it is. The radar labels carry each domain's reading,
                  so the separate list of domains is gone (it repeated them). */}
              <div className="pvs-asm-glance" data-testid="asm-glance">
                <div className="pvs-asm-glance__radar" data-print-atom data-testid="asm-radar-row">
                  <Heading level={4} as="h3">
                    {t('asm.radar.title')}
                  </Heading>
                  <Text className="pvs-caption">{t('asm.radar.caption')}</Text>
                  {/* 3.4.10: radial bars after the owner's reference images; the radar's axes stay for the capture's option. */}
                  <RadialBars
                    bars={radialBarsFor(index, t)}
                    ariaLabel={t('asm.radar.title')}
                    centre={index.value === null ? undefined : { value: formatNumber(index.value), label: t('asm.radar.centre'), band: t(bandOf(index.value)) }}
                    ringsLabel={t('asm.radar.rings')}
                  />
                </div>
                <div className="pvs-asm-glance__lists">
                  {(
                    [
                      ['wins', 'asm.exec.wins', wins],
                      ['gaps', 'asm.exec.gaps', gaps],
                    ] as const
                  ).map(([kind, labelKey, list]) => (
                    <section key={kind} className="pvs-asm-wins__box" data-kind={kind} data-print-atom data-testid={`asm-exec-${kind}`} aria-label={t(labelKey, { count: formatNumber(list.length) })}>
                      <div className="pvs-asm-wins__head">
                        <Heading level={4} as="h3">
                          {t(kind === 'wins' ? 'asm.exec.winsTitle' : 'asm.exec.gapsTitle')}
                        </Heading>
                        <span className="pvs-asm-wins__count">{assessment.isLoading ? '…' : formatNumber(list.length)}</span>
                      </div>
                      {list.length === 0 ? (
                        <Text className="pvs-caption">{assessment.isLoading ? t('p.asm.gap.loading') : t('p.asm.hist.none')}</Text>
                      ) : (
                        <ul className="pvs-asm-wins__list">
                          {list.slice(0, GLANCE_SHOWN).map((line) => (
                            <li key={line.text} className="pvs-asm-wins__item" data-kind={line.kind}>
                              <span className="pvs-asm-wins__mark" aria-hidden="true" />
                              <span className="pvs-asm-wins__text">{line.text}</span>
                              <span className="pvs-asm-wins__tag">{t(`asm.exec.kind.${line.kind}` as StringKey)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {list.length > GLANCE_SHOWN && (
                        <Text className="pvs-caption">{t(kind === 'wins' ? 'asm.exec.moreWins' : 'asm.exec.moreGaps', { count: formatNumber(list.length - GLANCE_SHOWN) })}</Text>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            </Stack>
          </Panel>

          {/* 3.7.9 — the Autonomous Value Cycle, in place of the maturity journey (the owner's CVA framework). */}
          <Panel as="section" pad="roomy" data-print-section data-testid="asm-value-cycle">
            <Stack gap="group">
              <Heading level={3} as="h2">
                {t('cycle.title')}
              </Heading>
              <Text className="pvs-caption">{t('cycle.caption')}</Text>
              {assessment.isLoading ? (
                <Text>{t('p.asm.gap.loading')}</Text>
              ) : (
                <ValueCycle
                  reading={assessment.valueCycle}
                  t={t}
                  formatNumber={formatNumber}
                  showServices={technical}
                  target={pocPlan.autonomyTarget ?? null}
                  {...(technical ? { onTarget: (rung: AutonomyRung | null) => setPocPlan(withTarget(pocPlan, rung)) } : {})}
                />
              )}
            </Stack>
          </Panel>
            {/* 2 — the snapshot: what the model holds, and the observable-coverage index beside its domains. */}
            <div data-print-atom>
              <PageSummary items={band} footnote={t('p.asm.band.footnote')} />
            </div>

            {/* 8 — the assessment in a few lines, from the measured figures with fixed sentences. */}
            {summary.length > 0 && (
              <Panel as="section" pad="roomy" data-testid="asm-summary" data-print-section>
                <Stack gap="group">
                  <Heading level={3} as="h2">
                    {t('p.asm.summary.title')}
                  </Heading>
                  <Text className="pvs-caption">{t('p.asm.summary.caption')}</Text>
                  <ul className="pvs-asm-summary">
                    {summary.map((sentence) => (
                      <li key={sentence}>
                        <Text>{sentence}</Text>
                      </li>
                    ))}
                  </ul>
                </Stack>
              </Panel>
            )}

            </Stack>
          </Tab>
          {/* 3.4.12 (owner's order of 2026-11-19): the Assessment and the old Coverage page are one page,
              "Coverage"; what the old page showed — what Dynatrace maps here — is this tab. */}
          <Tab title={t('asm.tab.mapped')} keepMounted>
            <div data-testid="asm-mapped">
              <CoverageInventory />
            </div>
          </Tab>
          {/* 3.6.4 (visual proposal v3/v4): the depth of the coverage, host by host. */}
          <Tab title={t('asm.tab.depth')} keepMounted>
            <DepthMap />
          </Tab>
          <Tab title={t('asm.tab.coverage')} keepMounted>
            <Stack gap="section">
          <Heading level={2} as="h2" className="pvs-asm-tabtitle">
            {t('asm.tab.coverage')}
          </Heading>
            <RingRankPanel
              data-testid="asm-index"
              title={t('p.asm.index.title')}
              caption={t('p.asm.index.caption')}
              ring={{
                family: 'blue',
                value: index.value,
                valueDisplay: index.value === null ? undefined : formatNumber(index.value),
                label: t('p.asm.index.ring'),
                caption:
                  index.value === null
                    ? t('p.asm.index.notCalculated')
                    : t('p.asm.index.ringCaption', { measured: formatNumber(index.measuredWeight), applicable: formatNumber(index.applicableWeight) }),
                ariaLabel: t('p.asm.index.aria'),
                missingLabel: t('p.asm.index.notCalculated'),
                fact: indexFact,
              }}
            >
              <DomainList domains={domains} focus={(id) => isLensDomain(lens, id)} ariaLabel={t('p.asm.index.title')} t={t} formatNumber={formatNumber} />
              {index.missing === 'insufficient' && !assessment.isLoading && (
                <Callout kind="limitation" title={t('p.asm.index.notCalculated')}>
                  {t('p.asm.index.insufficient', { min: String(assumed('assessment.minWeight')) })}
                </Callout>
              )}
              {index.missing === 'nothing-applies' && <Text>{t('p.asm.index.nothing')}</Text>}
            </RingRankPanel>

            {/* 3.4.1 — how each Dynatrace capability is used here. */}
            <Panel as="section" pad="roomy" data-testid="asm-adoption" data-print-section>
              <Stack gap="group">
                <Heading level={3} as="h2">
                  {t('p.asm.adoption.title')}
                </Heading>
                <Text className="pvs-caption">{t('p.asm.adoption.caption')}</Text>
                {assessment.isLoading ? (
                  <Text>{t('p.asm.gap.loading')}</Text>
                ) : (
                  <>
                    <Text>
                      {t('p.asm.adoption.summary', {
                        inUse: formatNumber(adoptionCount('in-use')),
                        room: formatNumber(adoptionCount('room')),
                        none: formatNumber(adoptionCount('not-detected')),
                        unread: formatNumber(adoptionCount('unread')),
                      })}
                    </Text>
                    <AdoptionList rows={assessment.adoption} showEvidence={technical} ariaLabel={t('p.asm.adoption.title')} t={t} />
                  </>
                )}
              </Stack>
            </Panel>

            {/* How the index is calculated — the formula, the weights and the points of each domain. */}
            <Panel as="section" pad="roomy" data-testid="asm-formula" data-print-section>
              <Stack gap="group">
                <Heading level={3} as="h2">
                  {t('p.asm.formula.title')}
                </Heading>
                <Paragraph className="pvs-prose">{t('p.asm.formula.body', { min: String(assumed('assessment.minWeight')) })}</Paragraph>
                <div className="pvs-asm-table-wrap">
                  <table className="pvs-asm-table" data-testid="asm-formula-table">
                    <thead>
                      <tr>
                        <th scope="col">{t('p.asm.formula.domain')}</th>
                        <th scope="col">{t('p.asm.formula.reading')}</th>
                        <th scope="col" data-num>
                          {t('p.asm.formula.share')}
                        </th>
                        <th scope="col" data-num>
                          {t('p.asm.formula.weightCol')}
                        </th>
                        <th scope="col" data-num>
                          {t('p.asm.formula.points')}
                        </th>
                        {technical && <th scope="col">{t('p.asm.formula.sources')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {index.domains.map((domain) => (
                        <tr key={domain.id}>
                          <th scope="row">{t(DOMAIN_LABEL[domain.id])}</th>
                          <td>{domainLine(domain, t, formatNumber)}</td>
                          <td data-num>{domain.state.kind === 'measured' ? shareDisplay(domain.state.share) : '—'}</td>
                          <td data-num>{formatNumber(domain.weight)}</td>
                          <td data-num>{domain.contribution === null ? '—' : decimal(domain.contribution, 1)}</td>
                          {technical && <td data-code>{domain.queryIds.join(', ')}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div data-print-hide>
                  <DqlDisclosure entries={queryEntries} />
                </div>
              </Stack>
            </Panel>

            </Stack>
          </Tab>
          <Tab title={t('asm.tab.sre')} keepMounted>
            <Stack gap="section">
          <Heading level={2} as="h2" className="pvs-asm-tabtitle">
            {t('asm.tab.sre')}
          </Heading>
          {/* 3.4.3 — the state of SRE and platform engineering here. */}
          <Panel as="section" pad="roomy" data-testid="asm-sre-panel" data-print-section>
            <Stack gap="group">
              <Heading level={3} as="h2">
                {t('asm.sre.title')}
              </Heading>
              <Text className="pvs-caption">{t('asm.sre.caption')}</Text>
              {assessment.isLoading ? (
                <Text>{t('p.asm.gap.loading')}</Text>
              ) : (
                <>
                  <Text>
                    {t('asm.sre.summary', {
                      established: formatNumber(assessment.practices.filter((practice) => practice.state === 'established').length),
                      total: formatNumber(assessment.practices.length),
                    })}
                  </Text>
                  <PracticeList practices={assessment.practices} showEvidence={technical} ariaLabel={t('asm.sre.title')} t={t} />
                </>
              )}
            </Stack>
          </Panel>
            {/* 4 (3.4.1) — how the services connect: hubs and services without calls, from the entity model. */}
            {!executiveMode && topology !== null && topology.services > 0 && (
              <Panel as="section" pad="roomy" data-testid="asm-dependencies" data-print-section>
                <Stack gap="group">
                  <Heading level={3} as="h2">
                    {t('p.asm.deps.title')}
                  </Heading>
                  <Text className="pvs-caption">
                    {t('p.asm.deps.caption', { top: formatNumber(topology.hubs.length), services: formatNumber(topology.services) })}
                  </Text>
                  <div className="pvs-asm-head__facts" data-print-atom>
                    <span className="pvs-asm-head__fact">
                      <span className="pvs-asm-head__label">{t('p.asm.deps.services')}</span>
                      <span className="pvs-asm-head__value">{formatNumber(topology.services)}</span>
                    </span>
                    <span className="pvs-asm-head__fact">
                      <span className="pvs-asm-head__label">{t('p.asm.deps.isolated')}</span>
                      <span className="pvs-asm-head__value">{formatNumber(topology.isolated)}</span>
                    </span>
                    <span className="pvs-asm-head__fact">
                      <span className="pvs-asm-head__label">{t('p.asm.deps.db')}</span>
                      <span className="pvs-asm-head__value">{formatNumber(topology.dbServices)}</span>
                    </span>
                  </div>
                  {hubBars.length > 0 && (
                    <div data-print-atom>
                      <BarList role="magnitude" ariaLabel={t('p.asm.deps.hubs')} items={hubBars} />
                    </div>
                  )}
                </Stack>
              </Panel>
            )}

            </Stack>
          </Tab>
          <Tab title={t('asm.tab.findings')} keepMounted>
            <Stack gap="section">
          <Heading level={2} as="h2" className="pvs-asm-tabtitle">
            {t('asm.tab.findings')}
          </Heading>
            {/* 6 — the findings, by class. */}
            <Panel as="section" pad="roomy" data-testid="asm-findings" data-print-section>
              <Stack gap="group">
                <Heading level={3} as="h2">
                  {t('p.asm.findings.title')}
                </Heading>
                <Text className="pvs-caption">{t('p.asm.findings.caption')}</Text>
                {/* One block per class, the cards side by side within it: a class reads as a group, and a
                    long finding does not stretch three empty columns beside it. */}
                {CLASS_ORDER.map((cls) => {
                  const inClass = findings.filter((finding) => finding.cls === cls);
                  return (
                    <section key={cls} className="pvs-asm-class" data-class={cls} aria-label={t(CLASS_LABEL[cls])}>
                      <div className="pvs-asm-class__head">
                        <Heading level={4} as="h3">
                          {t(CLASS_LABEL[cls])}
                        </Heading>
                        <span className="pvs-asm-class__count">{assessment.isLoading ? '…' : formatNumber(inClass.length)}</span>
                      </div>
                      {inClass.length === 0 ? (
                        <Text className="pvs-caption">{assessment.isLoading ? t('p.asm.gap.loading') : t('p.asm.class.none')}</Text>
                      ) : (
                        <div className="pvs-asm-cards">
                          {inClass.map((finding) => (
                            <FindingCard key={finding.rule} finding={finding} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </Stack>
            </Panel>

            {/* 7 — risks and opportunities, numbered as the actions below. */}
            {actionable.length > 0 && (
              <Panel as="section" pad="roomy" data-testid="asm-matrix" data-print-section>
                {/* The heading, its caption and the matrix stay together on paper. */}
                <Stack gap="group" data-print-atom>
                  <Heading level={3} as="h2">
                    {t('p.asm.matrix.title')}
                  </Heading>
                  <Text className="pvs-caption">{t('p.asm.matrix.caption')}</Text>
                  {quickWins.length > 0 && (
                    <Text data-testid="asm-heat-start">
                      {t('asm.heat.start', { count: formatNumber(quickWins.length), ranks: quickWins.map((rank) => `#${rank}`).join(', ') })}
                    </Text>
                  )}
                  <ImpactHeatmap
                    caption={t('p.asm.matrix.title')}
                    items={actionable.map(({ finding }, position) => ({
                      key: finding.rule,
                      rank: position + 1,
                      title: finding.title,
                      impact: finding.impactLevel,
                      effort: finding.effort,
                    }))}
                    labels={{
                      impact: t('roadmap.impact'),
                      effort: t('roadmap.effort'),
                      level: { high: t('qual.high'), medium: t('qual.medium'), low: t('qual.low') },
                      zone: {
                        quickWins: t('opp.matrix.quickWins'),
                        strategic: t('asm.heat.strategic'),
                        fillIns: t('asm.heat.fillIns'),
                        reconsider: t('asm.heat.reconsider'),
                        plan: t('asm.heat.plan'),
                      },
                      hint: {
                        quickWins: t('asm.heat.hint.quickWins'),
                        strategic: t('asm.heat.hint.strategic'),
                        fillIns: t('asm.heat.hint.fillIns'),
                        reconsider: t('asm.heat.hint.reconsider'),
                        plan: t('asm.heat.hint.plan'),
                      },
                      count: (count) => t('asm.heat.count', { count: formatNumber(count) }),
                      more: (count) => t('asm.heat.more', { count: formatNumber(count) }),
                      legend: t('asm.heat.legend'),
                    }}
                  />
                </Stack>
              </Panel>
            )}

            {/* 9 — the recommended actions, P1 to P3. */}
            <Panel as="section" pad="roomy" data-testid="asm-actions" data-print-section>
              <Stack gap="group">
                <Heading level={3} as="h2">
                  {t('p.asm.actions.title')}
                </Heading>
                <Text className="pvs-caption">{t('p.asm.actions.caption')}</Text>
                {/* 3.4.3: the plan in horizons and the shortlist live on their own pages, not repeated here. */}
                <Text className="pvs-caption" data-print-hide>
                  {t('xref.fromAssessment')}{' '}
                  <Link as={RouterLink} to="/opportunities?tab=plan">
                    {t('nav.roadmap')}
                  </Link>
                  {' · '}
                  <Link as={RouterLink} to="/opportunities">
                    {t('nav.opportunities')}
                  </Link>
                </Text>
                {actionRows.length === 0 ? (
                  <Text>{assessment.isLoading ? t('p.asm.gap.loading') : t('p.asm.actions.none')}</Text>
                ) : (
                  <ActionPlanTable
                    rows={actionRows}
                    state={planState}
                    editable={technical}
                    technical={technical}
                    customerName={parameters.customerName}
                    t={t}
                    formatNumber={formatNumber}
                    formatDay={formatDay}
                  />
                )}
              </Stack>
            </Panel>

            {/* 3.4.1 — the conversation guide; 3.4.9 (F-08) — by audience. SE and partner only; printed on request. */}
            {technical && guideRows.length > 0 && (
              <PersonaGuide findings={findings} signals={signals} index={index} valueEvents={assessment.isLoading ? null : assessment.valueCycle.total} t={t} formatNumber={formatNumber} />
            )}

            </Stack>
          </Tab>
          <Tab title={t('asm.tab.history')} keepMounted>
            <Stack gap="section">
          <Heading level={2} as="h2" className="pvs-asm-tabtitle">
            {t('asm.tab.history')}
          </Heading>
            {/* 3.4.2 (F-01) — before and after: keep this reading, compare a later one with it. The controls
                are the SE's and the partner's; a chosen comparison prints with the report. */}
            {(technical || comparison !== null) && (
              <Panel as="section" pad="roomy" data-testid="asm-history" data-print-section={comparison === null ? undefined : true} data-print-hide={comparison === null ? true : undefined}>
                <Stack gap="group">
                  <Heading level={3} as="h2">
                    {t('p.asm.hist.title')}
                  </Heading>
                  <Text className="pvs-caption">{t('p.asm.hist.caption')}</Text>
                  {technical && (
                    <Stack gap="tight" data-print-hide>
                      <Cluster gap="group">
                        <Button onClick={keepReading} disabled={snapshotNow === null || historyState.status === 'saving' || historyState.status === 'offline' || historyState.status === 'forbidden'} data-testid="asm-hist-save">
                          {t('p.asm.hist.save')}
                        </Button>
                        {kept.length > 0 && (
                          <div className="pvs-asm-lens">
                            <Text id="asm-hist-label">{chosen === null ? t('p.asm.hist.choose') : t('p.asm.hist.compareWith')}</Text>
                            <Select
                              value={compareWith}
                              onChange={(value) => setCompareWith(typeof value === 'string' && value !== '' ? value : null)}
                              aria-labelledby="asm-hist-label"
                              clearable
                            >
                              <Select.Content>
                                {kept.map((entry) => (
                                  <Select.Option key={entry.readAt} value={entry.readAt}>
                                    {t('p.asm.hist.option', {
                                      date: formatDateTime(entry.readAt),
                                      window: entry.window,
                                      index: entry.index === null ? '—' : formatNumber(entry.index),
                                    })}
                                  </Select.Option>
                                ))}
                              </Select.Content>
                            </Select>
                          </div>
                        )}
                        {chosen !== null && (
                          <Button
                            variant="default"
                            onClick={() => {
                              void historyState.remove(chosen.readAt);
                              setCompareWith(null);
                            }}
                          >
                            {t('p.asm.hist.remove')}
                          </Button>
                        )}
                      </Cluster>
                      <Text className="pvs-caption" data-testid="asm-hist-status">
                        {historyState.status === 'ready'
                          ? kept.length === 0
                            ? t('p.asm.hist.empty')
                            : ''
                          : t(`p.asm.hist.status.${historyState.status}` as StringKey)}
                      </Text>
                    </Stack>
                  )}
                  {comparison !== null && chosen !== null && snapshotNow !== null && (
                    <ComparisonView before={chosen} now={snapshotNow} comparison={comparison} t={t} formatNumber={formatNumber} formatDateTime={formatDateTime} />
                  )}
                </Stack>
              </Panel>
            )}

            {/* 3.4.1 — the method and every source, with how each read went. */}
            <Panel as="section" pad="roomy" data-testid="asm-method" data-print-section>
              <Stack gap="group">
                <Heading level={3} as="h2">
                  {t('p.asm.method.title')}
                </Heading>
                <Paragraph className="pvs-prose">{t('p.asm.method.body')}</Paragraph>
                <div className="pvs-asm-table-wrap">
                  <table className="pvs-asm-table">
                    <thead>
                      <tr>
                        <th scope="col">{t('p.asm.method.query')}</th>
                        <th scope="col">{t('p.asm.method.purpose')}</th>
                        <th scope="col">{t('p.asm.method.state')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {methodReads.map((result) => (
                        <tr key={result.entry.id}>
                          <td data-code>{result.entry.id}</td>
                          <td>
                            {/* The hubs entry was written for the prints deck; here it reads the whole model over the page's window. */}
                            {result.entry.id === 'ev.topology.hubs' ? t('p.asm.method.purposeHubs') : t(`catalog.purpose.${result.entry.id}` as StringKey)}
                          </td>
                          <td data-num>{t(`p.asm.method.${result.outcome}` as StringKey)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Text className="pvs-caption">
                  {t('p.asm.pdf.footer', { version: installedVersion(), time: readAt === undefined ? '—' : formatDateTime(readAt) })}
                </Text>
              </Stack>
            </Panel>
            </Stack>
          </Tab>
        </Tabs>
      </div>
    </Stack>
  );
};
