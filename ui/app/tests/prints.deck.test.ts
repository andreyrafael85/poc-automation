import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, render, renderHook } from '@testing-library/react';
import JSZip from 'jszip';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeckPreview } from '../features/wrapup/DeckPreview';
import { CONTENT_BOTTOM, CONTENT_TOP, SLIDE_W, TYPE, containRect, type Rect } from '../features/wrapup/geometry';
import { buildTemplateDeck, patchTemplate, renderSlides } from '../features/wrapup/pptxTemplate';
import { buildDeckSpec, type CoverInput, type DeckProfile, type DeckSpec } from '../features/wrapup/spec';
import { PRINT_BUDGET } from '../features/wrapup/prints/deck/budget';
import { printSlideRenderers } from '../features/wrapup/prints/deck/renderers';
import {
  buildPrintDeckSpec,
  citedQueryIds,
  customerSafeAnalysis,
  planPrintDeck,
  printDeckCoverTitle,
  printDeckLabels,
  printDeckNumbers,
  wrapDql,
  type PrintDeckBuildInput,
  type PrintDeckShot,
} from '../features/wrapup/prints/deck/buildPrintDeckSpec';
import {
  CELL_INSET,
  EMU_PER_PT,
  FULL_FOCUS,
  METHOD_WEIGHTS,
  MIN_PIN_DISTANCE,
  PRINT_IMAGE_BOX,
  PRINT_TYPE,
  TITLE_ROOM,
  analysisLayout,
  analysisTextRooms,
  chartHeadingWidth,
  capacityLayout,
  cellFits,
  columnsLayout,
  dqlCardLayout,
  dqlPageLayout,
  fitGrid,
  fitParagraphs,
  fitSegments,
  fitToLines,
  focusAspect,
  gridLayout,
  keepTailInCell,
  kitChartRect,
  legendParts,
  methodologyLayout,
  pinCentre,
  pinRect,
  placePins,
  printLayout,
  rulerLayout,
  srcRectFor,
  storyLayout,
  thumbFocus,
  wrapToLines,
} from '../features/wrapup/prints/deck/printGeometry';
import type { AnalysisSlide, AnalysisVisual, FocusFraction, MethodologySlide, PrintImage, PrintSlide, StorySlide } from '../features/wrapup/prints/deck/slides';
import { LAYOUTS } from '../features/wrapup/prints/plan/pinTemplates';
import { printDeckFileName, useDeckDownload } from '../features/wrapup/prints/deck/useDeckDownload';
import type { AnalysisContent, EvidenceQueryId, EvidenceWindow, MethodologyContent, ShotKind, Sourced, SourceKind, StoryContent } from '../features/wrapup/prints/types';
import { translate, type StringKey } from '../i18n/strings';

/**
 * The real-prints deck (3.2.7, WP6): `buildPrintDeckSpec`, its two writers and the package.
 *
 * Hand-made fixtures stand in for the analysis, story and methodology the evidence engine builds
 * (WP5): six shots over both profiles — an approved print with a lupa, an unapproved one (the
 * customer's "Prova por DQL"), one whose screen identity is not confirmed, two that share a query,
 * and one with no print at all. The Tech Wrapup's own deck is pinned by `deckFingerprint.test.ts`.
 */

const TEMPLATE = new Uint8Array(readFileSync(join(process.cwd(), 'ui/assets/techwrapup-brand-template.pptx')));
const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'pt-BR', params);
const LABELS = printDeckLabels(t);

// A 4 × 2 PNG (the fixture of pptxTemplate.test.ts): high-entropy bytes, not a secret.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwABjDAGACM8Au8Wy10JAAAAAElFTkSuQmCC';

/** A distinct JPEG-shaped byte string per name (SOI, a comment, EOI): one media part each. */
function jpeg(name: string): PrintImage {
  const bytes = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xfe, 0x00, name.length + 2]), Buffer.from(name), Buffer.from([0xff, 0xd9])]);
  return { dataUrl: `data:image/jpeg;base64,${bytes.toString('base64')}`, width: 1720, height: 1080, mediaKey: createHash('sha256').update(bytes).digest('hex') };
}

const IMAGES = { problem: jpeg('problem'), root: jpeg('root-cause'), frontend: jpeg('frontend'), k8s: jpeg('k8s'), vulns: jpeg('vulns'), logs: jpeg('logs') };

const W: EvidenceWindow = { kind: 'incident', startIso: '2026-09-22T22:14:00Z', endIso: '2026-09-22T23:24:00Z', source: 'derived', minutes: 70 };

function sourced(display: string, source: SourceKind = 'dql', value: number | string = 1): Sourced<number | string> {
  return { value, display, source, queryId: source === 'screen' ? 'screen' : 'ev.service.minutes', window: W, collectedAtIso: '2026-10-05T18:58:00Z', quality: 'exact' };
}

/** 25 lines, one of them 150 characters wide: two appendix cards. */
const LONG_DQL = [
  'timeseries {',
  ...Array.from({ length: 22 }, (_, index) => `  m${index} = sum(dt.service.request.count, filter: dt.entity.service == "SERVICE-${String(index).padStart(16, '0')}"),`),
  '}, interval: 1m',
  `| fieldsAdd note = "${'x'.repeat(150)}"`,
].join('\n');
const CALLERS_DQL = 'fetch dt.davis.events\n| filter event.kind == "DAVIS_EVENT"\n| summarize count(), by: { dt.source_entity }';
const SHARED_DQL = 'timeseries cpu = avg(dt.kubernetes.container.cpu_usage, rollup: avg), by: { k8s.cluster.name }';

const COLUMNS: AnalysisVisual = {
  kind: 'columns',
  title: 'Falhas por minuto · easyTradeManager · janela do incidente',
  unit: 'falhas/min',
  points: Array.from({ length: 70 }, (_, index) => ({
    label: `22:${String(14 + (index % 46)).padStart(2, '0')}`,
    value: index === 40 || index === 41 ? null : index >= 30 && index < 35 ? 120 : 4,
    highlight: index >= 30 && index < 35,
  })),
  band: { from: 30, to: 39, label: 'problema' },
  markers: [
    { at: 20, label: 'início da anomalia' },
    { at: 35, label: 'P-260914359' },
  ],
  maxLabel: '120',
};

function analysis(shotId: string, kind: ShotKind, visual: AnalysisVisual | null, dql: string | null): AnalysisContent {
  return {
    shotId,
    kind,
    headline: null,
    kpis: [
      { label: 'com 100 % de falhas (ip-172-31-93-120.ec2.internal)', value: sourced('5 min'), footer: 'DQL · 22/09 22:14–23:24 UTC' },
      { label: 'usuários na tela', value: sourced('30', 'screen', 30), footer: 'Na tela · 30 min' },
      { label: 'eventos do Davis em um único problema', value: sourced('5', 'davis', 5), status: 'bad', footer: 'Davis · problema 22:57–23:09 UTC' },
      { label: 'usuários: RUM no problema', value: sourced('30 · 52', 'rum'), footer: 'RUM · problema 22:57–23:09 UTC' },
      { label: 'quinto, cortado', value: sourced('9'), footer: 'DQL · 24 h' },
    ],
    visual,
    dql,
    dqlSource: dql === null ? null : { id: 'ev.service.minutes', window: W, windowLine: 'incidente 22/09 22:14–23:24 UTC' },
    findings: [
      { text: 'easyTradeManager ficou 5 min com 100 % de falhas; o dono é ops@contoso.com.', facts: [sourced('5 min')], basis: 'D1' },
      { text: 'A tela mostra 30 usuários.', facts: [sourced('30', 'screen', 30)], basis: null },
      { text: 'O throughput caiu de 360 para 12 por minuto.', facts: [sourced('360'), sourced('12')], basis: 'D3' },
      { text: 'Quarta, cortada.', facts: [], basis: null },
    ],
    matters: 'Uma falha no banco de dados derrubou o serviço que mais chamava.',
    reco: ['Revisar o pool de conexões do banco de dados.', 'Criar um alerta de taxa de falha.', 'Terceira, cortada.'],
    anomalies: ['D1'],
  };
}

function shot(id: string, kind: ShotKind, order: number, image: PrintImage | null, flags: { approved: boolean; identityOk: boolean }, content: AnalysisContent | null): PrintDeckShot {
  return {
    slot: { id, kind, order },
    title: `Tela ${id}`,
    headline: 'O Davis aponta a causa e o impacto em um só lugar',
    what: 'A página do problema reúne impacto, causa raiz e eventos.',
    why: 'Problema com mais impacto em 15 dias (22/09 22:57–23:09 UTC).',
    print:
      image === null
        ? null
        : {
            image,
            pins: Array.from({ length: 6 }, (_, index) => ({ n: index + 1, x: 0.1 + index * 0.15, y: 0.2 + (index % 2) * 0.3, label: `Pin ${index + 1}` })),
            legend: [
              'Cabeçalho: P-260914359, 12 min',
              'Impacto: 30 usuários (RUM) · 52 (Davis), dono ops@contoso.com',
              'Frontend: www.easytrade.com em ip-172-31-93-120.ec2.internal',
              'Causa raiz: banco de dados',
              'Sinais: 5 eventos',
              'Caminho: resolução visual',
            ],
            focus: { x: 0.334, y: 0.112, w: 0.28, h: 0.038 },
            lupaOn: true,
            caption: 'Tela real · Problems · capturada em 05/10 18:58 UTC · companion · tela verificada · link verified · horários da tela em UTC',
            alt: `Tela real do Dynatrace: Tela ${id}`,
            approved: flags.approved,
            identityOk: flags.identityOk,
          },
    analysis: content,
    analysisCustomerSafe: null,
  };
}

const RULER: AnalysisVisual = {
  kind: 'ruler',
  title: 'Core Web Vitals (p75) contra a meta “bom”',
  items: [
    { label: 'LCP', display: '5,2 s', position: 1, verdict: 'bad' },
    { label: 'INP', display: '180 ms', position: 0.3, verdict: 'good' },
  ],
};
const CAPACITY: AnalysisVisual = {
  kind: 'capacity',
  title: 'Usado, requisitado e alocável · prod-cluster',
  rows: [
    { label: 'CPU (cores)', used: 13.7, requested: 15.8, allocatable: 31.1, display: '13,7 / 15,8 / 31,1' },
    { label: 'Memória (GiB)', used: 55.2, requested: 55.2, allocatable: 58.5, display: '55,2 / 55,2 / 58,5' },
  ],
};

