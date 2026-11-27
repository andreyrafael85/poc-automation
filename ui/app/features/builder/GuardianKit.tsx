import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip, MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox } from '@dynatrace/strato-components/forms';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ExternalLinkIcon } from '@dynatrace/strato-icons';

import { useAccess } from '../../config/AccessContext';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { MAX_POC_GUARDIANS, type PocGuardianRef } from '../../models/pocPlan';
import { num, str } from '../../utils/records';
import { Confirm, Result, SLO_SERVICES_SHOWN, SLO_TARGETS, browserTimeZone, failureKey, type Busy } from './PocAutomationKits';
import { openInWorkflows, workflowFile } from './pocAutomation';
import {
  GUARDIAN_KINDS,
  GUARDIAN_SCHEMA,
  buildGuardian,
  buildGuardianWorkflow,
  guardianLink,
  guardianSpecs,
  type GuardianKind,
  type GuardianWords,
} from './pocGuardians';
import { createSettingsObject, refusalOf, responseBodyOf } from './pocSettings';

/**
 * 3.8.3 — the PoC Builder's "Guardian" tab (the owner, 2026-11-27): five Site Reliability Guardians — the PoC's SLOs,
 * infrastructure performance, services, applications and security (vulnerabilities) — created by the app only on the SE's
 * click after a confirmation, kept in the register and removed by the clean-up; and a validation workflow that runs them every
 * day, handed to the Workflows app (the app never writes a workflow). Each guardian starts with lines the SE tunes in the Site
 * Reliability Guardian app.
 */

const UNIT_KEY: Record<string, StringKey> = {
  Percent: 'grd.unit.percent',
  MicroSecond: 'grd.unit.ms',
  MilliSecond: 'grd.unit.ms',
  Count: 'grd.unit.count',
};

