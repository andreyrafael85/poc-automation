import { httpClient } from '@dynatrace-sdk/http-client';
import { sendIntent } from '@dynatrace-sdk/navigation';

import { platformUrl } from '../../utils/deepLinks';
import { SLO_TAG } from './pocAutomation';

/**
 * 3.7.4 (the owner: "Sim, vamos seguir com as 3 — criar no builder a guia OpenPipeline para logs de erro … e Anomaly
 * Detection para as regras dos golden signals"): two kits that write settings objects (`settings:objects:write`, at the
 * owner's order), each created only on the SE's click after a confirmation and kept in the PoC's register for the clean-up.
 *
 * - Anomaly detection: Davis anomaly detectors (`builtin:davis.anomaly-detectors`) on the golden signals of the services
 *   the SE picks — the failure rate above a static line, the p90 response time above its own adaptive baseline, and a
 *   drop of traffic below it. The value's shape was validated on the lab (2026-11-23, `dtctl create settings
 *   --validate-only`): the analyzers and their inputs pass; `executionSettings.actor` must be the signed-in user (another
 *   person's id is refused), so the app sends the SE's own id.
 * - OpenPipeline: a logs pipeline (`builtin:openpipeline.logs.pipelines`) with one DQL processor that gives a level to a
 *   record written without one when its text reads as an error, a warning or an info. It changes nothing on its own: data
 *   reaches it only through a route the SE adds in the OpenPipeline app (the kit says how). Validated on the lab with
 *   `--validate-only`; its rule, run over a 1:100 sample of the lab's logs without a level, would have set ERROR on 69,
 *   WARN on 10 and INFO on 169 of 61,902 records (the rest are data records, left as they are).
 */

const SETTINGS_API = '/platform/classic/environment-api/v2/settings/objects';

export const DETECTOR_SCHEMA = 'builtin:davis.anomaly-detectors';
export const PIPELINE_SCHEMA = 'builtin:openpipeline.logs.pipelines';

async function bodyOf<T>(response: { body: (type?: 'json') => unknown }): Promise<T> {
  return (await response.body('json')) as T;
}

/** Creates one settings object in the environment's scope; returns its object id. */
export async function createSettingsObject(schemaId: string, value: unknown): Promise<string> {
  const response = await httpClient.send({
    url: SETTINGS_API,
    method: 'POST',
    body: [{ schemaId, scope: 'environment', value }],
    headers: { 'Content-Type': 'application/json' },
  });
  const created = await bodyOf<{ objectId?: string }[]>(response);
  const id = created[0]?.objectId;
  if (id === undefined) throw new Error('The settings service returned no object id.');
  return id;
}

/** Removes a settings object this PoC created. */
export async function deleteSettingsObject(id: string): Promise<void> {
  await httpClient.send({ url: `${SETTINGS_API}/${encodeURIComponent(id)}`, method: 'DELETE' });
}

// ------------------------------------------------------------------ anomaly detectors on the golden signals

export const DETECTOR_KINDS = ['failureRate', 'responseTime', 'traffic'] as const;
export type DetectorKind = (typeof DETECTOR_KINDS)[number];

/** The static line of the failure-rate detector, in percent (the app's review line for a service). */
export const FAILURE_RATE_LINE = 5;

const STATIC = 'dt.statistics.ui.anomaly_detection.StaticThresholdAnomalyDetectionAnalyzer';
/** The adaptive analyzer's tolerance input (how many usual fluctuations above the baseline a signal may reach). */
const SIGNAL_FLUCTUATIONS = ['numberOf', 'Signal', 'Fluctuations'].join('');
const ADAPTIVE = 'dt.statistics.ui.anomaly_detection.AutoAdaptiveAnomalyDetectionAnalyzer';

export interface DetectorWords {
  title: string;
  description: string;
  eventName: string;
  eventDescription: string;
}

const SERVICE_ID = /^SERVICE-[0-9A-F]{16}$/;

/**
 * The services a detector watches, as a DQL filter (ids only — anything else is left out). 3.7.6 (the owner: "a quantidade
 * que selecionar é o que o SE e Parceiro vão identificar"): with no service chosen the detector watches every service, one
 * series each — no filter.
 */
