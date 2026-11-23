import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SeOnly } from '../components/SeOnly';
import { AccessProvider, CommercialScope } from '../config/AccessContext';
import { DYNATRACE_DOMAIN, type Identity } from '../config/identity';
import { createMemoryStore } from '../config/stateStore';
import { COMMERCIAL_SCORECARD_ROWS, forAudience } from '../features/insights/audience';

const SE: Identity = { id: 'u1', name: 'Sam', email: `sam${DYNATRACE_DOMAIN}`, known: true };

const CUSTOMER: Identity = { id: 'u2', name: 'Cora', email: 'cora@customer.example', known: true };

describe('SeOnly', () => {
  it('prints priced figures for an SE, and nothing priced in executive mode or for a customer (3.2.6)', async () => {
    const Probe = () => <SeOnly fallback={<span>hidden</span>}>R$ 12.000 per year</SeOnly>;
    const se = render(
      <AccessProvider store={createMemoryStore()} identity={SE}>
        <Probe />
      </AccessProvider>,
    );
    await waitFor(() => expect(screen.getByText(/12\.000/)).toBeInTheDocument());
    se.unmount();

    // Executive mode narrows commercial data away for the subtree, as the app does for the whole shell.
    const presenting = render(
      <AccessProvider store={createMemoryStore()} identity={SE}>
        <CommercialScope allow={false}>
          <Probe />
        </CommercialScope>
      </AccessProvider>,
    );
    await waitFor(() => expect(screen.getByText('hidden')).toBeInTheDocument());
    expect(screen.queryByText(/12\.000/)).not.toBeInTheDocument();
    presenting.unmount();

    render(
      <AccessProvider store={createMemoryStore()} identity={CUSTOMER}>
        <Probe />
      </AccessProvider>,
    );
    await waitFor(() => expect(screen.getByText('hidden')).toBeInTheDocument());
    expect(screen.queryByText(/12\.000/)).not.toBeInTheDocument();
  });
});

describe('audience filters', () => {
  it('drops billing-framed insights for a customer and keeps the rest', () => {
    const list = [
      { id: 'a', category: 'consumption' },
      { id: 'b', category: 'reliability' },
    ];
    expect(forAudience(list, false).map((i) => i.id)).toEqual(['b']);
    expect(forAudience(list, true).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('names the scorecard rows framed around licences and expansion', () => {
    expect([...COMMERCIAL_SCORECARD_ROWS].sort()).toEqual(['consumption-sustainability', 'expansion-readiness']);
  });
});
