import { writeFileSync } from 'node:fs';

import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WrapupModel } from '../features/wrapup/deck';
import { TEMPLATE_CHROME } from '../features/wrapup/geometry';
import { NEUTRAL_FONT, NEUTRAL_MARK, buildNeutralTemplate } from '../features/wrapup/neutralTemplate';
import { buildTemplateDeck, patchTemplate } from '../features/wrapup/pptxTemplate';
import { buildDeckSpec } from '../features/wrapup/spec';
import { readTemplateArt } from '../features/wrapup/templateArt';

/**
 * The neutral template (3.3.5): a build of the app without the brand pack — this repository as
 * published, a partner's fork — still delivers the whole Tech Wrapup. The app writes a minimal package with the
 * four layouts and placeholders the deck writer uses; nothing in it comes from a brand file.
 *
 * `PVS_NEUTRAL_OUT=/path/deck.pptx` writes the sample deck for a look in PowerPoint or LibreOffice.
 */

// A 4 × 2 PNG: high-entropy bytes, not a secret.
// eslint-disable-next-line noSecrets/no-secrets
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwAEjDAGACCDAv8cI7IoAAAAAElFTkSuQmCC';

const MODEL: WrapupModel = {
  customerName: 'Acme Corp',
  engagementName: 'Observability PoC',
  windowLabel: 'last 7 days',
  generatedAtLabel: 'Generated 2026-11-16',
  seName: 'Sam Engineer',
  dtLogo: '',
  customerLogo: null,
  customerLogoAspect: null,
  partnerName: '',
  partnerLogo: null,
  partnerLogoAspect: null,
  platformLogos: [],
  agenda: [],
  why: [],
  strings: {
    title: 'Tech Wrapup — What the platform discovered',
    subtitle: 'What the platform discovered',
    tagline: 'Tagline',
    preparedBy: 'Prepared by',
    agendaTitle: 'Agenda',
    whyTitle: 'Why',
    whySubtitle: 'One platform',
    assistLabel: 'Assist',
    partnerLabel: 'Delivered with',
    technicalDivider: 'Part one',
    technicalKicker: 'PoC results',
    businessDivider: 'Part two',
    businessKicker: 'Business value',
    closingTitle: 'Thank you',
    closingBullets: [],
    footer: 'Footer',
    measured: 'Measured live.',
    confidential: 'Confidential — prepared for the customer named in this deck.',
  },
  technical: [
    {
      id: 'services',
      title: 'Services & distributed tracing',
      subtitle: 'Every request, end to end, in context',
      narrative: ['Distributed tracing follows a request from the browser to the database.', 'Failures concentrate in one service.'],
      assist: ['Fix svc-catalog-01 first.'],
      kpis: [
        { label: 'Failed requests', value: '216,825' },
        { label: 'Failure rate', value: '1.23%' },
      ],
      bars: { title: 'Busiest services', items: [{ label: 'svc-a', value: 3 }] },
    },
    { id: 'problems', title: 'Problems', narrative: ['41 problems open.'], kpis: [{ label: 'Open', value: '41' }] },
  ],
  business: [{ id: 'value', title: 'Value & ROI', narrative: ['The value chain, measured.'] }],
};

const capture = { dataUrl: PNG, width: 1200, height: 600, pins: [{ n: 1, x: 0.2, y: 0.3, label: 'Failure rate per hour' }] };
const spec = buildDeckSpec(MODEL, { profile: 'customer', captures: { services: capture }, valueLines: { services: ['Traces follow every request end to end.'] } });