function serviceFilter(serviceIds: readonly string[]): string {
  const ids = serviceIds.filter((id) => SERVICE_ID.test(id)).map((id) => `"${id}"`);
  return ids.length === 0 ? '' : `, filter: { in(dt.entity.service, array(${ids.join(', ')})) }`;
}

/** The detector's query: one series per service. */
export function detectorQuery(kind: DetectorKind, serviceIds: readonly string[]): string {
  const filter = serviceFilter(serviceIds);
  if (kind === 'failureRate') {
    return [
      `timeseries {f = sum(dt.service.request.failure_count), r = sum(dt.service.request.count)}, by: {dt.entity.service}${filter}`,
      '| fieldsAdd failureRate = 100 * f[] / r[]',
      '| fields timeframe, interval, dt.entity.service, failureRate',
    ].join('\n');
  }
  if (kind === 'responseTime') return `timeseries p90 = percentile(dt.service.request.response_time, 90), by: {dt.entity.service}${filter}`;
  return `timeseries requests = sum(dt.service.request.count), by: {dt.entity.service}${filter}`;
}

/** A Davis anomaly detector of one golden signal over the chosen services (none: every service), run as the SE (`actorId`). Pure; null without an actor. */
export function buildDetector(kind: DetectorKind, serviceIds: readonly string[], words: DetectorWords, actorId: string): Record<string, unknown> | null {
  // No service means every service; ids given but none valid is refused (nothing is guessed).
  if (actorId === '' || (serviceIds.length > 0 && !serviceIds.some((id) => SERVICE_ID.test(id)))) return null;
  const common = [
    { key: 'query', value: detectorQuery(kind, serviceIds) },
    { key: 'alertOnMissingData', value: 'false' },
    { key: 'violatingSamples', value: '3' },
    { key: 'slidingWindow', value: '5' },
    { key: 'dealertingSamples', value: '5' },
  ];
  const analyzer =
    kind === 'failureRate'
      ? { name: STATIC, input: [...common, { key: 'threshold', value: String(FAILURE_RATE_LINE) }, { key: 'alertCondition', value: 'ABOVE' }] }
      : {
          name: ADAPTIVE,
          input: [...common, { key: SIGNAL_FLUCTUATIONS, value: '1' }, { key: 'alertCondition', value: kind === 'traffic' ? 'BELOW' : 'ABOVE' }],
        };
  const eventType = kind === 'failureRate' ? 'ERROR_EVENT' : kind === 'responseTime' ? 'PERFORMANCE_EVENT' : 'AVAILABILITY_EVENT';
  return {
    enabled: true,
    title: words.title.slice(0, 200),
    description: words.description.slice(0, 500),
    source: `PoC Automation (${SLO_TAG})`,
    analyzer,
    eventTemplate: {
      properties: [
        { key: 'event.name', value: words.eventName.slice(0, 200) },
        { key: 'event.description', value: words.eventDescription.slice(0, 500) },
        { key: 'event.type', value: eventType },
        { key: 'dt.source_entity', value: '{dt.entity.service}' },
      ],
    },
    executionSettings: { actor: actorId },
  };
}

// ------------------------------------------------------------------ 3.7.8: the detectors handed to the Anomaly Detection app

/**
 * 3.7.8 (the owner: "Feito: 0 · não feito: 3", twice): the settings service refuses a detector written by an app with the
 * SE's own id as its actor ("Provided actor is not a valid service user or access is restricted" — read on the lab with
 * `dtctl create settings --validate-only` on 2026-11-23, the same id the UI writes for a detector made there), and an actor is
 * required ("Must not be null"). So, like the workflows, each detector goes to the Anomaly Detection app through its
 * documented intent `create_anomaly_detector` — the query, the analyzer and its rule, the title and the event filled in —
 * and the SE saves it there, as themself. Pure: the intent's payload.
 */
export const DETECTOR_INTENT_LABEL = 'system.configurable-as-anomaly-detector';

