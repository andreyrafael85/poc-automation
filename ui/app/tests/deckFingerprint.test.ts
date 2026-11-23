import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { createElement } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import type { WrapupModel } from '../features/wrapup/deck';
import { DeckPreview } from '../features/wrapup/DeckPreview';
import { patchTemplate, renderSlides } from '../features/wrapup/pptxTemplate';
import { buildDeckSpec, type DeckCapture, type DeckSpec, type ExecutiveInput } from '../features/wrapup/spec';
import { readTemplateArt, type TemplateArt } from '../features/wrapup/templateArt';
import { setActiveLocaleTag } from '../utils/activeLocale';

/**
 * The golden guard of the Tech Wrapup deck (3.2.7, WP1 of the real-prints deck).
 *
 * The prints deck reuses the Tech Wrapup's shared files: `spec.ts` gives up its cover, agenda and
 * end slides as helpers, `pptxTemplate.ts` gains a kit, a crop and opt-in media flags, and
 * `DeckPreview.tsx` gains a dispatch line. Each of those edits promises "no output change" for the
 * existing deck. These hashes were pinned on the untouched code (2026-10-05, before any of those
 * edits), so the promise is checked byte for byte instead of believed:
 * - every slide the PPTX writer renders (layout, XML, media),
 * - the template package `patchTemplate` writes (its parts and their bytes),
 * - the on-screen preview's DOM.
 *
 * If one of these fails after an edit to a shared deck file, the edit changed the existing deck:
 * fix the edit. Re-pin only for a change to the Tech Wrapup deck the owner asked for, and say so
 * in the commit.
 *
 * ## Re-pin log
 *
 * - **3.7.9, `slides` / `package` / `preview` of `customer`, `se` and `options`** — the owner's approval of the Value
 *   cycle proposal (2026-11-23, "seguir com a 3.7.9", decision D3 "Sim, refazer o golden (Recommended)"): the Coverage
 *   section of the deck shows the value events the PoC demonstrated (the Autonomous Value Cycle) in place of the maturity
 *   step, and its capture is `assessment.cycle` (the ring, the links' counts and the autonomy ladder) in place of the
 *   maturity rings. The fixture's coverage section and its capture pins follow. The `.pptx` changes **deliberately**;
 *   `bare` has no coverage section and did not move.
 *
 * - **3.5.6, `slides` / `package` / `preview` of `customer` and `se`** — the owner's validation of 3.5.5
 *   (2026-11-21: "no deck techwrapup ainda com os pins errados da captura do app e poucas explicações; recomendei
 *   ter de 4 a 5 pins por captura com informações ricas"), on the v5 proposal he approved with its golden re-pin
 *   ("seguir com a v5 … além dos tech wrapups"). A capture slide keeps up to five pins (was four); the legend is
 *   "How to read" — each pin's label, its technical reading and the capability it shows, set small — and takes the
 *   right column before the number tiles do (six, three, two, none); a pin is drawn at the size the stage measured
 *   it (`capturePinSize`, 0.15–0.24 in). The fixture's pins gained readings and chips. The `.pptx` changes
 *   **deliberately**. `options` and `bare` have no capture and did not move.
 * - **3.4.12, `slides` / `package` of `customer` and `se`** — the owner's validation of 3.4.11 (2026-11-19):
 *   "Na maioria dos slides que contêm números… do lado direito está cortando pouco os valores, precisamos
 *   ajustar o size correto dos números e validar todos os slides" (his picture: "P-26114811" and "7.1 h" at
 *   the edge of their tiles). Every number tile — the section's row, the capture slide's column, the
 *   executive page — now sets its value with `kpiFitSize`, measured against the tile's own width, and the
 *   room kept for the renderer went from 2 % to 12 % (`CAPTURE_KPI_SLACK`), which also widens the bars'
 *   value gutter. Only type sizes and gutters moved; the fixtures did not change. The `.pptx` changes
 *   **deliberately**. `options`, `bare` and every `preview` did not move.
 * - **3.4.10, `kinds` / `slides` / `package` / `preview` of `customer`, `se` and `options`** — the owner's order
 *   of 2026-11-18 on proposal §C8 F-02 ("Capturas de telas no deck do Tech Wrapup… somente o golden do deck
 *   (regra 12)", confirmed as "Sim, os três"): the Assessment enters the Tech Wrapup as the first business
 *   section — the coverage index, the maturity step, the capabilities in use, the critical findings, coverage
 *   by domain and the first actions — with a picture of the maturity rings (or the coverage radar). The
 *   fixture `MODEL` gained that section and `CAPTURES` its picture, so the new slide is pinned. The `.pptx`
 *   changes **deliberately**. `bare` has no section and did not move.
 * - **3.3.17, `slides` / `package` / `preview` of `customer` and `se`** — the owner's 3.3.16 validation:
 *   the deck's slide 3 "Executive summary" was "still old, with text that does not fit, and the same
 *   title and slide compete with slide 18 — how can we improve this opening slide with the customer? Be
 *   creative". It is now **"The PoC on one page"**: three questions a customer asks (do we see the whole
 *   estate, are problems found and solved, are services and users well served), each over its ring with
 *   a measured answer under it, beside the next steps; the row of five numbers is gone (the answers
 *   carry them), and the verdict reads a slide's own words instead of the app's "the view below". The
 *   fixture `EXECUTIVE` gained the questions and answers. The `.pptx` changes **deliberately**.
 *   `options` and `bare` have no executive slide and did not move. Layout pinned independently in
 *   `tests/v3317.test.tsx`.
 * - **3.3.5, `kinds` / `slides` / `package` / `preview` of `customer` and `se`; `preview` of `options`
 *   and `bare`** — the owner's 3.3.4 validation asked to **join into one slide what took two** and to
 *   make it richer: a captured subject is now **one story slide** (the picture at its column's width,
 *   the numbers and pins beside it, a strip of key findings / why it matters / Assist along the bottom,
 *   the drawn chart under a wide panel), and the "— in detail" slide is gone. The `.pptx` changes
 *   **deliberately**. `options` and `bare` have no capture: their `.pptx` did not move; only their
 *   preview's font stack gained the neutral theme's face (`Segoe UI`, for a copy without the brand
 *   pack). Layout pinned independently in `tests/pptxTemplate.test.ts` and `tests/v326.test.tsx`.
 * - **3.3.3, `kinds` / `slides` / `package` / `preview` of `customer` and `se`** — the owner's 3.3.2
 *   validation asked for **at most two slides per subject**, no near-duplicate slides, and richer
 *   ones: a captured subject now **opens on its capture** (titled as the section) and its drawn slide
 *   follows as the **detail** ("— in detail"), without the KPIs or the Assist the capture slide already
 *   carries, closing on what the platform did (`valueLines`). The `.pptx` changes **deliberately**.
 *   `options` and `bare` have no capture and did not move. Structure pinned independently in
 *   `tests/pptxTemplate.test.ts` and `tests/captureRegistry.test.tsx`.
 * - **3.3.1, `slides` / `package` / `preview` of `customer`, `se` and `options`** — the owner's
 *   3.2.7 round §17-a: the Tech Wrapup logs slide printed "1.557.000" without its last digit.
 *   Both writers gave a bar's value a **fixed 600,000 EMU** box (~33 pt usable) and the value
 *   measures 62 pt in the deck's bold face. The gutter is now measured from the widest value of
 *   the chart (`barValueGutterEmu`), so **this time the `.pptx` the customer receives changes** —
 *   deliberately, because the number in it was wrong. Only charts with a `bars` visual move;
 *   `bare` has none and is unchanged. Geometry pinned independently in `tests/v331.test.ts`.
 * - **3.3.0, `preview.customer` / `preview.se` / `preview.options`** — the owner's 3.2.7 round
 *   asked for a hint on the texts the preview clips (§17-c), so a KPI value and a table cell now
 *   carry a `title` with the whole text. **`kinds`, `slides` and `package` were not re-pinned and
 *   did not move**: the `.pptx` the customer receives is byte-identical; only the on-screen DOM
 *   gained an attribute. `preview.bare` is unchanged (that variant draws neither KPIs nor a table).
 */

