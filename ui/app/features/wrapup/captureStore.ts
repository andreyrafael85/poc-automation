import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_VERSION } from '../../config/appInfo';
import type { CapturePin, DeckCapture } from './spec';

/**
 * Where the Tech Wrapup keeps its captures of the app (3.3.2).
 *
 * Until 3.3.1 the pictures lived in the page's state only: leaving the tab or reloading lost them
 * without a word, and the SE downloaded a deck without them. Now each picture is kept with the read
 * it belongs to — the window's end and the language it was taken in — and the moment it was taken:
 *
 *  - **in memory**, for the life of the app in this browser tab: leaving the Tech Wrapup and coming
 *    back finds them at once;
 *  - **in IndexedDB**, scoped to this browser tab (a random id in `sessionStorage`), so a reload
 *    of the tab finds them too. Nothing leaves the browser and no platform scope is involved.
 *
 * A picture from another read (the window moved, the language changed, a reload re-read the data)
 * is not put on the slides — its numbers would not match the deck's — but it is not dropped either:
 * the Tech Wrapup lists it as "from another read" with a one-click capture again.
 *
 * Bounds, because a PNG data URL is large: a picture over `MAX_STORED_CAPTURE_CHARS` stays in memory
 * only; the stored set is cut to `MAX_STORED_TOTAL_CHARS` (pictures from other reads go first, then
 * the oldest); a tab's record expires after `CAPTURE_TTL_MS` and is purged on the next open. Every
 * browser storage call is wrapped: a private window, a full disk or a blocked database leaves the
 * captures in memory and says so (`persisted: false`), never breaks the page.
 */

/** The read a picture belongs to. */
export interface CaptureRead {
  windowEnd: string;
  locale: string;
}

export interface StoredCapture extends CaptureRead {
  captureId: string;
  sectionId: string;
  capture: DeckCapture;
  /** ISO time the picture was taken. */
  capturedAt: string;
  /**
   * 3.3.19: the app version that took it. A panel can change between versions under the same
   * capture id (3.3.16 replaced Problems' arrivals), so a picture or a "no data" mark of another
   * version never counts as this read's — the SE captures it again.
   */
  version?: string;
}

/** A panel that settled without data in a read: "no data", shown instead of "no capture". */
export interface NoDataMark extends CaptureRead {
  captureId: string;
  sectionId: string;
  at: string;
  /** 3.3.19: the app version that marked it (see `StoredCapture.version`). */
  version?: string;
}

/** True when a stored picture or mark was made by this version of the app (3.3.19). */
export const thisVersion = (entry: { version?: string }): boolean => entry.version === APP_VERSION;

export interface CaptureSnapshot {
  captures: StoredCapture[];
  noData: NoDataMark[];
}

export const EMPTY_SNAPSHOT: CaptureSnapshot = { captures: [], noData: [] };

/** One picture larger than this (characters of its data URL, ~3 MB) is kept in memory only. */
export const MAX_STORED_CAPTURE_CHARS = 3_000_000;
/** The stored set of a tab is cut to this (characters, ~24 MB). */
export const MAX_STORED_TOTAL_CHARS = 24_000_000;
/** How long a tab's stored captures are kept before the next open purges them. */
export const CAPTURE_TTL_MS = 24 * 60 * 60 * 1000;
/** At most this many pictures and no-data marks are read back (the registry has far fewer). */
const MAX_ENTRIES = 80;

const ID = /^[a-z][a-z0-9.-]{0,63}$/;
const PNG_PREFIX = 'data:image/png;base64,';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isIso = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const isId = (value: unknown): value is string => typeof value === 'string' && ID.test(value);
const isLocale = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z-]{2,10}$/.test(value);

/** True when the picture is from the given read. */
export const sameRead = (a: CaptureRead, b: CaptureRead): boolean => a.windowEnd === b.windowEnd && a.locale === b.locale;

function parsePins(value: unknown): CapturePin[] | null {
  if (!Array.isArray(value)) return null;
  const pins: CapturePin[] = [];
  for (const pin of value.slice(0, 12)) {
    if (!isObject(pin) || !finite(pin.n) || !finite(pin.x) || !finite(pin.y) || typeof pin.label !== 'string') return null;
    pins.push({
      n: pin.n,
      x: Math.min(1, Math.max(0, pin.x)),
      y: Math.min(1, Math.max(0, pin.y)),
      label: pin.label.slice(0, 400),
      ...(typeof pin.detail === 'string' ? { detail: pin.detail.slice(0, 400) } : {}),
      ...(typeof pin.capability === 'string' ? { capability: pin.capability.slice(0, 80) } : {}),
    });
  }
  return pins;
}

