import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { DeckPreview } from '../features/wrapup/DeckPreview';
import { patchTemplate, renderSlides } from '../features/wrapup/pptxTemplate';
import type { CoverInput, DeckProfile, DeckSpec } from '../features/wrapup/spec';
import { buildPrintDeckSpec, printDeckCoverTitle, printDeckLabels, type PrintDeckShot } from '../features/wrapup/prints/deck/buildPrintDeckSpec';
import type { AnalysisContent, EvidenceWindow, MethodologyContent, Sourced, StoryContent } from '../features/wrapup/prints/types';
import { ALL_KEYS, LOCALES, entryFor, translate, type Locale, type StringKey } from '../i18n/strings';

/**
 * Privacy and money guards of the real-prints deck (3.2.7, spec §2.9 and §7.3).
 *
 * - No module of the feature reaches the cost model, licensing, pricing, DPS or the commercial
 *   scope: the deck has no way to read a money figure (import ban, every file under `prints/`).
 * - No money word or currency reaches the deck: not in the texts the deck can draw from the
 *   dictionary, not in the spec, the PPTX or the preview of either profile.
 * - The Customer profile shows no tenant host — in the methodology or anywhere else — and none of
 *   the pixels of a print it does not keep.
 */

const ROOT = process.cwd();
const PRINTS = join(ROOT, 'ui/app/features/wrapup/prints');
const TEMPLATE = new Uint8Array(readFileSync(join(ROOT, 'ui/assets/techwrapup-brand-template.pptx')));

const MONEY = /R\$|US\$|€|£|\bDPS\b|licen[cç]|\bcusto\b|\bcost\b|\bpreço\b|\bprice\b/i;
const TENANT_HOST = 'abc12345.apps.dynatrace.com';
const TENANT_ID = 'abc12345';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwABjDAGACM8Au8Wy10JAAAAAElFTkSuQmCC';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Every module a file imports: static, re-exported, dynamic and required, with the names it binds. */
function imports(source: string): { from: string; names: string }[] {
  const found: { from: string; names: string }[] = [];
  for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) found.push({ from: match[3] ?? '', names: match[2] ?? '' });
  for (const match of source.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) found.push({ from: match[1] ?? '', names: '' });
  for (const match of source.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) found.push({ from: match[1] ?? '', names: '' });
  return found;
}

/** Module paths the deck may never reach. */
const BANNED_PATH = /models\/cost|models\/licensing|costModel|baseline|pricing|\bdps\b|commercial/i;
/** Names it may never bind, wherever they come from. */
const BANNED_NAME = /\b(?:costModel|baseline|useCommercialVisible|CommercialScope|pricing)\b/;

/** Texts the deck can draw from the dictionary: every block it renders, never the tab's own errors. */
const DECK_KEY = /^prt\.(?:deck|meth|story|src|win|via|kind|an|pin|title|what|headline|why|anom)\./;

