import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { Stack } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import { decimal } from '../../utils/activeLocale';
import { ADOPTION_STATE_LABEL, CAPABILITY_LABEL } from './adoption';
import { DOMAIN_LABEL, shareDisplay } from './DomainList';
import type { AssessmentSnapshot, Comparison, SnapshotDomain } from './history';
import './assessment.css';

const CLASS_LABEL: Record<string, StringKey> = {
  critical: 'p.asm.class.critical',
  warning: 'p.asm.class.warning',
  opportunity: 'p.asm.class.opportunity',
  strength: 'p.asm.class.strength',
};

/** "+5", "−3", "0" — a signed whole or one-decimal number, never a sign alone. */
const signed = (value: number, digits: number) => {
  const text = decimal(Math.abs(value), digits);
  if (Number(text.replace(',', '.')) === 0) return text;
  return value > 0 ? `+${text}` : `−${text}`;
};

const domainCell = (domain: SnapshotDomain | null, t: Translation['t']) => {
  if (domain === null) return '—';
  if (domain.state === 'not-applicable') return t('p.asm.hist.na');
  if (domain.share === null) return t('p.asm.hist.unread');
  return shareDisplay(domain.share);
};

/**
 * Before × after (3.4.2, F-01): a kept reading beside the current one — the index, each domain, the
 * capabilities whose state changed and the findings resolved, new or kept. A difference is printed
 * only where both readings measured; otherwise both values are stated and the difference is a dash.
 */
export const ComparisonView = ({
  before,
  now,
  comparison,
  t,
  formatNumber,
  formatDateTime,
}: {
  before: AssessmentSnapshot;
  now: AssessmentSnapshot;
  comparison: Comparison;
  t: Translation['t'];
  formatNumber: Translation['formatNumber'];
  formatDateTime: Translation['formatDateTime'];
}) => {
  const { index } = comparison;
  return (
    <Stack gap="group">
      <Text>
        {t('p.asm.hist.between', {
          before: `${before.window} · ${formatDateTime(before.readAt)}`,
          now: `${now.window} · ${formatDateTime(now.readAt)}`,
        })}
      </Text>
      {before.window !== now.window && <Text className="pvs-caption">{t('p.asm.hist.windowsDiffer')}</Text>}

      <div className="pvs-asm-head__facts" data-print-atom data-testid="asm-hist-index">
        <span className="pvs-asm-head__fact">
          <span className="pvs-asm-head__label">{t('p.asm.hist.indexBefore')}</span>
          <span className="pvs-asm-head__value">{index.before === null ? '—' : formatNumber(index.before)}</span>
        </span>
        <span className="pvs-asm-head__fact">
          <span className="pvs-asm-head__label">{t('p.asm.hist.indexNow')}</span>
          <span className="pvs-asm-head__value">{index.now === null ? '—' : formatNumber(index.now)}</span>
        </span>
        <span className="pvs-asm-head__fact">
          <span className="pvs-asm-head__label">{t('p.asm.hist.difference')}</span>
          <span className="pvs-asm-head__value">{index.delta === null ? t('p.asm.hist.noDelta') : t('p.asm.hist.points', { value: signed(index.delta, 0) })}</span>
        </span>
      </div>

      <div className="pvs-asm-table-wrap" data-print-atom>
        <table className="pvs-asm-table" data-testid="asm-hist-domains">
          <thead>
            <tr>
              <th scope="col">{t('p.asm.formula.domain')}</th>
              <th scope="col" data-num>
                {t('p.asm.hist.before')}
              </th>
              <th scope="col" data-num>
                {t('p.asm.hist.now')}
              </th>
              <th scope="col" data-num>
                {t('p.asm.hist.difference')}
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.domains.map((row) => (
              <tr key={row.id}>
                <th scope="row">{t(DOMAIN_LABEL[row.id])}</th>
                <td data-num>{domainCell(row.before, t)}</td>
                <td data-num>{domainCell(row.now, t)}</td>
                <td data-num>{row.delta === null ? '—' : t('p.asm.hist.pp', { value: signed(row.delta, 1) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Stack gap="tight">
        <Heading level={4} as="h3">
          {t('p.asm.hist.capabilities')}
        </Heading>
        {comparison.adoption.length === 0 ? (
          <Text className="pvs-caption">{t('p.asm.hist.capabilitiesSame')}</Text>
        ) : (
          <ul className="pvs-asm-summary">
            {comparison.adoption.map((row) => (
              <li key={row.id}>
                <Text>
                  {t('p.asm.hist.capabilityChange', {
                    name: t(CAPABILITY_LABEL[row.id]),
                    before: t(ADOPTION_STATE_LABEL[row.before]),
                    now: t(ADOPTION_STATE_LABEL[row.now]),
                  })}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </Stack>

      <div className="pvs-asm-table-wrap" data-print-atom>
        <table className="pvs-asm-table" data-testid="asm-hist-classes">
          <thead>
            <tr>
              <th scope="col">{t('p.asm.hist.findingsByClass')}</th>
              <th scope="col" data-num>
                {t('p.asm.hist.before')}
              </th>
              <th scope="col" data-num>
                {t('p.asm.hist.now')}
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.classes.map((row) => (
              <tr key={row.cls}>
                <th scope="row">{t(CLASS_LABEL[row.cls] ?? 'p.asm.class.warning')}</th>
                <td data-num>{formatNumber(row.before)}</td>
                <td data-num>{formatNumber(row.now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(
        [
          ['resolved', 'p.asm.hist.resolved', comparison.resolved],
          ['raised', 'p.asm.hist.raised', comparison.raised],
        ] as const
      ).map(([key, labelKey, list]) => (
        <Stack key={key} gap="tight" data-testid={`asm-hist-${key}`}>
          <Heading level={4} as="h3">
            {t(labelKey, { count: formatNumber(list.length) })}
          </Heading>
          {list.length === 0 ? (
            <Text className="pvs-caption">{t('p.asm.hist.none')}</Text>
          ) : (
            <ul className="pvs-asm-summary">
              {list.map((finding) => (
                <li key={finding.rule}>
                  <Text>{`${finding.rule} · ${finding.title}`}</Text>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      ))}
      <Text className="pvs-caption">{t('p.asm.hist.kept', { count: formatNumber(comparison.kept.length) })}</Text>
    </Stack>
  );
};
