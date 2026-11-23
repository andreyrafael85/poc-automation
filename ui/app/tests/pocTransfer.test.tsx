import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { OpenAccess } from '../config/AccessContext';
import { EMPTY_PRIVATE, EMPTY_SHARED } from '../config/persistence';
import { POC_FILE_FORMAT, pocFileContent, pocFileName, readPocFile } from '../config/pocTransfer';
import { StudioProvider, useStudio } from '../config/StudioContext';
import type { SharedSlice } from '../config/useTenantPersistence';
import { Settings } from '../pages/Settings';

/**
 * 3.3.6: the app moved to the id `my.poc.value.studio`; App State is kept per app id, so the PoC
 * crosses from the old install with a file (Settings → "Move this PoC"). These pin the file — what
 * it carries, what it never carries, what an import refuses — and the flow in Settings.
 */

const SHARED: SharedSlice = {
  parameters: { ...EMPTY_SHARED.parameters, customerName: 'Acme Corp', engagementName: 'Observability PoC', scopeDescription: 'Checkout and payments' },
  pillars: ['resilience', 'productivity'],
  poc: {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    criteria: [{ id: 'c1', metric: 'manual', operator: '>=', target: null, text: 'Root cause without a war room', origin: 'kick-off', manualStatus: 'met' }],
    dashboard: { id: 'doc-1', name: 'Value of the PoC — Acme', createdAt: '2026-11-16T20:00:00.000Z', createdBy: 'se@example.com', shared: true },
    specialtyDashboards: { sre: { id: 'doc-2', name: 'Operations — Acme', createdAt: '2026-11-16T20:05:00.000Z', createdBy: 'se@example.com', shared: false } },
  },
};
const PRIV = { ...EMPTY_PRIVATE, costModel: { ...EMPTY_PRIVATE.costModel, ratePerHour: 120, currencyLabel: 'USD' }, locale: 'pt-BR' as const };

const file = () => pocFileContent({ shared: SHARED, priv: PRIV, appVersion: '3.3.6', exportedAt: '2026-11-17T01:00:00.000Z' });

describe('the PoC file', () => {
  it('carries the PoC and the SE’s working figures, and reads back the same', () => {
    const reading = readPocFile(file());
    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.shared).toEqual(SHARED);
    expect(reading.priv?.costModel.ratePerHour).toBe(120);
    expect(reading.priv?.locale).toBe('pt-BR');
    expect(reading.appVersion).toBe('3.3.6');
    expect((JSON.parse(file()) as { format: string }).format).toBe(POC_FILE_FORMAT);
  });

  it('never carries the partner password, the partners or a tenant id', () => {
    const text = file();
    expect(text).not.toMatch(/verifier|password|partners|pbkdf2|access/i);
    expect(text).not.toMatch(/apps\.dynatrace\.com|\.v31/);
  });

  it('names the file after the customer and the day', () => {
    expect(pocFileName('Acme Corp', new Date('2026-11-17T01:00:00Z'))).toBe('poc-acme-corp-2026-11-17.json');
    expect(pocFileName('São João Ltda.', new Date('2026-11-17T01:00:00Z'))).toBe('poc-sao-joao-ltda-2026-11-17.json');
    expect(pocFileName('', new Date('2026-11-17T01:00:00Z'))).toBe('poc-value-studio-2026-11-17.json');
  });

  it('refuses what is not a PoC file, a newer format, an empty PoC and an oversized file', () => {
    expect(readPocFile('not json')).toEqual({ ok: false, reason: 'notJson' });
    expect(readPocFile('{"format":"something.else","formatVersion":1}')).toEqual({ ok: false, reason: 'notPocFile' });
    expect(readPocFile(file().replace('"formatVersion": 2', '"formatVersion": 3'))).toEqual({ ok: false, reason: 'newerFormat' });
    const empty = pocFileContent({ shared: EMPTY_SHARED, priv: EMPTY_PRIVATE, appVersion: '3.3.6', exportedAt: '' });
    expect(readPocFile(empty)).toEqual({ ok: false, reason: 'empty' });
    expect(readPocFile(`${file()}${' '.repeat(2 * 1024 * 1024)}`)).toEqual({ ok: false, reason: 'tooLarge' });
  });

  it('reads an imported file as untrusted input, through the App State parsers', () => {
    const doc = JSON.parse(file()) as { shared: { parameters: Record<string, unknown>; pillars: unknown[] } };
    doc.shared.parameters['customerLogoDataUrl'] = 'javascript:alert(1)';
    doc.shared.parameters['customerName'] = `  ${'x'.repeat(500)}  `;
    doc.shared.pillars = ['resilience', 'not-a-pillar'];
    const reading = readPocFile(JSON.stringify(doc));
    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.shared.parameters.customerLogoDataUrl).toBeNull();
    expect(reading.shared.parameters.customerName).toHaveLength(200);
    expect(reading.shared.pillars).toEqual(['resilience']);
  });
});

const Probe = () => {
  const { parameters, pocPlan, costModel } = useStudio();
  return <div data-testid="probe">{JSON.stringify({ customer: parameters.customerName, criteria: pocPlan.criteria.length, sre: pocPlan.specialtyDashboards?.sre?.id ?? null, rate: costModel.ratePerHour })}</div>;
};

describe('Settings → Move this PoC', () => {
  it('imports a PoC file only after the second click, and the form shows what was imported', async () => {
    const user = userEvent.setup();
    render(
      <AppRoot>
        <OpenAccess>
          <StudioProvider>
            <Settings />
            <Probe />
          </StudioProvider>
        </OpenAccess>
      </AppRoot>,
    );
    expect(screen.getByTestId('poc-transfer')).toBeTruthy();
    const input = screen.getByTestId('transfer-file');
    fireEvent.change(input, { target: { files: [new File([file()], 'poc-acme-corp.json', { type: 'application/json' })] } });
    expect(await screen.findByText('Import the PoC of Acme Corp?')).toBeTruthy();
    expect(screen.getByText(/1 success criteria · 2 dashboard references/)).toBeTruthy();
    // Nothing changed yet.
    expect(JSON.parse(screen.getByTestId('probe').textContent ?? '{}')).toMatchObject({ customer: '', criteria: 0 });
    await user.click(screen.getByTestId('transfer-confirm'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('probe').textContent ?? '{}')).toEqual({ customer: 'Acme Corp', criteria: 1, sre: 'doc-2', rate: 120 }));
    // The SE's working figures came with it, the language among them: the confirmation is in pt-BR.
    expect(screen.getByText('A PoC de Acme Corp chegou')).toBeTruthy();
    // The form re-mounted on the imported values.
    const field = document.querySelector<HTMLInputElement>('input[aria-labelledby="customer-name-label"]');
    expect(field?.value).toBe('Acme Corp');
    // It renders the whole Settings page: 5.4 s under the full suite (default limit 5 s), about 2 s alone (3.4.16).
  }, 30_000);

  it('says why a file is refused', async () => {
    render(
      <AppRoot>
        <OpenAccess>
          <StudioProvider>
            <Settings />
          </StudioProvider>
        </OpenAccess>
      </AppRoot>,
    );
    fireEvent.change(screen.getByTestId('transfer-file'), { target: { files: [new File(['{"hello":1}'], 'x.json')] } });
    expect(await screen.findByText('This file cannot be imported')).toBeTruthy();
  });
});

describe('the app id (3.3.6; my.poc.automation since 3.4.14)', () => {
  it('is my.poc.automation — no version in the address', () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'app.config.json'), 'utf8')) as { app: { id: string } };
    expect(manifest.app.id).toBe('my.poc.automation');
  });
});
