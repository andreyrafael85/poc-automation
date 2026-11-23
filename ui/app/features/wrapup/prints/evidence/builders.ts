import { renderQuery, type CatalogId } from '../../../../queries/catalog';
import { EVENT_ID_PATTERN } from '../../../../queries/params';
import type { CatalogParamValues } from '../../../../queries/types';

/**
 * The DQL of the evidence engine (3.2.7, spec §4.3), since TD-08 (3.3.2) read from the catalog.
 *
 * Each query is a parameterised catalog entry (`queries/catalogTemplates.ts`, ids `ev.*` and the
 * trail's `rca.callers` for B3). The functions here only name the entry and its values; the text is
 * `renderQuery`'s, which validates every value with the strict validator of its kind (an entity id
 * anchored `^TYPE-[0-9A-F]{16}$`, of the right type; a Davis `event.id`; a bounded list) and
 * returns null for anything else — a name, a URL, user text or an id with a pipe behind it. The
 * rendered text is byte-identical to the 3.2.7 builders (pinned by `tests/td08.catalogParams.test.ts`),
 * so the text run on the validation tenant (Appendix A of the spec) is still the text that runs, and
 * the traps it encodes stay pinned by `prints.evidence.test.ts`: `rollup: avg` on every Kubernetes
 * gauge, `real_user` on every frontend metric, smartscape ids only through
 * `toSmartscapeId()`/`toString()`, no `bins:`, and `not(dt.davis.is_duplicate)` on every problem read.
 */

/** A Davis `event.id` (`1495944828232761706_1790117520000V2`). Its number is never a time. */
export const EVENT_ID = EVENT_ID_PATTERN;

export { FAILED_ENDPOINTS_ROWS, MAX_SERVICE_IDS, SERVICE_SCREEN_ENDPOINTS } from '../../../../queries/catalogTemplates';

/** One evidence query as it runs: the catalog entry, its validated values, and the rendered text. */
export interface EvidenceQuery {
  catalogId: CatalogId;
  params: CatalogParamValues | null;
  /** The exact text sent to Grail and printed on the slide. */
  dql: string;
}

/** The query of an entry with these values, or null when the catalog refuses a value. */
function query(catalogId: CatalogId, params: CatalogParamValues | null): EvidenceQuery | null {
  const dql = renderQuery(catalogId, params);
  return dql === null ? null : { catalogId, params, dql };
}

const textOf = (built: EvidenceQuery | null): string | null => built?.dql ?? null;

/** B1 `ev.problem.events`: the Davis events grouped in one problem, then the problem row itself. */
export const problemEventsQuery = (eventId: string) => query('ev.problem.events', { eventId });
/** B2 `ev.problem.recurrence`: the top roots by id, this root's own problems, and the totals (15 d window). */
export const recurrenceQuery = (rootId: string) => query('ev.problem.recurrence', { rootId });
/** B3 `ev.incident.callers`: exactly the trail's `rca.callers` (`buildRootCallersDql`), run over W. */
export const incidentCallersQuery = (rootId: string) => query('rca.callers', { rootId });
/** B4 `ev.service.minutes`: requests, failures and p90 (µs) per minute of ≤ 6 services (de-duplicated first). */
export const serviceMinutesQuery = (ids: readonly string[]) => query('ev.service.minutes', { serviceIds: [...new Set(ids)] });
/** B5 `ev.service.endpoints`: failures per endpoint of one service over W. */
export const serviceEndpointsQuery = (serviceId: string) => query('ev.service.endpoints', { serviceId });
/** B6 `ev.frontend.summary`: Core Web Vitals, errors, users and sessions of real users (9 metric keys of 10). */
export const frontendSummaryQuery = (frontendId: string) => query('ev.frontend.summary', { frontendId });
/** B7 `ev.frontend.minutes`: real-user requests and errors per minute over W. */
export const frontendMinutesQuery = (frontendId: string) => query('ev.frontend.minutes', { frontendId });
/** B8 `ev.service.screen`: the numbers the service page shows over the screen window (endpoints + one total row). */
export const serviceScreenQuery = (serviceId: string) => query('ev.service.screen', { serviceId });
/** B9 `ev.entity.events`: the Davis events on one entity (source or affected) in 24 h. */
export const entityEventsQuery = (entityId: string) => query('ev.entity.events', { entityId });
/** B10 `ev.k8s.capacity`: used, requested and limit against allocatable, cores and GiB (`rollup: avg` on every gauge). */
export const k8sCapacityQuery = (clusterId: string) => query('ev.k8s.capacity', { clusterId });
/** B11 `ev.k8s.workloads`: use against request per workload, the largest memory reservations first. */
export const k8sWorkloadsQuery = (clusterId: string) => query('ev.k8s.workloads', { clusterId });
/** B12 `ev.k8s.churn`: restarts per workload in 24 h, sparse OOM kills through a lookup, and the total. */
export const k8sChurnQuery = (clusterId: string) => query('ev.k8s.churn', { clusterId });
/** B13 `ev.k8s.incidentRestarts`: restarts per minute over W, with the first minute (namespaces filtered in TypeScript). */
export const k8sIncidentRestartsQuery = (clusterId: string) => query('ev.k8s.incidentRestarts', { clusterId });
/**
 * B14 `ev.failing.services`: services ranked by failures in EXCESS of the environment rate (≥ 500
 * requests), and the slot's own service as a tagged `isSubject` row (3.2.7 review DQL-2).
 */
