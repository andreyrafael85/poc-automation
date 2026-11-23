import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import type { WrapupModel } from '../features/wrapup/deck';
import { captureImageRect } from '../features/wrapup/geometry';
import { buildTemplateDeck, esc, patchTemplate, renderSlides } from '../features/wrapup/pptxTemplate';
import { BUDGET, buildDeckSpec, fit, type CaptureSlide, type DeckCapture, type ExecutiveInput, type SectionSlide } from '../features/wrapup/spec';

/**
 * The SE deck (3.2.4): one specification (`spec.ts`), written into the corporate template.
 *
 * PowerPoint cannot run in CI, but a `.pptx` is a ZIP of XML: these prove the package is coherent
 * (one part per slide, matching ids, relationships and content types), that the text is the spec's
 * text, cut to its budgets, and that the template ships nothing it should not. Set `PVS_DECK_OUT`
 * to a file path to also write the deck (the 3.2.4 contact sheet was made from it with LibreOffice).
 */

/** 4 × 2 px, opaque: a valid PNG for the capture fixtures. */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwABjDAGACM8Au8Wy10JAAAAAElFTkSuQmCC';

const model: WrapupModel = {
  customerName: 'Contoso',
  engagementName: 'Observability PoC',
  windowLabel: 'last 24 hours',
  generatedAtLabel: 'Generated 2026-09-10',
  seName: 'Ada Lovelace',
  dtLogo: PNG,
  customerLogo: null,
  customerLogoAspect: null,
  partnerName: 'Acme Consulting',
  partnerLogo: null,
  partnerLogoAspect: null,
  platformLogos: [],
  agenda: [],
  why: [],
  strings: {
    title: 'Tech Wrapup',
    subtitle: 'What Dynatrace discovered',
    tagline: 'Turning IT complexity into opportunity.',
    preparedBy: 'Prepared by',
    agendaTitle: 'What we will walk through',
    whyTitle: 'Why Dynatrace',
    whySubtitle: 'One platform',
    assistLabel: 'Dynatrace Assist',
    partnerLabel: 'Delivered with',
    technicalDivider: 'Part one',
    technicalKicker: 'PoC results',
    businessDivider: 'Part two',
    businessKicker: 'Business value',
    closingTitle: 'Thank you',
    closingBullets: [],
    footer: 'Every figure traces back to a query.',
    measured: 'Measured live.',
    confidential: 'Confidential.',
  },
  technical: [
    {
      id: 'problems',
      title: 'Problems & Dynatrace Intelligence',
      subtitle: 'Detected with no alerting rule written',
      narrative: ['2,606 problems detected in 7 days', 'Most of them closed on their own', 'Errors lead', 'Fourth line', 'Fifth line', 'Sixth line'],
      assist: ['Dynatrace closed 97% of problems.', 'Second', 'Third', 'Fourth, cut'],
      kpis: [
        { label: 'Problems', value: '2,606' },
        { label: 'Problems closed', value: '97%', status: 'good' },
        { label: 'c', value: '3' },
        { label: 'd', value: '4' },
        { label: 'e', value: '5' },
        { label: 'f, cut', value: '6' },
      ],
      bars: { title: 'MTTR by category (h)', items: [{ label: 'ERROR', value: 11.5 }, { label: 'RESOURCE', value: 18.9 }] },
    },
    {
      id: 'rca',
      title: 'Root-cause analysis',
      narrative: ['One incident, taken to its cause'],
      table: {
        title: 'This incident’s error logs',
        headers: ['Error message', 'Count'],
        rows: [['Connection refused to db.internal:5432 for user admin@contoso.com', '12']],
      },
    },
    {
      id: 'services',
      title: 'Services & tracing',
      narrative: ['70 services traced', 'Failures concentrate in one service', 'Response time held'],
      kpis: [{ label: 'Requests', value: '4.8m' }],
      bars: { title: 'Busiest services', items: [{ label: 'svc-a', value: 3 }] },
    },
  ],
  business: [
    {
      id: 'executive',
      title: 'Executive summary',
      narrative: ['One platform replaced fragmented tooling'],
      kpis: [{ label: 'Entities', value: '1,204' }],
    },
  ],
};

