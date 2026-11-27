import { TRIAGE_RULE } from '../triage/triage';
import { AI_ACTION, aiAnswer, type ScheduleTrigger, type WorkflowBody } from './pocAutomation';

/**
 * 3.8.2 (the owner's approval of the predictive-capacity proposal, D2–D5 as recommended): four workflows that ask Dynatrace
 * Intelligence for a forecast of the environment's capacity — host disk, host memory, host CPU and Kubernetes memory against
 * each container's limit — and act only when the forecast crosses its line: an e-mail with Dynatrace Assist's reading and a
 * resource-contention event that opens a problem. Built by the app, handed to the Workflows app (by its intent or as .json)
 * and saved there by the SE with their own permissions, like the triage and the weekly summary.
 *
 * Proved on the lab on 2026-11-27 (a private test workflow run by hand and deleted): the platform task "Analyze data"
 * (`dynatrace.davis.workflow.actions:davis-analyze`) refused every input written by hand ("Invalid davis-analyze action
 * state"); a run-javascript task calling `analyzersClient.executeAnalyzer` (`@dynatrace-sdk/client-davis-analyzers`) with
 * `dt.statistics.GenericForecastAnalyzer` answered COMPLETED. The forecast runs as the workflow's actor
 * (`davis:analyzers:execute`, `storage:metrics:read`) — no scope of this app is involved.
 *
 * The forecasts read metrics only (no Grail scan). Readings on the lab on 2026-11-27, seven days ahead: the fullest disk ~84 %,
 * memory ~52 % (one series without enough data, left out), one host's CPU up to 87.4 %, and two containers' memory over their
 * limit (`istio-egressgateway` 104.9 %, `sqs-demo` 101.8 %).
 */

export const CAPACITY_KINDS = ['disk', 'memory', 'cpu', 'k8sMemory'] as const;
export type CapacityKind = (typeof CAPACITY_KINDS)[number];

/** The line each forecast is read against, in percent (the SE changes it on the kit). */
export const CAPACITY_THRESHOLD: Record<CapacityKind, number> = { disk: 90, memory: 90, cpu: 85, k8sMemory: 95 };

/** How far ahead, in days: seven by default (D5), or fourteen. */
export const CAPACITY_HORIZONS = [7, 14] as const;
export type CapacityHorizon = (typeof CAPACITY_HORIZONS)[number];

export const FORECAST_ANALYZER = 'dt.statistics.GenericForecastAnalyzer';
/** Every day at 07:00 in the SE's time zone (D5). */
export const CAPACITY_CRON = '0 7 * * *';
/** At most this many series are forecast per run (the fullest first), to keep the analysis short. */
export const CAPACITY_SERIES_MAX = 50;
/** At most this many events are raised per run (the soonest first). */
export const CAPACITY_EVENTS_MAX = 10;

const JS_ACTION = 'dynatrace.automations:run-javascript';
const FORECAST_TASK = 'forecast_capacity';

/** The history read (twice the horizon) and its resolution, so a forecast step is one hour for 7 days and two for 14. */
export function capacityWindow(horizon: CapacityHorizon): { history: string; interval: string; points: number } {
  return horizon === 7 ? { history: '14d', interval: '1h', points: 168 } : { history: '28d', interval: '2h', points: 168 };
}

