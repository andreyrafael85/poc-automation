import { documentsClient, type DocumentMetaData } from '@dynatrace-sdk/client-document';
import JSZip from 'jszip';

import { readIdentity } from '../../../../config/identity';
import { LIMITS } from '../constants';
import { blobBytes } from '../capture/imageBytes';
import { IMAGES_ZIP_RULES, emptyZip, inspectZipDirectory } from '../capture/zipDirectory';
import type { PrintRecord, PrintSet } from '../types';
import { mergePrintSets, migrate, tombstoneSet } from './printSetGuards';

/**
 * Where the real prints live (3.2.7, spec §7.1): two private Document Service documents per SE.
 *
 * - The set (`poc-value-studio:printset`): the PrintSet JSON, no pixels, ≤ 512 KB.
 * - The images (`poc-value-studio:printimages`): a STORE ZIP of the masters,
 *   `img/<printId>.<sha8>.jpg`, rewritten only when images change, ≤ 45 MB (warned from 25 MB).
 *
 * Both are created private on the first kept print and found again by type, newest first, and
 * only among this SE's own private documents (the list also returns documents others shared). A
 * write carries the version that was read (optimistic locking); a 409 on the set reloads, merges
 * per print (newest `updatedAtIso` wins) and retries once. 403 anywhere means the tab works from
 * memory only (`prt.store.memoryOnly`) and the SE exports a package instead.
 *
 * "Nova PoC" (`clearPrintDocuments`) overwrites both documents with a tombstone — an empty set and
 * the 22-byte empty ZIP — without a snapshot, so no copy of the old pixels survives in the history;
 * the next capture reuses the same documents. `deleteDocument` is never called: the app has no
 * `document:documents:delete`, and a delete would only move the document to the trash for 30 days.
 * IndexedDB and App State are not used.
 */

export const PRINTSET_TYPE = 'poc-value-studio:printset';
export const PRINTIMAGES_TYPE = 'poc-value-studio:printimages';
/** Document names, as the SE sees them in the Documents app (the spec's names; not app UI). */
// 3.4.14: the app is now "PoC Automation 3.0", but these document names stay — the prints already kept in the
// Document Service are found by them, so renaming would hide every print saved before the rename.
export const PRINTSET_NAME = 'PoC Value Studio · prints reais';
export const PRINTIMAGES_NAME = 'PoC Value Studio · prints reais (imagens)';
export const CLEARED_NAME = 'PoC Value Studio · prints (apagados)';

/** A document and the version a write must carry; `name` when known (a tombstone is renamed back on its next write). */
export interface DocRef {
  id: string;
  version: string;
  name?: string;
}

/** `full`: the images document would pass 45 MB; `limit`: the set already holds 16 prints. */
export type StoreFailure = 'forbidden' | 'missing' | 'conflict' | 'too-large' | 'full' | 'limit' | 'error';

export class StoreError extends Error {
  constructor(
    readonly kind: StoreFailure,
    message: string = kind,
  ) {
    super(message);
  }
}

/** What went wrong, from a Document Service error (the SDK's `ClientRequestError` carries the HTTP status). */
export function classifyStoreError(error: unknown): StoreFailure {
  if (error instanceof StoreError) return error.kind;
  const candidate = error as { response?: { status?: number }; status?: number; body?: { error?: { code?: number } }; message?: string } | null;
  const status = candidate?.response?.status ?? candidate?.status ?? candidate?.body?.error?.code;
  if (status === 401 || status === 403 || /scope|forbidden|not authori[sz]ed|permission/i.test(candidate?.message ?? '')) return 'forbidden';
  if (status === 404) return 'missing';
  if (status === 409 || /optimistic|version mismatch/i.test(candidate?.message ?? '')) return 'conflict';
  return 'error';
}

/** Bytes JSZip or the SDK just produced (always a plain `ArrayBuffer` underneath) as a Blob part. */
const part = (bytes: Uint8Array) => bytes as Uint8Array<ArrayBuffer>;

