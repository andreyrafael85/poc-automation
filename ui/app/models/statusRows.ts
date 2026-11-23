import type { GrailRecord } from '../utils/records';
import { num, str } from '../utils/records';

/**
 * 3.6.4 — the status rows of Dynatrace Intelligence (v6), as data. Pure.
 *
 * One row per problem category, one bar per 3-hour slot of the window, from `prob.status.rows` (problems by category and
 * the slot each began in — grouped, no limit, so the rows may be added up). A slot before the window (a problem still
 * open that began earlier) is not drawn; it still counts in "open now", which is every open problem of the category.
 */

export const SLOT_HOURS = 3;
const SLOT_MS = SLOT_HOURS * 3_600_000;

export interface StatusRow {
  category: string;
  /** Problems that began in each slot of the window, oldest first. */
  slots: number[];
  /** Problems that began in the window. */
  inWindow: number;
  /** Still open now, whenever they began. */
  open: number;
  /** The busiest slot's count, for the bars' scale. */
  peak: number;
}

export interface StatusRowsModel {
  rows: StatusRow[];
  /** Start of each slot (ISO), oldest first. */
  slotStarts: string[];
  /** Problems still open that began before the window (counted in "open", not drawn). */
  openBefore: number;
}

export function statusRows(records: readonly GrailRecord[], windowEndIso: string, days = 7): StatusRowsModel | null {
  const end = Date.parse(windowEndIso);
  if (!Number.isFinite(end)) return null;
  const lastSlot = Math.floor(end / SLOT_MS) * SLOT_MS;
  const count = Math.round((days * 24) / SLOT_HOURS);
  const firstSlot = lastSlot - (count - 1) * SLOT_MS;
  const byCategory = new Map<string, StatusRow>();
  let openBefore = 0;
  for (const record of records) {
    const category = str(record, 'category');
    const slotIso = str(record, 'slot');
    const problems = num(record, 'problems');
    if (category === null || slotIso === null || problems === null) continue;
    const at = Date.parse(slotIso);
    if (!Number.isFinite(at)) continue;
    const row = byCategory.get(category) ?? { category, slots: Array.from({ length: count }, () => 0), inWindow: 0, open: 0, peak: 0 };
    const open = num(record, 'open') ?? 0;
    row.open += open;
    const index = Math.round((Math.floor(at / SLOT_MS) * SLOT_MS - firstSlot) / SLOT_MS);
    if (index >= 0 && index < count) {
      row.slots[index] = (row.slots[index] ?? 0) + problems;
      row.inWindow += problems;
      row.peak = Math.max(row.peak, row.slots[index] ?? 0);
    } else if (index < 0) {
      openBefore += open;
    }
    byCategory.set(category, row);
  }
  const rows = [...byCategory.values()].filter((row) => row.inWindow > 0 || row.open > 0).sort((a, b) => b.inWindow - a.inWindow);
  if (rows.length === 0) return null;
  return {
    rows,
    slotStarts: Array.from({ length: count }, (_, index) => new Date(firstSlot + index * SLOT_MS).toISOString()),
    openBefore,
  };
}
