/**
 * What the platform says about the completeness of a Grail result.
 *
 * Up to 3.2.0 the app looked for `metadata.grail.scanLimitReached`, a field that does not exist
 * in the query API (`GrailMetadata` in `@dynatrace-sdk/client-query` exposes `notifications`,
 * `flags`, `sampled` and `scannedBytes`). The check could never fire, so a read that stopped at
 * its scan ceiling was badged "Observed". Grail reports those conditions as notifications on a
 * successful result, so this reads them instead.
 *
 * The exact `notificationType` strings are not documented in the SDK (it gives `LIMIT_ADDED` as
 * an example), so the match is deliberately broad and keyed on what the notification is about,
 * not on one spelling. `notices` keeps the raw types so an SE can see what the platform said.
 */

export interface GrailNotificationLike {
  notificationType?: string;
  severity?: string;
  message?: string;
}

export interface GrailReadQuality {
  /** Grail stopped scanning at the request's ceiling: every count is a floor. */
  scanLimited: boolean;
  /** The platform cut the result rows (record or byte limit). */
  truncated: boolean;
  /** The platform answered from a sample: figures are its estimate. */
  sampled: boolean;
  /** On-demand bytes the platform says it scanned, when it says so. */
  scannedBytes: number | null;
  /** Raw notification types, for display and for calibrating the matchers on a tenant. */
  notices: readonly string[];
}

const SCAN_LIMIT_TYPE = /SCAN_?LIMIT|SCANNED_BYTES|BYTES_LIMIT/i;
const SCAN_LIMIT_TEXT = /scan(?:ning)?\s*limit|stopped after .*scanned|scanned .* limit/i;
const TRUNCATION_TYPE = /(RESULT|RECORD|ROWS?|BYTES)_?(LIMIT|TRUNCAT)|TRUNCAT/i;
const TRUNCATION_TEXT = /result (?:was|has been) truncated|(?:record|result) limit/i;

function asNotifications(value: unknown): GrailNotificationLike[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GrailNotificationLike => typeof item === 'object' && item !== null);
}

/** A result the platform reported nothing about: complete, unsampled. Also used by test doubles. */
export const CLEAN_QUALITY: GrailReadQuality = {
  scanLimited: false,
  truncated: false,
  sampled: false,
  scannedBytes: null,
  notices: [],
};

/** Reads `result.metadata` (the `{ grail: … }` envelope returned by `useDql`). */
export function readQuality(metadata: unknown): GrailReadQuality {
  const grail = (metadata as { grail?: Record<string, unknown> } | undefined)?.grail ?? {};
  const notifications = asNotifications(grail.notifications);
  const types = notifications.map((note) => note.notificationType ?? '').filter((type) => type !== '');

  const scanLimited =
    // Kept for any environment that does send it; harmless where it does not exist.
    grail.scanLimitReached === true ||
    notifications.some(
      (note) => SCAN_LIMIT_TYPE.test(note.notificationType ?? '') || SCAN_LIMIT_TEXT.test(note.message ?? ''),
    );
  const truncated = notifications.some(
    (note) =>
      !SCAN_LIMIT_TYPE.test(note.notificationType ?? '') &&
      (TRUNCATION_TYPE.test(note.notificationType ?? '') || TRUNCATION_TEXT.test(note.message ?? '')),
  );
  const scanned = grail.scannedBytes;

  return {
    scanLimited,
    truncated,
    sampled: grail.sampled === true,
    scannedBytes: typeof scanned === 'number' && Number.isFinite(scanned) ? scanned : null,
    notices: types,
  };
}
