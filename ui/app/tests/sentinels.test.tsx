import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { cellContent } from '../components/CatalogTable';
import { BarList } from '../components/viz/BarList';
import { StudioProvider } from '../config/StudioContext';
import { entryFor, type Locale, type StringKey } from '../i18n/strings';
import { localizeSentinel } from '../utils/sentinels';

/**
 * Row transformers build English fallbacks ("Not reported", "Unnamed host"…) outside any
 * component, and other code compares against the literals. What the customer reads is
 * translated where it is displayed; this pins that, and that a missing cell is a dash.
 */

const tIn = (locale: Locale) => (key: StringKey) => entryFor(key)[locale] ?? entryFor(key).en;

describe('localizeSentinel', () => {
  it('translates data fallbacks and leaves real values alone', () => {
    const pt = tIn('pt-BR');
    expect(localizeSentinel('Not reported', pt)).toBe('Não informado');
    expect(localizeSentinel('Unnamed host', pt)).toBe('Host sem nome');
    expect(localizeSentinel('Under maintenance', pt)).toBe('Em manutenção');
    expect(localizeSentinel('checkout-service', pt)).toBe('checkout-service');
  });

  it('translates Yes/No only where a cell asks for it', () => {
    const pt = tIn('pt-BR');
    expect(localizeSentinel('No', pt)).toBe('No');
    expect(localizeSentinel('No', pt, { booleans: true })).toBe('Não');
  });

  it('is the identity in English', () => {
    expect(localizeSentinel('Not reported', tIn('en'))).toBe('Not reported');
  });
});

describe('sentinels on screen', () => {
  const cell = (value: unknown, locale: Locale = 'pt-BR') =>
    cellContent(
      { value, format: (v) => `strato:${String(v)}`, detectLinks: (v) => v },
      tIn(locale),
      (n) => n.toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US'),
    );

  it('a default table cell shows a dash for an absent value, never a blank', () => {
    expect(cell(null)).toBe('—');
    expect(cell(undefined)).toBe('—');
    expect(cell('')).toBe('—');
  });

  it('a default table cell translates the fallback and Yes/No, and keeps a zero', () => {
    expect(cell('Not reported')).toBe('Não informado');
    expect(cell('No')).toBe('Não');
    expect(cell(0)).toBe('0');
    // A number is the app's formatting, never Strato's `format` (which logs a warning and prints bare digits).
    expect(cell(1594208)).toBe('1.594.208');
    expect(cell(1594208, 'en')).toBe('1,594,208');
    expect(cell(true)).toBe('strato:true');
    expect(cell('checkout-service')).toBe('checkout-service');
  });

  it('a bar-list label is translated when it is a fallback and untouched when it is not', () => {
    render(
      <AppRoot>
        <MemoryRouter>
          <StudioProvider>
            <BarList
              ariaLabel="Share"
              items={[
                { key: 'a', label: 'Alpha', value: 3, display: '3' },
                { key: 'b', label: 'Uncategorised', value: 1, display: '1' },
              ]}
            />
          </StudioProvider>
        </MemoryRouter>
      </AppRoot>,
    );
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Uncategorised')).toBeTruthy(); // default locale is English
  });
});
