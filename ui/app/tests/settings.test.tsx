import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { Settings } from '../pages/Settings';
import { StudioProvider, useStudio } from '../config/StudioContext';
import { OpenAccess } from '../config/AccessContext';
import type { CostModel } from '../models/cost';

/**
 * The cost form, driven the way a Sales Engineer drives it.
 *
 * A customer reported against 0.6.0 that they could not save an hourly rate on
 * its own, and that a downtime rate of 20,000 never reached the report pages.
 *
 * Driving the real component found the cause, and it was not the state layer —
 * `setCostModel` was correct all along. The page had **two** Apply buttons and
 * **two** Discard buttons: one pair for the customer details at the top, one
 * pair for the cost model far below a long form. Pressing the first did nothing
 * to the cost, and nothing indicated why. The affordance was broken, not the
 * logic, which is exactly the class of defect a unit test on the reducer would
 * never have found.
 *
 * There is now a single Apply that commits both sections. These tests hold that
 * shape, and hold the independence of the two rates.
 */

const Probe = () => {
  const { costModel } = useStudio();
  return <div data-testid="cost">{JSON.stringify(costModel)}</div>;
};

const setup = () => {
  render(
    <AppRoot>
      {/* 3.3.0: `useAccess()` is fail-closed outside a provider (backlog S11), so a subject that
          needs a working SE says so here instead of inheriting it from a missing provider. */}
      <OpenAccess>
        <StudioProvider>
          <Settings />
          <Probe />
        </StudioProvider>
      </OpenAccess>
    </AppRoot>,
  );

  const field = (label: string) =>
    document.querySelector(`input[aria-labelledby="${label}"]`) as HTMLInputElement;

  return {
    rate: field('rate-label'),
    currency: field('currency-label'),
    downtime: field('downtime-rate-label'),
    apply: () =>
      screen.getAllByRole('button').find((b) => b.textContent?.includes('Apply all'))! as
        HTMLButtonElement,
    cost: (): CostModel => JSON.parse(screen.getByTestId('cost').textContent ?? '{}') as CostModel,
  };
};

describe('cost form', () => {
  it('offers exactly one Apply for the whole page', () => {
    setup();
    const applies = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.toLowerCase().includes('apply'));
    expect(applies).toHaveLength(1);
  });

  it('saves the response rate with no downtime rate supplied', async () => {
    // The customer's first report: not every business can answer the downtime
    // question, and that must not block the rate they do know.
    const user = userEvent.setup();
    const s = setup();
    await user.type(s.rate, '500');
    await user.type(s.currency, 'BRL');
    await user.click(s.apply());

    expect(s.cost().ratePerHour).toBe(500);
    expect(s.cost().currencyLabel).toBe('BRL');
    expect(s.cost().downtimeRatePerHour).toBeNull();
  });

  it('saves the downtime rate with no response rate supplied', async () => {
    const user = userEvent.setup();
    const s = setup();
    await user.type(s.downtime, '20000');
    await user.click(s.apply());

    expect(s.cost().downtimeRatePerHour).toBe(20000);
    expect(s.cost().ratePerHour).toBeNull();
  });

  it('saves both rates together', async () => {
    const user = userEvent.setup();
    const s = setup();
    await user.type(s.rate, '500');
    await user.type(s.downtime, '20000');
    await user.click(s.apply());

    expect(s.cost().ratePerHour).toBe(500);
    expect(s.cost().downtimeRatePerHour).toBe(20000);
  });

  it('treats a cleared rate as not configured, never as zero', async () => {
    const user = userEvent.setup();
    const s = setup();
    await user.type(s.downtime, '20000');
    await user.click(s.apply());
    await user.clear(s.downtime);
    await user.click(s.apply());

    // Null, not 0: an outage is not free just because nobody typed a number.
    expect(s.cost().downtimeRatePerHour).toBeNull();
  });

  it('enables Apply as soon as either rate changes', async () => {
    const user = userEvent.setup();
    const s = setup();
    expect(s.apply().disabled).toBe(true);
    await user.type(s.downtime, '1');
    expect(s.apply().disabled).toBe(false);
  });
});

/**
 * One Apply for every tab — including the two that used to commit on every keystroke.
 *
 * The page promises "Apply all changes" and "Discard changes". The rate-card tab wrote
 * to the studio context on each click and the pillar checkboxes toggled it directly, so
 * neither was covered: Apply did not apply them, and Discard did not revert them.
 */