const SHOTS: PrintDeckShot[] = [
  // Out of order on purpose: the deck sorts by slot order.
  shot('vulns--runtime', 'vulnerabilities', 60, IMAGES.vulns, { approved: true, identityOk: true }, analysis('vulns--runtime', 'vulnerabilities', RULER, SHARED_DQL)),
  shot('problem--p-260914359', 'problem', 10, IMAGES.problem, { approved: true, identityOk: true }, analysis('problem--p-260914359', 'problem', COLUMNS, LONG_DQL)),
  shot('root-cause--easytrade', 'root-cause', 20, IMAGES.root, { approved: false, identityOk: true }, analysis('root-cause--easytrade', 'root-cause', { kind: 'bars', title: 'Quem chama o banco', items: [{ label: 'easyTradeManager', value: 341, display: '341', highlight: true }] }, CALLERS_DQL)),
  shot('frontend--www', 'frontend', 30, IMAGES.frontend, { approved: true, identityOk: false }, null),
  shot('k8s-cluster--prod', 'k8s-cluster', 40, IMAGES.k8s, { approved: true, identityOk: true }, analysis('k8s-cluster--prod', 'k8s-cluster', CAPACITY, SHARED_DQL)),
  shot('logs-errors--list', 'logs-errors', 50, null, { approved: true, identityOk: true }, analysis('logs-errors--list', 'logs-errors', { kind: 'table', title: 'Assinaturas', headers: ['Mensagem', 'Ocorrências'], rows: [['Connection refused for admin@contoso.com', '12']] }, CALLERS_DQL)),
];

const STORY: StoryContent = {
  title: 'O incidente em 4 passos',
  subtitle: 'P-260914359: do que o usuário sentiu ao padrão, cada passo com a sua prova',
  steps: [
    { stage: 'symptom', label: 'SINTOMA', time: '22:52 UTC', text: 'www.easytrade.com: 85 erros por minuto às 22:52, 14× o normal', shotId: 'frontend--www', facts: [] },
    { stage: 'onset', label: 'INÍCIO DA ANOMALIA', time: '22:44 UTC', text: 'easyTradeDB: falha a partir das 22:44 (início registrado no evento do Davis)', shotId: 'problem--p-260914359', facts: [] },
    { stage: 'cause', label: 'CAUSA', time: null, text: 'easyTradeDB (banco de dados) é a causa raiz apontada pelo Davis', shotId: 'root-cause--easytrade', facts: [] },
    { stage: 'evidence', label: 'EVIDÊNCIA', time: '22:58 UTC', text: '5 min com 100 % de falhas (22:58–23:03)', shotId: 'k8s-cluster--prod', facts: [] },
  ],
  chain: 'easyTradeDB 22:44 → easyTradeManager 22:47 → www.easytrade.com 22:52 · 8 min do primeiro ao último',
  caveat: 'Leitura descritiva: os horários são o início de cada evento.',
};

const TENANT_HOST = 'abc12345.apps.dynatrace.com';
const METHODOLOGY: MethodologyContent = {
  title: 'Metodologia e fontes de dados',
  scope: [
    { label: 'Ambiente', value: TENANT_HOST },
    { label: 'Telas capturadas', value: '5 (4 verificadas) via companion' },
    { label: 'Consultas no Grail', value: '12 executadas entre 18:50 e 18:58' },
    { label: 'Perfil', value: 'Cliente' },
  ],
  printsTitle: 'Telas reais',
  printHeaders: ['Tela', 'Capturada', 'Via', 'Link', 'Identidade'],
  prints: [[`Problema em https://${TENANT_HOST}/ui/apps/dynatrace.davis.problems`, '05/10 18:58 UTC', 'companion', 'verified', 'tela verificada']],
  queriesTitle: 'Consultas por trás dos números',
  queryHeaders: ['Consulta', 'Janela', 'Registros', 'Lido'],
  queries: Array.from({ length: 12 }, (_, index) => [`ev.service.minutes #${index + 1}`, '22/09 22:14–23:24 UTC', '70', '1,2 GB']),
  gapsTitle: 'Transparência',
  gaps: ['Traces: o app não lê spans.', 'Segurança: lida com a sua identidade.', 'Host: link documentado.', 'Logs: nenhum na janela.', 'Quinta, cortada.'],
  note: 'Números de tela são o que a plataforma mostrava na captura; números DQL são lidos no Grail na janela indicada.',
};

const IDENTITY: CoverInput = {
  customerName: 'Contoso',
  engagementName: 'Observability PoC',
  seName: 'Ada Lovelace',
  partnerName: 'Acme',
  generatedAtLabel: 'Gerado em 05/10/2026',
  customerLogo: null,
  customerLogoAspect: null,
  partnerLogo: PNG,
  partnerLogoAspect: 3,
  strings: { title: 'Tech Wrapup', partnerLabel: 'Entregue com', measured: 'Medido ao vivo.', confidential: 'CONFIDENCIAL', agendaTitle: 'Agenda' },
};

function input(profile: DeckProfile, overrides: Partial<PrintDeckBuildInput> = {}): PrintDeckBuildInput {
  return {
    profile,
    identity: IDENTITY,
    customerGeneratedAtLabel: 'Gerado com dados de 05/10/2026',
    coverTitle: printDeckCoverTitle(t, IDENTITY.customerName),
    seLabel: 'Engenheira de Soluções',
    watermark: 'SE INTERNO',
    shots: SHOTS,
    story: STORY,
    methodology: METHODOLOGY,
    labels: LABELS,
    // 3.5.5: the appendix is an option (off by default); these tests read it, so they turn it on.
    includeAppendix: true,
    ...overrides,
  };
}

const kinds = (spec: DeckSpec) =>
  spec.slides.map((slide) => (slide.kind === 'analysis' ? `analysis:${slide.number}${slide.variant === 'dql-only' ? ':dql' : ''}` : slide.kind === 'print' ? `print:${slide.number}` : slide.kind === 'methodology' ? `methodology:${slide.part}` : slide.kind));
const of = <K extends DeckSpec['slides'][number]['kind']>(spec: DeckSpec, kind: K) =>
  spec.slides.filter((slide): slide is Extract<DeckSpec['slides'][number], { kind: K }> => slide.kind === kind);

afterEach(() => {
  vi.restoreAllMocks();
});

// ------------------------------------------------------------------ the spec