const asStoreError = (error: unknown) => (error instanceof StoreError ? error : new StoreError(classifyStoreError(error), error instanceof Error ? error.message : String(error)));

/** The images document's size: fine, over the 25 MB warning, or over the 45 MB refusal. */
export function imagesSizeState(totalBytes: number): 'ok' | 'warn' | 'full' {
  if (totalBytes > LIMITS.docHardBytes) return 'full';
  if (totalBytes > LIMITS.docSoftBytes) return 'warn';
  return 'ok';
}

/** A master's entry in the images document. */
export function imagesEntryName(record: Pick<PrintRecord, 'id' | 'image'>): string {
  return `img/${record.id}.${record.image.sha256.slice(0, 8)}.jpg`;
}

// ------------------------------------------------------------------ events

type StoreEvent = 'cleared';
const listeners = new Map<StoreEvent, Set<() => void>>();

/** "Nova PoC" tells every open print store to drop its working set. */
export const printStoreEvents = {
  on(event: StoreEvent, fn: () => void): () => void {
    const set = listeners.get(event) ?? new Set<() => void>();
    set.add(fn);
    listeners.set(event, set);
    return () => {
      set.delete(fn);
    };
  },
  emit(event: StoreEvent): void {
    for (const fn of [...(listeners.get(event) ?? [])]) {
      try {
        fn();
      } catch {
        // one listener's failure never stops the others
      }
    }
  },
};

// ------------------------------------------------------------------ listing

const ref = (doc: DocumentMetaData): DocRef => ({ id: doc.id, version: doc.version, name: doc.name });
/** The SDK types the time as a `Date`; it may still arrive as the RFC 3339 text. */
const modified = (doc: DocumentMetaData) => {
  const value: unknown = doc.modificationInfo?.lastModifiedTime;
  const ms = value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : 0;
};

/**
 * This SE's own private documents of these types, newest first. The filter fields (`type`,
 * `isPrivate`) are on the service's list of filterable fields; the same conditions, plus the owner
 * when the platform names the user, are checked again here, so a document someone else shared can
 * never be taken for the SE's own.
 */
async function listOwn(types: readonly string[]): Promise<DocumentMetaData[]> {
  const quoted = types.map((type) => `'${type}'`).join(', ');
  const filter = types.length === 1 ? `type = ${quoted} and isPrivate = true` : `type in (${quoted}) and isPrivate = true`;
  const list = await documentsClient.listDocuments({ filter, sort: '-modificationInfo.lastModifiedTime', pageSize: 10 });
  const me = readIdentity().id;
  const candidates = (list.documents ?? []).filter((doc) => types.includes(doc.type) && doc.isPrivate === true && (doc.access ?? []).includes('write'));
  // Only the user's own documents. A private document someone else shared with write access passes
  // the filter above; adopting it would load their prints, write this SE's unmasked masters into it
  // and tombstone it on "Nova PoC" (3.2.7 review PS-2/RT-2). `owner` is the SSO user id taken from
  // the Authorization header, the same id `getCurrentUserDetails()` gives. Without a user id the
  // owner cannot be told, so no document counts: the store starts a new set of its own instead.
  const mine = candidates.filter((doc) => me !== '' && doc.owner === me);
  return mine.sort((a, b) => modified(b) - modified(a));
}

/** The newest own document of a type, or null. */
async function newestOwn(type: string): Promise<DocRef | null> {
  const [doc] = await listOwn([type]);
  return doc === undefined ? null : ref(doc);
}

/** The Document Service answers this user (the diagnostics row). */
export async function probeDocumentService(): Promise<'ok' | 'forbidden' | 'error'> {
  try {
    await documentsClient.listDocuments({ filter: `type = '${PRINTSET_TYPE}' and isPrivate = true`, pageSize: 1 });
    return 'ok';
  } catch (error) {
    return classifyStoreError(error) === 'forbidden' ? 'forbidden' : 'error';
  }
}

