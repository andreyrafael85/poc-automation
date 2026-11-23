import type { StringKey } from '../i18n/strings';

/**
 * English placeholder values that table rows and chart labels carry when a field was
 * absent: "Not reported", "Unnamed host", "Uncategorised"…
 *
 * They are data fallbacks built in row transformers (which run outside any component, so
 * they cannot call `t`), and other code compares against the literal (`row.related !==
 * 'Not reported'`), so the *values* stay as they are. What a customer reads is another
 * matter: on a Portuguese screen they printed in English. They are translated here, at the
 * moment they are displayed.
 */
const SENTINEL_KEYS: Readonly<Record<string, StringKey>> = {
  'Not reported': 'common.notReported',
  Uncategorised: 'common.uncategorised',
  Uncategorized: 'common.uncategorised',
  Unknown: 'common.unknown',
  Unnamed: 'common.unnamed',
  'Unnamed host': 'common.unnamedHost',
  'Under maintenance': 'common.underMaintenance',
  'Other cloud': 'common.otherCloud',
  'Not applicable': 'common.notApplicable',
  'Unnamed service': 'common.unnamedService',
  'Untitled workflow': 'common.untitledWorkflow',
  'Version not reported': 'common.versionNotReported',
  // 3.3.1 (Q12): the recurrence table groups the patterns Davis did not attribute under this.
  'Cause not named by Davis': 'common.causeNotNamed',
};

/** `Yes` / `No` come from the same transformers; they are translated in table cells only. */
const BOOLEAN_KEYS: Readonly<Record<string, StringKey>> = {
  Yes: 'common.yes',
  No: 'common.no',
};

export function localizeSentinel(
  value: string,
  t: (key: StringKey) => string,
  options: { booleans?: boolean } = {},
): string {
  const key = SENTINEL_KEYS[value] ?? (options.booleans === true ? BOOLEAN_KEYS[value] : undefined);
  return key === undefined ? value : t(key);
}
