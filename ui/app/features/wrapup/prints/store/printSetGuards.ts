import type { StringKey } from '../../../../i18n/strings';
import { LIMITS, PRINT_SPACE, SHOT_ID } from '../constants';
import { PRINT_ID } from '../capture/zipDirectory';
import { LAYOUTS } from '../plan/pinTemplates';
import type { CaptureStatus, I18nText, ImportReport, LinkCheck, MaskRect, PrintRecord, PrintSet, Rect, ShotKind } from '../types';

/**
 * The PrintSet document read back from the tenant (3.2.7, spec §7.1), as untrusted input.
 *
 * The document is the SE's own, but it outlives app versions and could have been written by an
 * older build or edited by hand; a malformed print must not break the tab or reach the deck. So
 * the set is accepted by its schema, every print is checked field by field and a bad one is
 * dropped (not the whole set), and sizes are capped. A tombstone ("Nova PoC") reads as an empty
 * set that still names its documents, so the next capture reuses them.
 */

export const PRINTSET_SCHEMA = 'pvs.printset.v1';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isIso = (value: unknown): value is string => isString(value) && value.length <= 40 && Number.isFinite(Date.parse(value));
const stringOrNull = (value: unknown): value is string | null => value === null || isString(value);

const KINDS = new Set<ShotKind>(['problem', 'root-cause', 'frontend', 'k8s-cluster', 'failing-service', 'failed-requests', 'logs-errors', 'smartscape', 'vulnerabilities', 'host', 'custom']);
const STATUSES = new Set<CaptureStatus>(['ok', 'session_lost', 'unresolved_link', 'unexpected_page', 'error', 'skipped']);
const MASK_REASONS = new Set<MaskRect['reason']>(['manual', 'email', 'ipv4', 'tenant-url', 'url', 'cloud-host', 'uuid', 'money', 'secret-pair']);
const EVIDENCE = new Set(['verified', 'observed', 'documented', 'guessed', 'manual']);
const NORMALIZATIONS = new Set(['native', 'resized', 'cropped', 'contain']);
const SHA256 = /^[0-9a-f]{64}$/;

function isRect(value: unknown): value is Rect {
  return isObject(value) && [value.x, value.y, value.w, value.h].every(finite) && (value.w as number) >= 0 && (value.h as number) >= 0;
}

function isI18nText(value: unknown): value is I18nText {
  return isObject(value) && isString(value.key) && /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_-]+)+$/.test(value.key) && isObject(value.params) && Object.values(value.params).every(isString);
}

function isSubject(value: unknown): boolean {
  if (!isObject(value) || !isString(value.kind)) return false;
  switch (value.kind) {
    case 'incident':
    case 'none':
      return true;
    case 'service':
      return isString(value.serviceId) && ['root-caller', 'root', 'failing'].includes(value.role as string);
    case 'frontend':
      return isString(value.frontendId) && stringOrNull(value.applicationId) && typeof value.incidentBound === 'boolean';
    case 'k8s-cluster':
      return isString(value.clusterId) && isString(value.clusterName) && typeof value.incidentBound === 'boolean';
    case 'list':
      return ['failed-requests', 'logs-errors', 'vulnerabilities', 'smartscape'].includes(value.list as string);
    case 'host':
      return isString(value.hostId);
    default:
      return false;
  }
}

function isIncident(value: unknown): boolean {
  if (value === null) return true;
  return (
    isObject(value) &&
    isString(value.eventId) &&
    isString(value.displayId) &&
    isString(value.name) &&
    isString(value.category) &&
    stringOrNull(value.rootCauseId) &&
    stringOrNull(value.rootCauseName) &&
    Array.isArray(value.affectedIds) &&
    value.affectedIds.every(isString) &&
    isString(value.startIso) &&
    stringOrNull(value.endIso) &&
    (value.durationNs === null || finite(value.durationNs)) &&
    Array.isArray(value.clusters) &&
    value.clusters.every(isString) &&
    Array.isArray(value.namespaces) &&
    value.namespaces.every(isString)
  );
}

