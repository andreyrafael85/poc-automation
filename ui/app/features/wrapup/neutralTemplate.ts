/* eslint-disable noSecrets/no-secrets -- OOXML scaffolding (schema URLs, content types, markup) is high-entropy text, not a secret. */
import JSZip from 'jszip';

import { DECK } from './deck';
import { SLIDE_H, SLIDE_W, TEMPLATE_CHROME, type Rect } from './geometry';

/**
 * The neutral deck template (3.3.5), written by the app itself: a minimal PowerPoint package with the
 * four layouts the SE deck uses — 1 "cover", 28 "standard", 33 "blank" (dividers), 56 "end" — and the
 * same placeholders, at the same places, as the corporate template's (`TEMPLATE_CHROME`). The deck
 * writer (`pptxTemplate.ts`) patches it exactly as it patches the corporate one, so a build of the app
 * without the brand pack (`npm run brand:install`, `BRAND_PACK_INSTALLED`) still delivers the whole
 * Tech Wrapup and the Real proof deck.
 *
 * Nothing in it comes from a brand file: the colours are the deck's own palette (`DECK`) — a dark
 * navy with a purple-to-teal accent, close to the brand on purpose (owner's choice) — and the type
 * is a system face every PowerPoint has.
 */

/** The face the neutral theme names for titles and body: on every Windows and Office install. */
export const NEUTRAL_FONT = 'Segoe UI';
/** Marks a package as the neutral template (read back by `templateArt.ts`). */
/** An internal marker (not shown), kept as it was when the app became "PoC Automation 3.0" (3.4.14). */
export const NEUTRAL_MARK = 'PoC Value Studio neutral';

const NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT = 'application/vnd.openxmlformats-officedocument.presentationml';

const LAYOUTS = [
  { n: 1, name: 'Cover slide' },
  { n: 28, name: 'Dark: standard slide' },
  { n: 33, name: 'Dark: blank slide' },
  { n: 56, name: 'End slide' },
] as const;

const xfrm = (rect: Rect) =>
  `<a:xfrm><a:off x="${Math.round(rect.x)}" y="${Math.round(rect.y)}"/><a:ext cx="${Math.round(rect.w)}" cy="${Math.round(rect.h)}"/></a:xfrm>`;

const group = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

/** A placeholder of a layout or the master, at `rect`, with its text style. */
function ph(id: number, name: string, ph: string, rect: Rect, size: number, opts: { bold?: boolean; anchor?: 't' | 'b' | 'ctr'; color?: string; align?: 'l' | 'r'; body?: string } = {}): string {
  const color = opts.color ?? DECK.white;
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr>${ph}</p:nvPr></p:nvSpPr>` +
    `<p:spPr>${xfrm(rect)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
    `<p:txBody><a:bodyPr anchor="${opts.anchor ?? 't'}"><a:normAutofit/></a:bodyPr><a:lstStyle><a:lvl1pPr algn="${opts.align ?? 'l'}"><a:defRPr sz="${Math.round(size * 100)}"${opts.bold === true ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${NEUTRAL_FONT}"/></a:defRPr></a:lvl1pPr></a:lstStyle>${opts.body ?? '<a:p><a:endParaRPr lang="en-US"/></a:p>'}</p:txBody></p:sp>`
  );
}

/** A plain rectangle, filled solid or with the accent gradient (angle in degrees). */
function rect(id: number, name: string, at: Rect, fill: string | { from: string; mid?: string; to: string; angle: number }, round = false): string {
  const paint =
    typeof fill === 'string'
      ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>`
      : `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="${fill.from}"/></a:gs>${fill.mid === undefined ? '' : `<a:gs pos="50000"><a:srgbClr val="${fill.mid}"/></a:gs>`}<a:gs pos="100000"><a:srgbClr val="${fill.to}"/></a:gs></a:gsLst><a:lin ang="${fill.angle * 60000}" scaled="0"/></a:gradFill>`;
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr userDrawn="1"/></p:nvSpPr>` +
    `<p:spPr>${xfrm(at)}<a:prstGeom prst="${round ? 'roundRect' : 'rect'}"><a:avLst/></a:prstGeom>${paint}<a:ln><a:noFill/></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`
  );
}

