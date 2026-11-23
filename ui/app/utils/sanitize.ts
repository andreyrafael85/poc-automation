/**
 * Sanitisation for anything that leaves this app.
 *
 * Two Grail sources this app reads carry personal data that is not needed for
 * any conclusion it draws:
 *   - `BILLING_USAGE_EVENT` exposes `user.email` and `user.id`
 *   - `QUERY_EXECUTION_EVENT` exposes `user.email`, `user.id` and `environment`
 *
 * The catalog queries never select those fields. This module is the second line
 * of defence, applied to exported evidence, so a copy/paste out of the app
 * cannot leak identifiers even if a future query starts selecting them.
 */

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UUID_PATTERN = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
const BEARER_PATTERN = /\b(?:Bearer|Api-Token|dt0c01|dt0s\d{2})[.\s][A-Za-z0-9._-]+/g;
/** Matches a Dynatrace environment host so exports never carry a tenant URL. */
const TENANT_URL_PATTERN = /https?:\/\/[A-Za-z0-9-]+\.(?:apps\.)?(?:live\.)?dynatrace\.com[^\s"']*/g;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
/**
 * An IPv6 candidate: hex groups joined by colons, not inside a word. `isIpv6` then keeps only an
 * address — eight groups, or one `::` with at least two groups, and a digit somewhere — so a clock
 * (`12:30:45`), a MAC-like run of six groups or `Foo::Bar` stays (3.2.7 review PS-1).
 */
const IPV6_CANDIDATE = /(?<![\w:.])[0-9A-Fa-f]{0,4}(?::[0-9A-Fa-f]{0,4}){2,7}(?![\w:])/g;

function isIpv6(token: string): boolean {
  if (!/\d/.test(token)) return false;
  const doubles = token.split('::').length - 1;
  if (doubles > 1 || /:::/.test(token)) return false;
  const groups = token.split(':').filter((group) => group !== '');
  return doubles === 1 ? groups.length >= 2 : groups.length === 8;
}
/**
 * A secret written as a key and its value — `password=…`, `api_key: …`, `token=…` in a logged URL
 * or config line (3.2.4, S6: log lines reach the deck). The key stays, so the line still reads.
 */
const SECRET_PAIR_PATTERN = /\b(pass(?:word|wd)?|pwd|secret|client[_-]?secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|session[_-]?id|sessionid)(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s&"',;)]+)/gi;

export const REDACTED = '[redacted]';

/** C0 controls other than tab/newline/carriage return: invalid in XML and noise on screen. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Removes control characters (ANSI escapes and the like) that raw log lines can carry. */
export function stripControlChars(input: string): string {
  return input.replace(CONTROL_CHARS, '');
}

/** Field names that must never appear in exported evidence. */
export const FORBIDDEN_FIELDS: readonly string[] = [
  'user.email',
  'user.id',
  'user',
  'client.client_context',
  'client.internal_service_context',
  'environment',
  'query_string',
];

/**
 * Redacts personal and secret-shaped content from a free-text string.
 * Order matters: tenant URLs are removed before UUIDs so a URL containing an id
 * is not partially rewritten.
 */
export function redactText(input: string): string {
  return input
    .replace(TENANT_URL_PATTERN, REDACTED)
    .replace(BEARER_PATTERN, REDACTED)
    .replace(SECRET_PAIR_PATTERN, (_match, key: string, separator: string) => `${key}${separator}${REDACTED}`)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(UUID_PATTERN, REDACTED)
    .replace(IPV4_PATTERN, REDACTED)
    .replace(IPV6_CANDIDATE, (token) => (isIpv6(token) ? REDACTED : token));
}

/**
 * Removes forbidden fields from a record and redacts the remaining string
 * values. Used for the Evidence Center export.
 */
export function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (FORBIDDEN_FIELDS.includes(key)) continue;
    if (typeof value === 'string') {
      output[key] = redactText(value);
    } else if (Array.isArray(value)) {
      const items: unknown[] = value;
      output[key] = items.map((item) => (typeof item === 'string' ? redactText(item) : item));
    } else {
      output[key] = value;
    }
  }
  return output;
}

export function sanitizeRecords(
  records: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  return records.map(sanitizeRecord);
}

/**
 * True when a value still looks like it contains personal or secret data.
 * Used by the test suite as a hard gate on the export path.
 */
export function containsSensitiveData(value: string): boolean {
  return (
    new RegExp(EMAIL_PATTERN.source).test(value) ||
    new RegExp(BEARER_PATTERN.source).test(value) ||
    new RegExp(TENANT_URL_PATTERN.source).test(value)
  );
}