function isMask(value: unknown): value is MaskRect {
  return isRect(value) && MASK_REASONS.has((value as unknown as MaskRect).reason);
}

function isPin(value: unknown): boolean {
  return (
    isObject(value) &&
    finite(value.n) &&
    finite(value.x) &&
    finite(value.y) &&
    ['anchor', 'template', 'manual'].includes(value.origin as string) &&
    (value.anchorKey === undefined || isString(value.anchorKey)) &&
    (value.labelOverride === undefined || (isString(value.labelOverride) && value.labelOverride.length <= 130)) &&
    (value.hidden === undefined || typeof value.hidden === 'boolean')
  );
}

function isApproval(value: unknown): boolean {
  return value === null || (isObject(value) && isIso(value.atIso) && isString(value.imageSha) && isString(value.masksHash) && isString(value.focusHash));
}

/** A print record, field by field. */
export function isPrintRecord(value: unknown): value is PrintRecord {
  if (!isObject(value)) return false;
  const image = value.image;
  const entity = value.entity;
  const companion = value.companion;
  return (
    isString(value.id) &&
    PRINT_ID.test(value.id) &&
    isString(value.slotId) &&
    SHOT_ID.test(value.slotId) &&
    KINDS.has(value.kind as ShotKind) &&
    isString(value.layout) &&
    Object.hasOwn(LAYOUTS, value.layout) &&
    isI18nText(value.titleText) &&
    isObject(entity) &&
    stringOrNull(entity.id) &&
    stringOrNull(entity.name) &&
    isSubject(value.subject) &&
    isIncident(value.incident) &&
    isString(value.requestedPath) &&
    stringOrNull(value.finalPath) &&
    stringOrNull(value.finalAppId) &&
    EVIDENCE.has(value.linkEvidence as string) &&
    ['companion', 'tab-capture', 'manual'].includes(value.source as string) &&
    (value.landing === 'unknown' || STATUSES.has(value.landing as CaptureStatus)) &&
    isIso(value.capturedAtIso) &&
    typeof value.capturedAtApprox === 'boolean' &&
    stringOrNull(value.captureTimeZone) &&
    stringOrNull(value.screenTimeframeLabel) &&
    (companion === null || (isObject(companion) && isString(companion.version) && stringOrNull(companion.planId) && stringOrNull(companion.browser))) &&
    isObject(image) &&
    isString(image.sha256) &&
    SHA256.test(image.sha256) &&
    image.mime === 'image/jpeg' &&
    finite(image.bytes) &&
    image.width === PRINT_SPACE.width &&
    image.height === PRINT_SPACE.height &&
    NORMALIZATIONS.has(image.normalization as string) &&
    typeof image.partial === 'boolean' &&
    Array.isArray(value.anchors) &&
    value.anchors.every((anchor) => isObject(anchor) && isString(anchor.key) && finite(anchor.hit) && isRect(anchor.rect)) &&
    Array.isArray(value.screenNumbers) &&
    value.screenNumbers.every((item) => isObject(item) && isString(item.anchorKey) && finite(item.hit) && Array.isArray(item.values) && item.values.every(finite)) &&
    ['anchor', 'se-confirmed', 'none'].includes(value.identity as string) &&
    Array.isArray(value.pins) &&
    value.pins.every(isPin) &&
    Array.isArray(value.masks) &&
    value.masks.every(isMask) &&
    Array.isArray(value.maskSuggestions) &&
    value.maskSuggestions.every(isMask) &&
    (value.focus === null || isRect(value.focus)) &&
    typeof value.lupaOn === 'boolean' &&
    isApproval(value.approval) &&
    Array.isArray(value.warnings) &&
    value.warnings.every(isString) &&
    ['id', 'url', 'slot', 'rebound'].includes(value.matchedBy as string) &&
    typeof value.edited === 'boolean' &&
    isIso(value.updatedAtIso)
  );
}

function isLinkCheck(value: unknown): value is LinkCheck {
  return isObject(value) && isString(value.templateKey) && STATUSES.has(value.status as CaptureStatus) && stringOrNull(value.finalAppId) && isIso(value.checkedAtIso) && isString(value.companionVersion);
}

