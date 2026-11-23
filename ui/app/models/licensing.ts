import type { StringKey } from '../i18n/strings';
import { num, str, type GrailRecord } from '../utils/records';
import { assumed } from '../config/assumptions';

/**
 * Environment sizing for a Dynatrace licence estimate.
 *
 * The app measures the estate and turns it into the units the two licensing
 * models use — DPS (consumption) and Classic (Host Units + DDUs) — so a Sales
 * Engineer does not size a PoC by hand before a sales order.
 *
 * ## The one rule
 *
 * A monetary estimate is *only* produced when the operator explicitly enables a
 * rate card in Settings, and it is always the **public** rate card, always an
 * estimate, never the negotiated price. Without an enabled rate card the page
 * shows units only. This mirrors the app-wide rule: money never appears unless
 * an operator supplied the rate.
 */

const GIB = 1024 ** 3;
/** Classic: one Host Unit covers 16 GiB of host memory. `lic.hosts` bands the hosts by this step. */
export const GIB_PER_HOST_UNIT = assumed('licensing.gibPerHostUnit');

export type HostMode = 'full-stack' | 'infra' | 'other';

/**
 * A group of hosts that share a monitoring mode and a Host-Unit band. The query groups them
 * in Grail over every host (a per-host list would stop at its row limit and under-count a
 * large estate), so each group carries a count instead of one row per host.
 */
export interface LicHost {
  mode: HostMode;
  /** Hosts in this group. */
  count: number;
  /** Combined memory of the group, in GiB. */
  ramGib: number;
  /** Host Units each full-stack host in the group needs: `max(1, ceil(RAM / 16 GiB))`. */
  hostUnitsEach: number;
}

export function toLicHosts(records: readonly GrailRecord[]): LicHost[] {
  return records.map((record) => {
    const bytes = num(record, 'memoryBytes');
    const raw = str(record, 'monitoringMode');
    const mode: HostMode = raw === 'FULL_STACK' ? 'full-stack' : raw === 'INFRASTRUCTURE' ? 'infra' : 'other';
    // A host that reports no memory band still needs one Host Unit.
    const band = num(record, 'huBucket');
    return {
      mode,
      count: num(record, 'hosts') ?? 0,
      ramGib: bytes === null ? 0 : bytes / GIB,
      hostUnitsEach: Math.max(1, band ?? 1),
    };
  });
}

/** Hosts across all groups. */
export const totalHosts = (hosts: readonly LicHost[]): number => hosts.reduce((sum, host) => sum + host.count, 0);

// ------------------------------------------------------------------ Classic

export interface ClassicSizing {
  fullStackHosts: number;
  fullStackHostUnits: number;
  infraHosts: number;
  infraHostUnits: number;
  totalHostUnits: number;
}

/**
 * Host Units from measured per-host RAM and mode.
 *
 * Full-stack: `ceil(RAM_GiB / 16)`, at least 1 per host. Infrastructure: capped
 * at 1 HU per host (the cheaper mode). Hosts without a reported mode are not
 * counted, so an undetected host never inflates the estimate.
 */
export function sizeClassic(hosts: readonly LicHost[]): ClassicSizing {
  let fullStackHosts = 0;
  let fullStackHostUnits = 0;
  let infraHosts = 0;
  let infraHostUnits = 0;
  for (const host of hosts) {
    if (host.mode === 'full-stack') {
      fullStackHosts += host.count;
      fullStackHostUnits += host.count * host.hostUnitsEach;
    } else if (host.mode === 'infra') {
      infraHosts += host.count;
      infraHostUnits += host.count * Math.min(1, host.hostUnitsEach);
    }
  }
  return {
    fullStackHosts,
    fullStackHostUnits,
    infraHosts,
    infraHostUnits,
    totalHostUnits: fullStackHostUnits + infraHostUnits,
  };
}

// ------------------------------------------------------------ Classic units

