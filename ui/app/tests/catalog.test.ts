import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ALL_QUERIES, getQuery } from '../queries/catalog';
import { placeholdersOf } from '../queries/params';
import {
  analyzeQuery,
  resolveMessage,
  type Message,
  type Observation,
} from '../features/advisor/analyzeQuery';
import { ALL_KEYS, LOCALES, entryFor, translate, type Locale, type StringKey } from '../i18n/strings';
import { activeLocaleTag, setActiveLocaleTag } from '../utils/activeLocale';

/**
 * Structural guarantees over the DQL catalog.
 *
 * These are the acceptance criteria of this app expressed as tests: no query
 * without a recorded validation, no unbounded scan on an expensive table, no DQL
 * built by string interpolation, and no timeframe smuggled into query text.
 */

/**
 * The pipelines of a query: the top level (with every bracketed subquery folded to `[]`) and, in
 * turn, each subquery of an `append`, `lookup` or `join`. A sort before an aggregation is judged
 * within one pipeline: the top-level list of `ev.topology.hubs` sorts and limits, and its appended
 * totals row summarises on its own (TD-08).
 */
function pipelines(dql: string): string[] {
  const out: string[] = [];
  let top = '';
  let depth = 0;
  let current = '';
  for (const char of dql) {
    if (char === '[') {
      depth += 1;
      if (depth === 1) {
        current = '';
        top += '[';
        continue;
      }
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        out.push(...pipelines(current));
        top += ']';
        continue;
      }
    }
    if (depth === 0) top += char;
    else current += char;
  }
  return [top, ...out];
}

describe('catalog integrity', () => {
  it('is not empty', () => {
    expect(ALL_QUERIES.length).toBeGreaterThan(0);
  });

  it('gives every query a unique id matching its key', () => {
    const ids = ALL_QUERIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of ALL_QUERIES) {
      expect(getQuery(entry.id as Parameters<typeof getQuery>[0]).id).toBe(entry.id);
    }
  });

  it('records a validation against a real environment for every query', () => {
    for (const entry of ALL_QUERIES) {
      expect(entry.validation.environmentId, entry.id).toBeTruthy();
      expect(entry.validation.validatedOn, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['ok', 'empty', 'no-permission'], entry.id).toContain(entry.validation.outcome);
    }
  });

  it('states a required scope for every query, so the no-permission state is actionable', () => {
    for (const entry of ALL_QUERIES) {
      expect(entry.requiredScope, entry.id).toMatch(/^storage:/);
    }
  });

  it('states a purpose for every query', () => {
    for (const entry of ALL_QUERIES) {
      expect(entry.purpose.length, entry.id).toBeGreaterThan(20);
    }
  });
});

