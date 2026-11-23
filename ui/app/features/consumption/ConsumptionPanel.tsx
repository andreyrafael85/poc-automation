import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Callout, Grid, Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { decimal } from '../../utils/activeLocale';
import { preflight } from './preflight';
import { assumed } from '../../config/assumptions';
import { StratoGoal } from '../../engine/strato';
import { GIB, groupReads, resetMeter, useSessionMeter } from './sessionMeter';
import { ALL_QUERIES } from '../../queries/catalog';
import { formatMoneyFine } from '../../models/cost';
import { PUBLIC_QUERY_USD_PER_GIB, localValue, rateCardCurrency } from '../../models/licensing';
import { num, str } from '../../utils/records';
import { appBilling, queryPractices, type AppBillingRow } from './queryPractices';
import { sessionCeilingUsd } from './appCost';
import '../assessment/assessment.css';

const SHOWN = 8;

/**
 * "App consumption" in Settings (3.4.11, F-14 and F-16 layer 1), for the SE and the partner: the pre-flight — what
 * one full visit of this tenant is projected to read, from its own log volume — and the session meter — what this
 * session actually read, by query and by page. Since 3.4.13 a tab of Licensing; 3.7.6 adds what the licence was billed
 * for the app's queries (in money only with the rate card on, inside Licensing — rule 6) and the app's query practices.
 */