function parseCapture(value: unknown): DeckCapture | null {
  if (!isObject(value)) return null;
  const { dataUrl, width, height, frame } = value;
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(PNG_PREFIX) || dataUrl.length > MAX_STORED_CAPTURE_CHARS) return null;
  if (!finite(width) || !finite(height) || width <= 0 || height <= 0) return null;
  const pins = parsePins(value.pins);
  if (pins === null) return null;
  return { dataUrl, width, height, pins, ...(typeof frame === 'string' && /^[0-9A-F]{6}$/.test(frame) ? { frame } : {}) };
}

/**
 * A stored snapshot read back from the browser, as untrusted input: entry by entry, a bad one is
 * dropped (not the whole set). Ids that the registry no longer has are the caller's to filter.
 */
export function parseSnapshot(value: unknown): CaptureSnapshot {
  if (!isObject(value)) return EMPTY_SNAPSHOT;
  const captures: StoredCapture[] = [];
  for (const entry of Array.isArray(value.captures) ? value.captures.slice(0, MAX_ENTRIES) : []) {
    if (!isObject(entry) || !isId(entry.captureId) || !isId(entry.sectionId) || !isIso(entry.windowEnd) || !isLocale(entry.locale) || !isIso(entry.capturedAt)) continue;
    const capture = parseCapture(entry.capture);
    if (capture === null) continue;
    captures.push({ captureId: entry.captureId, sectionId: entry.sectionId, windowEnd: entry.windowEnd, locale: entry.locale, capturedAt: entry.capturedAt, capture, ...(typeof entry.version === 'string' ? { version: entry.version } : {}) });
  }
  const noData: NoDataMark[] = [];
  for (const entry of Array.isArray(value.noData) ? value.noData.slice(0, MAX_ENTRIES) : []) {
    if (!isObject(entry) || !isId(entry.captureId) || !isId(entry.sectionId) || !isIso(entry.windowEnd) || !isLocale(entry.locale) || !isIso(entry.at)) continue;
    noData.push({ captureId: entry.captureId, sectionId: entry.sectionId, windowEnd: entry.windowEnd, locale: entry.locale, at: entry.at, ...(typeof entry.version === 'string' ? { version: entry.version } : {}) });
  }
  return { captures: dedupe(captures), noData: dedupe(noData) };
}

/** One entry per capture id: the last one wins. */
function dedupe<E extends { captureId: string }>(entries: readonly E[]): E[] {
  const byId = new Map<string, E>();
  for (const entry of entries) byId.set(entry.captureId, entry);
  return [...byId.values()];
}

/**
 * What a run adds to a snapshot: its pictures replace those of the same capture id; a panel that
 * settled without data in this read is marked so, and a mark is lifted by a picture of the same id.
 */
export function mergeRun(
  snapshot: CaptureSnapshot,
  run: { captures: Readonly<Record<string, DeckCapture>>; noData: readonly string[] },
  sectionOf: (captureId: string) => string | undefined,
  read: CaptureRead,
  now: Date = new Date(),
): CaptureSnapshot {
  const at = now.toISOString();
  const taken = Object.keys(run.captures);
  const captures = [
    ...snapshot.captures.filter((entry) => !taken.includes(entry.captureId)),
    ...taken.flatMap((captureId) => {
      const sectionId = sectionOf(captureId);
      const capture = run.captures[captureId];
      return sectionId === undefined || capture === undefined ? [] : [{ captureId, sectionId, capture, capturedAt: at, version: APP_VERSION, ...read }];
    }),
  ];
  const marked = run.noData.filter((captureId) => sectionOf(captureId) !== undefined);
  const noData = [
    ...snapshot.noData.filter((mark) => !taken.includes(mark.captureId) && !marked.includes(mark.captureId)),
    ...marked.map((captureId) => ({ captureId, sectionId: sectionOf(captureId) as string, at, version: APP_VERSION, ...read })),
  ];
  return { captures, noData };
}

/**
 * The part of a snapshot that is written to the browser: a picture over the per-picture bound stays
 * out, and the set is cut to the total bound — pictures from other reads first, then the oldest.
 */
