import { createHash } from 'node:crypto';

import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translate } from '../i18n/strings';
import { LIMITS, MASK_FILL, PRINT_SPACE } from '../features/wrapup/prints/constants';
import { CORRUPT, approvalBlockers, approvalState, approve, isApproved } from '../features/wrapup/prints/capture/approval';
import { bakeAll, bakeLadder, bakePrint, canonicalMasks, hashFocus, hashMasks } from '../features/wrapup/prints/capture/bake';
import { blobBytes, sha256Hex, sniffImage, stripJpegMetadata } from '../features/wrapup/prints/capture/imageBytes';
import { IntakeError, checkImageFile, droppedImage, intakeFile, pastedImage } from '../features/wrapup/prints/capture/intake';
import { linkChecksFrom, matchManifest, normalizeUrlForMatch, parseManifest } from '../features/wrapup/prints/capture/manifest';
import { detectNavEdge, medianColor, normalizeToTarget, placeRect, planNormalization, suggestCrop } from '../features/wrapup/prints/capture/normalize';
import { initialFocus, reboundTo } from '../features/wrapup/prints/capture/record';
import { inspectZipDirectory } from '../features/wrapup/prints/capture/zipDirectory';
import { readCompanionZip } from '../features/wrapup/prints/capture/zipImport';
import { urlTemplateKey } from '../features/wrapup/prints/plan/linkChecks';
import { LUPA_MAX_PX } from '../features/wrapup/prints/plan/pinTemplates';
import { LAYOUT_OF } from '../features/wrapup/prints/plan/planner';
import type { CaptureManifest, PrintRecord, ShotKind, ShotPlan, ShotSlot } from '../features/wrapup/prints/types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM script, no declaration file
import * as zipModule from '../../../scripts/visual/zipStore.mjs';

/**
 * Capture intake, normalisation, bake and approval of the real prints (3.2.7, WP4, spec §2.7, §7.2).
 *
 * The companion's ZIP comes from another machine and a manual snip from anywhere, so the intake is
 * tested as a parser of untrusted input: real types and sizes from the bytes, crafted ZIP
 * directories, manifests from another tenant or another companion, addresses off the allowlist,
 * page text that must never be kept. The ZIPs are written with the companion's own `zipStore` (moved to `scripts/visual/zipStore.mjs` when the companion was retired in 3.3.2).
 * jsdom has no canvas: the raster layer is replaced by a recording fake, so the drawing decisions
 * (crop, fit, padding, mask fill, downscale) are asserted on the calls.
 */

const fake = vi.hoisted(() => {
  /** A minimal baseline JPEG (APP0, SOF0, SOS) of this size, then `payload` bytes of scan and EOI. */
  const jpeg = (width: number, height: number, payload = 64): Uint8Array<ArrayBuffer> => {
    const head = [
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
    ];
    const out = new Uint8Array(head.length + payload + 2);
    out.set(head);
    for (let i = 0; i < payload; i += 1) out[head.length + i] = (i * 7) & 0x7f;
    out.set([0xff, 0xd9], head.length + payload);
    return out;
  };
  return {
    jpeg,
    ops: [] as { op: string; args: unknown[] }[],
    /** The size of an encoded image (to drive the ladder); default 2 KB. */
    encodeSize: null as null | ((width: number, height: number, quality: number | undefined) => number),
  };
});

vi.mock('../features/wrapup/prints/capture/raster', async () => {
  const actual = await vi.importActual<typeof import('../features/wrapup/prints/capture/imageBytes')>('../features/wrapup/prints/capture/imageBytes');
  return {
    hasRaster: () => true,
    decodeImage: async (blob: Blob) => {
      const size = actual.sniffImage(await actual.blobBytes(blob));
      if (size === null) throw new Error('undecodable');
      fake.ops.push({ op: 'decode', args: [size.width, size.height] });
      return { width: size.width, height: size.height, source: {}, close: () => fake.ops.push({ op: 'close', args: [] }) };
    },
    newSurface: (width: number, height: number) => {
      fake.ops.push({ op: 'surface', args: [width, height] });
      return {
        width,
        height,
        fillRect: (...args: unknown[]) => fake.ops.push({ op: 'fillRect', args }),
        drawImage: (_image: unknown, ...args: unknown[]) => fake.ops.push({ op: 'drawImage', args }),
        gray: () => new Uint8ClampedArray(width * height),
        row: () => new Uint8ClampedArray(width * 3).fill(0xee),
        encode: (type: string, quality?: number) => {
          fake.ops.push({ op: 'encode', args: [type, quality, width, height] });
          const payload = fake.encodeSize?.(width, height, quality) ?? 2048;
          return Promise.resolve(new Blob([fake.jpeg(width, height, payload)], { type }));
        },
      };
    },
  };
});

/** The stored-ZIP writer the retired companion used, kept for the tests and the harness (3.3.2). */
interface ZipWriter {
  zipStore(entries: { name: string; data: Buffer }[], when?: Date): Buffer;
}
const companion = zipModule as ZipWriter;

const HOST = 'abc12345.apps.dynatrace.com';
const EVENT = '1495944828232761706_1790117520000V2';
const ETM = 'SERVICE-C44033DE8492CF45';
const PROBLEM_URL = `https://${HOST}/ui/apps/dynatrace.davis.problems/problem/${EVENT}?from=now%28%29-15d&to=now%28%29&filters=ID+%3D+P-260914359`;
const SERVICE_URL = `https://${HOST}/ui/apps/dynatrace.services/explorer/services?perspective=performance&sort=healthIndicators%3Adescending&detailsId=${ETM}&sidebarOpen=false`;
const LOGS_URL = `https://${HOST}/ui/apps/dynatrace.logs/#%7B%22version%22%3A2%7D`;
const NOW = '2026-10-05T19:00:00.000Z';

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const t = (key: Parameters<typeof translate>[0], params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);

function png(width: number, height: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(33);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(out.buffer).setUint32(16, width);
  new DataView(out.buffer).setUint32(20, height);
  out.set([8, 6, 0, 0, 0], 24);
  return out;
}

function webp(chunk: 'VP8 ' | 'VP8L' | 'VP8X', width: number, height: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(40);
  out.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  out.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8);
  out.set([...chunk].map((c) => c.charCodeAt(0)), 12);
  const view = new DataView(out.buffer);
  if (chunk === 'VP8 ') {
    out.set([0x9d, 0x01, 0x2a], 23);
    view.setUint16(26, width, true);
    view.setUint16(28, height, true);
  } else if (chunk === 'VP8L') {
    out[20] = 0x2f;
    view.setUint32(21, ((width - 1) | ((height - 1) << 14)) >>> 0, true);
  } else {
    view.setUint16(24, (width - 1) & 0xffff, true);
    out[26] = (width - 1) >> 16;
    view.setUint16(27, (height - 1) & 0xffff, true);
    out[29] = (height - 1) >> 16;
  }
  return out;
}

const zipFile = (entries: { name: string; data: Uint8Array | string }[]) =>
  new File([new Uint8Array(companion.zipStore(entries.map(({ name, data }) => ({ name, data: Buffer.from(data) }))))], 'capture.zip', { type: 'application/zip' });

