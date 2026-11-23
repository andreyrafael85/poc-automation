import type { QueryOutcome } from '../hooks/useCatalogQuery';
import type { StringKey } from '../i18n/strings';

/**
 * Why a figure is absent, in words that agree with its evidence badge.
 *
 * Up to 3.2.0 a figure whose query was still running read "not measured in this window" under a
 * "Loading" badge, and a refused query read the same as an empty one. A running query is not a
 * result, and a refusal is a permission gap, not an absence of data.
 */
export function absentCaptionKey(outcome: QueryOutcome | undefined): StringKey {
  switch (outcome) {
    case 'loading':
      return 'common.loadingShort';
    case 'no-permission':
      return 'common.noPermissionShort';
    case 'error':
      return 'common.notRead';
    default:
      return 'tl.notMeasured';
  }
}