describe('cost discipline', () => {
  /** Tables where an unbounded scan is a real risk rather than a theoretical one. */
  const expensiveTables = ['logs', 'spans', 'bizevents', 'security.events', 'user.sessions'];

  it('caps the scan on every query that reads an expensive table', () => {
    for (const entry of ALL_QUERIES) {
      const readsExpensive = expensiveTables.some((table) =>
        new RegExp(`fetch\\s+${table.replace('.', '\\.')}\\b`).test(entry.dql),
      );
      if (readsExpensive) {
        expect(entry.guards?.scanLimitGbytes, `${entry.id} reads an expensive table`).toBeGreaterThan(0);
      }
    }
  });

  it('reads the logs table only in a short pinned window under a tight scan ceiling', () => {
    // 3.2.3 (C12): until 3.2.2 every logs query named `default_logs`, and a customer that routes
    // logs to buckets of its own (OpenPipeline) got undercounts and wrong findings — the
    // validation tenant showed 0 % of logs with a Kubernetes namespace on default_logs and 14 %
    // over all its buckets. A query now either names its buckets or reads every readable one,
    // and then it must be cheap by construction: pinned to 6 hours or less and capped at 10 GB.
    const hours: Record<string, number> = { 'now-30m': 0.5, 'now-6h': 6 };
    // 3.6.8: the one exception, by the owner's choice of 2026-11-22 ("Sempre no período"): the Logs console counts its
    // errors over the selected window. Measured on the lab at 1.72 GiB for 24 hours; its own ceiling is 20 GiB (a week).
    const OWNER_WINDOWED = new Map([['log.errors.grouped', 20]]);
    for (const entry of ALL_QUERIES) {
      if (!/fetch\s+logs\b/.test(entry.dql) || /bucket\s*:/.test(entry.dql)) continue;
      const ceiling = OWNER_WINDOWED.get(entry.id);
      if (ceiling !== undefined) {
        expect(entry.timeframe).toBe('global');
        expect(entry.guards?.scanLimitGbytes).toBe(ceiling);
        continue;
      }
      expect(entry.guards?.scanLimitGbytes ?? Infinity, `${entry.id}: scan ceiling`).toBeLessThanOrEqual(10);
      // TD-08: a window set by the reading screen counts when the catalog caps it at 6 hours.
      const pinned =
        entry.timeframe === 'global' || 'anchor' in entry.timeframe
          ? undefined
          : 'caller' in entry.timeframe
            ? entry.timeframe.maxMs <= 6 * 3_600_000
              ? entry.timeframe.maxMs / 3_600_000
              : undefined
            : hours[entry.timeframe.relative];
      expect(pinned, `${entry.id}: a logs query over every bucket needs a pinned window of 6 hours or less`).toBeDefined();
    }
  });

  it('declares in app.config.json every scope the catalog needs, and no storage scope it never uses', () => {
    // 3.2.0 ran smartscapeNodes without storage:smartscape:read (the platform refuses it) and
    // declared storage:spans:read, which no query used. Both drift silently without this check.
    let dir = __dirname;
    while (!existsSync(join(dir, 'app.config.json'))) {
      const parent = join(dir, '..');
      if (parent === dir) throw new Error('app.config.json not found');
      dir = parent;
    }
    const config = JSON.parse(readFileSync(join(dir, 'app.config.json'), 'utf8')) as {
      app: { scopes: { name: string }[] };
    };
    const declared = new Set(config.app.scopes.map((scope) => scope.name));
    const required = new Set(ALL_QUERIES.map((entry) => entry.requiredScope));
    for (const scope of required) expect(declared, scope).toContain(scope);
    // TD-08 (3.3.2): the incident's logs, the trail and the print evidence are catalog entries now,
    // so every storage scope the app reads is a catalog scope.
    const unused = [...declared].filter((scope) => scope.startsWith('storage:') && !required.has(scope));
    expect(unused).toEqual([]);
    for (const entry of ALL_QUERIES) {
      if (/\bsmartscape(Nodes|Edges)\b/.test(entry.dql)) {
        expect(entry.requiredScope, entry.id).toBe('storage:smartscape:read');
      }
    }
  });

  it('excludes Davis duplicates from every problem query', () => {
    // A merged problem stays in dt.davis.problems flagged as a duplicate. Counting it inflated the
    // problem totals, the closed share, the MTTR percentiles and the open problem-hours (3.2.1).
    for (const entry of ALL_QUERIES) {
      // The templates read problems in inline subqueries too; the next test checks each of their reads.
      if (entry.params === undefined && /fetch\s+dt\.davis\.problems\b/.test(entry.dql)) {
        expect(entry.dql, `${entry.id} must filter dt.davis.is_duplicate`).toMatch(
          /fetch\s+dt\.davis\.problems\s*\n\|\s*filter not\(?\s*dt\.davis\.is_duplicate/,
        );
      }
    }
  });

  it('excludes Davis duplicates on every problem read of a template, subqueries included (TD-08)', () => {
    // A template reads the problem table in an inline subquery too (`ev.problem.events`): each read
    // must filter the duplicates right after its fetch, wherever it stands.
    let checked = 0;
    for (const entry of ALL_QUERIES) {
      if (entry.params === undefined) continue;
      for (const match of entry.dql.matchAll(/fetch\s+dt\.davis\.problems\b/g)) {
        checked += 1;
        const after = entry.dql.slice((match.index ?? 0) + match[0].length);
        expect(after, `${entry.id} reads problems without the duplicate filter`).toMatch(/^\s*\|\s*filter not\(?\s*dt\.davis\.is_duplicate/);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(5);
  });

  it('sorts only after aggregating, within each pipeline', () => {
    for (const entry of ALL_QUERIES) {
      for (const pipeline of pipelines(entry.dql)) {
        const sort = pipeline.lastIndexOf('| sort');
        const aggregate = pipeline.search(/\|\s*(summarize|makeTimeseries)/);
        if (sort !== -1 && aggregate !== -1) {
          expect(sort, `${entry.id} sorts before aggregating`).toBeGreaterThan(aggregate);
        }
      }
    }
  });

  it('never truncates with limit before aggregating, which would change the aggregate', () => {
    for (const entry of ALL_QUERIES) {
      for (const pipeline of pipelines(entry.dql)) {
        const limit = pipeline.indexOf('| limit');
        const aggregate = pipeline.search(/\|\s*(summarize|makeTimeseries)/);
        if (limit !== -1 && aggregate !== -1) {
          expect(limit, `${entry.id} limits before aggregating`).toBeGreaterThan(aggregate);
        }
      }
    }
  });

  it('splits a query into its pipelines for the two checks above', () => {
    expect(pipelines('fetch a\n| sort x\n| limit 5\n| append [fetch b | summarize n = count()]')).toEqual([
      'fetch a\n| sort x\n| limit 5\n| append []',
      'fetch b | summarize n = count()',
    ]);
    expect(pipelines('fetch a | lookup [fetch b | fields c[d]], sourceField: x')).toEqual(['fetch a | lookup [], sourceField: x', 'fetch b | fields c[]', 'd']);
  });
});

describe('parameter safety', () => {
  it('contains no template interpolation, so no user input can reach DQL text', () => {
    for (const entry of ALL_QUERIES) {
      expect(entry.dql, `${entry.id} interpolates a value`).not.toMatch(/\$\{/);
    }
  });

  it('uses {{placeholders}} only in parameterised entries, each one declared and used (TD-08)', () => {
    for (const entry of ALL_QUERIES) {
      const used = placeholdersOf(entry.dql).sort();
      const declared = Object.keys(entry.params ?? {}).sort();
      expect(used, `${entry.id}: placeholders vs declared parameters`).toEqual(declared);
      // Nothing that looks like a placeholder but is not one (a typo would reach Grail verbatim).
      expect(entry.dql.replace(/\{\{[A-Za-z][A-Za-z0-9]*\}\}/g, ''), entry.id).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('takes the caller\'s window, capped, for every parameterised entry, and bounds every list (TD-08)', () => {
    for (const entry of ALL_QUERIES) {
      if (entry.params === undefined) continue;
      expect(entry.timeframe !== 'global' && 'caller' in entry.timeframe, `${entry.id}: caller window`).toBe(true);
      if (entry.timeframe !== 'global' && 'caller' in entry.timeframe) expect(entry.timeframe.maxMs, entry.id).toBeGreaterThan(0);
      expect(entry.guards?.scanLimitGbytes, `${entry.id}: scan ceiling`).toBeGreaterThan(0);
      expect(entry.guards?.maxResultRecords, `${entry.id}: row ceiling`).toBeGreaterThan(0);
      for (const [name, spec] of Object.entries(entry.params)) {
        expect(spec.description.length, `${entry.id}.${name}`).toBeGreaterThan(10);
        if (spec.kind === 'entityIdList') {
          expect(spec.minItems, `${entry.id}.${name}`).toBeGreaterThanOrEqual(1);
          expect(spec.maxItems, `${entry.id}.${name}`).toBeLessThanOrEqual(500);
        }
      }
    }
  });

  it('never embeds a timeframe in the query text, which would override the request window', () => {
    for (const entry of ALL_QUERIES) {
      expect(entry.dql, `${entry.id} embeds a timeframe`).not.toMatch(/\bfrom\s*:\s*-\d/);
      expect(entry.dql, `${entry.id} embeds a timeframe`).not.toMatch(/\bnow\s*-\s*\d/);
    }
  });

  it('declares scan limits as request guards rather than inside the query text', () => {
    for (const entry of ALL_QUERIES) {
      expect(entry.dql, `${entry.id} inlines scanLimitGBytes`).not.toContain('scanLimitGBytes');
    }
  });
});

/** The practice an observation checks, by its English name. Observations carry keys, not prose. */
const checkName = (observation: Observation) => translate(observation.check, 'en');

describe('advisor', () => {
  it('produces at least one observation for every query', () => {
    for (const entry of ALL_QUERIES) {
      expect(analyzeQuery(entry).observations.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('recognises entity queries as costing no scanned bytes', () => {
    const analysis = analyzeQuery(getQuery('cov.hosts.table'));
    expect(analysis.scansGrail).toBe(false);
  });

  it('recognises the problem query as reading Grail', () => {
    const analysis = analyzeQuery(getQuery('prob.summary'));
    expect(analysis.scansGrail).toBe(true);
  });

  it('flags a recorded scan above 100 MB as worth attention', () => {
    const analysis = analyzeQuery(getQuery('prob.summary'));
    const cost = analysis.observations.find((observation) => checkName(observation) === 'Recorded cost');
    expect(cost?.severity).toBe('attention');
  });

  it('flags a query that filters through a string transformation', () => {
    const analysis = analyzeQuery({
      ...getQuery('log.quality'),
      dql: 'fetch logs, bucket:"default_logs"\n| filter matchesValue(lower(status), "error")\n| summarize count()',
    });
    const finding = analysis.observations.find((observation) => checkName(observation) === 'Filter efficiency');
    expect(finding?.severity).toBe('attention');
  });

  it('flags a missing scan ceiling on a query that reads Grail', () => {
    const entry = getQuery('prob.summary');
    const analysis = analyzeQuery({ ...entry, guards: undefined });
    const ceiling = analysis.observations.find((observation) => checkName(observation) === 'Scan ceiling');
    expect(ceiling?.severity).toBe('attention');
  });

  it('never rewrites the query it analyses', () => {
    const entry = getQuery('prob.summary');
    const before = entry.dql;
    analyzeQuery(entry);
    expect(entry.dql).toBe(before);
  });
});

describe('advisor wording', () => {
  const english: (message: Message) => string = (message) =>
    resolveMessage(message, (key, params) => translate(key, 'en', params));

  const resolveIn = (message: Message, locale: Locale) =>
    resolveMessage(message, (key, params) => translate(key, locale, params));

  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

  /**
   * Every observation the analysis can produce over the catalog, plus the branches the
   * catalog does not happen to exercise (no ceiling, a sort or limit before the
   * aggregation, a join, an unscoped logs read, an unpinned or pinned window).
   */
  const observations = (): Observation[] => {
    const variants = ALL_QUERIES.flatMap((entry) => [
      entry,
      { ...entry, guards: undefined },
      { ...entry, timeframe: 'global' as const },
      { ...entry, validation: { ...entry.validation, scannedBytesOnDemand: 0 } },
      { ...entry, dql: 'fetch logs\n| sort a\n| limit 5\n| filter lower(x) == "y"\n| summarize count()' },
      { ...entry, dql: 'fetch spans\n| summarize count()\n| filter count > 1\n| join [fetch spans], kind:inner' },
      { ...entry, dql: 'fetch bizevents\n| fields a' },
      { ...entry, dql: 'fetch bizevents' },
    ]);
    return variants.flatMap((entry) => analyzeQuery(entry).observations);
  };

  const keysUsed = (): StringKey[] => {
    const used = new Set<StringKey>();
    for (const observation of observations()) {
      used.add(observation.check);
      used.add(observation.finding.key);
      used.add(observation.recommendation.key);
    }
    return [...used];
  };

  afterEach(() => setActiveLocaleTag('en-GB'));

  it('only ever names dictionary keys, in both locales', () => {
    expect(keysUsed().length).toBeGreaterThan(30);
    for (const key of keysUsed()) {
      expect(ALL_KEYS, key).toContain(key);
      for (const locale of LOCALES) {
        expect(entryFor(key)[locale]?.trim(), `${key} / ${locale}`).toBeTruthy();
      }
    }
  });

  it('uses every advisor key it defines, and defines every advisor key it uses', () => {
    // Read the source so a branch the catalog never reaches is still checked.
    let dir = process.cwd();
    while (!existsSync(join(dir, 'app.config.json'))) {
      const parent = join(dir, '..');
      if (parent === dir) throw new Error('app.config.json not found');
      dir = parent;
    }
    const source = readFileSync(join(dir, 'ui', 'app', 'features', 'advisor', 'analyzeQuery.ts'), 'utf8');
    const referenced = new Set(source.match(/f\.advisor\.(?:chk|find|rec)\.\w+/g) ?? []);
    const defined = ALL_KEYS.filter((key) => /^f\.advisor\.(?:chk|find|rec)\./.test(key));

    for (const key of referenced) expect(ALL_KEYS, key).toContain(key);
    expect([...referenced].sort()).toEqual([...defined].sort());
  });

  it('writes each message in Portuguese, not a copy of the English', () => {
    for (const key of keysUsed()) {
      const entry = entryFor(key);
      expect(entry['pt-BR'], key).not.toBe(entry.en);
    }
  });

  it('keeps placeholders identical between locales', () => {
    for (const key of keysUsed()) {
      const entry = entryFor(key);
      expect(placeholders(entry['pt-BR']), key).toEqual(placeholders(entry.en));
    }
  });

  it('supplies every placeholder a message declares, in both locales', () => {
    for (const observation of observations()) {
      for (const message of [observation.finding, observation.recommendation]) {
        for (const locale of LOCALES) {
          expect(resolveIn(message, locale), `${message.key} / ${locale}`).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it('keeps the English sentences the advisor always produced', () => {
    const entry = getQuery('prob.summary');
    const gb = ((entry.validation.scannedBytesOnDemand ?? 0) / 1_000_000_000).toFixed(2);
    const cost = analyzeQuery(entry).observations.find((observation) => checkName(observation) === 'Recorded cost');
    expect(english(cost!.finding)).toBe(`The platform recorded ${gb} GB scanned on demand during validation.`);
    expect(english(cost!.recommendation)).toBe(
      'This is a dominant cost in the app. Keep it cached, keep the window narrow, and avoid refreshing it on every navigation.',
    );

    const ceiling = analyzeQuery({ ...entry, guards: { scanLimitGbytes: 25 } }).observations.find(
      (observation) => checkName(observation) === 'Scan ceiling',
    );
    expect(english(ceiling!.finding)).toBe('Capped at 25 GB.');

    const reuse = analyzeQuery(entry).observations.at(-1)!;
    expect(checkName(reuse)).toBe('Result reuse');
    expect(english(reuse.finding)).toBe(
      'Results are cached for 5 minutes and shared by every view that requests the same query and window.',
    );
  });

  it('resolves a pinned window label instead of printing its key', () => {
    const pinned = ALL_QUERIES.find((entry) => entry.timeframe !== 'global')!;
    const timeframe = analyzeQuery(pinned).observations.find((observation) => checkName(observation) === 'Timeframe')!;
    const label = (pinned.timeframe as { label: string }).label;
    expect(english(timeframe.finding)).toMatch(/^Pinned to now-\w+ \(last .+\)\.$/);
    expect(resolveIn(timeframe.finding, 'pt-BR')).toMatch(/^Fixado em now-\w+ \(últimos? .+\)\.$/);
    expect(english(timeframe.finding)).not.toContain(label);
  });

  it('formats the recorded scan volume in the active locale', () => {
    const entry = getQuery('prob.summary');
    const cost = () =>
      analyzeQuery(entry).observations.find((observation) => checkName(observation) === 'Recorded cost')!;

    setActiveLocaleTag('pt-BR');
    expect(resolveIn(cost().finding, 'pt-BR')).toMatch(/registrou \d+,\d{2} GB escaneados on-demand/);

    setActiveLocaleTag('en-GB');
    expect(english(cost().finding)).toMatch(/recorded \d+\.\d{2} GB scanned on demand/);
    expect(activeLocaleTag()).toBe('en-GB');
  });
});