describe('buildPrintDeckSpec plans the slides of each profile', () => {
  it('3.5.5: leaves the methodology and the DQL appendix out unless the SE includes them, and names no appendix card then', () => {
    const spec = buildPrintDeckSpec(input('se', { includeAppendix: false }));
    expect(of(spec, 'methodology')).toHaveLength(0);
    expect(of(spec, 'analysis').every((slide) => slide.dqlMore === null)).toBe(true);
    const agenda = spec.slides.find((slide) => slide.kind === 'agenda') as { items?: string[] } | undefined;
    expect(JSON.stringify(agenda)).not.toContain(LABELS.methodologyAgenda);
    expect(of(buildPrintDeckSpec(input('se')), 'methodology').length).toBeGreaterThan(0);
  });

  it('SE: cover, agenda, story, (print, analysis?) × N in slot order, methodology, DQL appendix, end', () => {
    const spec = buildPrintDeckSpec(input('se'));
    expect(kinds(spec)).toEqual([
      'cover',
      'agenda',
      'story',
      'print:01',
      'analysis:01',
      'print:02',
      'analysis:02',
      'print:03',
      'print:04',
      'analysis:04',
      'print:05',
      'analysis:05',
      'methodology:summary',
      'methodology:dql',
      'end',
    ]);
    expect(spec.profile).toBe('se');
    expect(spec.confidential).toBe('CONFIDENCIAL · SE INTERNO');
    expect(spec.title).toBe('TIP - Contoso - Telas reais');
    // A shot with no print enters neither profile.
    expect(spec.slides.some((slide) => 'id' in slide && slide.id === 'logs-errors--list')).toBe(false);
  });

  it('SE: keeps an unapproved print, and its caption says so before anything else (3.3.2, §17-g)', () => {
    const prints = of(buildPrintDeckSpec(input('se')), 'print') as PrintSlide[];
    const unapproved = prints.find((slide) => slide.id === 'root-cause--easytrade');
    expect(unapproved?.caption.startsWith(`${LABELS.notApproved} · `)).toBe(true);
    expect(unapproved!.caption.length).toBeLessThanOrEqual(PRINT_BUDGET.caption);
    // Approved prints keep their caption as it was.
    for (const slide of prints.filter((item) => item.id !== 'root-cause--easytrade')) expect(slide.caption.startsWith(LABELS.notApproved ?? '∅')).toBe(false);
    // The customer deck never shows the mark: it never keeps an unapproved print at all.
    const customer = of(buildPrintDeckSpec(input('customer')), 'print') as PrintSlide[];
    expect(customer.some((slide) => slide.caption.includes(LABELS.notApproved ?? '∅'))).toBe(false);
  });

  it('Customer: drops the unapproved and the unconfirmed prints; the unapproved one keeps its reading as "Prova por DQL"; numbers reflow', () => {
    const spec = buildPrintDeckSpec(input('customer'));
    expect(kinds(spec)).toEqual(['cover', 'agenda', 'story', 'print:01', 'analysis:01', 'analysis:02:dql', 'print:03', 'analysis:03', 'print:04', 'analysis:04', 'methodology:summary', 'methodology:dql', 'end']);
    expect(spec.confidential).toBe('CONFIDENCIAL');
    const prints = of(spec, 'print');
    expect(prints.map((slide) => slide.id)).toEqual(['problem--p-260914359', 'k8s-cluster--prod', 'vulns--runtime']);
    const dqlOnly = of(spec, 'analysis').find((slide) => slide.variant === 'dql-only') as AnalysisSlide;
    expect(dqlOnly.id).toBe('root-cause--easytrade');
    expect(dqlOnly.title).toBe('02 · Prova por DQL — Tela root-cause--easytrade');
    // No screen-sourced value on a "Prova por DQL" slide: neither a KPI nor a finding resting on one.
    expect(dqlOnly.kpis.map((kpi) => kpi.source)).not.toContain('screen');
    expect(dqlOnly.findings.join(' ')).not.toContain('A tela mostra');
    expect(dqlOnly.dql.length).toBeGreaterThan(0);
    // The approved print keeps its screen values.
    const withPrint = of(spec, 'analysis').find((slide) => slide.id === 'problem--p-260914359') as AnalysisSlide;
    expect(withPrint.variant).toBe('with-print');
    expect(withPrint.kpis.map((kpi) => kpi.source)).toContain('screen');
    // The unapproved print's pixels are nowhere in the customer's deck.
    expect(JSON.stringify(spec)).not.toContain(IMAGES.root.dataUrl);
    expect(JSON.stringify(spec)).not.toContain(IMAGES.frontend.dataUrl);
  });

  it('uses the customer-safe analysis the evidence engine gives, and filters it again', () => {
    const safe = customerSafeAnalysis(analysis('root-cause--easytrade', 'root-cause', null, CALLERS_DQL));
    expect(safe.kpis.every((kpi) => kpi.value.source !== 'screen')).toBe(true);
    expect(safe.findings.every((finding) => finding.facts.every((fact) => fact.source !== 'screen'))).toBe(true);
    const leaky = { ...analysis('root-cause--easytrade', 'root-cause', null, CALLERS_DQL), matters: 'Versão segura.' };
    const shots = SHOTS.map((item) => (item.slot.id === 'root-cause--easytrade' ? { ...item, analysisCustomerSafe: leaky } : item));
    const slide = of(buildPrintDeckSpec(input('customer', { shots })), 'analysis').find((item) => item.variant === 'dql-only') as AnalysisSlide;
    expect(slide.matters).toBe('Versão segura.');
    expect(slide.kpis.map((kpi) => kpi.source)).not.toContain('screen');
  });

  it('gives an unkept print its "Prova por DQL" when only the customer-safe analysis is there', () => {
    const shots = SHOTS.map((item) =>
      item.slot.id === 'root-cause--easytrade' ? { ...item, analysis: null, analysisCustomerSafe: customerSafeAnalysis(analysis('root-cause--easytrade', 'root-cause', null, CALLERS_DQL)) } : item,
    );
    const slide = of(buildPrintDeckSpec(input('customer', { shots })), 'analysis').find((item) => item.id === 'root-cause--easytrade');
    expect(slide?.variant).toBe('dql-only');
    // The SE profile shows the print, and no reading it does not have.
    expect(of(buildPrintDeckSpec(input('se', { shots })), 'analysis').some((item) => item.id === 'root-cause--easytrade')).toBe(false);
  });

  it('numbers the shots that enter, after the cut to the pairs budget, and shares the numbering', () => {
    expect([...printDeckNumbers(SHOTS, 'customer')]).toEqual([
      ['problem--p-260914359', '01'],
      ['root-cause--easytrade', '02'],
      ['k8s-cluster--prod', '03'],
      ['vulns--runtime', '04'],
    ]);
    const many = Array.from({ length: 14 }, (_, index) => shot(`custom--s${index}`, 'custom', index, jpeg(`s${index}`), { approved: true, identityOk: true }, null));
    const planned = planPrintDeck(many, 'se');
    expect(planned).toHaveLength(PRINT_BUDGET.pairs);
    expect(planned.map((entry) => entry.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
  });

  it('keeps the story only with ≥ 3 steps and ≥ 2 thumbnails from kept prints; no thumbnail of a print the profile drops', () => {
    const se = of(buildPrintDeckSpec(input('se')), 'story')[0] as StorySlide;
    expect(se.steps.filter((step) => step.thumb !== null)).toHaveLength(4);
    expect(se.steps.map((step) => step.ref)).toEqual(['→ 03', '→ 01', '→ 02', '→ 04']);

    const customer = of(buildPrintDeckSpec(input('customer')), 'story')[0] as StorySlide;
    expect(customer.steps.map((step) => step.thumb?.image.mediaKey ?? null)).toEqual([null, IMAGES.problem.mediaKey, null, IMAGES.k8s.mediaKey]);
    // The dql-only shot keeps its number; the unconfirmed one is not in the deck at all.
    expect(customer.steps.map((step) => step.ref)).toEqual([null, '→ 01', '→ 02', '→ 03']);
    // The thumbnail is the print's lupa region grown to the card's thumbnail box: the lupa's width,
    // the strip inside it, the box's aspect (a 481 × 41 px strip would draw as a sliver).
    const thumb = customer.steps[1]?.thumb?.focus as FocusFraction;
    const box = storyLayout(customer.steps.length).cards[0]?.thumb as Rect;
    expect(thumb.w).toBeCloseTo(0.28, 6);
    expect((thumb.w * 1720) / (thumb.h * 1080)).toBeCloseTo(box.w / box.h, 6);
    expect(thumb.y).toBeLessThanOrEqual(0.112);
    expect(thumb.y + thumb.h).toBeGreaterThanOrEqual(0.112 + 0.038);
    // A print with no focus shows the whole screen.
    const unfocused = SHOTS.map((item) => (item.print === null ? item : { ...item, print: { ...item.print, focus: null } }));
    const whole = of(buildPrintDeckSpec(input('se', { shots: unfocused })), 'story')[0] as StorySlide;
    expect(whole.steps.map((step) => step.thumb?.focus)).toEqual([FULL_FOCUS, FULL_FOCUS, FULL_FOCUS, FULL_FOCUS]);

    // Two thumbnails short: no story, and the agenda does not announce one.
    const thin = buildPrintDeckSpec(input('customer', { shots: SHOTS.filter((item) => item.slot.id !== 'k8s-cluster--prod') }));
    expect(of(thin, 'story')).toHaveLength(0);
    expect(of(thin, 'agenda')[0]?.items).not.toContain(LABELS.storyAgenda);
    expect(of(buildPrintDeckSpec(input('se', { story: { ...STORY, steps: STORY.steps.slice(0, 2) } })), 'story')).toHaveLength(0);
  });

  it('fills the thumbnail box of a step with no print in this deck with "Prova por DQL", never a blank half (3.2.7 review UX-L4)', async () => {
    const se = of(buildPrintDeckSpec(input('se')), 'story')[0] as StorySlide;
    expect(se.steps.map((step) => step.noPrint ?? null)).toEqual([null, null, null, null]);
    const spec = buildPrintDeckSpec(input('customer'));
    const customer = of(spec, 'story')[0] as StorySlide;
    expect(customer.steps.map((step) => step.noPrint ?? null)).toEqual(['Prova por DQL', null, 'Prova por DQL', null]);
    // The file and the preview both draw it.
    const zip = await patchTemplate(spec, TEMPLATE, { dtLogo: PNG, seName: null });
    const index = spec.slides.findIndex((slide) => slide.kind === 'story');
    const xml = (await zip.file(`ppt/slides/slide${index + 1}.xml`)?.async('string')) ?? '';
    expect(xml.match(/Prova por DQL/g)).toHaveLength(2);
    const { container, unmount } = preview(spec);
    expect(container.querySelector('[data-slide-kind="story"]')?.textContent?.match(/Prova por DQL/g)).toHaveLength(2);
    unmount();
  });

  it('builds the agenda from the story, the kept titles and the method', () => {
    const agenda = of(buildPrintDeckSpec(input('customer')), 'agenda')[0];
    expect(agenda?.title).toBe('O que vamos mostrar');
    expect(agenda?.items).toEqual(['O incidente, passo a passo', 'Tela problem--p-260914359', 'Tela root-cause--easytrade', 'Tela k8s-cluster--prod', 'Tela vulns--runtime', 'Metodologia e fontes']);
  });

  it('cuts the pins to 4 with the lupa and lays the overlap guard over them, legend in step', () => {
    const slide = of(buildPrintDeckSpec(input('se')), 'print')[0] as PrintSlide;
    expect(slide.zoom).toEqual({ label: 'Detalhe ampliado', focus: { x: 0.334, y: 0.112, w: 0.28, h: 0.038 } });
    expect(slide.pins).toHaveLength(4);
    expect(slide.legend).toHaveLength(4);
    expect(slide.pins.map((pin) => pin.label)).toEqual(slide.legend);
    const noZoom = buildPrintDeckSpec(input('se', { shots: SHOTS.map((item) => (item.print === null ? item : { ...item, print: { ...item.print, lupaOn: false } })) }));
    const plain = of(noZoom, 'print')[0] as PrintSlide;
    expect(plain.zoom).toBeNull();
    expect(plain.pins).toHaveLength(6);
  });

  it('redacts tenant text: an e-mail in a pin label (both profiles), cloud hosts in the customer profile', () => {
    for (const profile of ['se', 'customer'] as const) {
      const spec = buildPrintDeckSpec(input(profile));
      const text = JSON.stringify(spec.slides);
      expect(text).not.toContain('ops@contoso.com');
      expect(text).not.toContain('admin@contoso.com');
    }
    const customer = JSON.stringify(buildPrintDeckSpec(input('customer')).slides);
    expect(customer).not.toContain('ip-172-31-93-120');
    const se = JSON.stringify(buildPrintDeckSpec(input('se')).slides);
    expect(se).toContain('ip-172-31-93-120');
  });

  it('keeps every text within PRINT_BUDGET', () => {
    const B = PRINT_BUDGET;
    for (const profile of ['se', 'customer'] as const) {
      const spec = buildPrintDeckSpec(input(profile));
      const over: string[] = [];
      const check = (where: string, text: string, max: number) => {
        if (text.length > max) over.push(`${where}: ${text.length} > ${max}`);
      };
      for (const slide of spec.slides) {
        if (slide.kind === 'print') {
          check('title', slide.title, B.slideTitle);
          check('headline', slide.headline, B.headline);
          check('what', slide.what, B.what);
          check('why', slide.why, B.why);
          check('caption', slide.caption, B.caption);
          check('alt', slide.alt, B.alt);
          expect(slide.pins.length).toBeLessThanOrEqual(slide.zoom === null ? B.pins : B.pinsWithZoom);
          slide.legend.forEach((line) => check('legend', line, B.pinLabel));
        }
        if (slide.kind === 'analysis') {
          check('title', slide.title, B.slideTitle);
          expect(slide.kpis.length).toBeLessThanOrEqual(B.kpis);
          slide.kpis.forEach((kpi) => {
            check('kpi label', kpi.label, B.kpiLabel);
            check('kpi value', kpi.value, B.kpiValue);
            check('kpi footer', kpi.footer, B.kpiFooter);
          });
          expect(slide.findings.length).toBeLessThanOrEqual(B.findings);
          slide.findings.forEach((line) => check('finding', line, B.findingMax));
          check('matters', slide.matters, B.matters);
          expect(slide.reco.length).toBeLessThanOrEqual(B.reco);
          slide.reco.forEach((line) => check('reco', line, B.recoLine));
          expect(slide.dql.length).toBeLessThanOrEqual(B.dqlLines);
          slide.dql.forEach((line) => check('dql', line, B.dqlLineChars));
          const visual = slide.visual;
          if (visual?.kind === 'columns') expect(visual.points.length).toBeLessThanOrEqual(B.columns);
          if (visual?.kind === 'bars') {
            expect(visual.items.length).toBeLessThanOrEqual(B.bars);
            visual.items.forEach((item) => check('bar', item.label, B.barLabel));
          }
          if (visual?.kind === 'table') {
            expect(visual.rows.length).toBeLessThanOrEqual(B.tableRows);
            visual.rows.forEach((row) => {
              expect(row.length).toBeLessThanOrEqual(B.tableCols);
              row.forEach((cell) => check('cell', cell, B.tableCell));
            });
          }
        }
        if (slide.kind === 'story') {
          expect(slide.steps.length).toBeLessThanOrEqual(B.storySteps);
          slide.steps.forEach((step) => check('story', step.text, B.storyText));
          check('chain', slide.chain, B.chain);
          check('caveat', slide.caveat, B.caveat);
        }
        if (slide.kind === 'methodology' && slide.part === 'summary') {
          expect(slide.prints.length).toBeLessThanOrEqual(B.methodRows);
          expect(slide.queries.length).toBeLessThanOrEqual(B.methodRows);
          [...slide.prints, ...slide.queries].forEach((row) => row.forEach((cell) => check('method cell', cell, B.methodCell)));
          slide.scope.forEach((item) => check('scope', item.value, B.methodCell));
          expect(slide.gaps.length).toBeLessThanOrEqual(B.gaps);
          slide.gaps.forEach((line) => check('gap', line, B.gapLine));
        }
        if (slide.kind === 'methodology' && slide.part === 'dql') {
          slide.cards.forEach((card) => {
            expect(card.lines.length).toBeLessThanOrEqual(B.dqlCardLines);
            card.lines.forEach((line) => check('card line', line, B.dqlCardChars));
          });
        }
      }
      expect(of(spec, 'methodology').filter((slide) => slide.part === 'dql').length).toBeLessThanOrEqual(B.dqlPages);
      expect(over).toEqual([]);
    }
  });

  it('prints the executed DQL: wrapped at 96 on the slide, the full text in the appendix, one card per distinct query', () => {
    const spec = buildPrintDeckSpec(input('se'));
    const analyses = of(spec, 'analysis');
    const problem = analyses.find((slide) => slide.id === 'problem--p-260914359') as AnalysisSlide;
    expect(problem.dql).toEqual(wrapDql(LONG_DQL, 96).slice(0, 6));
    expect(problem.dqlMore).toBe('Texto completo: apêndice Q01');
    expect(analyses.map((slide) => slide.dqlMore)).toEqual(['Texto completo: apêndice Q01', 'Texto completo: apêndice Q02', 'Texto completo: apêndice Q03', 'Texto completo: apêndice Q03']);
    const pages = of(spec, 'methodology').filter((slide): slide is Extract<MethodologySlide, { part: 'dql' }> => slide.part === 'dql');
    expect(pages).toHaveLength(1);
    expect(pages[0]?.title).toBe('Apêndice · consultas (1/1)');
    const cards = pages.flatMap((page) => page.cards);
    // The long query takes two card slots; the shared one is printed once.
    expect(cards.map((card) => card.ref)).toEqual(['Q01', 'Q01', 'Q02', 'Q03']);
    expect([...(cards[0]?.lines ?? []), ...(cards[1]?.lines ?? [])]).toEqual(wrapDql(LONG_DQL, 100));
    expect(cards[0]?.windowLine).toBe('incidente 22/09 22:14–23:24 UTC');
    expect(cards[0]?.heading).toBe('Tela problem--p-260914359 · ev.service.minutes');
  });

  it('cites the appendix queries first, in card order, then the queries behind the slides’ numbers, never the screen (3.2.7 final review D3)', () => {
    // Each analysed shot: its own query (an appendix card) and the query of its first KPI.
    const QUERIES: Readonly<Record<string, readonly [EvidenceQueryId, EvidenceQueryId]>> = {
      'problem--p-260914359': ['ev.problem.events', 'ev.problem.recurrence'],
      'root-cause--easytrade': ['ev.incident.callers', 'ev.service.endpoints'],
      'k8s-cluster--prod': ['ev.k8s.capacity', 'ev.k8s.churn'],
      'vulns--runtime': ['ev.k8s.capacity', 'ev.k8s.workloads'],
      'logs-errors--list': ['ev.logs.errors', 'ev.failing.endpoints'],
    };
    const shots = SHOTS.map((item) => {
      const ids = QUERIES[item.slot.id];
      if (ids === undefined || item.analysis === null || item.analysis.dqlSource === null) return item;
      const [own, kpiQuery] = ids;
      const kpis = item.analysis.kpis.map((kpi, index) => (index === 0 ? { ...kpi, value: { ...kpi.value, queryId: kpiQuery } } : kpi));
      return { ...item, analysis: { ...item.analysis, kpis, dqlSource: { ...item.analysis.dqlSource, id: own } } };
    });
    // The other numbers of the fixture read ev.service.minutes or the screen; the logs shot has no print and enters no deck.
    const se = citedQueryIds(shots, 'se');
    expect(se).toEqual(['ev.problem.events', 'ev.incident.callers', 'ev.k8s.capacity', 'ev.problem.recurrence', 'ev.service.minutes', 'ev.service.endpoints', 'ev.k8s.churn', 'ev.k8s.workloads']);
    // The appendix prints its cards in the same order: Q01 problem.events, Q02 incident.callers, Q03 k8s.capacity.
    const cards = of(buildPrintDeckSpec(input('se', { shots })), 'methodology').flatMap((slide) => (slide.part === 'dql' ? slide.cards : []));
    const cardIds = [...new Map(cards.map((card) => [card.ref, card.heading.split(' · ').pop()])).values()];
    expect(cardIds).toEqual(se.slice(0, cardIds.length));
    // Customer: the unapproved root cause is a "Prova por DQL" slide, still cited; the unconfirmed frontend has no analysis.
    const customer = citedQueryIds(shots, 'customer');
    expect(customer.slice(0, 3)).toEqual(['ev.problem.events', 'ev.incident.callers', 'ev.k8s.capacity']);
    expect([...se, ...customer]).not.toContain('screen');
  });

  it('caps the appendix at three pages and names no card it could not print', () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      shot(`custom--q${index}`, 'custom', index, jpeg(`q${index}`), { approved: true, identityOk: true }, analysis(`custom--q${index}`, 'custom', null, index % 2 === 0 ? `${LONG_DQL}\n| limit ${index}` : `fetch logs | limit ${index}`)),
    );
    const spec = buildPrintDeckSpec(input('se', { shots: many, story: null }));
    const pages = of(spec, 'methodology').filter((slide): slide is Extract<MethodologySlide, { part: 'dql' }> => slide.part === 'dql');
    expect(pages).toHaveLength(PRINT_BUDGET.dqlPages);
    const refs = new Set(pages.flatMap((page) => page.cards.map((card) => card.ref)));
    for (const slide of of(spec, 'analysis')) {
      const ref = /Q\d\d/.exec(slide.dqlMore ?? '')?.[0];
      if (ref !== undefined) expect(refs.has(ref)).toBe(true);
    }
    expect(of(spec, 'analysis').some((slide) => slide.dqlMore === null)).toBe(true);
  });

  // 3.2.7 review UX-M1: character budgets cut titles, findings and recommendations while their boxes had room.
  describe('fits the texts to their boxes by measure, not by a character budget', () => {
    const ROOMS = analysisTextRooms(analysisLayout({ kpis: 4, hasDql: true }));
    const lines = (text: string, room: { width: number; size: number }) => wrapToLines(text, room.width, room.size).length;
    const linesUsed = (texts: readonly string[], room: { width: number; size: number; spaceAfter: number }) =>
      texts.reduce((sum, text) => sum + lines(text, room) * room.size * 1.2, 0) + Math.max(0, texts.length - 1) * room.spaceAfter;
    const LONG_FINDING =
      'As anomalias começaram em payments-db às 05:03 UTC, em svc-checkout-01 às 05:11 UTC e no frontend web-shop-frontend às 05:16 UTC (início de cada evento): 13 min do primeiro ao último, 5 min antes do problema.';
    const LONG_RECO = 'Tratar payments-db como item de engenharia: conexões, timeouts e as consultas mais lentas (a confirmar com o time do banco de dados).';

    it('keeps the entity in a long analysis title, on the two lines of the title placeholder', () => {
      const long = SHOTS.map((item) => (item.slot.id === 'k8s-cluster--prod' ? { ...item, title: 'Serviço com mais falhas em excesso · svc-catalog-01' } : item));
      const slide = of(buildPrintDeckSpec(input('se', { shots: long })), 'analysis').find((item) => item.id === 'k8s-cluster--prod') as AnalysisSlide;
      expect(slide.title).toBe(`${slide.number} · Leitura analítica — Serviço com mais falhas em excesso · svc-catalog-01`);
      expect(slide.title.length).toBeGreaterThan(70);
      expect(wrapToLines(slide.title, TITLE_ROOM.width, TITLE_ROOM.size).length).toBeLessThanOrEqual(2);
    });

    it('keeps a finding and a recommendation whole while the box has room (no cut at 190 / 120 characters)', () => {
      expect(LONG_FINDING.length).toBeGreaterThan(PRINT_BUDGET.finding);
      expect(LONG_RECO.length).toBeGreaterThan(120);
      const shots = SHOTS.map((item) =>
        item.slot.id === 'problem--p-260914359' && item.analysis !== null
          ? {
              ...item,
              analysis: {
                ...item.analysis,
                findings: [
                  { text: 'Das 05:17 às 05:21 UTC, payments-db respondeu com falha a todas as chamadas por 5 min (351 de 351).', facts: [], basis: null },
                  { text: 'O P-9100100 não é um caso isolado: payments-db é causa raiz de 6 problemas em 15 dias.', facts: [], basis: null },
                  { text: LONG_FINDING, facts: [], basis: null },
                ],
                reco: [LONG_RECO, 'Criar um workflow que abre o ticket com causa raiz, impacto e link do problema.'],
              },
            }
          : item,
      );
      const slide = of(buildPrintDeckSpec(input('se', { shots })), 'analysis').find((item) => item.id === 'problem--p-260914359') as AnalysisSlide;
      expect(slide.findings[2]).toBe(LONG_FINDING);
      expect(slide.reco[0]).toBe(LONG_RECO);
      expect(linesUsed(slide.findings, ROOMS.findings)).toBeLessThanOrEqual(ROOMS.findings.height / EMU_PER_PT + 0.01);
      expect(linesUsed(slide.reco, ROOMS.reco)).toBeLessThanOrEqual(ROOMS.reco.height / EMU_PER_PT + 0.01);
    });

    it('cuts only what the box cannot hold: the first paragraph that overflows keeps the lines left, the rest is left out', () => {
      const words = (n: number) => Array.from({ length: n }, (_, index) => `palavra${index}`).join(' ');
      const texts = [words(40), words(40), words(40)];
      const fitted = fitParagraphs(texts, ROOMS.findings);
      expect(fitted[0]).toBe(texts[0]);
      expect(fitted.length).toBeLessThanOrEqual(3);
      const last = fitted[fitted.length - 1] ?? '';
      expect(last.endsWith('…')).toBe(true);
      expect(lines(last, ROOMS.findings)).toBeGreaterThanOrEqual(2);
      expect(linesUsed(fitted, ROOMS.findings)).toBeLessThanOrEqual(ROOMS.findings.height / EMU_PER_PT + 0.01);
      // A text that fits is never touched; one cut to a line count fits it.
      expect(fitToLines('curto', 1000000, 9, 1)).toBe('curto');
      expect(wrapToLines(fitToLines(words(30), ROOMS.reco.width, ROOMS.reco.size, 3), ROOMS.reco.width, ROOMS.reco.size).length).toBeLessThanOrEqual(3);
    });

    it('drops the window of a chart heading too long for its line before cutting the heading', () => {
      const width = chartHeadingWidth(analysisLayout({ kpis: 4, hasDql: true }));
      const heading = 'Assinaturas ERROR mais frequentes · 120 min observados na tela até 11:50 UTC';
      expect(fitSegments(heading, width, TYPE.blockHead)).toBe('Assinaturas ERROR mais frequentes');
      expect(fitSegments('Falhas por minuto · payments-db · janela do incidente', width, TYPE.blockHead)).toBe('Falhas por minuto · payments-db · janela do incidente');
    });

    it('gives a long query as many appendix cards as it needs ("Texto completo"), and says "Texto resumido" when the pages run out', () => {
      const VERY_LONG = [LONG_DQL, ...Array.from({ length: 16 }, (_, index) => `| fieldsAdd extra${index} = ${index}`)].join('\n');
      const lineCount = wrapDql(VERY_LONG, PRINT_BUDGET.dqlCardChars).length;
      expect(lineCount).toBeGreaterThan(2 * PRINT_BUDGET.dqlCardLines);
      const one = [shot('custom--long', 'custom', 1, jpeg('long'), { approved: true, identityOk: true }, analysis('custom--long', 'custom', null, VERY_LONG))];
      const spec = buildPrintDeckSpec(input('se', { shots: one, story: null }));
      const cards = of(spec, 'methodology').flatMap((slide) => (slide.part === 'dql' ? slide.cards : []));
      expect(cards.map((card) => card.ref)).toEqual(['Q01', 'Q01', 'Q01']);
      expect(cards.flatMap((card) => card.lines)).toEqual(wrapDql(VERY_LONG, PRINT_BUDGET.dqlCardChars));
      expect(of(spec, 'analysis')[0]?.dqlMore).toBe('Texto completo: apêndice Q01');

      // Five two-card queries and a one-card one first (11 of the 12 slots): the long one finds a single slot, capped, and its slide says so.
      const before = [
        ...Array.from({ length: 5 }, (_, index) => shot(`custom--q${index}`, 'custom', index, jpeg(`q${index}`), { approved: true, identityOk: true }, analysis(`custom--q${index}`, 'custom', null, `${LONG_DQL}\n| limit ${index}`))),
        shot('custom--short', 'custom', 10, jpeg('short'), { approved: true, identityOk: true }, analysis('custom--short', 'custom', null, 'fetch logs | limit 1')),
        shot('custom--long', 'custom', 20, jpeg('long'), { approved: true, identityOk: true }, analysis('custom--long', 'custom', null, VERY_LONG)),
      ];
      const capped = buildPrintDeckSpec(input('se', { shots: before, story: null }));
      const cappedSlide = of(capped, 'analysis').find((slide) => slide.id === 'custom--long');
      const cappedCards = of(capped, 'methodology').flatMap((slide) => (slide.part === 'dql' ? slide.cards : []));
      expect(cappedCards).toHaveLength(PRINT_BUDGET.dqlPages * 4);
      expect(cappedCards.filter((card) => card.ref === 'Q07')).toHaveLength(1);
      expect(cappedSlide?.dqlMore).toBe('Texto resumido: apêndice Q07');
      expect(cappedCards[cappedCards.length - 1]?.lines.at(-1)?.endsWith('…')).toBe(true);
      expect(of(capped, 'analysis').find((slide) => slide.id === 'custom--q0')?.dqlMore).toBe('Texto completo: apêndice Q01');
    });

    it('cuts the head of a methodology screen title, never the entity at its end', () => {
      const methodology = { ...METHODOLOGY, prints: [['Serviço com mais falhas em excesso · svc-catalog-01', '15/09 11:50 UTC', 'companion', 'verificado', 'tela verificada']] };
      const summary = of(buildPrintDeckSpec(input('se', { methodology })), 'methodology').find((slide) => slide.part === 'summary');
      const screenCell = summary?.part === 'summary' ? (summary.prints[0]?.[0] ?? '') : '';
      expect(screenCell.endsWith(' · svc-catalog-01')).toBe(true);
      expect(screenCell).toContain('…');
      const width = gridLayout(methodologyLayout().prints, METHOD_WEIGHTS.prints, 1).cells[0]?.[0]?.w ?? 0;
      expect(cellFits(screenCell, width, 7)).toBe(true);
      // A title that fits is left whole.
      expect(keepTailInCell('Logs com erro', width)).toBe('Logs com erro');
    });

    it('fits a scope tile value on two lines instead of cutting it at 40 characters', () => {
      const methodology = { ...METHODOLOGY, scope: METHODOLOGY.scope.map((item, index) => (index === 2 ? { ...item, value: '17 executadas entre 12:00 UTC e 12:00 UTC' } : item)) };
      const summary = of(buildPrintDeckSpec(input('se', { methodology })), 'methodology').find((slide) => slide.part === 'summary');
      expect(summary?.part === 'summary' && summary.scope[2]?.value).toBe('17 executadas entre 12:00 UTC e 12:00 UTC');
      expect(PRINT_TYPE.scopeValue).toBe(13);
    });
  });

  it('hard-wraps a query without dropping a character', () => {
    const line = `fetch logs | filter ${'a'.repeat(250)}`;
    const wrapped = wrapDql(`\n${line}\n\tsecond\u0007 line  \n\n`, 96);
    expect(wrapped.every((part) => part.length <= 96)).toBe(true);
    expect(wrapped[1]?.startsWith('  ')).toBe(true);
    expect(wrapped.slice(0, -1).map((part, index) => (index === 0 ? part : part.slice(2))).join('')).toBe(line);
    expect(wrapped[wrapped.length - 1]).toBe('  second line');
  });

  it('adds "past the goal" to a ruler reading past poor — in the poor zone or off the scale — and to no other', () => {
    const vulns = of(buildPrintDeckSpec(input('se')), 'analysis').find((slide) => slide.id === 'vulns--runtime') as AnalysisSlide;
    expect(vulns.visual?.kind === 'ruler' && vulns.visual.items[0]?.display).toBe('5,2 s · acima da meta ▶');
    expect(vulns.visual?.kind === 'ruler' && vulns.visual.items[1]?.display).toBe('180 ms');
    // WP5 maps 5.2 s of LCP (poor from 4 s) to 0.79: in the poor zone, not off the scale.
    const inZone: AnalysisVisual = {
      kind: 'ruler',
      title: 'Core Web Vitals (p75)',
      items: [
        { label: 'LCP', display: '5,2 s', position: 0.79, verdict: 'bad' },
        { label: 'CLS', display: '0,18', position: 0.61, verdict: 'warn' },
      ],
    };
    const shots = SHOTS.map((item) => (item.slot.id === 'vulns--runtime' ? { ...item, analysis: analysis('vulns--runtime', 'vulnerabilities', inZone, SHARED_DQL) } : item));
    const slide = of(buildPrintDeckSpec(input('se', { shots })), 'analysis').find((item) => item.id === 'vulns--runtime') as AnalysisSlide;
    expect(slide.visual?.kind === 'ruler' && slide.visual.items.map((item) => item.display)).toEqual(['5,2 s · acima da meta ▶', '0,18']);
  });

  it('with no print kept and no "Prova por DQL": cover and end (no empty agenda)', () => {
    const none = SHOTS.map((item) => ({ ...item, analysis: null, print: item.print === null ? null : { ...item.print, approved: false } }));
    expect(kinds(buildPrintDeckSpec(input('customer', { shots: none })))).toEqual(['cover', 'end']);
    expect(kinds(buildPrintDeckSpec(input('se', { shots: [] })))).toEqual(['cover', 'end']);
  });

  it('never lets buildDeckSpec emit a print-deck kind', () => {
    const spec = buildDeckSpec(
      { ...IDENTITY, dtLogo: PNG, windowLabel: '', platformLogos: [], agenda: [], why: [], technical: [], business: [], strings: { ...IDENTITY.strings, subtitle: '', tagline: '', preparedBy: '', whyTitle: '', whySubtitle: '', assistLabel: '', technicalDivider: '', technicalKicker: '', businessDivider: '', businessKicker: '', closingTitle: '', closingBullets: [], footer: '' } },
      { profile: 'se' },
    );
    expect(spec.slides.map((slide) => slide.kind)).toEqual(['cover', 'agenda', 'end']);
  });
});

