import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { Figure, Panel, Stack } from '../../engine';
import type { CatalogQueryResult } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import type { FixQueueItem } from '../../models/securityQueue';

/**
 * The top five fixes, with their context (3.2.5, milestone M5): what to upgrade, where it runs and
 * who answers for it. An owner is a service's owner or team tag; without one the service's
 * Kubernetes namespace is shown, labelled as a namespace — never presented as an owner.
 */

const REASON_KEY: Record<FixQueueItem['reasons'][number], StringKey> = {
  exploit: 'p.sec.rem.flag.exploit',
  public: 'p.sec.rem.flag.public',
  inUse: 'p.sec.rem.flag.inUse',
};

const list = (values: readonly string[], max = 3) => (values.length <= max ? values.join(', ') : `${values.slice(0, max).join(', ')} +${values.length - max}`);

export const FixQueue = ({ items, context }: { items: readonly FixQueueItem[]; context: CatalogQueryResult }) => {
  const { t, formatNumber } = useTranslation();
  if (items.length === 0) return null;
  const contextRead = context.outcome === 'ok' || context.outcome === 'empty' || context.outcome === 'scan-limit';
  return (
    <Panel as="section" pad="roomy" className="pvs-fixq">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('fix.title')}
          </Heading>
          <Paragraph className="pvs-prose pvs-muted">{t('fix.body')}</Paragraph>
        </Stack>
        <ol className="pvs-fixq__list">
          {items.map((item, index) => {
            const where = item.services.length > 0 ? item.services : item.workloads.length > 0 ? item.workloads : item.entityNames;
            return (
              <li key={item.displayId} className="pvs-fixq__item" data-act-now={item.actNow ? 'true' : undefined}>
                <span className="pvs-fixq__rank" aria-hidden="true">
                  {index + 1}
                </span>
                <Stack gap="tight">
                  <div className="pvs-fixq__head">
                    <Text textStyle="base-emphasized" className="pvs-wrap">
                      {item.title}
                    </Text>
                    {item.score !== null && (
                      <div className="pvs-fixq__score">
                        <Text className="pvs-caption">{t('p.sec.v2.h.score')}</Text>
                        <Figure value={formatNumber(Number(item.score.toFixed(1)))} size="md" />
                      </div>
                    )}
                  </div>
                  <div className="pvs-fixq__chips">
                    {item.actNow && (
                      <Chip color="critical" variant="accent" size="condensed">
                        {t('fix.actNow')}
                      </Chip>
                    )}
                    {item.reasons.map((reason) => (
                      <Chip key={reason} color={reason === 'inUse' ? 'warning' : 'critical'} variant="emphasized" size="condensed">
                        {t(REASON_KEY[reason])}
                      </Chip>
                    ))}
                    {item.cve !== null && (
                      <Chip color="neutral" variant="emphasized" size="condensed">
                        {item.cve}
                      </Chip>
                    )}
                  </div>
                  <dl className="pvs-fixq__facts">
                    <div>
                      <dt>{t('fix.component')}</dt>
                      <dd>{item.components.length > 0 ? list(item.components) : item.technology ?? t('fix.unknown')}</dd>
                    </div>
                    <div>
                      <dt>{item.services.length > 0 ? t('fix.services') : item.workloads.length > 0 ? t('fix.workloads') : t('fix.entities')}</dt>
                      <dd>{where.length > 0 ? list(where) : t('fix.unknown')}</dd>
                    </div>
                    <div>
                      <dt>{item.owners.length > 0 ? t('fix.owner') : t('fix.namespace')}</dt>
                      <dd>{item.owners.length > 0 ? list(item.owners) : item.namespaces.length > 0 ? list(item.namespaces) : t('fix.noOwner')}</dd>
                    </div>
                  </dl>
                </Stack>
              </li>
            );
          })}
        </ol>
        <Text className="pvs-caption">{contextRead ? t('fix.source') : t('fix.noContext')}</Text>
      </Stack>
    </Panel>
  );
};
