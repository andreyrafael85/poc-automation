import React, { useState } from 'react';

import { getEnvironmentUrl } from '@dynatrace-sdk/app-environment';
import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CopyIcon } from '@dynatrace/strato-icons';

import { useQueryScope, useStudio } from '../config/StudioContext';
import { Panel, Stack } from '../engine';
import '../engine/page-d.css';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { summariseCompetitors } from '../models/competitor';
import { summariseRum } from '../models/rum';
import { summarisePosture } from '../models/security';
import { summariseEstate } from '../models/estate';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { windowDays } from '../utils/time';
import { isDynatraceTechnology, num, parseTechnology, ratio, str } from '../utils/records';

/**
 * First-day content — the whole PoC condensed into a copyable customer message.
 *
 * Self-contained so it can appear both on the PoC timeline and as a tab of the
 * SE Report without duplicating the derivation. Every line is composed only from
 * a measured signal; a line whose metric could not be read is omitted, so what
 * the SE copies is exactly what the tenant showed — never a fabricated figure.
 */

const ENTITY_CATEGORIES = [
  'Hosts',
  'Services',
  'Process instances',
  'Kubernetes clusters',
  'Kubernetes workloads',
  'Web applications',
  'Mobile applications',
  'Synthetic monitors',
] as const;