function slot(kind: ShotKind, id: string, url: string, extra: Partial<ShotSlot> = {}): ShotSlot {
  return {
    id,
    kind,
    layout: LAYOUT_OF[kind],
    order: 1,
    titleText: { key: 'prt.title.custom', params: { title: id } },
    chosen: { entityId: kind === 'root-cause' ? ETM : null, entityName: kind === 'root-cause' ? 'easyTradeManager' : 'P-260914359', url, evidence: 'verified', why: { key: 'prt.why.logs', params: {} } },
    alternates: [],
    omittedReason: null,
    included: true,
    probeOnly: false,
    forced: false,
    subject: kind === 'root-cause' ? { kind: 'service', serviceId: ETM, role: 'root-caller' } : { kind: 'incident' },
    incident: null,
    anchors: [],
    settleMs: 3500,
    urlTemplateKey: urlTemplateKey(kind, url),
    ...extra,
  };
}

const PLAN: ShotPlan = {
  tenantHost: HOST,
  generatedAtIso: NOW,
  planId: 'a1b2c3d4e5f6',
  incident: null,
  slots: [slot('problem', 'problem--p-260914359', PROBLEM_URL), slot('root-cause', 'root-cause--service-c44033de8492cf45', SERVICE_URL), slot('logs-errors', 'logs-errors--status-error-2h', LOGS_URL)],
};

const IMAGE = fake.jpeg(1720, 1080, 4096);

function shotOf(id: string, url: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    title: id,
    requestedUrl: url,
    finalUrl: url,
    finalAppId: 'dynatrace.davis.problems',
    status: 'ok',
    offTenant: false,
    file: `shots/01_${id}.jpg`,
    width: 1720,
    height: 1080,
    bytes: IMAGE.length,
    sha256: sha(IMAGE),
    clipX: 200,
    anchors: [],
    maskSuggestions: [],
    timeframeLabel: null,
    pageTitle: null,
    capturedAt: '2026-10-05T18:00:00.000Z',
    warnings: [],
    ...overrides,
  };
}

function manifestOf(shots: Record<string, unknown>[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 'pvs.capture.manifest.v1',
    tenantHost: HOST,
    shotlistGeneratedAt: NOW,
    browser: 'Chromium 140',
    viewport: { width: 1920, height: 1080 },
    crop: { mode: 'auto' },
    startedAt: '2026-10-05T17:59:00.000Z',
    finishedAt: '2026-10-05T18:01:00.000Z',
    companionVersion: '1.1.0',
    planId: 'a1b2c3d4e5f6',
    mode: 'capture',
    browserTimeZone: 'America/Sao_Paulo',
    deviceScaleFactor: 1,
    stopReason: null,
    shots,
    ...extra,
  };
}

/** The companion 1.0 manifest: none of the 1.1 fields, raw labels. */
function manifest10(shots: Record<string, unknown>[]): Record<string, unknown> {
  const strip = ({ finalAppId: _a, offTenant: _b, maskSuggestions: _c, timeframeLabel: _d, ...rest }: Record<string, unknown>) => rest;
  const { companionVersion: _v, planId: _p, mode: _m, browserTimeZone: _z, deviceScaleFactor: _s, stopReason: _r, ...rest } = manifestOf([]);
  return { ...rest, shots: shots.map(strip) };
}

const parsed = (json: unknown): CaptureManifest => {
  const result = parseManifest(json, HOST);
  if (!result.ok) throw new Error(`${result.reason} ${result.detail}`);
  return result.manifest;
};

beforeEach(() => {
  fake.ops.length = 0;
  fake.encodeSize = null;
});

// ------------------------------------------------------------------ bytes

describe('sniffImage reads the real type and size from the bytes', () => {
  it('PNG (IHDR), JPEG (SOFn) and the three WebP forms', () => {
    expect(sniffImage(png(1920, 1080))).toEqual({ mime: 'image/png', width: 1920, height: 1080 });
    expect(sniffImage(fake.jpeg(3440, 2160))).toEqual({ mime: 'image/jpeg', width: 3440, height: 2160 });
    expect(sniffImage(webp('VP8 ', 1280, 720))).toEqual({ mime: 'image/webp', width: 1280, height: 720 });
    expect(sniffImage(webp('VP8L', 1920, 1080))).toEqual({ mime: 'image/webp', width: 1920, height: 1080 });
    expect(sniffImage(webp('VP8X', 7680, 4320))).toEqual({ mime: 'image/webp', width: 7680, height: 4320 });
  });

  it('refuses GIF, SVG, HTML and truncated files whatever their name says', () => {
    const text = (value: string) => new TextEncoder().encode(value);
    expect(sniffImage(text('GIF89a\x10\x00\x10\x00'))).toBeNull();
    expect(sniffImage(text('<svg xmlns="http://www.w3.org/2000/svg" width="1720" height="1080"></svg>'))).toBeNull();
    expect(sniffImage(text('<!doctype html><html></html>'))).toBeNull();
    expect(sniffImage(png(1920, 1080).slice(0, 20))).toBeNull();
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xc4, 0x00, 0x04, 0, 0, 0xff, 0xd9]))).toBeNull(); // a Huffman table is not a frame
  });

  it('hashes with crypto.subtle (lower-case hex, same as node)', async () => {
    expect(await sha256Hex(IMAGE)).toBe(sha(IMAGE));
    expect(await sha256Hex(IMAGE.subarray(10, 20))).toBe(sha(IMAGE.subarray(10, 20)));
  });
});

// ------------------------------------------------------------------ ZIP directory

