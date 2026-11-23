import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { SeOnly } from '../components/SeOnly';
import { CommercialScope } from '../config/AccessContext';
import { StudioProvider } from '../config/StudioContext';
import { OpenAccess } from '../config/AccessContext';
import { deriveVerdict, summariseMttr } from '../features/executive/verdict';
import {
  CaptureStage,
  buildCaptureTargets,
  captureFontCss,
  measurePins,
  rgbToHex,
  type CaptureOutcome,
  type CaptureTarget,
} from '../features/wrapup/captures';
import { DeckPreview } from '../features/wrapup/DeckPreview';
import { storyLayout } from '../features/wrapup/geometry';
import { ExportProfileProvider, effectiveProfile } from '../features/wrapup/exportProfile';
import { confidentialLine, executiveSlide, type CaptureSlide, type DeckSpec, type ExecutiveInput } from '../features/wrapup/spec';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { translate, type StringKey } from '../i18n/strings';
import { SeReport } from '../pages/SeReport';
import { TechWrapup, fileSlug } from '../pages/TechWrapup';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';

/**
 * 3.2.4 (milestone M4): the SE deck as one specification, the export profiles of the SE Report,
 * the captures of the app and the executive page. Rendered for real, with the one door to Grail
 * (`useCatalogQuery`) answering canned records.
 */

interface Canned {
  outcome?: QueryOutcome;
  records?: GrailRecord[];
}
let canned: Partial<Record<CatalogId, Canned>> = {};

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId): CatalogQueryResult => {
    const entry = getQuery(id);
    const given = canned[id] ?? {};
    const records = given.records ?? [];
    const outcome: QueryOutcome = given.outcome ?? (records.length > 0 ? 'ok' : 'empty');
    return {
      entry,
      records,
      raw: undefined,
      quality: CLEAN_QUALITY,
      outcome,
      provenance: outcome === 'ok' ? 'observed' : outcome === 'empty' ? 'no-telemetry' : outcome === 'loading' ? 'loading' : 'failed',
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
      timeframe: { startIso: '2026-10-04T00:00:00.000Z', endIso: '2026-10-05T00:00:00.000Z', label: 'last 24 hours', expression: 'now-24h' },
      missingScopes: [],
      errorMessage: null,
      isLoading: outcome === 'loading',
      refetch: () => undefined,
    };
  },
}));

// The incident's own logs are read with `useDql` directly: nothing comes back here.
vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({ data: undefined, error: undefined, isLoading: false, refetch: () => undefined }),
}));

const pt = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'pt-BR', params);
const en = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'en', params);
/** Either language: the provider may start in either, depending on the environment. */
const anyLang = (key: StringKey, params?: Record<string, string | number>) => new RegExp(`${escape(en(key, params))}|${escape(pt(key, params))}`);
function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const mount = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        {/* 3.3.0: fail-closed `useAccess()` (S11) — the export profile is asserted as the SE sees it. */}
        <OpenAccess>
          <StudioProvider>{node}</StudioProvider>
        </OpenAccess>
      </MemoryRouter>
    </AppRoot>,
  );

beforeEach(() => {
  canned = {};
});

const INVENTORY: GrailRecord[] = [
  { category: 'Hosts', value: 77 },
  { category: 'Services', value: 76 },
  { category: 'Process instances', value: 400 },
  { category: 'Kubernetes clusters', value: 6 },
  { category: 'Kubernetes workloads', value: 90 },
  { category: 'Web applications', value: 3 },
  { category: 'Mobile applications', value: 0 },
  { category: 'Synthetic monitors', value: 4 },
];

// ------------------------------------------------------------------ the verdict, shared with the screen

describe('the executive verdict (shared by the Executive summary and the deck)', () => {
  it('weights MTTR by the problems of each category, not by a mean of means', () => {
    const summary = summariseMttr([
      { 'event.category': 'ERROR', problems: 9, totalNs: 9 * 3_600_000_000_000 },
      { 'event.category': 'SLOWDOWN', problems: 1, totalNs: 11 * 3_600_000_000_000 },
    ]);
    expect(summary.resolvedProblems).toBe(10);
    expect(summary.overallMttrNs).toBe(2 * 3_600_000_000_000);
    expect(summariseMttr([]).overallMttrNs).toBeNull();
  });

  it('reads blocked, unknown, partial, healthy and attention by its stated rules', () => {
    const base = { mttxOutcome: 'ok', exposureOutcome: 'ok', overallMttrNs: 3_600_000_000_000, activeProblems: 0, entityModel: 'available' as const };
    expect(deriveVerdict({ ...base, mttxOutcome: 'no-permission' }).key).toBe('blocked');
    expect(deriveVerdict({ ...base, overallMttrNs: null }).key).toBe('unknown');
    expect(deriveVerdict({ ...base, entityModel: 'unavailable' }).key).toBe('partial');
    expect(deriveVerdict(base).key).toBe('healthy');
    expect(deriveVerdict({ ...base, overallMttrNs: 500 * 3_600_000_000_000, activeProblems: 900 }).key).toBe('attention');
  });
});

