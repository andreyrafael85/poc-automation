import { createHash } from 'node:crypto';

import JSZip from 'jszip';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translate } from '../i18n/strings';
import { LIMITS, MiB } from '../features/wrapup/prints/constants';
import { blobBytes } from '../features/wrapup/prints/capture/imageBytes';
import { IMAGES_ZIP_RULES, inspectZipDirectory } from '../features/wrapup/prints/capture/zipDirectory';
import { urlTemplateKey } from '../features/wrapup/prints/plan/linkChecks';
import { LAYOUT_OF } from '../features/wrapup/prints/plan/planner';
import { isPrintSet, mergePrintSets, migrate, emptyPrintSet } from '../features/wrapup/prints/store/printSetGuards';
import {
  CLEARED_NAME,
  PRINTIMAGES_NAME,
  PRINTIMAGES_TYPE,
  PRINTSET_NAME,
  PRINTSET_TYPE,
  StoreError,
  clearPrintDocuments,
  imagesEntryName,
  imagesSizeState,
  loadPrintSet,
  printStoreEvents,
  probeDocumentService,
  savePrintSet,
  saveImages,
  type LoadedPrintSet,
} from '../features/wrapup/prints/store/printStore';
import { usePrintStoreWith, type PrintStoreDeps } from '../features/wrapup/prints/store/usePrintStore';
import type { LinkCheck, PrintAsset, PrintRecord, PrintSet, ShotPlan, ShotSlot } from '../features/wrapup/prints/types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM script, no declaration file
import * as companionModule from '../../../scripts/visual/zipStore.mjs';

/**
 * Where the real prints are kept (3.2.7, WP4, spec §7.1): two private Document Service documents
 * per SE, and the tab's working set on top of them.
 *
 * The Document Service is replaced by an in-memory one that enforces what the real one does — a
 * version on every write (409 when it is stale), 403 when the scope is missing — so the tests pin
 * the behaviour that protects the SE's work: documents created private on the first print, writes
 * carrying the version read, a conflict merged per print and retried once, a refused store that
 * leaves the work in memory, the 25/45 MB guards, "Nova PoC" as a tombstone without a snapshot and
 * never a delete, and the stale guard that keeps another PoC's prints out of the deck.
 */

const sdk = vi.hoisted(() => {
  interface Meta {
    id: string;
    name: string;
    type: string;
    version: string;
    owner: string;
    isPrivate: boolean;
    access: string[];
    modificationInfo: { createdBy: string; createdTime: Date; lastModifiedBy: string; lastModifiedTime: Date };
  }
  const docs = new Map<string, { meta: Meta; content: Blob }>();
  const state = { forbidden: false, conflicts: 0, seq: 0, clock: Date.parse('2026-10-05T18:00:00.000Z') };
  const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
  const read = (blob: Blob) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('read'));
      reader.readAsArrayBuffer(blob);
    });
  const touch = (meta: Meta) => {
    meta.version = String(Number(meta.version) + 1);
    meta.modificationInfo.lastModifiedTime = new Date((state.clock += 1000));
  };
  const write = (id: string, version: string) => {
    if (state.forbidden) throw httpError(403);
    const doc = docs.get(id);
    if (doc === undefined) throw httpError(404);
    if (state.conflicts > 0) {
      state.conflicts -= 1;
      throw httpError(409);
    }
    if (doc.meta.version !== version) throw httpError(409);
    return doc;
  };
  const client = {
    listDocuments: vi.fn(async ({ filter }: { filter?: string } = {}) => {
      if (state.forbidden) throw httpError(403);
      const types = [...(filter ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
      const documents = [...docs.values()].map(({ meta }) => ({ ...meta })).filter((meta) => types.length === 0 || types.includes(meta.type));
      return { documents, totalCount: documents.length };
    }),
    createDocument: vi.fn(async ({ body }: { body: { name: string; type: string; content: Blob; isPrivate?: boolean } }) => {
      if (state.forbidden) throw httpError(403);
      state.seq += 1;
      const at = new Date((state.clock += 1000));
      const meta: Meta = {
        id: `doc-${state.seq}`,
        name: body.name,
        type: body.type,
        version: '1',
        owner: 'me',
        isPrivate: body.isPrivate !== false,
        access: ['read', 'write', 'delete'],
        modificationInfo: { createdBy: 'me', createdTime: at, lastModifiedBy: 'me', lastModifiedTime: at },
      };
      docs.set(meta.id, { meta, content: body.content });
      return { ...meta };
    }),
    updateDocumentContent: vi.fn(async ({ id, optimisticLockingVersion, body }: { id: string; optimisticLockingVersion: string; body: { content: Blob } }) => {
      const doc = write(id, optimisticLockingVersion);
      doc.content = body.content;
      touch(doc.meta);
      return { ...doc.meta };
    }),
    updateDocument: vi.fn(async ({ id, optimisticLockingVersion, body }: { id: string; optimisticLockingVersion: string; body: { name?: string; content?: Blob }; createSnapshot?: boolean }) => {
      const doc = write(id, optimisticLockingVersion);
      if (body.content !== undefined) doc.content = body.content;
      if (body.name !== undefined) doc.meta.name = body.name;
      touch(doc.meta);
      return { documentMetadata: { ...doc.meta } };
    }),
    getDocumentMetadata: vi.fn(async ({ id }: { id: string }) => {
      const doc = docs.get(id);
      if (doc === undefined) throw httpError(404);
      return { ...doc.meta };
    }),
    downloadDocumentContent: vi.fn(async ({ id }: { id: string }) => {
      if (state.forbidden) throw httpError(403);
      const doc = docs.get(id);
      if (doc === undefined) throw httpError(404);
      const content = doc.content;
      return {
        get: (type: string) => (type === 'json' ? read(content).then((buffer) => JSON.parse(new TextDecoder().decode(buffer)) as unknown) : read(content)),
      };
    }),
    deleteDocument: vi.fn(),
  };
  return { docs, state, client, httpError, read };
});

