import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  DEFAULT_TIMEFRAME,
  TIMEFRAME_PRESETS,
  resolveRelative,
  type ResolvedTimeframe,
} from '../utils/time';
import type { BrandTone } from '../design/palette';
import { EMPTY_COST_MODEL, type CostModel } from '../models/cost';
import { EMPTY_RATE_CARD, normaliseRateCard, type RateCardModel } from '../models/licensing';
import { LOCALES, LOCALE_TAG, type Locale } from '../i18n/strings';
import { setActiveLocaleTag } from '../utils/activeLocale';
import type { PillarId } from '../models/pillars';
import { EMPTY_POC_PLAN, parsePocPlan, pocWindows, type PocPlan, type PocWindows } from '../models/pocPlan';
import { readIdentity } from './identity';
import type { StateStore } from './stateStore';
import { useTenantPersistence, type PersistenceView, type PrivateSlice, type SharedSlice } from './useTenantPersistence';
import { parseCaptureChoice, type CaptureChoice } from './persistence';

/**
 * Engagement parameters and the global analysis window.
 *
 * Customer and engagement names are never compiled into the bundle. Until 3.1 they were also
 * never stored, which made every visit start from nothing: a Sales Engineer who saved the
 * settings, opened another Dynatrace app and came back found them gone. From 3.2 the
 * configuration is kept on the tenant (see `useTenantPersistence`): the PoC itself in the shared
 * app state, the SE's own working figures (rates, price table, language) in a per-user state.
 * What kept one customer's identifiers from leaking into the next engagement is now "New PoC",
 * which deletes both documents.
 *
 * ## Why the window is resolved here and memoised
 *
 * A relative expression such as `now-24h` has to become a pair of absolute
 * timestamps before it can be sent to Grail. If that conversion happens during
 * render, every render produces a slightly different pair, which changes the
 * query cache key, which triggers a refetch, which causes another render. The
 * result is a query that never settles and a view that loads forever.
 *
 * So the absolute window is resolved once per (expression, refreshToken) pair
 * and handed down as a stable value. Data refreshes when the user changes the
 * window or presses refresh - deliberately, not incidentally.
 */

export interface PocParameters {
  customerName: string;
  engagementName: string;
  /** Free-text description of what was in scope. Shown verbatim. */
  scopeDescription: string;
  /** Longer narrative of the engagement, shown on the overview and the report. */
  pocDescription: string;
  /**
   * Customer logo as a data URL, held in memory for this session only.
   *
   * Raster formats only. SVG is rejected on upload because an SVG can carry
   * script, and rendering user-supplied SVG inline would be a cross-site
   * scripting vector in an app that displays customer content.
   */
  customerLogoDataUrl: string | null;
  /** Accent for the customer's own name. Decoration only, never a status. */
  brandTone: BrandTone;
  /** Delivery partner name, shown as co-branding on the report and the deck. */
  partnerName: string;
  /**
   * Partner logo as a data URL, held in memory for this session only. Same
   * raster-only rule as the customer logo: SVG is rejected on upload because it
   * can carry script.
   */
  partnerLogoDataUrl: string | null;
  /** 3.7.3: the customer's main web address (https), the first HTTP monitor the PoC Builder offers. '' when not given. */
  customerUrl: string;
}

const EMPTY_PARAMETERS: PocParameters = {
  customerName: '',
  engagementName: '',
  scopeDescription: '',
  pocDescription: '',
  customerLogoDataUrl: null,
  brandTone: 'default',
  partnerName: '',
  partnerLogoDataUrl: null,
  customerUrl: '',
};

/**
 * Operator estimates for the "before Dynatrace" baseline.
 *
 * Both fields are optional and never defaulted: a default would become an
 * invented number the moment someone stopped reading. The host and tool counts
 * the calculator needs are measured from the tenant, not entered here — the only
 * thing an operator can supply is knowledge the platform cannot observe (what
 * resolution felt like before, and what a competing agent costs them).
 */
export interface BaselineModel {
  /** Estimated mean time to resolve an incident before Dynatrace, in hours. */
  manualMttrHours: number | null;
  /** Estimated annual cost of one competitor monitoring agent. */
  annualCostPerAgent: number | null;
}

