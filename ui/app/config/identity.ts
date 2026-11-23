import { getCurrentUserDetails } from '@dynatrace-sdk/app-environment';

/**
 * Who is using the app, as the platform says.
 *
 * The name and e-mail come from the signed-in session, not from anything the user can type, so
 * the e-mail domain is a fair signal of "Dynatrace employee" for a presentation gate. Outside the
 * platform runtime the SDK returns `dt.missing.*` placeholders; those are reported as unknown
 * rather than passed on as if they were a person.
 */

export interface Identity {
  id: string;
  name: string;
  email: string;
  /** False when the platform did not supply a real e-mail address. */
  known: boolean;
}

/** The corporate e-mail domain whose signed-in users are treated as SEs (the presentation gate). */
export const SE_EMAIL_DOMAIN = 'dynatrace.com';

export const DYNATRACE_DOMAIN = `@${SE_EMAIL_DOMAIN}`;

const PLACEHOLDER = /^dt\.missing\./;

export function readIdentity(): Identity {
  let details: { id?: unknown; name?: unknown; email?: unknown };
  try {
    details = getCurrentUserDetails();
  } catch {
    details = {};
  }
  const email = typeof details.email === 'string' ? details.email.trim().toLowerCase() : '';
  const known = email !== '' && !PLACEHOLDER.test(email) && email.includes('@');
  const name = typeof details.name === 'string' && !PLACEHOLDER.test(details.name) ? details.name.trim() : '';
  const id = typeof details.id === 'string' && !PLACEHOLDER.test(details.id) ? details.id : '';
  return { id, name, email: known ? email : '', known };
}

/** True for an address in the Dynatrace corporate domain. */
export function isDynatraceEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(DYNATRACE_DOMAIN);
}
