import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { StringKey } from '../../../../i18n/strings';
import type { Translation } from '../../../../i18n/useTranslation';
import { CORRUPT, isApproved } from '../capture/approval';
import { canonicalMasks } from '../capture/bake';
import { IntakeError } from '../capture/intake';
import { KIND_TEXT_KEY, LIMITS, SHOT_ID } from '../constants';
import { isUsablePrint } from '../evidence/plan';
import { latestLinkCheck, linkStatus } from '../plan/linkChecks';
import { NO_OVERRIDES, type CustomShot, type PlanOverrides } from '../plan/planner';
import { STORE_REASON } from '../store/printSetGuards';
import { StoreError } from '../store/printStore';
import type { LinkCheck, LinkEvidenceLevel, PrintRecord, ShotSlot } from '../types';

/**
 * Small pieces the real-prints tab (3.2.7, "Teste Deck Wrapup Print") shares between its panels:
 * the status of a planned screen, whether a print may stand in the customer deck, the SE's plan
 * choices (kept in this browser), the approval of each print recomputed against its hashes, and a
 * file download that keeps its object URL alive until it is replaced.
 */

// ------------------------------------------------------------------ texts of a slot

export const titleOf = (slot: Pick<ShotSlot, 'titleText'>, t: Translation['t']): string => t(slot.titleText.key, slot.titleText.params);

export const whatOf = (kind: ShotSlot['kind'], t: Translation['t']): string => t(`prt.what.${KIND_TEXT_KEY[kind]}`);

export const fallbackHeadlineOf = (kind: ShotSlot['kind'], t: Translation['t']): string => t(`prt.headline.${KIND_TEXT_KEY[kind]}`);

/** The name a print is checked against ("Esta é a tela de {name}"): the entity, else the screen's title. */
export function screenNameOf(record: Pick<PrintRecord, 'entity' | 'titleText'>, t: Translation['t']): string {
  const name = record.entity.name?.trim() ?? '';
  return name !== '' ? name : t(record.titleText.key, record.titleText.params);
}

export const VIA_KEY = { companion: 'prt.via.companion', 'tab-capture': 'prt.via.tabCapture', manual: 'prt.via.manual' } as const satisfies Record<
  PrintRecord['source'],
  StringKey
>;

/**
 * The evidence level of a link as a chip text: "verificado nesta tenant em {date}" when this
 * tenant opened the address shape fine in the last 30 days (a probe, or a capture).
 *
 * The planner has already lifted an observed or documented address to `verified` once such a check
 * exists (`applyLinkChecks`), so the level that arrives here is the lifted one: it is the `ok`
 * check of the shape, not the level, that tells "verified on this tenant on {date}" apart.
 */
export function evidenceText(
  level: LinkEvidenceLevel,
  templateKey: string,
  checks: readonly LinkCheck[],
  now: number,
  t: Translation['t'],
  formatDay: Translation['formatDay'],
): string {
  const status = linkStatus(level, templateKey, checks, now);
  const check = status.check;
  if (check !== null && check.status === 'ok' && (status.effect === 'upgraded' || level === 'verified')) {
    return t('prt.ev.verifiedHere', { date: formatDay(check.checkedAtIso.slice(0, 10)) });
  }
  return t(`prt.ev.${level}`);
}

/** Why a slot is out of the plan, with the probe's day when the probe took it out. */
export function omittedText(slot: ShotSlot, checks: readonly LinkCheck[], now: number, t: Translation['t'], formatDay: Translation['formatDay']): string {
  if (slot.omittedReason === null) return '';
  if (slot.omittedReason === 'prt.why.none.probeFailed') {
    const check = latestLinkCheck(slot.urlTemplateKey, checks, now);
    return t('prt.why.none.probeFailed', { date: check === null ? '—' : formatDay(check.checkedAtIso.slice(0, 10)) });
  }
  return t(slot.omittedReason);
}

// ------------------------------------------------------------------ print rules

/** The companion's statuses that mean the screen was never reached: such a print never enters a deck. */
const FAILED_LANDING: ReadonlySet<PrintRecord['landing']> = new Set(['session_lost', 'unresolved_link', 'unexpected_page', 'error', 'skipped']);

export const isFailedLanding = (record: Pick<PrintRecord, 'landing'>): boolean => FAILED_LANDING.has(record.landing);

export const isCorrupt = (record: Pick<PrintRecord, 'warnings'>): boolean => record.warnings.includes(CORRUPT);

/** A print the deck may show at all: reached its screen (companion ok, or manual/guided) and its bytes check out. */
export const isDeckPrint = (record: PrintRecord): boolean => isUsablePrint(record) && !isCorrupt(record);

/**
 * The screen identity the customer deck accepts: found on screen (`anchor`), or confirmed by the SE.
 * A probe-only address the SE forced into the plan was never opened here, so only the on-screen
 * anchor proves it.
 */
export function identityOk(record: Pick<PrintRecord, 'identity'>, slot: Pick<ShotSlot, 'forced'> | null): boolean {
  if (record.identity === 'anchor') return true;
  return record.identity === 'se-confirmed' && slot?.forced !== true;
}

