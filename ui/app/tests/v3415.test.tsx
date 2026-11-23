import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeSnippet } from '@dynatrace/strato-components/content';
import { AppRoot } from '@dynatrace/strato-components/core';

import { ProductSignet, signetFor } from '../components/ProductSignet';
import { entryFor } from '../i18n/strings';

/**
 * 3.4.15 — Strato 3.18 (owner's order to implement the design plan "com base nas suas recomendações"): the packages,
 * the explicit copy action of the DQL blocks, the product signets beside the page titles, the coverage chart's
 * caption — and every reading and figure as before.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('Strato 3.18', () => {
  it('is the installed design system, with its tokens 1.8.1 and icons 2.7.0', () => {
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies['@dynatrace/strato-components']).toBe('^3.18.0');
    expect(pkg.dependencies['@dynatrace/strato-design-tokens']).toBe('^1.8.1');
    expect(pkg.dependencies['@dynatrace/strato-icons']).toBe('^2.7.0');
    const installed = JSON.parse(read('node_modules/@dynatrace/strato-components/package.json')) as { version: string };
    expect(installed.version).toBe('3.18.0');
  });

  it('copies a DQL block through the explicit actions menu and still shows the query itself', () => {
    render(
      <AppRoot>
        <CodeSnippet language="dql" showLineNumbers={false} size="condensed">
          <CodeSnippet.ActionsMenu>
            <CodeSnippet.Copy />
          </CodeSnippet.ActionsMenu>
          {'fetch logs | summarize count()'}
        </CodeSnippet>
      </AppRoot>,
    );
    expect(document.body.textContent).toContain('fetch logs | summarize count()');
    for (const file of ['ui/app/components/DqlDisclosure.tsx', 'ui/app/components/QueryStateBoundary.tsx', 'ui/app/pages/ProblemsRca.tsx', 'ui/app/pages/SecurityAndRuntimeRisk.tsx']) {
      expect(read(file), file).toContain('<CodeSnippet.Copy />');
    }
  });
});

describe('the Dynatrace product beside each capability page', () => {
  it('maps each capability route to its product signet, and leaves the story pages without one', () => {
    for (const route of ['/problems', '/rca', '/services', '/infrastructure', '/logs', '/security', '/experience', '/business', '/automation', '/topology']) {
      expect(signetFor(route), route).toBeDefined();
    }
    for (const route of ['/', '/settings', '/report', '/wrapup', '/executive', '/value']) expect(signetFor(route), route).toBeUndefined();
  });

  it('is decorative: hidden from assistive technology, the title says it in words', () => {
    render(<ProductSignet pathname="/problems" />);
    const signet = screen.getByTestId('product-signet');
    expect(signet.getAttribute('aria-hidden')).toBe('true');
    expect(read('ui/app/components/SectionIntro.tsx')).toContain('{inRouter && <RouteSignet />}');
  });
});

describe('the coverage chart explains its radial bars', () => {
  it('no longer describes the old radar’s spokes', () => {
    expect(entryFor('asm.radar.caption').en).toContain('Each sector is a domain');
    expect(entryFor('asm.radar.caption')['pt-BR']).toContain('Cada setor é um domínio');
    expect(entryFor('asm.radar.caption').en).not.toContain('spoke');
  });
});
