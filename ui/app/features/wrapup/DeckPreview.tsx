import React from 'react';

import { DECK, type KpiStatus } from './deck';
import {
  CAPTURE_INSET,
  CONTENT_TOP,
  CONTENT_W,
  MARGIN,
  capturePinSize,
  SLIDE_H,
  SLIDE_W,
  TEMPLATE_CHROME,
  TYPE,
  captureImageRect,
  executiveLayout,
  kpiValueSize,
  percent,
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
import { printSlideRenderers } from './prints/deck/renderers';
import { isPrintDeckSlide, type PrintDeckSlide } from './prints/deck/slides';
import type { TemplateArt } from './templateArt';

/**
 * The SE deck on screen (3.2.4): the same specification the PPTX writer draws, at the same
 * positions (`geometry.ts`), the same type sizes and the same cuts, over the template's own
 * pictures (`templateArt.ts`). What the SE sees here is what the customer opens.
 *
 * A point of the deck is 1/960 of the slide's width, so the slide scales with its column through
 * container-query units and stays a 16:9 page in print. This file, like the rest of
 * `features/wrapup/`, carries the deck's own palette: a `.pptx` is not drawn by the platform theme.
 */

const hex = (value: string) => `#${value}`;
/** A size in deck points, as a share of the slide's width. */
const pt = (points: number) => `${(points / 9.6).toFixed(4)}cqw`;

const FONT = "'DTFlow', 'DT Flow', 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif";

function statusHex(status: KpiStatus | undefined): string {
  if (status === 'good') return hex(DECK.pos);
  if (status === 'warn') return hex(DECK.amber);
  if (status === 'bad') return hex(DECK.red);
  return hex(DECK.lime);
}

/** An absolutely placed block, at a rectangle of the slide. */
const At = ({ rect, style, children, ...rest }: { rect: Rect; style?: React.CSSProperties; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} style={{ position: 'absolute', ...percent(rect), boxSizing: 'border-box', ...style }}>
    {children}
  </div>
);

/** Text set like a PowerPoint text box: the default insets, a line height of 1.2. */
const text = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  padding: `${pt(3.6)} ${pt(7.2)}`,
  fontSize: pt(size),
  lineHeight: 1.2,
  color: '#FFFFFF',
  overflow: 'hidden',
  ...extra,
});

const Heading = ({ rect, children }: { rect: Rect; children: React.ReactNode }) => (
  <At rect={{ x: rect.x, y: rect.y, w: rect.w, h: 320000 }} style={text(TYPE.blockHead, { fontWeight: 700, color: hex(DECK.lime) })}>
    {children}
  </At>
);

/** The footer, the slide number, its teal bar and the signet of the dark layouts. */
const Chrome = ({ confidential, number, art }: { confidential: string; number: number; art: TemplateArt }) => (
  <>
    <At rect={TEMPLATE_CHROME.footer} style={text(7, { display: 'flex', alignItems: 'center', letterSpacing: pt(1) })}>
      {confidential}
    </At>
    <At rect={TEMPLATE_CHROME.number} style={text(10, { display: 'flex', alignItems: 'center' })}>
      {number}
    </At>
    <At rect={TEMPLATE_CHROME.numberBar} style={{ background: '#08B4B1' }} />
    {art.signet !== undefined && (
      <At rect={TEMPLATE_CHROME.signet}>
        <img src={art.signet} alt="" style={{ width: '100%', height: '100%' }} />
      </At>
    )}
  </>
);

/** The title of a dark standard slide, over the template's blue-to-teal underline. */
const Title = ({ children }: { children: React.ReactNode }) => (
  <>
    <At
      rect={TEMPLATE_CHROME.titleRect}
      style={text(TYPE.title, { fontWeight: 700, lineHeight: 0.9, display: 'flex', alignItems: 'flex-end', paddingTop: pt(7.1) })}
      role="heading"
      aria-level={3}
    >
      {children}
    </At>
    <At rect={TEMPLATE_CHROME.underline} style={{ background: 'linear-gradient(90deg, #0F93D2, #08B4B1)' }} />
  </>
);