// ------------------------------------------------------------------ the PPTX

/** Every rendered slide of a spec, by kind. */
function rendered(spec: DeckSpec) {
  const slides = renderSlides(spec, PNG);
  return spec.slides.map((slide, index) => ({ slide, out: slides[index] as (typeof slides)[number] }));
}

/** The compression method of every entry of a ZIP, read from its central directory. */
function centralDirectory(bytes: Uint8Array): { name: string; method: number }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let at = bytes.length - 22; at >= 0; at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) {
      eocd = at;
      break;
    }
  }
  expect(eocd).toBeGreaterThan(0);
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: { name: string; method: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(offset + 28, true);
    const extra = view.getUint16(offset + 30, true);
    const comment = view.getUint16(offset + 32, true);
    entries.push({ name: new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength)), method: view.getUint16(offset + 10, true) });
    offset += 46 + nameLength + extra + comment;
  }
  return entries;
}

/**
 * What PowerPoint checks before it opens a package: every slide part is well-formed XML, listed in
 * `presentation.xml` and `[Content_Types].xml`, with a layout relationship; every `r:embed` has a
 * relationship whose target exists; every media extension has a content type.
 */
async function packageProblems(zip: JSZip): Promise<string[]> {
  const problems: string[] = [];
  const read = async (name: string) => (await zip.file(name)?.async('string')) ?? null;
  const parse = (name: string, xml: string) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) problems.push(`${name}: not well-formed`);
  };
  const contentTypes = (await read('[Content_Types].xml')) ?? '';
  const presentation = (await read('ppt/presentation.xml')) ?? '';
  const presRels = (await read('ppt/_rels/presentation.xml.rels')) ?? '';
  parse('[Content_Types].xml', contentTypes);
  parse('ppt/presentation.xml', presentation);
  const ids = [...presentation.matchAll(/<p:sldId id="(\d+)" r:id="(rId\d+)"\/>/g)];
  if (new Set(ids.map((match) => match[1])).size !== ids.length) problems.push('duplicate slide ids');
  for (const [, id, rel] of ids) {
    if (Number(id) < 256) problems.push(`slide id ${id} < 256`);
    const target = new RegExp(`Id="${rel}"[^>]*Target="([^"]+)"`).exec(presRels)?.[1];
    if (target === undefined) {
      problems.push(`${rel}: no relationship`);
      continue;
    }
    const part = `ppt/${target}`;
    const xml = await read(part);
    if (xml === null) {
      problems.push(`${part}: missing`);
      continue;
    }
    parse(part, xml);
    if (!contentTypes.includes(`PartName="/${part}"`)) problems.push(`${part}: no content type`);
    const relsName = part.replace('slides/', 'slides/_rels/') + '.rels';
    const rels = await read(relsName);
    if (rels === null) {
      problems.push(`${relsName}: missing`);
      continue;
    }
    parse(relsName, rels);
    if (!/slideLayouts\/slideLayout\d+\.xml/.test(rels)) problems.push(`${relsName}: no layout`);
    for (const [, embed] of xml.matchAll(/r:embed="(rId\d+)"/g)) {
      const media = new RegExp(`Id="${embed}"[^>]*Target="\\.\\./media/([^"]+)"`).exec(rels)?.[1];
      if (media === undefined) problems.push(`${part}: ${embed} has no relationship`);
      else if (zip.file(`ppt/media/${media}`) === null) problems.push(`${part}: media ${media} missing`);
      else if (!contentTypes.includes(`Extension="${media.split('.').pop()}"`)) problems.push(`${media}: no content type`);
    }
  }
  return problems;
}