// ------------------------------------------------------------------ load

export interface LoadedPrintSet {
  state: 'ok' | 'none' | 'forbidden' | 'error';
  set: PrintSet | null;
  /** Masters by print id (only those the images document holds for the set's prints). */
  masters: ReadonlyMap<string, Blob>;
  setDoc: DocRef | null;
  /** The images document with its live version (the set's `imagesDoc` may carry an older one). */
  imagesDoc: DocRef | null;
}

const NOTHING: Omit<LoadedPrintSet, 'state'> = { set: null, masters: new Map(), setDoc: null, imagesDoc: null };

/** The masters of the set's prints from the images ZIP; the directory is checked before anything is read. */
async function readImages(id: string, set: PrintSet): Promise<Map<string, Blob>> {
  const masters = new Map<string, Blob>();
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await (await documentsClient.downloadDocumentContent({ id })).get('array-buffer'));
  } catch (error) {
    if (classifyStoreError(error) === 'missing') return masters;
    throw error;
  }
  const directory = inspectZipDirectory(bytes, IMAGES_ZIP_RULES);
  if (!directory.ok || directory.entries.length === 0) return masters;
  const zip = await JSZip.loadAsync(bytes);
  const names = new Set(directory.entries.map((entry) => entry.name));
  for (const print of set.prints) {
    const name = imagesEntryName(print);
    const file = names.has(name) ? zip.file(name) : null;
    if (file === null) continue;
    masters.set(print.id, new Blob([part(await file.async('uint8array'))], { type: 'image/jpeg' }));
  }
  return masters;
}

/**
 * The SE's prints from the tenant: the newest own set and its images. A tombstone reads as `none`
 * but still names its documents (the next save reuses them); 403 is `forbidden`.
 */
export async function loadPrintSet(): Promise<LoadedPrintSet> {
  try {
    const docs = await listOwn([PRINTSET_TYPE, PRINTIMAGES_TYPE]);
    const setMeta = docs.find((doc) => doc.type === PRINTSET_TYPE);
    const imagesMetas = docs.filter((doc) => doc.type === PRINTIMAGES_TYPE);
    if (setMeta === undefined) return { ...NOTHING, state: 'none', imagesDoc: imagesMetas[0] === undefined ? null : ref(imagesMetas[0]) };
    let json: unknown;
    try {
      json = await (await documentsClient.downloadDocumentContent({ id: setMeta.id })).get('json');
    } catch (error) {
      if (classifyStoreError(error) === 'missing') return { ...NOTHING, state: 'none' };
      throw error;
    }
    const stored = migrate(json);
    const imagesMeta = imagesMetas.find((doc) => doc.id === stored?.imagesDoc?.id) ?? imagesMetas[0];
    const imagesDoc = imagesMeta === undefined ? null : ref(imagesMeta);
    const setDoc = ref(setMeta);
    if (stored === null || stored.cleared === true) return { ...NOTHING, state: 'none', setDoc, imagesDoc };
    const masters = imagesDoc === null ? new Map<string, Blob>() : await readImages(imagesDoc.id, stored);
    return { state: 'ok', set: { ...stored, imagesDoc: imagesDoc === null ? null : { id: imagesDoc.id, version: imagesDoc.version } }, masters, setDoc, imagesDoc };
  } catch (error) {
    const kind = classifyStoreError(error);
    return { ...NOTHING, state: kind === 'forbidden' ? 'forbidden' : kind === 'missing' ? 'none' : 'error' };
  }
}

// ------------------------------------------------------------------ save

