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
import { summariseRum } from '../../models/rum';
import { num, str } from '../../utils/records';
import { SPECIALTY_BLUEPRINTS, SPECIALTY_IDS, type SpecialtyId } from './blueprints';
import { buildDashboard, classifyDashboardError, createPocDashboard, updatePocDashboard, type DashboardEvidence, type DashboardFailure } from './pocDashboard';

/**
 * Settings → the three specialty dashboards (3.3.4), beside "Value of the PoC", for the SE only.
 *
 * Same contract as the PoC dashboard: the SE sees what each will hold, names it, chooses whether the
 * environment may read it, and creates it with an explicit second click — never on the app's own
 * (rule 10). Once created, the same document is updated in place; its reference lives in the PoC plan.
 */

type Phase = { kind: 'idle' } | { kind: 'confirm' } | { kind: 'busy' } | { kind: 'done'; created: boolean } | { kind: 'failed'; failure: DashboardFailure };

const FAILURE_KEY: Record<DashboardFailure, StringKey> = {
  forbidden: 'dash.failed.forbidden',
  missing: 'dash.failed.missing',
  conflict: 'dash.failed.conflict',
  error: 'dash.failed.error',
};

function documentLink(id: string): string | null {
  try {
    return getDocumentLink(id);
  } catch {
    return null;
  }
}

/** What this environment proves, so a section with nothing to show is left out. */
export function useDashboardEvidence(): Set<DashboardEvidence> {
  const scope = useQueryScope();
  const rum = useCatalogQuery('rum.scorecard', scope);
  const workflows = useCatalogQuery('auto.workflows.total', scope);
  const inventory = useCatalogQuery('cov.inventory', scope);
  const count = (pattern: RegExp) =>
    inventory.records.filter((row) => pattern.test(str(row, 'category') ?? '')).reduce((sum, row) => sum + (num(row, 'value') ?? 0), 0);
  return new Set<DashboardEvidence>([
    ...(summariseRum(rum.records, []).hasData ? (['experience'] as const) : []),
    ...((num(workflows.records[0], 'workflows') ?? 0) > 0 ? (['automation'] as const) : []),
    ...(count(/^Kubernetes clusters$/) > 0 ? (['kubernetes'] as const) : []),
    ...(count(/synthetic/i) > 0 ? (['synthetic'] as const) : []),
  ]);
}

export const SpecialtyDashboards = () => {
  const { t } = useTranslation();
  const evidence = useDashboardEvidence();
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('dash3.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('dash3.body')}</Paragraph>
        </Stack>
        {SPECIALTY_IDS.map((id) => (
          <SpecialtyCard key={id} id={id} evidence={evidence} />
        ))}
      </Stack>
    </Panel>
  );
};

