import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PocParameters } from './StudioContext';
import {
  EMPTY_PRIVATE,
  EMPTY_SHARED,
  ASSESSMENT_HISTORY_KEY,
  ASSESSMENT_PLAN_KEY,
  PRIVATE_KEY,
  SHARED_KEY,
  parsePrivate,
  parseShared,
  privateContent,
  sharedContent,
  type PrivateConfig,
  type SharedConfig,
} from './persistence';
import type { ReadOutcome, StateStore, WriteOutcome } from './stateStore';
import type { PillarId } from '../models/pillars';
import type { PocPlan } from '../models/pocPlan';

/**
 * Keeps the PoC configuration on the tenant.
 *
 * What it guarantees, because losing a customer's setup in front of the customer is the failure
 * this exists to prevent:
 *
 *  1. **Never overwrites what it has not read.** Saving starts only after the stored document
 *     was read successfully (or was confirmed absent). A network error on the first read leaves
 *     autosave off and says so, instead of replacing a good configuration with an empty one.
 *  2. **Saves what changed, not what loaded.** The loaded document is the baseline, so opening
 *     the app writes nothing.
 *  3. **Does not lose a late edit.** Changes are saved 700 ms after the last keystroke, and
 *     immediately when the page is hidden or the app is left (the case that lost settings: save,
 *     then open another Dynatrace app straight away).
 *  4. **Notices a second editor.** Every shared save carries a revision; if the tenant already
 *     holds a newer one from someone else, the app asks instead of silently overwriting it.
 *  5. **Says what happened.** "Saved at 14:32", "saving", "not saved: permission missing", with
 *     the exact scope — never a silent local-only mode.
 */

export type PersistenceStatus =
  /** No store is wired (tests, offline harness): the configuration lives in this session only. */
  | 'off'
  | 'loading'
  | 'saved'
  | 'saving'
  /** The tenant refused: the app works, but nothing is kept. `missingScopes` names why. */
  | 'forbidden'
  /** Reading or writing failed for another reason; `detail` has the message. */
  | 'error'
  /** Someone else saved a newer shared configuration while this one was being edited. */
  | 'conflict';

export interface PersistenceView {
  status: PersistenceStatus;
  /** When the shared configuration was last saved, by anyone. */
  savedAt: string | null;
  /** Who saved it (e-mail), when the platform reported one. */
  savedBy: string | null;
  detail: string | null;
  missingScopes: string[];
  /**
   * Counts the times the configuration was replaced from the tenant (opening, reload, new PoC).
   * A form that keeps a draft keys itself on this, so it shows what was loaded and not what it
   * mounted with while the read was still in flight.
   */
  epoch: number;
  /** Read again from the tenant and replace what is on screen. */
  reload: () => void;
  /** After a conflict: keep this screen's version and save it over the other. */
  overwrite: () => void;
  /** Try the failed read or write again. */
  retry: () => void;
  /** Delete the stored configuration and return to an empty one ("new PoC"). */
  reset: () => Promise<void>;
}

export interface SharedSlice {
  parameters: PocParameters;
  pillars: readonly PillarId[];
  poc: PocPlan;
}

export type PrivateSlice = Omit<PrivateConfig, 'v' | 'savedAt'>;

interface Options {
  store: StateStore | null;
  who: { email: string; name: string };
  shared: SharedSlice;
  priv: PrivateSlice;
  applyShared: (config: SharedSlice) => void;
  applyPrivate: (config: PrivateSlice) => void;
  /** Debounce before a change is written. */
  delayMs?: number | undefined;
}

type Channel = 'shared' | 'private';

