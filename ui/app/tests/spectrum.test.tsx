import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { StudioProvider } from '../config/StudioContext';
import { BrandGlyph } from '../components/spectrum/BrandGlyph';
import { GaugeRing } from '../components/spectrum/GaugeRing';
import { HeatCalendar } from '../components/spectrum/HeatCalendar';
import { KpiHero } from '../components/spectrum/KpiHero';
import { ProviderMark } from '../components/spectrum/ProviderMark';
import { SeverityBar } from '../components/spectrum/SeverityBar';
import { StatusRadar } from '../components/spectrum/StatusRadar';
import { techGlyph } from '../components/spectrum/TechChips';
import { layoutStack, linkWidth, STACK_GEOMETRY } from '../models/stackMap';
import type { ArrivalCalendar } from '../models/problemTimeline';
import { derived, observed, unavailable } from '../models/provenance';

/**
 * The "Value Spectrum" components (3.2.1) are a skin over the evidence rules, not an exception
 * to them. These tests hold each component to the rules the flat 3.1 components kept: an
 * unmeasured value is a dash with its reason, never a zero; nothing is drawn that was not read;
 * every mark that carries a number also says it in text.
 */

const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );
const evidence = { queryId: 'cov.inventory', source: 'coverage', timeframe: 'last 24 hours' };

describe('GaugeRing', () => {
  it('draws the arc for a measured share and says the reading with the name', () => {
    const { container } = wrap(
      <GaugeRing value={50} valueDisplay="50%" label="Closed" ariaLabel="Problems closed" missingLabel="not measured" />,
    );
    // 3.6.2: the arc is the app's arc of segments (was the platform's GaugeChart), its reading the app's.
    expect(container.querySelector('.pvs-gauge__arc .pvs-sarc')?.getAttribute('data-pvs-arc')).toBe('15');
    expect(container.querySelector('.pvs-gauge__reading')?.textContent).toBe('50%');
    expect(container.querySelector('.pvs-gauge')?.getAttribute('data-value')).toBe('50%');
    expect(screen.getByRole('img', { name: 'Problems closed: 50%' })).toBeInTheDocument();
  });

  it('draws no arc and announces "not measured" when the value is missing — never 0 %', () => {
    const { container } = wrap(<GaugeRing value={null} label="Closed" ariaLabel="Problems closed" missingLabel="not measured" />);
    expect(container.querySelector('.pvs-gauge__arc')).toBeNull();
    expect(container.querySelector('.pvs-sarc')).toBeNull();
    expect(container.querySelector('.pvs-gauge__value')?.getAttribute('data-missing')).toBe('true');
    expect(screen.getByRole('img', { name: 'Problems closed: not measured' })).toBeInTheDocument();
  });

  it('treats an unavailable fact as missing even when a number was passed', () => {
    const { container } = wrap(
      <GaugeRing
        value={80}
        label="Closed"
        ariaLabel="Problems closed"
        missingLabel="not measured"
        fact={unavailable('failed', undefined, evidence)}
      />,
    );
    expect(container.querySelector('.pvs-gauge__value')?.textContent).toBe('—');
  });

  it('draws no gradient and no glow any more — one accent (3.5.0, DN-6), on the arc of segments (3.6.2)', () => {
    const { container } = wrap(
      <>
        <GaugeRing value={10} label="A" ariaLabel="A" missingLabel="-" />
        <GaugeRing value={20} label="B" ariaLabel="B" missingLabel="-" />
      </>,
    );
    expect(container.querySelectorAll('linearGradient')).toHaveLength(0);
    expect(container.querySelectorAll('.pvs-sarc')).toHaveLength(2);
  });
});

