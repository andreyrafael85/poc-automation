/**
 * What an audience may be told.
 *
 * Insights about how the customer is billed (query scan, licensed capabilities, expansion) are a
 * commercial conversation for the Sales Engineer, not part of what a customer is shown in the app
 * or in a report. They are dropped here, in one place, unless commercial data is switched on.
 */

/** Insight categories that carry licensing or billing framing. */
const COMMERCIAL_CATEGORIES: ReadonlySet<string> = new Set(['consumption']);

export function forAudience<T extends { category: string }>(insights: readonly T[], commercial: boolean): T[] {
  return insights.filter((insight) => commercial || !COMMERCIAL_CATEGORIES.has(insight.category));
}

/** Scorecard rows framed around licences and expansion. */
export const COMMERCIAL_SCORECARD_ROWS: ReadonlySet<string> = new Set(['consumption-sustainability', 'expansion-readiness']);
