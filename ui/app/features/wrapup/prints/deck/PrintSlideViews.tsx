import React, { type FC } from 'react';

import { DECK } from '../../deck';
import type { PreviewKit } from '../../DeckPreview';
import { TYPE, containRect, kpiValueSize, type Rect } from '../../geometry';
import {
  CELL_INSET,
  EMU_PER_PT,
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
  legendParts,
  methodologyLayout,
  pinRect,
  printLayout,
  rulerLayout,
  storyLayout,
} from './printGeometry';
import type { AnalysisSlide, AnalysisVisual, FocusFraction, MethodologySlide, PrintDeckSlide, PrintImage, PrintSlide, StorySlide } from './slides';

/**
 * The real-prints deck on screen (3.2.7): the same slides the PPTX writer draws
 * (`pptxPrintSlides.ts`), at the same positions (`printGeometry.ts`), with the preview's own
 * primitives (`PREVIEW_KIT` of `DeckPreview.tsx`). `DeckPreview` sends every print-deck slide here
 * with one dispatch line, so its own slides are untouched.
 *
 * A print renders as `<img data-print-image>` with its alt ("Real Dynatrace screen: …", never
 * "What it shows"). The lupa and the story thumbnails show a region of the same image: a box with
 * `overflow: hidden` and the picture scaled and offset by the focus fractions — the fractions the
 * PPTX writes as `<a:srcRect>`. Images load eagerly: they are data URLs (nothing to fetch), and a
 * lazy image below the fold can be missing from `window.print()`.
 */

type ViewProps<S> = { slide: S; kit: PreviewKit };

const SUBTLE = DECK.subtle;
const MONO_STACK = `${MONO_FONT}, 'Courier New', monospace`;

/** "Name: what it shows", the name in bold. */
const LegendLine = ({ line }: { line: string }) => {
  const { name, text } = legendParts(line);
  return (
    <>
      {name !== null && <strong>{name}</strong>}
      {text}
    </>
  );
};