/** Older than this, a print is labelled outdated (kept, never dropped). */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export const isStale = (record: Pick<PrintRecord, 'capturedAtIso'>, now: number): boolean => {
  const at = Date.parse(record.capturedAtIso);
  return Number.isFinite(at) && now - at > STALE_AFTER_MS;
};

export type SlotStatus = 'planned' | 'queued' | 'review' | 'captured' | 'ready' | 'approved' | 'stale' | 'failed' | 'probeOnly' | 'omitted';

/**
 * Where a planned screen stands. Out of the plan: omitted (no screen, or unticked) or "Só probe".
 * Without a print: planned, waiting for the ZIP once its shot list was downloaded, or failed when
 * this tenant's last check of its address landed elsewhere. With a print: failed (screen not
 * reached, or bytes that do not match), approved, outdated (> 7 days), to review (masks suggested
 * or the screen not verified) or ready to approve.
 */
export function slotStatus(slot: ShotSlot, record: PrintRecord | null, approved: boolean, queued: ReadonlySet<string>, checks: readonly LinkCheck[], now: number): SlotStatus {
  if (slot.chosen === null) return 'omitted';
  if (!slot.included) return slot.probeOnly ? 'probeOnly' : 'omitted';
  if (record !== null) {
    if (isFailedLanding(record) || isCorrupt(record)) return 'failed';
    if (approved) return 'approved';
    if (isStale(record, now)) return 'stale';
    if (record.maskSuggestions.length > 0 || record.identity === 'none') return 'review';
    return 'ready';
  }
  const check = latestLinkCheck(slot.urlTemplateKey, checks, now);
  if (check !== null && check.status !== 'ok') return 'failed';
  return queued.has(slot.id) ? 'queued' : 'planned';
}

export const STATUS_COLOR: Readonly<Record<SlotStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'critical'>> = {
  planned: 'neutral',
  queued: 'neutral',
  review: 'warning',
  captured: 'primary',
  ready: 'primary',
  approved: 'success',
  stale: 'warning',
  failed: 'critical',
  probeOnly: 'neutral',
  omitted: 'neutral',
};

/** The text of a refused manual print: the file and why, or the store's reason (full, 16 prints). */
export function intakeErrorText(error: unknown, fallbackName: string, t: Translation['t']): string {
  if (error instanceof IntakeError) return t('prt.err.file', { name: error.fileName === '' ? fallbackName : error.fileName, why: t(error.whyKey) });
  if (error instanceof StoreError) {
    const kind = error.kind;
    return t(kind === 'full' || kind === 'limit' || kind === 'forbidden' || kind === 'too-large' ? STORE_REASON[kind] : STORE_REASON.error);
  }
  return t('prt.err.file', { name: fallbackName, why: t('prt.err.file.decode') });
}

// ------------------------------------------------------------------ approvals, recomputed against the hashes

/** Everything an approval depends on: a print whose signature moved is "not approved" until recomputed. */
export function approvalSignature(record: PrintRecord): string {
  const approval = record.approval;
  return [
    record.id,
    approval === null ? '-' : `${approval.atIso}|${approval.imageSha}|${approval.masksHash}|${approval.focusHash}`,
    record.image.sha256,
    canonicalMasks(record.masks),
    JSON.stringify(record.focus),
    record.warnings.join(','),
    String(record.maskSuggestions.length),
    record.identity,
    record.landing,
    record.source,
  ].join('#');
}

export interface Approvals {
  /** True only when the approval still holds for the record as it is now (a stale answer reads false). */
  isApproved(record: PrintRecord): boolean;
  /**
   * True once the answer for the record as it is now is in (the hashes are recomputed
   * asynchronously). Until then the UI does not claim the approval was withdrawn.
   */
  isSettled(record: PrintRecord): boolean;
}

/**
 * `isApproved` for every print, recomputed whenever a print's image, masks, focus or approval
 * changes (it hashes asynchronously). An answer computed for an older state of a print is never
 * used for the new one: until the new hash is in, the print reads "not approved".
 */
