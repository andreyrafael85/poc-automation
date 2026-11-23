/**
 * Ordering of the key discoveries.
 *
 * Measured findings rank by severity. A card that says "this review could not read a
 * source" (`gap`) is a limitation of the review, not a measured fault, so it must never
 * outrank one — 2.x ranked it "critical", which put "security not readable" above a
 * measured workload crash-looping 2,000 times. It is still never dropped: a limit the
 * audience should know about stays on the list even when measured findings fill it.
 */

export type DiscoverySeverity = 'critical' | 'warning' | 'positive';

export interface Rankable {
  severity: DiscoverySeverity;
  /** Set when the card states a limitation of this review rather than a measurement. */
  gap?: unknown;
}

const SEVERITY_ORDER: Record<DiscoverySeverity, number> = { critical: 0, warning: 1, positive: 2 };

/** Measured findings by severity; limitations after all of them, in their own order. */
function rank(item: Rankable): number {
  return item.gap === undefined ? SEVERITY_ORDER[item.severity] : 1.5 + SEVERITY_ORDER[item.severity] / 10;
}

export function rankDiscoveries<T extends Rankable>(items: readonly T[], limit = 6): T[] {
  const sorted = [...items].sort((a, b) => rank(a) - rank(b));
  const kept = sorted.slice(0, limit);
  // A limitation that did not fit replaces the weakest measured card, never silently disappears.
  for (const dropped of sorted.slice(limit).filter((item) => item.gap !== undefined)) {
    if (kept.filter((item) => item.gap !== undefined).length >= limit) break;
    const weakestMeasured = [...kept.keys()].reverse().find((index) => kept[index]?.gap === undefined);
    if (weakestMeasured === undefined) break;
    kept.splice(weakestMeasured, 1);
    kept.push(dropped);
  }
  return kept;
}