/** The forecast's input: the fullest series of the last weeks, with their names (validated on the lab on 2026-11-27). */
export function capacityQuery(kind: CapacityKind, horizon: CapacityHorizon): string {
  const { history, interval } = capacityWindow(horizon);
  const window = `from: now()-${history}, to: now(), interval: ${interval}`;
  const top = `| sort peak desc | limit ${CAPACITY_SERIES_MAX}`;
  if (kind === 'disk')
    return `timeseries used = avg(dt.host.disk.used.percent), by: {dt.entity.host, dt.entity.disk}, ${window} | fieldsAdd peak = arrayMax(used), host = entityName(dt.entity.host), disk = entityName(dt.entity.disk) | filter isNull(disk) or not(matchesValue(disk, "/var/lib/docker*") or matchesValue(disk, "/var/lib/containerd*") or matchesValue(disk, "/var/lib/kubelet*") or matchesValue(disk, "/snap/*")) ${top} | fields timeframe, interval, dt.entity.host, dt.entity.disk, host, disk, used`;
  if (kind === 'memory')
    return `timeseries used = avg(dt.host.memory.usage), by: {dt.entity.host}, ${window} | fieldsAdd peak = arrayMax(used), host = entityName(dt.entity.host) ${top} | fields timeframe, interval, dt.entity.host, host, used`;
  if (kind === 'cpu')
    return `timeseries used = avg(dt.host.cpu.usage), by: {dt.entity.host}, ${window} | fieldsAdd peak = arrayMax(used), host = entityName(dt.entity.host) ${top} | fields timeframe, interval, dt.entity.host, host, used`;
  // Kubernetes: memory in use against the container's own limit — summed by workload it passes 100 % (containers with and
  // without a limit mix, as found in 3.7.3); per container with a limit it reads right.
  return `timeseries {ws = avg(dt.kubernetes.container.memory_working_set), lim = avg(dt.kubernetes.container.limits_memory)}, by: {k8s.cluster.name, k8s.namespace.name, k8s.workload.name, k8s.container.name}, ${window} | fieldsAdd used = 100 * ws[] / lim[] | fieldsAdd peak = arrayMax(used) | filter isNotNull(peak) and peak > 0 ${top} | fields timeframe, interval, k8s.cluster.name, k8s.namespace.name, k8s.workload.name, k8s.container.name, used`;
}

/** The fields that name a series in the e-mail, and the entity an event is raised on (none for a container). */
export const CAPACITY_LABELS: Record<CapacityKind, { labels: string[]; entity: string | null }> = {
  disk: { labels: ['host', 'disk'], entity: 'dt.entity.disk' },
  memory: { labels: ['host'], entity: 'dt.entity.host' },
  cpu: { labels: ['host'], entity: 'dt.entity.host' },
  k8sMemory: { labels: ['k8s.cluster.name', 'k8s.namespace.name', 'k8s.workload.name', 'k8s.container.name'], entity: null },
};

/**
 * The forecast's reading, as plain JavaScript (it runs inside the workflow's script and in the tests, from this one source):
 * the series Dynatrace Intelligence forecast with a valid quality, and those that reach the line — "now" when the central
 * forecast is already over it, "likely" when the central forecast crosses it later, "possible" when only the upper bound of the
 * 90 % interval does —, the soonest first; when, in how many days, where the central forecast ends and the interval's highest
 * value. A series without a valid forecast is left out, never read as a zero. (Lab, 2026-11-27: noisy series' upper bounds
 * reach thousands of percent, so the central forecast leads and the e-mail shows "> 200%".)
 */
export const EVALUATE_SOURCE = `function evaluateForecast(output, cfg) {
  var rows = [];
  var analyzed = 0;
  var valid = 0;
  var rank = { now: 0, likely: 1, possible: 2 };
  var list = Array.isArray(output) ? output : [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    analyzed++;
    if (!item || item.analysisStatus !== "OK" || item.forecastQualityAssessment !== "VALID") continue;
    var data = item.timeSeriesDataWithPredictions;
    var rec = data && data.records ? data.records[0] : null;
    if (!rec) continue;
    var point = rec["dt.davis.forecast:point"];
    var upper = rec["dt.davis.forecast:upper"];
    if (!Array.isArray(point) || !Array.isArray(upper)) continue;
    valid++;
    var start = Date.parse(rec.timeframe && rec.timeframe.start ? rec.timeframe.start : "");
    var step = Number(rec.interval) / 1e6;
    if (!isFinite(start) || !isFinite(step)) continue;
    var crossPoint = -1;
    var crossUpper = -1;
    var top = null;
    for (var j = 0; j < point.length; j++) {
      var p = point[j];
      var u = upper[j];
      if (typeof u === "number" && (top === null || u > top)) top = u;
      if (crossPoint < 0 && typeof p === "number" && p >= cfg.threshold) crossPoint = j;
      if (crossUpper < 0 && typeof u === "number" && u >= cfg.threshold) crossUpper = j;
    }
    if (crossPoint < 0 && crossUpper < 0) continue;
    var status = crossPoint === 0 ? "now" : crossPoint > 0 ? "likely" : "possible";
    var at = start + (crossPoint >= 0 ? crossPoint : crossUpper) * step;
    var names = [];
    for (var n = 0; n < cfg.labels.length; n++) if (rec[cfg.labels[n]]) names.push(String(rec[cfg.labels[n]]));
    var end = point[point.length - 1];
    rows.push({
      name: names.join(" · ") || "—",
      entityId: cfg.entity && rec[cfg.entity] ? String(rec[cfg.entity]) : null,
      status: status,
      at: new Date(at).toISOString(),
      days: Math.max(0, Math.round(((at - cfg.nowMs) / 86400000) * 10) / 10),
      top: top === null ? null : Math.round(top * 10) / 10,
      end: typeof end === "number" ? Math.round(end * 10) / 10 : null
    });
  }
  rows.sort(function (a, b) {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
  });
  return { analyzed: analyzed, valid: valid, rows: rows };
}`;