const GOLDEN = {
  kinds: {
    customer: 'cover,agenda,executive,divider,section,capture,section,capture,divider,capture,section,end',
    se: 'cover,agenda,executive,divider,section,capture,section,capture,divider,capture,section,end',
    options: `cover,agenda,divider,section,section,section,section,divider,${'section,'.repeat(15)}end`,
    bare: 'cover,agenda,end',
  },
  slides: {
    customer: 'b9c88a36c58230e15d67fcc7cfbdf060fb6560b297d60d3cf6df9e230520fea7',
    se: '0367699d04c2520906ee172a880d56c38626ae4274c063b77366af51875ced12',
    options: '844ba52311cfa1dac1ed0da1dfe3fcb60432c1ae3cf756f357dbdad5961e76e4',
    bare: 'f5d17042a9ca19201fb6ff235151d6c4b835c63fee4066ce60f9e56077d447fe',
  },
  package: {
    customer: '22186e4ea6a2bf5cca3875f5e9a71ddafe7636962e77cc4ae94a9946bc6fe148',
    se: '2afb9dbc7483af5caa077cb4cb3dd077b88c4c7e80945d19005b716a0cfe9b5f',
    options: 'd9da403f5a59c5effe7c6cfe24d3faf2849ba6ed92db9d9825b034d456c1c93e',
    bare: '2f60e5bfbc70ce15c63d949c2af1ea70a63a092f720beca130550ab0baa8c2f4',
  },
  preview: {
    customer: '99b3addf33b400aa069e6402ea6c955efd07fa940567e318250bc0c259f661a1',
    se: '95279b28be7e0eaedd519627fc3f3975c23c8bb6b69f7879ec7d362ac115cd2a',
    options: 'aa941daf1a653734cfea1be49bb033e8ed099e61dc123fb59a8b9feda56be3c7',
    bare: '74202726cc498efd641d9343d5cf3529c9d216fbe84745a41855acdd60c41943',
  },
} as const;