/** The cover's and the end slide's background: the deck's navy lit by its purple-to-blue accent. */
const ACCENT_BG = `<p:bg><p:bgPr><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="${DECK.purple}"/></a:gs><a:gs pos="55000"><a:srgbClr val="${DECK.blue}"/></a:gs><a:gs pos="100000"><a:srgbClr val="${DECK.ink}"/></a:gs></a:gsLst><a:lin ang="2700000" scaled="0"/></a:gradFill><a:effectLst/></p:bgPr></p:bg>`;
const DARK_BG = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${TEMPLATE_CHROME.background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;

const footer = (id: number, idx: number) =>
  ph(id, 'Footer', `<p:ph type="ftr" sz="quarter" idx="${idx}"/>`, TEMPLATE_CHROME.footer, 7, { anchor: 'ctr', color: DECK.subtle, body: FOOTER_TEXT });
/** The slide-number field a number placeholder carries (LibreOffice only numbers a placeholder that has one). */
const NUMBER_FIELD = '<a:p><a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum"><a:rPr lang="en-US"/><a:t>‹#›</a:t></a:fld><a:endParaRPr lang="en-US"/></a:p>';
const FOOTER_TEXT = '<a:p><a:r><a:rPr lang="en-US"/><a:t>Confidential</a:t></a:r></a:p>';
const number = (id: number, idx: number) =>
  ph(id, 'Slide Number', `<p:ph type="sldNum" sz="quarter" idx="${idx}"/>`, TEMPLATE_CHROME.number, 10, { anchor: 'ctr', align: 'r', body: NUMBER_FIELD });

function layoutXml(n: number, name: string): string {
  let bg = DARK_BG;
  let shapes = '';
  if (n === 1) {
    bg = ACCENT_BG;
    shapes = ph(2, 'Title', '<p:ph type="ctrTitle"/>', TEMPLATE_CHROME.coverTitle, 40, { bold: true, anchor: 'b' });
    shapes += rect(3, 'Accent', { x: TEMPLATE_CHROME.coverTitle.x, y: TEMPLATE_CHROME.coverTitle.y + TEMPLATE_CHROME.coverTitle.h + 80000, w: 1800000, h: 45720 }, DECK.green);
  } else if (n === 28) {
    shapes = ph(2, 'Title', '<p:ph type="title"/>', TEMPLATE_CHROME.titleRect, 24, { bold: true, anchor: 'b' });
    shapes += rect(3, 'Underline', TEMPLATE_CHROME.underline, { from: DECK.blue, to: DECK.green, angle: 0 });
    shapes += footer(4, 25) + number(5, 26);
    shapes += rect(6, 'Number bar', TEMPLATE_CHROME.numberBar, DECK.green);
  } else if (n === 33) {
    shapes = footer(2, 21) + number(3, 22);
    shapes += rect(4, 'Number bar', TEMPLATE_CHROME.numberBar, DECK.green);
  } else {
    bg = ACCENT_BG;
    const ruleW = SLIDE_W * 0.3;
    shapes = rect(2, 'Accent', { x: (SLIDE_W - ruleW) / 2, y: SLIDE_H / 2, w: ruleW, h: 45720 }, { from: DECK.purple, mid: DECK.blue, to: DECK.green, angle: 0 });
  }
  return `${XML}<p:sldLayout ${NS} preserve="1"><p:cSld name="${name}">${bg}<p:spTree>${group}${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr><p:hf hdr="0" dt="0"/></p:sldLayout>`;
}

const level = (size: number, bold: boolean) =>
  `<a:lvl1pPr><a:defRPr sz="${size * 100}"${bold ? ' b="1"' : ''}><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr>`;

const MASTER =
  `${XML}<p:sldMaster ${NS}><p:cSld>${DARK_BG}<p:spTree>${group}` +
  ph(2, 'Title', '<p:ph type="title"/>', TEMPLATE_CHROME.titleRect, 24, { bold: true, anchor: 'b' }) +
  footer(3, 3) +
  number(4, 4) +
  `</p:spTree></p:cSld>` +
  '<p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
  `<p:sldLayoutIdLst>${LAYOUTS.map((_, index) => `<p:sldLayoutId id="${2147483649 + index}" r:id="rId${index + 1}"/>`).join('')}</p:sldLayoutIdLst>` +
  // Footer and slide number on, header and date off (the corporate template's own setting).
  '<p:hf hdr="0" dt="0"/>' +
  `<p:txStyles><p:titleStyle>${level(24, true)}</p:titleStyle><p:bodyStyle>${level(12, false)}</p:bodyStyle><p:otherStyle>${level(12, false)}</p:otherStyle></p:txStyles></p:sldMaster>`;

const THEME =
  `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${NEUTRAL_MARK}"><a:themeElements>` +
  `<a:clrScheme name="${NEUTRAL_MARK}">` +
  `<a:dk1><a:srgbClr val="${TEMPLATE_CHROME.background}"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>` +
  `<a:dk2><a:srgbClr val="${DECK.panel}"/></a:dk2><a:lt2><a:srgbClr val="${DECK.subtle}"/></a:lt2>` +
  `<a:accent1><a:srgbClr val="${DECK.blue}"/></a:accent1><a:accent2><a:srgbClr val="${DECK.purple}"/></a:accent2><a:accent3><a:srgbClr val="${DECK.green}"/></a:accent3>` +
  `<a:accent4><a:srgbClr val="${DECK.lightBlue}"/></a:accent4><a:accent5><a:srgbClr val="${DECK.magenta}"/></a:accent5><a:accent6><a:srgbClr val="${DECK.lime}"/></a:accent6>` +
  `<a:hlink><a:srgbClr val="${DECK.lightBlue}"/></a:hlink><a:folHlink><a:srgbClr val="${DECK.blue}"/></a:folHlink></a:clrScheme>` +
  `<a:fontScheme name="${NEUTRAL_MARK}"><a:majorFont><a:latin typeface="${NEUTRAL_FONT}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${NEUTRAL_FONT}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>` +
  '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
  '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
  '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
  '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>' +
  '</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>';

const rels = (entries: readonly (readonly [string, string, string])[]) =>
  `${XML}<Relationships xmlns="${PKG_REL}">${entries.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')}</Relationships>`;

/** The neutral template as package bytes, ready for `patchTemplate`. Deterministic: same bytes every time. */
export async function buildNeutralTemplate(): Promise<Uint8Array> {
  const zip = new JSZip();
  const date = new Date('2026-01-01T00:00:00Z');
  const put = (name: string, text: string) => zip.file(name, text, { date });

  put(
    '[Content_Types].xml',
    `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
      `<Override PartName="/ppt/presentation.xml" ContentType="${CT}.presentation.main+xml"/>` +
      `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CT}.slideMaster+xml"/>` +
      LAYOUTS.map((layout) => `<Override PartName="/ppt/slideLayouts/slideLayout${layout.n}.xml" ContentType="${CT}.slideLayout+xml"/>`).join('') +
      `<Override PartName="/ppt/slides/slide1.xml" ContentType="${CT}.slide+xml"/>` +
      '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
      `<Override PartName="/ppt/presProps.xml" ContentType="${CT}.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="${CT}.viewProps+xml"/>` +
      `<Override PartName="/ppt/tableStyles.xml" ContentType="${CT}.tableStyles+xml"/>` +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>',
  );
  put(
    '_rels/.rels',
    rels([
      ['rId1', `${REL}/officeDocument`, 'ppt/presentation.xml'],
      ['rId2', `${PKG_REL}/metadata/core-properties`, 'docProps/core.xml'],
      ['rId3', `${REL}/extended-properties`, 'docProps/app.xml'],
    ]),
  );
  put(
    'docProps/core.xml',
    `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
      `<dc:title>Tech Wrapup</dc:title><dc:creator>PoC Automation 3.0</dc:creator><cp:lastModifiedBy>PoC Automation 3.0</cp:lastModifiedBy>` +
      '<dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created></cp:coreProperties>',
  );
  put(
    'docProps/app.xml',
    `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>${NEUTRAL_MARK}</Application><PresentationFormat>Widescreen</PresentationFormat></Properties>`,
  );
  put(
    'ppt/presentation.xml',
    `${XML}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
      `<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/><p:notesSz cx="6858000" cy="9144000"/>` +
      // The text a shape gets when nothing else styles it (a field, a footer): the theme face, in the light text colour.
      `<p:defaultTextStyle><a:lvl1pPr marL="0" algn="l"><a:defRPr sz="1800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:defaultTextStyle></p:presentation>`,
  );
  put(
    'ppt/_rels/presentation.xml.rels',
    rels([
      ['rId1', `${REL}/slideMaster`, 'slideMasters/slideMaster1.xml'],
      ['rId2', `${REL}/slide`, 'slides/slide1.xml'],
      ['rId3', `${REL}/theme`, 'theme/theme1.xml'],
      ['rId4', `${REL}/presProps`, 'presProps.xml'],
      ['rId5', `${REL}/viewProps`, 'viewProps.xml'],
      ['rId6', `${REL}/tableStyles`, 'tableStyles.xml'],
    ]),
  );
  put('ppt/presProps.xml', `${XML}<p:presentationPr ${NS}/>`);
  put('ppt/viewProps.xml', `${XML}<p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`);
  // The GUID is PowerPoint's own "No Style, No Grid" table style id.
  put('ppt/tableStyles.xml', `${XML}<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`);
  put('ppt/theme/theme1.xml', THEME);
  put('ppt/slideMasters/slideMaster1.xml', MASTER);
  put(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    rels([...LAYOUTS.map((layout, index) => [`rId${index + 1}`, `${REL}/slideLayout`, `../slideLayouts/slideLayout${layout.n}.xml`] as const), [`rId${LAYOUTS.length + 1}`, `${REL}/theme`, '../theme/theme1.xml']]),
  );
  for (const layout of LAYOUTS) {
    put(`ppt/slideLayouts/slideLayout${layout.n}.xml`, layoutXml(layout.n, layout.name));
    put(`ppt/slideLayouts/_rels/slideLayout${layout.n}.xml.rels`, rels([['rId1', `${REL}/slideMaster`, '../slideMasters/slideMaster1.xml']]));
  }
  put('ppt/slides/slide1.xml', `${XML}<p:sld ${NS}><p:cSld><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
  put('ppt/slides/_rels/slide1.xml.rels', rels([['rId1', `${REL}/slideLayout`, '../slideLayouts/slideLayout28.xml']]));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