describe('the neutral template', () => {
  it('is a package with the four layouts and the placeholders the deck writer fills', async () => {
    const zip = await JSZip.loadAsync(await buildNeutralTemplate());
    for (const n of [1, 28, 33, 56]) expect(zip.file(`ppt/slideLayouts/slideLayout${n}.xml`), `layout ${n}`).not.toBeNull();
    const standard = (await zip.file('ppt/slideLayouts/slideLayout28.xml')?.async('string')) ?? '';
    expect(standard).toContain('<p:ph type="title"/>');
    expect(standard).toContain('<p:ph type="ftr" sz="quarter" idx="25"/>');
    expect(standard).toContain('<p:ph type="sldNum" sz="quarter" idx="26"/>');
    const blank = (await zip.file('ppt/slideLayouts/slideLayout33.xml')?.async('string')) ?? '';
    expect(blank).toContain('idx="21"');
    expect(blank).toContain('idx="22"');
    expect((await zip.file('ppt/slideLayouts/slideLayout1.xml')?.async('string')) ?? '').toContain('<p:ph type="ctrTitle"/>');
    // The theme names a system face and the deck's own colours; no brand file is inside.
    const theme = (await zip.file('ppt/theme/theme1.xml')?.async('string')) ?? '';
    expect(theme).toContain(`<a:latin typeface="${NEUTRAL_FONT}"/>`);
    expect(theme).toContain(TEMPLATE_CHROME.background);
    expect(Object.keys(zip.files).filter((name) => name.startsWith('ppt/media/'))).toEqual([]);
    expect(JSON.stringify(Object.keys(zip.files))).not.toMatch(/dynatrace|DTFlow|DT Flow/i);
  });

  it('is the same bytes every time', async () => {
    expect(Buffer.from(await buildNeutralTemplate()).equals(Buffer.from(await buildNeutralTemplate()))).toBe(true);
  });

  it('takes the whole deck: every slide a part, every relationship resolving to a part of the package', async () => {
    const zip = await patchTemplate(spec, await buildNeutralTemplate(), { dtLogo: '', seName: 'Sam Engineer' });
    const presentation = (await zip.file('ppt/presentation.xml')?.async('string')) ?? '';
    expect((presentation.match(/<p:sldId /g) ?? []).length).toBe(spec.slides.length);
    for (const name of Object.keys(zip.files).filter((file) => file.endsWith('.rels'))) {
      const rels = (await zip.file(name)?.async('string')) ?? '';
      const base = name.replace(/_rels\/[^/]*\.rels$/, '');
      for (const [, target] of rels.matchAll(/Target="([^"]+)"/g)) {
        const parts = `${base}${target ?? ''}`.split('/');
        const resolved: string[] = [];
        for (const part of parts) {
          if (part === '..') resolved.pop();
          else if (part !== '' && part !== '.') resolved.push(part);
        }
        expect(zip.file(resolved.join('/')), `${name} → ${target ?? ''}`).not.toBeNull();
      }
    }
    const types = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
    for (let n = 1; n <= spec.slides.length; n += 1) expect(types).toContain(`PartName="/ppt/slides/slide${n}.xml"`);
    const out = process.env.PVS_NEUTRAL_OUT;
    if (out !== undefined && out !== '') writeFileSync(out, await zip.generateAsync({ type: 'uint8array' }));
    expect((await buildTemplateDeck(spec, await buildNeutralTemplate(), { dtLogo: '', seName: null })).size).toBeGreaterThan(5000);
  });

  it('tells the preview it is the neutral template', async () => {
    expect(await readTemplateArt(await buildNeutralTemplate())).toEqual({ neutral: true });
    expect(NEUTRAL_MARK).not.toMatch(/dynatrace/i);
  });
});

describe('the deck without the brand pack', () => {
  afterEach(() => {
    vi.doUnmock('../features/wrapup/brandPack');
    vi.resetModules();
  });

  it('loads the neutral template instead of fetching the corporate one', async () => {
    vi.resetModules();
    vi.doMock('../features/wrapup/brandPack', () => ({ BRAND_PACK_INSTALLED: false }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { loadBrandTemplate } = await import('../features/wrapup/pptxTemplate');
    const bytes = await loadBrandTemplate();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await readTemplateArt(bytes)).toEqual({ neutral: true });
    fetchSpy.mockRestore();
  });
});
