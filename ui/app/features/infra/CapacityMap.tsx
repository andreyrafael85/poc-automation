import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Text } from '@dynatrace/strato-components/typography';

import { StratoTicks } from '../../engine/strato/StratoTicks';
import type { CapacityClass } from '../../models/capacity';

/**
 * 3.7.3 (the owner: "o gráfico das capacidades e servidores está muito grande, consegue trazer uma nova ideia no estilo da
 * v6?"): capacity against usage as a map — the hosts grouped by their class (the ones that call for action first), each a
 * small card with its peak CPU and peak memory as segment bars on the same 0–100 scale and the readings as text. A class
 * shows its first cards and the rest behind "more"; the table below the map keeps every host.
 */
export interface CapacityMapHost {
  name: string;
  peakCpuPct: number | null;
  peakMemPct: number | null;
  classification: CapacityClass;
}

export interface CapacityMapWords {
  classLabel: (cls: CapacityClass) => string;
  cpu: string;
  memory: string;
  more: (count: number) => string;
  less: string;
  aria: string;
  /** A host's reading for assistive technology ("CPU 87 %, memory 64 %"). */
  reading: (cpu: string, memory: string) => string;
}

export const CAPACITY_MAP_ORDER: readonly CapacityClass[] = ['saturated', 'pressured', 'oversized', 'balanced', 'unknown'];
/** Cards a class shows before "more". */
export const CAPACITY_MAP_SHOWN = 8;

const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`);

/** The hosts of each class, busiest first (the emptiest first for over-provisioned ones), empty classes left out. */
export function capacityGroups(hosts: readonly CapacityMapHost[]): { cls: CapacityClass; hosts: CapacityMapHost[] }[] {
  const peak = (host: CapacityMapHost) => Math.max(host.peakCpuPct ?? -1, host.peakMemPct ?? -1);
  return CAPACITY_MAP_ORDER.map((cls) => {
    const members = hosts.filter((host) => host.classification === cls);
    members.sort((a, b) => (cls === 'oversized' ? peak(a) - peak(b) : peak(b) - peak(a)) || a.name.localeCompare(b.name));
    return { cls, hosts: members };
  }).filter((group) => group.hosts.length > 0);
}

const Gauge = ({ label, value, color }: { label: string; value: number | null; color: string }) => (
  <div className="pvs-capmap__gauge">
    <Text className="pvs-capmap__metric" aria-hidden="true">
      {label}
    </Text>
    <div aria-hidden="true">
      {value === null ? <span className="pvs-capmap__none">—</span> : <StratoTicks value={value} max={100} name={label} reading={pct(value)} ticks={12} color={color} />}
    </div>
    <Text className="pvs-capmap__value" aria-hidden="true">
      {pct(value)}
    </Text>
  </div>
);

const ClassGroup = ({ cls, hosts, color, words }: { cls: CapacityClass; hosts: CapacityMapHost[]; color: string; words: CapacityMapWords }) => {
  const [all, setAll] = useState(false);
  const shown = all ? hosts : hosts.slice(0, CAPACITY_MAP_SHOWN);
  const hidden = hosts.length - shown.length;
  return (
    <section className="pvs-capmap__group" data-class={cls}>
      <div className="pvs-capmap__head">
        <span className="pvs-capmap__dot" style={{ background: color }} aria-hidden="true" />
        <Text className="pvs-label">{words.classLabel(cls)}</Text>
        <Text className="pvs-capmap__count">{hosts.length}</Text>
      </div>
      <ul className="pvs-capmap__grid">
        {shown.map((host) => (
          <li key={host.name} className="pvs-capmap__card" style={{ '--pvs-capmap-edge': color } as React.CSSProperties}>
            <Text className="pvs-capmap__name" title={host.name}>
              {host.name}
            </Text>
            <span className="pvs-sr-only">{words.reading(pct(host.peakCpuPct), pct(host.peakMemPct))}</span>
            <Gauge label={words.cpu} value={host.peakCpuPct} color={color} />
            <Gauge label={words.memory} value={host.peakMemPct} color={color} />
          </li>
        ))}
      </ul>
      {(hidden > 0 || all) && hosts.length > CAPACITY_MAP_SHOWN && (
        <Button variant="default" size="condensed" onClick={() => setAll(!all)}>
          {all ? words.less : words.more(hidden)}
        </Button>
      )}
    </section>
  );
};

export const CapacityMap = ({ hosts, colors, words }: { hosts: readonly CapacityMapHost[]; colors: Record<CapacityClass, string>; words: CapacityMapWords }) => {
  const groups = capacityGroups(hosts);
  if (groups.length === 0) return null;
  return (
    <div className="pvs-capmap" role="group" aria-label={words.aria} data-pvs-chart="capacity-map">
      {groups.map((group) => (
        <ClassGroup key={group.cls} cls={group.cls} hosts={group.hosts} color={colors[group.cls]} words={words} />
      ))}
    </div>
  );
};