export const FirstDayContent = () => {
  const scope = useQueryScope();
  const { t, formatNumber } = useTranslation();
  const { resolvedTimeframe, parameters } = useStudio();
  const [copied, setCopied] = useState(false);

  const dayCount = Math.max(1, Math.round(windowDays(resolvedTimeframe)));
  const emailDays = dayCount === 1 ? t('fd.dayOne') : t('fd.dayMany', { n: formatNumber(dayCount) });

  const inventory = useCatalogQuery('cov.inventory', scope);
  const problems = useCatalogQuery('prob.summary', scope);
  const technologies = useCatalogQuery('proc.technologies', scope);
  const business = useCatalogQuery('biz.events.total', scope);
  const vulnerabilities = useCatalogQuery('sec.posture', scope);
  const agents = useCatalogQuery('comp.agents', scope);
  const serviceTotals = useCatalogQuery('svc.totals', scope);
  const rumScore = useCatalogQuery('rum.scorecard', scope);
  const cloudHosts = useCatalogQuery('cloud.hosts', scope);
  const cloudServices = useCatalogQuery('cloud.services', scope);
  const estate = summariseEstate(cloudHosts.records, [], cloudServices.records);

  const categoryCount = (category: string): number | null => {
    if (inventory.outcome !== 'ok') return null;
    return num(inventory.records.find((item) => str(item, 'category') === category), 'value');
  };

  const entities = ENTITY_CATEGORIES.reduce<number | null>((total, category) => {
    const value = categoryCount(category);
    return value === null ? total : (total ?? 0) + value;
  }, null);
  const hosts = categoryCount('Hosts');
  const services = categoryCount('Services');

  const totalProblems =
    problems.outcome === 'ok'
      ? problems.records.reduce((total, record) => total + (num(record, 'problems') ?? 0), 0)
      : null;
  const activeProblems = problems.records
    .filter((record) => str(record, 'event.status') === 'ACTIVE')
    .reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const closedPct =
    problems.outcome === 'ok' && totalProblems
      ? ratio(totalProblems - activeProblems, totalProblems)?.percent ?? null
      : null;

  const distinctTech = (limit?: number): string[] =>
    technologies.outcome === 'ok'
      ? [
          ...new Set(
            technologies.records
              .map((record) => parseTechnology(str(record, 'softwareTechnologies'))?.type)
              .filter(
                (name): name is string =>
                  typeof name === 'string' && name !== 'Not reported' && !isDynatraceTechnology(name),
              ),
          ),
        ].slice(0, limit)
      : [];
  const techCount = technologies.outcome === 'ok' ? distinctTech().length : null;
  const stackNames = distinctTech(6);

  const bizCount = business.outcome === 'ok' ? num(business.records[0], 'events') : null;
  const vulnCount = vulnerabilities.outcome === 'ok' ? summarisePosture(vulnerabilities.records).total : null;
  const { totalAgents: competitorCount } = summariseCompetitors(agents.records);

  const rum = summariseRum(rumScore.records, []);
  const rumRequests = rum.hasData ? rum.totalRequests : null;
  const rumErrorRate = rum.overallErrorRatePct;

  const totalRequests = num(serviceTotals.records[0], 'totalRequests');
  const failureRatePct = num(serviceTotals.records[0], 'failureRatePct');
  const successPct = failureRatePct === null ? null : Math.max(0, Math.min(100, 100 - failureRatePct));

  const fdLines: { key: string; params: Record<string, string> }[] = [];
  const pushLine = (key: string, value: number | null, extra?: Record<string, string>) => {
    if (value === null || value < 0) return;
    fdLines.push({ key, params: { value: formatNumber(value), ...(extra ?? {}) } });
  };
  pushLine('fd.line.entities', entities);
  pushLine('fd.line.hosts', hosts);
  pushLine('fd.line.services', services);
  pushLine('fd.line.technologies', techCount);
  if (stackNames.length > 0) {
    fdLines.push({ key: 'fd.line.stack', params: { value: stackNames.join(', ') } });
  }
  if (totalRequests !== null && totalRequests > 0 && successPct !== null) {
    fdLines.push({
      key: 'fd.line.requests',
      params: { value: formatNumber(totalRequests), pct: formatNumber(Number(successPct.toFixed(2))) },
    });
  }
  pushLine('fd.line.problems', totalProblems);
  pushLine('fd.line.closed', closedPct === null ? null : Math.round(closedPct));
  pushLine('fd.line.vulnerabilities', vulnCount);
  pushLine('fd.line.business', bizCount);
  pushLine('fd.line.competitor', competitorCount > 0 ? competitorCount : null);
  if (rumRequests !== null && rumRequests > 0) {
    fdLines.push({
      key: 'fd.line.rum',
      params: { value: formatNumber(rumRequests), pct: formatNumber(rumErrorRate ?? 0) },
    });
  }
  if (estate.cloudHosts > 0) {
    fdLines.push({
      key: 'fd.line.estate',
      params: {
        cloud: formatNumber(estate.cloudHosts),
        providers: estate.providerShorts.length > 0 ? estate.providerShorts.join('/') : '—',
      },
    });
  }
  if (estate.cloudServices !== null && estate.topCloudServices.length > 0) {
    fdLines.push({
      key: 'fd.line.cloudServices',
      params: {
        count: formatNumber(estate.cloudServices),
        list: estate.topCloudServices
          .slice(0, 4)
          .map((service) => service.family)
          .join(', '),
      },
    });
  }

  const engagement = parameters.engagementName || parameters.customerName;
  // "Olá, time {cliente}," — the greeting names the customer's team; the
  // engagement name rides along in the intro line, e.g. "…ambiente (PoC Itaú)…".
  const greeting = parameters.customerName
    ? t('fd.greeting', { customer: parameters.customerName })
    : t('fd.greetingPlain');
  const engagementSuffix = parameters.engagementName ? ` (${parameters.engagementName})` : '';
  // Outside the platform runtime there is no environment URL; the message then
  // simply has no "access your environment" line rather than failing to render.
  const environmentUrl = (() => {
    try {
      return getEnvironmentUrl().replace(/\/$/, '');
    } catch {
      return null;
    }
  })();
  const fdMessage = [
    greeting,
    '',
    t('fd.intro', { days: emailDays, engagement: engagementSuffix }),
    '',
    ...fdLines.map((line) => t(line.key as StringKey, line.params)),
    '',
    t('fd.closing'),
    '',
    ...(environmentUrl === null ? [] : [t('fd.link', { url: environmentUrl }), '']),
    t('fd.signature'),
  ].join('\n');

  const copyMessage = () => {
    void navigator.clipboard?.writeText(fdMessage).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      },
      () => setCopied(false),
    );
  };

  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <div className="pvs-d-head">
          <Stack gap="tight" className="pvs-d-head__text">
            <Heading level={4} as="h2">
              {t('fd.title')}
            </Heading>
            <Paragraph className="pvs-prose">{t('fd.subtitle')}</Paragraph>
          </Stack>
          <Button variant="accent" color="primary" onClick={copyMessage} aria-label={t('fd.copy')} data-print-hide>
            <Button.Prefix>
              <CopyIcon />
            </Button.Prefix>
            {copied ? t('fd.copied') : t('fd.copy')}
          </Button>
        </div>

        <div className="pvs-d-message">{fdMessage}</div>

        {!engagement && <Text className="pvs-caption">{t('fd.na')}</Text>}
      </Stack>
    </Panel>
  );
};