export function useTenantPersistence({
  store,
  who,
  shared,
  priv,
  applyShared,
  applyPrivate,
  delayMs = 700,
}: Options): PersistenceView {
  const [status, setStatus] = useState<PersistenceStatus>(store === null ? 'off' : 'loading');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedBy, setSavedBy] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [missingScopes, setMissingScopes] = useState<string[]>([]);
  const [epoch, setEpoch] = useState(0);

  // What the tenant held when last read or written: the baseline "changed" is measured from.
  const baseline = useRef<Record<Channel, string | null>>({ shared: null, private: null });
  const revision = useRef(0);
  const ready = useRef<Record<Channel, boolean>>({ shared: false, private: false });
  const pendingConflict = useRef(false);
  // A save requested while another was in flight, run when that one ends.
  const queued = useRef(false);
  // Why a channel could not be read, kept so a later successful save does not hide it.
  const problem = useRef<ReadOutcome | null>(null);

  const sharedNow = useMemo(() => sharedContent(shared), [shared]);
  const privateNow = useMemo(() => privateContent(priv), [priv]);
  const latest = useRef({ sharedNow, privateNow, shared, priv });
  latest.current = { sharedNow, privateNow, shared, priv };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const fail = useCallback((outcome: ReadOutcome | WriteOutcome) => {
    if (outcome.kind === 'forbidden') {
      setStatus('forbidden');
      setMissingScopes(outcome.missingScopes);
      setDetail(null);
    } else if (outcome.kind === 'too-large') {
      setStatus('error');
      setDetail('too-large');
    } else if (outcome.kind === 'failed') {
      setStatus('error');
      setDetail(outcome.message);
    }
  }, []);

  /** Writes whatever differs from the baseline. Returns false when something was refused. */
  const flush = useCallback(
    async (force = false): Promise<boolean> => {
      if (store === null) return true;
      if (inFlight.current) {
        queued.current = true;
        return true;
      }
      const { sharedNow: sNow, privateNow: pNow, shared: s, priv: p } = latest.current;
      const sharedDirty = ready.current.shared && sNow !== baseline.current.shared;
      const privateDirty = ready.current.private && pNow !== baseline.current.private;
      if (!sharedDirty && !privateDirty && !force) return true;

      inFlight.current = true;
      setStatus('saving');
      try {
        if (sharedDirty || force) {
          // Someone else may have saved since this screen last read: look before writing.
          const current = await store.read('app', SHARED_KEY);
          if (current.kind === 'forbidden' || current.kind === 'failed') {
            fail(current);
            return false;
          }
          const stored = current.kind === 'found' ? parseShared(current.value) : null;
          if (!force && stored !== null && stored.rev > revision.current) {
            pendingConflict.current = true;
            setStatus('conflict');
            setSavedAt(stored.savedAt || null);
            setSavedBy(stored.savedBy);
            return false;
          }
          const nextRev = Math.max(revision.current, stored?.rev ?? 0) + 1;
          const doc: SharedConfig = {
            v: 1,
            rev: nextRev,
            savedAt: new Date().toISOString(),
            savedBy: who.email === '' ? null : who.email,
            parameters: s.parameters,
            pillars: [...s.pillars],
            poc: s.poc,
          };
          const written = await store.write('app', SHARED_KEY, JSON.stringify(doc));
          if (written.kind !== 'saved') {
            fail(written);
            return false;
          }
          revision.current = nextRev;
          baseline.current.shared = sNow;
          pendingConflict.current = false;
          setSavedAt(doc.savedAt);
          setSavedBy(doc.savedBy);
        }
        if (privateDirty || force) {
          const doc: PrivateConfig = { v: 1, savedAt: new Date().toISOString(), ...p };
          const written = await store.write('user', PRIVATE_KEY, JSON.stringify(doc));
          if (written.kind !== 'saved') {
            fail(written);
            return false;
          }
          baseline.current.private = pNow;
        }
        if (problem.current !== null) {
          // A document that could not be read is still not being kept: keep saying so.
          fail(problem.current);
        } else {
          setStatus('saved');
          setMissingScopes([]);
          setDetail(null);
        }
        return true;
      } finally {
        inFlight.current = false;
        if (queued.current) {
          queued.current = false;
          void flush();
        }
      }
    },
    [store, who.email, fail],
  );

  /** Reads both documents and puts them on screen. */
  const hydrate = useCallback(async () => {
    if (store === null) return;
    setStatus('loading');
    pendingConflict.current = false;
    problem.current = null;
    const [sharedRead, privateRead] = await Promise.all([store.read('app', SHARED_KEY), store.read('user', PRIVATE_KEY)]);

    // A refusal or a failure on either read leaves that channel off: nothing may be written
    // over a document that was not seen.
    ready.current = { shared: false, private: false };
    let unread: ReadOutcome | null = null;

    if (sharedRead.kind === 'found') {
      const parsed = parseShared(sharedRead.value);
      if (parsed !== null) {
        applyShared({ parameters: parsed.parameters, pillars: parsed.pillars, poc: parsed.poc });
        baseline.current.shared = sharedContent(parsed);
        revision.current = parsed.rev;
        setSavedAt(parsed.savedAt || sharedRead.modifiedAt);
        setSavedBy(parsed.savedBy ?? sharedRead.modifiedBy);
      } else {
        // Unreadable document: leave it untouched until the user changes something deliberately.
        baseline.current.shared = latest.current.sharedNow;
      }
      ready.current.shared = true;
    } else if (sharedRead.kind === 'missing') {
      baseline.current.shared = latest.current.sharedNow;
      revision.current = 0;
      ready.current.shared = true;
    } else {
      unread = sharedRead;
    }

    if (privateRead.kind === 'found') {
      const parsed = parsePrivate(privateRead.value);
      if (parsed !== null) {
        const { v: _v, savedAt: _savedAt, ...slice } = parsed;
        void _v;
        void _savedAt;
        applyPrivate(slice);
        baseline.current.private = privateContent(slice);
      } else {
        baseline.current.private = latest.current.privateNow;
      }
      ready.current.private = true;
    } else if (privateRead.kind === 'missing') {
      baseline.current.private = latest.current.privateNow;
      ready.current.private = true;
    } else {
      unread ??= privateRead;
    }

    problem.current = unread;
    setEpoch((n) => n + 1);
    if (unread !== null) {
      fail(unread);
      return;
    }
    setMissingScopes([]);
    setDetail(null);
    setStatus('saved');
  }, [store, applyShared, applyPrivate, fail]);

  // Read once on mount.
  useEffect(() => {
    void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // Save what changed, after a pause.
  useEffect(() => {
    if (store === null) return undefined;
    const changed =
      (ready.current.shared && sharedNow !== baseline.current.shared) ||
      (ready.current.private && privateNow !== baseline.current.private);
    if (!changed || pendingConflict.current) return undefined;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delayMs);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [store, sharedNow, privateNow, flush, delayMs]);

  // Save immediately when the page is hidden or the app is left, so a late edit survives.
  useEffect(() => {
    if (store === null) return undefined;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && !pendingConflict.current) void flush();
    };
    const onLeave = () => {
      if (!pendingConflict.current) void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onLeave);
      // Unmounting the provider means the app was left: flush what is pending.
      if (!pendingConflict.current) void flush();
    };
  }, [store, flush]);

  const reset = useCallback(async () => {
    if (store === null) return;
    setStatus('saving');
    // 3.4.2: the Assessment's kept readings belong to this PoC and leave with it; 3.4.6: so does its action plan.
    const outcomes = await Promise.all([
      store.remove('app', SHARED_KEY),
      store.remove('user', PRIVATE_KEY),
      store.remove('app', ASSESSMENT_HISTORY_KEY),
      store.remove('app', ASSESSMENT_PLAN_KEY),
    ]);
    const refused = outcomes.find((outcome) => outcome.kind !== 'saved');
    if (refused !== undefined) {
      fail(refused);
      return;
    }
    revision.current = 0;
    pendingConflict.current = false;
    problem.current = null;
    applyShared(EMPTY_SHARED);
    applyPrivate(EMPTY_PRIVATE);
    setSavedAt(null);
    setSavedBy(null);
    // The empty configuration is now what the tenant holds: nothing to write until something is typed.
    baseline.current.shared = sharedContent(EMPTY_SHARED);
    baseline.current.private = privateContent(EMPTY_PRIVATE);
    ready.current = { shared: true, private: true };
    setEpoch((n) => n + 1);
    setStatus('saved');
    setMissingScopes([]);
    setDetail(null);
  }, [store, applyShared, applyPrivate, fail]);

  return useMemo<PersistenceView>(
    () => ({
      status,
      savedAt,
      savedBy,
      detail,
      missingScopes,
      epoch,
      reload: () => void hydrate(),
      overwrite: () => {
        pendingConflict.current = false;
        void flush(true);
      },
      retry: () => {
        if (!ready.current.shared || !ready.current.private) void hydrate();
        else void flush(true);
      },
      reset,
    }),
    [status, savedAt, savedBy, detail, missingScopes, epoch, hydrate, flush, reset],
  );
}