/** A region of an image: the picture scaled by 1/w × 1/h and moved by −x/w, −y/h inside a clipping box. */
const Cropped = ({ kit, image, focus, rect }: { kit: PreviewKit; image: PrintImage; focus: FocusFraction; rect: Rect }) => {
  const { x, y, w, h } = clampFocus(focus);
  return (
    <kit.At rect={rect} style={{ overflow: 'hidden' }} aria-hidden="true">
      <img
        src={image.dataUrl}
        alt=""
        decoding="async"
        loading="eager"
        style={{ position: 'absolute', maxWidth: 'none', width: `${100 / w}%`, height: `${100 / h}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}
      />
    </kit.At>
  );
};

/** Monospace lines (DQL), kept as written: indentation is part of the query. */
const MonoLines = ({ kit, lines }: { kit: PreviewKit; lines: readonly string[] }) => (
  <div style={{ fontFamily: MONO_STACK, fontSize: kit.pt(PRINT_TYPE.dql), lineHeight: 1.2, whiteSpace: 'pre', overflow: 'hidden' }}>
    {lines.map((line, index) => (
      <div key={index}>{line === '' ? ' ' : line}</div>
    ))}
  </div>
);

// ------------------------------------------------------------------ print

const PrintView = ({ slide, kit }: ViewProps<PrintSlide>) => {
  const { At, text, pt, hex, Title } = kit;
  const zoom = slide.zoom;
  const notes = slide.notes;
  const layout = printLayout({ pins: slide.pins.length + notes.length, zoom: zoom !== null, aspect: slide.image.height > 0 ? slide.image.width / slide.image.height : undefined });
  const label = (rect: Rect, value: string) => (
    <At rect={rect} style={text(PRINT_TYPE.label, { padding: 0, fontWeight: 700, color: hex(DECK.lightBlue) })}>
      {value}
    </At>
  );
  return (
    <>
      <Title>{slide.title}</Title>
      <At rect={layout.frame} style={{ border: `${pt(1.25)} solid ${hex(DECK.blue)}` }} />
      <At rect={layout.image}>
        <img src={slide.image.dataUrl} alt={slide.alt} data-print-image={slide.number} decoding="async" loading="eager" style={{ width: '100%', height: '100%', display: 'block' }} />
      </At>
      {zoom !== null && layout.zoom !== null && <At rect={focusOnImage(layout.image, zoom.focus)} style={{ border: `${pt(1.25)} dashed ${hex(DECK.amber)}` }} aria-hidden="true" />}
      {slide.pins.map((pin, index) => (
        <At
          key={index}
          rect={pinRect(layout.image, pin)}
          style={{ borderRadius: '50%', background: hex(DECK.blue), border: `${pt(1.5)} solid #FFFFFF`, display: 'grid', placeItems: 'center', fontSize: pt(TYPE.pin), fontWeight: 700 }}
          aria-hidden="true"
        >
          {pin.n}
        </At>
      ))}
      <At rect={layout.caption} style={text(PRINT_TYPE.caption, { padding: 0, color: hex(SUBTLE), textAlign: 'right' })}>
        {slide.caption}
      </At>

      <At rect={layout.headline} style={text(PRINT_TYPE.headline, { padding: 0, fontWeight: 700, color: hex(DECK.green) })}>
        {slide.headline}
      </At>
      {label(layout.whatLabel, slide.whatLabel)}
      <At rect={layout.what} style={text(PRINT_TYPE.body, { padding: 0 })}>
        {slide.what}
      </At>
      {label(layout.whyLabel, slide.whyLabel)}
      <At rect={layout.why} style={text(PRINT_TYPE.body, { padding: 0 })}>
        {slide.why}
      </At>
      {slide.pins.length + notes.length > 0 && (
        <At rect={layout.pinsHeading} style={text(PRINT_TYPE.pinsHeading, { padding: 0, fontWeight: 700, color: hex(DECK.lime) })}>
          {slide.pinsLabel}
        </At>
      )}
      {layout.legend.map((row, index) => {
        const pin = slide.pins[index];
        const line = slide.legend[index];
        if (pin === undefined || line === undefined) return null;
        return (
          <React.Fragment key={index}>
            <At
              rect={row.disc}
              style={{ borderRadius: '50%', background: hex(DECK.blue), border: `${pt(1)} solid #FFFFFF`, display: 'grid', placeItems: 'center', fontSize: pt(PRINT_TYPE.legendNumber), fontWeight: 700 }}
              aria-hidden="true"
            >
              {pin.n}
            </At>
            <At rect={row.text} style={text(PRINT_TYPE.legend, { padding: 0 })}>
              <LegendLine line={line} />
            </At>
          </React.Fragment>
        );
      })}
      {/* 3.5.5: the unnumbered lines — a small ring, no number, never a pin on a guessed spot. */}
      {layout.legend.slice(slide.pins.length).map((row, index) => {
        const line = notes[index];
        if (line === undefined) return null;
        return (
          <React.Fragment key={`note-${index}`}>
            <At
              rect={{ x: row.disc.x + row.disc.w / 4, y: row.disc.y + row.disc.h / 4, w: row.disc.w / 2, h: row.disc.h / 2 }}
              style={{ borderRadius: '50%', border: `${pt(1.25)} solid ${hex(DECK.lightBlue)}` }}
              aria-hidden="true"
            />
            <At rect={row.text} style={text(PRINT_TYPE.legend, { padding: 0 })} data-print-note="">
              <LegendLine line={line} />
            </At>
          </React.Fragment>
        );
      })}
      {zoom !== null &&
        layout.zoom !== null &&
        (() => {
          const rect = containRect(layout.zoom.box, focusAspect(zoom.focus, slide.image));
          return (
            <>
              <At rect={layout.zoom.label} style={text(PRINT_TYPE.zoomLabel, { padding: 0, fontWeight: 700, color: hex(DECK.amber) })}>
                {zoom.label}
              </At>
              <At rect={{ x: rect.x - 15000, y: rect.y - 15000, w: rect.w + 30000, h: rect.h + 30000 }} style={{ border: `${pt(1)} solid ${hex(DECK.amber)}` }} />
              <Cropped kit={kit} image={slide.image} focus={zoom.focus} rect={rect} />
            </>
          );
        })()}
    </>
  );
};

// ------------------------------------------------------------------ analysis

