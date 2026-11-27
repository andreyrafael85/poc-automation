import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { refusalWords } from '../features/builder/ServiceUserPicker';
import {
  CAPACITY_KINDS,
  CAPACITY_THRESHOLD,
  EVALUATE_SOURCE,
  FORECAST_ANALYZER,
  MARKDOWN_SOURCE,
  buildCapacityWorkflow,
  capacityQuery,
  capacityWindow,
  forecastScript,
  type CapacityWords,
} from '../features/builder/pocCapacity';
import { entryFor, translate } from '../i18n/strings';

/**
 * 3.8.2 — the owner's approval of the 3.8.2 proposal: the scope to use a service user as the detectors' actor, the kit's
 * readiness badge, and four predictive-capacity workflows (proved on the lab on 2026-11-27 with private test workflows).
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');

const WORDS: CapacityWords = {
  title: 'T',
  description: 'D',
  forecastDescription: 'F',
  aiDescription: 'A',
  aiPrompt: 'P',
  aiHeading: 'H',
  mailDescription: 'M',
  eventDescription: 'E',
  eventTitleNow: 'Disk above {line}% — {name}',
  eventTitleLikely: 'Forecast: disk reaches {line}% in {days} days — {name}',
  eventTextNow: 'Now {name} {end}',
  eventTextLikely: 'Likely {name} {at}',
  heading: 'Capacity',
  gist: '{n} of {valid} reach {line}% in {days} days — {now} now, {likely} likely, {possible} possible',
  subject: '{n} at risk in {days} days',
  colName: 'Series',
  colStatus: 'Status',
  statusNow: 'Now',
  statusLikely: 'Likely',
  statusPossible: 'Possible',
  colWhen: 'When',
  colDays: 'Days',
  colTop: 'Upper',
  colEnd: 'End',
  more: 'And {n} more.',
  method: '{analyzed} analysed, {valid} valid',
  footer: 'Footer',
};

// The scripts' functions are plain JavaScript strings (they run inside the workflow); the tests run that same source.
type Reading = { analyzed: number; valid: number; rows: { name: string; status: string; days: number; top: number | null; end: number | null; entityId: string | null }[] };
const load = <T,>(source: string, name: string): T => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the workflow's own script source, under test
  const factory = new Function(`${source}; return ${name};`) as () => T;
  return factory();
};
const evaluate = load<(output: unknown[], cfg: object) => Reading>(EVALUATE_SOURCE, 'evaluateForecast');
const markdown = load<(reading: Reading, cfg: object) => { subject: string; body: string; closing: string }>(MARKDOWN_SOURCE, 'capacityMarkdown');

const START = '2026-11-27T19:00Z';
const HOUR = '3600000000000';
const series = (point: number[], upper: number[], extra: Record<string, unknown>) => ({
  analysisStatus: 'OK',
  forecastQualityAssessment: 'VALID',
  timeSeriesDataWithPredictions: { records: [{ timeframe: { start: START, end: '2026-12-04T19:00Z' }, interval: HOUR, 'dt.davis.forecast:point': point, 'dt.davis.forecast:upper': upper, ...extra }] },
});

describe('the forecast’s reading (3.8.2)', () => {
  it('calls a series over the line now, likely or possible, the soonest first, and leaves out a failed forecast', () => {
    const now = Date.parse(START);
    const reading = evaluate(
      [
        series([70, 80, 96, 97], [80, 90, 99, 99], { host: 'b', 'dt.entity.host': 'HOST-B' }),
        series([96, 96], [97, 98], { host: 'a', 'dt.entity.host': 'HOST-A' }),
        series([70, 70, 70], [80, 96, 6000], { host: 'c', 'dt.entity.host': 'HOST-C' }),
        series([10, 10], [20, 20], { host: 'd' }),
        { analysisStatus: 'FAILED' },
      ],
      { threshold: 95, nowMs: now, labels: ['host'], entity: 'dt.entity.host' },
    );
    expect(reading.analyzed).toBe(5);
    expect(reading.valid).toBe(4);
    expect(reading.rows.map((row) => [row.name, row.status, row.days])).toEqual([
      ['a', 'now', 0],
      ['b', 'likely', 0.1],
      ['c', 'possible', 0],
    ]);
    expect(reading.rows[0]?.entityId).toBe('HOST-A');
    const mail = markdown(reading, { threshold: 95, days: 7, shown: 2, words: WORDS });
    expect(mail.subject).toBe('3 at risk in 7 days');
    expect(mail.body).toContain('3 of 4 reach 95% in 7 days — 1 now, 1 likely, 1 possible');
    expect(mail.body).toContain('| a | Now | 2026-11-27 19:00 UTC | 0 | 96% | 98% |');
    expect(mail.body).toContain('And 1 more.');
    expect(mail.body).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('shows an upper bound past 200% as "> 200%" (noisy series reached thousands of percent on the lab)', () => {
    const reading = evaluate([series([70, 70], [80, 6211], { host: 'x' })], { threshold: 95, nowMs: Date.parse(START), labels: ['host'], entity: null });
    expect(markdown(reading, { threshold: 95, days: 7, shown: 15, words: WORDS }).body).toContain('| > 200% |');
  });
});

describe('the four predictive-capacity workflows (3.8.2)', () => {
  it('reads metrics only, the fullest first, leaving container mounts out of the disks', () => {
    for (const kind of CAPACITY_KINDS) {
      const query = capacityQuery(kind, 7);
      expect(query.startsWith('timeseries ')).toBe(true);
      expect(query).toContain('from: now()-14d, to: now(), interval: 1h');
      expect(query).toContain('| sort peak desc | limit 50');
    }
    expect(capacityQuery('disk', 7)).toContain('matchesValue(disk, "/var/lib/docker*")');
    expect(capacityQuery('k8sMemory', 7)).toContain('dt.kubernetes.container.limits_memory');
    expect(capacityWindow(14)).toEqual({ history: '28d', interval: '2h', points: 168 });
    expect(CAPACITY_THRESHOLD).toEqual({ disk: 90, memory: 90, cpu: 85, k8sMemory: 95 });
  });

  it('runs the forecast in a JavaScript task through the analyzers SDK, then acts only on a risk', () => {
    const workflow = buildCapacityWorkflow({ kind: 'k8sMemory', threshold: 95, horizon: 7, recipients: ['se@example.com'], raiseEvents: true, shared: true, timezone: 'America/Sao_Paulo' }, WORDS);
    expect(workflow.trigger.schedule).toMatchObject({ isActive: true, timezone: 'America/Sao_Paulo', trigger: { type: 'cron', cron: '0 7 * * *' } });
    expect(Object.keys(workflow.tasks)).toEqual(['forecast_capacity', 'capacity_assist', 'notify_team', 'raise_event']);
    const script = String(workflow.tasks['forecast_capacity']?.input['script']);
    expect(script).toContain('import { analyzersClient } from "@dynatrace-sdk/client-davis-analyzers";');
    expect(script).toContain(JSON.stringify(FORECAST_ANALYZER));
    expect(script).toContain('pollAnalyzerExecution');
    for (const task of ['capacity_assist', 'notify_team', 'raise_event']) {
      expect(workflow.tasks[task]?.conditions).toMatchObject({ custom: '{{ result("forecast_capacity").risk }}', else: 'SKIP' });
    }
    expect(String(workflow.tasks['raise_event']?.input['script'])).toContain('EventIngestEventType.ResourceContentionEvent');
    const without = buildCapacityWorkflow({ kind: 'disk', threshold: 90, horizon: 7, recipients: ['se@example.com'], raiseEvents: false, shared: false, timezone: '' }, WORDS);
    expect(without.tasks['raise_event']).toBeUndefined();
    expect(without.isPrivate).toBe(true);
    // The script carries the words of the screen's language, never Portuguese from the code.
    expect(forecastScript({ kind: 'cpu', threshold: 85, horizon: 7, recipients: [], raiseEvents: false, shared: false, timezone: 'UTC' }, WORDS)).not.toMatch(/ção|ões|Previsão/);
  });

  it('is a kit of the Workflows tab, handed to Workflows, never written by the app', () => {
    const kit = read('features/builder/CapacityKit.tsx');
    expect(kit).toContain('openInWorkflows(body(kind))');
    expect(kit).not.toContain('httpClient');
    expect(read('pages/PocBuilder.tsx')).toContain('<CapacityKit />');
    expect(translate('cap.ev.titleLikely', 'en', { signal: 'Disk' })).toBe('Forecast: Disk reaches {line}% in {days} days — {name}');
  });
});

describe('the detectors’ service user (3.8.2)', () => {
  it('declares iam:service-users:use, with its reason', () => {
    const manifest = JSON.parse(read('../../app.config.json')) as { app: { scopes: { name: string; comment: string }[] } };
    const scope = manifest.app.scopes.find((entry) => entry.name === 'iam:service-users:use');
    expect(scope?.comment).toMatch(/3\.8\.2/);
  });

  it('checks the saved service user on opening and creates only once it is ready, with the refusal in words', () => {
    const kit = read('features/builder/PocSettingsKits.tsx');
    expect(kit).toContain('data-testid="builder-ad-actor-badge"');
    expect(kit).toContain('!ready');
    const t = (key: 'builder.ad.actor.notId' | 'su.refused.noUse') => key;
    expect(refusalWords('User has no permission to use service users', t)).toBe('su.refused.noUse');
    expect(refusalWords('not-an-id', t)).toBe('builder.ad.actor.notId');
    expect(refusalWords('Something else', t)).toBe('Something else');
  });
});

describe('What’s new (3.8.2)', () => {
  it('keeps 3.8.2 among the ten', () => {
    expect(WHATS_NEW[1]).toEqual({ key: 'help.whatsNew.i124', published: '2026-11-27' }); // 3.8.3 opens it now
    expect(WHATS_NEW).toHaveLength(10);
    expect(entryFor('help.whatsNew.i124').en.startsWith('3.8.2 — ')).toBe(true);
    expect(entryFor('help.whatsNew.i124')['pt-BR'].startsWith('3.8.2 — ')).toBe(true);
  });
});
