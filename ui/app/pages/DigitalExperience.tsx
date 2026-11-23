import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { ValueCard } from '../components/viz/ValueCard';
import { AssistPanel } from '../components/AssistPanel';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SectionIntro } from '../components/SectionIntro';
import { useQueryScope } from '../config/StudioContext';
import { Cluster, EVIDENCE, Figure, Grid, Panel, Stack } from '../engine';
import '../engine/page-c.css';
import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { missingFact, useSummaryFact } from '../hooks/useSummaryFact';
import { platformEstimate } from '../models/provenance';
import { RUM_FOCUS_APPS } from '../models/appFlow';
import { rateCls, rateLcp, summariseRum } from '../models/rum';
import { getQuery } from '../queries/catalog';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { AppFlow } from '../features/experience/AppFlow';
import { LoadTimeline } from '../features/experience/LoadTimeline';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { FrontendErrors } from '../features/cockpit/panels';
import { VitalsDials } from '../features/experience/VitalsDials';
import { ExperienceFunnel } from '../features/experience/ExperienceFunnel';

/**
 * Applications and digital experience.
 *
 * Rebuilt on Classic RUM `dt.frontend.*` metrics, which read under the
 * `storage:metrics:read` scope the app already holds — so real user experience
 * renders live rather than as a permission gap. When no front-end telemetry was
 * measured (RUM off, or no traffic), the page says "not observed" rather than
 * inventing a story from adjacent data.
 *
 * ## How a Core Web Vitals rating is shown
 *
 * A vital is graded against a published threshold, so its rating is a measured
 * condition and may carry a tone. It never rides on colour alone: every rating has
 * its own icon (check, warning, critical) and its word, and a vital that was not
 * observed is a dashed card with a dash, never a "good".
 *
 * 3.2.6: the two busiest applications get a spotlight each — their vitals, their page load on
 * one time axis, and the services the frontend calls (a compact flow whose boxes open the
 * platform's pages); the error rates are read on one absolute scale with their bands.
 */

const NoTelemetryIcon = EVIDENCE['no-telemetry'].Icon;

