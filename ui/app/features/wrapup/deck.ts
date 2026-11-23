/**
 * The Tech Wrapup's data model and the deck's palette (3.2.4).
 *
 * `model.ts` builds a `WrapupModel` from what the PoC measured; `spec.ts` turns it into the one
 * specification of the deck, which `pptxTemplate.ts` writes into the corporate template and
 * `DeckPreview.tsx` draws on screen. Until 3.2.3 this module also drew a second, pptxgenjs deck of
 * its own; that path is gone (finding E1: three renderings that did not agree).
 *
 * This is one of the few modules that uses raw hex rather than Strato tokens: a `.pptx` is not
 * rendered by the Dynatrace theme, so it carries its own brand palette, taken from the template.
 */

/**
 * Official Dynatrace 2026 corporate-template palette (hex, no `#`).
 *
 * Extracted from `TPLT_Corporate_PPT_2026.potx` (theme "Custom 6"): brand navy
 * `dk2 #1A2440`, teal `accent1 #49C2B3`, blues `#3BACF0 / #1966FF` and purples
 * `#5E28E5 / #8D1CDC / #C93FDB`. The deck keeps a premium dark-navy stage; the
 * keys `green`/`lime` carry the brand TEAL (there is no green in the 2026 brand).
 */
export const DECK = {
  green: '49C2B3', // accent1 teal — primary highlight
  lime: '7FD8CD', // lighter teal — KPI values / large numbers
  ink: '10172C', // deep navy — slide background
  panel: '1A2440', // brand navy (dk2) — dividers / bands
  slate: '232E4C', // raised card fill
  border: '39456A', // hairline
  white: 'FFFFFF',
  subtle: 'AEB4C4', // muted body text
  blue: '1966FF', // accent3
  lightBlue: '3BACF0', // accent2
  purple: '5E28E5', // accent4
  magenta: '8D1CDC', // accent5
  pink: 'C93FDB', // accent6
  pos: '4FD69E', // soft green — "good" status
  red: 'FF6E6E', // ≥ 4.5:1 on the card fill: the preview shows it small on a phone (3.2.4)
  amber: 'FFC24B',
} as const;

/** Soft alarm status for a figure, driving its accent colour. */
export type KpiStatus = 'good' | 'warn' | 'bad';

export interface WrapupKpi {
  label: string;
  value: string;
  status?: KpiStatus;
  /** Small emoji rendered before the label, pertinent to the metric. */
  emoji?: string;
}

export interface WrapupBar {
  label: string;
  value: number;
}

export interface WrapupPie {
  labels: string[];
  values: number[];
}

export interface WrapupSection {
  id: string;
  title: string;
  subtitle?: string;
  /** Official Dynatrace product logomark key (see productLogos.ts). */
  logo?: string;
  /** Cloud provider brand logos (data URLs) — shown on the cloud section. */
  providerLogos?: string[];
  /** A one-line health verdict rendered as a coloured banner under the header. */
  verdict?: { text: string; tone: KpiStatus };
  /** A single hero insight rendered large — the "so what" of the slide. */
  highlight?: { value: string; caption: string; status?: KpiStatus; emoji?: string };
  narrative: string[];
  /** A Dynatrace Assist callout — plain-language context derived from the data. */
  assist?: string[];
  kpis?: WrapupKpi[];
  bars?: { title: string; items: WrapupBar[] };
  pie?: { title: string; data: WrapupPie };
  table?: { title: string; headers: string[]; rows: string[][] };
  /** A time trend rendered as a line chart — "how the environment moved". */
  trend?: { title: string; points: number[]; labels?: string[] };
}

export interface WrapupStrings {
  title: string;
  subtitle: string;
  tagline: string;
  preparedBy: string;
  agendaTitle: string;
  whyTitle: string;
  whySubtitle: string;
  assistLabel: string;
  partnerLabel: string;
  technicalDivider: string;
  technicalKicker: string;
  businessDivider: string;
  businessKicker: string;
  closingTitle: string;
  closingBullets: string[];
  footer: string;
  measured: string;
  confidential: string;
}

export interface WrapupModel {
  customerName: string;
  engagementName: string;
  windowLabel: string;
  generatedAtLabel: string;
  /** Full name of the logged-in Dynatrace user (the SE running the PoC). */
  seName: string | null;
  /** White Dynatrace logo as a data URL, drawn on every slide. */
  dtLogo: string;
  /** Optional customer logo (raster data URL), drawn on the title. */
  customerLogo: string | null;
  /** Natural aspect ratio (w/h) of the customer logo, for consistent sizing. */
  customerLogoAspect: number | null;
  /** Delivery partner name, shown as co-branding on the title slide. */
  partnerName: string;
  /** Optional partner logo (raster data URL), drawn beside the customer logo. */
  partnerLogo: string | null;
  /** Natural aspect ratio (w/h) of the partner logo, for consistent sizing. */
  partnerLogoAspect: number | null;
  /** Product logomark data URLs (keyed) for the platform grid on the Why slide. */
  platformLogos: string[];
  strings: WrapupStrings;
  agenda: string[];
  why: string[];
  technical: WrapupSection[];
  business: WrapupSection[];
}
