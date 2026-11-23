import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { StudioProvider } from '../config/StudioContext';
import { RingRankPanel } from '../engine/chart/RingRankPanel';

/**
 * 3.3.14 — ring + ranking, the owner's pick from the Automation page, on more pages: Kubernetes,
 * Infrastructure, Digital experience and the PoC timeline. Every ring is a ratio of measured counts
 * from aggregates (never a sum of a capped list); every list says what it is a top of. No query,
 * scope or figure is added or removed.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the ring + ranking panel', () => {
  it('draws the ring beside the titled list', () => {
    render(
      <AppRoot>
        <StudioProvider>
          <RingRankPanel
            data-testid="rr"
            title="Workflows that fail first"
            caption="top 3 of 9"
            ring={{ value: 86.8, valueDisplay: '86.8%', label: 'Executions that succeeded', ariaLabel: 'Success ring', missingLabel: 'Not measured' }}
          >
            <ol>
              <li>Ticket sync</li>
            </ol>
          </RingRankPanel>
        </StudioProvider>
      </AppRoot>,
    );
    const panel = screen.getByTestId('rr');
    expect(panel.querySelector('.pvs-svc-health')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Workflows that fail first' })).toBeTruthy();
    expect(screen.getByText('top 3 of 9')).toBeTruthy();
    expect(screen.getByText('Ticket sync')).toBeTruthy();
  });
});

describe('ring + ranking on the pages', () => {
  it('is used by Automation, Kubernetes, Infrastructure and Digital experience, and the timeline criteria', () => {
    expect(read('ui/app/pages/AutomationAndWorkflows.tsx')).toContain('data-testid="auto-ringrank"');
    // 3.3.15: the three panels live in features/cockpit/panels.tsx, shared with the deck capture.
    const panels = read('ui/app/features/cockpit/panels.tsx');
    for (const id of ['k8s-ringrank', 'infra-ringrank', 'dx-ringrank']) expect(panels).toContain(`data-testid="${id}"`);
    expect(read('ui/app/pages/KubernetesAndContainers.tsx')).toContain('<StableWorkloads />');
    expect(read('ui/app/pages/InfrastructureAndCloud.tsx')).toContain('<HostsAtCeiling />');
    expect(read('ui/app/pages/DigitalExperience.tsx')).toContain('<FrontendErrors />');
    expect(read('ui/app/pages/PocTimeline.tsx')).toContain('<CriteriaPanel results={criteria} ring />');
  });

  it('builds every ring from aggregates and shows none when a count is missing', () => {
    const panels = read('ui/app/features/cockpit/panels.tsx');
    expect(panels).toContain("restartTotals.outcome === 'ok' ? num(restartTotals.records[0], 'workloads') : null");
    expect(panels).toContain("str(record, 'kind') === 'workloads'");
    expect(panels).toContain('view.exact && measuredHosts > 0');
    expect(panels).toContain('summary.overallErrorRatePct === null ? null');
  });
});
