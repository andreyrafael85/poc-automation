import JSZip from 'jszip';

import { translate, type StringKey } from '../../../../i18n/strings';
import type { Translation } from '../../../../i18n/useTranslation';
import { LIMITS, PRINT_SPACE } from '../constants';
import { printText } from '../text';
import type { CaptureManifest, CaptureStatus, ImportReport, LinkCheck, ManifestShot, PrintAsset, PrintRecord, ShotPlan } from '../types';
import { blobBytes, jpegBlob, sha256Hex, sniffImage, stripJpegMetadata } from './imageBytes';
import { appIdOfUrl, matchManifest, parseManifest } from './manifest';
import { ASPECT_TOLERANCE, IDENTITY_PLACEMENT, normalizeToTarget, suggestCrop, type Normalization, type Placement } from './normalize';
import {
  anchorsInPrint,
  identityOf,
  initialFocus,
  newPrintId,
  orphanFields,
  screenNumbersOf,
  slotFields,
  suggestionsInPrint,
  tenantPathOf,
  type SlotFields,
} from './record';
import { COMPANION_ZIP_RULES, inspectZipDirectory, type ZipEntryInfo } from './zipDirectory';

/**
 * Imports the companion's ZIP (3.2.7, spec §2.7 "Import order").
 *
 * The ZIP comes from another machine, so nothing in it is trusted until checked, in this order:
 * 1. the archive's own directory (`inspectZipDirectory`: size, entry count, names, methods, no
 *    ZIP64) — before JSZip reads a byte;
 * 2. only the entries the manifest references are extracted, each capped at the size its
 *    directory declared (a deflate entry that inflates past it is refused mid-stream);
 * 3. the manifest (`parseManifest`): schema, companion 1.x, the tenant host equal to this app's own
 *    host with no override, every address on the planner's allowlist;
 * 4. each image: its real type and size from its bytes and its SHA-256 equal to the manifest's.
 *    A companion JPEG at 1720×1080 keeps its exact bytes (`native`); any other size (a v1.0
 *    companion on a HiDPI screen wrote 3440×2160, a detected nav edge other than 200 px gives
 *    another width) is normalised once, and its anchors and mask suggestions follow the image;
 * 5. `matchManifest`: by shot id, then by address; what is left is an orphan, kept apart and listed.
 *
 * The page text the companion read never lands in a record: an anchor keeps its rectangle and the
 * numbers next to it, the page title is not kept at all, and the shot titles in the report are
 * redacted. A probe ZIP (the manifest only) yields link checks and no prints.
 */

export interface ImportRefusal {
  reason: StringKey;
  detail: string;
  /** The params `reason` needs (`{host}`/`{current}`, `{version}`, `{detail}`), already formatted. */
  params: Readonly<Record<string, string>>;
}

export interface ImportResult {
  report: ImportReport;
  /** Planned prints first (bound to a slot), then orphans (their slot id is their own shot id). */
  assets: PrintAsset[];
  linkChecks: LinkCheck[];
  refused: ImportRefusal | null;
  /** The ids of the assets that are orphans (outside the plan). */
  orphanIds: string[];
}

export interface ImportContext {
  plan: ShotPlan;
  tenantHost: string;
  /** The prints already kept (by print id): an image already kept for the same slot is not imported twice. */
  existing: ReadonlyMap<string, PrintRecord>;
  /** Translates the report's problem lines; English when absent (tests). */
  t?: Translation['t'] | undefined;
  /** The import time (tests pin it). */
  nowIso?: string | undefined;
}

type Translate = Translation['t'];

const englishT: Translate = (key, params) => translate(key, 'en', params);

/** The import's own refusal codes, as the `{detail}` of `prt.err.zip`. */
const ZIP_DETAIL: Readonly<Record<string, StringKey>> = {
  not_zip: 'prt.zip.notZip',
  too_many: 'prt.zip.tooMany',
  bad_name: 'prt.zip.badName',
  too_large: 'prt.zip.tooLarge',
  bad_method: 'prt.zip.badMethod',
  zip64: 'prt.zip.zip64',
  no_manifest: 'prt.zip.noManifest',
  unreadable: 'prt.zip.unreadable',
};

export class EntryError extends Error {
  constructor(readonly code: 'too_large' | 'unreadable') {
    super(code);
  }
}

/**
 * One entry's bytes, read through JSZip's stream and stopped as soon as it passes the size its
 * directory declared — a deflate entry that lies about its size cannot inflate past the cap.
 */
