import React, { useState } from 'react';

import { getDocumentLink } from '@dynatrace-sdk/navigation';
import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox, TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { AnalyticsIcon, ExternalLinkIcon } from '@dynatrace/strato-icons';

import { useAccess } from '../../config/AccessContext';
import { useDashboardBanner, useDashboardLogo } from './dashboardLogo';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { criterionPillar, type CriterionResult } from '../../models/criteria';
import { pillarById, type PillarId } from '../../models/pillars';
import { pocDay } from '../../models/pocPlan';
import { summariseRum } from '../../models/rum';
import { num } from '../../utils/records';
import { useCriteriaResults, useCriterionFormat, useCriterionWords } from '../criteria/CriteriaPanel';
import {
  DASHBOARD_SECTIONS,
  DASHBOARD_TILES,
  buildPocDashboard,
  classifyDashboardError,
  createPocDashboard,
  updatePocDashboard,
  type DashboardEvidence,
  type DashboardFailure,
  type DashboardGoal,
} from './pocDashboard';

/**
 * RETIRED FROM THE BUILDER in 3.7.1 (the owner: "podemos remover por momento o tile/dashboard do 'Valor da PoC' … mantenha
 * uma cópia de backup e futuramente marcar para remover"). Kept as the backup; TO BE REMOVED in a later release.
 */
/**
 * Settings → "Value of the PoC" dashboard (3.2.5, milestone M5), for the SE only.
 *
 * The SE sees what the dashboard will hold, names it, chooses whether the environment may read it,
 * and creates it with an explicit second click. The app never creates it on its own. Once created,
 * the same document is updated in place.
 */

type Phase = { kind: 'idle' } | { kind: 'confirm' } | { kind: 'busy' } | { kind: 'done'; created: boolean } | { kind: 'failed'; failure: DashboardFailure };

const FAILURE_KEY: Record<DashboardFailure, StringKey> = {
  forbidden: 'dash.failed.forbidden',
  missing: 'dash.failed.missing',
  conflict: 'dash.failed.conflict',
  error: 'dash.failed.error',
};

/** The link to a document in the platform, or null outside the runtime. */
function documentLink(id: string): string | null {
  try {
    return getDocumentLink(id);
  } catch {
    return null;
  }
}

const PILLAR_EMOJI: Record<PillarId, string> = { resilience: '🛡️', productivity: '⚙️', cost: '💰', agility: '⚡' };

const goalStatus = (result: CriterionResult): DashboardGoal['status'] =>
  result.status === 'met' || result.status === 'manual-met' ? 'met' : result.status === 'not-met' || result.status === 'manual-not-met' ? 'not-met' : 'open';

