import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  type PasswordVerifier,
  ACCESS_KEY,
  DEFAULT_EXPIRY_HOURS,
  EMPTY_ACCESS,
  EXPIRY_CHOICES_HOURS,
  MIN_PASSWORD_LENGTH,
  NO_ATTEMPTS,
  afterFailure,
  attemptsLeft,
  createVerifier,
  currentVerifier,
  isEntryValid,
  isLocked,
  parseAccess,
  partnerKey,
  prune,
  verifyPassword,
  MASTER_PASSWORD_VERSION,
  MASTER_VERIFIER,
  type AccessDocument,
  type AttemptState,
  type PartnerEntry,
} from './access';
import { isDynatraceEmail, readIdentity, type Identity } from './identity';
import type { StateStore } from './stateStore';

/**
 * Who is using the app, and what they may see.
 *
 * See `access.ts` for what this gate is and is not. In short: Dynatrace e-mail → SE; another
 * e-mail that entered the PoC password → partner; anyone else → customer, who sees the
 * executive view only.
 *
 * **Commercial data** (licensing, DPS and cost) is part of the SE's and the partner's working
 * view (3.2.6): the access levels already keep it from a customer, so the per-session switch
 * that hid it is gone. What keeps it off a shared screen is the presentation mode — "Executive
 * mode" narrows it away for the whole app (`App.tsx`, `CommercialScope`) — and the SE Report's
 * export profile, which starts on Customer. A customer never sees it, in any mode.
 */

export type AccessLevel = 'loading' | 'se' | 'partner' | 'customer';

/**
 * 3.3.1: `no-password` is its own answer. A PoC whose SE has not set a password lets nobody in,
 * and saying "wrong password" to a partner who typed nothing wrong would send them hunting for a
 * secret that does not exist — the gate names the real state instead.
 */
export type UnlockResult = 'ok' | 'wrong' | 'locked' | 'unavailable' | 'no-password';

export interface AccessValue {
  level: AccessLevel;
  identity: Identity;
  /** SE or partner: may use the working tools (Settings, reports, technical pages). */
  canWork: boolean;
  /** Only a Dynatrace SE manages the partner password and the roster. */
  canManageAccess: boolean;
  /** A customer who chose "continue in read-only mode". */
  restrictedView: boolean;
  enterRestrictedView: () => void;
  leaveRestrictedView: () => void;
  /**
   * Licensing, DPS and cost material is shown: always for an SE or partner, never for a
   * customer; a `CommercialScope` (executive mode, the export profile) can only take it away.
   */
  commercialVisible: boolean;
  // ---- the partner login
  unlock: (password: string) => Promise<UnlockResult>;
  lock: () => Promise<void>;
  attemptsLeft: number;
  /** Seconds until another attempt is accepted; 0 when not locked out. */
  lockedForSeconds: number;
  /** True when the partner roster is kept on the tenant; false when this entry is session-only. */
  rosterAvailable: boolean;
  // ---- SE management
  roster: PartnerEntry[];
  expiryHours: number;
  passwordIsCustom: boolean;
  passwordSetAt: string | null;
  passwordSetBy: string | null;
  setExpiryHours: (hours: number) => Promise<void>;
  setPassword: (password: string) => Promise<'ok' | 'too-short' | 'unavailable'>;
  revoke: (email: string) => Promise<void>;
  revokeAll: () => Promise<void>;
}

/**
 * What a surface sees when no provider is mounted — **closed** since 3.3.0 (backlog S11).
 *
 * Until 3.2.7 this was `OPEN`: `level: 'se'`, `canWork: true`, `commercialVisible: true`. That is
 * the wrong default for a value that decides whether licensing, DPS and price are on screen,
 * because the failure is silent and in the generous direction: a widget, a portal, an export
 * surface or a new route mounted outside `AccessProvider` would render commercial figures to
 * whoever opened it, and nothing in the app would say so.
 *
 * Closed means `loading`: not "refused" (which would accuse the viewer) but "the session has not
 * said yet". Pages already draw their waiting state for `loading`, and `Gate` renders the page
 * fallback, so the same path covers a provider that is still reading the roster.
 *
 * Tests that need a working SE wrap the subject in `AccessProvider` (or in `OpenAccess`, below).
 */