describe('inspectZipDirectory reads the directory before anything is extracted', () => {
  const ok = () => new Uint8Array(companion.zipStore([{ name: 'manifest.json', data: Buffer.from('{}') }, { name: 'shots/01_problem--p-260914359.jpg', data: Buffer.from(IMAGE) }]));
  /** Offset of the first central directory entry. */
  const central = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset).getUint32(bytes.length - 22 + 16, true);

  it('lists a companion ZIP (stored entries, offsets)', () => {
    const result = inspectZipDirectory(ok());
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.entries.map((entry) => [entry.name, entry.method, entry.uncompressed])).toEqual([
      ['manifest.json', 0, 2],
      ['shots/01_problem--p-260914359.jpg', 0, IMAGE.length],
    ]);
  });

  it('refuses lying sizes: a stored entry with two sizes, or data that runs into the directory', () => {
    const lying = ok();
    const view = new DataView(lying.buffer);
    view.setUint32(central(lying) + 24, 3, true); // uncompressed ≠ compressed for STORE
    expect(inspectZipDirectory(lying)).toEqual({ ok: false, reason: 'too_large' });
    const overrun = ok();
    const at = central(overrun);
    new DataView(overrun.buffer).setUint32(at + 20, 5000, true);
    new DataView(overrun.buffer).setUint32(at + 24, 5000, true);
    expect(inspectZipDirectory(overrun)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('refuses `..`, absolute and unexpected names', () => {
    for (const name of ['shots/../01_x.jpg', '/manifest.json', 'shots/01_x.png', 'evil.sh', 'shots/1_x.jpg', 'shots/01_X.jpg']) {
      const bytes = new Uint8Array(companion.zipStore([{ name, data: Buffer.from('x') }]));
      expect(inspectZipDirectory(bytes), name).toEqual({ ok: false, reason: 'bad_name' });
    }
  });

  it('refuses too many entries, ZIP64, other methods, encryption, a non-ZIP and a too-large archive', () => {
    const many = new Uint8Array(companion.zipStore(Array.from({ length: LIMITS.zipEntries + 1 }, (_, i) => ({ name: `shots/${String(i).padStart(2, '0')}_s${i}.jpg`, data: Buffer.from('x') }))));
    expect(inspectZipDirectory(many)).toEqual({ ok: false, reason: 'too_many' });

    const zip64 = ok();
    new DataView(zip64.buffer).setUint32(zip64.length - 22 + 16, 0xffffffff, true);
    expect(inspectZipDirectory(zip64)).toEqual({ ok: false, reason: 'zip64' });

    const method = ok();
    new DataView(method.buffer).setUint16(central(method) + 10, 12, true); // bzip2
    expect(inspectZipDirectory(method)).toEqual({ ok: false, reason: 'bad_method' });

    const encrypted = ok();
    new DataView(encrypted.buffer).setUint16(central(encrypted) + 8, 0x0801, true);
    expect(inspectZipDirectory(encrypted)).toEqual({ ok: false, reason: 'bad_method' });

    expect(inspectZipDirectory(IMAGE)).toEqual({ ok: false, reason: 'not_zip' });
    expect(inspectZipDirectory(new Uint8Array(10))).toEqual({ ok: false, reason: 'not_zip' });

    const huge = ok();
    const at = central(huge) + 46 + 'manifest.json'.length;
    new DataView(huge.buffer).setUint32(at + 20, LIMITS.imageBytesIn + 1, true);
    new DataView(huge.buffer).setUint32(at + 24, LIMITS.imageBytesIn + 1, true);
    expect(inspectZipDirectory(huge)).toEqual({ ok: false, reason: 'too_large' });
  });
});

// ------------------------------------------------------------------ manifest

describe('parseManifest', () => {
  const problem = () => shotOf('problem--p-260914359', PROBLEM_URL);

  it('accepts a 1.1 manifest and keeps its additive fields', () => {
    const result = parseManifest(manifestOf([problem()]), HOST);
    expect(result).toMatchObject({ ok: true, version: '1.1.0' });
    if (!result.ok) return;
    expect(result.manifest).toMatchObject({ planId: 'a1b2c3d4e5f6', mode: 'capture', browserTimeZone: 'America/Sao_Paulo', deviceScaleFactor: 1, stopReason: null });
  });

  it('accepts a 1.0 manifest (no new fields) as companion 1.0.0', () => {
    const result = parseManifest(manifest10([problem()]), HOST);
    expect(result).toMatchObject({ ok: true, version: '1.0.0' });
    if (!result.ok) return;
    expect(result.manifest.planId).toBeNull();
    expect(result.manifest.browserTimeZone).toBeNull();
    expect(result.manifest.shots[0]?.maskSuggestions).toEqual([]);
  });

  it('accepts a probe manifest (no files)', () => {
    const probe = manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { file: null, sha256: null, width: null, height: null, bytes: null, capturedAt: null })], { mode: 'probe' });
    expect(parseManifest(probe, HOST)).toMatchObject({ ok: true });
  });

  it('refuses another tenant, with no override, and an app that cannot name its own host', () => {
    expect(parseManifest(manifestOf([problem()], { tenantHost: 'custa001.apps.dynatrace.com' }), HOST)).toEqual({ ok: false, reason: 'prt.err.tenant', detail: 'custa001.apps.dynatrace.com' });
    expect(parseManifest(manifestOf([problem()]), '')).toMatchObject({ ok: false, reason: 'prt.err.tenant' });
    expect(parseManifest(manifestOf([problem()]), 'ABC12345.apps.dynatrace.com')).toMatchObject({ ok: true });
  });

  it('refuses a bad schema, a companion 2.x and an address off the allowlist', () => {
    expect(parseManifest({ ...manifestOf([problem()]), schema: 'pvs.capture.manifest.v2' }, HOST)).toMatchObject({ ok: false, reason: 'prt.err.schema' });
    expect(parseManifest('not json', HOST)).toMatchObject({ ok: false, reason: 'prt.err.schema' });
    expect(parseManifest(manifestOf([{ ...problem(), status: 'great' }]), HOST)).toMatchObject({ ok: false, reason: 'prt.err.schema' });
    expect(parseManifest(manifestOf([{ ...problem(), id: '../etc' }]), HOST)).toMatchObject({ ok: false, reason: 'prt.err.schema' });
    expect(parseManifest(manifestOf([problem()], { companionVersion: '2.0.0' }), HOST)).toEqual({ ok: false, reason: 'prt.err.version', detail: '2.0.0' });
    const off = (url: string) => parseManifest(manifestOf([shotOf('custom--abc', url)]), HOST);
    expect(off(`https://${HOST}/ui/entity/SERVICE-1`)).toMatchObject({ ok: false, reason: 'prt.err.customUrl' });
    expect(off(`https://custa001.apps.dynatrace.com/ui/apps/dynatrace.services/`)).toMatchObject({ ok: false, reason: 'prt.err.customUrl' });
    expect(off(`http://${HOST}/ui/apps/dynatrace.services/`)).toMatchObject({ ok: false, reason: 'prt.err.customUrl' });
    expect(off(`https://${HOST}/ui/apps/dynatrace.hub/licensing/cost`)).toMatchObject({ ok: false, reason: 'prt.err.commercial' });
  });

  it('keeps only numbers from page text: a 1.0 label becomes its numeric tokens; timeframe labels must parse', () => {
    const anchors = [{ key: 'users', matched: 'Users', label: 'ana.silva@contoso.example 30 Users 10.1.2.3', x: 600, y: 140, width: 60, height: 18, fx: 0.35, fy: 0.13 }];
    const manifest = parsed(manifest10([problem()].map((shot) => ({ ...shot, anchors }))));
    expect(manifest.shots[0]?.anchors[0]).toMatchObject({ key: 'users', numbers: ['30'], hit: 0 });
    expect(JSON.stringify(manifest.shots[0]?.anchors)).not.toContain('ana.silva');
    const labelled = parsed(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { timeframeLabel: 'Last 30 minutes' }), shotOf('logs-errors--status-error-2h', LOGS_URL, { file: 'shots/02_logs.jpg', timeframeLabel: 'ana@x.com' })]));
    expect(labelled.shots.map((shot) => shot.timeframeLabel)).toEqual(['Last 30 minutes', null]);
  });

  it('keeps the companion warning codes and redacts any other warning text', () => {
    const manifest = parsed(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { warnings: ['ui_lang:pt-BR', 'off_tenant', 'navigation: net::ERR at https://abc12345.apps.dynatrace.com/ui/x?token=abc'] })]));
    const warnings = manifest.shots[0]?.warnings ?? [];
    expect(warnings.slice(0, 2)).toEqual(['ui_lang:pt-BR', 'off_tenant']);
    expect(warnings[2]).not.toContain('abc12345');
  });
});

