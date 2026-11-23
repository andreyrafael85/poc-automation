import { num, str, type GrailRecord } from '../utils/records';

/**
 * Where the problem hours went (3.2.6; 3.2.7 without the mosaic): per Davis category, the hours the
 * closed problems were open, their share, how many there were and their mean time to resolve — read
 * from `prob.mttx`. Hours only, never money.
 */

const NS_PER_HOUR = 3_600_000_000_000;

export interface CategoryHours {
  category: string;
  hours: number;
  /** Share of all the hours, 0–100. */
  share: number;
  problems: number | null;
  /** Mean time to resolve of the category, hours. */
  mttrHours: number | null;
}

export function problemHours(records: readonly GrailRecord[]): CategoryHours[] {
  const rows = records
    .map((record) => {
      const totalNs = num(record, 'totalNs') ?? 0;
      const problems = num(record, 'problems');
      const mttrNs = num(record, 'mttrNs');
      return {
        category: str(record, 'event.category') ?? '—',
        hours: totalNs / NS_PER_HOUR,
        problems,
        mttrHours: mttrNs === null ? (problems !== null && problems > 0 ? totalNs / problems / NS_PER_HOUR : null) : mttrNs / NS_PER_HOUR,
      };
    })
    .filter((row) => row.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  const total = rows.reduce((sum, row) => sum + row.hours, 0);
  if (total <= 0) return [];
  return rows.map((row) => ({ ...row, share: (row.hours / total) * 100 }));
}