export const PocDashboardSection = () => {
  const { t, formatDateTime, formatDay, formatNumber } = useTranslation();
  const { parameters, pocPlan, setPocPlan, resolvedTimeframe } = useStudio();
  const scope = useQueryScope();
  const access = useAccess();
  const logo = useDashboardLogo();
  const banner = useDashboardBanner();
  const criteria = useCriteriaResults(pocPlan.criteria);
  const words = useCriterionWords();
  const shortWords = useCriterionWords({ short: true });
  const format = useCriterionFormat();
  // Only what the estate proves gets a section: real users, a readable posture, workflows that ran.
  const rum = useCatalogQuery('rum.scorecard', scope);
  const posture = useCatalogQuery('sec.posture', scope);
  const workflows = useCatalogQuery('auto.workflows.total', scope);
  const evidence = new Set<DashboardEvidence>([
    ...(summariseRum(rum.records, []).hasData ? (['experience'] as const) : []),
    ...(posture.outcome === 'ok' ? (['security'] as const) : []),
    ...((num(workflows.records[0], 'workflows') ?? 0) > 0 ? (['automation'] as const) : []),
  ]);
  const existing = pocPlan.dashboard;
  const customer = parameters.customerName.trim();
  const [name, setName] = useState(existing?.name ?? (customer === '' ? t('dash.defaultName') : t('dash.defaultNameNamed', { customer })));
  const [shared, setShared] = useState(existing?.shared ?? false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const tileTitle = (key: string) => t(`dash2.tile.${key}` as StringKey);
  const day = pocDay(pocPlan.startDate);
  const pillarName = (result: CriterionResult) => {
    const pillar = criterionPillar(result.criterion);
    const entry = pillar === null ? undefined : pillarById(pillar);
    return pillar === null || entry === undefined ? '—' : `${PILLAR_EMOJI[pillar]} ${t(entry.titleKey)}`;
  };
  const goals: DashboardGoal[] = criteria.map((result) => ({
    pillar: pillarName(result),
    text: shortWords(result),
    target:
      result.metric === null || result.criterion.target === null
        ? '—'
        : `${result.criterion.operator === '>=' ? '≥' : '≤'} ${format(result.criterion.target, result.metric.unit)}`,
    measured: result.metric !== null && result.value !== null ? format(result.value, result.metric.unit) : '—',
    status: goalStatus(result),
  }));
  // Next steps from the plan itself: each objective still open, then closing the PoC.
  const next = [
    ...criteria
      .filter((result) => goalStatus(result) !== 'met')
      .slice(0, 3)
      .map((result) => t('dash2.next.goal', { goal: shortWords(result) })),
    t('dash2.next.close'),
  ];
  const content = () =>
    buildPocDashboard({
      title: name.trim() === '' ? t('dash.defaultName') : name.trim(),
      logo,
      banner,
      intro: t('dash.intro', {
        engagement: parameters.engagementName.trim() === '' ? t('dash.noEngagement') : parameters.engagementName.trim(),
        at: formatDateTime(resolvedTimeframe.endIso),
      }),
      facts: [
        ...(parameters.customerName.trim() === '' ? [] : [{ label: t('dash2.fact.customer'), value: parameters.customerName.trim() }]),
        ...(pocPlan.startDate === null ? [] : [{ label: t('dash2.fact.start'), value: formatDay(pocPlan.startDate) }]),
        ...(pocPlan.endDate === null ? [] : [{ label: t('dash2.fact.end'), value: formatDay(pocPlan.endDate) }]),
        ...(day === null ? [] : [{ label: t('dash2.fact.day'), value: formatNumber(day) }]),
      ],
      question: t('dash2.question'),
      objectivesTitle: t('dash2.goals.title'),
      objectives: criteria.map(words),
      goals,
      goalHeaders: [t('dash2.goals.pillar'), t('dash2.goals.goal'), t('dash2.goals.target'), t('dash2.goals.measured'), t('dash2.goals.status')],
      goalStatus: { met: t('dash2.goals.met'), 'not-met': t('dash2.goals.notMet'), open: t('dash2.goals.open') },
      snapshot: t('dash2.goals.snapshot', { at: formatDateTime(new Date().toISOString()) }),
      sectionTitle: (section, index) => t(`dash2.section.${section}` as StringKey, { n: String(index) }),
      nextTitle: t('dash2.next.title'),
      next,
      footer: t('dash.footer'),
      tileTitle,
      evidence,
    });

  const run = async (mode: 'create' | 'update') => {
    setPhase({ kind: 'busy' });
    const finalName = (name.trim() === '' ? t('dash.defaultName') : name.trim()).slice(0, 128);
    try {
      if (mode === 'update' && existing !== null) {
        await updatePocDashboard(existing.id, content(), finalName, shared);
        setPocPlan({ ...pocPlan, dashboard: { ...existing, name: finalName, shared } });
        setPhase({ kind: 'done', created: false });
      } else {
        const id = await createPocDashboard(content(), finalName, shared);
        setPocPlan({
          ...pocPlan,
          dashboard: { id, name: finalName, createdAt: new Date().toISOString(), createdBy: access.identity.email || null, shared },
        });
        setPhase({ kind: 'done', created: true });
      }
    } catch (error) {
      setPhase({ kind: 'failed', failure: classifyDashboardError(error) });
    }
  };

  const link = existing === null ? null : documentLink(existing.id);

  return (
    <Panel pad="roomy">
      <Stack gap="group" className="pvs-d-form">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('dash.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('dash.body')}</Paragraph>
        </Stack>

        <Stack gap="tight">
          <Text className="pvs-label">{t('dash.preview')}</Text>
          <ol className="pvs-list">
            <li>
              <Text>{t('dash.preview.header')}</Text>
            </li>
            <li>
              <Text>{t('dash2.goals.title')}</Text>
            </li>
            {DASHBOARD_SECTIONS.filter((section) => (section !== 'experience' && section !== 'security' && section !== 'automation') || evidence.has(section)).map((section, index) => (
              <li key={section}>
                <Text>
                  {t(`dash2.section.${section}` as StringKey, { n: String(index + 2) })} —{' '}
                  {DASHBOARD_TILES.filter((tile) => tile.section === section)
                    .map((tile) => tileTitle(tile.key))
                    .join(' · ')}
                </Text>
              </li>
            ))}
            <li>
              <Text>{t('dash2.next.title')}</Text>
            </li>
          </ol>
          <Text className="pvs-caption">{t('dash.preview.note')}</Text>
        </Stack>

        <Stack gap="tight">
          <Text id="dash-name-label" className="pvs-label">
            {t('dash.name')}
          </Text>
          <TextInput value={name} onChange={(value) => setName(value.slice(0, 128))} aria-labelledby="dash-name-label" />
        </Stack>
        <Checkbox value={shared} onChange={(value) => setShared(value === true)}>
          <Text>{t('dash.shared')}</Text>
        </Checkbox>

        {existing !== null && (
          <Text>
            {t('dash.exists', { name: existing.name, at: existing.createdAt === '' ? '—' : formatDateTime(existing.createdAt) })}{' '}
            {link !== null && (
              <Link href={link} target="_blank" rel="noopener noreferrer">
                {t('dash.open')} <ExternalLinkIcon />
              </Link>
            )}
          </Text>
        )}

        {phase.kind === 'confirm' ? (
          <MessageContainer variant="warning">
            <MessageContainer.Title>{t('dash.confirm.title')}</MessageContainer.Title>
            <MessageContainer.Description>
              <Stack gap="tight">
                <Text>{shared ? t('dash.confirm.shared') : t('dash.confirm.private')}</Text>
                <Cluster>
                  <Button variant="accent" color="primary" onClick={() => void run('create')}>
                    {t('dash.confirm.go')}
                  </Button>
                  <Button onClick={() => setPhase({ kind: 'idle' })}>{t('dash.confirm.cancel')}</Button>
                </Cluster>
              </Stack>
            </MessageContainer.Description>
          </MessageContainer>
        ) : (
          <Cluster>
            {existing === null ? (
              <Button variant="emphasized" onClick={() => setPhase({ kind: 'confirm' })} disabled={phase.kind === 'busy'}>
                <Button.Prefix>
                  <AnalyticsIcon />
                </Button.Prefix>
                {t('dash.create')}
              </Button>
            ) : (
              <>
                <Button variant="emphasized" onClick={() => void run('update')} disabled={phase.kind === 'busy'}>
                  <Button.Prefix>
                    <AnalyticsIcon />
                  </Button.Prefix>
                  {t('dash.update')}
                </Button>
                <Button onClick={() => setPhase({ kind: 'confirm' })} disabled={phase.kind === 'busy'}>
                  {t('dash.createNew')}
                </Button>
              </>
            )}
            {phase.kind === 'busy' && (
              <Text role="status" className="pvs-caption">
                {t('dash.busy')}
              </Text>
            )}
          </Cluster>
        )}

        {phase.kind === 'done' && (
          <MessageContainer variant="success">
            <MessageContainer.Title>{phase.created ? t('dash.done.created') : t('dash.done.updated')}</MessageContainer.Title>
            <MessageContainer.Description>{t('dash.done.body')}</MessageContainer.Description>
          </MessageContainer>
        )}
        {phase.kind === 'failed' && (
          <MessageContainer variant="critical">
            <MessageContainer.Title>{t('dash.failed.title')}</MessageContainer.Title>
            <MessageContainer.Description>{t(FAILURE_KEY[phase.failure])}</MessageContainer.Description>
          </MessageContainer>
        )}
      </Stack>
    </Panel>
  );
};
