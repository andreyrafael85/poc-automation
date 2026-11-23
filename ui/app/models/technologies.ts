import { isDynatraceTechnology, num, parseTechnology, str, type GrailRecord } from '../utils/records';

/**
 * The technologies of the estate (`proc.technologies`), shaped once (3.3.2): the Processes &
 * technologies page draws them, and the Tech Wrapup photographs the very same chart and chips, so
 * a slide can never show a ranking the page does not.
 */

export interface TechnologyRow extends GrailRecord {
  technology: string;
  edition: string;
  version: string;
  instances: number | null;
}

/** One row per technology version, Dynatrace's own agent left out (it is not part of the estate). */
export const toTechnologyRows = (records: GrailRecord[]): TechnologyRow[] =>
  records
    .map((record) => {
      const parsed = parseTechnology(str(record, 'softwareTechnologies'));
      return {
        ...record,
        technology: parsed?.type ?? 'Not reported',
        edition: parsed?.edition ?? 'Not reported',
        // "Version not reported" is a real observation about detection depth.
        version: parsed?.version ?? 'Version not reported',
        instances: num(record, 'instances'),
      };
    })
    .filter((row) => !isDynatraceTechnology(row.technology));

/** The rows ranked by instances, most first. */
export const rankTechnologies = (rows: readonly TechnologyRow[]): TechnologyRow[] =>
  [...rows].sort((a, b) => (b.instances ?? 0) - (a.instances ?? 0));

/** The bars of the page's chart: the busiest technology versions, up to 12. */
export const technologyBars = (rows: readonly TechnologyRow[]): { name: string; value: number }[] =>
  rankTechnologies(rows)
    .filter((row) => row.technology !== 'Not reported')
    .slice(0, 12)
    .map((row) => ({ name: row.technology, value: row.instances ?? 0 }));

/**
 * One chip per technology, its versions together, up to 16. Instances per technology are summed
 * over that technology's version rows only, so an instance is never counted under two names.
 */
export const technologyChips = (rows: readonly TechnologyRow[]): { name: string; count: number }[] => {
  const perTechnology = new Map<string, number>();
  for (const row of rows) {
    if (row.technology === 'Not reported') continue;
    perTechnology.set(row.technology, (perTechnology.get(row.technology) ?? 0) + (row.instances ?? 0));
  }
  return [...perTechnology.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([name, count]) => ({ name, count }));
};
