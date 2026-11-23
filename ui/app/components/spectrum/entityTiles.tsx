import React from 'react';

import {
  ApplicationsIcon,
  HostsIcon,
  MobileIcon,
  ProcessIcon,
  ServicesIcon,
  StopwatchIcon,
} from '@dynatrace/strato-icons';

import type { StringKey } from '../../i18n/strings';
import { num, str, type GrailRecord } from '../../utils/records';
import { BrandGlyph } from './BrandGlyph';
import type { SpectrumFamily } from './family';

export interface EntityTileSpec {
  /** The category as `cov.inventory` names it. */
  inventoryCategory: string;
  labelKey: StringKey;
  icon: React.ReactNode;
  family: SpectrumFamily;
}

/**
 * The eight entity categories of `cov.inventory`, each with its functional icon (Strato; the
 * Kubernetes mark from the third-party gallery, which Strato's functional set lacks) and its
 * colour family. One table, so the Overview, the Executive summary and Coverage draw a
 * category the same way.
 */
export const ENTITY_TILES: readonly EntityTileSpec[] = [
  { inventoryCategory: 'Hosts', labelKey: 'metric.hosts', icon: <HostsIcon />, family: 'purple' },
  { inventoryCategory: 'Services', labelKey: 'metric.services', icon: <ServicesIcon />, family: 'turquoise' },
  { inventoryCategory: 'Process instances', labelKey: 'metric.processes', icon: <ProcessIcon />, family: 'moss' },
  { inventoryCategory: 'Kubernetes clusters', labelKey: 'metric.clusters', icon: <BrandGlyph name="kubernetes" />, family: 'blue' },
  { inventoryCategory: 'Kubernetes workloads', labelKey: 'metric.workloads', icon: <BrandGlyph name="k8sWorkload" />, family: 'blue' },
  { inventoryCategory: 'Web applications', labelKey: 'exec.label.webApps', icon: <ApplicationsIcon />, family: 'blue-turquoise' },
  { inventoryCategory: 'Mobile applications', labelKey: 'exec.label.mobileApps', icon: <MobileIcon />, family: 'blue' },
  { inventoryCategory: 'Synthetic monitors', labelKey: 'metric.synthetics', icon: <StopwatchIcon />, family: 'orange' },
];

/**
 * The second line of an inventory tile, where the category has one (3.2.3): the synthetic monitors
 * split into browser and HTTP monitors, two entity types `cov.inventory` reads separately and
 * counts together. Undefined when the split rows are absent.
 */
export function inventoryDetail(
  category: string,
  records: readonly GrailRecord[],
  t: (key: StringKey, params?: Readonly<Record<string, string | number>>) => string,
  formatNumber: (value: number) => string,
): string | undefined {
  if (category !== 'Synthetic monitors') return undefined;
  const value = (name: string) => num(records.find((record) => str(record, 'category') === name), 'value');
  const browser = value('Synthetic monitors (browser)');
  const http = value('Synthetic monitors (HTTP)');
  if (browser === null || http === null) return undefined;
  return t('inv.synthetic.split', { browser: formatNumber(browser), http: formatNumber(http) });
}
