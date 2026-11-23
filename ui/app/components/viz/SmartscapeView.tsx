import React, { useState } from 'react';

import { Text } from '@dynatrace/strato-components/typography';

export interface SmartscapeNode {
  key: string;
  /** Entity/type/vendor name — never translated. */
  label: string;
  /** Pre-formatted count or detail (already localised). */
  detail?: string;
}

export interface SmartscapeTier {
  key: string;
  /** Already-translated tier label. */
  label: string;
  nodes: readonly SmartscapeNode[];
  /** Already-translated empty state for this tier. */
  emptyLabel: string;
}

interface SmartscapeViewProps {
  tiers: readonly SmartscapeTier[];
  ariaLabel: string;
  /** Already-translated hint shown above the diagram. */
  hint?: string;
}

/**
 * A layered dependency view — the estate read top-down in tiers.
 *
 * Each tier (services → technologies → data stores → external) is a labelled band
 * of nodes. Hovering or focusing a tier isolates it and dims the others, so an
 * audience can follow one layer of the stack at a time.
 *
 * The view is decoration over measured aggregates: it never invents an edge the
 * entity model did not report. v3.1 removes the rainbow of per-tier hues and the
 * neon spine — tiers are told apart by their text label and position, which is
 * the only thing that ever distinguished them — and the dimming is a CSS
 * transition that `prefers-reduced-motion` turns off.
 */
export const SmartscapeView = ({ tiers, ariaLabel, hint }: SmartscapeViewProps) => {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div>
      {hint !== undefined && <Text className="pvs-caption">{hint}</Text>}
      <ul className="pvs-tiers" aria-label={ariaLabel}>
        {tiers.map((tier) => (
          <li
            key={tier.key}
            className="pvs-tier"
            tabIndex={0}
            data-dimmed={active !== null && active !== tier.key ? 'true' : undefined}
            onMouseEnter={() => setActive(tier.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(tier.key)}
            onBlur={() => setActive(null)}
          >
            <p className="pvs-tier__name">{tier.label}</p>
            <div className="pvs-tier__nodes">
              {tier.nodes.length === 0 ? (
                <Text className="pvs-muted">{tier.emptyLabel}</Text>
              ) : (
                tier.nodes.map((node) => (
                  <div key={node.key} className="pvs-node">
                    <Text className="pvs-node__label">{node.label}</Text>
                    {node.detail !== undefined && <Text className="pvs-caption">{node.detail}</Text>}
                  </div>
                ))
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
