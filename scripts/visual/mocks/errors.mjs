/**
 * Errors shaped like the platform's error envelopes.
 *
 * The app classifies a failure with `isErrorEnvelopeError(error)` (real
 * predicate: four boolean flags plus `instanceof Error`) and then reads
 * `error.body.error.missingScopes`, `error.body.error.errorType` and
 * `error.message`. These objects satisfy all three paths so the no-permission
 * state is reached exactly as it would be on a tenant that lacks the scope.
 */

function envelope(name, message, bodyError) {
  const error = new Error(message);
  error.name = name;
  Object.assign(error, {
    isApiClientError: true,
    isClientRequestError: true,
    isErrorEnvelopeError: true,
    body: { error: bodyError },
  });
  return error;
}

/** HTTP 403, as returned when the identity lacks a storage scope. */
export function permissionDeniedError(scope) {
  return envelope('InsufficientPermission', `Missing OAuth scope: ${scope}`, {
    code: 403,
    message: `Missing OAuth scope: ${scope}`,
    errorType: 'NOT_AUTHORIZED_FOR_TABLE',
    missingScopes: [scope],
  });
}

/** HTTP 500, a generic platform failure that is not about permissions. */
export function platformError() {
  return envelope('InternalServerError', 'Query execution failed: the platform returned an internal error (synthetic).', {
    code: 500,
    message: 'Query execution failed: the platform returned an internal error (synthetic).',
  });
}
