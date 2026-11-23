import React, { useMemo, useState } from 'react';

import { getCurrentUserDetails, getEnvironmentUrl } from '@dynatrace-sdk/app-environment';

import { useQueryScope, useStudio } from '../../config/StudioContext';
import { useCommercialVisible } from '../../components/SeOnly';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useIncidentErrorLogs } from '../../hooks/useIncidentErrorLogs';
import { summariseRca, type IncidentLogs } from '../../models/rca';
import { DYNATRACE_LOGO_WHITE } from './brand';
import { useAssessment } from '../assessment/useAssessment';
import { assessmentSection } from './assessmentSection';
import { buildWrapupModel, type WrapupResults } from './model';
import type { WrapupModel, WrapupSection } from './deck';
import { useCriteriaResults, useCriterionFormat, useCriterionWords } from '../criteria/CriteriaPanel';
import { criteriaScore, type CriterionResult, type CriterionUnit } from '../../models/criteria';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';

type Translate = ReturnType<typeof useTranslation>['t'];
type FormatNumber = ReturnType<typeof useTranslation>['formatNumber'];

/** Injects the incident's own error-log signatures into the RCA deck section. */
export function withIncidentLogs(model: WrapupModel, logs: IncidentLogs, t: Translate, formatNumber: FormatNumber): WrapupModel {
  const technical = model.technical.map((section) => {
    if (section.id !== 'rca') return section;
    const assist = [...(section.assist ?? [])];
    if (logs.hasContent) {
      assist.push(t('tw.rca.logs.totals', { errors: formatNumber(logs.errors), warnings: formatNumber(logs.warnings) }));
      return {
        ...section,
        table: {
          title: t('tw.rca.logs.title'),
          headers: [t('tw.rca.logs.h.sig'), t('tw.rca.logs.h.count')],
          rows: logs.signatures.slice(0, 5).map((sig) => [sig.signature.length > 62 ? `${sig.signature.slice(0, 62)}\u2026` : sig.signature, formatNumber(sig.count)]),
        },
        assist,
      };
    }
    assist.push(logs.hasRows ? t('tw.rca.logs.noContent', { errors: formatNumber(logs.errors), warnings: formatNumber(logs.warnings) }) : t('tw.rca.logs.noLogs'));
    return { ...section, assist };
  });
  return { ...model, technical };
}

const OBJECTIVE_STATUS_KEY: Record<CriterionResult['status'], StringKey> = {
  met: 'crit.status.met',
  'not-met': 'crit.status.notMet',
  measuring: 'crit.status.measuring',
  'not-read': 'crit.status.notRead',
  'no-target': 'crit.status.noTarget',
  'manual-met': 'crit.status.manualMet',
  'manual-not-met': 'crit.status.manualNotMet',
  'manual-pending': 'crit.status.manualPending',
};

/** The deck's "Objectives × what was proven" section, or null when no objective was agreed. */
export function objectivesSection(
  results: readonly CriterionResult[],
  words: (result: CriterionResult) => string,
  format: (value: number, unit: CriterionUnit) => string,
  t: Translate,
): WrapupSection | null {
  if (results.length === 0) return null;
  const score = criteriaScore(results);
  return {
    id: 'objectives',
    title: t('crit.panel.title'),
    subtitle: t('crit.panel.score', { met: String(score.met), total: String(score.total) }),
    narrative: [t('crit.deck.n1'), t('crit.deck.n2')],
    kpis: [
      { label: t('crit.deck.k.met'), value: `${score.met}/${score.total}`, status: score.met === score.total ? 'good' : score.met === 0 ? 'bad' : 'warn' },
    ],
    table: {
      title: t('crit.deck.table'),
      headers: [t('crit.deck.h.objective'), t('crit.deck.h.measured'), t('crit.deck.h.status')],
      rows: results.map((result) => [
        words(result),
        result.metric !== null && result.value !== null ? format(result.value, result.metric.unit) : '—',
        t(OBJECTIVE_STATUS_KEY[result.status]),
      ]),
    },
  };
}

/** The logged-in Dynatrace user's full name, or null outside the runtime. */
export function useSeName(): string | null {
  return useMemo(() => {
    try {
      const name = getCurrentUserDetails().name;
      return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
    } catch {
      return null;
    }
  }, []);
}

/** Natural aspect ratio (w/h) of an uploaded raster logo, measured in the DOM. */
export function useImageAspect(dataUrl: string | null): number | null {
  const [aspect, setAspect] = useState<number | null>(null);
  React.useEffect(() => {
    if (dataUrl === null) {
      setAspect(null);
      return;
    }
    const image = new Image();
    image.onload = () => {
      if (image.naturalHeight > 0) setAspect(image.naturalWidth / image.naturalHeight);
    };
    image.src = dataUrl;
  }, [dataUrl]);
  return aspect;
}

/** The tenant label (subdomain of the environment URL), to name the PoC environment. */
function useTenantLabel(): string | null {
  return useMemo(() => {
    try {
      const host = new URL(getEnvironmentUrl()).hostname;
      const label = host.split('.')[0];
      return label !== undefined && label !== '' ? label : null;
    } catch {
      return null;
    }
  }, []);
}

/** "Generated from {tenant} on {at}": the provenance line of the deck's cover and executive page. */
export function useGeneratedAtLabel(): string {
  const { t, formatDateTime } = useTranslation();
  const { resolvedTimeframe } = useStudio();
  const tenantLabel = useTenantLabel();
  return tenantLabel !== null
    ? t('tw.generatedAtTenant', { tenant: tenantLabel, at: formatDateTime(resolvedTimeframe.endIso) })
    : t('tw.generatedAt', { at: formatDateTime(resolvedTimeframe.endIso) });
}

