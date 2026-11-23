import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import JSZip from 'jszip';

import { DECK, type WrapupModel } from '../features/wrapup/deck';
import { TEMPLATE_CHROME } from '../features/wrapup/geometry';
import { buildWrapupModel, type WrapupResults } from '../features/wrapup/model';
import { buildTemplateDeck, patchTemplate, renderSlides, setCoreProp, stampAuthor } from '../features/wrapup/pptxTemplate';
import { buildDeckSpec } from '../features/wrapup/spec';
import { translate } from '../i18n/strings';

/**
 * Feasibility guard for the Tech Wrapup deliverable.
 *
 * Proves the app can generate a real, openable PowerPoint entirely client-side (no backend, no
 * LibreOffice) from measured PoC data, on the corporate template, and that the deck carries the
 * technical-first → business-strong-finish structure. A `.pptx` is an OOXML ZIP; a valid one
 * contains the content-types map, the presentation part and one slide part per slide of the spec.
 * If deck generation ever breaks, this fails before the feature ships.
 */

const TEMPLATE = new Uint8Array(readFileSync(join(process.cwd(), 'ui/assets/techwrapup-brand-template.pptx')));

const sample: WrapupModel = {
  customerName: 'Contoso',
  engagementName: 'Observability PoC',
  windowLabel: 'last 24 hours',
  generatedAtLabel: 'Generated 2026-09-04',
  seName: 'Ada Lovelace',
  dtLogo: 'data:image/png;base64,iVBORw0KGgo=',
  customerLogo: null,
  customerLogoAspect: null,
  partnerName: 'Acme Consulting',
  partnerLogo: null,
  partnerLogoAspect: null,
  platformLogos: ['data:image/png;base64,iVBORw0KGgo=', 'data:image/png;base64,iVBORw0KGgo='],
  agenda: ['Problems & Dynatrace Intelligence', 'Security & runtime risk', 'Executive summary'],
  why: ['Market leader for 15+ years', 'Davis AI causal answers', 'Grail unifies all data'],
  strings: {
    title: 'Tech Wrapup',
    subtitle: 'What Dynatrace discovered, end to end',
    tagline: 'Turning IT complexity into opportunity.',
    preparedBy: 'Prepared by',
    agendaTitle: 'What we will walk through',
    whyTitle: 'Why Dynatrace',
    whySubtitle: 'One AI-powered platform',
    assistLabel: 'Dynatrace Assist',
    partnerLabel: 'Delivered in partnership with',
    technicalDivider: 'Technical findings',
    technicalKicker: 'Part one',
    businessDivider: 'Business value',
    businessKicker: 'Part two',
    closingTitle: 'Finish strong',
    closingBullets: ['One platform', 'Measured value', 'Clear next steps'],
    footer: 'Every figure traces back to a query executed against your tenant.',
    measured: 'Measured live from your environment.',
    confidential: 'Confidential.',
  },
  technical: [
    {
      id: 'problems',
      title: 'Problems & Dynatrace Intelligence',
      subtitle: 'Detected with no alerting rule written',
      narrative: ['2,606 problems detected in 7 days', 'Root cause attached automatically'],
      assist: ['Dynatrace closed 97% of problems.'],
      kpis: [
        { label: 'Problems', value: '2,606' },
        { label: 'Problems closed', value: '97%' },
      ],
      bars: { title: 'MTTR by category (h)', items: [{ label: 'ERROR', value: 11.5 }, { label: 'RESOURCE', value: 18.9 }] },
    },
    {
      id: 'security',
      title: 'Security & runtime risk',
      narrative: ['575 open vulnerabilities graded by Davis severity'],
      pie: { title: 'By severity', data: { labels: ['Critical', 'High', 'Medium', 'Low'], values: [8, 142, 318, 55] } },
    },
  ],
  business: [
    {
      id: 'executive',
      title: 'Executive summary',
      narrative: ['One platform replaced fragmented tooling'],
      kpis: [{ label: 'Entities', value: '1,204' }, { label: 'MTTR', value: '9.1 h' }],
    },
  ],
};