const TEMPLATE = new Uint8Array(readFileSync(join(process.cwd(), 'ui/assets/techwrapup-brand-template.pptx')));

// Two 4 × 2 PNGs with different pixels (the fixtures of pptxTemplate.test.ts and v324.test.tsx): high-entropy bytes, not secrets.
const PNG_A =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwABjDAGACM8Au8Wy10JAAAAAElFTkSuQmCC';
const PNG_B =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwAEjDAGACCDAv8cI7IoAAAAAElFTkSuQmCC';

/** The deck model of `wrapup.test.ts` and `pptxTemplate.test.ts`, widened to every visual and to tenant text that must be redacted. */
const MODEL: WrapupModel = {
  customerName: 'Contoso',
  engagementName: 'Observability PoC',
  windowLabel: 'last 24 hours',
  generatedAtLabel: 'Generated 2026-09-10',
  seName: 'Ada Lovelace',
  dtLogo: PNG_A,
  customerLogo: PNG_B,
  customerLogoAspect: 2,
  partnerName: 'Acme Consulting',
  partnerLogo: PNG_A,
  partnerLogoAspect: 3,
  platformLogos: [],
  agenda: [],
  why: [],
  strings: {
    title: 'Tech Wrapup — What Dynatrace discovered',
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
      narrative: ['2,606 problems detected in 7 days', 'Most of them closed on their own', 'Errors lead', 'Fourth line', 'Fifth line', 'Sixth line, cut'],
      assist: ['Dynatrace closed 97% of problems.', 'Second', 'Third', 'Fourth, cut'],
      kpis: [
        { label: 'Problems', value: '2,606', emoji: '🚨' },
        { label: 'Problems closed', value: '97%', status: 'good' },
        { label: 'Open', value: '41', status: 'warn' },
        { label: 'Critical', value: '3', status: 'bad' },
        { label: 'e', value: '5' },
        { label: 'f, cut', value: '6' },
      ],
      bars: { title: 'MTTR by category (h)', items: [{ label: 'ERROR', value: 11.5 }, { label: 'RESOURCE', value: 18.9 }, { label: 'AVAILABILITY', value: 2 }] },
    },
    {
      id: 'rca',
      title: 'Root-cause analysis',
      narrative: ['One incident, taken to its cause on ip-10-0-1-2.ec2.internal'],
      table: {
        title: 'This incident’s error logs',
        headers: ['Error message', 'Count', 'Service', 'Host', 'Fifth, cut'],
        rows: [
          ['Connection refused to db.internal:5432 for user admin@contoso.com', '12', 'svc-a', '10.1.2.3', 'x'],
          ['Timeout after 30000 ms', '4', 'svc-b', 'host-b', 'y'],
        ],
      },
    },
    {
      id: 'security',
      title: 'Security & runtime risk',
      narrative: ['575 open vulnerabilities graded by Davis severity'],
      pie: { title: 'By severity', data: { labels: ['Critical', 'High', 'Medium', 'Low', 'None'], values: [8, 142, 318, 55, 0] } },
    },
    {
      id: 'services',
      title: 'Services & tracing',
      narrative: ['70 services traced', 'Failures concentrate in one service', 'Response time held'],
      kpis: [{ label: 'Requests', value: '4.8m' }, { label: 'Failure rate of the busiest service', value: '12.34567%' }],
      bars: { title: 'Busiest services', items: [{ label: 'svc-a', value: 3 }] },
    },
  ],
  business: [
    // 3.4.10 (F-02): the Assessment opens the business part, with its capture. 3.7.9: the Value cycle, not the maturity rings.
    {
      id: 'assessment',
      title: 'Environment coverage',
      subtitle: 'What Dynatrace covers and maps, the value cycle and the next steps',
      highlight: { value: '80/100', caption: 'observable coverage of the environment' },
      narrative: ['The PoC already demonstrated 12 value events across the value cycle — Context, Cause, Impact, Action.', 'Findings: critical 3, attention 9, opportunities 6.'],
      kpis: [
        { label: 'Observable coverage', value: '80/100' },
        { label: 'Value events', value: '12' },
        { label: 'Capabilities in use', value: '8/13' },
        { label: 'Critical findings', value: '3', status: 'warn' },
      ],
      bars: { title: 'Coverage by domain (%)', items: [{ label: 'Infrastructure', value: 100 }, { label: 'Logs in context', value: 1 }] },
      assist: ['P1 — Investigate the failure rate of "svc-catalog-01"'],
    },
    {
      id: 'executive',
      title: 'Executive summary',
      narrative: ['One platform replaced fragmented tooling'],
      kpis: [{ label: 'Entities', value: '1,204' }],
    },
  ],
};

