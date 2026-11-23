import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { AssistPanel } from '../components/AssistPanel';
import { ChartFrame } from '../components/ChartFrame';
import { FactTile } from '../components/FactTile';
import { HeroBanner } from '../components/HeroBanner';
import { MetricCard } from '../components/MetricCard';
import { PageSummary } from '../components/PageSummary';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { SectionIntro } from '../components/SectionIntro';
import { StudioProvider, useStudio } from '../config/StudioContext';
import { Callout, EVIDENCE, EVIDENCE_ORDER, Figure, Panel, type CalloutKind } from '../engine';
import { observed, unavailable, type Provenance } from '../models/provenance';

/**
 * Behaviour of the engine and of the shared components built on it.
 *
 * jsdom performs no layout, so none of this proves a page *looks* right. It proves
 * the things the stylesheet and the accessibility tree depend on: that the data
 * attributes the CSS keys off actually reach the DOM, that a card which claims to
 * be a button behaves like one, and that the evidence language carries its meaning
 * in words and shapes as well as colour.
 */

const evidence = { queryId: 'cov.inventory', source: 'entities', timeframe: 'last 24 hours' };

const wrap = (node: React.ReactNode, route = '/') =>
  render(
    <AppRoot>
      <MemoryRouter initialEntries={[route]}>
        <StudioProvider>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

describe('Panel', () => {
  it('delivers the data attributes the stylesheet keys off to the DOM', () => {
    // The whole panel stylesheet is `.pvs-panel[data-…]`. If Strato's Surface did
    // not forward them, every rule would silently stop applying.
    const { container } = wrap(
      <Panel pad="roomy" rail railTone="warning" evidence="projection">
        body
      </Panel>,
    );
    const panel = container.querySelector('.pvs-panel') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.dataset.pad).toBe('roomy');
    expect(panel.dataset.rail).toBe('true');
    expect(panel.dataset.evidence).toBe('estimated');
    expect(panel.style.getPropertyValue('--pvs-rail-color')).toContain('--dt-colors-border-warning');
  });

  it('draws no rail for a neutral edge', () => {
    const { container } = wrap(<Panel rail>body</Panel>);
    const panel = container.querySelector('.pvs-panel') as HTMLElement;
    expect(panel.dataset.rail).toBeUndefined();
  });

  it.each<[Provenance, string | undefined]>([
    ['observed', undefined],
    ['derived', undefined],
    ['recommendation', undefined],
    ['partial', 'estimated'],
    ['platform-estimate', 'estimated'],
    ['projection', 'estimated'],
    ['hypothesis', 'hypothesis'],
    ['not-configured', 'unavailable'],
    ['no-telemetry', 'unavailable'],
    ['no-permission', 'unavailable'],
  ])('marks a %s card as %s', (provenance, expected) => {
    const { container } = wrap(<Panel evidence={provenance}>body</Panel>);
    expect((container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBe(expected);
  });

  it('is not a control unless it is given something to do', () => {
    wrap(<Panel>body</Panel>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('becomes a real button with onActivate: focusable, clickable, Enter and Space', () => {
    const onActivate = vi.fn();
    wrap(<Panel onActivate={onActivate}>open the thing</Panel>);

    const button = screen.getByRole('button', { name: 'open the thing' });
    expect(button).toHaveAttribute('tabindex', '0');

    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });
    expect(onActivate).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(button, { key: 'a' });
    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it('lets a caller veto the key handling', () => {
    const onActivate = vi.fn();
    wrap(
      <Panel
        onActivate={onActivate}
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      >
        card
      </Panel>,
    );
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('Figure', () => {
  it('prints the value with its unit beside it', () => {
    wrap(<Figure value="1,204" unit="hosts" />);
    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(screen.getByText('hosts')).toBeInTheDocument();
  });

  it('shows a measured zero as a zero', () => {
    const { container } = wrap(<Figure value="0" />);
    expect(container.textContent).toContain('0');
    expect(container.querySelector('[data-missing]')).toBeNull();
  });

  it('shows a missing value as a dash with the reason for assistive technology, never a zero', () => {
    const { container } = wrap(<Figure value="0" unit="hosts" missing missingLabel="Not measured: no telemetry" />);
    const figure = container.querySelector('.pvs-figure') as HTMLElement;
    expect(figure.dataset.missing).toBe('true');
    expect(figure.textContent).toBe('—');
    expect(within(figure).getByLabelText('Not measured: no telemetry')).toBeInTheDocument();
  });

  it('colours the ink only for an asserted tone, and never a missing value', () => {
    const { container, rerender } = wrap(<Figure value="9" tone="critical" />);
    expect((container.querySelector('.pvs-figure') as HTMLElement).style.color).toContain('--dt-colors-text-critical');

    rerender(
      <AppRoot>
        <MemoryRouter>
          <StudioProvider>
            <Figure value="9" tone="critical" missing />
          </StudioProvider>
        </MemoryRouter>
      </AppRoot>,
    );
    expect((container.querySelector('.pvs-figure') as HTMLElement).style.color).toBe('');

    rerender(
      <AppRoot>
        <MemoryRouter>
          <StudioProvider>
            <Figure value="9" tone="neutral" />
          </StudioProvider>
        </MemoryRouter>
      </AppRoot>,
    );
    expect((container.querySelector('.pvs-figure') as HTMLElement).style.color).toBe('');
  });

  it('does not repeat a unit the formatted value already carries', () => {
    const percent = wrap(<Figure value="1.23%" unit="%" />);
    expect(percent.container.querySelector('.pvs-figure__unit')).toBeNull();
    expect(percent.container.querySelector('.pvs-figure')?.textContent).toBe('1.23%');
    percent.unmount();

    const hours = wrap(<Figure value="6.9 h" unit="h" />);
    expect(hours.container.querySelector('.pvs-figure__unit')).toBeNull();
    hours.unmount();

    const bare = wrap(<Figure value="62" unit="hosts" />);
    expect(bare.container.querySelector('.pvs-figure__unit')?.textContent).toBe('hosts');
  });

  it('lets a long number break only at its thousands separators', () => {
    const { container } = wrap(<Figure value="91,113,158,730" size="lg" />);
    const figure = container.querySelector('.pvs-figure__value') as HTMLElement;
    expect(figure.textContent).toBe('91,113,158,730');
    expect(figure.querySelectorAll('wbr')).toHaveLength(3);
  });

  it('lets an identifier break at its underscores without changing the text', () => {
    const { container } = wrap(<Figure value="RESOURCE_CONTENTION" size="xl" />);
    const figure = container.querySelector('.pvs-figure__value') as HTMLElement;
    expect(figure.textContent).toBe('RESOURCE_CONTENTION');
    expect(figure.querySelectorAll('wbr')).toHaveLength(1);
  });

  it('is plain solid ink — no gradient fill that could print invisible', () => {
    const { container } = wrap(<Figure value="42" size="xl" tone="primary" />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/gradient|text-fill-color|background-clip|data-gradient-number/);
  });
});

describe('Callout', () => {
  const KINDS: CalloutKind[] = ['note', 'assumption', 'estimate', 'limitation', 'recommendation', 'pending'];
  const DASHED: CalloutKind[] = ['assumption', 'estimate', 'limitation', 'pending'];

  it.each(KINDS)('names its %s kind and hides its decorative icon', (kind) => {
    const { container } = wrap(
      <Callout kind={kind} title={`Title ${kind}`}>
        Body {kind}
      </Callout>,
    );
    expect(screen.getByLabelText(`Title ${kind}`)).toBeInTheDocument();
    expect(screen.getByText(`Body ${kind}`)).toBeInTheDocument();
    const icon = container.querySelector('.pvs-callout__icon svg') as SVGElement;
    expect(icon, kind).not.toBeNull();
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws every kind that is not a firm fact with a dashed edge, and only those', () => {
    for (const kind of KINDS) {
      const { container, unmount } = wrap(<Callout kind={kind}>x</Callout>);
      const callout = container.querySelector('.pvs-callout') as HTMLElement;
      expect(callout.dataset.style === 'dashed', kind).toBe(DASHED.includes(kind));
      unmount();
    }
  });

  it('is a named note, not a landmark, so a page with many callouts does not clutter the landmark list', () => {
    wrap(
      <>
        <Callout kind="limitation" title="First">
          a
        </Callout>
        <Callout kind="assumption" title="Second">
          b
        </Callout>
      </>,
    );
    expect(screen.getAllByRole('note')).toHaveLength(2);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('never uses amber or red: a limitation of the review is not a fault in the estate', () => {
    // The callout stylesheet has no tone variants at all, so there is nothing to
    // colour; this asserts the component exposes none either.
    const { container } = wrap(<Callout kind="limitation">x</Callout>);
    expect(container.innerHTML).not.toMatch(/warning|critical/);
  });
});

describe('ProvenanceBadge', () => {
  it.each(EVIDENCE_ORDER)('says what it is for, not just what it is called: %s', (provenance) => {
    const { container } = wrap(<ProvenanceBadge provenance={provenance} />);
    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    const name = trigger.getAttribute('aria-label') ?? '';
    expect(name).toMatch(/^Evidence class: .+\. Open for its source\.$/);
    // The visible word and the accessible name agree.
    expect(trigger.textContent?.trim().length).toBeGreaterThan(0);
    expect(name).toContain(trigger.textContent?.trim() ?? '');
  });

  it('draws the class icon, hidden from assistive technology', () => {
    const { container } = wrap(<ProvenanceBadge provenance="no-permission" />);
    const svg = container.querySelector('button svg') as SVGElement;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives every class a different icon markup, so the classes differ without colour', () => {
    const shapes = EVIDENCE_ORDER.map((provenance) => {
      const { container, unmount } = wrap(<ProvenanceBadge provenance={provenance} />);
      const markup = (container.querySelector('button svg') as SVGElement).innerHTML;
      unmount();
      return markup;
    });
    expect(new Set(shapes).size).toBe(EVIDENCE_ORDER.length);
  });

  it('uses the registry for its tone', () => {
    // A guard against the badge growing its own colour table again.
    expect(EVIDENCE['no-permission'].tone).toBe('neutral');
  });
});

describe('FactTile', () => {
  it('draws a firm fact with a solid edge and a measured zero as zero', () => {
    const { container } = wrap(<FactTile label="Mobile apps" fact={observed(0, evidence)} display="0" />);
    expect((container.querySelector('.pvs-panel') as HTMLElement).dataset.evidence).toBeUndefined();
    expect(container.querySelector('.pvs-figure')?.textContent).toBe('0');
  });

  it('draws an unavailable value as a dash, with its reason, on a dashed card — and never as an alarm', () => {
    const { container } = wrap(
      <FactTile label="Vulnerabilities" fact={unavailable('no-permission', undefined, evidence)} display="0" />,
    );
    const panel = container.querySelector('.pvs-panel') as HTMLElement;
    expect(panel.dataset.evidence).toBe('unavailable');
    expect(panel.dataset.rail).toBeUndefined();
    expect(container.querySelector('.pvs-figure')?.textContent).toBe('—');
    expect(container.querySelector('.pvs-figure')?.getAttribute('data-missing')).toBe('true');
  });

  it('draws an informational count with no treatment, and only a real condition with one', () => {
    // Blue ink reads as a link on the platform; a page of blue numbers says
    // "clickable". Informational (`primary`) is the default state of a count.
    const info = wrap(<FactTile label="Hosts" fact={observed(62, evidence)} display="62" tone="primary" />);
    expect((info.container.querySelector('.pvs-panel') as HTMLElement).dataset.rail).toBeUndefined();
    expect((info.container.querySelector('.pvs-figure') as HTMLElement).style.color).toBe('');
    info.unmount();

    const review = wrap(<FactTile label="Failing" fact={observed(7, evidence)} display="7" tone="warning" />);
    // 3.7.5 (v6): a real condition is a dot before the label and the figure's tone, no coloured rail.
    expect((review.container.querySelector('.pvs-panel') as HTMLElement).dataset.rail).toBeUndefined();
    expect((review.container.querySelector('.pvs-panel') as HTMLElement).dataset.tone).toBe('warning');
    expect(review.container.querySelector('.pvs-tile__dot')).not.toBeNull();
    expect((review.container.querySelector('.pvs-figure') as HTMLElement).style.color).toContain('--dt-colors-text-warning');
  });

  it('sets a long text value one step smaller than a number', () => {
    const long = wrap(<FactTile label="Slowest" fact={observed('RESOURCE_CONTENTION', evidence)} display="RESOURCE_CONTENTION" size="xl" />);
    expect((long.container.querySelector('.pvs-figure') as HTMLElement).dataset.size).toBe('md');
    long.unmount();
    const short = wrap(<FactTile label="Hosts" fact={observed(62, evidence)} display="62" size="xl" />);
    expect((short.container.querySelector('.pvs-figure') as HTMLElement).dataset.size).toBe('xl');
  });

  it('prints the window and query id under a measured figure when asked', () => {
    wrap(<FactTile label="Hosts" fact={observed(5, evidence)} display="5" showSource />);
    expect(screen.getByText(/cov\.inventory/)).toBeInTheDocument();
  });
});

describe('PageSummary', () => {
  it('opens a page with the totals, marking a missing one with a dashed cell', () => {
    const { container } = wrap(
      <PageSummary
        items={[
          { key: 'a', label: 'Services', fact: observed(70, evidence), display: '70' },
          { key: 'b', label: 'Failing', fact: unavailable('no-telemetry', undefined, evidence), display: '—' },
        ]}
      />,
    );
    const cells = container.querySelectorAll('.pvs-summary__cell');
    expect(cells).toHaveLength(2);
    expect((cells[0] as HTMLElement).dataset.missing).toBeUndefined();
    expect((cells[1] as HTMLElement).dataset.missing).toBe('true');
    // 3.5.0: the platform's SingleValue on screen (the same reading is kept as print-only text).
    expect((cells[0] as HTMLElement).querySelector('[data-testid="single-value-chart-value"]')?.textContent).toBe('70');
  });

  it('renders nothing when there is nothing to summarise', () => {
    const { container } = wrap(<PageSummary items={[]} />);
    expect(container.querySelector('.pvs-summary')).toBeNull();
  });
});

describe('SectionIntro', () => {
  it('is the one h1 of the page, with the stage crumb read from the route', () => {
    wrap(
      <SectionIntro titleKey="p.cov.title" questionKey="p.cov.question" />,
      '/coverage',
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Stage 3 of 9 · Coverage achieved')).toBeInTheDocument();
  });

  it('has no crumb on a route outside the story', () => {
    wrap(<SectionIntro titleKey="p.cov.title" questionKey="p.cov.question" />, '/wrapup');
    expect(screen.queryByText(/Stage \d+ of 10/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders the takeaway as a labelled callout only when asked', () => {
    const { rerender } = wrap(<SectionIntro titleKey="p.cov.title" questionKey="p.cov.question" />, '/coverage');
    expect(screen.queryByLabelText('What to take from this')).not.toBeInTheDocument();

    rerender(
      <AppRoot>
        <MemoryRouter initialEntries={['/coverage']}>
          <StudioProvider>
            <SectionIntro titleKey="p.cov.title" questionKey="p.cov.question" takeawayKey="p.cov.question" />
          </StudioProvider>
        </MemoryRouter>
      </AppRoot>,
    );
    expect(screen.getByLabelText('What to take from this')).toBeInTheDocument();
  });

  it('works without a Router, so a page can be rendered in isolation', () => {
    render(
      <AppRoot>
        <StudioProvider>
          <SectionIntro titleKey="p.cov.title" questionKey="p.cov.question" />
        </StudioProvider>
      </AppRoot>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('translates with the session locale', async () => {
    const Switch = () => {
      const { setLocale } = useStudio();
      return (
        <button type="button" onClick={() => setLocale('pt-BR')}>
          pt
        </button>
      );
    };
    wrap(
      <>
        <SectionIntro titleKey="p.cov.title" questionKey="p.cov.question" />
        <Switch />
      </>,
      '/coverage',
    );
    fireEvent.click(screen.getByRole('button', { name: 'pt' }));
    expect(await screen.findByText('Etapa 3 de 9 · Cobertura alcançada')).toBeInTheDocument();
  });
});

describe('AssistPanel', () => {
  it('renders nothing when there is nothing measured to say', () => {
    const { container } = wrap(<AssistPanel eyebrow="Assist" title="Title" sentences={[]} note="n" />);
    expect(container.querySelector('.pvs-panel')).toBeNull();
  });

  it('is a named aside with an h2 and one list item per sentence', () => {
    wrap(<AssistPanel eyebrow="Assist" title="What to do" sentences={['One.', 'Two.']} note="Source note" />);
    const aside = screen.getByRole('complementary', { name: 'What to do' });
    expect(within(aside).getByRole('heading', { level: 2, name: 'What to do' })).toBeInTheDocument();
    expect(within(aside).getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('ChartFrame', () => {
  it('titles the chart with an h2, shows its role, and traces it to the window and query', () => {
    wrap(
      <ChartFrame
        role="duration"
        title="Time to resolve"
        caption="How to read it"
        provenance="observed"
        evidence={evidence}
        windowLabel="Last 24 hours"
      >
        <div>the chart</div>
      </ChartFrame>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Time to resolve' })).toBeInTheDocument();
    expect(screen.getByText('the chart')).toBeInTheDocument();
    expect(screen.getByText('How to read it')).toBeInTheDocument();
    expect(screen.getByText(/cov\.inventory/)).toBeInTheDocument();
  });
});

describe('MetricCard', () => {
  it('prints the category as given, in sentence case', () => {
    // v2 forced `toUpperCase()`, which shouted and broke for assistive technology.
    wrap(
      <MetricCard
        category="User experience"
        figures={[{ display: '1.7k', label: 'sessions', fact: observed(1700, evidence) }]}
      />,
    );
    expect(screen.getByText('User experience')).toBeInTheDocument();
    expect(screen.queryByText('USER EXPERIENCE')).not.toBeInTheDocument();
  });

  it('renders an unavailable figure as a dash with its reason', () => {
    const { container } = wrap(
      <MetricCard
        category="Security"
        figures={[{ display: '0', label: 'open', fact: unavailable('no-permission', undefined, evidence) }]}
      />,
    );
    expect(container.querySelector('.pvs-figure')?.textContent).toBe('—');
  });
});

describe('HeroBanner', () => {
  it('is the page h1 by default and an h2 when the page already has one', () => {
    const first = wrap(<HeroBanner windowLabel="Last 24 hours" />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    first.unmount();

    wrap(<HeroBanner windowLabel="Last 24 hours" headingAs="h2" />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });
});
