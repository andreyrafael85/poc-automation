import { assumed } from '../config/assumptions';
import type { ResolvedTimeframe } from '../utils/time';
import { CRITERION_METRIC_IDS, type CriterionMetricId } from './criteria';
import type { PillarId } from './pillars';

/**
 * The PoC plan (3.2.5, milestone M5): when the proof of concept started and ends, what success
 * was agreed to look like, and the "Value of the PoC" dashboard the SE created on the tenant.
 *
 * It lives in the shared App State document with the rest of the PoC (customer, scope, pillars):
 * the whole PoC team sees the same dates and the same objectives. Nothing commercial goes here —
 * a target is a measured quantity (a coverage, a time to resolve, a count), never a price.
 */

export type CriterionOperator = '>=' | '<=';

/** A criterion the app cannot measure is assessed by people; this records their verdict. */
export type ManualStatus = 'pending' | 'met' | 'not-met';

export interface SuccessCriterion {
  /** Stable key for the list (not shown). */
  id: string;
  /** What is measured: a metric the app reads, or `manual` for one assessed by the customer. */
  metric: CriterionMetricId | 'manual';
  operator: CriterionOperator;
  /** The agreed target, in the metric's unit; null for a manual criterion. */
  target: number | null;
  /** The criterion in the words agreed with the customer (required for a manual one). */
  text: string;
  /** Where it was agreed: "kick-off, 12 Sep", "statement of work". */
  origin: string;
  /** The people's verdict on a manual criterion. */
  manualStatus: ManualStatus;
  /**
   * The value pillar this objective proves (3.2.6): pillars and objectives are planned together,
   * so each pillar shows the objectives that prove it. Absent on a plan saved before 3.2.6, where
   * the metric's own pillar is used (`criterionPillar`).
   */
  pillar?: PillarId | null;
}

/** The dashboard the SE created on the tenant (never created by the app on its own). */
export interface PocDashboardRef {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string | null;
  /** Readable by every user of the environment (read-only), or private to its creator. */
  shared: boolean;
}

export interface PocPlan {
  /** First day of the PoC, `YYYY-MM-DD` (a UTC day, as Grail bins days). */
  startDate: string | null;
  /** Planned last day, `YYYY-MM-DD`. */
  endDate: string | null;
  criteria: SuccessCriterion[];
  dashboard: PocDashboardRef | null;
  /**
   * 3.3.4: the specialty dashboards the SE created (SRE/DevOps, Cloud & Infra, Experience), by id.
   * Absent on a plan saved before 3.3.4, which still reads.
   */
  specialtyDashboards?: Partial<Record<string, PocDashboardRef>>;
  /** 3.6.7: the investigation notebook and the PoC launchpad the SE created on the PoC Builder. Absent before. */
  notebook?: PocDashboardRef;
  launchpad?: PocDashboardRef;
  /** 3.6.9: the SLOs the SE created on the PoC Builder — per service, or one for the whole fleet. Absent before. */
  slos?: PocSloRef[];
  /** 3.7.3: the HTTP monitors this PoC created (the customer's URLs). */
  monitors?: PocMonitorRef[];
  /** 3.7.4: the Davis anomaly detectors this PoC created (golden signals). */
  detectors?: PocDetectorRef[];
  /** 3.7.4: the OpenPipeline logs pipeline this PoC created (a level for logs without one). */
  pipeline?: PocDashboardRef;
}

/** 3.6.9: the SLOs one service gets — requests without a failure, minutes within the response-time line. */
export const SERVICE_SLO_KINDS = ['availability', 'performance'] as const;
/** 3.6.9: the SLOs of the whole fleet — every host's CPU and memory, every Kubernetes workload's restarts. */
export const FLEET_SLO_KINDS = ['hostCpu', 'hostMemory', 'k8sRestarts'] as const;
export const SLO_KINDS = [...SERVICE_SLO_KINDS, ...FLEET_SLO_KINDS] as const;
export type ServiceSloKind = (typeof SERVICE_SLO_KINDS)[number];
export type FleetSloKind = (typeof FLEET_SLO_KINDS)[number];
export type SloKind = ServiceSloKind | FleetSloKind;

/** An SLO the SE created: what it measures and, for a service SLO, which service ('' for a fleet SLO). */
/** 3.7.3: an HTTP monitor the PoC Builder created — its entity id, the address it calls and the location it runs from. */
export interface PocMonitorRef extends PocDashboardRef {
  url: string;
  locationId: string;
  /** 3.7.8: a browser monitor; absent for the HTTP monitors (3.7.3–3.7.7 created only those). */
  type?: 'BROWSER';
}

/** 3.7.4: a Davis anomaly detector the PoC Builder created — its settings object id and the golden signal it watches. */
export interface PocDetectorRef extends PocDashboardRef {
  kind: string;
}

