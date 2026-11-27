import { getEnvironmentId } from '@dynatrace-sdk/app-environment';
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
export function serviceFilter(serviceIds: readonly string[]): string {
  const ids = serviceIds.filter((id) => SERVICE_ID.test(id)).map((id) => `"${id}"`);
  return ids.length === 0 ? '' : `, filter: { in(dt.entity.service, array(${ids.join(', ')})) }`;
}

/**
 * 3.8.3 (the owner's validation of 3.8.2: two "traffic below its baseline" problems opened at the same moment on two quiet
 * services, and a failure-rate one at 100 % on a service with few requests — "talvez de forma geral tenha que rever a regra dos
 * alertas automáticos"): a minute counts only with at least `DETECTOR_MIN_REQUESTS` requests, and the traffic detector watches
 * only services that average that many a minute (on the lab on 2026-11-27, 44 of 63 services; 0 B).
 */
export const DETECTOR_MIN_REQUESTS = 10;

/** The detector's query: one series per service. */
export function detectorQuery(kind: DetectorKind, serviceIds: readonly string[]): string {
  const filter = serviceFilter(serviceIds);
  const floor = DETECTOR_MIN_REQUESTS;
  if (kind === 'failureRate') {
    return [
      `timeseries {f = sum(dt.service.request.failure_count), r = sum(dt.service.request.count)}, by: {dt.entity.service}${filter}`,
      `| fieldsAdd failureRate = iCollectArray(if(r[] >= ${floor}, 100 * f[] / r[]))`,
      '| fields timeframe, interval, dt.entity.service, failureRate',
    ].join('\n');
  }
  if (kind === 'responseTime') {
    return [
      `timeseries {t = percentile(dt.service.request.response_time, 90), r = sum(dt.service.request.count)}, by: {dt.entity.service}${filter}`,
      `| fieldsAdd p90 = iCollectArray(if(r[] >= ${floor}, t[]))`,
      '| fields timeframe, interval, dt.entity.service, p90',
    ].join('\n');
  }
  return [`timeseries requests = sum(dt.service.request.count), by: {dt.entity.service}${filter}`, `| filter arrayAvg(requests) >= ${floor}`].join('\n');
}

/**
 * 3.8.3: how each signal decides — how many of the last minutes must break the rule, and how far an adaptive baseline may be
 * crossed (in the signal's usual fluctuations). Errors keep their 3 of 5 minutes over the static line; latency needs 5 of 10
 * minutes three fluctuations above; a traffic drop needs 10 of 15 minutes four fluctuations below — a sustained drop, not a
 * quiet minute.
 */
export const DETECTOR_RULES: Record<DetectorKind, { violating: number; window: number; dealerting: number; fluctuations: number | null }> = {
  failureRate: { violating: 3, window: 5, dealerting: 5, fluctuations: null },
  responseTime: { violating: 5, window: 10, dealerting: 10, fluctuations: 3 },
  traffic: { violating: 10, window: 15, dealerting: 15, fluctuations: 4 },
};

/**
 * A Davis anomaly detector of one golden signal over the chosen services (none: every service), run as `actorId`. Pure; null
 * without an actor. 3.8.0: the actor is a service user — validated on the lab on 2026-11-26 with `dtctl create settings
 * --validate-only`: a person's own user id is refused ("Provided actor is not a valid service user or access is restricted", in
 * the API and in the Anomaly Detection app alike), a service user already running detectors there passes, for the three
 * signals.
 */
export function buildDetector(kind: DetectorKind, serviceIds: readonly string[], words: DetectorWords, actorId: string): Record<string, unknown> | null {
  // No service means every service; ids given but none valid is refused (nothing is guessed).
  if (actorId === '' || (serviceIds.length > 0 && !serviceIds.some((id) => SERVICE_ID.test(id)))) return null;
  const rule = DETECTOR_RULES[kind];
  const common = [
    // 3.8.0: the key the Anomaly Detection app itself writes (read from the lab's detectors on 2026-11-26).
    { key: 'query.expression', value: detectorQuery(kind, serviceIds) },
    { key: 'alertOnMissingData', value: 'false' },
    { key: 'violatingSamples', value: String(rule.violating) },
    { key: 'slidingWindow', value: String(rule.window) },
    { key: 'dealertingSamples', value: String(rule.dealerting) },
  ];
  const analyzer =
    kind === 'failureRate'
      ? { name: STATIC, input: [...common, { key: 'threshold', value: String(FAILURE_RATE_LINE) }, { key: 'alertCondition', value: 'ABOVE' }] }
      : {
          name: ADAPTIVE,
          input: [...common, { key: SIGNAL_FLUCTUATIONS, value: String(rule.fluctuations ?? 1) }, { key: 'alertCondition', value: kind === 'traffic' ? 'BELOW' : 'ABOVE' }],
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
        // 3.8.0: a dimension placeholder reads `{dims:<name>}` (the form of the lab's own detectors).
        { key: 'dt.source_entity', value: '{dims:dt.entity.service}' },
      ],
    },
    executionSettings: { actor: actorId },
  };
}