const EXECUTIVE: ExecutiveInput = {
  // 3.3.17: "The PoC on one page" — three questions, each answered by its ring and a measured sentence.
  title: 'The PoC on one page',
  subtitle: 'Three questions the PoC answered, with figures read from your environment',
  verdict: { text: 'Stable — resolution times are reasonable and the open backlog is contained.', tone: 'good' },
  rings: [
    { label: 'Categories with telemetry', value: 88, display: '88%', question: 'Do we see the whole estate?', answer: '695 entities monitored and 88% of the categories with telemetry — discovered by OneAgent, none declared by hand.' },
    { label: 'Problems closed', value: 100, display: '100%', question: 'Are problems found and solved?', answer: '7,693 problems detected in 7 days and 100% of them already closed; the mean time to resolve is 6.9 h.' },
    { label: 'Services under 1% failures', value: null, display: '—', question: 'Are services and users well served?', answer: 'Not measured in this window — the slide says so instead of guessing.' },
  ],
  numbers: [],
  stepsTitle: 'Next steps',
  steps: [
    { title: 'Investigate svc-catalog-01', body: 'Open the failing requests.' },
    { title: 'Resolve read access for 7 buckets', body: 'Decide which the identity should read.' },
    { title: 'Third', body: 'Third body.' },
    { title: 'Fourth, cut', body: 'Never shown.' },
  ],
  note: 'Every figure is read from the tenant.',
};

const CAPTURES: Readonly<Record<string, DeckCapture>> = {
  services: {
    dataUrl: PNG_A,
    width: 1100,
    height: 550,
    pins: [
      { n: 1, x: 0.2, y: 0.3, label: 'Peak of requests at 22:00, owner ops@contoso.com' },
      { n: 2, x: 0.8, y: 0.6, label: 'Failure rate', detail: 'Measured on real requests by distributed tracing.', capability: 'Distributed tracing' },
      { n: 3, x: 0.5, y: 0.8, label: 'Evidence: Observed · query svc.ranking', detail: 'Every number carries its evidence class, its query and its read time.', capability: 'Provenance on every number' },
    ],
  },
  assessment: {
    dataUrl: PNG_A,
    width: 1100,
    height: 420,
    pins: [
      { n: 1, x: 0.18, y: 0.5, label: '12 value events demonstrated', detail: 'Every value event comes from a read of this environment: a number that only grows as the PoC delivers.', capability: 'Assessment' },
      { n: 2, x: 0.62, y: 0.2, label: '02 Cause: 3 demonstrated', detail: 'Cause: problems detected and explained by Dynatrace Intelligence, with the root cause found without a war room.', capability: 'Dynatrace Intelligence · root cause' },
    ],
  },
  rca: {
    dataUrl: PNG_B,
    width: 720,
    height: 330,
    frame: '1B1D2E',
    pins: [
      { n: 1, x: 0.1, y: 0.2, label: 'Requests in the window: 1.2M' },
      { n: 2, x: 0.6, y: 0.5, label: 'Peak of failure rate', detail: 'The root cause Dynatrace Intelligence named on the dependency graph.', capability: 'Dynatrace Intelligence · root cause' },
      { n: 3, x: 0.3, y: 0.7, label: 'Third pin' },
      { n: 4, x: 0.5, y: 0.9, label: 'Fourth pin' },
      { n: 5, x: 0.9, y: 0.1, label: 'Fifth pin, cut' },
    ],
  },
};