describe('the PPTX writer draws the print deck into the brand template', () => {
  it('draws the lupa with the print’s own r:embed and an <a:srcRect> in schema order (0 bytes)', () => {
    const spec = buildPrintDeckSpec(input('se'));
    const first = rendered(spec).find(({ slide }) => slide.kind === 'print');
    expect(first).toBeDefined();
    const { out } = first as NonNullable<typeof first>;
    expect(out.layout).toBe(28);
    expect(out.media).toHaveLength(1);
    const embeds = [...out.xml.matchAll(/<a:blip r:embed="(rId\d+)"\/>/g)].map((match) => match[1]);
    expect(embeds).toEqual(['rId2', 'rId2']);
    expect(out.xml).toContain('<a:srcRect l="33400" t="11200" r="38600" b="85000"/>');
    expect(out.xml).toMatch(/<p:blipFill><a:blip r:embed="rId2"\/><a:srcRect [^>]*\/><a:stretch><a:fillRect\/><\/a:stretch><\/p:blipFill>/);
    // Without a crop the blip fill is the Tech Wrapup's own.
    expect(out.xml).toContain('<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>');
    expect(out.xml).toContain('typeface="+mn-lt"');
  });

  it('writes the DQL in monospace runs and the legend name in bold', () => {
    const spec = buildPrintDeckSpec(input('se'));
    const analysisXml = rendered(spec).find(({ slide }) => slide.kind === 'analysis')?.out.xml ?? '';
    expect(analysisXml).toContain('<a:latin typeface="Consolas"/><a:cs typeface="Consolas"/>');
    expect(analysisXml).toContain('sz="650"');
    expect(analysisXml).toContain('timeseries {');
    const printXml = rendered(spec).find(({ slide }) => slide.kind === 'print')?.out.xml ?? '';
    expect(printXml).toContain('<a:rPr lang="en-US" sz="900" b="1" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="+mn-lt"/></a:rPr><a:t>Cabeçalho:</a:t>');
    expect(printXml).toContain('<a:t> P-260914359, 12 min</a:t>');
  });

  it('dedupes and stores media: one genimgN.jpeg per distinct print, STORE, jpeg declared, and a package PowerPoint can open', async () => {
    for (const profile of ['se', 'customer'] as const) {
      const spec = buildPrintDeckSpec(input(profile));
      const zip = await patchTemplate(spec, TEMPLATE, { dtLogo: PNG, seName: 'Ada Lovelace', dedupeMedia: true, storeImages: true });
      const media = Object.keys(zip.files).filter((name) => /^ppt\/media\/genimg\d+\./.test(name));
      const distinct = new Set(of(spec, 'print').map((slide) => slide.image.mediaKey));
      expect(media.filter((name) => name.endsWith('.jpeg'))).toHaveLength(distinct.size);
      expect(media.filter((name) => name.endsWith('.png'))).toHaveLength(1);
      const contentTypes = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
      expect(contentTypes).toContain('Extension="jpeg"');
      expect(await packageProblems(zip)).toEqual([]);
      const slideParts = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
      expect(slideParts).toHaveLength(spec.slides.length);

      const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
      const entries = centralDirectory(bytes);
      const methods = entries.filter((entry) => /^ppt\/media\/genimg\d+\./.test(entry.name)).map((entry) => entry.method);
      expect(methods.length).toBe(media.length);
      expect(methods.every((method) => method === 0)).toBe(true);
      expect(entries.find((entry) => entry.name === 'ppt/slides/slide1.xml')?.method).toBe(8);
    }
  });

  it('without the flags, writes one part per use (the Tech Wrapup default is untouched)', async () => {
    const spec = buildPrintDeckSpec(input('se'));
    const zip = await patchTemplate(spec, TEMPLATE, { dtLogo: PNG, seName: null });
    const media = Object.keys(zip.files).filter((name) => /^ppt\/media\/genimg\d+\./.test(name));
    // 5 prints + 4 story thumbnails + the partner logo on the cover and the end.
    expect(media).toHaveLength(11);
    expect(await packageProblems(zip)).toEqual([]);
  });

  it('keeps the unapproved print out of the customer package, byte for byte', async () => {
    const zip = await patchTemplate(buildPrintDeckSpec(input('customer')), TEMPLATE, { dtLogo: PNG, seName: null, dedupeMedia: true, storeImages: true });
    const parts = await Promise.all(Object.keys(zip.files).filter((name) => name.startsWith('ppt/media/genimg')).map((name) => zip.file(name)?.async('base64')));
    const forbidden = [IMAGES.root, IMAGES.frontend].map((image) => image.dataUrl.split(',')[1]);
    expect(parts.filter((part) => forbidden.includes(part))).toEqual([]);
  });

  it('buildTemplateDeck forwards the media flags (a smaller file for the same deck)', async () => {
    const spec = buildPrintDeckSpec(input('se'));
    const plain = await buildTemplateDeck(spec, TEMPLATE, { dtLogo: PNG, seName: null });
    const packed = await buildTemplateDeck(spec, TEMPLATE, { dtLogo: PNG, seName: null, dedupeMedia: true, storeImages: true });
    expect(packed.size).toBeGreaterThan(1000);
    expect(packed.size).not.toBe(plain.size);
  });
});

