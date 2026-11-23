import type { Locale, StringKey } from '../../../i18n/strings';
import type { Translation } from '../../../i18n/useTranslation';
import type { CatalogId } from '../../../queries/catalog';
import type { GrailReadQuality } from '../../../queries/grailMetadata';
import type { GrailRecord } from '../../../utils/records';
import type { KpiStatus } from '../deck';
import type { DeckProfile } from '../spec';
import type { AnalysisVisual } from './deck/slides';

/**
 * Every contract between the modules of the real-prints deck (3.2.7, "Teste Deck Wrapup Print").
 *
 * The feature is built by several work packages at once — the shot planner, the capture intake and
 * storage, the evidence engine and its analysis, the deck writer and the tab — so each one codes
 * against these shapes instead of against another's implementation. Type-only imports from the app
 * keep this file free of runtime dependencies; the two value exports (`EVIDENCE_SLOTS`,
 * `EVIDENCE_OUTCOMES`) are plain constants.
 *
 * Where the specification left a shape open (the analysis, story and methodology content, the
 * anomalies and cross-links), the decision is recorded on the type. `analysis/anomalies.ts`
 * re-exports `Anomaly` and `AnomalyRuleId` from here rather than declaring them again.
 *
 * Coordinates: `Rect` and every pixel value are in the 1720×1080 print space (`PRINT_SPACE`), the
 * platform's content area once its 200 px navigation is cropped. Pins and focus on a slide are
 * fractions of the image (`CapturePin`, `FocusFraction`), so they survive a downscale.
 */

// ------------------------------------------------------------------ plan

export type ShotKind =
  | 'problem'
  | 'root-cause'
  | 'frontend'
  | 'k8s-cluster'
  | 'failing-service'
  | 'failed-requests'
  | 'logs-errors'
  | 'smartscape'
  | 'vulnerabilities'
  | 'host'
  | 'custom';

/** The platform page a print shows; keys the pin templates (`plan/pinTemplates.ts`). */
export type LayoutKey =
  | 'problems.detail'
  | 'services.details'
  | 'vitals.web'
  | 'k8s.cluster'
  | 'tracing.failedList'
  | 'logs.filter'
  | 'smartscape.services'
  | 'vulns.list'
  | 'infraops.host'
  | 'free';

/**
 * How a planned address was checked. `verified`: opened on a tenant and rendered the page;
 * `observed`: read from the browser only after clicks (a direct load is untested — probe it);
 * `documented`: the platform's published form, never opened here; `guessed`: neither;
 * `manual`: an address the SE typed (custom slot).
 */
export type LinkEvidenceLevel = 'verified' | 'observed' | 'documented' | 'guessed' | 'manual';

/** A text that is translated at render time. Params are already locale-formatted strings. */
export interface I18nText {
  key: StringKey;
  params: Readonly<Record<string, string>>;
}

/** A rectangle in the 1720×1080 print space (pixels). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An on-screen label the companion looks for (`pvs.shotlist.v1` wire format, unchanged). */
export interface AnchorSpec {
  key: string;
  /** Visible texts, English platform UI; the first one found wins. */
  match: readonly string[];
}

/** Snapshot of the incident a print belongs to; copied into the PrintRecord so evidence survives rca.top's 15 d. */
export interface IncidentSnapshot {
  /** The Davis `event.id` (`-?\d{1,20}_\d{13}V2`). Its number is never a time. */
  eventId: string;
  /** `P-260914359`. */
  displayId: string;
  name: string;
  /** `event.category` (ERROR, SLOWDOWN, AVAILABILITY, RESOURCE_CONTENTION, …). */
  category: string;
  rootCauseId: string | null;
  rootCauseName: string | null;
  affectedIds: string[];
  /**
   * Davis's related entity ids (the K8s/process context of the problem). Optional for older saved
   * sets; when present, the incident-log read uses exactly the Tech Wrapup's request and shares its
   * cache instead of scanning again.
   */
  relatedIds?: string[];
  startIso: string;
  /** Null while the problem is open. */
  endIso: string | null;
  durationNs: number | null;
  /** `k8s.cluster.name` values of the affected entities. */
  clusters: string[];
  /** `k8s.namespace.name` values of the affected entities. */
  namespaces: string[];
}

