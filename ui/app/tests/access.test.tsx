import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { App } from '../App';
import { AccessGate } from '../components/AccessGate';
import { AccessProvider, useAccess } from '../config/AccessContext';
import {
  ACCESS_KEY,
  EMPTY_ACCESS,
  FREE_ATTEMPTS,
  NO_ATTEMPTS,
  afterFailure,
  constantTimeEqual,
  createVerifier,
  currentVerifier,
  derive,
  hasNoPassword,
  isEntryValid,
  isLocked,
  prune,
  verifyPassword,
  type AccessDocument,
} from '../config/access';
import type { PasswordVerifier } from '../config/access';
import { DYNATRACE_DOMAIN, type Identity } from '../config/identity';
import { RESTRICTED_ROUTES, SE_ONLY_ROUTES, isRouteBlocked, isRouteVisible, storyRoutes } from '../config/navigation';
import { StudioProvider } from '../config/StudioContext';
import { createMemoryStore } from '../config/stateStore';

/** A password that exists only in this test file; the owner's real one never enters the repository. */
const TEST_PASSWORD = 'test-partner-pass-1';
let TEST_VERIFIER: PasswordVerifier;
beforeAll(async () => {
  // 3.3.1 (S2): version 1 — the SE's first password. There is no built-in verifier any more, and
  // version 0 now means "this PoC has no password", under which nobody is let in at all.
  TEST_VERIFIER = await createVerifier(TEST_PASSWORD, 0, null);
});


// A partner who got in stays in for the tab's session; each test starts from a fresh tab.
beforeEach(() => {
  globalThis.sessionStorage.clear();
});

/**
 * Who may use the app. This is a presentation gate (see `config/access.ts`): these tests pin what
 * it promises — the SE domain, the partner password and its throttle, the expiry, and that the
 * commercial pages are out of sight until an SE or partner asks for them.
 */

const SE: Identity = { id: 'u1', name: 'Sam Engineer', email: `sam${DYNATRACE_DOMAIN}`, known: true };
const PARTNER: Identity = { id: 'u2', name: 'Pat Partner', email: 'pat@partner.example', known: true };
const LOOKALIKE: Identity = { id: 'u3', name: 'Eve', email: 'eve@notdynatrace.com', known: true };
const UNKNOWN: Identity = { id: '', name: '', email: '', known: false };

type Access = ReturnType<typeof useAccess>;

/**
 * 3.3.1 (S2): the PoC is seeded with the SE's password, because that is the only way a partner can
 * be let in now. `builtInVerifier` is no longer used here — it would make an incoherent world, in
 * which `unlock` succeeds against a verifier that the roster (which only ever reads the document)
 * cannot see, so the entry it writes is pruned the moment it is written.
 */
function seeded(store = createMemoryStore(), password: PasswordVerifier = TEST_VERIFIER) {
  void store.write('app', ACCESS_KEY, JSON.stringify({ ...EMPTY_ACCESS, password }));
  return store;
}

function mount(identity: Identity, store = seeded(), clock = { t: Date.parse('2026-10-04T12:00:00Z') }) {
  const ref: { current: Access | null } = { current: null };
  const Probe = () => {
    ref.current = useAccess();
    return null;
  };
  const view = render(
    <AccessProvider store={store} identity={identity} now={() => clock.t}>
      <Probe />
    </AccessProvider>,
  );
  return { ref, access: () => ref.current as Access, store, clock, ...view };
}