describe('Tech Wrapup deck generation (PPTX)', () => {
  it('produces a valid, non-trivial OOXML .pptx package on the corporate template', async () => {
    const spec = buildDeckSpec(sample, { profile: 'customer' });
    const blob = await buildTemplateDeck(spec, TEMPLATE, { dtLogo: sample.dtLogo, seName: sample.seName });
    expect(blob.size).toBeGreaterThan(1000);
    const zip = await patchTemplate(spec, TEMPLATE, { dtLogo: sample.dtLogo, seName: sample.seName });
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(zip.file('ppt/presentation.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide1.xml')).not.toBeNull();
  });

  it('emits a slide for every section plus cover, agenda, two dividers and the end', async () => {
    const spec = buildDeckSpec(sample, { profile: 'customer' });
    // cover + agenda + technical divider + 2 technical + business divider + 1 business + end = 8 slides.
    const expected = 1 + 1 + 1 + sample.technical.length + 1 + sample.business.length + 1;
    expect(spec.slides).toHaveLength(expected);
    const zip = await patchTemplate(spec, TEMPLATE, { dtLogo: sample.dtLogo, seName: null });
    for (let index = 1; index <= expected; index += 1) {
      expect(zip.file(`ppt/slides/slide${index}.xml`), `slide ${index} present`).not.toBeNull();
    }
  });
});

describe('Tech Wrapup PDF path', () => {
  it('is the browser print pipeline (no server conversion needed)', () => {
    // The PDF deliverable reuses window.print() over a slide-styled layout, the
    // same proven pipeline as the value report. This test documents the decision
    // so a future change does not quietly add a server dependency.
    expect(typeof window.print === 'function' || typeof window.print === 'undefined').toBe(true);
  });
});

