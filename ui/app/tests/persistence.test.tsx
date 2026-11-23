import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StudioProvider, useStudio } from '../config/StudioContext';
import { PRIVATE_KEY, SHARED_KEY, parsePrivate, parseShared } from '../config/persistence';
import { createMemoryStore } from '../config/stateStore';

/**
 * The PoC configuration must survive leaving the app.
 *
 * 3.1 kept every setting in React state: save the customer name, open another Dynatrace app,
 * come back, and it was gone. These pin what the tenant store now guarantees — what is read
 * back, what is written and where, and the cases where writing would do harm.
 */

/* eslint-disable noSecrets/no-secrets -- a 1x1 test image, not a secret */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const sharedDoc = (overrides: Record<string, unknown> = {}, rev = 3) =>
  JSON.stringify({
    v: 1,
    rev,
    savedAt: '2026-10-04T10:00:00.000Z',
    savedBy: 'se@example.com',
    parameters: {
      customerName: 'Acme Corp',
      engagementName: 'Observability PoC',
      scopeDescription: 'Checkout and payments',
      pocDescription: '',
      customerLogoDataUrl: PNG,
      brandTone: 'default',
      partnerName: 'Partner Ltda',
      partnerLogoDataUrl: null,
      ...overrides,
    },
    pillars: ['resilience', 'cost'],
  });

const privateDoc = JSON.stringify({
  v: 1,
  savedAt: '2026-10-04T10:00:00.000Z',
  costModel: { ratePerHour: 120, currencyLabel: 'BRL', rateBasis: 'blended', downtimeRatePerHour: null, downtimeBasis: '' },
  baseline: { manualMttrHours: 6, annualCostPerAgent: null },
  rateCard: { enabled: true, currencyLabel: 'BRL', usdToLocalRate: 5.1 },
  locale: 'pt-BR',
  timeframe: 'now-7d',
});

type Studio = ReturnType<typeof useStudio>;

function mount(store: ReturnType<typeof createMemoryStore> | null, delay = 20) {
  const ref: { current: Studio | null } = { current: null };
  const Probe = () => {
    ref.current = useStudio();
    return null;
  };
  const view = render(
    <StudioProvider store={store} saveDelayMs={delay}>
      <Probe />
    </StudioProvider>,
  );
  return { ref, ...view, studio: () => ref.current as Studio };
}

