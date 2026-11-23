import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { assumed } from '../config/assumptions';
import { appCostExpectation, pocUsage, sessionCeilingUsd } from '../features/consumption/appCost';
import { preflight } from '../features/consumption/preflight';
import { GIB } from '../features/consumption/sessionMeter';
import { formatMoneyFine } from '../models/cost';
import { PUBLIC_QUERY_USD_PER_GIB } from '../models/licensing';
import { setActiveLocaleTag } from '../utils/activeLocale';
import { EXAMPLE_ADDRESSES, FIREWALL_STEPS, PREREQ_DOCS, PREREQ_SECTIONS } from '../features/prerequisites/content';
import { entryFor } from '../i18n/strings';

/**
 * 3.4.13 — from the owner's requests of 2026-11-19: the app's consumption moves from Settings to Licensing with
 * its expected cost at the public list price, and Settings gains "Prerequisites". No new query, no new scope;
 * money only in Licensing's cost projection (rule 6).
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const ingest = (gibPerHour: number, hours: number, billedQueryGib = 0) => [
  { 'event.type': 'Log Management & Analytics - Ingest & Process', bytes: gibPerHour * hours * GIB, events: 1 },
  ...(billedQueryGib > 0 ? [{ 'event.type': 'Log Management & Analytics - Query', bytes: billedQueryGib * GIB, events: 1 }] : []),
];

describe('the expected cost of using the app', () => {
  it('prices the lab visit as the consumption study did: logs and other billable, the problems only in the ceiling', () => {
    const cost = appCostExpectation(preflight(ingest(0.93, 24), 24));
    expect(cost).not.toBeNull();
    if (cost === null) return;
    expect(PUBLIC_QUERY_USD_PER_GIB).toBe(0.0035);
    // 3.6.8: the log part also holds the Logs console's count, 0.072 GiB per hour of the 24-hour window.
    const logs = 0.82 + 0.072 * 24;
    expect(cost.visitBillableGiB).toBeCloseTo(logs + 0.51, 6);
    expect(cost.visitBillableUsd).toBeCloseTo((logs + 0.51) * 0.0035, 9);
    expect(cost.visitCeilingUsd).toBeCloseTo((logs + 2.19 + 0.51) * 0.0035, 9);
    // The PoC's use comes from the assumptions register: 2 people × 1 visit a day × 30 days.
    expect(pocUsage()).toEqual({ people: 2, visitsPerDay: 1, days: 30 });
    expect(cost.pocVisits).toBe(60);
    expect(cost.pocCeilingUsd).toBeCloseTo(cost.visitCeilingUsd * 60, 9);
    expect(cost.dayBillableUsd).toBeCloseTo(cost.visitBillableUsd * 2, 9);
    expect(cost.logsPayPerQuery).toBe(false);
  });

  it('grows the log part with the tenant, says when logs are billed per query, and projects nothing unread', () => {
    const large = appCostExpectation(preflight(ingest(0.93 * 20, 24, 4), 24));
    expect(large?.visitBillableGiB).toBeCloseTo((0.82 + 0.072 * 24) * 20 + 0.51, 6);
    expect(large?.logsPayPerQuery).toBe(true);
    expect(appCostExpectation(preflight(null, 24))).toBeNull();
    expect(sessionCeilingUsd(2 * GIB)).toBeCloseTo(0.007, 9);
    expect(assumed('consumption.poc.days')).toBe(30);
  });

  it('keeps a small amount readable instead of rounding it to zero', () => {
    setActiveLocaleTag('en-US');
    expect(formatMoneyFine(0.004655, 'USD')).toBe('USD 0.0047');
    expect(formatMoneyFine(14.8, 'USD')).toBe('USD 14.8');
    expect(formatMoneyFine(0, 'USD')).toBe('USD 0');
  });
});

describe('where it lives', () => {
  it('is a Licensing tab in GiB, priced only in the cost projection, and no longer a Settings tab', () => {
    const licensing = read('ui/app/pages/Licensing.tsx');
    expect(licensing).toContain("<Tab title={t('settings.tab.consumption')}>");
    expect(licensing).toContain('<ConsumptionPanel />');
    expect(licensing).toContain('data-testid="lic-appcost"');
    // The priced panel sits inside the cost projection tab, behind the rate card (rule 6).
    const projection = licensing.indexOf("<Tab title={t('p.lic.tab.projection')}>");
    const consumptionTab = licensing.indexOf("<Tab title={t('settings.tab.consumption')}>");
    const priced = licensing.indexOf('data-testid="lic-appcost"');
    expect(priced).toBeGreaterThan(projection);
    expect(priced).toBeLessThan(consumptionTab);
    expect(licensing.slice(projection, priced)).toContain('{!enabled ? (');
    expect(read('ui/app/pages/Settings.tsx')).not.toContain('ConsumptionPanel');
    // 3.7.6 (the owner asked for the app's consumption in money on this tab): money only inside Licensing, only through the
    // rate card (localValue answers null with the rate card off) — the panel is rendered by Licensing alone (rule 6).
    const panel = read('ui/app/features/consumption/ConsumptionPanel.tsx');
    expect(panel).not.toMatch(/PUBLIC_DPS_RATES|formatMoney\(/);
    expect(panel).toMatch(/localValue\(usd, rateCard\)/);
  });
});

describe('Settings → Prerequisites', () => {
  it('replaces the consumption tab, for the SE and the partner only', () => {
    const settings = read('ui/app/pages/Settings.tsx');
    expect(settings).toContain("{access.canWork && (\n          <Tab title={t('settings.tab.prerequisites')} keepMounted>\n            <PrerequisitesGuide />");
  });

  it('links every line to a docs.dynatrace.com page and keeps the figures the documentation gives', () => {
    // docs.dynatrace.com, plus the free-trial sign-up page the owner asked for in 3.4.17.
    for (const docEntry of Object.values(PREREQ_DOCS)) expect(docEntry.url).toMatch(/^https:\/\/(docs\.dynatrace\.com\/docs\/[a-z0-9/#-]+|www\.dynatrace\.com\/signup\/)$/);
    const items = [...PREREQ_SECTIONS.flatMap((section) => section.items), ...FIREWALL_STEPS];
    expect(PREREQ_SECTIONS.map((section) => section.id)).toEqual(['tenant', 'network', 'activegate', 'oneagent', 'rum', 'access']);
    for (const item of items) {
      expect(item.docs.length, item.key).toBeGreaterThan(0);
      const entry = entryFor(item.key);
      expect(entry.en.length, item.key).toBeGreaterThan(20);
      expect(entry['pt-BR'].length, item.key).toBeGreaterThan(20);
    }
    // The owner's three pages are cited.
    const urls = Object.values(PREREQ_DOCS).map((docEntry) => docEntry.url);
    expect(urls).toContain('https://docs.dynatrace.com/docs/ingest-from/dynatrace-activegate/supported-connectivity-schemes-for-activegates#saas-scheme');
    expect(urls).toContain('https://docs.dynatrace.com/docs/observe/digital-experience-classic/rum-classic/web-applications/initial-setup/infrastructure-pass-through-requirements-classic');
    expect(urls).toContain('https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/installation-and-operation');
    // Figures as the documentation states them (not an older slide's).
    expect(entryFor('prq.activegate.machine').en).toContain('2 GB of RAM (4 GB recommended)');
    expect(entryFor('prq.oneagent.disk').en).toContain('11.5 GB');
    expect(entryFor('prq.network.9999').en).toContain('port 9999');
    // The drawing's addresses are documentation examples only (RFC 5737), never real ones.
    for (const address of EXAMPLE_ADDRESSES) expect(address).toMatch(/^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$/);
  });

});
