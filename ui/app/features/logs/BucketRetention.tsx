import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { Panel, Stack } from '../../engine';
import { useTranslation } from '../../i18n/useTranslation';
import type { Fact } from '../../models/provenance';
import { bool, num, str, type GrailRecord } from '../../utils/records';
import { formatBytes } from '../../utils/time';

/**
 * 3.6.3 (v6, the Logs model's "limits and retention" bars): each log bucket's share of the volume held, as a bar, with
 * its retention in days and whether this identity can read it — from `log.buckets` (bucket metadata, every bucket, no
 * limit, so the shares add up to the whole). A bucket whose size the platform did not report draws no bar.
 */

export const BUCKETS_SHOWN = 8;

export interface BucketBar {
  name: string;
  bytes: number | null;
  /** Of the volume of every bucket that reported one, 0–100. */
  share: number | null;
  retentionDays: number | null;
  readable: boolean;
}

/** The buckets as bars, the largest first. Pure. */
export function bucketBars(records: readonly GrailRecord[]): { bars: BucketBar[]; total: number } {
  const total = records.reduce((sum, record) => sum + Math.max(0, num(record, 'bytes') ?? 0), 0);
  const bars = records
    .map((record) => {
      const bytes = num(record, 'bytes');
      return {
        name: str(record, 'name') ?? '—',
        bytes,
        share: bytes === null || !(total > 0) ? null : (bytes / total) * 100,
        retentionDays: num(record, 'retentionDays'),
        readable: bool(record, 'hasAccess') === true,
      };
    })
    .sort((a, b) => (b.bytes ?? -1) - (a.bytes ?? -1));
  return { bars, total };
}

export const BucketRetention = ({ records, fact }: { records: readonly GrailRecord[]; fact: Fact<number | string | null> }) => {
  const { t, formatNumber } = useTranslation();
  const { bars, total } = bucketBars(records);
  if (bars.length === 0 || !(total > 0)) return null;
  const shown = bars.slice(0, BUCKETS_SHOWN);
  return (
    <Panel pad="roomy" data-testid="logs-retention">
      <Stack gap="group">
        <div className="pvs-funnel__head">
          <Stack gap="tight">
            <Heading level={4} as="h3">
              {t('logs.ret.title')}
            </Heading>
            <Text className="pvs-caption">{t('logs.ret.caption', { total: formatBytes(total), buckets: formatNumber(bars.length) })}</Text>
          </Stack>
          <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
        </div>
        <ol className="pvs-quota">
          {shown.map((bar) => (
            <li key={bar.name} className="pvs-quota__row" data-readable={bar.readable ? 'true' : 'false'}>
              <span className="pvs-quota__name">{bar.name}</span>
              <span className="pvs-quota__track" aria-hidden="true">
                {bar.share !== null && <span className="pvs-quota__fill" style={{ width: `${Math.max(0.6, bar.share).toFixed(2)}%` }} />}
              </span>
              <span className="pvs-quota__size">{bar.bytes === null ? '—' : formatBytes(bar.bytes)}</span>
              <span className="pvs-quota__share">{bar.share === null ? '—' : `${formatNumber(Math.round(bar.share * 10) / 10)} %`}</span>
              <span className="pvs-quota__ret">{bar.retentionDays === null ? '—' : t('logs.ret.days', { days: formatNumber(bar.retentionDays) })}</span>
              {!bar.readable && <span className="pvs-quota__lock">{t('logs.ret.notReadable')}</span>}
            </li>
          ))}
        </ol>
        {bars.length > shown.length && <Text className="pvs-caption">{t('logs.ret.more', { count: formatNumber(bars.length - shown.length) })}</Text>}
      </Stack>
    </Panel>
  );
};
