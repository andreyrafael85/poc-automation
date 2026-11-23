import { translate } from '../i18n/strings';
import type { Translation } from '../i18n/useTranslation';
import { derived, observed, unavailable, type EvidenceRef, type Fact } from './provenance';
import { activeLocaleTag, decimal } from '../utils/activeLocale';

/**
 * Operational exposure and its optional monetary estimate.
 *
 * ## The rule this module exists to enforce
 *
 * There is no cost data in a Dynatrace environment. Problem *time* is measured;
 * what an hour of it is worth is not. So this module separates the two
 * absolutely:
 *
 *   - **problem-hours** are `observed` — read from `resolved_problem_duration`
 *     and from `now() - event.start`
 *   - **money** is `estimated` — problem-hours multiplied by a rate the user
 *     typed in, always displayed with the formula and the rate that produced it
 *
 * If no rate is configured, the monetary figure is `unavailable` rather than
 * zero, and the hours stand on their own. A number the customer cannot trace
 * back to their own input is worse than no number.
 *
 * ## Why there are two rates and not one
 *
 * The first version of this module multiplied *every* problem-hour by a single
 * rate. That is arithmetically fine and methodologically wrong: it treats a
 * slowdown on a batch job and a total outage of a payment service as costing the
 * same thing per hour, which no finance team would accept.
 *
 * The standard decomposition separates two costs that behave differently:
 *
 *   1. **Response cost** — someone has to notice, triage and fix. It applies to
 *      every problem-hour regardless of category, and its rate is a loaded
 *      engineering cost times the number of responders.
 *   2. **Downtime cost** — the business loses something while a service is
 *      unavailable. It applies only to *availability* problem-hours, and its
 *      rate is lost revenue plus lost productivity per hour.
 *
 * Applying the downtime rate to all problem-hours would overstate the figure by
 * the ratio of all problems to availability problems, which on the validation
 * tenant is roughly six to one. That is the difference between a number a CFO
 * will argue with and one they will dismiss.
 */

const NS_PER_HOUR = 3_600_000_000_000;

/**
 * The slice of the translation API this module needs.
 *
 * Passed in rather than pulled from a hook, so the module stays pure and
 * testable. Every string it produces lands on a `Fact` that a tile renders
 * verbatim, so leaving them in English meant a Portuguese screen showing
 * *"Cost already absorbed by problems…"* under a translated label — which is
 * exactly what a customer reported against 0.6.0.
 */
export type CostText = Pick<Translation, 't'>;

/** English fallback, resolved against the real dictionary rather than echoing keys. */
export const EN_COST_TEXT: CostText = {
  t: (key, params) => translate(key, 'en', params),
};

export interface CostModel {
  /**
   * Cost of one hour of engineering response, supplied by the user. Applies to
   * every problem-hour. `null` means not configured, which is the default and a
   * valid state.
   */
  ratePerHour: number | null;
  /** Free-text currency label, e.g. "BRL" or "R$". Never inferred. */
  currencyLabel: string;
  /**
   * What the rate is meant to represent, in the user's own words. Shown next to
   * every estimate so the audience can judge the assumption for themselves.
   */
  rateBasis: string;
  /**
   * Cost of one hour of service unavailability. Applies only to availability
   * problem-hours. Optional and independent of the response rate.
   */
  downtimeRatePerHour: number | null;
  /** How the downtime rate was arrived at, in the user's own words. */
  downtimeBasis: string;
}

export const EMPTY_COST_MODEL: CostModel = {
  ratePerHour: null,
  currencyLabel: '',
  rateBasis: '',
  downtimeRatePerHour: null,
  downtimeBasis: '',
};

export function isCostConfigured(model: CostModel): boolean {
  return model.ratePerHour !== null && model.ratePerHour > 0;
}

export function isDowntimeConfigured(model: CostModel): boolean {
  return model.downtimeRatePerHour !== null && model.downtimeRatePerHour > 0;
}

/**
 * Inputs for the guided downtime-rate calculation.
 *
 * Every field is optional: a customer who knows their downtime rate can type it
 * straight in, and one who does not can build it from figures their finance and
 * HR teams already have. Nothing here is read from the environment, and nothing
 * here is defaulted — a default would become an invented number the moment
 * somebody stopped reading.
 */
export interface DowntimeInputs {
  /** Annual revenue passing through the systems in scope. */
  annualRevenue: number | null;
  /** Hours per year those systems are expected to be transacting. */
  operatingHoursPerYear: number | null;
  /** Share of that revenue actually interrupted by an outage, 0-100. */
  revenueSharePct: number | null;
  /** People unable to work during an outage. */
  employeesAffected: number | null;
  /** Fully loaded hourly cost of one of those people. */
  loadedHourlyWage: number | null;
  /** How much of their hour is genuinely lost, 0-100. Rarely 100. */
  productivityLossPct: number | null;
}

export const EMPTY_DOWNTIME_INPUTS: DowntimeInputs = {
  annualRevenue: null,
  operatingHoursPerYear: null,
  revenueSharePct: null,
  employeesAffected: null,
  loadedHourlyWage: null,
  productivityLossPct: null,
};