/** KPI cards; `size` sets a value's type (a capture slide's tiles fit theirs to the tile, `captureKpiValueSize`). */
const KpiCards = ({ kpis, rects, size = kpiValueSize }: { kpis: readonly DeckKpi[]; rects: readonly Rect[]; size?: (value: string, count: number) => number }) => (
  <>
    {kpis.slice(0, rects.length).map((kpi, index) => (
      <At
        key={`${kpi.label}-${index}`}
        rect={rects[index] as Rect}
        style={{ ...text(TYPE.kpiLabel), background: hex(DECK.slate), borderRadius: pt(6), display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: pt(3) }}
      >
        {/* 3.3.0 (§17-c): the preview clips a value that does not fit, so the whole text has to stay
            reachable — `title` shows it on hover and assistive technology reads it. The slide itself
            is unaffected: PowerPoint shrinks the text instead of clipping it. */}
        <span
          style={{ fontSize: pt(kpiFitSize(kpi.value, size(kpi.value, kpis.length), (rects[index] as Rect).w)), fontWeight: 700, color: statusHex(kpi.status), lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={`${kpi.label}: ${kpi.value}`}
        >
          {kpi.value}
        </span>
        <span style={{ color: hex(DECK.subtle) }}>{kpi.label}</span>
      </At>
    ))}
  </>
);

const Bullets = ({ lines, size = TYPE.body }: { lines: readonly string[]; size?: number }) => (
  <ul style={{ margin: 0, paddingLeft: pt(14), display: 'grid', gap: pt(4) }}>
    {lines.map((line, index) => (
      <li key={index} style={{ fontSize: pt(size) }}>
        {line}
      </li>
    ))}
  </ul>
);

const BarChart = ({ visual, rect }: { visual: Extract<DeckVisual, { kind: 'bars' }>; rect: Rect }) => {
  const max = Math.max(1, ...visual.items.map((item) => item.value));
  const top = rect.y + 360000;
  const rowH = Math.min(320000, (rect.h - 360000) / Math.max(1, visual.items.length));
  const labelW = rect.w * 0.4;
  const trackX = rect.x + labelW + 40000;
  const trackW = rect.w - labelW - 40000;
  // 3.3.1 (§17-a): same measured gutter as the .pptx writer, from the same helper.
  const valueW = barValueGutterEmu(visual.items);
  const barMax = Math.max(1, trackW - valueW - BAR_VALUE_GAP);
  return (
    <>
      <Heading rect={rect}>{visual.title}</Heading>
      {visual.items.map((item, index) => {
        const y = top + index * rowH;
        const barW = (item.value / max) * barMax;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <At rect={{ x: rect.x, y, w: labelW, h: rowH }} style={text(TYPE.small, { display: 'flex', alignItems: 'center' })}>
              {item.label}
            </At>
            <At rect={{ x: trackX, y: y + rowH * 0.26, w: Math.max(1, barW), h: rowH * 0.46 }} style={{ background: hex(DECK.green), borderRadius: pt(3) }} />
            <At rect={{ x: trackX + barW + BAR_VALUE_GAP, y, w: valueW, h: rowH }} style={text(TYPE.small, { display: 'flex', alignItems: 'center', fontWeight: 700, color: hex(DECK.lime) })}>
              {item.display}
            </At>
          </React.Fragment>
        );
      })}
    </>
  );
};

const TableBlock = ({ visual, rect }: { visual: Extract<DeckVisual, { kind: 'table' }>; rect: Rect }) => {
  const cols = visual.headers.length;
  const weights = cols === 2 ? [0.76, 0.24] : cols === 3 ? [0.5, 0.2, 0.3] : Array.from({ length: cols }, () => 1 / cols);
  const colX = (c: number) => rect.x + weights.slice(0, c).reduce((sum, weight) => sum + weight, 0) * rect.w;
  const colW = (c: number) => (weights[c] as number) * rect.w;
  const top = rect.y + 360000;
  const rowH = Math.min(300000, (rect.h - 360000) / (visual.rows.length + 1));
  const align = (c: number): React.CSSProperties['justifyContent'] => (cols === 2 && c === 1 ? 'center' : 'flex-start');
  return (
    <>
      <Heading rect={rect}>{visual.title}</Heading>
      {visual.headers.map((cell, c) => (
        <At key={`h${c}`} rect={{ x: colX(c), y: top, w: colW(c), h: rowH }} style={text(TYPE.small, { background: hex(DECK.panel), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: align(c) })}>
          {cell}
        </At>
      ))}
      {visual.rows.map((row, r) =>
        row.map((cell, c) => (
          <At
            key={`${r}-${c}`}
            rect={{ x: colX(c), y: top + (r + 1) * rowH, w: colW(c), h: rowH }}
            title={cell}
            style={text(TYPE.small, { background: r % 2 === 0 ? hex(DECK.slate) : 'transparent', display: 'flex', alignItems: 'center', justifyContent: align(c), whiteSpace: 'nowrap', textOverflow: 'ellipsis' })}
          >
            {cell}
          </At>
        )),
      )}
    </>
  );
};

/**
 * The preview's primitives, handed to the real-prints deck's views (3.2.7,
 * `prints/deck/PrintSlideViews.tsx`): the same blocks, type and palette as the Tech Wrapup's slides.
 */
export const PREVIEW_KIT = { At, text, pt, hex, statusHex, Title, Heading, KpiCards, Bullets, BarChart, TableBlock } as const;
export type PreviewKit = typeof PREVIEW_KIT;

/** A real-prints slide, through the views its own (lazy) chunk registered (`prints/deck/renderers.ts`). */
const PrintDeckSlideView = ({ slide }: { slide: PrintDeckSlide }) => {
  const { View } = printSlideRenderers();
  return <View slide={slide} kit={PREVIEW_KIT} />;
};

/** A band (Assist, why it matters): its label and its lines on a panel; `accent` draws the brand's edge. */
const Band = ({ rect, label, lines, fill, accent = false }: { rect: Rect; label: string; lines: readonly string[]; fill: string; accent?: boolean }) => (
  <>
    <At rect={rect} style={{ background: hex(fill), borderRadius: pt(6), overflow: 'hidden' }}>
      {accent && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(50000 / rect.w) * 100}%`, background: hex(DECK.green) }} />}
    </At>
    <At rect={{ x: rect.x + BAND_PAD_X, y: rect.y + 70000, w: rect.w - 2 * BAND_PAD_X, h: 300000 }} style={text(TYPE.blockHead, { fontWeight: 700, color: hex(DECK.lime) })}>
      {label}
    </At>
    <At rect={{ x: rect.x + BAND_PAD_X, y: rect.y + BAND_TEXT_TOP, w: rect.w - 2 * BAND_PAD_X, h: rect.h - BAND_TEXT_TOP }} style={text(TYPE.small)}>
      <Bullets lines={lines} size={TYPE.small} />
    </At>
  </>
);

/** A titled list of a story slide, set at `size`. */
const StoryList = ({ rect, title, lines, size }: { rect: Rect; title: string; lines: readonly string[]; size: number }) => (
  <>
    <Heading rect={rect}>{title}</Heading>
    <At rect={{ x: rect.x, y: rect.y + STORY_HEAD, w: rect.w, h: rect.h - STORY_HEAD }} style={text(size)}>
      <Bullets lines={lines} size={size} />
    </At>
  </>
);

/** The story slide of a captured subject (3.3.5): the same blocks at the same places as the file. */
const CaptureView = ({ slide }: { slide: CaptureSlide }) => {
  const { layout } = slide;
  const capture = slide.capture;
  const image = captureImageRect(layout.frame, capture.width, capture.height);
  const pinSize = capturePinSize(image.w, capture.width);
  const inset = CAPTURE_INSET;
  return (
    <>
      <Title>{slide.title}</Title>
      {layout.subtitle !== null && slide.subtitle !== null && (
        <At rect={layout.subtitle} style={text(TYPE.subtitle, { color: hex(DECK.subtle) })}>
          {slide.subtitle}
        </At>
      )}
      <At rect={{ x: image.x - inset, y: image.y - inset, w: image.w + 2 * inset, h: image.h + 2 * inset }} style={{ background: hex(capture.frame ?? DECK.white), borderRadius: pt(3) }} />
      <At rect={image}>
        <img src={capture.dataUrl} alt={slide.pinsLabel} data-capture-img="" style={{ width: '100%', height: '100%', display: 'block' }} />
      </At>
      {capture.pins.map((pin) => (
        <At
          key={pin.n}
          rect={{ x: image.x + pin.x * image.w - pinSize / 2, y: image.y + pin.y * image.h - pinSize / 2, w: pinSize, h: pinSize }}
          style={{ borderRadius: '50%', background: hex(DECK.blue), border: `${pt(1.5)} solid #FFFFFF`, display: 'grid', placeItems: 'center', fontSize: pt(pinSize < 180000 ? TYPE.pin - 1 : TYPE.pin), fontWeight: 700 }}
          aria-hidden="true"
        >
          {pin.n}
        </At>
      ))}
      {layout.beside !== null && slide.under?.kind === 'findings' && <StoryList rect={layout.beside} title={slide.findingsLabel} lines={slide.under.lines} size={TYPE.small} />}
      {layout.beside === null &&
        layout.under !== null &&
        slide.under !== null &&
        (slide.under.kind === 'findings' ? (
          <StoryList rect={layout.under} title={slide.findingsLabel} lines={slide.under.lines} size={TYPE.body} />
        ) : slide.under.visual.kind === 'bars' ? (
          <BarChart visual={slide.under.visual} rect={layout.under} />
        ) : (
          <TableBlock visual={slide.under.visual} rect={layout.under} />
        ))}
      <KpiCards kpis={slide.kpis} rects={layout.kpis} size={captureKpiValueSize} />
      {layout.pins !== null && capture.pins.length > 0 && (
        <>
          <Heading rect={layout.pins}>{slide.pinsLabel}</Heading>
          <At rect={{ x: layout.pins.x, y: layout.pins.y + STORY_HEAD, w: layout.pins.w, h: layout.pins.h - STORY_HEAD }} style={text(TYPE.small)}>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: pt(5) }}>
              {capture.pins.map((pin) => (
                <li key={pin.n} data-deck-pin={pin.n}>
                  <strong style={{ color: hex(DECK.lightBlue) }}>{pin.n}</strong>
                  {'  '}
                  {pin.detail === undefined ? pin.label : <strong>{pin.label}</strong>}
                  {pin.detail !== undefined && <span style={{ color: hex(DECK.subtle) }}> {pin.detail}</span>}
                  {pin.capability !== undefined && <span style={{ color: hex(DECK.lime) }}> · {pin.capability}</span>}
                </li>
              ))}
            </ol>
          </At>
        </>
      )}
      {layout.findings !== null && slide.findings.length > 0 && <StoryList rect={layout.findings} title={slide.findingsLabel} lines={slide.findings} size={TYPE.small} />}
      {storyCards(slide).map((card, index) => {
        const rect = layout.cards[index];
        return rect === undefined ? null : <Band key={card.kind} rect={rect} label={card.label} lines={card.lines} fill={card.kind === 'value' ? DECK.panel : DECK.slate} accent={card.kind === 'value'} />;
      })}
    </>
  );
};