const Probes = () => {
  const { rateCard, selectedPillars } = useStudio();
  return (
    <>
      <div data-testid="rate-card">{JSON.stringify(rateCard)}</div>
      <div data-testid="pillars">{JSON.stringify(selectedPillars)}</div>
    </>
  );
};

const setupWide = () => {
  render(
    <AppRoot>
      <OpenAccess>
        <StudioProvider>
          <Settings />
          <Probes />
        </StudioProvider>
      </OpenAccess>
    </AppRoot>,
  );
  const button = (name: string) =>
    screen.getAllByRole('button').find((b) => b.textContent?.includes(name))! as HTMLButtonElement;
  return {
    apply: () => button('Apply all'),
    discard: () => button('Discard'),
    // The rate-card tab is `keepMounted` but hidden until selected, so it is not in the default tree.
    rateCardToggle: () => screen.getByRole('checkbox', { name: /Enable public list-price estimate/, hidden: true }),
    pillarToggles: () =>
      screen
        .getAllByRole('checkbox', { hidden: true })
        .filter((box) => !/Enable public list-price/.test(box.closest('label')?.textContent ?? box.parentElement?.textContent ?? '')),
    rateCard: () => JSON.parse(screen.getByTestId('rate-card').textContent ?? '{}') as { enabled: boolean },
    pillars: () => JSON.parse(screen.getByTestId('pillars').textContent ?? '[]') as string[],
  };
};

describe('one draft across every tab', () => {
  it('does not commit the rate card until Apply, and Apply commits it', async () => {
    const user = userEvent.setup();
    const s = setupWide();
    expect(s.apply().disabled).toBe(true);

    await user.click(s.rateCardToggle());
    expect(s.rateCard().enabled).toBe(false); // still a draft
    expect(s.apply().disabled).toBe(false);

    await user.click(s.apply());
    expect(s.rateCard().enabled).toBe(true);
    expect(s.apply().disabled).toBe(true); // nothing left to apply
  });

  it('puts a pending rate-card change back on Discard', async () => {
    const user = userEvent.setup();
    const s = setupWide();
    await user.click(s.rateCardToggle());
    expect((s.rateCardToggle() as HTMLInputElement).checked).toBe(true);

    await user.click(s.discard());
    expect((s.rateCardToggle() as HTMLInputElement).checked).toBe(false);
    expect(s.rateCard().enabled).toBe(false);
    expect(s.apply().disabled).toBe(true);
  });

  it('does not select a pillar until Apply, applies exactly the ones that changed, and reverts on Discard', async () => {
    const user = userEvent.setup();
    const s = setupWide();
    const boxes = s.pillarToggles();
    expect(boxes.length).toBeGreaterThanOrEqual(2);

    await user.click(boxes[0]!);
    await user.click(boxes[1]!);
    expect(s.pillars()).toEqual([]); // drafts only
    expect(s.apply().disabled).toBe(false);

    await user.click(s.discard());
    expect(s.pillars()).toEqual([]);
    expect(s.apply().disabled).toBe(true);

    await user.click(s.pillarToggles()[0]!);
    await user.click(s.pillarToggles()[1]!);
    await user.click(s.apply());
    expect(s.pillars()).toHaveLength(2);
    expect(s.apply().disabled).toBe(true);

    // Selecting then unselecting leaves nothing to apply.
    await user.click(s.pillarToggles()[0]!);
    expect(s.apply().disabled).toBe(false);
    await user.click(s.pillarToggles()[0]!);
    expect(s.apply().disabled).toBe(true);
  });

  it('applies the cost model, the rate card and the pillars in one press', async () => {
    const user = userEvent.setup();
    const s = setupWide();
    const rate = document.querySelector('input[aria-labelledby="rate-label"]') as HTMLInputElement;
    await user.type(rate, '500');
    await user.click(s.rateCardToggle());
    await user.click(s.pillarToggles()[0]!);
    await user.click(s.apply());

    expect((JSON.parse(screen.getAllByTestId('rate-card')[0]!.textContent ?? '{}') as { enabled: boolean }).enabled).toBe(true);
    expect(s.pillars()).toHaveLength(1);
  });
});

describe('the Dashboards tab (3.3.5; moved to the PoC builder in 3.6.6)', () => {
  it('no longer carries the dashboards: Settings opens on the customer and the PoC plan', () => {
    setup();
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
    expect(tabs.slice(0, 2)).toEqual(['Customer & engagement', 'PoC plan']);
    expect(tabs).not.toContain('Dashboards');
    expect(screen.queryByTestId('dash3-create-sre')).toBeNull();
  });
});