export async function extractEntry(zip: JSZip, entry: ZipEntryInfo): Promise<Uint8Array> {
  const file = zip.file(entry.name);
  if (file === null) throw new EntryError('unreadable');
  // `internalStream` is JSZip 3's public-but-untyped streaming reader (`async` is built on it).
  const stream = (file as unknown as { internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array> }).internalStream('uint8array');
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    let done = false;
    const fail = (error: Error) => {
      if (done) return;
      done = true;
      stream.pause();
      reject(error);
    };
    stream
      .on('data', (chunk) => {
        if (done) return;
        total += chunk.length;
        if (total > entry.uncompressed) {
          fail(new EntryError('too_large'));
          return;
        }
        chunks.push(chunk);
      })
      .on('error', () => fail(new EntryError('unreadable')))
      .on('end', () => {
        if (done) return;
        done = true;
        if (total !== entry.uncompressed) {
          reject(new EntryError('too_large'));
          return;
        }
        const out = new Uint8Array(total);
        let at = 0;
        for (const chunk of chunks) {
          out.set(chunk, at);
          at += chunk.length;
        }
        resolve(out);
      })
      .resume();
  });
}

const emptyReport = (atIso: string): ImportReport => ({ atIso, planIdMatch: null, counts: {}, orphans: [], problems: [] });

function refusal(atIso: string, t: Translate, reason: StringKey, detail: string, params: Record<string, string>): ImportResult {
  const report = emptyReport(atIso);
  report.counts.refused = 1;
  report.problems.push(printText(t(reason, params), 300, 'se'));
  return { report, assets: [], linkChecks: [], refused: { reason, detail, params }, orphanIds: [] };
}

function zipRefusal(atIso: string, t: Translate, code: string): ImportResult {
  const key = ZIP_DETAIL[code] ?? 'prt.zip.unreadable';
  return refusal(atIso, t, 'prt.err.zip', code, { detail: t(key) });
}

/** The problem line of a shot that is not `ok` (its number is its place in the manifest). */
function landingProblem(shot: ManifestShot, index: number, t: Translate): string | null {
  const name = printText(shot.title, 80, 'se');
  const line = (text: string) => t('prt.err.file', { name, why: text });
  if (shot.offTenant === true) return line(t('prt.err.offTenant'));
  switch (shot.status) {
    case 'session_lost':
      return line(t('prt.err.sessionLost', { n: String(index + 1) }));
    case 'unresolved_link':
      return line(t('prt.err.unresolved'));
    case 'unexpected_page':
      return line(t('prt.err.unexpected', { app: shot.finalAppId ?? appIdOfUrl(shot.finalUrl) ?? '—' }));
    case 'error':
      return line(t('prt.err.error'));
    default:
      return null;
  }
}

/** Crop CSS pixels → print pixels for an image of this size, via its normalisation. */
function placementFor(manifest: CaptureManifest, shot: ManifestShot, imageWidth: number, imageHeight: number, normalized: Placement): Placement {
  const cssWidth = manifest.viewport.width - (shot.clipX ?? 0);
  const cssHeight = manifest.viewport.height;
  // Image pixels per CSS pixel (the device scale factor of a v1.0 HiDPI capture); 1 when unknown.
  // The clip is always the viewport's full height, so the height gives it even when `clipX` is
  // missing (the width would then be read against the uncropped viewport and come out wrong).
  const kx = cssWidth > 0 ? imageWidth / cssWidth : Number.NaN;
  const ky = cssHeight > 0 ? imageHeight / cssHeight : Number.NaN;
  const k = Number.isFinite(ky) && ky > 0 ? ky : Number.isFinite(kx) && kx > 0 ? kx : 1;
  return { sx: normalized.sx / k, sy: normalized.sy / k, scale: normalized.scale * k, dx: normalized.dx, dy: normalized.dy };
}

interface Master {
  blob: Blob;
  sha256: string;
  bytes: number;
  normalization: Normalization;
  partial: boolean;
  placement: Placement;
}

type FileWhy = 'type' | 'dims' | 'corrupt' | 'size' | 'decode';