const Section = ({ slide }: { slide: SectionSlide }) => {
  const layout = sectionLayout({
    subtitle: slide.subtitle !== null,
    kpis: slide.kpis.length,
    assist: slide.assist.length > 0,
    primary: slide.visual === null ? 'none' : slide.visual.kind === 'table' ? 'table' : 'chart',
    findings: slide.findings.length > 0,
  });
  return (
    <>
      <Title>{slide.title}</Title>
      {layout.subtitle !== null && slide.subtitle !== null && (
        <At rect={layout.subtitle} style={text(TYPE.subtitle, { color: hex(DECK.subtle) })}>
          {slide.subtitle}
        </At>
      )}
      <KpiCards kpis={slide.kpis} rects={layout.kpis} />
      {layout.primary !== null &&
        (slide.visual?.kind === 'bars' ? (
          <BarChart visual={slide.visual} rect={layout.primary} />
        ) : slide.visual?.kind === 'table' ? (
          <TableBlock visual={slide.visual} rect={layout.primary} />
        ) : null)}
      {layout.side !== null && slide.findings.length > 0 && (
        <>
          <Heading rect={layout.side}>{slide.findingsLabel}</Heading>
          <At rect={{ x: layout.side.x, y: layout.side.y + 360000, w: layout.side.w, h: layout.side.h - 360000 }} style={text(TYPE.body)}>
            <Bullets lines={slide.findings} />
          </At>
        </>
      )}
      {layout.assist !== null && (
        <>
          <At rect={layout.assist} style={{ background: hex(DECK.slate), borderRadius: pt(6) }} />
          <At rect={{ x: layout.assist.x + 140000, y: layout.assist.y + 70000, w: layout.assist.w - 280000, h: 300000 }} style={text(TYPE.blockHead, { fontWeight: 700, color: hex(DECK.lime) })}>
            {slide.assistLabel}
          </At>
          <At rect={{ x: layout.assist.x + 140000, y: layout.assist.y + 380000, w: layout.assist.w - 280000, h: layout.assist.h - 440000 }} style={text(TYPE.small)}>
            <Bullets lines={slide.assist} size={TYPE.small} />
          </At>
        </>
      )}
    </>
  );
};

