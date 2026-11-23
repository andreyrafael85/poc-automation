import { BRAND_TONES } from '../design/palette';
import { LOCALES, type Locale } from '../i18n/strings';
import { EMPTY_COST_MODEL, type CostModel } from '../models/cost';
import { EMPTY_RATE_CARD, normaliseRateCard, type RateCardModel } from '../models/licensing';
import { POC_PILLARS, type PillarId } from '../models/pillars';
import { EMPTY_POC_PLAN, parsePocPlan, type PocPlan } from '../models/pocPlan';
import { isSafeImageDataUrl } from '../utils/logo';
import { DEFAULT_TIMEFRAME, TIMEFRAME_PRESETS } from '../utils/time';
import type { BaselineModel, PocParameters } from './StudioContext';

/**
 * What the app keeps on the tenant, and how it reads it back.
 *
 * Two documents, split by who may read them (see `stateStore.ts`):
 *
 *  - **shared** (`app` state): the PoC itself — customer, scope, logos, partner, pillars. The
 *    whole PoC team sees it, so nothing commercial belongs here.
 *  - **private** (`user` state): the SE's own working figures — cost rates, the price table
 *    setting, the manual baseline, language and window, and the panels the Tech Wrapup photographs.
 *
 * A stored document is never trusted: it is parsed field by field, a logo must still be a
 * raster data URL, and a value that no longer makes sense falls back to its empty default. A
 * newer app version can therefore add fields, and an older document still loads.
 */

/** 3.7.3: an https address with a host, as typed (trimmed), or '' — never a script, a data URL or a plain http address. */
export function safeWebUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' && url.hostname.includes('.') && url.username === '' && url.password === '' ? url.toString() : '';
  } catch {
    return '';
  }
}

export const SHARED_KEY = 'pvs.shared.v1';
export const PRIVATE_KEY = 'pvs.private.v1';
/**
 * 3.4.2: the Assessment's kept readings (before × after), shared with the PoC team like the PoC
 * itself, and cleared with it by "New PoC" (`features/assessment/history.ts`).
 */
export const ASSESSMENT_HISTORY_KEY = 'pvs.assessment.history.v1';
/**
 * 3.4.6 (F-06): the Assessment's action plan — an owner, a due day and a state per recommended action —
 * shared with the PoC team and cleared with the PoC by "New PoC" (`features/assessment/actionPlan.ts`).
 */
export const ASSESSMENT_PLAN_KEY = 'pvs.assessment.plan.v1';

export interface SharedConfig {
  v: 1;
  /** Counts saves, so two people editing at once can be told apart. */
  rev: number;
  savedAt: string;
  savedBy: string | null;
  parameters: PocParameters;
  pillars: PillarId[];
  /** Dates, success criteria and the dashboard reference (3.2.5); nothing commercial. */
  poc: PocPlan;
}

export interface PrivateConfig {
  v: 1;
  savedAt: string;
  costModel: CostModel;
  baseline: BaselineModel;
  rateCard: RateCardModel;
  locale: Locale;
  timeframe: string;
  /**
   * 3.3.2: which panels of the app the Tech Wrapup photographs for each deck section (section id →
   * capture ids, at most `MAX_CAPTURES_PER_SECTION`). A section left out takes its default panel.
   */
  captureChoice: CaptureChoice;
}

/** Section id → the capture ids the SE chose for it, in order. */
export type CaptureChoice = Readonly<Record<string, readonly string[]>>;

/** How many panels of one section may go on the deck. */
export const MAX_CAPTURES_PER_SECTION = 2;

const CHOICE_ID = /^[a-z][a-z0-9.-]{0,63}$/;

/**
 * A stored capture choice, read as untrusted input: only well-formed ids, at most 40 sections and
 * `MAX_CAPTURES_PER_SECTION` panels each, no repeats. Whether an id still exists is the Tech
 * Wrapup's business (an id a newer version removed falls back to the section's default there).
 */
export function parseCaptureChoice(value: unknown): CaptureChoice {
  if (!isRecord(value)) return {};
  const choice: Record<string, string[]> = {};
  for (const [section, ids] of Object.entries(value).slice(0, 40)) {
    if (!CHOICE_ID.test(section) || !Array.isArray(ids)) continue;
    const clean = [...new Set(ids.filter((id): id is string => typeof id === 'string' && CHOICE_ID.test(id)))].slice(0, MAX_CAPTURES_PER_SECTION);
    if (clean.length > 0) choice[section] = clean;
  }
  return choice;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, max = 4000): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const logo = (value: unknown): string | null =>
  typeof value === 'string' && isSafeImageDataUrl(value) ? value : null;