export interface ClassicUnitRow {
  /** Unit family: HU (Host Units), DEM, DDU or ASU. */
  unit: 'HU' | 'DEM' | 'DDU' | 'ASU';
  /** What drives the unit — the measured signal (English; `driverKey` is what is displayed). */
  driver: string;
  /** Dictionary key for `driver`, or null where the page composes the phrase itself (Host Units). */
  driverKey: StringKey | null;
  /** Measured annual value of that driver, or null when not observed. */
  value: number | null;
  valueUnit: string;
  /** Base unit of the measured figures, shown in the "unit of measure" column (e.g. GiB, sessions). */
  measureUnit: string;
  /** Dictionary key for `measureUnit` when it is a word ('sessions'), null for a symbol ('GiB'). */
  measureUnitKey: StringKey | null;
  /** True when `value` is a per-year flow (so monthly = value / 12); false for a static count like Host Units. */
  perYear: boolean;
}

/**
 * The measured drivers behind each Classic unit family, so a Classic estimate
 * is not just Host Units. The exact unit conversion factors live in the Classic
 * estimator; here we surface the honest measured driver for each family:
 * DEM (Digital Experience) from RUM sessions and synthetic monitors, DDU from
 * log volume, ASU (Application Security) from AppSec-monitored host memory.
 */
export function buildClassicUnits(inputs: ClassicUnitInputs): ClassicUnitRow[] {
  const rows: ClassicUnitRow[] = [
    { unit: 'HU', driver: 'Host Units (RAM ÷ 16 GiB)', driverKey: null, value: inputs.totalHostUnits, valueUnit: 'HU', measureUnit: 'GiB', measureUnitKey: null, perYear: false },
    { unit: 'DEM', driver: 'Real user sessions', driverKey: 'p.lic.driver.sessions', value: inputs.sessionsPerYear, valueUnit: 'sessions / year', measureUnit: 'sessions', measureUnitKey: 'p.lic.unit.sessions', perYear: true },
    { unit: 'DEM', driver: 'Synthetic monitors', driverKey: 'p.lic.driver.monitors', value: inputs.syntheticMonitors, valueUnit: 'monitors', measureUnit: 'monitors', measureUnitKey: 'p.lic.unit.monitors', perYear: false },
    { unit: 'DDU', driver: 'Log volume', driverKey: 'p.lic.driver.logs', value: inputs.logGibPerYear, valueUnit: 'GiB / year', measureUnit: 'GiB', measureUnitKey: null, perYear: true },
    {
      unit: 'ASU',
      driver: 'Application Security host memory',
      driverKey: 'p.lic.driver.appsec',
      value: inputs.appSecActive ? inputs.appSecGibHoursPerYear : null,
      valueUnit: 'GiB-hours / year',
      measureUnit: 'GiB-hours',
      measureUnitKey: null,
      perYear: true,
    },
  ];
  return rows;
}

export interface ClassicUnitInputs {
  /** `null` when the host query did not answer. */
  totalHostUnits: number | null;
  sessionsPerYear: number | null;
  syntheticMonitors: number | null;
  logGibPerYear: number | null;
  appSecActive: boolean;
  appSecGibHoursPerYear: number | null;
}

// ---------------------------------------------------------------------- DPS

export interface DpsSizing {
  fullStackHosts: number;
  fullStackGib: number;
  infraHosts: number;
  logGibPerMonth: number | null;
  k8sWorkloads: number | null;
  syntheticMonitors: number | null;
  cloudHosts: number | null;
  rumActive: boolean;
  appSecActive: boolean;
}

export interface DpsInputs {
  hosts: readonly LicHost[];
  logGibPerDay: number | null;
  k8sWorkloads: number | null;
  syntheticMonitors: number | null;
  cloudHosts: number | null;
  rumActive: boolean;
  appSecActive: boolean;
}