function isReport(value: unknown): value is ImportReport {
  return (
    isObject(value) &&
    isIso(value.atIso) &&
    (value.planIdMatch === null || typeof value.planIdMatch === 'boolean') &&
    isObject(value.counts) &&
    Object.values(value.counts).every(finite) &&
    Array.isArray(value.orphans) &&
    value.orphans.every((orphan) => isObject(orphan) && isString(orphan.id) && isString(orphan.title)) &&
    Array.isArray(value.problems) &&
    value.problems.every(isString)
  );
}

function isDocRef(value: unknown): value is { id: string; version: string } {
  return isObject(value) && isString(value.id) && value.id !== '' && isString(value.version);
}

/** A whole set as written by this version (every print valid). */
export function isPrintSet(value: unknown): value is PrintSet {
  return (
    isObject(value) &&
    value.schema === PRINTSET_SCHEMA &&
    isString(value.tenantHost) &&
    isObject(value.pocAnchor) &&
    isString(value.pocAnchor.customer) &&
    stringOrNull(value.pocAnchor.startDate) &&
    isIso(value.createdAtIso) &&
    isIso(value.updatedAtIso) &&
    isString(value.appVersion) &&
    Array.isArray(value.prints) &&
    value.prints.every(isPrintRecord) &&
    Array.isArray(value.linkChecks) &&
    value.linkChecks.every(isLinkCheck) &&
    (value.lastImport === null || isReport(value.lastImport)) &&
    (value.imagesDoc === null || isDocRef(value.imagesDoc)) &&
    (value.cleared === undefined || value.cleared === true)
  );
}

/**
 * A stored set brought to the current shape: the schema must be `pvs.printset.v1`; invalid prints,
 * link checks and a malformed import report are dropped; prints are capped at `LIMITS.prints` and
 * de-duplicated by id. Null when it is not a print set at all.
 */
export function migrate(value: unknown): PrintSet | null {
  if (!isObject(value) || value.schema !== PRINTSET_SCHEMA) return null;
  const now = new Date().toISOString();
  const anchor = isObject(value.pocAnchor) ? value.pocAnchor : {};
  const seen = new Set<string>();
  const stored: unknown[] = Array.isArray(value.prints) ? (value.prints as unknown[]) : [];
  const prints = stored
    .map((print): unknown => (isObject(print) ? { lupaOn: false, edited: false, screenNumbers: [], warnings: [], ...print } : print))
    .filter((print): print is PrintRecord => {
      if (!isPrintRecord(print) || seen.has(print.id)) return false;
      seen.add(print.id);
      return true;
    })
    .slice(0, LIMITS.prints);
  const set: PrintSet = {
    schema: PRINTSET_SCHEMA,
    tenantHost: isString(value.tenantHost) ? value.tenantHost.toLowerCase() : '',
    pocAnchor: { customer: isString(anchor.customer) ? anchor.customer : '', startDate: isString(anchor.startDate) ? anchor.startDate : null },
    createdAtIso: isIso(value.createdAtIso) ? value.createdAtIso : now,
    updatedAtIso: isIso(value.updatedAtIso) ? value.updatedAtIso : now,
    appVersion: isString(value.appVersion) ? value.appVersion : '',
    prints: value.cleared === true ? [] : prints,
    linkChecks: value.cleared === true ? [] : (Array.isArray(value.linkChecks) ? value.linkChecks : []).filter(isLinkCheck).slice(0, 200),
    lastImport: value.cleared !== true && isReport(value.lastImport) ? value.lastImport : null,
    imagesDoc: isDocRef(value.imagesDoc) ? { id: value.imagesDoc.id, version: value.imagesDoc.version } : null,
  };
  if (value.cleared === true) set.cleared = true;
  return set;
}

export interface PocAnchor {
  customer: string;
  startDate: string | null;
}

