import React, { useMemo } from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { QueryStateBoundary } from '../../components/QueryStateBoundary';
import { useQueryScope } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { num, str, type GrailRecord } from '../../utils/records';

/**
 * 3.6.4 — Coverage → "Depth map" (the visual proposal v3/v4, approved 2026-11-20: "a profundidade da cobertura, host a
 * host"): one square per host, grouped by where it runs and coloured by its monitoring mode — Full-Stack (code,
 * services, traces), Infrastructure (host and processes), Discovery (the host is seen) or a mode the platform did not
 * report. From `cov.hosts.breakdown` (hosts counted by OS, cloud and mode — an aggregate, so every host is drawn). The
 * Infrastructure squares are the expansion conversation. A mode not reported is said so, never taken for unmonitored.
 */

export type DepthMode = 'FULL_STACK' | 'INFRASTRUCTURE' | 'DISCOVERY' | 'UNKNOWN';
export const DEPTH_ORDER: readonly DepthMode[] = ['FULL_STACK', 'INFRASTRUCTURE', 'DISCOVERY', 'UNKNOWN'];
/** Above this many hosts in a group, one square stands for several (and the caption says how many). */
export const DEPTH_SQUARES_MAX = 240;

const MODE_KEY: Record<DepthMode, StringKey> = {
  FULL_STACK: 'asm.depth.mode.fullStack',
  INFRASTRUCTURE: 'asm.depth.mode.infra',
  DISCOVERY: 'asm.depth.mode.discovery',
  UNKNOWN: 'asm.depth.mode.unknown',
};
const MODE_DELIVERS: Record<DepthMode, StringKey> = {
  FULL_STACK: 'asm.depth.delivers.fullStack',
  INFRASTRUCTURE: 'asm.depth.delivers.infra',
  DISCOVERY: 'asm.depth.delivers.discovery',
  UNKNOWN: 'asm.depth.delivers.unknown',
};

export const modeOf = (value: string | null): DepthMode => {
  const mode = (value ?? '').toUpperCase().replace(/[-\s]/g, '_');
  if (mode === 'FULL_STACK' || mode === 'FULLSTACK') return 'FULL_STACK';
  if (mode === 'INFRASTRUCTURE' || mode === 'INFRA_ONLY') return 'INFRASTRUCTURE';
  if (mode === 'DISCOVERY') return 'DISCOVERY';
  return 'UNKNOWN';
};

export interface DepthGroup {
  /** The cloud the hosts run in, or null when none was reported. */
  cloud: string | null;
  total: number;
  byMode: Record<DepthMode, number>;
}

/** The hosts grouped by cloud (largest group first), each counted by monitoring mode. Pure. */
export function depthGroups(records: readonly GrailRecord[]): DepthGroup[] {
  const groups = new Map<string, DepthGroup>();
  for (const record of records) {
    const hosts = num(record, 'hosts');
    if (hosts === null || !(hosts > 0)) continue;
    const cloud = str(record, 'cloudType');
    const key = cloud ?? '';
    const group = groups.get(key) ?? { cloud, total: 0, byMode: { FULL_STACK: 0, INFRASTRUCTURE: 0, DISCOVERY: 0, UNKNOWN: 0 } };
    group.total += hosts;
    group.byMode[modeOf(str(record, 'monitoringMode'))] += hosts;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

const CLOUD_LABEL: Record<string, string> = { EC2: 'AWS', AZURE: 'Azure', GOOGLE_CLOUD_PLATFORM: 'Google Cloud', OPENSTACK: 'OpenStack', ALIBABA: 'Alibaba Cloud' };

export const DepthMap = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const breakdown = useCatalogQuery('cov.hosts.breakdown', scope);
  const groups = useMemo(() => (breakdown.outcome === 'ok' ? depthGroups(breakdown.records) : []), [breakdown.outcome, breakdown.records]);
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const fullStack = groups.reduce((sum, group) => sum + group.byMode.FULL_STACK, 0);
  const infra = groups.reduce((sum, group) => sum + group.byMode.INFRASTRUCTURE, 0);
  const fact = factFrom(breakdown, breakdown.outcome === 'ok' ? total : null);
  const per = Math.max(1, Math.ceil(total / DEPTH_SQUARES_MAX));

  return (
    <QueryStateBoundary result={breakdown}>
      {total === 0 ? (
        <Text className="pvs-muted">{t('asm.depth.none')}</Text>
      ) : (
        <Panel pad="roomy" data-testid="asm-depth">
          <Stack gap="group">
            <div className="pvs-funnel__head">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('asm.depth.title')}
                </Heading>
                <Text className="pvs-caption">
                  {t('asm.depth.lead', { total: formatNumber(total), full: formatNumber(fullStack), infra: formatNumber(infra) })}
                </Text>
              </Stack>
              <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
            </div>
            <ul className="pvs-depth__legend">
              {DEPTH_ORDER.map((mode) => (
                <li key={mode} className="pvs-depth__key" data-mode={mode}>
                  <span className="pvs-depth__swatch" aria-hidden="true" />
                  <span>
                    <strong>{t(MODE_KEY[mode])}</strong> — {t(MODE_DELIVERS[mode])}
                  </span>
                </li>
              ))}
            </ul>
            <div className="pvs-depth__groups">
              {groups.map((group) => {
                const name = group.cloud === null ? t('asm.depth.noCloud') : (CLOUD_LABEL[group.cloud] ?? group.cloud);
                const counts = DEPTH_ORDER.filter((mode) => group.byMode[mode] > 0).map((mode) => `${t(MODE_KEY[mode])} ${formatNumber(group.byMode[mode])}`);
                return (
                  <section key={group.cloud ?? 'none'} className="pvs-depth__group">
                    <Text className="pvs-depth__name">
                      {name} <span className="pvs-depth__count">{t('asm.depth.hosts', { count: formatNumber(group.total) })}</span>
                    </Text>
                    <div className="pvs-depth__squares" role="img" aria-label={`${name}: ${counts.join(', ')}`}>
                      {DEPTH_ORDER.flatMap((mode) =>
                        Array.from({ length: Math.ceil(group.byMode[mode] / per) }, (_, index) => (
                          <span key={`${mode}-${index}`} className="pvs-depth__sq" data-mode={mode} />
                        )),
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
            <Text className="pvs-caption">{per > 1 ? t('asm.depth.scaled', { per: formatNumber(per) }) : t('asm.depth.caption')}</Text>
          </Stack>
        </Panel>
      )}
    </QueryStateBoundary>
  );
};