export const SpecialtyCard = ({ id, evidence }: { id: SpecialtyId; evidence: ReadonlySet<DashboardEvidence> }) => {
  const { t, formatDateTime } = useTranslation();
  const { parameters, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const blueprint = SPECIALTY_BLUEPRINTS[id];
  const logo = useDashboardLogo();
  const banner = useDashboardBanner();
  const existing = pocPlan.specialtyDashboards?.[id] ?? null;
  const customer = parameters.customerName.trim();
  const dashboardName = t(`dash3.${id}.name` as StringKey);
  const defaultNameOf = (other: SpecialtyId) => {
    const base = t(`dash3.${other}.name` as StringKey);
    return customer === '' ? base : t('dash3.defaultName', { dashboard: base, customer });
  };
  // 3.7.3: a dashboard created in 3.6.6–3.7.2 may carry another kit's name (the card kept the previous one's); its own
  // default comes back, so "Update" corrects the name and the title.
  // 3.7.7: the overview's former name ("Visão geral do ambiente e SLOs" / "Environment overview and SLOs") gives way to the
  // new one the same way, so "Update" renames a dashboard created before.
  const formerName = id === 'overview' && existing !== null && /^(Visão geral do ambiente e SLOs|Environment overview and SLOs)( — |$)/.test(existing.name);
  const borrowed =
    formerName || (existing !== null && SPECIALTY_IDS.some((other) => other !== id && existing.name.endsWith(defaultNameOf(other))));
  const [name, setName] = useState(existing !== null && !borrowed ? existing.name : defaultNameOf(id));
  const [shared, setShared] = useState(existing?.shared ?? false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const sectionTitle = (section: string, index: number) => t(`dash3.section.${id}.${section}` as StringKey, { n: String(index) });
  const shownSections = blueprint.sections.filter((section) => {
    const needs = blueprint.sectionEvidence[section];
    return needs === undefined || evidence.has(needs);
  });

  const content = () =>
    buildDashboard(blueprint, {
      title: name.trim() === '' ? dashboardName : name.trim(),
      logo,
      banner,
      intro: t(`dash3.${id}.audience` as StringKey),
      question: t(`dash3.${id}.question` as StringKey),
      objectivesTitle: '',
      objectives: [],
      sectionTitle,
      footer: t('dash3.footer'),
      tileTitle: (key) => t(`dash2.tile.${key}` as StringKey),
      evidence: new Set(evidence),
      // 3.7.1: the overview draws the SLOs the PoC created; until then a note says where to create them.
      slos: (pocPlan.slos ?? []).map((slo) => ({ id: slo.id, name: slo.name, kind: slo.kind })),
      sloNone: t('dash3.sloNone'),
    });

  const run = async (mode: 'create' | 'update') => {
    setPhase({ kind: 'busy' });
    const finalName = (name.trim() === '' ? dashboardName : name.trim()).slice(0, 128);
    try {
      if (mode === 'update' && existing !== null) {
        await updatePocDashboard(existing.id, content(), finalName, shared);
        setPocPlan({ ...pocPlan, specialtyDashboards: { ...pocPlan.specialtyDashboards, [id]: { ...existing, name: finalName, shared } } });
        setPhase({ kind: 'done', created: false });
      } else {
        const created = await createPocDashboard(content(), finalName, shared);
        setPocPlan({
          ...pocPlan,
          specialtyDashboards: {
            ...pocPlan.specialtyDashboards,
            [id]: { id: created, name: finalName, createdAt: new Date().toISOString(), createdBy: access.identity.email || null, shared },
          },
        });
        setPhase({ kind: 'done', created: true });
      }
    } catch (error) {
      setPhase({ kind: 'failed', failure: classifyDashboardError(error) });
    }
  };

  const link = existing === null ? null : documentLink(existing.id);
  const nameLabel = `dash3-name-${id}`;

  return (
    <Panel as="article" pad="roomy" data-dashboard={id}>
      <Stack gap="group" className="pvs-d-form">
        <Stack gap="tight">
          <Heading level={5} as="h3">
            {dashboardName}
          </Heading>
          <Text className="pvs-label">{t(`dash3.${id}.audience` as StringKey)}</Text>
          <Paragraph className="pvs-prose">{t(`dash3.${id}.question` as StringKey)}</Paragraph>
          <Text className="pvs-caption">{t('dash3.sections', { sections: shownSections.map((section, index) => sectionTitle(section, index + 1)).join(' · ') })}</Text>
        </Stack>

        <Stack gap="tight">
          <Text id={nameLabel} className="pvs-label">
            {t('dash.name')}
          </Text>
          <TextInput value={name} onChange={(value) => setName(value.slice(0, 128))} aria-labelledby={nameLabel} />
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
                  <Button variant="accent" color="primary" onClick={() => void run('create')} data-testid={`dash3-confirm-${id}`}>
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
              <Button variant="emphasized" onClick={() => setPhase({ kind: 'confirm' })} disabled={phase.kind === 'busy'} data-testid={`dash3-create-${id}`}>
                <Button.Prefix>
                  <AnalyticsIcon />
                </Button.Prefix>
                {t('dash3.create')}
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