const RING_COLOURS = [DECK.green, DECK.lightBlue, DECK.pink] as const;

const Ring = ({ ring, rect, colour }: { ring: ExecutiveSlide['rings'][number]; rect: Rect; colour: string }) => {
  const size = Math.min(rect.w, rect.h - 420000);
  const disk = { x: rect.x + (rect.w - size) / 2, y: rect.y, w: size, h: size };
  // The PPTX's donut and blockArc presets, drawn as SVG: thickness 11 % of the size.
  const r = 50 - 11 / 2;
  const circumference = 2 * Math.PI * r;
  const share = ring.value === null ? 0 : Math.max(0, Math.min(100, ring.value));
  return (
    <>
      <At rect={disk}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
          {ring.value === null ? (
            <circle cx={50} cy={50} r={r} fill="none" stroke={hex(DECK.border)} strokeWidth={1.2} strokeDasharray="4 4" />
          ) : (
            <>
              <circle cx={50} cy={50} r={r} fill="none" stroke={hex(DECK.slate)} strokeWidth={11} />
              {share > 0 && (
                <circle
                  cx={50}
                  cy={50}
                  r={r}
                  fill="none"
                  stroke={hex(colour)}
                  strokeWidth={11}
                  strokeDasharray={`${(share / 100) * circumference} ${circumference}`}
                  transform="rotate(-90 50 50)"
                />
              )}
            </>
          )}
        </svg>
      </At>
      <At rect={disk} style={text(TYPE.execRing, { fontWeight: 700, display: 'grid', placeItems: 'center', padding: 0 })}>
        {ring.display}
      </At>
      <At rect={{ x: rect.x, y: disk.y + size + 60000, w: rect.w, h: 360000 }} style={text(TYPE.execRingLabel, { color: hex(DECK.subtle), textAlign: 'center' })}>
        {ring.label}
      </At>
    </>
  );
};

