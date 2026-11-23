import React, { useState } from 'react';

import { getAppId } from '@dynatrace-sdk/app-environment';
import { getDocumentLink } from '@dynatrace-sdk/navigation';
import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox, TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ExternalLinkIcon } from '@dynatrace/strato-icons';

import { useAccess } from '../../config/AccessContext';
import { useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import type { PocDashboardRef } from '../../models/pocPlan';
import { SPECIALTY_IDS } from '../dashboard/blueprints';
import { useDashboardLogo } from '../dashboard/dashboardLogo';
import { classifyDashboardError, type DashboardFailure } from '../dashboard/pocDashboard';
import {
  buildInvestigationNotebook,
  buildPocLaunchpad,
  createPocDocument,
  NOTEBOOK_CHAPTERS,
  queryServiceRunner,
  updatePocDocument,
  withResults,
  type LaunchpadItem,
  type PocDocumentType,
} from './pocDocuments';

/**
 * 3.6.7 — the card of a document kit on the PoC Builder (the investigation notebook, the PoC launchpad): what it will
 * hold, its name and visibility, and create or update — only on the SE's click, after a confirmation (rule 10). Its ref
 * is kept in the PoC plan (`notebook`, `launchpad`), so the register and the launchpad can link to it.
 */

type Phase = { kind: 'idle' } | { kind: 'confirm' } | { kind: 'busy' } | { kind: 'done'; created: boolean } | { kind: 'failed'; failure: DashboardFailure };

const FAILURE_KEY: Record<DashboardFailure, StringKey> = {
  forbidden: 'builder.doc.failed.forbidden',
  missing: 'builder.doc.failed.missing',
  conflict: 'builder.doc.failed.conflict',
  error: 'builder.doc.failed.error',
};

/** The app's own pages a launchpad points to, in the order of the story. */
export const LAUNCHPAD_PAGES: readonly { route: string; key: StringKey }[] = [
  { route: '/', key: 'nav.overview' },
  { route: '/executive', key: 'nav.executive' },
  { route: '/coverage', key: 'nav.coverage' },
  { route: '/problems', key: 'nav.aiInsights' },
  { route: '/rca', key: 'nav.rca' },
];

function documentLink(id: string): string | null {
  try {
    return getDocumentLink(id);
  } catch {
    return null;
  }
}

/** Where a page of this app opens on the environment. */
export function appIdOrManifest(): string {
  try {
    return getAppId();
  } catch {
    // Outside the platform (tests, the harness) the manifest's id stands.
    return 'my.poc.automation';
  }
}

export function appPageUrl(route: string): string {
  return `/ui/apps/${appIdOrManifest()}${route}`;
}

/** 3.7.2: the app's icon as the platform's launchpads show an app link (its registry address). */
export function appIconUrl(): string {
  return `/platform/app-engine/registry/v1/app-icons/${appIdOrManifest()}`;
}

export const PocDocumentKit = ({ type }: { type: PocDocumentType }) => {
  const { t, formatDateTime } = useTranslation();
  const { parameters, pocPlan, setPocPlan, resolvedTimeframe } = useStudio();
  const access = useAccess();
  const logo = useDashboardLogo();
  const existing = pocPlan[type] ?? null;
  const customer = parameters.customerName.trim();
  const base = t(`builder.${type}.name` as StringKey);
  const [name, setName] = useState(existing?.name ?? (customer === '' ? base : t('dash3.defaultName', { dashboard: base, customer })));
  const [shared, setShared] = useState(existing?.shared ?? true);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const dashboardItems = (): LaunchpadItem[] => {
    const refs: { ref: PocDashboardRef | null | undefined; audience: string }[] = [
      { ref: pocPlan.dashboard, audience: t('builder.poc.audience') },
      ...SPECIALTY_IDS.map((id) => ({ ref: pocPlan.specialtyDashboards?.[id], audience: t(`dash3.${id}.audience` as StringKey) })),
    ];
    return refs.flatMap(({ ref, audience }) => (ref === null || ref === undefined ? [] : [{ title: ref.name, description: audience, documentId: ref.id, category: 'dashboards' as const }]));
  };

  const content = () => {
    const title = name.trim() === '' ? base : name.trim();
    if (type === 'notebook') {
      return buildInvestigationNotebook({
        title,
        intro: t('builder.notebook.intro', { at: formatDateTime(resolvedTimeframe.endIso) }),
        logo,
        chapter: (key, index) => ({ title: t(`builder.nb.${key}.title` as StringKey, { n: String(index) }), why: t(`builder.nb.${key}.why` as StringKey) }),
        tile: (key) => t(`dash2.tile.${key}` as StringKey),
        footer: t('builder.footer'),
      });
    }
    return buildPocLaunchpad({
      title,
      intro: t('builder.launchpad.intro'),
      logo,
      appIcon: appIconUrl(),
      groups: [
        { heading: t('builder.launchpad.dashboards'), description: t('builder.launchpad.dashboardsWhat'), items: dashboardItems() },
        {
          heading: t('builder.launchpad.notebooks'),
          description: t('builder.launchpad.notebooksWhat'),
          items: pocPlan.notebook === undefined ? [] : [{ title: pocPlan.notebook.name, description: t('builder.notebook.what'), documentId: pocPlan.notebook.id, category: 'notebooks' }],
        },
        {
          heading: t('builder.launchpad.app'),
          description: t('builder.launchpad.appPage'),
          items: LAUNCHPAD_PAGES.map((page) => ({ title: t(page.key), description: t('builder.launchpad.appPage'), url: appPageUrl(page.route) })),
        },
      ],
      footer: t('builder.footer'),
    });
  };

  // 3.7.2: the notebook is saved with the result of each section's run, so it opens with its charts drawn.
  const contentToSave = async () => {
    const built = content();
    return type === 'notebook' && 'sections' in built ? withResults(built, queryServiceRunner) : built;
  };

  const run = async (mode: 'create' | 'update') => {
    setPhase({ kind: 'busy' });
    const finalName = (name.trim() === '' ? base : name.trim()).slice(0, 128);
    try {
      if (mode === 'update' && existing !== null) {
        await updatePocDocument(existing.id, await contentToSave(), finalName, shared);
        setPocPlan({ ...pocPlan, [type]: { ...existing, name: finalName, shared } });
        setPhase({ kind: 'done', created: false });
      } else {
        const id = await createPocDocument(type, await contentToSave(), finalName, shared);
        setPocPlan({ ...pocPlan, [type]: { id, name: finalName, createdAt: new Date().toISOString(), createdBy: access.identity.email || null, shared } });
        setPhase({ kind: 'done', created: true });
      }
    } catch (error) {
      setPhase({ kind: 'failed', failure: classifyDashboardError(error) });
    }
  };

  const items = type === 'notebook' ? NOTEBOOK_CHAPTERS.map((chapter, index) => t(`builder.nb.${chapter}.title` as StringKey, { n: String(index + 1) })) : [t('builder.launchpad.what1'), t('builder.launchpad.what2'), t('builder.launchpad.what3')];

  return (
    <Panel pad="roomy" data-testid={`builder-doc-${type}`}>
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {base}
          </Heading>
          <Paragraph className="pvs-prose">{t(`builder.${type}.what` as StringKey)}</Paragraph>
          {existing !== null && (
            <Text className="pvs-caption">
              {t('builder.kit.since', { at: existing.createdAt === '' ? '—' : formatDateTime(existing.createdAt) })}
              {/* 3.7.1 (the owner): one click to the notebook or launchpad created, as for the dashboards. */}
              {documentLink(existing.id) !== null && (
                <>
                  {' · '}
                  <Link href={documentLink(existing.id) ?? ''} target="_blank" rel="noopener noreferrer" data-testid={`builder-open-${type}`}>
                    {t('builder.kit.open')} <ExternalLinkIcon />
                  </Link>
                </>
              )}
            </Text>
          )}
        </Stack>
        {/* The notebook's step titles carry their own number (the same as in the notebook); the launchpad's are a plain list. */}
        {type === 'notebook' ? (
          <ol className="pvs-doc-steps" data-own-numbers="true">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        ) : (
          <ul className="pvs-doc-steps">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.doc.name')}</Text>
          <TextInput value={name} onChange={setName} aria-label={t('builder.doc.name')} />
        </Stack>
        <Checkbox value={shared} onChange={(value) => setShared(value === true)}>
          {t('builder.doc.shared')}
        </Checkbox>
        {phase.kind === 'confirm' ? (
          <MessageContainer variant="primary">
            <MessageContainer.Title>{t('builder.doc.confirm.title', { name: name.trim() === '' ? base : name.trim() })}</MessageContainer.Title>
            <MessageContainer.Description>
              <Stack gap="tight">
                <Text>{t('builder.doc.confirm.body')}</Text>
                <Cluster>
                  <Button variant="accent" color="primary" onClick={() => void run('create')} data-testid={`builder-confirm-${type}`}>
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
              <Button variant="emphasized" onClick={() => setPhase({ kind: 'confirm' })} disabled={phase.kind === 'busy'} data-testid={`builder-create-${type}`}>
                {t('builder.doc.create')}
              </Button>
            ) : (
              <>
                <Button variant="emphasized" onClick={() => void run('update')} disabled={phase.kind === 'busy'} data-testid={`builder-update-${type}`}>
                  {t('builder.doc.update')}
                </Button>
                <Button onClick={() => setPhase({ kind: 'confirm' })} disabled={phase.kind === 'busy'}>
                  {t('builder.doc.createNew')}
                </Button>
              </>
            )}
            {phase.kind === 'busy' && (
              <Text role="status" className="pvs-caption">
                {t('builder.doc.busy')}
              </Text>
            )}
          </Cluster>
        )}
        {phase.kind === 'done' && (
          <MessageContainer variant="success">
            <MessageContainer.Title>{phase.created ? t('builder.doc.created') : t('builder.doc.updated')}</MessageContainer.Title>
          </MessageContainer>
        )}
        {phase.kind === 'failed' && (
          <MessageContainer variant="critical">
            <MessageContainer.Title>{t('builder.doc.failed.title')}</MessageContainer.Title>
            <MessageContainer.Description>{t(FAILURE_KEY[phase.failure])}</MessageContainer.Description>
          </MessageContainer>
        )}
      </Stack>
    </Panel>
  );
};