/** What a slot shows, and the id(s) its evidence is read for. */
export type ShotSubject =
  | { kind: 'incident' } // uses ShotSlot.incident
  | { kind: 'service'; serviceId: string; role: 'root-caller' | 'root' | 'failing' }
  | { kind: 'frontend'; frontendId: string; applicationId: string | null; incidentBound: boolean }
  | { kind: 'k8s-cluster'; clusterId: string; clusterName: string; incidentBound: boolean }
  | { kind: 'list'; list: 'failed-requests' | 'logs-errors' | 'vulnerabilities' | 'smartscape' }
  | { kind: 'host'; hostId: string }
  | { kind: 'none' };

/** One candidate screen for a slot: the chosen one or an alternate ("Trocar entidade"). */
export interface ShotCandidate {
  entityId: string | null;
  entityName: string | null;
  /** Absolute https address on the tenant, under `/ui/` (never `/ui/entity/`). */
  url: string;
  evidence: LinkEvidenceLevel;
  /** "Por que esta tela": numbers always carry their window (`prt.why.*`). */
  why: I18nText;
}

export interface ShotSlot {
  /** `${kind}--${entityKey}`, matching `SHOT_ID` (`constants.ts`) = the companion's id pattern. */
  id: string;
  kind: ShotKind;
  layout: LayoutKey;
  /** Deck order (ascending), unique within a plan; the deck numbers the kept pairs 01..N itself. */
  order: number;
  /** Never a literal (`prt.title.*`). */
  titleText: I18nText;
  /** Null when the slot is omitted (`omittedReason` says why). */
  chosen: ShotCandidate | null;
  /** ≤ 5, best first. */
  alternates: ShotCandidate[];
  /** A `prt.why.none.*` key; null when the slot has a chosen screen. */
  omittedReason: StringKey | null;
  /** Default: `chosen?.evidence === 'verified'` (after link checks), or the SE's choice. */
  included: boolean;
  /** observed/documented/guessed and not upgraded by a link check on this tenant. */
  probeOnly: boolean;
  /** The SE included a probeOnly slot anyway → the identity anchor becomes mandatory. */
  forced: boolean;
  subject: ShotSubject;
  incident: IncidentSnapshot | null;
  /** Includes key 'identity' when the layout has one. */
  anchors: AnchorSpec[];
  /** Problem 3500, services 3500, logs 3000, others 2500 (ms). */
  settleMs: number;
  /** The address with its ids replaced by placeholders, e.g. `service:/ui/apps/dynatrace.services/explorer/services?…detailsId={SERVICE}`; keys `LinkCheck`. */
  urlTemplateKey: string;
}

export interface ShotPlan {
  /** Bare host (`abc12345.apps.dynatrace.com`), lower-case. */
  tenantHost: string;
  generatedAtIso: string;
  /** 12 hex of sha256 over the canonical JSON of the slots (stable under reordering). */
  planId: string;
  incident: IncidentSnapshot | null;
  /** Deck order (`order` ascending): ≤ 10 planned + ≤ 6 custom. */
  slots: ShotSlot[];
}

// ------------------------------------------------------------------ wire formats (companion), see spec §6.4

export interface ShotListShot {
  id: string;
  /** Translated title through `printText(…, 120, 'se')`. */
  title: string;
  url: string;
  anchors?: AnchorSpec[];
  /** Optional CSS selector the companion waits for. */
  waitFor?: string;
  settleMs?: number;
  kind?: ShotKind;
}

export interface ShotList {
  schema: 'pvs.shotlist.v1';
  tenantHost: string;
  generatedAt: string;
  planId: string;
  /** 'probe': navigate and classify only, no screenshot. */
  purpose: 'capture' | 'probe';
  shots: ShotListShot[];
}

/** The companion's per-shot statuses (unchanged since 1.0). */
export type CaptureStatus = 'ok' | 'session_lost' | 'unresolved_link' | 'unexpected_page' | 'error' | 'skipped';