/**
 * The e-mail's Markdown from the reading (plain JavaScript as well): a callout with how many series cross the line, a table of
 * the soonest, and the method line. Plain symbols, no emoji — the Workflows e-mail renders Markdown only (3.7.7–3.7.8).
 */
export const MARKDOWN_SOURCE = `function capacityMarkdown(reading, cfg) {
  var w = cfg.words;
  var fill = function (text, values) { return text.replace(/\\{(\\w+)\\}/g, function (all, key) { return values[key] === undefined ? all : String(values[key]); }); };
  var pct = function (v) { return v === null ? "—" : v > 200 ? "> 200%" : v + "%"; };
  var count = function (status) { var c = 0; for (var i = 0; i < reading.rows.length; i++) if (reading.rows[i].status === status) c++; return c; };
  var lines = [];
  lines.push("## " + w.heading);
  lines.push("");
  lines.push("> " + fill(w.gist, { n: reading.rows.length, valid: reading.valid, line: cfg.threshold, days: cfg.days, now: count("now"), likely: count("likely"), possible: count("possible") }));
  lines.push("");
  lines.push("| " + w.colName + " | " + w.colStatus + " | " + w.colWhen + " | " + w.colDays + " | " + w.colEnd + " | " + w.colTop + " |");
  lines.push("|---|---|---|---:|---:|---:|");
  var shown = reading.rows.slice(0, cfg.shown);
  for (var i = 0; i < shown.length; i++) {
    var r = shown[i];
    var label = r.status === "now" ? w.statusNow : r.status === "likely" ? w.statusLikely : w.statusPossible;
    lines.push("| " + r.name.replace(/\\|/g, "/") + " | " + label + " | " + r.at.slice(0, 16).replace("T", " ") + " UTC | " + r.days + " | " + pct(r.end) + " | " + pct(r.top) + " |");
  }
  if (reading.rows.length > shown.length) lines.push("", fill(w.more, { n: reading.rows.length - shown.length }));
  lines.push("", "_" + fill(w.method, { analyzed: reading.analyzed, valid: reading.valid }) + "_");
  return {
    subject: fill(w.subject, { n: reading.rows.length, days: cfg.days }),
    body: lines.join("\\n"),
    closing: "_" + w.footer + "_"
  };
}`;

/** The texts the workflow writes, in the screen's language (`t()` on the kit). */
export interface CapacityWords {
  title: string;
  description: string;
  forecastDescription: string;
  aiDescription: string;
  aiPrompt: string;
  aiHeading: string;
  mailDescription: string;
  eventDescription: string;
  /** 3.8.3: the predictive event's title and description — over the line now, or crossing it later ({name}, {line}, {days}, {at}, {end}, {top}, {horizon}). */
  eventTitleNow: string;
  eventTitleLikely: string;
  eventTextNow: string;
  eventTextLikely: string;
  /** For the e-mail's Markdown. */
  heading: string;
  gist: string;
  subject: string;
  colName: string;
  colStatus: string;
  statusNow: string;
  statusLikely: string;
  statusPossible: string;
  colWhen: string;
  colDays: string;
  colTop: string;
  colEnd: string;
  more: string;
  method: string;
  footer: string;
}

export interface CapacityChoice {
  kind: CapacityKind;
  threshold: number;
  horizon: CapacityHorizon;
  recipients: readonly string[];
  /** D4: raise a resource-contention event (it opens a problem) for each series at risk — always on since 3.8.3 (the owner). */
  raiseEvents: boolean;
  shared: boolean;
  timezone: string;
}

