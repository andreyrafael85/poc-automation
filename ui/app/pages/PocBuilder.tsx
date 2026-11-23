import React, { useEffect, useState } from 'react';

import { getDocumentLink } from '@dynatrace-sdk/navigation';
import { Button } from '@dynatrace/strato-components/buttons';
import { Checkbox } from '@dynatrace/strato-components/forms';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ExternalLinkIcon } from '@dynatrace/strato-icons';
import { Link as RouterLink } from 'react-router-dom';

import { SectionIntro } from '../components/SectionIntro';
import { useAccess } from '../config/AccessContext';
import { useStudio } from '../config/StudioContext';
import { Panel, Stack } from '../engine';
import { SPECIALTY_BLUEPRINTS, SPECIALTY_IDS, type SpecialtyId } from '../features/dashboard/blueprints';
import { DashboardLogoContext, shrinkLogo } from '../features/dashboard/dashboardLogo';
import { SpecialtyCard, useDashboardEvidence } from '../features/dashboard/SpecialtyDashboards';
import { CleanupPanel, createdItems, MonitorKit, SloKit, WeeklyKit, WorkflowKit } from '../features/builder/PocAutomationKits';
import { AnomalyKit, OpenPipelineKit } from '../features/builder/PocSettingsKits';
import { listSlos, wholeSloIds } from '../features/builder/pocAutomation';
import { PocDocumentKit } from '../features/builder/PocDocumentKit';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { CUT_SLO_ID } from '../models/pocPlan';
import type { PocDashboardRef } from '../models/pocPlan';

/**
 * 3.6.6 — the PoC builder (the owner: Settings moves to a stage of its own, beside "a page to run deploys on the PoC
 * … automate processes to help the PoC day to day"; the 3.6.6 proposal page; the owner named it "PoC Builder" and its stage "Configurações & Construção").
 *
 * What the PoC creates on the tenant, kit by kit, each only by the SE's click (rule 10): today the four dashboards that
 * lived on Settings → Dashboards, now as compact cards — the full card (sections, name, sharing, create or update) opens
 * under the grid for one dashboard at a time —, with the customer's logo in their top-left corner, and the register of
 * what the PoC created. Never in executive mode (`EXECUTIVE_HIDDEN_ROUTES`). Kits that need a new permission (SLOs,
 * workflows, segments, the clean-up at the end of the PoC) wait for the owner's order (rule 5).
 */

type KitKey = SpecialtyId;

interface Kit {
  key: KitKey;
  name: string;
  audience: string;
  sections: number;
  ref: PocDashboardRef | null;
}

function documentLink(id: string): string | null {
  try {
    return getDocumentLink(id);
  } catch {
    return null;
  }
}