export function sizeDps(inputs: DpsInputs): DpsSizing {
  const fullStack = inputs.hosts.filter((host) => host.mode === 'full-stack');
  return {
    fullStackHosts: fullStack.reduce((sum, host) => sum + host.count, 0),
    fullStackGib: fullStack.reduce((sum, host) => sum + host.ramGib, 0),
    infraHosts: inputs.hosts.filter((host) => host.mode === 'infra').reduce((sum, host) => sum + host.count, 0),
    logGibPerMonth: inputs.logGibPerDay === null ? null : inputs.logGibPerDay * 30,
    k8sWorkloads: inputs.k8sWorkloads,
    syntheticMonitors: inputs.syntheticMonitors,
    cloudHosts: inputs.cloudHosts,
    rumActive: inputs.rumActive,
    appSecActive: inputs.appSecActive,
  };
}

// ------------------------------------------------- DPS Result Summary (rate card)

/** Hours in a (365-day) year, for annualised consumption estimates. */
export const HOURS_PER_YEAR = assumed('licensing.hoursPerYear');
const DAYS_PER_YEAR = 365;

/**
 * The public DPS rate card (USD list prices), from dynatrace.com/pricing/rate-card.
 *
 * Stored so the estimate is always the *public list* price — the account manager
 * will apply the negotiated discount. The only thing the operator supplies is the
 * currency conversion (USD → their currency).
 */
export interface ResultRow {
  id: string;
  category: string;
  capability: string;
  /** Measured annual usage of this capability, or null when not observed. */
  annualUsage: number | null;
  usageUnit: string;
  /** Public list price per single unit, in USD. */
  usdPerUnit: number;
  /** Rate-card grouping quantity (the "per N" the rate card quotes), for display. */
  rateCardQty: number;
  rateCardUnit: string;
  /** annualUsage × usdPerUnit, or null. */
  annualUsd: number | null;
}

export interface ResultSummaryInputs {
  /** `null` when the host query did not answer: the rows that need it are then a dash, not a 0. */
  fullStackGib: number | null;
  infraHosts: number | null;
  k8sPods: number | null;
  /**
   * 3.3.1 (backlog Q11): pod-hours the platform billed in the window, and how many hours that
   * window spans — so the year is extrapolated from measured hours. `null` falls back to the old
   * snapshot × 8,760, which overstated the lab tenant by 53 %.
   */
  k8sPodHours: { hours: number; windowHours: number } | null;
  logGibPerDay: number | null;
  sessionsPerDay: number | null;
  syntheticActionsPerDay: number | null;
  appSecActive: boolean;
}

/**
 * The public DPS list prices (USD per unit of billing) the app knows, by billed capability — the
 * same numbers as the Result Summary rows below (3.2.6: one table, read by both the sizing and the
 * consumption projection). A capability not here is not priced: the projection says so.
 */
export const PUBLIC_DPS_RATES: Readonly<Record<string, { usdPerUnit: number; unit: 'gibHours' | 'hostHours' | 'podHours' | 'gib' | 'sessions' | 'actions' }>> = {
  'Full-Stack Monitoring': { usdPerUnit: 0.01, unit: 'gibHours' },
  'Infrastructure Monitoring': { usdPerUnit: 0.04, unit: 'hostHours' },
  'Kubernetes Platform Monitoring': { usdPerUnit: 0.002, unit: 'podHours' },
  'Log Management & Analytics - Ingest & Process': { usdPerUnit: 0.2, unit: 'gib' },
  'Real User Monitoring': { usdPerUnit: 0.00225, unit: 'sessions' },
  'Browser Monitor or Clickpath': { usdPerUnit: 0.0045, unit: 'actions' },
  'Runtime Vulnerability Analytics': { usdPerUnit: 0.00225, unit: 'gibHours' },
};

/**
 * The public list price of reading data with a query, USD per GiB scanned (3.4.13): Log Management & Analytics –
 * Query, Events – Query and Traces – Query share it (https://www.dynatrace.com/pricing/, read for
 * docs/v3.4/CONSUMO-DO-APP.md §8). Problems and events of Dynatrace Intelligence are queried at no charge with
 * Full-Stack Monitoring; logs kept with "Retain with included queries" are read at no charge in their window. Used
 * only by the expected cost of using this app (`features/consumption/appCost.ts`), on the Licensing page.
 */