export function detectorIntent(kind: DetectorKind, serviceIds: readonly string[], words: DetectorWords, appId: string): Record<string, unknown> | null {
  const value = buildDetector(kind, serviceIds, words, 'intent');
  if (value === null) return null;
  const analyzer = value['analyzer'] as { name: string; input: { key: string; value: string }[] };
  const typed = (raw: string): string | number | boolean => (raw === 'true' ? true : raw === 'false' ? false : /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw);
  const input = Object.fromEntries(analyzer.input.map((entry) => [entry.key, typed(entry.value)]));
  return {
    'dt.query': detectorQuery(kind, serviceIds),
    'davis.analyzer': { 'davis.analyzer.name': analyzer.name, 'davis.analyzer.input': input, 'davis.analyzer.labels': [DETECTOR_INTENT_LABEL] },
    'davis.anomalydetector': { title: value['title'], description: value['description'], eventTemplate: value['eventTemplate'] },
    sourceApplication: appId,
  };
}

/** Opens the Anomaly Detection app with the detector filled in, ready to save. */
export function openDetectorInApp(payload: Record<string, unknown>): void {
  sendIntent(payload, { recommendedAppId: 'dynatrace.davis.anomalydetection', recommendedIntentId: 'create_anomaly_detector' });
}

// ------------------------------------------------------------------ the OpenPipeline rule: a level for logs written without one

/** The processor's DQL: a level from the record's own words, kept only when the record had none. */
export const LOG_LEVEL_SCRIPT = [
  'fieldsAdd pocLevel = if(matchesPhrase(content, "error") or matchesPhrase(content, "exception") or matchesPhrase(content, "fatal") or matchesPhrase(content, "failed"), "ERROR", else: if(matchesPhrase(content, "warn") or matchesPhrase(content, "warning"), "WARN", else: if(matchesPhrase(content, "info"), "INFO")))',
  '| fieldsAdd loglevel = if(isNotNull(pocLevel), pocLevel, else: loglevel), status = if(isNotNull(pocLevel), pocLevel, else: status)',
  '| fieldsRemove pocLevel',
].join('\n');

/** Which records the processor reads: those written without a level. */
export const LOG_LEVEL_MATCHER = 'isNull(loglevel) or loglevel == "NONE"';

/** The logs pipeline holding the processor (no route: the SE routes sources to it in the OpenPipeline app). Pure. */
export function buildLogLevelPipeline(displayName: string, description: string): Record<string, unknown> {
  const empty = { processors: [] };
  return {
    customId: 'pipeline_poc_automation_log_levels',
    displayName: displayName.slice(0, 100),
    metadataList: [],
    processing: {
      processors: [
        {
          id: 'processor_poc_automation_log_level',
          description: description.slice(0, 200),
          enabled: true,
          type: 'dql',
          matcher: LOG_LEVEL_MATCHER,
          sampleData: '{"content":"ERROR Connection refused","loglevel":"NONE"}',
          dql: { script: LOG_LEVEL_SCRIPT },
        },
      ],
    },
    costAllocation: empty,
    dataExtraction: empty,
    davis: empty,
    metricExtraction: empty,
    productAllocation: empty,
    securityContext: empty,
    storage: empty,
  };
}

/**
 * The logs pipelines in Settings → OpenPipeline, where the pipeline shows and the SE routes sources to it (3.7.6: the page the
 * owner named; absolute on the tenant — a relative `/ui/apps/…` resolved inside this app).
 */
export const OPENPIPELINE_LINK = platformUrl('dynatrace.settings/settings/openpipeline-logs/pipelines?page=1&pageSize=50') ?? '';
/** The OpenPipeline routing of logs, where a source is sent to the pipeline. */
export const OPENPIPELINE_ROUTING_LINK = platformUrl('dynatrace.settings/settings/openpipeline-logs/routing') ?? '';
/** The Anomaly Detection app, where the detectors open (app id read from the tenant's app list). */
export const ANOMALY_APP_LINK = platformUrl('dynatrace.davis.anomalydetection/') ?? '';

// ------------------------------------------------------------------ 3.7.6: the route that sends sources to the pipeline

/**
 * 3.7.6 (the owner: "esse ponto 2 você não consegue criar junto na automação do pipeline?"): the logs routing is one settings
 * object (`builtin:openpipeline.logs.routing`) whose list of routes every pipeline shares, evaluated top to bottom. The app
 * reads it (`settings:objects:read`), puts the PoC's route at the top — replacing an earlier route of the same pipeline, so a
 * second run updates instead of adding — and writes it back with its update token, so a change made meanwhile elsewhere is
 * refused instead of overwritten. Nothing else in the list changes. Validated on the lab on 2026-11-23 with
 * `dtctl create settings --validate-only` (the list with the PoC's route on top passed; a broken condition was refused).
 */
