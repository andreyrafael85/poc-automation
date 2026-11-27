import { documentsClient } from '@dynatrace-sdk/client-document';
import { httpClient } from '@dynatrace-sdk/http-client';

import { platformUrl } from '../../utils/deepLinks';
import { sendIntent } from '@dynatrace-sdk/navigation';

import { renderOrNull } from '../../queries/params';
import { getQuery } from '../../queries/catalog';
import { TRIAGE_RULE } from '../triage/triage';
import { CUT_SLO_ID } from '../../models/pocPlan';
import type { FleetSloKind, ServiceSloKind, SloKind } from '../../models/pocPlan';

/**
 * 3.6.9 — the PoC Builder's SLOs, the problem-triage workflow and the clean-up at the end of the PoC (the owner: "Seguir com
 * a 3.6.9 com suas recomendações"; the 3.6.6 proposal's kits that needed new permissions — the manifest gained
 * `slo:slos:read`/`write` and `document:documents:delete`, rule 5; no `automation:workflows:*`: a custom app may not
 * write workflows, so the Workflows app saves it).
 *
 * - SLOs: per service the SE picks, availability (requests without a failure) and performance (minutes whose mean
 *   response time stays within the line) — the indicators are the catalog's parameterised entries `slo.availability`
 *   and `slo.performance`, rendered with the service's id by `queries/params.ts` (rule 9), the same form the platform's
 *   SLO app writes; validated on the lab at 0 B.
 * - The workflow: on each problem Dynatrace Intelligence opens (analysis ready, every category), an e-mail to the PoC team
 *   with the problem, its root cause and a link — handed to the platform's Workflows app, which saves it with the SE's own
 *   permissions (the e-mail task and the trigger were validated on the lab: created inactive and removed).
 * - The clean-up: what this PoC created is removed only by the SE's click, item by item (rule 10's spirit both ways).
 *
 * Everything is created and removed only by the SE's click (rule 10), and kept in the PoC's register.
 */

const SLO_API = '/platform/slo/v1/slos';

export const SLO_TAG = 'poc-automation';
/** The SLO's evaluation window: the last 7 days, like the app's own problem reads. */
export const SLO_WINDOW = { timeframeFrom: 'now-7d', timeframeTo: 'now' } as const;

export interface SloTargets {
  target: number;
  warning: number;
}

export interface SloWords {
  name: string;
  description: string;
}

export interface SloBody {
  name: string;
  description: string;
  tags: string[];
  externalId: string;
  criteria: { timeframeFrom: string; timeframeTo: string; target: number; warning: number }[];
  customSli: { filterSegments: never[]; indicator: string };
}

const FLEET_ENTRY: Record<FleetSloKind, 'slo.hosts.cpu' | 'slo.hosts.memory' | 'slo.k8s.restarts'> = {
  hostCpu: 'slo.hosts.cpu',
  hostMemory: 'slo.hosts.memory',
  k8sRestarts: 'slo.k8s.restarts',
};

const isServiceKind = (kind: SloKind): kind is ServiceSloKind => kind === 'availability' || kind === 'performance';

/**
 * The indicator of one kind: a service SLO's rendered from the catalog's template with the service id (null for an id the
 * template refuses), a fleet SLO's the catalog entry itself (every host, every workload).
 */
export function sloIndicator(kind: SloKind, serviceId: string): string | null {
  if (!isServiceKind(kind)) return getQuery(FLEET_ENTRY[kind]).dql;
  return renderOrNull(getQuery(kind === 'availability' ? 'slo.availability' : 'slo.performance'), { serviceId });
}

/** The SLO the platform stores, or null when a service SLO's id is not one. Pure. */
export function buildSlo(kind: SloKind, serviceId: string, words: SloWords, targets: SloTargets): SloBody | null {
  const indicator = sloIndicator(kind, serviceId);
  if (indicator === null) return null;
  return {
    name: words.name.slice(0, 200),
    description: words.description.slice(0, 250),
    tags: [SLO_TAG],
    externalId: isServiceKind(kind) ? `${SLO_TAG}-${kind}-${serviceId.toLowerCase()}` : `${SLO_TAG}-${kind}`,
    criteria: [{ ...SLO_WINDOW, target: targets.target, warning: targets.warning }],
    customSli: { filterSegments: [], indicator },
  };
}