// ------------------------------------------------------------------ the preview

function preview(spec: DeckSpec) {
  return render(createElement(DeckPreview, { spec, art: {}, dtLogo: PNG, slideLabel: (n: number, total: number, title: string) => `Slide ${n} of ${total}: ${title}` }));
}

describe('the preview draws the same slides', () => {
  it('one slide per spec slide, data-slide-kind per kind, one img[data-print-image] per print slide', () => {
    for (const profile of ['se', 'customer'] as const) {
      const spec = buildPrintDeckSpec(input(profile));
      const { container, unmount } = preview(spec);
      const slides = [...container.querySelectorAll('li[data-wrap-slide]')];
      expect(slides.map((slide) => slide.getAttribute('data-slide-kind'))).toEqual(spec.slides.map((slide) => slide.kind));
      const images = [...container.querySelectorAll<HTMLImageElement>('img[data-print-image]')];
      expect(images).toHaveLength(of(spec, 'print').length);
      expect(images.every((image) => image.alt.startsWith('Tela real do Dynatrace: '))).toBe(true);
      expect(images.every((image) => image.getAttribute('loading') === 'eager')).toBe(true);
      expect(container.querySelector('img[alt="What it shows"]')).toBeNull();
      const dqlOnly = container.querySelectorAll('[data-analysis-variant="dql-only"]');
      expect(dqlOnly).toHaveLength(profile === 'customer' ? 1 : 0);
      expect(container.querySelectorAll('[data-print-deck-slide="analysis"]')).toHaveLength(of(spec, 'analysis').length);
      unmount();
    }
  });

  it('crops the lupa with the srcRect fractions and names each slide by its title', () => {
    const spec = buildPrintDeckSpec(input('se'));
    const { container, unmount } = preview(spec);
    const first = container.querySelector('li[data-slide-kind="print"]');
    const crops = [...(first?.querySelectorAll<HTMLImageElement>('img:not([data-print-image])') ?? [])];
    expect(crops).toHaveLength(1);
    const style = crops[0]?.style;
    expect(parseFloat(style?.width ?? '')).toBeCloseTo(100 / 0.28, 3);
    expect(parseFloat(style?.left ?? '')).toBeCloseTo((-0.334 / 0.28) * 100, 3);
    expect(first?.getAttribute('aria-label')).toBe(`Slide 4 of ${spec.slides.length}: 01 · Tela problem--p-260914359`);
    expect(first?.textContent).toContain('Cabeçalho:');
    expect(container.textContent).not.toContain('ops@contoso.com');
    unmount();
  });
});