// ------------------------------------------------------------------ 3.8.0: the service user that runs the detectors

/** A service user's id (a UUID). */
export const SERVICE_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An actor already running detectors on the tenant: its id, how many it runs and one of their titles. */
export interface DetectorActor {
  id: string;
  detectors: number;
  example: string;
}

/** The actors of the tenant's detectors, most used first (read under `settings:objects:read`, declared since 3.7.6). Pure. */
export function detectorActors(objects: readonly { value?: { title?: unknown; executionSettings?: { actor?: unknown } } }[]): DetectorActor[] {
  const byId = new Map<string, DetectorActor>();
  for (const object of objects) {
    const actor = object.value?.executionSettings?.actor;
    if (typeof actor !== 'string' || !SERVICE_USER_ID.test(actor)) continue;
    const title = typeof object.value?.title === 'string' ? object.value.title : '';
    const known = byId.get(actor);
    if (known === undefined) byId.set(actor, { id: actor, detectors: 1, example: title });
    else known.detectors += 1;
  }
  return [...byId.values()].sort((a, b) => b.detectors - a.detectors || a.id.localeCompare(b.id));
}

/** Reads the tenant's detectors and returns their actors. */
export async function listDetectorActors(): Promise<DetectorActor[]> {
  const response = await httpClient.send({
    url: `${SETTINGS_API}?${new URLSearchParams({ schemaIds: DETECTOR_SCHEMA, scopes: 'environment', fields: 'objectId,value', pageSize: '500' }).toString()}`,
    method: 'GET',
  });
  const page = await bodyOf<{ items?: { value?: { title?: unknown; executionSettings?: { actor?: unknown } } }[] }>(response);
  return detectorActors(page.items ?? []);
}

/**
 * 3.8.3 (the owner: "tem somente o ID … era bom trazer o nome do ator"): the service users the signed-in person may use, with
 * their names — `GET /platform/iam/v1/organizational-levels/environment/{environment}/service-users` (the IAM service's
 * "available service users", under `iam:service-users:use`, declared since 3.8.2; executed in the account's context). Null when
 * the platform does not answer (the panel then falls back to the actors of the tenant's detectors).
 */
export interface ServiceUser {
  id: string;
  name: string;
}