/** The master of one `ok` shot, or why its file is refused. */
async function masterOf(manifest: CaptureManifest, shot: ManifestShot, bytes: Uint8Array): Promise<Master | FileWhy> {
  if (bytes.length > LIMITS.imageBytesIn) return 'size';
  const sniffed = sniffImage(bytes);
  if (sniffed === null || sniffed.mime !== 'image/jpeg') return 'type';
  const { minImage, maxImage } = LIMITS;
  if (sniffed.width < minImage.width || sniffed.height < minImage.height || sniffed.width > maxImage.width || sniffed.height > maxImage.height) return 'dims';
  const sha256 = await sha256Hex(bytes);
  if (shot.sha256 === null || sha256 !== shot.sha256) return 'corrupt';
  const kept = sniffed.width === PRINT_SPACE.width && sniffed.height === PRINT_SPACE.height ? stripJpegMetadata(bytes) : null;
  if (kept !== null) {
    // The companion's own JPEG q82: no second lossy encode. Its picture is kept byte for byte, but
    // never a metadata segment (a Playwright JPEG has none; a hand-made ZIP might).
    const css = placementFor(manifest, shot, sniffed.width, sniffed.height, IDENTITY_PLACEMENT);
    return { blob: jpegBlob(kept), sha256: kept === bytes ? sha256 : await sha256Hex(kept), bytes: kept.length, normalization: 'native', partial: false, placement: css };
  }
  try {
    // `--crop none` kept the platform's navigation (clip at 0): cut it the way a manual snip is cut,
    // at 200/1920 of the width, instead of letterboxing the whole window.
    const uncropped = (shot.clipX ?? 0) === 0 && sniffed.width / sniffed.height > (PRINT_SPACE.width / PRINT_SPACE.height) * (1 + ASPECT_TOLERANCE);
    const normalized = await normalizeToTarget(jpegBlob(bytes), uncropped ? suggestCrop(sniffed.width, sniffed.height, null) : null);
    return {
      blob: normalized.blob,
      sha256: normalized.sha256,
      bytes: normalized.bytes,
      normalization: normalized.normalization,
      partial: normalized.partial,
      placement: placementFor(manifest, shot, sniffed.width, sniffed.height, normalized.placement),
    };
  } catch {
    return 'decode';
  }
}

const FILE_WHY_KEY: Readonly<Record<FileWhy, StringKey>> = {
  type: 'prt.err.file.type',
  dims: 'prt.err.file.dims',
  corrupt: 'prt.err.file.corrupt',
  size: 'prt.err.file.size',
  decode: 'prt.err.file.decode',
};

/** The record of a companion print, bound to its slot (or kept as an orphan). */
function companionRecord(manifest: CaptureManifest, shot: ManifestShot, master: Master, fields: SlotFields, matchedBy: PrintRecord['matchedBy'], tenantHost: string, nowIso: string): PrintRecord {
  const anchors = anchorsInPrint(shot.anchors, master.placement);
  const focus = initialFocus(fields.layout, anchors);
  const warnings = [...shot.warnings];
  if (master.normalization !== 'native') warnings.push(`normalized:${master.normalization}`);
  return {
    id: newPrintId(),
    ...fields,
    finalPath: tenantPathOf(shot.finalUrl, tenantHost),
    finalAppId: shot.finalAppId ?? appIdOfUrl(shot.finalUrl),
    source: 'companion',
    landing: shot.status,
    capturedAtIso: shot.capturedAt ?? manifest.finishedAt ?? manifest.startedAt,
    capturedAtApprox: shot.capturedAt === null,
    captureTimeZone: manifest.browserTimeZone ?? null,
    screenTimeframeLabel: shot.timeframeLabel ?? null,
    companion: { version: manifest.companionVersion ?? '1.0.0', planId: manifest.planId ?? null, browser: manifest.browser },
    image: { sha256: master.sha256, mime: 'image/jpeg', bytes: master.bytes, width: PRINT_SPACE.width, height: PRINT_SPACE.height, normalization: master.normalization, partial: master.partial },
    anchors,
    screenNumbers: screenNumbersOf(shot.anchors),
    identity: identityOf(fields.layout, anchors),
    pins: [],
    masks: [],
    maskSuggestions: suggestionsInPrint(shot.maskSuggestions ?? [], master.placement),
    focus,
    lupaOn: focus !== null,
    approval: null,
    warnings,
    matchedBy,
    edited: false,
    updatedAtIso: nowIso,
  };
}

/**
 * Reads a companion ZIP for this plan and tenant. Never throws: a refused archive comes back with
 * `refused` set and its reason in the report; per-shot problems are listed and counted.
 */
