import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_VERSION } from '../../../../config/appInfo';
import { useStudio } from '../../../../config/StudioContext';
import type { StringKey } from '../../../../i18n/strings';
import { useTranslation, type Translation } from '../../../../i18n/useTranslation';
import { environmentBase } from '../../../../utils/deepLinks';
import { LIMITS } from '../constants';
import { printText } from '../text';
import { CORRUPT, approve as approveRecord, revoke as revokeRecord } from '../capture/approval';
import { blobBytes, sha256Hex } from '../capture/imageBytes';
import { intakeFile } from '../capture/intake';
import { makeThumb } from '../capture/normalize';
import { identityOf, initialFocus, reboundTo } from '../capture/record';
import { hasRaster } from '../capture/raster';
import { readScreen, SCREEN_READ, SCREEN_READ_V1 } from '../capture/readScreen';
import { readCompanionZip } from '../capture/zipImport';
import type { ImportReport, PrintAsset, PrintRecord, PrintSet, Rect, ShotPlan, ShotSlot } from '../types';
import { STORE_REASON, emptyPrintSet, mergeLinkChecks, sameAnchor, type PocAnchor } from './printSetGuards';
import {
  StoreError,
  classifyStoreError,
  clearPrintDocuments,
  imagesSizeState,
  loadPrintSet,
  packageZip,
  printStoreEvents,
  savePrintSet,
  saveImages,
  type DocRef,
  type LoadedPrintSet,
} from './printStore';

/**
 * The tab's working set of real prints (3.2.7, spec §2.7 and §7.1): what was captured, edited and
 * approved, kept on the tenant without the SE having to think about it.
 *
 * - **Load once, write only what changed.** Nothing is written on open; the first kept print
 *   creates the documents; edits are saved 1.5 s after the last one, approvals, imports and
 *   removals at once; a pending save is flushed when the tab is hidden or left.
 * - **Never over what it could not read.** A 403 or a failed read leaves the store in memory only
 *   (`prt.store.memoryOnly`, or `prt.store.memoryOnly.error` when the tenant did not answer, after
 *   two more reads): the work goes on and "Exportar pacote (.zip)" keeps it.
 * - **A second window.** A conflicting save is merged per print and retried once; a second
 *   conflict stops saving until the SE reloads (`prt.store.conflict`).
 * - **Another PoC's prints.** When the stored PoC anchor (customer and start date) is not this
 *   PoC's, the prints are hidden — the deck receives none — until the SE deletes them or keeps them
 *   ("São desta PoC").
 * - **"Nova PoC".** `printStoreEvents` `cleared` empties the working set at once.
 *
 * The masters are Blobs in memory, the thumbnails object URLs revoked when replaced or unmounted;
 * nothing goes to IndexedDB or App State.
 */

export type PrintPatch = Partial<Pick<PrintRecord, 'pins' | 'masks' | 'maskSuggestions' | 'focus' | 'lupaOn' | 'identity'>>;

export interface PrintStore {
  state: 'loading' | 'ready' | 'memory-only' | 'stale';
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  savedAtIso: string | null;
  /** Hidden (no prints) while loading or stale. */
  set: PrintSet | null;
  /** By print id; empty while loading or stale. */
  assets: ReadonlyMap<string, PrintAsset>;
  /** The other PoC the stored prints belong to (stale guard), else null. */
  staleAnchor: { customer: string; startDate: string | null } | null;
  /** A second conflicting save: saving stops until `reload()` (`prt.store.conflict`). */
  conflict: boolean;
  /** Why the last save failed, as a key for `prt.store.notSaved` `{reason}`; null when it did not. */
  problem: StringKey | null;
  /** The images document is over 25 MB. */
  sizeWarning: boolean;
  importZip(file: File | Blob, plan: ShotPlan): Promise<ImportReport>;
  /** Throws `IntakeError` (a refused file) or `StoreError` (`full`, `limit`). */
  addManual(slot: ShotSlot, file: File | Blob, crop: Rect | null, source: 'manual' | 'tab-capture'): Promise<void>;
  update(printId: string, patch: PrintPatch): void;
  approve(printId: string): Promise<void>;
  revoke(printId: string): void;
  remove(printId: string): Promise<void>;
  /** "Usar no slot…": `slot` gives the print that slot's fields (kind, layout, entity); a print already there is replaced. */
  rebind(printId: string, slotId: string, slot?: ShotSlot): void;
  keepStale(): void;
  clearAll(): Promise<void>;
  exportPackage(): Promise<Blob>;
  /** Reads the documents again (after a conflict, or after a load the tenant did not answer while no print is held). */
  reload(): void;
  /** 3.5.5: the prints whose screen is being read right now (the labels their pins belong to), by print id. */
  reading: ReadonlySet<string>;
}