/** The service users of an IAM answer, by id (lower case) and name. Pure. */
export function serviceUsersOf(body: unknown): ServiceUser[] {
  const results = (body as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results.flatMap((entry: unknown): ServiceUser[] => {
    const record = (entry ?? {}) as { uid?: unknown; email?: unknown; name?: unknown; surname?: unknown };
    const fromEmail = typeof record.email === 'string' ? record.email.split('@')[0] ?? '' : '';
    const id = (typeof record.uid === 'string' && SERVICE_USER_ID.test(record.uid.toLowerCase()) ? record.uid : fromEmail).toLowerCase();
    if (!SERVICE_USER_ID.test(id)) return [];
    const name = [record.name, record.surname].filter((part): part is string => typeof part === 'string' && part.trim() !== '').join(' ').trim();
    return [{ id, name: name.slice(0, 100) }];
  });
}

export async function listServiceUsers(): Promise<ServiceUser[] | null> {
  try {
    const environment = encodeURIComponent(getEnvironmentId());
    const response = await httpClient.send({ url: `/platform/iam/v1/organizational-levels/environment/${environment}/service-users`, method: 'GET' });
    return serviceUsersOf(await bodyOf<unknown>(response));
  } catch {
    return null;
  }
}

/**
 * 3.8.3 (the owner's validation of 3.8.2: a new service user with only "Pro User" failed at run time — "Anomaly detector failed
 * with an unauthorized request. Please verify that the actor has been granted the required scopes" —, while one with the Storage
 * and Davis groups ran): the least a detector's actor needs, from Dynatrace's documentation (the anomaly detectors' and health
 * alerts' actor: read the metrics and their buckets, run the analyzers; the entities and Smartscape for the service it watches).
 * Given to the SE as a policy to paste in Account Management.
 */
export const DETECTOR_ACTOR_POLICY = [
  'ALLOW davis:analyzers:execute;',
  'ALLOW storage:buckets:read;',
  'ALLOW storage:metrics:read;',
  'ALLOW storage:entities:read;',
  'ALLOW storage:smartscape:read;',
].join('\n');

export async function responseBodyOf(error: unknown): Promise<unknown> {
  const response = (error as { response?: { body?: (type?: 'json') => unknown } } | null)?.response;
  if (typeof response?.body !== 'function') return null;
  try {
    return await response.body('json');
  } catch {
    return null;
  }
}

/** The platform's own words for a refused settings value: its first constraint violation, else its message. Pure. */
export function refusalOf(body: unknown, fallback: string): string {
  const first = Array.isArray(body) ? (body[0] as unknown) : body;
  const error = (first as { error?: { message?: unknown; constraintViolations?: { message?: unknown }[] } } | null)?.error;
  const violation = error?.constraintViolations?.find((entry) => typeof entry.message === 'string')?.message;
  const text = typeof violation === 'string' ? violation : typeof error?.message === 'string' ? error.message : fallback;
  return text.slice(0, 300);
}

/**
 * 3.8.1 (the owner: "A plataforma não aceitou este: Must contain at least 1 non-whitespace character" for a service user that
 * runs detectors on the lab): the check sent a detector whose event description was empty — the platform refused the
 * description, not the actor (reproduced on the lab on 2026-11-27 with `dtctl create settings --validate-only`). The words of
 * the detector used only for that check now fill every field. Never written.
 */
const PROBE_NAME = ['PoC Automation', 'actor check'].join(' · ');
const PROBE_TEXT = [PROBE_NAME, SLO_TAG].join(' — ');
export const PROBE_WORDS: DetectorWords = { title: PROBE_NAME, description: PROBE_TEXT, eventName: PROBE_NAME, eventDescription: PROBE_TEXT };

/** Asks the platform whether this service user may run the PoC's detectors (nothing written): null when accepted. */
export async function checkActor(actor: string): Promise<string | null> {
  const id = actor.trim().toLowerCase();
  if (!SERVICE_USER_ID.test(id)) return 'not-an-id';
  const probe = buildDetector('traffic', [], PROBE_WORDS, id);
  return probe === null ? 'not-an-id' : checkDetector(probe);
}

/** An account's UUID, as Account Management writes it in its addresses. */
export const ACCOUNT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 3.8.1 (the owner: the link to the service users' page, "deve ser validado o ID da tenant/account-uuid"): Account Management →
 * Identity & access management → Service users of this PoC's account; without a valid account UUID, Account Management's
 * own start page (where the account is chosen).
 */
export function serviceUsersLink(accountUuid: string | undefined): string {
  const id = (accountUuid ?? '').trim().toLowerCase();
  return ACCOUNT_UUID.test(id)
    ? `https://myaccount.dynatrace.com/account/iam/service-user-management?account-uuid=${encodeURIComponent(id)}`
    : 'https://myaccount.dynatrace.com/';
}

/**
 * Asks the settings service whether a detector would be accepted, without writing it (`validateOnly`): the way to know, before
 * anything is created, that the platform takes this actor. Returns null when accepted, or the platform's own words.
 */
export async function checkDetector(value: unknown): Promise<string | null> {
  try {
    await httpClient.send({
      url: `${SETTINGS_API}?validateOnly=true`,
      method: 'POST',
      body: [{ schemaId: DETECTOR_SCHEMA, scope: 'environment', value }],
      headers: { 'Content-Type': 'application/json' },
    });
    return null;
  } catch (error) {
    return refusalOf(await responseBodyOf(error), error instanceof Error ? error.message : 'refused');
  }
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

/** A detector value's event properties as one object (`{ "event.name": …, … }`), the form the intent takes. Pure. */
export function eventTemplateMap(value: Record<string, unknown>): Record<string, string> {
  const template = value['eventTemplate'] as { properties?: { key: string; value: string }[] } | undefined;
  return Object.fromEntries((template?.properties ?? []).map((entry) => [entry.key, entry.value]));
}

export function detectorIntent(kind: DetectorKind, serviceIds: readonly string[], words: DetectorWords, appId: string): Record<string, unknown> | null {
  const value = buildDetector(kind, serviceIds, words, 'intent');
  if (value === null) return null;
  const analyzer = value['analyzer'] as { name: string; input: { key: string; value: string }[] };
  const typed = (raw: string): string | number | boolean => (raw === 'true' ? true : raw === 'false' ? false : /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw);
  const input = Object.fromEntries(analyzer.input.map((entry) => [entry.key, typed(entry.value)]));
  return {
    'dt.query': detectorQuery(kind, serviceIds),
    'davis.analyzer': { 'davis.analyzer.name': analyzer.name, 'davis.analyzer.input': input, 'davis.analyzer.labels': [DETECTOR_INTENT_LABEL] },
    // 3.8.0 (the owner: the app's step 3 came without its "Event name"): the intent's eventTemplate is an object of
    // property → value (its manifest declares an object), not the settings value's list of { key, value }.
    'davis.anomalydetector': { title: value['title'], description: value['description'], eventTemplate: eventTemplateMap(value) },
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
// 3.8.0 (the owner: ".../openpipeline-logs/routing" — "We can't find this page"; the right one is `dynamic-routes`).
export const OPENPIPELINE_ROUTING_LINK = platformUrl('dynatrace.settings/settings/openpipeline-logs/dynamic-routes') ?? '';
/** 3.8.0 (the owner: "o link correto dos detectores remete a página de settings"): Settings → all the alerts, where they show. */
export const ANOMALY_SETTINGS_LINK = platformUrl('dynatrace.settings/settings/all-alerts') ?? '';

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