export const failingServicesQuery = (serviceId: string) => query('ev.failing.services', { serviceId });
/** B14b `ev.failing.endpoints`: failures, rate and latency per endpoint of the failing service. */
export const failingEndpointsQuery = (serviceId: string) => query('ev.failing.endpoints', { serviceId });
/** B16 `ev.failed.endpoints`: the endpoints with most failures in the screen window, and the totals. */
export const failedEndpointsQuery = () => query('ev.failed.endpoints', null);
/** B15 `ev.logs.errors`: the most frequent ERROR signatures (digits folded) and the ERROR total — the one new logs query. */
export const logErrorsQuery = () => query('ev.logs.errors', null);
/** B17 `ev.topology.blast`: the services up to two hops above the root and the frontends at the top, by id. */
export const topologyBlastQuery = (rootId: string) => query('ev.topology.blast', { rootId });
/** B18 `ev.topology.hubs`: the services with most connections, and the totals of the model. */
export const topologyHubsQuery = () => query('ev.topology.hubs', null);
/** B19 `ev.host.cpu` (opt-in host): the hottest hosts, the slot's own host as an `isSubject` row, and the fleet median. */
export const hostCpuQuery = (hostId: string) => query('ev.host.cpu', { hostId });

// The text alone, as the 3.2.7 builders returned it (the tests and the harness compare texts).
export const problemEventsDql = (eventId: string) => textOf(problemEventsQuery(eventId));
export const recurrenceDql = (rootId: string) => textOf(recurrenceQuery(rootId));
export const incidentCallersDql = (rootId: string) => textOf(incidentCallersQuery(rootId));
export const serviceMinutesDql = (ids: readonly string[]) => textOf(serviceMinutesQuery(ids));
export const serviceEndpointsDql = (serviceId: string) => textOf(serviceEndpointsQuery(serviceId));
export const frontendSummaryDql = (frontendId: string) => textOf(frontendSummaryQuery(frontendId));
export const frontendMinutesDql = (frontendId: string) => textOf(frontendMinutesQuery(frontendId));
export const serviceScreenDql = (serviceId: string) => textOf(serviceScreenQuery(serviceId));
export const entityEventsDql = (entityId: string) => textOf(entityEventsQuery(entityId));
export const k8sCapacityDql = (clusterId: string) => textOf(k8sCapacityQuery(clusterId));
export const k8sWorkloadsDql = (clusterId: string) => textOf(k8sWorkloadsQuery(clusterId));
export const k8sChurnDql = (clusterId: string) => textOf(k8sChurnQuery(clusterId));
export const k8sIncidentRestartsDql = (clusterId: string) => textOf(k8sIncidentRestartsQuery(clusterId));
export const failingServicesDql = (serviceId: string) => textOf(failingServicesQuery(serviceId));
export const failingEndpointsDql = (serviceId: string) => textOf(failingEndpointsQuery(serviceId));
export const failedEndpointsDql = (): string => textOf(failedEndpointsQuery()) as string;
export const logErrorsDql = (): string => textOf(logErrorsQuery()) as string;
export const topologyBlastDql = (rootId: string) => textOf(topologyBlastQuery(rootId));
export const topologyHubsDql = (): string => textOf(topologyHubsQuery()) as string;
export const hostCpuDql = (hostId: string) => textOf(hostCpuQuery(hostId));
