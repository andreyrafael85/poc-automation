import React from 'react';

import { SingleValue } from '@dynatrace/strato-components/charts';
import { Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { useTranslation } from '../../i18n/useTranslation';
import { isUnavailable, UNAVAILABLE_LABEL_KEY, type Fact, type Provenance } from '../../models/provenance';
import { Panel } from '../Panel';

/**
 * One KPI anatomy for the whole app (3.4.18, D-03/D-06; `docs/v3.4/DESIGN-STRATO-NATIVO-PLANO.md` §4.2, DN-2):
 *
 *   label (Text base-emphasized)
 *   value — the platform's `SingleValue`, number in neutral ink, unit beside it
 *   mark  — a Strato `Sparkline`, `MeterBarChart` or `MultiMeterBarChart` (optional)
 *   caption (Text small, subdued)
 *   provenance — the evidence badge: class, query, read time
 *
 * The rules of `KpiHero` stay: the number arrives with its `Fact`; an unavailable fact draws a dash and the reason,
 * never a zero (rule 8); the edge is dashed for what is not an observation. The label sits outside `SingleValue`
 * (its own label grows with the box), and the row caps every value at one size (`StratoKpiRow`), so six numbers side by
 * side read at the same height — as on a platform dashboard.
 */

export interface StratoKpiProps {
  /** Name of the number (already translated). */
  label: string;
  /** Where the number came from. An unavailable fact shows a dash and its reason, never `value`. */
  fact: Fact<number | string | null>;
  /** The measured value. A number keeps `formatter` and `unit`; a string is shown as it is. */
  value: number | string | null;
  /** Formats a numeric value in the viewer's locale (called with the value only). */
  formatter?: (value: number) => string;
  /** Written after the formatted number (a thin space between). */
  unit?: string;
  /** One line under the value: what the number counts, or its split. */
  caption?: React.ReactNode;
  /** A Strato mark under the value (sparkline, meter, split). Only measured data — never a decorative one. */
  mark?: React.ReactNode;
  /** A functional icon before the value (the inventory tiles). */
  icon?: React.ReactNode;
  /** `sm` for a dense row (the inventory); `md` by default. */
  size?: 'sm' | 'md';
  testId?: string;
  className?: string;
  /** A functional icon in a coloured badge beside the label (3.5.2: the card's accent colour). */
  badge?: React.ReactNode;
  /** The card's accent colour (a CSS colour or token), when it does not sit in a StratoKpiRow that assigns one. */
  accent?: string;
  /**
   * 3.5.8 (v6): the change since a measured "before" — never estimated (rule 8). `display` is the signed figure the app
   * formatted ("+24"); `words` say it in full for assistive technology ("24 more since Day 0"); `tone` is whether the
   * change is good.
   */
  delta?: KpiDelta;
}

export interface KpiDelta {
  value: number;
  display: string;
  words: string;
  tone: 'good' | 'bad' | 'neutral';
}

export const StratoKpi = ({ label, fact, value, formatter, unit, caption, mark, icon, size = 'md', testId, className, badge, accent, delta }: StratoKpiProps) => {
  const { t } = useTranslation();
  const missing = isUnavailable(fact) || value === null || value === '—';
  const reason =
    fact.provenance in UNAVAILABLE_LABEL_KEY
      ? t(UNAVAILABLE_LABEL_KEY[fact.provenance as keyof typeof UNAVAILABLE_LABEL_KEY])
      : t('tl.notMeasured');
  const edge: Provenance = missing && !isUnavailable(fact) ? 'no-telemetry' : fact.provenance;
  const shownUnit = unit ?? fact.unit;
  // 3.4.18: the platform's own unit handling formats through `@dynatrace-sdk/units` and ignores `formatter` (7,652 h read
  // "7.7Kh"); the app formats the number in the viewer's locale and writes the unit itself.
  const display = (raw: number) => {
    const text = formatter === undefined ? String(raw) : formatter(raw);
    return shownUnit === undefined || shownUnit === '' ? text : `${text}\u202f${shownUnit}`;
  };  const printed =
    value === null
      ? ''
      : typeof value === 'number'
        ? display(value)
        : shownUnit !== undefined && shownUnit !== '' && !value.endsWith(shownUnit)
          ? `${value}\u202f${shownUnit}`
          : value;


  return (
    <Panel
      className={['pvs-skpi', className].filter(Boolean).join(' ')}
      evidence={edge}
      data-size={size}
      data-pvs-chart="kpi"
      data-pvs-state={missing ? 'unavailable' : 'ready'}
      data-missing={missing ? 'true' : undefined}
      data-testid={testId}
      data-accent={accent === undefined ? undefined : 'true'}
      style={accent === undefined ? undefined : ({ '--pvs-skpi-accent': accent } as React.CSSProperties)}
    >
      <div className="pvs-skpi__head">
        {badge !== undefined && (
          <span className="pvs-skpi__badge" aria-hidden="true">
            {badge}
          </span>
        )}
        <Text textStyle="base-emphasized" className="pvs-skpi__label">
          {label}
        </Text>
      </div>
      <div className="pvs-skpi__valuerow">
      <div className="pvs-skpi__value">
        {missing ? (
          <span className="pvs-skpi__dash" role="img" aria-label={`${label}: ${reason}`}>
            —
          </span>
        ) : (
          <>
            {/* The platform's SingleValue sizes its text from its box on screen; on a printed page that measure is lost
                (the number printed blank), so print shows the same reading as the app's own text (3.5.0). */}
            <div className="pvs-skpi__screen">
              <SingleValue
                data={typeof value === 'string' && shownUnit !== undefined && shownUnit !== '' && !value.endsWith(shownUnit) ? `${value}\u202f${shownUnit}` : value}
                formatter={typeof value === 'number' ? (raw: number) => display(raw) : undefined}
                prefixIcon={icon === undefined ? undefined : <span aria-hidden="true">{icon}</span>}
                height="100%"
              />
            </div>
            <span className="pvs-skpi__print" aria-hidden="true" data-long={printed.length > 11 ? 'true' : undefined}>
              {printed}
            </span>
          </>
        )}
      </div>
      {!missing && delta !== undefined && (
        <span className="pvs-skpi__delta" data-tone={delta.tone} data-direction={delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat'}>
          <span aria-hidden="true">{delta.value > 0 ? '▲' : delta.value < 0 ? '▼' : '='}</span>
          <span aria-hidden="true">{delta.display}</span>
          <span className="pvs-sr-only">{delta.words}</span>
        </span>
      )}
      </div>
      {!missing && mark !== undefined && <div className="pvs-skpi__mark">{mark}</div>}
      {missing ? (
        <Text textStyle="small" className="pvs-skpi__caption">
          {reason}
        </Text>
      ) : (
        caption !== undefined && (
          <Text textStyle="small" className="pvs-skpi__caption">
            {caption}
          </Text>
        )
      )}
      <div className="pvs-skpi__foot">
        <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
      </div>
    </Panel>
  );
};

/**
 * The KPI band: equal columns on a wide screen, two then one on a narrow one, and one value size for the whole row
 * (the variable `SingleValueGrid` uses; without it each `SingleValue` fits its own box and the row reads ragged).
 */
/**
 * Balanced rows (3.5.3, the owner's "components resized and well fitted, as on Coverage"): as many columns as the row's
 * width allows at `min` px, then the fewest columns that keep the same number of rows — six cards read 3 + 3, never
 * 4 + 2 with two holes; five read 3 + 2; seven 4 + 3. Screen only: on paper the row keeps its auto-fit columns.
 */
export function balancedColumns(count: number, width: number, min: number, gap: number): number {
  if (count <= 0) return 1;
  const most = Math.max(1, Math.floor((width + gap) / (min + gap)));
  const rows = Math.ceil(count / most);
  return Math.ceil(count / rows);
}

export const StratoKpiRow = ({
  children,
  min = 180,
  valueCap = 36,
  testId,
  className,
}: {
  children: React.ReactNode;
  /** Narrowest column, in px. */
  min?: number;
  valueCap?: 28 | 32 | 36 | 48;
  testId?: string;
  className?: string;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [cols, setCols] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const width = element.clientWidth;
      if (width <= 0) return;
      const gap = parseFloat(getComputedStyle(element).columnGap) || 16;
      setCols(balancedColumns(element.children.length, width, min, gap));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [min, children]);
  return (
    <div
      ref={ref}
      className={['pvs-skpi-row', className].filter(Boolean).join(' ')}
      data-testid={testId}
      data-cols={cols ?? undefined}
      style={
        {
          '--pvs-skpi-min': `${min}px`,
          '--dt-charts-single-value-global-value-font-size': valueCap,
          ...(cols === null ? {} : { '--pvs-skpi-cols': cols }),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};