const Executive = ({ slide }: { slide: ExecutiveSlide }) => {
  const withAnswers = slide.rings.some((ring) => ring.answer !== undefined);
  const layout = executiveLayout(slide.numbers.length, withAnswers);
  return (
    <>
      <Title>{slide.title}</Title>
      <At rect={layout.subtitle} style={text(TYPE.subtitle, { color: hex(DECK.subtle) })}>
        {slide.subtitle}
      </At>
      {slide.verdict !== null && (
        <>
          <At rect={layout.verdict} style={{ background: hex(DECK.panel), borderRadius: pt(4) }} />
          <At rect={{ x: layout.verdict.x, y: layout.verdict.y, w: 60000, h: layout.verdict.h }} style={{ background: statusHex(slide.verdict.tone) }} />
          <At
            rect={{ ...layout.verdict, x: layout.verdict.x + 120000, w: layout.verdict.w - 120000 }}
            style={text(TYPE.body, { fontWeight: 700, color: statusHex(slide.verdict.tone), display: 'flex', alignItems: 'center' })}
          >
            {slide.verdict.text}
          </At>
        </>
      )}
      {slide.rings.map((ring, index) => {
        const rect = layout.rings[index];
        return rect === undefined ? null : <Ring key={ring.label} ring={ring} rect={rect} colour={RING_COLOURS[index % RING_COLOURS.length] as string} />;
      })}
      {/* 3.3.17: the question over each ring and its measured answer under it. */}
      {slide.rings.map((ring, index) => {
        const question = layout.questions[index];
        const answer = layout.answers[index];
        return (
          <React.Fragment key={`qa-${ring.label}`}>
            {question !== undefined && ring.question !== undefined && (
              <At rect={question} style={text(TYPE.blockHead, { fontWeight: 700, color: hex(DECK.lime), textAlign: 'center', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' })}>
                {ring.question}
              </At>
            )}
            {answer !== undefined && ring.answer !== undefined && (
              <At rect={answer} style={text(TYPE.small, { background: hex(DECK.panel), borderRadius: pt(3), padding: `${pt(5)} ${pt(6)}` })}>
                {ring.answer}
              </At>
            )}
          </React.Fragment>
        );
      })}
      {!withAnswers && <KpiCards kpis={slide.numbers} rects={layout.numbers} />}
      <At rect={layout.steps} style={{ background: hex(DECK.slate), borderRadius: pt(3) }} />
      <At rect={{ x: layout.steps.x + 120000, y: layout.steps.y + 90000, w: layout.steps.w - 240000, h: 340000 }} style={text(TYPE.blockHead, { fontWeight: 700, color: hex(DECK.lime) })}>
        {slide.stepsTitle}
      </At>
      <At rect={{ x: layout.steps.x + 120000, y: layout.steps.y + 460000, w: layout.steps.w - 240000, h: layout.steps.h - 520000 }} style={text(TYPE.small)}>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: pt(9) }}>
          {slide.steps.map((step, index) => (
            <li key={index}>
              <div style={{ fontSize: pt(TYPE.blockHead), fontWeight: 700 }}>
                <span style={{ color: hex(DECK.lime) }}>{index + 1}</span>
                {'  '}
                {step.title}
              </div>
              <div style={{ color: hex(DECK.subtle), marginTop: pt(2) }}>{step.body}</div>
            </li>
          ))}
        </ol>
      </At>
      <At rect={layout.note} style={text(TYPE.pin, { color: hex(DECK.subtle), display: 'flex', alignItems: 'flex-end' })}>
        {slide.note}
      </At>
    </>
  );
};

const Agenda = ({ slide }: { slide: AgendaSlide }) => {
  const half = Math.ceil(slide.items.length / 2);
  const gap = 320000;
  const colW = (CONTENT_W - gap) / 2;
  const colH = SLIDE_H - CONTENT_TOP - 520000;
  const column = (items: string[], start: number, x: number) => (
    <At rect={{ x, y: CONTENT_TOP, w: colW, h: colH }} style={text(TYPE.agenda)}>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: pt(8) }}>
        {items.map((item, index) => (
          <li key={index}>
            <strong style={{ color: hex(DECK.lime) }}>{start + index + 1}.</strong> {item}
          </li>
        ))}
      </ol>
    </At>
  );
  return (
    <>
      <Title>{slide.title}</Title>
      {column(slide.items.slice(0, half), 0, MARGIN)}
      {slide.items.length > half && column(slide.items.slice(half), half, MARGIN + colW + gap)}
    </>
  );
};

