import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AppRoot } from '@dynatrace/strato-components/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { computeIndex, ratioDomain } from '../features/assessment/coverageIndex';
import type { AssessmentFinding, AssessmentSignals } from '../features/assessment/findings';
import { maturity } from '../features/assessment/maturity';
import { PersonaGuide } from '../features/assessment/PersonaGuide';
import { findingsForPersona, openingFigures, PERSONA_SHOW, PERSONAS, personasOf } from '../features/assessment/personas';
import { docFor } from '../features/assessment/docLinks';
import { EN_TEXT } from '../features/insights/deriveInsights';
import { ALL_KEYS } from '../i18n/strings';

/**
 * 3.4.9 — the conversation guide by audience (proposal §C8 F-08): leadership, SRE and operations, development and
 * security. SE and partner material; no new query, no new figure.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const SIGNALS: AssessmentSignals = {
  hostModes: { fullStack: 28, infra: 6, other: 0, unknown: 0 },
  servicesInModel: 70,
  servicesWithTraffic: 70,
  servicesAboveOnePct: 2,
  clusters: 3,
  clustersWithMetrics: 2,
  webApps: 4,
  frontendsWithRealUsers: 3,
  syntheticMonitors: 6,
  publicDomainServices: 0,
  bizEvents: 100,
  saturatedHosts: 4,
  resolved: { problems: 6842, meanHours: 6.9 },
  logRecords: 1_000_000,
  logRecordsWithContext: 7_000,
  topology: null,
  vulnerabilities: { total: 120, actNow: 2, critical: 6 },
  ownedServices: 10,
  thirdPartyTools: ['Datadog', 'Splunk'],
  vitals: null,
  workflows: { workflows: 11, executions: 1000, succeeded: 981 },
  cloudProviders: null,
};

const finding = (rule: string, cls: AssessmentFinding['cls'] = 'warning'): AssessmentFinding => ({
  rule,
  cls,
  kind: 'finding',
  title: `Title ${rule}`,
  observation: '',
  impact: '',
  recommendation: '',
  capability: 'Capability',
  capabilityKey: 'asm.cap.tracing',
  evidence: [],
  category: 'performance',
  impactLevel: 'high',
  effort: 'low',
  drilldown: '/',
});

const INDEX = computeIndex([{ id: 'infra', queryIds: [], state: ratioDomain(9, 10, ['ok']) }]);

describe('every rule has an audience, and every audience its content', () => {
  it('gives every rule with a question at least one audience', () => {
    const rules = ALL_KEYS.filter((key) => key.startsWith('asm.q.')).map((key) => key.slice('asm.q.'.length));
    expect(rules.length).toBeGreaterThan(30);
    for (const rule of rules) expect(personasOf(rule).length, rule).toBeGreaterThan(0);
  });

  it('has a focus line and three opening questions per audience, and documentation for what to show', () => {
    for (const persona of PERSONAS) {
      for (const key of [`asm.persona.${persona}.focus`, `asm.persona.${persona}.q1`, `asm.persona.${persona}.q2`, `asm.persona.${persona}.q3`]) {
        expect(ALL_KEYS, key).toContain(key);
      }
      for (const capability of PERSONA_SHOW[persona]) expect(docFor(capability), capability).not.toBeNull();
    }
  });

  it('brings every critical finding to the leadership, whatever its area', () => {
    const findings = [finding('ASM-13', 'critical'), finding('ASM-26', 'warning')];
    expect(findingsForPersona('executive', findings).map((entry) => entry.rule)).toEqual(['ASM-13']);
    expect(findingsForPersona('security', findings).map((entry) => entry.rule)).toEqual(['ASM-26']);
  });
});

describe('the opening figures are measured, never estimated', () => {
  it('uses only what the Assessment read, and leaves out what it could not', () => {
    const reading = maturity(SIGNALS, 80);
    const input = { signals: SIGNALS, index: INDEX, valueEvents: reading.level, findings: [finding('ASM-13', 'critical')] };
    const executive = openingFigures('executive', input, String);
    expect(executive.map((figure) => figure.key)).toEqual(['asm.persona.fig.index', 'asm.persona.fig.valueEvents', 'asm.persona.fig.critical', 'asm.persona.fig.tools']);
    expect(executive.find((figure) => figure.key === 'asm.persona.fig.tools')?.params.count).toBe('2');
    const security = openingFigures('security', { ...input, signals: { ...SIGNALS, vulnerabilities: null } }, String);
    expect(security).toEqual([]);
    expect(openingFigures('dev', input, String).find((figure) => figure.key === 'asm.persona.fig.logContext')?.params.pct).toBe('0.7');
  });
});

describe('the guide on the page', () => {
  const renderGuide = () =>
    render(
      <AppRoot>
        <PersonaGuide
          findings={[finding('ASM-04', 'critical'), finding('ASM-26'), finding('ASM-14')]}
          signals={SIGNALS}
          index={INDEX}
          valueEvents={12}
          t={EN_TEXT.t}
          formatNumber={EN_TEXT.formatNumber}
        />
      </AppRoot>,
    );

  it('lists every finding with its audiences under "All", and stays off paper by default', () => {
    renderGuide();
    const table = screen.getByTestId('asm-guide-table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(table.textContent).toContain('Security');
    expect(screen.getByTestId('asm-guide').parentElement?.getAttribute('data-print-hide')).toBe('true');
  });

  it('shows one audience’s guide when chosen, and prints it on request', () => {
    renderGuide();
    fireEvent.click(screen.getByRole('radio', { name: 'Security' }));
    const persona = screen.getByTestId('asm-persona-security');
    expect(persona.textContent).toContain('What security cares about');
    expect(persona.textContent).toContain('Open vulnerabilities: 120 (act now: 2; critical: 6)');
    expect(within(screen.getByTestId('asm-guide-table')).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Print this guide with the PDF' }));
    expect(screen.getByTestId('asm-guide').parentElement?.getAttribute('data-print-hide')).toBeNull();
  });

  it('replaces the 3.4.1 guide on the Assessment, for the SE and the partner only', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect(page).toContain('<PersonaGuide');
    expect(page).toContain('{technical && guideRows.length > 0 && (');
  });
});
