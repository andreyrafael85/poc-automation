import { getEnvironmentUrl } from '@dynatrace-sdk/app-environment';

/**
 * Links from this app into the platform's own pages.
 *
 * 3.2.7: every link is the explicit address of the page that shows that entity. The platform's
 * generic intent link (no target app) opens the launcher with an "Open with…" picker on top — the
 * 3.2.6 validation found the trail's services and frontend landing on the home page — so no link
 * here is generic, and `/ui/entity/<id>` (which also lands on the launcher) is never emitted. Each
 * builder says how its address was checked: `verified` addresses were opened on the tenant and
 * rendered the page; `observed` ones were read from the browser only after clicks (a direct load
 * was never tested, so the shot planner probes them before relying on them); `documented` ones
 * follow the platform's published intent. An entity type with none of these gets no link at all
 * rather than a link to the home page.
 */

export type LinkEvidence = 'verified' | 'observed' | 'documented';

/* eslint-disable noSecrets/no-secrets -- platform page addresses and entity-id examples, not secrets */

/** A Dynatrace entity id: an upper-case type, a dash, 16 hex digits. */
const ENTITY_ID = /^([A-Z][A-Z0-9_]*)-[0-9A-F]{16}$/;

/** `SERVICE` for `SERVICE-0123456789ABCDEF`; null for anything that is not an entity id. */
export function entityType(id: string | null | undefined): string | null {
  if (typeof id !== 'string') return null;
  const match = ENTITY_ID.exec(id);
  return match === null || match[1] === undefined ? null : match[1];
}

/** The tenant's origin (`https://abc.apps.dynatrace.com`), or '' outside the platform. */
export function environmentBase(): string {
  try {
    return getEnvironmentUrl().replace(/\/$/, '');
  } catch {
    return '';
  }
}

/** The `/ui/apps/` base of the current tenant, so cross-app links never resolve against this app's own path. */
export function uiAppsBase(): string {
  return `${environmentBase()}/ui/apps/`;
}

/** An app path (`dynatrace.davis.problems/problem/…`) as an absolute link on the tenant; null stays null. */
export function platformUrl(path: string | null): string | null {
  return path === null ? null : `${uiAppsBase()}${path}`;
}

/**
 * The Services app with the service's details open (`perspective=performance`). Verified: the
 * address the owner sent in the 3.2.6 validation, and the final URL of a capture on 2026-09-30.
 */
export function servicePath(id: string | null | undefined): string | null {
  if (entityType(id) !== 'SERVICE') return null;
  return `dynatrace.services/explorer/services?perspective=performance&sort=healthIndicators%3Adescending&detailsId=${id}&sidebarOpen=false`;
}

/**
 * A frontend's page in Experience Vitals. A `FRONTEND-…` id opens it directly (the owner's address
 * in the 3.2.6 validation). Davis reports frontends by their classic `APPLICATION-…` id, which the
 * app maps to the `FRONTEND-…` id through the RUM metrics (`rum.frontend.ids`); when no mapping is
 * known, the Experience Vitals intent with `{ frontend: APPLICATION-… }` opens the same page —
 * verified on the tenant on 2026-09-30, where it redirected to `/performance/web/FRONTEND-…`.
 */
export function frontendPath(id: string | null | undefined, frontendId?: string | null): string | null {
  if (entityType(frontendId) === 'FRONTEND') return `dynatrace.experience.vitals/performance/web/${frontendId}`;
  const type = entityType(id);
  if (type === 'FRONTEND') return `dynatrace.experience.vitals/performance/web/${id}`;
  if (type === 'APPLICATION') {
    return `dynatrace.experience.vitals/intent/view-pages-views-waterfall#${encodeURIComponent(JSON.stringify({ frontend: id }))}`;
  }
  return null;
}

/**
 * A Kubernetes cluster in the Kubernetes app. Needs the Smartscape id (`K8S_CLUSTER-…`, from the
 * `dt.smartscape.k8s_cluster` metric dimension), not the classic `KUBERNETES_CLUSTER-…` id: the two
 * share no digits. Verified on the tenant on 2026-09-30.
 */