export const ConsumptionPanel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const { resolvedTimeframe, rateCard } = useStudio();
  const ingest = useCatalogQuery('log.ingest', scope);
  // 3.7.6: what the licence was billed for this app's queries (billing usage events, 30 days), and the app's query practices.
  const billing = useCatalogQuery('app.query.billing', scope);
  const reads = useSessionMeter();

  const windowHours = (Date.parse(resolvedTimeframe.endIso) - Date.parse(resolvedTimeframe.startIso)) / 3_600_000;
  const plan = preflight(ingest.outcome === 'ok' || ingest.outcome === 'empty' ? ingest.records : null, windowHours);
  const gib = (value: number) => decimal(value, value >= 10 ? 1 : 2);
  const total = reads.reduce((sum, read) => sum + read.bytes, 0);
  const byQuery = groupReads(reads, 'id');
  const byPage = groupReads(reads, 'page');

  const billingRows: AppBillingRow[] = (billing.outcome === 'ok' ? billing.records : []).map((record) => ({
    app: str(record, 'app') ?? '',
    kind: str(record, 'event.type') ?? '',
    queries: num(record, 'queries') ?? 0,
    bytes: num(record, 'billedBytes') ?? 0,
  }));
  const billingRead = billing.outcome === 'ok' || billing.outcome === 'empty';
  const billed = appBilling(billingRows, 'my.poc.automation');
  const money = (usd: number) => {
    const local = localValue(usd, rateCard);
    return local === null ? null : formatMoneyFine(local, rateCardCurrency(rateCard));
  };
  const usdOf = (bytes: number) => (bytes / GIB) * PUBLIC_QUERY_USD_PER_GIB;
  const practices = queryPractices(ALL_QUERIES);

  return (
    <Stack gap="section">
      <Panel as="section" pad="roomy" data-testid="consumption-billing">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('cons.bill.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('cons.bill.body')}</Paragraph>
          {!billingRead ? (
            <Text>{billing.isLoading ? t('p.asm.gap.loading') : t('cons.bill.unread')}</Text>
          ) : (
            <Grid min={200}>
              <div className="pvs-cons-figure" data-testid="consumption-billing-current">
                <span className="pvs-label">{t('cons.bill.current')}</span>
                <strong>{money(usdOf(billed.currentBytes)) ?? t('cons.app.gib', { value: gib(billed.currentBytes / GIB) })}</strong>
                <span className="pvs-caption">{t('cons.bill.currentCaption', { gib: gib(billed.currentBytes / GIB) })}</span>
              </div>
              <div className="pvs-cons-figure">
                <span className="pvs-label">{t('cons.bill.earlier')}</span>
                <strong>{money(usdOf(billed.earlierBytes)) ?? t('cons.app.gib', { value: gib(billed.earlierBytes / GIB) })}</strong>
                <span className="pvs-caption">{t('cons.bill.earlierCaption', { gib: gib(billed.earlierBytes / GIB) })}</span>
              </div>
              <div className="pvs-cons-figure">
                <span className="pvs-label">{t('cons.bill.session')}</span>
                <strong>{money(sessionCeilingUsd(total)) ?? t('cons.app.gib', { value: gib(total / GIB) })}</strong>
                <span className="pvs-caption">{t('cons.bill.sessionCaption', { gib: gib(total / GIB) })}</span>
              </div>
            </Grid>
          )}
          <Text className="pvs-caption">{rateCard.enabled ? t('cons.bill.method') : t('cons.bill.noRateCard')}</Text>
        </Stack>
      </Panel>

      <Panel as="section" pad="roomy" data-testid="consumption-practices">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('cons.dql.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('cons.dql.body')}</Paragraph>
          <div className="pvs-asm-table-wrap">
            <table className="pvs-asm-table">
              <thead>
                <tr>
                  <th scope="col">{t('cons.dql.col.practice')}</th>
                  <th scope="col" data-num>
                    {t('cons.dql.col.queries')}
                  </th>
                  <th scope="col">{t('cons.dql.col.why')}</th>
                </tr>
              </thead>
              <tbody>
                {practices.map((row) => (
                  <tr key={row.key} data-practice={row.key}>
                    <td>{t(`cons.dql.${row.key}` as StringKey)}</td>
                    <td data-num>{t('cons.dql.count', { met: formatNumber(row.met), of: formatNumber(row.of) })}</td>
                    <td>{t(`cons.dql.${row.key}.why` as StringKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Text className="pvs-caption">{t('cons.dql.method')}</Text>
        </Stack>
      </Panel>

      <Panel as="section" pad="roomy" data-testid="consumption-preflight">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('cons.app.preflight.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('cons.app.preflight.body')}</Paragraph>
          {plan.visitGiB === null || plan.logsPerHour === null ? (
            <Text>{ingest.isLoading ? t('p.asm.gap.loading') : t('cons.app.preflight.unread')}</Text>
          ) : (
            <>
              <Grid min={200}>
                <div className="pvs-cons-figure">
                  <span className="pvs-label">{t('cons.app.preflight.logsPerHour')}</span>
                  <strong>{t('cons.app.gibPerHour', { value: gib(plan.logsPerHour) })}</strong>
                  <span className="pvs-caption">{t('cons.app.preflight.ratio', { ratio: decimal(plan.ratio ?? 0, 1) })}</span>
                </div>
                <div className="pvs-cons-figure">
                  <span className="pvs-label">{t('cons.app.preflight.visit')}</span>
                  <strong>{t('cons.app.approxGib', { value: gib(plan.visitGiB) })}</strong>
                  <span className="pvs-caption">
                    {t('cons.app.preflight.split', { logs: gib(plan.visitLogsGiB ?? 0), events: gib(plan.visitEventsGiB), other: gib(plan.visitOtherGiB) })}
                  </span>
                  {/* 3.6.0 (v6): the projected visit against the line of the assumptions registry, as a limit bar. */}
                  <StratoGoal
                    value={plan.visitGiB}
                    line={assumed('consumption.preflight.visitLine')}
                    name={t('cons.app.preflight.visit')}
                    lineLabel={t('v6.limit.visitLine', { line: gib(assumed('consumption.preflight.visitLine')) })}
                  />
                </div>
                <div className="pvs-cons-figure">
                  <span className="pvs-label">{t('cons.app.preflight.billedQuery')}</span>
                  <strong>{t('cons.app.gib', { value: gib(plan.billedLogQueryGiB ?? 0) })}</strong>
                  <span className="pvs-caption">{t(plan.billedLogQueryGiB !== null && plan.billedLogQueryGiB > 0 ? 'cons.app.preflight.payPerQuery' : 'cons.app.preflight.noLogQuery')}</span>
                </div>
              </Grid>
              <Callout kind={plan.large ? 'recommendation' : 'note'} title={t(plan.large ? 'cons.app.preflight.largeTitle' : 'cons.app.preflight.normalTitle')}>
                {t(plan.large ? 'cons.app.preflight.largeBody' : 'cons.app.preflight.normalBody', { visit: gib(plan.visitGiB) })}
              </Callout>
              <Text className="pvs-caption">{t('cons.app.preflight.method')}</Text>
            </>
          )}
        </Stack>
      </Panel>

      <Panel as="section" pad="roomy" data-testid="consumption-meter">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('cons.app.meter.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('cons.app.meter.body')}</Paragraph>
          <Text data-testid="consumption-meter-total">
            <strong>{t('cons.app.meter.total', { gib: gib(total / GIB), reads: formatNumber(reads.length) })}</strong>
          </Text>
          {reads.length === 0 ? (
            <Text className="pvs-caption">{t('cons.app.meter.none')}</Text>
          ) : (
            <Grid min={320}>
              {(
                [
                  ['query', byQuery],
                  ['page', byPage],
                ] as const
              ).map(([kind, groups]) => (
                <div key={kind} className="pvs-asm-table-wrap">
                  <table className="pvs-asm-table" data-testid={`consumption-by-${kind}`}>
                    <thead>
                      <tr>
                        <th scope="col">{t(`cons.app.meter.by.${kind}` as StringKey)}</th>
                        <th scope="col" data-num>
                          {t('cons.app.meter.reads')}
                        </th>
                        <th scope="col" data-num>
                          {t('cons.app.gibHeader')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.slice(0, SHOWN).map((group) => (
                        <tr key={group.key}>
                          <td data-code={kind === 'query' ? true : undefined}>{group.key}</td>
                          <td data-num>{formatNumber(group.reads)}</td>
                          <td data-num>{gib(group.bytes / GIB)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {groups.length > SHOWN && <Text className="pvs-caption">{t('cons.app.meter.more', { count: formatNumber(groups.length - SHOWN) })}</Text>}
                </div>
              ))}
            </Grid>
          )}
          <div>
            <Button onClick={resetMeter} disabled={reads.length === 0} data-testid="consumption-reset">
              {t('cons.app.meter.reset')}
            </Button>
          </div>
          <Text className="pvs-caption">{t('cons.app.meter.method')}</Text>
        </Stack>
      </Panel>
    </Stack>
  );
};
