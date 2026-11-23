import { parsePlan, type ActionPlan } from '../features/assessment/actionPlan';
import { parseHistory, type AssessmentHistory } from '../features/assessment/history';
import { parsePrivate, parseShared } from './persistence';
import type { PrivateSlice, SharedSlice } from './useTenantPersistence';

/**
 * Moving a PoC between installs of the app (3.3.6).
 *
 * The app's configuration lives in App State, which the platform keeps **per app id**. When the app
 * moved from `my.poc.value.studio.v31` to `my.poc.value.studio` (owner's order, 3.3.6), the new id
 * started empty; the SE carries the PoC across with a file: Settings → "Export this PoC" in one
 * install, "Import a PoC" in the other. The same file moves a PoC between tenants.
 *
 * What travels: the shared configuration (customer, scope, logos, partner, pillars, the PoC plan
 * with its success criteria and dashboard references) and the SE's own working figures (rates,
 * baseline, price table setting, language, window, capture choice). What never travels: the
 * partner password and the partners let in (`pvs.access.v1`) — the SE sets a new password in the
 * new install — and anything read from the tenant.
 *
 * An imported file is untrusted input: each half goes through the same parser as a document read
 * from App State (`parseShared`, `parsePrivate`), so a file can never put into the app what a
 * stored document could not.
 *
 * Format 2 (3.4.14, the move to the id `my.poc.automation` — "PoC Automation 3.0", owner's order of 2026-11-19):
 * the file also carries the Coverage page's kept readings (`pvs.assessment.history.v1`, 3.4.2) and its agreed
 * action plan (`pvs.assessment.plan.v1`, 3.4.6), which the format 1 of 3.3.6 predates — without them the move
 * would leave them behind. Each goes through its own parser (`parseHistory`, `parsePlan`). A format-1 file is
 * still read (without those two parts).
 */

export const POC_FILE_FORMAT = 'poc-value-studio.poc';
export const POC_FILE_VERSION = 2;
/** The formats this version reads: 1 (3.3.6) and 2 (3.4.14). */
const READABLE_VERSIONS: readonly number[] = [1, 2];
/** Two logos of `MAX_LOGO_BYTES` as data URLs and the plan fit well under this. */
export const POC_FILE_MAX_BYTES = 2 * 1024 * 1024;

/** The Coverage page's own documents, as kept on the tenant (format 2). */
export interface CoverageDocs {
  history: AssessmentHistory | null;
  plan: ActionPlan | null;
}

export interface PocFile {
  format: typeof POC_FILE_FORMAT;
  formatVersion: typeof POC_FILE_VERSION;
  appVersion: string;
  exportedAt: string;
  shared: SharedSlice & { v: 1 };
  private: PrivateSlice & { v: 1 };
  coverage?: { history?: AssessmentHistory; plan?: ActionPlan };
}

/** The file for the PoC on screen. */
export function pocFileContent(input: { shared: SharedSlice; priv: PrivateSlice; appVersion: string; exportedAt: string; coverage?: CoverageDocs }): string {
  const history = input.coverage?.history ?? null;
  const plan = input.coverage?.plan ?? null;
  const coverage = {
    ...(history !== null && history.snapshots.length > 0 ? { history } : {}),
    ...(plan !== null && Object.keys(plan.items).length > 0 ? { plan } : {}),
  };
  const file: PocFile = {
    format: POC_FILE_FORMAT,
    formatVersion: POC_FILE_VERSION,
    appVersion: input.appVersion,
    exportedAt: input.exportedAt,
    shared: { v: 1, parameters: input.shared.parameters, pillars: [...input.shared.pillars], poc: input.shared.poc },
    private: { v: 1, ...input.priv },
    ...(Object.keys(coverage).length > 0 ? { coverage } : {}),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** "poc-acme-corp-2026-11-17.json": the customer, never an id or a tenant. */
export function pocFileName(customerName: string, date: Date): string {
  const slug = customerName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `poc-${slug === '' ? 'value-studio' : slug}-${date.toISOString().slice(0, 10)}.json`;
}

export type PocFileReading =
  | { ok: true; shared: SharedSlice; priv: PrivateSlice | null; appVersion: string; exportedAt: string; coverage: CoverageDocs }
  | { ok: false; reason: 'tooLarge' | 'notJson' | 'notPocFile' | 'newerFormat' | 'empty' };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads a file the SE picked: refused whole unless it is a PoC file this version understands. */
export function readPocFile(text: string): PocFileReading {
  if (new TextEncoder().encode(text).length > POC_FILE_MAX_BYTES) return { ok: false, reason: 'tooLarge' };
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  if (!isRecord(doc) || doc['format'] !== POC_FILE_FORMAT) return { ok: false, reason: 'notPocFile' };
  const version = doc['formatVersion'];
  if (typeof version !== 'number' || !READABLE_VERSIONS.includes(version)) return { ok: false, reason: typeof version === 'number' && version > POC_FILE_VERSION ? 'newerFormat' : 'notPocFile' };
  const shared = parseShared(JSON.stringify(doc['shared'] ?? null));
  if (shared === null) return { ok: false, reason: 'notPocFile' };
  const priv = parsePrivate(JSON.stringify(doc['private'] ?? null));
  const slice: SharedSlice = { parameters: shared.parameters, pillars: shared.pillars, poc: shared.poc };
  if (slice.parameters.customerName === '' && slice.parameters.engagementName === '' && slice.poc.criteria.length === 0) return { ok: false, reason: 'empty' };
  return {
    ok: true,
    shared: slice,
    priv: priv === null ? null : { costModel: priv.costModel, baseline: priv.baseline, rateCard: priv.rateCard, locale: priv.locale, timeframe: priv.timeframe, captureChoice: priv.captureChoice },
    appVersion: typeof doc['appVersion'] === 'string' ? doc['appVersion'].slice(0, 40) : '',
    exportedAt: typeof doc['exportedAt'] === 'string' ? doc['exportedAt'].slice(0, 40) : '',
    coverage: coverageOf(version === 2 && isRecord(doc['coverage']) ? doc['coverage'] : null),
  };
}

/** The Coverage documents of a format-2 file, each through its own parser; an empty one is no document. */
function coverageOf(raw: Record<string, unknown> | null): CoverageDocs {
  if (raw === null) return { history: null, plan: null };
  const history = raw['history'] === undefined ? null : parseHistory(JSON.stringify(raw['history']));
  const plan = raw['plan'] === undefined ? null : parsePlan(raw['plan']);
  return {
    history: history !== null && history.snapshots.length > 0 ? history : null,
    plan: plan !== null && Object.keys(plan.items).length > 0 ? plan : null,
  };
}