/** The forecast task's script: run the analyzer, wait for it, read it and write the e-mail's parts. Pure. */
export function forecastScript(choice: CapacityChoice, words: CapacityWords): string {
  const { points } = capacityWindow(choice.horizon);
  const cfg = {
    query: capacityQuery(choice.kind, choice.horizon),
    points,
    threshold: choice.threshold,
    days: choice.horizon,
    labels: CAPACITY_LABELS[choice.kind].labels,
    entity: CAPACITY_LABELS[choice.kind].entity,
    shown: 15,
    words: {
      heading: words.heading,
      gist: words.gist,
      subject: words.subject,
      colName: words.colName,
      colStatus: words.colStatus,
      statusNow: words.statusNow,
      statusLikely: words.statusLikely,
      statusPossible: words.statusPossible,
      colWhen: words.colWhen,
      colDays: words.colDays,
      colTop: words.colTop,
      colEnd: words.colEnd,
      more: words.more,
      method: words.method,
      footer: words.footer,
    },
  };
  return [
    'import { analyzersClient } from "@dynatrace-sdk/client-davis-analyzers";',
    '',
    `const CFG = ${JSON.stringify(cfg, null, 2)};`,
    `const ANALYZER = ${JSON.stringify(FORECAST_ANALYZER)};`,
    '',
    EVALUATE_SOURCE,
    '',
    MARKDOWN_SOURCE,
    '',
    'export default async function () {',
    '  let response = await analyzersClient.executeAnalyzer({',
    '    analyzerName: ANALYZER,',
    '    body: { timeSeriesData: { expression: CFG.query }, forecastHorizon: CFG.points, coverageProbability: 0.9 },',
    '    timeoutSeconds: 60,',
    '  });',
    '  let result = response.result;',
    '  let polls = 0;',
    '  while ((!result || result.executionStatus === "RUNNING") && response.requestToken && polls < 20) {',
    '    polls++;',
    '    const polled = await analyzersClient.pollAnalyzerExecution({ analyzerName: ANALYZER, requestToken: response.requestToken, timeoutSeconds: 30 });',
    '    result = polled.result;',
    '  }',
    '  const reading = evaluateForecast(result && result.output ? result.output : [], { threshold: CFG.threshold, nowMs: Date.now(), labels: CFG.labels, entity: CFG.entity });',
    '  const mail = capacityMarkdown(reading, CFG);',
    '  return { risk: reading.rows.length > 0, count: reading.rows.length, analyzed: reading.analyzed, valid: reading.valid, rows: reading.rows.slice(0, 20), subject: mail.subject, body: mail.body, closing: mail.closing };',
    '}',
  ].join('\n');
}

/** The event task's script: one resource-contention event per series at risk (the soonest first), which opens a problem. Pure. */
/**
 * 3.8.3 (the owner's validation of 3.8.2: "se for detectado pela forecast que está com problemas poderá ser gerado um nome de
 * alerta ideal … já poderia gerar o alerta 'preditivo' também bem descrito e informativo ao cliente"): every run that finds a
 * series over the line now, or whose central forecast crosses it, raises one event per series (up to 10) — a title that says
 * what is happening ("Disk above 90% — host · /" or "Predicted: disk reaches 90% in 3.4 days — host · /") and a description with
 * the forecast's figures, the method and the first step. A series only the upper bound crosses ("possible") stays in the e-mail.
 * The event lasts 300 minutes (the platform's longest timeout for an ingested event); the next day's run raises it again while
 * the risk remains. Pure: the event task's script.
 */
