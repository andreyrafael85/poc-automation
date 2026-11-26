import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { APP_DISPLAY_NAME, APP_TAGLINE } from '../config/appInfo';
import { EMPTY_PRIVATE, EMPTY_SHARED } from '../config/persistence';
import { POC_FILE_VERSION, pocFileContent, readPocFile } from '../config/pocTransfer';
import type { SharedSlice } from '../config/useTenantPersistence';
import { parsePlan } from '../features/assessment/actionPlan';
import { computeIndex, ratioDomain } from '../features/assessment/coverageIndex';
import { addSnapshot, EMPTY_HISTORY, toSnapshot } from '../features/assessment/history';
import { ALL_KEYS, entryFor, translate } from '../i18n/strings';

/**
 * 3.4.14 — "PoC Automation 3.0" (owner's order of 2026-11-19): the name in the app, the browser tab and every credit,
 * the address /ui/apps/my.poc.automation without the "3.0", versions kept at 3.4.x — and "Move this PoC" carrying
 * the Coverage readings and the action plan, so nothing stays behind at the old address.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the name and the address', () => {
  it('is "PoC Automation 3.0" in the manifest, at my.poc.automation, still versioned 3.4.x', () => {
    const manifest = JSON.parse(read('app.config.json')) as { app: { id: string; name: string; version: string } };
    expect(manifest.app.name).toBe('PoC Automation 3.0');
    expect(manifest.app.id).toBe('my.poc.automation');
    expect(manifest.app.version).toMatch(/^3\.[45678]\.\d+$/);
    // The platform refuses a manifest whose description passes 80 characters (the first 3.4.15 deploy was refused).
    expect((JSON.parse(read('app.config.json')) as { app: { description: string } }).app.description.length).toBeLessThanOrEqual(80);
    expect(APP_DISPLAY_NAME).toBe('PoC Automation 3.0');
    expect(APP_TAGLINE).toBe('All in One');
  });

  it('signs every screen with the name, "All in One" and the credit the owner wrote', () => {
    const params = { app: APP_DISPLAY_NAME, tagline: APP_TAGLINE, name: 'Andrey Rafael', role: 'Lead Solutions Engineer' };
    expect(translate('footer.credit', 'pt-BR', params)).toBe('PoC Automation 3.0 - All in One - App desenvolvido por Andrey Rafael · Lead Solutions Engineer · Dynatrace');
    expect(translate('footer.credit', 'en', params)).toBe('PoC Automation 3.0 - All in One - App developed by Andrey Rafael · Lead Solutions Engineer · Dynatrace');
    expect(read('ui/app/components/AppFooter.tsx')).toContain('app: APP_DISPLAY_NAME, tagline: APP_TAGLINE');
    expect(entryFor('settings.title')['pt-BR']).toBe('Configurações gerais do PoC Automation 3.0');
    expect(entryFor('help.about.title').en).toBe('About PoC Automation 3.0');
  });

  it('no longer says "PoC Value Studio" anywhere the user reads (but the What’s new that tells the change)', () => {
    const said = ALL_KEYS.filter((key) => key !== 'help.whatsNew.i87').filter((key) => {
      const entry = entryFor(key);
      return entry.en.includes('PoC Value Studio') || entry['pt-BR'].includes('PoC Value Studio');
    });
    expect(said).toEqual([]);
  });
});

const SHARED: SharedSlice = {
  parameters: { ...EMPTY_SHARED.parameters, customerName: 'Acme Corp', engagementName: 'Observability PoC' },
  pillars: ['resilience'],
  poc: { ...EMPTY_SHARED.poc, criteria: [{ id: 'c1', metric: 'manual', operator: '>=', target: null, text: 'Root cause without a war room', origin: 'kick-off', manualStatus: 'met' }] },
};

const reading = (at: string) =>
  toSnapshot(
    { index: computeIndex([{ id: 'infra', queryIds: [], state: ratioDomain(8, 10, ['ok']) }]), adoption: [], findings: [] },
    { readAt: at, savedAt: at, savedBy: 'se@example.com', appVersion: '3.4.13', window: 'Last 7 days' },
  );

describe('"Move this PoC", format 2', () => {
  const history = addSnapshot(addSnapshot(EMPTY_HISTORY, reading('2026-11-10T12:00:00.000Z')), reading('2026-11-18T12:00:00.000Z'));
  const plan = parsePlan({ v: 1, savedAt: '2026-11-18T12:00:00.000Z', items: { 'ASM-04': { owner: 'Platform team', due: '2026-12-15', status: 'inProgress' } } });

  it('carries the Coverage readings and the action plan, and reads them back through their own parsers', () => {
    const text = pocFileContent({ shared: SHARED, priv: EMPTY_PRIVATE, appVersion: '3.4.14', exportedAt: '2026-11-19T23:00:00.000Z', coverage: { history, plan } });
    expect(POC_FILE_VERSION).toBe(2);
    const back = readPocFile(text);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.coverage.history?.snapshots.map((snapshot) => snapshot.readAt)).toEqual(['2026-11-18T12:00:00.000Z', '2026-11-10T12:00:00.000Z']);
    expect(back.coverage.plan?.items['ASM-04']).toEqual({ owner: 'Platform team', due: '2026-12-15', status: 'inProgress' });
  });

  it('still reads a format-1 file of 3.3.6–3.4.13, without the Coverage parts', () => {
    const v1 = pocFileContent({ shared: SHARED, priv: EMPTY_PRIVATE, appVersion: '3.4.13', exportedAt: '2026-11-19T22:00:00.000Z' }).replace('"formatVersion": 2', '"formatVersion": 1');
    const back = readPocFile(v1);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.coverage).toEqual({ history: null, plan: null });
  });

  it('never trusts a carried part: a broken plan entry or reading is dropped, not imported', () => {
    const text = pocFileContent({ shared: SHARED, priv: EMPTY_PRIVATE, appVersion: '3.4.14', exportedAt: '2026-11-19T23:00:00.000Z', coverage: { history, plan } });
    const tampered = JSON.parse(text) as { coverage: { plan: { items: Record<string, unknown> }; history: { snapshots: unknown[] } } };
    tampered.coverage.plan.items = { 'not a rule': { owner: '<script>', status: 'done' } };
    tampered.coverage.history.snapshots = [{ readAt: 42 }];
    const back = readPocFile(JSON.stringify(tampered));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.coverage).toEqual({ history: null, plan: null });
  });

  it('writes both back to App State on "Import and replace", and reads them on export', () => {
    const panel = read('ui/app/components/PocTransfer.tsx');
    expect(panel).toContain("store.write('app', ASSESSMENT_HISTORY_KEY, JSON.stringify(reading.coverage.history))");
    expect(panel).toContain("store.write('app', ASSESSMENT_PLAN_KEY, JSON.stringify(reading.coverage.plan))");
    expect(panel).toContain("store.read('app', ASSESSMENT_HISTORY_KEY), store.read('app', ASSESSMENT_PLAN_KEY)");
  });
});