const CLOSED: AccessValue = {
  level: 'loading',
  identity: { id: '', name: '', email: '', known: false },
  canWork: false,
  canManageAccess: false,
  restrictedView: false,
  enterRestrictedView: () => undefined,
  leaveRestrictedView: () => undefined,
  commercialVisible: false,
  unlock: () => Promise.resolve('ok'),
  lock: () => Promise.resolve(),
  attemptsLeft: 5,
  lockedForSeconds: 0,
  rosterAvailable: false,
  roster: [],
  expiryHours: DEFAULT_EXPIRY_HOURS,
  passwordIsCustom: false,
  passwordSetAt: null,
  passwordSetBy: null,
  setExpiryHours: () => Promise.resolve(),
  setPassword: () => Promise.resolve('ok'),
  revoke: () => Promise.resolve(),
  revokeAll: () => Promise.resolve(),
};

const AccessContext = createContext<AccessValue | null>(null);

const ATTEMPTS_KEY = 'pvs.access.attempts';
const SESSION_KEY = 'pvs.access.session';

function readJson<T>(key: string): T | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(key);
    return raw === null || raw === undefined ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) globalThis.sessionStorage?.removeItem(key);
    else globalThis.sessionStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* session storage may be blocked; the gate then simply does not remember */
  }
}

/** A partner's unlock for this browser tab: it survives navigation inside the platform. */
interface SessionUnlock {
  email: string;
  expiresAt: string;
  /** The password version it was let in under; a newer password ends it. */
  passwordVersion: number;
}

export interface AccessProviderProps {
  children: React.ReactNode;
  store?: StateStore | null;
  /** Overrides who is signed in (tests). */
  identity?: Identity;
  /** The wall clock (tests). */
  now?: () => number;
  /**
   * A verifier to stand in for the SE's, **for tests only**. Production passes nothing: since
   * 3.3.1 a PoC with no password of its own lets no partner in (backlog S2).
   */
  builtInVerifier?: PasswordVerifier | null;
  /** 3.7.7: the master password's verifier (production: `MASTER_VERIFIER`; tests may pass their own or null). */
  masterVerifier?: PasswordVerifier | null;
}

