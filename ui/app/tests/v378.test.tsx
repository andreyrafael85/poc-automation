import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { BROWSER_DEVICE, buildBrowserMonitor, locationsFor } from '../features/builder/pocAutomation';
import { DETECTOR_INTENT_LABEL, detectorIntent } from '../features/builder/pocSettings';
import { triageSummary } from '../features/triage/triage';
import { weeklySummary } from '../features/weekly/weekly';
import { entryFor } from '../i18n/strings';
import { aiModelCards, tokensByService } from '../models/aiObservability';
import { parsePocPlan } from '../models/pocPlan';

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');
const EMOJI = /\p{Extended_Pictographic}/u;
const WORDS = { title: 'T', description: 'D', eventName: 'E', eventDescription: 'ED' };

describe('the menu while the PoC is prepared (3.7.8)', () => {
  it('stays hidden until the readiness opens the app, with a way back to the guide', () => {
    const app = read('App.tsx');
    expect(app).toMatch(/\{!preparing && \(\s*<PageLayout\.Sidebar/);
    expect(app).toContain('{!preparing && <StoryPager />}');
    expect(read('features/setup/SetupWizard.tsx')).toContain('data-testid="setup-back"');
  });
});

describe('anomaly detectors through the Anomaly Detection app', () => {
  it('fills the documented intent — the query, the analyzer and its rule, the event — and never an actor', () => {
    const payload = detectorIntent('failureRate', [], WORDS, 'my.poc.automation');
    expect(payload).not.toBeNull();
    expect(payload?.['dt.query']).toContain('timeseries {f = sum(dt.service.request.failure_count)');
    const analyzer = payload?.['davis.analyzer'] as Record<string, unknown>;
    expect(analyzer['davis.analyzer.labels']).toEqual([DETECTOR_INTENT_LABEL]);
    expect(analyzer['davis.analyzer.input']).toMatchObject({ threshold: 5, alertCondition: 'ABOVE', violatingSamples: 3, alertOnMissingData: false });
    expect(payload?.['sourceApplication']).toBe('my.poc.automation');
    expect(JSON.stringify(payload)).not.toContain('executionSettings');
    expect(detectorIntent('traffic', ['nope'], WORDS, 'a')).toBeNull();
    const kit = read('features/builder/PocSettingsKits.tsx');
    expect(kit).toContain('openDetectorInApp(payload)');
    // 3.8.0: the kit creates the detectors itself again, run by a service user (tests/v380.test.tsx); the intent stays.
  });
});

describe('browser monitors', () => {
  it('load the page in a desktop browser from a location that runs browsers, under the scope HTTP monitors use', () => {
    const body = buildBrowserMonitor('n', 'https://shop.example.com/', 'SYNTHETIC_LOCATION-1', 15, 'd', 'Loading of shop.example.com');
    expect(body).toMatchObject({ type: 'BROWSER', frequencyMin: 15, locations: ['SYNTHETIC_LOCATION-1'], steps: [{ type: 'NAVIGATE', url: 'https://shop.example.com/' }] });
    expect(body.configuration.device).toEqual(BROWSER_DEVICE);
    expect(body.tags).toEqual([{ key: 'poc-automation', context: 'CONTEXTLESS', source: 'USER' }]);
    const places = [
      { id: '1', name: 'A', city: '', capabilities: ['HTTP'] },
      { id: '2', name: 'B', city: '', capabilities: ['BROWSER', 'HTTP'] },
      { id: '3', name: 'C', city: '', capabilities: [] },
    ];
    expect(locationsFor('BROWSER', places).map((place) => place.id)).toEqual(['2', '3']);
    const plan = parsePocPlan({ monitors: [{ id: 'SYNTHETIC_TEST-1', name: 'm', url: 'https://shop.example.com/', locationId: 'L', createdAt: '', shared: true, type: 'BROWSER' }] });
    expect(plan.monitors?.[0]?.type).toBe('BROWSER');
    expect(read('pages/PocBuilder.tsx')).toContain('<MonitorKit type="BROWSER" />');
  });
});

describe('AI Observability in the v6 layout', () => {
  it('draws a card per model with its share, and the tokens by service', () => {
    const rows = [
      { service: 's', model: 'm', input: 75, output: 5 },
      { service: 't', model: 'm', input: 10, output: 0 },
      { service: 't', model: null, input: 10, output: 0 },
    ];
    const cards = aiModelCards(rows, [{ service: 's', model: 'm', error: null, calls: 4, avgSeconds: 1 }]);
    expect(cards[0]).toMatchObject({ model: 'm', input: 85, output: 5, share: 90, calls: 4, services: ['s', 't'] });
    expect(cards[1]).toMatchObject({ model: null, calls: null });
    expect(tokensByService(rows)[0]).toEqual({ service: 's', tokens: 80 });
    const page = read('pages/AiObservability.tsx');
    expect(page).toContain('className="pvs-aimodels"');
    expect(page).toContain('data-testid="ai-tables"');
    expect(page).not.toMatch(/USD|localValue|formatMoney|rateCard/);
  });
});

describe('the e-mails, richer in Markdown', () => {
  it('open with a callout and a table of facts, the week’s changes as arrows with a reading — no emoji', () => {
    const incident = { eventId: 'e', displayId: 'P-1', name: 'N', category: 'ERROR', status: 'CLOSED', startIso: null, durationNs: null, rootCauseName: null, affectedCount: 1, affectedNames: ['a'], clusters: [], namespaces: [], workloads: [] };
    const triage = triageSummary(incident as never, null, [], { problem: null, app: 'https://x' }, 'en');
    expect(triage).toContain('> ○ Closed · root cause root cause not named yet · 1 entities reached'.replace('1 entities', '1 entities'));
    expect(triage).toContain('| **Status** | ○ Closed |');
    expect(triage).not.toMatch(EMOJI);
    const week = { problems: 8, open: 1, closed: 7, mttrNs: 3.6e12, rootCausePct: 20 };
    const weekly = weeklySummary({ thisWeek: week, lastWeek: { ...week, problems: 10 }, recurring: [], failing: [], appLink: 'x', links: { problems: 'https://t', dashboard: null } }, 'Acme', 'en', 'a', 'b');
    expect(weekly).toContain('| Problems | 8 | 10 | ▼ −2 · better |');
    expect(weekly).toContain('| MTTR (mean time to resolve) | 1 h 0 min | 1 h 0 min | = same |');
    expect(weekly).toMatch(/^> \*\*8 problems\*\*/m);
    expect(weekly).not.toMatch(EMOJI);
  });
});

describe('What’s new', () => {
  it('keeps 3.7.8 among the ten', () => {
    // 3.7.9: newer releases come first.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i120')).toBe(true);
    expect(WHATS_NEW).toHaveLength(10);
    expect(entryFor('help.whatsNew.i120').en).toMatch(/^3\.7\.8 — /);
  });
});
