import { useQueryScope } from '../../config/StudioContext';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { summariseCloud } from '../../models/cloud';
import { diagnoseEntityModel } from '../../models/entityHealth';
import type { StackNodeInput } from '../../models/stackMap';
import { num, str } from '../../utils/records';

/**
 * The counts behind the stack map, shared by the Overview and the Topology page.
 *
 * Every count is read: the entity categories from `cov.inventory`, the hosts each cloud
 * carries from `cloud.hosts` (both whole-estate aggregates, never a capped list). An
 * entity-model outage (every category zero at once) yields no counts at all, so the map is
 * not drawn rather than drawn empty. "No cloud attribution" is the monitored hosts the cloud
 * query did not attribute, and only when both were read.
 */
export function useStackNodes(): { nodes: StackNodeInput[]; unattributedShown: boolean; hasCloud: boolean } {
  const scope = useQueryScope();
  const inventory = useCatalogQuery('cov.inventory', scope);
  const cloudHosts = useCatalogQuery('cloud.hosts', scope);

  const outage = diagnoseEntityModel(inventory.records).state === 'unavailable';
  const count = (category: string): number | null => {
    if (inventory.outcome !== 'ok' || outage) return null;
    return num(
      inventory.records.find((record) => str(record, 'category') === category),
      'value',
    );
  };

  const cloud = summariseCloud(cloudHosts.records);
  const cloudRead = cloudHosts.outcome === 'ok' || cloudHosts.outcome === 'empty';
  // An estate with no host in any cloud is on premises: "no cloud attribution" would then be every
  // host again, so the map ends at the infrastructure and says so in its title (3.2.6).
  const hasCloud = cloudRead && cloud.providers.some((row) => row.hosts > 0);
  const hosts = count('Hosts');
  const unattributed = hasCloud && hosts !== null && hosts - cloud.totalHosts >= 0 ? hosts - cloud.totalHosts : null;

  const nodes: StackNodeInput[] = [
    { id: 'web', count: count('Web applications') },
    { id: 'mobile', count: count('Mobile applications') },
    { id: 'synthetic', count: count('Synthetic monitors') },
    { id: 'services', count: count('Services') },
    { id: 'workloads', count: count('Kubernetes workloads') },
    { id: 'processes', count: count('Process instances') },
    { id: 'hosts', count: hosts },
    { id: 'clusters', count: count('Kubernetes clusters') },
    ...(cloudRead ? cloud.providers.map((row) => ({ id: `cloud-${row.provider}` as const, count: row.hosts })) : []),
    ...(unattributed === null ? [] : [{ id: 'unattributed' as const, count: unattributed }]),
  ];

  return { nodes, unattributedShown: unattributed !== null && unattributed > 0, hasCloud };
}