const Visual = ({ visual, layout, kit }: { visual: AnalysisVisual; layout: ReturnType<typeof analysisLayout>; kit: PreviewKit }) => {
  const { At, text, hex, Heading, BarChart, TableBlock } = kit;
  const plot = layout.plot;
  const small = (size: number, extra: React.CSSProperties = {}) => text(size, { padding: 0, color: hex(SUBTLE), whiteSpace: 'nowrap', ...extra });
  switch (visual.kind) {
    case 'bars':
      return <BarChart visual={visual} rect={kitChartRect(layout)} />;
    case 'table':
      return <TableBlock visual={visual} rect={kitChartRect(layout)} />;
    case 'columns': {
      const geometry = columnsLayout(visual, plot);
      return (
        <>
          <Heading rect={layout.chartTitle}>{visual.title}</Heading>
          {geometry.band !== null && <At rect={geometry.band} style={{ background: hex(DECK.panel) }} />}
          {geometry.bandLabel !== null && visual.band !== null && (
            <At rect={geometry.bandLabel} style={small(PRINT_TYPE.axis)}>
              {visual.band.label}
            </At>
          )}
          {geometry.bars.map((bar, index) => (
            <At key={index} rect={bar.rect} style={{ background: hex(bar.highlight ? DECK.red : DECK.green) }} />
          ))}
          <At rect={geometry.axis} style={{ background: hex(DECK.border) }} />
          {/* Every rule first, then the labels on chips of the card's colour, so no rule runs through a label. */}
          {geometry.markers.map((marker, index) => (
            <At key={`rule-${index}`} rect={marker.rule} style={{ background: hex(DECK.amber) }} />
          ))}
          {geometry.markers.map((marker, index) =>
            marker.text === '' ? null : (
              <At key={`label-${index}`} rect={marker.label} style={small(PRINT_TYPE.axis, { color: hex(DECK.amber), background: hex(DECK.slate), textAlign: 'center' })}>
                {marker.text}
              </At>
            ),
          )}
          {geometry.xLabels.map((label, index) => (
            <At key={index} rect={label.rect} style={small(PRINT_TYPE.axis, { textAlign: 'center' })}>
              {label.text}
            </At>
          ))}
          <At rect={geometry.maxLabel} style={small(PRINT_TYPE.axis)}>
            {`${visual.maxLabel} ${visual.unit}`.trim()}
          </At>
        </>
      );
    }
    case 'capacity': {
      const geometry = capacityLayout(visual, plot);
      return (
        <>
          <Heading rect={layout.chartTitle}>{visual.title}</Heading>
          {geometry.rows.map((row, index) => {
            const source = visual.rows[index];
            if (source === undefined) return null;
            return (
              <React.Fragment key={index}>
                <At rect={row.label} style={text(TYPE.small, { padding: 0, display: 'flex', alignItems: 'center' })}>
                  {source.label}
                </At>
                <At rect={row.display} style={small(PRINT_TYPE.axis)}>
                  {source.display}
                </At>
                {row.allocatable !== null && <At rect={row.allocatable} style={{ background: hex(DECK.border) }} />}
                <At rect={row.requested} style={{ background: hex(DECK.lightBlue) }} />
                <At rect={row.used} style={{ background: hex(DECK.green) }} />
              </React.Fragment>
            );
          })}
        </>
      );
    }
    case 'ruler': {
      const geometry = rulerLayout(visual, plot);
      const align = { l: 'left', ctr: 'center', r: 'right' } as const;
      return (
        <>
          <Heading rect={layout.chartTitle}>{visual.title}</Heading>
          {geometry.items.map((row, index) => {
            const item = visual.items[index];
            if (item === undefined) return null;
            return (
              <React.Fragment key={index}>
                <At rect={row.label} style={text(TYPE.small, { padding: 0, display: 'flex', alignItems: 'center' })}>
                  {item.label}
                </At>
                {row.zones.map((zone) => (
                  <At key={zone.verdict} rect={zone.rect} style={{ background: hex(VERDICT_HEX[zone.verdict]) }} />
                ))}
                <At rect={row.marker} style={{ background: '#FFFFFF' }} />
                <At rect={row.display} style={small(PRINT_TYPE.axis, { fontWeight: 700, color: hex(VERDICT_HEX[item.verdict]), textAlign: align[row.align] })}>
                  {item.display}
                </At>
              </React.Fragment>
            );
          })}
        </>
      );
    }
  }
};