describe('the real-prints feature cannot reach money', () => {
  it('no file under features/wrapup/prints imports the cost model, licensing, pricing, DPS or the commercial scope', () => {
    const files = sourceFiles(PRINTS);
    expect(files.length).toBeGreaterThan(5);
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file);
      for (const { from, names } of imports(readFileSync(file, 'utf8'))) {
        if (BANNED_PATH.test(from)) offenders.push(`${rel}: from '${from}'`);
        if (BANNED_NAME.test(names)) offenders.push(`${rel}: imports ${names.replace(/\s+/g, ' ')}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('the import scan sees what it bans (self-check)', () => {
    const sample = "import { costModel } from '../../config/StudioContext';\nimport type { X } from '../../../models/licensing';\nconst y = await import('../pricing');";
    const found = imports(sample);
    expect(found.some(({ names }) => BANNED_NAME.test(names))).toBe(true);
    expect(found.filter(({ from }) => BANNED_PATH.test(from))).toHaveLength(2);
  });

  it('no deck text of the dictionary names money, in either language', () => {
    const offenders: string[] = [];
    for (const key of ALL_KEYS.filter((item) => DECK_KEY.test(item))) {
      for (const locale of LOCALES) {
        const text = entryFor(key)[locale];
        if (MONEY.test(text)) offenders.push(`${key} [${locale}]: ${text}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

// ------------------------------------------------------------------ a deck in both profiles

const W: EvidenceWindow = { kind: 'incident', startIso: '2026-09-22T22:14:00Z', endIso: '2026-09-22T23:24:00Z', source: 'derived', minutes: 70 };
const value = (display: string, source: Sourced['source'] = 'dql'): Sourced<number | string> => ({ value: 1, display, source, queryId: 'ev.service.minutes', window: W, collectedAtIso: null, quality: 'exact' });

function jpeg(name: string) {
  const bytes = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xfe, 0x00, name.length + 2]), Buffer.from(name), Buffer.from([0xff, 0xd9])]);
  return { dataUrl: `data:image/jpeg;base64,${bytes.toString('base64')}`, width: 1720, height: 1080, mediaKey: name };
}

function analysis(id: string, t: (key: StringKey, params?: Readonly<Record<string, string>>) => string): AnalysisContent {
  return {
    shotId: id,
    kind: 'root-cause',
    headline: null,
    kpis: [
      { label: t('prt.an.kpi.outage', { name: 'easyTradeManager' }), value: value('5 min'), footer: t('prt.src.dql', { window: t('prt.win.incident', { range: '22/09 22:14–23:24 UTC' }) }) },
      { label: t('prt.an.kpi.users'), value: value('30', 'screen'), footer: t('prt.src.screen', { window: '30 min' }) },
    ],
    visual: { kind: 'bars', title: t('prt.an.viz.callers', { root: 'easyTradeDB' }), items: [{ label: 'easyTradeManager', value: 341, display: '341', highlight: true }] },
    dql: `fetch dt.davis.events\n| filter dt.entity.service == "SERVICE-0000000000000001"\n| limit 10`,
    dqlSource: { id: 'ev.service.minutes', window: W, windowLine: t('prt.win.incident', { range: '22/09 22:14–23:24 UTC' }) },
    findings: [{ text: `easyTradeManager em https://${TENANT_HOST}/ui/apps/dynatrace.services`, facts: [value('5 min')], basis: 'D1' }],
    matters: t('prt.deck.matters'),
    reco: [t('prt.deck.reco')],
    anomalies: ['D1'],
  };
}

function deck(profile: DeckProfile, locale: Locale): DeckSpec {
  const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, locale, params);
  const shot = (id: string, order: number, approved: boolean): PrintDeckShot => ({
    slot: { id, kind: 'root-cause', order },
    title: t('prt.title.rootCause', { name: 'easyTradeManager' }),
    headline: t('prt.headline.rootCause'),
    what: t('prt.what.rootCause'),
    why: `${t('prt.headline.rootCause')} · ${TENANT_HOST}`,
    print: {
      image: jpeg(id),
      pins: [{ n: 1, x: 0.4, y: 0.2, label: '' }],
      legend: [`Host: ip-172-31-93-120.ec2.internal em ${TENANT_HOST}`],
      focus: { x: 0.3, y: 0.1, w: 0.2, h: 0.08 },
      lupaOn: true,
      caption: t('prt.deck.caption', { app: 'Services', at: '05/10 18:58 UTC', via: t('prt.via.companion'), identity: t('prt.deck.identity.anchor'), evidence: 'verified', zoneNote: t('prt.deck.zone', { zone: 'UTC' }) }),
      alt: t('prt.deck.alt', { title: 'easyTradeManager' }),
      approved,
      identityOk: true,
    },
    analysis: analysis(id, t),
    analysisCustomerSafe: null,
  });
  const story: StoryContent = {
    title: t('prt.story.title', { count: '3' }),
    subtitle: t('prt.story.subtitle', { id: 'P-260914359' }),
    steps: (['symptom', 'onset', 'cause'] as const).map((stage, index) => ({
      stage,
      label: t(`prt.story.stage.${stage}`),
      time: '22:44 UTC',
      text: `${t(`prt.story.stage.${stage}`)} ${TENANT_HOST}`,
      shotId: index === 2 ? 'root-cause--b' : 'root-cause--a',
      facts: [],
    })),
    chain: t('prt.deck.chain'),
    caveat: t('prt.story.caveat'),
  };
  const methodology: MethodologyContent = {
    title: t('prt.meth.title'),
    scope: [
      { label: t('prt.meth.env'), value: TENANT_HOST },
      { label: t('prt.meth.captures'), value: t('prt.meth.captures.value', { count: '2', verified: '1', via: t('prt.via.companion') }) },
      { label: t('prt.meth.dql'), value: t('prt.meth.dql.value', { count: '4', from: '18:50', to: '18:58' }) },
      { label: t('prt.meth.profile'), value: profile },
    ],
    printsTitle: t('prt.meth.printsTitle'),
    printHeaders: [t('prt.meth.h.screen'), t('prt.meth.h.captured'), t('prt.meth.h.via'), t('prt.meth.h.link'), t('prt.meth.h.identity')],
    prints: [[`https://${TENANT_HOST}/ui/apps/dynatrace.services`, '05/10 18:58 UTC', t('prt.via.companion'), 'verified', t('prt.deck.identity.anchor')], [TENANT_HOST, '', '', '', '']],
    queriesTitle: t('prt.meth.queriesTitle'),
    queryHeaders: [t('prt.meth.h.query'), t('prt.meth.h.window'), t('prt.meth.h.records'), t('prt.meth.h.read')],
    queries: [['ev.service.minutes', t('prt.win.incident', { range: '22/09 22:14–23:24 UTC' }), '70', t('prt.meth.readUnknown')]],
    gapsTitle: t('prt.meth.gapsTitle'),
    gaps: [t('prt.meth.gap.spans'), t('prt.meth.gap.security'), t('prt.meth.gap.host'), t('prt.meth.gap.users')],
    note: t('prt.meth.note'),
  };
  const identity: CoverInput = {
    customerName: 'Contoso',
    engagementName: 'Observability PoC',
    seName: 'Ada Lovelace',
    partnerName: '',
    generatedAtLabel: t('tw.generatedAtTenant', { tenant: TENANT_ID, at: '05/10/2026 18:58' }),
    customerLogo: null,
    customerLogoAspect: null,
    partnerLogo: null,
    partnerLogoAspect: null,
    strings: { title: t('prt.deck.title'), partnerLabel: '', measured: '', confidential: t('profile.watermark'), agendaTitle: t('prt.deck.agenda') },
  };
  return buildPrintDeckSpec({
    profile,
    identity,
    customerGeneratedAtLabel: t('tw.generatedAt', { at: '05/10/2026 18:58' }),
    coverTitle: printDeckCoverTitle(t, 'Contoso'),
    seLabel: t('twt.roleSe'),
    watermark: t('profile.watermark'),
    shots: [shot('root-cause--a', 1, true), shot('root-cause--b', 2, false)],
    story,
    methodology,
    labels: printDeckLabels(t),
    includeAppendix: true,
  });
}

