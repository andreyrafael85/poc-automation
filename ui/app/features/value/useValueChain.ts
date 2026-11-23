import { AutomationEngineIcon, AiIcon, HostsIcon, OneAgentSignetIcon, StopwatchIcon } from '@dynatrace/strato-icons';

import { useQueryScope } from '../../config/StudioContext';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useTranslation } from '../../i18n/useTranslation';
import { summariseCompetitors } from '../../models/competitor';
import { formatHours } from '../../models/cost';
import { diagnoseEntityModel } from '../../models/entityHealth';
import { num, ratio, str } from '../../utils/records';
import type { ChainLink } from './ValueChain';

/**
 * The figures of the value chain (3.2.6), read once for Value & ROI and the general report: the
 * entities discovered, the problems detected, the share closed and the measured MTTR, the
 * recurring patterns a workflow could take, and — only when they were found — the competitor
 * agents a consolidation would retire. Same queries and rules as the pages that show each figure.
 */

const NS_PER_HOUR = 3_600_000_000_000;

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

export function useValueChain(): ChainLink[] {
  const scope = useQueryScope();
  const { t, tCount, formatNumber } = useTranslation();
  const inventory = useCatalogQuery('cov.inventory', scope);
  const problems = useCatalogQuery('prob.summary', scope);
  const mttx = useCatalogQuery('prob.mttx', scope);
  const recurrent = useCatalogQuery('prob.recurrent.total', scope);
  const agents = useCatalogQuery('comp.agents', scope);

  // Every category answering zero at once is an entity-model outage, not an empty estate.
  const outage = diagnoseEntityModel(inventory.records).state === 'unavailable';
  const entities = ENTITY_CATEGORIES.reduce<number | null>((total, category) => {
    if (inventory.outcome !== 'ok' || outage) return total;
    const value = num(inventory.records.find((item) => str(item, 'category') === category), 'value');
    return value === null ? total : (total ?? 0) + value;
  }, null);
  const totalProblems = problems.outcome === 'ok' ? problems.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0) : null;
  const active = problems.records.filter((record) => str(record, 'event.status') === 'ACTIVE').reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const closurePct = problems.outcome === 'ok' && totalProblems ? (ratio(totalProblems - active, totalProblems)?.percent ?? null) : null;
  const resolvedNs = mttx.records.reduce((sum, record) => sum + (num(record, 'totalNs') ?? 0), 0);
  const resolved = mttx.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const mttrHours = mttx.outcome === 'ok' && resolved > 0 ? resolvedNs / resolved / NS_PER_HOUR : null;
  const recurring = recurrent.outcome === 'ok' ? num(recurrent.records[0], 'patterns') : recurrent.outcome === 'empty' ? 0 : null;
  const agentsRead = agents.outcome === 'ok' || agents.outcome === 'empty';
  const { totalAgents } = summariseCompetitors(agentsRead ? agents.records : []);

  return [
    {
      key: 'discover',
      Icon: HostsIcon,
      family: 'blue-turquoise',
      step: t('roi3.chain.discover'),
      value: entities === null ? null : formatNumber(entities),
      unit: t('roi.unit.entities'),
      caption: t('roi.driver.coverage.caption'),
      provenance: 'observed',
    },
    {
      key: 'detect',
      Icon: AiIcon,
      family: 'pink-purple',
      step: t('roi3.chain.detect'),
      value: totalProblems === null ? null : formatNumber(totalProblems),
      unit: t('ai.unit.problems'),
      caption: t('roi.driver.detection.caption'),
      provenance: 'observed',
    },
    {
      key: 'resolve',
      Icon: StopwatchIcon,
      family: 'turquoise',
      step: t('roi3.chain.resolve'),
      value: closurePct === null ? null : formatNumber(Math.round(closurePct)),
      unit: '%',
      caption: mttrHours === null ? t('roi.driver.resolution.caption') : t('roi3.chain.resolveCaption', { mttr: formatHours(mttrHours) }),
      provenance: 'derived',
    },
    {
      key: 'automate',
      Icon: AutomationEngineIcon,
      family: 'moss',
      step: t('roi3.chain.automate'),
      value: recurring === null ? null : formatNumber(recurring),
      unit: t('ai.unit.patterns'),
      caption: t('roi.driver.automation.caption'),
      provenance: 'derived',
    },
    ...(agentsRead && totalAgents > 0
      ? [
          {
            key: 'consolidate',
            Icon: OneAgentSignetIcon,
            family: 'orange' as const,
            step: t('roi3.chain.consolidate'),
            value: formatNumber(totalAgents),
            unit: tCount('comp.unit.agents', totalAgents),
            caption: t('roi.driver.consolidation.caption'),
            provenance: 'observed' as const,
          },
        ]
      : []),
  ];
}