export interface TriageWords {
  title: string;
  description: string;
  triageDescription: string;
  taskDescription: string;
  /** 3.7.3: the Dynatrace Assist task — its description, the instruction it is given and the e-mail heading of its answer. */
  aiDescription?: string;
  aiPrompt?: string;
  aiHeading?: string;
}

/** 3.7.3: the platform's generative AI task (Davis CoPilot), as the lab's own workflows name it. */
export const AI_ACTION = 'dynatrace.davis.copilot.workflow.actions:davis-copilot';

/** 3.7.0: the app's own workflow action (`actions/poc-triage.action.ts`), as a workflow names it. */
export const TRIAGE_ACTION = 'my.poc.automation:poc-triage';

export interface EventTrigger {
  eventTrigger: {
    isActive: boolean;
    triggerConfiguration: { type: 'davis-problem'; value: Record<string, unknown> };
    uniqueExpression: string;
  };
}

/** 3.7.4: a schedule (the weekly summary's), as the platform's workflows write it. */
export interface ScheduleTrigger {
  schedule: {
    isActive: boolean;
    isFaulty: false;
    timezone: string;
    trigger: { type: 'cron'; cron: string };
    filterParameters: Record<string, never>;
    inputs: Record<string, never>;
  };
}

export interface WorkflowBody<T extends EventTrigger | ScheduleTrigger = EventTrigger | ScheduleTrigger> {
  title: string;
  description: string;
  isPrivate: boolean;
  trigger: T;
  tasks: Record<
    string,
    {
      name: string;
      action: string;
      description: string;
      input: Record<string, unknown>;
      position: { x: number; y: number };
      predecessors: string[];
      // 3.8.2: a custom condition (Jinja) and what happens when it is false — the capacity workflows act only on a risk.
      conditions?: { states: Record<string, 'OK' | 'ANY'>; custom?: string; else?: 'SKIP' };
    }
  >;
}

/** One problem opens one run: the expression the platform's own problem workflows use. */
const UNIQUE_PER_PROBLEM =
  '{{ event()["event.id"] }}-{{ "open" if event()["event.status"] == "ACTIVE" else "resolved" }}-{{ event()["dt.davis.last_reopen_timestamp"] }}';