// ------------------------------------------------------------------ the export profile

describe('the export profile of the SE Report', () => {
  it('resolves to SE only while the session may see commercial data', () => {
    expect(effectiveProfile('se', true)).toBe('se');
    expect(effectiveProfile('se', false)).toBe('customer');
    expect(effectiveProfile('customer', true)).toBe('customer');
  });

  it('only ever takes commercial data away: a nested scope cannot widen what the session allows', () => {
    mount(
      <CommercialScope allow={false}>
        <CommercialScope allow={true}>
          <SeOnly fallback={<span>cut</span>}>
            <span>priced</span>
          </SeOnly>
        </CommercialScope>
      </CommercialScope>,
    );
    expect(screen.queryByText('priced')).toBeNull();
    expect(screen.getByText('cut')).toBeTruthy();
  });

  it('starts on Customer, and the SE profile adds the internal banner', async () => {
    mount(<SeReport />);
    const customer = screen.getByRole('radio', { name: anyLang('profile.customer') });
    expect((customer as HTMLInputElement).checked || customer.getAttribute('aria-checked') === 'true').toBe(true);
    expect(screen.queryByText(anyLang('profile.banner'))).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: anyLang('profile.se') }));
    expect(await screen.findByText(anyLang('profile.banner'))).toBeTruthy();
  });

  it('cannot be moved to SE in executive mode (commercial data narrowed away): Customer is stated, not offered', () => {
    mount(
      <CommercialScope allow={false}>
        <SeReport />
      </CommercialScope>,
    );
    expect(screen.queryByRole('radio', { name: anyLang('profile.se') })).toBeNull();
    expect(screen.getByText(anyLang('profile.se.locked'), { exact: false })).toBeTruthy();
    expect(screen.queryByText(anyLang('profile.banner'))).toBeNull();
  });
});

// ------------------------------------------------------------------ the deck page

const ADVISOR: GrailRecord[] = [{ table: 'logs', executions: 40, scannedOnDemandBytes: 8e9, avgDurationMs: 120, deliveredRecords: 900 }];

const slideKinds = () => [...document.querySelectorAll('[data-wrap-slide]')].map((slide) => slide.getAttribute('data-slide-kind'));

describe('the Tech Wrapup deck page', () => {
  it('draws cover, agenda, the executive page, the parts and the end, as the PowerPoint has them', () => {
    canned = { 'cov.inventory': { records: INVENTORY } };
    mount(
      <ExportProfileProvider value="customer">
        <TechWrapup embedded />
      </ExportProfileProvider>,
    );
    const kinds = slideKinds();
    expect(kinds[0]).toBe('cover');
    expect(kinds[1]).toBe('agenda');
    expect(kinds[2]).toBe('executive');
    expect(kinds[kinds.length - 1]).toBe('end');
    expect(kinds).toContain('divider');
    const first = document.querySelector('[data-wrap-slide]');
    expect(first?.getAttribute('aria-label')).toMatch(/^Slide 1 (of|de) \d+: /);
  });

  it('leaves consumption out of the Customer profile and keeps it, watermarked, in the SE profile', () => {
    canned = { 'cov.inventory': { records: INVENTORY }, 'cons.advisor': { records: ADVISOR } };
    const labels = () => [...document.querySelectorAll('[data-wrap-slide]')].map((slide) => slide.getAttribute('aria-label') ?? '');
    const consumption = anyLang('tw.cons.title');

    const customer = mount(
      <CommercialScope allow={false}>
        <ExportProfileProvider value="customer">
          <TechWrapup embedded />
        </ExportProfileProvider>
      </CommercialScope>,
    );
    expect(labels().some((label) => consumption.test(label))).toBe(false);
    expect(document.body.textContent ?? '').not.toMatch(anyLang('profile.watermark'));
    customer.unmount();

    mount(
      <CommercialScope allow={true}>
        <ExportProfileProvider value="se">
          <TechWrapup embedded />
        </ExportProfileProvider>
      </CommercialScope>,
    );
    expect(labels().some((label) => consumption.test(label))).toBe(true);
    expect(document.body.textContent ?? '').toMatch(anyLang('profile.watermark'));
  });

  it('names the file after the customer, plainly', () => {
    expect(fileSlug('Açaí & Cia. Ltda')).toBe('Acai-Cia-Ltda');
    expect(fileSlug('***')).toBe('poc');
  });
});

// ------------------------------------------------------------------ the executive page