export function eventScript(choice: Pick<CapacityChoice, 'threshold' | 'horizon'>, words: CapacityWords): string {
  const texts = { titleNow: words.eventTitleNow, titleLikely: words.eventTitleLikely, textNow: words.eventTextNow, textLikely: words.eventTextLikely };
  return [
    'import { result } from "@dynatrace-sdk/automation-utils";',
    'import { eventsClient, EventIngestEventType } from "@dynatrace-sdk/client-classic-environment-v2";',
    '',
    `const TEXTS = ${JSON.stringify(texts)};`,
    `const LINE = ${JSON.stringify(choice.threshold)};`,
    `const DAYS = ${JSON.stringify(choice.horizon)};`,
    'const fill = (text, values) => text.replace(/\\{(\\w+)\\}/g, (all, key) => (values[key] === undefined ? all : String(values[key])));',
    'const pct = (v) => (v === null || v === undefined ? "—" : v > 200 ? "> 200%" : v + "%");',
    '',
    'export default async function () {',
    `  const forecast = await result(${JSON.stringify(FORECAST_TASK)});`,
    `  const rows = (forecast && forecast.rows ? forecast.rows : []).filter((row) => row.status === "now" || row.status === "likely").slice(0, ${CAPACITY_EVENTS_MAX});`,
    '  let raised = 0;',
    '  for (const row of rows) {',
    '    const values = { name: row.name, line: LINE, days: row.days, horizon: DAYS, at: String(row.at).slice(0, 16).replace("T", " ") + " UTC", end: pct(row.end), top: pct(row.top) };',
    '    const now = row.status === "now";',
    '    await eventsClient.createEvent({',
    '      body: {',
    '        eventType: EventIngestEventType.ResourceContentionEvent,',
    '        title: fill(now ? TEXTS.titleNow : TEXTS.titleLikely, values).slice(0, 250),',
    '        timeout: 300,',
    '        ...(row.entityId ? { entitySelector: `entityId("${row.entityId}")` } : {}),',
    '        properties: {',
    '          "dt.event.description": fill(now ? TEXTS.textNow : TEXTS.textLikely, values),',
    '          "capacity.forecast.status": row.status,',
    '          "capacity.forecast.line_pct": String(LINE),',
    '          "capacity.forecast.reaches_at": String(row.at),',
    '          "capacity.forecast.days": String(row.days),',
    '          "capacity.forecast.end_pct": String(row.end),',
    '          "capacity.forecast.upper_pct": String(row.top),',
    '          "capacity.forecast.source": "Dynatrace Intelligence generic forecast, 90% interval",',
    '        },',
    '      },',
    '    });',
    '    raised++;',
    '  }',
    '  return { raised };',
    '}',
  ].join('\n');
}

const RISK = `{{ result("${FORECAST_TASK}").risk }}`;
const forecastField = (field: string) => `{{ result("${FORECAST_TASK}")["${field}"] }}`;

/** One predictive-capacity workflow: forecast → (risk) Dynatrace Assist → e-mail, and the event when chosen. Pure. */
export function buildCapacityWorkflow(choice: CapacityChoice, words: CapacityWords): WorkflowBody<ScheduleTrigger> {
  const onRisk = { custom: RISK, else: 'SKIP' as const };
  const tasks: WorkflowBody<ScheduleTrigger>['tasks'] = {
    [FORECAST_TASK]: {
      name: FORECAST_TASK,
      action: JS_ACTION,
      description: words.forecastDescription,
      input: { script: forecastScript(choice, words) },
      position: { x: 0, y: 1 },
      predecessors: [],
    },
    capacity_assist: {
      name: 'capacity_assist',
      action: AI_ACTION,
      description: words.aiDescription,
      input: { autoTrim: true, config: 'disabled', instruction: '', prompt: `${words.aiPrompt}\n\n${forecastField('body')}`, supplementary: '' },
      position: { x: 0, y: 2 },
      predecessors: [FORECAST_TASK],
      conditions: { states: { [FORECAST_TASK]: 'OK' }, ...onRisk },
    },
    notify_team: {
      name: 'notify_team',
      action: 'dynatrace.email:send-email',
      description: words.mailDescription,
      input: {
        to: [...choice.recipients],
        cc: [],
        bcc: [],
        subject: forecastField('subject'),
        content: `${forecastField('body')}${TRIAGE_RULE}${words.aiHeading}\n\n${aiAnswer('capacity_assist')}${TRIAGE_RULE}${forecastField('closing')}`,
      },
      position: { x: 0, y: 3 },
      predecessors: ['capacity_assist'],
      conditions: { states: { capacity_assist: 'ANY' }, ...onRisk },
    },
  };
  if (choice.raiseEvents)
    tasks['raise_event'] = {
      name: 'raise_event',
      action: JS_ACTION,
      description: words.eventDescription,
      input: { script: eventScript(choice, words) },
      position: { x: 1, y: 2 },
      predecessors: [FORECAST_TASK],
      conditions: { states: { [FORECAST_TASK]: 'OK' }, ...onRisk },
    };
  return {
    title: words.title.slice(0, 200),
    description: words.description.slice(0, 500),
    isPrivate: !choice.shared,
    trigger: {
      schedule: {
        isActive: true,
        isFaulty: false,
        timezone: choice.timezone === '' ? 'UTC' : choice.timezone,
        trigger: { type: 'cron', cron: CAPACITY_CRON },
        filterParameters: {},
        inputs: {},
      },
    },
    tasks,
  };
}