export interface WrapupViewModel {
  /** The full model with every section (for a "sections to include" list). */
  model: WrapupModel;
  /** The model narrowed to the operator's selection, ready to render/export. */
  viewModel: WrapupModel;
  excluded: ReadonlySet<string>;
  toggleSection: (id: string) => void;
}

/**
 * The Tech Wrapup data model.
 *
 * Reads every catalog query the wrapup needs, builds the translated `WrapupModel` and applies
 * the operator's section selection. The query set and its order are fixed, so the hook count is
 * stable across renders.
 */
export function useWrapupViewModel(): WrapupViewModel {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const { parameters, costModel, baseline, resolvedTimeframe, pocPlan } = useStudio();
  const commercial = useCommercialVisible();
  const seName = useSeName();
  const customerLogoAspect = useImageAspect(parameters.customerLogoDataUrl);
  const partnerLogoAspect = useImageAspect(parameters.partnerLogoDataUrl);
  const generatedAtLabel = useGeneratedAtLabel();
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const toggleSection = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const results: WrapupResults = {
    'cov.inventory': useCatalogQuery('cov.inventory', scope),
    'cov.buckets': useCatalogQuery('cov.buckets', scope),
    'prob.summary': useCatalogQuery('prob.summary', scope),
    'prob.mttx': useCatalogQuery('prob.mttx', scope),
    'prob.exposure': useCatalogQuery('prob.exposure', scope),
    'prob.mttx.rca': useCatalogQuery('prob.mttx.rca', scope),
    'prob.exposure.rca': useCatalogQuery('prob.exposure.rca', scope),
    'prob.timeline': useCatalogQuery('prob.timeline', scope),
    'prob.recurrent.total': useCatalogQuery('prob.recurrent.total', scope),
    'prob.topentities': useCatalogQuery('prob.topentities', scope),
    'rca.top': useCatalogQuery('rca.top', scope),
    'svc.totals': useCatalogQuery('svc.totals', scope),
    'svc.ranking': useCatalogQuery('svc.ranking', scope),
    'proc.technologies': useCatalogQuery('proc.technologies', scope),
    'infra.capacity.total': useCatalogQuery('infra.capacity.total', scope),
    'infra.capacity': useCatalogQuery('infra.capacity', scope),
    'infra.capacity.summary': useCatalogQuery('infra.capacity.summary', scope),
    'k8s.restarts': useCatalogQuery('k8s.restarts', scope),
    'k8s.pressure': useCatalogQuery('k8s.pressure', scope),
    'k8s.restarts.total': useCatalogQuery('k8s.restarts.total', scope),
    'k8s.pressure.total': useCatalogQuery('k8s.pressure.total', scope),
    'log.ingest': useCatalogQuery('log.ingest', scope),
    'log.quality': useCatalogQuery('log.quality', scope),
    'cons.advisor': useCatalogQuery('cons.advisor', scope),
    'sec.posture': useCatalogQuery('sec.posture', scope),
    'rum.scorecard': useCatalogQuery('rum.scorecard', scope),
    'rum.webvitals': useCatalogQuery('rum.webvitals', scope),
    'comp.agents': useCatalogQuery('comp.agents', scope),
    'cloud.hosts': useCatalogQuery('cloud.hosts', scope),
    'cloud.services': useCatalogQuery('cloud.services', scope),
  };

  const windowLabel = t(`timeframe.${resolvedTimeframe.expression}` as StringKey);
  // The RCA deck section needs the incident's own logs (dynamic, entity-scoped).
  const rcaIncident = summariseRca(results['rca.top']?.records ?? [], [], []).incident;
  const incidentLogs = useIncidentErrorLogs(rcaIncident, scope.refreshToken);
  const baseModel = buildWrapupModel(results, {
    t,
    formatNumber,
    params: parameters,
    costModel,
    baseline,
    commercial,
    windowLabel,
    generatedAtLabel,
    seName,
    dtLogo: DYNATRACE_LOGO_WHITE,
    customerLogo: parameters.customerLogoDataUrl,
    customerLogoAspect,
    partnerLogo: parameters.partnerLogoDataUrl,
    partnerLogoAspect,
  });
  const withLogs = withIncidentLogs(baseModel, incidentLogs.logs, t, formatNumber);
  // 3.2.5: the agreed objectives open the business part, judged live (the same verdicts as the
  // PoC Timeline and the general report).
  const criteria = useCriteriaResults(pocPlan.criteria);
  const words = useCriterionWords({ short: true });
  const format = useCriterionFormat();
  const objectives = objectivesSection(criteria, words, format, t);
  // 3.4.10 (F-02): the Assessment opens the business part after the objectives, from the page's own reading.
  const assessment = useAssessment();
  const assessmentSlide = assessmentSection(assessment, t, formatNumber);
  const lead = [...(objectives === null ? [] : [objectives]), ...(assessmentSlide === null ? [] : [assessmentSlide])];
  const model = lead.length === 0 ? withLogs : { ...withLogs, business: [...lead, ...withLogs.business] };

  const includedTechnical = model.technical.filter((section) => !excluded.has(section.id));
  const includedBusiness = model.business.filter((section) => !excluded.has(section.id));
  const viewModel: WrapupModel = {
    ...model,
    technical: includedTechnical,
    business: includedBusiness,
    agenda: [...includedTechnical, ...includedBusiness].map((section) => section.title),
  };

  return { model, viewModel, excluded, toggleSection };
}