/**
 * The decks the hashes are taken from. `customer` and `se` are the full deck in each profile. The
 * other two exist for the cover, agenda and end helpers WP6 extracts from `buildDeckSpec`: every
 * option those helpers take is set away from its default (`options`: a custom cover title cut to
 * its budget, a non-default SE label, a custom agenda title, an agenda longer than it can list, no
 * logos and a blank partner), or left at its emptiest (`bare`: no customer, no SE, no section, an
 * empty cover title that falls back to the model's).
 */
const VARIANTS = ['customer', 'se', 'options', 'bare'] as const;
type Variant = (typeof VARIANTS)[number];

const LABELS = {
  findingsLabel: 'Key findings',
  captureLabel: 'In the app',
  pinsLabel: 'What it shows',
  watermark: 'SE internal — not for the customer',
} as const;

/** Thirteen more sections: with the six of `MODEL` (five until 3.4.10), nineteen agenda items for the agenda's sixteen. */
const EXTRA_SECTIONS: WrapupModel['business'] = Array.from({ length: 13 }, (_, index) => ({
  id: `extra-${index + 1}`,
  title: `Extra section ${index + 1} with a title long enough to be cut at the agenda's own item budget`,
  narrative: [`Line ${index + 1}`],
}));

const MODELS: Record<Variant, WrapupModel> = {
  customer: MODEL,
  se: MODEL,
  options: {
    ...MODEL,
    customerLogo: null,
    customerLogoAspect: null,
    partnerName: '   ',
    partnerLogo: null,
    partnerLogoAspect: null,
    business: [...MODEL.business, ...EXTRA_SECTIONS],
  },
  bare: { ...MODEL, customerName: '  ', seName: null, technical: [], business: [] },
};

function specFor(variant: Variant): DeckSpec {
  const model = MODELS[variant];
  switch (variant) {
    case 'customer':
    case 'se':
      return buildDeckSpec(model, { profile: variant, executive: EXECUTIVE, captures: CAPTURES, seLabel: 'Solutions Engineer', ...LABELS });
    case 'options':
      return buildDeckSpec(model, {
        profile: 'se',
        coverTitle: `TIP - Contoso - Tech Wrapup · a custom cover title that runs well past the cover's own budget of ninety characters`,
        seLabel: 'Engenheira de Soluções',
        agendaTitle: 'Roteiro do dia',
        ...LABELS,
        watermark: '',
      });
    case 'bare':
      return buildDeckSpec(model, { profile: 'customer', coverTitle: '' });
  }
}

/** The author stamped into the package: none for the bare deck (`stampAuthor` leaves the template's). */
const AUTHOR: Record<Variant, string | null> = { customer: 'Ada Lovelace', se: 'Ada Lovelace', options: 'Ada Lovelace', bare: null };

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Every rendered slide: its layout, its XML and its media (relationship id and extension). */
function slidesFingerprint(spec: DeckSpec): string {
  return sha256(
    renderSlides(spec, PNG_A)
      .map((slide) => [String(slide.layout), slide.title, slide.xml, slide.media.map((item) => `${item.embedId}:${item.ext}:${sha256(item.base64)}`).join(',')].join('\n'))
      .join('\n\u0000\n'),
  );
}