const EMAIL = /^[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+$/;

/** The addresses in what the SE typed (commas, semicolons or spaces), valid ones only, at most 10, without repeats. */
export function parseRecipients(value: string): { valid: string[]; invalid: string[] } {
  const parts = value.split(/[\s,;]+/).map((part) => part.trim()).filter((part) => part !== '');
  const valid = [...new Set(parts.filter((part) => EMAIL.test(part)).map((part) => part.toLowerCase()))].slice(0, 10);
  const invalid = parts.filter((part) => !EMAIL.test(part));
  return { valid, invalid };
}

/** The problem-triage workflow: a problem trigger and one e-mail task. Pure. */
export function buildTriageWorkflow(words: TriageWords, recipients: readonly string[], active: boolean, shared: boolean, language: 'en' | 'pt-BR' = 'en'): WorkflowBody<EventTrigger> {
  return {
    title: words.title.slice(0, 200),
    description: words.description.slice(0, 500),
    isPrivate: !shared,
    trigger: {
      eventTrigger: {
        isActive: active,
        triggerConfiguration: {
          type: 'davis-problem',
          value: {
            analysisReady: true,
            categories: { availability: true, error: true, slowdown: true, resource: true, custom: true },
            customFilter: '',
            entityTags: {},
            entityTagsMatch: 'all',
            maintenanceWindowTriggerBehavior: 'always',
            onProblemClose: false,
            problemOpenDuration: null,
            severityThreshold: null,
            triggerOn: null,
            triggerOnUpdateFields: [],
          },
        },
        uniqueExpression: UNIQUE_PER_PROBLEM,
      },
    },
    // 3.7.0: the app's triage action reads the problem, its logs and the callers of its root cause; the e-mail sends its
    // subject and summary.
    tasks: {
      poc_triage: {
        name: 'poc_triage',
        action: TRIAGE_ACTION,
        description: words.triageDescription,
        input: { problemId: TRIAGE_PROBLEM_ID, language },
        position: { x: 0, y: 1 },
        predecessors: [],
      },
      // 3.7.3 (the owner: "criarmos no workflow um prompt_generative_ai … o Dynatrace Assist com I.A"): the platform's
      // generative AI reads the triage's summary and writes a short reading; the e-mail opens with it. The e-mail waits for
      // it in any state (ANY), so a tenant without generative AI still gets the triage.
      dynatrace_assist: {
        name: 'dynatrace_assist',
        action: AI_ACTION,
        description: words.aiDescription ?? '',
        input: { autoTrim: true, config: 'disabled', instruction: '', prompt: `${words.aiPrompt ?? ''}\n\n${TRIAGE_RESULT.summary}`, supplementary: '' },
        position: { x: 0, y: 2 },
        predecessors: ['poc_triage'],
        conditions: { states: { poc_triage: 'OK' } },
      },
      notify_team: {
        name: 'notify_team',
        action: 'dynatrace.email:send-email',
        description: words.taskDescription,
        input: {
          to: [...recipients],
          cc: [],
          bcc: [],
          subject: TRIAGE_RESULT.subject,
          // 3.7.4 (the owner): the problem first, Dynatrace Assist's reading after it.
          // 3.7.6 (the owner): the problem first, Dynatrace Assist's reading next, the links and the footer last.
          content:
            words.aiHeading === undefined
              ? TRIAGE_RESULT.summary
              : `${TRIAGE_RESULT.body}${TRIAGE_RULE}${words.aiHeading}\n\n${AI_ANSWER}${TRIAGE_RULE}${TRIAGE_RESULT.closing}`,
        },
        position: { x: 0, y: 3 },
        predecessors: ['dynatrace_assist'],
        conditions: { states: { dynatrace_assist: 'ANY' } },
      },
    },
  };
}

/** 3.7.4: the app's weekly summary action, as a workflow names it. */
export const WEEKLY_ACTION = 'my.poc.automation:poc-weekly';
/** Mondays at 09:00 (the SE's time zone). */
export const WEEKLY_CRON = '0 9 * * 1';

export interface WeeklyWords {
  title: string;
  description: string;
  weeklyDescription: string;
  aiDescription: string;
  aiPrompt: string;
  aiHeading: string;
  taskDescription: string;
}

/**
 * 3.7.4 (the owner: "resumo semanal da PoC por e-mail … algo robusto"): every Monday the app's weekly action reads the
 * week against the week before, Dynatrace Assist writes a short reading of it, and the e-mail sends the summary first and
 * the reading after it (as the triage's). Saved by the SE in Workflows, like the triage. Pure.
 */
export function buildWeeklyWorkflow(
  words: WeeklyWords,
  recipients: readonly string[],
  active: boolean,
  shared: boolean,
  language: 'en' | 'pt-BR',
  customer: string,
  timezone: string,
  dashboardId: string | null = null,
): WorkflowBody<ScheduleTrigger> {
  const weekly = (field: string) => `{{ result("poc_weekly")["${field}"] }}`;
  return {
    title: words.title.slice(0, 200),
    description: words.description.slice(0, 500),
    isPrivate: !shared,
    trigger: {
      schedule: {
        isActive: active,
        isFaulty: false,
        timezone: timezone === '' ? 'UTC' : timezone,
        trigger: { type: 'cron', cron: WEEKLY_CRON },
        filterParameters: {},
        inputs: {},
      },
    },
    tasks: {
      poc_weekly: {
        name: 'poc_weekly',
        action: WEEKLY_ACTION,
        description: words.weeklyDescription,
        input: { customer: customer.slice(0, 120), language, notebook: 'on', ...(dashboardId === null ? {} : { dashboardId }) },
        position: { x: 0, y: 1 },
        predecessors: [],
      },
      weekly_assist: {
        name: 'weekly_assist',
        action: AI_ACTION,
        description: words.aiDescription,
        input: { autoTrim: true, config: 'disabled', instruction: '', prompt: `${words.aiPrompt}\n\n${weekly('summary')}`, supplementary: '' },
        position: { x: 0, y: 2 },
        predecessors: ['poc_weekly'],
        conditions: { states: { poc_weekly: 'OK' } },
      },
      notify_team: {
        name: 'notify_team',
        action: 'dynatrace.email:send-email',
        description: words.taskDescription,
        input: {
          to: [...recipients],
          cc: [],
          bcc: [],
          subject: weekly('subject'),
          // 3.7.6 (the owner): the week first, Dynatrace Assist's reading next, the links and the footer last.
          content: `${weekly('body')}${TRIAGE_RULE}${words.aiHeading}\n\n${aiAnswer('weekly_assist')}${TRIAGE_RULE}${weekly('closing')}`,
        },
        position: { x: 0, y: 3 },
        predecessors: ['weekly_assist'],
        conditions: { states: { weekly_assist: 'ANY' } },
      },
    },
  };
}

/** The trigger's problem, handed to the triage action; the action's subject and summary, sent by the e-mail (Jinja). */
export const TRIAGE_PROBLEM_ID = '{{ event()["event.id"] }}';
const triageResult = (field: string) => `{{ result("poc_triage")["${field}"] }}`;
export const TRIAGE_RESULT = {
  subject: triageResult('subject'),
  summary: triageResult('summary'),
  body: triageResult('body'),
  closing: triageResult('closing'),
};
/** 3.7.3: the AI's answer, or nothing when the task did not answer (a tenant without generative AI). */
// 3.7.4: the platform appends a note on its language support after a "---" line (seen on the lab) — only the reading is kept.
export const AI_ANSWER = aiAnswer('dynatrace_assist');

/** A generative AI task's answer, without the platform's own note after "---", or "—" when the task did not answer. */
export function aiAnswer(task: string): string {
  return `{{ (result("${task}").text | default("—")).split("---")[0] | trim }}`;
}

interface Created {
  id: string;
}

async function bodyOf<T>(response: { body: (type?: 'json') => unknown }): Promise<T> {
  return (await response.body('json')) as T;
}

/** Creates an SLO on the tenant; returns its id. */
export async function createSlo(body: SloBody): Promise<string> {
  const response = await httpClient.send({ url: SLO_API, method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
  return (await bodyOf<Created>(response)).id;
}

/** The SLOs on the environment (id and name), the platform's own list — up to 500, the page the SLO API serves. */
export async function listSlos(): Promise<{ id: string; name: string }[]> {
  const page = await bodyOf<{ slos?: { id?: unknown; name?: unknown }[] }>(await httpClient.send({ url: `${SLO_API}?page-size=500`, method: 'GET' }));
  return (page.slos ?? []).flatMap((slo) => (typeof slo.id === 'string' ? [{ id: slo.id, name: typeof slo.name === 'string' ? slo.name : '' }] : []));
}

/**
 * 3.7.2: the SLO references with their whole id. 3.6.9–3.7.1 kept only an SLO id's first 100 characters (the owner's
 * overview dashboard read cut ids); a cut id is matched to the one SLO on the environment that starts with it. Pure but for
 * the list it is handed.
 */
export function wholeSloIds<T extends { id: string }>(refs: readonly T[], onEnvironment: readonly { id: string; name?: string }[]): { refs: T[]; changed: boolean } {
  let changed = false;
  const whole = refs.map((ref) => {
    if (ref.id.length !== CUT_SLO_ID) return ref;
    const matches = onEnvironment.filter((slo) => slo.id.length > CUT_SLO_ID && slo.id.startsWith(ref.id));
    // 3.7.3: two SLOs may share the first 100 characters (the lab had two such pairs) — the name the plan kept decides.
    const named = 'name' in ref ? matches.filter((slo) => 'name' in slo && slo.name === (ref as { name?: unknown }).name) : [];
    const match = matches.length === 1 ? matches[0] : named.length === 1 ? named[0] : undefined;
    if (match === undefined) return ref;
    changed = true;
    return { ...ref, id: match.id };
  });
  return { refs: whole, changed };
}

/** Removes an SLO (its current version first: the platform's optimistic lock). */
export async function deleteSlo(id: string): Promise<void> {
  const url = `${SLO_API}/${encodeURIComponent(id)}`;
  const current = await bodyOf<{ version: string }>(await httpClient.send({ url, method: 'GET' }));
  await httpClient.send({ url: `${url}?optimistic-locking-version=${encodeURIComponent(current.version)}`, method: 'DELETE' });
}

/**
 * Hands the workflow to the platform's Workflows app (its intent "Create a new workflow": a title, tasks and a trigger), which
 * opens it in its editor for the SE to save — with the SE's own permissions. A custom app may not hold
 * `automation:workflows:write` (the platform refused the 3.6.9 install with it on 2026-11-22: "Only apps that are provided
 * by Dynatrace can use the 'automation:workflows:write' scope"), so the Workflows app writes it, as dtctl does with the
 * user's own token.
 */
export function openInWorkflows(body: WorkflowBody): void {
  sendIntent({ title: body.title, description: body.description, isPrivate: body.isPrivate, trigger: body.trigger, tasks: body.tasks });
}

/** The same workflow as a file the Workflows app imports (Upload), for an environment where the intent is not offered. */
export function workflowFile(body: WorkflowBody): Blob {
  return new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
}

/** Removes a document this PoC created (a dashboard, the notebook, the launchpad) at its current version. */
export async function deletePocDocument(id: string): Promise<void> {
  const metadata = await documentsClient.getDocumentMetadata({ id });
  await documentsClient.deleteDocument({ id, optimisticLockingVersion: metadata.version });
}

// ------------------------------------------------------------------ 3.7.3 — HTTP monitors from the customer's URLs

const SYNTHETIC_API = '/platform/classic/environment-api/v2/synthetic';

export interface SyntheticLocation {
  id: string;
  name: string;
  city: string;
  /** 3.7.8: what the location runs (`BROWSER`, `HTTP`…), when the platform says; empty when it does not. */
  capabilities: string[];
}

/** The public synthetic locations the environment offers (enabled ones), by name. */
export async function listPublicLocations(): Promise<SyntheticLocation[]> {
  const page = await bodyOf<{ locations?: { entityId?: unknown; name?: unknown; city?: unknown; type?: unknown; status?: unknown; capabilities?: unknown }[] }>(
    // eslint-disable-next-line noSecrets/no-secrets -- an API path, not a secret
    await httpClient.send({ url: `${SYNTHETIC_API}/locations?type=PUBLIC`, method: 'GET' }),
  );
  return (page.locations ?? [])
    .filter((location) => typeof location.entityId === 'string' && location.type === 'PUBLIC' && (location.status === undefined || location.status === 'ENABLED'))
    .map((location) => ({
      id: String(location.entityId),
      name: typeof location.name === 'string' ? location.name : String(location.entityId),
      city: typeof location.city === 'string' ? location.city : '',
      capabilities: Array.isArray(location.capabilities) ? location.capabilities.filter((entry): entry is string => typeof entry === 'string') : [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The location a monitor runs from by default: one in São Paulo when the environment offers it, else the first. */
export function defaultLocation(locations: readonly SyntheticLocation[]): SyntheticLocation | null {
  return locations.find((location) => /s[ãa]o paulo/i.test(`${location.name} ${location.city}`)) ?? locations[0] ?? null;
}

export interface HttpMonitorBody {
  type: 'HTTP';
  name: string;
  description: string;
  enabled: boolean;
  frequencyMin: number;
  locations: string[];
  steps: { name: string; url: string; methodType: 'GET'; constraints: never[]; requestTimeout: number }[];
  syntheticMonitorOutageHandlingSettings: { globalOutages: boolean; localOutages: boolean; globalConsecutiveOutageCountThreshold: number };
  tags: { key: string; context: 'CONTEXTLESS'; source: 'USER' }[];
}

export const MONITOR_FREQUENCIES = [5, 10, 15, 30, 60] as const;

/**
 * An HTTP monitor of one address: a GET that fails on an error status (the platform's default), from one public location,
 * every `frequencyMin` minutes, alerting when it is down everywhere; tagged `poc-automation`. Pure.
 */
export function buildHttpMonitor(name: string, url: string, locationId: string, frequencyMin: number, description: string): HttpMonitorBody {
  return {
    type: 'HTTP',
    name: name.slice(0, 200),
    description: description.slice(0, 500),
    enabled: true,
    frequencyMin,
    locations: [locationId],
    steps: [{ name: url.slice(0, 200), url, methodType: 'GET', constraints: [], requestTimeout: 60 }],
    syntheticMonitorOutageHandlingSettings: { globalOutages: true, localOutages: false, globalConsecutiveOutageCountThreshold: 1 },
    tags: [{ key: SLO_TAG, context: 'CONTEXTLESS', source: 'USER' }],
  };
}

/**
 * 3.7.8 (the owner: "mudar de HTTP Monitor para Browser Monitor … gera mais métricas e a captura de imagem do site"): a browser
 * monitor of one address — a real Chromium loading the page from one public location (Core Web Vitals, the page's resources,
 * a screenshot when it fails), on a desktop screen, every `frequencyMin` minutes, alerting when it is down everywhere (one
 * retry on error); tagged `poc-automation`. The Synthetic monitors API v2 (`type: BROWSER`, a `NAVIGATE` step) under the scope
 * the HTTP monitors already use. Pure.
 */
export interface BrowserMonitorBody {
  type: 'BROWSER';
  name: string;
  description: string;
  enabled: boolean;
  frequencyMin: number;
  locations: string[];
  configuration: { device: { name: string; width: number; height: number } };
  steps: { type: 'NAVIGATE'; name: string; url: string }[];
  syntheticMonitorOutageHandlingSettings: { globalOutages: boolean; localOutages: boolean; globalConsecutiveOutageCountThreshold: number; retryOnError: boolean };
  tags: { key: string; context: 'CONTEXTLESS'; source: 'USER' }[];
}

export const BROWSER_DEVICE = { name: 'Desktop', width: 1920, height: 1080 } as const;

export function buildBrowserMonitor(name: string, url: string, locationId: string, frequencyMin: number, description: string, stepName: string): BrowserMonitorBody {
  return {
    type: 'BROWSER',
    name: name.slice(0, 200),
    description: description.slice(0, 500),
    enabled: true,
    frequencyMin,
    locations: [locationId],
    configuration: { device: { ...BROWSER_DEVICE } },
    steps: [{ type: 'NAVIGATE', name: stepName.slice(0, 200), url }],
    syntheticMonitorOutageHandlingSettings: { globalOutages: true, localOutages: false, globalConsecutiveOutageCountThreshold: 1, retryOnError: true },
    tags: [{ key: SLO_TAG, context: 'CONTEXTLESS', source: 'USER' }],
  };
}

/** The locations a monitor of this type can run from: a browser monitor needs one that says it runs browsers. */
export function locationsFor(type: 'HTTP' | 'BROWSER', locations: readonly SyntheticLocation[]): SyntheticLocation[] {
  return locations.filter((location) => location.capabilities.length === 0 || location.capabilities.includes(type));
}

/** Creates the monitor; returns its entity id (`HTTP_CHECK-…`). */
export async function createHttpMonitor(body: HttpMonitorBody | BrowserMonitorBody): Promise<string> {
  const response = await httpClient.send({ url: `${SYNTHETIC_API}/monitors`, method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
  return (await bodyOf<{ entityId: string }>(response)).entityId;
}

/** Removes a monitor this PoC created. */
export async function deleteHttpMonitor(id: string): Promise<void> {
  await httpClient.send({ url: `${SYNTHETIC_API}/monitors/${encodeURIComponent(id)}`, method: 'DELETE' });
}

/** The platform's Synthetic app, where each monitor opens. */
// 3.7.6: absolute addresses on the tenant (`platformUrl`) — a relative `/ui/apps/…` resolved inside this app and fell on its
// "not part of the app" page (the owner's OpenPipeline link). The app ids were read from the tenant's app list (2026-11-23).
export const MONITOR_APP_LINK = platformUrl('dynatrace.synthetic/') ?? '';

/** Where each thing the PoC created opens on the environment. */
// 3.7.6: the SLO app is `dynatrace.service.level.objectives` (no `dynatrace.site.reliability` app is installed); an SLO opens
// through its documented intent `view-slo` with `dt.slo.id`.
export const sloLink = (id: string) =>
  platformUrl(`dynatrace.service.level.objectives/intent/view-slo#${encodeURIComponent(JSON.stringify({ 'dt.slo.id': id }))}`) ?? '';

/** A failed request's HTTP status, when the error carries one. */
export function statusOf(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const record = error as { response?: { status?: unknown }; status?: unknown };
  const status = record.response?.status ?? record.status;
  return typeof status === 'number' ? status : null;
}
