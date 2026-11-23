import type { StringKey } from '../../../../i18n/strings';
import { buildProblemLink } from '../../../../models/rca';
import { summariseRootCallers, type RootCaller } from '../../../../models/trailLinks';
import {
  FAILED_REQUESTS_EVIDENCE,
  FAILED_REQUESTS_PATH,
  SMARTSCAPE_SERVICES_EVIDENCE,
  SMARTSCAPE_SERVICES_PATH,
  VULNERABILITIES_PATH,
  entityLinkEvidence,
  entityType,
  frontendPath,
  hostUrl,
  k8sClusterPath,
  logsFilterPath,
  servicePath,
} from '../../../../utils/deepLinks';
import { bool, str } from '../../../../utils/records';
import { formatCount, formatPct, formatRatio, windowLabel } from '../analysis/sourced';
import { LIMITS } from '../constants';
import type {
  EvidenceWindow,
  I18nText,
  IncidentSnapshot,
  LayoutKey,
  LinkCheck,
  LinkEvidenceLevel,
  ShotCandidate,
  ShotKind,
  ShotPlan,
  ShotSlot,
  ShotSubject,
} from '../types';
import { applyLinkChecks, urlTemplateKey } from './linkChecks';
import { resolveAnchors, type AnchorFacts } from './pinTemplates';
import type { PlannerInputs } from './usePlannerInputs';

/**
 * The shot planner ("Roteiro de prints", 3.2.7, spec §3): which real Dynatrace screen proves each
 * point of this PoC, chosen from the PoC's own data.
 *
 * Pure and deterministic: the catalog reads, the incident's planning-grade evidence (its Davis
 * events and the callers of its root cause over the incident window W), this tenant's link checks
 * and the SE's overrides in, a `ShotPlan` out — at most ten planned screens in deck order plus six
 * of the SE's own. Every slot carries the address to open, a numbered "why" whose numbers state
 * their window, up to five alternates, the evidence level of its address and the on-screen labels
 * the companion must find. Entities are chosen, ranked and de-duplicated by id, never by name (the
 * lab has two TradeManagement and two BrokerService), and no time is ever read from a Davis
 * `event.id`. An omitted slot always says why (`prt.why.none.*`).
 *
 * On the P-260914359 lab fixture the first three addresses are byte-identical to the owner's
 * links: the problem, its database root cause shown through easyTradeManager (341 of the 360
 * caller failures in W), and the affected frontend on its Experience Vitals page.
 */

export interface CustomShot {
  url: string;
  /** `prt.title.custom` with `{title}`. */
  titleText: I18nText;
  titleRaw: string;
  layout: 'free';
}

export interface PlanOverrides {
  /** Slot ids the SE left out. */
  excluded: readonly string[];
  /** Probe-only slot ids the SE included anyway ("Incluir mesmo assim"): the identity anchor becomes mandatory. */
  forced: readonly string[];
  /**
   * "Trocar entidade": the entity id to show instead, keyed by the slot's kind (or by its default
   * slot id). The problem is not swapped here: the whole plan re-centres on another incident
   * through `usePlannerInputs(preferredIncident)`, so the root cause and the windows follow it.
   */
  swapped: Readonly<Record<string, string>>;
  /** The SE's own screens, ≤ 6. */
  custom: readonly CustomShot[];
  /** The host screen (documented link, never opened here) is listed only on request or for a host root cause. */
  hostOptIn: boolean;
}

export const NO_OVERRIDES: PlanOverrides = { excluded: [], forced: [], swapped: {}, custom: [], hostOptIn: false };

/** Commercial screens never enter a deck (the same list as the companion's `SAFETY.commercialDeny`). */
export const COMMERCIAL_DENY = /(licen[cs]|billing|subscription|cost|consumption|\bdps\b|account-?management|pricing)/i;

/** An intent address must name its intent (`/ui/intent/<app>/<intent>`), as the companion requires. */
const INTENT_PATH = /^\/ui\/intent\/[a-z0-9.]+\/[A-Za-z0-9_.-]+$/;
const MAX_URL_LENGTH = 2048;
const MAX_ALTERNATES = 5;
const CUSTOM_TITLE_MAX = 70;
/** A service below this many requests has no stable failure rate: it never leads the excess ranking. */
export const FAILING_MIN_REQUESTS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const DASH = '—';

/** Deck order. */
const ORDER: Readonly<Record<ShotKind, number>> = {
  problem: 1,
  'root-cause': 2,
  frontend: 3,
  'k8s-cluster': 4,
  'failing-service': 5,
  'failed-requests': 6,
  'logs-errors': 7,
  smartscape: 8,
  vulnerabilities: 9,
  host: 10,
  custom: 11,
};

