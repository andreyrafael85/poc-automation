import { PRINT_SPACE } from '../constants';
import { IDENTITY_KEY, LAYOUTS, LUPA_MAX_PX, defaultFocus, identityFound } from '../plan/pinTemplates';
import { LAYOUT_OF } from '../plan/planner';
import { parseUiNumber, printText } from '../text';
import type { LayoutKey, ManifestAnchor, ManifestMask, MaskRect, PrintRecord, Rect, ScreenNumber, ShotSlot } from '../types';
import { kindOfShotId } from './manifest';
import { placeRect, type Placement } from './normalize';

/**
 * The parts of a `PrintRecord` every capture path shares (3.2.7): the companion import, the
 * manual intake and the guided tab capture all bind a master image to a slot of the plan, and
 * they must agree on the print's id, on what is copied from the slot, on how the companion's crop
 * pixels land in the print, and on the default lupa. Pure, apart from the random print id.
 */

/** A print's id: `pr-` and 16 hex (`img/<id>.<sha8>.jpg` in the images document); defined next to that name. */
export { PRINT_ID } from './zipDirectory';

/** Smallest mask the editor keeps (8×8, spec §7.2); smaller suggestions are noise. */
export const MIN_MASK_PX = 8;

export function newPrintId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return `pr-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** Path, query and hash of an address — never its origin. Null when it does not parse. */
export function pathOf(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || url === '') return null;
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/** Same as `pathOf`, but only for an address on this tenant (an off-tenant landing keeps nothing). */
export function tenantPathOf(url: string | null | undefined, tenantHost: string): string | null {
  if (typeof url !== 'string' || url === '') return null;
  try {
    return new URL(url).host.toLowerCase() === tenantHost.toLowerCase() ? pathOf(url) : null;
  } catch {
    return null;
  }
}

/** A rectangle kept inside the print. */
export function clampRect(rect: Rect): Rect {
  const x = Math.min(PRINT_SPACE.width, Math.max(0, rect.x));
  const y = Math.min(PRINT_SPACE.height, Math.max(0, rect.y));
  return { x, y, w: Math.max(0, Math.min(PRINT_SPACE.width - x, rect.w)), h: Math.max(0, Math.min(PRINT_SPACE.height - y, rect.h)) };
}

/** The companion's anchor hits in print pixels (the raw on-screen label is never kept). */
export function anchorsInPrint(anchors: readonly ManifestAnchor[], placement: Placement): PrintRecord['anchors'] {
  return anchors.flatMap((anchor) => {
    const rect = placeRect({ x: anchor.x, y: anchor.y, w: anchor.width, h: anchor.height }, placement);
    return rect === null ? [] : [{ key: anchor.key, hit: anchor.hit ?? 0, rect }];
  });
}

/** The companion's mask suggestions in print pixels, at least 8×8 (the matched text never left the page). */
export function suggestionsInPrint(masks: readonly ManifestMask[], placement: Placement): MaskRect[] {
  return masks.flatMap((mask) => {
    const rect = placeRect({ x: mask.x, y: mask.y, w: mask.width, h: mask.height }, placement);
    if (rect === null) return [];
    const grown = clampRect({ x: rect.x, y: rect.y, w: Math.max(rect.w, MIN_MASK_PX), h: Math.max(rect.h, MIN_MASK_PX) });
    return [{ ...grown, reason: mask.reason }];
  });
}

/** The numbers the companion read next to each anchor hit, parsed ('1.25K' → 1250); hits with none are left out. */
export function screenNumbersOf(anchors: readonly ManifestAnchor[]): ScreenNumber[] {
  return anchors.flatMap((anchor) => {
    const values = (anchor.numbers ?? []).map(parseUiNumber).filter((value): value is number => value !== null);
    return values.length === 0 ? [] : [{ anchorKey: anchor.key, hit: anchor.hit ?? 0, values }];
  });
}

/**
 * The default lupa: the layout's region, moved (never wider than `LUPA_MAX_PX`, never beyond the
 * print) so it contains the hit of the anchor its pin sits on, when that hit was found. Null for a
 * layout without a lupa.
 */
export function initialFocus(layout: LayoutKey, anchors: PrintRecord['anchors']): Rect | null {
  const base = defaultFocus(layout);
  const lupa = LAYOUTS[layout].lupa;
  if (base === null || lupa === null) return base;
  const key = LAYOUTS[layout].pins.find((pin) => pin.n === lupa.pin)?.anchor?.key ?? null;
  const hit = key === null ? undefined : [...anchors].filter((anchor) => anchor.key === key).sort((a, b) => a.hit - b.hit)[0];
  if (hit === undefined) return base;
  // Grown to the hit's width, up to the widest lupa (520 px).
  const w = Math.max(base.w, Math.min(LUPA_MAX_PX, hit.rect.w));
  const h = Math.max(base.h, Math.min(PRINT_SPACE.height, hit.rect.h));
  let x = base.x;
  let y = base.y;
  // The end of the hit first, then its start, so a hit wider than the lupa keeps its beginning.
  if (hit.rect.x + hit.rect.w > x + w) x = hit.rect.x + hit.rect.w - w;
  if (hit.rect.x < x) x = hit.rect.x;
  if (hit.rect.y + hit.rect.h > y + h) y = hit.rect.y + hit.rect.h - h;
  if (hit.rect.y < y) y = hit.rect.y;
  x = Math.min(PRINT_SPACE.width - w, Math.max(0, x));
  y = Math.min(PRINT_SPACE.height - h, Math.max(0, y));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/** True when the layout's identity anchor was found inside its zone ("Tela verificada"). */
export function identityOf(layout: LayoutKey, anchors: PrintRecord['anchors']): PrintRecord['identity'] {
  return identityFound(layout, anchors.filter((anchor) => anchor.key === IDENTITY_KEY)) ? 'anchor' : 'none';
}

/** What a print copies from its slot. */
export type SlotFields = Pick<PrintRecord, 'slotId' | 'kind' | 'layout' | 'titleText' | 'entity' | 'subject' | 'incident' | 'linkEvidence' | 'requestedPath'>;

export function slotFields(slot: ShotSlot): SlotFields {
  return {
    slotId: slot.id,
    kind: slot.kind,
    layout: slot.layout,
    titleText: slot.titleText,
    entity: { id: slot.chosen?.entityId ?? null, name: slot.chosen?.entityName ?? null },
    subject: slot.subject,
    incident: slot.incident,
    linkEvidence: slot.chosen?.evidence ?? 'manual',
    requestedPath: pathOf(slot.chosen?.url) ?? '',
  };
}

/**
 * What a print outside the plan (an orphan of an import) carries until the SE uses it in a slot:
 * its own shot id as the slot id (which matches no planned slot), the kind its id names, and its
 * title as written in the shot list — redacted, as any text that came back from a file.
 */
export function orphanFields(shot: { id: string; title: string; requestedUrl: string }): SlotFields {
  const kind = kindOfShotId(shot.id);
  return {
    slotId: shot.id,
    kind,
    layout: LAYOUT_OF[kind],
    titleText: { key: 'prt.title.custom', params: { title: printText(shot.title, 120, 'se') } },
    entity: { id: null, name: null },
    subject: { kind: 'none' },
    incident: null,
    linkEvidence: 'manual',
    requestedPath: pathOf(shot.requestedUrl) ?? '',
  };
}

/**
 * A print moved to another slot by the SE: it takes that slot's fields and keeps its own pixels,
 * masks and anchors. Whatever proved the old slot's screen proves nothing about the new one, so
 * the identity falls back to `none` (the SE confirms it) and the approval is withdrawn; another
 * layout also means other pins and another lupa.
 */
export function reboundTo(record: PrintRecord, slot: ShotSlot | null, slotId: string, nowIso: string): PrintRecord {
  if (record.slotId === slotId) return record;
  const fields = slot === null ? { slotId } : slotFields(slot);
  const layoutChanged = slot !== null && slot.layout !== record.layout;
  return {
    ...record,
    ...fields,
    ...(layoutChanged ? { pins: [], focus: initialFocus(slot.layout, record.anchors) } : {}),
    identity: 'none',
    approval: null,
    matchedBy: 'rebound',
    edited: true,
    updatedAtIso: nowIso,
  };
}