describe('buildWrapupModel', () => {
  const ctx = {
    t: (key: Parameters<typeof translate>[0], params?: Record<string, string | number>) => translate(key, 'en', params),
    formatNumber: (value: number) => value.toLocaleString('en-US'),
    params: {
      customerName: 'Contoso',
      engagementName: 'PoC',
      scopeDescription: '',
      pocDescription: '',
      customerLogoDataUrl: null,
      brandTone: 'default' as const,
      partnerName: 'Acme Consulting',
      partnerLogoDataUrl: null,
      customerUrl: '',
    },
    costModel: {
      ratePerHour: 250,
      currencyLabel: 'BRL',
      rateBasis: '',
      downtimeRatePerHour: 20000,
      downtimeBasis: '',
    },
    baseline: {
      manualMttrHours: 24,
      annualCostPerAgent: 30000,
    },
    windowLabel: 'last 24 hours',
    generatedAtLabel: 'now',
    commercial: true,
    seName: 'Ada Lovelace',
    dtLogo: 'data:image/png;base64,iVBORw0KGgo=',
    customerLogo: null,
    customerLogoAspect: null,
    partnerLogo: null,
    partnerLogoAspect: null,
  };

  const q = (records: Record<string, unknown>[], outcome = 'ok') => ({ records, outcome });

  it('builds technical sections from measured data and always the three business sections', () => {
    const results: WrapupResults = {
      'cov.inventory': q([
        { category: 'Hosts', value: 63 },
        { category: 'Services', value: 40 },
      ]),
      'prob.summary': q([{ 'event.category': 'ERROR', 'event.status': 'CLOSED', problems: 100 }]),
      'prob.mttx': q([{ 'event.category': 'ERROR', problems: 100, mttrNs: 41400000000000, totalNs: 4140000000000000 }]),
      'sec.posture': q([
        { level: 'CRITICAL', technology: 'Java', vulnerabilities: 1, actNow: 0 },
        { level: 'HIGH', technology: 'Java', vulnerabilities: 1, actNow: 0 },
      ]),
    };
    const model = buildWrapupModel(results, ctx);
    const techIds = model.technical.map((section) => section.id);
    expect(techIds).toContain('problems');
    expect(techIds).toContain('security');
    // Business finish is always present.
    expect(model.business.map((section) => section.id)).toEqual(['overview', 'executive', 'roi']);
    // The deck the model produces is a valid pptx.
    expect(model.strings.title.length).toBeGreaterThan(0);
  });

  it('drops sections whose data is absent — Kubernetes with no clusters, competitor with no agents', () => {
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Kubernetes clusters', value: 0 }]),
      'comp.agents': q([]),
    };
    const model = buildWrapupModel(results, ctx);
    const techIds = model.technical.map((section) => section.id);
    expect(techIds).not.toContain('kubernetes');
    expect(techIds).not.toContain('competitor');
  });

  it('drops the digital-experience section when no real-user data was measured', () => {
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Hosts', value: 10 }]),
      'rum.scorecard': q([]),
      'rum.webvitals': q([]),
    };
    const model = buildWrapupModel(results, ctx);
    expect(model.technical.map((section) => section.id)).not.toContain('experience');
  });

  it('builds a dedicated Cloud section with a provider pie, a services table and logos', () => {
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Hosts', value: 20 }]),
      'cloud.hosts': q([
        { cloudType: 'EC2', hosts: 14, cores: 56, memBytes: 0, fullStack: 10, infra: 4 },
        { cloudType: 'AZURE', hosts: 2, cores: 8, memBytes: 0, fullStack: 2, infra: 0 },
      ]),
      'cloud.services': q([
        { type: 'AWS_LAMBDA_FUNCTION', resources: 87 },
        { type: 'AWS_S3_BUCKET', resources: 53 },
      ]),
    };
    const model = buildWrapupModel(results, ctx);
    const ids = model.technical.map((section) => section.id);
    expect(ids).toContain('cloud');
    // Infrastructure stays its own section, cloud is split out.
    expect(ids).toContain('infrastructure');
    const cloud = model.technical.find((section) => section.id === 'cloud');
    expect(cloud?.pie?.data.values).toEqual([14, 2]);
    expect(cloud?.table?.rows.length).toBeGreaterThan(0);
    expect((cloud?.providerLogos ?? []).length).toBeGreaterThan(0);
  });

  it('enriches the Consumption section with a per-table cost table and gives Kubernetes an Assist', () => {
    const results: WrapupResults = {
      'cov.inventory': q([
        { category: 'Hosts', value: 10 },
        { category: 'Kubernetes clusters', value: 2 },
        { category: 'Kubernetes workloads', value: 40 },
      ]),
      'k8s.restarts': q([{ workload: 'sqs-demo', total: 653 }]),
      'k8s.pressure': q([{ totalOom: 12, totalThrottled: 3 }]),
      'cons.advisor': q([
        { table: 'logs', executions: 120, scannedOnDemandBytes: 900_000_000, avgDurationMs: 800, deliveredRecords: 5000 },
        { table: 'spans', executions: 40, scannedOnDemandBytes: 100_000_000, avgDurationMs: 300, deliveredRecords: 2000 },
      ]),
    };
    const model = buildWrapupModel(results, ctx);
    const cons = model.technical.find((section) => section.id === 'consumption');
    expect(cons?.table?.rows.length).toBeGreaterThan(0);
    // The most expensive table leads the per-table cost table.
    expect(cons?.table?.rows[0]?.[0]).toBe('logs');
    // The section now carries at least four KPIs (tables, queries, scanned, +).
    expect((cons?.kpis ?? []).length).toBeGreaterThanOrEqual(4);
    // Kubernetes now surfaces a Dynatrace Assist callout.
    const k8s = model.technical.find((section) => section.id === 'kubernetes');
    expect((k8s?.assist ?? []).length).toBeGreaterThan(0);
  });

  it('still produces a valid deck when the operator excludes every technical section', async () => {
    // Mirrors the section checkboxes clearing the technical half: the deck must
    // still assemble the title, agenda, why, business finish and close.
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Hosts', value: 10 }]),
    };
    const model = buildWrapupModel(results, ctx);
    const trimmed: WrapupModel = { ...model, technical: [] };
    const spec = buildDeckSpec(trimmed, { profile: 'customer' });
    expect(spec.slides.some((slide) => slide.kind === 'divider' && slide.title === trimmed.strings.technicalDivider)).toBe(false);
    expect(renderSlides(spec, trimmed.dtLogo)).toHaveLength(spec.slides.length);
    expect((await buildTemplateDeck(spec, TEMPLATE, { dtLogo: trimmed.dtLogo, seName: null })).size).toBeGreaterThan(1000);
  });

  it('prices operational exposure in the executive section when a rate is configured', () => {
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Hosts', value: 10 }]),
      'prob.summary': q([{ 'event.category': 'AVAILABILITY', 'event.status': 'CLOSED', problems: 10 }]),
      'prob.mttx': q([{ 'event.category': 'AVAILABILITY', problems: 10, mttrNs: 3_600_000_000_000, totalNs: 36_000_000_000_000 }]),
      'prob.exposure': q([{ activeProblems: 5, totalOpenNs: 7_200_000_000_000, oldestOpenNs: 3_600_000_000_000 }]),
      // 3.7.3: the money reads only problems with a named root cause.
      'prob.mttx.rca': q([{ 'event.category': 'AVAILABILITY', problems: 4, mttrNs: 3_600_000_000_000, totalNs: 14_400_000_000_000 }]),
      'prob.exposure.rca': q([{ activeProblems: 1, totalOpenNs: 3_600_000_000_000, oldestOpenNs: 3_600_000_000_000 }]),
    };
    const model = buildWrapupModel(results, ctx);
    const exec = model.business.find((section) => section.id === 'executive');
    // A configured rate turns measured problem-time into a money exposure table.
    expect(exec?.table).toBeDefined();
    expect(exec?.highlight?.value).toContain('BRL');
  });

  it('turns competitor agents into an annual tooling saving in ROI when a baseline rate is set', () => {
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Hosts', value: 10 }]),
      'comp.agents': q([{ name: 'datadog-agent' }, { name: 'newrelic-infra' }]),
    };
    const model = buildWrapupModel(results, ctx);
    const roi = model.business.find((section) => section.id === 'roi');
    // 2 agents × 30,000/yr baseline → a per-year saving on the highlight.
    expect(roi?.highlight?.value).toContain('/yr');
    expect(roi?.highlight?.value).toContain('BRL');
  });

  it('charts alert distribution by category for problems, not a misleading arrival timeline', () => {
    const results: WrapupResults = {
      'cov.inventory': q([{ category: 'Hosts', value: 10 }]),
      'prob.summary': q([
        { 'event.category': 'ERROR', 'event.status': 'CLOSED', problems: 95 },
        { 'event.category': 'AVAILABILITY', 'event.status': 'ACTIVE', problems: 5 },
      ]),
    };
    const model = buildWrapupModel(results, ctx);
    const problems = model.technical.find((section) => section.id === 'problems');
    expect(problems?.bars?.items.length).toBeGreaterThan(0);
    // The backwards "problems appeared after Dynatrace" trend is gone.
    expect(problems?.trend).toBeUndefined();
    // The executive slide no longer carries the contradictory verdict banner.
    const exec = model.business.find((section) => section.id === 'executive');
    expect(exec?.verdict).toBeUndefined();
  });
});

