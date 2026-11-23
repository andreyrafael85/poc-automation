import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { StatTile } from '../components/StatTile';
import { StudioProvider } from '../config/StudioContext';
import { observed } from '../models/provenance';
import { PRINT_STYLES } from '../pages/ValueReport';

/**
 * Guards the PDF print flow.
 *
 * Context: two real defects reached a customer's downloaded report. Glass depth
 * (`backdrop-filter`) made Chrome stop after page one, and gradient figures
 * printed invisible because their fill was transparent. Both are the kind of
 * regression a refactor reintroduces silently — the app renders perfectly on
 * screen while the PDF breaks.
 *
 * They are guarded in two different ways now:
 *
 *  - **Glass depth** is still a runtime hazard (a Strato component can bring a
 *    shadow or a clip of its own), so the print stylesheet keeps its rules that
 *    strip depth and let ancestors expand. jsdom cannot print, so the first
 *    describe block asserts the rules themselves.
 *  - **Gradient ink** is prevented by construction. v2 needed a print patch
 *    (`[data-gradient-number]`) because a gradient figure had no solid colour to
 *    fall back to. A `Figure` has solid ink and nothing else, so there is nothing
 *    to patch: the second block asserts that no figure is drawn with a transparent
 *    fill, that nothing carries the old marker, and that the stylesheet no longer
 *    carries the workaround (a leftover would hide a regression, not prevent one).
 */

describe('print stylesheet', () => {
  it('neutralises glass depth so Chrome paginates past the first page', () => {
    expect(PRINT_STYLES).toContain('@media print');
    expect(PRINT_STYLES).toMatch(/backdrop-filter:\s*none/);
    expect(PRINT_STYLES).toMatch(/box-shadow:\s*none/);
    expect(PRINT_STYLES).toMatch(/overflow:\s*visible/);
  });

  it('hides screen-only chrome from the printed document', () => {
    expect(PRINT_STYLES).toMatch(/\[data-print-hide\]\s*\{\s*display:\s*none/);
  });

  it('no longer carries a patch for gradient ink, because no figure is gradient-filled', () => {
    expect(PRINT_STYLES).not.toContain('data-gradient-number');
    expect(PRINT_STYLES).not.toContain('text-fill-color');
  });

  it('lets ancestors expand instead of scroll, and sets a print margin', () => {
    expect(PRINT_STYLES).toMatch(/html,\s*body\s*\{[^}]*overflow:\s*visible/);
    expect(PRINT_STYLES).toContain('@page');
  });
});

const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

const evidence = { queryId: 'cov.inventory', source: 'entities', timeframe: 'last 24 hours' };

/** True when the element, or anything under it, sets an inline style with a transparent value. */
const hasTransparentInk = (element: Element): boolean =>
  [element, ...Array.from(element.querySelectorAll('[style]'))].some((node) =>
    (node.getAttribute('style') ?? '').includes('transparent'),
  );

describe('printed figures are solid ink by construction', () => {
  it('a neutral StatTile number is plain solid ink', () => {
    // v2 drew a neutral figure with a transparent-fill gradient, which printed
    // invisible. A Figure has one treatment: solid ink.
    const { container } = wrap(
      <StatTile label="Entities" fact={observed(1204, evidence)} display="1,204" status="neutral" />,
    );
    expect(container.querySelector('[data-gradient-number]')).toBeNull();

    const figure = container.querySelector('.pvs-figure');
    expect(figure).not.toBeNull();
    expect(figure?.textContent).toContain('1,204');
    expect(hasTransparentInk(figure as Element)).toBe(false);
  });

  it('a warning StatTile number is solid ink and carries no gradient marker', () => {
    // A warning figure is coloured because that colour is the meaning; it is
    // still a solid ink, never a gradient.
    const { container } = wrap(
      <StatTile label="Exposure" fact={observed(42, evidence)} display="42" status="warning" />,
    );
    expect(container.querySelector('[data-gradient-number]')).toBeNull();

    const figure = container.querySelector('.pvs-figure');
    expect(figure).not.toBeNull();
    expect(figure?.textContent).toContain('42');
    expect(hasTransparentInk(figure as Element)).toBe(false);
  });
});
