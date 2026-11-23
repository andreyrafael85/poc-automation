import { useCommercialVisible } from '../../components/SeOnly';
import { useQueryScope } from '../../config/StudioContext';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useInsightSignals } from '../../hooks/useInsightSignals';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { diagnoseEntityModel } from '../../models/entityHealth';
import { summariseRum } from '../../models/rum';
import { num } from '../../utils/records';
import { formatNanos } from '../../utils/time';
import { forAudience } from '../insights/audience';
import { deriveInsights, prioritise } from '../insights/deriveInsights';
import { useStoryNumbers } from '../executive/useStoryNumbers';
import { deriveVerdict, summariseMttr } from '../executive/verdict';
import type { KpiStatus } from './deck';
import type { ExecutiveInput } from './spec';

/**
 * The executive page of the SE deck (3.2.4), read from the Executive summary's own queries and
 * rules: the three rings (`useStoryNumbers`), the verdict (`deriveVerdict`), five numbers and the
 * three highest-priority next steps, filtered for the audience exactly as the screen filters them.
 * Under the Customer profile the commercial insights never reach the slide.
 */
export function useExecutiveInput(generatedAtLabel: string): { input: ExecutiveInput; loading: boolean } {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const commercial = useCommercialVisible();
  const story = useStoryNumbers();
  const mttx = useCatalogQuery('prob.mttx', scope);
  const exposure = useCatalogQuery('prob.exposure', scope);
  const rumScore = useCatalogQuery('rum.scorecard', scope);
  const { signals, isLoading: signalsLoading } = useInsightSignals();

  const { overallMttrNs } = summariseMttr(mttx.records);
  const activeProblems = num(exposure.records[0], 'activeProblems');
  const { verdict, key } = deriveVerdict({
    mttxOutcome: mttx.outcome,
    exposureOutcome: exposure.outcome,
    overallMttrNs,
    activeProblems,
    entityModel: diagnoseEntityModel(story.inventory.records).state,
  });
  const tone: KpiStatus | undefined = verdict === 'strong' || verdict === 'good' ? 'good' : verdict === 'attention' ? 'warn' : undefined;

  const rum = summariseRum(rumScore.records, []);
  const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`);

  const insights = forAudience(prioritise(deriveInsights(signals, { t, formatNumber })), commercial).slice(0, 3);

  // 3.3.17 (owner: slide 3 "ainda está antigo… concorre com o slide 18"): "The PoC on one page" —
  // three questions a customer asks, each answered by its ring and a measured sentence; the next
  // steps beside them. No row of numbers: the answers carry the figures, and no wording points at a
  // screen ("the view below") the slide does not have.
  const totalProblems = story.closedProblems === null || story.activeProblems === null ? null : story.closedProblems + story.activeProblems;
  const notMeasured = t('deck.exec.notMeasured');
  const answerCoverage =
    story.monitoredEntities === null || story.coveragePct === null
      ? notMeasured
      : t('deck.exec.a1', { entities: formatNumber(story.monitoredEntities), coverage: percent(story.coveragePct) });
  const answerProblems =
    totalProblems === null || story.closurePct === null
      ? notMeasured
      : t(overallMttrNs === null ? 'deck.exec.a2NoMttr' : 'deck.exec.a2', {
          problems: formatNumber(totalProblems),
          closed: percent(story.closurePct),
          mttr: overallMttrNs === null ? '' : formatNanos(overallMttrNs),
        });
  const rumRate = rum.hasData && rum.overallErrorRatePct !== null ? `${formatNumber(rum.overallErrorRatePct)}%` : null;
  const answerServices =
    story.serviceHealthPct === null || story.servicesWithTraffic === null
      ? notMeasured
      : t(rumRate === null ? 'deck.exec.a3NoRum' : 'deck.exec.a3', {
          health: percent(story.serviceHealthPct),
          services: formatNumber(story.servicesWithTraffic),
          rate: rumRate ?? '',
        });

  const input: ExecutiveInput = {
    title: t('deck.exec.title'),
    subtitle: t('deck.exec.subtitle'),
    verdict: {
      text: `${t(`verdict.${key}` as StringKey)} — ${t(`deck.verdict.${key}` as StringKey)}`,
      tone,
    },
    rings: [
      { label: t('cc.ring.coverage.label'), value: story.coveragePct, display: percent(story.coveragePct), question: t('deck.exec.q1'), answer: answerCoverage },
      { label: t('cc.ring.health.label'), value: story.closurePct, display: percent(story.closurePct), question: t('deck.exec.q2'), answer: answerProblems },
      { label: t('cc.ring.services.label'), value: story.serviceHealthPct, display: percent(story.serviceHealthPct), question: t('deck.exec.q3'), answer: answerServices },
    ],
    numbers: [],
    stepsTitle: t('exec.next.title'),
    steps: insights.map((insight) => ({ title: insight.title, body: insight.recommendation })),
    note: t('deck.exec.note', { generated: generatedAtLabel }),
  };

  const loading =
    signalsLoading ||
    [story.inventory, story.problems, story.timeline, story.serviceTotals, mttx, exposure, rumScore].some((result) => result.outcome === 'loading');
  return { input, loading };
}