export const PocBuilder = () => {
  const { t, tCount, formatDateTime, formatNumber } = useTranslation();
  const { parameters, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const evidence = useDashboardEvidence();
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [open, setOpen] = useState<KitKey | null>(null);

  useEffect(() => {
    let live = true;
    void shrinkLogo(parameters.customerLogoDataUrl).then((src) => {
      if (live) setLogoSrc(src);
    });
    return () => {
      live = false;
    };
  }, [parameters.customerLogoDataUrl]);

  // 3.7.2: the SLO ids 3.6.9–3.7.1 kept cut (100 of 156 characters) are made whole once, from the platform's SLO list, so
  // the overview's SLO tiles, the register's links and the clean-up reach the SLO again. Only the SE writes the plan.
  const cutSlos = (pocPlan.slos ?? []).some((slo) => slo.id.length === CUT_SLO_ID);
  useEffect(() => {
    if (!cutSlos || !access.canManageAccess) return;
    let live = true;
    void listSlos()
      .then((onEnvironment) => {
        const whole = wholeSloIds(pocPlan.slos ?? [], onEnvironment);
        if (live && whole.changed) setPocPlan({ ...pocPlan, slos: whole.refs });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [cutSlos, access.canManageAccess, pocPlan, setPocPlan]);

  const customer = parameters.customerName.trim();
  const logo = includeLogo && logoSrc !== null ? { src: logoSrc, alt: customer === '' ? t('builder.logo.alt') : customer } : undefined;
  const canCreate = access.canManageAccess;

  // 3.7.1 (the owner): "Value of the PoC" leaves the Builder — the SE Report and the Tech Wrapup carry the value, and the
  // environment overview with the SLOs takes its card. Its code stays (POC_BLUEPRINT, PocDashboardSection), marked to be
  // removed later; a dashboard created before stays in the register.
  const kits: Kit[] = [
    ...SPECIALTY_IDS.map((id) => ({
      key: id,
      name: t(`dash3.${id}.name` as StringKey),
      audience: t(`dash3.${id}.audience` as StringKey),
      sections: SPECIALTY_BLUEPRINTS[id].sections.length,
      ref: pocPlan.specialtyDashboards?.[id] ?? null,
    })),
  ];
  const created = kits.filter((kit) => kit.ref !== null);
  // 3.6.7: the investigation notebook and the PoC launchpad, the two document kits beside the dashboards.
  const documents = [
    { key: 'notebook' as const, ref: pocPlan.notebook ?? null },
    { key: 'launchpad' as const, ref: pocPlan.launchpad ?? null },
  ];
  // 3.6.9: the SLOs, one kit more (the triage workflow is saved by the Workflows app, so it is not counted here).
  const automation = [
    { key: 'slos', ref: (pocPlan.slos ?? []).length > 0 ? 'on' : null },
    // 3.7.3: the HTTP monitors, one kit more.
    { key: 'monitors', ref: (pocPlan.monitors ?? []).length > 0 ? 'on' : null },
    // 3.7.4: the anomaly detectors and the OpenPipeline pipeline.
    { key: 'detectors', ref: (pocPlan.detectors ?? []).length > 0 ? 'on' : null },
    { key: 'pipeline', ref: pocPlan.pipeline ? 'on' : null },
  ];
  const total = kits.length + documents.length + automation.length;
  const done = created.length + documents.filter((item) => item.ref !== null).length + automation.filter((item) => item.ref !== null).length;
  const register = createdItems(pocPlan, documentLink);

  return (
    <DashboardLogoContext.Provider value={logo}>
      <Stack gap="section">
        <SectionIntro titleKey="builder.title" questionKey="builder.question" takeawayKey="builder.takeaway" />

        <Panel pad="roomy" data-testid="builder-summary">
          <div className="pvs-builder__summary">
            <Stack gap="tight">
              <Text className="pvs-builder__count">{t('builder.count', { n: formatNumber(done), total: formatNumber(total) })}</Text>
              <div className="pvs-builder__ticks" role="img" aria-label={t('builder.count', { n: formatNumber(done), total: formatNumber(total) })}>
                {[...kits, ...documents, ...automation].map((kit) => (
                  <span key={kit.key} data-on={kit.ref !== null ? 'true' : 'false'} />
                ))}
              </div>
              <Text className="pvs-caption">{t('builder.rules')}</Text>
            </Stack>
            <div className="pvs-builder__logo" data-testid="builder-logo">
              {logoSrc === null ? (
                <Stack gap="tight">
                  <Text className="pvs-builder__logo-title">{t('builder.logo.title')}</Text>
                  <Text className="pvs-caption">
                    {t('builder.logo.none')}{' '}
                    <Link as={RouterLink} to="/settings">
                      {t('builder.logo.toSettings')}
                    </Link>
                  </Text>
                </Stack>
              ) : (
                <>
                  <img className="pvs-builder__logo-img" src={logoSrc} alt={customer === '' ? t('builder.logo.alt') : customer} />
                  <Stack gap="tight">
                    <Checkbox value={includeLogo} onChange={(value) => setIncludeLogo(value === true)} data-testid="builder-logo-include">
                      {t('builder.logo.include')}
                    </Checkbox>
                    <Text className="pvs-caption">{t('builder.logo.how')}</Text>
                  </Stack>
                </>
              )}
            </div>
          </div>
        </Panel>

        <Tabs defaultIndex={0}>
          <Tab title={t('builder.tab.dashboards', { n: formatNumber(kits.length) })} keepMounted>
            <Stack gap="section" className="pvs-tabpane">
              <ul className="pvs-kits" aria-label={t('builder.tab.dashboards', { n: formatNumber(kits.length) })}>
                {kits.map((kit) => {
                  const link = kit.ref === null ? null : documentLink(kit.ref.id);
                  return (
                    <li key={kit.key} className="pvs-kit" data-created={kit.ref !== null ? 'true' : 'false'} data-open={open === kit.key ? 'true' : undefined} data-testid={`builder-kit-${kit.key}`}>
                      <div className="pvs-kit__top">
                        <Text className="pvs-kit__name">{kit.name}</Text>
                        <span className="pvs-kit__state">{kit.ref === null ? t('builder.kit.ready') : t('builder.kit.created')}</span>
                      </div>
                      <div className="pvs-kit__thumb" aria-hidden="true">
                        <span data-logo={logo !== undefined ? 'true' : undefined} />
                        <span data-wide="true" />
                        {Array.from({ length: Math.min(kit.sections, 6) }, (_, index) => (
                          <span key={index} />
                        ))}
                      </div>
                      <Text className="pvs-kit__what">
                        {kit.audience} · {tCount('builder.kit.sections', kit.sections, { count: formatNumber(kit.sections) })}
                      </Text>
                      <Text className="pvs-kit__when">
                        {kit.ref === null ? t('builder.kit.notYet') : t('builder.kit.since', { at: kit.ref.createdAt === '' ? '—' : formatDateTime(kit.ref.createdAt) })}
                      </Text>
                      <div className="pvs-kit__acts">
                        {link !== null && (
                          <Link href={link} target="_blank" rel="noopener noreferrer">
                            {t('builder.kit.open')} <ExternalLinkIcon />
                          </Link>
                        )}
                        {canCreate && (
                          <Button
                            variant={kit.ref === null ? 'emphasized' : 'default'}
                            onClick={() => setOpen(open === kit.key ? null : kit.key)}
                            aria-expanded={open === kit.key}
                            data-testid={`builder-details-${kit.key}`}
                          >
                            {open === kit.key ? t('builder.kit.close') : kit.ref === null ? t('builder.kit.details') : t('builder.kit.manage')}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!canCreate && <Text className="pvs-caption">{t('builder.seOnly')}</Text>}
              {/* 3.7.3: a key per dashboard, so opening another card starts from its own name (3.6.6–3.7.2 kept the previous one's). */}
              {canCreate && open !== null && <SpecialtyCard key={open} id={open} evidence={evidence} />}
            </Stack>
          </Tab>
          <Tab title={t('builder.tab.documents')} keepMounted>
            <Stack gap="section" className="pvs-tabpane">
              {canCreate ? (
                <div className="pvs-doc-kits">
                  <PocDocumentKit type="notebook" />
                  <PocDocumentKit type="launchpad" />
                </div>
              ) : (
                <Text className="pvs-caption">{t('builder.seOnly')}</Text>
              )}
            </Stack>
          </Tab>
          {/* 3.7.4 (the owner: "vamos separar os assuntos"): one tab per subject. */}
          <Tab title={t('builder.tab.slos')} keepMounted>
            <Stack gap="section" className="pvs-tabpane">
              {canCreate ? <SloKit /> : <Text className="pvs-caption">{t('builder.seOnly')}</Text>}
            </Stack>
          </Tab>
          <Tab title={t('builder.tab.workflows')} keepMounted>
            <Stack gap="section" className="pvs-tabpane">
              {canCreate ? (
                <div className="pvs-doc-kits">
                  <WorkflowKit />
                  <WeeklyKit />
                </div>
              ) : (
                <Text className="pvs-caption">{t('builder.seOnly')}</Text>
              )}
            </Stack>
          </Tab>
          <Tab title={t('builder.tab.synthetic')} keepMounted>
            <Stack gap="section" className="pvs-tabpane">
              {canCreate ? (
                <>
                  {/* 3.7.8 (the owner): the browser monitor first — more metrics and a screenshot of the customer's page — and the HTTP check beside it. */}
                  <MonitorKit type="BROWSER" />
                  <MonitorKit />
                </>
              ) : (
                <Text className="pvs-caption">{t('builder.seOnly')}</Text>
              )}
            </Stack>
          </Tab>
          <Tab title={t('builder.tab.openpipeline')} keepMounted>
            <Stack gap="section" className="pvs-tabpane">
              {canCreate ? <OpenPipelineKit /> : <Text className="pvs-caption">{t('builder.seOnly')}</Text>}
            </Stack>
          </Tab>
          <Tab title={t('builder.tab.anomaly')} keepMounted>
            <Stack gap="section" className="pvs-tabpane">
              {canCreate ? <AnomalyKit /> : <Text className="pvs-caption">{t('builder.seOnly')}</Text>}
            </Stack>
          </Tab>
          <Tab title={t('builder.tab.ledger')} keepMounted>
            <Stack gap="group" className="pvs-tabpane">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('builder.ledger.title')}
                </Heading>
                <Paragraph className="pvs-prose">{t('builder.ledger.body')}</Paragraph>
              </Stack>
              {register.length === 0 ? (
                <Text className="pvs-muted">{t('builder.ledger.none')}</Text>
              ) : (
                <ol className="pvs-ledger" data-testid="builder-ledger">
                  {register.map((item) => (
                    <li key={item.key} className="pvs-ledger__row">
                      <span className="pvs-ledger__when">{item.ref.createdAt === '' ? '—' : formatDateTime(item.ref.createdAt)}</span>
                      <span className="pvs-ledger__what">{t(`builder.ledger.${item.type}` as StringKey, { name: item.ref.name })}</span>
                      <span className="pvs-ledger__who">
                        {item.ref.shared ? t('builder.ledger.shared') : t('builder.ledger.private')}
                        {item.ref.createdBy === null || item.ref.createdBy === undefined ? '' : ` · ${item.ref.createdBy}`}
                      </span>
                      {item.link !== null && (
                        <Link href={item.link} target="_blank" rel="noopener noreferrer">
                          {t('builder.kit.open')}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {canCreate && <CleanupPanel />}
              <Text className="pvs-caption">{t('builder.ledger.next')}</Text>
            </Stack>
          </Tab>
        </Tabs>
      </Stack>
    </DashboardLogoContext.Provider>
  );
};
