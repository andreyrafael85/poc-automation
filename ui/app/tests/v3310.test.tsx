import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CockpitRow } from '../engine/chart/CockpitRow';

/**
 * 3.3.10 — the Evidence stage on the chart engine (lot 1 of the remaining pages): Services,
 * Infrastructure, Kubernetes and Logs put their main chart beside the Dynatrace Assist in a
 * cockpit row; Services ranks the slowest of the busiest services against the response-time line,
 * Kubernetes the workloads that restart most against the restart line, and its inventory is
 * compact. No query, no scope and no figure is added or removed.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the cockpit row', () => {
  it('draws two tiles side by side and one tile at full width, never an empty column', () => {
    const two = render(
      <CockpitRow data-testid="row">
        <div>chart</div>
        <div>assist</div>
      </CockpitRow>,
    );
    expect(two.getByTestId('row').className).toBe('pvs-cockpit-row');
    expect(two.getByTestId('row').children).toHaveLength(2);

    const one = render(
      <CockpitRow data-testid="alone">
        <div data-testid="chart">chart</div>
        {false}
      </CockpitRow>,
    );
    expect(one.queryByTestId('alone')).toBeNull();
    expect(one.getByTestId('chart')).toBeTruthy();

    const none = render(<CockpitRow>{null}</CockpitRow>);
    expect(none.container.innerHTML).toBe('');
  });
});

describe('the Evidence pages on the engine', () => {
  const pages = {
    'ui/app/pages/ServicesAndTracing.tsx': 'svc-cockpit',
    'ui/app/pages/InfrastructureAndCloud.tsx': 'infra-cockpit',
    'ui/app/pages/KubernetesAndContainers.tsx': 'k8s-cockpit',
    'ui/app/pages/LogsAndDataQuality.tsx': 'logs-cockpit',
  };

  it('put the Assist in a cockpit row beside the main chart, only when it has something to say', () => {
    for (const [file, testId] of Object.entries(pages)) {
      const source = read(file);
      expect(source, file).toContain(`<CockpitRow data-testid="${testId}">`);
      const row = source.slice(source.indexOf(`data-testid="${testId}"`), source.indexOf('</CockpitRow>'));
      expect(row, file).toContain('<AssistPanel');
      expect(row, file).toMatch(/Assist\.length > 0 && \(/);
    }
  });

  it('rank against a line of the assumptions registry, never an invented one', () => {
    // 3.3.15: the panels moved to features/cockpit/panels.tsx (the page and the deck capture share them).
    const panels = read('ui/app/features/cockpit/panels.tsx');
    expect(panels).toContain("assumed('services.latency.attention')");
    expect(panels).toContain("assumed('findings.restarts.min')");
    expect(panels).toContain('<RankedBars');
    expect(read('ui/app/pages/ServicesAndTracing.tsx')).toContain('<SlowestServices />');
    expect(read('ui/app/pages/KubernetesAndContainers.tsx')).toContain('<StableWorkloads />');
  });

  it('say "top N of M" with the exact total beside a capped list, never a sum', () => {
    const panels = read('ui/app/features/cockpit/panels.tsx');
    expect(panels).toContain("t('cockpit.ranked.topOfTotal'");
    expect(panels).toContain("t('cockpit.k8s.restarts.topOfTotal'");
  });

  it('show the Kubernetes estate on one line, the source stated once', () => {
    const k8s = read('ui/app/pages/KubernetesAndContainers.tsx');
    expect(k8s).toContain('<Grid min={130}>');
    expect(k8s).toMatch(/\s+compact\n\s+\/>/);
    expect(k8s).toContain("query: 'k8s.inventory'");
  });
});