export function k8sClusterPath(smartscapeId: string | null | undefined): string | null {
  if (entityType(smartscapeId) !== 'K8S_CLUSTER') return null;
  return `dynatrace.kubernetes/smartscape/K8S_CLUSTER?perspective=Health&sort=healthIndicators%3Adescending&detailsId=${smartscapeId}&sidebarOpen=false`;
}

/** The vulnerability list, highest Davis Security Score first. Verified on the tenant on 2026-09-30. */
export const VULNERABILITIES_PATH =
  'dynatrace.security.vulnerabilities/vulnerabilities?filter=&pageSize=20&pageIndex=0&sort=dynatraceSecurityScore%3Adesc&from=now-30m&to=now';

/**
 * Failed requests in Distributed Tracing. OBSERVED: this address was read from the browser after
 * clicks on 2026-09-30 (always alongside a traceId); a direct load was never tested. Probe it
 * before relying on it.
 */
export const FAILED_REQUESTS_PATH = 'dynatrace.distributedtracing/explorer?v=requests&filter=request.is_failed+%3D+Failure';
export const FAILED_REQUESTS_EVIDENCE: LinkEvidence = 'observed';

/**
 * The Smartscape service overview, force layout, last two hours. OBSERVED: reached through the
 * launcher tile and a click on 2026-09-30; a direct load is untested. Probe it before relying on it.
 */
export const SMARTSCAPE_SERVICES_PATH = 'dynatrace.smartscape/view/dynatrace.smartscape.service-overview#from=now%28%29-2h&to=now%28%29&layout=force';
export const SMARTSCAPE_SERVICES_EVIDENCE: LinkEvidence = 'observed';

/**
 * The Logs app on a field filter (`status = ERROR`) over a relative window, in the hash-state form
 * verified on the tenant (2026-09-30). The filter is the app's own fixed text, never user input.
 */
export function logsFilterPath(filterFieldQuery: string, from = 'now()-2h', to = 'now()'): string {
  const state = {
    version: 2,
    'dt.timeframe': { from, to },
    tableConfig: { columns: ['timestamp', 'status', 'Log message'] },
    analysisMode: 'logs',
    showDqlEditor: false,
    filterFieldQuery,
  };
  return `dynatrace.logs/#${encodeURIComponent(JSON.stringify(state))}`;
}

/**
 * A host, through the platform's recommended host intent (Infrastructure & Operations,
 * `view_host`). Documented by the platform, not yet opened on the tenant: the shell form
 * `/ui/intent/<app>/<intent>#<payload>` is the one dtctl and the platform's own tools build.
 */
export function hostUrl(id: string | null | undefined): string | null {
  if (entityType(id) !== 'HOST') return null;
  return `${environmentBase()}/ui/intent/dynatrace.infraops/view_host#${encodeURIComponent(JSON.stringify({ 'dt.entity.host': id }))}`;
}

/* eslint-enable noSecrets/no-secrets */

/** What the app knows about an entity beyond its id, to pick the right page. */
export interface EntityLinkHints {
  /** The `FRONTEND-…` id of an `APPLICATION-…` (from `rum.frontend.ids`). */
  frontendId?: string | null;
}

/**
 * The page that shows an entity, as an absolute link; null when the platform has no verified or
 * documented page for its type (process groups, service instances, cloud applications…).
 */
export function entityLink(id: string | null | undefined, hints: EntityLinkHints = {}): string | null {
  switch (entityType(id)) {
    case 'SERVICE':
      return platformUrl(servicePath(id));
    case 'APPLICATION':
    case 'FRONTEND':
      return platformUrl(frontendPath(id, hints.frontendId));
    case 'HOST':
      return hostUrl(id);
    case 'K8S_CLUSTER':
      return platformUrl(k8sClusterPath(id));
    default:
      return null;
  }
}

/** How an entity's link was checked, for the shot list and the deck's methodology slide. */
export function entityLinkEvidence(id: string | null | undefined): LinkEvidence | null {
  const type = entityType(id);
  if (type === 'SERVICE' || type === 'APPLICATION' || type === 'FRONTEND' || type === 'K8S_CLUSTER') return 'verified';
  if (type === 'HOST') return 'documented';
  return null;
}