export const DigitalExperience = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const scorecard = useCatalogQuery('rum.scorecard', scope);
  const webvitals = useCatalogQuery('rum.webvitals', scope);
  const audience = useCatalogQuery('rum.audience', scope);
  const audienceTotal = useCatalogQuery('rum.audience.total', scope);
  const flow = useCatalogQuery('rum.app.flow', scope);
  const ranking = useCatalogQuery('svc.ranking', scope);

  const summary = summariseRum(scorecard.records, webvitals.records, audience.records, audienceTotal.records[0]);

  // Dynatrace Assist — one sentence per measured signal, nothing padded.
  const assist: string[] = [];
  if (summary.hasData) {
    assist.push(
      t('p.dx2.assist.s.traffic', {
        apps: formatNumber(summary.apps.length),
        requests: formatNumber(summary.totalRequests),
        actions: formatNumber(summary.totalActions),
      }),
    );
    if (summary.overallErrorRatePct !== null) {
      assist.push(t('p.dx2.assist.s.errors', { pct: formatNumber(summary.overallErrorRatePct) }));
    }
    if (summary.worstInp !== null) {
      assist.push(
        summary.poorInpApps > 0
          ? t('p.dx2.assist.s.inp', { inp: formatNumber(Math.round(summary.worstInp)) })
          : t('p.dx2.assist.s.inpGood'),
      );
    }
    if (summary.totalUsers !== null) {
      assist.push(t('p.dx2.assist.s.audience', { users: formatNumber(summary.totalUsers) }));
    } else {
      assist.push(t('p.dx2.assist.s.audienceNo'));
    }
  }

  const topApps = summary.apps.slice(0, RUM_FOCUS_APPS);
  // "LCP and CLS are already healthy" only when the spotlight says so.
  const vitalsHealthy = topApps.every((app) => rateLcp(app.lcp) !== 'poor' && rateLcp(app.lcp) !== 'needs-improvement' && rateCls(app.cls) !== 'poor' && rateCls(app.cls) !== 'needs-improvement');
  const remediation: StringKey[] = [];
  if (summary.poorInpApps > 0) remediation.push('p.dx2.rem.inp1');
  if ((summary.overallErrorRatePct ?? 0) > 0) remediation.push('p.dx2.rem.err1');
  remediation.push(vitalsHealthy ? 'p.dx2.rem.gen1' : 'p.dx3.rem.vitals');

  const sessionsCaption =
    summary.totalSessions === null
      ? t('p.dx2.kpi.sessionsNo')
      : `${t('p.dx2.kpi.sessions')}: ${formatNumber(summary.totalSessions)}`;

  const rate = (value: number | null) => (value === null ? '—' : `${formatNumber(value)}%`);

  return (
    <Stack gap="section">
      {/* The takeaway of this page says the question cannot be answered; that is only true
          when no front-end telemetry was measured, so it is shown only then. */}
      <SectionIntro
        titleKey="p.dx.title"
        questionKey="p.dx.question"
        takeawayKey={summary.hasData ? undefined : 'p.dx.takeaway'}
      />

      {!summary.hasData ? (
        // "Not observed" is a finding only if the scorecard query answered. A query that is
        // still running, or was refused or failed, is not evidence that nobody used the app.
        scorecard.outcome === 'loading' || scorecard.outcome === 'error' || scorecard.outcome === 'no-permission' ? (
          <QueryStateBoundary result={scorecard}>{null}</QueryStateBoundary>
        ) : (
          <Panel evidence="no-telemetry" pad="roomy">
            <Stack gap="tight">
              <Cluster>
                <NoTelemetryIcon aria-hidden="true" />
                <Heading level={4} as="h2">
                  {t('p.dx2.notObserved.title')}
                </Heading>
              </Cluster>
              <Paragraph className="pvs-prose">{t('p.dx2.notObserved.body')}</Paragraph>
            </Stack>
          </Panel>
        )
      ) : (
        <>
          {/* 3.3.12: the headline figures beside the Assist (a cockpit row). */}
          <CockpitRow data-testid="dx-cockpit">
            <Grid min={170}>
              <ValueCard
                family="blue-turquoise"
                eyebrow={t('p.dx2.kpi.users')}
                fact={
                  summary.totalUsers === null
                    ? missingFact(audienceTotal)
                    : platformEstimate(summary.totalUsers, audienceTotal.evidence, t('p.dx2.kpi.usersEstimateNote'))
                }
                value={summary.totalUsers === null ? '—' : formatNumber(summary.totalUsers)}
                caption={
                  summary.totalUsers === null ? `${t('rum.notObserved')} · ${sessionsCaption}` : sessionsCaption
                }
              />
              <ValueCard
                family="turquoise"
                fact={factFrom(scorecard, summary.totalRequests)}
                eyebrow={t('p.dx2.kpi.requests')}
                value={formatNumber(summary.totalRequests)}
                caption={`${t('p.dx2.kpi.apps')}: ${formatNumber(summary.apps.length)}`}
              />
              <ValueCard
                family="moss"
                fact={factFrom(scorecard, summary.totalActions)}
                eyebrow={t('p.dx2.kpi.actions')}
                value={formatNumber(summary.totalActions)}
              />
              <ValueCard
                family="orange"
                fact={factFrom(scorecard, summary.overallErrorRatePct, { calculation: t('rum.kpi.errorRateCalc') })}
                eyebrow={t('p.dx2.kpi.errorRate')}
                value={summary.overallErrorRatePct === null ? '—' : `${formatNumber(summary.overallErrorRatePct)}%`}
                caption={`${t('p.dx2.kpi.errors')}: ${formatNumber(summary.totalErrors)}`}
              />
              <ValueCard
                family="pink-purple"
                fact={factFrom(webvitals, summary.worstInp === null ? null : Math.round(summary.worstInp))}
                eyebrow={t('p.dx2.kpi.worstInp')}
                value={summary.worstInp === null ? '—' : formatNumber(Math.round(summary.worstInp))}
                unit={summary.worstInp === null ? undefined : t('p.dx2.unit.ms')}
                caption={t('p.dx2.cwv.inp')}
              />
            </Grid>
            {assist.length > 0 && (
              <AssistPanel
                eyebrow={t('p.dx2.assist.eyebrow')}
                title={t('p.dx2.assist.title')}
                sentences={assist}
                note={t('p.dx2.assist.note')}
              />
            )}
          </CockpitRow>

          {/* 3.6.2: the Experience funnel — actions → not frustrated → satisfied, beside the requests. */}
          <ExperienceFunnel />

          {/* 3.2.6: a spotlight per busiest application — vitals, page load, the services it calls. */}
          <Stack as="section" gap="group">
            <Stack gap="tight">
              <Heading level={4} as="h2">
                {t('p.dx3.spot.title')}
              </Heading>
              <Paragraph className="pvs-prose pvs-muted">{t('p.dx3.spot.subtitle', { count: formatNumber(topApps.length) })}</Paragraph>
              {summary.apps.length > RUM_FOCUS_APPS && (
                <Text className="pvs-caption">
                  {t('p.dx3.spot.topN', { shown: formatNumber(RUM_FOCUS_APPS), total: formatNumber(summary.apps.length) })}
                </Text>
              )}
            </Stack>
            {topApps.map((app) => (
              <Panel key={app.name} as="article" pad="roomy" className="pvs-spec-band" data-spectrum="orange">
                <span className="pvs-spec-band__edge" aria-hidden="true" />
                <Stack gap="group">
                  <Stack gap="tight">
                    <Heading level={5} as="h3" className="pvs-wrap">
                      {app.name}
                    </Heading>
                    <Text className="pvs-muted">
                      {t('p.dx3.spot.traffic', {
                        requests: app.requests === null ? '—' : formatNumber(app.requests),
                        actions: app.actions === null ? '—' : formatNumber(app.actions),
                        rate: rate(app.errorRatePct),
                      })}
                    </Text>
                  </Stack>
                  <div className="pvs-dx-spot">
                    <Stack gap="tight">
                      <Text className="pvs-label">{t('p.dx3.cwv.title')}</Text>
                      {/* 3.2.3: each vital on a half dial with its three published zones. */}
                      <VitalsDials app={app} />
                    </Stack>
                    <Stack gap="tight">
                      <Text className="pvs-label">{t('p.dx3.load.title')}</Text>
                      <LoadTimeline app={app} />
                    </Stack>
                  </div>
                  <Stack gap="tight">
                    <Text className="pvs-label">{t('p.dx3.flow.title')}</Text>
                    <QueryStateBoundary result={flow}>
                      <AppFlow appName={app.name} flow={flow.records} ranking={ranking.records} />
                    </QueryStateBoundary>
                  </Stack>
                  <Grid min={170}>
                    <AudienceTile label={t('p.dx2.cwv.users')} value={app.users} />
                    <AudienceTile label={t('p.dx2.cwv.sessions')} value={app.sessions} />
                  </Grid>
                </Stack>
              </Panel>
            ))}
          </Stack>

          {/* Errors by app — every application, on one absolute scale with its bands; since 3.3.14
              beside the share of requests without a front-end error (ring + ranking). */}
          <FrontendErrors />

          {/* Remediation: a recommendation, so it wears the recommendation edge. */}
          <Panel as="section" pad="roomy" rail railTone="primary">
            <Stack gap="group">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('p.dx2.rem.title')}
                </Heading>
                <Text className="pvs-muted">{t('p.dx2.rem.subtitle')}</Text>
              </Stack>
              <ol className="pvs-c-steps pvs-prose" aria-label={t('p.dx2.rem.title')}>
                {remediation.map((key, index) => (
                  <li key={key} className="pvs-c-steps__item">
                    <span className="pvs-step">{index + 1}</span>
                    <div className="pvs-c-steps__body">
                      <Text>{t(key)}</Text>
                    </div>
                  </li>
                ))}
              </ol>
            </Stack>
          </Panel>
        </>
      )}

      <DqlDisclosure
        entries={[
          getQuery('rum.scorecard'),
          getQuery('rum.webvitals'),
          getQuery('rum.audience.total'),
          getQuery('rum.audience'),
          getQuery('rum.app.flow'),
          getQuery('svc.ranking'),
        ]}
      />
    </Stack>
  );
};

