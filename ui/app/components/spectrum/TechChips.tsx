import React from 'react';

import { ProcessIcon } from '@dynatrace/strato-icons';

import { BrandGlyph } from './BrandGlyph';
import type { BrandGlyph as BrandGlyphName } from './brandGlyphs';
import type { SpectrumFamily } from './family';

/**
 * The official glyph for a technology type as auto-discovery reports it (`JAVA`, `NODE_JS`…),
 * or `null` when the gallery has none. Matched on the runtime itself: a framework that runs on
 * a runtime (Spring on Java) does not borrow the runtime's mark.
 */
export function techGlyph(type: string): BrandGlyphName | null {
  const name = type.toUpperCase();
  if (/^JAVA$|^JVM$/.test(name)) return 'java';
  if (/^NODE_?JS$|^NODEJS$/.test(name)) return 'nodejs';
  if (/^PYTHON/.test(name)) return 'python';
  if (/^DOTNET|^\.NET|^ASP_?NET|^CLR$/.test(name)) return 'dotnet';
  if (/KAFKA/.test(name)) return 'kafka';
  if (/OPEN_?TELEMETRY|^OTEL/.test(name)) return 'openTelemetry';
  // 3.2.3: more of the gallery, matched on the runtime or server itself.
  if (/^GO$|^GOLANG$/.test(name)) return 'go';
  if (/^PHP/.test(name)) return 'php';
  if (/^RUBY/.test(name)) return 'ruby';
  if (/TOMCAT/.test(name)) return 'tomcat';
  if (/JBOSS|WILDFLY/.test(name)) return 'jboss';
  if (/^NGINX/.test(name)) return 'nginx';
  if (/^APACHE_HTTP|^APACHE_WEB|^HTTPD$/.test(name)) return 'apacheHttp';
  if (/^IIS/.test(name)) return 'iis';
  if (/^ENVOY/.test(name)) return 'envoy';
  if (/^ISTIO/.test(name)) return 'istio';
  if (/RABBIT_?MQ/.test(name)) return 'rabbitmq';
  return null;
}

export interface TechChip {
  /** The technology type, verbatim as reported. */
  name: string;
  /** Formatted count of process instances. */
  display: string;
}

export interface TechChipsProps {
  items: readonly TechChip[];
  /** Accessible name of the list (already translated). */
  label: string;
  family?: SpectrumFamily;
}

/**
 * Technologies as a row of chips: the runtime's official glyph where the gallery has one, its
 * name as discovered, and how many process instances run it. A technology without a glyph gets
 * the functional process icon, never an invented logo.
 */
export const TechChips = ({ items, label, family = 'turquoise' }: TechChipsProps) => (
  <ul className="pvs-tech-chips" aria-label={label} data-spectrum={family} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
    {items.map((item, index) => {
      const glyph = techGlyph(item.name);
      return (
        // A type can repeat across versions in the source; the position keeps keys unique.
        <li key={`${item.name}-${index}`} className="pvs-tech-chip">
          {glyph === null ? <ProcessIcon size={18} aria-hidden="true" className="pvs-glyph" /> : <BrandGlyph name={glyph} size={18} />}
          <span>{item.name}</span>
          <span className="pvs-tech-chip__count">{item.display}</span>
        </li>
      );
    })}
  </ul>
);
