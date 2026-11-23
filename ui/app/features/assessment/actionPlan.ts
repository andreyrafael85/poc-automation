import { isIsoDate } from '../../models/pocPlan';

/**
 * The Assessment's action plan (3.4.6, proposal §C8 F-06): for each recommended action, who owns it, by
 * when, and where it stands — agreed with the customer in the meeting and kept for the PoC team in the PoC's
 * shared App State (`state:app-states:*`, declared since 3.2; key `pvs.assessment.plan.v1`, cleared by "New
 * PoC"). The SE and the partner write it; everyone else reads it, and it prints with the report.
 *
 * An entry is keyed by the finding's rule id, which is stable from one reading to the next, so the plan
 * survives a new reading and a resolved finding simply stops showing. Nothing commercial is ever kept, no
 * figure is invented: the plan holds only what people typed. A stored document is read as untrusted input.
 */

export { ASSESSMENT_PLAN_KEY as PLAN_KEY } from '../../config/persistence';

export type PlanStatus = 'open' | 'inProgress' | 'done';
export const PLAN_STATUSES: readonly PlanStatus[] = ['open', 'inProgress', 'done'];

export interface PlanItem {
  /** Who owns the action — a team or a role as typed; at most `MAX_OWNER` characters. */
  owner: string;
  /** The agreed day, `YYYY-MM-DD`, or null when none was agreed. */
  due: string | null;
  status: PlanStatus;
}

export interface ActionPlan {
  v: 1;
  savedAt: string | null;
  /** Rule id (ASM-04…) → its entry. */
  items: Readonly<Record<string, PlanItem>>;
}

export const MAX_OWNER = 80;
/** More rules than the Assessment has; a document with more entries is cut, never trusted whole. */
export const MAX_ITEMS = 80;
const RULE_ID = /^[A-Z]{3}-\d{2}$/;

export const EMPTY_PLAN: ActionPlan = { v: 1, savedAt: null, items: {} };
export const EMPTY_ITEM: PlanItem = { owner: '', due: null, status: 'open' };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Keeps printable text only, trimmed and cut to `MAX_OWNER`. */
export const cleanOwner = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .split('')
        .map((char) => (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char))
        .join('')
        .trim()
        .slice(0, MAX_OWNER)
    : '';

export function parsePlan(raw: unknown): ActionPlan {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return EMPTY_PLAN;
    }
  }
  if (!isRecord(value) || value['v'] !== 1 || !isRecord(value['items'])) return EMPTY_PLAN;
  const items: Record<string, PlanItem> = {};
  for (const [rule, entry] of Object.entries(value['items']).slice(0, MAX_ITEMS)) {
    if (!RULE_ID.test(rule) || !isRecord(entry)) continue;
    const status = PLAN_STATUSES.includes(entry['status'] as PlanStatus) ? (entry['status'] as PlanStatus) : 'open';
    items[rule] = { owner: cleanOwner(entry['owner']), due: isIsoDate(entry['due']) ? entry['due'] : null, status };
  }
  return { v: 1, savedAt: typeof value['savedAt'] === 'string' ? value['savedAt'] : null, items };
}

/** An entry with nothing agreed carries no information and is not kept. */
const isBlank = (item: PlanItem) => item.owner === '' && item.due === null && item.status === 'open';

/**
 * The plan to store: the latest stored one with the entries edited here laid over it, so an entry someone
 * else saved in the meantime for another action is kept. Blank entries are dropped.
 */
export function mergePlan(latest: ActionPlan, edited: Readonly<Record<string, PlanItem>>, savedAt: string): ActionPlan {
  const items: Record<string, PlanItem> = { ...latest.items };
  for (const [rule, item] of Object.entries(edited)) {
    if (!RULE_ID.test(rule)) continue;
    const clean = { owner: cleanOwner(item.owner), due: isIsoDate(item.due) ? item.due : null, status: item.status };
    if (isBlank(clean)) delete items[rule];
    else items[rule] = clean;
  }
  return { v: 1, savedAt, items: Object.fromEntries(Object.entries(items).slice(0, MAX_ITEMS)) };
}

export interface PlanProgress {
  /** Actions shown now (the plan covers only these). */
  total: number;
  done: number;
  inProgress: number;
  open: number;
  /** Not done, with a due day before today. */
  overdue: number;
  /** With an owner named. */
  owned: number;
}

/** Exact counts over the actions shown now — never over a capped list. `today` is `YYYY-MM-DD`. */
export function planProgress(rules: readonly string[], plan: ActionPlan, today: string): PlanProgress {
  const progress: PlanProgress = { total: rules.length, done: 0, inProgress: 0, open: 0, overdue: 0, owned: 0 };
  for (const rule of rules) {
    const item = plan.items[rule] ?? EMPTY_ITEM;
    progress[item.status] += 1;
    if (item.owner !== '') progress.owned += 1;
    if (item.status !== 'done' && item.due !== null && item.due < today) progress.overdue += 1;
  }
  return progress;
}

export const isOverdue = (item: PlanItem, today: string) => item.status !== 'done' && item.due !== null && item.due < today;

/** Today in the viewer's calendar, `YYYY-MM-DD`. */
export const todayIso = (now: Date = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// ------------------------------------------------------------------ CSV

/**
 * One CSV cell: quoted, inner quotes doubled, and a cell a spreadsheet would run as a formula (= + - @, tab,
 * carriage return) prefixed with an apostrophe, so a title read from the tenant can never become one.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export interface PlanCsvRow {
  rank: number;
  priority: string;
  action: string;
  rule: string;
  finding: string;
  capability: string;
  owner: string;
  due: string;
  status: string;
  docs: string;
}

const BOM = String.fromCharCode(0xfeff);

/** The plan as CSV (UTF-8 with a byte-order mark, so Excel reads the accents; CRLF line ends). */
export function planCsv(header: readonly string[], rows: readonly PlanCsvRow[]): string {
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push([row.rank, row.priority, row.action, row.rule, row.finding, row.capability, row.owner, row.due, row.status, row.docs].map(csvCell).join(','));
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** `assessment-plan-<customer>-<YYYY-MM-DD>.csv`, the customer reduced to safe characters. */
export function planFileName(customer: string, at: Date): string {
  const slug =
    customer
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'customer';
  return `assessment-plan-${slug}-${todayIso(at)}.csv`;
}
