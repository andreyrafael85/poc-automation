/**
 * Generates docs/QUERY-CATALOG.md from queries/catalog.ts.
 *
 * The catalog is the single source of truth for what this app queries and what
 * each query cost. Generating the document means it cannot drift out of sync
 * with the code, which is the whole point of having a traceability register.
 *
 * Run with: node scripts/generate-query-catalog-doc.mjs
 */

import { build } from 'esbuild';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return 'not captured';
  if (bytes === 0) return '0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log10(Math.abs(bytes)) / 3), units.length - 1);
  const scaled = bytes / 1000 ** exponent;
  return `${scaled.toFixed(scaled >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const workDir = await mkdtemp(join(tmpdir(), 'catalog-doc-'));
const bundlePath = join(workDir, 'catalog.mjs');

try {
  await build({
    entryPoints: ['ui/app/queries/catalog.ts'],
    outfile: bundlePath,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });

  const { ALL_QUERIES } = await import(bundlePath);

  const byDomain = new Map();
  for (const entry of ALL_QUERIES) {
    if (!byDomain.has(entry.domain)) byDomain.set(entry.domain, []);
    byDomain.get(entry.domain).push(entry);
  }

  // Several problem queries share one recorded measurement, because they scan the
  // same 7-day problem history. Summing them would overstate the total, so the
  // distinct measurements are counted instead.
  const distinctScans = [
    ...new Set(
      ALL_QUERIES.map((entry) => entry.validation.scannedBytesOnDemand).filter(
        (bytes) => bytes !== null && bytes > 0,
      ),
    ),
  ];
  const totalScanned = distinctScans.reduce((total, bytes) => total + bytes, 0);
  const zeroCost = ALL_QUERIES.filter((entry) => entry.validation.scannedBytesOnDemand === 0);
  const notCaptured = ALL_QUERIES.filter((entry) => entry.validation.scannedBytesOnDemand === null);
  const denied = ALL_QUERIES.filter((entry) => entry.validation.outcome === 'no-permission');

  const lines = [
    '# Query catalog and validation record',
    '',
    '> **Generated file.** Produced from `ui/app/queries/catalog.ts` by',
    '> `scripts/generate-query-catalog-doc.mjs`. Do not edit by hand — regenerate it.',
    '',
    '## Summary',
    '',
    `- **${ALL_QUERIES.length} queries** across ${byDomain.size} domains`,
    `- **${zeroCost.length} queries scan zero Grail bytes** (entity model, bucket metadata and metric queries)`,
    `- **${formatBytes(totalScanned)}** across ${distinctScans.length} distinct scan measurement${distinctScans.length === 1 ? '' : 's'} — the four problem queries share a single measurement because they read the same 7-day history, so their figures are not additive`,
    `- **${notCaptured.length} queries** were executed and inspected, but their individual cost accounting was not captured — recorded as \`not captured\`, never as zero`,
    `- **${denied.length} queries** were refused for lack of a scope, and are retained deliberately so the gap is visible`,
    '',
    'Cost figures come from the platform\'s own `QUERY_EXECUTION_EVENT`',
    '(`scanned_bytes.on_demand`), not from an estimate made by this app.',
    '',
    '## Validation method',
    '',
    'Per query: executed against a real environment → result shape inspected →',
    'empty, error and permission states considered → cost recorded → purpose',
    'documented. No query was allowed to back a visualization before this ran.',
    '',
    '## Register',
    '',
    '| Query | Domain | Shape | Scope required | Window | Scan ceiling | Recorded scan | Duration | Rows | Outcome |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const entry of ALL_QUERIES) {
    const window = entry.timeframe === 'global' ? 'selector' : entry.timeframe.label;
    const ceiling =
      entry.guards?.scanLimitGbytes === undefined ? '—' : `${entry.guards.scanLimitGbytes} GB`;
    const duration = entry.validation.durationMs === null ? '—' : `${entry.validation.durationMs} ms`;
    lines.push(
      `| \`${entry.id}\` | ${entry.domain} | ${entry.shape} | \`${entry.requiredScope}\` | ${window} | ${ceiling} | ${formatBytes(entry.validation.scannedBytesOnDemand)} | ${duration} | ${entry.validation.records} | ${entry.validation.outcome} |`,
    );
  }

  lines.push('', '## Detail by domain', '');

  for (const [domain, entries] of [...byDomain.entries()].sort()) {
    lines.push(`### ${domain}`, '');
    for (const entry of entries) {
      const window = entry.timeframe === 'global' ? 'follows the app selector' : entry.timeframe.label;
      lines.push(
        `#### \`${entry.id}\``,
        '',
        `**Purpose.** ${entry.purpose}`,
        '',
        `**Shape.** ${entry.shape} · **Visualization.** ${entry.visualization} · **Window.** ${window}`,
        '',
        '```dql',
        entry.dql,
        '```',
        '',
        `**Validation.** ${entry.validation.validatedOn} in \`${entry.validation.environmentId}\` · ` +
          `${entry.validation.records} records · ${formatBytes(entry.validation.scannedBytesOnDemand)} scanned on demand · ` +
          `outcome \`${entry.validation.outcome}\``,
        '',
      );
      if (entry.validation.notes !== undefined) {
        lines.push(`**Notes.** ${entry.validation.notes}`, '');
      }
    }
  }

  lines.push(
    '## Queries deliberately rejected during validation',
    '',
    'Recorded because a rejected approach is evidence too.',
    '',
    '| Attempted | Why it was rejected |',
    '| --- | --- |',
    '| `fetch smartscape.nodes` / `fetch smartscape.edges` | Returns `DATA_OBJECT_NOT_SUPPORTED` for user DQL, even though internal platform services query these tables. This is why topology is tabular rather than a graph. |',
    '| `fetch metric.metadata` | Not a valid data object. Metric discovery uses `fetch metric.series` instead. |',
    '| `fetch dt.davis.problems \\| makeTimeseries count(), interval:6h` with a `status_transition` filter | Returned an almost entirely null series. Replaced with `summarize by:{bin(event.start, 6h)}`. |',
    '| `fetch dt.system.buckets \\| fields table` | The field is `dt.system.table`, not `table`. Confirmed with `describe`. |',
    '| `fetch dt.entity.host \\| fields hostGroup.name` | The field is `hostGroupName`. Confirmed with `describe`. |',
    '',
  );

  await writeFile('docs/QUERY-CATALOG.md', lines.join('\n'), 'utf8');
  const written = await readFile('docs/QUERY-CATALOG.md', 'utf8');
  console.info(
    `docs/QUERY-CATALOG.md written: ${ALL_QUERIES.length} queries, ${written.split('\n').length} lines`,
  );
} finally {
  await rm(workDir, { recursive: true, force: true });
}
