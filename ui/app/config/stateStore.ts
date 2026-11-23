import {
  isApiGatewayError,
  isAppStateLimitsExceeded,
  isForbidden,
  isNotFound,
  isUserAppStateLimitsExceeded,
  stateClient,
} from '@dynatrace-sdk/client-state';

/**
 * The one door to the platform's App State service.
 *
 * App State is a key-value store kept on the tenant, per app. It survives sessions,
 * devices and app updates, which is what the PoC configuration needs: until 3.2 every
 * setting lived in React state and was lost the moment the app was left.
 *
 *  - `app` states can be read by **every user of the app**: only what the whole PoC team
 *    may see belongs there (customer name, scope, logos, access roster).
 *  - `user` states can be read only by their owner (price table, rates, language).
 *
 * Every outcome is a value, never a thrown error: the callers decide what a missing key,
 * a missing permission or a failure means, and the UI says which one happened.
 */

export type StateScope = 'app' | 'user';

export type ReadOutcome =
  | { kind: 'found'; value: string; modifiedBy: string | null; modifiedAt: string | null }
  | { kind: 'missing' }
  | { kind: 'forbidden'; missingScopes: string[] }
  | { kind: 'failed'; message: string };

export type WriteOutcome =
  | { kind: 'saved'; at: string }
  | { kind: 'forbidden'; missingScopes: string[] }
  | { kind: 'too-large' }
  | { kind: 'failed'; message: string };

export interface StateStore {
  read(scope: StateScope, key: string): Promise<ReadOutcome>;
  write(scope: StateScope, key: string, value: string): Promise<WriteOutcome>;
  remove(scope: StateScope, key: string): Promise<WriteOutcome>;
}

/** The scopes the app asks for in `app.config.json`, named once so the UI can quote them. */
export const STATE_SCOPES: Record<StateScope, { read: string; write: string; delete: string }> = {
  app: {
    read: 'state:app-states:read',
    write: 'state:app-states:write',
    delete: 'state:app-states:delete',
  },
  user: {
    read: 'state:user-app-states:read',
    write: 'state:user-app-states:write',
    delete: 'state:user-app-states:delete',
  },
};

/** What the gateway says is missing when a call is refused; the SDK nests it in the body. */
function missingScopesOf(error: unknown): string[] {
  const details = (error as { body?: { error?: { details?: { missingScopes?: unknown } } } })?.body?.error?.details;
  return Array.isArray(details?.missingScopes) ? details.missingScopes.filter((s): s is string => typeof s === 'string') : [];
}

function isRefused(error: unknown): boolean {
  return isForbidden(error) || (isApiGatewayError(error) && (error as { code?: number }).code === 403);
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message;
  return typeof error === 'string' ? error : 'Unexpected error';
}

const iso = (value: unknown): string | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return typeof value === 'string' ? value : null;
};

/** The real store, backed by `@dynatrace-sdk/client-state`. */
export const sdkStateStore: StateStore = {
  async read(scope, key) {
    try {
      const state =
        scope === 'app'
          ? await stateClient.getAppState({ key })
          : await stateClient.getUserAppState({ key });
      return {
        kind: 'found',
        value: state.value,
        modifiedBy: state.modificationInfo?.lastModifiedBy ?? null,
        modifiedAt: iso(state.modificationInfo?.lastModifiedTime),
      };
    } catch (error) {
      // A key that was never written is the normal first run, not a failure.
      if (isNotFound(error)) return { kind: 'missing' };
      if (isRefused(error)) {
        const missing = missingScopesOf(error);
        return { kind: 'forbidden', missingScopes: missing.length > 0 ? missing : [STATE_SCOPES[scope].read] };
      }
      return { kind: 'failed', message: messageOf(error) };
    }
  },

  async write(scope, key, value) {
    try {
      // No `validUntilTime`: without one the state does not expire, and a PoC outlives 90 days.
      if (scope === 'app') await stateClient.setAppState({ key, body: { value } });
      else await stateClient.setUserAppState({ key, body: { value } });
      return { kind: 'saved', at: new Date().toISOString() };
    } catch (error) {
      if (isAppStateLimitsExceeded(error) || isUserAppStateLimitsExceeded(error)) return { kind: 'too-large' };
      if (isRefused(error)) {
        const missing = missingScopesOf(error);
        return { kind: 'forbidden', missingScopes: missing.length > 0 ? missing : [STATE_SCOPES[scope].write] };
      }
      return { kind: 'failed', message: messageOf(error) };
    }
  },

  async remove(scope, key) {
    try {
      if (scope === 'app') await stateClient.deleteAppState({ key });
      else await stateClient.deleteUserAppState({ key });
      return { kind: 'saved', at: new Date().toISOString() };
    } catch (error) {
      if (isNotFound(error)) return { kind: 'saved', at: new Date().toISOString() };
      if (isRefused(error)) {
        const missing = missingScopesOf(error);
        return { kind: 'forbidden', missingScopes: missing.length > 0 ? missing : [STATE_SCOPES[scope].delete] };
      }
      return { kind: 'failed', message: messageOf(error) };
    }
  },
};

/**
 * An in-memory store with the same semantics, for tests and the offline harness. Values
 * are kept per scope; a `user` and an `app` key never collide.
 */
export function createMemoryStore(initial: Partial<Record<`${StateScope}:${string}`, string>> = {}): StateStore & {
  dump(): Record<string, string>;
  /** Make the next call of a kind fail, to exercise the error paths. */
  failNext(kind: 'read' | 'write', outcome: ReadOutcome | WriteOutcome): void;
} {
  const data = new Map<string, string>(Object.entries(initial) as [string, string][]);
  const meta = new Map<string, { by: string; at: string }>();
  const queued: { read: ReadOutcome[]; write: WriteOutcome[] } = { read: [], write: [] };
  return {
    async read(scope, key) {
      await Promise.resolve();
      const forced = queued.read.shift();
      if (forced !== undefined) return forced;
      const id = `${scope}:${key}`;
      const value = data.get(id);
      if (value === undefined) return { kind: 'missing' };
      const info = meta.get(id);
      return { kind: 'found', value, modifiedBy: info?.by ?? null, modifiedAt: info?.at ?? null };
    },
    async write(scope, key, value) {
      await Promise.resolve();
      const forced = queued.write.shift();
      if (forced !== undefined) return forced;
      const at = new Date().toISOString();
      data.set(`${scope}:${key}`, value);
      meta.set(`${scope}:${key}`, { by: 'memory', at });
      return { kind: 'saved', at };
    },
    async remove(scope, key) {
      await Promise.resolve();
      data.delete(`${scope}:${key}`);
      meta.delete(`${scope}:${key}`);
      return { kind: 'saved', at: new Date().toISOString() };
    },
    dump: () => Object.fromEntries(data),
    failNext(kind, outcome) {
      if (kind === 'read') queued.read.push(outcome as ReadOutcome);
      else queued.write.push(outcome as WriteOutcome);
    },
  };
}
