import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CAPTURE_REGISTRY } from '../features/wrapup/captures';

/**
 * 3.3.15 — the chart engine reaches the Tech Wrapup captures: the cockpit panels of 3.3.10–3.3.14
 * are components of their own (`features/cockpit/panels.tsx`), drawn by the page and photographed
 * by the deck — never a second copy of the arithmetic.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the cockpit panels in the deck', () => {
  it('registers the five new captures', () => {
    const ids = CAPTURE_REGISTRY.map((entry) => entry.captureId);
    for (const id of ['services.slowest', 'kubernetes.stable', 'infrastructure.ceiling', 'experience.errors', 'problems.mix']) expect(ids, id).toContain(id);
  });

  it('photographs the very components the pages draw', () => {
    const captures = read('ui/app/features/wrapup/captures.tsx');
    expect(captures).toContain("from '../cockpit/panels'");
    for (const panel of ['<SlowestServices />', '<StableWorkloads />', '<HostsAtCeiling />', '<FrontendErrors />', '<ProblemMix />']) expect(captures, panel).toContain(panel);
  });

  it('keeps the wide panels wide enough for their scales on the slide', () => {
    const width = (id: string) => CAPTURE_REGISTRY.find((entry) => entry.captureId === id)?.width;
    expect(width('experience.errors')).toBeGreaterThanOrEqual(1000);
    for (const id of ['services.slowest', 'kubernetes.stable', 'infrastructure.ceiling']) expect(width(id), id).toBeGreaterThanOrEqual(900);
  });
});
