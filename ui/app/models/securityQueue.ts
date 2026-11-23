import { list, str, type GrailRecord } from '../utils/records';
import { toVulnerability, type TopVulnerability } from './security';

/**
 * The security fix queue with its context (3.2.5, milestone M5): the five vulnerabilities to fix
 * first, each with what to upgrade (the vulnerable component), where it runs (services and
 * workloads) and who answers for it (an owner or team tag on the service, or else its Kubernetes
 * namespace — labelled as a namespace, never passed off as an owner).
 *
 * Order: what Davis says to act on now (an exploit exists, it is reachable from the internet and
 * the vulnerable function is in use) first, then by how many of those three hold, then by score.
 */

export const FIX_QUEUE_SIZE = 5;

export interface FixQueueItem extends TopVulnerability {
  actNow: boolean;
  /** The Davis criteria that hold, in a fixed order. */
  reasons: ('exploit' | 'public' | 'inUse')[];
  components: string[];
  services: string[];
  workloads: string[];
  entityNames: string[];
  /** Owner or team tags of the services; empty when none is tagged. */
  owners: string[];
  /** Kubernetes namespaces of the services, the fallback when no owner is tagged. */
  namespaces: string[];
  /** Whether the context query answered for this vulnerability (component and services). */
  hasContext: boolean;
}

/** Tag keys read as "who answers for this service". */
const OWNER_KEYS = new Set(['owner', 'team', 'squad', 'responsible', 'app.owner', 'dt.owner', 'dono', 'equipe', 'responsavel', 'responsável']);
const NAMESPACE_KEYS = new Set(['k8s.namespace.name', 'kubernetes-namespace']);

export interface ServiceOwnership {
  owners: string[];
  namespaces: string[];
}

/** Owner tags and namespaces per service name, from `svc.owners`. */
export function serviceOwnership(records: readonly GrailRecord[]): Map<string, ServiceOwnership> {
  const map = new Map<string, ServiceOwnership>();
  for (const record of records) {
    const name = str(record, 'name');
    if (name === null) continue;
    const owners = new Set<string>();
    const namespaces = new Set<string>();
    for (const tag of list(record, 'tags')) {
      const at = tag.indexOf(':');
      if (at <= 0) continue;
      const key = tag.slice(0, at).trim().toLowerCase();
      const value = tag.slice(at + 1).trim();
      if (value === '') continue;
      if (OWNER_KEYS.has(key)) owners.add(value);
      else if (NAMESPACE_KEYS.has(key)) namespaces.add(value);
    }
    map.set(name, { owners: [...owners], namespaces: [...namespaces] });
  }
  return map;
}

export function fixQueue(
  vulnerabilityRecords: readonly GrailRecord[],
  contextRecords: readonly GrailRecord[],
  ownerRecords: readonly GrailRecord[],
  size = FIX_QUEUE_SIZE,
): FixQueueItem[] {
  const context = new Map(contextRecords.map((record) => [str(record, 'displayId') ?? '', record]));
  const ownership = serviceOwnership(ownerRecords);
  const items = vulnerabilityRecords.map((record): FixQueueItem => {
    const vuln = toVulnerability(record);
    const reasons: FixQueueItem['reasons'] = [];
    if (vuln.exploitable) reasons.push('exploit');
    if (vuln.publicExposure) reasons.push('public');
    if (vuln.functionInUse) reasons.push('inUse');
    const ctx = context.get(vuln.displayId);
    const services = ctx === undefined ? [] : list(ctx, 'services');
    const owners = new Set<string>();
    const namespaces = new Set<string>();
    for (const service of services) {
      const found = ownership.get(service);
      found?.owners.forEach((owner) => owners.add(owner));
      found?.namespaces.forEach((namespace) => namespaces.add(namespace));
    }
    return {
      ...vuln,
      actNow: reasons.length === 3,
      reasons,
      components: ctx === undefined ? [] : list(ctx, 'components'),
      services,
      workloads: ctx === undefined ? [] : list(ctx, 'workloads'),
      entityNames: list(record, 'entityNames'),
      owners: [...owners],
      namespaces: [...namespaces],
      hasContext: ctx !== undefined,
    };
  });
  return items
    .sort((a, b) => Number(b.actNow) - Number(a.actNow) || b.reasons.length - a.reasons.length || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, size);
}
