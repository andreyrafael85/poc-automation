import { useCallback, useMemo } from 'react';

import { formatRatio as formatRatioWith, type Ratio } from '../utils/records';
import { useStudio } from '../config/StudioContext';
import { LOCALE_TAG, pluralKey, translate, type Locale, type StringKey } from './strings';

/**
 * Translation and locale-aware formatting.
 *
 * Numbers and dates go through the active locale too, not just words. A
 * Portuguese report that still prints `18,247 h` and `9/1/2026` reads as a
 * half-finished translation, which is worse than leaving it in English.
 */

export interface Translation {
  t: (key: StringKey, params?: Readonly<Record<string, string | number>>) => string;
  /**
   * Translates a window label that may or may not be a dictionary key.
   *
   * Timeframe labels travel on every `EvidenceRef` in the app. Global windows
   * carry a key (`timeframe.now-24h`); a query pinned to its own window carries
   * one too. `translate` returns the key unchanged when it does not resolve, so
   * this stays safe for anything unexpected instead of rendering blank.
   */
  tWindow: (label: string) => string;
  /** `t` for a phrase built around a count: the `<key>.one` form when the count is 1 ("1 host monitored"). */
  tCount: (key: StringKey, count: number, params?: Readonly<Record<string, string | number>>) => string;
  locale: Locale;
  /** Locale-aware integer/decimal formatting. */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /**
   * A count for a table cell: the number in the app's locale, or a dash when there is none.
   * (`value.toLocaleString()` uses the *browser's* locale, so a Portuguese screen printed
   * "1,594,208" in a cell beside a KPI that read "1.594.208".)
   */
  formatCount: (value: number | null | undefined) => string;
  /** A fixed number of decimals in the app's locale: `formatDecimal(1.5, 2)` → "1,50" in pt-BR. */
  formatDecimal: (value: number, digits: number) => string;
  /** "0,01% (153 de 1.594.208)": a percentage always travels with its denominator. */
  formatRatio: (value: Ratio | null, digits?: number) => string;
  /** Locale-aware date and time. */
  formatDateTime: (iso: string) => string;
  formatTime: (iso: string) => string;
  /**
   * A calendar day — UTC midnight in ms, or `YYYY-MM-DD` — as the locale writes a date. The day is
   * read in UTC, as Grail bins days: through the viewer's zone, 5 Oct at 00:00 UTC read as 4 Oct
   * in Brasília (3.2.6).
   */
  formatDay: (day: number | string) => string;
}

export function useTranslation(): Translation {
  const { locale } = useStudio();
  const tag = LOCALE_TAG[locale];

  const t = useCallback(
    (key: StringKey, params?: Readonly<Record<string, string | number>>) =>
      translate(key, locale, params),
    [locale],
  );

  const tCount = useCallback(
    (key: StringKey, count: number, params?: Readonly<Record<string, string | number>>) => {
      return translate(pluralKey(key, count), locale, params);
    },
    [locale],
  );

  const tWindow = useCallback(
    (label: string) => translate(label as StringKey, locale),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => value.toLocaleString(tag, options),
    [tag],
  );

  const formatCount = useCallback(
    (value: number | null | undefined) => (value === null || value === undefined ? '—' : value.toLocaleString(tag)),
    [tag],
  );

  const formatDecimal = useCallback(
    (value: number, digits: number) =>
      value.toLocaleString(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    [tag],
  );

  const formatRatio = useCallback(
    (value: Ratio | null, digits = 1) =>
      formatRatioWith(value, digits, {
        decimal: formatDecimal,
        count: (n) => n.toLocaleString(tag),
        of: translate('common.of', locale),
      }),
    [formatDecimal, tag, locale],
  );

  const formatDateTime = useCallback(
    (iso: string) => {
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(tag);
    },
    [tag],
  );

  const formatTime = useCallback(
    (iso: string) => {
      const date = new Date(iso);
      return Number.isNaN(date.getTime())
        ? iso
        : date.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' });
    },
    [tag],
  );

  const formatDay = useCallback(
    (day: number | string) => {
      const date = typeof day === 'number' ? new Date(day) : new Date(`${day}T00:00:00.000Z`);
      return Number.isNaN(date.getTime()) ? String(day) : date.toLocaleDateString(tag, { timeZone: 'UTC' });
    },
    [tag],
  );

  return useMemo(
    () => ({ t, tCount, tWindow, locale, formatNumber, formatCount, formatDecimal, formatRatio, formatDateTime, formatTime, formatDay }),
    [t, tCount, tWindow, locale, formatNumber, formatCount, formatDecimal, formatRatio, formatDateTime, formatTime, formatDay],
  );
}