/** Every string of a spec, image data left out. */
function specText(spec: DeckSpec): string {
  const out: string[] = [];
  const walk = (node: unknown, key: string) => {
    if (typeof node === 'string') {
      if (key !== 'dataUrl' && key !== 'mediaKey') out.push(node);
    } else if (Array.isArray(node)) node.forEach((item) => walk(item, key));
    else if (node !== null && typeof node === 'object') Object.entries(node).forEach(([name, item]) => walk(item, name));
  };
  walk(spec, '');
  return out.join('\n');
}

/** The text runs of the PPTX slides. */
function pptxText(spec: DeckSpec): string {
  return renderSlides(spec, PNG)
    .map((slide) => [...slide.xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => match[1]).join('\n'))
    .join('\n');
}

function previewText(spec: DeckSpec): string {
  const { container, unmount } = render(createElement(DeckPreview, { spec, art: {}, dtLogo: PNG, slideLabel: (n: number, total: number, title: string) => `${n}/${total} ${title}` }));
  const text = `${container.textContent ?? ''}\n${[...container.querySelectorAll('[aria-label], img[alt]')].map((node) => `${node.getAttribute('aria-label') ?? ''} ${node.getAttribute('alt') ?? ''}`).join('\n')}`;
  unmount();
  return text;
}

