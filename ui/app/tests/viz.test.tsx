import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { StudioProvider } from '../config/StudioContext';

import {
  BarList,
  CapacityBars,
  DonutBreakdown,
  HealthRing,
  ShareBar,
  SmartscapeView,
  Sparkline,
  ValueCard,
  type CapacityHost,
  type SmartscapeTier,
} from '../components/viz';

/**
 * The data-visualisation primitives.
 *
 * jsdom cannot show whether a chart looks right, and these do not pretend to. They
 * pin what is *meant*: that absence is never drawn as zero, that proportions are
 * honest, that every mark has its figure printed beside it as text, and that the
 * components that claim interactivity are operable from the keyboard.
 */

// The evidence badge on a fact-bearing card reads the studio locale.
const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

describe('HealthRing', () => {
  it('draws a measured value as an arc with the number printed in the middle', () => {
    const { container } = wrap(<HealthRing value={87} label="Closure" ariaLabel="Closure: 87%" />);
    expect(screen.getByRole('img', { name: 'Closure: 87%' })).toBeInTheDocument();
    expect(container.querySelector('.pvs-ring__value')?.textContent).toBe('87');
    const arc = container.querySelector('.pvs-ring__arc') as SVGCircleElement;
    expect(arc).not.toBeNull();
    const [dash, rest] = (arc.getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
    expect((dash as number) / ((dash as number) + (rest as number))).toBeCloseTo(0.87, 2);
  });

  it('draws "not measured" as a dash on a dashed track — never as an empty zero ring', () => {
    const { container } = wrap(<HealthRing value={null} label="Closure" ariaLabel="Closure: not measured" />);
    expect(container.querySelector('.pvs-ring__value')?.textContent).toBe('—');
    expect(container.querySelector('.pvs-ring__arc')).toBeNull();
    const track = container.querySelector('svg circle') as SVGCircleElement;
    expect(track.getAttribute('stroke-dasharray')).toBe('4 8');
  });

  it('draws a measured zero as a zero, with an arc of length zero', () => {
    const { container } = wrap(<HealthRing value={0} label="Closure" ariaLabel="Closure: 0%" />);
    expect(container.querySelector('.pvs-ring__value')?.textContent).toBe('0');
    expect(container.querySelector('.pvs-ring__arc')).not.toBeNull();
  });

  it('clamps an out-of-range value instead of drawing past the ring', () => {
    const { container } = wrap(<HealthRing value={250} label="Closure" ariaLabel="Closure" />);
    const arc = container.querySelector('.pvs-ring__arc') as SVGCircleElement;
    const [dash, rest] = (arc.getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
    expect(rest).toBeCloseTo(0, 5);
    expect(dash).toBeGreaterThan(0);
  });

  it('prefers a pre-formatted display and prints the label and caption as text', () => {
    wrap(<HealthRing value={5} valueDisplay="5/8" label="Coverage" caption="of entity types" ariaLabel="x" />);
    expect(screen.getByText('5/8')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('of entity types')).toBeInTheDocument();
  });
});

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('BarList', () => {
  const items = [
    { key: 'a', label: 'Alpha', value: 100, display: '100 h' },
    { key: 'b', label: 'Bravo', value: 50, display: '50 h' },
    { key: 'c', label: 'Charlie', value: 1, display: '1 h' },
  ];

  it('is a named list with one row per item, a rank and the figure as text', () => {
    wrap(<BarList items={items} ariaLabel="Time to resolve" />);
    const list = screen.getByRole('list', { name: 'Time to resolve' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('100 h')).toBeInTheDocument();
    expect(within(list).getByText('1')).toBeInTheDocument();
  });

  it('sizes bars against the largest value, with a visible floor for tiny ones', () => {
    const { container } = wrap(<BarList items={items} ariaLabel="x" />);
    // 3.5.1: the bar is the platform's MeterBarChart on the list's own scale; the track keeps the share it draws.
    const widths = Array.from(container.querySelectorAll<HTMLElement>('.pvs-bars__track')).map((el) => el.dataset.pct);
    expect(widths).toEqual(['100.0', '50.0', '2.0']);
  });

  it('colours by what the bars measure, from the shared palette', () => {
    const magnitude = wrap(<BarList items={items} ariaLabel="x" role="magnitude" />);
    // 3.5.1: the colour goes to the platform's MeterBarChart (from accentFor(role), a Strato token).
    expect(magnitude.container.querySelector('[data-dt-component="SingleMeterBarChart"]')).not.toBeNull();
    const magnitudeFamily = magnitude.container.querySelector('.pvs-bars')?.getAttribute('data-spectrum');
    magnitude.unmount();
    const exposure = wrap(<BarList items={items} ariaLabel="x" role="exposure" />);
    expect(read('ui/app/components/viz/BarList.tsx')).toContain('color={fill}');
    // The Spectrum paint over the solid colour follows the same role (3.2.3).
    expect(magnitudeFamily).toBe('blue');
    expect(exposure.container.querySelector('.pvs-bars')?.getAttribute('data-spectrum')).toBe('orange');
  });

  it('keeps a long name whole in its tooltip and can omit ranks', () => {
    const long = 'service-with-an-extremely-long-name-that-cannot-possibly-fit-in-the-row-0001';
    const { container } = wrap(
      <BarList items={[{ key: 'x', label: long, value: 3, display: '3' }]} ariaLabel="x" ranked={false} />,
    );
    expect(container.querySelector(`[title="${long}"]`)).not.toBeNull();
    expect(container.querySelector('.pvs-bars__rank')).toBeNull();
  });

  it('renders an empty list without dividing by zero', () => {
    const { container } = wrap(<BarList items={[]} ariaLabel="x" />);
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});

describe('ShareBar', () => {
  const segments = [
    { key: 'a', label: 'Small', value: 10, display: '10' },
    { key: 'b', label: 'Large', value: 70, display: '70' },
    { key: 'c', label: 'Medium', value: 20, display: '20' },
  ];

  it('lists every segment, largest first, each with its figure and its share as text', () => {
    const { container } = wrap(<ShareBar segments={segments} ariaLabel="Split" />);
    const names = Array.from(container.querySelectorAll('.pvs-legend-list__name')).map((el) => el.textContent);
    expect(names).toEqual(['Large', 'Medium', 'Small']);
    const shares = Array.from(container.querySelectorAll('.pvs-legend-list__share')).map((el) => el.textContent);
    expect(shares).toEqual(['70.0%', '20.0%', '10.0%']);
  });

  it('draws segment widths that add up to the whole', () => {
    const { container } = wrap(<ShareBar segments={segments} ariaLabel="Split" />);
    const widths = Array.from(container.querySelectorAll<HTMLElement>('.pvs-share__seg')).map((el) =>
      parseFloat(el.style.width),
    );
    expect(widths.reduce((sum, w) => sum + w, 0)).toBeCloseTo(100, 5);
  });

  it('keeps the legend readable to assistive technology: only the bar is an image', () => {
    const { container } = wrap(<ShareBar segments={segments} ariaLabel="Split" />);
    const image = screen.getByRole('img', { name: 'Split' });
    expect(image.className).toContain('pvs-share__bar');
    expect(image.contains(container.querySelector('.pvs-legend-list'))).toBe(false);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
  });

  it('gives every segment a distinct colour from the categorical palette', () => {
    const { container } = wrap(<ShareBar segments={segments} ariaLabel="Split" />);
    const colours = Array.from(container.querySelectorAll<HTMLElement>('.pvs-share__seg')).map((el) => el.style.backgroundColor);
    expect(new Set(colours).size).toBe(3);
    colours.forEach((colour) => expect(colour).toContain('var(--dt-colors-'));
  });
});

describe('DonutBreakdown', () => {
  const segments = [
    { key: 'a', label: 'Resolved', value: 3, display: '3' },
    { key: 'b', label: 'Open', value: 1, display: '1' },
  ];

  it('draws one arc per slice, the total in the middle, and every share in the legend as text', () => {
    const { container } = wrap(
      <DonutBreakdown segments={segments} ariaLabel="Problems" centerDisplay="4" centerLabel="problems" />,
    );
    // One arc per slice over the track ring (3.2.3).
    expect(container.querySelectorAll('svg circle.pvs-donut__arc')).toHaveLength(2);
    expect(container.querySelectorAll('svg circle.pvs-donut__track')).toHaveLength(1);
    expect(container.querySelector('.pvs-donut__total')?.textContent).toBe('4');
    expect(container.textContent).toContain('75.0%');
    expect(container.textContent).toContain('25.0%');
  });

  it('keeps the legend readable to assistive technology: only the dial is an image', () => {
    const { container } = wrap(
      <DonutBreakdown segments={segments} ariaLabel="Problems" centerDisplay="4" centerLabel="problems" />,
    );
    const image = screen.getByRole('img', { name: 'Problems' });
    expect(image.contains(container.querySelector('.pvs-legend-list'))).toBe(false);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('paints nothing on the slices themselves', () => {
    // v2 printed a percentage over each large slice with a text-shadow. The legend
    // carries every share on a plain background instead.
    const { container } = wrap(
      <DonutBreakdown segments={segments} ariaLabel="Problems" centerDisplay="4" centerLabel="problems" />,
    );
    expect(container.querySelector('svg text')).toBeNull();
  });
});

describe('Sparkline', () => {
  it('needs at least two points to show a direction', () => {
    const { container } = wrap(<Sparkline points={[3]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('is hidden from assistive technology unless it is given a description', () => {
    const hidden = wrap(<Sparkline points={[1, 2, 3]} />);
    const svg = hidden.container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    hidden.unmount();

    wrap(<Sparkline points={[1, 2, 3]} ariaLabel="Trend: rising" />);
    expect(screen.getByRole('img', { name: 'Trend: rising' })).toBeInTheDocument();
  });

  it('survives a flat series', () => {
    const { container } = wrap(<Sparkline points={[5, 5, 5, 5]} />);
    expect(container.querySelector('path[d*="NaN"]')).toBeNull();
  });
});

describe('ValueCard', () => {
  it('draws a not-measured value as a muted dash on a dashed card', () => {
    const { container } = wrap(<ValueCard eyebrow="Hosts" value="—" caption="not reported" />);
    expect((container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBe('unavailable');
    expect(container.querySelector('.pvs-figure')?.getAttribute('data-missing')).toBe('true');
  });

  it('draws an approximate value with the dashed edge, and lets "not measured" win over it', () => {
    const estimated = wrap(<ValueCard eyebrow="Users" value="1,200" evidence="platform-estimate" />);
    expect((estimated.container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBe('estimated');
    estimated.unmount();

    const missing = wrap(<ValueCard eyebrow="Users" value="—" evidence="platform-estimate" />);
    expect((missing.container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBe('unavailable');
  });

  it('carries the evidence badge, the edge and the dash of its Fact', () => {
    const evidence = { queryId: 'prob.summary', source: 'problems', timeframe: 'last 24 hours' };
    const observedFact = { value: 41, provenance: 'observed' as const, confidence: 'high' as const, evidence };
    const shown = wrap(<ValueCard eyebrow="Active" value="41" fact={observedFact} />);
    expect(screen.getByRole('button', { name: /Evidence class: Observed/ })).toBeInTheDocument();
    expect((shown.container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBeUndefined();
    shown.unmount();

    // A value passed alongside an unavailable fact is never shown: the fact wins.
    const loading = wrap(<ValueCard eyebrow="Active" value="0" fact={{ value: null, provenance: 'loading', confidence: 'high', evidence }} />);
    expect(screen.getByRole('button', { name: /Evidence class: Loading/ })).toBeInTheDocument();
    expect(loading.container.querySelector('.pvs-figure')?.textContent).toBe('—');
    expect((loading.container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBe('unavailable');
    loading.unmount();

    const approx = wrap(<ValueCard eyebrow="Users" value="1,200" fact={{ value: 1200, provenance: 'platform-estimate', confidence: 'medium', evidence, note: 'approximate' }} />);
    expect((approx.container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBe('estimated');
  });

  it('prints a measured value and unit as plain text', () => {
    wrap(<ValueCard eyebrow="Problems" value="42" unit="open" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('is operable from the keyboard when it navigates', () => {
    const onClick = vi.fn();
    wrap(<ValueCard eyebrow="Problems" value="42" onClick={onClick} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('states a trend in words, with the arrow hidden from assistive technology', () => {
    const { container } = wrap(<ValueCard eyebrow="Problems" value="42" trend={{ direction: 'up', label: 'up 5%' }} />);
    expect(screen.getByText(/up 5%/)).toBeInTheDocument();
    expect(container.querySelector('.pvs-valuecard__trend [aria-hidden="true"]')?.textContent).toBe('↑');
  });
});

describe('CapacityBars', () => {
  const hosts: CapacityHost[] = [
    { key: 'a', name: 'host-a', peakPct: 93, color: 'var(--dt-colors-border-critical-accent)', classLabel: 'Saturated' },
    {
      key: 'b',
      name: 'host-b',
      peakPct: 12,
      color: 'var(--dt-colors-border-primary-accent)',
      classLabel: 'Oversized',
      reclaimable: true,
    },
    { key: 'c', name: 'host-c', peakPct: null, color: 'var(--dt-colors-border-neutral-accent)', classLabel: 'Unknown' },
  ];

  const renderBars = () =>
    wrap(
      <CapacityBars
        hosts={hosts}
        ariaLabel="Peak memory per host"
        pressuredPct={75}
        saturatedPct={90}
        pressuredLabel="Pressured"
        saturatedLabel="Saturated"
        hostHeader="Host"
        usageHeader="Peak"
        headroomHint="Hatched = reclaimable"
        usageWord="peak"
        reclaimWord="free"
      />,
    );

  it('keeps the hosts in the order given and prints each reading as text', () => {
    const { container } = renderBars();
    const rows = within(screen.getByRole('list', { name: 'Peak memory per host' })).getAllByRole('listitem');
    expect(rows.map((row) => row.querySelector('.pvs-bars__name')?.textContent)).toEqual(['host-a', 'host-b', 'host-c']);
    expect(container.textContent).toContain('93%');
  });

  it('shows an unmeasured host as a dash, never as 0%', () => {
    renderBars();
    const rows = screen.getAllByRole('listitem');
    expect(rows[2]?.querySelector('.pvs-capacity__readout strong')?.textContent).toBe('—');
    expect(rows[2]?.querySelector('.pvs-capacity__fill')).toBeNull();
  });

  it('shows an oversized host as mostly free, hatched, with the reclaimable share', () => {
    renderBars();
    const rows = screen.getAllByRole('listitem');
    expect(rows[1]?.querySelector('.pvs-capacity__readout strong')?.textContent).toBe('88%');
    expect(rows[1]?.textContent).toContain('free');
    const hatch = rows[1]?.querySelector('.pvs-capacity__reclaim') as HTMLElement;
    expect(hatch.style.backgroundImage).toContain('repeating-linear-gradient');
  });

  it('marks the two review thresholds on every track and names them in the key', () => {
    const { container } = renderBars();
    const refs = Array.from(
      container.querySelectorAll<HTMLElement>('li:first-child .pvs-capacity__ref'),
    ).map((el) => el.style.insetInlineStart);
    expect(refs).toEqual(['75%', '90%']);
    expect(container.textContent).toContain('Pressured · 75%');
    expect(container.textContent).toContain('Saturated · 90%');
  });

  it('draws only the first rows of a long list and offers every host on demand', () => {
    const many: CapacityHost[] = Array.from({ length: 45 }, (_, index) => ({
      key: `h${index}`,
      name: `host-${index}`,
      peakPct: 50,
      color: 'var(--dt-colors-border-neutral-accent)',
      classLabel: 'Balanced',
    }));
    wrap(
      <CapacityBars
        hosts={many}
        ariaLabel="Peak memory per host"
        pressuredPct={75}
        saturatedPct={90}
        pressuredLabel="Pressured"
        saturatedLabel="Saturated"
        hostHeader="Host"
        usageHeader="Peak"
        headroomHint="Hatched = reclaimable"
        usageWord="peak"
        reclaimWord="free"
        initialRows={10}
      />,
    );
    const list = screen.getByRole('list', { name: 'Peak memory per host' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 45 hosts' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(45);
    fireEvent.click(screen.getByRole('button', { name: 'Show the first 10' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
  });

  it('shows no toggle when every host already fits', () => {
    renderBars();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('names the class of each host in words next to a swatch', () => {
    renderBars();
    expect(screen.getByText('Saturated', { selector: 'li span' })).toBeInTheDocument();
    expect(screen.getByText('Oversized')).toBeInTheDocument();
  });
});

describe('SmartscapeView', () => {
  const tiers: SmartscapeTier[] = [
    {
      key: 'services',
      label: 'Services',
      emptyLabel: 'None reported',
      nodes: [
        { key: 'web', label: 'WEB_REQUEST_SERVICE', detail: '12' },
        { key: 'db', label: 'DATABASE_SERVICE', detail: '4' },
      ],
    },
    { key: 'tech', label: 'Technologies', emptyLabel: 'None reported', nodes: [{ key: 'java', label: 'Java', detail: '9' }] },
    { key: 'ext', label: 'External', emptyLabel: 'None reported', nodes: [] },
  ];

  it('lists every tier with its nodes, and says so when a tier is empty', () => {
    wrap(<SmartscapeView tiers={tiers} ariaLabel="Dependencies" hint="Hover a tier" />);
    const list = screen.getByRole('list', { name: 'Dependencies' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('WEB_REQUEST_SERVICE')).toBeInTheDocument();
    expect(within(list).getByText('None reported')).toBeInTheDocument();
    expect(screen.getByText('Hover a tier')).toBeInTheDocument();
  });

  it('isolates a tier on focus and restores them all on blur', () => {
    const { container } = wrap(<SmartscapeView tiers={tiers} ariaLabel="Dependencies" />);
    const items = Array.from(container.querySelectorAll<HTMLElement>('.pvs-tier'));
    items.forEach((item) => expect(item.getAttribute('tabindex')).toBe('0'));

    fireEvent.focus(items[1] as HTMLElement);
    expect(items.map((item) => item.dataset.dimmed)).toEqual(['true', undefined, 'true']);

    fireEvent.blur(items[1] as HTMLElement);
    items.forEach((item) => expect(item.dataset.dimmed).toBeUndefined());
  });

  it('isolates a tier on hover as well', () => {
    const { container } = wrap(<SmartscapeView tiers={tiers} ariaLabel="Dependencies" />);
    const items = Array.from(container.querySelectorAll<HTMLElement>('.pvs-tier'));
    fireEvent.mouseEnter(items[0] as HTMLElement);
    expect(items.map((item) => item.dataset.dimmed)).toEqual([undefined, 'true', 'true']);
    fireEvent.mouseLeave(items[0] as HTMLElement);
    items.forEach((item) => expect(item.dataset.dimmed).toBeUndefined());
  });
});

describe('visual language', () => {
  const renderAll = () =>
    wrap(
      <>
        <HealthRing value={50} label="A" ariaLabel="A" />
        <BarList items={[{ key: 'a', label: 'A', value: 1, display: '1' }]} ariaLabel="A" />
        <ShareBar segments={[{ key: 'a', label: 'A', value: 1, display: '1' }]} ariaLabel="A" />
        <DonutBreakdown
          segments={[{ key: 'a', label: 'A', value: 1, display: '1' }]}
          ariaLabel="A"
          centerDisplay="1"
          centerLabel="a"
        />
        <ValueCard eyebrow="A" value="1" tone="warning" />
        <Sparkline points={[1, 2]} />
      </>,
    );

  it('emits no raw colour: every one is a design token or a mix of one', () => {
    const { container } = renderAll();
    const raw = container.innerHTML.match(/(?:fill|stroke|color|background)[:=]\s*"?#[0-9a-fA-F]{3,8}\b/g);
    expect(raw, `raw colours: ${raw?.join(', ')}`).toBeNull();
  });

  it('draws no glow, blur or text shadow', () => {
    const { container } = renderAll();
    expect(container.innerHTML).not.toMatch(/drop-shadow|blur\(|text-shadow|filter:/);
  });
});
