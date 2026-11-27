import { getAppVersion } from '@dynatrace-sdk/app-environment';

/**
 * Identity of the app: one place for the version, the creator and the feedback
 * channel, so the footer, the help menu, the About panel and Settings can never
 * disagree.
 *
 * `APP_VERSION` mirrors `package.json` and `app.config.json`; `appInfo.test.ts`
 * fails if the three drift. At runtime the platform's own value
 * (`getAppVersion()`) wins, because that is what is actually installed.
 *
 * Nothing here is invented: the creator and contact are the credit the app has
 * shown since 2.x, and the feedback channel is that same contact. There is no
 * public issue tracker or support portal, so none is offered.
 */

export const APP_VERSION = '3.8.1';

/**
 * The app's name as people see it (3.4.14, owner's order of 2026-11-19): "PoC Automation 3.0" in the app, the
 * browser tab (the platform shows the manifest's `name`) and every credit — "All in One", automated — for the SEs
 * and the partners. The address carries no "3.0": the app id is `my.poc.automation`. The version stays 3.4.x.
 */
export const APP_DISPLAY_NAME = 'PoC Automation 3.0';
export const APP_TAGLINE = 'All in One';

export const APP_CREATOR = {
  name: 'Andrey Rafael',
  role: 'Lead Solutions Engineer',
  // Contact address shown in the footer — a placeholder; set your own before deploying.
  email: 'se@example.com',
} as const;

/** Official references already cited by this project's README. */
export const OFFICIAL_REFERENCES = {
  dqlBestPractices:
    'https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language/dql-best-practices',
  logsBestPractices:
    'https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-best-practices',
} as const;

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/;

/**
 * The installed version when the platform reports one, else the build's own.
 *
 * Outside the platform (unit tests, a plain browser) the SDK does not throw: it
 * answers with a placeholder (`dt.missing.app.version`). Anything that is not a
 * version number is therefore treated as "not reported".
 */
export function installedVersion(): string {
  try {
    const reported = getAppVersion();
    return SEMVER.test(reported) ? reported : APP_VERSION;
  } catch {
    return APP_VERSION;
  }
}

export function feedbackMailto(version: string): string {
  const subject = encodeURIComponent(`${APP_DISPLAY_NAME} ${version} feedback`);
  return `mailto:${APP_CREATOR.email}?subject=${subject}`;
}