describe('matchManifest', () => {
  it('binds by id, then by address (window parameters ignored), and lists the rest as orphans', () => {
    const manifest = parsed(
      manifestOf([
        shotOf('problem--p-260914359', PROBLEM_URL),
        shotOf('root-cause--other-id', SERVICE_URL.replace('perspective=performance', 'perspective=performance&from=now()-2h'), { file: 'shots/02_root-cause--other-id.jpg' }),
        shotOf('custom--0123456789', `https://${HOST}/ui/apps/dynatrace.notebooks/`, { file: 'shots/03_custom--0123456789.jpg' }),
      ]),
    );
    const match = matchManifest(PLAN, manifest);
    expect(match.attach.map((item) => [item.slotId, item.matchedBy])).toEqual([
      ['problem--p-260914359', 'id'],
      ['root-cause--service-c44033de8492cf45', 'url'],
    ]);
    expect(match.orphans.map((shot) => shot.id)).toEqual(['custom--0123456789']);
    expect(match.planIdMatch).toBe(true);
  });

  it('a lost session: the failing shot and the skipped rest are failures, never prints', () => {
    const manifest = parsed(
      manifestOf(
        [
          shotOf('problem--p-260914359', PROBLEM_URL),
          shotOf('root-cause--service-c44033de8492cf45', SERVICE_URL, { status: 'session_lost', file: null, sha256: null, finalUrl: 'https://sso.dynatrace.com/' }),
          shotOf('logs-errors--status-error-2h', LOGS_URL, { status: 'skipped', file: null, sha256: null, finalUrl: null }),
        ],
        { stopReason: 'session_lost' },
      ),
    );
    const match = matchManifest(PLAN, manifest);
    expect(match.attach.map((item) => item.slotId)).toEqual(['problem--p-260914359']);
    expect(match.failures.map((shot) => shot.status)).toEqual(['session_lost', 'skipped']);
    expect(manifest.stopReason).toBe('session_lost');
  });

  it('reports a plan id mismatch, and null for a 1.0 manifest without one', () => {
    expect(matchManifest(PLAN, parsed(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL)], { planId: 'ffffffffffff' }))).planIdMatch).toBe(false);
    expect(matchManifest(PLAN, parsed(manifest10([shotOf('problem--p-260914359', PROBLEM_URL)]))).planIdMatch).toBeNull();
  });

  it('link checks: one per conclusive landing, keyed by the slot shape; an off-tenant landing proves nothing', () => {
    const manifest = parsed(
      manifestOf(
        [
          shotOf('problem--p-260914359', PROBLEM_URL, { file: null, sha256: null }),
          shotOf('logs-errors--status-error-2h', LOGS_URL, { status: 'unresolved_link', file: null, sha256: null, finalAppId: 'dynatrace.launcher' }),
          shotOf('root-cause--service-c44033de8492cf45', SERVICE_URL, { status: 'unexpected_page', offTenant: true, file: null, sha256: null }),
        ],
        { mode: 'probe' },
      ),
    );
    const checks = linkChecksFrom(PLAN, manifest);
    expect(checks.map((check) => [check.templateKey, check.status, check.finalAppId])).toEqual([
      [PLAN.slots[0]?.urlTemplateKey, 'ok', 'dynatrace.davis.problems'],
      [PLAN.slots[2]?.urlTemplateKey, 'unresolved_link', 'dynatrace.launcher'],
    ]);
    expect(checks[0]?.companionVersion).toBe('1.1.0');
  });

  it('normalizeUrlForMatch drops the window, sorts the query and keeps the hash', () => {
    expect(normalizeUrlForMatch(`https://${HOST.toUpperCase()}/ui/a?z=1&from=now()-2h&a=2#h`)).toBe(`${HOST}/ui/a?a=2&z=1#h`);
  });
});

// ------------------------------------------------------------------ ZIP import

