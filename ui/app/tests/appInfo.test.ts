import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  APP_CREATOR,
  APP_VERSION,
  OFFICIAL_REFERENCES,
  feedbackMailto,
  installedVersion,
} from '../config/appInfo';

/**
 * The app's identity is stated in three places that must agree: `package.json`,
 * `app.config.json` (what the platform installs) and `config/appInfo.ts` (what the
 * footer, the help menu and Settings display). A release that bumps one and not the
 * others shows the customer a version that is not the one running.
 */

const ROOT = (() => {
  let dir = process.cwd();
  while (!existsSync(join(dir, 'app.config.json'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('app.config.json not found above the working directory');
    dir = parent;
  }
  return dir;
})();

const readJson = (file: string) => JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as Record<string, unknown>;

describe('app identity', () => {
  it('agrees on one version across package.json, app.config.json and the code', () => {
    const pkg = readJson('package.json') as { version: string };
    const app = readJson('app.config.json') as { app: { version: string } };
    expect(pkg.version).toBe(APP_VERSION);
    expect(app.app.version).toBe(APP_VERSION);
  });

  it('lives at my.poc.automation, with no version in its address (3.3.6 rule; id since 3.4.14, owner’s order)', () => {
    // Until 3.3.5 the id was `my.poc.value.studio.v31`, kept apart from the 2.x app's. The 2.x app
    // was uninstalled from the lab tenant on 2026-11-03 and never wrote App State, so the plain id
    // starts clean; App State is per id, and a PoC crosses over with Settings → "Move this PoC".
    // 3.4.14: "PoC Automation 3.0" at /ui/apps/my.poc.automation — the "3.0" is in the name only, never the address.
    const app = readJson('app.config.json') as { app: { id: string; name: string } };
    expect(app.app.id).toBe('my.poc.automation');
    expect(app.app.name).toBe('PoC Automation 3.0');
    expect(app.app.id).not.toMatch(/\.v\d+$/);
  });

  it('falls back to the build version outside the platform runtime', () => {
    expect(installedVersion()).toBe(APP_VERSION);
  });

  it('credits a creator with a Dynatrace contact', () => {
    expect(APP_CREATOR.name.length).toBeGreaterThan(0);
    expect(APP_CREATOR.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
  });

  it('offers only official Dynatrace documentation links', () => {
    for (const url of Object.values(OFFICIAL_REFERENCES)) {
      expect(url).toMatch(/^https:\/\/docs\.dynatrace\.com\//);
    }
  });

  it('builds a feedback link to the creator with the version in the subject', () => {
    const link = feedbackMailto('3.1.0');
    expect(link.startsWith(`mailto:${APP_CREATOR.email}?subject=`)).toBe(true);
    expect(decodeURIComponent(link)).toContain('PoC Automation 3.0 3.1.0 feedback');
  });
});