/** The storage calls; replaced in tests. */
export interface PrintStoreIo {
  load: () => Promise<LoadedPrintSet>;
  saveSet: typeof savePrintSet;
  saveImages: typeof saveImages;
  clear: () => Promise<unknown>;
  thumb: (master: Blob) => Promise<string>;
  revokeThumb: (url: string) => void;
  /** 3.5.5: the automatic reading of a print's screen (`capture/readScreen.ts`). */
  readScreen?: typeof readScreen;
}

export interface PrintStoreDeps {
  tenantHost: string;
  anchor: PocAnchor;
  /** False while the PoC configuration is still being read (its anchor is not known yet). */
  anchorReady?: boolean;
  appVersion: string;
  t: Translation['t'];
  /** Debounce of edits before a save (1.5 s). */
  saveDelayMs?: number;
  /** Waits before reading again after a load that failed with no answer (not a 403): a blip is not a session without saving. */
  loadRetryDelaysMs?: readonly number[];
  io?: Partial<PrintStoreIo>;
}

/** Two more reads, 1 s and 3 s after a failed one (3.2.7 review RT-1). */
const LOAD_RETRY_DELAYS_MS: readonly number[] = [1000, 3000];

const DEFAULT_IO: PrintStoreIo = {
  load: loadPrintSet,
  saveSet: savePrintSet,
  saveImages,
  clear: clearPrintDocuments,
  thumb: makeThumb,
  revokeThumb: (url) => URL.revokeObjectURL(url),
};

const EMPTY_ASSETS: ReadonlyMap<string, PrintAsset> = new Map();

type Data = { set: PrintSet | null; assets: Map<string, PrintAsset> };

const nowIso = () => new Date().toISOString();

/** The set's prints, in the order the working set holds them. */
const withPrints = (set: PrintSet, assets: ReadonlyMap<string, PrintAsset>): PrintSet => ({ ...set, prints: [...assets.values()].map((asset) => asset.record) });

const totalBytes = (assets: Iterable<PrintAsset>) => [...assets].reduce((sum, asset) => sum + asset.master.size, 0);

