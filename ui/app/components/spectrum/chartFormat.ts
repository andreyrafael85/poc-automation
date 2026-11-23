import { useMemo } from 'react';

import { LOCALE_TAG } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ChartFormat {
  /** A short number for an axis or a peak label: "1.2k", "3,4 mil". */
  compact: (value: number) => string;
  /** A number with up to `digits` decimals in the app's locale. */
  decimal: (value: number, digits?: number) => string;
  /** The start of a bin for a tooltip: weekday, date and time. */
  binTime: (ms: number) => string;
  /** An axis tick for a series spanning `spanMs`: the hour within two days, the date beyond. */
  tick: (spanMs: number) => (ms: number) => string;
}

/** Locale-aware formatting for the Spectrum charts (3.2.3), in the app's language, not the browser's. */
export function useChartFormat(): ChartFormat {
  const { locale } = useTranslation();
  const tag = LOCALE_TAG[locale];
  return useMemo(() => {
    const compact = new Intl.NumberFormat(tag, { notation: 'compact', maximumFractionDigits: 1 });
    const time = new Intl.DateTimeFormat(tag, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const hour = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' });
    const day = new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit' });
    return {
      compact: (value) => compact.format(value),
      decimal: (value, digits = 1) => value.toLocaleString(tag, { maximumFractionDigits: digits }),
      binTime: (ms) => time.format(ms),
      tick: (spanMs) => (ms) => (spanMs <= 2 * DAY_MS ? hour.format(ms) : day.format(ms)),
    };
  }, [tag]);
}
