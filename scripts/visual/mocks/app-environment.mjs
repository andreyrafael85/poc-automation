/**
 * Mock of `@dynatrace-sdk/app-environment`.
 *
 * Outside the platform the real SDK logs a warning and returns placeholder
 * strings such as `dt.missing.app.version`. The mock returns plausible but
 * obviously synthetic values instead (`.invalid` TLD, no e-mail address), so
 * pages that print a tenant host, a user name or the app version render normally.
 */

// The release under review (package.json, which appInfo.test.ts keeps equal to APP_VERSION and
// app.config.json), so the header chip and the footer show the version being captured.
import pkg from '../../../package.json';
// 3.4.14: the header shows the manifest's name, as the platform does ("PoC Automation 3.0").
import appConfig from '../../../app.config.json';

export * from '@pvs-real/app-environment';

export const getAppId = () => 'my.poc.automation';
export const getAppName = () => appConfig.app.name;
export const getAppVersion = () => pkg.version;
export const getEnvironmentId = () => 'tenant-a';
export const getEnvironmentUrl = () => 'https://tenant-a.apps.example.invalid/';
/**
 * Who the platform says is signed in: `?as=se` (default), `partner`, `customer` or `unknown`
 * (the SDK's own placeholder, as outside the platform).
 */
/** The SE e-mail domain the app recognises (`SE_EMAIL_DOMAIN` in ui/app/config/identity.ts). */
const SE_DOMAIN = 'dynatrace.com';

export const getCurrentUserDetails = () => {
  const who = globalThis.__PVS__?.as ?? 'se';
  if (who === 'partner') return { id: 'user-0002', name: 'Pat Partner', email: 'pat.partner@partner.example.invalid' };
  if (who === 'customer') return { id: 'user-0003', name: 'Chris Customer', email: 'chris.customer@customer.example.invalid' };
  if (who === 'unknown') return { id: 'dt.missing.user.id', name: 'dt.missing.user.name', email: 'dt.missing.user.email' };
  return { id: 'user-0001', name: 'Sam Engineer', email: `sam.engineer@${SE_DOMAIN}` };
};
