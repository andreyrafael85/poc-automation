import type { ChartFormat } from '../../components/spectrum/chartFormat';
import type { TrendSeries } from '../../components/TrendChart';
import type { Translation } from '../../i18n/useTranslation';
import { combineSeries, scaleSeries, seriesOf, seriesStats } from '../../models/series';
import { formatBytes } from '../../utils/time';

/**
 * The series of the per-unit trend charts (3.2.3), defined once (3.2.4): the pages draw them, and
 * the SE deck's captures photograph the very same charts, so a slide can never show a chart the
 * app does not.
 */

type T = Translation['t'];

/** Services: requests, failure rate and response time, each on its own axis (`svc.golden`). */
export function serviceTrendSeries(t: T, fmt: ChartFormat): TrendSeries[] {
  return [
    {
      key: 'requests',
      title: t('p.svc.chart.requests'),
      caption: t('p.svc.chart.requestsCaption'),
      family: 'blue-turquoise',
      headline: 'sum',
      read: (records) => seriesOf(records[0], 'requests'),
      format: (value) => fmt.compact(value),
    },
    {
      key: 'failureRate',
      title: t('p.svc.chart.rate'),
      caption: t('p.svc.chart.rateCaption'),
      family: 'pink-purple',
      headline: {
        label: t('p.svc.chart.rateOverall'),
        value: (records) => {
          const failed = seriesStats(seriesOf(records[0], 'failures')).sum;
          const served = seriesStats(seriesOf(records[0], 'requests')).sum;
          return failed === null || served === null || served === 0 ? null : (failed * 100) / served;
        },
      },
      read: (records) =>
        combineSeries(seriesOf(records[0], 'failures'), seriesOf(records[0], 'requests'), (failed, served) =>
          served > 0 ? (failed * 100) / served : null,
        ),
      format: (value) => `${fmt.decimal(value, 2)}%`,
    },
    {
      key: 'responseTime',
      title: t('p.svc.chart.time'),
      caption: t('p.svc.chart.timeCaption'),
      family: 'purple',
      headline: 'mean',
      // The metric reports microseconds.
      read: (records) => scaleSeries(seriesOf(records[0], 'responseTime'), 0.001),
      format: (ms) => (ms >= 1000 ? `${fmt.decimal(ms / 1000, 2)} s` : `${fmt.decimal(ms, ms < 10 ? 1 : 0)} ms`),
    },
  ];
}

/** Infrastructure: CPU and memory of the hosts (`infra.trend`). */
export function infraTrendSeries(t: T, fmt: ChartFormat): TrendSeries[] {
  return [
    {
      key: 'cpu',
      title: t('p.infra.chart.cpu'),
      caption: t('p.infra.chart.cpuCaption'),
      family: 'blue-turquoise',
      headline: 'mean',
      read: (records) => seriesOf(records[0], 'cpuPct'),
      format: (value) => `${fmt.decimal(value, 1)}%`,
    },
    {
      key: 'memory',
      title: t('p.infra.chart.memory'),
      caption: t('p.infra.chart.memoryCaption'),
      family: 'purple',
      headline: 'mean',
      read: (records) => seriesOf(records[0], 'memoryPct'),
      format: (value) => `${fmt.decimal(value, 1)}%`,
    },
  ];
}

/** Kubernetes: container restarts and OOM kills (`k8s.restarts.trend`). */
export function k8sTrendSeries(t: T, fmt: ChartFormat): TrendSeries[] {
  return [
    {
      key: 'restarts',
      title: t('p.k8s.trend.restarts'),
      caption: t('p.k8s.trend.restartsCaption'),
      family: 'blue',
      headline: 'sum',
      read: (records) => seriesOf(records[0], 'restarts'),
      format: (value) => fmt.compact(value),
    },
    {
      key: 'oom',
      title: t('p.k8s.trend.oom'),
      caption: t('p.k8s.trend.oomCaption'),
      family: 'orange',
      headline: 'sum',
      read: (records) => seriesOf(records[0], 'oomKills'),
      format: (value) => fmt.compact(value),
    },
  ];
}

/** Logs: bytes ingested per hour (`log.ingest.trend`). */
export function logTrendSeries(t: T): TrendSeries[] {
  return [
    {
      key: 'ingested',
      title: t('p.logs.trend.ingested'),
      caption: t('p.logs.trend.ingestedCaption'),
      family: 'blue-turquoise',
      headline: 'sum',
      read: (records) => seriesOf(records[0], 'bytes'),
      format: (bytes) => formatBytes(bytes),
    },
  ];
}
