import React from 'react';

import { useTranslation } from '../../i18n/useTranslation';
import { StratoBars, useStratoMode } from '../strato';
import { STATUS_LABEL, type ChartStatus } from './status';
import './chart.css';

export interface RankedBar {
  key: string;
  label: string;
  value: number;
  /** The value with its unit, as printed ("4.8 %"). */
  display: string;
  status: ChartStatus;
}

export interface RankedBarsProps {
  items: readonly RankedBar[];
  /** The review line drawn across every bar ("1 %"), in the bars' unit. */
  line?: { value: number; label: string };
  /** What the list ranks, for assistive technology. */
  ariaLabel: string;
  /** Formats a value on the chart's axis and tooltip (each row's own `display` stays the text). */
  format?: (value: number) => string;
}

/**
 * Ranked bars with a status and a review line (3.3.7): each bar is a row — name, a bar on one
 * shared scale, the value — coloured by its status against the line, which is drawn dashed
 * across the track. The status is also in the row's text for assistive technology and in a
 * legend under the list, so colour never carries it alone. A capped list says so in its frame
 * ("top 6 of 50"); this component never sums it.
 */
export const RankedBars = ({ items, line, ariaLabel, format }: RankedBarsProps) => {
  const { t } = useTranslation();
  const mode = useStratoMode();
  if (items.length === 0) return null;
  // 3.5.6: photographed for the Tech Wrapup, the bars are drawn as rows with their names and values as text — the
  // deck's pins point at a name or a figure the app wrote (on the platform's canvas they fell on the chart's corner).
  if (mode === 'capture') return <RankedRows items={items} line={line} ariaLabel={ariaLabel} />;
  // 3.5.0 (Strato native, wave 2; D-08): the bars are the platform's CategoricalBarChart — the name on the axis, each bar
  // in its status tone, the review line as a threshold. The rows stay as text for assistive technology and for the
  // Tech Wrapup's pins (first row, how many sit above the line); the legend under the chart names every status.
  return (
    <div className="pvs-ranked">
      <StratoBars
        rows={items.map((item) => ({ label: item.label, value: item.value, tone: item.status }))}
        line={line}
        formatter={format}
        ariaLabel={ariaLabel}
      />
      <ol className="pvs-ranked__list pvs-sr-only" aria-label={ariaLabel}>
        {items.map((item) => (
          <li key={item.key} className="pvs-ranked__row" data-status={item.status}>
            <span className="pvs-ranked__label">{item.label}</span>
            <span className="pvs-ranked__value">
              {item.display}
              <span> · {t(STATUS_LABEL[item.status])}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="pvs-ranked__legend" aria-hidden="true">
        {line !== undefined && (
          <span className="pvs-ranked__key">
            <span className="pvs-ranked__key-line" />
            {line.label}
          </span>
        )}
        {(['critical', 'warning', 'good'] as const).map((status) => (
          <span key={status} className="pvs-ranked__key" data-status={status}>
            <span className="pvs-ranked__key-dot" />
            {t(STATUS_LABEL[status])}
          </span>
        ))}
      </div>
    </div>
  );
};

/** 3.5.6: the rows drawn as text and bars (the capture mode), each bar on one shared scale with the review line. */
const RankedRows = ({ items, line, ariaLabel }: Pick<RankedBarsProps, 'items' | 'line' | 'ariaLabel'>) => {
  const { t } = useTranslation();
  const max = Math.max(...items.map((item) => item.value), line?.value ?? 0) * 1.08 || 1;
  const pct = (value: number) => `${Math.min(100, (Math.max(0, value) / max) * 100).toFixed(2)}%`;
  return (
    <div className="pvs-ranked" data-mode="capture">
      <ol className="pvs-ranked__list" aria-label={ariaLabel}>
        {items.map((item) => (
          <li key={item.key} className="pvs-ranked__row" data-status={item.status}>
            <span className="pvs-ranked__label" title={item.label}>
              {item.label}
            </span>
            <span className="pvs-ranked__track" aria-hidden="true">
              <span className="pvs-ranked__bar" style={{ width: pct(item.value) }} />
              {line !== undefined && <span className="pvs-ranked__line" style={{ left: pct(line.value) }} />}
            </span>
            <span className="pvs-ranked__value">
              {item.display}
              <span className="pvs-sr-only"> · {t(STATUS_LABEL[item.status])}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="pvs-ranked__legend" aria-hidden="true">
        {line !== undefined && (
          <span className="pvs-ranked__key">
            <span className="pvs-ranked__key-line" />
            {line.label}
          </span>
        )}
        {(['critical', 'warning', 'good'] as const).map((status) => (
          <span key={status} className="pvs-ranked__key" data-status={status}>
            <span className="pvs-ranked__key-dot" />
            {t(STATUS_LABEL[status])}
          </span>
        ))}
      </div>
    </div>
  );
};
