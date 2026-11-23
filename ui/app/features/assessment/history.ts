import type { AdoptionRow, AdoptionState, CapabilityId } from './adoption';
import { DOMAIN_ORDER, type CoverageIndex, type DomainId } from './coverageIndex';
import type { AssessmentFinding, FindingClass } from './findings';

/**
 * Before × after (3.4.2, proposal §C8 F-01): the SE or the partner keeps a reading of the
 * Assessment, and a later reading is compared with it — the index, each domain, each capability and
 * the findings resolved or new. A kept reading holds only what was measured at the time, with its
 * window and its moment; the comparison never fills a gap of either side (rule 8): a domain not
 * read in one of the two has no difference, only both readings stated.
 *
 * Kept in the PoC's shared App State (`state:app-states:*`, declared since 3.2) — the PoC team
 * sees it, a viewer without access never does — and cleared by "New PoC" with the rest of the PoC,
 * so one customer's history never reaches the next. Nothing commercial is ever kept here.
 */

export { ASSESSMENT_HISTORY_KEY as HISTORY_KEY } from '../../config/persistence';
/** The readings kept, newest first; the oldest leaves when a new one is saved. */
export const MAX_SNAPSHOTS = 12;

export interface SnapshotDomain {
  id: DomainId;
  state: 'measured' | 'not-applicable' | 'unavailable';
  share: number | null;
  numerator: number | null;
  denominator: number | null;
}

export interface AssessmentSnapshot {
  v: 1;
  /** When it was read (the moment of the reading, ISO). Also its id. */
  readAt: string;
  savedAt: string;
  savedBy: string | null;
  appVersion: string;
  /** The window as shown ("Last 7 days"), already translated when saved. */
  window: string;
  index: number | null;
  domains: SnapshotDomain[];
  adoption: { id: CapabilityId; state: AdoptionState }[];
  findings: { rule: string; cls: FindingClass; title: string }[];
}

export interface AssessmentHistory {
  v: 1;
  snapshots: AssessmentSnapshot[];
}

export const EMPTY_HISTORY: AssessmentHistory = { v: 1, snapshots: [] };

export function toSnapshot(
  input: { index: CoverageIndex; adoption: readonly AdoptionRow[]; findings: readonly AssessmentFinding[] },
  meta: { readAt: string; savedAt: string; savedBy: string | null; appVersion: string; window: string },
): AssessmentSnapshot {
  return {
    v: 1,
    ...meta,
    index: input.index.value,
    domains: input.index.domains.map((domain) => ({
      id: domain.id,
      state: domain.state.kind,
      share: domain.state.kind === 'measured' ? domain.state.share : null,
      numerator: domain.state.kind === 'measured' ? domain.state.numerator : null,
      denominator: domain.state.kind === 'measured' ? domain.state.denominator : null,
    })),
    adoption: input.adoption.map((row) => ({ id: row.id, state: row.state })),
    findings: input.findings.map((finding) => ({ rule: finding.rule, cls: finding.cls, title: finding.title })),
  };
}