const executive: ExecutiveInput = {
  title: 'Executive summary',
  subtitle: 'The opening of the story, read from the tenant.',
  verdict: { text: 'Stable — resolution times are reasonable.', tone: 'good' },
  rings: [
    { label: 'Categories with telemetry', value: 88, display: '88%' },
    { label: 'Problems closed', value: 100, display: '100%' },
    { label: 'Services under 1% failures', value: null, display: '—' },
  ],
  numbers: [
    { label: 'Monitored entities', value: '695' },
    { label: 'Active problems', value: '41' },
    { label: 'Mean time to resolve', value: '6.9 h' },
    { label: 'Services traced', value: '70' },
    { label: 'Front-end error rate', value: '0.95%' },
  ],
  stepsTitle: 'Next steps',
  steps: [
    { title: 'Investigate svc-catalog-01', body: 'Open the failing requests.' },
    { title: 'Resolve read access for 7 buckets', body: 'Decide which the identity should read.' },
    { title: 'Third', body: 'Third body.' },
    { title: 'Fourth, cut', body: 'Never shown.' },
  ],
  note: 'Every figure is read from the tenant.',
};

/** For a local contact sheet: `PVS_DECK_CAPTURE=/path/to.png` puts a real capture in the sample deck. */
const realCapture = process.env.PVS_DECK_CAPTURE;
const capture: DeckCapture = {
  dataUrl:
    realCapture !== undefined && realCapture !== '' ? `data:image/png;base64,${readFileSync(realCapture).toString('base64')}` : PNG,
  width: 1100,
  height: 550,
  pins: [
    { n: 1, x: 0.2, y: 0.3, label: 'Peak of requests at 22:00, owner ops@contoso.com' },
    { n: 2, x: 0.8, y: 0.6, label: 'Failure rate' },
  ],
};

const spec = buildDeckSpec(model, {
  profile: 'customer',
  executive,
  // The root-cause map is a wide panel: it leaves room under it for the incident's table.
  captures: { services: capture, rca: { ...capture, width: 1600, height: 500 } },
  seLabel: 'Solutions Engineer',
  findingsLabel: 'Key findings',
  captureLabel: 'In the app',
});

function templateBytes(): Uint8Array {
  return new Uint8Array(readFileSync(join(process.cwd(), 'ui/assets/techwrapup-brand-template.pptx')));
}

const meta = { dtLogo: PNG, seName: 'Ada Lovelace' };