export async function readCompanionZip(file: File | Blob, ctx: ImportContext): Promise<ImportResult> {
  const t = ctx.t ?? englishT;
  const atIso = ctx.nowIso ?? new Date().toISOString();
  if (file.size > LIMITS.zipBytes) return zipRefusal(atIso, t, 'too_large');

  let bytes: Uint8Array;
  try {
    bytes = await blobBytes(file);
  } catch {
    return zipRefusal(atIso, t, 'unreadable');
  }
  const directory = inspectZipDirectory(bytes, COMPANION_ZIP_RULES);
  if (!directory.ok) return zipRefusal(atIso, t, directory.reason);
  const manifestEntry = directory.entries.find((entry) => entry.name === 'manifest.json');
  if (manifestEntry === undefined) return zipRefusal(atIso, t, 'no_manifest');

  let zip: JSZip;
  let json: unknown;
  try {
    // No `checkCRC32`: it would inflate every entry up front. Images are checked by their SHA-256.
    zip = await JSZip.loadAsync(bytes);
    json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await extractEntry(zip, manifestEntry)));
  } catch (error) {
    if (error instanceof EntryError) return zipRefusal(atIso, t, error.code);
    return refusal(atIso, t, 'prt.err.schema', 'manifest', {});
  }

  const parsed = parseManifest(json, ctx.tenantHost);
  if (!parsed.ok) {
    const current = ctx.tenantHost === '' ? '—' : ctx.tenantHost;
    const params: Record<string, string> =
      parsed.reason === 'prt.err.tenant'
        ? { host: parsed.detail === '' ? '—' : parsed.detail, current }
        : parsed.reason === 'prt.err.version'
          ? { version: parsed.detail }
          : { detail: parsed.detail };
    return refusal(atIso, t, parsed.reason, parsed.detail, params);
  }
  const { manifest } = parsed;
  const match = matchManifest(ctx.plan, manifest);
  const report: ImportReport = { atIso, planIdMatch: match.planIdMatch, counts: {}, orphans: [], problems: [] };
  const count = (key: CaptureStatus | 'orphan' | 'refused') => {
    report.counts[key] = (report.counts[key] ?? 0) + 1;
  };
  if (match.planIdMatch === false) report.problems.push(t('prt.imp.planMismatch'));
  if (manifest.mode === 'probe') report.problems.push(t('prt.imp.probe', { count: String(match.linkChecks.length) }));

  manifest.shots.forEach((shot, index) => {
    if (shot.status === 'ok') {
      // An ok shot with an image is counted below, once its file is checked; one without (a probe)
      // has nothing to import, and its link check stands.
      if (shot.file === null) count('ok');
      return;
    }
    count(shot.status);
    const problem = landingProblem(shot, index, t);
    if (problem !== null) report.problems.push(printText(problem, 300, 'se'));
  });

  const slots = new Map(ctx.plan.slots.map((slot) => [slot.id, slot]));
  const keptBySlot = new Map<string, Set<string>>();
  for (const record of ctx.existing.values()) {
    const shas = keptBySlot.get(record.slotId) ?? new Set<string>();
    shas.add(record.image.sha256);
    keptBySlot.set(record.slotId, shas);
  }
  const entries = new Map(directory.entries.map((entry) => [entry.name, entry]));
  const assets: PrintAsset[] = [];
  const orphanIds: string[] = [];
  const work: { shot: ManifestShot; fields: SlotFields; matchedBy: PrintRecord['matchedBy']; orphan: boolean }[] = [
    ...match.attach.flatMap(({ slotId, shot, matchedBy }) => {
      const slot = slots.get(slotId);
      return slot === undefined ? [] : [{ shot, fields: slotFields(slot), matchedBy, orphan: false }];
    }),
    ...match.orphans.map((shot) => ({ shot, fields: orphanFields(shot), matchedBy: 'id' as const, orphan: true })),
  ];

  for (const { shot, fields, matchedBy, orphan } of work) {
    const name = printText(shot.title, 80, 'se');
    const entry = shot.file === null ? undefined : entries.get(shot.file);
    if (entry === undefined) {
      count('refused');
      report.problems.push(t('prt.err.file', { name, why: t('prt.err.file.missing') }));
      continue;
    }
    let master: Master | FileWhy;
    try {
      master = await masterOf(manifest, shot, await extractEntry(zip, entry));
    } catch (error) {
      master = error instanceof EntryError && error.code === 'too_large' ? 'size' : 'corrupt';
    }
    if (typeof master === 'string') {
      count('refused');
      report.problems.push(t('prt.err.file', { name, why: t(FILE_WHY_KEY[master]) }));
      continue;
    }
    if (keptBySlot.get(fields.slotId)?.has(master.sha256) === true) {
      report.problems.push(t('prt.imp.duplicate', { name }));
      continue;
    }
    const record = companionRecord(manifest, shot, master, fields, matchedBy, ctx.tenantHost, atIso);
    if (orphan) {
      count('orphan');
      report.orphans.push({ id: shot.id, title: name });
      orphanIds.push(record.id);
    } else count('ok');
    assets.push({ record, master: master.blob, thumbUrl: null });
  }

  return { report, assets, linkChecks: match.linkChecks, refused: null, orphanIds };
}
