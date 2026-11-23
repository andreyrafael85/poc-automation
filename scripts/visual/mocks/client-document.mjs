/**
 * Mock of `@dynatrace-sdk/client-document` (the platform's Document Service).
 *
 * An in-memory `documentsClient` for the calls the app makes: the real-prints store (3.2.7,
 * `features/wrapup/prints/store/printStore.ts`) keeps a private set document and a private images
 * ZIP per SE, and the PoC dashboard (`features/dashboard/pocDashboard.ts`) creates one dashboard.
 * Documents live for the page's lifetime (a reload starts empty, like a first visit).
 *
 * - Versions are optimistic: every write must carry the version it read, else HTTP 409, as the
 *   service answers; a missing document is HTTP 404. The errors carry `response.status`, which is
 *   what the store's `classifyStoreError` reads.
 * - `listDocuments` honours the `type` / `isPrivate` conditions of the filter and the
 *   `-modificationInfo.lastModifiedTime` sort the store sends.
 * - `downloadDocumentContent` returns the SDK's binary shape, `{ get(kind) }` for
 *   `'json' | 'text' | 'array-buffer' | 'blob'`.
 * - `deleteDocument` throws: the app has no `document:documents:delete` and must never call it
 *   (a guard, also logged as a console error so the harness's console check fails loudly).
 * - Scenario `denied`: every call fails with the 403 envelope of `errors.mjs` (missing scope), so
 *   the prints tab reaches its memory-only state as on a tenant without the document scopes.
 * - `globalThis.__pvsDocuments()` (harness only) returns what was stored, for `capture.mjs`.
 *
 * Everything not mocked is re-exported from the real package.
 */

import { getCurrentUserDetails } from './app-environment.mjs';
import { permissionDeniedError } from './errors.mjs';

export * from '@pvs-real/client-document';

/** id → { meta, content: Blob } */
const docs = new Map();
let seq = 0;
/** Strictly increasing write times, so the store's newest-first order is never a tie. */
let clock = 0;

const scenario = () => globalThis.__PVS__?.scenario ?? 'rich';

function httpError(status, message) {
  const error = new Error(message ?? `HTTP ${status}`);
  error.name = status === 404 ? 'NotFound' : status === 409 ? 'Conflict' : 'ClientRequestError';
  return Object.assign(error, { isApiClientError: true, isClientRequestError: true, response: { status } });
}

function guard(kind) {
  // The SDK's error carries the HTTP response as well as the envelope.
  if (scenario() === 'denied') throw Object.assign(permissionDeniedError(`document:documents:${kind}`), { response: { status: 403 } });
}

function now() {
  clock = Math.max(clock + 1000, Date.now());
  return new Date(clock);
}

const copy = (meta) => ({ ...meta, modificationInfo: { ...meta.modificationInfo }, access: [...meta.access] });

function blobOf(content) {
  if (content instanceof Blob) return content;
  if (typeof content === 'string') return new Blob([content], { type: 'text/plain' });
  if (content instanceof ArrayBuffer || ArrayBuffer.isView(content)) return new Blob([content]);
  return new Blob([JSON.stringify(content ?? null)], { type: 'application/json' });
}

function existing(id) {
  const doc = docs.get(id);
  if (doc === undefined) throw httpError(404, `Document ${id} not found`);
  return doc;
}

function writable(id, version) {
  guard('write');
  const doc = existing(id);
  if (String(doc.meta.version) !== String(version)) throw httpError(409, 'Optimistic locking failed: version mismatch');
  return doc;
}

function touch(doc) {
  const at = now();
  doc.meta.version = String(Number(doc.meta.version) + 1);
  doc.meta.modificationInfo.lastModifiedTime = at;
  doc.meta.modificationInfo.lastModifiedBy = doc.meta.owner;
}

/** The `type = '…'`, `type in ('…', …)` and `isPrivate = true|false` conditions of a filter. */
function matches(meta, filter) {
  if (typeof filter !== 'string' || filter.trim() === '') return true;
  const typeClause = /type\s*(?:=|in)\s*\(?([^)]*?)\)?(?:\s+and\b|$)/i.exec(filter);
  if (typeClause !== null) {
    const types = [...typeClause[1].matchAll(/'([^']*)'/g)].map((match) => match[1]);
    if (types.length > 0 && !types.includes(meta.type)) return false;
  }
  const privateClause = /isPrivate\s*=\s*(true|false)/i.exec(filter);
  if (privateClause !== null && meta.isPrivate !== (privateClause[1].toLowerCase() === 'true')) return false;
  return true;
}