describe('the deck specification', () => {
  it('plans cover, agenda, the executive page, two parts with their sections and captures, and the end', () => {
    expect(spec.slides.map((slide) => slide.kind)).toEqual([
      'cover',
      'agenda',
      'executive',
      'divider',
      'section',
      'capture',
      'capture',
      'divider',
      'section',
      'end',
    ]);
    const agenda = spec.slides[1];
    expect(agenda?.kind === 'agenda' ? agenda.items[0] : null).toBe('Executive summary');
  });

  it('cuts every block to its budget, the same cut for the file and the preview', () => {
    const problems = spec.slides.find((slide): slide is SectionSlide => slide.kind === 'section' && slide.id === 'problems');
    expect(problems?.kpis).toHaveLength(BUDGET.kpis);
    expect(problems?.findings).toHaveLength(BUDGET.findings);
    expect(problems?.assist).toHaveLength(BUDGET.assist);
    const exec = spec.slides[2];
    expect(exec?.kind === 'executive' ? exec.steps : []).toHaveLength(BUDGET.steps);
    expect(fit('a sentence that is far too long for its box', 20)).toBe('a sentence that is…');
    expect(fit('short', 20)).toBe('short');
  });

  it('tells a captured subject on one story slide: the picture, its numbers, the drawn evidence, findings, Assist and why it matters (3.3.5)', () => {
    const capture = spec.slides.find((slide): slide is CaptureSlide => slide.kind === 'capture' && slide.id === 'services');
    expect(capture?.title).toMatch(/^Services/);
    expect(capture?.title).not.toMatch(/In the app|in detail/);
    expect(capture?.capture.pins.length).toBeLessThanOrEqual(BUDGET.pins);
    // No "— in detail" slide any more: the subject is on one slide.
    expect(spec.slides.filter((slide) => (slide.kind === 'section' || slide.kind === 'capture') && slide.id === 'services')).toHaveLength(1);
    expect(capture?.kpis.length).toBeGreaterThan(0);
    // Every block the slide holds has a place, and none of them overlap.
    const layout = capture!.layout;
    const blocks = [layout.frame, layout.under, layout.beside, layout.pins, layout.findings, ...layout.cards, ...layout.kpis].filter((rect): rect is NonNullable<typeof rect> => rect !== null);
    for (const [i, a] of blocks.entries()) {
      for (const b of blocks.slice(i + 1)) {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, JSON.stringify([a, b])).toBe(true);
      }
    }
    // The table of the root-cause subject is evidence in itself: under the photograph, on the same slide.
    const rca = spec.slides.find((slide): slide is CaptureSlide => slide.kind === 'capture' && slide.id === 'rca');
    expect(rca?.under?.kind === 'visual' ? rca.under.visual.kind : rca?.under?.kind).toBe('table');
    // A section nobody photographed keeps its one drawn slide.
    expect(spec.slides.filter((slide) => (slide.kind === 'section' || slide.kind === 'capture') && slide.id === 'problems').map((slide) => slide.kind)).toEqual(['section']);
  });

  it('redacts what came from the tenant before either writer sees it (S6)', () => {
    const capture = spec.slides.find((slide): slide is CaptureSlide => slide.kind === 'capture' && slide.id === 'services');
    expect(capture?.capture.pins[0]?.label).not.toContain('ops@contoso.com');
    const rca = spec.slides.find((slide): slide is CaptureSlide => slide.kind === 'capture' && slide.id === 'rca');
    const cell = rca?.under?.kind === 'visual' && rca.under.visual.kind === 'table' ? rca.under.visual.rows[0]?.[0] : 'missing';
    expect(cell).not.toContain('admin@contoso.com');
  });
});