/** The patched package: the sorted part list, then the bytes of every part the patch writes or rewrites. */
async function packageFingerprint(spec: DeckSpec, seName: string | null): Promise<string> {
  const zip = await patchTemplate(spec, TEMPLATE, { dtLogo: PNG_A, seName });
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir).sort();
  const written = names.filter(
    (name) =>
      name === '[Content_Types].xml' ||
      name === 'ppt/presentation.xml' ||
      name === 'ppt/_rels/presentation.xml.rels' ||
      name === 'docProps/core.xml' ||
      name.startsWith('ppt/slides/') ||
      /^ppt\/media\/genimg\d+\./.test(name),
  );
  const parts: string[] = [names.join('\n')];
  for (const name of written) parts.push(`${name}\n${await zip.file(name)?.async('base64')}`);
  return sha256(parts.join('\n\u0000\n'));
}

function previewFingerprint(spec: DeckSpec, art: TemplateArt): string {
  const { container, unmount } = render(
    createElement(DeckPreview, { spec, art, dtLogo: PNG_A, slideLabel: (n: number, total: number, title: string) => `Slide ${n} of ${total}: ${title}` }),
  );
  const html = container.innerHTML;
  unmount();
  return sha256(html);
}

let art: TemplateArt = {};

beforeAll(async () => {
  // `decimal()` (bar values) reads the module-level locale; pin it so the hashes do not depend on test order.
  setActiveLocaleTag('en-GB');
  art = await readTemplateArt(TEMPLATE);
});

describe('the Tech Wrapup deck is byte-identical to the pinned golden', () => {
  it.each(VARIANTS)('plans the same slides (%s)', (variant) => {
    expect(specFor(variant).slides.map((slide) => slide.kind).join(',')).toBe(GOLDEN.kinds[variant]);
  });

  it.each(VARIANTS)('renders the same slide XML and media (%s)', (variant) => {
    expect(slidesFingerprint(specFor(variant))).toBe(GOLDEN.slides[variant]);
  });

  it.each(VARIANTS)('writes the same template package (%s)', async (variant) => {
    expect(await packageFingerprint(specFor(variant), AUTHOR[variant])).toBe(GOLDEN.package[variant]);
  });

  it.each(VARIANTS)('draws the same preview (%s)', (variant) => {
    expect(previewFingerprint(specFor(variant), art)).toBe(GOLDEN.preview[variant]);
  });

  it('is deterministic: two renders of one spec hash the same', async () => {
    const spec = specFor('customer');
    expect(slidesFingerprint(spec)).toBe(slidesFingerprint(spec));
    expect(await packageFingerprint(spec, AUTHOR.customer)).toBe(await packageFingerprint(spec, AUTHOR.customer));
    expect(previewFingerprint(spec, art)).toBe(previewFingerprint(spec, art));
  });

  it('covers what the shared-file edits touch: images, the template art, redaction and both footers', () => {
    const customer = specFor('customer');
    const se = specFor('se');
    expect(customer.confidential).not.toBe(se.confidential);
    const xml = renderSlides(customer, PNG_A).map((slide) => slide.xml).join('');
    expect(xml).toContain('<p:pic>');
    expect(xml).not.toContain('admin@contoso.com');
    expect(art.coverBackground ?? '').toMatch(/^data:image\//);
  });

  it('covers every option of the cover, agenda and end helpers, away from its default and at its emptiest', () => {
    const at = <K extends DeckSpec['slides'][number]['kind']>(spec: DeckSpec, kind: K) =>
      spec.slides.find((slide): slide is Extract<DeckSpec['slides'][number], { kind: K }> => slide.kind === kind);
    const options = specFor('options');
    const cover = at(options, 'cover');
    expect(cover?.title.startsWith('TIP - Contoso - Tech Wrapup · a custom cover title')).toBe(true);
    expect(cover?.title.endsWith('…')).toBe(true);
    expect(cover?.seLine).toBe('Engenheira de Soluções: Ada Lovelace');
    expect(cover?.partnerLine).toBeNull();
    expect(cover?.customerLogo).toBeNull();
    expect(at(options, 'agenda')?.title).toBe('Roteiro do dia');
    expect(at(options, 'agenda')?.items).toHaveLength(16);
    expect(at(options, 'agenda')?.items.some((item) => item.endsWith('…'))).toBe(true);
    expect(at(options, 'end')?.partnerLogo).toBeNull();
    expect(options.confidential).toBe(MODEL.strings.confidential);
    const bare = specFor('bare');
    expect(at(bare, 'cover')?.title).toBe(MODEL.strings.title);
    expect(at(bare, 'cover')?.seLine).toBeNull();
    expect(at(bare, 'agenda')?.items).toEqual([]);
  });
});