export function boundSnapshot(
  snapshot: CaptureSnapshot,
  read: CaptureRead | null,
  limits: { perCapture: number; total: number } = { perCapture: MAX_STORED_CAPTURE_CHARS, total: MAX_STORED_TOTAL_CHARS },
): CaptureSnapshot {
  const fitting = snapshot.captures.filter((entry) => entry.capture.dataUrl.length <= limits.perCapture);
  // Most valuable first: this read's pictures, then the newest.
  const ranked = [...fitting].sort((a, b) => {
    const current = Number(read !== null && sameRead(b, read)) - Number(read !== null && sameRead(a, read));
    return current !== 0 ? current : Date.parse(b.capturedAt) - Date.parse(a.capturedAt);
  });
  const kept = new Set<StoredCapture>();
  let total = 0;
  for (const entry of ranked) {
    const size = entry.capture.dataUrl.length;
    if (total + size > limits.total) continue;
    total += size;
    kept.add(entry);
  }
  return { captures: snapshot.captures.filter((entry) => kept.has(entry)), noData: snapshot.noData };
}

// ------------------------------------------------------------------ the browser

/** Where a tab's snapshot is written. The IndexedDB one in the app; a fake in tests. */
export interface CaptureBackend {
  read(key: string): Promise<unknown>;
  write(key: string, value: { savedAt: number; snapshot: CaptureSnapshot }): Promise<void>;
  remove(key: string): Promise<void>;
  /** Deletes every record saved before `before` (epoch ms). */
  purge(before: number): Promise<void>;
}

const DB_NAME = 'pvs-wrapup-captures';
const DB_STORE = 'tabs';
const TAB_KEY = 'pvs.wrapup.captureTab.v1';

