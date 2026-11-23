import { DECK } from '../../deck';
import { TYPE, containRect, kpiValueSize, type Rect } from '../../geometry';
import type { MediaRef, PptxKit, RenderedSlide } from '../../pptxTemplate';
import {
  CELL_INSET,
  KPI_ACCENT_H,
  METHOD_WEIGHTS,
  MONO_FONT,
  PRINT_TYPE,
  SOURCE_ACCENT,
  VERDICT_HEX,
  analysisLayout,
  capacityLayout,
  clampFocus,
  columnsLayout,
  dqlCardLayout,
  dqlPageLayout,
  fitGrid,
  focusAspect,
  focusOnImage,
  gridLayout,
  kitChartRect,
  kpiStatusHex,
  legendParts,
  methodologyLayout,
  pinRect,
  printLayout,
  rulerLayout,
  srcRectFor,
  storyLayout,
} from './printGeometry';
import type { AnalysisSlide, AnalysisVisual, MethodologySlide, PrintDeckSlide, PrintImage, PrintSlide, StorySlide } from './slides';

/**
 * The slides of the real-prints deck (3.2.7) as template XML: a real screen with its pins, the
 * analytic reading, the incident story and the methodology. Called by `pptxTemplate.ts`'s one
 * dispatch line with the writer's own primitives (`PptxKit`); this module imports only types from
 * the writer, so there is no runtime cycle. Positions come from `printGeometry.ts`, which the
 * preview reads too.
 *
 * Every print is one media part per slide: the lupa draws it again with the same `r:embed` and an
 * `<a:srcRect>` (0 bytes); a story thumbnail is registered on the story slide and folded into the
 * print's part by `dedupeMedia`. Text arrives final (translated, redacted, cut) from
 * `buildPrintDeckSpec`; DQL lines get monospace runs of their own.
 */

const SUBTLE = DECK.subtle;