/** Why the companion suggests a mask (1.1). The matched text itself never leaves the page. */
export type MaskReason = 'email' | 'ipv4' | 'tenant-url' | 'url' | 'cloud-host' | 'uuid' | 'money' | 'secret-pair';

export interface ManifestAnchor {
  key: string;
  /** The `match` text that was found. */
  matched: string;
  /** Crop pixels (CSS px of the 1720-wide clip). */
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * The TOP-LEFT corner of the hit as fractions of the crop (`x / clip.width`, `y / clip.height`),
   * as the companion writes it since 1.0 — not the centre. Pin code adds half the box itself.
   */
  fx: number;
  fy: number;
  /** 1.1: 0..2 (multi-hit); absent = 0. */
  hit?: number;
  /** 1.1: numeric tokens near the hit (≤ 4). */
  numbers?: string[];
  /** 1.0: raw on-screen text ≤ 80 chars; 1.1: redacted. UNTRUSTED, never persisted (§6.6). */
  label?: string;
}

/** Crop pixels; never the matched text. */
export interface ManifestMask {
  reason: MaskReason;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ManifestShot {
  id: string;
  title: string;
  requestedUrl: string;
  finalUrl: string | null;
  status: CaptureStatus;
  /** `shots/NN_<id>.jpg`; null when no screenshot was taken. */
  file: string | null;
  /** 1.1: read from the JPEG bytes; 1.0: the clip size. */
  width: number | null;
  height: number | null;
  bytes: number | null;
  sha256: string | null;
  clipX: number | null;
  anchors: ManifestAnchor[];
  /** UNTRUSTED (redacted from 1.1 on); never persisted, shown only through `printText`. */
  pageTitle: string | null;
  capturedAt: string | null;
  /** Free text from the companion; 1.1 adds `off_tenant` and `ui_lang:<lang>`. */
  warnings: string[];
  /** 1.1 */
  maskSuggestions?: ManifestMask[];
  /** 1.1: the first visible "Last 30 minutes"-like label, ≤ 40 chars. */
  timeframeLabel?: string | null;
  /** 1.1 */
  offTenant?: boolean;
  /** 1.1: the app id of the final URL (`/ui/apps/<appId>/…`), which the link checks compare. */
  finalAppId?: string | null;
}

export interface CaptureManifest {
  schema: 'pvs.capture.manifest.v1';
  tenantHost: string;
  shotlistGeneratedAt: string | null;
  browser: string | null;
  viewport: { width: number; height: number };
  crop: { mode: 'auto' | '200' | 'none' };
  startedAt: string;
  finishedAt: string | null;
  shots: ManifestShot[];
  /** 1.1 ('1.1.0'); absent ⇒ treated as '1.0.0'. */
  companionVersion?: string;
  /** 1.1: echo of the shot list's planId. */
  planId?: string | null;
  /** 1.1 */
  mode?: 'capture' | 'probe';
  /** 1.1: the IANA zone the screens were rendered in. */
  browserTimeZone?: string | null;
  /** 1.1 */
  deviceScaleFactor?: number | null;
  /** 1.1 */
  stopReason?: 'session_lost' | 'off_tenant' | null;
}

// ------------------------------------------------------------------ prints

/** A numbered pin on a print, in print-space pixels (the deck converts to fractions). */
export interface PrintPin {
  /** 1..6, legend order. */
  n: number;
  x: number;
  y: number;
  /** anchor: snapped to an on-screen label; template: the layout's fallback ("posição estimada"); manual: placed by the SE. */
  origin: 'anchor' | 'template' | 'manual';
  anchorKey?: string;
  /** The SE's own legend text (≤ 130 chars); replaces the computed line. */
  labelOverride?: string;
  hidden?: boolean;
}

export interface MaskRect extends Rect {
  reason: 'manual' | MaskReason;
}

/** Numbers the companion read next to an anchor (`ManifestAnchor.numbers`, parsed with `parseUiNumber`). */
export interface ScreenNumber {
  anchorKey: string;
  hit: number;
  values: number[];
}

/** The outcome of one address shape on this tenant (probe or capture), keyed by `ShotSlot.urlTemplateKey`. */
export interface LinkCheck {
  templateKey: string;
  status: CaptureStatus;
  /** The app id the page landed in (`/ui/apps/<id>/…`), or null. */
  finalAppId: string | null;
  checkedAtIso: string;
  companionVersion: string;
}

export interface PrintRecord {
  id: string;
  slotId: string;
  kind: ShotKind;
  layout: LayoutKey;
  titleText: I18nText;
  entity: { id: string | null; name: string | null };
  subject: ShotSubject;
  incident: IncidentSnapshot | null;
  /** Path + query + hash only, never the origin. */
  requestedPath: string;
  finalPath: string | null;
  finalAppId: string | null;
  linkEvidence: LinkEvidenceLevel;
  source: 'companion' | 'tab-capture' | 'manual';
  /** The companion's status; 'unknown' for manual and guided captures (no final URL). */
  landing: CaptureStatus | 'unknown';
  capturedAtIso: string;
  /** True when the time is a file's `lastModified` rather than the capture itself. */
  capturedAtApprox: boolean;
  /** IANA zone the screen was rendered in (companion ≥ 1.1); null when unknown. */
  captureTimeZone: string | null;
  /** The screen's own timeframe label ("Last 30 minutes"); feeds `parseScreenTimeframe`. */
  screenTimeframeLabel: string | null;
  companion: { version: string; planId: string | null; browser: string | null } | null;
  image: {
    sha256: string;
    mime: 'image/jpeg';
    bytes: number;
    width: 1720;
    height: 1080;
    /** native: companion bytes kept as they are; resized/cropped: fit to 1720×1080; contain: letterboxed. */
    normalization: 'native' | 'resized' | 'cropped' | 'contain';
    /** The image does not fill the print space (contain): template pins are disabled. */
    partial: boolean;
  };
  /** Anchor hits in print space; the raw label is never kept. */
  anchors: { key: string; hit: number; rect: Rect }[];
  screenNumbers: ScreenNumber[];
  /** anchor: the layout's identity anchor was found; se-confirmed: the SE ticked "Esta é a tela de {nome}". */
  identity: 'anchor' | 'se-confirmed' | 'none';
  pins: PrintPin[];
  /** Accepted masks, burned into the baked JPEG at deck build only. */
  masks: MaskRect[];
  /** Pending companion suggestions; approval is blocked while any remains. */
  maskSuggestions: MaskRect[];
  /** The lupa region; null = none. */
  focus: Rect | null;
  lupaOn: boolean;
  /** Bound to the hashes: any change to the image, masks or focus revokes it (recomputed on every read). */
  approval: { atIso: string; imageSha: string; masksHash: string; focusHash: string } | null;
  warnings: string[];
  /** id/url: matched to its slot on import; slot: captured for that slot by hand; rebound: moved by the SE. */
  matchedBy: 'id' | 'url' | 'slot' | 'rebound';
  edited: boolean;
  updatedAtIso: string;
}

export interface ImportReport {
  atIso: string;
  /** Null when the manifest carries no planId (companion 1.0). */
  planIdMatch: boolean | null;
  counts: Partial<Record<CaptureStatus | 'orphan' | 'refused', number>>;
  orphans: { id: string; title: string }[];
  /** Translated, already through `printText`. */
  problems: string[];
}

/** The JSON document (`poc-value-studio:printset`); image bytes live in the images ZIP document. */
export interface PrintSet {
  schema: 'pvs.printset.v1';
  tenantHost: string;
  /** The PoC the prints were captured for; a different anchor triggers the stale guard. */
  pocAnchor: { customer: string; startDate: string | null };
  createdAtIso: string;
  updatedAtIso: string;
  appVersion: string;
  prints: PrintRecord[];
  linkChecks: LinkCheck[];
  lastImport: ImportReport | null;
  imagesDoc: { id: string; version: string } | null;
  /** Tombstone written by "Nova PoC". */
  cleared?: true;
}

/** A print in memory: its record, the master JPEG and a revocable thumbnail object URL. */
export interface PrintAsset {
  record: PrintRecord;
  master: Blob;
  thumbUrl: string | null;
}

// ------------------------------------------------------------------ evidence

export type EvidenceQueryId =
  | 'ev.problem.events'
  | 'ev.problem.recurrence'
  | 'ev.incident.callers'
  | 'ev.service.minutes'
  | 'ev.service.endpoints'
  | 'ev.service.screen'
  | 'ev.frontend.summary'
  | 'ev.frontend.minutes'
  | 'ev.k8s.capacity'
  | 'ev.k8s.workloads'
  | 'ev.k8s.churn'
  | 'ev.k8s.incidentRestarts'
  | 'ev.failing.services'
  | 'ev.failing.endpoints'
  | 'ev.entity.events'
  | 'ev.failed.endpoints'
  | 'ev.logs.errors'
  | 'ev.topology.blast'
  | 'ev.topology.hubs'
  | 'ev.host.cpu';

/** The fixed evidence slots: one `useEvidenceQuery` each, always in this order (hooks never move). */
export const EVIDENCE_SLOTS = [
  'problemEvents',
  'incidentCallers',
  'recurrence',
  'incidentMinutes',
  'incidentEndpoints',
  'rootScreen',
  'frontendIncident',
  'frontendProblem',
  'frontendScreen',
  'frontendMinutes',
  'k8sCapacity',
  'k8sWorkloads',
  'k8sChurn',
  'k8sIncidentRestarts',
  'failingServices',
  'failingEndpoints',
  'failingEvents',
  'failingScreen',
  'failedEndpoints',
  'logErrors',
  'topologyBlast',
  'topologyHubs',
  'hostCpu',
] as const;
export type EvidenceSlot = (typeof EVIDENCE_SLOTS)[number];

export type WindowKind = 'incident' | 'problem' | 'events' | 'screen' | 'recurrence' | 'global' | 'day';

export interface EvidenceWindow {
  kind: WindowKind;
  startIso: string;
  endIso: string;
  /** derived: computed (W, problem…); screen-label: read on the print; layout-default: the layout's fallback; url: fixed by the address; app: the app's global window. */
  source: 'derived' | 'screen-label' | 'layout-default' | 'url' | 'app';
  /** Resolved length; per-minute rates divide by the RETURNED timeframe. */
  minutes: number;
}

export interface EvidenceRequest {
  id: EvidenceQueryId;
  slot: EvidenceSlot;
  /** The exact text sent to Grail (and the text printed on the slide). */
  dql: string;
  window: EvidenceWindow;
  /** ≤ 5. */
  scanLimitGbytes: number;
  maxResultRecords: number;
  /** `${id}|${startIso}|${endIso}|${sha8(dql)}|${refreshToken}`: the memo and cache key. */
  key: string;
}

/** Mirrors `useCatalogQuery`'s classification; a refused or partial read never looks like "no data". */
export type EvidenceOutcome = 'disabled' | 'loading' | 'ok' | 'partial' | 'empty' | 'no-permission' | 'error';

/**
 * Outcomes from best to worst. `EvidencePack.outcome` is the worst (highest index) among its
 * REQUIRED queries: one error makes the pack an error; one query still loading keeps it loading.
 */
export const EVIDENCE_OUTCOMES = ['ok', 'partial', 'empty', 'disabled', 'loading', 'no-permission', 'error'] as const satisfies readonly EvidenceOutcome[];

export interface EvidenceQueryResult {
  /** Null when the slot is disabled. */
  request: EvidenceRequest | null;
  outcome: EvidenceOutcome;
  records: GrailRecord[];
  quality: GrailReadQuality;
  readAtIso: string | null;
}

export type SourceKind = 'davis' | 'dql' | 'rum' | 'screen' | 'app';

/** A value with its provenance: the only way a number reaches an analysis, a legend or a story. */
export interface Sourced<T = number> {
  /** Null when not measured — never a zero. */
  value: T | null;
  /** Already locale-formatted; '(pelo menos)' / '(at least)' suffix when partial. */
  display: string;
  source: SourceKind;
  queryId: EvidenceQueryId | CatalogId | 'screen';
  window: EvidenceWindow | null;
  collectedAtIso: string | null;
  quality: 'exact' | 'partial' | 'estimate';
}

/** One-minute series from `timeframe.start` (`stepMs = interval / 1e6`). */
export interface MinuteSeries {
  startIso: string;
  stepMs: number;
  values: (number | null)[];
}

export interface DavisEvent {
  id: string;
  name: string;
  category: string;
  /** `event.start`: when the anomaly started — not when Davis detected it. */
  startIso: string;
  endIso: string | null;
  /** When the record was written ("registrado em"). */
  writtenAtIso: string | null;
  sourceId: string;
  sourceName: string | null;
  /** Tenant text: through `printText` before any display. */
  detail: string;
}

/** A query that ran, for the methodology slide and the DQL appendix. */
export interface ExecutedQuery {
  id: EvidenceQueryId | CatalogId;
  dql: string;
  window: EvidenceWindow | null;
  records: number;
  /** As Grail reports it; null when it does not. */
  scannedBytes: number | null;
  outcome: EvidenceOutcome;
  readAtIso: string | null;
}

export interface FrontendSummary {
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  ttfbMs: number | null;
  requests: number | null;
  errors: number | null;
  actionP75Ms: number | null;
  users: number | null;
  sessions: number | null;
  timeframeMinutes: number;
}

/** Cores and GiB; `rollup: avg` on every gauge. */
export interface K8sCapacity {
  cpuUsed: number | null;
  cpuReq: number | null;
  cpuLim: number | null;
  cpuAlloc: number | null;
  memUsedGiB: number | null;
  memReqGiB: number | null;
  memLimGiB: number | null;
  memAllocGiB: number | null;
}

export interface K8sWorkload {
  name: string;
  namespace: string;
  memOfReqPct: number | null;
  cpuOfReqPct: number | null;
  memReqGiB: number | null;
  memUsedGiB: number | null;
}

/**
 * Everything read for one shot. A part whose query was not run, or answered no-permission, error
 * or empty, is absent — never zeros; inside a part, a value that was not measured is null.
 */
export interface EvidencePack {
  shotId: string;
  kind: ShotKind;
  /** Worst outcome among its REQUIRED queries (`EVIDENCE_OUTCOMES`). */
  outcome: EvidenceOutcome;
  windows: Partial<Record<WindowKind, EvidenceWindow>>;
  problem?: {
    davisUsers: number | null;
    eventCount: number | null;
    impact: string[];
    status: string | null;
    severity: string | null;
    startIso: string;
    endIso: string | null;
    events: DavisEvent[];
  };
  recurrence?: {
    anchorProblems: number | null;
    medianMin: number | null;
    p90Min: number | null;
    /** ≤ 3, by id. */
    rank: { id: string; name: string; problems: number }[];
    totalProblems: number | null;
    rootCaused: number | null;
  };
  callers?: { rootType: string | null; rows: { id: string; name: string; requests: number | null; failures: number | null }[] };
  services?: { id: string; name: string; requests: MinuteSeries; failures: MinuteSeries; p90Us: MinuteSeries; totals: { requests: number; failures: number } }[];
  endpoints?: { serviceId: string; endpoint: string; requests: number; failures: number; ratePct: number | null }[];
  serviceScreen?: {
    serviceId: string;
    requests: number;
    failures: number;
    avgMs: number | null;
    p50Ms: number | null;
    endpoints: { endpoint: string; requests: number; failures: number; p50Ms: number | null }[];
    timeframeMinutes: number;
  };
  frontend?: Partial<Record<'incident' | 'problem' | 'screen', FrontendSummary>> & { minutes?: { requests: MinuteSeries; errors: MinuteSeries } };
  k8s?: {
    capacity: K8sCapacity | null;
    workloads: K8sWorkload[];
    churn: { total: number | null; rows: { workload: string; namespace: string; restarts: number; oom: number | null }[] } | null;
    incidentRestarts: { workload: string; namespace: string; total: number; firstIso: string | null }[];
  };
  failing?: {
    envRate: number | null;
    envRequests: number | null;
    envFailures: number | null;
    rows: { id: string; name: string; requests: number; failures: number; failurePct: number; excess: number; timesEnv: number }[];
    endpoints: { endpoint: string; requests: number; failures: number; failurePct: number; p50Ms: number | null; p90Ms: number | null }[];
    events: { count: number; categories: string[]; lastIso: string | null } | null;
  };
  failed?: {
    totalRequests: number;
    totalFailures: number;
    rows: { serviceId: string; name: string; endpoint: string; requests: number; failures: number; ratePct: number | null }[];
  };
  /** Signatures are redacted at summarise time. */
  logs?: { totalErrors: number | null; signatures: { signature: string; occurrences: number; origins: number; topOrigin: string | null }[]; incidentLogCount: number | null };
  topology?: {
    blast: { rootType: string | null; hop1Ids: string[]; hop2Ids: string[]; apps: string[] } | null;
    hubs: { id: string; name: string; degree: number }[];
    services: number | null;
    isolated: number | null;
    dbServices: number | null;
  };
  security?: { open: number; critical: number; high: number; actNow: number; twoSignals: number; byTechnology: { label: string; value: number }[] };
  host?: {
    id: string;
    name: string;
    cpuAvg: number | null;
    cpuPeak: number | null;
    memAvg: number | null;
    fleetMedianCpu: number | null;
    hosts: number | null;
    under10: number | null;
  };
  queries: ExecutedQuery[];
}

export type EvidenceBundle = Readonly<Record<string /* shotId */, EvidencePack>>;

// ------------------------------------------------------------------ analysis (pure output of analysis/*, already translated)

/** Detector rules that feed a finding (§4.6). D2, D5b, D10 and D12 are not shipped in 3.2.7. */
export type AnomalyRuleId = 'D1' | 'D3' | 'D4' | 'D5a' | 'D6' | 'D7' | 'D8a' | 'D8b' | 'D9' | 'D11' | 'D13' | 'D14' | 'D15' | 'D16' | 'D17' | 'D18';

/** Ordered: the print's headline pill is the top anomaly by severity, then by ratio. */
export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'info';

export interface Anomaly {
  rule: AnomalyRuleId;
  shotId: string;
  severity: AnomalySeverity;
  entityId: string | null;
  fromIso?: string;
  toIso?: string;
  value: Sourced<number>;
  baseline?: Sourced<number>;
  ratio?: number;
  /** `prt.anom.<rule>`, ≤ 60 characters once translated. */
  headline: I18nText;
}

/** Id-based links between shots (§4.7). There is no X8. */
export type CrossLinkId = 'X1' | 'X2' | 'X3' | 'X4' | 'X5' | 'X6' | 'X7' | 'X9';

/**
 * A fact that ties two shots of the deck together. Decided here: the facts are keyed by the
 * i18n param name of the finding that cites the link, so the analysis fills its `{share}`,
 * `{failures}`… straight from them; `ref` is the target's deck number ("02"), filled after
 * gating, so a link whose target is not in the deck never exists.
 */
export interface CrossLink {
  id: CrossLinkId;
  fromShotId: string;
  toShotId: string;
  /** '01'..'NN' of the target over the kept pairs. */
  ref: string;
  facts: Readonly<Record<string, Sourced<number | string>>>;
}

/**
 * A screen number checked against Grail (problem users / sessions, logs records, k8s nodes).
 * Equal within 1 % → `prt.an.agree`; otherwise `prt.an.differ`. The two are never reconciled.
 */
export interface CrossCheck {
  anchorKey: string;
  screen: Sourced<number>;
  grail: Sourced<number>;
  agree: boolean;
  /** Translated `prt.an.agree` / `prt.an.differ`, appended to the pin legend in parentheses. */
  text: string;
}

/** One KPI tile of an analysis slide. The value is `Sourced`, so no number reaches the deck without a source and a window. */
export interface AnalysisKpi {
  /** Translated `prt.an.kpi.*`. */
  label: string;
  /** The tile prints `value.display`; `value.source` colours its accent bar. */
  value: Sourced<number | string>;
  status?: KpiStatus;
  /** Translated "{source} · {window}" (`prt.src.*`), plus " · leitura parcial" when partial. */
  footer: string;
}

/** One comparison finding. `facts` are every `Sourced` value its text cites (for the number lint and the customer-safe cut). */
export interface AnalysisFinding {
  /** Translated `prt.an.f.*`; tenant text inside is not yet redacted (the deck applies `printText`). */
  text: string;
  facts: readonly Sourced<number | string>[];
  /** The anomaly or cross-link the finding stands on; null for a plain comparison. Orders the findings. */
  basis: AnomalyRuleId | CrossLinkId | null;
}

/**
 * The analytic reading of one shot ("Leitura analítica"), built by `analysisFor`. Decided here:
 * KPIs and findings carry their `Sourced` facts, so the customer-safe variant (D12: no
 * screen-sourced value) is a mechanical filter on `source === 'screen'`, and the DQL appendix is
 * built from `dql` + `dqlSource` without re-running anything.
 */
export interface AnalysisContent {
  shotId: string;
  kind: ShotKind;
  /** Translated headline of the top anomaly (pill on the print slide); null → the caller uses `prt.headline.<kind>`. */
  headline: string | null;
  /** ≤ 4 (`PRINT_BUDGET.kpis`); `analysisFor` returns null below 2. */
  kpis: AnalysisKpi[];
  visual: AnalysisVisual | null;
  /** The exact executed text of the visual's query ("printed = executed": `=== EvidenceRequest.dql`, or the catalog entry's `dql`); null when the visual has none. */
  dql: string | null;
  /** Non-null exactly when `dql` is: which query it is, its window and the translated window line of its appendix card. */
  dqlSource: { id: EvidenceQueryId | CatalogId; window: EvidenceWindow | null; windowLine: string } | null;
  /** ≤ 3, strongest first. */
  findings: AnalysisFinding[];
  /** "Por que importa" (`prt.an.matters.*`). */
  matters: string;
  /** ≤ 2 (`prt.an.reco.*`). */
  reco: string[];
  /** Rules this analysis cites, strongest first. */
  anomalies: AnomalyRuleId[];
}

/** The five stages of the incident story (`prt.story.stage.*`). "onset" is the anomaly's `event.start`, never a detection time (D8). */
export type StoryStage = 'symptom' | 'onset' | 'cause' | 'evidence' | 'pattern';

export interface StoryStep {
  stage: StoryStage;
  /** Translated stage label (caps). */
  label: string;
  /** Formatted instant in the deck zone, or null. */
  time: string | null;
  /** ≤ 130 characters once cut. */
  text: string;
  /** The shot whose print gives the thumbnail and the "→ 02" ref; the deck drops the thumbnail when that print is not kept. */
  shotId: string | null;
  facts: readonly Sourced<number | string>[];
}

/** Built by `storyFor`; the deck shows it only with ≥ 3 steps and ≥ 2 thumbnails from kept prints. */
export interface StoryContent {
  title: string;
  subtitle: string;
  /** 3..5, in time order. */
  steps: StoryStep[];
  /** Translated `prt.story.chain`. */
  chain: string;
  caveat: string;
}

/**
 * The methodology summary page, built by `methodologyFor` for one profile (the Customer profile
 * shows `prt.meth.envCustomer`, never the host). The DQL appendix pages are not here: the deck
 * builds them from the analyses' `dql`, one card per distinct query in slide order.
 */
export interface MethodologyContent {
  title: string;
  /** Environment, screens captured, Grail queries, profile. */
  scope: { label: string; value: string }[];
  printsTitle: string;
  /** Screen / Captured / Via / Link / Identity. */
  printHeaders: string[];
  prints: string[][];
  queriesTitle: string;
  /** Query / Window / Records / Read. */
  queryHeaders: string[];
  queries: string[][];
  gapsTitle: string;
  gaps: string[];
  note: string;
}

/** What every analysis function needs; built once per render by the tab. */
export interface AnalysisCtx {
  locale: Locale;
  profile: DeckProfile;
  t: Translation['t'];
  tCount: Translation['tCount'];
  /** The deck zone: the most common `captureTimeZone` of the kept prints, else the viewer's zone. */
  timeZone: string;
  /** Every fact used so far, by name — the number lint reads it. */
  numbers: Map<string, Sourced<number | string>>;
}