function request<R>(open: () => IDBRequest<R>): Promise<R> {
  return new Promise((resolve, reject) => {
    try {
      const req = open();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** The IndexedDB backend, or null when this browser offers none (jsdom, some private windows). */
export function indexedDbBackend(): CaptureBackend | null {
  let factory: IDBFactory | undefined;
  try {
    factory = globalThis.indexedDB;
  } catch {
    return null;
  }
  if (factory === undefined || factory === null) return null;
  const idb = factory;
  let opening: Promise<IDBDatabase> | null = null;
  const db = () => {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const req = idb.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB could not open'));
        req.onblocked = () => reject(new Error('IndexedDB is blocked'));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    return opening;
  };
  const store = async (mode: IDBTransactionMode) => (await db()).transaction(DB_STORE, mode).objectStore(DB_STORE);
  return {
    read: async (key) => {
      const objects = await store('readonly');
      return request<unknown>(() => objects.get(key));
    },
    write: async (key, value) => {
      const objects = await store('readwrite');
      await request(() => objects.put(value, key));
    },
    remove: async (key) => {
      const objects = await store('readwrite');
      await request(() => objects.delete(key));
    },
    // One cursor walk inside one transaction: every expired (or unreadable) record is deleted.
    purge: async (before) => {
      const objects = await store('readwrite');
      await new Promise<void>((resolve, reject) => {
        try {
          const req = objects.openCursor();
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor === null) {
              resolve();
              return;
            }
            const record: unknown = cursor.value;
            if (!isObject(record) || !finite(record.savedAt) || record.savedAt < before) cursor.delete();
            cursor.continue();
          };
          req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
  };
}

/** This browser tab's key: a random id kept in `sessionStorage`, which a reload keeps and a new tab does not. */
export function tabKey(): string | null {
  try {
    const storage = globalThis.sessionStorage;
    if (storage === undefined || storage === null) return null;
    const known = storage.getItem(TAB_KEY);
    if (known !== null && /^[a-z0-9-]{8,64}$/.test(known)) return known;
    const id =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    storage.setItem(TAB_KEY, id);
    return id;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ the hook

/** The pictures of this app instance, shared by every mount of the Tech Wrapup. */
let memory: CaptureSnapshot | null = null;
/** Whether the last write reached the browser's storage. */
let memoryPersisted = false;

/** Forgets the in-memory pictures (tests; a new PoC). */
export function resetCaptureMemory(): void {
  memory = null;
  memoryPersisted = false;
}

export interface CaptureStoreView {
  snapshot: CaptureSnapshot;
  /** False until the stored snapshot was read back (or found absent). */
  loaded: boolean;
  /** True when the pictures are also kept in the browser's storage, so a reload finds them. */
  persisted: boolean;
  /** Adds a run's pictures and no-data marks, for the given read. */
  record: (run: { captures: Readonly<Record<string, DeckCapture>>; noData: readonly string[] }, read: CaptureRead) => void;
  /** Removes every picture and mark, in memory and in storage. */
  clear: () => void;
}

export interface CaptureStoreOptions {
  /** The capture ids the registry has, with their section; others are dropped on load. */
  sectionOf: (captureId: string) => string | undefined;
  /** The read on screen, so a cut keeps its pictures first. */
  read: CaptureRead;
  /** `undefined`: the browser's IndexedDB; `null`: memory only. */
  backend?: CaptureBackend | null;
  /** `undefined`: this tab's key from `sessionStorage`. */
  storageKey?: string | null;
}

/**
 * The Tech Wrapup's captures, kept across leaving the tab and reloading it. Starts from memory when
 * the app already holds pictures; otherwise reads the tab's stored snapshot once.
 */
/** `primary`'s entries, then `secondary`'s for the panels `primary` does not have. */
export function unionSnapshots(primary: CaptureSnapshot, secondary: CaptureSnapshot): CaptureSnapshot {
  const has = new Set([...primary.captures.map((entry) => entry.captureId), ...primary.noData.map((mark) => mark.captureId)]);
  return {
    captures: [...primary.captures, ...secondary.captures.filter((entry) => !has.has(entry.captureId))],
    noData: [...primary.noData, ...secondary.noData.filter((mark) => !has.has(mark.captureId))],
  };
}

export function useCaptureStore({ sectionOf, read, backend, storageKey }: CaptureStoreOptions): CaptureStoreView {
  const resolved = useMemo(() => {
    const store = backend === undefined ? indexedDbBackend() : backend;
    const key = storageKey === undefined ? tabKey() : storageKey;
    return store === null || key === null ? null : { store, key };
  }, [backend, storageKey]);
  const [snapshot, setSnapshot] = useState<CaptureSnapshot>(() => memory ?? EMPTY_SNAPSHOT);
  const [loaded, setLoaded] = useState(memory !== null || resolved === null);
  const [persisted, setPersisted] = useState(memory !== null && memoryPersisted);
  const latest = useRef({ sectionOf, read });
  latest.current = { sectionOf, read };

  const known = useCallback(
    (value: CaptureSnapshot): CaptureSnapshot => ({
      captures: value.captures.filter((entry) => latest.current.sectionOf(entry.captureId) === entry.sectionId),
      noData: value.noData.filter((mark) => latest.current.sectionOf(mark.captureId) === mark.sectionId),
    }),
    [],
  );

  useEffect(() => {
    if (memory !== null || resolved === null) return undefined;
    let alive = true;
    void (async () => {
      let found = EMPTY_SNAPSHOT;
      let ok = false;
      try {
        await resolved.store.purge(Date.now() - CAPTURE_TTL_MS);
      } catch {
        // An old record left behind is purged on a later open.
      }
      try {
        const record = await resolved.store.read(resolved.key);
        found = known(parseSnapshot(isObject(record) ? record.snapshot : undefined));
        ok = true;
      } catch {
        ok = false;
      }
      if (!alive) return;
      // A run that finished while the read was in flight wins, panel by panel, over what was stored;
      // what it did not touch is kept (review 3.3.2 #8).
      memory = memory === null ? found : unionSnapshots(memory, found);
      memoryPersisted = ok;
      setSnapshot(memory);
      setPersisted(ok);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [resolved, known]);

  const write = useCallback(
    (next: CaptureSnapshot) => {
      memory = next;
      setSnapshot(next);
      if (resolved === null) {
        memoryPersisted = false;
        setPersisted(false);
        return;
      }
      const bounded = boundSnapshot(next, latest.current.read);
      void (async () => {
        try {
          if (bounded.captures.length === 0 && bounded.noData.length === 0) await resolved.store.remove(resolved.key);
          else await resolved.store.write(resolved.key, { savedAt: Date.now(), snapshot: bounded });
          // Other tabs' records past their day go on every write too, not only on the next open (review 3.3.2 #7).
          await resolved.store.purge(Date.now() - CAPTURE_TTL_MS).catch(() => undefined);
          memoryPersisted = bounded.captures.length === next.captures.length;
        } catch {
          memoryPersisted = false;
        }
        setPersisted(memoryPersisted);
      })();
    },
    [resolved],
  );

  const record = useCallback<CaptureStoreView['record']>(
    (run, runRead) => write(mergeRun(memory ?? EMPTY_SNAPSHOT, run, latest.current.sectionOf, runRead)),
    [write],
  );
  const clear = useCallback(() => write(EMPTY_SNAPSHOT), [write]);

  return { snapshot, loaded, persisted, record, clear };
}