export const AccessProvider = ({
  children,
  store = null,
  identity: given,
  now = Date.now,
  builtInVerifier = null,
  masterVerifier = MASTER_VERIFIER,
}: AccessProviderProps) => {
  const identity = useMemo(() => given ?? readIdentity(), [given]);
  const isSe = identity.known && isDynatraceEmail(identity.email);

  const [doc, setDoc] = useState<AccessDocument>(EMPTY_ACCESS);
  const [rosterAvailable, setRosterAvailable] = useState(false);
  const [loaded, setLoaded] = useState(isSe && store === null);
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
  const [restrictedView, setRestrictedView] = useState(false);
  const [attempts, setAttempts] = useState<AttemptState>(() => readJson<AttemptState>(ATTEMPTS_KEY) ?? NO_ATTEMPTS);
  const [tick, setTick] = useState(() => now());
  const nowRef = useRef(now);
  nowRef.current = now;

  /** Reads the roster; a missing document is a PoC that still uses the built-in password. */
  const load = useCallback(async (): Promise<AccessDocument | null> => {
    if (store === null) return null;
    const read = await store.read('app', ACCESS_KEY);
    if (read.kind === 'missing') return EMPTY_ACCESS;
    if (read.kind === 'found') return parseAccess(read.value) ?? EMPTY_ACCESS;
    return null;
  }, [store]);

  /** Writes the roster, merging with what is on the tenant now so two people do not clobber each other. */
  const save = useCallback(
    async (change: (current: AccessDocument) => AccessDocument): Promise<AccessDocument | null> => {
      if (store === null) return null;
      const current = (await load()) ?? EMPTY_ACCESS;
      const next = prune({ ...change(current), v: 1, rev: current.rev + 1 }, nowRef.current());
      const written = await store.write('app', ACCESS_KEY, JSON.stringify(next));
      if (written.kind !== 'saved') return null;
      setDoc(next);
      return next;
    },
    [store, load],
  );

  // First read: who is in?
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const current = await load();
      if (cancelled) return;
      setRosterAvailable(current !== null);
      const effective = current ?? EMPTY_ACCESS;
      setDoc(effective);
      const mine = identity.known ? effective.partners[partnerKey(identity.email)] : undefined;
      if (!isSe) {
        if (isEntryValid(mine, effective, nowRef.current()) && mine !== undefined) {
          setUnlockedUntil(Date.parse(mine.expiresAt));
        } else {
          // No roster entry (or no roster): a session-only unlock still counts while it is valid.
          const session = readJson<SessionUnlock>(SESSION_KEY);
          const sameUser = session !== null && session.email === identity.email;
          // When the roster could be read, a password changed since then ends the session unlock too.
          // 3.3.1: with no password in force there is no version to match, so a stored session
          // unlock cannot be honoured either.
          const inForce = currentVerifier(effective, builtInVerifier);
          const sameVersion =
            session !== null &&
            (current === null ||
              session.passwordVersion === MASTER_PASSWORD_VERSION ||
              (inForce !== null && session.passwordVersion === inForce.version));
          if (session !== null && sameUser && sameVersion && Date.parse(session.expiresAt) > nowRef.current()) {
            setUnlockedUntil(Date.parse(session.expiresAt));
          }
        }
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, identity, isSe, builtInVerifier]);

  // The unlock ends by itself at its expiry: wake once, at that moment (a standing one-second
  // timer would re-render the whole app every second).
  useEffect(() => {
    if (unlockedUntil === null) return undefined;
    const wait = Math.min(Math.max(unlockedUntil - nowRef.current() + 50, 0), 2_000_000_000);
    const timeout = setTimeout(() => setTick(nowRef.current()), wait);
    return () => clearTimeout(timeout);
  }, [unlockedUntil]);

  // While locked out, count the seconds down; stop as soon as the wait is over.
  useEffect(() => {
    if (!isLocked(attempts, nowRef.current())) return undefined;
    setTick(nowRef.current());
    const interval = setInterval(() => {
      const at = nowRef.current();
      setTick(at);
      if (!isLocked(attempts, at)) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [attempts]);

  const level: AccessLevel = !loaded
    ? 'loading'
    : isSe
      ? 'se'
      : unlockedUntil !== null && unlockedUntil > tick
        ? 'partner'
        : 'customer';

  // Leaving the working levels (an expiry, a lock) puts commercial data away with them.
  const canWork = level === 'se' || level === 'partner';

  const unlock = useCallback(
    async (password: string): Promise<UnlockResult> => {
      const at = nowRef.current();
      if (isLocked(attempts, at)) return 'locked';
      const current = await load();
      // Without the roster the password in force is unknown (the SE may have changed it): refuse
      // rather than guess with the built-in one.
      if (current === null && store !== null) return 'unavailable';
      const effective = current ?? EMPTY_ACCESS;
      const inForce = currentVerifier(effective, builtInVerifier);
      // 3.3.1 (S2): no password set for this PoC and no master password — there is nothing to check against, and this is
      // not a failed attempt, so it never counts towards the throttle. 3.7.7: the master password opens any PoC.
      if (inForce === null && masterVerifier === null) return 'no-password';
      let verifier: PasswordVerifier | null = null;
      try {
        if (inForce !== null && (await verifyPassword(password, inForce))) verifier = inForce;
        else if (masterVerifier !== null && (await verifyPassword(password, masterVerifier))) verifier = masterVerifier;
      } catch {
        return 'unavailable';
      }
      if (verifier === null) {
        const next = afterFailure(attempts, at);
        setAttempts(next);
        writeJson(ATTEMPTS_KEY, next);
        return isLocked(next, at) ? 'locked' : 'wrong';
      }
      setAttempts(NO_ATTEMPTS);
      writeJson(ATTEMPTS_KEY, null);
      const expiresAt = new Date(at + effective.expiryHours * 3600 * 1000).toISOString();
      const entry: PartnerEntry = {
        email: identity.email,
        name: identity.name,
        unlockedAt: new Date(at).toISOString(),
        expiresAt,
        passwordVersion: verifier.version,
      };
      if (identity.known && store !== null) {
        const saved = await save((doc0) => ({ ...doc0, partners: { ...doc0.partners, [partnerKey(identity.email)]: entry } }));
        setRosterAvailable(saved !== null);
      }
      // Always keep a session record too: it covers a roster that could not be written.
      writeJson(SESSION_KEY, {
        email: identity.email,
        expiresAt,
        passwordVersion: verifier.version,
      } satisfies SessionUnlock);
      setUnlockedUntil(Date.parse(expiresAt));
      return 'ok';
    },
    [attempts, load, save, identity, store, builtInVerifier, masterVerifier],
  );

  const lock = useCallback(async () => {
    setUnlockedUntil(null);
    setRestrictedView(false);
    writeJson(SESSION_KEY, null);
    if (identity.known && store !== null) {
      await save((current) => {
        const partners = { ...current.partners };
        delete partners[partnerKey(identity.email)];
        return { ...current, partners };
      });
    }
  }, [identity, store, save]);

  const setExpiryHours = useCallback(
    async (hours: number) => {
      if (!EXPIRY_CHOICES_HOURS.includes(hours)) return;
      await save((current) => ({ ...current, expiryHours: hours }));
    },
    [save],
  );

  const setPassword = useCallback(
    async (password: string): Promise<'ok' | 'too-short' | 'unavailable'> => {
      if (password.trim().length < MIN_PASSWORD_LENGTH) return 'too-short';
      if (store === null) return 'unavailable';
      const current = (await load()) ?? EMPTY_ACCESS;
      // `createVerifier` raises the version itself, so this is the one in force (0 when a PoC has
      // none yet, which makes the SE's first password version 1).
      const verifier = await createVerifier(password.trim(), currentVerifier(current, builtInVerifier)?.version ?? 0, identity.email || null);
      // The new version leaves every partner already let in under the old password outside.
      const next = await save((c) => ({ ...c, password: verifier, partners: {} }));
      return next === null ? 'unavailable' : 'ok';
    },
    [store, load, save, identity.email, builtInVerifier],
  );

  const revoke = useCallback(
    async (email: string) => {
      await save((current) => {
        const partners = { ...current.partners };
        delete partners[partnerKey(email)];
        return { ...current, partners };
      });
    },
    [save],
  );

  const revokeAll = useCallback(async () => {
    await save((current) => ({ ...current, partners: {} }));
  }, [save]);

  const lockedForSeconds = isLocked(attempts, tick) ? Math.max(1, Math.ceil((attempts.lockedUntil - tick) / 1000)) : 0;

  const value = useMemo<AccessValue>(
    () => ({
      level,
      identity,
      canWork,
      canManageAccess: level === 'se',
      restrictedView,
      enterRestrictedView: () => setRestrictedView(true),
      leaveRestrictedView: () => setRestrictedView(false),
      commercialVisible: canWork,
      unlock,
      lock,
      attemptsLeft: attemptsLeft(attempts),
      lockedForSeconds,
      rosterAvailable,
      roster: Object.values(prune(doc, nowRef.current()).partners).sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt)),
      expiryHours: doc.expiryHours,
      passwordIsCustom: doc.password !== null,
      passwordSetAt: doc.password?.setAt ?? null,
      passwordSetBy: doc.password?.setBy ?? null,
      setExpiryHours,
      setPassword,
      revoke,
      revokeAll,
    }),
    [
      level,
      identity,
      canWork,
      restrictedView,
      unlock,
      lock,
      attempts,
      lockedForSeconds,
      rosterAvailable,
      doc,
      setExpiryHours,
      setPassword,
      revoke,
      revokeAll,
    ],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

export function useAccess(): AccessValue {
  return useContext(AccessContext) ?? CLOSED;
}

/**
 * The open value, for a subject rendered without the real provider (tests, the visual harness and
 * the deck's offline renderers, which have no session to read).
 *
 * It exists so that `useAccess()` itself can be closed by default: anything that genuinely needs
 * a working SE now says so in one visible line, instead of inheriting it from a missing provider.
 * It grants exactly what an SE has, and nothing a provider could not grant.
 */
export const OpenAccess = ({ children }: { children: React.ReactNode }) => {
  const value = useMemo<AccessValue>(() => ({ ...CLOSED, level: 'se', canWork: true, canManageAccess: true, commercialVisible: true }), []);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

/**
 * Narrows "Commercial data" for a subtree (3.2.4): the SE Report's export profile and, since
 * 3.2.6, executive mode (`App.tsx`). Under it every `SeOnly` block, priced figure and licence
 * line below is cut; outside it the subtree keeps what the access level allows. It can only take
 * away — a subtree never sees more than the session allows.
 */
export const CommercialScope = ({ allow, children }: { allow: boolean; children: React.ReactNode }) => {
  const parent = useAccess();
  const value = useMemo<AccessValue>(() => ({ ...parent, commercialVisible: parent.commercialVisible && allow }), [parent, allow]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};