describe('KpiHero', () => {
  it('paints a measured number and badges its class', () => {
    const { container } = wrap(<KpiHero eyebrow="Entities" value="1,883" fact={derived(1883, evidence, 'sum')} />);
    // 3.5.2: the card is a StratoKpi (the platform's SingleValue) with its family's accent.
    expect(container.querySelector('[data-testid="single-value-chart-value"]')?.textContent).toBe('1,883');
    expect(container.querySelector('.pvs-kpi')?.getAttribute('data-accent')).toBe('true');
    expect(container.querySelector('button[aria-label^="Evidence class"]')?.getAttribute('aria-label')).toMatch(/Derived/);
  });

  it('shows a dash and the reason for an unavailable fact, and draws no sparkline', () => {
    const { container } = wrap(
      <KpiHero
        eyebrow="Active problems"
        value="12"
        fact={unavailable('no-permission', undefined, evidence)}
        spark={{ points: [1, 2, 3], label: 'trend' }}
      />,
    );
    expect(container.querySelector('.pvs-skpi__dash')?.textContent).toBe('—');
    expect(container.querySelector('.pvs-kpi')?.getAttribute('data-missing')).toBe('true');
    expect(screen.queryByRole('img', { name: 'trend' })).toBeNull();
  });

  it('draws a sparkline only from two or more points, and a flat series through the middle', () => {
    const { rerender } = wrap(
      <KpiHero eyebrow="P" value="3" fact={observed(3, evidence)} spark={{ points: [4], label: 'trend' }} />,
    );
    expect(screen.queryByRole('img', { name: 'trend' })).toBeNull();
    rerender(
      <AppRoot>
        <StudioProvider>
          <KpiHero eyebrow="P" value="3" fact={observed(3, evidence)} spark={{ points: [4, 4, 4], label: 'trend' }} />
        </StudioProvider>
      </AppRoot>,
    );
    // 3.5.2: the platform's Sparkline over the measured series.
    expect(screen.getByRole('img', { name: 'trend' }).querySelector('[data-dt-component="Sparkline"], canvas, div')).not.toBeNull();
  });
});

describe('layoutStack', () => {
  it('leaves out what was measured as zero and keeps what could not be read', () => {
    const layout = layoutStack([
      { id: 'web', count: 3 },
      { id: 'mobile', count: 0 },
      { id: 'services', count: null },
      { id: 'processes', count: 120 },
      { id: 'hosts', count: 10 },
    ]);
    const ids = layout?.nodes.map((node) => node.id);
    expect(ids).toEqual(['web', 'services', 'processes', 'hosts']);
    expect(layout?.nodes.find((node) => node.id === 'services')?.count).toBeNull();
  });

  it('draws nothing when nothing on the map was measured', () => {
    expect(layoutStack([{ id: 'web', count: null }, { id: 'hosts', count: 0 }])).toBeNull();
  });

  it('links only nodes that are both on the map, along the hierarchy', () => {
    const layout = layoutStack([
      { id: 'web', count: 3 },
      { id: 'services', count: 70 },
      { id: 'hosts', count: 10 },
    ]);
    // web → services exists; services → processes does not, because processes is not on the map.
    expect(layout?.links.map((link) => `${link.from.id}>${link.to.id}`)).toEqual(['web>services']);
  });

  it('widens a link with the size of the level it leaves, within its bounds', () => {
    expect(linkWidth(1, 1000)).toBeLessThan(linkWidth(100, 1000));
    expect(linkWidth(1000, 1000)).toBeCloseTo(STACK_GEOMETRY.maxLink);
    expect(linkWidth(null, 1000)).toBe(STACK_GEOMETRY.minLink);
  });
});

