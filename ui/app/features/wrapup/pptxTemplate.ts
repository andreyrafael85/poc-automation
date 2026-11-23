import JSZip from 'jszip';

import { DECK } from './deck';
import type { KpiStatus } from './deck';
import {
  CAPTURE_INSET,
  captureImageRect,
  CONTENT_TOP,
  CONTENT_W,
  MARGIN,
  capturePinSize,
  SLIDE_H as CY,
  SLIDE_W as CX,
  TYPE,
  executiveLayout,
  kpiValueSize,
  sectionLayout,
  STORY_HEAD,
  type Rect,
} from './geometry';
import {
  captureKpiValueSize,
  kpiFitSize,
  storyCards,
  BAND_PAD_X,
  BAND_TEXT_TOP,
  BAR_VALUE_GAP,
  barValueGutterEmu,
  type AgendaSlide,
  type CaptureSlide,
  type CoverSlide,
  type DeckKpi,
  type DeckSlide,
  type DeckSpec,
  type DeckVisual,
  type DividerSlide,
  type EndSlide,
  type ExecutiveSlide,
  type SectionSlide,
} from './spec';
import { BRAND_PACK_INSTALLED } from './brandPack';
import { buildNeutralTemplate } from './neutralTemplate';
import { printSlideRenderers } from './prints/deck/renderers';

/**
 * The SE deck, written into the Dynatrace corporate template (3.2.4).
 *
 * Opens the template (`ui/assets/techwrapup-brand-template.pptx`, cleaned by
 * `scripts/clean-pptx-template.cjs`) and adds slides that reference its own layouts, so the deck
 * keeps the theme, master, fonts, colours, separator line, footer and slide numbers. What goes on
 * each slide is decided by `spec.ts` and where it goes by `geometry.ts`; the on-screen preview
 * draws from the same two, so the preview is the file.
 *
 * Layouts used (by number, the cleaning script keeps exactly these):
 * - **1 "Cover slide"** — the deck title, the engagement, the SE, the customer logo
 * - **28 "Dark: standard slide"** — agenda, executive page and content slides
 * - **33 "Dark: blank slide"** — part dividers
 * - **56 "End slide"** — the branded close
 *
 * Text uses the theme's fonts (`+mn-lt`, DT Flow), never a PostScript name: until 3.2.3 the runs
 * asked for "DTFlow-Medium", which no machine has under that name, so PowerPoint substituted it
 * (finding E4). Everything runs in the browser (JSZip).
 */

const TEMPLATE_ASSET = './assets/techwrapup-brand-template.pptx';

const LAYOUT = { cover: 1, content: 28, divider: 33, end: 56 } as const;
/** Footer/slide-number placeholder indices per layout (from the master). */
const CHROME = {
  content: { ftr: 25, num: 26 },
  divider: { ftr: 21, num: 22 },
} as const;

const NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

/** The theme's body font (DT Flow). Headings are the same family in bold. */
const THEME_FONT = '+mn-lt';

/** A neutral shape style block — PowerPoint writes one on every autoshape. */
const STYLE =
  '<p:style><a:lnRef idx="0"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style>';

/**
 * Characters XML 1.0 forbids (C0 controls other than tab, newline and carriage return, plus
 * U+FFFE/U+FFFF). One of them — an ANSI escape in a log line, say — makes PowerPoint refuse the
 * slide, so they are dropped before escaping (3.2.1).
 */
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/**
 * Half of a surrogate pair (3.2.7 review PS-4): JSZip writes it as ED A0 BD, which is not UTF-8,
 * and PowerPoint then reports the deck as damaged. A text cut inside an emoji is the usual source.
 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function esc(text: string): string {
  return text
    .replace(XML_INVALID, '')
    .replace(LONE_SURROGATE, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function statusColor(status: KpiStatus | undefined): string {
  if (status === 'good') return DECK.pos;
  if (status === 'warn') return DECK.amber;
  if (status === 'bad') return DECK.red;
  return DECK.lime;
}

interface RunOpts {
  sz?: number; // points
  bold?: boolean;
  color?: string; // hex without #
}

function run(text: string, opts: RunOpts = {}): string {
  const sz = Math.round((opts.sz ?? 12) * 100);
  const color = opts.color ?? DECK.white;
  return (
    `<a:r><a:rPr lang="en-US" sz="${sz}"${opts.bold ? ' b="1"' : ''} dirty="0">` +
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:latin typeface="${THEME_FONT}"/></a:rPr><a:t>${esc(text)}</a:t></a:r>`
  );
}

interface ParaOpts {
  align?: 'l' | 'ctr' | 'r';
  bullet?: boolean;
  spaceAfter?: number; // points
}

function para(runsXml: string, opts: ParaOpts = {}): string {
  const align = opts.align ? ` algn="${opts.align}"` : '';
  const bullet = opts.bullet ? '<a:buFont typeface="Arial"/><a:buChar char="&#8226;"/>' : '<a:buNone/>';
  const marL = opts.bullet ? ' marL="228600" indent="-228600"' : '';
  const spc = opts.spaceAfter ? `<a:spcAft><a:spcPts val="${Math.round(opts.spaceAfter * 100)}"/></a:spcAft>` : '';
  return `<a:p><a:pPr${marL}${align}>${spc}${bullet}</a:pPr>${runsXml}</a:p>`;
}

let shapeSeq = 100;
let fieldSeq = 0;
function nextId(): number {
  shapeSeq += 1;
  return shapeSeq;
}

// ------------------------------------------------------------------ media

interface MediaRef {
  embedId: string;
  ext: string;
  base64: string;
  filename?: string;
}
export type { MediaRef };

/**
 * A crop of a picture (`<a:srcRect>`), in 1/1000 of a percent of the picture from each edge: the
 * lupa of a real print and its story thumbnails show a region of the same media part (3.2.7).
 */
export interface SrcRect {
  l: number;
  t: number;
  r: number;
  b: number;
}