/** 3.7.4: at most this many detectors per PoC. */
export const MAX_POC_DETECTORS = 6;

/** 3.7.3: at most this many HTTP monitors per PoC (each run is synthetic consumption). */
export const MAX_POC_MONITORS = 10;

/** 3.7.2: the longest SLO id kept (the platform's are 156 characters). */
export const MAX_SLO_ID = 400;
/** 3.6.9–3.7.1 cut every reference id to this length; an SLO id of exactly this length was cut. */
export const CUT_SLO_ID = 100;

export interface PocSloRef extends PocDashboardRef {
  kind: SloKind;
  serviceId: string;
}

/** At most this many SLOs are kept in a plan (a PoC sets a handful; the clean-up removes them one by one). */
export const MAX_POC_SLOS = 20;

export const EMPTY_POC_PLAN: PocPlan = { startDate: null, endDate: null, criteria: [], dashboard: null };

/** The specialty dashboards a plan can reference (`features/dashboard/blueprints.ts`). */
export const SPECIALTY_DASHBOARD_IDS = ['overview', 'sre', 'infra', 'experience', 'security', 'logs', 'kubernetes', 'database'] as const;

/** A PoC has a handful of objectives; past a dozen it is a backlog, not success criteria. */
export const MAX_CRITERIA = 12;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` that names a real calendar day. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (match === null) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const METRIC_IDS: ReadonlySet<string> = new Set(CRITERION_METRIC_IDS);
/** The pillar ids (`POC_PILLARS`; `tests/v326.test.tsx` keeps the two lists equal). */
export const PLAN_PILLAR_IDS: readonly PillarId[] = ['resilience', 'productivity', 'cost', 'agility'];
const PILLAR_IDS: ReadonlySet<string> = new Set(PLAN_PILLAR_IDS);

function parseCriterion(raw: unknown, index: number): SuccessCriterion | null {
  if (!isRecord(raw)) return null;
  const metric = raw['metric'] === 'manual' || (typeof raw['metric'] === 'string' && METRIC_IDS.has(raw['metric'])) ? (raw['metric'] as SuccessCriterion['metric']) : null;
  if (metric === null) return null;
  const words = text(raw['text'], 200);
  // A manual criterion is nothing but its words.
  if (metric === 'manual' && words === '') return null;
  const status = raw['manualStatus'];
  const pillar = raw['pillar'];
  return {
    id: text(raw['id'], 40) || `c${index + 1}`,
    metric,
    operator: raw['operator'] === '<=' ? '<=' : '>=',
    target: metric === 'manual' ? null : finite(raw['target']),
    text: words,
    origin: text(raw['origin'], 120),
    manualStatus: status === 'met' || status === 'not-met' ? status : 'pending',
    // Absent and "no pillar" read the same (`criterionPillar`): only a chosen pillar is kept.
    ...(typeof pillar === 'string' && PILLAR_IDS.has(pillar) ? { pillar: pillar as PillarId } : {}),
  };
}

/** Reads a stored plan field by field; anything that no longer makes sense falls back to empty. */
export function parsePocPlan(raw: unknown): PocPlan {
  if (!isRecord(raw)) return EMPTY_POC_PLAN;
  const startDate = isIsoDate(raw['startDate']) ? raw['startDate'] : null;
  const endDate = isIsoDate(raw['endDate']) && (startDate === null || raw['endDate'] >= startDate) ? raw['endDate'] : null;
  const criteria = Array.isArray(raw['criteria'])
    ? raw['criteria']
        .slice(0, MAX_CRITERIA)
        .map(parseCriterion)
        .filter((criterion): criterion is SuccessCriterion => criterion !== null)
    : [];
  const ids = new Set<string>();
  for (const criterion of criteria) {
    // Two rows with one key would edit each other in the form.
    if (ids.has(criterion.id)) criterion.id = `${criterion.id}-${ids.size}`;
    ids.add(criterion.id);
  }
  // 3.7.2: an SLO id is 156 characters (a document id is 36); 3.6.9–3.7.1 kept only the first 100, so the SLO tile, its link
  // and the clean-up read a cut id — `MAX_REF_ID` keeps it whole (the PoC Builder repairs the cut ones, `resolveSloIds`).
  const dashboardRef = (value: unknown, idMax = 100): PocDashboardRef | null => {
    const board = isRecord(value) ? value : null;
    return board !== null && text(board['id'], idMax) !== ''
      ? {
          id: text(board['id'], idMax),
          name: text(board['name'], 128),
          createdAt: text(board['createdAt'], 40),
          createdBy: text(board['createdBy'], 320) || null,
          shared: board['shared'] === true,
        }
      : null;
  };
  const dashboard = dashboardRef(raw['dashboard']);
  const specialties = isRecord(raw['specialtyDashboards']) ? raw['specialtyDashboards'] : null;
  const specialtyDashboards: Partial<Record<string, PocDashboardRef>> = {};
  for (const id of SPECIALTY_DASHBOARD_IDS) {
    const ref = specialties === null ? null : dashboardRef(specialties[id]);
    if (ref !== null) specialtyDashboards[id] = ref;
  }
  const notebook = dashboardRef(raw['notebook']);
  const launchpad = dashboardRef(raw['launchpad']);
  const slos = Array.isArray(raw['slos'])
    ? raw['slos'].slice(0, MAX_POC_SLOS).flatMap((value: unknown): PocSloRef[] => {
        const ref = dashboardRef(value, MAX_SLO_ID);
        const record = isRecord(value) ? value : {};
        const kind = SLO_KINDS.find((candidate) => candidate === record['kind']);
        const serviceId = text(record['serviceId'], 64);
        const needsService = (SERVICE_SLO_KINDS as readonly string[]).includes(kind ?? '');
        return ref === null || kind === undefined || (needsService && serviceId === '') ? [] : [{ ...ref, kind, serviceId }];
      })
    : [];
  const monitors = Array.isArray(raw['monitors'])
    ? raw['monitors'].slice(0, MAX_POC_MONITORS).flatMap((value: unknown): PocMonitorRef[] => {
        const ref = dashboardRef(value);
        const record = isRecord(value) ? value : {};
        const url = text(record['url'], 300);
        if (ref === null || url === '') return [];
        const monitor: PocMonitorRef = { ...ref, url, locationId: text(record['locationId'], 100) };
        return [record['type'] === 'BROWSER' ? { ...monitor, type: 'BROWSER' } : monitor];
      })
    : [];
  // 3.7.4: a settings object id is long (like an SLO's), so it keeps the SLO's length.
  const detectors = Array.isArray(raw['detectors'])
    ? raw['detectors'].slice(0, MAX_POC_DETECTORS).flatMap((value: unknown): PocDetectorRef[] => {
        const ref = dashboardRef(value, MAX_SLO_ID);
        const record = isRecord(value) ? value : {};
        const kind = text(record['kind'], 40);
        return ref === null || kind === '' ? [] : [{ ...ref, kind }];
      })
    : [];
  const pipeline = dashboardRef(raw['pipeline'], MAX_SLO_ID);
  return {
    startDate,
    endDate,
    criteria,
    dashboard,
    ...(Object.keys(specialtyDashboards).length > 0 ? { specialtyDashboards } : {}),
    ...(notebook === null ? {} : { notebook }),
    ...(launchpad === null ? {} : { launchpad }),
    ...(slos.length > 0 ? { slos } : {}),
    ...(monitors.length > 0 ? { monitors } : {}),
    ...(detectors.length > 0 ? { detectors } : {}),
    ...(pipeline !== null ? { pipeline } : {}),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from the start date to `now` (day 1 is the start date itself), or null before it. */
export function pocDay(startDate: string | null, now: Date = new Date()): number | null {
  if (startDate === null || !isIsoDate(startDate)) return null;
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  if (now.getTime() < start) return null;
  return Math.floor((now.getTime() - start) / DAY_MS) + 1;
}

/** A new criterion's key: short and unique within the list. */
export function newCriterionId(existing: readonly SuccessCriterion[]): string {
  let index = existing.length + 1;
  const taken = new Set(existing.map((criterion) => criterion.id));
  while (taken.has(`c${index}`)) index += 1;
  return `c${index}`;
}

/** The windows anchored to the PoC's start date. */
export interface PocWindows {
  startDate: string;
  /** From the start date (or the earliest day read, see `clamped`) to now. */
  since: ResolvedTimeframe;
  /** The start date alone: the "Day 0" the baseline is reconstructed from. */
  day0: ResolvedTimeframe;
  /** True when the start date is older than `POC_WINDOW_MAX_DAYS`: the reads start later than it. */
  clamped: boolean;
}

/** How far back a "since the start of the PoC" read goes: bounds what a forgotten date costs (registry). */
export const POC_WINDOW_MAX_DAYS = assumed('windows.pocMaxDays');

export function pocWindows(startDate: string | null, now: Date = new Date()): PocWindows | null {
  if (startDate === null || !isIsoDate(startDate)) return null;
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = now.getTime();
  if (start >= end) return null;
  const earliest = end - POC_WINDOW_MAX_DAYS * DAY_MS;
  const sinceStart = Math.max(start, earliest);
  return {
    startDate,
    since: { startIso: new Date(sinceStart).toISOString(), endIso: new Date(end).toISOString(), label: 'timeframe.poc.since', expression: 'poc' },
    day0: { startIso: new Date(start).toISOString(), endIso: new Date(Math.min(start + DAY_MS, end)).toISOString(), label: 'timeframe.poc.day0', expression: 'poc-day0' },
    clamped: start < earliest,
  };
}
