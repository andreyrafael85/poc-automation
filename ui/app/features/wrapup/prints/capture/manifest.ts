import type { StringKey } from '../../../../i18n/strings';
import { COMPANION_SUPPORTED, LIMITS, SHOT_ID } from '../constants';
import { urlTemplateKey } from '../plan/linkChecks';
import { validateCustomUrl } from '../plan/planner';
import { numericTokens, parseScreenTimeframe, printText } from '../text';
import type {
  CaptureManifest,
  CaptureStatus,
  LinkCheck,
  ManifestAnchor,
  ManifestMask,
  ManifestShot,
  MaskReason,
  ShotKind,
  ShotPlan,
} from '../types';
import { isBlockedTenant } from './tenantGuard';

/**
 * The companion's manifest (`pvs.capture.manifest.v1`), read as untrusted input (3.2.7, real prints).
 *
 * A manifest written by companion 1.0 (no version field) or 1.1 (additive fields: version, plan
 * id, mode, browser time zone, device scale factor, stop reason, multi-hit anchors with their
 * numbers, mask suggestions, the screen's timeframe label, the final app id, the off-tenant flag)
 * is accepted; anything else is refused with the reason the SE reads. The guards that matter:
 * - the tenant host must be this app's own host — there is no override, so a ZIP captured on a
 *   customer's tenant can never land in another PoC;
 * - every requested address passes the planner's own allowlist (https, this tenant, `/ui/`, never
 *   `/ui/entity/`, never a licensing, billing or cost screen);
 * - the page text the companion read (`anchors[].label`, `pageTitle`) is never kept: a label
 *   becomes its numeric tokens here, and the page title only reaches the import report redacted.
 *
 * Matching is by shot id first, then by the normalised address; what is left is an orphan and is
 * never silently bound to a slot. A probe ZIP (only `manifest.json`) gives link checks and nothing
 * else.
 */

export type ParsedManifest = { ok: true; manifest: CaptureManifest; version: string } | { ok: false; reason: StringKey; detail: string };

const STATUSES = new Set<CaptureStatus>(['ok', 'session_lost', 'unresolved_link', 'unexpected_page', 'error', 'skipped']);
const MASK_REASONS = new Set<MaskReason>(['email', 'ipv4', 'tenant-url', 'url', 'cloud-host', 'uuid', 'money', 'secret-pair']);
const SHOT_KINDS = new Set<ShotKind>(['problem', 'root-cause', 'frontend', 'k8s-cluster', 'failing-service', 'failed-requests', 'logs-errors', 'smartscape', 'vulnerabilities', 'host', 'custom']);
const SHOT_FILE = /^shots\/\d{2}_[a-z0-9][a-z0-9_-]{0,63}\.jpe?g$/;
const SHA256 = /^[0-9a-f]{64}$/;
const APP_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
/** Query parameters that only set the window: two links to one screen differ in nothing else. */
const WINDOW_PARAMS = new Set(['from', 'to', 'tf', 'gtf']);

const MAX_SHOTS = 64;
const MAX_ANCHORS = 64;
const MAX_MASKS = 200;
const MAX_WARNINGS = 20;
const MAX_TEXT = 200;
const MAX_TITLE = 120;
const MAX_TIMEFRAME = 40;
const MAX_URL = 2048;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const text = (value: unknown, max: number): string | null => (typeof value === 'string' ? value.slice(0, max) : null);
const isoOrNull = (value: unknown): string | null => (typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? value : null);
const numberOrNull = (value: unknown): number | null => (finite(value) && value >= 0 ? value : null);

/** A real IANA zone name the browser knows ("America/Sao_Paulo"); anything else is dropped. */
function timeZoneOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value === '' || value.length > 64) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format(0);
    return value;
  } catch {
    return null;
  }
}

/**
 * The screen's timeframe label is page text: only a label the deck can read ("Last 30 minutes")
 * is kept, so nothing else the page showed travels on through it.
 */
function timeframeOrNull(value: unknown): string | null {
  const label = text(value, MAX_TIMEFRAME);
  return label !== null && parseScreenTimeframe(label) !== null ? label.replace(/\s+/g, ' ').trim() : null;
}