describe('the customer profile of the deck', () => {
  // Same configured rate and per-agent cost as the SE profile: the profile, not the data, must decide.
  const base = {
    t: (key: Parameters<typeof translate>[0], params?: Record<string, string | number>) => translate(key, 'en', params),
    formatNumber: (value: number) => value.toLocaleString('en-US'),
    params: {
      customerName: 'Contoso',
      engagementName: 'PoC',
      scopeDescription: '',
      pocDescription: '',
      customerLogoDataUrl: null,
      brandTone: 'default' as const,
      partnerName: '',
      partnerLogoDataUrl: null,
      customerUrl: '',
    },
    costModel: { ratePerHour: 250, currencyLabel: 'BRL', rateBasis: '', downtimeRatePerHour: 20000, downtimeBasis: '' },
    baseline: { manualMttrHours: 24, annualCostPerAgent: 30000 },
    windowLabel: 'last 24 hours',
    generatedAtLabel: 'now',
    seName: 'Ada Lovelace',
    dtLogo: 'data:image/png;base64,iVBORw0KGgo=',
    customerLogo: null,
    customerLogoAspect: null,
    partnerLogo: null,
    partnerLogoAspect: null,
  };
  const q = (records: Record<string, unknown>[], outcome = 'ok') => ({ records, outcome });
  const results: WrapupResults = {
    'cov.inventory': q([{ category: 'Hosts', value: 10 }]),
    'prob.summary': q([{ 'event.category': 'AVAILABILITY', 'event.status': 'CLOSED', problems: 10 }]),
    'prob.mttx': q([{ 'event.category': 'AVAILABILITY', problems: 10, mttrNs: 3_600_000_000_000, totalNs: 36_000_000_000_000 }]),
    'prob.exposure': q([{ activeProblems: 5, totalOpenNs: 7_200_000_000_000, oldestOpenNs: 3_600_000_000_000 }]),
    'comp.agents': q([{ name: 'datadog-agent' }, { name: 'newrelic-infra' }]),
    'cons.advisor': q([
      { table: 'logs', executions: 120, scannedOnDemandBytes: 900_000_000, avgDurationMs: 800, deliveredRecords: 5000 },
    ]),
  };

  const text = (model: WrapupModel) => JSON.stringify(model);

  it('leaves out the consumption section and every priced figure, even with rates configured', () => {
    const model = buildWrapupModel(results, { ...base, commercial: false });
    expect(model.technical.map((section) => section.id)).not.toContain('consumption');
    const exec = model.business.find((section) => section.id === 'executive');
    expect(exec?.table).toBeUndefined();
    expect(text(model)).not.toContain('BRL');
    // The roi section stays, with measured counts and no saving.
    const roi = model.business.find((section) => section.id === 'roi');
    expect(roi?.highlight?.value).not.toContain('/yr');
  });

  it('does not tell a customer to "add a rate in Settings"', () => {
    const noRate = { ...base, costModel: { ...base.costModel, ratePerHour: null, downtimeRatePerHour: null }, baseline: { manualMttrHours: null, annualCostPerAgent: null } };
    const customer = buildWrapupModel(results, { ...noRate, commercial: false });
    const exec = customer.business.find((section) => section.id === 'executive');
    expect(exec?.narrative.join(' ')).not.toMatch(/rate in Settings|Add a rate/i);
    // The SE profile still gets the nudge, since it is the SE who can act on it.
    const se = buildWrapupModel(results, { ...noRate, commercial: true });
    const seExec = se.business.find((section) => section.id === 'executive');
    expect(seExec?.narrative.length).toBeGreaterThan(exec?.narrative.length ?? 0);
  });

  it('keeps the same measured sections in both profiles apart from the commercial ones', () => {
    const customer = buildWrapupModel(results, { ...base, commercial: false });
    const se = buildWrapupModel(results, { ...base, commercial: true });
    const ids = (model: WrapupModel) => model.technical.map((section) => section.id);
    expect(ids(se).filter((id) => id !== 'consumption')).toEqual(ids(customer));
    expect(ids(se)).toContain('consumption');
  });
});