function parseDataUrl(dataUrl: string | null): { ext: string; base64: string } | null {
  if (dataUrl === null) return null;
  const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (match === null) return null;
  let ext = (match[1] as string).toLowerCase();
  if (ext === 'jpg') ext = 'jpeg';
  if (ext === 'svg+xml') ext = 'svg';
  return { ext, base64: match[2] as string };
}

/**
 * The `<p:pic>` of a registered media part. With a crop, the blip fill reads blip → srcRect →
 * stretch, the order the schema requires (another order makes PowerPoint repair the file); without
 * one, the XML is byte-identical to what the Tech Wrapup has always written.
 */
function picXml(embedId: string, rect: Rect, name: string, crop?: SrcRect): string {
  const src = crop === undefined ? '' : `<a:srcRect l="${Math.round(crop.l)}" t="${Math.round(crop.t)}" r="${Math.round(crop.r)}" b="${Math.round(crop.b)}"/>`;
  return (
    `<p:pic><p:nvPicPr><p:cNvPr id="${nextId()}" name="${name}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    `<p:blipFill><a:blip r:embed="${embedId}"/>${src}<a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
    `<p:spPr><a:xfrm><a:off x="${Math.round(rect.x)}" y="${Math.round(rect.y)}"/><a:ext cx="${Math.round(rect.w)}" cy="${Math.round(rect.h)}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`
  );
}

/** A picture shape from a data URL; registers the media and returns its XML (or ''). */
function picFromDataUrl(dataUrl: string | null, rect: Rect, media: MediaRef[], name = 'picture', crop?: SrcRect): string {
  const parsed = parseDataUrl(dataUrl);
  if (parsed === null) return '';
  const embedId = `rId${media.length + 2}`; // rId1 is the layout
  media.push({ embedId, ext: parsed.ext, base64: parsed.base64 });
  return picXml(embedId, rect, name, crop);
}

/** The same media part drawn again on the slide (the lupa of a print): its `r:embed`, no new media. */
function pictureAgain(media: MediaRef, rect: Rect, name: string, crop?: SrcRect): string {
  return picXml(media.embedId, rect, name, crop);
}

// ------------------------------------------------------------------ shapes

interface BoxOpts {
  fill?: string;
  round?: boolean;
  anchor?: 't' | 'ctr' | 'b';
  /** Insets in EMU (default 91440 × 45720). */
  inset?: number;
}

function box(rect: Rect, paras: string, opts: BoxOpts = {}): string {
  const geom = opts.round
    ? '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 9000"/></a:avLst></a:prstGeom>'
    : '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  const fill = opts.fill ? `<a:solidFill><a:srgbClr val="${opts.fill}"/></a:solidFill>` : '<a:noFill/>';
  const anchor = opts.anchor ?? 't';
  const body = paras === '' ? '<a:p><a:endParaRPr lang="en-US"/></a:p>' : paras;
  const lr = opts.inset ?? 91440;
  const tb = opts.inset ?? 45720;
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${Math.round(rect.x)}" y="${Math.round(rect.y)}"/><a:ext cx="${Math.round(rect.w)}" cy="${Math.round(rect.h)}"/></a:xfrm>` +
    `${geom}${fill}<a:ln><a:noFill/></a:ln></p:spPr>` +
    // The spec cuts every text to a budget that fits its box (spec.ts BUDGET); normAutofit is only
    // a safety net for a substituted font, which PowerPoint applies once the text is edited.
    `<p:txBody><a:bodyPr wrap="square" lIns="${lr}" tIns="${tb}" rIns="${lr}" bIns="${tb}" anchor="${anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${body}</p:txBody></p:sp>`
  );
}

interface ShapeOpts {
  fill?: string;
  line?: { color: string; width?: number; dash?: boolean };
  /** Preset adjustments, e.g. `{ adj: 9000 }`. */
  adjust?: Record<string, number>;
}

/** A preset shape with no text (a card, a rule, a ring, a pin). */
function preset(prst: string, rect: Rect, opts: ShapeOpts = {}): string {
  const adjust = Object.entries(opts.adjust ?? {})
    .map(([name, value]) => `<a:gd name="${name}" fmla="val ${Math.round(value)}"/>`)
    .join('');
  const fill = opts.fill === undefined ? '<a:noFill/>' : `<a:solidFill><a:srgbClr val="${opts.fill}"/></a:solidFill>`;
  const line =
    opts.line === undefined
      ? '<a:ln><a:noFill/></a:ln>'
      : `<a:ln w="${Math.round((opts.line.width ?? 1) * 12700)}"><a:solidFill><a:srgbClr val="${opts.line.color}"/></a:solidFill>${opts.line.dash ? '<a:prstDash val="dash"/>' : ''}</a:ln>`;
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="${prst}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${Math.round(rect.x)}" y="${Math.round(rect.y)}"/><a:ext cx="${Math.max(1, Math.round(rect.w))}" cy="${Math.max(1, Math.round(rect.h))}"/></a:xfrm>` +
    `<a:prstGeom prst="${prst}"><a:avLst>${adjust}</a:avLst></a:prstGeom>${fill}${line}</p:spPr>` +
    STYLE +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`
  );
}

/** A filled rounded rectangle (a card background or a bar). */
function panelRect(rect: Rect, hex: string, adj = 9000): string {
  return preset('roundRect', rect, { fill: hex, adjust: { adj } });
}