/** The store, with its dependencies explicit (the tab uses `usePrintStore`). */
export function usePrintStoreWith(deps: PrintStoreDeps): PrintStore {
  const io = useMemo<PrintStoreIo>(() => ({ ...DEFAULT_IO, ...deps.io }), [deps.io]);
  const delay = deps.saveDelayMs ?? 1500;
  const anchorReady = deps.anchorReady ?? true;
  const { customer, startDate } = deps.anchor;
  const anchor = useMemo<PocAnchor>(() => ({ customer, startDate }), [customer, startDate]);

  const [view, setView] = useState<Data>({ set: null, assets: new Map() });
  const [loadOutcome, setLoadOutcome] = useState<LoadedPrintSet['state'] | null>(null);
  const [saveState, setSaveState] = useState<PrintStore['saveState']>('idle');
  const [savedAtIso, setSavedAtIso] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [problem, setProblem] = useState<StringKey | null>(null);
  const [sizeWarning, setSizeWarning] = useState(false);
  const [loadToken, setLoadToken] = useState(0);

  const data = useRef<Data>({ set: null, assets: new Map() });
  const setDoc = useRef<DocRef | null>(null);
  const imagesDoc = useRef<DocRef | null>(null);
  const imagesDirty = useRef(false);
  const saving = useRef(false);
  const queued = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removedIds = useRef(new Set<string>());
  const memoryOnly = useRef(false);
  const conflictRef = useRef(false);
  const mounted = useRef(true);
  /** Bumped by "Nova PoC" and by a reload: a save started before either is not applied after it. */
  const generation = useRef(0);
  const latest = useRef({ deps, anchor, io });
  latest.current = { deps, anchor, io };
  const [reading, setReading] = useState<ReadonlySet<string>>(new Set());
  const readQueue = useRef<string[]>([]);
  const readBusy = useRef(false);

  const stale = view.set !== null && view.set.prints.length > 0 && anchorReady && !sameAnchor(view.set.pocAnchor, anchor);
  const staleRef = useRef(stale);
  staleRef.current = stale;

  const commit = useCallback((set: PrintSet | null, assets: Map<string, PrintAsset>) => {
    const next = { set: set === null ? null : withPrints(set, assets), assets };
    data.current = next;
    if (mounted.current) setView(next);
  }, []);

  const revokeThumbs = useCallback((assets: Iterable<PrintAsset>) => {
    for (const asset of assets) if (asset.thumbUrl !== null) latest.current.io.revokeThumb(asset.thumbUrl);
  }, []);

  /** Thumbnails for the assets that have none (best effort: no canvas, no thumbnail). */
  const addThumbs = useCallback(
    async (ids: readonly string[]) => {
      const made = await Promise.all(
        ids.map(async (id) => {
          const asset = data.current.assets.get(id);
          if (asset === undefined || asset.thumbUrl !== null) return null;
          try {
            return { id, url: await latest.current.io.thumb(asset.master) };
          } catch {
            return null;
          }
        }),
      );
      const assets = new Map(data.current.assets);
      let changed = false;
      for (const item of made) {
        if (item === null) continue;
        const asset = assets.get(item.id);
        if (asset === undefined || asset.thumbUrl !== null || !mounted.current) {
          latest.current.io.revokeThumb(item.url);
          continue;
        }
        assets.set(item.id, { ...asset, thumbUrl: item.url });
        changed = true;
      }
      if (changed) commit(data.current.set, assets);
    },
    [commit],
  );

  // ------------------------------------------------------------------ save

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const current = data.current.set;
    if (current === null || memoryOnly.current || conflictRef.current || staleRef.current) return;
    if (saving.current) {
      queued.current = true;
      return;
    }
    saving.current = true;
    // A "Nova PoC" or a reload while this save is in flight makes its outcome moot.
    const started = generation.current;
    if (mounted.current) setSaveState('saving');
    let imagesPending = false;
    try {
      let set = withPrints(current, data.current.assets);
      if (imagesDirty.current && (data.current.assets.size > 0 || imagesDoc.current !== null)) {
        imagesDirty.current = false;
        imagesPending = true;
        const masters = new Map([...data.current.assets].map(([id, asset]) => [id, asset.master]));
        const saved = await latest.current.io.saveImages(masters, set, imagesDoc.current);
        imagesPending = false;
        if (generation.current !== started) return;
        imagesDoc.current = { id: saved.id, version: saved.version, ...(saved.name === undefined ? {} : { name: saved.name }) };
        if (mounted.current) setSizeWarning(saved.warn);
        set = { ...set, imagesDoc: { id: saved.id, version: saved.version } };
        if (data.current.set !== null) data.current = { ...data.current, set: { ...data.current.set, imagesDoc: set.imagesDoc } };
      }
      const saved = await latest.current.io.saveSet(set, setDoc.current, removedIds.current);
      if (generation.current !== started) return;
      setDoc.current = { id: saved.id, version: saved.version, ...(saved.name === undefined ? {} : { name: saved.name }) };
      if (saved.merged !== null) {
        // Another window's prints whose images this window does not hold stay in the document only.
        // A print edited here while the save was in flight keeps that newer edit.
        const merged = saved.merged;
        const known = new Set(data.current.assets.keys());
        const assets = new Map(data.current.assets);
        for (const print of merged.prints) {
          const asset = assets.get(print.id);
          if (asset !== undefined && Date.parse(print.updatedAtIso) >= Date.parse(asset.record.updatedAtIso)) assets.set(print.id, { ...asset, record: print });
        }
        commit({ ...merged, prints: merged.prints.filter((print) => known.has(print.id)) }, assets);
      } else if (data.current.set !== null) commit({ ...data.current.set, imagesDoc: set.imagesDoc }, data.current.assets);
      if (mounted.current) {
        setSaveState('saved');
        setSavedAtIso(nowIso());
        setProblem(null);
      }
    } catch (error) {
      if (generation.current !== started) return;
      // The images did not reach the tenant: the next save must upload them again, or the set would
      // name prints whose masters the images document does not hold (lost on the next load).
      if (imagesPending) imagesDirty.current = true;
      const kind = classifyStoreError(error);
      if (kind === 'conflict') {
        conflictRef.current = true;
        if (mounted.current) setConflict(true);
      } else if (kind === 'forbidden') memoryOnly.current = true;
      if (mounted.current) {
        setSaveState('error');
        setProblem(kind === 'conflict' ? null : STORE_REASON[kind === 'too-large' || kind === 'full' || kind === 'forbidden' ? kind : 'error']);
      }
    } finally {
      saving.current = false;
      if (queued.current) {
        queued.current = false;
        void flush();
      }
    }
  }, [commit]);

  const scheduleSave = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flush();
    }, delay);
  }, [delay, flush]);

  // ------------------------------------------------------------------ load

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let loaded = await latest.current.io.load();
      // A failed read that is not a 403 (5xx, 429, a network blip) is read again before the session gives up saving.
      for (const wait of latest.current.deps.loadRetryDelaysMs ?? LOAD_RETRY_DELAYS_MS) {
        if (loaded.state !== 'error' || cancelled || !mounted.current) break;
        await new Promise((resolve) => setTimeout(resolve, wait));
        if (cancelled || !mounted.current) return;
        loaded = await latest.current.io.load();
      }
      if (cancelled || !mounted.current) return;
      setDoc.current = loaded.setDoc;
      imagesDoc.current = loaded.imagesDoc;
      memoryOnly.current = loaded.state === 'forbidden' || loaded.state === 'error';
      if (loaded.state === 'forbidden') setProblem(STORE_REASON.forbidden);
      else if (loaded.state === 'error') setProblem(STORE_REASON.error);
      const assets = new Map<string, PrintAsset>();
      if (loaded.set !== null) {
        for (const record of loaded.set.prints) {
          const master = loaded.masters.get(record.id);
          if (master !== undefined) assets.set(record.id, { record, master, thumbUrl: null });
        }
      }
      commit(loaded.set, assets);
      setLoadOutcome(loaded.state);
      // The SHA-256 of each master, checked once after the load: a mismatch keeps the print out of the deck.
      const checks = await Promise.all(
        [...assets.values()].map(async (asset) => {
          try {
            return (await sha256Hex(await blobBytes(asset.master))) === asset.record.image.sha256 ? null : asset.record.id;
          } catch {
            return null;
          }
        }),
      );
      const corrupt = checks.filter((id): id is string => id !== null);
      if (!cancelled && corrupt.length > 0) {
        const next = new Map(data.current.assets);
        for (const id of corrupt) {
          const asset = next.get(id);
          if (asset !== undefined && !asset.record.warnings.includes(CORRUPT)) next.set(id, { ...asset, record: { ...asset.record, warnings: [...asset.record.warnings, CORRUPT] } });
        }
        commit(data.current.set, next);
      }
      if (!cancelled) void addThumbs([...assets.keys()]);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadToken, commit, addThumbs]);

  // "Nova PoC", from this tab or from Settings.
  useEffect(
    () =>
      printStoreEvents.on('cleared', () => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null;
        generation.current += 1;
        revokeThumbs(data.current.assets.values());
        removedIds.current = new Set();
        imagesDirty.current = false;
        conflictRef.current = false;
        // The documents still exist (as tombstones, at new versions): the next save finds and reuses them.
        setDoc.current = null;
        imagesDoc.current = null;
        commit(null, new Map());
        if (mounted.current) {
          setConflict(false);
          setSizeWarning(false);
          setSaveState('idle');
        }
      }),
    [commit, revokeThumbs],
  );

  // Flush a pending save when the page is hidden, and when the tab is left.
  useEffect(() => {
    mounted.current = true;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && timer.current !== null) void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      mounted.current = false;
      if (timer.current !== null) void flush();
      revokeThumbs(data.current.assets.values());
    };
  }, [flush, revokeThumbs]);

  // ------------------------------------------------------------------ edits

  /** The working set, created for this PoC on the first print; an empty set adopts the current anchor. */
  const ensureSet = useCallback((): PrintSet => {
    const { deps: current, anchor: poc } = latest.current;
    const set = data.current.set;
    if (set === null) return emptyPrintSet(current.tenantHost, poc, current.appVersion);
    return set.prints.length === 0 ? { ...set, pocAnchor: { ...poc }, appVersion: current.appVersion } : { ...set, appVersion: current.appVersion };
  }, []);

  /** Adds an asset in place of the slot's current print, unless the 45 MB or the 16-print cap refuses it. */
  const place = useCallback((assets: Map<string, PrintAsset>, asset: PrintAsset): 'added' | 'full' | 'limit' => {
    const replaced = [...assets.values()].find((each) => each.record.slotId === asset.record.slotId);
    const others = [...assets.values()].filter((each) => each !== replaced);
    if (replaced === undefined && assets.size >= LIMITS.prints) return 'limit';
    if (imagesSizeState(totalBytes(others) + asset.master.size) === 'full') return 'full';
    if (replaced !== undefined) {
      assets.delete(replaced.record.id);
      removedIds.current.add(replaced.record.id);
      if (replaced.thumbUrl !== null) latest.current.io.revokeThumb(replaced.thumbUrl);
    }
    assets.set(asset.record.id, asset);
    return 'added';
  }, []);

  const importZip = useCallback(
    async (file: File | Blob, plan: ShotPlan): Promise<ImportReport> => {
      const { deps: current } = latest.current;
      const existing = new Map((data.current.set?.prints ?? []).map((print) => [print.id, print]));
      const result = await readCompanionZip(file, { plan, tenantHost: current.tenantHost, existing, t: current.t });
      if (result.refused !== null) return result.report;
      const report: ImportReport = { ...result.report, counts: { ...result.report.counts }, problems: [...result.report.problems] };
      const assets = new Map(data.current.assets);
      const added: string[] = [];
      for (const asset of result.assets) {
        const outcome = place(assets, asset);
        if (outcome === 'added') {
          added.push(asset.record.id);
          continue;
        }
        const orphan = result.orphanIds.includes(asset.record.id);
        const key = orphan ? 'orphan' : 'ok';
        report.counts[key] = Math.max(0, (report.counts[key] ?? 0) - 1);
        report.counts.refused = (report.counts.refused ?? 0) + 1;
        if (orphan) report.orphans = report.orphans.filter((item) => item.id !== asset.record.slotId);
        // The report's lines are tenant text once translated (a title names the entity): redacted like the import's own.
        const name = printText(current.t(asset.record.titleText.key, asset.record.titleText.params), 80, 'se');
        report.problems.push(printText(outcome === 'full' ? current.t('prt.err.store.full') : current.t('prt.imp.limit', { name, max: String(LIMITS.prints) }), 300, 'se'));
      }
      // A failed import with nothing to keep writes nothing (the documents are created on the first kept print).
      if (added.length === 0 && result.linkChecks.length === 0 && data.current.set === null) return report;
      const base = ensureSet();
      commit({ ...base, linkChecks: mergeLinkChecks(base.linkChecks, result.linkChecks), lastImport: report, updatedAtIso: nowIso() }, assets);
      if (added.length > 0) imagesDirty.current = true;
      void addThumbs(added);
      await flush();
      return report;
    },
    [addThumbs, commit, ensureSet, flush, place],
  );

  const patchRecord = useCallback(
    (printId: string, change: (record: PrintRecord) => PrintRecord): boolean => {
      const asset = data.current.assets.get(printId);
      const set = data.current.set;
      if (asset === undefined || set === null) return false;
      const assets = new Map(data.current.assets);
      assets.set(printId, { ...asset, record: change(asset.record) });
      commit({ ...set, updatedAtIso: nowIso() }, assets);
      return true;
    },
    [commit],
  );

  const update = useCallback(
    (printId: string, patch: PrintPatch) => {
      if (patchRecord(printId, (record) => ({ ...record, ...patch, edited: true, updatedAtIso: nowIso() }))) scheduleSave();
    },
    [patchRecord, scheduleSave],
  );

  /**
   * 3.5.5: reads the screens waiting in the queue, one at a time, in the background. The anchors found are the
   * print's own (never the SE's pins); a verified identity is set only on a print nobody confirmed; the default lupa
   * is set only on a print without one and not approved (the lupa is part of what an approval binds).
   */
  const drainReads = useCallback(async () => {
    if (readBusy.current) return;
    readBusy.current = true;
    try {
      for (let next = readQueue.current.shift(); next !== undefined; next = readQueue.current.shift()) {
        const printId = next;
        const asset = data.current.assets.get(printId);
        if (asset === undefined || asset.record.warnings.includes(SCREEN_READ)) {
          if (mounted.current) {
            setReading((current) => {
              const left = new Set(current);
              left.delete(printId);
              return left;
            });
          }
          continue;
        }
        const reader = latest.current.io.readScreen ?? readScreen;
        const anchors = await reader(asset.master, asset.record);
        const changed = patchRecord(printId, (record) => {
          // 3.5.6: a print read by 3.5.5 (fallback face) keeps nothing of that reading — its anchors and the identity
          // they verified are replaced by this one's.
          const reread = record.warnings.includes(SCREEN_READ_V1);
          const before = reread ? [] : record.anchors;
          const identity = reread && record.identity === 'anchor' ? 'none' : record.identity;
          return {
            ...record,
            anchors: anchors.length > 0 ? anchors : before,
            identity: identity === 'none' && anchors.length > 0 ? identityOf(record.layout, anchors) : identity,
            focus: record.focus === null && record.approval === null && anchors.length > 0 ? initialFocus(record.layout, anchors) : record.focus,
            warnings: [...record.warnings.filter((warning) => warning !== SCREEN_READ_V1), SCREEN_READ],
          };
        });
        if (mounted.current) {
          setReading((current) => {
            const left = new Set(current);
            left.delete(printId);
            return left;
          });
        }
        if (changed) scheduleSave();
      }
    } finally {
      readBusy.current = false;
    }
  }, [patchRecord, scheduleSave]);

  const queueReads = useCallback(
    (ids: readonly string[]) => {
      if (!hasRaster() && latest.current.io.readScreen === undefined) return;
      for (const id of ids) if (!readQueue.current.includes(id)) readQueue.current.push(id);
      // 3.5.7: a queued screen counts as being read from now on — the deck waits for every one (owner: a slide of the
      // 3.5.6 deck had no pins because it was made while the screens were still being read again).
      if (mounted.current) setReading((current) => new Set([...current, ...ids]));
      void drainReads();
    },
    [drainReads],
  );

  const addManual = useCallback(
    async (slot: ShotSlot, file: File | Blob, crop: Rect | null, source: 'manual' | 'tab-capture') => {
      const asset = await intakeFile(file, slot, crop, source);
      const assets = new Map(data.current.assets);
      const outcome = place(assets, asset);
      if (outcome !== 'added') throw new StoreError(outcome === 'full' ? 'full' : 'limit');
      commit({ ...ensureSet(), updatedAtIso: nowIso() }, assets);
      imagesDirty.current = true;
      void addThumbs([asset.record.id]);
      await flush();
      // 3.5.5: the labels of the screen are looked for in the background (the pins snap to them).
      queueReads([asset.record.id]);
    },
    [addThumbs, commit, ensureSet, flush, place, queueReads],
  );

  const approve = useCallback(
    async (printId: string) => {
      const asset = data.current.assets.get(printId);
      if (asset === undefined) return;
      const approved = await approveRecord(asset.record);
      if (patchRecord(printId, () => approved)) await flush();
    },
    [flush, patchRecord],
  );

  const revoke = useCallback(
    (printId: string) => {
      if (patchRecord(printId, (record) => revokeRecord(record))) scheduleSave();
    },
    [patchRecord, scheduleSave],
  );

  const remove = useCallback(
    async (printId: string) => {
      const asset = data.current.assets.get(printId);
      const set = data.current.set;
      if (asset === undefined || set === null) return;
      const assets = new Map(data.current.assets);
      assets.delete(printId);
      removedIds.current.add(printId);
      if (asset.thumbUrl !== null) latest.current.io.revokeThumb(asset.thumbUrl);
      commit({ ...set, updatedAtIso: nowIso() }, assets);
      imagesDirty.current = true;
      await flush();
    },
    [commit, flush],
  );

  const rebind = useCallback(
    (printId: string, slotId: string, slot?: ShotSlot) => {
      const asset = data.current.assets.get(printId);
      const set = data.current.set;
      if (asset === undefined || set === null || asset.record.slotId === slotId) return;
      const assets = new Map(data.current.assets);
      const occupant = [...assets.values()].find((each) => each.record.slotId === slotId && each.record.id !== printId);
      if (occupant !== undefined) {
        assets.delete(occupant.record.id);
        removedIds.current.add(occupant.record.id);
        if (occupant.thumbUrl !== null) latest.current.io.revokeThumb(occupant.thumbUrl);
        imagesDirty.current = true;
      }
      assets.set(printId, { ...asset, record: reboundTo(asset.record, slot ?? null, slotId, nowIso()) });
      commit({ ...set, updatedAtIso: nowIso() }, assets);
      scheduleSave();
    },
    [commit, scheduleSave],
  );

  const keepStale = useCallback(() => {
    const set = data.current.set;
    if (set === null) return;
    commit({ ...set, pocAnchor: { ...latest.current.anchor }, updatedAtIso: nowIso() }, data.current.assets);
    // The anchor is now this PoC's: the next render is no longer stale, and the save goes through.
    staleRef.current = false;
    void flush();
  }, [commit, flush]);

  const clearAll = useCallback(async () => {
    await latest.current.io.clear();
    // The event empties the set; done here too in case the store's clear was replaced (tests).
    revokeThumbs(data.current.assets.values());
    removedIds.current = new Set();
    imagesDirty.current = false;
    commit(null, new Map());
  }, [commit, revokeThumbs]);

  const exportPackage = useCallback(async () => {
    const { deps: current, anchor: poc } = latest.current;
    const set = data.current.set ?? emptyPrintSet(current.tenantHost, poc, current.appVersion);
    const masters = new Map([...data.current.assets].map(([id, asset]) => [id, asset.master]));
    return packageZip(withPrints(set, data.current.assets), masters);
  }, []);

  const reload = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    generation.current += 1;
    revokeThumbs(data.current.assets.values());
    removedIds.current = new Set();
    imagesDirty.current = false;
    conflictRef.current = false;
    memoryOnly.current = false;
    setConflict(false);
    setProblem(null);
    setSaveState('idle');
    setLoadOutcome(null);
    commit(null, new Map());
    setLoadToken((token) => token + 1);
  }, [commit, revokeThumbs]);

  const state: PrintStore['state'] =
    loadOutcome === null || !anchorReady ? 'loading' : stale ? 'stale' : loadOutcome === 'forbidden' || loadOutcome === 'error' || memoryOnly.current ? 'memory-only' : 'ready';
  const hidden = state === 'loading' || state === 'stale';
  const exposedSet = useMemo(() => (view.set === null ? null : hidden ? { ...view.set, prints: [] } : view.set), [view.set, hidden]);

  // 3.5.5: a print added by hand before the automatic reading existed (or while it could not run) is read once.
  const unread = hidden
    ? ''
    : [...view.assets.values()]
        .filter((asset) => asset.record.source !== 'companion' && !asset.record.warnings.includes(SCREEN_READ))
        .map((asset) => asset.record.id)
        .join('|');
  useEffect(() => {
    if (unread !== '') queueReads(unread.split('|'));
  }, [unread, queueReads]);

  return {
    state,
    saveState,
    savedAtIso,
    set: exposedSet,
    assets: hidden ? EMPTY_ASSETS : view.assets,
    staleAnchor: stale && view.set !== null ? { ...view.set.pocAnchor } : null,
    conflict,
    problem,
    sizeWarning,
    importZip,
    addManual,
    update,
    approve,
    revoke,
    remove,
    rebind,
    keepStale,
    clearAll,
    exportPackage,
    reload,
    reading,
  };
}

/** The tab's print store: this tenant, this PoC (customer and start date), this app version. */
export function usePrintStore(): PrintStore {
  const { parameters, pocPlan, persistence } = useStudio();
  const { t } = useTranslation();
  const tenantHost = useMemo(() => {
    try {
      return new URL(environmentBase()).host.toLowerCase();
    } catch {
      return '';
    }
  }, []);
  return usePrintStoreWith({
    tenantHost,
    anchor: { customer: parameters.customerName, startDate: pocPlan.startDate },
    anchorReady: persistence.status !== 'loading',
    appVersion: APP_VERSION,
    t,
  });
}