describe('SeverityBar', () => {
  it('gives no width to an empty level and announces every level it draws', () => {
    const { container } = wrap(
      <SeverityBar
        label="Vulnerabilities by severity"
        segments={[
          { level: 'critical', count: 0, label: 'Critical', display: '0' },
          { level: 'high', count: 3, label: 'High', display: '3' },
          { level: 'low', count: 1, label: 'Low', display: '1' },
        ]}
      />,
    );
    expect(container.querySelectorAll('.pvs-sev__seg')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Vulnerabilities by severity: High 3, Low 1' })).toBeInTheDocument();
  });

  it('is not drawn at all when there is nothing to show', () => {
    const { container } = wrap(<SeverityBar label="x" segments={[{ level: 'high', count: 0, label: 'High', display: '0' }]} />);
    expect(container.querySelector('.pvs-sev__bar')).toBeNull();
  });
});

describe('StatusRadar', () => {
  const rungs = ['Blocked', 'Worth reviewing', 'Partial', 'Working', 'Demonstrated'] as const;

  it('puts no point on a dimension that was not read and ranks the worst first', () => {
    const { container } = wrap(
      <StatusRadar
        label="Status profile"
        rungLabels={[...rungs]}
        axes={[
          { id: 'a', label: 'Coverage', status: 'ideal', statusLabel: 'Demonstrated' },
          { id: 'b', label: 'Security', status: null, statusLabel: 'Not read' },
          { id: 'c', label: 'Automation', status: 'warning', statusLabel: 'Worth reviewing' },
          { id: 'd', label: 'Governance', status: 'good', statusLabel: 'Working' },
        ]}
      />,
    );
    expect(container.querySelectorAll('.pvs-radar__dot')).toHaveLength(3);
    const ranked = Array.from(container.querySelectorAll('.pvs-rank__row')).map((row) => row.textContent);
    expect(ranked[0]).toContain('Security');
    expect(ranked[1]).toContain('Automation');
    expect(ranked.at(-1)).toContain('Coverage');
  });

  it('needs three dimensions to draw a profile', () => {
    const { container } = wrap(
      <StatusRadar
        label="x"
        rungLabels={[...rungs]}
        axes={[{ id: 'a', label: 'A', status: 'good', statusLabel: 'Working' }]}
      />,
    );
    expect(container.querySelector('.pvs-radar')).toBeNull();
  });
});

describe('glyphs', () => {
  it('maps a runtime to its own mark and never lends it to a framework', () => {
    expect(techGlyph('JAVA')).toBe('java');
    expect(techGlyph('NODE_JS')).toBe('nodejs');
    expect(techGlyph('DOTNET')).toBe('dotnet');
    expect(techGlyph('APACHE_KAFKA')).toBe('kafka');
    expect(techGlyph('SPRINGBOOT')).toBeNull();
    // 3.2.3: Tomcat has its own mark in the gallery now; it still never borrows Java's.
    expect(techGlyph('TOMCAT')).toBe('tomcat');
    expect(techGlyph('SPRING')).toBeNull();
  });

  it('hides a decorative glyph from assistive technology and names a labelled one', () => {
    const { container } = wrap(
      <>
        <BrandGlyph name="aws" />
        <BrandGlyph name="kubernetes" label="Kubernetes" />
      </>,
    );
    expect(container.querySelector('svg.pvs-glyph')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('img', { name: 'Kubernetes' })).toBeInTheDocument();
  });

  it('names a provider mark with the provider’s full name unless the name is printed beside it', () => {
    wrap(
      <>
        <ProviderMark provider="AWS" />
        <ProviderMark provider="GCP" decorative />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Amazon Web Services' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Google Cloud' })).toBeNull();
  });
});

describe('HeatCalendar', () => {
  const day = (date: number, counts: (number | null)[]) => ({
    date,
    cells: counts.map((count, index) => (count === null ? null : { start: date + index * 21_600_000, count })),
    total: counts.reduce<number>((sum, count) => sum + (count ?? 0), 0),
  });
  const first = day(Date.UTC(2026, 8, 1), [null, 2, 7, 1]);
  const second = day(Date.UTC(2026, 8, 2), [0, 3, null, null]);
  const calendar: ArrivalCalendar = {
    periods: [0, 6, 12, 18],
    days: [first, second],
    max: 7,
    total: 13,
    peak: first.cells[2] ?? null,
    busiestDay: first,
  };

  const renderCalendar = () =>
    wrap(
      <HeatCalendar
        calendar={calendar}
        caption="When problems begin"
        dayHeader="Day"
        totalHeader="That day"
        dayLabel={(ms) => `D${new Date(ms).getUTCDate()}`}
        periodLabel={(hour) => `${hour}h`}
        cellLabel={(dayName, period, count) => `${dayName} ${period}: ${count}`}
        outsideLabel="outside the 7 days"
        legendLow="none"
        legendHigh="busiest (7)"
        format={(value) => String(value)}
      />,
    );

  it('is a table a reader can walk by day and period, with every count as text', () => {
    renderCalendar();
    expect(screen.getByRole('table', { name: 'When problems begin' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Day', '0h', '6h', '12h', '18h', 'That day']);
    expect(screen.getByRole('rowheader', { name: 'D1' })).toBeInTheDocument();
    expect(screen.getByTitle('D1 12h: 7').textContent).toBe('7');
    // A measured zero is printed as 0, not left empty.
    expect(screen.getByTitle('D2 0h: 0').textContent).toBe('0');
  });

  it('marks the busiest period and says "outside" rather than zero where nothing was asked', () => {
    const { container } = renderCalendar();
    expect(container.querySelector('[data-peak="true"]')?.textContent).toBe('7');
    expect(screen.getAllByText('outside the 7 days').length).toBe(3);
    expect(container.querySelector('tr[data-busiest="true"] th')?.textContent).toBe('D1');
  });
});
