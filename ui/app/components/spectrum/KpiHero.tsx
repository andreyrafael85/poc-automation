import React from 'react';

import Colors from '@dynatrace/strato-design-tokens/colors';
import { AnalyticsIcon } from '@dynatrace/strato-icons';

import { StratoKpi, StratoSpark, StratoSplit } from '../../engine/strato';
import { isUnavailable, type Fact } from '../../models/provenance';
import { type SpectrumFamily } from './family';

export interface KpiMeterSegment {
  key: string;
  label: string;
  value: number;
  /** `step` shades of the card's family (a composition), or a status tone (a verdict, with its word in the label). */
  tone?: 'step' | 'critical' | 'warning' | 'good' | 'ideal' | 'muted';
}

export interface KpiHeroProps {
  /** Name of the number (already translated). */
  eyebrow: string;
  /** The value, already formatted for the locale. Ignored when the fact is unavailable. */
  value: string;
  unit?: string;
  /** What the number counts (already translated). */
  caption?: string;
  /**
   * Where the number came from. Required: a headline without a source is the thing this app
   * exists to prevent. An unavailable fact renders a dash and its reason, never `value`.
   */
  fact: Fact<number | string | null>;
  family?: SpectrumFamily;
  /**
   * A series over time behind the number, oldest first. Only from a query that has a time
   * dimension: a tile whose data has none gets no sparkline, never a decorative one.
   */
  spark?: { points: readonly number[]; label: string };
  /**
   * 3.3.8: a measured split in place of a sparkline when the figure has no time series — the
   * estate by layer, services by failure band, problems closed vs. open, errors by app. Each
   * segment is a measured count; the bar never stands for a trend it did not read.
   */
  meter?: { segments: readonly KpiMeterSegment[]; label: string };
  /** A neutral note on movement or scope, printed under the sparkline (already translated). */
  trend?: string;
}

/**
 * A headline number with presence (3.2 "Value Spectrum"): an accent edge and a light wash in
 * its family, and the numeral painted with the family's ink at display size.
 *
 * It keeps every rule of `ValueCard`: the number comes with its evidence badge, an unavailable
 * fact shows a dash and the reason (never a zero), and the card's edge is dashed for anything
 * that is not an observation. The paint is a skin: the solid ink is underneath for print.
 */
/** Each family's accent: the Categorical Vivid colour nearest the family the card was given (3.5.2). */
const FAMILY_ACCENT: Record<string, string> = {
  'blue-turquoise': Colors.Charts.CategoricalVivid.Color01.Default,
  turquoise: Colors.Charts.CategoricalVivid.Color01.Default,
  'pink-purple': Colors.Charts.CategoricalVivid.Color02.Default,
  purple: Colors.Charts.CategoricalVivid.Color02.Default,
  orange: Colors.Charts.CategoricalVivid.Color04.Default,
  moss: Colors.Charts.CategoricalVivid.Color05.Default,
  blue: Colors.Charts.CategoricalVivid.Color06.Default,
};

const TONE_COLOR: Partial<Record<NonNullable<KpiMeterSegment['tone']>, string>> = {
  critical: Colors.Charts.Status.Critical.Default,
  warning: Colors.Charts.Status.Warning.Default,
  good: Colors.Charts.Status.Good.Default,
  ideal: Colors.Charts.Status.Ideal.Default,
  muted: Colors.Border.Neutral.Default,
};

/**
 * 3.5.2 (owner: "números monótonos, sem vida"; Strato native): the headline card is the app's one KPI anatomy — the
 * platform's SingleValue, its label beside a coloured badge, the family's accent, a measured mark under it (the
 * platform's Sparkline for a series, its MultiMeterBar for a split), the caption and the evidence badge. The rules stay:
 * an unavailable fact draws a dash and its reason, never `value`.
 */
export const KpiHero = ({ eyebrow, value, unit, caption, fact, family = 'blue-turquoise', spark, meter, trend }: KpiHeroProps) => {
  const missing = isUnavailable(fact) || value === '—';
  const accent = FAMILY_ACCENT[family] ?? Colors.Charts.CategoricalVivid.Color01.Default;
  const shown = meter?.segments.filter((segment) => segment.value > 0) ?? [];
  const mark =
    spark !== undefined ? (
      <StratoSpark points={spark.points} label={spark.label} color={accent} />
    ) : shown.length > 0 && meter !== undefined ? (
      <StratoSplit parts={shown.map((segment) => ({ label: segment.label, value: segment.value, color: segment.tone === undefined || segment.tone === 'step' ? undefined : TONE_COLOR[segment.tone] }))} ariaLabel={meter.label} />
    ) : undefined;
  return (
    <StratoKpi
      className="pvs-kpi"
      label={eyebrow}
      badge={<AnalyticsIcon />}
      accent={accent}
      fact={fact}
      value={missing ? null : value}
      unit={unit ?? fact.unit}
      mark={mark}
      caption={trend === undefined ? caption : caption === undefined ? trend : `${caption} · ${trend}`}
    />
  );
};
