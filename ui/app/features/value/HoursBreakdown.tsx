import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import { IdeaIcon } from '@dynatrace/strato-icons';

import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { formatHours } from '../../models/cost';
import type { CategoryHours } from '../../models/problemHours';

/**
 * "Where the problem hours went" (3.2.7). The 3.2.6 mosaic of 100 coloured cells was not read as
 * intended (owner's validation). The number is now explained as what it is: for each category,
 * **how many problems × how long each one stayed open, on average ≈ the hours** — a bar on one
 * scale, the share of the total, and the arithmetic in words — and, under it, the action the
 * biggest category calls for. Hours only, never money.
 */

const CATEGORY_KEY: Readonly<Record<string, StringKey>> = {
  AVAILABILITY: 'p.rca.cat.availability',
  ERROR: 'p.rca.cat.error',
  SLOWDOWN: 'p.rca.cat.slowdown',
  RESOURCE_CONTENTION: 'p.rca.cat.resource',
  CUSTOM_ALERT: 'p.rca.cat.custom',
};

const ACTION_KEY: Readonly<Record<string, StringKey>> = {
  AVAILABILITY: 'roi3.act.availability',
  ERROR: 'roi3.act.error',
  SLOWDOWN: 'roi3.act.slowdown',
  RESOURCE_CONTENTION: 'roi3.act.resource',
  CUSTOM_ALERT: 'roi3.act.custom',
};

const FAMILIES = ['pink-purple', 'orange', 'blue-turquoise', 'purple', 'moss', 'turquoise'] as const;

type Translate = (key: StringKey, params?: Readonly<Record<string, string | number>>) => string;

/**
 * The mean time a category's problems stayed open, precise enough for "problems × mean ≈ hours" to
 * check out against the total printed beside it: hours with 2 decimals, or minutes with 1 under an
 * hour (`formatHours` rounds the mean to 1 decimal, which on 1,703 problems is 20 h off the total).
 */
export function averageHours(hours: number, formatDecimal: (value: number, digits: number) => string): string {
  return hours < 1 ? `${formatDecimal(hours * 60, 1)} min` : `${formatDecimal(hours, 2)} h`;
}

/** A Davis category in the reader's language (ERROR → "Error"); an unknown one verbatim. */
export function hoursCategoryName(category: string, t: Translate): string {
  const key = CATEGORY_KEY[category];
  return key === undefined ? category : t(key);
}

export const HoursBreakdown = ({ rows }: { rows: readonly CategoryHours[] }) => {
  const { t, formatNumber, formatDecimal } = useTranslation();
  if (rows.length === 0) return null;
  const name = (category: string) => hoursCategoryName(category, t);
  const share = (value: number) => `${formatDecimal(value, value >= 10 ? 0 : 1)}%`;
  const total = rows.reduce((sum, row) => sum + row.hours, 0);
  const problems = rows.reduce((sum, row) => sum + (row.problems ?? 0), 0);
  const largest = Math.max(...rows.map((row) => row.hours));
  const top = rows[0];
  const action = top === undefined ? undefined : ACTION_KEY[top.category];

  return (
    <div className="pvs-hours">
      <Text className="pvs-hours__total">
        {t('roi4.hours.total', { hours: formatHours(total), problems: formatNumber(problems) })}
      </Text>
      <ol className="pvs-hours__rows" aria-label={t('roi.split.aria', { items: rows.map((row) => `${name(row.category)} ${formatHours(row.hours)} (${share(row.share)})`).join(', ') })}>
        {rows.map((row, index) => (
          <li key={row.category} className="pvs-hours__row" data-spectrum={FAMILIES[index % FAMILIES.length]} data-top={index === 0 ? 'true' : undefined}>
            <div className="pvs-hours__head">
              <Text className="pvs-hours__name">{name(row.category)}</Text>
              <Text className="pvs-hours__value">
                <strong>{formatHours(row.hours)}</strong> <span className="pvs-caption">· {t('roi4.hours.share', { share: share(row.share) })}</span>
              </Text>
            </div>
            <div className="pvs-hours__track" aria-hidden="true">
              <span className="pvs-hours__fill" style={{ width: `${Math.max(1.5, (row.hours / largest) * 100).toFixed(2)}%` }} />
            </div>
            <Text className="pvs-caption pvs-hours__math">
              {row.problems === null || row.mttrHours === null
                ? t('roi4.hours.noMath')
                : t('roi4.hours.math', { problems: formatNumber(row.problems), mttr: averageHours(row.mttrHours, formatDecimal), hours: formatHours(row.hours) })}
            </Text>
          </li>
        ))}
      </ol>
      {top !== undefined && action !== undefined && (
        <div className="pvs-hours__action">
          <IdeaIcon aria-hidden="true" />
          <Text>{t(action, { share: share(top.share), hours: formatHours(top.hours) })}</Text>
        </div>
      )}
    </div>
  );
};