async function contentOf(blob, kind) {
  if (kind === 'blob') return blob;
  if (kind === 'array-buffer') return blob.arrayBuffer();
  if (kind === 'text') return blob.text();
  if (kind === 'json') return JSON.parse(await blob.text());
  throw new Error(`[pvs-harness] downloadDocumentContent: unsupported body kind "${kind}"`);
}

export const documentsClient = {
  async listDocuments(config = {}) {
    guard('read');
    let documents = [...docs.values()].map(({ meta }) => meta).filter((meta) => matches(meta, config.filter));
    if (typeof config.sort === 'string' && /modificationInfo\.lastModifiedTime/.test(config.sort)) {
      const sign = config.sort.trim().startsWith('-') ? -1 : 1;
      documents = documents.sort((a, b) => sign * (a.modificationInfo.lastModifiedTime - b.modificationInfo.lastModifiedTime));
    }
    const totalCount = documents.length;
    const pageSize = Number.isInteger(config.pageSize) && config.pageSize > 0 ? config.pageSize : 20;
    return { documents: documents.slice(0, pageSize).map(copy), totalCount };
  },

  async createDocument({ body }) {
    guard('write');
    seq += 1;
    const at = now();
    const owner = getCurrentUserDetails().id;
    const meta = {
      id: `pvs-harness-doc-${String(seq).padStart(4, '0')}`,
      name: body.name,
      type: body.type,
      description: body.description,
      version: '1',
      owner,
      isPrivate: body.isPrivate !== false,
      access: ['read', 'write'],
      modificationInfo: { createdBy: owner, createdTime: at, lastModifiedBy: owner, lastModifiedTime: at },
    };
    docs.set(meta.id, { meta, content: blobOf(body.content) });
    return copy(meta);
  },

  async getDocumentMetadata({ id }) {
    guard('read');
    return copy(existing(id).meta);
  },

  async updateDocument({ id, optimisticLockingVersion, body = {} }) {
    const doc = writable(id, optimisticLockingVersion);
    if (body.content !== undefined) doc.content = blobOf(body.content);
    if (body.name !== undefined) doc.meta.name = body.name;
    if (body.isPrivate !== undefined) doc.meta.isPrivate = body.isPrivate !== false;
    touch(doc);
    return { documentMetadata: copy(doc.meta) };
  },

  async updateDocumentContent({ id, optimisticLockingVersion, body = {} }) {
    const doc = writable(id, optimisticLockingVersion);
    doc.content = blobOf(body.content);
    touch(doc);
    return copy(doc.meta);
  },

  async downloadDocumentContent({ id }) {
    guard('read');
    const { content } = existing(id);
    return { get: (kind) => contentOf(content, kind) };
  },

  async deleteDocument({ id } = {}) {
    // A guard, not a feature: deleting moves a document to the trash for 30 days, and the app has no scope for it.
    console.error(`[pvs-harness] documentsClient.deleteDocument(${id ?? ''}) was called; the app must never delete a document`);
    throw new Error('[pvs-harness] deleteDocument is not allowed: the app has no document:documents:delete scope');
  },
};

/**
 * Harness only (not part of the SDK): what the app stored, for `capture.mjs` to inspect — each
 * document's metadata and its content as text (JSON and text as written; anything else, such as
 * the STORE ZIP of the masters, as latin1, so ASCII written into it is still searchable). The
 * `prints-deck` block uses it to prove the companion's page text (anchor labels, page titles) is
 * never persisted (spec §7.3, rule 3).
 */
globalThis.__pvsDocuments = async () =>
  Promise.all(
    [...docs.values()].map(async ({ meta, content }) => {
      const bytes = new Uint8Array(await content.arrayBuffer());
      const textual = /json|text/.test(content.type);
      let text = '';
      if (textual) text = new TextDecoder().decode(bytes);
      else for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { id: meta.id, name: meta.name, type: meta.type, isPrivate: meta.isPrivate, version: meta.version, bytes: bytes.length, contentType: content.type, text };
    }),
  );