/** Two PoC anchors name the same PoC (the customer compared trimmed and case-insensitive). */
export function sameAnchor(a: PocAnchor, b: PocAnchor): boolean {
  return a.customer.trim().toLowerCase() === b.customer.trim().toLowerCase() && (a.startDate ?? null) === (b.startDate ?? null);
}

/** A new, empty set for this tenant and PoC. */
export function emptyPrintSet(tenantHost: string, pocAnchor: PocAnchor, appVersion: string, nowIso: string = new Date().toISOString()): PrintSet {
  return {
    schema: PRINTSET_SCHEMA,
    tenantHost: tenantHost.toLowerCase(),
    pocAnchor: { customer: pocAnchor.customer, startDate: pocAnchor.startDate },
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    appVersion,
    prints: [],
    linkChecks: [],
    lastImport: null,
    imagesDoc: null,
  };
}

/** The "Nova PoC" tombstone: no prints, no link checks, no anchor — only the schema and the clear mark. */
export function tombstoneSet(nowIso: string = new Date().toISOString()): PrintSet {
  return { ...emptyPrintSet('', { customer: '', startDate: null }, '', nowIso), cleared: true };
}

/** Link checks merged by address shape; the newest check of each shape wins. */
export function mergeLinkChecks(...lists: readonly (readonly LinkCheck[])[]): LinkCheck[] {
  const byKey = new Map<string, LinkCheck>();
  for (const check of lists.flat()) {
    const kept = byKey.get(check.templateKey);
    if (kept === undefined || Date.parse(check.checkedAtIso) > Date.parse(kept.checkedAtIso)) byKey.set(check.templateKey, check);
  }
  return [...byKey.values()].sort((a, b) => (a.templateKey < b.templateKey ? -1 : a.templateKey > b.templateKey ? 1 : 0));
}

/**
 * Two versions of the set merged after a write conflict (spec §7.1.2): per print, the newer
 * `updatedAtIso` wins; prints only one side has are kept, except those this window removed; link
 * checks are merged by shape; the newest import report wins. The local anchor stays.
 */
export function mergePrintSets(local: PrintSet, remote: PrintSet, removedIds: ReadonlySet<string> = new Set()): PrintSet {
  const byId = new Map<string, PrintRecord>();
  for (const print of remote.prints) if (!removedIds.has(print.id)) byId.set(print.id, print);
  for (const print of local.prints) {
    const theirs = byId.get(print.id);
    if (theirs === undefined || Date.parse(print.updatedAtIso) >= Date.parse(theirs.updatedAtIso)) byId.set(print.id, print);
  }
  const localOrder = new Map(local.prints.map((print, index) => [print.id, index]));
  const prints = [...byId.values()].sort((a, b) => (localOrder.get(a.id) ?? Infinity) - (localOrder.get(b.id) ?? Infinity)).slice(0, LIMITS.prints);
  const reports = [local.lastImport, remote.lastImport].filter((report): report is ImportReport => report !== null);
  reports.sort((a, b) => Date.parse(b.atIso) - Date.parse(a.atIso));
  return {
    ...local,
    createdAtIso: Date.parse(remote.createdAtIso) < Date.parse(local.createdAtIso) ? remote.createdAtIso : local.createdAtIso,
    updatedAtIso: Date.parse(remote.updatedAtIso) > Date.parse(local.updatedAtIso) ? remote.updatedAtIso : local.updatedAtIso,
    prints,
    linkChecks: mergeLinkChecks(remote.linkChecks, local.linkChecks),
    lastImport: reports[0] ?? null,
    imagesDoc: local.imagesDoc ?? remote.imagesDoc,
  };
}

/**
 * The text of a store problem: the `{reason}` of `prt.store.notSaved` for a failed save, and the
 * message of a refused print (`full`: 45 MB, `limit`: 16 prints).
 */
export const STORE_REASON: Readonly<Record<'forbidden' | 'too-large' | 'full' | 'limit' | 'error', StringKey>> = {
  forbidden: 'prt.store.reason.forbidden',
  'too-large': 'prt.store.reason.tooLarge',
  full: 'prt.err.store.full',
  limit: 'prt.err.store.limit',
  error: 'prt.store.reason.error',
};