/** Writes new content to a document: content only, or with its name when it was renamed (a tombstone). */
async function writeContent(doc: DocRef, name: string, content: Blob): Promise<DocRef> {
  if (doc.name !== undefined && doc.name !== name) {
    const updated = await documentsClient.updateDocument({ id: doc.id, optimisticLockingVersion: doc.version, body: { name, content } });
    return { id: updated.documentMetadata.id, version: updated.documentMetadata.version, name };
  }
  const meta = await documentsClient.updateDocumentContent({ id: doc.id, optimisticLockingVersion: doc.version, body: { content } });
  return { id: meta.id, version: meta.version, name };
}

async function createPrivate(name: string, type: string, content: Blob): Promise<DocRef> {
  const meta = await documentsClient.createDocument({ body: { name, type, content, isPrivate: true } });
  return { id: meta.id, version: meta.version, name };
}

function setBlob(set: PrintSet): Blob {
  const text = JSON.stringify(set);
  if (new TextEncoder().encode(text).length > LIMITS.setJsonBytes) throw new StoreError('too-large');
  return new Blob([text], { type: 'application/json' });
}

export interface SavedSet extends DocRef {
  /** The merged set when a conflict was merged (the caller adopts it); null otherwise. */
  merged: PrintSet | null;
}

/**
 * Saves the set: created private on the first save (or the SE's existing set document is reused),
 * then updated with the version read. 409: reload, merge per print, retry once; a second 409 — or a
 * set that was cleared meanwhile — is `conflict` ("Recarregar").
 */
export async function savePrintSet(set: PrintSet, doc: DocRef | null, removedIds: ReadonlySet<string> = new Set()): Promise<SavedSet> {
  const content = setBlob(set);
  try {
    const target = doc ?? (await newestOwn(PRINTSET_TYPE));
    if (target === null) return { ...(await createPrivate(PRINTSET_NAME, PRINTSET_TYPE, content)), merged: null };
    try {
      return { ...(await writeContent(target, PRINTSET_NAME, content)), merged: null };
    } catch (error) {
      if (classifyStoreError(error) !== 'conflict') throw error;
      const [meta, remoteJson] = await Promise.all([
        documentsClient.getDocumentMetadata({ id: target.id }),
        documentsClient.downloadDocumentContent({ id: target.id }).then((binary): Promise<unknown> => binary.get('json')),
      ]);
      const remote = migrate(remoteJson);
      if (remote === null || remote.cleared === true) throw new StoreError('conflict');
      const merged = mergePrintSets(set, remote, removedIds);
      try {
        return { ...(await writeContent({ id: meta.id, version: meta.version, name: meta.name }, PRINTSET_NAME, setBlob(merged))), merged };
      } catch (again) {
        throw classifyStoreError(again) === 'conflict' ? new StoreError('conflict') : again;
      }
    }
  } catch (error) {
    throw asStoreError(error);
  }
}

/** The STORE ZIP of the masters the set references (`img/<printId>.<sha8>.jpg`), and its payload size. */
export async function imagesZip(masters: ReadonlyMap<string, Blob>, set: PrintSet): Promise<{ bytes: Uint8Array; payload: number }> {
  const zip = new JSZip();
  let payload = 0;
  for (const print of set.prints) {
    const master = masters.get(print.id);
    if (master === undefined) continue;
    const bytes = await blobBytes(master);
    payload += bytes.length;
    zip.file(imagesEntryName(print), bytes, { binary: true, createFolders: false });
  }
  return { bytes: await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }), payload };
}

export interface SavedImages extends DocRef {
  /** Over the 25 MB warning. */
  warn: boolean;
  bytes: number;
}

/**
 * Rewrites the images document with the masters of the set's prints (one upload per batch).
 * Refused over 45 MB (`full`, `prt.err.store.full`). A 409 re-reads the version and retries once:
 * the set this window holds is what the images must match.
 */
