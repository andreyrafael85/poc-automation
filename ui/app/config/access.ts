/**
 * Who may use the app, and how a partner gets in.
 *
 * ## What this is, and what it is not
 *
 * The app is for Dynatrace Sales Engineers and the partners who run a PoC with them. It holds
 * commercial material (licence sizing, DPS rates) that a customer must not see. This is a
 * **presentation gate**: it keeps the app from being shown, by accident or by curiosity, to
 * someone it was not meant for. It is not data security — the browser enforces it, so it can be
 * defeated by someone who tampers with their own browser — and what a person can query on the
 * tenant is still decided by their IAM permissions.
 *
 * ## Levels
 *
 *  - **se**: the signed-in e-mail is in the Dynatrace corporate domain (`SE_EMAIL_DOMAIN` in `identity.ts`; the platform supplies it; the user does not type it).
 *  - **partner**: any other e-mail that entered the PoC access password and is still inside its validity.
 *  - **customer**: everyone else. Sees the executive view only.
 *
 * ## The partner password
 *
 * Never kept in clear. Only a PBKDF2-SHA256 verifier (random salt, 120,000 rounds) is stored, and
 * the comparison is constant-time. Out of the box the verifier is the built-in one below; an SE
 * can set a password of their own for a PoC, which replaces it, and changing it invalidates every
 * partner already let in. Failed attempts are throttled (see `nextLockout`). A password written
 * into a browser app can be found by someone determined; the verifier, the throttle and the
 * per-PoC rotation make that a deliberate act and not a casual one.
 */

export const PASSWORD_ITERATIONS = 120_000;

/**
 * 3.3.1 (backlog S2/D-11): there is **no built-in password any more**.
 *
 * Until 3.3.0 a PoC started with a verifier shipped in the bundle, so every tenant whose SE had
 * not set a password of their own shared one secret — and that secret travelled in the app's
 * JavaScript to anyone who opened the page. A PoC with no password now simply lets no partner in;
 * the SE sets one in Settings, and only then does the gate have anything to check against.
 *
 * `builtIn` survives as an argument so tests can supply a verifier of their own; production passes
 * nothing, and `currentVerifier` returns `null`.
 */

/**
 * 3.7.7 (the owner, 2026-11-23: "vamos retornar uma senha mestre para abertura do App por parceiros … existem parceiros que
 * já conseguirão fazer o deploy sozinhos do app e … o SE pode não ter acesso à tenant"): a master password a partner can open
 * the app with on any PoC, beside the password an SE sets. Only its PBKDF2-SHA256 verifier is here (a random salt, 600,000
 * rounds) — never the password, in the code, the repository, the docs, the tests or an environment file. A partner let in by
 * it keeps the PoC's expiry and is not dropped when the SE changes the PoC's own password; the SE can still remove them.
 * As this file's header says, a verifier in a browser app can be attacked offline by someone who copies the code: the
 * throttle and the long derivation slow that down, and rotating the master password with a release is the way to retire it.
 */
export const MASTER_PASSWORD_VERSION = -1;

export const MASTER_PASSWORD_ITERATIONS = 600_000;

// A salt and a derived key, not a secret: the password cannot be read back from them.
// This repository carries a PLACEHOLDER verifier (a made-up salt and hash of the same shape), not the
// verifier the deployed app ships, so no password opens the app through it here. Replace it with a PBKDF2-SHA256
// verifier of your own (a random 16-byte salt, MASTER_PASSWORD_ITERATIONS rounds) before deploying.
const MASTER_SALT = 'deadbeefdeadbeefdeadbeefdeadbeef';
const MASTER_HASH = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

export interface PasswordVerifier {
  salt: string;
  iterations: number;
  /** Hex of the 32-byte PBKDF2-SHA256 output. */
  hash: string;
  /** Raised each time the SE sets a new password; partners let in under an older one are out. */
  version: number;
  setBy: string | null;
  setAt: string | null;
}

/** The master password's verifier (3.7.7). */
export const MASTER_VERIFIER: PasswordVerifier = {
  salt: MASTER_SALT,
  iterations: MASTER_PASSWORD_ITERATIONS,
  hash: MASTER_HASH,
  version: MASTER_PASSWORD_VERSION,
  setBy: null,
  setAt: null,
};