/** A monospace run (DQL text): the theme font would turn the query into prose. */
function mono(kit: PptxKit, text: string, sz: number, color: string = DECK.white): string {
  return (
    `<a:r><a:rPr lang="en-US" sz="${Math.round(sz * 100)}" dirty="0">` +
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:latin typeface="${MONO_FONT}"/><a:cs typeface="${MONO_FONT}"/></a:rPr><a:t>${kit.esc(text)}</a:t></a:r>`
  );
}

/** One paragraph per line of a query. */
function monoLines(kit: PptxKit, lines: readonly string[], sz: number): string {
  return lines.map((line) => kit.para(mono(kit, line === '' ? ' ' : line, sz))).join('');
}

function title(kit: PptxKit, text: string): string {
  return kit.placeholder('title', null, kit.para(kit.run(text, { sz: TYPE.title, bold: true })));
}

/** "Name: what it shows", the name in bold. */
function legendRuns(kit: PptxKit, line: string, sz: number): string {
  const { name, text } = legendParts(line);
  return (name === null ? '' : kit.run(name, { sz, bold: true })) + kit.run(text, { sz });
}

/** A media part registered once per slide: the first use writes it, the next ones reuse its `r:embed`. */
function pictureOnce(kit: PptxKit, image: PrintImage, rect: Rect, media: MediaRef[], known: Map<string, MediaRef>, name: string, crop?: ReturnType<typeof srcRectFor>): string {
  const ref = known.get(image.mediaKey);
  if (ref !== undefined) return kit.pictureAgain(ref, rect, name, crop);
  const before = media.length;
  const xml = kit.picture(image.dataUrl, rect, media, name, crop);
  const added = media[before];
  if (added !== undefined) known.set(image.mediaKey, added);
  return xml;
}

// ------------------------------------------------------------------ print

function printSlide(slide: PrintSlide, confidential: string, kit: PptxKit): RenderedSlide {
  const media: MediaRef[] = [];
  const zoom = slide.zoom;
  const notes = slide.notes;
  const layout = printLayout({ pins: slide.pins.length + notes.length, zoom: zoom !== null, aspect: slide.image.height > 0 ? slide.image.width / slide.image.height : undefined });
  const known = new Map<string, MediaRef>();
  let shapes = title(kit, slide.title);

  // The real screen, framed, with its pins and the mark of the lupa's region.
  shapes += kit.preset('rect', layout.frame, { line: { color: DECK.blue, width: 1.25 } });
  shapes += pictureOnce(kit, slide.image, layout.image, media, known, `print ${slide.number}`);
  if (zoom !== null && layout.zoom !== null) {
    shapes += kit.preset('rect', focusOnImage(layout.image, zoom.focus), { line: { color: DECK.amber, width: 1.25, dash: true } });
  }
  for (const pin of slide.pins) {
    const rect = pinRect(layout.image, pin);
    shapes += kit.preset('ellipse', rect, { fill: DECK.blue, line: { color: DECK.white, width: 1.5 } });
    shapes += kit.box(rect, kit.para(kit.run(String(pin.n), { sz: TYPE.pin, bold: true }), { align: 'ctr' }), { anchor: 'ctr', inset: 0 });
  }
  shapes += kit.box(layout.caption, kit.para(kit.run(slide.caption, { sz: PRINT_TYPE.caption, color: SUBTLE }), { align: 'r' }), { inset: 0 });

  // The column on the left: the headline, what it is, why this screen, how to read it.
  shapes += kit.box(layout.headline, kit.para(kit.run(slide.headline, { sz: PRINT_TYPE.headline, bold: true, color: DECK.green })), { inset: 0 });
  shapes += kit.box(layout.whatLabel, kit.para(kit.run(slide.whatLabel, { sz: PRINT_TYPE.label, bold: true, color: DECK.lightBlue })), { inset: 0 });
  shapes += kit.box(layout.what, kit.para(kit.run(slide.what, { sz: PRINT_TYPE.body })), { inset: 0 });
  shapes += kit.box(layout.whyLabel, kit.para(kit.run(slide.whyLabel, { sz: PRINT_TYPE.label, bold: true, color: DECK.lightBlue })), { inset: 0 });
  shapes += kit.box(layout.why, kit.para(kit.run(slide.why, { sz: PRINT_TYPE.body })), { inset: 0 });
  if (slide.pins.length + notes.length > 0) {
    shapes += kit.box(layout.pinsHeading, kit.para(kit.run(slide.pinsLabel, { sz: PRINT_TYPE.pinsHeading, bold: true, color: DECK.lime })), { inset: 0 });
  }
  layout.legend.forEach((row, index) => {
    const pin = slide.pins[index];
    const line = slide.legend[index];
    if (pin === undefined || line === undefined) return;
    shapes += kit.preset('ellipse', row.disc, { fill: DECK.blue, line: { color: DECK.white, width: 1 } });
    shapes += kit.box(row.disc, kit.para(kit.run(String(pin.n), { sz: PRINT_TYPE.legendNumber, bold: true }), { align: 'ctr' }), { anchor: 'ctr', inset: 0 });
    shapes += kit.box(row.text, kit.para(legendRuns(kit, line, PRINT_TYPE.legend)), { inset: 0 });
  });
  // 3.5.5: the unnumbered lines (a reading the screen holds but no label was found for): a small ring, no number.
  layout.legend.slice(slide.pins.length).forEach((row, index) => {
    const line = notes[index];
    if (line === undefined) return;
    const ring = { x: row.disc.x + row.disc.w / 4, y: row.disc.y + row.disc.h / 4, w: row.disc.w / 2, h: row.disc.h / 2 };
    shapes += kit.preset('ellipse', ring, { line: { color: DECK.lightBlue, width: 1.25 } });
    shapes += kit.box(row.text, kit.para(legendRuns(kit, line, PRINT_TYPE.legend)), { inset: 0 });
  });

  // The lupa: the same media part, cropped (0 bytes).
  if (zoom !== null && layout.zoom !== null) {
    const focus = clampFocus(zoom.focus);
    const rect = containRect(layout.zoom.box, focusAspect(focus, slide.image));
    shapes += kit.box(layout.zoom.label, kit.para(kit.run(zoom.label, { sz: PRINT_TYPE.zoomLabel, bold: true, color: DECK.amber })), { inset: 0 });
    shapes += kit.preset('rect', { x: rect.x - 15000, y: rect.y - 15000, w: rect.w + 30000, h: rect.h + 30000 }, { line: { color: DECK.amber, width: 1 } });
    shapes += pictureOnce(kit, slide.image, rect, media, known, `zoom ${slide.number}`, srcRectFor(focus));
  }
  shapes += kit.chrome('content', confidential);
  return { layout: kit.layout.content, xml: kit.slideXml(shapes), media, title: slide.title };
}

// ------------------------------------------------------------------ analysis

function visualShapes(kit: PptxKit, visual: AnalysisVisual, layout: ReturnType<typeof analysisLayout>): string {
  const plot = layout.plot;
  switch (visual.kind) {
    case 'bars':
      return kit.barChart(visual, kitChartRect(layout));
    case 'table':
      return kit.tableBlock(visual, kitChartRect(layout));
    case 'columns': {
      const geometry = columnsLayout(visual, plot);
      let shapes = kit.heading(layout.chartTitle, visual.title);
      if (geometry.band !== null) shapes += kit.preset('rect', geometry.band, { fill: DECK.panel });
      if (geometry.bandLabel !== null && visual.band !== null) {
        shapes += kit.box(geometry.bandLabel, kit.para(kit.run(visual.band.label, { sz: PRINT_TYPE.axis, color: SUBTLE })), { inset: 0 });
      }
      shapes += geometry.bars.map((bar) => kit.preset('rect', bar.rect, { fill: bar.highlight ? DECK.red : DECK.green })).join('');
      shapes += kit.preset('rect', geometry.axis, { fill: DECK.border });
      // Every rule first, then the labels on chips of the card's colour, so no rule runs through a label.
      for (const marker of geometry.markers) shapes += kit.preset('rect', marker.rule, { fill: DECK.amber });
      for (const marker of geometry.markers) {
        if (marker.text !== '') shapes += kit.box(marker.label, kit.para(kit.run(marker.text, { sz: PRINT_TYPE.axis, color: DECK.amber }), { align: 'ctr' }), { inset: 0, fill: DECK.slate });
      }
      for (const label of geometry.xLabels) {
        shapes += kit.box(label.rect, kit.para(kit.run(label.text, { sz: PRINT_TYPE.axis, color: SUBTLE }), { align: 'ctr' }), { inset: 0 });
      }
      shapes += kit.box(geometry.maxLabel, kit.para(kit.run(`${visual.maxLabel} ${visual.unit}`.trim(), { sz: PRINT_TYPE.axis, color: SUBTLE })), { inset: 0 });
      return shapes;
    }
    case 'capacity': {
      const geometry = capacityLayout(visual, plot);
      let shapes = kit.heading(layout.chartTitle, visual.title);
      geometry.rows.forEach((row, index) => {
        const source = visual.rows[index];
        if (source === undefined) return;
        shapes += kit.box(row.label, kit.para(kit.run(source.label, { sz: TYPE.small })), { anchor: 'ctr', inset: 0 });
        shapes += kit.box(row.display, kit.para(kit.run(source.display, { sz: PRINT_TYPE.axis, color: SUBTLE })), { inset: 0 });
        if (row.allocatable !== null) shapes += kit.preset('rect', row.allocatable, { fill: DECK.border });
        shapes += kit.preset('rect', row.requested, { fill: DECK.lightBlue });
        shapes += kit.preset('rect', row.used, { fill: DECK.green });
      });
      return shapes;
    }
    case 'ruler': {
      const geometry = rulerLayout(visual, plot);
      let shapes = kit.heading(layout.chartTitle, visual.title);
      geometry.items.forEach((row, index) => {
        const item = visual.items[index];
        if (item === undefined) return;
        shapes += kit.box(row.label, kit.para(kit.run(item.label, { sz: TYPE.small })), { anchor: 'ctr', inset: 0 });
        shapes += row.zones.map((zone) => kit.preset('rect', zone.rect, { fill: VERDICT_HEX[zone.verdict] })).join('');
        shapes += kit.preset('rect', row.marker, { fill: DECK.white });
        shapes += kit.box(row.display, kit.para(kit.run(item.display, { sz: PRINT_TYPE.axis, bold: true, color: VERDICT_HEX[item.verdict] }), { align: row.align }), { inset: 0 });
      });
      return shapes;
    }
  }
}

function analysisSlide(slide: AnalysisSlide, confidential: string, kit: PptxKit): RenderedSlide {
  const layout = analysisLayout({ kpis: slide.kpis.length, hasDql: slide.dql.length > 0 });
  let shapes = title(kit, slide.title);

  slide.kpis.forEach((kpi, index) => {
    const rect = layout.kpis[index];
    if (rect === undefined) return;
    shapes += kit.panelRect(rect, DECK.slate);
    shapes += kit.preset('rect', { x: rect.x + 60000, y: rect.y, w: rect.w - 120000, h: KPI_ACCENT_H }, { fill: SOURCE_ACCENT[kpi.source] });
    const paras =
      kit.para(kit.run(kpi.value, { sz: kpiValueSize(kpi.value, 4), bold: true, color: kpiStatusHex(kpi.status) }), { spaceAfter: 2 }) +
      kit.para(kit.run(kpi.label, { sz: PRINT_TYPE.kpiLabel, color: SUBTLE }), { spaceAfter: 2 }) +
      kit.para(kit.run(kpi.footer, { sz: PRINT_TYPE.kpiFooter, color: SUBTLE }));
    shapes += kit.box({ x: rect.x, y: rect.y + KPI_ACCENT_H, w: rect.w, h: rect.h - KPI_ACCENT_H }, paras, { anchor: 'ctr' });
  });

  if (slide.visual !== null || slide.dql.length > 0) {
    shapes += kit.preset('roundRect', layout.chart, { fill: DECK.slate, line: { color: DECK.border, width: 0.75 }, adjust: { adj: 3000 } });
    if (slide.visual !== null) shapes += visualShapes(kit, slide.visual, layout);
    if (layout.dql !== null) {
      const paras =
        kit.para(kit.run(slide.dqlLabel, { sz: PRINT_TYPE.dqlLabel, bold: true, color: SUBTLE })) +
        monoLines(kit, slide.dql, PRINT_TYPE.dql) +
        (slide.dqlMore === null ? '' : kit.para(kit.run(slide.dqlMore, { sz: PRINT_TYPE.dqlMore, color: DECK.lightBlue })));
      shapes += kit.box(layout.dql, paras, { inset: 0 });
    }
  }

  if (slide.findings.length > 0) shapes += kit.bulletList(slide.findingsLabel, slide.findings, layout.findings);
  if (slide.matters !== '') {
    shapes += kit.preset('rect', { x: layout.matters.x, y: layout.matters.y, w: layout.matters.w, h: 30000 }, { fill: DECK.green });
    shapes += kit.box({ x: layout.matters.x, y: layout.matters.y + 60000, w: layout.matters.w, h: 300000 }, kit.para(kit.run(slide.mattersLabel, { sz: TYPE.blockHead, bold: true, color: DECK.lime })), { inset: 0 });
    shapes += kit.box({ x: layout.matters.x, y: layout.matters.y + 380000, w: layout.matters.w, h: layout.matters.h - 380000 }, kit.para(kit.run(slide.matters, { sz: PRINT_TYPE.matters })), { inset: 0 });
  }
  if (slide.reco.length > 0) {
    shapes += kit.preset('rect', { x: layout.reco.x, y: layout.reco.y, w: layout.reco.w, h: 30000 }, { fill: DECK.amber });
    shapes += kit.box({ x: layout.reco.x, y: layout.reco.y + 60000, w: layout.reco.w, h: 300000 }, kit.para(kit.run(slide.recoLabel, { sz: TYPE.blockHead, bold: true, color: DECK.lime })), { inset: 0 });
    const items = slide.reco.map((line) => kit.para(kit.run(line, { sz: PRINT_TYPE.reco }), { bullet: true, spaceAfter: 3 })).join('');
    shapes += kit.box({ x: layout.reco.x, y: layout.reco.y + 380000, w: layout.reco.w, h: layout.reco.h - 380000 }, items, { inset: 0 });
  }
  shapes += kit.chrome('content', confidential);
  return { layout: kit.layout.content, xml: kit.slideXml(shapes), media: [], title: slide.title };
}

// ------------------------------------------------------------------ story

function storySlide(slide: StorySlide, confidential: string, kit: PptxKit): RenderedSlide {
  const media: MediaRef[] = [];
  const known = new Map<string, MediaRef>();
  const layout = storyLayout(slide.steps.length);
  let shapes = title(kit, slide.title);
  shapes += kit.box(layout.subtitle, kit.para(kit.run(slide.subtitle, { sz: PRINT_TYPE.storySubtitle, color: SUBTLE })), { inset: 0 });
  layout.cards.forEach((card, index) => {
    const step = slide.steps[index];
    if (step === undefined) return;
    shapes += kit.panelRect(card.card, DECK.slate, 4000);
    shapes += kit.box(card.stage, kit.para(kit.run(step.label, { sz: PRINT_TYPE.storyStage, bold: true, color: DECK.lightBlue })), { inset: 0 });
    if (step.time !== null) shapes += kit.box(card.time, kit.para(kit.run(step.time, { sz: PRINT_TYPE.storyTime, bold: true })), { inset: 0 });
    if (step.thumb !== null) {
      const focus = clampFocus(step.thumb.focus);
      const rect = containRect(card.thumb, focusAspect(focus, step.thumb.image));
      shapes += kit.preset('rect', { x: rect.x - 12000, y: rect.y - 12000, w: rect.w + 24000, h: rect.h + 24000 }, { line: { color: DECK.border, width: 0.75 } });
      shapes += pictureOnce(kit, step.thumb.image, rect, media, known, `story ${index + 1}`, srcRectFor(focus));
    } else if (step.noPrint != null && step.noPrint !== '') {
      shapes += kit.preset('rect', card.thumb, { line: { color: DECK.border, width: 0.75, dash: true } });
      shapes += kit.box(card.thumb, kit.para(kit.run(step.noPrint, { sz: PRINT_TYPE.storyStage, bold: true, color: DECK.lightBlue }), { align: 'ctr' }), { anchor: 'ctr' });
    }
    shapes += kit.box(card.text, kit.para(kit.run(step.text, { sz: PRINT_TYPE.storyText })), { inset: 0 });
    if (step.ref !== null) shapes += kit.box(card.ref, kit.para(kit.run(step.ref, { sz: PRINT_TYPE.storyRef, bold: true, color: DECK.lime }), { align: 'r' }), { inset: 0 });
  });
  shapes += layout.arrows.map((arrow) => kit.preset('rightArrow', arrow, { fill: DECK.border })).join('');
  shapes += kit.panelRect(layout.chain, DECK.panel, 12000);
  shapes += kit.box(
    layout.chain,
    kit.para(kit.run(`${slide.chainLabel}  `, { sz: PRINT_TYPE.chain, bold: true, color: DECK.lime }) + kit.run(slide.chain, { sz: PRINT_TYPE.chain })),
    { anchor: 'ctr' },
  );
  shapes += kit.box(layout.caveat, kit.para(kit.run(slide.caveat, { sz: PRINT_TYPE.caveat, color: SUBTLE })), { inset: 0 });
  shapes += kit.chrome('content', confidential);
  return { layout: kit.layout.content, xml: kit.slideXml(shapes), media, title: slide.title };
}

// ------------------------------------------------------------------ methodology

/**
 * A table with its own type size and column weights (the kit's table is the Tech Wrapup's, fixed at
 * 10 pt), one line per cell (`fitGrid`, which the preview reads too).
 */
function grid(kit: PptxKit, heading: string, headers: readonly string[], rows: readonly (readonly string[])[], rect: Rect, weights: readonly number[], sz: number): string {
  const cols = weights.slice(0, Math.max(1, headers.length));
  const { cells } = gridLayout(rect, cols, rows.length);
  const fitted = fitGrid(rect, cols, sz, headers, rows);
  let shapes = kit.heading(rect, heading);
  fitted.headers.forEach((cell, c) => {
    const at = cells[0]?.[c];
    if (at !== undefined) shapes += kit.box(at, kit.para(kit.run(cell, { sz: fitted.sizes[c] ?? sz, bold: true })), { fill: DECK.panel, anchor: 'ctr', inset: CELL_INSET });
  });
  fitted.rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      const at = cells[r + 1]?.[c];
      if (at !== undefined) shapes += kit.box(at, kit.para(kit.run(cell, { sz: fitted.sizes[c] ?? sz })), { fill: r % 2 === 0 ? DECK.slate : undefined, anchor: 'ctr', inset: CELL_INSET });
    });
  });
  return shapes;
}

function methodologySlide(slide: MethodologySlide, confidential: string, kit: PptxKit): RenderedSlide {
  let shapes = title(kit, slide.title);
  if (slide.part === 'summary') {
    const layout = methodologyLayout();
    slide.scope.slice(0, layout.scope.length).forEach((item, index) => {
      const rect = layout.scope[index] as Rect;
      const paras =
        kit.para(kit.run(item.value, { sz: PRINT_TYPE.scopeValue, bold: true, color: DECK.lime }), { spaceAfter: 2 }) +
        kit.para(kit.run(item.label, { sz: PRINT_TYPE.scopeLabel, color: SUBTLE }));
      shapes += kit.box(rect, paras, { fill: DECK.slate, round: true, anchor: 'ctr' });
    });
    if (slide.prints.length > 0) shapes += grid(kit, slide.printsTitle, slide.printHeaders, slide.prints, layout.prints, METHOD_WEIGHTS.prints, PRINT_TYPE.methodPrints);
    if (slide.queries.length > 0) shapes += grid(kit, slide.queriesTitle, slide.queryHeaders, slide.queries, layout.queries, METHOD_WEIGHTS.queries, PRINT_TYPE.methodQueries);
    const gapParas = slide.gaps.map((line) => kit.para(kit.run(line, { sz: PRINT_TYPE.gaps }), { bullet: true, spaceAfter: 2 })).join('');
    const note = kit.para(kit.run(slide.note, { sz: PRINT_TYPE.note, color: SUBTLE }));
    if (slide.gaps.length > 0) shapes += kit.heading(layout.gaps, slide.gapsTitle);
    shapes += kit.box({ x: layout.gaps.x, y: layout.gaps.y + 360000, w: layout.gaps.w, h: layout.gaps.h - 360000 }, gapParas + note, { inset: 0 });
  } else {
    const layout = dqlPageLayout();
    slide.cards.slice(0, layout.cards.length).forEach((card, index) => {
      const rect = layout.cards[index] as Rect;
      const inner = dqlCardLayout(rect);
      shapes += kit.preset('roundRect', rect, { fill: DECK.slate, line: { color: DECK.border, width: 0.75 }, adjust: { adj: 3000 } });
      shapes += kit.box(
        inner.heading,
        kit.para(kit.run(`${card.ref}  `, { sz: PRINT_TYPE.cardHeading, bold: true, color: DECK.lime }) + kit.run(card.heading, { sz: PRINT_TYPE.cardHeading, bold: true })),
        { inset: 0 },
      );
      shapes += kit.box(inner.window, kit.para(kit.run(card.windowLine, { sz: PRINT_TYPE.cardWindow, color: SUBTLE })), { inset: 0 });
      shapes += kit.box(inner.lines, monoLines(kit, card.lines, PRINT_TYPE.dql), { inset: 0 });
    });
  }
  shapes += kit.chrome('content', confidential);
  return { layout: kit.layout.content, xml: kit.slideXml(shapes), media: [], title: slide.title };
}

/** One slide of the real-prints deck as template XML (dispatched from `pptxTemplate.ts`). */
export function renderPrintDeckSlide(slide: PrintDeckSlide, confidential: string, kit: PptxKit): RenderedSlide {
  switch (slide.kind) {
    case 'print':
      return printSlide(slide, confidential, kit);
    case 'analysis':
      return analysisSlide(slide, confidential, kit);
    case 'story':
      return storySlide(slide, confidential, kit);
    case 'methodology':
      return methodologySlide(slide, confidential, kit);
  }
}
