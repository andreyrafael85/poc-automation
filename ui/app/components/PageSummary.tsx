import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { type Tone } from '../design/palette';
import {
  AnalyticsIcon,
  ApplicationsIcon,
  ContainerIcon,
  DatabaseIcon,
  HostsIcon,
  IdeaIcon,
  LogsIcon,
  ProcessIcon,
  SecurityIcon,
  ServicesIcon,
  StopwatchIcon,
  TargetNodeIcon,
  TechnologiesIcon,
  WarningIcon,
  WorkflowIcon,
} from '@dynatrace/strato-icons';

import { StratoKpi, StratoKpiRow } from '../engine/strato';
import { isUnavailable, type Fact } from '../models/provenance';

/**
 * The headline band at the top of a domain page.
 *
 * Every page used to open with a paragraph and then a table, so answering "how
 * many services are there, and how many are failing?" meant reading a table and
 * doing arithmetic. An SRE or a manager landing on a page wants the totals first
 * and the detail second.
 *
 * One band rather than a row of cards is deliberate. Separate cards read as
 * separate findings; a single band reads as one sentence about the page, which is
 * what it is. It also gives every page the same opening shape, so moving between
 * them feels like one app.
 *
 * Every figure is still a `Fact`, so a value that was not measured renders a dash
 * and its reason rather than a zero, and its cell is drawn with a dashed rule.
 *
 * 3.2.1 ("Value Spectrum"): the band carries a spectrum edge and each figure is painted
 * with a family of its own, so every domain page opens with the same presence as the
 * Overview. A figure the caller tones (a measured condition) keeps its tone instead.
 */

export interface SummaryItem {
  key: string;
  label: string;
  fact: Fact<number | string | null>;
  /** Pre-formatted value. Falls back to the raw one. */
  display?: string;
  /** Small line under the figure: a denominator, a share, a peak. */
  detail?: string;
  /**
   * Accent for this figure alone. Use sparingly — a band where everything is
   * coloured says nothing. Default is neutral.
   */
  tone?: Tone;
}

export interface PageSummaryProps {
  items: SummaryItem[];
  /** Overall accent of the band. Informational by default. */
  tone?: Tone;
  /** Rendered under the figures, e.g. a caveat about the window. */
  footnote?: string;
}

export const DENSE_FROM = 6;

/**
 * 3.5.2 (owner: "os números ficaram monótonos, sem vida"): each figure of a band gets the platform's functional icon
 * for what it counts, read from its key — a decoration beside the label, never a reading.
 */
const ICON_BY_KEYWORD: readonly [RegExp, React.ReactNode][] = [
  [/vuln|secur|exploit|cve/i, <SecurityIcon key="security" />],
  [/finding|critical|fail|error|warn|attention|oom|restart/i, <WarningIcon key="warning" />],
  [/host|node|vm/i, <HostsIcon key="hosts" />],
  [/service|request|trace|span/i, <ServicesIcon key="services" />],
  [/web|app|frontend|user|session|rum/i, <ApplicationsIcon key="apps" />],
  [/k8s|kube|cluster|workload|pod|namespace|container/i, <ContainerIcon key="containers" />],
  [/synthetic|latency|response|duration|mttr|resolve|time/i, <StopwatchIcon key="time" />],
  [/log|bucket|record|ingest|quer/i, <LogsIcon key="logs" />],
  [/workflow|automat|execution|run/i, <WorkflowIcon key="workflows" />],
  [/tech|process|version/i, <TechnologiesIcon key="tech" />],
  [/memory|cpu|disk|storage|capacity|saturat|oversiz|used|reclaim/i, <DatabaseIcon key="capacity" />],
  [/coverage|maturity|capabilit|sre|index|adoption/i, <TargetNodeIcon key="coverage" />],
  [/cost|spend|saving|value|roi|licen|consum/i, <IdeaIcon key="value" />],
  [/proc/i, <ProcessIcon key="proc" />],
];

export const summaryIcon = (key: string): React.ReactNode => ICON_BY_KEYWORD.find(([pattern]) => pattern.test(key))?.[1] ?? <AnalyticsIcon />;

/**
 * 3.5.0 (Strato native, wave 2; D-03): the band is a row of the app's one KPI anatomy — the platform's SingleValue
 * with its label, a line of detail and the evidence badge — instead of the 3.2 band with a spectrum edge. Numbers in
 * neutral ink (the tone that used to paint a figure is a reading the detail line says in words); an unavailable fact
 * draws a dash and its reason, never a zero.
 */
export const PageSummary = ({ items, footnote }: PageSummaryProps) => {
  if (items.length === 0) return null;

  return (
    <div className="pvs-summary-band" data-dense={items.length >= DENSE_FROM ? 'true' : undefined}>
      <StratoKpiRow className="pvs-summary" min={items.length >= DENSE_FROM ? 150 : 190} valueCap={items.length >= DENSE_FROM ? 28 : 32}>
        {items.map((item) => (
          <StratoKpi
            key={item.key}
            className="pvs-summary__cell"
            testId={`summary-${item.key}`}
            label={item.label}
            badge={summaryIcon(item.key)}
            fact={item.fact}
            value={isUnavailable(item.fact) ? null : (item.display ?? (item.fact.value === null ? null : item.fact.value))}
            unit={item.fact.unit}
            caption={item.detail}
          />
        ))}
      </StratoKpiRow>
      {footnote !== undefined && <Text className="pvs-caption">{footnote}</Text>}
    </div>
  );
};