export interface DowntimeRateBreakdown {
  /** Revenue that stops arriving during one hour of outage. */
  revenuePerHour: number | null;
  /** Salary paid for work that cannot happen during one hour of outage. */
  productivityPerHour: number | null;
  /** The two added together. Null when neither half could be computed. */
  totalPerHour: number | null;
  /** Each step of the arithmetic, in order, for display. */
  steps: string[];
}

/**
 * Builds a downtime rate from figures the customer already has.
 *
 * Both halves are optional and independent: a retailer may only care about lost
 * revenue, an internal shared service only about lost productivity. Whichever
 * halves are supplied are added; the rest are left out rather than guessed.
 *
 * This returns a *suggestion*. The operator still has to accept it, and the
 * result is labelled an estimate wherever it appears.
 */
export function suggestDowntimeRate(
  inputs: DowntimeInputs,
  currencyLabel: string,
  text: CostText = EN_COST_TEXT,
): DowntimeRateBreakdown {
  const steps: string[] = [];
  const money = (value: number) => formatMoney(value, currencyLabel);

  let revenuePerHour: number | null = null;
  if (
    inputs.annualRevenue !== null &&
    inputs.annualRevenue > 0 &&
    inputs.operatingHoursPerYear !== null &&
    inputs.operatingHoursPerYear > 0
  ) {
    const perHour = inputs.annualRevenue / inputs.operatingHoursPerYear;
    // An unstated share means all of it, which is the conservative reading of
    // "revenue passing through the systems in scope".
    const share = inputs.revenueSharePct ?? 100;
    revenuePerHour = (perHour * share) / 100;
    steps.push(
      text.t('cost.step.revenueHour', {
        revenue: money(inputs.annualRevenue),
        hours: inputs.operatingHoursPerYear.toLocaleString(activeLocaleTag()),
        perHour: money(perHour),
      }),
    );
    steps.push(text.t('cost.step.revenueShare', { share, amount: money(revenuePerHour) }));
  }

  let productivityPerHour: number | null = null;
  if (
    inputs.employeesAffected !== null &&
    inputs.employeesAffected > 0 &&
    inputs.loadedHourlyWage !== null &&
    inputs.loadedHourlyWage > 0
  ) {
    const loss = inputs.productivityLossPct ?? 100;
    productivityPerHour = (inputs.employeesAffected * inputs.loadedHourlyWage * loss) / 100;
    steps.push(
      text.t('cost.step.productivity', {
        people: inputs.employeesAffected.toLocaleString(activeLocaleTag()),
        wage: money(inputs.loadedHourlyWage),
        loss,
        amount: money(productivityPerHour),
      }),
    );
  }

  const totalPerHour =
    revenuePerHour === null && productivityPerHour === null
      ? null
      : (revenuePerHour ?? 0) + (productivityPerHour ?? 0);

  if (totalPerHour !== null && revenuePerHour !== null && productivityPerHour !== null) {
    steps.push(text.t('cost.step.total', { amount: money(totalPerHour) }));
  }

  return { revenuePerHour, productivityPerHour, totalPerHour, steps };
}

/** Converts nanoseconds to hours. Returns `null` for unknown input. */
export function nanosToHours(nanos: number | null): number | null {
  if (nanos === null || !Number.isFinite(nanos)) return null;
  return nanos / NS_PER_HOUR;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 100) return `${decimal(hours, 1)} h`;
  return `${Math.round(hours).toLocaleString(activeLocaleTag())} h`;
}

/** Formats a monetary amount without assuming a locale currency symbol. */
export function formatMoney(amount: number, currencyLabel: string): string {
  const rounded =
    amount >= 1000
      ? Math.round(amount).toLocaleString(activeLocaleTag())
      : amount.toLocaleString(activeLocaleTag(), { maximumFractionDigits: 2 });
  return currencyLabel === '' ? rounded : `${currencyLabel} ${rounded}`;
}

/**
 * A small amount kept readable (3.4.13): below 1 it keeps two significant digits ("USD 0.0047") instead of
 * rounding to "0", which would read as free. From 1 up it is `formatMoney`.
 */
export function formatMoneyFine(amount: number, currencyLabel: string): string {
  if (amount >= 1 || amount === 0) return formatMoney(amount, currencyLabel);
  const shown = amount.toLocaleString(activeLocaleTag(), { maximumSignificantDigits: 2 });
  return currencyLabel === '' ? shown : `${currencyLabel} ${shown}`;
}

/** Problem-hours as an observed fact. This is the figure that needs no caveat. */
export function exposureHours(
  nanos: number | null,
  evidence: EvidenceRef,
  text: CostText = EN_COST_TEXT,
): Fact<number | null> {
  const hours = nanosToHours(nanos);
  if (hours === null) {
    return unavailable('no-telemetry', undefined, evidence);
  }
  // No `unit` here: callers pass a pre-formatted display such as "6,613 h", and
  // a tile that also appends the unit would render "6,613 h h".
  return observed(hours, evidence, { note: text.t('cost.hoursNote') });
}