/** A thin horizontal brand-gradient rule (purple → blue → teal). */
function gradientRule(rect: Rect): string {
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="rule"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${Math.round(rect.x)}" y="${Math.round(rect.y)}"/><a:ext cx="${Math.round(rect.w)}" cy="${Math.round(rect.h)}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `<a:gradFill><a:gsLst>` +
    `<a:gs pos="0"><a:srgbClr val="${DECK.purple}"/></a:gs>` +
    `<a:gs pos="50000"><a:srgbClr val="${DECK.blue}"/></a:gs>` +
    `<a:gs pos="100000"><a:srgbClr val="${DECK.green}"/></a:gs>` +
    `</a:gsLst><a:lin ang="0" scaled="1"/></a:gradFill><a:ln><a:noFill/></a:ln></p:spPr>` +
    STYLE +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`
  );
}

/** A placeholder shape that inherits geometry and styling from the layout. */
function placeholder(phType: string, phIdx: number | null, paras: string): string {
  const idxAttr = phIdx === null ? '' : ` idx="${phIdx}"`;
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="${phType}"/>` +
    `<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
    `<p:nvPr><p:ph type="${phType}"${idxAttr}/></p:nvPr></p:nvSpPr>` +
    `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paras}</p:txBody></p:sp>`
  );
}

/** The footer (CONFIDENTIAL) + slide-number field, so the brand chrome renders. */
function chrome(kind: 'content' | 'divider', confidential: string): string {
  const { ftr, num } = CHROME[kind];
  fieldSeq += 1;
  const guid = `{F0F0F0F0-0000-4000-8000-${String(fieldSeq).padStart(12, '0')}}`;
  // Fixed OOXML placeholder scaffolding — high-entropy markup, not a secret.
  /* eslint-disable noSecrets/no-secrets */
  const footer =
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="ftr"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
    `<p:nvPr><p:ph type="ftr" sz="quarter" idx="${ftr}"/></p:nvPr></p:nvSpPr>` +
    `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US"/><a:t>${esc(confidential)}</a:t></a:r></a:p></p:txBody></p:sp>`;
  const number =
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="sldNum"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
    `<p:nvPr><p:ph type="sldNum" sz="quarter" idx="${num}"/></p:nvPr></p:nvSpPr>` +
    `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id="${guid}" type="slidenum"><a:rPr lang="en-US" smtClean="0"/><a:pPr/><a:t>1</a:t></a:fld><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`;
  /* eslint-enable noSecrets/no-secrets */
  return footer + number;
}

function slideXml(shapes: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<p:sld ${NS}><p:cSld><p:spTree>` +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    shapes +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
  );
}

function slideRels(layoutIndex: number, media: MediaRef[]): string {
  // OOXML relationship schema URLs are namespace identifiers, not secrets.
  /* eslint-disable noSecrets/no-secrets */
  const layoutRel = `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout${layoutIndex}.xml"/>`;
  const imageRels = media
    .map((m) => `<Relationship Id="${m.embedId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${m.filename}"/>`)
    .join('');
  /* eslint-enable noSecrets/no-secrets */
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    layoutRel +
    imageRels +
    '</Relationships>'
  );
}

export interface RenderedSlide {
  layout: number;
  xml: string;
  media: MediaRef[];
  /** The slide's title, for docProps/app.xml consistency. */
  title: string;
}

// ------------------------------------------------------------- slide content

function coverSlide(slide: CoverSlide): RenderedSlide {
  const media: MediaRef[] = [];
  const title = placeholder('ctrTitle', null, para(run(slide.title, { sz: TYPE.coverTitle, bold: true })));
  const infoParas =
    para(run(slide.engagement, { sz: TYPE.coverInfo, bold: true }), { spaceAfter: 34 }) +
    (slide.seLine === null ? '' : para(run(slide.seLine, { sz: TYPE.coverSe, bold: true })));
  const info = box({ x: 438520, y: 3760000, w: 7200000, h: 1400000 }, infoParas);
  let partner = '';
  if (slide.partnerLogo !== null) {
    const ph = 520000;
    partner += picFromDataUrl(slide.partnerLogo, { x: MARGIN, y: 440000, w: ph * (slide.partnerLogoAspect ?? 3), h: ph }, media, 'partner logo');
  }
  if (slide.partnerLine !== null) {
    partner += box({ x: 438520, y: CY - 820000, w: 8000000, h: 320000 }, para(run(slide.partnerLine, { sz: 11, bold: true })), { anchor: 'b' });
  }
  const note = box({ x: 438520, y: CY - 470000, w: 8000000, h: 360000 }, para(run(slide.note, { sz: TYPE.coverNote, color: DECK.subtle })), { anchor: 'b' });
  const logoH = 560000;
  const logoW = logoH * (slide.customerLogoAspect ?? 2.6);
  const logo = picFromDataUrl(slide.customerLogo, { x: CX - MARGIN - logoW, y: CY - MARGIN - logoH, w: logoW, h: logoH }, media, 'customer logo');
  return { layout: LAYOUT.cover, xml: slideXml(title + info + partner + note + logo), media, title: slide.title };
}

function agendaSlide(slide: AgendaSlide, confidential: string): RenderedSlide {
  let shapes = placeholder('title', null, para(run(slide.title, { sz: TYPE.title, bold: true })));
  const half = Math.ceil(slide.items.length / 2);
  const gap = 320000;
  const colW = (CONTENT_W - gap) / 2;
  const colH = CY - CONTENT_TOP - 520000;
  const column = (items: string[], start: number, x: number) =>
    box(
      { x, y: CONTENT_TOP, w: colW, h: colH },
      items
        .map((line, index) => para(run(`${start + index + 1}.  `, { sz: TYPE.agenda, bold: true, color: DECK.lime }) + run(line, { sz: TYPE.agenda }), { spaceAfter: 8 }))
        .join(''),
    );
  shapes += column(slide.items.slice(0, half), 0, MARGIN);
  if (slide.items.length > half) shapes += column(slide.items.slice(half), half, MARGIN + colW + gap);
  shapes += chrome('content', confidential);
  return { layout: LAYOUT.content, xml: slideXml(shapes), media: [], title: slide.title };
}