// ------------------------------------------------------------------ geometry

/** Inside the content band of the slide (the frame around a print may bleed its 30 000 EMU gap). */
function outside(rect: Rect, slack = 0): boolean {
  const eps = 1;
  return rect.x < -eps || rect.x + rect.w > SLIDE_W + eps || rect.y < CONTENT_TOP - slack - eps || rect.y + rect.h > CONTENT_BOTTOM + slack + eps || rect.w < 0 || rect.h < 0;
}

describe('printGeometry keeps every block inside the content band', () => {
  it('for pins 0..6 × lupa on/off × 0..4 KPIs', () => {
    const offenders: string[] = [];
    const flag = (where: string, rect: Rect, slack = 0) => {
      if (outside(rect, slack)) offenders.push(`${where}: ${JSON.stringify(rect)}`);
    };
    for (let pins = 0; pins <= 6; pins += 1) {
      for (const zoom of [false, true]) {
        const layout = printLayout({ pins, zoom });
        const where = `print pins=${pins} zoom=${zoom}`;
        for (const key of ['image', 'caption', 'headline', 'whatLabel', 'what', 'whyLabel', 'why', 'pinsHeading'] as const) flag(`${where} ${key}`, layout[key]);
        flag(`${where} frame`, layout.frame, 30000);
        expect(layout.legend.length).toBe(Math.min(pins, zoom && pins <= 4 ? 4 : 6));
        layout.legend.forEach((row, index) => [row.row, row.disc, row.text].forEach((rect) => flag(`${where} legend ${index}`, rect)));
        if (layout.zoom !== null) {
          flag(`${where} zoom label`, layout.zoom.label);
          flag(`${where} zoom box`, layout.zoom.box);
          for (const focus of [{ x: 0.334, y: 0.112, w: 0.28, h: 0.038 }, { x: 0.527, y: 0.384, w: 0.301, h: 0.151 }, FULL_FOCUS]) {
            flag(`${where} zoom`, containRect(layout.zoom.box, focusAspect(focus, { width: 1720, height: 1080 })));
          }
        }
        for (const corner of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -0.2, y: 1.4 }, { x: 0.5, y: 0.5 }]) flag(`${where} pin`, pinRect(layout.image, corner));
      }
    }
    for (let kpis = 0; kpis <= 4; kpis += 1) {
      for (const hasDql of [false, true]) {
        const layout = analysisLayout({ kpis, hasDql });
        const where = `analysis kpis=${kpis} dql=${hasDql}`;
        expect(layout.kpis).toHaveLength(kpis);
        layout.kpis.forEach((rect) => flag(`${where} kpi`, rect));
        [layout.chart, layout.chartTitle, layout.plot, layout.findings, layout.matters, layout.reco, kitChartRect(layout)].forEach((rect) => flag(where, rect));
        if (layout.dql !== null) flag(`${where} dql`, layout.dql);
        const columns = columnsLayout(COLUMNS as Extract<AnalysisVisual, { kind: 'columns' }>, layout.plot);
        [...columns.bars.map((bar) => bar.rect), ...(columns.band === null ? [] : [columns.band]), ...(columns.bandLabel === null ? [] : [columns.bandLabel]), ...columns.markers.flatMap((marker) => [marker.rule, marker.label]), ...columns.xLabels.map((label) => label.rect), columns.maxLabel, columns.axis].forEach((rect) => flag(`${where} columns`, rect));
        capacityLayout(CAPACITY as Extract<AnalysisVisual, { kind: 'capacity' }>, layout.plot).rows.forEach((row) => [row.label, row.display, row.used, row.requested, ...(row.allocatable === null ? [] : [row.allocatable])].forEach((rect) => flag(`${where} capacity`, rect)));
        rulerLayout(RULER as Extract<AnalysisVisual, { kind: 'ruler' }>, layout.plot).items.forEach((row) => [row.label, row.marker, row.display, ...row.zones.map((zone) => zone.rect)].forEach((rect) => flag(`${where} ruler`, rect)));
      }
    }
    for (let steps = 3; steps <= 5; steps += 1) {
      const layout = storyLayout(steps);
      expect(layout.cards).toHaveLength(steps);
      expect(layout.arrows).toHaveLength(steps - 1);
      [layout.subtitle, layout.chain, layout.caveat, ...layout.arrows, ...layout.cards.flatMap((card) => [card.card, card.stage, card.time, card.thumb, card.text, card.ref])].forEach((rect) => flag(`story ${steps}`, rect));
    }
    const method = methodologyLayout();
    [...method.scope, method.prints, method.queries, method.gaps].forEach((rect) => flag('methodology', rect));
    gridLayout(method.prints, METHOD_WEIGHTS.prints, PRINT_BUDGET.methodRows).cells.flat().forEach((rect) => flag('prints grid', rect));
    dqlPageLayout().cards.forEach((card) => {
      flag('dql card', card);
      Object.values(dqlCardLayout(card)).forEach((rect) => flag('dql card inner', rect));
    });
    expect(offenders).toEqual([]);
  });

  it('places the image flush with the right margin at 1720:1080, and the srcRect of the problem lupa', () => {
    expect(PRINT_IMAGE_BOX.x + PRINT_IMAGE_BOX.w).toBe(SLIDE_W - 460000);
    expect(PRINT_IMAGE_BOX.w / PRINT_IMAGE_BOX.h).toBeCloseTo(1720 / 1080, 5);
    expect(srcRectFor({ x: 0.334, y: 0.112, w: 0.28, h: 0.038 })).toEqual({ l: 33400, t: 11200, r: 38600, b: 85000 });
    expect(srcRectFor(FULL_FOCUS)).toEqual({ l: 0, t: 0, r: 0, b: 0 });
  });

  it('nudges a pin that overlaps one already placed, and drops it after three tries', () => {
    const image = PRINT_IMAGE_BOX;
    const same = placePins([{ n: 1, x: 0.5, y: 0.5 }, { n: 2, x: 0.5, y: 0.5 }]);
    expect(same.kept).toEqual([0, 1]);
    // One nudge of 0.34 in, about 72 px of the print space.
    expect(((same.pins[1]?.y ?? 0) - 0.5) * 1080).toBeCloseTo(72, 0);
    expect(((same.pins[1]?.y ?? 0) - 0.5) * image.h).toBeCloseTo(MIN_PIN_DISTANCE, 3);
    const crowd = placePins(Array.from({ length: 6 }, (_, index) => ({ n: index + 1, x: 0.5, y: 0.97 })));
    expect(crowd.kept.length).toBeLessThan(6);
    const centres = crowd.pins.map((pin) => pinCentre(image, pin));
    centres.forEach((a, i) => centres.slice(i + 1).forEach((b) => expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(MIN_PIN_DISTANCE - 0.5)));
  });

  it('lets every pair of the pin templates’ fallback positions through untouched (spec §5.6)', () => {
    // The planner's own templates (WP2); a 'variable' pin has no fallback of its own: it shows only once anchored or placed.
    const layouts = Object.values(LAYOUTS).filter((layout) => layout.pins.length > 0);
    expect(layouts.length).toBeGreaterThanOrEqual(8);
    for (const { key: layout, pins: templates } of layouts) {
      const pins = templates.filter((pin) => pin.stability !== 'variable').map((pin) => ({ n: pin.n, x: pin.x, y: pin.y }));
      const placed = placePins(pins);
      expect(placed.kept, layout).toEqual(pins.map((_, index) => index));
      placed.pins.forEach((pin, index) => {
        const centre = pinCentre(PRINT_IMAGE_BOX, pins[index] as { x: number; y: number });
        const after = pinCentre(PRINT_IMAGE_BOX, pin);
        expect(Math.abs(after.y - centre.y), `${layout} pin ${index + 1}`).toBeLessThan(1);
      });
    }
  });

  it('grows a story thumbnail’s focus to its box, inside the image', () => {
    const size = { width: 1720, height: 1080 };
    expect(thumbFocus(null, size, 1.5)).toEqual(FULL_FOCUS);
    for (const [focus, aspect] of [
      [{ x: 0.334, y: 0.112, w: 0.28, h: 0.038 }, 1.53],
      [{ x: 0.009, y: 0.31, w: 0.3, h: 0.06 }, 2.76],
      [{ x: 0.95, y: 0.95, w: 0.05, h: 0.05 }, 1.99],
      [{ x: 0.1, y: 0.0, w: 0.05, h: 0.9 }, 1.53],
      [{ x: 0, y: 0, w: 1, h: 1 }, 2.76],
    ] as const) {
      const grown = thumbFocus(focus, size, aspect);
      expect(grown.x).toBeGreaterThanOrEqual(-1e-9);
      expect(grown.y).toBeGreaterThanOrEqual(-1e-9);
      expect(grown.x + grown.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(grown.y + grown.h).toBeLessThanOrEqual(1 + 1e-9);
      expect(focusAspect(grown, size)).toBeCloseTo(aspect, 6);
      // It never shows less than the focus (unless the image cannot hold the focus at that aspect).
      if (grown.w < 1 - 1e-6 && grown.h < 1 - 1e-6) {
        expect(grown.w).toBeGreaterThanOrEqual(focus.w - 1e-9);
        expect(grown.h).toBeGreaterThanOrEqual(focus.h - 1e-9);
      }
    }
  });

  it('sets marker labels on chips as wide as their text, apart from each other, and the band label where the band starts (3.2.7 review UX-M3)', () => {
    const plot = analysisLayout({ kpis: 4, hasDql: true }).plot;
    const visual: Extract<AnalysisVisual, { kind: 'columns' }> = {
      ...(COLUMNS as Extract<AnalysisVisual, { kind: 'columns' }>),
      points: Array.from({ length: 48 }, (_, index) => ({ label: `05:${String(index).padStart(2, '0')}`, value: index >= 29 && index < 34 ? 351 : 0, highlight: index >= 29 && index < 34 })),
      band: { from: 28, to: 47, label: 'problema' },
      markers: [
        { at: 15, label: '05:03' },
        { at: 23, label: '05:11' },
        { at: 28, label: '05:16' },
      ],
      maxLabel: '351',
      unit: 'falhas/min',
    };
    const geometry = columnsLayout(visual, plot);
    const kept = geometry.markers.filter((marker) => marker.text !== '');
    expect(kept[0]?.text).toBe('05:03');
    for (const marker of kept) expect(marker.label.w).toBeLessThan(620000);
    kept.forEach((a, index) => kept.slice(index + 1).forEach((b) => expect(a.label.x + a.label.w).toBeLessThanOrEqual(b.label.x)));
    // The band starts well right of the y-axis label: its label sits on it.
    expect(geometry.band).not.toBeNull();
    expect(geometry.bandLabel?.x).toBeCloseTo((geometry.band?.x ?? 0) + 20000, 0);
  });

  it('draws no column below the axis for a negative value', () => {
    const visual: Extract<AnalysisVisual, { kind: 'columns' }> = { ...(COLUMNS as Extract<AnalysisVisual, { kind: 'columns' }>), points: [{ label: '22:14', value: -5, highlight: false }, { label: '22:15', value: 10, highlight: false }] };
    const plot = analysisLayout({ kpis: 4, hasDql: true }).plot;
    const geometry = columnsLayout(visual, plot);
    geometry.bars.forEach((bar) => {
      expect(bar.rect.h).toBeGreaterThanOrEqual(0);
      expect(bar.rect.y + bar.rect.h).toBeLessThanOrEqual(geometry.axis.y + 1);
    });
  });

  it('sets every methodology cell on one line that fits its column, at ≥ 7 pt, cutting only what 7 pt cannot hold', () => {
    const method = methodologyLayout();
    const headers = ['Tela', 'Capturada', 'Via', 'Link', 'Identidade'];
    const usual = ['Causa raiz · easyTradeManager', '05/10 18:58 UTC', 'companion', 'verificado', 'tela verificada'];
    const long = ['Serviço com mais falhas em excesso · easyTradeBroker', '05/10 18:58 GMT-3', 'captura guiada', 'visto após cliques — faça o probe', 'confirmada pelo SE'];
    for (const rows of [Array.from({ length: 10 }, () => usual), Array.from({ length: 10 }, () => long)]) {
      const fitted = fitGrid(method.prints, METHOD_WEIGHTS.prints, 9, headers, rows);
      const { cells } = gridLayout(method.prints, METHOD_WEIGHTS.prints, rows.length);
      expect(fitted.sizes.every((size) => size >= 7 && size <= 9)).toBe(true);
      fitted.rows.forEach((row) =>
        row.forEach((cell, c) => {
          const at = cells[1]?.[c] as Rect;
          expect(cellFits(cell, at.w, fitted.sizes[c] ?? 9), cell).toBe(true);
          // One line of the column's size and the insets fit the row of a ten-row table.
          expect((fitted.sizes[c] ?? 9) * 1.2 * EMU_PER_PT + 2 * CELL_INSET).toBeLessThanOrEqual(at.h);
        }),
      );
      if (rows[0] === usual) {
        // The usual texts keep the table's 9 pt and are not cut.
        expect(fitted.sizes).toEqual([9, 9, 9, 9, 9]);
        expect(fitted.rows[0]).toEqual(usual);
      } else {
        // A title too long even at 7 pt is cut; a short cell steps its column down instead.
        expect(fitted.rows[0]?.[0]?.endsWith('…')).toBe(true);
        expect(fitted.rows[0]?.[1]).toBe('05/10 18:58 GMT-3');
        expect(fitted.rows[0]?.[4]).toBe('confirmada pelo SE');
        expect(fitted.sizes[4]).toBeLessThan(9);
      }
    }
  });

  it('draws the methodology tables with the same cells in the PPTX and the preview', () => {
    const many: MethodologyContent = { ...METHODOLOGY, prints: Array.from({ length: 10 }, (_, index) => [`Serviço com mais falhas em excesso · svc-${index}`, '05/10 18:58 GMT-3', 'captura guiada', 'visto após cliques — faça o probe', 'confirmada pelo SE']) };
    const spec = buildPrintDeckSpec(input('se', { methodology: many }));
    const summary = of(spec, 'methodology').find((slide) => slide.part === 'summary') as Extract<MethodologySlide, { part: 'summary' }>;
    const method = methodologyLayout();
    const fitted = fitGrid(method.prints, METHOD_WEIGHTS.prints, 9, summary.printHeaders, summary.prints);
    const index = spec.slides.indexOf(summary);
    const xml = renderSlides(spec, PNG)[index]?.xml ?? '';
    const { container, unmount } = preview(spec);
    const slide = container.querySelectorAll('li[data-wrap-slide]')[index];
    const previewCells = new Set([...(slide?.querySelectorAll('div') ?? [])].map((node) => node.textContent ?? ''));
    for (const cell of fitted.rows.flat()) {
      expect(xml).toContain(`<a:t>${cell.replace(/&/g, '&amp;')}</a:t>`);
      expect(previewCells.has(cell)).toBe(true);
    }
    // The cut cell carries its ellipsis in both; the full text is in neither.
    expect(xml).not.toContain('Serviço com mais falhas em excesso · svc-0</a:t>');
    unmount();
  });

  it('reads a legend line as a bold name and its text', () => {
    expect(legendParts('Impacto: 30 usuários às 22:57')).toEqual({ name: 'Impacto:', text: ' 30 usuários às 22:57' });
    expect(legendParts('**Root cause**: database')).toEqual({ name: 'Root cause:', text: ' database' });
    expect(legendParts('texto livre do SE')).toEqual({ name: null, text: 'texto livre do SE' });
  });
});