/**
 * The monetary estimate.
 *
 * Returns an `estimated` fact whose note contains the complete arithmetic, so
 * anyone can check it or substitute their own rate. Returns `not-configured`
 * when no rate has been supplied — never a zero.
 */
export function estimateOperationalCost(
  nanos: number | null,
  model: CostModel,
  evidence: EvidenceRef,
  text: CostText = EN_COST_TEXT,
): Fact<number | null> {
  const hours = nanosToHours(nanos);

  if (!isCostConfigured(model)) {
    return {
      ...unavailable('not-configured', text.t('cost.noRate.requirement'), evidence),
      note: text.t('cost.noRate.note'),
    };
  }

  if (hours === null) {
    return unavailable('no-telemetry', undefined, evidence);
  }

  const rate = model.ratePerHour as number;
  const amount = hours * rate;

  return {
    ...derived(
      amount,
      evidence,
      text.t('cost.response.calc', {
        hours: formatHours(hours),
        rate: formatMoney(rate, model.currencyLabel),
        total: formatMoney(amount, model.currencyLabel),
      }) +
        (model.rateBasis === ''
          ? ''
          : text.t('cost.basisSuffix', { basis: model.rateBasis })) +
        text.t('cost.response.caveat'),
      // No `unit`: `formatMoney` already prefixes the currency, so setting it
      // here rendered "brl 20,148,576 brl" in the tiles.
    ),
    // Deliberately downgraded from `derived` to `estimated`: the arithmetic is
    // exact, but one of its inputs is an assumption rather than a measurement.
    provenance: 'projection',
    confidence: 'low',
  };
}

/**
 * Estimated cost of the availability problem-hours specifically.
 *
 * Only availability problems are passed in — a slowdown is not an outage, and
 * charging one at the other's rate is the mistake that gets a cost model thrown
 * out of the room.
 */
export function estimateDowntimeCost(
  availabilityNanos: number | null,
  model: CostModel,
  evidence: EvidenceRef,
  text: CostText = EN_COST_TEXT,
): Fact<number | null> {
  const hours = nanosToHours(availabilityNanos);

  if (!isDowntimeConfigured(model)) {
    return {
      ...unavailable('not-configured', text.t('cost.noDowntime.requirement'), evidence),
      note: text.t('cost.noDowntime.note'),
    };
  }

  if (hours === null) {
    return unavailable('no-telemetry', undefined, evidence);
  }

  const rate = model.downtimeRatePerHour as number;
  const amount = hours * rate;

  return {
    ...derived(
      amount,
      evidence,
      text.t('cost.downtime.calc', {
        hours: formatHours(hours),
        rate: formatMoney(rate, model.currencyLabel),
        total: formatMoney(amount, model.currencyLabel),
      }) +
        (model.downtimeBasis === ''
          ? ''
          : text.t('cost.basisSuffix', { basis: model.downtimeBasis })) +
        text.t('cost.downtime.caveat'),
    ),
    provenance: 'projection',
    confidence: 'low',
  };
}

/**
 * Response cost and downtime cost added together.
 *
 * Deliberately additive rather than a maximum: an outage costs the business its
 * revenue *and* costs the engineering team its hours. They are different money.
 * Returns `not-configured` unless at least one rate is set, and says which
 * halves are included so nobody reads a partial figure as a complete one.
 */
export function totalExposure(
  responseCost: Fact<number | null>,
  downtimeCost: Fact<number | null>,
  model: CostModel,
  evidence: EvidenceRef,
  text: CostText = EN_COST_TEXT,
): Fact<number | null> {
  const parts: string[] = [];
  let total = 0;
  let any = false;

  if (typeof responseCost.value === 'number') {
    total += responseCost.value;
    any = true;
    parts.push(
      text.t('cost.total.response', {
        value: formatMoney(responseCost.value, model.currencyLabel),
      }),
    );
  }
  if (typeof downtimeCost.value === 'number') {
    total += downtimeCost.value;
    any = true;
    parts.push(
      text.t('cost.total.downtime', {
        value: formatMoney(downtimeCost.value, model.currencyLabel),
      }),
    );
  }

  if (!any) {
    return {
      ...unavailable('not-configured', text.t('cost.noAnyRate.requirement'), evidence),
      note: text.t('cost.noAnyRate.note'),
    };
  }

  return {
    ...derived(
      total,
      evidence,
      text.t('cost.total.calc', {
        parts: parts.join(' + '),
        total: formatMoney(total, model.currencyLabel),
      }) + (parts.length === 1 ? text.t('cost.total.partial') : ''),
    ),
    provenance: 'projection',
    confidence: 'low',
  };
}

/**
 * Avoided-cost framing for a *closed* problem set.
 *
 * Reported strictly as "cost already absorbed", never as "cost you will save".
 * A saving requires a before-and-after comparison this app does not have.
 */
export function absorbedCostLabel(text: CostText = EN_COST_TEXT): string {
  return text.t('cost.absorbed');
}