export interface PartnerEntry {
  email: string;
  name: string;
  unlockedAt: string;
  expiresAt: string;
  /** The password version this entry was let in under. */
  passwordVersion: number;
}

export interface AccessDocument {
  v: 1;
  rev: number;
  /** `null` while the PoC still uses the built-in password. */
  password: PasswordVerifier | null;
  /** How long a partner stays in after entering the password. */
  expiryHours: number;
  partners: Record<string, PartnerEntry>;
}

/**
 * How long a partner stays in, in days (3.3.3, owner's 3.3.2 validation: "5/15/30/60/90 dias, tirar
 * os de horas"). Stored in hours, as since 3.2.0, so a saved document keeps its shape; a stored value
 * that is no longer a choice (the old 4/12/24/72/168 h) reads as the default. Partners already let in
 * keep the expiry they were given.
 */
export const EXPIRY_CHOICES_DAYS: readonly number[] = [5, 15, 30, 60, 90];
export const EXPIRY_CHOICES_HOURS: readonly number[] = EXPIRY_CHOICES_DAYS.map((days) => days * 24);
export const DEFAULT_EXPIRY_HOURS = 15 * 24;

export const EMPTY_ACCESS: AccessDocument = {
  v: 1,
  rev: 0,
  password: null,
  expiryHours: DEFAULT_EXPIRY_HOURS,
  partners: {},
};

export const ACCESS_KEY = 'pvs.access.v1';

// ------------------------------------------------------------------------ hashing

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** PBKDF2-SHA256 through the browser's own crypto. */
export async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new Error('This browser has no Web Crypto, so the password cannot be checked.');
  const key = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/** Compares two hex strings without stopping at the first difference. */