const Divider = ({ slide, dtLogo }: { slide: DividerSlide; dtLogo: string }) => {
  const ruleY = SLIDE_H * 0.52;
  const ruleW = SLIDE_W * 0.44;
  const dtW = 300000 * (800 / 142);
  return (
    <>
      <At rect={{ x: (SLIDE_W - ruleW) / 2, y: ruleY, w: ruleW, h: 26000 }} style={{ background: `linear-gradient(90deg, ${hex(DECK.purple)}, ${hex(DECK.blue)}, ${hex(DECK.green)})` }} />
      <At rect={{ x: MARGIN, y: ruleY - 900000, w: CONTENT_W, h: 820000 }} style={text(TYPE.dividerTitle, { fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' })} role="heading" aria-level={3}>
        {slide.title}
      </At>
      <At rect={{ x: MARGIN, y: ruleY + 120000, w: CONTENT_W, h: 520000 }} style={text(TYPE.dividerKicker, { color: hex(DECK.lime), textAlign: 'center' })}>
        {slide.kicker}
      </At>
      {dtLogo !== '' && (
        <At rect={{ x: SLIDE_W - MARGIN - dtW, y: 470000, w: dtW, h: 300000 }}>
          <img src={dtLogo} alt="Dynatrace" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </At>
      )}
    </>
  );
};

const Cover = ({ slide, art, dtLogo }: { slide: CoverSlide; art: TemplateArt; dtLogo: string }) => {
  const logoH = 560000;
  const logoW = logoH * (slide.customerLogoAspect ?? 2.6);
  return (
    <>
      {art.coverBackground !== undefined && <img src={art.coverBackground} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      {(art.coverLogo ?? dtLogo) !== '' && (
        <At rect={TEMPLATE_CHROME.coverLogo}>
          <img src={art.coverLogo ?? dtLogo} alt="Dynatrace" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </At>
      )}
      {art.neutral === true && (
        <At
          rect={{ x: TEMPLATE_CHROME.coverTitle.x, y: TEMPLATE_CHROME.coverTitle.y + TEMPLATE_CHROME.coverTitle.h + 80000, w: 1800000, h: 45720 }}
          style={{ background: hex(DECK.green) }}
        />
      )}
      <At rect={TEMPLATE_CHROME.coverTitle} style={text(TYPE.coverTitle, { fontWeight: 700, display: 'flex', alignItems: 'flex-end' })} role="heading" aria-level={3}>
        {slide.title}
      </At>
      <At rect={{ x: 438520, y: 3760000, w: 7200000, h: 1400000 }} style={text(TYPE.coverInfo)}>
        <div style={{ fontWeight: 700, marginBottom: pt(34) }}>{slide.engagement}</div>
        {slide.seLine !== null && <div style={{ fontSize: pt(TYPE.coverSe), fontWeight: 700 }}>{slide.seLine}</div>}
      </At>
      {slide.partnerLogo !== null && (
        <At rect={{ x: MARGIN, y: 440000, w: 520000 * (slide.partnerLogoAspect ?? 3), h: 520000 }}>
          <img src={slide.partnerLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </At>
      )}
      {slide.partnerLine !== null && (
        <At rect={{ x: 438520, y: SLIDE_H - 820000, w: 8000000, h: 320000 }} style={text(11, { fontWeight: 700, display: 'flex', alignItems: 'flex-end' })}>
          {slide.partnerLine}
        </At>
      )}
      <At rect={{ x: 438520, y: SLIDE_H - 470000, w: 8000000, h: 360000 }} style={text(TYPE.coverNote, { color: hex(DECK.subtle), display: 'flex', alignItems: 'flex-end' })}>
        {slide.note}
      </At>
      {slide.customerLogo !== null && (
        <At rect={{ x: SLIDE_W - MARGIN - logoW, y: SLIDE_H - MARGIN - logoH, w: logoW, h: logoH }}>
          <img src={slide.customerLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </At>
      )}
    </>
  );
};

const End = ({ slide, art }: { slide: EndSlide; art: TemplateArt }) => (
  <>
    {art.endBackground !== undefined && <img src={art.endBackground} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
    {art.neutral === true ? (
      <At rect={{ x: SLIDE_W * 0.35, y: SLIDE_H / 2, w: SLIDE_W * 0.3, h: 45720 }} style={{ background: `linear-gradient(90deg, ${hex(DECK.purple)}, ${hex(DECK.blue)}, ${hex(DECK.green)})` }} />
    ) : (
      <At rect={TEMPLATE_CHROME.endBox} style={{ background: '#FFFFFF', borderRadius: pt(8) }} />
    )}
    {art.endLogo !== undefined && (
      <At rect={TEMPLATE_CHROME.endLogo}>
        <img src={art.endLogo} alt="Dynatrace" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </At>
    )}
    {art.endText !== undefined && (
      <At rect={TEMPLATE_CHROME.endText} style={text(14, { color: '#00092F', textAlign: 'center', letterSpacing: pt(1.5) })}>
        {art.endText}
      </At>
    )}
    {slide.partnerLogo !== null && (
      <At rect={{ x: MARGIN, y: 440000, w: 520000 * (slide.partnerLogoAspect ?? 3), h: 520000 }}>
        <img src={slide.partnerLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </At>
    )}
  </>
);

/** The words a slide is announced by, for the preview's list. */
function slideName(slide: DeckSlide): string {
  switch (slide.kind) {
    case 'cover':
    case 'agenda':
    case 'executive':
    case 'divider':
    case 'section':
    case 'capture':
      return slide.title;
    case 'print':
    case 'analysis':
    case 'story':
    case 'methodology':
      return slide.title;
    case 'end':
      return 'Dynatrace';
  }
}

export interface DeckPreviewProps {
  spec: DeckSpec;
  art: TemplateArt;
  /** The Dynatrace logo for the dark slides (white). */
  dtLogo: string;
  /** "Slide {n} of {total}: {title}" (already translated). */
  slideLabel: (n: number, total: number, title: string) => string;
}

export const DeckPreview = ({ spec, art, dtLogo, slideLabel }: DeckPreviewProps) => {
  const total = spec.slides.length;
  return (
    <ol className="pvs-deck" style={{ display: 'grid', gap: 24, margin: 0, padding: 0, listStyle: 'none' }}>
      {spec.slides.map((slide, index) => {
        const dark = slide.kind !== 'cover' && slide.kind !== 'end';
        return (
          <li key={index} data-wrap-slide data-slide-kind={slide.kind} aria-label={slideLabel(index + 1, total, slideName(slide))}>
            <div
              style={{
                position: 'relative',
                aspectRatio: '16 / 9',
                containerType: 'inline-size',
                overflow: 'hidden',
                borderRadius: 12,
                border: `1px solid ${hex(DECK.border)}`,
                background:
                  slide.kind === 'cover' || slide.kind === 'end'
                    ? art.neutral === true
                      ? // The neutral template's own background (3.3.5, `neutralTemplate.ts`).
                        `linear-gradient(135deg, ${hex(DECK.purple)}, ${hex(DECK.blue)} 55%, ${hex(DECK.ink)})`
                      : `linear-gradient(135deg, ${hex(DECK.pink)}, ${hex(DECK.purple)} 30%, ${hex(DECK.blue)} 65%, ${hex(DECK.green)})`
                    : hex(TEMPLATE_CHROME.background),
                fontFamily: FONT,
                color: '#FFFFFF',
              }}
            >
              {slide.kind === 'cover' && <Cover slide={slide} art={art} dtLogo={dtLogo} />}
              {slide.kind === 'agenda' && <Agenda slide={slide} />}
              {slide.kind === 'executive' && <Executive slide={slide} />}
              {slide.kind === 'divider' && <Divider slide={slide} dtLogo={dtLogo} />}
              {slide.kind === 'section' && <Section slide={slide} />}
              {slide.kind === 'capture' && <CaptureView slide={slide} />}
              {slide.kind === 'end' && <End slide={slide} art={art} />}
              {isPrintDeckSlide(slide) && <PrintDeckSlideView slide={slide} />}
              {dark && <Chrome confidential={spec.confidential} number={index + 1} art={art} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