// ------------------------------------------------------------------ download

describe('the download', () => {
  it('names the file TIP-Tech-Wrapup-Prints-{customer}-{Month}-{YYYY}[-SE-interno].pptx', () => {
    const now = new Date(2026, 9, 5, 12);
    expect(printDeckFileName('Açaí & Cia.', 'customer', now, 'pt-BR')).toBe('TIP-Tech-Wrapup-Prints-Acai-Cia-Outubro-2026.pptx');
    expect(printDeckFileName('  ', 'se', now, 'en')).toBe('TIP-Tech-Wrapup-Prints-poc-October-2026-SE-interno.pptx');
  });

  it('builds the package with the media flags, hands it to an anchor and keeps the URL for the fallback link', async () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const createSpy = vi.fn((blob: Blob) => {
      created.push(`blob:${created.length + 1}:${blob.size}`);
      return created[created.length - 1] as string;
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createSpy });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: (url: string) => revoked.push(url) });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { result, unmount } = renderHook(() => useDeckDownload({ loadTemplate: async () => TEMPLATE.slice().buffer }));
    const spec = buildPrintDeckSpec(input('se'));
    await act(async () => {
      await result.current.download(spec, { dtLogo: PNG, seName: 'Ada Lovelace' }, 'deck.pptx');
    });
    expect(click).toHaveBeenCalledTimes(1);
    const state = result.current.state;
    expect(state.phase).toBe('ready');
    if (state.phase === 'ready') {
      expect(state.name).toBe('deck.pptx');
      expect(state.url).toBe(created[0]);
      expect(state.bytes).toBeGreaterThan(1000);
    }
    expect(revoked).toEqual([]);
    await act(async () => {
      await result.current.download(spec, { dtLogo: PNG, seName: null }, 'deck.pptx');
    });
    expect(revoked).toEqual([created[0]]);
    unmount();
    expect(revoked).toEqual([created[0], created[1]]);
  });

  it('reports a failure without throwing', async () => {
    const { result } = renderHook(() => useDeckDownload({ loadTemplate: async () => Promise.reject(new Error('Could not load the brand template (404).')) }));
    await act(async () => {
      await result.current.download(buildPrintDeckSpec(input('se')), { dtLogo: PNG, seName: null }, 'deck.pptx');
    });
    expect(result.current.state).toEqual({ phase: 'failed', reason: 'Could not load the brand template (404).' });
  });
});

describe('the real-prints slides load with their own chunk (3.2.7 review RT-3)', () => {
  it('the shared deck writers import no print-slide code at runtime: the real-prints deck registers it', () => {
    for (const file of ['ui/app/features/wrapup/DeckPreview.tsx', 'ui/app/features/wrapup/pptxTemplate.ts', 'ui/app/features/wrapup/spec.ts']) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      const runtime = [...source.matchAll(/^import (?!type )[^;]*?from '([^']+)'/gms)].map((match) => match[1] ?? '');
      expect(runtime.length, file).toBeGreaterThan(0);
      expect(runtime.filter((path) => /prints\/deck\/(PrintSlideViews|pptxPrintSlides|printGeometry|buildPrintDeckSpec)/.test(path)), file).toEqual([]);
    }
    // Importing the spec builder (as every caller that makes a print slide does) is what registers them.
    expect(() => printSlideRenderers()).not.toThrow();
  });
});
