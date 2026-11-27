import React from 'react';

import { DonutChart } from '@dynatrace/strato-components/charts';
import Colors from '@dynatrace/strato-design-tokens/colors';

import { useTranslation } from '../../i18n/useTranslation';
import { useStratoMode, WhenSized } from './mode';

/** Categorical Vivid in order (3.4.16 D-01): the slice and its legend row share the colour by position. */
const VIVID = [
  Colors.Charts.CategoricalVivid.Color01.Default,
  Colors.Charts.CategoricalVivid.Color02.Default,
  Colors.Charts.CategoricalVivid.Color03.Default,
  Colors.Charts.CategoricalVivid.Color04.Default,
  Colors.Charts.CategoricalVivid.Color05.Default,
  Colors.Charts.CategoricalVivid.Color06.Default,
  Colors.Charts.CategoricalVivid.Color07.Default,
  Colors.Charts.CategoricalVivid.Color08.Default,
];

/**
 * Parts of a whole on the platform's `DonutChart` (3.4.18, D-05): the share on each slice, the legend beside it, the
 * total in the centre. Every slice is shown (DN-3): the platform's default folds slices under 2 % into "Other", which
 * would hide a layer the app has always named ("Synthetic monitors 0.9 %"). Only a complete split is drawn here — a
 * capped list is a ranking, never a whole (rule 7); the caller passes slices that add up to the total it names.
 *
 * The legend is the app's own list (name, count, share): the platform's legend truncates names in a narrow card, and a
 * legend written in text is what a reader, a test and a Tech Wrapup pin can read (the chart itself is a drawing).
 */

export interface StratoDonutSlice {
  label: string;
  value: number;
  /** A fixed colour for the slice (a status), otherwise the next Categorical Vivid colour. */
  color?: string;
  /** The value as the caller formatted it (the legend), when it has its own format. */
  display?: string;
}

export interface StratoDonutProps {
  slices: readonly StratoDonutSlice[];
  /** The total, already formatted (the centre). */
  centerValue: string;
  /** What the total counts (the centre's second line). */
  centerLabel: string;
  height?: number;
  legend?: 'right' | 'bottom';
  formatter?: (value: number) => string;
  /** Formats a share 0–100 (one decimal by default). */
  shareFormatter?: (percent: number) => string;
  ariaLabel: string;
}

/**
 * 3.8.1 (the owner: the AI page's "Tokens by service" donut showed "298,1 mi" cut at both ends): the total in the centre is
 * sized to the hole of the ring — about 55 % of the chart's height — so a longer reading shrinks instead of spilling under the
 * ring (from 14 to 28 px).
 */
export function centerFontSize(text: string, height: number): number {
  const room = height * 0.55;
  const fit = room / (Math.max(1, text.length) * 0.6);
  return Math.floor(Math.max(14, Math.min(28, fit)));
}

export const StratoDonut = ({
  slices,
  centerValue,
  centerLabel,
  height = 220,
  legend = 'right',
  formatter,
  shareFormatter,
  ariaLabel,
}: StratoDonutProps) => {
  const mode = useStratoMode();
  const { t } = useTranslation();
  const shown = slices.filter((slice) => slice.value > 0).map((slice, index) => ({ ...slice, color: slice.color ?? VIVID[index % VIVID.length] }));
  const total = shown.reduce((sum, slice) => sum + slice.value, 0);
  const number = formatter ?? ((value: number) => String(value));
  const share = shareFormatter ?? ((percent: number) => `${(Math.round(percent * 10) / 10).toString()} %`);
  const data = shown.map((slice) => ({ label: slice.label, value: slice.value, color: slice.color }));

  return (
    <div className="pvs-sdonut" data-legend={legend} data-pvs-chart="donut" data-pvs-state={data.length > 0 ? 'ready' : 'unavailable'}>
      <WhenSized className="pvs-sdonut__chart" minHeight={height}>
        {/* A square of fixed size (the legend is the app's): the chart never measures a hidden tab's 0 px — which made it
            write an invalid width — and it prints as drawn. */}
        <DonutChart data={data} labelAccessor="label" valueAccessor="value" height={height} width={height} formatter={formatter}>
          <DonutChart.Legend hidden />
          <DonutChart.Labels hidden />
          <DonutChart.Grouping threshold={{ type: 'relative', value: 0 }} />
          <DonutChart.Inner>
            <div className="pvs-sdonut__inner">
              <span className="pvs-sdonut__total" style={{ ['--pvs-sdonut-total' as string]: `${centerFontSize(centerValue, height)}px` }}>
                {centerValue}
              </span>
              <span className="pvs-sdonut__label">{centerLabel}</span>
            </div>
          </DonutChart.Inner>
          {mode !== 'screen' && <DonutChart.Toolbar hidden />}
        </DonutChart>
      </WhenSized>
      <ul className="pvs-sdonut__legend" aria-label={ariaLabel}>
        {/* 3.5.9 (v6): the legend read as a table — a quiet header over name, count and share. */}
        <li className="pvs-sdonut__head" aria-hidden="true">
          <span />
          <span>{t('v6.legend.name')}</span>
          <span>{t('v6.legend.count')}</span>
          <span>{t('v6.legend.share')}</span>
        </li>
        {shown.map((slice) => (
          <li key={slice.label} className="pvs-sdonut__row">
            <span className="pvs-sdonut__swatch" aria-hidden="true" style={{ background: slice.color }} />
            <span className="pvs-sdonut__name">{slice.label}</span>
            <span className="pvs-sdonut__value">{slice.display ?? number(slice.value)}</span>
            <span className="pvs-sdonut__share">{total > 0 ? share((slice.value * 100) / total) : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