function dividerSlide(slide: DividerSlide, confidential: string, dtLogo: string): RenderedSlide {
  const media: MediaRef[] = [];
  const ruleY = CY * 0.52;
  const ruleW = CX * 0.44;
  const rule = gradientRule({ x: (CX - ruleW) / 2, y: ruleY, w: ruleW, h: 26000 });
  const title = box({ x: MARGIN, y: ruleY - 900000, w: CONTENT_W, h: 820000 }, para(run(slide.title, { sz: TYPE.dividerTitle, bold: true }), { align: 'ctr' }), { anchor: 'b' });
  const kicker = box({ x: MARGIN, y: ruleY + 120000, w: CONTENT_W, h: 520000 }, para(run(slide.kicker, { sz: TYPE.dividerKicker, color: DECK.lime }), { align: 'ctr' }));
  const dtW = 300000 * (800 / 142);
  const logo = picFromDataUrl(dtLogo, { x: CX - MARGIN - dtW, y: 470000, w: dtW, h: 300000 }, media, 'Dynatrace');
  return { layout: LAYOUT.divider, xml: slideXml(rule + title + kicker + logo + chrome('divider', confidential)), media, title: slide.title };
}

/**
 * KPI cards in the given rectangles (the section's row, or the executive page's numbers); `size`
 * sets a value's type (a capture slide's tiles fit theirs to the tile, `captureKpiValueSize`).
 */
function kpiCards(kpis: readonly DeckKpi[], rects: readonly Rect[], size: (value: string, count: number) => number = kpiValueSize): string {
  return kpis
    .slice(0, rects.length)
    .map((kpi, index) => {
      const rect = rects[index] as Rect;
      const paras =
        para(run(kpi.value, { sz: kpiFitSize(kpi.value, size(kpi.value, kpis.length), rect.w), bold: true, color: statusColor(kpi.status) }), { spaceAfter: 3 }) +
        para(run(kpi.label, { sz: TYPE.kpiLabel, color: DECK.subtle }));
      return box(rect, paras, { fill: DECK.slate, round: true, anchor: 'ctr' });
    })
    .join('');
}

function heading(rect: Rect, text: string): string {
  return box({ x: rect.x, y: rect.y, w: rect.w, h: 320000 }, para(run(text, { sz: TYPE.blockHead, bold: true, color: DECK.lime })));
}

/** A horizontal bar chart drawn with shapes: label, bar, value. */
function barChart(visual: Extract<DeckVisual, { kind: 'bars' }>, rect: Rect): string {
  const rows = visual.items;
  if (rows.length === 0) return '';
  const max = Math.max(1, ...rows.map((item) => item.value));
  const top = rect.y + 360000;
  const rowH = Math.min(320000, (rect.h - 360000) / rows.length);
  const labelW = rect.w * 0.4;
  const trackX = rect.x + labelW + 40000;
  const trackW = rect.w - labelW - 40000;
  // 3.3.1 (§17-a): the gutter is measured from the widest value in the deck's own face instead of
  // a fixed 600,000 EMU, which cut "1.557.000" to "1.557.00". One gutter for every row, so the
  // bars stay proportional to one another.
  const valueW = barValueGutterEmu(rows);
  const barMax = Math.max(1, trackW - valueW - BAR_VALUE_GAP);
  const body = rows
    .map((item, index) => {
      const y = top + index * rowH;
      const label = box({ x: rect.x, y, w: labelW, h: rowH }, para(run(item.label, { sz: TYPE.small })), { anchor: 'ctr' });
      const barW = (item.value / max) * barMax;
      const bar = panelRect({ x: trackX, y: y + rowH * 0.26, w: barW, h: rowH * 0.46 }, DECK.green, 30000);
      const value = box({ x: trackX + barW + BAR_VALUE_GAP, y, w: valueW, h: rowH }, para(run(item.display, { sz: TYPE.small, bold: true, color: DECK.lime })), { anchor: 'ctr' });
      return label + bar + value;
    })
    .join('');
  return heading(rect, visual.title) + body;
}

/** A compact table: up to 6 rows × 4 columns (the spec has already cut it). */
function tableBlock(visual: Extract<DeckVisual, { kind: 'table' }>, rect: Rect): string {
  const cols = visual.headers.length;
  // Two-column tables are message/count: the message needs the width, the count does not.
  // Two columns are message/count; three are label/figure/note: the first column needs the width.
  const weights = cols === 2 ? [0.76, 0.24] : cols === 3 ? [0.5, 0.2, 0.3] : Array.from({ length: cols }, () => 1 / cols);
  const colX = (c: number) => rect.x + weights.slice(0, c).reduce((sum, weight) => sum + weight, 0) * rect.w;
  const colW = (c: number) => (weights[c] as number) * rect.w;
  const top = rect.y + 360000;
  const rowH = Math.min(300000, (rect.h - 360000) / (visual.rows.length + 1));
  const align = (c: number): 'l' | 'ctr' => (cols === 2 && c === 1 ? 'ctr' : 'l');
  const head = visual.headers
    .map((cell, c) => box({ x: colX(c), y: top, w: colW(c), h: rowH }, para(run(cell, { sz: TYPE.small, bold: true }), { align: align(c) }), { fill: DECK.panel, anchor: 'ctr' }))
    .join('');
  const body = visual.rows
    .map((row, r) =>
      row
        .map((cell, c) =>
          box({ x: colX(c), y: top + (r + 1) * rowH, w: colW(c), h: rowH }, para(run(cell, { sz: TYPE.small }), { align: align(c) }), {
            fill: r % 2 === 0 ? DECK.slate : undefined,
            anchor: 'ctr',
          }),
        )
        .join(''),
    )
    .join('');
  return heading(rect, visual.title) + head + body;
}

/** A titled bullet list. */
function bulletList(title: string, lines: readonly string[], rect: Rect): string {
  if (lines.length === 0) return '';
  const items = lines.map((line) => para(run(line, { sz: TYPE.body }), { bullet: true, spaceAfter: 4 })).join('');
  return heading(rect, title) + box({ x: rect.x, y: rect.y + 360000, w: rect.w, h: rect.h - 360000 }, items);
}

