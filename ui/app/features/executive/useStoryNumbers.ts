import { useQueryScope, useStudio } from '../../config/StudioContext';
import { useCatalogQuery, type CatalogQueryResult } from '../../hooks/useCatalogQuery';
import { diagnoseEntityModel } from '../../models/entityHealth';
import { arrivalSeries, type ArrivalBin } from '../../models/problemTimeline';
import { num, ratio, str } from '../../utils/records';

/** The eight entity categories the coverage ring is measured against (the Overview's). */
export const STORY_CATEGORIES = [
  'Hosts',
  'Services',
  'Process instances',
  'Kubernetes clusters',
  'Kubernetes workloads',
  'Web applications',
  'Mobile applications',
  'Synthetic monitors',
] as const;

export interface StoryNumbers {
  inventory: CatalogQueryResult;
  problems: CatalogQueryResult;
  timeline: CatalogQueryResult;
  serviceTotals: CatalogQueryResult;
  /** Share of the eight categories with at least one entity; null when not read or in an outage. */
  coveragePct: number | null;
  monitoredEntities: number | null;
  activeProblems: number | null;
  closedProblems: number | null;
  closurePct: number | null;
  services: number | null;
  servicesWithTraffic: number | null;
  serviceHealthPct: number | null;
  arrivals: ArrivalBin[];
}

/**
 * The opening numbers of the story pages (3.2.3: the Executive summary opens like the Overview):
 * the three rings and the headline counts, read from the same queries, with the same refusals —
 * an entity-model outage yields no counts, a query that did not answer yields no figure.
 */
export function useStoryNumbers(): StoryNumbers {
  const scope = useQueryScope();
  const { resolvedTimeframe } = useStudio();
  const inventory = useCatalogQuery('cov.inventory', scope);
  const problems = useCatalogQuery('prob.summary', scope);
  const timeline = useCatalogQuery('prob.timeline', scope);
  const serviceTotals = useCatalogQuery('svc.ranking.total', scope);

  const outage = diagnoseEntityModel(inventory.records).state === 'unavailable';
  const count = (category: string): number | null => {
    if (inventory.outcome !== 'ok' || outage) return null;
    return num(inventory.records.find((record) => str(record, 'category') === category), 'value');
  };
  const monitoredEntities = STORY_CATEGORIES.reduce<number | null>((total, category) => {
    const value = count(category);
    return value === null ? total : (total ?? 0) + value;
  }, null);
  const covered = STORY_CATEGORIES.filter((category) => (count(category) ?? 0) > 0).length;
  const coveragePct = inventory.outcome === 'ok' && !outage ? (covered / STORY_CATEGORIES.length) * 100 : null;

  const problemsRead = problems.outcome === 'ok';
  const total = problems.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const active = problems.records
    .filter((record) => str(record, 'event.status') === 'ACTIVE')
    .reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const closurePct = problemsRead ? ratio(total - active, total)?.percent ?? null : null;

  const row = serviceTotals.records[0];
  const servicesWithTraffic = num(row, 'services');
  const above = num(row, 'aboveOnePct');
  const serviceHealthPct =
    serviceTotals.outcome === 'ok' && servicesWithTraffic !== null && servicesWithTraffic > 0 && above !== null
      ? ((servicesWithTraffic - above) / servicesWithTraffic) * 100
      : null;

  const arrivals = timeline.outcome === 'ok' ? arrivalSeries(timeline.records, Date.parse(resolvedTimeframe.endIso)) : [];

  return {
    inventory,
    problems,
    timeline,
    serviceTotals,
    coveragePct,
    monitoredEntities,
    activeProblems: problemsRead ? active : null,
    closedProblems: problemsRead ? total - active : null,
    closurePct,
    services: count('Services'),
    servicesWithTraffic,
    serviceHealthPct,
    arrivals,
  };
}
