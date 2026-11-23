import type { PrintRecord } from '../types';
import { hashFocus, hashMasks } from './bake';

/**
 * "Aprovado para o cliente" (3.2.7, spec §7.2 and §7.3).
 *
 * An approval is not a flag: it is bound to the exact image (its SHA-256), the masks, the focus
 * and whether the lupa shows it, as they were when the SE approved, and it is recomputed on every
 * read — move a mask, move or switch the lupa, or replace the image and the print is no longer
 * approved (`prt.ap.revoked`), without anyone having to remember to clear it.
 *
 * While a blocker remains the editor does not render the switch at all (no disabled control); it
 * shows the blocker's text instead:
 * - suggested masks still pending review (`prt.ap.pending`);
 * - an unverified screen the SE has not confirmed (`prt.ap.identity`, "Esta é a tela de {nome}");
 * - the privacy checklist not ticked (`prt.ap.checklist`);
 * - a companion print whose landing was not `ok`;
 * The pins never block an approval (3.5.5, owner: partners do not know the platform's screens as an SE does): the
 * automatic reading places them on the labels it finds (`capture/readScreen.ts`), a pin it could not place is not
 * drawn (its reading becomes an unnumbered line), and the SE may still place or move pins in the editor.
 */

export type ApprovalBlocker = 'pending-suggestions' | 'identity-unconfirmed' | 'checklist' | 'landing-not-ok';

/** The pins the editor's progress line counts toward (the deck reads best with 4–5). */
export const MIN_CONFIRMED_PINS = 3;

/** The pins the deck will draw, split by whether the SE placed or confirmed them. */
export function pinStatus(record: Pick<PrintRecord, 'pins'>): { confirmed: number; estimated: number } {
  const shown = record.pins.filter((pin) => pin.hidden !== true);
  const estimated = shown.filter((pin) => pin.origin === 'template').length;
  return { confirmed: shown.length - estimated, estimated };
}

/** Marks a record whose stored master no longer matches its SHA-256 (set by the store; such a print stays out of the deck). */
export const CORRUPT = 'corrupt';

export function approvalBlockers(record: PrintRecord, checklistTicked: boolean): ApprovalBlocker[] {
  const blockers: ApprovalBlocker[] = [];
  if (record.maskSuggestions.length > 0) blockers.push('pending-suggestions');
  if (record.identity === 'none') blockers.push('identity-unconfirmed');
  if (!checklistTicked) blockers.push('checklist');
  if (record.source === 'companion' && record.landing !== 'ok') blockers.push('landing-not-ok');
  return blockers;
}

/** The record approved now, bound to its image, masks, focus and lupa. Throws while a blocker other than the checklist remains. */
export async function approve(record: PrintRecord, nowIso: string = new Date().toISOString()): Promise<PrintRecord> {
  const blockers = approvalBlockers(record, true);
  if (blockers.length > 0) throw new Error(`cannot approve: ${blockers.join(', ')}`);
  const [masksHash, focusHash] = await Promise.all([hashMasks(record.masks), hashFocus(record.focus, record.lupaOn)]);
  return { ...record, approval: { atIso: nowIso, imageSha: record.image.sha256, masksHash, focusHash }, updatedAtIso: nowIso };
}

/** The record with its approval withdrawn. */
export function revoke(record: PrintRecord, nowIso: string = new Date().toISOString()): PrintRecord {
  return record.approval === null ? record : { ...record, approval: null, updatedAtIso: nowIso };
}

/**
 * True only when the approval still matches the image, the masks and the focus, recomputed now;
 * and the print is not corrupt and has no blocker left. `actualImageSha` is the SHA-256 of the
 * master's bytes when the caller has read them.
 */
export async function isApproved(record: PrintRecord, actualImageSha?: string): Promise<boolean> {
  const approval = record.approval;
  if (approval === null || record.warnings.includes(CORRUPT)) return false;
  if (approval.imageSha !== record.image.sha256) return false;
  if (actualImageSha !== undefined && actualImageSha !== approval.imageSha) return false;
  if (approvalBlockers(record, true).length > 0) return false;
  const [masksHash, focusHash] = await Promise.all([hashMasks(record.masks), hashFocus(record.focus, record.lupaOn)]);
  return masksHash === approval.masksHash && focusHash === approval.focusHash;
}

/** none: never approved; approved: still bound; revoked: approved once, but the image, masks or focus changed since. */
export async function approvalState(record: PrintRecord, actualImageSha?: string): Promise<'none' | 'approved' | 'revoked'> {
  if (record.approval === null) return 'none';
  return (await isApproved(record, actualImageSha)) ? 'approved' : 'revoked';
}
