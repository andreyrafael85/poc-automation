import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { OpenAccess } from '../config/AccessContext';
import { StudioProvider } from '../config/StudioContext';
import { EXAMPLE_ADDRESSES, PREREQ_DOCS, PREREQ_SECTIONS } from '../features/prerequisites/content';
import { PrerequisitesGuide } from '../features/prerequisites/PrerequisitesGuide';
import { entryFor } from '../i18n/strings';

/**
 * 3.4.17 — Settings → Prerequisites, from the owner's feedback of 2026-11-20: a PDF instead of the text file (the
 * drawing, the six cards and the documentation links — never the example addresses), six cards three by two, and the
 * tenant itself first (the free trial and "Get started").
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.documentElement.classList.remove('pvs-printing-prq');
});

describe('the tenant comes first', () => {
  it('opens with how to get the Dynatrace tenant, from the pages the owner gave', () => {
    expect(PREREQ_SECTIONS).toHaveLength(6);
    const tenant = PREREQ_SECTIONS[0];
    expect(tenant?.id).toBe('tenant');
    expect(PREREQ_DOCS.signup.url).toBe('https://www.dynatrace.com/signup/');
    expect(PREREQ_DOCS.getStarted.url).toBe('https://docs.dynatrace.com/docs/discover-dynatrace/get-started');
    expect(tenant?.items.flatMap((item) => item.docs)).toEqual(expect.arrayContaining(['signup', 'getStarted']));
    expect(entryFor('prq.tenant.trial').en).toContain('free 15-day');
    expect(entryFor('prq.tenant.trial')['pt-BR']).toContain('15 dias');
  });

  it('lays the six cards three by two on a wide screen and on the PDF', () => {
    const css = read('ui/app/features/prerequisites/prerequisites.css');
    expect(css).toMatch(/\.pvs-prq-grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.pvs-prq-print \.pvs-prq-grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toContain('size: A4 landscape;');
  });
});

describe('"Download as PDF"', () => {
  it('prints a document of its own — the drawing, six cards and links — and never the example addresses', () => {
    vi.useFakeTimers();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <AppRoot>
        <OpenAccess>
          <StudioProvider>
            <PrerequisitesGuide />
          </StudioProvider>
        </OpenAccess>
      </AppRoot>,
    );
    // On screen the example addresses are drawn (orientation only) and there is no text-file download any more.
    expect(screen.getByTestId('prq-mock').textContent).toContain(EXAMPLE_ADDRESSES[0]);
    expect(screen.queryByTestId('prq-download')).toBeNull();

    fireEvent.click(screen.getByTestId('prq-pdf'));
    const doc = screen.getByTestId('prq-print');
    expect(doc.parentElement).toBe(document.body);
    expect(document.documentElement.classList.contains('pvs-printing-prq')).toBe(true);
    for (const address of EXAMPLE_ADDRESSES) expect(doc.textContent).not.toContain(address);
    expect(doc.querySelectorAll('.pvs-prq-card')).toHaveLength(6);
    expect(doc.querySelector('svg.pvs-prq-diagram')).not.toBeNull();
    expect(doc.querySelectorAll('a[href^="https://docs.dynatrace.com/docs/"]').length).toBeGreaterThan(20);
    expect(doc.querySelector('a[href="https://www.dynatrace.com/signup/"]')).not.toBeNull();
    vi.advanceTimersByTime(400);
    expect(print).toHaveBeenCalledTimes(1);
  });
});