export const ROUTING_SCHEMA = 'builtin:openpipeline.logs.routing';

export interface RouteSource {
  logSource: string | null;
  workload: string | null;
  ingest: string | null;
}

export interface RoutingEntry {
  description: string;
  enabled: boolean;
  matcher: string;
  pipelineId: string;
  pipelineType: string;
}

/** A string as a DQL literal (backslashes and quotes escaped — a Windows path stays one literal). */
const literal = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** The route's condition: one clause per source ticked, each on every field the source has. Pure; null with nothing usable. */
export function routeMatcher(sources: readonly RouteSource[]): string | null {
  const clauses = sources
    .map((source) => {
      const parts: string[] = [];
      if (source.logSource !== null && source.logSource !== '') parts.push(`matchesValue(log.source, ${literal(source.logSource)})`);
      else parts.push('isNull(log.source)');
      if (source.workload !== null && source.workload !== '') parts.push(`k8s.workload.name == ${literal(source.workload)}`);
      if (source.ingest !== null && source.ingest !== '') parts.push(`dt.openpipeline.source == ${literal(source.ingest)}`);
      return parts.length === 1 && parts[0] === 'isNull(log.source)' ? null : `(${parts.join(' and ')})`;
    })
    .filter((clause): clause is string => clause !== null);
  return clauses.length === 0 ? null : clauses.join(' or ');
}

/** The routes with the PoC's on top (an earlier route of the same pipeline replaced). Pure. */
export function withPocRoute(entries: readonly RoutingEntry[], route: RoutingEntry): RoutingEntry[] {
  return [route, ...entries.filter((entry) => entry.pipelineId !== route.pipelineId)];
}

/** The routes without any that sends data to the pipeline. Pure. */
export function withoutPipelineRoutes(entries: readonly RoutingEntry[], pipelineId: string): RoutingEntry[] {
  return entries.filter((entry) => entry.pipelineId !== pipelineId);
}

interface RoutingObject {
  objectId: string;
  updateToken?: string;
  value: { routingEntries?: RoutingEntry[] };
}

async function readRouting(): Promise<RoutingObject | null> {
  const response = await httpClient.send({
    url: `${SETTINGS_API}?schemaIds=${encodeURIComponent(ROUTING_SCHEMA)}&scopes=environment&fields=objectId,updateToken,value`,
    method: 'GET',
  });
  const page = await bodyOf<{ items?: RoutingObject[] }>(response);
  return page.items?.[0] ?? null;
}

async function writeRouting(current: RoutingObject, entries: RoutingEntry[]): Promise<void> {
  await httpClient.send({
    url: `${SETTINGS_API}/${encodeURIComponent(current.objectId)}`,
    method: 'PUT',
    body: { ...(current.updateToken === undefined ? {} : { updateToken: current.updateToken }), value: { ...current.value, routingEntries: entries } },
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Sends the chosen sources to the pipeline: the PoC's route on top of the logs routing (created when there is none). */
export async function routeToPipeline(pipelineId: string, description: string, matcher: string): Promise<void> {
  const route: RoutingEntry = { description: description.slice(0, 200), enabled: true, matcher, pipelineId, pipelineType: 'custom' };
  const current = await readRouting();
  if (current === null) {
    await createSettingsObject(ROUTING_SCHEMA, { routingEntries: [route] });
    return;
  }
  await writeRouting(current, withPocRoute(current.value.routingEntries ?? [], route));
}

/** Removes the routes that send data to the pipeline (the clean-up, before the pipeline itself). Nothing to remove is fine. */
export async function unrouteFromPipeline(pipelineId: string): Promise<void> {
  const current = await readRouting();
  if (current === null) return;
  const entries = current.value.routingEntries ?? [];
  const kept = withoutPipelineRoutes(entries, pipelineId);
  if (kept.length !== entries.length) await writeRouting(current, kept);
}
