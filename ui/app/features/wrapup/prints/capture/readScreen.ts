import { IDENTITY_KEY, LAYOUTS, resolveAnchors, type AnchorFacts } from '../plan/pinTemplates';
import type { PrintRecord } from '../types';
import { locateLabels, type Gray, type LabelTarget, type TemplateRenderer } from './locate';
import { decodeImage, newSurface } from './raster';

/**
 * 3.5.5 — the automatic reading of a print the SE (or a partner) added by hand (`locate.ts`): the labels each pin of
 * its layout belongs to are looked for in the picture, and the ones found become the print's anchors — the same
 * anchors the retired companion recorded, so the pins snap to them through the existing pipeline (`analysis/pins.ts`)
 * and a print whose identity text was found is verified without the SE's tick. Runs in the background after the
 * print is added (and once for an older print that was never read); nothing leaves the browser.
 */

/**
 * Marks a print whose screen was read once (`PrintRecord.warnings`), found anything or not: it is not read again.
 * 3.5.6: `v2` — 3.5.5 drew its templates in a fallback face (it asked for "DT Flow", a family the platform does not
 * load; the platform's face is `DynatraceFlow`), so a print read by 3.5.5 is read again, once, and its anchors replaced.
 */
export const SCREEN_READ = 'screen-read:v2';

/** The 3.5.5 marker: a print carrying it (and not `SCREEN_READ`) was read in the fallback face and is read again. */
export const SCREEN_READ_V1 = 'screen-read';

/** What the labels of this print's screen say, from what the print knows of its entity and incident. */
export function factsOf(record: Pick<PrintRecord, 'entity' | 'incident' | 'subject'>): AnchorFacts {
  const name = record.entity.name;
  const subject = record.subject;
  return {
    entityName: name,
    displayId: record.incident?.displayId ?? null,
    frontendName: subject.kind === 'frontend' ? name : null,
    clusterName: subject.kind === 'k8s-cluster' ? subject.clusterName : null,
    rootName: record.incident?.rootCauseName ?? null,
    hubName: name,
    firstRootEventName: null,
  };
}

/** The texts to look for and where, for a print of this layout. */
export function targetsOf(record: Pick<PrintRecord, 'layout' | 'entity' | 'incident' | 'subject'>): LabelTarget[] {
  const layout = LAYOUTS[record.layout];
  const zones = new Map<string, LabelTarget['zone']>();
  if (layout.identity !== null) zones.set(IDENTITY_KEY, layout.identity.zone);
  for (const pin of layout.pins) {
    if (pin.anchor !== null && !zones.has(pin.anchor.key)) zones.set(pin.anchor.key, pin.anchor.zone);
  }
  const pinned = new Set(layout.pins.flatMap((pin) => (pin.anchor === null ? [] : [pin.anchor.key])));
  return resolveAnchors(record.layout, factsOf(record)).flatMap((anchor) => {
    const zone = zones.get(anchor.key);
    // Very short texts ("CPU") repeat across a screen; the zone keeps them honest, and the global pass is stricter.
    if (zone === undefined) return [];
    const target: LabelTarget = { key: anchor.key, texts: anchor.match.filter((text) => text.trim().length >= 2), zone };
    // The identity verifies the screen; unless a pin points at it, it may sit on a pin's label.
    return [anchor.key === IDENTITY_KEY && !pinned.has(IDENTITY_KEY) ? { ...target, shares: true } : target];
  });
}

/**
 * The platform's typeface first — Strato's `AppRoot` loads it as `DynatraceFlow` (weights 200–600 and 900), the face
 * the screenshot was drawn in —, then the deck's embedded DTFlow, then Strato's own fallbacks.
 */
export const SCREEN_FONT_FAMILY = 'DynatraceFlow';
export const SCREEN_FONT_STACK = `${SCREEN_FONT_FAMILY}, DTFlow, Roboto, Helvetica, Arial, sans-serif`;

/** Draws text dark on light with a canvas and crops it to its ink (the template `locateLabels` slides). */
export function canvasRenderer(family: string = SCREEN_FONT_STACK): TemplateRenderer {
  const cache = new Map<string, Gray | null>();
  return (text, px, weight) => {
    const key = `${weight}|${px}|${text}`;
    const known = cache.get(key);
    if (known !== undefined) return known;
    const measure = newSurface(4, 4);
    const font = `${weight} ${px}px ${family}`;
    const width = Math.ceil(measure.measureText(text, font)) + 8;
    const height = Math.ceil(px * 1.6) + 8;
    const surface = newSurface(width, height);
    surface.fillRect(0, 0, width, height, '#ffffff');
    surface.fillText(text, 4, 4, font, '#000000');
    const gray = surface.gray();
    let x0 = width;
    let y0 = height;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if ((gray[y * width + x] ?? 255) < 200) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) {
      cache.set(key, null);
      return null;
    }
    x0 = Math.max(0, x0 - 2);
    y0 = Math.max(0, y0 - 2);
    x1 = Math.min(width - 1, x1 + 2);
    y1 = Math.min(height - 1, y1 + 2);
    const tw = x1 - x0 + 1;
    const th = y1 - y0 + 1;
    const data = new Uint8ClampedArray(tw * th);
    for (let y = 0; y < th; y += 1) for (let x = 0; x < tw; x += 1) data[y * tw + x] = gray[(y + y0) * width + x + x0] ?? 255;
    const template = { data, width: tw, height: th };
    cache.set(key, template);
    return template;
  };
}

/** Waits for the platform's typeface, so the templates are drawn in it (a fallback font matches less well). */
async function fontsReady(): Promise<void> {
  const fonts = (globalThis.document as Document | undefined)?.fonts;
  if (fonts === undefined) return;
  try {
    await Promise.all([400, 500, 600].map((weight) => fonts.load(`${weight} 14px ${SCREEN_FONT_FAMILY}`)));
  } catch {
    // A font that does not load leaves the fallback; the reading goes on.
  }
}

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * The anchors found in a print's picture (print space, the master is 1720×1080). Empty when the browser cannot draw
 * (tests, an old browser) or nothing was found with confidence.
 */
export async function readScreen(master: Blob, record: Pick<PrintRecord, 'layout' | 'entity' | 'incident' | 'subject'>): Promise<PrintRecord['anchors']> {
  const targets = targetsOf(record);
  if (targets.length === 0) return [];
  let image;
  try {
    image = await decodeImage(master);
  } catch {
    return [];
  }
  try {
    const surface = newSurface(image.width, image.height);
    surface.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
    await fontsReady();
    const hits = await locateLabels({ data: surface.gray(), width: image.width, height: image.height }, targets, canvasRenderer(), { yieldEvery: pause });
    return hits.map((hit) => ({ key: hit.key, hit: hit.hit, rect: hit.rect }));
  } catch {
    return [];
  } finally {
    image.close();
  }
}