export const GuardianKit = () => {
  const { t, formatNumber } = useTranslation();
  const { parameters, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const canCreate = access.canManageAccess;
  const customer = parameters.customerName.trim() === '' ? 'PoC' : parameters.customerName.trim();
  const ranking = useCatalogQuery('svc.ranking', useQueryScope());
  const services = (ranking.outcome === 'ok' ? ranking.records : [])
    .map((record) => ({ id: str(record, 'serviceId') ?? '', name: str(record, 'name') ?? '', requests: num(record, 'totalRequests') }))
    .filter((service) => /^SERVICE-[0-9A-F]{16}$/.test(service.id))
    .slice(0, SLO_SERVICES_SHOWN);
  const existing = pocPlan.guardians ?? [];
  const createdKind = (kind: GuardianKind) => existing.find((guardian) => guardian.kind === kind);
  const slos = pocPlan.slos ?? [];
  const [kinds, setKinds] = useState<Set<GuardianKind>>(new Set(GUARDIAN_KINDS));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const [shared, setShared] = useState(true);
  const [opened, setOpened] = useState(false);

  const context = { slos, serviceIds: services.filter((service) => picked.has(service.id)).map((service) => service.id), targets: (kind: keyof typeof SLO_TARGETS) => SLO_TARGETS[kind] };
  const sloName = (key: string) => slos.find((slo) => `slo:${slo.id}` === key)?.name ?? key;
  const words = (kind: GuardianKind): GuardianWords => ({
    name: t('grd.name', { kind: t(`grd.kind.${kind}` as StringKey), customer }),
    description: t(`grd.kind.${kind}.what` as StringKey),
    objective: (key) =>
      key.startsWith('slo:')
        ? { name: sloName(key), description: t('grd.obj.slo.desc') }
        : { name: t(`grd.obj.${key}` as StringKey), description: t(`grd.obj.${key}.desc` as StringKey) },
  });

  // What the button creates: the kinds ticked, not created yet, that have something to evaluate.
  const toCreate = GUARDIAN_KINDS.filter((kind) => kinds.has(kind) && createdKind(kind) === undefined && guardianSpecs(kind, context).length > 0);

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const value = (amount: number, unit: string) => {
    const shown = unit === 'MicroSecond' ? amount / 1000 : amount;
    return t(UNIT_KEY[unit] ?? 'grd.unit.count', { n: formatNumber(shown) });
  };

  const run = async () => {
    setBusy({ kind: 'busy' });
    const made: PocGuardianRef[] = [];
    let failed = 0;
    let reason: string | null = null;
    for (const kind of toCreate.slice(0, Math.max(0, MAX_POC_GUARDIANS - existing.length))) {
      const text = words(kind);
      const guardian = buildGuardian(kind, context, text);
      if (guardian === null) continue;
      try {
        const id = await createSettingsObject(GUARDIAN_SCHEMA, guardian);
        made.push({ id, name: guardian.name, kind, createdAt: new Date().toISOString(), createdBy: access.identity.email || null, shared: true });
      } catch (error) {
        failed += 1;
        const refusal = refusalOf(await responseBodyOf(error), '');
        reason = refusal === '' ? t(failureKey(error)) : refusal;
      }
    }
    if (made.length > 0) setPocPlan({ ...pocPlan, guardians: [...existing, ...made] });
    setBusy({ kind: 'done', ok: made.length, failed, reason });
  };

  const workflow = () =>
    buildGuardianWorkflow(
      existing.map((guardian) => ({ id: guardian.id, name: guardian.name, kind: guardian.kind })),
      { shared, timezone: browserTimeZone() },
      { title: t('grd.wf.name', { customer }), description: t('grd.wf.description'), task: (name) => t('grd.wf.task', { name }) },
    );

  const download = () => {
    const url = URL.createObjectURL(workflowFile(workflow()));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'poc-guardians-validation-workflow.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel pad="roomy" data-testid="builder-guardian-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('grd.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('grd.what')}</Paragraph>
        </Stack>

        <ul className="pvs-capkit pvs-grdkit" aria-label={t('grd.title')}>
          {GUARDIAN_KINDS.map((kind) => {
            const made = createdKind(kind);
            const specs = guardianSpecs(kind, context);
            return (
              <li key={kind} className="pvs-capkit__item" data-testid={`builder-guardian-${kind}`}>
                <Stack gap="tight">
                  <Cluster>
                    <Checkbox
                      value={made !== undefined || (kinds.has(kind) && specs.length > 0)}
                      disabled={made !== undefined || specs.length === 0 || !canCreate}
                      onChange={() => setKinds(toggle(kinds, kind))}
                      data-testid={`builder-guardian-pick-${kind}`}
                    >
                      <span className="pvs-capkit__name">{t(`grd.kind.${kind}` as StringKey)}</span>
                    </Checkbox>
                    {made !== undefined && (
                      <Chip size="condensed" variant="accent" color="success">
                        {t('grd.created')}
                      </Chip>
                    )}
                  </Cluster>
                  <Text className="pvs-caption">{t(`grd.kind.${kind}.what` as StringKey)}</Text>
                  {specs.length === 0 ? (
                    <Text className="pvs-caption">{t('grd.slos.none')}</Text>
                  ) : (
                    <ul className="pvs-grdkit__objectives">
                      {specs.slice(0, 8).map((spec) => (
                        <li key={spec.key}>
                          <span>{spec.key.startsWith('slo:') ? sloName(spec.key) : t(`grd.obj.${spec.key}` as StringKey)}</span>
                          <span className="pvs-caption">
                            {spec.warning === null
                              ? t(spec.op === 'LESS_THAN_OR_EQUAL' ? 'grd.line.atMost' : 'grd.line.atLeast', { target: value(spec.target, spec.unit.base) })
                              : t(spec.op === 'LESS_THAN_OR_EQUAL' ? 'grd.line.atMostWarn' : 'grd.line.atLeastWarn', {
                                  target: value(spec.target, spec.unit.base),
                                  warning: value(spec.warning, spec.unit.base),
                                })}
                          </span>
                        </li>
                      ))}
                      {specs.length > 8 && <li className="pvs-caption">{t('grd.more', { n: formatNumber(specs.length - 8) })}</li>}
                    </ul>
                  )}
                  {made !== undefined && (
                    <Link href={guardianLink(made.id)} target="_blank" rel="noopener noreferrer" data-testid={`builder-guardian-open-${kind}`}>
                      {t('grd.open')} <ExternalLinkIcon />
                    </Link>
                  )}
                </Stack>
              </li>
            );
          })}
        </ul>

        <Stack gap="tight">
          <Text className="pvs-label">{t('grd.services', { shown: formatNumber(services.length) })}</Text>
          {services.length === 0 ? (
            <Text className="pvs-muted">{t('builder.slo.noServices')}</Text>
          ) : (
            <ul className="pvs-slo-services">
              {services.map((service) => (
                <li key={service.id}>
                  <Checkbox value={picked.has(service.id)} onChange={() => setPicked(toggle(picked, service.id))} data-testid={`builder-guardian-svc-${service.id}`}>
                    {service.name}
                  </Checkbox>
                </li>
              ))}
            </ul>
          )}
          <Text className="pvs-caption">{picked.size === 0 ? t('grd.services.all') : t('grd.services.some', { n: formatNumber(picked.size) })}</Text>
        </Stack>
        <Text className="pvs-caption">{t('grd.cost')}</Text>

        {!canCreate ? (
          <Text className="pvs-muted">{t('builder.seOnly')}</Text>
        ) : busy.kind === 'confirm' ? (
          <Confirm
            title={t('grd.confirm.title', { n: formatNumber(toCreate.length) })}
            body={t('grd.confirm.body', { list: toCreate.map((kind) => t(`grd.kind.${kind}` as StringKey)).join(', ') })}
            onGo={() => void run()}
            onCancel={() => setBusy({ kind: 'idle' })}
            testId="builder-guardian-confirm"
          />
        ) : (
          <Cluster>
            <Button
              variant="accent"
              color="primary"
              onClick={() => setBusy({ kind: 'confirm' })}
              disabled={toCreate.length === 0 || busy.kind === 'busy'}
              data-testid="builder-guardian-create"
            >
              {t('grd.create', { n: formatNumber(toCreate.length) })}
            </Button>
          </Cluster>
        )}
        <Result busy={busy} />

        <Stack gap="tight">
          <Heading level={5} as="h3">
            {t('grd.wf.title')}
          </Heading>
          <Text className="pvs-caption">{t('grd.wf.what', { timezone: browserTimeZone() })}</Text>
          <Checkbox value={shared} onChange={(next) => setShared(next === true)}>
            {t('builder.wf.shared')}
          </Checkbox>
          <Cluster>
            <Button
              variant="emphasized"
              onClick={() => {
                openInWorkflows(workflow());
                setOpened(true);
              }}
              disabled={existing.length === 0}
              data-testid="builder-guardian-wf-open"
            >
              {t('cap.open')}
            </Button>
            <Button onClick={download} disabled={existing.length === 0} data-testid="builder-guardian-wf-download">
              {t('cap.download')}
            </Button>
          </Cluster>
          {existing.length === 0 && <Text className="pvs-caption">{t('grd.wf.needs')}</Text>}
          {opened && (
            <MessageContainer variant="primary">
              <MessageContainer.Title>{t('builder.wf.opened.title')}</MessageContainer.Title>
              <MessageContainer.Description>{t('grd.wf.opened')}</MessageContainer.Description>
            </MessageContainer>
          )}
        </Stack>
      </Stack>
    </Panel>
  );
};