export const LAYOUT_OF: Readonly<Record<ShotKind, LayoutKey>> = {
  problem: 'problems.detail',
  'root-cause': 'services.details',
  frontend: 'vitals.web',
  'k8s-cluster': 'k8s.cluster',
  'failing-service': 'services.details',
  'failed-requests': 'tracing.failedList',
  'logs-errors': 'logs.filter',
  smartscape: 'smartscape.services',
  vulnerabilities: 'vulns.list',
  host: 'infraops.host',
  custom: 'free',
};

/** How long the companion waits after the page is quiet (ms). */
export const SETTLE_MS: Readonly<Record<ShotKind, number>> = {
  problem: 3500,
  'root-cause': 3500,
  frontend: 3000,
  'k8s-cluster': 3000,
  'failing-service': 3500,
  'failed-requests': 3000,
  'logs-errors': 3000,
  smartscape: 3500,
  vulnerabilities: 3000,
  host: 3500,
  custom: 2500,
};

// ------------------------------------------------------------------ ids

/** `${kind}--${entityKey}`, lower-case, within the companion's id pattern (`SHOT_ID`). */
export function shotId(kind: ShotKind, entityKey: string): string {
  const key = entityKey
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${kind}--${key === '' ? 'none' : key}`.slice(0, 64);
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

/**
 * SHA-256 of a UTF-8 string, as hex, synchronously (FIPS 180-4). The plan id and the custom shot
 * ids are needed while the plan is built, which is synchronous; `planIdOf` gives the same digest
 * through `crypto.subtle`, and a test holds the two equal.
 */
export function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const blocks = Math.ceil((bytes.length + 9) / 64);
  const data = new Uint8Array(blocks * 64);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  const bits = bytes.length * 8;
  view.setUint32(data.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(data.length - 4, bits >>> 0);
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array<number>(64).fill(0);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i += 1) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + (SHA256_K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, index) => {
      hash[index] = ((hash[index] ?? 0) + value) >>> 0;
    });
  }
  return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
}

/** The canonical JSON the plan id is the digest of: the tenant and every planned screen `{ id, url }`, sorted by id. */
export function canonicalPlanJson(tenantHost: string, slots: readonly Pick<ShotSlot, 'id' | 'chosen'>[]): string {
  const shots = slots
    .flatMap((slot) => (slot.chosen === null ? [] : [{ id: slot.id, url: slot.chosen.url }]))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify({ tenantHost: tenantHost.toLowerCase(), shots });
}

/**
 * 12 hex of sha256(canonical JSON), through `crypto.subtle`. Stable under reordering and under the
 * SE ticking slots in or out (it covers every planned screen, not the exported subset), so every
 * export of one plan — "Só pendentes" included — carries the same id.
 */
export async function planIdOf(tenantHost: string, slots: readonly ShotSlot[]): Promise<string> {
  const json = canonicalPlanJson(tenantHost, slots);
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) return sha256Hex(json).slice(0, 12);
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(json));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

// ------------------------------------------------------------------ custom addresses

/**
 * An address the SE typed: https, this tenant, a `/ui/` page, no credentials, ≤ 2048 characters,
 * never `/ui/entity/` or an intent without its id (both land on the launcher), never a licensing,
 * billing or cost screen (`prt.err.commercial`).
 */
export function validateCustomUrl(url: string, tenantHost: string): { ok: true } | { ok: false; reason: StringKey } {
  const refuse = (reason: StringKey) => ({ ok: false as const, reason });
  if (typeof url !== 'string' || url.length === 0 || url.length > MAX_URL_LENGTH) return refuse('prt.err.customUrl');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return refuse('prt.err.customUrl');
  }
  if (parsed.protocol !== 'https:') return refuse('prt.err.customUrl');
  if (tenantHost === '' || parsed.host.toLowerCase() !== tenantHost.toLowerCase()) return refuse('prt.err.customUrl');
  if (parsed.username !== '' || parsed.password !== '') return refuse('prt.err.customUrl');
  if (!parsed.pathname.startsWith('/ui/') || parsed.pathname.startsWith('/ui/entity/')) return refuse('prt.err.customUrl');
  if (parsed.pathname.startsWith('/ui/intent/') && !INTENT_PATH.test(parsed.pathname)) return refuse('prt.err.customUrl');
  let decoded: string;
  try {
    decoded = decodeURIComponent(`${parsed.pathname}${parsed.hash}`);
  } catch {
    return refuse('prt.err.customUrl');
  }
  return COMMERCIAL_DENY.test(decoded) ? refuse('prt.err.commercial') : { ok: true };
}

export { urlTemplateKey };

// ------------------------------------------------------------------ helpers

/**
 * The problem link's window: 15 days, or the problem's age plus 2 days when it is older (≤ 30), so
 * the Problems app still lists it. `min(30, max(15, ceil(ageDays) + 2))`.
 */
export function problemWindowDays(startIso: string, now: number): number {
  const start = Date.parse(startIso);
  const ageDays = Number.isFinite(start) ? Math.max(0, (now - start) / DAY_MS) : 0;
  return Math.min(30, Math.max(15, Math.ceil(ageDays) + 2));
}

interface Formatter {
  count: (value: number | null | undefined) => string;
  pct: (value: number | null | undefined) => string;
  ratio: (value: number | null | undefined) => string;
  window: (window: EvidenceWindow | null) => string;
  duration: (ns: number | null) => string;
}

function formatterFor(inputs: Pick<PlannerInputs, 'locale' | 'timeZone'>): Formatter {
  const { locale, timeZone } = inputs;
  const known = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
  return {
    count: (value) => (known(value) ? formatCount(value, locale) : DASH),
    pct: (value) => (known(value) ? formatPct(value, locale) : DASH),
    ratio: (value) => (known(value) && value > 0 ? formatRatio(value, locale) : DASH),
    window: (window) => (window === null ? DASH : windowLabel(window, locale, timeZone)),
    duration: (ns) => {
      if (!known(ns) || ns < 0) return DASH;
      const minutes = ns / 60e9;
      if (minutes < 120) return `${formatCount(Math.max(1, Math.round(minutes)), locale)} min`;
      const hours = minutes / 60;
      if (hours < 48) return `${formatCount(Math.round(hours * 10) / 10, locale)} h`;
      return `${formatCount(Math.round(hours / 24), locale)} d`;
    },
  };
}

/** The first event of each source, from the incident's Davis events (B1); the problem row itself is skipped. */
function incidentEvents(inputs: PlannerInputs): { name: string; source: string; sourceName: string | null; startMs: number }[] {
  const result = inputs.problemEvents;
  if (result.outcome !== 'ok' && result.outcome !== 'partial') return [];
  return result.records
    .filter((record) => bool(record, 'isProblem') !== true)
    .map((record) => ({
      name: str(record, 'event.name') ?? '',
      source: str(record, 'source') ?? '',
      sourceName: str(record, 'sourceName'),
      startMs: Date.parse(str(record, 'event.start') ?? ''),
    }))
    .filter((event) => event.name !== '' && Number.isFinite(event.startMs))
    .sort((a, b) => a.startMs - b.startMs);
}

/** A planned candidate with what the slot needs once it is chosen. */
interface Candidate extends ShotCandidate {
  /** The entity part of the shot id. */
  key: string;
  subject: ShotSubject;
  title: I18nText;
  facts: AnchorFacts;
  incident: IncidentSnapshot | null;
}

interface Draft {
  kind: Exclude<ShotKind, 'custom'>;
  /** Best first; unique by entity id. */
  candidates: Candidate[];
  /** Why the slot is empty when no candidate exists. */
  reason: StringKey;
  emptyTitle: I18nText;
  incident: IncidentSnapshot | null;
  /** The problem re-centres the whole plan instead (`usePlannerInputs(preferredIncident)`). */
  swappable: boolean;
}

const text = (key: StringKey, params: Record<string, string> = {}): I18nText => ({ key, params });

function uniqueById(candidates: readonly (Candidate | null)[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const candidate of candidates) {
    if (candidate === null) continue;
    const id = candidate.entityId;
    if (id !== null) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(candidate);
  }
  return out;
}

const appUrl = (tenantHost: string, path: string | null): string | null => (path === null ? null : `https://${tenantHost}/ui/apps/${path}`);

/** A shell address built against the environment base (the host intent), moved onto the plan's tenant. */
function shellUrl(tenantHost: string, absolute: string | null): string | null {
  if (absolute === null) return null;
  const at = absolute.indexOf('/ui/');
  return at < 0 ? null : `https://${tenantHost}${absolute.slice(at)}`;
}

function candidate(
  base: Omit<Candidate, 'url' | 'evidence'> & { url: string | null; evidence?: LinkEvidenceLevel | null },
): Candidate | null {
  if (base.url === null) return null;
  return { ...base, url: base.url, evidence: base.evidence ?? 'guessed' };
}

// ------------------------------------------------------------------ drafts, in deck order

/** Why the incident slots are empty: refused, unreadable ("no data", never "no problem"), or truly no root-caused problem in 15 d. */
function noIncidentReason(inputs: PlannerInputs): StringKey {
  if (inputs.denied.includes('rca.top')) return 'prt.why.none.noPermission';
  return inputs.failed.includes('rca.top') ? 'prt.why.none.noData' : 'prt.why.none.noIncident';
}

function problemDraft(inputs: PlannerInputs, fmt: Formatter): Draft {
  const { incident } = inputs;
  const empty = { kind: 'problem' as const, emptyTitle: text('prt.title.problem.none'), incident, swappable: false };
  if (incident === null) return { ...empty, candidates: [], reason: noIncidentReason(inputs) };
  const events = incidentEvents(inputs);
  const frontendApp = incident.affectedIds.find((id) => entityType(id) === 'APPLICATION') ?? null;
  const frontendName =
    frontendApp === null ? null : (inputs.frontendRows.find((row) => row.applicationId === frontendApp)?.name ?? events.find((event) => event.source === frontendApp)?.sourceName ?? null);
  const firstRootEventName = events.find((event) => event.source === incident.rootCauseId)?.name ?? null;
  const candidates = [incident, ...inputs.others].map((snapshot, index) => {
    // A problem still open has no end (`event.end` is null while ACTIVE): it is "open for", not "lasted" (3.2.7 review UX-L2).
    const open = snapshot.endIso === null;
    const started = Date.parse(snapshot.startIso);
    const durationNs = snapshot.durationNs ?? (open && Number.isFinite(started) ? (inputs.now - started) * 1e6 : null);
    const top = snapshot.displayId === inputs.topIncidentId;
    return candidate({
      entityId: snapshot.displayId,
      entityName: snapshot.name,
      url: appUrl(inputs.tenantHost, buildProblemLink(snapshot.eventId, snapshot.displayId, problemWindowDays(snapshot.startIso, inputs.now))),
      evidence: 'verified',
      // "The most impactful" only for rca.top's first problem: a plan the SE re-centred on another
      // problem lists the most impactful one among the alternates.
      why: text(top ? (open ? 'prt.why.problem.open' : 'prt.why.problem') : open ? 'prt.why.problem.other.open' : 'prt.why.problem.other', {
        id: snapshot.displayId,
        name: snapshot.name,
        root: snapshot.rootCauseName ?? snapshot.rootCauseId ?? DASH,
        count: fmt.count(snapshot.affectedIds.length),
        duration: fmt.duration(durationNs),
      }),
      key: snapshot.displayId,
      subject: { kind: 'incident' },
      title: text('prt.title.problem', { id: snapshot.displayId }),
      facts: index === 0 ? { displayId: snapshot.displayId, frontendName, firstRootEventName } : { displayId: snapshot.displayId },
      incident: snapshot,
    });
  });
  return { ...empty, candidates: uniqueById(candidates), reason: 'prt.why.none.noData' };
}

function callersOf(inputs: PlannerInputs): RootCaller[] | null {
  const result = inputs.callers;
  if (result.outcome !== 'ok' && result.outcome !== 'partial') return null;
  const summary = summariseRootCallers(result.records);
  if (summary.rootType !== 'DATABASE_SERVICE' || summary.callers.length === 0) return null;
  // Most failures in W, then most requests, then id: the order the DQL sorts, made total.
  return [...summary.callers].sort((a, b) => (b.failures ?? 0) - (a.failures ?? 0) || (b.requests ?? 0) - (a.requests ?? 0) || a.id.localeCompare(b.id));
}

function rootCauseDraft(inputs: PlannerInputs, fmt: Formatter): Draft {
  const { incident } = inputs;
  const empty = { kind: 'root-cause' as const, emptyTitle: incident !== null && (incident.rootCauseName ?? '').trim() !== '' ? text('prt.title.rootCause', { name: incident.rootCauseName ?? '' }) : text('prt.title.rootCause.none'), incident, swappable: true, candidates: [] };
  if (incident === null) return { ...empty, reason: noIncidentReason(inputs) };
  const rootId = incident.rootCauseId;
  const rootType = entityType(rootId);
  // A host root cause is shown by the host slot (documented link, probe-only).
  if (rootType === 'HOST') return { ...empty, reason: 'prt.why.none.dedup' };
  if (rootType !== 'SERVICE' || rootId === null) return { ...empty, reason: rootId === null ? 'prt.why.none.noData' : 'prt.why.none.noPage' };
  const rootName = incident.rootCauseName ?? rootId;
  const callers = callersOf(inputs);
  if (callers !== null) {
    const totalFailures = callers.reduce((sum, caller) => sum + (caller.failures ?? 0), 0);
    const candidates = callers.map((caller, index) =>
      candidate({
        entityId: caller.id,
        entityName: caller.name,
        url: appUrl(inputs.tenantHost, servicePath(caller.id)),
        evidence: entityLinkEvidence(caller.id),
        why: text(index === 0 ? 'prt.why.rootDb' : 'prt.why.rootDb.other', {
          root: rootName,
          caller: caller.name,
          failures: fmt.count(caller.failures),
          requests: fmt.count(caller.requests),
          share: totalFailures > 0 && caller.failures !== null ? fmt.pct((100 * caller.failures) / totalFailures) : DASH,
          window: fmt.window(inputs.incidentWindow),
        }),
        key: caller.id,
        subject: { kind: 'service', serviceId: caller.id, role: 'root-caller' },
        // The root cause is the database; the caller is only the page that shows it (the why-line
        // and the pin say so). "Root cause · easyTradeManager" would name the wrong entity.
        title: text('prt.title.rootCause', { name: rootName }),
        facts: { entityName: caller.name },
        incident,
      }),
    );
    return { ...empty, candidates: uniqueById(candidates), reason: 'prt.why.none.noData' };
  }
  // Not a database (or its callers could not be read): the root service's own page.
  const self = candidate({
    entityId: rootId,
    entityName: rootName,
    url: appUrl(inputs.tenantHost, servicePath(rootId)),
    evidence: entityLinkEvidence(rootId),
    why: text('prt.why.rootSvc', { id: incident.displayId, root: rootName }),
    key: rootId,
    subject: { kind: 'service', serviceId: rootId, role: 'root' },
    title: text('prt.title.rootCause', { name: rootName }),
    facts: { entityName: rootName },
    incident,
  });
  return { ...empty, candidates: uniqueById([self]), reason: 'prt.why.none.noData' };
}

function frontendDraft(inputs: PlannerInputs, fmt: Formatter): Draft {
  const { incident } = inputs;
  const events = incidentEvents(inputs);
  const rows = inputs.frontendRows
    .filter((row) => entityType(row.applicationId) === 'APPLICATION' && entityType(row.frontendId) === 'FRONTEND')
    .sort((a, b) => b.requests - a.requests || a.frontendId.localeCompare(b.frontendId));
  const list: (Candidate | null)[] = [];
  const appId = incident?.affectedIds.find((id) => entityType(id) === 'APPLICATION') ?? null;
  if (incident !== null && appId !== null) {
    const mapped = inputs.frontendIds.get(appId) ?? rows.find((row) => row.applicationId === appId)?.frontendId ?? null;
    const frontendId = entityType(mapped) === 'FRONTEND' ? mapped : null;
    const name = rows.find((row) => row.applicationId === appId)?.name ?? events.find((event) => event.source === appId)?.sourceName ?? appId;
    const entityId = frontendId ?? appId;
    list.push(
      candidate({
        entityId,
        entityName: name,
        // Without a FRONTEND mapping, the verified Experience Vitals intent on the APPLICATION id.
        url: appUrl(inputs.tenantHost, frontendPath(appId, frontendId)),
        evidence: entityLinkEvidence(entityId),
        why: text('prt.why.frontend.incident', { frontend: name, id: incident.displayId }),
        key: entityId,
        subject: { kind: 'frontend', frontendId: frontendId ?? '', applicationId: appId, incidentBound: true },
        title: text('prt.title.frontend', { name }),
        facts: { frontendName: name },
        incident,
      }),
    );
  }
  const busiestFirst = list.length === 0;
  rows.forEach((row, index) => {
    list.push(
      candidate({
        entityId: row.frontendId,
        entityName: row.name,
        url: appUrl(inputs.tenantHost, frontendPath(row.applicationId, row.frontendId)),
        evidence: entityLinkEvidence(row.frontendId),
        why: text(busiestFirst && index === 0 ? 'prt.why.frontend.busiest' : 'prt.why.frontend.other', { frontend: row.name, requests: fmt.count(row.requests) }),
        key: row.frontendId,
        subject: { kind: 'frontend', frontendId: row.frontendId, applicationId: row.applicationId, incidentBound: false },
        title: text('prt.title.frontend', { name: row.name }),
        facts: { frontendName: row.name },
        incident: null,
      }),
    );
  });
  return {
    kind: 'frontend',
    candidates: uniqueById(list),
    reason: inputs.denied.includes('rum.frontend.ids') ? 'prt.why.none.noPermission' : 'prt.why.none.noData',
    emptyTitle: text('prt.title.frontend.none'),
    incident: null,
    swappable: true,
  };
}

function k8sDraft(inputs: PlannerInputs, fmt: Formatter): Draft {
  const { incident } = inputs;
  const rows = inputs.clusterRows.filter((row) => entityType(row.clusterId) === 'K8S_CLUSTER');
  // Every id of a name, in the map's order: a name mapped to two ids keeps the second as an alternate.
  const idsOf = (name: string): string[] => {
    const ids = rows.filter((row) => row.clusterName === name).map((row) => row.clusterId);
    const mapped = inputs.clusterIds.get(name);
    return ids.length > 0 ? ids : mapped !== undefined && entityType(mapped) === 'K8S_CLUSTER' ? [mapped] : [];
  };
  const make = (clusterName: string, clusterId: string, why: I18nText, incidentBound: boolean) =>
    candidate({
      entityId: clusterId,
      entityName: clusterName,
      url: appUrl(inputs.tenantHost, k8sClusterPath(clusterId)),
      evidence: entityLinkEvidence(clusterId),
      why,
      key: clusterId,
      subject: { kind: 'k8s-cluster', clusterId, clusterName, incidentBound },
      title: text('prt.title.k8s', { name: clusterName }),
      facts: { clusterName },
      incident: incidentBound ? incident : null,
    });
  const list: (Candidate | null)[] = [];
  for (const name of incident?.clusters ?? []) {
    for (const id of idsOf(name)) list.push(make(name, id, text('prt.why.k8s.incident', { cluster: name, id: incident?.displayId ?? DASH }), true));
  }
  for (const row of inputs.k8sPressure) {
    for (const id of idsOf(row.cluster)) {
      list.push(make(row.cluster, id, text('prt.why.k8s.pressure', { cluster: row.cluster, workload: row.workload, oom: fmt.count(row.totalOom) }), false));
    }
  }
  for (const row of rows) list.push(make(row.clusterName, row.clusterId, text('prt.why.k8s.other', { cluster: row.clusterName }), false));
  return {
    kind: 'k8s-cluster',
    candidates: uniqueById(list),
    reason: inputs.denied.includes('k8s.cluster.ids') ? 'prt.why.none.noPermission' : 'prt.why.none.noData',
    emptyTitle: text('prt.title.k8s.none'),
    incident: null,
    swappable: true,
  };
}

/** `excess = failures − requests × envRate` over `svc.ranking` (≥ 500 requests), highest first, by id. */
export function excessRanking(
  services: PlannerInputs['services'],
  totals: PlannerInputs['svcTotals'],
): { envRate: number | null; rows: (PlannerInputs['services'][number] & { excess: number; timesEnv: number | null })[] } {
  const envRate = totals !== null && totals.requests > 0 ? totals.failures / totals.requests : null;
  if (envRate === null) return { envRate, rows: [] };
  const rows = services
    .filter((row) => entityType(row.id) === 'SERVICE' && row.requests >= FAILING_MIN_REQUESTS)
    .map((row) => ({ ...row, excess: row.failures - row.requests * envRate, timesEnv: envRate > 0 ? row.failures / row.requests / envRate : null }))
    .filter((row) => row.excess > 0)
    .sort((a, b) => b.excess - a.excess || a.id.localeCompare(b.id));
  return { envRate, rows };
}

function failingDraft(inputs: PlannerInputs, fmt: Formatter): Draft {
  const { rows } = excessRanking(inputs.services, inputs.svcTotals);
  const candidates = rows.map((row, index) =>
    candidate({
      entityId: row.id,
      entityName: row.name,
      url: appUrl(inputs.tenantHost, servicePath(row.id)),
      evidence: entityLinkEvidence(row.id),
      why: text(index === 0 ? 'prt.why.failing' : 'prt.why.failing.other', {
        name: row.name,
        failures: fmt.count(row.failures),
        requests: fmt.count(row.requests),
        rate: fmt.pct((100 * row.failures) / row.requests),
        times: fmt.ratio(row.timesEnv),
        window: inputs.globalWindowLabel,
      }),
      key: row.id,
      subject: { kind: 'service', serviceId: row.id, role: 'failing' },
      // "The most excess failures" holds for the top row only: slot 5 shows the next one when the top
      // is already the root-cause screen, or when the SE swaps.
      title: text(index === 0 ? 'prt.title.failing' : 'prt.title.failing.other', { name: row.name }),
      facts: { entityName: row.name },
      incident: null,
    }),
  );
  const denied = inputs.denied.includes('svc.ranking') || inputs.denied.includes('svc.totals');
  return {
    kind: 'failing-service',
    candidates: uniqueById(candidates),
    reason: denied ? 'prt.why.none.noPermission' : 'prt.why.none.noData',
    emptyTitle: text('prt.title.failing.none'),
    incident: null,
    swappable: true,
  };
}

function listDraft(
  kind: 'failed-requests' | 'logs-errors' | 'smartscape' | 'vulnerabilities',
  key: string,
  url: string | null,
  evidence: LinkEvidenceLevel,
  why: I18nText,
  title: I18nText,
  facts: AnchorFacts,
  incident: IncidentSnapshot | null,
): Draft {
  return {
    kind,
    candidates: uniqueById([candidate({ entityId: null, entityName: null, url, evidence, why, key, subject: { kind: 'list', list: kind }, title, facts, incident })]),
    reason: 'prt.why.none.noData',
    emptyTitle: title,
    incident,
    swappable: false,
  };
}

function failedDraft(inputs: PlannerInputs, fmt: Formatter): Draft {
  const totals = inputs.svcTotals;
  const title = text('prt.title.failed');
  // No failure in the window: the list would be empty.
  if (totals !== null && totals.failures === 0) return listDraft('failed-requests', 'list', null, FAILED_REQUESTS_EVIDENCE, title, title, {}, null);
  const why =
    totals !== null && totals.requests > 0
      ? text('prt.why.failed', { failures: fmt.count(totals.failures), requests: fmt.count(totals.requests), rate: fmt.pct((100 * totals.failures) / totals.requests), window: inputs.globalWindowLabel })
      : text('prt.what.failed');
  return listDraft('failed-requests', 'list', appUrl(inputs.tenantHost, FAILED_REQUESTS_PATH), FAILED_REQUESTS_EVIDENCE, why, title, {}, null);
}

function vulnerabilitiesDraft(inputs: PlannerInputs, fmt: Formatter): Draft {
  const { security } = inputs;
  const title = text('prt.title.vulns');
  const readable = security.outcome === 'ok' || security.outcome === 'scan-limit';
  if (!readable || security.open <= 0) {
    const reason: StringKey = security.outcome === 'no-permission' ? 'prt.why.none.noPermission' : 'prt.why.none.noData';
    return { ...listDraft('vulnerabilities', 'list', null, 'verified', title, title, {}, null), reason };
  }
  const why = text('prt.why.vulns', { open: fmt.count(security.open), critical: fmt.count(security.critical), actNow: fmt.count(security.actNow) });
  return listDraft('vulnerabilities', 'list', appUrl(inputs.tenantHost, VULNERABILITIES_PATH), 'verified', why, title, {}, null);
}

function hostDraft(inputs: PlannerInputs, fmt: Formatter, optIn: boolean): Draft | null {
  const { incident } = inputs;
  const rootHost = incident !== null && entityType(incident.rootCauseId) === 'HOST' ? incident.rootCauseId : null;
  if (rootHost === null && !optIn) return null;
  const list: (Candidate | null)[] = [];
  if (incident !== null && rootHost !== null) {
    const name = incident.rootCauseName ?? rootHost;
    list.push(
      candidate({
        entityId: rootHost,
        entityName: name,
        url: shellUrl(inputs.tenantHost, hostUrl(rootHost)),
        evidence: entityLinkEvidence(rootHost),
        why: text('prt.why.rootSvc', { id: incident.displayId, root: name }),
        key: rootHost,
        subject: { kind: 'host', hostId: rootHost },
        title: text('prt.title.host', { name }),
        facts: {},
        incident,
      }),
    );
  }
  if (optIn) {
    const first = list.length === 0;
    inputs.hosts
      .filter((host) => entityType(host.id) === 'HOST')
      .forEach((host, index) => {
        list.push(
          candidate({
            entityId: host.id,
            entityName: host.name,
            url: shellUrl(inputs.tenantHost, hostUrl(host.id)),
            evidence: entityLinkEvidence(host.id),
            why: text(first && index === 0 ? 'prt.why.host' : 'prt.why.host.other', { host: host.name, cpu: fmt.pct(host.peakCpuPct), mem: fmt.pct(host.peakMemPct) }),
            key: host.id,
            subject: { kind: 'host', hostId: host.id },
            title: text('prt.title.host', { name: host.name }),
            facts: {},
            incident: null,
          }),
        );
      });
  }
  return {
    kind: 'host',
    candidates: uniqueById(list),
    reason: inputs.denied.includes('infra.capacity') ? 'prt.why.none.noPermission' : 'prt.why.none.noData',
    emptyTitle: text('prt.title.host.none'),
    incident: rootHost === null ? null : incident,
    swappable: true,
  };
}

function plain(candidate: Candidate): ShotCandidate {
  return { entityId: candidate.entityId, entityName: candidate.entityName, url: candidate.url, evidence: candidate.evidence, why: candidate.why };
}

/** Picks the slot's screen: the SE's swap when it is a free candidate, else the first candidate no earlier slot shows. */
function settle(draft: Draft, used: Set<string>, overrides: PlanOverrides): ShotSlot {
  const layout = LAYOUT_OF[draft.kind];
  const free = draft.candidates.filter((item) => item.entityId === null || !used.has(item.entityId));
  const base = { kind: draft.kind, layout, order: ORDER[draft.kind], included: false, probeOnly: false, forced: false, settleMs: SETTLE_MS[draft.kind] };
  const first = free[0];
  if (first === undefined) {
    return {
      ...base,
      id: shotId(draft.kind, 'none'),
      titleText: draft.emptyTitle,
      chosen: null,
      alternates: [],
      omittedReason: draft.candidates.length > 0 ? 'prt.why.none.dedup' : draft.reason,
      subject: { kind: 'none' },
      incident: draft.incident,
      anchors: [],
      urlTemplateKey: '',
    };
  }
  const target = draft.swappable ? (overrides.swapped[draft.kind] ?? overrides.swapped[shotId(draft.kind, first.key)]) : undefined;
  const chosen = (target === undefined ? undefined : free.find((item) => item.entityId === target)) ?? first;
  if (chosen.entityId !== null) used.add(chosen.entityId);
  return {
    ...base,
    id: shotId(draft.kind, chosen.key),
    titleText: chosen.title,
    chosen: plain(chosen),
    alternates: free.filter((item) => item !== chosen).slice(0, MAX_ALTERNATES).map(plain),
    omittedReason: null,
    subject: chosen.subject,
    incident: chosen.incident,
    anchors: resolveAnchors(layout, chosen.facts),
    urlTemplateKey: urlTemplateKey(draft.kind, chosen.url),
  };
}

function customSlots(overrides: PlanOverrides, tenantHost: string): ShotSlot[] {
  const out: ShotSlot[] = [];
  for (const custom of overrides.custom) {
    if (out.length >= LIMITS.customSlots) break;
    const url = typeof custom.url === 'string' ? custom.url.trim() : '';
    if (!validateCustomUrl(url, tenantHost).ok) continue;
    const id = `custom--${sha256Hex(url).slice(0, 10)}`;
    if (out.some((slot) => slot.id === id)) continue;
    const title = custom.titleRaw.replace(/\s+/g, ' ').trim().slice(0, CUSTOM_TITLE_MAX);
    const params = { ...custom.titleText.params, ...(custom.titleText.params.title === undefined ? {} : { title: custom.titleText.params.title.slice(0, CUSTOM_TITLE_MAX) }) };
    out.push({
      id,
      kind: 'custom',
      layout: 'free',
      order: ORDER.custom + out.length,
      titleText: { key: custom.titleText.key, params },
      chosen: { entityId: null, entityName: title === '' ? null : title, url, evidence: 'manual', why: text('prt.what.custom') },
      alternates: [],
      omittedReason: null,
      included: true,
      probeOnly: false,
      forced: false,
      subject: { kind: 'none' },
      incident: null,
      anchors: [],
      settleMs: SETTLE_MS.custom,
      urlTemplateKey: urlTemplateKey('custom', url),
    });
  }
  return out;
}

/** The SE's choices on top of the link checks: forced probe-only slots go in, excluded slots go out. */
function withOverrides(slot: ShotSlot, overrides: PlanOverrides): ShotSlot {
  if (slot.chosen === null) return { ...slot, included: false, forced: false };
  const forced = slot.probeOnly && overrides.forced.includes(slot.id);
  const included = overrides.excluded.includes(slot.id) ? false : slot.included || forced;
  return { ...slot, forced, included };
}

/**
 * The plan. Slots are settled in deck order, so a later slot never shows an entity an earlier one
 * already shows (it takes its next candidate, or is omitted with `prt.why.none.dedup`); then this
 * tenant's link checks upgrade or take out address shapes (`applyLinkChecks`), then the SE's
 * overrides apply. Only `verified` (or probe-upgraded) and the SE's own screens are in the default
 * batch; observed and documented addresses are listed as "Só probe" until a probe here says ok.
 */
export function buildShotPlan(inputs: PlannerInputs, linkChecks: readonly LinkCheck[], overrides: PlanOverrides): ShotPlan {
  const tenantHost = inputs.tenantHost.toLowerCase();
  const scoped: PlannerInputs = { ...inputs, tenantHost };
  const fmt = formatterFor(scoped);
  const drafts = [
    problemDraft(scoped, fmt),
    rootCauseDraft(scoped, fmt),
    frontendDraft(scoped, fmt),
    k8sDraft(scoped, fmt),
    failingDraft(scoped, fmt),
    failedDraft(scoped, fmt),
    listDraft('logs-errors', 'status-error-2h', appUrl(tenantHost, logsFilterPath('status = ERROR', 'now()-2h', 'now()')), 'verified', text('prt.why.logs'), text('prt.title.logs'), {}, null),
    listDraft(
      'smartscape',
      'service-overview',
      appUrl(tenantHost, SMARTSCAPE_SERVICES_PATH),
      SMARTSCAPE_SERVICES_EVIDENCE,
      scoped.incident === null ? text('prt.why.smartscape.generic') : text('prt.why.smartscape', { root: scoped.incident.rootCauseName ?? scoped.incident.rootCauseId ?? DASH }),
      text('prt.title.smartscape'),
      { rootName: scoped.incident?.rootCauseName ?? null },
      scoped.incident,
    ),
    vulnerabilitiesDraft(scoped, fmt),
    hostDraft(scoped, fmt, overrides.hostOptIn),
  ].filter((draft): draft is Draft => draft !== null);

  const used = new Set<string>();
  const planned = drafts.slice(0, LIMITS.planSlots).map((draft) => withOverrides(applyLinkChecks(settle(draft, used, overrides), linkChecks, inputs.now), overrides));
  const custom = customSlots(overrides, tenantHost).map((slot) => withOverrides(slot, overrides));
  const slots = [...planned, ...custom].sort((a, b) => a.order - b.order);
  return {
    tenantHost,
    generatedAtIso: new Date(inputs.now).toISOString(),
    planId: sha256Hex(canonicalPlanJson(tenantHost, slots)).slice(0, 12),
    incident: inputs.incident,
    slots,
  };
}