describe('the rendered deck', () => {
  it.each([
    ['customer', 'pt-BR'],
    ['customer', 'en'],
    ['se', 'pt-BR'],
    ['se', 'en'],
  ] as const)('names no money in the spec, the PPTX or the preview (%s, %s)', (profile, locale) => {
    const spec = deck(profile, locale);
    for (const [where, text] of [
      ['spec', specText(spec)],
      ['pptx', pptxText(spec)],
      ['preview', previewText(spec)],
    ] as const) {
      expect(MONEY.exec(text)?.[0] ?? null, `${where}: ${MONEY.exec(text)?.input.slice(Math.max(0, (MONEY.exec(text)?.index ?? 0) - 40), (MONEY.exec(text)?.index ?? 0) + 40) ?? ''}`).toBeNull();
    }
  });

  it('shows no tenant host in the customer profile — in the methodology or anywhere — while the SE profile keeps it', () => {
    for (const locale of LOCALES) {
      const customer = deck('customer', locale);
      const methodology = customer.slides.filter((slide) => slide.kind === 'methodology');
      expect(methodology.length).toBeGreaterThan(0);
      expect(JSON.stringify(methodology)).not.toContain(TENANT_HOST);
      expect(specText(customer)).not.toContain(TENANT_HOST);
      expect(pptxText(customer)).not.toContain(TENANT_HOST);
      expect(previewText(customer)).not.toContain(TENANT_HOST);
      expect(specText(customer)).not.toContain('ip-172-31-93-120');
      // Nor the tenant id the cover's provenance line would name (3.2.7 review PS-7).
      expect(specText(customer)).not.toContain(TENANT_ID);
      expect(pptxText(customer)).not.toContain(TENANT_ID);
      expect(previewText(customer)).not.toContain(TENANT_ID);
      // The fixture does carry the host: the SE profile keeps the bare host (a URL is redacted in both) and its cover names the tenant.
      expect(specText(deck('se', locale))).toContain(TENANT_HOST);
      expect(deck('se', locale).slides[0]).toMatchObject({ kind: 'cover' });
      expect(JSON.stringify(deck('se', locale).slides[0])).toContain(TENANT_ID);
    }
  });

  it('carries none of the pixels of a print the customer profile does not keep', async () => {
    const customer = deck('customer', 'pt-BR');
    const unkept = jpeg('root-cause--b');
    expect(JSON.stringify(customer)).not.toContain(unkept.dataUrl);
    expect(customer.slides.some((slide) => slide.kind === 'analysis' && slide.variant === 'dql-only')).toBe(true);
    const zip = await patchTemplate(customer, TEMPLATE, { dtLogo: PNG, seName: null, dedupeMedia: true, storeImages: true });
    const media = await Promise.all(Object.keys(zip.files).filter((name) => name.startsWith('ppt/media/genimg')).map((name) => zip.file(name)?.async('base64')));
    expect(media).not.toContain(unkept.dataUrl.split(',')[1]);
    // The SE profile keeps it.
    expect(JSON.stringify(deck('se', 'pt-BR'))).toContain(unkept.dataUrl);
  });

  it('never labels a print "What it shows"', () => {
    for (const profile of ['customer', 'se'] as const) {
      const text = previewText(deck(profile, 'en'));
      expect(text).not.toMatch(/What it shows/);
    }
  });
});
