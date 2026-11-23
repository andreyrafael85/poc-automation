/**
 * Mock of `@dynatrace-sdk/client-query`.
 *
 * The real `isErrorEnvelopeError` is a pure predicate over four flags, and the
 * mock errors in `errors.mjs` carry those flags, so the real predicate is kept
 * (re-exported) rather than reimplemented. The wrapper only adds a dev warning
 * when something that looks like an envelope fails the predicate, which would
 * mean the mock errors drifted from the SDK.
 */

import { isErrorEnvelopeError as realIsErrorEnvelopeError } from '@pvs-real/client-query';

export * from '@pvs-real/client-query';

export function isErrorEnvelopeError(error) {
  const verdict = realIsErrorEnvelopeError(error);
  if (!verdict && error?.isErrorEnvelopeError === true) {
    console.warn('[pvs-harness] mock envelope error no longer satisfies the real isErrorEnvelopeError predicate');
  }
  return verdict;
}