const AnalysisView = ({ slide, kit }: ViewProps<AnalysisSlide>) => {
  const { At, text, pt, hex, statusHex, Title, Heading, Bullets } = kit;
  const layout = analysisLayout({ kpis: slide.kpis.length, hasDql: slide.dql.length > 0 });
  const block = (rect: Rect, rule: string, heading: string, children: React.ReactNode) => (
    <>
      <At rect={{ x: rect.x, y: rect.y, w: rect.w, h: 30000 }} style={{ background: hex(rule) }} />
      <At rect={{ x: rect.x, y: rect.y + 60000, w: rect.w, h: 300000 }} style={text(TYPE.blockHead, { padding: 0, fontWeight: 700, color: hex(DECK.lime) })}>
        {heading}
      </At>
      <At rect={{ x: rect.x, y: rect.y + 380000, w: rect.w, h: rect.h - 380000 }} style={text(PRINT_TYPE.matters, { padding: 0 })}>
        {children}
      </At>
    </>
  );
  return (
    <>
      <Title>{slide.title}</Title>
      {slide.kpis.map((kpi, index) => {
        const rect = layout.kpis[index];
        if (rect === undefined) return null;
        return (
          <React.Fragment key={index}>
            <At rect={rect} style={{ background: hex(DECK.slate), borderRadius: pt(6) }} />
            <At rect={{ x: rect.x + 60000, y: rect.y, w: rect.w - 120000, h: KPI_ACCENT_H }} style={{ background: hex(SOURCE_ACCENT[kpi.source]) }} data-kpi-source={kpi.source} />
            <At
              rect={{ x: rect.x, y: rect.y + KPI_ACCENT_H, w: rect.w, h: rect.h - KPI_ACCENT_H }}
              style={text(PRINT_TYPE.kpiLabel, { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: pt(2) })}
            >
              <span style={{ fontSize: pt(kpiValueSize(kpi.value, 4)), fontWeight: 700, color: statusHex(kpi.status), lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {kpi.value}
              </span>
              <span style={{ color: hex(SUBTLE) }}>{kpi.label}</span>
              <span style={{ fontSize: pt(PRINT_TYPE.kpiFooter), color: hex(SUBTLE) }}>{kpi.footer}</span>
            </At>
          </React.Fragment>
        );
      })}
      {(slide.visual !== null || slide.dql.length > 0) && (
        <>
          <At rect={layout.chart} style={{ background: hex(DECK.slate), border: `${pt(0.75)} solid ${hex(DECK.border)}`, borderRadius: pt(4) }} />
          {slide.visual !== null && <Visual visual={slide.visual} layout={layout} kit={kit} />}
          {layout.dql !== null && (
            <At rect={layout.dql} style={text(PRINT_TYPE.dqlLabel, { padding: 0 })}>
              <div style={{ fontWeight: 700, color: hex(SUBTLE) }}>{slide.dqlLabel}</div>
              <MonoLines kit={kit} lines={slide.dql} />
              {slide.dqlMore !== null && <div style={{ fontSize: pt(PRINT_TYPE.dqlMore), color: hex(DECK.lightBlue) }}>{slide.dqlMore}</div>}
            </At>
          )}
        </>
      )}
      {slide.findings.length > 0 && (
        <>
          <Heading rect={layout.findings}>{slide.findingsLabel}</Heading>
          <At rect={{ x: layout.findings.x, y: layout.findings.y + 360000, w: layout.findings.w, h: layout.findings.h - 360000 }} style={text(TYPE.body)}>
            <Bullets lines={slide.findings} />
          </At>
        </>
      )}
      {slide.matters !== '' && block(layout.matters, DECK.green, slide.mattersLabel, slide.matters)}
      {slide.reco.length > 0 && block(layout.reco, DECK.amber, slide.recoLabel, <Bullets lines={slide.reco} size={PRINT_TYPE.reco} />)}
    </>
  );
};

// ------------------------------------------------------------------ story

const StoryView = ({ slide, kit }: ViewProps<StorySlide>) => {
  const { At, text, pt, hex, Title } = kit;
  const layout = storyLayout(slide.steps.length);
  return (
    <>
      <Title>{slide.title}</Title>
      <At rect={layout.subtitle} style={text(PRINT_TYPE.storySubtitle, { padding: 0, color: hex(SUBTLE) })}>
        {slide.subtitle}
      </At>
      {layout.cards.map((card, index) => {
        const step = slide.steps[index];
        if (step === undefined) return null;
        const thumb = step.thumb === null ? null : containRect(card.thumb, focusAspect(step.thumb.focus, step.thumb.image));
        return (
          <React.Fragment key={index}>
            <At rect={card.card} style={{ background: hex(DECK.slate), borderRadius: pt(4) }} />
            <At rect={card.stage} style={text(PRINT_TYPE.storyStage, { padding: 0, fontWeight: 700, color: hex(DECK.lightBlue) })}>
              {step.label}
            </At>
            {step.time !== null && (
              <At rect={card.time} style={text(PRINT_TYPE.storyTime, { padding: 0, fontWeight: 700 })}>
                {step.time}
              </At>
            )}
            {step.thumb !== null && thumb !== null && (
              <>
                <At rect={{ x: thumb.x - 12000, y: thumb.y - 12000, w: thumb.w + 24000, h: thumb.h + 24000 }} style={{ border: `${pt(0.75)} solid ${hex(DECK.border)}` }} />
                <Cropped kit={kit} image={step.thumb.image} focus={step.thumb.focus} rect={thumb} />
              </>
            )}
            {step.thumb === null && step.noPrint != null && step.noPrint !== '' && (
              <At
                rect={card.thumb}
                style={text(PRINT_TYPE.storyStage, {
                  padding: 0,
                  fontWeight: 700,
                  color: hex(DECK.lightBlue),
                  border: `${pt(0.75)} dashed ${hex(DECK.border)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                {step.noPrint}
              </At>
            )}
            <At rect={card.text} style={text(PRINT_TYPE.storyText, { padding: 0 })}>
              {step.text}
            </At>
            {step.ref !== null && (
              <At rect={card.ref} style={text(PRINT_TYPE.storyRef, { padding: 0, fontWeight: 700, color: hex(DECK.lime), textAlign: 'right' })}>
                {step.ref}
              </At>
            )}
          </React.Fragment>
        );
      })}
      {layout.arrows.map((arrow, index) => (
        <At key={index} rect={arrow} aria-hidden="true">
          <svg viewBox="0 0 10 10" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
            <polygon points="0,3 5,3 5,0 10,5 5,10 5,7 0,7" fill={hex(DECK.border)} />
          </svg>
        </At>
      ))}
      <At rect={layout.chain} style={{ background: hex(DECK.panel), borderRadius: pt(4) }} />
      <At rect={layout.chain} style={text(PRINT_TYPE.chain, { display: 'flex', alignItems: 'center' })}>
        <span>
          <strong style={{ color: hex(DECK.lime) }}>{slide.chainLabel}</strong>
          {'  '}
          {slide.chain}
        </span>
      </At>
      <At rect={layout.caveat} style={text(PRINT_TYPE.caveat, { padding: 0, color: hex(SUBTLE) })}>
        {slide.caveat}
      </At>
    </>
  );
};

// ------------------------------------------------------------------ methodology

/** A methodology table, one line per cell at the sizes and cuts the PPTX writer uses (`fitGrid`). */
const Grid = ({ kit, heading, headers, rows, rect, weights, size }: { kit: PreviewKit; heading: string; headers: readonly string[]; rows: readonly (readonly string[])[]; rect: Rect; weights: readonly number[]; size: number }) => {
  const { At, text, pt, hex, Heading } = kit;
  const cols = weights.slice(0, Math.max(1, headers.length));
  const { cells } = gridLayout(rect, cols, rows.length);
  const fitted = fitGrid(rect, cols, size, headers, rows);
  const cell = (c: number, extra: React.CSSProperties) =>
    text(fitted.sizes[c] ?? size, { padding: pt(CELL_INSET / EMU_PER_PT), display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', ...extra });
  return (
    <>
      <Heading rect={rect}>{heading}</Heading>
      {fitted.headers.map((value, c) => {
        const at = cells[0]?.[c];
        return at === undefined ? null : (
          <At key={`h${c}`} rect={at} style={cell(c, { background: hex(DECK.panel), fontWeight: 700 })}>
            {value}
          </At>
        );
      })}
      {fitted.rows.map((row, r) =>
        row.map((value, c) => {
          const at = cells[r + 1]?.[c];
          return at === undefined ? null : (
            <At key={`${r}-${c}`} rect={at} style={cell(c, { background: r % 2 === 0 ? hex(DECK.slate) : 'transparent' })}>
              {value}
            </At>
          );
        }),
      )}
    </>
  );
};

const MethodologyView = ({ slide, kit }: ViewProps<MethodologySlide>) => {
  const { At, text, pt, hex, Title, Heading } = kit;
  if (slide.part === 'dql') {
    const layout = dqlPageLayout();
    return (
      <>
        <Title>{slide.title}</Title>
        {slide.cards.slice(0, layout.cards.length).map((card, index) => {
          const rect = layout.cards[index] as Rect;
          const inner = dqlCardLayout(rect);
          return (
            <React.Fragment key={`${card.ref}-${index}`}>
              <At rect={rect} style={{ background: hex(DECK.slate), border: `${pt(0.75)} solid ${hex(DECK.border)}`, borderRadius: pt(4) }} />
              <At rect={inner.heading} style={text(PRINT_TYPE.cardHeading, { padding: 0, fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis' })}>
                <span style={{ color: hex(DECK.lime) }}>{card.ref}</span>
                {'  '}
                {card.heading}
              </At>
              <At rect={inner.window} style={text(PRINT_TYPE.cardWindow, { padding: 0, color: hex(SUBTLE) })}>
                {card.windowLine}
              </At>
              <At rect={inner.lines} style={text(PRINT_TYPE.dql, { padding: 0 })}>
                <MonoLines kit={kit} lines={card.lines} />
              </At>
            </React.Fragment>
          );
        })}
      </>
    );
  }
  const layout = methodologyLayout();
  return (
    <>
      <Title>{slide.title}</Title>
      {slide.scope.slice(0, layout.scope.length).map((item, index) => (
        <At
          key={index}
          rect={layout.scope[index] as Rect}
          style={text(PRINT_TYPE.scopeLabel, { background: hex(DECK.slate), borderRadius: pt(6), display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: pt(2) })}
        >
          <span style={{ fontSize: pt(PRINT_TYPE.scopeValue), fontWeight: 700, color: hex(DECK.lime), lineHeight: 1.1 }}>{item.value}</span>
          <span style={{ color: hex(SUBTLE) }}>{item.label}</span>
        </At>
      ))}
      {slide.prints.length > 0 && (
        <Grid kit={kit} heading={slide.printsTitle} headers={slide.printHeaders} rows={slide.prints} rect={layout.prints} weights={METHOD_WEIGHTS.prints} size={PRINT_TYPE.methodPrints} />
      )}
      {slide.queries.length > 0 && (
        <Grid kit={kit} heading={slide.queriesTitle} headers={slide.queryHeaders} rows={slide.queries} rect={layout.queries} weights={METHOD_WEIGHTS.queries} size={PRINT_TYPE.methodQueries} />
      )}
      {slide.gaps.length > 0 && <Heading rect={layout.gaps}>{slide.gapsTitle}</Heading>}
      <At rect={{ x: layout.gaps.x, y: layout.gaps.y + 360000, w: layout.gaps.w, h: layout.gaps.h - 360000 }} style={text(PRINT_TYPE.gaps, { padding: 0 })}>
        {slide.gaps.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: pt(14), display: 'grid', gap: pt(2) }}>
            {slide.gaps.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        )}
        <div style={{ fontSize: pt(PRINT_TYPE.note), color: hex(SUBTLE), marginTop: pt(4) }}>{slide.note}</div>
      </At>
    </>
  );
};

/** Each kind of the deck has its view; a kind added to `PrintDeckSlide` without one does not compile. */
const VIEWS: { [K in PrintDeckSlide['kind']]: FC<ViewProps<Extract<PrintDeckSlide, { kind: K }>>> } = {
  print: PrintView,
  analysis: AnalysisView,
  story: StoryView,
  methodology: MethodologyView,
};

/**
 * One slide of the real-prints deck, inside a layer the size of the slide that names its kind
 * (`data-print-deck-slide`) and, for an analysis, its variant (`data-analysis-variant`: the
 * customer profile's "proof by DQL" is `dql-only`).
 */
export const PrintDeckSlideView = ({ slide, kit }: { slide: PrintDeckSlide; kit: PreviewKit }) => {
  const View = VIEWS[slide.kind] as FC<ViewProps<PrintDeckSlide>>;
  return (
    <div
      data-print-deck-slide={slide.kind}
      data-analysis-variant={slide.kind === 'analysis' ? slide.variant : undefined}
      data-methodology-part={slide.kind === 'methodology' ? slide.part : undefined}
      style={{ position: 'absolute', inset: 0 }}
    >
      <View slide={slide} kit={kit} />
    </div>
  );
};