describe('readCompanionZip', () => {
  const anchors = [
    { key: 'identity', matched: 'P-260914359', label: 'P-260914359', x: 600, y: 90, width: 120, height: 20, fx: 0.3488, fy: 0.0833, hit: 0, numbers: [] },
    { key: 'users', matched: 'Users', label: '30 Users', x: 600, y: 140, width: 60, height: 18, fx: 0.3488, fy: 0.1296, hit: 0, numbers: ['30'] },
  ];
  const masks = [{ reason: 'email', x: 900, y: 500, width: 3, height: 2 }];
  const fullZip = (overrides: Record<string, unknown> = {}, extraShots: Record<string, unknown>[] = []) =>
    zipFile([
      {
        name: 'manifest.json',
        data: JSON.stringify(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { anchors, maskSuggestions: masks, timeframeLabel: 'Last 2 hours', pageTitle: 'P-260914359 · ana@contoso.example', ...overrides }), ...extraShots])),
      },
      { name: 'shots/01_problem--p-260914359.jpg', data: IMAGE },
    ]);
  const ctx = { plan: PLAN, tenantHost: HOST, existing: new Map<string, PrintRecord>(), t, nowIso: NOW };

  it('imports a companion print: bytes kept, anchors and numbers kept, page text dropped', async () => {
    const result = await readCompanionZip(fullZip(), ctx);
    expect(result.refused).toBeNull();
    expect(result.report.counts).toEqual({ ok: 1 });
    expect(result.assets).toHaveLength(1);
    const asset = result.assets[0]!;
    expect(Buffer.from(await blobBytes(asset.master)).equals(Buffer.from(IMAGE))).toBe(true);
    const record = asset.record;
    expect(record).toMatchObject({
      slotId: 'problem--p-260914359',
      kind: 'problem',
      layout: 'problems.detail',
      source: 'companion',
      landing: 'ok',
      matchedBy: 'id',
      identity: 'anchor',
      captureTimeZone: 'America/Sao_Paulo',
      screenTimeframeLabel: 'Last 2 hours',
      companion: { version: '1.1.0', planId: 'a1b2c3d4e5f6', browser: 'Chromium 140' },
      image: { sha256: sha(IMAGE), normalization: 'native', partial: false, width: 1720, height: 1080 },
      finalAppId: 'dynatrace.davis.problems',
      approval: null,
    });
    expect(record.finalPath?.startsWith('/ui/apps/dynatrace.davis.problems/problem/')).toBe(true);
    expect(record.anchors).toEqual([
      { key: 'identity', hit: 0, rect: { x: 600, y: 90, w: 120, h: 20 } },
      { key: 'users', hit: 0, rect: { x: 600, y: 140, w: 60, h: 18 } },
    ]);
    expect(record.screenNumbers).toEqual([{ anchorKey: 'users', hit: 0, values: [30] }]);
    // An 8×8 minimum for a suggestion; the reason kept, never the text.
    expect(record.maskSuggestions).toEqual([{ x: 900, y: 500, w: 8, h: 8, reason: 'email' }]);
    expect(record.focus).not.toBeNull();
    expect(record.lupaOn).toBe(true);
    const stored = JSON.stringify(record);
    expect(stored).not.toContain('contoso');
    expect(stored).not.toContain('30 Users');
    expect(stored).not.toContain(HOST);
  });

  it('a probe ZIP (the manifest only) gives link checks and no prints', async () => {
    const probe = manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { file: null, sha256: null, width: null, height: null, bytes: null, capturedAt: null })], { mode: 'probe' });
    const result = await readCompanionZip(zipFile([{ name: 'manifest.json', data: JSON.stringify(probe) }]), ctx);
    expect(result.refused).toBeNull();
    expect(result.assets).toEqual([]);
    expect(result.linkChecks.map((check) => check.status)).toEqual(['ok']);
    expect(result.report.problems).toEqual([t('prt.imp.probe', { count: '1' })]);
  });

  it('refuses a ZIP from another tenant, naming both hosts', async () => {
    const other = zipFile([{ name: 'manifest.json', data: JSON.stringify(manifestOf([], { tenantHost: 'custb002.apps.dynatrace.com' })) }]);
    const result = await readCompanionZip(other, ctx);
    expect(result.assets).toEqual([]);
    expect(result.refused).toEqual({ reason: 'prt.err.tenant', detail: 'custb002.apps.dynatrace.com', params: { host: 'custb002.apps.dynatrace.com', current: HOST } });
    expect(result.report.counts).toEqual({ refused: 1 });
  });

  it('refuses a crafted archive before reading it, and a ZIP with no manifest', async () => {
    const crafted = await readCompanionZip(zipFile([{ name: 'shots/../01_x.jpg', data: 'x' }]), ctx);
    expect(crafted.refused).toMatchObject({ reason: 'prt.err.zip', detail: 'bad_name', params: { detail: t('prt.zip.badName') } });
    const empty = await readCompanionZip(zipFile([{ name: 'shots/01_problem--p-260914359.jpg', data: IMAGE }]), ctx);
    expect(empty.refused).toMatchObject({ reason: 'prt.err.zip', detail: 'no_manifest' });
  });

  it('stops a deflate entry that inflates past the size its directory declared', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifestOf([])).repeat(20), { createFolders: false });
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    const at = view.getUint32(bytes.length - 22 + 16, true);
    expect(view.getUint16(at + 10, true)).toBe(8);
    view.setUint32(at + 24, 50, true); // declares 50 bytes; inflates to far more
    const result = await readCompanionZip(new File([bytes as Uint8Array<ArrayBuffer>], 'bomb.zip'), ctx);
    expect(result.refused).toMatchObject({ reason: 'prt.err.zip', detail: 'too_large' });
  });

  it('refuses an image whose bytes do not match the manifest, and counts it', async () => {
    const result = await readCompanionZip(fullZip({ sha256: 'f'.repeat(64) }), ctx);
    expect(result.assets).toEqual([]);
    expect(result.report.counts).toEqual({ refused: 1 });
    expect(result.report.problems).toEqual([t('prt.err.file', { name: 'problem--p-260914359', why: t('prt.err.file.corrupt') })]);
  });

  it('lists not-ok shots with their reason, and an orphan apart', async () => {
    const orphan = shotOf('custom--0123456789', `https://${HOST}/ui/apps/dynatrace.notebooks/`, { file: 'shots/03_custom--0123456789.jpg' });
    const lost = shotOf('root-cause--service-c44033de8492cf45', SERVICE_URL, { status: 'session_lost', file: null, sha256: null });
    const file = zipFile([
      { name: 'manifest.json', data: JSON.stringify(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL), lost, orphan], { stopReason: 'session_lost' })) },
      { name: 'shots/01_problem--p-260914359.jpg', data: IMAGE },
      { name: 'shots/03_custom--0123456789.jpg', data: IMAGE },
    ]);
    const result = await readCompanionZip(file, ctx);
    expect(result.report.counts).toEqual({ ok: 1, session_lost: 1, orphan: 1 });
    expect(result.report.orphans).toEqual([{ id: 'custom--0123456789', title: 'custom--0123456789' }]);
    expect(result.report.problems[0]).toContain(t('prt.err.sessionLost', { n: '2' }));
    const orphanAsset = result.assets.find((asset) => result.orphanIds.includes(asset.record.id));
    expect(orphanAsset?.record).toMatchObject({ slotId: 'custom--0123456789', kind: 'custom', layout: 'free', identity: 'none', titleText: { key: 'prt.title.custom' } });
  });

  it('does not import the same image for the same slot twice', async () => {
    const first = await readCompanionZip(fullZip(), ctx);
    const existing = new Map(first.assets.map((asset) => [asset.record.id, asset.record]));
    const again = await readCompanionZip(fullZip(), { ...ctx, existing });
    expect(again.assets).toEqual([]);
    expect(again.report.problems).toEqual([t('prt.imp.duplicate', { name: 'problem--p-260914359' })]);
  });

  it('`--crop none` (the whole 1920 px window) is cut at the navigation; anchors move with it', async () => {
    const wide = fake.jpeg(1920, 1080, 512);
    const file = zipFile([
      {
        name: 'manifest.json',
        data: JSON.stringify(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { anchors, clipX: 0, width: 1920, bytes: wide.length, sha256: sha(wide) })], { crop: { mode: 'none' } })),
      },
      { name: 'shots/01_problem--p-260914359.jpg', data: wide },
    ]);
    const record = (await readCompanionZip(file, ctx)).assets[0]?.record;
    expect(record?.image).toMatchObject({ normalization: 'cropped', partial: false });
    expect(record?.anchors[0]?.rect).toEqual({ x: 400, y: 90, w: 120, h: 20 });
  });

  it('a shot without clipX still maps its anchors 1:1 on a 1720×1080 print (the scale comes from the height)', async () => {
    const file = zipFile([
      { name: 'manifest.json', data: JSON.stringify(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { anchors, clipX: null })])) },
      { name: 'shots/01_problem--p-260914359.jpg', data: IMAGE },
    ]);
    const record = (await readCompanionZip(file, ctx)).assets[0]?.record;
    expect(record?.image.normalization).toBe('native');
    expect(record?.anchors[0]?.rect).toEqual({ x: 600, y: 90, w: 120, h: 20 });
  });

  it('a 1.0 companion on HiDPI (3440×2160) is resized once; its CSS-pixel anchors stay put', async () => {
    const hidpi = fake.jpeg(3440, 2160, 512);
    const file = zipFile([
      { name: 'manifest.json', data: JSON.stringify(manifest10([shotOf('problem--p-260914359', PROBLEM_URL, { anchors, width: 1720, height: 1080, bytes: hidpi.length, sha256: sha(hidpi) })])) },
      { name: 'shots/01_problem--p-260914359.jpg', data: hidpi },
    ]);
    const result = await readCompanionZip(file, ctx);
    const record = result.assets[0]?.record;
    expect(record?.image.normalization).toBe('resized');
    expect(record?.anchors[0]?.rect).toEqual({ x: 600, y: 90, w: 120, h: 20 });
    expect(record?.companion?.version).toBe('1.0.0');
    expect(fake.ops.find((op) => op.op === 'drawImage')?.args).toEqual([0, 0, 3440, 2160, 0, 0, 1720, 1080]);
    expect(fake.ops.filter((op) => op.op === 'encode')).toHaveLength(1);
  });
});

// ------------------------------------------------------------------ normalise

