import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { Figure, Panel } from '../engine';
import { useTranslation } from '../i18n/useTranslation';
import { isUnavailable, type Fact } from '../models/provenance';
import { ProvenanceBadge } from './ProvenanceBadge';

/**
 * A category of measurements presented as one card.
 *
 * Layout, in reading order:
 *
 *   Category                          secondary rate, right-aligned
 *   ─────────────────────────────────────────────────────────────
 *   1.7k        85%        0.86
 *   sessions    error-free  apdex
 *
 *   One sentence saying what this means.
 *
 * Grouping related figures into one card and letting the numbers carry the
 * weight is far more scannable than a grid of equal tiles.
 *
 * Every figure is still a `Fact`, so an unavailable value renders its reason
 * rather than a zero — the card is a presentation change, not an escape from the
 * provenance rule. `tone` draws one accent edge for a *measured condition* on the
 * card; it never tints the card.
 */

export type CardTone = 'neutral' | 'primary' | 'success' | 'warning' | 'critical';

export interface CardFigure {
  /** Pre-formatted value. Large text. */
  display: string;
  /** Small caption beneath the value. */
  label: string;
  fact: Fact<number | string | null>;
  /** Draws attention to this figure specifically. */
  tone?: CardTone;
}

export interface MetricCardProps {
  /** Short category name, e.g. "User experience". */
  category: string;
  tone?: CardTone;
  /** Optional icon rendered before the category. */
  icon?: React.ReactNode;
  /** Right-aligned secondary figure, e.g. a rate. */
  secondary?: { display: string; label: string };
  figures: CardFigure[];
  /** One sentence of interpretation. Optional, but strongly encouraged. */
  interpretation?: string;
  /** Rendered at the foot of the card, e.g. a drill-down link. */
  footer?: React.ReactNode;
}

export const MetricCard = ({
  category,
  tone = 'neutral',
  icon,
  secondary,
  figures,
  interpretation,
  footer,
}: MetricCardProps) => {
  const { t } = useTranslation();

  return (
    <Panel rail={tone !== 'neutral'} railTone={tone} pad="roomy">
      <div className="pvs-stack">
        <div className="pvs-cluster" style={{ '--pvs-justify': 'space-between' } as React.CSSProperties}>
          <div className="pvs-cluster">
            {icon}
            <Text className="pvs-label">{category}</Text>
          </div>
          {secondary !== undefined && (
            <div className="pvs-stack" style={{ '--pvs-gap': '0px', alignItems: 'flex-end' } as React.CSSProperties}>
              <Text>{secondary.display}</Text>
              <Text className="pvs-caption">{secondary.label}</Text>
            </div>
          )}
        </div>

        <div className="pvs-cluster" style={{ '--pvs-gap': 'var(--pvs-gap-section)', '--pvs-align': 'flex-start' } as React.CSSProperties}>
          {figures.map((figure) => {
            const unavailable = isUnavailable(figure.fact);
            return (
              <div key={figure.label} className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-4)' } as React.CSSProperties}>
                <div className="pvs-cluster">
                  <Figure
                    value={figure.display}
                    size="md"
                    tone={figure.tone}
                    missing={unavailable}
                    missingLabel={t('c.tile.notMeasuredInline')}
                  />
                  <ProvenanceBadge
                    provenance={figure.fact.provenance}
                    confidence={figure.fact.confidence}
                    evidence={figure.fact.evidence}
                    note={figure.fact.note}
                  />
                </div>
                <Text className="pvs-caption">{figure.label}</Text>
                {unavailable && <Text className="pvs-caption">{t('c.tile.notMeasuredInline')}</Text>}
              </div>
            );
          })}
        </div>

        {interpretation !== undefined && <Text className="pvs-prose">{interpretation}</Text>}
        {footer}
      </div>
    </Panel>
  );
};