describe('the deck written into the template', () => {
  const slides = renderSlides(spec, PNG);

  it('writes the spec’s text, in the theme font, never a PostScript name (E4)', () => {
    const all = slides.map((slide) => slide.xml).join('');
    expect(all).toContain('2,606');
    expect(all).toContain('Executive summary');
    expect(all).toContain('typeface="+mn-lt"');
    expect(all).not.toMatch(/DTFlow-/);
  });

  it('draws the executive rings as native shapes: a track and an arc, a dashed ring when not measured', () => {
    const exec = slides[2]?.xml ?? '';
    expect(exec).toContain('prst="donut"');
    expect(exec).toContain('prst="blockArc"');
    expect(exec).toContain('prstDash val="dash"');
    expect(exec).toContain('88%');
    expect(exec).toContain('Investigate svc-catalog-01');
    expect(exec).not.toContain('Fourth, cut');
  });

  it('frames a capture, numbers its pins over the image and lists what each pin shows', () => {
    const index = spec.slides.findIndex((slide) => slide.kind === 'capture' && slide.id === 'services');
    const xml = slides[index]?.xml ?? '';
    expect(xml).toContain('name="capture services"');
    expect((xml.match(/prst="ellipse"/g) ?? []).length).toBe(2);
    expect(xml).toContain('Failure rate');
    // The capture keeps its aspect inside its frame.
    const rect = captureImageRect({ x: 0, y: 0, w: 6000000, h: 3000000 }, 1100, 550);
    expect(rect.w / rect.h).toBeCloseTo(2, 5);
  });

  it('produces a coherent package: one part, one id and one relationship per slide', async () => {
    const zip = await patchTemplate(spec, templateBytes(), meta);
    const presentation = (await zip.file('ppt/presentation.xml')?.async('string')) ?? '';
    const rels = (await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')) ?? '';
    const types = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
    expect((presentation.match(/<p:sldId /g) ?? []).length).toBe(spec.slides.length);
    for (let n = 1; n <= spec.slides.length; n += 1) {
      expect(zip.file(`ppt/slides/slide${n}.xml`), `slide${n}`).not.toBeNull();
      expect(types).toContain(`PartName="/ppt/slides/slide${n}.xml"`);
      expect(rels).toContain(`Target="slides/slide${n}.xml"`);
    }
    const core = (await zip.file('docProps/core.xml')?.async('string')) ?? '';
    expect(core).toContain('<dc:creator>Ada Lovelace</dc:creator>');
    expect(core).toContain('<dc:title>Contoso - Tech Wrapup</dc:title>');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const out = process.env.PVS_DECK_OUT;
    if (out !== undefined && out !== '') writeFileSync(out, bytes);
  });

  it('returns a Blob from the public builder', async () => {
    const blob = await buildTemplateDeck(spec, templateBytes(), meta);
    expect(blob.size).toBeGreaterThan(10_000);
  });

  it('declares a content-type for a webp logo (a missing one makes PowerPoint repair)', async () => {
    const webp = buildDeckSpec({ ...model, customerLogo: 'data:image/webp;base64,UklGRg==', customerLogoAspect: 2 }, { profile: 'customer' });
    const zip = await patchTemplate(webp, templateBytes(), meta);
    const types = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
    expect(types).toContain('Extension="webp"');
  });
});

describe('the corporate template (E2)', () => {
  it('carries no third-party personal data, add-in or SharePoint bookkeeping, and only the four layouts the deck uses', async () => {
    const zip = await JSZip.loadAsync(templateBytes());
    const names = Object.keys(zip.files);
    expect(names.some((name) => name.endsWith('authors.xml'))).toBe(false);
    expect(names.some((name) => name.startsWith('customXml/'))).toBe(false);
    expect(names.some((name) => name.startsWith('ppt/webextensions/'))).toBe(false);
    expect(names.some((name) => name.includes('thumbnail'))).toBe(false);
    expect(names.filter((name) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(name)).sort()).toEqual([
      'ppt/slideLayouts/slideLayout1.xml',
      'ppt/slideLayouts/slideLayout28.xml',
      'ppt/slideLayouts/slideLayout33.xml',
      'ppt/slideLayouts/slideLayout56.xml',
    ]);
    const core = (await zip.file('docProps/core.xml')?.async('string')) ?? '';
    expect(core).toContain('<dc:creator>Dynatrace</dc:creator>');
    expect(core).toContain('<cp:lastModifiedBy>Dynatrace</cp:lastModifiedBy>');
  });

  it('is the file `scripts/clean-pptx-template.cjs` produced (its SHA-256 is pinned)', () => {
    const path = join(process.cwd(), 'ui/assets/techwrapup-brand-template.pptx');
    expect(existsSync(path)).toBe(true);
    const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
    expect(sha).toBe('a9c1f37cf5d5834bc88652a3ecfabd938c51e1bfb2ff7435a566b0a76716300c');
  });
});

describe('XML text escaping', () => {
  it('drops characters XML 1.0 forbids, so a log line with an ANSI escape cannot corrupt a slide', () => {
    expect(esc('a\u001b[31mred\u001b[0m & <b>')).toBe('a[31mred[0m &amp; &lt;b&gt;');
  });

  // 3.2.7 review PS-4: a lone surrogate becomes ED A0 BD in UTF-8, which an XML parser must refuse.
  const LONE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  it('fit never cuts an emoji in half, at any budget', () => {
    const text = `PaymentGatewayTimeout${'🔥'.repeat(30)}`;
    const split: number[] = [];
    for (let max = 2; max < 80; max += 1) {
      const cut = fit(text, max);
      if (LONE.test(cut) || cut.length > max) split.push(max);
    }
    expect(split).toEqual([]);
    expect(fit(text, 23)).toBe('PaymentGatewayTimeout…');
    expect(fit(text, 24)).toBe('PaymentGatewayTimeout🔥…');
  });

  it('drops an unpaired surrogate and keeps a pair', () => {
    expect(esc('a\uD83D b\uDD25 c🔥 &')).toBe('a b c🔥 &amp;');
    expect(LONE.test(esc('x\uD83D'))).toBe(false);
  });
});