export function constantTimeEqual(a: string, b: string): boolean {
  const x = fromHex(a);
  const y = fromHex(b);
  let diff = x.length ^ y.length;
  const length = Math.max(x.length, y.length);
  for (let i = 0; i < length; i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function verifyPassword(password: string, verifier: PasswordVerifier): Promise<boolean> {
  const candidate = await derive(password, verifier.salt, verifier.iterations);
  return constantTimeEqual(candidate, verifier.hash);
}

/** A verifier for a password the SE just chose, with a fresh random salt. */
export async function createVerifier(password: string, previousVersion: number, setBy: string | null): Promise<PasswordVerifier> {
  const random = new Uint8Array(16);
  globalThis.crypto.getRandomValues(random);
  const salt = toHex(random);
  return {
    salt,
    iterations: PASSWORD_ITERATIONS,
    hash: await derive(password, salt, PASSWORD_ITERATIONS),
    version: previousVersion + 1,
    setBy,
    setAt: new Date().toISOString(),
  };
}

/** A readable password to suggest: `dyna-` plus eight characters with no look-alikes. */
export function suggestPassword(): string {
  // A character set, not a secret.
  // eslint-disable-next-line noSecrets/no-secrets
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const random = new Uint8Array(8);
  globalThis.crypto.getRandomValues(random);
  return `dyna-${[...random].map((byte) => alphabet[byte % alphabet.length]).join('')}`;
}

export const MIN_PASSWORD_LENGTH = 8;

// ------------------------------------------------------------------------ roster

/** The key of a partner in the roster: the lower-cased e-mail. */
export const partnerKey = (email: string): string => email.trim().toLowerCase();

/** The verifier in force: the SE's own, or whatever a test supplied. `null` means no way in. */
export const currentVerifier = (doc: AccessDocument, builtIn: PasswordVerifier | null = null): PasswordVerifier | null =>
  doc.password ?? builtIn;

/** Whether this PoC has no password at all, so no partner can be let in until the SE sets one. */
export const hasNoPassword = (doc: AccessDocument): boolean => doc.password === null;

/** Whether a roster entry still lets its person in. */
export function isEntryValid(entry: PartnerEntry | undefined, doc: AccessDocument, now: number): boolean {
  if (entry === undefined) return false;
  // 3.7.7: an entry let in by the master password outlives a change of the PoC's own password; only its expiry ends it.
  if (entry.passwordVersion === MASTER_PASSWORD_VERSION) {
    const until = Date.parse(entry.expiresAt);
    return Number.isFinite(until) && until > now;
  }
  // No password in force: nothing a roster entry was granted under is still valid.
  const verifier = currentVerifier(doc);
  if (verifier === null || entry.passwordVersion !== verifier.version) return false;
  const expires = Date.parse(entry.expiresAt);
  return Number.isFinite(expires) && expires > now;
}

/** The roster with expired or superseded entries removed, so it does not grow without end. */
export function prune(doc: AccessDocument, now: number): AccessDocument {
  const partners: Record<string, PartnerEntry> = {};
  for (const [key, entry] of Object.entries(doc.partners)) {
    if (isEntryValid(entry, doc, now)) partners[key] = entry;
  }
  return { ...doc, partners };
}

export function parseAccess(raw: string): AccessDocument | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const doc = parsed as Record<string, unknown>;
    if (doc['v'] !== 1) return null;
    const pw = doc['password'];
    let password: PasswordVerifier | null = null;
    if (typeof pw === 'object' && pw !== null) {
      const p = pw as Record<string, unknown>;
      if (
        typeof p['salt'] === 'string' &&
        typeof p['hash'] === 'string' &&
        /^[0-9a-f]{64}$/.test(p['hash']) &&
        typeof p['iterations'] === 'number' &&
        typeof p['version'] === 'number'
      ) {
        password = {
          salt: p['salt'],
          hash: p['hash'],
          iterations: p['iterations'],
          version: p['version'],
          setBy: typeof p['setBy'] === 'string' ? p['setBy'] : null,
          setAt: typeof p['setAt'] === 'string' ? p['setAt'] : null,
        };
      }
    }
    const partners: Record<string, PartnerEntry> = {};
    const rawPartners = doc['partners'];
    if (typeof rawPartners === 'object' && rawPartners !== null) {
      for (const [key, value] of Object.entries(rawPartners as Record<string, unknown>)) {
        if (typeof value !== 'object' || value === null) continue;
        const e = value as Record<string, unknown>;
        if (typeof e['email'] !== 'string' || typeof e['expiresAt'] !== 'string' || typeof e['passwordVersion'] !== 'number') continue;
        partners[key] = {
          email: e['email'],
          name: typeof e['name'] === 'string' ? e['name'] : '',
          unlockedAt: typeof e['unlockedAt'] === 'string' ? e['unlockedAt'] : '',
          expiresAt: e['expiresAt'],
          passwordVersion: e['passwordVersion'],
        };
      }
    }
    const expiry = doc['expiryHours'];
    return {
      v: 1,
      rev: typeof doc['rev'] === 'number' ? doc['rev'] : 0,
      password,
      expiryHours:
        typeof expiry === 'number' && EXPIRY_CHOICES_HOURS.includes(expiry) ? expiry : DEFAULT_EXPIRY_HOURS,
      partners,
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------ throttle

export const FREE_ATTEMPTS = 5;
/** Waits after the 5th, 10th and every further block of failures. */
export const LOCKOUT_SECONDS: readonly number[] = [30, 120, 600];

export interface AttemptState {
  failures: number;
  /** Epoch ms until which no attempt is accepted. */
  lockedUntil: number;
  /** How many lockouts this session has had, which sets the next wait. */
  lockouts: number;
}

export const NO_ATTEMPTS: AttemptState = { failures: 0, lockedUntil: 0, lockouts: 0 };

export const isLocked = (state: AttemptState, now: number): boolean => state.lockedUntil > now;

export const attemptsLeft = (state: AttemptState): number => Math.max(0, FREE_ATTEMPTS - state.failures);

/** The state after one more wrong password. */
export function afterFailure(state: AttemptState, now: number): AttemptState {
  const failures = state.failures + 1;
  if (failures < FREE_ATTEMPTS) return { ...state, failures };
  const wait = LOCKOUT_SECONDS[Math.min(state.lockouts, LOCKOUT_SECONDS.length - 1)] as number;
  return { failures: 0, lockedUntil: now + wait * 1000, lockouts: state.lockouts + 1 };
}