describe('normalisation', () => {
  it('plans the fit: crop, resize, pad the bottom, or contain', () => {
    expect(planNormalization(1920, 1080, { x: 200, y: 0, w: 1720, h: 1080 })).toMatchObject({ normalization: 'cropped', partial: false, dest: { x: 0, y: 0, w: 1720, h: 1080 } });
    expect(planNormalization(3440, 2160, null)).toMatchObject({ normalization: 'resized', placement: { scale: 0.5 }, source: { w: 3440, h: 2160 } });
    const short = planNormalization(1720, 1020, null);
    expect(short).toMatchObject({ normalization: 'resized', padBottom: true, dest: { h: 1020 } });
    const tall = planNormalization(1720, 1150, null); // aspect within 8 %: the top 1080 rows
    expect(tall).toMatchObject({ normalization: 'cropped', source: { h: 1080 } });
    expect(planNormalization(1000, 1000, null)).toMatchObject({ normalization: 'contain', partial: true });
  });

  it('places companion crop pixels in the print', () => {
    expect(placeRect({ x: 100, y: 50, w: 10, h: 10 }, { sx: 0, sy: 0, scale: 0.5, dx: 0, dy: 0 })).toEqual({ x: 50, y: 25, w: 5, h: 5 });
    expect(placeRect({ x: 5000, y: 50, w: 10, h: 10 }, { sx: 0, sy: 0, scale: 1, dx: 0, dy: 0 })).toBeNull();
  });

  it('detectNavEdge finds x=200 on a 1920×1080 screen, and nothing on a flat one', () => {
    const width = 1920;
    const height = 1080;
    const gray = new Uint8ClampedArray(width * height);
    let seed = 7;
    const noise = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 7) - 3;
    };
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const inBlock = x >= 260 && x < 700 && y >= 300 && y < 360; // a card in the content
        gray[y * width + x] = (x < 200 ? 32 : inBlock ? 90 : 244) + noise();
      }
    }
    expect(detectNavEdge(gray, width, height)).toBe(200);
    const flat = new Uint8ClampedArray(width * height).map(() => 240 + noise());
    expect(detectNavEdge(flat, width, height)).toBeNull();
    // An edge only in the browser's own bar (top 10 %) is not the navigation.
    const chrome = new Uint8ClampedArray(width * height).map((_, i) => (Math.floor(i / width) < 100 && i % width < 300 ? 20 : 240));
    expect(detectNavEdge(chrome, width, height)).toBeNull();
  });

  it('suggests the crop from the edge, else 200/1920 of the width; pads with the median colour', () => {
    expect(suggestCrop(1920, 1080, 236)).toEqual({ x: 236, y: 0, w: 1684, h: 1080 });
    expect(suggestCrop(3840, 2160, null)).toEqual({ x: 400, y: 0, w: 3440, h: 2160 });
    expect(medianColor(Uint8ClampedArray.from([255, 255, 255, 10, 20, 30, 10, 20, 30]))).toBe('#0A141E');
  });

  it('normalizeToTarget keeps a 1720×1080 JPEG as it is, and encodes anything else once', async () => {
    const native = await normalizeToTarget(new Blob([IMAGE]), null);
    expect(native).toMatchObject({ normalization: 'native', sha256: sha(IMAGE), bytes: IMAGE.length });
    expect(fake.ops).toEqual([]);
    const cropped = await normalizeToTarget(new Blob([png(1920, 1080)]), { x: 200, y: 0, w: 1720, h: 1080 });
    expect(cropped.normalization).toBe('cropped');
    expect(fake.ops.filter((op) => op.op === 'encode').map((op) => op.args.slice(0, 2))).toEqual([['image/jpeg', 0.82]]);
    expect(fake.ops.find((op) => op.op === 'drawImage')?.args).toEqual([200, 0, 1720, 1080, 0, 0, 1720, 1080]);
  });
});

// ------------------------------------------------------------------ manual intake

