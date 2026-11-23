import type { LinkCheck, LinkEvidenceLevel, ShotKind, ShotSlot } from '../types';

/**
 * How this tenant answered each address shape the planner uses (3.2.7, spec §3.2).
 *
 * Some links were only ever seen in the browser after clicks (`observed`) or follow the platform's
 * documentation (`documented`); a `--probe` run of the companion, or a capture, opens them on the
 * tenant and records where they landed. Those results (`LinkCheck`, kept in the PrintSet) are keyed
 * by the address with its ids blanked out (`urlTemplateKey`), so one probe of a service page
 * answers for every service page:
 * - an observed or documented shape that landed `ok` in the last 30 days becomes "verificado nesta
 *   tenant em {date}" and goes into the default batch;
 * - a verified shape that landed on the launcher or on another page is taken out with
 *   `prt.why.none.probeFailed`.
 * An inconclusive result (error, session lost, skipped) changes nothing, and a result older than
 * 30 days is ignored, so a platform release that fixes or breaks an address is noticed again. A
 * result newer than the plan's own clock (a probe imported after the plan was computed) counts.
 */

export const LINK_CHECK_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** The statuses that say something about the address itself. */
const CONCLUSIVE = new Set<LinkCheck['status']>(['ok', 'unresolved_link', 'unexpected_page']);

/** Entity ids, Davis event ids and problem display ids: the variable parts of an address. */
const ID_PATTERNS = [/[A-Z][A-Z0-9_]*-[0-9A-F]{16}/g, /-?\d{1,20}_\d{13}V2/g, /\bP-\d{4,}\b/g];

/** The service pages of the root cause and of the failing service are one shape. */
const SHAPE_FAMILY: Readonly<Record<ShotKind, string>> = {
  problem: 'problem',
  'root-cause': 'service',
  frontend: 'frontend',
  'k8s-cluster': 'k8s',
  'failing-service': 'service',
  'failed-requests': 'failed',
  'logs-errors': 'logs',
  smartscape: 'smartscape',
  vulnerabilities: 'vulns',
  host: 'host',
  custom: 'custom',
};

function blankIds(text: string): string {
  return ID_PATTERNS.reduce((out, pattern) => out.replace(pattern, '{ID}'), text);
}

function decoded(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/**
 * The address shape: ids replaced by `{ID}`, then the path and the sorted query keys (a key keeps
 * its value only when the value carried an id). The origin and the hash are left out.
 * `service:/ui/apps/dynatrace.services/explorer/services?detailsId={ID}&perspective&sidebarOpen&sort`.
 */
export function urlTemplateKey(kind: ShotKind, url: string): string {
  const family = SHAPE_FAMILY[kind];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `${family}:${blankIds(url)}`;
  }
  const path = blankIds(decoded(parsed.pathname));
  const keys = [...new Set(parsed.searchParams.keys())].sort();
  const query = keys.map((key) => {
    const value = parsed.searchParams.get(key) ?? '';
    const blanked = blankIds(value);
    return blanked === value ? key : `${key}=${blanked}`;
  });
  return `${family}:${path}${query.length > 0 ? `?${query.join('&')}` : ''}`;
}

/**
 * The newest conclusive check of a shape within 30 days of `now`, or null. A check dated after
 * `now` counts: the plan's clock is read once per incident and refresh, so a probe imported later
 * in the same session is newer than the plan. Only one more than 30 days ahead (a bad clock) is
 * ignored, so a forged date cannot keep a shape fresh indefinitely.
 */
export function latestLinkCheck(templateKey: string, checks: readonly LinkCheck[], now: number): LinkCheck | null {
  let best: LinkCheck | null = null;
  let bestMs = -Infinity;
  for (const check of checks) {
    if (check.templateKey !== templateKey || !CONCLUSIVE.has(check.status)) continue;
    const at = Date.parse(check.checkedAtIso);
    if (!Number.isFinite(at) || Math.abs(now - at) > LINK_CHECK_MAX_AGE_MS) continue;
    if (at > bestMs) {
      best = check;
      bestMs = at;
    }
  }
  return best;
}

export interface LinkStatus {
  /** upgraded: an observed/documented shape opened fine here; probeFailed: a verified shape landed elsewhere. */
  effect: 'upgraded' | 'probeFailed' | null;
  /** The check behind the effect (its `checkedAtIso` is the `{date}` of the UI text), or null. */
  check: LinkCheck | null;
}

/** What the checks say about a shape whose builder gave `base`; the UI reads the date from `check`. */
export function linkStatus(base: LinkEvidenceLevel, templateKey: string, checks: readonly LinkCheck[], now: number): LinkStatus {
  if (base === 'manual' || templateKey === '') return { effect: null, check: null };
  const check = latestLinkCheck(templateKey, checks, now);
  if (check === null) return { effect: null, check: null };
  if (check.status === 'ok' && base !== 'verified') return { effect: 'upgraded', check };
  if (check.status !== 'ok' && base === 'verified') return { effect: 'probeFailed', check };
  return { effect: null, check };
}

/** observed / documented / guessed: listed, but out of the default batch until a probe here says otherwise. */
export function isProbeOnlyLevel(level: LinkEvidenceLevel): boolean {
  return level === 'observed' || level === 'documented' || level === 'guessed';
}

/**
 * The slot after this tenant's link checks: an upgraded shape is `verified` (and so in the default
 * batch); a failed verified shape is omitted with `prt.why.none.probeFailed` and loses its screen.
 * `probeOnly` and the default `included` follow the resulting level; a slot the SE forced stays
 * included. The planner applies the SE's exclusions after this.
 */
export function applyLinkChecks(slot: ShotSlot, checks: readonly LinkCheck[], now: number = Date.now()): ShotSlot {
  const chosen = slot.chosen;
  if (chosen === null) return { ...slot, included: false, probeOnly: false };
  const status = linkStatus(chosen.evidence, slot.urlTemplateKey, checks, now);
  if (status.effect === 'probeFailed') {
    return { ...slot, chosen: null, alternates: [], omittedReason: 'prt.why.none.probeFailed', included: false, probeOnly: false, forced: false, anchors: [] };
  }
  const upgrade = status.effect === 'upgraded';
  const lift = <T extends { evidence: LinkEvidenceLevel; url: string }>(candidate: T): T =>
    upgrade && urlTemplateKey(slot.kind, candidate.url) === slot.urlTemplateKey ? { ...candidate, evidence: 'verified' } : candidate;
  const nextChosen = lift(chosen);
  const probeOnly = isProbeOnlyLevel(nextChosen.evidence);
  return {
    ...slot,
    chosen: nextChosen,
    alternates: slot.alternates.map(lift),
    probeOnly,
    included: probeOnly ? slot.forced : true,
  };
}