const EXECUTIVE: ExecutiveInput = {
  title: 'Executive summary',
  subtitle: 'Read from this environment.',
  verdict: { text: 'Stable — nothing urgent', tone: 'good' },
  rings: [
    { label: 'Categories with telemetry', value: 88, display: '88%' },
    { label: 'Problems closed', value: null, display: '—' },
    { label: 'Services under 1% failures', value: 97, display: '97%' },
  ],
  numbers: [
    { label: 'Monitored entities', value: '1,204' },
    { label: 'Active problems', value: '3', status: 'good' },
  ],
  stepsTitle: 'Next steps',
  steps: [{ title: 'Tame the noisy pod', body: 'Restart storms on checkout; set a memory limit. password=hunter2' }],
  note: 'Generated from abc12345.',
};

describe('the executive page', () => {
  it('redacts tenant text in the steps and keeps a missing ring missing', () => {
    const slide = executiveSlide(EXECUTIVE);
    expect(slide.steps[0]?.body).not.toContain('hunter2');
    expect(slide.rings[1]?.value).toBeNull();
  });

  it('marks the footer as SE internal only under the SE profile', () => {
    expect(confidentialLine('customer', 'CONFIDENTIAL', 'SE INTERNAL')).toBe('CONFIDENTIAL');
    expect(confidentialLine('se', 'CONFIDENTIAL', 'SE INTERNAL')).toBe('CONFIDENTIAL · SE INTERNAL');
  });

  it('has no one-pager tab any more: the executive page is the slide after the agenda in the deck (3.2.6)', () => {
    mount(<SeReport />);
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
    expect(tabs).toHaveLength(4);
    expect(tabs[3]).toBe('Real proof');
    expect(tabs.some((tab) => /one-pager|1 página/i.test(tab))).toBe(false);
  });
});

// ------------------------------------------------------------------ the preview draws what the file has

// A 4 × 2 PNG: high-entropy bytes, not a secret.
// eslint-disable-next-line noSecrets/no-secrets
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwAEjDAGACCDAv8cI7IoAAAAAElFTkSuQmCC';

describe('the deck preview', () => {
  it('frames a capture in its own background and numbers its pins over the picture', () => {
    const slide: CaptureSlide = {
      kind: 'capture',
      id: 'services',
      title: 'Services — In the app',
      pinsLabel: 'What it shows',
      capture: {
        dataUrl: PNG,
        width: 720,
        height: 330,
        frame: '1B1D2E',
        pins: [
          { n: 1, x: 0.1, y: 0.2, label: 'Requests in the window: 1.2M' },
          { n: 2, x: 0.6, y: 0.5, label: 'Peak of failure rate' },
        ],
      },
      kpis: [],
      assistLabel: 'Assist',
      assist: [],
      subtitle: null,
      findingsLabel: 'Key findings',
      findings: [],
      under: null,
      stripFindings: [],
      valueLabel: 'Why it matters',
      value: [],
      layout: storyLayout({ subtitle: false, aspect: 720 / 330, kpis: 0, pins: 600000, cards: 0, strip: 0, under: 0, findings: [] }),
    };
    const spec: DeckSpec = { profile: 'customer', slides: [slide], confidential: 'CONFIDENTIAL', title: 'Deck' };
    const { container } = render(<DeckPreview spec={spec} art={{}} dtLogo={PNG} slideLabel={(n, total, title) => `${n}/${total} ${title}`} />);
    const shown = within(container).getByLabelText('1/1 Services — In the app');
    const picture = within(shown).getByAltText('What it shows');
    expect(picture.getAttribute('src')).toBe(PNG);
    const frame = picture.parentElement?.previousElementSibling as HTMLElement | null;
    expect(frame?.style.background).toMatch(/rgb\(27, 29, 46\)|#1B1D2E/i);
    expect(within(shown).getByText('Requests in the window: 1.2M')).toBeTruthy();
    expect(within(shown).getByText('CONFIDENTIAL')).toBeTruthy();
  });
});

// ------------------------------------------------------------------ captures

function place(element: Element, rect: { left: number; top: number; width: number; height: number }) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => rect }),
  });
}

