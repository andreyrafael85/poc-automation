import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Checkbox } from '@dynatrace/strato-components/forms';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ExternalLinkIcon } from '@dynatrace/strato-icons';

import { useAccess } from '../../config/AccessContext';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { num, str } from '../../utils/records';
import { appIdOrManifest } from './PocDocumentKit';
import { Confirm, Result, SLO_SERVICES_PRESELECTED, SLO_SERVICES_SHOWN, failureKey, type Busy } from './PocAutomationKits';
import {
  ANOMALY_SETTINGS_LINK,
  DETECTOR_KINDS,
  FAILURE_RATE_LINE,
  LOG_LEVEL_MATCHER,
  OPENPIPELINE_LINK,
  OPENPIPELINE_ROUTING_LINK,
  PIPELINE_SCHEMA,
  DETECTOR_SCHEMA,
  buildDetector,
  checkActor,
  detectorIntent,
  openDetectorInApp,
  refusalOf,
  responseBodyOf,
  buildLogLevelPipeline,
  createSettingsObject,
  routeMatcher,
  routeToPipeline,
  type RouteSource,
  type DetectorKind,
  type DetectorWords,
} from './pocSettings';
import { MAX_POC_DETECTORS, type PocDetectorRef } from '../../models/pocPlan';

/**
 * 3.7.4 — the PoC Builder's anomaly detection kit: Davis anomaly detectors on the golden signals of the services the SE
 * picks (the busiest of the app's own ranking, three ticked). 3.8.0 (the owner's validation of 3.7.9: the Anomaly Detection
 * app refused the detector the intent opened — "Provided actor is not a valid service user or access is restricted" — and
 * ticking services alone opened nothing): a detector runs as a **service user**, never as a person, so the SE picks one here
 * (those already running detectors on the tenant are offered once the platform accepts them, or one is pasted), the app checks
 * it with the settings service before anything is written (`validateOnly`), then creates the detectors itself after a
 * confirmation — one per signal over the services ticked, or one per signal **and per service** — kept in the register and
 * removed by the clean-up. Opening a detector in the Anomaly Detection app stays as a second way.
 */