export async function saveImages(masters: ReadonlyMap<string, Blob>, set: PrintSet, doc: DocRef | null = set.imagesDoc): Promise<SavedImages> {
  // The masters' own sizes first: an archive over the cap is never built.
  const referenced = set.prints.reduce((sum, print) => sum + (masters.get(print.id)?.size ?? 0), 0);
  if (imagesSizeState(referenced) === 'full') throw new StoreError('full');
  const { bytes, payload } = await imagesZip(masters, set);
  const size = imagesSizeState(bytes.length);
  if (size === 'full') throw new StoreError('full');
  const content = new Blob([part(bytes)], { type: 'application/zip' });
  const result = { warn: size === 'warn', bytes: payload };
  try {
    const target = doc ?? (await newestOwn(PRINTIMAGES_TYPE));
    if (target === null) return { ...(await createPrivate(PRINTIMAGES_NAME, PRINTIMAGES_TYPE, content)), ...result };
    try {
      return { ...(await writeContent(target, PRINTIMAGES_NAME, content)), ...result };
    } catch (error) {
      const kind = classifyStoreError(error);
      if (kind === 'missing') return { ...(await createPrivate(PRINTIMAGES_NAME, PRINTIMAGES_TYPE, content)), ...result };
      if (kind !== 'conflict') throw error;
      const meta = await documentsClient.getDocumentMetadata({ id: target.id });
      // "Nova PoC" tombstoned it meanwhile (another window): never write the old pixels back over that.
      if (meta.name === CLEARED_NAME && target.name !== CLEARED_NAME) throw new StoreError('conflict');
      try {
        return { ...(await writeContent({ id: meta.id, version: meta.version, name: meta.name }, PRINTIMAGES_NAME, content)), ...result };
      } catch (again) {
        throw classifyStoreError(again) === 'conflict' ? new StoreError('conflict') : again;
      }
    }
  } catch (error) {
    throw asStoreError(error);
  }
}

// ------------------------------------------------------------------ clear

/** Overwrites one document with its tombstone, without a snapshot; one retry on a version race. */
async function clearOne(doc: DocumentMetaData, content: () => Blob): Promise<void> {
  const write = (version: string) => documentsClient.updateDocument({ id: doc.id, optimisticLockingVersion: version, body: { name: CLEARED_NAME, content: content() } });
  try {
    await write(doc.version);
  } catch (error) {
    if (classifyStoreError(error) !== 'conflict') throw error;
    const meta = await documentsClient.getDocumentMetadata({ id: doc.id });
    await write(meta.version);
  }
}

/**
 * "Nova PoC": both documents become tombstones (an empty set marked `cleared`, the 22-byte empty
 * ZIP), with no snapshot. Every open store drops its working set (`cleared` is emitted whatever
 * the tenant answered — prints kept in memory only go too).
 */
export async function clearPrintDocuments(): Promise<'cleared' | 'none' | 'forbidden' | 'error'> {
  try {
    const docs = await listOwn([PRINTSET_TYPE, PRINTIMAGES_TYPE]);
    for (const doc of docs) {
      await clearOne(doc, () =>
        doc.type === PRINTSET_TYPE ? new Blob([JSON.stringify(tombstoneSet())], { type: 'application/json' }) : new Blob([part(emptyZip())], { type: 'application/zip' }),
      );
    }
    return docs.length === 0 ? 'none' : 'cleared';
  } catch (error) {
    return classifyStoreError(error) === 'forbidden' ? 'forbidden' : 'error';
  } finally {
    printStoreEvents.emit('cleared');
  }
}

// ------------------------------------------------------------------ package

/** "Exportar pacote (.zip)": the set JSON and the masters, for an SE whose tenant refused the documents. */
export async function packageZip(set: PrintSet, masters: ReadonlyMap<string, Blob>): Promise<Blob> {
  const zip = new JSZip();
  zip.file('printset.json', JSON.stringify(set, null, 2), { createFolders: false });
  for (const print of set.prints) {
    const master = masters.get(print.id);
    if (master !== undefined) zip.file(imagesEntryName(print), await blobBytes(master), { binary: true, createFolders: false });
  }
  return new Blob([part(await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }))], { type: 'application/zip' });
}