export const PUBLIC_QUERY_USD_PER_GIB = 0.0035;

const rateOf = (capability: string): number => PUBLIC_DPS_RATES[capability]?.usdPerUnit ?? 0;

export function buildDpsResultSummary(inputs: ResultSummaryInputs): ResultRow[] {
  const HY = HOURS_PER_YEAR;

  /**
   * Pod-hours for a year. Measured hours scaled to the year when the billing accounting answered;
   * otherwise the old estimate — today's pod count held for every hour of the year — which assumes
   * no pod ever starts or stops and so reads high wherever there is churn.
   */
  const annualPodHours = (input: ResultSummaryInputs): number | null => {
    const measured = input.k8sPodHours;
    if (measured !== null && measured.windowHours > 0) return (measured.hours / measured.windowHours) * HY;
    return input.k8sPods === null ? null : input.k8sPods * HY;
  };
  const DY = DAYS_PER_YEAR;
  const row = (
    id: string,
    category: string,
    capability: string,
    annualUsage: number | null,
    usageUnit: string,
    usdPerUnit: number,
    rateCardQty: number,
    rateCardUnit: string,
  ): ResultRow => ({
    id,
    category,
    capability,
    annualUsage,
    usageUnit,
    usdPerUnit,
    rateCardQty,
    rateCardUnit,
    annualUsd: annualUsage === null ? null : annualUsage * usdPerUnit,
  });

  return [
    row('fullstack', 'Host Monitoring', 'Full-Stack Monitoring', inputs.fullStackGib === null ? null : inputs.fullStackGib * HY, 'memory-gibibyte-hours', rateOf('Full-Stack Monitoring'), 100000, 'memory-gibibyte-hours'),
    row('infra', 'Host Monitoring', 'Infrastructure Monitoring', inputs.infraHosts === null ? null : inputs.infraHosts * HY, 'host-hours', rateOf('Infrastructure Monitoring'), 100000, 'host-hours'),
    row('k8s', 'Container Monitoring', 'Kubernetes Platform Monitoring', annualPodHours(inputs), 'pod-hours', rateOf('Kubernetes Platform Monitoring'), 100000, 'pod-hours'),
    row('logs', 'Logs powered by Grail', 'Log Management & Analytics - Ingest & Process', inputs.logGibPerDay === null ? null : inputs.logGibPerDay * DY, 'gibibytes', rateOf('Log Management & Analytics - Ingest & Process'), 10000, 'gibibytes'),
    row('rum', 'Digital Experience Monitoring', 'Real User Monitoring', inputs.sessionsPerDay === null ? null : inputs.sessionsPerDay * DY, 'sessions', rateOf('Real User Monitoring'), 100000, 'sessions'),
    row('synthetic', 'Digital Experience Monitoring', 'Browser Monitor or Clickpath', inputs.syntheticActionsPerDay === null ? null : inputs.syntheticActionsPerDay * DY, 'synthetic actions', rateOf('Browser Monitor or Clickpath'), 100000, 'synthetic actions'),
    row('appsec', 'Application Security', 'Runtime Vulnerability Analytics', inputs.appSecActive && inputs.fullStackGib !== null ? inputs.fullStackGib * HY : null, 'memory-gibibyte-hours', rateOf('Runtime Vulnerability Analytics'), 100000, 'memory-gibibyte-hours'),
  ];
}

/** Total annual USD across the measured Result Summary rows. */
export function resultSummaryTotalUsd(rows: readonly ResultRow[]): number {
  return rows.reduce((sum, r) => sum + (r.annualUsd ?? 0), 0);
}

/**
 * Converts a USD figure to the operator's currency.
 *
 * With the rate card enabled the estimate is shown in USD by default (the public
 * list price is in USD); a conversion is applied only when the operator also set
 * a USD → local rate. Returns null when the rate card is off or the input is null.
 */
