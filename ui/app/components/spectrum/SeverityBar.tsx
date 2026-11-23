import React from 'react';

/** Strato's security risk levels (`--dt-colors-charts-security-risk-level-*`). */
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface SeveritySegment {
  level: RiskLevel;
  count: number;
  /** The level's word (already translated). */
  label: string;
  /** The count, formatted for the locale. */
  display: string;
}

export interface SeverityBarProps {
  segments: readonly SeveritySegment[];
  /** What the bar shows (already translated); the counts are appended for assistive technology. */
  label: string;
}

/**
 * One segmented bar of the severity mix, worst on the left, in the platform's security risk
 * colours with a gradient along each segment (3.2 "Value Spectrum", wave 3).
 *
 * The bar is never the only carrier: it announces every level and its count, and the page
 * prints a legend with each level's icon, word, count and share beside it. A level with no
 * vulnerabilities takes no width; the bar is not drawn at all when there are none.
 */
export const SeverityBar = ({ segments, label }: SeverityBarProps) => {
  const shown = segments.filter((segment) => segment.count > 0);
  if (shown.length === 0) return null;
  const spoken = shown.map((segment) => `${segment.label} ${segment.display}`).join(', ');
  return (
    <div className="pvs-sev__bar" role="img" aria-label={`${label}: ${spoken}`}>
      {shown.map((segment) => (
        <div
          key={segment.level}
          className="pvs-sev__seg"
          data-risk={segment.level}
          title={`${segment.label}: ${segment.display}`}
          // The share of the bar is the share of the count; a sliver keeps its minimum width.
          style={{ flex: `${segment.count} 1 0` }}
        />
      ))}
    </div>
  );
};