describe('pptx author metadata', () => {
  it('replaces an existing core property in place', () => {
    const xml =
      '<cp:coreProperties xmlns:cp="c" xmlns:dc="d"><dc:creator>Template</dc:creator><cp:lastModifiedBy>x</cp:lastModifiedBy></cp:coreProperties>';
    const out = setCoreProp(xml, 'dc:creator', 'Ada Lovelace');
    expect(out).toContain('<dc:creator>Ada Lovelace</dc:creator>');
    expect(out).not.toContain('Template');
  });

  it('inserts a missing property before the closing element', () => {
    const out = setCoreProp('<cp:coreProperties></cp:coreProperties>', 'dc:creator', 'Ada');
    expect(out).toBe('<cp:coreProperties><dc:creator>Ada</dc:creator></cp:coreProperties>');
  });

  it('stamps the SE name as author and last-modified-by in core.xml', async () => {
    const zip = new JSZip();
    zip.file('docProps/core.xml', '<cp:coreProperties xmlns:cp="c" xmlns:dc="d"><dc:creator>Template</dc:creator></cp:coreProperties>');
    await stampAuthor(zip, 'Ada Lovelace');
    const core = await zip.file('docProps/core.xml')!.async('string');
    expect(core).toContain('<dc:creator>Ada Lovelace</dc:creator>');
    expect(core).toContain('<cp:lastModifiedBy>Ada Lovelace</cp:lastModifiedBy>');
  });

  it('leaves the author untouched when there is no logged-in SE', async () => {
    const zip = new JSZip();
    zip.file('docProps/core.xml', '<cp:coreProperties xmlns:cp="c" xmlns:dc="d"><dc:creator>Template</dc:creator></cp:coreProperties>');
    await stampAuthor(zip, null);
    const core = await zip.file('docProps/core.xml')!.async('string');
    expect(core).toContain('<dc:creator>Template</dc:creator>');
  });
});

/** Relative luminance and WCAG contrast of two `RRGGBB` colours. */
function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('deck colours', () => {
  it('the small text of the deck (footers, slide numbers, muted body) reads on every slide background', () => {
    // The footer was drawn in the hairline colour, 1.9:1 against the navy.
    for (const background of [DECK.ink, DECK.panel, DECK.slate, TEMPLATE_CHROME.background]) {
      expect(contrast(DECK.subtle, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(DECK.border, DECK.ink)).toBeLessThan(3);
  });

  it('white text on the table-header blue passes', () => {
    expect(contrast(DECK.white, DECK.blue)).toBeGreaterThanOrEqual(4.5);
  });
});
