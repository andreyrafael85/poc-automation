import React, { useEffect, useState } from 'react';

import { getDocumentLink } from '@dynatrace-sdk/navigation';
import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox, Select, TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useAccess } from '../../config/AccessContext';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { safeWebUrl } from '../../config/persistence';
import { FLEET_SLO_KINDS, MAX_POC_MONITORS, SERVICE_SLO_KINDS, type PocDashboardRef, type PocMonitorRef, type PocPlan, type PocSloRef, type ServiceSloKind, type SloKind } from '../../models/pocPlan';
import { num, str } from '../../utils/records';
import {
  buildSlo,
  buildBrowserMonitor,
  buildHttpMonitor,
  buildTriageWorkflow,
  buildWeeklyWorkflow,
  createHttpMonitor,
  defaultLocation,
  locationsFor,
  deleteHttpMonitor,
  listPublicLocations,
  MONITOR_APP_LINK,
  MONITOR_FREQUENCIES,
  type SyntheticLocation,
  createSlo,
  deletePocDocument,
  deleteSlo,
  openInWorkflows,
  parseRecipients,
  sloLink,
  statusOf,
  workflowFile,
} from './pocAutomation';
import { ANOMALY_SETTINGS_LINK, OPENPIPELINE_LINK, deleteSettingsObject, unrouteFromPipeline } from './pocSettings';
import { guardianLink } from './pocGuardians';

/**
 * 3.6.9 — the PoC Builder's SLO kit, its problem-triage workflow kit and the clean-up at the end of the PoC. Each writes
 * to the tenant only after the SE's click and a confirmation (rule 10); the refs go to the PoC plan, so the register
 * lists them and the clean-up can remove them.
 */

/** Services offered for SLOs: the busiest of the app's own ranking (a list — top N, never a total). */
export const SLO_SERVICES_SHOWN = 8;
/** Preselected: the busiest three. */
export const SLO_SERVICES_PRESELECTED = 3;
/** The SLO targets: the two the platform's SLO app proposes for services (the lab's own SLOs use the same), 95 % for the fleet. */
export const SLO_TARGETS: Record<SloKind, { target: number; warning: number }> = {
  availability: { target: 99, warning: 99.5 },
  performance: { target: 95, warning: 98 },
  hostCpu: { target: 95, warning: 98 },
  hostMemory: { target: 95, warning: 98 },
  k8sRestarts: { target: 95, warning: 98 },
};

export type Busy = { kind: 'idle' } | { kind: 'confirm' } | { kind: 'busy' } | { kind: 'done'; ok: number; failed: number; reason: string | null };

export const failureKey = (error: unknown): StringKey => {
  const status = statusOf(error);
  if (status === 401 || status === 403) return 'builder.auto.failed.forbidden';
  if (status === 409) return 'builder.auto.failed.conflict';
  return 'builder.auto.failed.error';
};

export const Result = ({ busy }: { busy: Busy }) => {
  const { t, formatNumber } = useTranslation();
  if (busy.kind !== 'done') return null;
  return (
    <MessageContainer variant={busy.failed === 0 ? 'success' : busy.ok === 0 ? 'critical' : 'warning'}>
      <MessageContainer.Title>{t('builder.auto.result', { ok: formatNumber(busy.ok), failed: formatNumber(busy.failed) })}</MessageContainer.Title>
      {busy.reason !== null && <MessageContainer.Description>{busy.reason}</MessageContainer.Description>}
    </MessageContainer>
  );
};