export function localValue(usd: number | null, rate: RateCardModel): number | null {
  if (!rate.enabled || usd === null) return null;
  if (rate.usdToLocalRate === null) return usd;
  return usd * rate.usdToLocalRate;
}

/** Currency the estimate is shown in: the operator's label when converting, else USD. */
export function rateCardCurrency(rate: RateCardModel): string {
  if (rate.enabled && rate.usdToLocalRate !== null && rate.currencyLabel.trim() !== '') {
    return rate.currencyLabel;
  }
  return 'USD';
}

// -------------------------------------------------------------- rate card

/**
 * Currency configuration for the public rate card.
 *
 * The prices themselves are the fixed public list prices (`PUBLIC_DPS_RATES`);
 * the operator only chooses whether to show a value at all (`enabled`), the
 * currency label (e.g. BRL) and the USD → local conversion rate. This keeps the
 * estimate anchored to Dynatrace's published list price, converted — never an
 * invented per-unit number.
 */
export interface RateCardModel {
  enabled: boolean;
  currencyLabel: string;
  /** Conversion from USD list prices to the operator's currency (e.g. 5.13). */
  usdToLocalRate: number | null;
}

/**
 * The rate card as the app stores it: a trimmed currency label and a positive, finite
 * conversion rate or none. The studio context applies it on write; the Settings form
 * applies it to its draft so "has this changed?" compares like with like.
 */
export function normaliseRateCard(card: RateCardModel): RateCardModel {
  return {
    enabled: card.enabled,
    currencyLabel: card.currencyLabel.trim(),
    usdToLocalRate: card.usdToLocalRate !== null && card.usdToLocalRate > 0 ? card.usdToLocalRate : null,
  };
}

export const EMPTY_RATE_CARD: RateCardModel = {
  enabled: false,
  currencyLabel: '',
  usdToLocalRate: null,
};

export function isRateCardActive(rate: RateCardModel): boolean {
  return rate.enabled;
}


// -------------------------------------------------------------- consumption, priced (3.2.6)

export interface CapabilityCost {
  capability: string;
  usdPerUnit: number;
  /** Projected volume in the price's unit (GiB for logs). */
  next30Units: number | null;
  next365Units: number | null;
  /** The projection at the public list price, converted with the rate card; null without one. */
  next30: number | null;
  next365: number | null;
}

export interface ConsumptionCost {
  rows: CapabilityCost[];
  /** Capabilities billed on the tenant that the price table does not cover. */
  unpriced: string[];
  total30: number | null;
  total365: number | null;
}

/**
 * The consumption projection (`summariseConsumption`) priced at the public list prices — only for
 * the Licensing page, SE only, and only with the rate card switched on. A straight-line projection
 * times a list price: no discount, no commitment, no seasonality, labelled as such.
 */
export function consumptionCost(
  projections: readonly { capability: string; next30: number | null; next365: number | null }[],
  rate: RateCardModel,
): ConsumptionCost {
  const rows: CapabilityCost[] = [];
  const unpriced: string[] = [];
  for (const row of projections) {
    const price = PUBLIC_DPS_RATES[row.capability];
    if (price === undefined) {
      unpriced.push(row.capability);
      continue;
    }
    const units = (value: number | null) => (value === null ? null : price.unit === 'gib' ? value / GIB : value);
    const next30Units = units(row.next30);
    const next365Units = units(row.next365);
    rows.push({
      capability: row.capability,
      usdPerUnit: price.usdPerUnit,
      next30Units,
      next365Units,
      next30: localValue(next30Units === null ? null : next30Units * price.usdPerUnit, rate),
      next365: localValue(next365Units === null ? null : next365Units * price.usdPerUnit, rate),
    });
  }
  const sum = (pick: (row: CapabilityCost) => number | null) => {
    const values = rows.map(pick).filter((value): value is number => value !== null);
    return values.length === 0 ? null : values.reduce((total, value) => total + value, 0);
  };
  return { rows, unpriced, total30: sum((row) => row.next30), total365: sum((row) => row.next365) };
}