describe('manual intake', () => {
  it('refuses a GIF or SVG, a file over 10 MB and an image too small or too large', async () => {
    const why = async (blob: Blob) => checkImageFile(blob, 'x').then(() => null, (error: unknown) => (error instanceof IntakeError ? error.why : 'other'));
    expect(await why(new Blob([new TextEncoder().encode('GIF89a......')]))).toBe('type');
    expect(await why(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/png' }))).toBe('type');
    expect(await why(new Blob([new Uint8Array(LIMITS.imageBytesIn + 1)]))).toBe('size');
    expect(await why(new Blob([png(320, 200)]))).toBe('dims');
    expect(await why(new Blob([png(8000, 4500)]))).toBe('dims');
    expect(await why(new Blob([webp('VP8 ', 1280, 720)]))).toBeNull();
  });

  it('a manual print: cropped and normalised once, identity to be confirmed, time from the file', async () => {
    const file = new File([png(1920, 1080)], 'snip.png', { type: 'image/png', lastModified: Date.parse('2026-10-05T17:30:00.000Z') });
    const target = PLAN.slots[1]!;
    const asset = await intakeFile(file, target, { x: 200, y: 0, w: 1720, h: 1080 }, 'manual', NOW);
    expect(asset.record).toMatchObject({
      slotId: target.id,
      kind: 'root-cause',
      source: 'manual',
      landing: 'unknown',
      identity: 'none',
      matchedBy: 'slot',
      capturedAtIso: '2026-10-05T17:30:00.000Z',
      capturedAtApprox: true,
      captureTimeZone: null,
      companion: null,
      entity: { id: ETM, name: 'easyTradeManager' },
      linkEvidence: 'verified',
      image: { normalization: 'cropped', width: 1720, height: 1080 },
    });
    expect(asset.record.requestedPath.startsWith('/ui/apps/dynatrace.services/explorer/services?')).toBe(true);
    expect(asset.record.image.sha256).toBe(sha(await blobBytes(asset.master)));
  });

  it('a guided frame has the capture time, not an approximation', async () => {
    const asset = await intakeFile(new Blob([png(1920, 1080)], { type: 'image/png' }), PLAN.slots[0]!, null, 'tab-capture', NOW);
    expect(asset.record).toMatchObject({ source: 'tab-capture', capturedAtIso: NOW, capturedAtApprox: false });
  });

  it('pastedImage takes an image from clipboardData and ignores text and other items', () => {
    const image = new File([png(1920, 1080)], 'image.png', { type: 'image/png' });
    const item = (kind: string, type: string, file: File | null) => ({ kind, type, getAsFile: () => file });
    const paste = (files: File[], items: ReturnType<typeof item>[]) => ({ clipboardData: { files, items } }) as unknown as ClipboardEvent;
    expect(pastedImage(paste([], [item('string', 'text/plain', null), item('string', 'text/html', null)]))).toBeNull();
    expect(pastedImage(paste([], [item('file', 'image/svg+xml', new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))]))).toBeNull();
    expect(pastedImage(paste([], [item('string', 'text/plain', null), item('file', 'image/png', image)]))).toBe(image);
    expect(pastedImage(paste([image], []))).toBe(image);
    expect(pastedImage({ clipboardData: null } as unknown as ClipboardEvent)).toBeNull();
  });

  it('droppedImage takes the first image of a drop', () => {
    const image = new File([png(1920, 1080)], 'image.png', { type: 'image/png' });
    const text = new File(['hello'], 'a.txt', { type: 'text/plain' });
    expect(droppedImage({ dataTransfer: { files: [text, image] } } as unknown as DragEvent)).toBe(image);
    expect(droppedImage({ dataTransfer: { files: [text] } } as unknown as DragEvent)).toBeNull();
  });
});

// ------------------------------------------------------------------ bake

describe('bake', () => {
  it('bakeLadder: q72 over 600 KB, then downscale; then the largest while the deck is over 6 MB', () => {
    const KB = 1024;
    expect(bakeLadder([300 * KB, 700 * KB, 650 * KB])).toEqual([
      { index: 1, step: 'q72' },
      { index: 2, step: 'q72' },
    ]);
    expect(bakeLadder([300 * KB, 610 * KB], ['q82', 'q72'])).toEqual([{ index: 1, step: 'downscale' }]);
    // Already downscaled and still over: nothing more to do for it.
    expect(bakeLadder([300 * KB, 610 * KB], ['q82', 'downscale'])).toEqual([]);
    const ten = Array.from({ length: 11 }, (_, i) => (590 - i) * KB); // 6.2 MB, each under 600 KB
    expect(bakeLadder(ten)).toEqual([{ index: 0, step: 'q72' }]);
    expect(bakeLadder(ten, ['downscale', ...Array.from({ length: 10 }, () => 'q82' as const)])).toEqual([{ index: 1, step: 'q72' }]);
    expect(bakeLadder([500 * KB, 500 * KB])).toEqual([]);
  });

  it('no masks: the master bytes as they are (no second lossy encode)', async () => {
    const baked = await bakePrint(new Blob([IMAGE], { type: 'image/jpeg' }), []);
    expect(baked).toMatchObject({ bytes: IMAGE.length, quality: 0.82, downscaled: false, width: 1720, height: 1080, sha256: sha(IMAGE) });
    expect(Buffer.from(baked.dataUrl.split(',')[1] ?? '', 'base64').equals(Buffer.from(IMAGE))).toBe(true);
    expect(fake.ops).toEqual([]);
  });

  it('masks are burned in as a solid fill; a downscale scales them and covers every pixel', async () => {
    const masks = [{ x: 100, y: 100, w: 50, h: 20, reason: 'email' as const }];
    await bakePrint(new Blob([IMAGE]), masks);
    expect(fake.ops.filter((op) => op.op === 'fillRect').map((op) => op.args)).toEqual([[100, 100, 50, 20, MASK_FILL]]);
    fake.ops.length = 0;
    const small = await bakePrint(new Blob([IMAGE]), masks, { quality: 0.72, downscale: true });
    expect(small).toMatchObject({ width: 1290, height: 810, downscaled: true, quality: 0.72 });
    expect(fake.ops.find((op) => op.op === 'surface')?.args).toEqual([1290, 810]);
    expect(fake.ops.filter((op) => op.op === 'fillRect').map((op) => op.args)).toEqual([[75, 75, 38, 15, MASK_FILL]]);
  });

  it('bakeAll runs the ladder until every print fits', async () => {
    fake.encodeSize = (width, _height, quality) => (width < 1720 ? 400 * 1024 : quality === 0.72 ? 650 * 1024 : 900 * 1024);
    const masks = [{ x: 0, y: 0, w: 10, h: 10, reason: 'manual' as const }];
    const results = await bakeAll([{ key: 'a', master: new Blob([IMAGE]), masks }]);
    expect(results.map((item) => item.stage)).toEqual(['downscale']);
    expect(results[0]?.result.width).toBe(1290);
  });

  it('mask and focus hashes ignore order, not position', async () => {
    const a = { x: 10, y: 10, w: 20, h: 20, reason: 'email' as const };
    const b = { x: 50, y: 5, w: 20, h: 20, reason: 'manual' as const };
    expect(await hashMasks([a, b])).toBe(await hashMasks([b, a]));
    expect(await hashMasks([a, b])).not.toBe(await hashMasks([a, { ...b, x: 51 }]));
    expect(canonicalMasks([b, a])).toBe('[[10,10,20,20,"email"],[50,5,20,20,"manual"]]');
    expect(await hashFocus(null)).not.toBe(await hashFocus({ x: 0, y: 0, w: 10, h: 10 }));
  });
});

// ------------------------------------------------------------------ JPEG metadata (3.2.7 review PS-3)

describe('a JPEG keeps its picture, never its metadata', () => {
  const SECRET = 'UNREDACTED-ORIGINAL ana.silva@contoso.example C:\\Users\\ana\\cust-prod.png';
  const bytesOf = (text: string) => new TextEncoder().encode(text);
  const segment = (marker: number, body: Uint8Array) => Uint8Array.from([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body]);
  const concat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((part) => [...part]));
  const has = (bytes: Uint8Array, text: string) => Buffer.from(bytes).includes(Buffer.from(text));
  // IMAGE: SOI (2) · APP0 JFIF (18) · SOF0 (19) · SOS (14) + scan · EOI.
  const SOF_AT = 20;
  const SOS_AT = 39;
  /** What an editor writes around IMAGE's picture: a JFIF thumbnail, EXIF, XMP, a Photoshop block, comments, bytes after EOI. */
  const DIRTY = concat(
    IMAGE.subarray(0, 2),
    segment(0xe0, concat(bytesOf('JFIF\0'), Uint8Array.from([1, 1, 0, 0, 1, 0, 1, 2, 1, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0x11]))),
    segment(0xe1, bytesOf(`Exif\0\0${SECRET}`)),
    segment(0xe1, bytesOf(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>${SECRET}</x:xmpmeta>`)),
    segment(0xed, bytesOf(`Photoshop 3.0\0${SECRET}`)),
    IMAGE.subarray(SOF_AT, SOS_AT),
    segment(0xfe, bytesOf(SECRET)),
    IMAGE.subarray(SOS_AT),
    bytesOf(`TRAILER ${SECRET}`),
  );

  it('stripJpegMetadata keeps the frame, tables, scans and EOI; drops APPn, COM, a JFIF thumbnail and anything after EOI', () => {
    expect(has(DIRTY, SECRET)).toBe(true);
    const clean = stripJpegMetadata(DIRTY);
    expect(Buffer.from(clean ?? []).equals(Buffer.from(IMAGE))).toBe(true);
    // A clean JPEG comes back as it is (same bytes, so the same SHA-256).
    expect(stripJpegMetadata(IMAGE)).toBe(IMAGE);

    // A second scan (progressive): its tables are kept, a comment between the scans is not; stuffed bytes and restarts stay in the scan.
    const dht = segment(0xc4, Uint8Array.from([0x10, 1, 2, 3]));
    const scan2 = concat(IMAGE.subarray(SOS_AT, SOS_AT + 14), Uint8Array.from([0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56]));
    const progressive = concat(IMAGE.subarray(0, IMAGE.length - 2), segment(0xfe, bytesOf(SECRET)), dht, scan2, Uint8Array.from([0xff, 0xd9]));
    expect(Buffer.from(stripJpegMetadata(progressive) ?? []).equals(Buffer.from(concat(IMAGE.subarray(0, IMAGE.length - 2), dht, scan2, Uint8Array.from([0xff, 0xd9]))))).toBe(true);

    // Colour is part of the picture: the ICC profile (Chromium writes an sRGB one into every JPEG it encodes) and APP14 "Adobe" stay.
    const icc = segment(0xe2, concat(bytesOf('ICC_PROFILE\0'), Uint8Array.from([1, 1]), bytesOf('acspRGB sRGB IEC61966-2.1')));
    const adobe = segment(0xee, concat(bytesOf('Adobe'), Uint8Array.from([0, 100, 0, 0, 0, 0, 1])));
    const colour = concat(IMAGE.subarray(0, SOF_AT), icc, adobe, IMAGE.subarray(SOF_AT));
    expect(stripJpegMetadata(colour)).toBe(colour);
    // Any other APP2 (FlashPix, MPF previews) goes.
    const flashpix = concat(IMAGE.subarray(0, SOF_AT), icc, segment(0xe2, bytesOf(`FPXR\0${SECRET}`)), IMAGE.subarray(SOF_AT));
    expect(Buffer.from(stripJpegMetadata(flashpix) ?? []).equals(Buffer.from(concat(IMAGE.subarray(0, SOF_AT), icc, IMAGE.subarray(SOF_AT))))).toBe(true);

    // Not a JPEG this walk understands: null (the caller encodes it through the canvas).
    expect(stripJpegMetadata(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(stripJpegMetadata(concat(IMAGE.subarray(0, SOS_AT), Uint8Array.from([0x00, 0x01, 0xff, 0xd9])))).toBeNull();
    expect(stripJpegMetadata(png(1720, 1080))).toBeNull();
  });

  it('a manual 1720×1080 JPEG is stored without its metadata, and the SHA-256 is of what is stored', async () => {
    const asset = await intakeFile(new File([DIRTY], 'redacted.jpg', { type: 'image/jpeg' }), PLAN.slots[0]!, null, 'manual', NOW);
    const stored = await blobBytes(asset.master);
    expect(has(stored, SECRET)).toBe(false);
    expect(Buffer.from(stored).equals(Buffer.from(IMAGE))).toBe(true);
    expect(asset.record.image).toMatchObject({ normalization: 'native', sha256: sha(IMAGE), bytes: IMAGE.length });
    // No second lossy encode.
    expect(fake.ops.filter((op) => op.op === 'encode')).toEqual([]);
  });

  it('a companion JPEG is checked against the manifest as shipped, then kept without its metadata', async () => {
    const zip = zipFile([
      { name: 'manifest.json', data: JSON.stringify(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL, { bytes: DIRTY.length, sha256: sha(DIRTY) })])) },
      { name: 'shots/01_problem--p-260914359.jpg', data: DIRTY },
    ]);
    const result = await readCompanionZip(zip, { plan: PLAN, tenantHost: HOST, existing: new Map<string, PrintRecord>(), t, nowIso: NOW });
    expect(result.report.counts).toEqual({ ok: 1 });
    const asset = result.assets[0]!;
    expect(has(await blobBytes(asset.master), SECRET)).toBe(false);
    expect(asset.record.image).toMatchObject({ normalization: 'native', sha256: sha(IMAGE), bytes: IMAGE.length });
  });

  it('the deck never receives a master’s metadata, even on the no-mask fast path', async () => {
    const baked = await bakePrint(new Blob([DIRTY], { type: 'image/jpeg' }), []);
    const placed = Buffer.from(baked.dataUrl.split(',')[1] ?? '', 'base64');
    expect(placed.includes(Buffer.from(SECRET))).toBe(false);
    expect(placed.equals(Buffer.from(IMAGE))).toBe(true);
    expect(baked.sha256).toBe(sha(IMAGE));
    expect(fake.ops).toEqual([]);
  });

  it('a JPEG the walk does not understand is encoded once through the canvas instead of kept', async () => {
    const odd = concat(IMAGE.subarray(0, SOS_AT), Uint8Array.from([0x00, 0x01]), segment(0xfe, bytesOf(SECRET)), IMAGE.subarray(SOS_AT));
    expect(stripJpegMetadata(odd)).toBeNull();
    const normalized = await normalizeToTarget(new Blob([odd]), null);
    expect(normalized.normalization).not.toBe('native');
    expect(has(await blobBytes(normalized.blob), SECRET)).toBe(false);
    expect(fake.ops.filter((op) => op.op === 'encode').map((op) => op.args.slice(0, 2))).toEqual([['image/jpeg', 0.82]]);
  });
});

// ------------------------------------------------------------------ approval

describe('approval', () => {
  const base = async (): Promise<PrintRecord> => {
    const result = await readCompanionZip(
      zipFile([
        { name: 'manifest.json', data: JSON.stringify(manifestOf([shotOf('problem--p-260914359', PROBLEM_URL)])) },
        { name: 'shots/01_problem--p-260914359.jpg', data: IMAGE },
      ]),
      { plan: PLAN, tenantHost: HOST, existing: new Map(), t, nowIso: NOW },
    );
    // 3.5.5: an approvable print carries pins the SE placed (at least `MIN_CONFIRMED_PINS`).
    return { ...result.assets[0]!.record, identity: 'se-confirmed', pins: [{ n: 1, x: 300, y: 200, origin: 'manual' as const }, { n: 2, x: 700, y: 400, origin: 'manual' as const }, { n: 3, x: 1100, y: 600, origin: 'manual' as const }] };
  };

  it('approvalBlockers: pending suggestions, unconfirmed identity, the checklist, a companion landing not ok', async () => {
    const record = await base();
    expect(approvalBlockers(record, true)).toEqual([]);
    expect(approvalBlockers({ ...record, maskSuggestions: [{ x: 0, y: 0, w: 8, h: 8, reason: 'ipv4' }], identity: 'none', landing: 'unexpected_page' }, false)).toEqual([
      'pending-suggestions',
      'identity-unconfirmed',
      'checklist',
      'landing-not-ok',
    ]);
    expect(approvalBlockers({ ...record, source: 'manual', landing: 'unknown' }, true)).toEqual([]);
    await expect(approve({ ...record, identity: 'none' })).rejects.toThrow();
  });

  it('isApproved is recomputed: a mask, the image or the focus changing revokes it', async () => {
    const approved = await approve(await base(), NOW);
    expect(await isApproved(approved)).toBe(true);
    expect(await approvalState(approved)).toBe('approved');
    expect(await isApproved({ ...approved, masks: [{ x: 1, y: 1, w: 10, h: 10, reason: 'manual' }] })).toBe(false);
    expect(await isApproved({ ...approved, image: { ...approved.image, sha256: 'a'.repeat(64) } })).toBe(false);
    expect(await isApproved({ ...approved, focus: { x: 0, y: 0, w: 100, h: 50 } })).toBe(false);
    expect(await isApproved(approved, 'b'.repeat(64))).toBe(false);
    expect(await isApproved({ ...approved, warnings: [CORRUPT] })).toBe(false);
    expect(await approvalState({ ...approved, focus: null })).toBe('revoked');
    expect(await approvalState({ ...approved, approval: null })).toBe('none');
  });

  it('switching the lupa after approval withdraws it: a magnified region is not what the SE approved (3.2.7 review PS-5)', async () => {
    const record = { ...(await base()), lupaOn: false };
    expect(record.focus).not.toBeNull();
    const approved = await approve(record, NOW);
    expect(await isApproved(approved)).toBe(true);
    expect(await approvalState({ ...approved, lupaOn: true })).toBe('revoked');
    const withLupa = await approve({ ...record, lupaOn: true }, NOW);
    expect(await isApproved(withLupa)).toBe(true);
    expect(await isApproved({ ...withLupa, lupaOn: false })).toBe(false);
    // With the lupa off the focus hash is the region's alone, as before.
    expect(approved.approval?.focusHash).toBe(await hashFocus(record.focus));
  });

  it('rebinding a print to another slot withdraws its approval and its identity', async () => {
    const approved = await approve(await base(), NOW);
    const moved = reboundTo(approved, PLAN.slots[1]!, PLAN.slots[1]!.id, NOW);
    expect(moved).toMatchObject({ slotId: PLAN.slots[1]!.id, layout: 'services.details', identity: 'none', approval: null, matchedBy: 'rebound', pins: [] });
    expect(reboundTo(approved, null, approved.slotId, NOW)).toBe(approved);
  });

  it('the default lupa contains the hit of the pin it magnifies', () => {
    const focus = initialFocus('problems.detail', [{ key: 'users', hit: 0, rect: { x: 1500, y: 500, w: 60, h: 18 } }]);
    expect(focus).not.toBeNull();
    expect(focus!.x).toBeLessThanOrEqual(1500);
    expect(focus!.x + focus!.w).toBeGreaterThanOrEqual(1560);
    expect(focus!.y + focus!.h).toBeGreaterThanOrEqual(518);
    expect(focus!.x + focus!.w).toBeLessThanOrEqual(PRINT_SPACE.width);
  });

  it('the default lupa never grows past 520 px for a wide hit, and keeps the hit’s beginning', () => {
    const focus = initialFocus('problems.detail', [{ key: 'users', hit: 0, rect: { x: 300, y: 500, w: 900, h: 18 } }]);
    expect(focus).not.toBeNull();
    expect(focus!.w).toBeLessThanOrEqual(LUPA_MAX_PX);
    expect(focus!.x).toBe(300);
  });
});