const CLASSES: readonly FindingClass[] = ['critical', 'warning', 'opportunity', 'strength'];
const ADOPTION_STATES: readonly AdoptionState[] = ['in-use', 'room', 'not-detected', 'unread'];
const DOMAIN_STATES: readonly SnapshotDomain['state'][] = ['measured', 'not-applicable', 'unavailable'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function parseSnapshot(raw: unknown): AssessmentSnapshot | null {
  if (!isRecord(raw) || raw.v !== 1) return null;
  const readAt = str(raw.readAt);
  const savedAt = str(raw.savedAt);
  if (readAt === null || savedAt === null || Number.isNaN(Date.parse(readAt))) return null;
  const domains = Array.isArray(raw.domains)
    ? raw.domains.flatMap((entry): SnapshotDomain[] => {
        if (!isRecord(entry)) return [];
        const id = entry.id as DomainId;
        const state = entry.state as SnapshotDomain['state'];
        if (!DOMAIN_ORDER.includes(id) || !DOMAIN_STATES.includes(state)) return [];
        const share = num(entry.share);
        return [{ id, state, share: share !== null && share >= 0 && share <= 1 ? share : null, numerator: num(entry.numerator), denominator: num(entry.denominator) }];
      })
    : [];
  const adoption = Array.isArray(raw.adoption)
    ? raw.adoption.flatMap((entry) =>
        isRecord(entry) && typeof entry.id === 'string' && ADOPTION_STATES.includes(entry.state as AdoptionState)
          ? [{ id: entry.id as CapabilityId, state: entry.state as AdoptionState }]
          : [],
      )
    : [];
  const findings = Array.isArray(raw.findings)
    ? raw.findings.flatMap((entry) =>
        isRecord(entry) && typeof entry.rule === 'string' && typeof entry.title === 'string' && CLASSES.includes(entry.cls as FindingClass)
          ? [{ rule: entry.rule, cls: entry.cls as FindingClass, title: entry.title }]
          : [],
      )
    : [];
  const index = num(raw.index);
  return {
    v: 1,
    readAt,
    savedAt,
    savedBy: str(raw.savedBy),
    appVersion: str(raw.appVersion) ?? '',
    window: str(raw.window) ?? '',
    index: index !== null && index >= 0 && index <= 100 ? index : null,
    domains,
    adoption,
    findings,
  };
}

/** A stored history is never trusted: each reading is parsed field by field; a broken one is dropped. */
export function parseHistory(text: string): AssessmentHistory {
  try {
    const raw: unknown = JSON.parse(text);
    if (!isRecord(raw) || raw.v !== 1 || !Array.isArray(raw.snapshots)) return EMPTY_HISTORY;
    const snapshots = raw.snapshots.map(parseSnapshot).filter((entry): entry is AssessmentSnapshot => entry !== null);
    return { v: 1, snapshots: snapshots.slice(0, MAX_SNAPSHOTS) };
  } catch {
    return EMPTY_HISTORY;
  }
}

/** The new reading first; a reading of the same moment replaces the old one; at most `MAX_SNAPSHOTS`. */
export function addSnapshot(history: AssessmentHistory, snapshot: AssessmentSnapshot): AssessmentHistory {
  const others = history.snapshots.filter((entry) => entry.readAt !== snapshot.readAt);
  return { v: 1, snapshots: [snapshot, ...others].slice(0, MAX_SNAPSHOTS) };
}

export function removeSnapshot(history: AssessmentHistory, readAt: string): AssessmentHistory {
  return { v: 1, snapshots: history.snapshots.filter((entry) => entry.readAt !== readAt) };
}

export interface Comparison {
  index: { before: number | null; now: number | null; delta: number | null };
  domains: { id: DomainId; before: SnapshotDomain | null; now: SnapshotDomain | null; delta: number | null }[];
  adoption: { id: CapabilityId; before: AdoptionState; now: AdoptionState }[];
  /** Findings of the earlier reading that the later one no longer raises. */
  resolved: AssessmentSnapshot['findings'];
  /** Findings the later reading raises that the earlier one did not. */
  raised: AssessmentSnapshot['findings'];
  /** Findings in both readings. */
  kept: AssessmentSnapshot['findings'];
  /** Findings per class in each reading. */
  classes: { cls: FindingClass; before: number; now: number }[];
}

/**
 * Compare a kept reading with a later one. A difference exists only where both sides measured:
 * the index when both have one, a domain when both measured it (in percentage points), a capability
 * only when its state changed. Findings match by rule id.
 */
export function compareSnapshots(before: AssessmentSnapshot, now: AssessmentSnapshot): Comparison {
  const rules = (snapshot: AssessmentSnapshot) => new Set(snapshot.findings.map((finding) => finding.rule));
  const beforeRules = rules(before);
  const nowRules = rules(now);
  const domain = (snapshot: AssessmentSnapshot, id: DomainId) => snapshot.domains.find((entry) => entry.id === id) ?? null;
  const adoptionBefore = new Map(before.adoption.map((row) => [row.id, row.state]));
  return {
    index: {
      before: before.index,
      now: now.index,
      delta: before.index !== null && now.index !== null ? now.index - before.index : null,
    },
    domains: DOMAIN_ORDER.map((id) => {
      const b = domain(before, id);
      const n = domain(now, id);
      const delta = b?.share !== null && b?.share !== undefined && n?.share !== null && n?.share !== undefined ? (n.share - b.share) * 100 : null;
      return { id, before: b, now: n, delta };
    }),
    adoption: now.adoption.flatMap((row) => {
      const earlier = adoptionBefore.get(row.id);
      return earlier !== undefined && earlier !== row.state ? [{ id: row.id, before: earlier, now: row.state }] : [];
    }),
    resolved: before.findings.filter((finding) => !nowRules.has(finding.rule)),
    raised: now.findings.filter((finding) => !beforeRules.has(finding.rule)),
    kept: now.findings.filter((finding) => beforeRules.has(finding.rule)),
    classes: CLASSES.map((cls) => ({
      cls,
      before: before.findings.filter((finding) => finding.cls === cls).length,
      now: now.findings.filter((finding) => finding.cls === cls).length,
    })),
  };
}