const PILLAR_IDS: ReadonlySet<string> = new Set(POC_PILLARS.map((pillar) => pillar.id));

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) && parsed['v'] === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function parseShared(raw: string): SharedConfig | null {
  const doc = parseJson(raw);
  if (doc === null) return null;
  const p = isRecord(doc['parameters']) ? doc['parameters'] : {};
  const tone = p['brandTone'];
  return {
    v: 1,
    rev: typeof doc['rev'] === 'number' && Number.isFinite(doc['rev']) ? doc['rev'] : 0,
    savedAt: text(doc['savedAt'], 40),
    savedBy: text(doc['savedBy'], 320) || null,
    parameters: {
      customerName: text(p['customerName'], 200),
      engagementName: text(p['engagementName'], 200),
      scopeDescription: text(p['scopeDescription']),
      pocDescription: text(p['pocDescription']),
      customerLogoDataUrl: logo(p['customerLogoDataUrl']),
      brandTone: BRAND_TONES.includes(tone as never) ? (tone as PocParameters['brandTone']) : 'default',
      partnerName: text(p['partnerName'], 200),
      partnerLogoDataUrl: logo(p['partnerLogoDataUrl']),
      // 3.7.3: only a plain https address is kept (it becomes an HTTP monitor's request).
      customerUrl: safeWebUrl(text(p['customerUrl'], 300)),
    },
    pillars: Array.isArray(doc['pillars'])
      ? [...new Set(doc['pillars'].filter((id): id is PillarId => typeof id === 'string' && PILLAR_IDS.has(id)))]
      : [],
    // A document written before 3.2.5 has no plan: it loads with an empty one.
    poc: parsePocPlan(doc['poc']),
  };
}

export function parsePrivate(raw: string): PrivateConfig | null {
  const doc = parseJson(raw);
  if (doc === null) return null;
  const cost = isRecord(doc['costModel']) ? doc['costModel'] : {};
  const base = isRecord(doc['baseline']) ? doc['baseline'] : {};
  const card = isRecord(doc['rateCard']) ? doc['rateCard'] : {};
  const locale = doc['locale'];
  const timeframe = doc['timeframe'];
  return {
    v: 1,
    savedAt: text(doc['savedAt'], 40),
    costModel: {
      ratePerHour: positive(cost['ratePerHour']),
      currencyLabel: text(cost['currencyLabel'], 40),
      rateBasis: text(cost['rateBasis'], 400),
      downtimeRatePerHour: positive(cost['downtimeRatePerHour']),
      downtimeBasis: text(cost['downtimeBasis'], 400),
    },
    baseline: {
      manualMttrHours: positive(base['manualMttrHours']),
      annualCostPerAgent: positive(base['annualCostPerAgent']),
    },
    rateCard: normaliseRateCard({
      enabled: card['enabled'] === true,
      currencyLabel: text(card['currencyLabel'], 40),
      usdToLocalRate: positive(card['usdToLocalRate']),
    }),
    locale: LOCALES.includes(locale as Locale) ? (locale as Locale) : 'en',
    timeframe: TIMEFRAME_PRESETS.some((preset) => preset.expression === timeframe)
      ? (timeframe as string)
      : DEFAULT_TIMEFRAME,
    // A document written before 3.3.2 has no choice: every section takes its default panel.
    captureChoice: parseCaptureChoice(doc['captureChoice']),
  };
}

/** The part of a shared document that is content, not bookkeeping: what "changed" compares. */
export function sharedContent(config: { parameters: PocParameters; pillars: readonly PillarId[]; poc: PocPlan }): string {
  return JSON.stringify({ parameters: config.parameters, pillars: [...config.pillars].sort(), poc: config.poc });
}

export function privateContent(config: Omit<PrivateConfig, 'v' | 'savedAt'>): string {
  return JSON.stringify({
    costModel: config.costModel,
    baseline: config.baseline,
    rateCard: config.rateCard,
    locale: config.locale,
    timeframe: config.timeframe,
    captureChoice: config.captureChoice,
  });
}

export const EMPTY_PRIVATE: Omit<PrivateConfig, 'v' | 'savedAt'> = {
  costModel: EMPTY_COST_MODEL,
  baseline: { manualMttrHours: null, annualCostPerAgent: null },
  rateCard: EMPTY_RATE_CARD,
  locale: 'en',
  timeframe: DEFAULT_TIMEFRAME,
  captureChoice: {},
};

export const EMPTY_SHARED: { parameters: PocParameters; pillars: PillarId[]; poc: PocPlan } = {
  parameters: {
    customerName: '',
    engagementName: '',
    scopeDescription: '',
    pocDescription: '',
    customerLogoDataUrl: null,
    brandTone: 'default',
    partnerName: '',
    partnerLogoDataUrl: null,
    customerUrl: '',
  },
  pillars: [],
  poc: EMPTY_POC_PLAN,
};