export const AnomalyKit = () => {
  const { t, formatNumber } = useTranslation();
  const { parameters, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const ranking = useCatalogQuery('svc.ranking', useQueryScope());
  const services = (ranking.outcome === 'ok' ? ranking.records : [])
    .map((record) => ({ id: str(record, 'serviceId') ?? '', name: str(record, 'name') ?? '', requests: num(record, 'totalRequests') }))
    .filter((service) => /^SERVICE-[0-9A-F]{16}$/.test(service.id))
    .slice(0, SLO_SERVICES_SHOWN);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const chosen = picked ?? new Set(services.slice(0, SLO_SERVICES_PRESELECTED).map((service) => service.id));
  const [kinds, setKinds] = useState<Set<DetectorKind>>(new Set(DETECTOR_KINDS));
  const [perService, setPerService] = useState(false);
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const existing = pocPlan.detectors ?? [];
  const customer = parameters.customerName.trim() === '' ? 'PoC' : parameters.customerName.trim();

  // 3.8.1: the service user is set in Settings → PoC plan; here the kit only reads it and can ask the platform again.
  const [check, setCheck] = useState<{ state: 'checking' | 'ok' | 'refused'; reason?: string } | null>(null);
  const saved = pocPlan.detectorActor ?? '';
  const canCreate = access.canManageAccess;

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const ids = services.filter((service) => chosen.has(service.id)).map((service) => service.id);
  const signals = DETECTOR_KINDS.filter((kind) => kinds.has(kind));
  const split = perService && ids.length > 0;
  const room = Math.max(0, MAX_POC_DETECTORS - existing.length);
  // What would be created: one detector per signal over the ticked services (none ticked: every service), or one per signal and service.
  const plan = (split ? signals.flatMap((kind) => ids.map((id) => ({ kind, serviceIds: [id] }))) : signals.map((kind) => ({ kind, serviceIds: ids }))).slice(0, room);
  const nameOf = (id: string) => services.find((service) => service.id === id)?.name ?? id;
  const words = (kind: DetectorKind, serviceIds: readonly string[]): DetectorWords => ({
    title:
      split && serviceIds[0] !== undefined
        ? t('builder.ad.nameService', { signal: t(`builder.ad.kind.${kind}` as StringKey), service: nameOf(serviceIds[0]), customer })
        : t('builder.ad.name', { signal: t(`builder.ad.kind.${kind}` as StringKey), customer }),
    description: serviceIds.length === 0 ? t('builder.ad.descriptionAll') : t('builder.ad.description', { n: formatNumber(serviceIds.length) }),
    eventName: t(`builder.ad.event.${kind}` as StringKey),
    eventDescription: t('builder.ad.eventDescription'),
  });

  const recheck = async () => {
    setCheck({ state: 'checking' });
    const refusal = await checkActor(saved);
    setCheck(refusal === null ? { state: 'ok' } : { state: 'refused', reason: refusal === 'not-an-id' ? t('builder.ad.actor.notId') : refusal });
  };

  const run = async () => {
    setBusy({ kind: 'busy' });
    const made: PocDetectorRef[] = [];
    let failed = 0;
    let reason: string | null = null;
    for (const item of plan) {
      const text = words(item.kind, item.serviceIds);
      const value = buildDetector(item.kind, item.serviceIds, text, saved);
      if (value === null) {
        failed += 1;
        continue;
      }
      try {
        const id = await createSettingsObject(DETECTOR_SCHEMA, value);
        const serviceId = split ? item.serviceIds[0] : undefined;
        made.push({
          id,
          name: text.title,
          kind: item.kind,
          createdAt: new Date().toISOString(),
          createdBy: access.identity.email || null,
          shared: true,
          ...(serviceId === undefined ? {} : { serviceId }),
        });
      } catch (error) {
        failed += 1;
        const refusal = refusalOf(await responseBodyOf(error), '');
        reason = refusal === '' ? t(failureKey(error)) : refusal;
      }
    }
    if (made.length > 0) setPocPlan({ ...pocPlan, detectors: [...existing, ...made] });
    setBusy({ kind: 'done', ok: made.length, failed, reason });
  };

  const open = (kind: DetectorKind) => {
    const payload = detectorIntent(kind, ids, words(kind, ids), appIdOrManifest());
    if (payload !== null) openDetectorInApp(payload);
  };

  const scope = split
    ? t('builder.ad.perServiceScope', { n: formatNumber(ids.length) })
    : chosen.size === 0
      ? t('builder.ad.noneMeansAll')
      : t('builder.ad.chosen', { n: formatNumber(chosen.size) });

  return (
    <Panel pad="roomy" data-testid="builder-anomaly-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('builder.ad.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('builder.ad.what')}</Paragraph>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.ad.signals')}</Text>
          <ul className="pvs-slo-services">
            {DETECTOR_KINDS.map((kind) => (
              <li key={kind}>
                <Checkbox value={kinds.has(kind)} onChange={() => setKinds(toggle(kinds, kind))} data-testid={`builder-ad-kind-${kind}`}>
                  {t(`builder.ad.kind.${kind}` as StringKey)}
                </Checkbox>
                <span className="pvs-caption">{t(`builder.ad.rule.${kind}` as StringKey, { line: formatNumber(FAILURE_RATE_LINE) })}</span>
              </li>
            ))}
          </ul>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.slo.services', { shown: formatNumber(services.length) })}</Text>
          {services.length === 0 ? (
            <Text className="pvs-muted">{t('builder.slo.noServices')}</Text>
          ) : (
            <ul className="pvs-slo-services">
              {services.map((service) => (
                <li key={service.id}>
                  <Checkbox value={chosen.has(service.id)} onChange={() => setPicked(toggle(chosen, service.id))} data-testid={`builder-ad-svc-${service.id}`}>
                    {service.name}
                  </Checkbox>
                </li>
              ))}
            </ul>
          )}
          <Checkbox value={perService} onChange={() => setPerService(!perService)} disabled={ids.length === 0} data-testid="builder-ad-per-service">
            {t('builder.ad.perService')}
          </Checkbox>
        </Stack>
        <Text className="pvs-caption" data-testid="builder-ad-scope">
          {scope}
        </Text>

        <Stack gap="tight" data-testid="builder-ad-actor">
          <Text className="pvs-label">{t('builder.ad.actor.title')}</Text>
          {saved !== '' ? (
            <Text data-testid="builder-ad-actor-saved">✓ {t('builder.ad.actor.saved', { id: saved })}</Text>
          ) : (
            <Text className="pvs-caption" data-testid="builder-ad-actor-none">
              {t('builder.ad.actor.fromSettings')}
            </Text>
          )}
          <Cluster>
            {saved !== '' && canCreate && (
              <Button variant="default" onClick={() => void recheck()} disabled={check?.state === 'checking'} data-testid="builder-ad-actor-recheck">
                {t('builder.ad.actor.recheck')}
              </Button>
            )}
            <Link href="/settings?tab=plan" data-testid="builder-ad-actor-settings">
              {t('builder.ad.actor.openSettings')}
            </Link>
          </Cluster>
          {check !== null && (
            <Text className="pvs-caption" data-testid="builder-ad-actor-result" data-state={check.state}>
              {check.state === 'checking'
                ? t('builder.ad.actor.checking')
                : check.state === 'ok'
                  ? t('builder.ad.actor.okBuilder')
                  : t('builder.ad.actor.refused', { reason: check.reason ?? '' })}
            </Text>
          )}
        </Stack>

        {existing.length > 0 && <Text className="pvs-caption">{t('builder.ad.existing', { n: formatNumber(existing.length) })}</Text>}
        {!canCreate ? (
          <Text className="pvs-muted">{t('builder.seOnly')}</Text>
        ) : busy.kind === 'confirm' ? (
          <Confirm
            title={t('builder.ad.confirm.title', { n: formatNumber(plan.length) })}
            body={`${scope} ${t('builder.ad.confirm.body')}`}
            onGo={() => void run()}
            onCancel={() => setBusy({ kind: 'idle' })}
            testId="builder-ad-confirm"
          />
        ) : (
          <Stack gap="tight">
            <Cluster>
              <Button
                variant="accent"
                color="primary"
                onClick={() => setBusy({ kind: 'confirm' })}
                disabled={plan.length === 0 || saved === '' || busy.kind === 'busy'}
                data-testid="builder-ad-create"
              >
                {t('builder.ad.createFor', {
                  n: formatNumber(plan.length),
                  services: split
                    ? t('builder.ad.eachService', { n: formatNumber(ids.length) })
                    : chosen.size === 0
                      ? t('builder.ad.allServices')
                      : t('builder.ad.someServices', { n: formatNumber(chosen.size) }),
                })}
              </Button>
              <Link href={ANOMALY_SETTINGS_LINK} target="_blank" rel="noopener noreferrer" data-testid="builder-ad-settings-link">
                {t('builder.ad.openApp')} <ExternalLinkIcon />
              </Link>
            </Cluster>
            {signals.length === 0 && <Text className="pvs-caption">{t('builder.ad.pickSignal')}</Text>}
            {signals.length > 0 && saved === '' && <Text className="pvs-caption">{t('builder.ad.pickActor')}</Text>}
            {plan.length < (split ? signals.length * ids.length : signals.length) && (
              <Text className="pvs-caption">{t('builder.ad.room', { n: formatNumber(MAX_POC_DETECTORS) })}</Text>
            )}
          </Stack>
        )}
        <Result busy={busy} />

        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.ad.orApp')}</Text>
          <Text className="pvs-caption" data-testid="builder-ad-how">
            {t('builder.ad.viaApp')}
          </Text>
          <Cluster>
            {signals.map((kind) => (
              <Button key={kind} variant="default" onClick={() => open(kind)} data-testid={`builder-ad-open-${kind}`}>
                {t('builder.ad.openKind', { signal: t(`builder.ad.kind.${kind}` as StringKey) })}
              </Button>
            ))}
          </Cluster>
        </Stack>
      </Stack>
    </Panel>
  );
};

/**
 * 3.7.6 (the owner: "como validamos se está totalmente funcional?"): once the pipeline exists, how many records went through
 * it in the last 30 minutes and the level each left with — 0 until a route sends it data (the kit says how).
 */
const PipelineCheck = () => {
  const { t, formatNumber } = useTranslation();
  const check = useCatalogQuery('log.pipeline.check', useQueryScope());
  const record = check.outcome === 'ok' ? check.records[0] : undefined;
  const sampled = num(record, 'sampled');
  let text: string;
  if (check.isLoading) text = t('p.asm.gap.loading');
  else if (record === undefined || sampled === null) text = t('builder.op.check.unread');
  else if (sampled === 0) text = t('builder.op.check.none');
  else
    text = t('builder.op.check.some', {
      sampled: formatNumber(sampled),
      error: formatNumber(num(record, 'error') ?? 0),
      warn: formatNumber(num(record, 'warn') ?? 0),
      info: formatNumber(num(record, 'info') ?? 0),
      none: formatNumber(num(record, 'stillNone') ?? 0),
    });
  return (
    <Stack gap="tight">
      <Text className="pvs-label">{t('builder.op.check.title')}</Text>
      <Text data-testid="builder-op-check">{text}</Text>
    </Stack>
  );
};

/** A source of the route choices, as one line ("Container Output · easytrade-loadgen · oneagent"). */
const sourceLabel = (source: RouteSource) => [source.logSource, source.workload, source.ingest].filter((part) => part !== null && part !== '').join(' · ');

/**
 * 3.7.6 (the owner: "esse ponto 2 você não consegue criar junto na automação do pipeline?"): the sources whose records come
 * without a level (measured, 1:100 over 30 minutes), ticked by the SE, sent to the pipeline by one route the app puts at the
 * top of the logs routing — after a confirmation that says the ingestion of those sources changes from then on. A second run
 * replaces the PoC's route; the clean-up removes it before the pipeline.
 */
const RouteSection = ({ pipelineId, name }: { pipelineId: string; name: string }) => {
  const { t, formatNumber } = useTranslation();
  const sources = useCatalogQuery('log.sources.nolevel', useQueryScope());
  const rows = (sources.outcome === 'ok' ? sources.records : [])
    .map((record) => ({
      source: { logSource: str(record, 'log.source'), workload: str(record, 'k8s.workload.name'), ingest: str(record, 'dt.openpipeline.source') },
      sampled: num(record, 'sampled') ?? 0,
      errors: num(record, 'looksError') ?? 0,
    }))
    .filter((row) => routeMatcher([row.source]) !== null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const chosen = rows.filter((_, index) => picked.has(index)).map((row) => row.source);
  const matcher = routeMatcher(chosen);

  const toggle = (index: number) => {
    const next = new Set(picked);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setPicked(next);
  };

  const run = async () => {
    if (matcher === null) return;
    setBusy({ kind: 'busy' });
    try {
      await routeToPipeline(pipelineId, t('builder.op.route.description', { name }), matcher);
      setBusy({ kind: 'done', ok: 1, failed: 0, reason: null });
    } catch (error) {
      setBusy({ kind: 'done', ok: 0, failed: 1, reason: t(failureKey(error)) });
    }
  };

  return (
    <Stack gap="tight" data-testid="builder-op-route">
      <Text className="pvs-label">{t('builder.op.route.title')}</Text>
      <Text className="pvs-caption">{t('builder.op.route.what')}</Text>
      {sources.isLoading ? (
        <Text>{t('p.asm.gap.loading')}</Text>
      ) : rows.length === 0 ? (
        <Text className="pvs-muted">{t('builder.op.route.none')}</Text>
      ) : (
        <ul className="pvs-slo-services">
          {rows.map((row, index) => (
            <li key={sourceLabel(row.source)}>
              <Checkbox value={picked.has(index)} onChange={() => toggle(index)} data-testid={`builder-op-src-${index}`}>
                {sourceLabel(row.source)}
              </Checkbox>
              <span className="pvs-caption">{t('builder.op.route.counts', { sampled: formatNumber(row.sampled), errors: formatNumber(row.errors) })}</span>
            </li>
          ))}
        </ul>
      )}
      {busy.kind === 'confirm' && matcher !== null ? (
        <Confirm
          title={t('builder.op.route.confirm.title', { n: formatNumber(chosen.length) })}
          body={t('builder.op.route.confirm.body', { matcher })}
          onGo={() => void run()}
          onCancel={() => setBusy({ kind: 'idle' })}
          testId="builder-op-route-confirm"
          goLabel={t('builder.op.route.go')}
        />
      ) : (
        <Cluster>
          <Button variant="emphasized" onClick={() => setBusy({ kind: 'confirm' })} disabled={matcher === null || busy.kind === 'busy'} data-testid="builder-op-route-create">
            {t('builder.op.route.create', { n: formatNumber(chosen.length) })}
          </Button>
        </Cluster>
      )}
      <Result busy={busy} />
    </Stack>
  );
};

/**
 * 3.7.4 — the PoC Builder's OpenPipeline kit:/**
 * 3.7.4 — the PoC Builder's OpenPipeline kit: why logs without a level matter (measured on this environment), the rule the
 * pipeline applies, and the pipeline created on the SE's click — with no route, so nothing changes until the SE routes the
 * chosen sources to it in the OpenPipeline app (the kit says how).
 */
export const OpenPipelineKit = () => {
  const { t, formatNumber } = useTranslation();
  const { parameters, pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const preview = useCatalogQuery('log.levels.preview', useQueryScope());
  const record = preview.outcome === 'ok' ? preview.records[0] : undefined;
  const pct = num(record, 'withoutLevelPct');
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const existing = pocPlan.pipeline ?? null;
  const customer = parameters.customerName.trim() === '' ? 'PoC' : parameters.customerName.trim();

  const run = async () => {
    setBusy({ kind: 'busy' });
    const name = t('builder.op.name', { customer });
    try {
      const id = await createSettingsObject(PIPELINE_SCHEMA, buildLogLevelPipeline(name, t('builder.op.processor')));
      setPocPlan({ ...pocPlan, pipeline: { id, name, createdAt: new Date().toISOString(), createdBy: access.identity.email || null, shared: true } });
      setBusy({ kind: 'done', ok: 1, failed: 0, reason: null });
    } catch (error) {
      setBusy({ kind: 'done', ok: 0, failed: 1, reason: t(failureKey(error)) });
    }
  };

  return (
    <Panel pad="roomy" data-testid="builder-openpipeline-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('builder.op.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('builder.op.why')}</Paragraph>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.op.measured')}</Text>
          <Text data-testid="builder-op-preview">
            {record === undefined
              ? t('builder.op.notRead')
              : t('builder.op.preview', {
                  pct: pct === null ? '—' : `${formatNumber(pct)}%`,
                  error: formatNumber(num(record, 'toError') ?? 0),
                  warn: formatNumber(num(record, 'toWarn') ?? 0),
                  info: formatNumber(num(record, 'toInfo') ?? 0),
                  without: formatNumber(num(record, 'withoutLevel') ?? 0),
                })}
          </Text>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.op.rule')}</Text>
          <ul className="pvs-doc-steps">
            <li>{t('builder.op.rule.match', { matcher: LOG_LEVEL_MATCHER })}</li>
            <li>{t('builder.op.rule.error')}</li>
            <li>{t('builder.op.rule.warn')}</li>
            <li>{t('builder.op.rule.info')}</li>
          </ul>
        </Stack>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.op.after')}</Text>
          <ol className="pvs-doc-steps">
            <li>{t('builder.op.step1')}</li>
            <li>{t('builder.op.step2')}</li>
            <li>{t('builder.op.step3')}</li>
          </ol>
        </Stack>
        {existing !== null && <Text className="pvs-caption">{t('builder.op.existing', { name: existing.name })}</Text>}
        {existing !== null && <PipelineCheck />}
        {existing !== null && <RouteSection pipelineId={existing.id} name={existing.name} />}
        {busy.kind === 'confirm' ? (
          <Confirm title={t('builder.op.confirm.title')} body={t('builder.op.confirm.body')} onGo={() => void run()} onCancel={() => setBusy({ kind: 'idle' })} testId="builder-op-confirm" />
        ) : (
          <Cluster>
            <Button variant="emphasized" onClick={() => setBusy({ kind: 'confirm' })} disabled={existing !== null || busy.kind === 'busy'} data-testid="builder-op-create">
              {t('builder.op.create')}
            </Button>
            <Link href={OPENPIPELINE_LINK} target="_blank" rel="noopener noreferrer">
              {t('builder.op.openApp')} <ExternalLinkIcon />
            </Link>
            <Link href={OPENPIPELINE_ROUTING_LINK} target="_blank" rel="noopener noreferrer">
              {t('builder.op.openRouting')} <ExternalLinkIcon />
            </Link>
          </Cluster>
        )}
        <Result busy={busy} />
      </Stack>
    </Panel>
  );
};