export const Confirm = ({
  title,
  body,
  onGo,
  onCancel,
  testId,
  goLabel,
  goColor = 'primary',
}: {
  title: string;
  body: string;
  onGo: () => void;
  onCancel: () => void;
  testId: string;
  /** 3.7.6: the action's own word ("Remove" for the clean-up — it said "Create"). */
  goLabel?: string;
  goColor?: 'primary' | 'critical';
}) => {
  const { t } = useTranslation();
  return (
    <MessageContainer variant="primary">
      <MessageContainer.Title>{title}</MessageContainer.Title>
      <MessageContainer.Description>
        <Stack gap="tight">
          <Text>{body}</Text>
          <Cluster>
            <Button variant="accent" color={goColor} onClick={onGo} data-testid={testId}>
              {goLabel ?? t('dash.confirm.go')}
            </Button>
            <Button onClick={onCancel}>{t('dash.confirm.cancel')}</Button>
          </Cluster>
        </Stack>
      </MessageContainer.Description>
    </MessageContainer>
  );
};

export const SloKit = () => {
  const { t, tCount, formatNumber } = useTranslation();
  const { parameters, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const ranking = useCatalogQuery('svc.ranking', useQueryScope());
  const services = (ranking.outcome === 'ok' ? ranking.records : [])
    .map((record) => ({ id: str(record, 'serviceId') ?? '', name: str(record, 'name') ?? '', requests: num(record, 'totalRequests') }))
    .filter((service) => /^SERVICE-[0-9A-F]{16}$/.test(service.id))
    .slice(0, SLO_SERVICES_SHOWN);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const chosen = picked ?? new Set(services.slice(0, SLO_SERVICES_PRESELECTED).map((service) => service.id));
  const [kinds, setKinds] = useState<Set<ServiceSloKind>>(new Set(SERVICE_SLO_KINDS));
  const [fleet, setFleet] = useState<Set<SloKind>>(new Set(FLEET_SLO_KINDS));
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const existing = pocPlan.slos ?? [];
  const has = (kind: SloKind, id: string) => existing.some((slo) => slo.kind === kind && slo.serviceId === id);
  const planned: { service: { id: string; name: string }; kind: SloKind }[] = [
    ...services.filter((service) => chosen.has(service.id)).flatMap((service) => [...kinds].filter((kind) => !has(kind, service.id)).map((kind) => ({ service, kind }))),
    ...FLEET_SLO_KINDS.filter((kind) => fleet.has(kind) && !has(kind, '')).map((kind) => ({ service: { id: '', name: '' }, kind })),
  ];
  const customer = parameters.customerName.trim();

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const run = async () => {
    setBusy({ kind: 'busy' });
    const made: PocSloRef[] = [];
    let failed = 0;
    let reason: string | null = null;
    for (const { service, kind } of planned) {
      const who = customer === '' ? 'PoC' : customer;
      const name =
        service.id === ''
          ? t('builder.slo.fleetName', { kind: t(`builder.slo.kind.${kind}` as StringKey), customer: who })
          : t('builder.slo.name', { kind: t(`builder.slo.kind.${kind}` as StringKey), service: service.name, customer: who });
      const body = buildSlo(kind, service.id, { name, description: t(`builder.slo.description.${kind}` as StringKey, { service: service.name }) }, SLO_TARGETS[kind]);
      if (body === null) {
        failed += 1;
        continue;
      }
      try {
        const id = await createSlo(body);
        made.push({ id, name: body.name, createdAt: new Date().toISOString(), createdBy: access.identity.email || null, shared: true, kind, serviceId: service.id });
      } catch (error) {
        failed += 1;
        reason = t(failureKey(error));
      }
    }
    if (made.length > 0) setPocPlan({ ...pocPlan, slos: [...existing, ...made] });
    setBusy({ kind: 'done', ok: made.length, failed, reason });
  };

  return (
    <Panel pad="roomy" data-testid="builder-slo-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('builder.slo.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('builder.slo.what')}</Paragraph>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.slo.kinds')}</Text>
          <Cluster>
            {SERVICE_SLO_KINDS.map((kind) => (
              <Checkbox key={kind} value={kinds.has(kind)} onChange={() => setKinds(toggle(kinds, kind))} data-testid={`builder-slo-kind-${kind}`}>
                {t(`builder.slo.kind.${kind}` as StringKey)} · {t(`builder.slo.rule.${kind}` as StringKey, { target: formatNumber(SLO_TARGETS[kind].target) })}
              </Checkbox>
            ))}
          </Cluster>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.slo.services', { shown: formatNumber(services.length) })}</Text>
          {services.length === 0 ? (
            <Text className="pvs-muted">{t('builder.slo.noServices')}</Text>
          ) : (
            <ul className="pvs-slo-services">
              {services.map((service) => (
                <li key={service.id}>
                  <Checkbox value={chosen.has(service.id)} onChange={() => setPicked(toggle(chosen, service.id))} data-testid={`builder-slo-svc-${service.id}`}>
                    {service.name}
                  </Checkbox>
                  <span className="pvs-caption">
                    {service.requests === null ? '—' : tCount('builder.slo.requests', service.requests, { count: formatNumber(service.requests) })}
                    {SERVICE_SLO_KINDS.some((kind) => has(kind, service.id)) ? ` · ${t('builder.slo.already')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.slo.fleet')}</Text>
          <ul className="pvs-slo-services">
            {FLEET_SLO_KINDS.map((kind) => (
              <li key={kind}>
                <Checkbox value={fleet.has(kind)} onChange={() => setFleet(toggle(fleet, kind))} data-testid={`builder-slo-fleet-${kind}`}>
                  {t(`builder.slo.kind.${kind}` as StringKey)}
                </Checkbox>
                <span className="pvs-caption">
                  {t(`builder.slo.rule.${kind}` as StringKey, { target: formatNumber(SLO_TARGETS[kind].target) })}
                  {has(kind, '') ? ` · ${t('builder.slo.alreadyFleet')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Stack>
        {busy.kind === 'confirm' ? (
          <Confirm
            title={t('builder.slo.confirm.title', { n: formatNumber(planned.length) })}
            body={t('builder.slo.confirm.body')}
            onGo={() => void run()}
            onCancel={() => setBusy({ kind: 'idle' })}
            testId="builder-slo-confirm"
          />
        ) : (
          <Cluster>
            <Button variant="emphasized" onClick={() => setBusy({ kind: 'confirm' })} disabled={planned.length === 0 || busy.kind === 'busy'} data-testid="builder-slo-create">
              {t('builder.slo.create', { n: formatNumber(planned.length) })}
            </Button>
            {busy.kind === 'busy' && (
              <Text role="status" className="pvs-caption">
                {t('builder.auto.busy')}
              </Text>
            )}
          </Cluster>
        )}
        <Result busy={busy} />
      </Stack>
    </Panel>
  );
};

/**
 * 3.7.3 (the owner: "colocar um nome e URL do cliente e já criar um monitor rapidamente … puxar a URL principal cadastrada
 * em Cliente e engajamento … e dar a opção de cadastrar outras pelo Builder"): HTTP monitors of the customer's addresses —
 * the main one from Settings, more typed here — from one public location, created only after a confirmation (rule 10).
 * Each run is synthetic consumption, which the confirmation says.
 */
/** 3.7.8: the words a browser monitor has of its own (the rest are the HTTP kit's). */
const BROWSER_WORDS = new Set(['title', 'what', 'name', 'description', 'existing', 'confirm.title', 'confirm.body', 'create']);

export const MonitorKit = ({ type = 'HTTP' }: { type?: 'HTTP' | 'BROWSER' }) => {
  const { t, formatNumber } = useTranslation();
  // 3.7.8: the same kit for browser monitors (the owner: "No POC Builder pode manter 2 janelas"), its own test ids and words.
  const browser = type === 'BROWSER';
  const tid = browser ? 'builder-bmon' : 'builder-mon';
  const k = (key: string) => (browser && BROWSER_WORDS.has(key) ? `builder.bmon.${key}` : `builder.mon.${key}`) as StringKey;
  const { parameters, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const [extra, setExtra] = useState('');
  const [locations, setLocations] = useState<SyntheticLocation[] | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<number>(15);
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const existing = pocPlan.monitors ?? [];
  const mine = existing.filter((monitor) => (monitor.type === 'BROWSER') === browser);

  useEffect(() => {
    let live = true;
    void listPublicLocations()
      .then((found) => {
        if (!live) return;
        const usable = locationsFor(type, found);
        setLocations(usable);
        setLocation((current) => current ?? defaultLocation(usable)?.id ?? null);
      })
      .catch(() => {
        if (live) setLocations([]);
      });
    return () => {
      live = false;
    };
  }, [type]);

  const typed = extra
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
  const valid = typed.map(safeWebUrl).filter((url) => url !== '');
  const invalid = typed.filter((part) => safeWebUrl(part) === '');
  const urls = [...new Set([parameters.customerUrl, ...valid].filter((url) => url !== ''))]
    .filter((url) => !mine.some((monitor) => monitor.url === url))
    .slice(0, Math.max(0, MAX_POC_MONITORS - existing.length));
  const customer = parameters.customerName.trim() === '' ? 'PoC' : parameters.customerName.trim();

  const run = async () => {
    if (location === null) return;
    setBusy({ kind: 'busy' });
    const made: PocMonitorRef[] = [];
    let failed = 0;
    let reason: string | null = null;
    for (const url of urls) {
      const host = new URL(url).hostname;
      const name = t(k('name'), { host, customer });
      try {
        const monitorBody = browser
          ? buildBrowserMonitor(name, url, location, frequency, t(k('description')), t('builder.bmon.step', { host }))
          : buildHttpMonitor(name, url, location, frequency, t(k('description')));
        const id = await createHttpMonitor(monitorBody);
        const ref: PocMonitorRef = { id, name, url, locationId: location, createdAt: new Date().toISOString(), createdBy: access.identity.email || null, shared: true };
        made.push(browser ? { ...ref, type: 'BROWSER' } : ref);
      } catch (error) {
        failed += 1;
        reason = t(failureKey(error));
      }
    }
    if (made.length > 0) setPocPlan({ ...pocPlan, monitors: [...existing, ...made] });
    setBusy({ kind: 'done', ok: made.length, failed, reason });
  };

  return (
    <Panel pad="roomy" data-testid={browser ? 'builder-browser-kit' : 'builder-monitor-kit'}>
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t(k('title'))}
          </Heading>
          <Paragraph className="pvs-prose">{t(k('what'))}</Paragraph>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.mon.main')}</Text>
          {/* 3.7.4 (the owner: it was not clear the monitor on offer came from Settings): where the address comes from, and that it is ready. */}
          <Text data-testid={`${tid}-main`}>
            {parameters.customerUrl === '' ? t('builder.mon.noMain') : t('builder.mon.fromSettings', { url: parameters.customerUrl })}
          </Text>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label" id={`${tid}-extra-label`}>
            {t('builder.mon.extra')}
          </Text>
          <TextInput value={extra} onChange={setExtra} placeholder={t('builder.mon.urlPlaceholder')} aria-labelledby={`${tid}-extra-label`} data-testid={`${tid}-extra`} />
          {invalid.length > 0 && <Text className="pvs-caption">{t('builder.mon.invalid', { list: invalid.join(', ') })}</Text>}
        </Stack>
        <Cluster>
          <Stack gap="tight">
            <Text className="pvs-label" id={`${tid}-location-label`}>
              {t('builder.mon.location')}
            </Text>
            {locations === null ? (
              <Text className="pvs-caption">{t('builder.mon.loadingLocations')}</Text>
            ) : locations.length === 0 ? (
              <Text className="pvs-caption">{t('builder.mon.noLocations')}</Text>
            ) : (
              <Select value={location} onChange={(value) => typeof value === 'string' && setLocation(value)} aria-labelledby={`${tid}-location-label`}>
                <Select.Content>
                  {locations.map((entry) => (
                    <Select.Option key={entry.id} value={entry.id}>
                      {entry.name}
                    </Select.Option>
                  ))}
                </Select.Content>
              </Select>
            )}
          </Stack>
          <Stack gap="tight">
            <Text className="pvs-label" id={`${tid}-frequency-label`}>
              {t('builder.mon.frequency')}
            </Text>
            <Select value={String(frequency)} onChange={(value) => typeof value === 'string' && setFrequency(Number(value))} aria-labelledby={`${tid}-frequency-label`}>
              <Select.Content>
                {MONITOR_FREQUENCIES.map((minutes) => (
                  <Select.Option key={minutes} value={String(minutes)}>
                    {t('builder.mon.every', { minutes: formatNumber(minutes) })}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          </Stack>
        </Cluster>
        {mine.length > 0 && <Text className="pvs-caption">{t(k('existing'), { n: formatNumber(mine.length) })}</Text>}
        {busy.kind === 'confirm' ? (
          <Confirm
            title={t(k('confirm.title'), { n: formatNumber(urls.length) })}
            body={t(k('confirm.body'), { minutes: formatNumber(frequency) })}
            onGo={() => void run()}
            onCancel={() => setBusy({ kind: 'idle' })}
            testId={`${tid}-confirm`}
          />
        ) : (
          <Cluster>
            <Button
              variant="emphasized"
              onClick={() => setBusy({ kind: 'confirm' })}
              disabled={urls.length === 0 || location === null || busy.kind === 'busy'}
              data-testid={`${tid}-create`}
            >
              {t(k('create'), { n: formatNumber(urls.length) })}
            </Button>
            {busy.kind === 'busy' && (
              <Text role="status" className="pvs-caption">
                {t('builder.auto.busy')}
              </Text>
            )}
          </Cluster>
        )}
        <Result busy={busy} />
      </Stack>
    </Panel>
  );
};

/** The SE's time zone (the weekly schedule's), or UTC when the browser does not say. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * 3.7.4 (the owner: "resumo semanal da PoC por e-mail"): the weekly summary workflow — every Monday at 09:00 in the SE's
 * time zone, the app's weekly action, Dynatrace Assist's reading and the e-mail — handed to the Workflows app (as the
 * triage's), its schedule on: the SE only saves it.
 */
export const WeeklyKit = () => {
  const { t, locale } = useTranslation();
  const { parameters, pocPlan } = useStudio();
  const access = useAccess();
  const customer = parameters.customerName.trim();
  // 3.7.6: the e-mail links the PoC's overview dashboard when the Builder created it (never the app: the customer has no access).
  const overviewId = pocPlan.specialtyDashboards?.overview?.id ?? null;
  const [to, setTo] = useState(access.identity.email || '');
  const [shared, setShared] = useState(true);
  const [opened, setOpened] = useState(false);
  const recipients = parseRecipients(to);
  const timezone = browserTimeZone();

  const body = () =>
    buildWeeklyWorkflow(
      {
        title: t('builder.weekly.name', { customer: customer === '' ? 'PoC' : customer }),
        description: t('builder.weekly.description'),
        weeklyDescription: t('builder.weekly.task'),
        aiDescription: t('builder.wf.aiTask'),
        aiPrompt: t('builder.weekly.aiPrompt'),
        aiHeading: t('builder.wf.aiHeading'),
        taskDescription: t('builder.wf.task'),
      },
      recipients.valid,
      true,
      shared,
      locale === 'pt-BR' ? 'pt-BR' : 'en',
      customer === '' ? 'PoC' : customer,
      timezone,
      overviewId,
    );

  const download = () => {
    const url = URL.createObjectURL(workflowFile(body()));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'poc-weekly-summary-workflow.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel pad="roomy" data-testid="builder-weekly-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('builder.weekly.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('builder.weekly.what')}</Paragraph>
        </Stack>
        <ol className="pvs-doc-steps">
          <li>{t('builder.weekly.step1', { timezone })}</li>
          <li>{t('builder.weekly.step2')}</li>
          <li>{t('builder.weekly.step3')}</li>
        </ol>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.wf.to')}</Text>
          <TextInput value={to} onChange={setTo} aria-label={t('builder.wf.to')} data-testid="builder-weekly-to" />
          {recipients.invalid.length > 0 && <Text className="pvs-caption">{t('builder.wf.invalid', { list: recipients.invalid.join(', ') })}</Text>}
        </Stack>
        <Checkbox value={shared} onChange={(value) => setShared(value === true)}>
          {t('builder.wf.shared')}
        </Checkbox>
        <Cluster>
          <Button
            variant="emphasized"
            onClick={() => {
              openInWorkflows(body());
              setOpened(true);
            }}
            disabled={recipients.valid.length === 0}
            data-testid="builder-weekly-open"
          >
            {t('builder.wf.open')}
          </Button>
          <Button onClick={download} disabled={recipients.valid.length === 0} data-testid="builder-weekly-download">
            {t('builder.wf.download')}
          </Button>
        </Cluster>
        {opened && (
          <MessageContainer variant="primary">
            <MessageContainer.Title>{t('builder.wf.opened.title')}</MessageContainer.Title>
            <MessageContainer.Description>{t('builder.weekly.opened')}</MessageContainer.Description>
          </MessageContainer>
        )}
        <Text className="pvs-caption">{t('builder.wf.why')}</Text>
      </Stack>
    </Panel>
  );
};

export const WorkflowKit = () => {
  const { t, locale } = useTranslation();
  const { parameters } = useStudio();
  const access = useAccess();
  const customer = parameters.customerName.trim();
  const [to, setTo] = useState(access.identity.email || '');
  const [shared, setShared] = useState(true);
  const [opened, setOpened] = useState(false);
  const recipients = parseRecipients(to);

  const body = () =>
    buildTriageWorkflow(
      {
        title: t('builder.wf.name', { customer: customer === '' ? 'PoC' : customer }),
        description: t('builder.wf.description'),
        triageDescription: t('builder.wf.triageTask'),
        taskDescription: t('builder.wf.task'),
        aiDescription: t('builder.wf.aiTask'),
        aiPrompt: t('builder.wf.aiPrompt'),
        aiHeading: t('builder.wf.aiHeading'),
      },
      recipients.valid,
      // 3.7.1 (the owner): the problem trigger comes on — the SE or the partner only saves it in Workflows.
      true,
      shared,
      locale === 'pt-BR' ? 'pt-BR' : 'en',
    );

  const download = () => {
    const url = URL.createObjectURL(workflowFile(body()));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'poc-problem-triage-workflow.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel pad="roomy" data-testid="builder-wf-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('builder.wf.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('builder.wf.what')}</Paragraph>
        </Stack>
        <ol className="pvs-doc-steps">
          <li>{t('builder.wf.step1')}</li>
          <li>{t('builder.wf.step2')}</li>
          <li>{t('builder.wf.step3')}</li>
        </ol>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.wf.to')}</Text>
          <TextInput value={to} onChange={setTo} aria-label={t('builder.wf.to')} data-testid="builder-wf-to" />
          {recipients.invalid.length > 0 && <Text className="pvs-caption">{t('builder.wf.invalid', { list: recipients.invalid.join(', ') })}</Text>}
        </Stack>
        <Checkbox value={shared} onChange={(value) => setShared(value === true)}>
          {t('builder.wf.shared')}
        </Checkbox>
        <Cluster>
          <Button
            variant="emphasized"
            onClick={() => {
              openInWorkflows(body());
              setOpened(true);
            }}
            disabled={recipients.valid.length === 0}
            data-testid="builder-wf-open"
          >
            {t('builder.wf.open')}
          </Button>
          <Button onClick={download} disabled={recipients.valid.length === 0} data-testid="builder-wf-download">
            {t('builder.wf.download')}
          </Button>
        </Cluster>
        {opened && (
          <MessageContainer variant="primary">
            <MessageContainer.Title>{t('builder.wf.opened.title')}</MessageContainer.Title>
            <MessageContainer.Description>{t('builder.wf.opened.body')}</MessageContainer.Description>
          </MessageContainer>
        )}
        <Text className="pvs-caption">{t('builder.wf.why')}</Text>
      </Stack>
    </Panel>
  );
};

/** Everything this PoC created, as rows of the register and of the clean-up. */
export interface CreatedItem {
  key: string;
  type: 'dashboard' | 'notebook' | 'launchpad' | 'slo' | 'monitor' | 'browserMonitor' | 'detector' | 'pipeline' | 'guardian';
  ref: PocDashboardRef;
  link: string | null;
}

function documentLink(id: string): string | null {
  try {
    return getDocumentLink(id);
  } catch {
    return null;
  }
}

/** The register's items, in the order they belong to the PoC. Pure. */
export function createdItems(plan: PocPlan, docLink: (id: string) => string | null = documentLink): CreatedItem[] {
  const items: CreatedItem[] = [];
  if (plan.dashboard) items.push({ key: 'dash-poc', type: 'dashboard', ref: plan.dashboard, link: docLink(plan.dashboard.id) });
  for (const [id, ref] of Object.entries(plan.specialtyDashboards ?? {})) {
    if (ref) items.push({ key: `dash-${id}`, type: 'dashboard', ref, link: docLink(ref.id) });
  }
  if (plan.notebook) items.push({ key: 'notebook', type: 'notebook', ref: plan.notebook, link: docLink(plan.notebook.id) });
  if (plan.launchpad) items.push({ key: 'launchpad', type: 'launchpad', ref: plan.launchpad, link: docLink(plan.launchpad.id) });
  for (const slo of plan.slos ?? []) items.push({ key: `slo-${slo.id}`, type: 'slo', ref: slo, link: sloLink(slo.id) });
  for (const monitor of plan.monitors ?? []) items.push({ key: `mon-${monitor.id}`, type: monitor.type === 'BROWSER' ? 'browserMonitor' : 'monitor', ref: monitor, link: MONITOR_APP_LINK });
  // 3.7.4: the anomaly detectors and the OpenPipeline pipeline (settings objects).
  for (const detector of plan.detectors ?? []) items.push({ key: `det-${detector.id}`, type: 'detector', ref: detector, link: ANOMALY_SETTINGS_LINK });
  if (plan.pipeline) items.push({ key: 'pipeline', type: 'pipeline', ref: plan.pipeline, link: OPENPIPELINE_LINK });
  // 3.8.3: the Site Reliability Guardians (settings objects of the Site Reliability Guardian app).
  for (const guardian of plan.guardians ?? []) items.push({ key: `grd-${guardian.id}`, type: 'guardian', ref: guardian, link: guardianLink(guardian.id) });
  return items;
}

/** The plan without the items removed from the tenant. Pure. */
export function withoutItems(plan: PocPlan, removed: ReadonlySet<string>): PocPlan {
  const specialty = Object.fromEntries(Object.entries(plan.specialtyDashboards ?? {}).filter(([id]) => !removed.has(`dash-${id}`)));
  const slos = (plan.slos ?? []).filter((slo) => !removed.has(`slo-${slo.id}`));
  const next: PocPlan = { ...plan, dashboard: removed.has('dash-poc') ? null : plan.dashboard, specialtyDashboards: specialty };
  if (removed.has('notebook')) delete next.notebook;
  if (removed.has('launchpad')) delete next.launchpad;
  if (slos.length === 0) delete next.slos;
  else next.slos = slos;
  const monitors = (plan.monitors ?? []).filter((monitor) => !removed.has(`mon-${monitor.id}`));
  if (monitors.length === 0) delete next.monitors;
  else next.monitors = monitors;
  const detectors = (plan.detectors ?? []).filter((detector) => !removed.has(`det-${detector.id}`));
  if (detectors.length === 0) delete next.detectors;
  else next.detectors = detectors;
  if (removed.has('pipeline')) delete next.pipeline;
  const guardians = (plan.guardians ?? []).filter((guardian) => !removed.has(`grd-${guardian.id}`));
  if (guardians.length === 0) delete next.guardians;
  else next.guardians = guardians;
  return next;
}

const removeItem = (item: CreatedItem): Promise<void> => {
  if (item.type === 'slo') return deleteSlo(item.ref.id);
  if (item.type === 'monitor' || item.type === 'browserMonitor') return deleteHttpMonitor(item.ref.id);
  if (item.type === 'detector' || item.type === 'guardian') return deleteSettingsObject(item.ref.id);
  // 3.7.6: the route that sends sources to the pipeline leaves the logs routing first, then the pipeline itself.
  if (item.type === 'pipeline') return unrouteFromPipeline(item.ref.id).then(() => deleteSettingsObject(item.ref.id));
  return deletePocDocument(item.ref.id);
};

/** The end of the PoC: the SE ticks what to remove from the environment and confirms; a 404 means it was already gone. */
export const CleanupPanel = () => {
  const { t, formatNumber } = useTranslation();
  const { pocPlan, setPocPlan } = useStudio();
  const items = createdItems(pocPlan);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  if (items.length === 0) return null;
  const chosen = items.filter((item) => picked.has(item.key));

  const run = async () => {
    setBusy({ kind: 'busy' });
    const removed = new Set<string>();
    let failed = 0;
    let reason: string | null = null;
    for (const item of chosen) {
      try {
        await removeItem(item);
        removed.add(item.key);
      } catch (error) {
        if (statusOf(error) === 404) removed.add(item.key);
        else {
          failed += 1;
          reason = t(failureKey(error));
        }
      }
    }
    if (removed.size > 0) setPocPlan(withoutItems(pocPlan, removed));
    setPicked(new Set());
    setBusy({ kind: 'done', ok: removed.size, failed, reason });
  };

  return (
    <Panel pad="roomy" data-testid="builder-cleanup">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('builder.clean.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('builder.clean.body')}</Paragraph>
        </Stack>
        <ul className="pvs-slo-services">
          {items.map((item) => (
            <li key={item.key}>
              <Checkbox
                value={picked.has(item.key)}
                onChange={() => {
                  const next = new Set(picked);
                  if (next.has(item.key)) next.delete(item.key);
                  else next.add(item.key);
                  setPicked(next);
                }}
                data-testid={`builder-clean-${item.key}`}
              >
                {item.ref.name}
              </Checkbox>
              <span className="pvs-caption">{t(`builder.clean.type.${item.type}` as StringKey)}</span>
            </li>
          ))}
        </ul>
        {busy.kind === 'confirm' ? (
          <Confirm
            title={t('builder.clean.confirm.title', { n: formatNumber(chosen.length) })}
            body={t('builder.clean.confirm.body')}
            onGo={() => void run()}
            onCancel={() => setBusy({ kind: 'idle' })}
            testId="builder-clean-confirm"
            goLabel={t('builder.clean.remove')}
            goColor="critical"
          />
        ) : (
          <Cluster>
            <Button color="critical" onClick={() => setBusy({ kind: 'confirm' })} disabled={chosen.length === 0 || busy.kind === 'busy'} data-testid="builder-clean-go">
              {t('builder.clean.go', { n: formatNumber(chosen.length) })}
            </Button>
            {busy.kind === 'busy' && (
              <Text role="status" className="pvs-caption">
                {t('builder.auto.busy')}
              </Text>
            )}
          </Cluster>
        )}
        <Result busy={busy} />
      </Stack>
    </Panel>
  );
};