describe('the partner password', () => {
  it('is checked against a salted PBKDF2 verifier, never stored in clear', async () => {
    expect(await verifyPassword(TEST_PASSWORD, TEST_VERIFIER)).toBe(true);
    expect(await verifyPassword(`${TEST_PASSWORD}x`, TEST_VERIFIER)).toBe(false);
    expect(await verifyPassword('', TEST_VERIFIER)).toBe(false);
    expect(JSON.stringify(TEST_VERIFIER)).not.toContain(TEST_PASSWORD);
  });

  /**
   * 3.3.1 (backlog S2): the app no longer ships a password. Until 3.3.0 a verifier travelled in
   * the bundle and every tenant whose SE had not set one shared that secret. Nothing in the
   * delivered source may hold one again.
   */
  it('ships no built-in verifier, in the module or anywhere in the config', async () => {
    const access = await import('../config/access');
    expect(Object.keys(access)).not.toContain('DEFAULT_VERIFIER');
    const source = readFileSync(join(process.cwd(), 'ui/app/config/access.ts'), 'utf8');
    // A 64-hex literal in this file is a shipped hash: only the master verifier of 3.7.7 (the owner's order) may be one.
    const hashes = source.match(/['"`][0-9a-f]{64}['"`]/g) ?? [];
    expect(hashes, 'only the master verifier may be shipped').toHaveLength(1);
    expect(source).toMatch(/const MASTER_HASH = ['"`][0-9a-f]{64}['"`];/);
    expect(access.MASTER_VERIFIER.iterations).toBeGreaterThanOrEqual(600_000);
  });

  it('lets nobody in while the PoC has no password of its own', () => {
    expect(currentVerifier({ ...EMPTY_ACCESS })).toBeNull();
    expect(hasNoPassword({ ...EMPTY_ACCESS })).toBe(true);
    expect(hasNoPassword({ ...EMPTY_ACCESS, password: TEST_VERIFIER })).toBe(false);
  });

  it('compares without stopping at the first difference, and refuses a different length', () => {
    expect(constantTimeEqual('aabb', 'aabb')).toBe(true);
    expect(constantTimeEqual('aabb', 'aabc')).toBe(false);
    expect(constantTimeEqual('aabb', 'aabbcc')).toBe(false);
  });

  it('gives each new password its own salt and raises the version', async () => {
    const first = await createVerifier('dyna-abc23456', 0, `sam${DYNATRACE_DOMAIN}`);
    const second = await createVerifier('dyna-abc23456', first.version, `sam${DYNATRACE_DOMAIN}`);
    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(await derive('dyna-abc23456', first.salt, first.iterations)).toBe(first.hash);
  });
});

describe('throttling', () => {
  it('allows five wrong passwords, then makes the wait longer each time', () => {
    let state = NO_ATTEMPTS;
    const waits: number[] = [];
    let now = 1_000_000;
    for (let block = 0; block < 4; block += 1) {
      for (let attempt = 0; attempt < FREE_ATTEMPTS; attempt += 1) state = afterFailure(state, now);
      expect(isLocked(state, now)).toBe(true);
      waits.push((state.lockedUntil - now) / 1000);
      now = state.lockedUntil + 1;
    }
    expect(waits).toEqual([30, 120, 600, 600]);
  });
});

describe('the roster', () => {
  /**
   * 3.3.1 (S2): a PoC has a password or it has nobody in it. Version 0 used to mean "the built-in
   * password is in force"; it now means "no password", under which no roster entry is valid, so
   * these fixtures carry the SE's own password at version 1.
   */
  const doc = (partners: AccessDocument['partners'], version = 1): AccessDocument => ({
    ...EMPTY_ACCESS,
    password: { ...TEST_VERIFIER, version },
    partners,
  });
  const entry = (expiresAt: string, passwordVersion = 1) => ({
    email: 'pat@partner.example',
    name: 'Pat',
    unlockedAt: '2026-10-04T08:00:00Z',
    expiresAt,
    passwordVersion,
  });
  const now = Date.parse('2026-10-04T12:00:00Z');

  it('lets a partner in until the expiry', () => {
    expect(isEntryValid(entry('2026-10-04T13:00:00Z'), doc({}), now)).toBe(true);
    expect(isEntryValid(entry('2026-10-04T11:59:59Z'), doc({}), now)).toBe(false);
  });

  it('puts a partner out when the SE changes the password', () => {
    expect(isEntryValid(entry('2026-10-04T13:00:00Z', 0), doc({}, 1), now)).toBe(false);
  });

  it('drops expired and superseded entries so the roster does not grow forever', () => {
    const pruned = prune(
      doc({ a: entry('2026-10-04T13:00:00Z'), b: entry('2026-10-04T10:00:00Z'), c: entry('2026-10-05T13:00:00Z', 7) }),
      now,
    );
    expect(Object.keys(pruned.partners)).toEqual(['a']);
  });
});

describe('AccessProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats a Dynatrace e-mail as an SE with nothing to type, and a look-alike domain as a customer', async () => {
    const se = mount(SE);
    await waitFor(() => expect(se.access().level).toBe('se'));
    se.unmount();
    const fake = mount(LOOKALIKE);
    await waitFor(() => expect(fake.access().level).toBe('customer'));
  });

  it('treats an unknown identity as a customer, never as an SE', async () => {
    const { access } = mount(UNKNOWN);
    await waitFor(() => expect(access().level).toBe('customer'));
  });

  it('shows commercial data natively to an SE, and never to a customer (3.2.6: no switch)', async () => {
    const se = mount(SE);
    await waitFor(() => expect(se.access().level).toBe('se'));
    expect(se.access().commercialVisible).toBe(true);
    expect('setCommercialVisible' in se.access()).toBe(false);

    const customer = mount(PARTNER);
    await waitFor(() => expect(customer.access().level).toBe('customer'));
    expect(customer.access().commercialVisible).toBe(false);
  });

  it('lets a partner in with the right password, counts the wrong ones, and records the entry', async () => {
    const { access, store } = mount(PARTNER);
    await waitFor(() => expect(access().level).toBe('customer'));

    let result = '';
    await act(async () => {
      result = await access().unlock('not it');
    });
    expect(result).toBe('wrong');
    expect(access().attemptsLeft).toBe(FREE_ATTEMPTS - 1);

    await act(async () => {
      result = await access().unlock(TEST_PASSWORD);
    });
    expect(result).toBe('ok');
    expect(access().level).toBe('partner');
    expect(access().canWork).toBe(true);
    const stored = store.dump()[`app:${ACCESS_KEY}`] as string;
    expect(stored).toContain('pat@partner.example');
    expect(stored).not.toContain(TEST_PASSWORD);
  });

  it('locks after five wrong passwords, even for the right one', async () => {
    const { access } = mount(PARTNER);
    await waitFor(() => expect(access().level).toBe('customer'));
    for (let attempt = 0; attempt < FREE_ATTEMPTS; attempt += 1) {
      await act(async () => {
        await access().unlock('wrong');
      });
    }
    let result = '';
    await act(async () => {
      result = await access().unlock(TEST_PASSWORD);
    });
    expect(result).toBe('locked');
    expect(access().level).toBe('customer');
  });

  it('puts the partner out at the expiry', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const clock = { t: Date.parse('2026-10-04T12:00:00Z') };
    const { access } = mount(PARTNER, seeded(), clock);
    // Let the first roster read settle inside act: the clock is fake, so waitFor cannot poll here.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(access().level).toBe('customer');
    await act(async () => {
      await access().unlock(TEST_PASSWORD);
    });
    expect(access().level).toBe('partner');
    // The default validity is fifteen days (3.3.3; it was twelve hours). Still in a day before it ends…
    await act(async () => {
      clock.t += 14 * 24 * 3600 * 1000;
      await vi.advanceTimersByTimeAsync(14 * 24 * 3600 * 1000);
    });
    expect(access().level).toBe('partner');
    // …and out once it does.
    await act(async () => {
      clock.t += 24 * 3600 * 1000 + 1000;
      await vi.advanceTimersByTimeAsync(24 * 3600 * 1000 + 1000);
    });
    expect(access().level).toBe('customer');
  });

  it('lets an SE set a PoC password: the old one stops working and partners already in are out', async () => {
    const store = seeded();
    const se = mount(SE, store);
    await waitFor(() => expect(se.access().level).toBe('se'));

    const partner = mount(PARTNER, store);
    await waitFor(() => expect(partner.access().level).toBe('customer'));
    await act(async () => {
      await partner.access().unlock(TEST_PASSWORD);
    });
    expect(partner.access().level).toBe('partner');

    let outcome = '';
    await act(async () => {
      outcome = await se.access().setPassword('dyna-abc23456');
    });
    expect(outcome).toBe('ok');
    expect(se.access().passwordIsCustom).toBe(true);
    expect(se.access().roster).toEqual([]);

    const again = mount({ ...PARTNER, email: 'ana@partner.example' }, store);
    await waitFor(() => expect(again.access().level).toBe('customer'));
    let result = '';
    await act(async () => {
      result = await again.access().unlock(TEST_PASSWORD);
    });
    expect(result).toBe('wrong');
    await act(async () => {
      result = await again.access().unlock('dyna-abc23456');
    });
    expect(result).toBe('ok');
  });

  it('refuses a short PoC password', async () => {
    const se = mount(SE);
    await waitFor(() => expect(se.access().level).toBe('se'));
    let outcome = '';
    await act(async () => {
      outcome = await se.access().setPassword('short');
    });
    expect(outcome).toBe('too-short');
  });

  it('refuses to guess when the roster cannot be read, because the password in force is unknown', async () => {
    const store = seeded();
    const { access } = mount(PARTNER, store);
    await waitFor(() => expect(access().level).toBe('customer'));
    // The tenant stops answering after the first read: the password in force is now unknown.
    store.failNext('read', { kind: 'forbidden', missingScopes: ['state:app-states:read'] });
    let result = '';
    await act(async () => {
      result = await access().unlock(TEST_PASSWORD);
    });
    expect(result).toBe('unavailable');
  });

  it('lets a partner leave, which removes the entry', async () => {
    const { access, store } = mount(PARTNER);
    await waitFor(() => expect(access().level).toBe('customer'));
    await act(async () => {
      await access().unlock(TEST_PASSWORD);
    });
    await act(async () => {
      await access().lock();
    });
    expect(access().level).toBe('customer');
    expect(store.dump()[`app:${ACCESS_KEY}`]).not.toContain('pat@partner.example');
  });
});

describe('what each audience is shown', () => {
  const open = { executiveMode: false, commercialVisible: true, restricted: false };

  it('keeps the licensing and consumption pages out of the list until commercial data is on', () => {
    for (const route of SE_ONLY_ROUTES) {
      expect(isRouteVisible(route, open)).toBe(true);
      expect(isRouteVisible(route, { ...open, commercialVisible: false })).toBe(false);
      expect(isRouteBlocked(route, { commercialVisible: false, restricted: false })).toBe(true);
      expect(isRouteBlocked(route, { commercialVisible: true, restricted: false })).toBe(false);
    }
  });

  it('shows a viewer without access the executive pages and nothing else', () => {
    const visible = storyRoutes({ ...open, restricted: true });
    expect(new Set(visible)).toEqual(RESTRICTED_ROUTES);
    expect(isRouteBlocked('/settings', { commercialVisible: false, restricted: true })).toBe(true);
    expect(isRouteBlocked('/report', { commercialVisible: true, restricted: true })).toBe(true);
  });

  it('still reads a bare boolean as executive mode alone, as before 3.2', () => {
    expect(storyRoutes(false)).toContain('/licensing');
    expect(storyRoutes(true)).not.toContain('/topology');
  });
});

describe('the logon screen', () => {
  const gate = (identity: Identity, store = createMemoryStore()) =>
    render(
      <AppRoot>
        <AccessProvider store={store} identity={identity} builtInVerifier={TEST_VERIFIER}>
          <StudioProvider>
            <AccessGate />
          </StudioProvider>
        </AccessProvider>
      </AppRoot>,
    );

  it('names who the platform says is signed in, and asks for the password', async () => {
    gate(PARTNER);
    expect(await screen.findByRole('heading', { name: 'Restricted access' })).toBeInTheDocument();
    expect(screen.getByText(/pat@partner\.example/)).toBeInTheDocument();
  });

  it('answers a wrong password with the attempts left, then opens on the right one', async () => {
    gate(PARTNER);
    const input = (await screen.findByLabelText('PoC access password'));
    fireEvent.change(input, { target: { value: 'nope-nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Wrong password. 4 attempts left.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: TEST_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Access granted')).toBeInTheDocument();
  });
});

describe('the app for a viewer who is not an SE', () => {
  const vi_ = (identity: Identity, route = '/') =>
    render(
      <AppRoot>
        <MemoryRouter initialEntries={[route]}>
          <App store={createMemoryStore()} identity={identity} />
        </MemoryRouter>
      </AppRoot>,
    );

  it('shows the logon, not the app, to a customer', async () => {
    vi_(PARTNER, '/licensing');
    expect(await screen.findByRole('heading', { name: 'Restricted access' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'The story of this PoC' })).not.toBeInTheDocument();
  });

  // It mounts the whole app with lazy pages: under the full suite a lazy chunk can fail to load in jsdom ("chunk N failed
  // to load", seen in 3.4.13–3.4.17), which a second attempt clears; alone it passes every time.
  it('opens a commercial page to an SE, and puts it away in executive mode, the presentation mode', { retry: 2, timeout: 30_000 }, async () => {
    vi_(SE, '/licensing');
    // 3.5.0: Licensing renders the platform's charts now — under the full suite's load it takes longer than the
    // default second, so each wait says how long it may take.
    expect(await screen.findByText('Internal view', undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByText('Restricted to the SE')).not.toBeInTheDocument();
    // 3.3.0 (A9): the switch is rendered twice (strip and the row under the header); either one
    // drives the same state, so the first is enough here.
    fireEvent.click(screen.getAllByRole('switch', { name: 'Executive mode' })[0] as HTMLElement);
    expect((await screen.findAllByText('Restricted to the SE', undefined, { timeout: 10_000 })).length).toBeGreaterThan(0);
    expect(screen.getByText(/hidden in Executive mode/)).toBeInTheDocument();
    expect(screen.queryByText('Internal view')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave Executive mode' }));
    await waitFor(() => expect(screen.queryByText('Restricted to the SE')).not.toBeInTheDocument(), { timeout: 10_000 });
  });
});

describe('partner access lasts days, not hours (3.3.3, owner’s 3.3.2 validation)', () => {
  it('offers 5, 15, 30, 60 and 90 days, defaults to 15, and reads an old hours choice as the default', async () => {
    const access = await import('../config/access');
    expect(access.EXPIRY_CHOICES_DAYS).toEqual([5, 15, 30, 60, 90]);
    expect(access.EXPIRY_CHOICES_HOURS).toEqual([120, 360, 720, 1440, 2160]);
    expect(access.DEFAULT_EXPIRY_HOURS).toBe(360);
    expect(access.EXPIRY_CHOICES_HOURS.every((hours) => hours >= 24 * 5)).toBe(true);
  });
});