vi.mock('@dynatrace-sdk/client-document', () => ({ documentsClient: sdk.client }));
/** The signed-in user's id as the runtime gives it ('' when it gives none). */
const who = vi.hoisted(() => ({ id: 'me' }));
vi.mock('@dynatrace-sdk/app-environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dynatrace-sdk/app-environment')>()),
  getCurrentUserDetails: () => ({ id: who.id, name: 'Ana SE', email: 'se@example.com' }),
}));

const HOST = 'abc12345.apps.dynatrace.com';
const NOW = '2026-10-05T19:00:00.000Z';
const ANCHOR = { customer: 'Acme', startDate: '2026-09-29' };
const t = (key: Parameters<typeof translate>[0], params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);

/** A baseline JPEG (APP0, SOF0, SOS) at 1720×1080; `payload` varies the scan bytes (and so the SHA-256). */
function jpeg(payload: number): Uint8Array<ArrayBuffer> {
  const head = [
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x06, 0xb8, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
  ];
  const out = new Uint8Array(head.length + payload + 2);
  out.set(head);
  for (let i = 0; i < payload; i += 1) out[head.length + i] = (i * 13 + payload) & 0x7f;
  out.set([0xff, 0xd9], head.length + payload);
  return out;
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

function record(n: number, overrides: Partial<PrintRecord> = {}): PrintRecord {
  const bytes = jpeg(200 + n);
  return {
    id: `pr-${n.toString(16).padStart(16, '0')}`,
    slotId: `problem--p-${n}`,
    kind: 'problem',
    layout: 'problems.detail',
    titleText: { key: 'prt.title.problem', params: { id: `P-${n}` } },
    entity: { id: null, name: `P-${n}` },
    subject: { kind: 'incident' },
    incident: null,
    requestedPath: '/ui/apps/dynatrace.davis.problems/problem/1',
    finalPath: null,
    finalAppId: null,
    linkEvidence: 'verified',
    source: 'manual',
    landing: 'unknown',
    capturedAtIso: '2026-10-05T18:00:00.000Z',
    capturedAtApprox: false,
    captureTimeZone: null,
    screenTimeframeLabel: null,
    companion: null,
    image: { sha256: sha(bytes), mime: 'image/jpeg', bytes: bytes.length, width: 1720, height: 1080, normalization: 'native', partial: false },
    anchors: [],
    screenNumbers: [],
    identity: 'none',
    // 3.5.5: the SE placed the pins (approval asks for at least three).
    pins: [{ n: 1, x: 300, y: 200, origin: 'manual' as const }, { n: 2, x: 700, y: 400, origin: 'manual' as const }, { n: 3, x: 1100, y: 600, origin: 'manual' as const }],
    masks: [],
    maskSuggestions: [],
    focus: null,
    lupaOn: false,
    approval: null,
    warnings: [],
    matchedBy: 'slot',
    edited: false,
    updatedAtIso: '2026-10-05T18:00:00.000Z',
    ...overrides,
  };
}

const assetOf = (n: number, overrides: Partial<PrintRecord> = {}): PrintAsset => ({ record: record(n, overrides), master: new Blob([jpeg(200 + n)], { type: 'image/jpeg' }), thumbUrl: null });

function setWith(records: PrintRecord[], extra: Partial<PrintSet> = {}): PrintSet {
  return { ...emptyPrintSet(HOST, ANCHOR, '3.2.7', '2026-10-05T18:00:00.000Z'), prints: records, ...extra };
}

const mastersOf = (assets: PrintAsset[]) => new Map(assets.map((asset) => [asset.record.id, asset.master]));

const contentOf = async (id: string) => new Uint8Array(await sdk.read(sdk.docs.get(id)!.content));
const jsonOf = async (id: string) => JSON.parse(new TextDecoder().decode(await contentOf(id))) as Record<string, unknown>;
const docIdOf = (type: string) => [...sdk.docs.values()].find((doc) => doc.meta.type === type)?.meta.id ?? '';

const slot = (n: number): ShotSlot => {
  const url = `https://${HOST}/ui/apps/dynatrace.davis.problems/problem/${n}`;
  return {
    id: `problem--p-${n}`,
    kind: 'problem',
    layout: LAYOUT_OF.problem,
    order: n,
    titleText: { key: 'prt.title.problem', params: { id: `P-${n}` } },
    chosen: { entityId: null, entityName: `P-${n}`, url, evidence: 'verified', why: { key: 'prt.why.logs', params: {} } },
    alternates: [],
    omittedReason: null,
    included: true,
    probeOnly: false,
    forced: false,
    subject: { kind: 'incident' },
    incident: null,
    anchors: [],
    settleMs: 3500,
    urlTemplateKey: urlTemplateKey('problem', url),
  };
};

beforeEach(() => {
  who.id = 'me';
  sdk.docs.clear();
  sdk.state.forbidden = false;
  sdk.state.conflicts = 0;
  for (const fn of Object.values(sdk.client)) fn.mockClear();
});

// ------------------------------------------------------------------ documents

describe('the two private documents', () => {
  it('creates both on the first save, private, with the spec names and types; the images are a STORE ZIP', async () => {
    const assets = [assetOf(1), assetOf(2)];
    const set = setWith(assets.map((asset) => asset.record));
    const images = await saveImages(mastersOf(assets), set, null);
    const saved = await savePrintSet({ ...set, imagesDoc: { id: images.id, version: images.version } }, null);
    expect(sdk.client.createDocument).toHaveBeenCalledTimes(2);
    const bodies = sdk.client.createDocument.mock.calls.map(([call]) => ({ name: call.body.name, type: call.body.type, isPrivate: call.body.isPrivate }));
    expect(bodies).toEqual([
      { name: PRINTIMAGES_NAME, type: PRINTIMAGES_TYPE, isPrivate: true },
      { name: PRINTSET_NAME, type: PRINTSET_TYPE, isPrivate: true },
    ]);
    const zipBytes = await contentOf(images.id);
    const directory = inspectZipDirectory(zipBytes, IMAGES_ZIP_RULES);
    expect(directory).toMatchObject({ ok: true });
    if (directory.ok) {
      expect(directory.entries.map((entry) => [entry.name, entry.method])).toEqual(assets.map((asset) => [imagesEntryName(asset.record), 0]));
    }
    const stored = await jsonOf(saved.id);
    expect(isPrintSet(stored)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain('base64');
  });

  it('writes with the version it read (optimistic locking)', async () => {
    const set = setWith([record(1)]);
    const first = await savePrintSet(set, null);
    const second = await savePrintSet({ ...set, updatedAtIso: NOW }, first);
    expect(sdk.client.updateDocumentContent).toHaveBeenCalledWith(expect.objectContaining({ id: first.id, optimisticLockingVersion: first.version }));
    expect(second.version).toBe(String(Number(first.version) + 1));
  });

  it('a 409 reloads, merges per print (newest wins, link checks by shape) and retries once', async () => {
    const check = (templateKey: string, at: string, status: LinkCheck['status'] = 'ok'): LinkCheck => ({ templateKey, status, finalAppId: null, checkedAtIso: at, companionVersion: '1.1.0' });
    const base = setWith([record(1), record(2)], { linkChecks: [check('service:/a', '2026-10-01T00:00:00.000Z')] });
    const doc = await savePrintSet(base, null);
    // Another window: print 1 edited later, print 3 added, a newer check of the same shape.
    const theirs = setWith([record(1, { identity: 'se-confirmed', updatedAtIso: '2026-10-05T18:30:00.000Z' }), record(2), record(3)], {
      linkChecks: [check('service:/a', '2026-10-04T00:00:00.000Z', 'unresolved_link')],
    });
    await savePrintSet(theirs, doc);
    // This window still holds the old version: print 2 edited, a check of another shape.
    const mine = setWith([record(1), record(2, { masks: [{ x: 1, y: 1, w: 9, h: 9, reason: 'manual' }], updatedAtIso: '2026-10-05T18:40:00.000Z' })], {
      linkChecks: [check('service:/a', '2026-10-02T00:00:00.000Z'), check('logs:/b', '2026-10-03T00:00:00.000Z')],
    });
    const saved = await savePrintSet(mine, doc);
    expect(saved.merged).not.toBeNull();
    const merged = saved.merged!;
    expect(merged.prints.map((print) => print.id)).toEqual([record(1).id, record(2).id, record(3).id]);
    expect(merged.prints[0]?.identity).toBe('se-confirmed');
    expect(merged.prints[1]?.masks).toHaveLength(1);
    expect(merged.linkChecks.map((item) => [item.templateKey, item.status])).toEqual([
      ['logs:/b', 'ok'],
      ['service:/a', 'unresolved_link'],
    ]);
    expect((await jsonOf(doc.id)).prints).toHaveLength(3);
  });

  it('a print this window removed is not brought back by the merge', () => {
    const merged = mergePrintSets(setWith([record(1)]), setWith([record(1), record(2)]), new Set([record(2).id]));
    expect(merged.prints.map((print) => print.id)).toEqual([record(1).id]);
  });

  it('a second 409 is a conflict ("Recarregar")', async () => {
    const doc = await savePrintSet(setWith([record(1)]), null);
    sdk.state.conflicts = 2;
    await expect(savePrintSet(setWith([record(1)]), doc)).rejects.toMatchObject({ kind: 'conflict' });
    expect(sdk.client.updateDocumentContent).toHaveBeenCalledTimes(2);
  });

  it('403 everywhere: load says forbidden, and the diagnostics probe too', async () => {
    sdk.state.forbidden = true;
    expect((await loadPrintSet()).state).toBe('forbidden');
    expect(await probeDocumentService()).toBe('forbidden');
    await expect(savePrintSet(setWith([record(1)]), null)).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('size guards: a warning over 25 MB, a refusal over 45 MB (before any upload)', async () => {
    expect(imagesSizeState(LIMITS.docSoftBytes)).toBe('ok');
    expect(imagesSizeState(LIMITS.docSoftBytes + 1)).toBe('warn');
    expect(imagesSizeState(LIMITS.docHardBytes + 1)).toBe('full');
    const big = (n: number, mb: number): PrintAsset => ({ record: record(n), master: new Blob([new Uint8Array(mb * MiB)], { type: 'image/jpeg' }), thumbUrl: null });
    const warn = [big(1, 26)];
    expect((await saveImages(mastersOf(warn), setWith(warn.map((asset) => asset.record)), null)).warn).toBe(true);
    sdk.client.createDocument.mockClear();
    const full = [big(2, 23), big(3, 23)];
    await expect(saveImages(mastersOf(full), setWith(full.map((asset) => asset.record)), null)).rejects.toBeInstanceOf(StoreError);
    await expect(saveImages(mastersOf(full), setWith(full.map((asset) => asset.record)), null)).rejects.toMatchObject({ kind: 'full' });
    expect(sdk.client.createDocument).not.toHaveBeenCalled();
  });

  it('loads the newest own set and its masters, and ignores a set someone else shared', async () => {
    const assets = [assetOf(1), assetOf(2)];
    const set = setWith(assets.map((asset) => asset.record));
    const images = await saveImages(mastersOf(assets), set, null);
    await savePrintSet({ ...set, imagesDoc: { id: images.id, version: images.version } }, null);
    const shared = await sdk.client.createDocument({ body: { name: PRINTSET_NAME, type: PRINTSET_TYPE, content: new Blob([JSON.stringify(setWith([record(9)]))]) } });
    sdk.docs.get(shared.id)!.meta.owner = 'someone-else';
    const loaded = await loadPrintSet();
    expect(loaded.state).toBe('ok');
    expect(loaded.set?.prints.map((print) => print.id)).toEqual(assets.map((asset) => asset.record.id));
    expect(loaded.imagesDoc).toMatchObject({ id: images.id, version: images.version });
    for (const asset of assets) expect(sha(await blobBytes(loaded.masters.get(asset.record.id)!))).toBe(asset.record.image.sha256);
    expect(sdk.client.listDocuments).toHaveBeenCalledWith(expect.objectContaining({ filter: `type in ('${PRINTSET_TYPE}', '${PRINTIMAGES_TYPE}') and isPrivate = true` }));
  });

  it('refuses a deflated images document before JSZip inflates anything (3.2.7 review PS-6)', async () => {
    const assets = [assetOf(1)];
    const set = setWith(assets.map((asset) => asset.record));
    const images = await saveImages(mastersOf(assets), set, null);
    await savePrintSet({ ...set, imagesDoc: { id: images.id, version: images.version } }, null);
    // The same entry name, deflated: 4 MiB of zeros in a few KB (the app itself only ever writes STORE).
    const bomb = new JSZip();
    bomb.file(imagesEntryName(assets[0]!.record), new Uint8Array(4 * MiB), { binary: true, createFolders: false });
    const deflated = await bomb.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    expect(deflated.length).toBeLessThan(64 * 1024);
    expect(inspectZipDirectory(deflated, IMAGES_ZIP_RULES)).toEqual({ ok: false, reason: 'bad_method' });
    sdk.docs.get(images.id)!.content = new Blob([Uint8Array.from(deflated)], { type: 'application/zip' });
    const inflate = vi.spyOn(JSZip, 'loadAsync');
    const loaded = await loadPrintSet();
    expect(loaded.state).toBe('ok');
    expect(loaded.masters.size).toBe(0);
    expect(inflate).not.toHaveBeenCalled();
    inflate.mockRestore();
  });
});

describe('a colleague\'s shared documents (3.2.7 review PS-2/RT-2)', () => {
  it('with no document of its own, never loads, writes into or tombstones one someone else shared with write access', async () => {
    const theirs = setWith([record(7), record(8)]);
    const shared = await sdk.client.createDocument({ body: { name: PRINTSET_NAME, type: PRINTSET_TYPE, content: new Blob([JSON.stringify(theirs)]) } });
    sdk.docs.get(shared.id)!.meta.owner = 'colleague-b';
    const before = sdk.docs.get(shared.id)!.meta.version;
    expect(await loadPrintSet()).toMatchObject({ state: 'none', set: null, setDoc: null });
    const mine = await savePrintSet(setWith([record(1)]), null);
    expect(mine.id).not.toBe(shared.id);
    expect(await clearPrintDocuments()).toBe('cleared');
    expect(sdk.docs.get(shared.id)!.meta.version).toBe(before);
    expect(sdk.docs.get(shared.id)!.meta.name).toBe(PRINTSET_NAME);
    expect(await jsonOf(shared.id)).toMatchObject({ prints: theirs.prints.map((print) => ({ id: print.id })) });
  });

  it('without a user id from the runtime, adopts no document: ownership cannot be told, so a new set of its own is started', async () => {
    const theirs = setWith([record(7)]);
    const shared = await sdk.client.createDocument({ body: { name: PRINTSET_NAME, type: PRINTSET_TYPE, content: new Blob([JSON.stringify(theirs)]) } });
    sdk.docs.get(shared.id)!.meta.owner = 'colleague-b';
    const before = sdk.docs.get(shared.id)!.meta.version;
    who.id = '';
    expect(await loadPrintSet()).toMatchObject({ state: 'none', set: null, setDoc: null, imagesDoc: null });
    const mine = await savePrintSet(setWith([record(1)]), null);
    expect(mine.id).not.toBe(shared.id);
    expect(await clearPrintDocuments()).toBe('none');
    expect(sdk.docs.get(shared.id)!.meta.version).toBe(before);
    expect(sdk.docs.get(shared.id)!.meta.name).toBe(PRINTSET_NAME);
  });
});

describe('"Nova PoC": clearPrintDocuments', () => {
  it('an images write that meets a tombstone from another window is a conflict: the old pixels are never written back', async () => {
    const assets = [assetOf(1)];
    const set = setWith(assets.map((asset) => asset.record));
    const images = await saveImages(mastersOf(assets), set, null);
    await clearPrintDocuments();
    await expect(saveImages(mastersOf(assets), set, images)).rejects.toMatchObject({ kind: 'conflict' });
    expect((await contentOf(images.id)).length).toBe(22);
    expect(sdk.docs.get(images.id)?.meta.name).toBe(CLEARED_NAME);
  });

  it('overwrites both documents with a tombstone, without a snapshot, and never deletes', async () => {
    const assets = [assetOf(1)];
    const set = setWith(assets.map((asset) => asset.record));
    const images = await saveImages(mastersOf(assets), set, null);
    const doc = await savePrintSet({ ...set, imagesDoc: { id: images.id, version: images.version } }, null);
    const cleared = vi.fn();
    const off = printStoreEvents.on('cleared', cleared);
    expect(await clearPrintDocuments()).toBe('cleared');
    off();
    expect(sdk.client.updateDocument).toHaveBeenCalledTimes(2);
    for (const [call] of sdk.client.updateDocument.mock.calls) {
      expect(call.createSnapshot === undefined || call.createSnapshot === false).toBe(true);
      expect(call.body.name).toBe(CLEARED_NAME);
    }
    expect(sdk.client.deleteDocument).not.toHaveBeenCalled();
    const tombstone = await jsonOf(doc.id);
    expect(tombstone).toMatchObject({ schema: 'pvs.printset.v1', cleared: true, prints: [] });
    expect(JSON.stringify(tombstone)).not.toContain('Acme');
    const emptied = await contentOf(images.id);
    expect(emptied.length).toBe(22);
    expect([...emptied.slice(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
    expect(cleared).toHaveBeenCalledTimes(1);
    // A tombstone reads as nothing, but names its document so the next capture reuses it.
    const loaded = await loadPrintSet();
    expect(loaded).toMatchObject({ state: 'none', set: null, setDoc: { id: doc.id } });
  });

  it('with nothing stored it says so, and still empties every open working set', async () => {
    const cleared = vi.fn();
    const off = printStoreEvents.on('cleared', cleared);
    expect(await clearPrintDocuments()).toBe('none');
    sdk.state.forbidden = true;
    expect(await clearPrintDocuments()).toBe('forbidden');
    off();
    expect(cleared).toHaveBeenCalledTimes(2);
  });

  it('the next save after a clear reuses the tombstoned document and renames it back', async () => {
    const doc = await savePrintSet(setWith([record(1)]), null);
    await clearPrintDocuments();
    const again = await savePrintSet(setWith([record(2)]), null);
    expect(again.id).toBe(doc.id);
    expect(sdk.docs.get(doc.id)?.meta.name).toBe(PRINTSET_NAME);
    expect(sdk.client.createDocument).toHaveBeenCalledTimes(1);
  });
});

describe('printSetGuards', () => {
  it('migrate keeps valid prints, drops malformed ones, and reads a tombstone as empty', () => {
    const set = setWith([record(1), record(2)]);
    const broken = { ...set, prints: [record(1), { ...record(2), id: '../x' }, { ...record(3), image: { ...record(3).image, width: 99 } }, 'junk'] };
    expect(migrate(broken)?.prints.map((print) => print.id)).toEqual([record(1).id]);
    // Fields added after the first build default instead of failing the print.
    const { lupaOn: _l, edited: _e, screenNumbers: _s, ...older } = record(4);
    expect(migrate({ ...set, prints: [older] })?.prints).toHaveLength(1);
    expect(migrate({ schema: 'pvs.printset.v2', prints: [] })).toBeNull();
    expect(migrate({ schema: 'pvs.printset.v1', cleared: true, prints: [record(1)] })).toMatchObject({ cleared: true, prints: [] });
  });
});

// ------------------------------------------------------------------ the working set

const loadedWith = (set: PrintSet | null, assets: PrintAsset[], state: LoadedPrintSet['state'] = 'ok'): LoadedPrintSet => ({
  state,
  set,
  masters: mastersOf(assets),
  setDoc: set === null ? null : { id: 'doc-set', version: '4', name: PRINTSET_NAME },
  imagesDoc: set === null ? null : { id: 'doc-img', version: '2', name: PRINTIMAGES_NAME },
});

function mount(io: PrintStoreDeps['io'], anchor: { customer: string; startDate: string | null } = ANCHOR) {
  return renderHook((props: { anchor: { customer: string; startDate: string | null } }) => usePrintStoreWith({ tenantHost: HOST, anchor: props.anchor, appVersion: '3.2.7', t, saveDelayMs: 10, loadRetryDelaysMs: [1, 1], io }), {
    initialProps: { anchor },
  });
}

const okSave = () => vi.fn(async (_set: PrintSet) => ({ id: 'doc-set', version: '5', name: PRINTSET_NAME, merged: null }));
const okImages = () => vi.fn(async () => ({ id: 'doc-img', version: '3', name: PRINTIMAGES_NAME, warn: false, bytes: 1 }));

describe('usePrintStore', () => {
  it('403 on load: memory only — the work goes on, nothing is written', async () => {
    sdk.state.forbidden = true;
    const view = mount({});
    await waitFor(() => expect(view.result.current.state).toBe('memory-only'));
    expect(view.result.current.problem).toBe('prt.store.reason.forbidden');
    await act(async () => {
      await view.result.current.addManual(slot(1), new File([jpeg(300)], 'snip.jpg', { type: 'image/jpeg' }), null, 'manual');
    });
    expect(view.result.current.assets.size).toBe(1);
    expect(sdk.client.createDocument).not.toHaveBeenCalled();
    const exported = await view.result.current.exportPackage();
    const zip = await JSZip.loadAsync(await blobBytes(exported));
    expect(Object.keys(zip.files).sort()).toEqual([`img/${[...view.result.current.assets.keys()][0]}.${[...view.result.current.assets.values()][0]!.record.image.sha256.slice(0, 8)}.jpg`, 'printset.json']);
  });

  it('a load the tenant did not answer is read again: a blip does not turn saving off (3.2.7 review RT-1)', async () => {
    let calls = 0;
    const load = vi.fn(async () => (++calls === 1 ? loadedWith(null, [], 'error') : loadedWith(null, [], 'none')));
    const saveSet = okSave();
    const view = mount({ load, saveSet, saveImages: okImages() });
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    expect(load).toHaveBeenCalledTimes(2);
    expect(view.result.current.problem).toBeNull();
    await act(async () => {
      await view.result.current.addManual(slot(1), new File([jpeg(300)], 'snip.jpg', { type: 'image/jpeg' }), null, 'manual');
    });
    expect(saveSet).toHaveBeenCalledTimes(1);
  });

  it('a load that keeps failing is memory only with its own reason (not "no permission"), and reload reads again', async () => {
    let fail = true;
    const load = vi.fn(async () => (fail ? loadedWith(null, [], 'error') : loadedWith(null, [], 'none')));
    const view = mount({ load, saveSet: okSave(), saveImages: okImages() });
    await waitFor(() => expect(view.result.current.state).toBe('memory-only'));
    expect(load).toHaveBeenCalledTimes(3);
    expect(view.result.current.problem).toBe('prt.store.reason.error');
    fail = false;
    act(() => view.result.current.reload());
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    expect(view.result.current.problem).toBeNull();
  });

  it('the first kept print creates both documents (one upload each); an edit is saved after the debounce', async () => {
    const view = mount({});
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    expect(sdk.client.createDocument).not.toHaveBeenCalled();
    await act(async () => {
      await view.result.current.addManual(slot(1), new File([jpeg(300)], 'snip.jpg', { type: 'image/jpeg' }), null, 'manual');
    });
    expect(sdk.client.createDocument).toHaveBeenCalledTimes(2);
    expect(view.result.current.saveState).toBe('saved');
    const id = [...view.result.current.assets.keys()][0]!;
    // 3.5.5: the SE also places the pins (approval asks for at least three).
    const placedPins = [1, 2, 3].map((n) => ({ n, x: 300 * n, y: 200 * n, origin: 'manual' as const }));
    act(() => view.result.current.update(id, { identity: 'se-confirmed', masks: [{ x: 10, y: 10, w: 20, h: 20, reason: 'manual' }], pins: placedPins }));
    await waitFor(() => expect(sdk.client.updateDocumentContent).toHaveBeenCalledTimes(1));
    // Only the set: the images did not change.
    const stored = (await jsonOf(docIdOf(PRINTSET_TYPE))) as unknown as PrintSet;
    expect(stored.prints[0]).toMatchObject({ identity: 'se-confirmed', edited: true });
    await act(async () => {
      await view.result.current.approve(id);
    });
    expect(((await jsonOf(docIdOf(PRINTSET_TYPE))) as unknown as PrintSet).prints[0]?.approval).not.toBeNull();
    expect(sdk.client.updateDocumentContent).toHaveBeenCalledTimes(2);
  });

  it('a capture for a slot that already has a print replaces it', async () => {
    const view = mount({});
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    await act(async () => {
      await view.result.current.addManual(slot(1), new File([jpeg(300)], 'a.jpg', { type: 'image/jpeg' }), null, 'manual');
      await view.result.current.addManual(slot(1), new File([jpeg(301)], 'b.jpg', { type: 'image/jpeg' }), null, 'manual');
    });
    expect(view.result.current.assets.size).toBe(1);
    expect([...view.result.current.assets.values()][0]?.record.image.sha256).toBe(sha(jpeg(301)));
  });

  it('the stale guard hides another PoC’s prints until the SE keeps them', async () => {
    const assets = [assetOf(1)];
    const saveSet = okSave();
    const view = mount({ load: async () => loadedWith(setWith(assets.map((asset) => asset.record)), assets), saveSet, saveImages: okImages() }, { customer: 'Globex', startDate: '2026-10-01' });
    await waitFor(() => expect(view.result.current.state).toBe('stale'));
    expect(view.result.current.assets.size).toBe(0);
    expect(view.result.current.set?.prints).toEqual([]);
    expect(view.result.current.staleAnchor).toEqual(ANCHOR);
    act(() => view.result.current.keepStale());
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    expect(view.result.current.assets.size).toBe(1);
    await waitFor(() => expect(saveSet).toHaveBeenCalled());
    expect(saveSet.mock.calls[0]?.[0]).toMatchObject({ pocAnchor: { customer: 'Globex', startDate: '2026-10-01' } });
  });

  it('the same PoC is not stale; changing the PoC afterwards hides the prints', async () => {
    const assets = [assetOf(1)];
    const view = mount({ load: async () => loadedWith(setWith(assets.map((asset) => asset.record)), assets), saveSet: okSave(), saveImages: okImages() }, { customer: ' acme ', startDate: '2026-09-29' });
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    expect(view.result.current.assets.size).toBe(1);
    view.rerender({ anchor: { customer: 'Initech', startDate: null } });
    expect(view.result.current.state).toBe('stale');
    expect(view.result.current.assets.size).toBe(0);
  });

  it('printStoreEvents "cleared" empties the working set', async () => {
    const assets = [assetOf(1), assetOf(2)];
    const view = mount({ load: async () => loadedWith(setWith(assets.map((asset) => asset.record)), assets), saveSet: okSave(), saveImages: okImages() });
    await waitFor(() => expect(view.result.current.assets.size).toBe(2));
    act(() => printStoreEvents.emit('cleared'));
    expect(view.result.current.assets.size).toBe(0);
    expect(view.result.current.set).toBeNull();
  });

  it('a master that does not match its SHA-256 is marked corrupt after the load', async () => {
    const good = assetOf(1);
    const bad: PrintAsset = { ...assetOf(2), master: new Blob([jpeg(999)], { type: 'image/jpeg' }) };
    const view = mount({ load: async () => loadedWith(setWith([good.record, bad.record]), [good, bad]), saveSet: okSave(), saveImages: okImages() });
    await waitFor(() => expect(view.result.current.assets.get(bad.record.id)?.record.warnings).toContain('corrupt'));
    expect(view.result.current.assets.get(good.record.id)?.record.warnings).toEqual([]);
  });

  it('a second conflict stops saving until reload', async () => {
    const assets = [assetOf(1)];
    const saveSet = vi.fn(async () => {
      throw new StoreError('conflict');
    });
    const load = vi.fn(async () => loadedWith(setWith(assets.map((asset) => asset.record)), assets));
    const view = mount({ load, saveSet, saveImages: okImages() });
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    act(() => view.result.current.update(assets[0]!.record.id, { lupaOn: true }));
    await waitFor(() => expect(view.result.current.conflict).toBe(true));
    act(() => view.result.current.update(assets[0]!.record.id, { lupaOn: false }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(saveSet).toHaveBeenCalledTimes(1);
    act(() => view.result.current.reload());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.result.current.conflict).toBe(false));
  });

  it('an import is one upload per document; a ZIP from another tenant writes nothing', async () => {
    const zipStore = (companionModule as { zipStore(entries: { name: string; data: Buffer }[]): Buffer }).zipStore;
    const plan: ShotPlan = { tenantHost: HOST, generatedAtIso: NOW, planId: 'a1b2c3d4e5f6', incident: null, slots: [slot(1), slot(2)] };
    const shot = (n: number) => ({
      id: `problem--p-${n}`,
      title: `P-${n}`,
      requestedUrl: slot(n).chosen!.url,
      finalUrl: slot(n).chosen!.url,
      status: 'ok',
      file: `shots/0${n}_problem--p-${n}.jpg`,
      width: 1720,
      height: 1080,
      bytes: jpeg(400 + n).length,
      sha256: sha(jpeg(400 + n)),
      clipX: 200,
      anchors: [],
      pageTitle: null,
      capturedAt: NOW,
      warnings: [],
    });
    const manifest = (tenantHost: string) => ({
      schema: 'pvs.capture.manifest.v1',
      tenantHost,
      shotlistGeneratedAt: NOW,
      browser: null,
      viewport: { width: 1920, height: 1080 },
      crop: { mode: 'auto' },
      startedAt: NOW,
      finishedAt: NOW,
      shots: [shot(1), shot(2)],
    });
    const zipOf = (tenantHost: string) =>
      new File(
        [
          new Uint8Array(
            zipStore([
              { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest(tenantHost))) },
              { name: 'shots/01_problem--p-1.jpg', data: Buffer.from(jpeg(401)) },
              { name: 'shots/02_problem--p-2.jpg', data: Buffer.from(jpeg(402)) },
            ]),
          ),
        ],
        'capture.zip',
      );
    const view = mount({});
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    let refused: Awaited<ReturnType<typeof view.result.current.importZip>> | null = null;
    await act(async () => {
      refused = await view.result.current.importZip(zipOf('custa001.apps.dynatrace.com'), plan);
    });
    expect(refused).toMatchObject({ counts: { refused: 1 } });
    expect(sdk.client.createDocument).not.toHaveBeenCalled();
    let report: Awaited<ReturnType<typeof view.result.current.importZip>> | null = null;
    await act(async () => {
      report = await view.result.current.importZip(zipOf(HOST), plan);
    });
    expect(report).toMatchObject({ counts: { ok: 2 }, planIdMatch: null });
    expect(view.result.current.assets.size).toBe(2);
    expect(sdk.client.createDocument.mock.calls.map(([call]) => call.body.type)).toEqual([PRINTIMAGES_TYPE, PRINTSET_TYPE]);
    const stored = (await jsonOf(docIdOf(PRINTSET_TYPE))) as unknown as PrintSet;
    expect(stored.lastImport?.counts).toEqual({ ok: 2 });
    expect(stored.imagesDoc?.id).toBe(docIdOf(PRINTIMAGES_TYPE));
  });

  it('a failed upload of the images keeps them pending: the next save uploads them again before the set', async () => {
    let fail = true;
    const saveImagesIo = vi.fn(async () => {
      if (fail) throw new StoreError('error');
      return { id: 'doc-img', version: '3', name: PRINTIMAGES_NAME, warn: false, bytes: 1 };
    });
    const saveSet = okSave();
    const view = mount({ load: async () => loadedWith(null, [], 'none'), saveSet, saveImages: saveImagesIo });
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    await act(async () => {
      await view.result.current.addManual(slot(1), new File([jpeg(300)], 'snip.jpg', { type: 'image/jpeg' }), null, 'manual');
    });
    expect(view.result.current.saveState).toBe('error');
    expect(view.result.current.problem).toBe('prt.store.reason.error');
    expect(saveSet).not.toHaveBeenCalled();
    fail = false;
    const id = [...view.result.current.assets.keys()][0]!;
    act(() => view.result.current.update(id, { lupaOn: true }));
    await waitFor(() => expect(saveSet).toHaveBeenCalledTimes(1));
    expect(saveImagesIo).toHaveBeenCalledTimes(2);
    expect(saveSet.mock.calls[0]?.[0]).toMatchObject({ imagesDoc: { id: 'doc-img', version: '3' } });
  });

  it('a save still in flight when "Nova PoC" clears the set changes nothing afterwards', async () => {
    let release: () => void = () => undefined;
    const saveSet = vi.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          release = () => reject(new StoreError('conflict'));
        }),
    );
    const assets = [assetOf(1)];
    const view = mount({ load: async () => loadedWith(setWith(assets.map((asset) => asset.record)), assets), saveSet, saveImages: okImages() });
    await waitFor(() => expect(view.result.current.assets.size).toBe(1));
    act(() => view.result.current.update(assets[0]!.record.id, { lupaOn: true }));
    await waitFor(() => expect(saveSet).toHaveBeenCalledTimes(1));
    act(() => printStoreEvents.emit('cleared'));
    await act(async () => {
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(view.result.current.conflict).toBe(false);
    expect(view.result.current.set).toBeNull();
    expect(view.result.current.saveState).toBe('idle');
  });

  it('a refused file does not change the working set', async () => {
    const view = mount({});
    await waitFor(() => expect(view.result.current.state).toBe('ready'));
    await expect(view.result.current.addManual(slot(1), new File(['GIF89a'], 'a.gif', { type: 'image/gif' }), null, 'manual')).rejects.toMatchObject({ why: 'type' });
    expect(view.result.current.assets.size).toBe(0);
    expect(sdk.client.createDocument).not.toHaveBeenCalled();
  });
});