/** The companion's own codes stay as they are; any other warning (an error's first line may quote an address) is redacted. */
function cleanWarning(warning: string): string {
  if (warning === 'off_tenant' || /^ui_lang:[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(warning)) return warning;
  return printText(warning, MAX_TEXT, 'se');
}

class ManifestError extends Error {
  constructor(
    readonly reason: StringKey,
    readonly detail: string,
  ) {
    super(detail);
  }
}

const schemaError = (detail: string) => new ManifestError('prt.err.schema', detail);

function readAnchor(value: unknown): ManifestAnchor | null {
  if (!isObject(value)) return null;
  const key = text(value.key, 64);
  const matched = text(value.matched, 120) ?? '';
  const { x, y, width, height, fx, fy } = value;
  if (key === null || key === '' || ![x, y, width, height, fx, fy].every(finite)) return null;
  const hit = finite(value.hit) && Number.isInteger(value.hit) && value.hit >= 0 && value.hit <= 2 ? value.hit : 0;
  // 1.1 sends the numbers; 1.0 only the raw label, which is reduced to its numbers here and dropped.
  const numbers = Array.isArray(value.numbers)
    ? value.numbers.filter((item): item is string => typeof item === 'string').flatMap((item) => numericTokens(item.slice(0, 40)))
    : typeof value.label === 'string'
      ? numericTokens(value.label.slice(0, 200))
      : [];
  return { key, matched, x: x as number, y: y as number, width: width as number, height: height as number, fx: fx as number, fy: fy as number, hit, numbers: numbers.slice(0, 4) };
}

function readMask(value: unknown): ManifestMask | null {
  if (!isObject(value) || !MASK_REASONS.has(value.reason as MaskReason)) return null;
  const { x, y, width, height } = value;
  if (![x, y, width, height].every(finite) || (width as number) <= 0 || (height as number) <= 0) return null;
  return { reason: value.reason as MaskReason, x: x as number, y: y as number, width: width as number, height: height as number };
}

function readShot(value: unknown, index: number, tenantHost: string): ManifestShot {
  if (!isObject(value)) throw schemaError(`shots[${index}]`);
  const id = text(value.id, 64);
  if (id === null || !SHOT_ID.test(id)) throw schemaError(`shots[${index}].id`);
  const status = value.status as CaptureStatus;
  if (!STATUSES.has(status)) throw schemaError(`${id}.status`);
  const requestedUrl = text(value.requestedUrl, MAX_URL + 1);
  if (requestedUrl === null) throw schemaError(`${id}.requestedUrl`);
  const allowed = validateCustomUrl(requestedUrl, tenantHost);
  if (!allowed.ok) throw new ManifestError(allowed.reason, id);
  const file = value.file === null || value.file === undefined ? null : text(value.file, 100);
  if (file !== null && !SHOT_FILE.test(file)) throw schemaError(`${id}.file`);
  const sha256 = value.sha256 === null || value.sha256 === undefined ? null : text(value.sha256, 64);
  if (sha256 !== null && !SHA256.test(sha256)) throw schemaError(`${id}.sha256`);
  const finalAppId = text(value.finalAppId, 128);
  return {
    id,
    title: text(value.title, MAX_TITLE) ?? id,
    requestedUrl,
    finalUrl: text(value.finalUrl, MAX_URL),
    status,
    file,
    width: numberOrNull(value.width),
    height: numberOrNull(value.height),
    bytes: numberOrNull(value.bytes),
    sha256,
    clipX: numberOrNull(value.clipX),
    anchors: (Array.isArray(value.anchors) ? value.anchors : [])
      .slice(0, MAX_ANCHORS)
      .map(readAnchor)
      .filter((anchor): anchor is ManifestAnchor => anchor !== null),
    pageTitle: text(value.pageTitle, MAX_TEXT),
    capturedAt: isoOrNull(value.capturedAt),
    warnings: (Array.isArray(value.warnings) ? value.warnings : [])
      .filter((warning): warning is string => typeof warning === 'string')
      .slice(0, MAX_WARNINGS)
      .map(cleanWarning),
    maskSuggestions: (Array.isArray(value.maskSuggestions) ? value.maskSuggestions : [])
      .slice(0, MAX_MASKS)
      .map(readMask)
      .filter((mask): mask is ManifestMask => mask !== null),
    timeframeLabel: timeframeOrNull(value.timeframeLabel),
    offTenant: value.offTenant === true,
    finalAppId: finalAppId !== null && APP_ID.test(finalAppId) ? finalAppId : null,
  };
}

/**
 * Validates a manifest (already JSON-parsed) for this app's tenant. 1.0 manifests (no version)
 * and 1.1 ones are accepted; `version` is the companion version it was written by.
 */
export function parseManifest(json: unknown, appTenantHost: string): ParsedManifest {
  try {
    if (!isObject(json) || json.schema !== 'pvs.capture.manifest.v1') throw schemaError('schema');
    const version = json.companionVersion === undefined || json.companionVersion === null ? '1.0.0' : text(json.companionVersion, 32);
    if (version === null) throw schemaError('companionVersion');
    if (!COMPANION_SUPPORTED.test(version)) throw new ManifestError('prt.err.version', version);
    const host = typeof json.tenantHost === 'string' ? json.tenantHost.trim().toLowerCase().slice(0, 253) : '';
    const own = appTenantHost.trim().toLowerCase();
    // A customer tenant this app must never read (rule 11) is refused first, even if the app ran there.
    if (isBlockedTenant(host) || isBlockedTenant(own)) throw new ManifestError('prt.err.tenant', host);
    // No override: a ZIP from any other tenant — or an app that cannot tell its own — imports nothing.
    if (host === '' || own === '' || host !== own) throw new ManifestError('prt.err.tenant', host);
    if (!Array.isArray(json.shots) || json.shots.length > MAX_SHOTS) throw schemaError('shots');
    const viewport = json.viewport;
    if (!isObject(viewport) || !finite(viewport.width) || !finite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) throw schemaError('viewport');
    const crop = isObject(json.crop) && (json.crop.mode === 'auto' || json.crop.mode === '200' || json.crop.mode === 'none') ? json.crop.mode : 'auto';
    const startedAt = isoOrNull(json.startedAt);
    if (startedAt === null) throw schemaError('startedAt');
    const shots = json.shots.map((shot, index) => readShot(shot, index, own));
    const seen = new Set<string>();
    for (const shot of shots) {
      if (seen.has(shot.id)) throw schemaError(`${shot.id} repeated`);
      seen.add(shot.id);
    }
    const stopReason = json.stopReason === 'session_lost' || json.stopReason === 'off_tenant' ? json.stopReason : null;
    const manifest: CaptureManifest = {
      schema: 'pvs.capture.manifest.v1',
      tenantHost: host,
      shotlistGeneratedAt: isoOrNull(json.shotlistGeneratedAt),
      browser: text(json.browser, 120),
      viewport: { width: viewport.width, height: viewport.height },
      crop: { mode: crop },
      startedAt,
      finishedAt: isoOrNull(json.finishedAt),
      shots,
      companionVersion: version,
      planId: text(json.planId, 64),
      mode: json.mode === 'probe' ? 'probe' : 'capture',
      browserTimeZone: timeZoneOrNull(json.browserTimeZone),
      deviceScaleFactor: finite(json.deviceScaleFactor) && json.deviceScaleFactor > 0 && json.deviceScaleFactor <= 8 ? json.deviceScaleFactor : null,
      stopReason,
    };
    return { ok: true, manifest, version };
  } catch (error) {
    if (error instanceof ManifestError) return { ok: false, reason: error.reason, detail: error.detail };
    return { ok: false, reason: 'prt.err.schema', detail: 'manifest' };
  }
}

/**
 * An address as matching sees it: lower-case host, path, the query without its window parameters
 * (`from`, `to`, `tf`, `gtf`) and sorted, and the hash kept (Logs and Smartscape live in it).
 */
export function normalizeUrlForMatch(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const params = [...parsed.searchParams.entries()]
    .filter(([key]) => !WINDOW_PARAMS.has(key))
    .sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  const query = new URLSearchParams(params).toString();
  return `${parsed.host.toLowerCase()}${parsed.pathname}${query === '' ? '' : `?${query}`}${parsed.hash}`;
}

export interface MatchResult {
  /** `ok` shots with an image, bound to a planned slot. */
  attach: { slotId: string; shot: ManifestShot; matchedBy: 'id' | 'url' }[];
  /** `ok` shots with an image that match no planned slot (listed, never re-bound silently). */
  orphans: ManifestShot[];
  /** Shots that are not `ok`. */
  failures: ManifestShot[];
  linkChecks: LinkCheck[];
  /** Null when the manifest carries no plan id (companion 1.0). */
  planIdMatch: boolean | null;
}

/** The shot kind an id names (`${kind}--…`); 'custom' when it names none. */
export function kindOfShotId(id: string): ShotKind {
  const prefix = id.split('--')[0] as ShotKind;
  return SHOT_KINDS.has(prefix) ? prefix : 'custom';
}

/** The app id of an address on the tenant (`/ui/apps/<id>/…`, `/ui/intent/<id>/…`), or null. */
export function appIdOfUrl(url: string | null): string | null {
  if (url === null) return null;
  try {
    return /^\/ui\/(?:apps|intent)\/([^/]+)/.exec(new URL(url).pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Statuses that say something about the address itself (an off-tenant landing says nothing about it). */
const CONCLUSIVE = new Set<CaptureStatus>(['ok', 'unresolved_link', 'unexpected_page']);

/**
 * The link checks a manifest proves (probe or capture): one per shot that landed conclusively,
 * keyed by the slot's address shape when the shot is planned, else by the shape of its own address.
 */
export function linkChecksFrom(plan: ShotPlan, manifest: CaptureManifest): LinkCheck[] {
  const version = manifest.companionVersion ?? '1.0.0';
  const checks: LinkCheck[] = [];
  for (const shot of manifest.shots) {
    if (!CONCLUSIVE.has(shot.status) || shot.offTenant === true) continue;
    const slot = plan.slots.find((candidate) => candidate.id === shot.id);
    const templateKey = slot !== undefined && slot.urlTemplateKey !== '' ? slot.urlTemplateKey : urlTemplateKey(kindOfShotId(shot.id), shot.requestedUrl);
    checks.push({
      templateKey,
      status: shot.status,
      finalAppId: shot.finalAppId ?? appIdOfUrl(shot.finalUrl),
      checkedAtIso: shot.capturedAt ?? manifest.finishedAt ?? manifest.startedAt,
      companionVersion: version,
    });
  }
  return checks;
}

/**
 * Binds the manifest's shots to the plan: by id, then by normalised address; each slot takes one
 * shot (an id match beats an address match). A shot that is `ok` but carries no image (a probe)
 * only feeds the link checks.
 */
export function matchManifest(plan: ShotPlan, manifest: CaptureManifest): MatchResult {
  const attach: MatchResult['attach'] = [];
  const orphans: ManifestShot[] = [];
  const failures: ManifestShot[] = [];
  const taken = new Set<string>();
  const planned = plan.slots.filter((slot) => slot.chosen !== null);
  const captured = manifest.shots.filter((shot) => {
    if (shot.status !== 'ok') {
      failures.push(shot);
      return false;
    }
    return shot.file !== null;
  });
  const byUrl: ManifestShot[] = [];
  for (const shot of captured) {
    const slot = planned.find((candidate) => candidate.id === shot.id);
    if (slot !== undefined && !taken.has(slot.id)) {
      taken.add(slot.id);
      attach.push({ slotId: slot.id, shot, matchedBy: 'id' });
    } else byUrl.push(shot);
  }
  for (const shot of byUrl) {
    const wanted = normalizeUrlForMatch(shot.requestedUrl);
    const slot = planned.find((candidate) => !taken.has(candidate.id) && candidate.chosen !== null && normalizeUrlForMatch(candidate.chosen.url) === wanted);
    if (slot === undefined) {
      orphans.push(shot);
      continue;
    }
    taken.add(slot.id);
    attach.push({ slotId: slot.id, shot, matchedBy: 'url' });
  }
  const planId = typeof manifest.planId === 'string' && manifest.planId !== '' ? manifest.planId : null;
  return { attach, orphans, failures, linkChecks: linkChecksFrom(plan, manifest), planIdMatch: planId === null ? null : planId === plan.planId };
}

/** The manifest's caps, re-exported for the import (one place for the numbers). */
export const MANIFEST_LIMITS = { bytes: LIMITS.manifestBytes, shots: MAX_SHOTS } as const;
