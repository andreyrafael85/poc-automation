import { renderQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { entityType } from '../utils/deepLinks';

/**
 * Where the boxes of a root-cause trail open (3.2.7).
 *
 * A database root cause (`DATABASE_SERVICE`, e.g. SQL Server "TradeManagement") has no agent of
 * its own: the platform shows it through the services that call it. So its box opens the caller
 * that failed most while the incident lasted — on the validation tenant easyTradeManager, 341
 * failures against 14, 3 and 1 for the other three callers, the page the owner pointed to. The
 * callers come from the entity model (`called_by`) and their failures from the service metrics,
 * over the incident's own window; a frontend opens on its Experience Vitals page through the
 * APPLICATION → FRONTEND map (`rum.frontend.ids`).
 */

/** How many callers the trail lists under a database root cause (the catalog's `rca.callers` limit). */
export { ROOT_CALLER_LIMIT } from '../queries/catalogTemplates';

export interface RootCaller {
  id: string;
  name: string;
  requests: number | null;
  failures: number | null;
}

export interface RootCallers {
  /** `DATABASE_SERVICE`, `WEB_REQUEST_SERVICE`…; null when the root has no callers or is not a service. */
  rootType: string | null;
  /** Callers, most failures first, then most requests. */
  callers: RootCaller[];
}

export const NO_CALLERS: RootCallers = { rootType: null, callers: [] };

/**
 * The callers of a root-cause service with their requests and failures over the query window, as
 * the catalog's `rca.callers` renders it (TD-08, 3.3.2): the id passes the catalog's entity-id
 * validator (a `SERVICE-…` id only) and is quoted before it fills the template, so nothing but a
 * service id can reach the query. Validated on the validation tenant on 2026-10-05 (0 bytes, 4
 * callers); the text is unchanged since. The hook reads it through `useCatalogQuery`.
 */
export function buildRootCallersDql(rootId: string | null | undefined): string | null {
  if (entityType(rootId) !== 'SERVICE') return null;
  return renderQuery('rca.callers', { rootId: rootId as string });
}

export function summariseRootCallers(records: readonly GrailRecord[]): RootCallers {
  const callers = records
    .map((record) => ({
      id: str(record, 'id') ?? '',
      name: str(record, 'name') ?? str(record, 'id') ?? '—',
      requests: num(record, 'requests'),
      failures: num(record, 'failures'),
    }))
    .filter((caller) => entityType(caller.id) === 'SERVICE');
  const rootType = records.map((record) => str(record, 'rootType')).find((type) => type !== null) ?? null;
  return { rootType: callers.length === 0 ? null : rootType, callers };
}

/** True when the root cause is a database the platform shows through its callers. */
export function isDatabaseRoot(callers: RootCallers): boolean {
  return callers.rootType === 'DATABASE_SERVICE' && callers.callers.length > 0;
}

/** `APPLICATION-…` → `FRONTEND-…`, from `rum.frontend.ids`. */
export function frontendIdMap(records: readonly GrailRecord[]): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const record of records) {
    const applicationId = str(record, 'applicationId');
    const frontendId = str(record, 'frontendId');
    if (entityType(applicationId) === 'APPLICATION' && entityType(frontendId) === 'FRONTEND' && !map.has(applicationId as string)) {
      map.set(applicationId as string, frontendId as string);
    }
  }
  return map;
}