/** The word and icon of an evidence class, as a small chip (never colour alone). */
const EvidenceWord = ({ provenance, label }: { provenance: 'platform-estimate' | 'no-telemetry'; label: string }) => {
  const entry = EVIDENCE[provenance];
  const Icon = entry.Icon;
  return (
    <Chip color={entry.tone} variant="accent" size="condensed">
      <Chip.Prefix>
        <Icon aria-hidden="true" />
      </Chip.Prefix>
      {label}
    </Chip>
  );
};

/**
 * Active users and sessions are estimates (and a tenant may not populate them at
 * all), so the card wears the estimated class (dashed edge, estimated icon and
 * word) or, when absent, the "not observed" class — never a zero.
 */
const AudienceTile = ({ label, value }: { label: string; value: number | null }) => {
  const { t, formatNumber } = useTranslation();
  const missing = value === null;
  return (
    <Panel pad="compact" evidence={missing ? 'no-telemetry' : 'platform-estimate'}>
      <div className="pvs-c-metric">
        <Text className="pvs-label">{label}</Text>
        <Figure
          value={missing ? '—' : formatNumber(Math.round(value))}
          size="md"
          missing={missing}
          missingLabel={t('rum.notObserved')}
        />
        <Cluster>
          <EvidenceWord
            provenance={missing ? 'no-telemetry' : 'platform-estimate'}
            label={missing ? t('rum.notObserved') : t('p.dx2.cwv.estimated')}
          />
        </Cluster>
      </div>
    </Panel>
  );
};
