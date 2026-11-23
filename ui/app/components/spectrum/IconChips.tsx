import React from 'react';

import type { SpectrumFamily } from './family';

export interface IconChip {
  key: string;
  /** The name, verbatim as reported (a type, a vendor, a domain). */
  name: string;
  /** Formatted count, printed after the name. */
  display?: string;
  /** A 18 px glyph or functional icon. Decorative: the name says what it is. */
  icon: React.ReactNode;
  /** Opens the item's page in the platform, in a new tab (3.2.7). */
  href?: string;
}

export interface IconChipsProps {
  items: readonly IconChip[];
  /** Accessible name of the list (already translated). */
  label: string;
  family?: SpectrumFamily;
}

/**
 * A row of chips, each an icon, a name and a count (3.2.3): `TechChips` for any kind of item —
 * service types, database vendors, public domains — so every composition on Topology reads the
 * same way. The icon is the official glyph where the gallery has one and the functional icon of
 * the kind otherwise.
 */
export const IconChips = ({ items, label, family = 'turquoise' }: IconChipsProps) => (
  <ul className="pvs-tech-chips" aria-label={label} data-spectrum={family} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
    {items.map((item) => (
      <li key={item.key} className="pvs-tech-chip">
        <span className="pvs-glyph" aria-hidden="true">
          {item.icon}
        </span>
        {/* 3.3.0 (§17-c): a chip row scrolls sideways and a long name (a service, a public domain)
            can end up half off-screen, so the whole name stays reachable on hover and to assistive
            technology. */}
        {item.href === undefined ? (
          <span title={item.name}>{item.name}</span>
        ) : (
          <a className="pvs-tech-chip__link" title={item.name} href={item.href} target="_blank" rel="noopener noreferrer">
            {item.name}
          </a>
        )}
        {item.display !== undefined && <span className="pvs-tech-chip__count">{item.display}</span>}
      </li>
    ))}
  </ul>
);