export const EMPTY_BASELINE: BaselineModel = {
  manualMttrHours: null,
  annualCostPerAgent: null,
};

interface StudioContextValue {
  parameters: PocParameters;
  setParameters: (next: PocParameters) => void;
  /** `true` until someone fills in the engagement details. */
  isUnconfigured: boolean;
  /** The selected preset expression, e.g. `now-24h`. */
  timeframe: string;
  timeframeLabel: string;
  setTimeframe: (expression: string) => void;
  /**
   * The resolved absolute window. Stable across renders: this is what makes the
   * query cache work instead of thrashing.
   */
  resolvedTimeframe: ResolvedTimeframe;
  /** Increments to force every query to re-resolve its window and refetch. */
  refreshToken: number;
  refresh: () => void;
  /**
   * Executive mode strips technical complexity: DQL disclosures are hidden and
   * the navigation is trimmed to the value-facing pages, for a CIO audience.
   */
  executiveMode: boolean;
  setExecutiveMode: (value: boolean) => void;
  /**
   * Operator-supplied rate used to estimate operational cost. Never read from
   * the environment, because no such data exists there.
   */
  costModel: CostModel;
  setCostModel: (next: CostModel) => void;
  /**
   * Operator estimates for the "before Dynatrace" baseline. Session state; the
   * measured half of every comparison still comes from the tenant.
   */
  baseline: BaselineModel;
  setBaseline: (next: BaselineModel) => void;
  /**
   * Operator-supplied **public** rate card, off by default. The Licensing page
   * shows a monetary estimate only when `rateCard.enabled` is true; otherwise it
   * shows sizing units only. The negotiated price is never entered here.
   */
  rateCard: RateCardModel;
  setRateCard: (next: RateCardModel) => void;
  /**
   * Active language. Session state, like the rest of the presentation config,
   * and applied everywhere at once so a customer never sees a half-translated
   * screen while navigating.
   */
  locale: Locale;
  setLocale: (next: Locale) => void;
  /**
   * Value pillars agreed for this engagement. Empty means none declared, which
   * the views state rather than assuming everything was in scope.
   */
  selectedPillars: readonly PillarId[];
  togglePillar: (id: PillarId) => void;
  /** Dates, success criteria and the dashboard reference of the PoC (3.2.5), shared with the team. */
  pocPlan: PocPlan;
  setPocPlan: (next: PocPlan) => void;
  /** The windows anchored to the PoC's start date; null until a start date is set (or before it). */
  pocWindows: PocWindows | null;
  /**
   * 3.3.2: the panels the Tech Wrapup photographs for each deck section, kept with the SE's
   * private configuration. `setCaptureChoice(section, ids)` replaces one section's choice; an
   * empty list returns it to its default panel.
   */
  captureChoice: CaptureChoice;
  setCaptureChoice: (sectionId: string, captureIds: readonly string[]) => void;
  /** Whether and when the configuration is kept on the tenant, and why not when it is not. */
  persistence: PersistenceView;
  /**
   * 3.4.2: the App State store itself, for a feature that keeps its own document beside the PoC
   * (the Assessment's kept readings). `null` outside the platform (tests, the offline harness).
   */
  stateStore: StateStore | null;
  /**
   * 3.3.6: puts a PoC read from a file (`config/pocTransfer.ts`) on screen, exactly as a document
   * loaded from App State would be; the usual save then keeps it on the tenant. Without the SE's
   * own figures, those stay as they are.
   */
  importPoc: (input: { shared: SharedSlice; priv: PrivateSlice | null }) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

/**
 * The dictionary key for a preset, used as the resolved timeframe's label.
 *
 * The key rather than the text: this label ends up on every `EvidenceRef` in the
 * app, and baking English in here is what put "Last 24 hours" on a Portuguese
 * screen. Components translate it at render time.
 */
function labelFor(expression: string): string {
  return TIMEFRAME_PRESETS.find((preset) => preset.expression === expression)?.labelKey ?? expression;
}

export interface StudioProviderProps {
  children: React.ReactNode;
  /**
   * Where the configuration is kept. Omitted in tests and the offline harness, which then
   * behave as before (session only); the app shell passes the platform's App State store.
   */
  store?: StateStore | null;
  /** Pause before a change is written; tests shorten it. */
  saveDelayMs?: number;
}

export const StudioProvider = ({ children, store = null, saveDelayMs }: StudioProviderProps) => {
  const [parameters, setParametersState] = useState<PocParameters>(EMPTY_PARAMETERS);
  const [timeframe, setTimeframeState] = useState<string>(DEFAULT_TIMEFRAME);
  const [refreshToken, setRefreshToken] = useState(0);
  const [executiveMode, setExecutiveMode] = useState(false);
  const [costModel, setCostModelState] = useState<CostModel>(EMPTY_COST_MODEL);
  const [baseline, setBaselineState] = useState<BaselineModel>(EMPTY_BASELINE);
  const [rateCard, setRateCardState] = useState<RateCardModel>(EMPTY_RATE_CARD);
  const [locale, setLocaleState] = useState<Locale>('en');
  // Keep non-hook formatters (utils/time, insight text) on the same locale as the tree.
  setActiveLocaleTag(LOCALE_TAG[locale]);
  const [selectedPillars, setSelectedPillars] = useState<readonly PillarId[]>([]);
  const [captureChoice, setCaptureChoiceState] = useState<CaptureChoice>({});
  // Through the same parser as a stored document, so what is on screen is always what could be saved.
  const setCaptureChoice = useCallback((sectionId: string, captureIds: readonly string[]) => {
    setCaptureChoiceState((current) => {
      const next: Record<string, readonly string[]> = { ...current };
      if (captureIds.length === 0) delete next[sectionId];
      else next[sectionId] = [...captureIds];
      return parseCaptureChoice(next);
    });
  }, []);
  const [pocPlan, setPocPlanState] = useState<PocPlan>(EMPTY_POC_PLAN);
  // Through the same parser as a stored document: a plan in state is always one that could be saved.
  const setPocPlan = useCallback((next: PocPlan) => setPocPlanState(parsePocPlan(JSON.parse(JSON.stringify(next)))), []);

  const setParameters = useCallback((next: PocParameters) => {
    setParametersState({
      customerName: next.customerName.trim(),
      engagementName: next.engagementName.trim(),
      scopeDescription: next.scopeDescription.trim(),
      pocDescription: next.pocDescription.trim(),
      customerLogoDataUrl: next.customerLogoDataUrl,
      brandTone: next.brandTone,
      partnerName: next.partnerName.trim(),
      partnerLogoDataUrl: next.partnerLogoDataUrl,
      customerUrl: next.customerUrl.trim(),
    });
  }, []);

  const setCostModel = useCallback((next: CostModel) => {
    setCostModelState({
      // A non-positive rate is treated as "not configured" rather than as zero
      // cost, so a mistyped value cannot silently produce a free environment.
      ratePerHour: next.ratePerHour !== null && next.ratePerHour > 0 ? next.ratePerHour : null,
      currencyLabel: next.currencyLabel.trim(),
      rateBasis: next.rateBasis.trim(),
      // Same rule for the downtime rate: a zero or negative value means the
      // operator has not supplied one, not that outages are free.
      downtimeRatePerHour:
        next.downtimeRatePerHour !== null && next.downtimeRatePerHour > 0
          ? next.downtimeRatePerHour
          : null,
      downtimeBasis: next.downtimeBasis.trim(),
    });
  }, []);

  const setBaseline = useCallback((next: BaselineModel) => {
    setBaselineState({
      // A non-positive value means "not supplied", never a zero-hour resolution
      // or a free agent.
      manualMttrHours:
        next.manualMttrHours !== null && next.manualMttrHours > 0 ? next.manualMttrHours : null,
      annualCostPerAgent:
        next.annualCostPerAgent !== null && next.annualCostPerAgent > 0
          ? next.annualCostPerAgent
          : null,
    });
  }, []);

  const setRateCard = useCallback((next: RateCardModel) => {
    setRateCardState(normaliseRateCard(next));
  }, []);

  const setTimeframe = useCallback((expression: string) => {
    // Only presets are accepted, so no unbounded window can be requested.
    if (TIMEFRAME_PRESETS.some((preset) => preset.expression === expression)) {
      setTimeframeState(expression);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (LOCALES.includes(next)) setLocaleState(next);
  }, []);

  const togglePillar = useCallback((id: PillarId) => {
    setSelectedPillars((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }, []);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  // --- tenant persistence --------------------------------------------------------------
  const identity = useMemo(() => readIdentity(), []);
  const sharedSlice = useMemo<SharedSlice>(() => ({ parameters, pillars: selectedPillars, poc: pocPlan }), [parameters, selectedPillars, pocPlan]);
  const privateSlice = useMemo<PrivateSlice>(
    () => ({ costModel, baseline, rateCard, locale, timeframe, captureChoice }),
    [costModel, baseline, rateCard, locale, timeframe, captureChoice],
  );
  const applyShared = useCallback((config: SharedSlice) => {
    setParametersState(config.parameters);
    setSelectedPillars(config.pillars);
    setPocPlanState(config.poc);
  }, []);
  const applyPrivate = useCallback((config: PrivateSlice) => {
    setCostModelState(config.costModel);
    setBaselineState(config.baseline);
    setRateCardState(config.rateCard);
    setLocaleState(config.locale);
    setTimeframeState(config.timeframe);
    setCaptureChoiceState(config.captureChoice);
  }, []);
  const importPoc = useCallback(
    (input: { shared: SharedSlice; priv: PrivateSlice | null }) => {
      applyShared(input.shared);
      if (input.priv !== null) applyPrivate(input.priv);
    },
    [applyShared, applyPrivate],
  );
  const persistence = useTenantPersistence({
    store,
    who: { email: identity.email, name: identity.name },
    shared: sharedSlice,
    priv: privateSlice,
    applyShared,
    applyPrivate,
    delayMs: saveDelayMs,
  });

  const timeframeLabel = labelFor(timeframe);

  // Resolved once per (expression, refreshToken). `refreshToken` is intentionally
  // a dependency: bumping it is how a deliberate refresh moves the window
  // forward in time.
  const resolvedTimeframe = useMemo(
    () => resolveRelative(timeframe, timeframeLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeframe, timeframeLabel, refreshToken],
  );

  // Moves forward with a deliberate refresh, like every pinned window.
  const pocWindowsValue = useMemo(
    () => pocWindows(pocPlan.startDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pocPlan.startDate, refreshToken],
  );

  const value = useMemo<StudioContextValue>(
    () => ({
      parameters,
      setParameters,
      isUnconfigured: parameters.customerName === '' && parameters.engagementName === '',
      timeframe,
      timeframeLabel,
      setTimeframe,
      resolvedTimeframe,
      refreshToken,
      refresh,
      executiveMode,
      setExecutiveMode,
      costModel,
      setCostModel,
      baseline,
      setBaseline,
      rateCard,
      setRateCard,
      locale,
      setLocale,
      selectedPillars,
      togglePillar,
      pocPlan,
      setPocPlan,
      pocWindows: pocWindowsValue,
      captureChoice,
      setCaptureChoice,
      persistence,
      stateStore: store,
      importPoc,
    }),
    [
      parameters,
      setParameters,
      timeframe,
      timeframeLabel,
      setTimeframe,
      resolvedTimeframe,
      refreshToken,
      refresh,
      executiveMode,
      costModel,
      setCostModel,
      baseline,
      setBaseline,
      rateCard,
      setRateCard,
      locale,
      setLocale,
      selectedPillars,
      togglePillar,
      pocPlan,
      setPocPlan,
      pocWindowsValue,
      captureChoice,
      setCaptureChoice,
      persistence,
      store,
      importPoc,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export function useStudio(): StudioContextValue {
  const context = useContext(StudioContext);
  if (context === null) {
    throw new Error('useStudio must be used inside a StudioProvider.');
  }
  return context;
}

/**
 * Everything a page needs to run catalog queries, as stable values.
 *
 * Spread this into `useCatalogQuery`: `useCatalogQuery('id', { ...scope })`.
 */
export function useQueryScope() {
  const { resolvedTimeframe, refreshToken, pocWindows: windows } = useStudio();
  return { globalWindow: resolvedTimeframe, pocWindows: windows, refreshToken };
}