describe('parseShared / parsePrivate', () => {
  it('reads a stored document field by field and drops what is not safe', () => {
    const parsed = parseShared(
      sharedDoc({ customerLogoDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=', brandTone: 'not-a-tone', customerName: '  Acme  ' }),
    )!;
    expect(parsed.parameters.customerName).toBe('Acme');
    expect(parsed.parameters.customerLogoDataUrl).toBeNull();
    expect(parsed.parameters.brandTone).toBe('default');
    expect(parsed.pillars).toEqual(['resilience', 'cost']);
  });

  it('refuses a document of an unknown version or one that is not JSON', () => {
    expect(parseShared('{"v":2}')).toBeNull();
    expect(parseShared('not json')).toBeNull();
    expect(parsePrivate('[]')).toBeNull();
  });

  it('never lets a non-positive rate become a rate', () => {
    const parsed = parsePrivate(
      JSON.stringify({ v: 1, costModel: { ratePerHour: -5, downtimeRatePerHour: 0 }, baseline: { manualMttrHours: 0 } }),
    )!;
    expect(parsed.costModel.ratePerHour).toBeNull();
    expect(parsed.costModel.downtimeRatePerHour).toBeNull();
    expect(parsed.baseline.manualMttrHours).toBeNull();
    expect(parsed.locale).toBe('en');
  });
});

describe('StudioProvider with a tenant store', () => {
  it('brings the saved configuration back when the app is opened again', async () => {
    const store = createMemoryStore({ [`app:${SHARED_KEY}`]: sharedDoc(), [`user:${PRIVATE_KEY}`]: privateDoc });
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    expect(studio().parameters.customerName).toBe('Acme Corp');
    expect(studio().parameters.customerLogoDataUrl).toBe(PNG);
    expect(studio().selectedPillars).toEqual(['resilience', 'cost']);
    expect(studio().costModel.ratePerHour).toBe(120);
    expect(studio().locale).toBe('pt-BR');
    expect(studio().timeframe).toBe('now-7d');
    expect(studio().persistence.savedBy).toBe('se@example.com');
  });

  it('writes nothing just by opening: the loaded document is the baseline', async () => {
    const store = createMemoryStore({ [`app:${SHARED_KEY}`]: sharedDoc(), [`user:${PRIVATE_KEY}`]: privateDoc });
    const before = store.dump();
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(store.dump()).toEqual(before);
  });

  it('writes nothing on a first run either, until something is typed', async () => {
    const store = createMemoryStore();
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(store.dump()).toEqual({});
  });

  it('saves a change to the shared state, and the SE-only figures to the private one', async () => {
    const store = createMemoryStore();
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    act(() => {
      studio().setParameters({ ...studio().parameters, customerName: 'Globex' });
      studio().setCostModel({ ...studio().costModel, ratePerHour: 200, currencyLabel: 'USD' });
    });
    await waitFor(() => expect(Object.keys(store.dump()).length).toBe(2));
    const shared = JSON.parse(store.dump()[`app:${SHARED_KEY}`] as string) as Record<string, unknown>;
    const mine = JSON.parse(store.dump()[`user:${PRIVATE_KEY}`] as string) as Record<string, unknown>;
    expect((shared['parameters'] as { customerName: string }).customerName).toBe('Globex');
    expect(shared['rev']).toBe(1);
    // Everyone using the app can read the shared state: nothing commercial may be in it.
    expect(JSON.stringify(shared)).not.toMatch(/ratePerHour|rateCard|manualMttrHours|annualCostPerAgent/);
    expect((mine['costModel'] as { ratePerHour: number }).ratePerHour).toBe(200);
  });

  it('keeps a late edit when the app is left straight after the change', async () => {
    const store = createMemoryStore();
    const { studio, unmount } = mount(store, 5000);
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    act(() => studio().setParameters({ ...studio().parameters, customerName: 'Initech' }));
    unmount();
    await waitFor(() => expect(store.dump()[`app:${SHARED_KEY}`]).toContain('Initech'));
  });

  it('says so, with the scope, when the tenant refuses to read — and does not write afterwards', async () => {
    const store = createMemoryStore();
    store.failNext('read', { kind: 'forbidden', missingScopes: ['state:app-states:read'] });
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('forbidden'));
    expect(studio().persistence.missingScopes).toEqual(['state:app-states:read']);
    act(() => studio().setParameters({ ...studio().parameters, customerName: 'Local only' }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(store.dump()[`app:${SHARED_KEY}`]).toBeUndefined();
    expect(studio().persistence.status).toBe('forbidden');
  });

  it('never replaces a good configuration with an empty one after a failed read', async () => {
    const store = createMemoryStore({ [`app:${SHARED_KEY}`]: sharedDoc() });
    store.failNext('read', { kind: 'failed', message: 'network down' });
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('error'));
    act(() => studio().setParameters({ ...studio().parameters, customerName: 'Typed on an unread screen' }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(store.dump()[`app:${SHARED_KEY}`]).toContain('Acme Corp');
  });

  it('does not overwrite a document it cannot parse just by opening', async () => {
    const store = createMemoryStore({ [`app:${SHARED_KEY}`]: '{"v":99,"future":true}' });
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(store.dump()[`app:${SHARED_KEY}`]).toBe('{"v":99,"future":true}');
  });

  it('asks instead of overwriting when someone else saved a newer shared configuration', async () => {
    const store = createMemoryStore({ [`app:${SHARED_KEY}`]: sharedDoc({}, 3) });
    const { studio } = mount(store);
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    // Another SE saves revision 4 while this screen is open.
    await store.write('app', SHARED_KEY, sharedDoc({ customerName: 'Changed by someone else' }, 4));
    act(() => studio().setParameters({ ...studio().parameters, scopeDescription: 'My edit' }));
    await waitFor(() => expect(studio().persistence.status).toBe('conflict'));
    expect(store.dump()[`app:${SHARED_KEY}`]).toContain('Changed by someone else');

    act(() => studio().persistence.overwrite());
    await waitFor(() => expect(studio().persistence.status).toBe('saved'));
    const stored = JSON.parse(store.dump()[`app:${SHARED_KEY}`] as string) as { rev: number; parameters: { scopeDescription: string } };
    expect(stored.rev).toBe(5);
    expect(stored.parameters.scopeDescription).toBe('My edit');
  });

  it('"New PoC" deletes both documents and empties the screen', async () => {
    const store = createMemoryStore({ [`app:${SHARED_KEY}`]: sharedDoc(), [`user:${PRIVATE_KEY}`]: privateDoc });
    const { studio } = mount(store);
    await waitFor(() => expect(studio().parameters.customerName).toBe('Acme Corp'));
    await act(async () => {
      await studio().persistence.reset();
    });
    expect(store.dump()).toEqual({});
    expect(studio().parameters.customerName).toBe('');
    expect(studio().costModel.ratePerHour).toBeNull();
    // The empty screen is the new baseline: nothing is written back.
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(store.dump()).toEqual({});
  });

  it('is a plain in-session provider when no store is given', () => {
    const { studio } = mount(null);
    expect(studio().persistence.status).toBe('off');
  });
});