describe('captures of the app', () => {
  it('measures the pins on the live layout, numbers them in order and drops what it cannot find', () => {
    const root = document.createElement('div');
    for (const [klass, content] of [['a', '12'], ['b', 'x']] as const) {
      const span = document.createElement('span');
      span.className = klass;
      span.textContent = content;
      root.appendChild(span);
    }
    place(root, { left: 100, top: 50, width: 1000, height: 500 });
    place(root.querySelector('.a') as Element, { left: 300, top: 150, width: 100, height: 40 });
    place(root.querySelector('.b') as Element, { left: 600, top: 300, width: 20, height: 20 });
    const pins = measurePins(root, [
      { find: (r) => r.querySelector('.missing'), label: () => 'never' },
      { find: (r) => r.querySelector('.a'), label: (el) => `value ${el.textContent}`, at: 'top-left' },
      { find: (r) => r.querySelector('.b'), label: () => 'centre' },
      { find: (r) => r.querySelector('.b'), label: () => null },
    ]);
    // A pin never covers text (3.3.3): the figure's top-left spot touched "12" by a pixel, so it moves one step
    // further out; the centre of "x" is text, so that pin moves to the first free corner around it.
    // 3.5.6: the pin's radius is 15 px (was 11), so the free spots sit a little further out.
    expect(pins).toEqual([
      { n: 1, x: 0.182, y: 0.164, label: 'value 12' },
      { n: 2, x: 0.482, y: 0.464, label: 'centre' },
    ]);
  });

  it('reads the page background as the frame colour, and refuses a transparent one', () => {
    expect(rgbToHex('rgb(3, 12, 22)')).toBe('030C16');
    expect(rgbToHex('rgba(255, 255, 255, 1)')).toBe('FFFFFF');
    expect(rgbToHex('rgba(0, 0, 0, 0)')).toBeNull();
    expect(rgbToHex('transparent')).toBeNull();
  });

  it('paints the pictures in the same DT Flow faces the stage lays the panels out in', () => {
    const css = captureFontCss();
    // The DT Flow font is a brand asset not included in this repository (`fonts.ts` is an empty
    // stub there); the stage rule below is checked either way.
    if (css !== '') expect(css).toContain("font-family:'DTFlow'");
    const stage = readFileSync(join(process.cwd(), 'ui/app/engine/spectrum.css'), 'utf8');
    const rule = stage.slice(stage.indexOf('.pvs-capture-stage {'), stage.indexOf('}', stage.indexOf('.pvs-capture-stage {')));
    expect(rule).toContain("--pvs-capture-font: 'DTFlow'");
    expect(rule).toContain('--dt-typography-text-base-default-family: var(--pvs-capture-font)');
    expect(rule).toContain('--dt-typography-heading-level-1-family: var(--pvs-capture-font)');
  });

  it('has a panel for every technical section the deck can photograph', () => {
    const ids = buildCaptureTargets((key) => key, { compact: String, decimal: (value) => String(value), binTime: String, tick: () => String }).map((target) => target.sectionId);
    // 3.2.6: four more — the estate (overview), the value chain (roi), security and the overlap (competitor).
    // 3.3.2: three more — cloud, technologies and executive — and a second panel for some (the registry's contract
    // lives in `captureRegistry.test.tsx`).
    expect([...new Set(ids)].sort()).toEqual(
      // 3.4.10 (F-02): and the Assessment.
      ['problems', 'rca', 'infrastructure', 'cloud', 'kubernetes', 'services', 'technologies', 'logs', 'overview', 'roi', 'security', 'competitor', 'experience', 'executive', 'assessment'].sort(),
    );
  });

  const target = (sectionId: string, node: React.ReactNode, ready: (root: HTMLElement) => boolean): CaptureTarget => ({
    sectionId,
    captureId: sectionId,
    node,
    ready,
    pins: [{ find: (root) => root.querySelector('.figure'), label: (element) => `figure ${element.textContent}` }],
  });

  it('photographs the panels that settle with data, skips the empty ones, and reports once', async () => {
    const onDone = vi.fn<(outcome: CaptureOutcome) => void>();
    const photographer = vi.fn(() => Promise.resolve(PNG));
    render(
      <CaptureStage
        targets={[
          target('services', <p className="figure">42</p>, (root) => root.querySelector('.figure') !== null),
          target('logs', null, () => false),
        ]}
        onDone={onDone}
        photographer={photographer}
        settleMs={20}
        timeoutMs={5000}
      />,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const outcome = onDone.mock.calls[0]?.[0] as CaptureOutcome;
    expect(Object.keys(outcome.captures)).toEqual(['services']);
    expect(outcome.captures['services']?.dataUrl).toBe(PNG);
    expect(outcome.skipped).toEqual(['logs']);
    expect(outcome.failed).toBe(false);
    expect(photographer).toHaveBeenCalledTimes(1);
  });

  it('skips a panel still loading when the time runs out, and says when no picture could be drawn', async () => {
    const onDone = vi.fn<(outcome: CaptureOutcome) => void>();
    render(
      <CaptureStage
        targets={[target('kubernetes', <div role="status" />, () => true), target('services', <p className="figure">1</p>, () => true)]}
        onDone={onDone}
        photographer={() => Promise.reject(new Error('no canvas'))}
        settleMs={20}
        timeoutMs={600}
      />,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const outcome = onDone.mock.calls[0]?.[0] as CaptureOutcome;
    expect(outcome.skipped.sort()).toEqual(['kubernetes', 'services']);
    expect(outcome.failed).toBe(true);
    await act(() => Promise.resolve());
  });
});