export function useApprovals(records: readonly PrintRecord[]): Approvals {
  const [answers, setAnswers] = useState<ReadonlyMap<string, { signature: string; approved: boolean }>>(new Map());
  const signatures = records.map((record) => approvalSignature(record));
  const key = signatures.join('\n');
  const latest = useRef(records);
  latest.current = records;

  useEffect(() => {
    let alive = true;
    const current = latest.current;
    void Promise.all(
      current.map(async (record) => {
        let approved = false;
        try {
          approved = await isApproved(record);
        } catch {
          approved = false;
        }
        return [record.id, { signature: approvalSignature(record), approved }] as const;
      }),
    ).then((entries) => {
      if (alive) setAnswers(new Map(entries));
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return useMemo(
    () => ({
      isApproved: (record: PrintRecord) => {
        const answer = answers.get(record.id);
        return answer !== undefined && answer.approved && answer.signature === approvalSignature(record);
      },
      isSettled: (record: PrintRecord) => answers.get(record.id)?.signature === approvalSignature(record),
    }),
    [answers],
  );
}

// ------------------------------------------------------------------ the SE's plan choices

export interface PlanState {
  overrides: PlanOverrides;
  /** The incident the plan is centred on ("Trocar entidade" on the problem), by display id; null = the most impactful. */
  preferredIncident: string | null;
}

export const EMPTY_PLAN_STATE: PlanState = { overrides: NO_OVERRIDES, preferredIncident: null };

const PLAN_STATE_VERSION = 'pvs.prints.plan.v1';

const strings = (value: unknown, max: number): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && SHOT_ID.test(item)).slice(0, max) : [];

/** A stored plan state, checked field by field; anything malformed falls back to the default. */
export function parsePlanState(raw: unknown): PlanState {
  if (raw === null || typeof raw !== 'object') return EMPTY_PLAN_STATE;
  const value = raw as Record<string, unknown>;
  const overrides = (value.overrides ?? {}) as Record<string, unknown>;
  const swapped: Record<string, string> = {};
  if (overrides.swapped !== null && typeof overrides.swapped === 'object') {
    for (const [slot, entity] of Object.entries(overrides.swapped as Record<string, unknown>)) {
      if (typeof entity === 'string' && entity.length <= 120 && slot.length <= 64) swapped[slot] = entity;
    }
  }
  const custom: CustomShot[] = Array.isArray(overrides.custom)
    ? (overrides.custom as unknown[])
        .flatMap((item): CustomShot[] => {
          if (item === null || typeof item !== 'object') return [];
          const { url, titleRaw } = item as Record<string, unknown>;
          if (typeof url !== 'string' || url.length > 2048 || typeof titleRaw !== 'string') return [];
          const title = titleRaw.slice(0, 70);
          return [{ url, titleText: { key: 'prt.title.custom', params: { title } }, titleRaw: title, layout: 'free' }];
        })
        .slice(0, LIMITS.customSlots)
    : [];
  const preferred = typeof value.preferredIncident === 'string' && /^P-\d{1,20}$/.test(value.preferredIncident) ? value.preferredIncident : null;
  return {
    overrides: { excluded: strings(overrides.excluded, 32), forced: strings(overrides.forced, 32), swapped, custom, hostOptIn: overrides.hostOptIn === true },
    preferredIncident: preferred,
  };
}

function readPlanState(key: string): PlanState {
  try {
    const text = window.localStorage.getItem(`${PLAN_STATE_VERSION}:${key}`);
    return text === null ? EMPTY_PLAN_STATE : parsePlanState(JSON.parse(text));
  } catch {
    return EMPTY_PLAN_STATE;
  }
}

function writePlanState(key: string, state: PlanState): void {
  try {
    window.localStorage.setItem(`${PLAN_STATE_VERSION}:${key}`, JSON.stringify(state));
  } catch {
    // Private windows and blocked storage: the choices live for this visit only.
  }
}

/**
 * The SE's choices on the plan (exclusions, forced probe-only screens, swaps, own screens, the host
 * opt-in, the incident it is centred on), per tenant and customer, in this browser only. They are a
 * convenience: without them the planner's defaults apply.
 */
export function usePlanState(scopeKey: string): [PlanState, (change: (previous: PlanState) => PlanState) => void] {
  const [state, setState] = useState<{ key: string; value: PlanState }>(() => ({ key: scopeKey, value: readPlanState(scopeKey) }));
  const current = state.key === scopeKey ? state.value : readPlanState(scopeKey);
  useEffect(() => {
    if (state.key !== scopeKey) setState({ key: scopeKey, value: readPlanState(scopeKey) });
  }, [scopeKey, state.key]);
  const update = useCallback(
    (change: (previous: PlanState) => PlanState) => {
      setState((previous) => {
        const base = previous.key === scopeKey ? previous.value : readPlanState(scopeKey);
        const value = change(base);
        writePlanState(scopeKey, value);
        return { key: scopeKey, value };
      });
    },
    [scopeKey],
  );
  return [current, update];
}

/** A per-viewer choice (the companion's VM/laptop command), remembered in this browser when it can be. */
export function useRemembered<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return allowed.find((item) => item === stored) ?? fallback;
    } catch {
      return fallback;
    }
  });
  const remember = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Not remembered; the choice holds for this visit.
      }
    },
    [key],
  );
  return [value, remember];
}

// ------------------------------------------------------------------ files out

/**
 * Hands a Blob to the browser as a file: object URL, hidden anchor, click. The URL lives until the
 * next file replaces it or the tab unmounts (revoking it at once can cancel the download).
 */
export function useBlobSaver(): (blob: Blob, fileName: string) => void {
  const url = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (url.current !== null) URL.revokeObjectURL(url.current);
      url.current = null;
    },
    [],
  );
  return useCallback((blob: Blob, fileName: string) => {
    if (url.current !== null) URL.revokeObjectURL(url.current);
    const next = URL.createObjectURL(blob);
    url.current = next;
    const anchor = document.createElement('a');
    anchor.href = next;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);
}

/** The viewer's own zone, for times of prints that did not record theirs. */
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