/** The Dynatrace Assist band along the bottom of a slide. */
function assistBand(label: string, lines: readonly string[], rect: Rect): string {
  const items = lines.map((line) => para(run(line, { sz: TYPE.small }), { bullet: true, spaceAfter: 3 })).join('');
  return (
    panelRect(rect, DECK.slate) +
    box({ x: rect.x + 140000, y: rect.y + 70000, w: rect.w - 280000, h: 300000 }, para(run(label, { sz: TYPE.blockHead, bold: true, color: DECK.lime }))) +
    box({ x: rect.x + 140000, y: rect.y + 380000, w: rect.w - 280000, h: rect.h - 440000 }, items)
  );
}

/** A capture of the app on a frame of its own background, with numbered pins over it. */
function captureBlock(slide: CaptureSlide, frame: Rect, media: MediaRef[]): string {
  const capture = slide.capture;
  const imageRect = captureImageRect(frame, capture.width, capture.height);
  const framed = {
    x: imageRect.x - CAPTURE_INSET,
    y: imageRect.y - CAPTURE_INSET,
    w: imageRect.w + 2 * CAPTURE_INSET,
    h: imageRect.h + 2 * CAPTURE_INSET,
  };
  let shapes = panelRect(framed, capture.frame ?? DECK.white, 4000);
  shapes += picFromDataUrl(capture.dataUrl, imageRect, media, `capture ${slide.id}`);
  for (const pin of capture.pins) {
    const cx = imageRect.x + pin.x * imageRect.w;
    const cy = imageRect.y + pin.y * imageRect.h;
    const size = capturePinSize(imageRect.w, capture.width);
    const rect = { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
    shapes += preset('ellipse', rect, { fill: DECK.blue, line: { color: DECK.white, width: 1.5 } });
    shapes += box(rect, para(run(String(pin.n), { sz: size < 180000 ? TYPE.pin - 1 : TYPE.pin, bold: true }), { align: 'ctr' }), { anchor: 'ctr', inset: 0 });
  }
  return shapes;
}

/** Beside the picture: what each pin shows. */
function pinsLegend(slide: CaptureSlide, rect: Rect): string {
  const pins = slide.capture.pins;
  if (pins.length === 0) return '';
  // 3.5.6 ("How to read"): the number, the label with the figure, the technical reading and the capability chip.
  const paras = pins
    .map((pin) =>
      para(
        run(`${pin.n}  `, { sz: TYPE.small, bold: true, color: DECK.lightBlue }) +
          run(pin.label, { sz: TYPE.small, bold: pin.detail !== undefined }) +
          (pin.detail === undefined ? '' : run(` ${pin.detail}`, { sz: TYPE.small, color: DECK.subtle })) +
          (pin.capability === undefined ? '' : run(` · ${pin.capability}`, { sz: TYPE.small, color: DECK.lime })),
        { spaceAfter: 5 },
      ),
    )
    .join('');
  return heading(rect, slide.pinsLabel) + box({ x: rect.x, y: rect.y + STORY_HEAD, w: rect.w, h: rect.h - STORY_HEAD }, paras);
}

/** A titled bullet list set at `size` (a story slide's findings). */
function storyList(title: string, lines: readonly string[], rect: Rect, size: number): string {
  if (lines.length === 0) return '';
  const items = lines.map((line) => para(run(line, { sz: size }), { bullet: true, spaceAfter: 4 })).join('');
  return heading(rect, title) + box({ x: rect.x, y: rect.y + STORY_HEAD, w: rect.w, h: rect.h - STORY_HEAD }, items);
}

/** A band of a story slide (why it matters, the Assist); `accent` draws the brand's edge on its left. */
function storyBand(label: string, lines: readonly string[], rect: Rect, fill: string, accent: boolean): string {
  const items = lines.map((line) => para(run(line, { sz: TYPE.small }), { bullet: true, spaceAfter: 3 })).join('');
  return (
    panelRect(rect, fill, 6000) +
    (accent ? preset('rect', { x: rect.x, y: rect.y, w: 50000, h: rect.h }, { fill: DECK.green }) : '') +
    box({ x: rect.x + BAND_PAD_X, y: rect.y + 70000, w: rect.w - 2 * BAND_PAD_X, h: 300000 }, para(run(label, { sz: TYPE.blockHead, bold: true, color: DECK.lime }))) +
    box({ x: rect.x + BAND_PAD_X, y: rect.y + BAND_TEXT_TOP, w: rect.w - 2 * BAND_PAD_X, h: rect.h - BAND_TEXT_TOP }, items)
  );
}

/** The story slide of a captured subject (3.3.5): every block where the spec's layout put it. */
function captureSlide(slide: CaptureSlide, confidential: string): RenderedSlide {
  const media: MediaRef[] = [];
  const { layout } = slide;
  let shapes = placeholder('title', null, para(run(slide.title, { sz: TYPE.title, bold: true })));
  if (layout.subtitle !== null && slide.subtitle !== null) shapes += box(layout.subtitle, para(run(slide.subtitle, { sz: TYPE.subtitle, color: DECK.subtle })));
  shapes += captureBlock(slide, layout.frame, media);
  if (layout.beside !== null && slide.under?.kind === 'findings') shapes += storyList(slide.findingsLabel, slide.under.lines, layout.beside, TYPE.small);
  else if (layout.under !== null && slide.under !== null) {
    if (slide.under.kind === 'findings') shapes += storyList(slide.findingsLabel, slide.under.lines, layout.under, TYPE.body);
    else if (slide.under.visual.kind === 'bars') shapes += barChart(slide.under.visual, layout.under);
    else shapes += tableBlock(slide.under.visual, layout.under);
  }
  shapes += kpiCards(slide.kpis, layout.kpis, captureKpiValueSize);
  if (layout.pins !== null) shapes += pinsLegend(slide, layout.pins);
  if (layout.findings !== null) shapes += storyList(slide.findingsLabel, slide.findings, layout.findings, TYPE.small);
  storyCards(slide).forEach((card, index) => {
    const rect = layout.cards[index];
    if (rect !== undefined) shapes += storyBand(card.label, card.lines, rect, card.kind === 'value' ? DECK.panel : DECK.slate, card.kind === 'value');
  });
  shapes += chrome('content', confidential);
  return { layout: LAYOUT.content, xml: slideXml(shapes), media, title: slide.title };
}

function sectionSlide(slide: SectionSlide, confidential: string): RenderedSlide {
  const layout = sectionLayout({
    subtitle: slide.subtitle !== null,
    kpis: slide.kpis.length,
    assist: slide.assist.length > 0,
    primary: slide.visual === null ? 'none' : slide.visual.kind === 'table' ? 'table' : 'chart',
    findings: slide.findings.length > 0,
  });
  let shapes = placeholder('title', null, para(run(slide.title, { sz: TYPE.title, bold: true })));
  if (layout.subtitle !== null && slide.subtitle !== null) shapes += box(layout.subtitle, para(run(slide.subtitle, { sz: TYPE.subtitle, color: DECK.subtle })));
  shapes += kpiCards(slide.kpis, layout.kpis);
  if (layout.primary !== null) {
    if (slide.visual?.kind === 'bars') shapes += barChart(slide.visual, layout.primary);
    else if (slide.visual?.kind === 'table') shapes += tableBlock(slide.visual, layout.primary);
  }
  if (layout.side !== null) shapes += bulletList(slide.findingsLabel, slide.findings, layout.side);
  if (layout.assist !== null) shapes += assistBand(slide.assistLabel, slide.assist, layout.assist);
  shapes += chrome('content', confidential);
  return { layout: LAYOUT.content, xml: slideXml(shapes), media: [], title: slide.title };
}

/** The colour of each executive ring, in order: coverage, problems closed, healthy services. */
const RING_COLOURS = [DECK.green, DECK.lightBlue, DECK.pink] as const;

/** A ring: a track, the arc of the share (a native `blockArc`, editable in PowerPoint), the reading and the label. */
function ringShape(ring: ExecutiveSlide['rings'][number], rect: Rect, colour: string): string {
  const size = Math.min(rect.w, rect.h - 420000);
  const disk = { x: rect.x + (rect.w - size) / 2, y: rect.y, w: size, h: size };
  const thickness = 11000; // a share of the ring's size, in 1/100,000
  let shapes = '';
  if (ring.value === null) {
    shapes += preset('ellipse', { x: disk.x + size * 0.055, y: disk.y + size * 0.055, w: size * 0.89, h: size * 0.89 }, { line: { color: DECK.border, width: 2, dash: true } });
  } else {
    shapes += preset('donut', disk, { fill: DECK.slate, adjust: { adj: thickness } });
    const share = Math.max(0, Math.min(100, ring.value));
    if (share >= 99.95) {
      shapes += preset('donut', disk, { fill: colour, adjust: { adj: thickness } });
    } else if (share > 0) {
      // DrawingML angles run clockwise from 3 o'clock in 1/60,000 degree; the arc starts at 12.
      const start = 270 * 60000;
      const end = Math.round(((270 + share * 3.6) % 360) * 60000);
      shapes += preset('blockArc', disk, { fill: colour, adjust: { adj1: start, adj2: end, adj3: thickness } });
    }
  }
  shapes += box(disk, para(run(ring.display, { sz: TYPE.execRing, bold: true }), { align: 'ctr' }), { anchor: 'ctr', inset: 0 });
  shapes += box({ x: rect.x, y: disk.y + size + 60000, w: rect.w, h: 360000 }, para(run(ring.label, { sz: TYPE.execRingLabel, color: DECK.subtle }), { align: 'ctr' }));
  return shapes;
}

function executiveSlide(slide: ExecutiveSlide, confidential: string): RenderedSlide {
  const withAnswers = slide.rings.some((ring) => ring.answer !== undefined);
  const layout = executiveLayout(slide.numbers.length, withAnswers);
  let shapes = placeholder('title', null, para(run(slide.title, { sz: TYPE.title, bold: true })));
  shapes += box(layout.subtitle, para(run(slide.subtitle, { sz: TYPE.subtitle, color: DECK.subtle })));
  if (slide.verdict !== null) {
    const colour = statusColor(slide.verdict.tone);
    shapes += panelRect(layout.verdict, DECK.panel, 20000);
    shapes += preset('rect', { x: layout.verdict.x, y: layout.verdict.y, w: 60000, h: layout.verdict.h }, { fill: colour });
    shapes += box({ ...layout.verdict, x: layout.verdict.x + 120000, w: layout.verdict.w - 120000 }, para(run(slide.verdict.text, { sz: TYPE.body, bold: true, color: colour })), { anchor: 'ctr' });
  }
  slide.rings.forEach((ring, index) => {
    const rect = layout.rings[index];
    if (rect !== undefined) shapes += ringShape(ring, rect, RING_COLOURS[index % RING_COLOURS.length] as string);
    // 3.3.17: the question over the ring and its measured answer under it.
    const question = layout.questions[index];
    if (question !== undefined && ring.question !== undefined)
      shapes += box(question, para(run(ring.question, { sz: TYPE.blockHead, bold: true, color: DECK.lime }), { align: 'ctr' }), { anchor: 'b' });
    const answer = layout.answers[index];
    if (answer !== undefined && ring.answer !== undefined) {
      shapes += panelRect(answer, DECK.panel, 6000);
      shapes += box({ x: answer.x + 80000, y: answer.y + 70000, w: answer.w - 160000, h: answer.h - 140000 }, para(run(ring.answer, { sz: TYPE.small })));
    }
  });
  if (!withAnswers) shapes += kpiCards(slide.numbers, layout.numbers);
  const steps = slide.steps
    .map(
      (step, index) =>
        para(run(`${index + 1}  `, { sz: TYPE.blockHead, bold: true, color: DECK.lime }) + run(step.title, { sz: TYPE.blockHead, bold: true }), { spaceAfter: 2 }) +
        para(run(step.body, { sz: TYPE.small, color: DECK.subtle }), { spaceAfter: 9 }),
    )
    .join('');
  shapes += panelRect(layout.steps, DECK.slate, 4000);
  shapes += box({ x: layout.steps.x + 120000, y: layout.steps.y + 90000, w: layout.steps.w - 240000, h: 340000 }, para(run(slide.stepsTitle, { sz: TYPE.blockHead, bold: true, color: DECK.lime })));
  shapes += box({ x: layout.steps.x + 120000, y: layout.steps.y + 460000, w: layout.steps.w - 240000, h: layout.steps.h - 520000 }, steps);
  shapes += box(layout.note, para(run(slide.note, { sz: TYPE.pin, color: DECK.subtle })), { anchor: 'b' });
  shapes += chrome('content', confidential);
  return { layout: LAYOUT.content, xml: slideXml(shapes), media: [], title: slide.title };
}

/** The branded end slide keeps the Dynatrace mark; only the partner logo is added. */
function endSlide(slide: EndSlide): RenderedSlide {
  const media: MediaRef[] = [];
  const partner =
    slide.partnerLogo === null
      ? ''
      : picFromDataUrl(slide.partnerLogo, { x: MARGIN, y: 440000, w: 520000 * (slide.partnerLogoAspect ?? 3), h: 520000 }, media, 'partner logo');
  return { layout: LAYOUT.end, xml: slideXml(partner), media, title: '' };
}

/**
 * The writer's primitives, handed to the real-prints deck's renderer (3.2.7,
 * `prints/deck/pptxPrintSlides.ts`), which imports only types from here: its slides use the same
 * runs, boxes, chrome and picture parts as the Tech Wrapup, and there is no runtime import cycle.
 */
export interface PptxKit {
  run: typeof run;
  para: typeof para;
  box: typeof box;
  preset: typeof preset;
  panelRect: typeof panelRect;
  placeholder: typeof placeholder;
  chrome: typeof chrome;
  kpiCards: typeof kpiCards;
  heading: typeof heading;
  bulletList: typeof bulletList;
  tableBlock: typeof tableBlock;
  barChart: typeof barChart;
  slideXml: typeof slideXml;
  esc: typeof esc;
  nextId: () => number;
  /** `picFromDataUrl`, with an optional crop. */
  picture(dataUrl: string | null, rect: Rect, media: MediaRef[], name: string, crop?: SrcRect): string;
  /** Same `r:embed` as an already registered picture, no new media. */
  pictureAgain(media: MediaRef, rect: Rect, name: string, crop?: SrcRect): string;
  layout: { content: 28 };
}

const KIT: PptxKit = {
  run,
  para,
  box,
  preset,
  panelRect,
  placeholder,
  chrome,
  kpiCards,
  heading,
  bulletList,
  tableBlock,
  barChart,
  slideXml,
  esc,
  nextId,
  picture: (dataUrl, rect, media, name, crop) => picFromDataUrl(dataUrl, rect, media, name, crop),
  pictureAgain,
  layout: { content: LAYOUT.content },
};

function renderSlide(slide: DeckSlide, spec: DeckSpec, dtLogo: string): RenderedSlide {
  switch (slide.kind) {
    case 'print':
    case 'analysis':
    case 'story':
    case 'methodology':
      // The real-prints chunk registered its writer (`prints/deck/renderers.ts`): this chunk does not carry it.
      return printSlideRenderers().pptx(slide, spec.confidential, KIT);
    case 'cover':
      return coverSlide(slide);
    case 'agenda':
      return agendaSlide(slide, spec.confidential);
    case 'executive':
      return executiveSlide(slide, spec.confidential);
    case 'divider':
      return dividerSlide(slide, spec.confidential, dtLogo);
    case 'section':
      return sectionSlide(slide, spec.confidential);
    case 'capture':
      return captureSlide(slide, spec.confidential);
    case 'end':
      return endSlide(slide);
  }
}

/** Every slide of the spec as template XML, in order. */
export function renderSlides(spec: DeckSpec, dtLogo: string): RenderedSlide[] {
  shapeSeq = 100;
  fieldSeq = 0;
  return spec.slides.map((slide) => renderSlide(slide, spec, dtLogo));
}

// ------------------------------------------------------------- OOXML packaging

const SLIDE_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml';
const SLIDE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';

function maxRelId(relsXml: string): number {
  let max = 0;
  for (const match of relsXml.matchAll(/Id="rId(\d+)"/g)) max = Math.max(max, Number(match[1]));
  return max;
}

function maxSldId(presentationXml: string): number {
  let max = 255; // OOXML requires slide ids >= 256
  for (const match of presentationXml.matchAll(/<p:sldId id="(\d+)"/g)) max = Math.max(max, Number(match[1]));
  return max;
}

/** Sets (or inserts) a core-property tag in `docProps/core.xml`. */
export function setCoreProp(xml: string, tag: string, value: string): string {
  const replacement = `<${tag}>${value}</${tag}>`;
  const paired = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?</${tag}>`);
  const selfClosing = new RegExp(`<${tag}(\\s[^>]*)?/>`);
  if (paired.test(xml)) return xml.replace(paired, replacement);
  if (selfClosing.test(xml)) return xml.replace(selfClosing, replacement);
  return xml.replace('</cp:coreProperties>', `${replacement}</cp:coreProperties>`);
}

/** Stamps the logged-in Sales Engineer as the document author/owner (PowerPoint "Authors"). */
export async function stampAuthor(zip: JSZip, seName: string | null): Promise<void> {
  const name = seName?.trim();
  if (name === undefined || name === '') return;
  const coreFile = zip.file('docProps/core.xml');
  if (coreFile === null) return;
  const author = esc(name);
  let core = await coreFile.async('string');
  core = setCoreProp(core, 'dc:creator', author);
  core = setCoreProp(core, 'cp:lastModifiedBy', author);
  zip.file('docProps/core.xml', core);
}

/**
 * What the package is stamped with. 3.2.7, both off by default (the Tech Wrapup's package is
 * unchanged): `dedupeMedia` writes an image used on several slides once (a print, its lupa and its
 * story thumbnail are one part); `storeImages` stores media uncompressed — JPEGs do not deflate,
 * and storing them saves the time without growing the file.
 */
export interface DeckMeta {
  dtLogo: string;
  seName: string | null;
  dedupeMedia?: boolean;
  storeImages?: boolean;
}

/**
 * Injects the rendered slides into the template package and returns the patched JSZip. The
 * template's single blank `slide1` is repurposed as the first slide; the rest are appended.
 * `presentation.xml`, its rels and `[Content_Types].xml` are patched, and each slide's images are
 * written to `ppt/media/` with matching relationships.
 */
export async function patchTemplate(spec: DeckSpec, templateBytes: ArrayBuffer | Uint8Array, meta: DeckMeta): Promise<JSZip> {
  const zip = await JSZip.loadAsync(templateBytes);
  const slides = renderSlides(spec, meta.dtLogo);

  await stampAuthor(zip, meta.seName);
  const coreFile = zip.file('docProps/core.xml');
  if (coreFile !== null) zip.file('docProps/core.xml', setCoreProp(await coreFile.async('string'), 'dc:title', esc(spec.title)));

  const presFile = zip.file('ppt/presentation.xml');
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
  const ctFile = zip.file('[Content_Types].xml');
  if (presFile === null || relsFile === null || ctFile === null) {
    throw new Error('Template is missing required OOXML parts.');
  }
  let presentation = await presFile.async('string');
  let rels = await relsFile.async('string');
  let contentTypes = await ctFile.async('string');

  let relId = maxRelId(rels);
  let sldId = maxSldId(presentation);
  let imgSeq = 0;
  const sldIdEntries: string[] = [];
  const relEntries: string[] = [];
  const ctEntries: string[] = [];
  const mediaExts = new Set<string>();
  /** Base64 of every media part written so far → its file name (`dedupeMedia`). */
  const written = new Map<string, string>();

  slides.forEach((slide, index) => {
    const n = index + 1; // reuse slide1 for the first slide
    const slidePath = `ppt/slides/slide${n}.xml`;
    zip.file(slidePath, slide.xml);
    for (const item of slide.media) {
      const known = meta.dedupeMedia === true ? written.get(item.base64) : undefined;
      if (known !== undefined) {
        item.filename = known;
        continue;
      }
      imgSeq += 1;
      item.filename = `genimg${imgSeq}.${item.ext}`;
      mediaExts.add(item.ext);
      if (meta.dedupeMedia === true) written.set(item.base64, item.filename);
      if (meta.storeImages === true) zip.file(`ppt/media/${item.filename}`, item.base64, { base64: true, compression: 'STORE' });
      else zip.file(`ppt/media/${item.filename}`, item.base64, { base64: true });
    }
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, slideRels(slide.layout, slide.media));

    if (!contentTypes.includes(`PartName="/${slidePath}"`)) {
      ctEntries.push(`<Override PartName="/${slidePath}" ContentType="${SLIDE_CONTENT_TYPE}"/>`);
    }

    if (index === 0) return; // slide1 already registered in the template
    relId += 1;
    sldId += 1;
    relEntries.push(`<Relationship Id="rId${relId}" Type="${SLIDE_REL_TYPE}" Target="slides/slide${n}.xml"/>`);
    sldIdEntries.push(`<p:sldId id="${sldId}" r:id="rId${relId}"/>`);
  });

  // Declare a content-type for every embedded image extension the package does
  // not already cover (e.g. webp) — a missing one makes PowerPoint "repair".
  const ctDefaults = [...mediaExts]
    .filter((ext) => !contentTypes.includes(`Extension="${ext}"`))
    .map((ext) => `<Default Extension="${ext}" ContentType="${ext === 'svg' ? 'image/svg+xml' : `image/${ext}`}"/>`)
    .join('');
  if (ctDefaults !== '') contentTypes = contentTypes.replace(/(<Types\b[^>]*>)/, `$1${ctDefaults}`);
  if (ctEntries.length > 0) contentTypes = contentTypes.replace('</Types>', `${ctEntries.join('')}</Types>`);
  if (relEntries.length > 0) rels = rels.replace('</Relationships>', `${relEntries.join('')}</Relationships>`);
  if (sldIdEntries.length > 0) presentation = presentation.replace('</p:sldIdLst>', `${sldIdEntries.join('')}</p:sldIdLst>`);

  zip.file('ppt/presentation.xml', presentation);
  zip.file('ppt/_rels/presentation.xml.rels', rels);
  zip.file('[Content_Types].xml', contentTypes);
  return zip;
}

/** The deck as a `.pptx` Blob. */
export async function buildTemplateDeck(spec: DeckSpec, templateBytes: ArrayBuffer | Uint8Array, meta: DeckMeta): Promise<Blob> {
  const zip = await patchTemplate(spec, templateBytes, meta);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    compression: 'DEFLATE',
  });
}

/**
 * The deck's template as bytes: the corporate one bundled with the brand pack, or — in a copy of
 * the app without it (3.3.5, `BRAND_PACK_INSTALLED`) — the neutral one the app writes itself, so
 * the deck is always delivered.
 */
export async function loadBrandTemplate(): Promise<ArrayBuffer | Uint8Array> {
  if (!BRAND_PACK_INSTALLED) return buildNeutralTemplate();
  const response = await fetch(TEMPLATE_ASSET);
  if (!response.ok) throw new Error(`Could not load the brand template (${response.status}).`);
  return response.arrayBuffer();
}
