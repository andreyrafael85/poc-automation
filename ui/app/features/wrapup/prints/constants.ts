import { PIN_SIZE } from '../geometry';
import type { ShotKind } from './types';

/**
 * The fixed numbers of the real-prints deck (3.2.7): the print space, the image and file limits,
 * the JPEG settings and the detector thresholds. Kept in one place so the planner, the capture
 * intake, the bake and the analysis agree, and so a test can pin them. This file is inside the
 * `features/wrapup/` raw-hex exemption (the deck carries its own palette, `MASK_FILL`).
 */

/**
 * The i18n suffix of each shot kind: `prt.title.<suffix>`, `prt.what.<suffix>` and
 * `prt.headline.<suffix>` all exist (`prints.contracts.test.ts`), so `` t(`prt.what.${KIND_TEXT_KEY[kind]}`) `` typechecks.
 */
export const KIND_TEXT_KEY = {
  problem: 'problem',
  'root-cause': 'rootCause',
  frontend: 'frontend',
  'k8s-cluster': 'k8s',
  'failing-service': 'failing',
  'failed-requests': 'failed',
  'logs-errors': 'logs',
  smartscape: 'smartscape',
  vulnerabilities: 'vulns',
  host: 'host',
  custom: 'custom',
} as const satisfies Record<ShotKind, string>;

/** The platform's content area once its navigation is cropped: every print is this size. */
export const PRINT_SPACE = { width: 1720, height: 1080 } as const;

/** Width of a print on its deck slide, in EMU (`PRINT_IMAGE_BOX.w` of `deck/printGeometry.ts` reads it). */
export const PRINT_IMAGE_W_EMU = 7420000;

/** Print pixels between a pin's edge and the on-screen label it sits beside. */
const PIN_LABEL_GAP_PX = 8;

/**
 * Print pixels from a pin's centre to the label it sits beside: the radius of the slide's pin
 * (`PIN_SIZE` at the image's scale, about 30 px) plus a gap. At 18 px the disc covered the first or
 * last letters of its label ("esponse time", "svc-catalog-0", 3.2.7 review UX-M2); the editor's
 * pin (26 px) clears it too.
 */
export const PIN_OFFSET_PX = Math.ceil(PIN_SIZE / 2 / (PRINT_IMAGE_W_EMU / PRINT_SPACE.width)) + PIN_LABEL_GAP_PX;

/** Width of the platform's left navigation at a 1920 px viewport (CSS px), the fallback crop edge. */
export const NAV_WIDTH_CSS = 200;

export const JPEG_QUALITY = 0.82;

/** The bake ladder: a print over `LIMITS.imageBytesDeck` is re-encoded at the next quality, then downscaled. */
export const JPEG_LADDER = [0.82, 0.72] as const;

/** The last step of the ladder (pins and focus are fractions, so they do not move). */
export const DOWNSCALE = { width: 1290, height: 810 } as const;

/** Masks are a solid fill burned into the baked JPEG — never a blur. */
export const MASK_FILL = '#1B1C22';

/** Companion manifests accepted: 1.x; an absent version is treated as 1.0.0. */
export const COMPANION_SUPPORTED = /^1\./;

/** A shot id: the companion's own pattern (`pvs-capture.mjs`), checked by `prints.contracts.test.ts`. */
export const SHOT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const MiB = 1024 * 1024;

export const LIMITS = {
  planSlots: 10,
  customSlots: 6,
  deckPairs: 10,
  prints: 16,
  /** One manual file or one ZIP entry, before normalisation (HiDPI/4K snips are 5–8 MB). */
  imageBytesIn: 10 * MiB,
  /** Per baked print, else the ladder. */
  imageBytesDeck: 600 * 1024,
  /** All baked prints, else the ladder on the largest. */
  deckMediaBytes: 6 * MiB,
  zipBytes: 60 * MiB,
  zipEntries: 40,
  manifestBytes: 512 * 1024,
  setJsonBytes: 512 * 1024,
  docSoftBytes: 25 * MiB,
  docHardBytes: 45 * MiB,
  minImage: { width: 640, height: 360 },
  maxImage: { width: 7680, height: 4320 },
} as const;

/** Freezes an object and everything under it (`as const` is compile-time only), so a threshold cannot change at runtime either. */
function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null && !Object.isFrozen(child)) deepFreeze(child);
  }
  return Object.freeze(value);
}

/**
 * Detector thresholds (§4.6). Kept here, not in config/assumptions.ts, so the Help sheet does not
 * move (owner Q8). Every key is read by `analysis/` (a test greps for each one).
 */
export const THRESHOLDS = deepFreeze({
  baselineMinPoints: 5,
  /** D1: a minute counts only if requests ≥ 5 and failures ≥ requests. */
  outageMinRequests: 5,
  /** D3 */
  collapseShare: 0.2,
  collapseMinBaseline: 50,
  collapseMinRun: 2,
  /** D4 */
  gapMinBaseline: 50,
  gapMinRun: 2,
  /** D5a */
  p90SpikeRatio: 10,
  p90SpikeMinMs: 1000,
  /** D5b (legend only) */
  longTailRatio: 10,
  /** D6: official Core Web Vitals thresholds [good, poor]. */
  vitals: { lcpMs: [2500, 4000], inpMs: [200, 500], cls: [0.1, 0.25] },
  /** D7 (errors per minute) */
  feErrorSpikeRatio: 3,
  feErrorSpikeMin: 10,
  /** MIN_REQ guard for every per-minute ratio. */
  minRequestsPerMinute: 20,
  minRequestsShareOfBaseline: 0.5,
  /** D8a */
  memReservedIdle: { reqOfAlloc: 0.9, usedOfReq: 0.3 },
  cpuReservedIdle: { reqOfAlloc: 0.8, usedOfReq: 0.1 },
  /** D9 */
  oomHigh: 1,
  restartsMedium: 10,
  churnTop2Share: 0.5,
  /** D11 */
  cascadeK: 3,
  cascadeTolerance: 0.01,
  /** D13 */
  recurrenceMin: 3,
  /** D14 */
  blastMin: 3,
  /** D18 */
  endpointShare: 0.3,
  endpointRateRatio: 5,
  /** D16 (host opt-in) */
  hotHost: { cpuAvg: 70, cpuPeak: 90, fleetRatio: 10 },
} as const);
