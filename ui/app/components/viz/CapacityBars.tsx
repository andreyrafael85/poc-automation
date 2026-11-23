import React from "react";

import { Button } from "@dynatrace/strato-components/buttons";
import { Text } from "@dynatrace/strato-components/typography";

import { TONE } from "../../engine";
import { useTranslation } from "../../i18n/useTranslation";

export interface CapacityHost {
  key: string;
  /** Host name (never translated). */
  name: string;
  /** Peak utilisation 0–100, or null when not measured. */
  peakPct: number | null;
  /** Token colour string for the fill and swatch, chosen from the host's class. */
  color: string;
  /** Already-translated class label (saturated, balanced, …). */
  classLabel: string;
  /** True for an over-provisioned host: the empty track is drawn as reclaimable. */
  reclaimable?: boolean;
}

interface CapacityBarsProps {
  hosts: readonly CapacityHost[];
  ariaLabel: string;
  /** Review thresholds, drawn as reference lines on a fixed 0–100 track. */
  pressuredPct: number;
  saturatedPct: number;
  /** Translated caption for the two reference lines. */
  pressuredLabel: string;
  saturatedLabel: string;
  /** Translated column headers, so the bar's meaning is explicit. */
  hostHeader: string;
  usageHeader: string;
  /** Translated caption explaining the reclaimable headroom. */
  headroomHint: string;
  /** Translated words for the per-host readout. */
  usageWord: string;
  reclaimWord: string;
  /**
   * Rows drawn before the rest sit behind "Show all". An estate of a few hundred hosts made a
   * page-long list; the list is ordered busiest and emptiest first, so the first rows are the
   * ones worth a look and the table below carries every host.
   */
  initialRows?: number;
}

export const CAPACITY_INITIAL_ROWS = 30;

const WARN = TONE.warning.borderAccent;
const FAULT = TONE.critical.borderAccent;

const LineKey = ({ color, label }: { color: string; label: string }) => (
  <span className="pvs-capacity__key">
    <span
      className="pvs-capacity__key-mark"
      style={{ background: color }}
      aria-hidden="true"
    />
    <Text className="pvs-caption">{label}</Text>
  </span>
);

/**
 * Host capacity as a ranked set of gauges on one fixed 0–100 scale.
 *
 * Every host is a labelled row, sorted worst-first, with its peak drawn against
 * the same scale and the review thresholds marked — so "which host, and how close
 * to the edge" is answered in one read. A host with no measurement shows a dash.
 *
 * v3.1: the fill is a solid token colour (no gradient); the class is a text label
 * with a swatch, not a coloured word; reclaimable headroom is hatched so it
 * differs from "used" by pattern as well as tint; and under a narrow content
 * width each row stacks (name and reading on one line, the bar below).
 */
export const CapacityBars = ({
  hosts: allHosts,
  ariaLabel,
  pressuredPct,
  saturatedPct,
  pressuredLabel,
  saturatedLabel,
  hostHeader,
  usageHeader,
  headroomHint,
  usageWord,
  reclaimWord,
  initialRows = CAPACITY_INITIAL_ROWS,
}: CapacityBarsProps) => {
  const { t, formatCount } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);
  const collapsible = allHosts.length > initialRows;
  const hosts =
    collapsible && !expanded ? allHosts.slice(0, initialRows) : allHosts;
  return (
    <div className="pvs-capacity">
      <div className="pvs-capacity__row" data-head="true">
        <Text className="pvs-label">{hostHeader}</Text>
        <Text className="pvs-label">{usageHeader}</Text>
        <div className="pvs-capacity__keys">
          <LineKey
            color={WARN}
            label={`${pressuredLabel} · ${pressuredPct}%`}
          />
          <LineKey
            color={FAULT}
            label={`${saturatedLabel} · ${saturatedPct}%`}
          />
        </div>
      </div>

      <ul className="pvs-bars" aria-label={ariaLabel}>
        {hosts.map((host) => {
          const measured = host.peakPct !== null;
          const pct = measured
            ? Math.max(1.5, Math.min(100, host.peakPct as number))
            : 0;
          const isReclaim = measured && host.reclaimable === true;
          const reclaimPct = measured
            ? Math.round(100 - (host.peakPct as number))
            : 0;
          return (
            <li key={host.key} className="pvs-capacity__row">
              <Text className="pvs-truncate pvs-bars__name" title={host.name}>
                {host.name}
              </Text>
              <div className="pvs-capacity__track" aria-hidden="true">
                {measured && (
                  <div
                    className="pvs-capacity__fill"
                    style={{ width: `${pct}%`, background: host.color }}
                  />
                )}
                {/* Reclaimable headroom, hatched, so a 10%-peak host reads as mostly free. */}
                {isReclaim && (
                  <div
                    className="pvs-capacity__reclaim"
                    style={{
                      insetInlineStart: `${pct}%`,
                      backgroundImage: `repeating-linear-gradient(45deg, ${host.color} 0 2px, transparent 2px 9px)`,
                    }}
                  />
                )}
                <span
                  className="pvs-capacity__ref"
                  style={{
                    insetInlineStart: `${pressuredPct}%`,
                    background: WARN,
                  }}
                />
                <span
                  className="pvs-capacity__ref"
                  style={{
                    insetInlineStart: `${saturatedPct}%`,
                    background: FAULT,
                  }}
                />
              </div>
              <div className="pvs-capacity__readout">
                <strong>
                  {measured
                    ? `${isReclaim ? reclaimPct : Math.round(host.peakPct as number)}%`
                    : "—"}
                </strong>
                {measured && (
                  <Text className="pvs-caption">
                    {isReclaim ? reclaimWord : usageWord}
                  </Text>
                )}
              </div>
              <span className="pvs-capacity__key">
                <span
                  className="pvs-swatch"
                  style={{ background: host.color }}
                  aria-hidden="true"
                />
                <Text>{host.classLabel}</Text>
              </span>
            </li>
          );
        })}
      </ul>

      {collapsible && (
        <div className="pvs-capacity__more">
          <Text className="pvs-caption">
            {t("c.capacity.showing", {
              shown: formatCount(hosts.length),
              total: formatCount(allHosts.length),
            })}
          </Text>
          <Button
            variant="default"
            size="condensed"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            <Button.Label>
              {expanded
                ? t("c.capacity.showFewer", { count: initialRows })
                : t("c.capacity.showAll", {
                    total: formatCount(allHosts.length),
                  })}
            </Button.Label>
          </Button>
        </div>
      )}

      <Text className="pvs-caption">{headroomHint}</Text>
    </div>
  );
};
