import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { entryFor } from '../i18n/strings';

/**
 * 3.6.5 — accessible to the last control (the owner: "pode seguir com a 3.6.5 com suas recomendações"): no column
 * resize handles in the app's tables, and the harness measures WCAG 2.5.8 whole (its spacing exception included) and
 * counts a ring a wrapper draws as a visible focus.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'tests' || name === 'node_modules') return [];
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.tsx') ? [path] : [];
  });

describe('the tables', () => {
  it('size their own columns: no table of the app offers the platform’s resize handles', () => {
    const offenders = walk(join(process.cwd(), 'ui/app')).filter((file) => /^\s*resizable\b/m.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('the harness', () => {
  it('measures the target size with its spacing exception and the label of a native input', () => {
    const checks = read('scripts/visual/checks.mjs');
    expect(checks).toContain('const circleHitsRect = (c, r) =>');
    expect(checks).toContain("el.closest('[data-dt-component=\"Select\"]') ?? el");
  });

  it('warns on the keyboard only for a missing skip link or a focus out of view', () => {
    expect(read('scripts/visual/capture.mjs')).toContain('c.keyboard = verdict(k.noIndicator.length > 0 || k.trapped || k.focusLost > 3, !k.firstIsSkipLink || k.offscreenFocus > 0);');
  });
});

describe('the focus on a redirect', () => {
  it('stays where the document left it, so an old address still starts at "Skip to content"', () => {
    const app = read('ui/app/App.tsx');
    expect(app).toContain('if (navigationType === NavigationType.Replace) return;');
  });
});

describe('What’s new', () => {
  it('lets 3.6.5 leave the ten releases (3.7.5), its text kept in the dictionary', () => {
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i107')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i107').en.startsWith('3.6.5 — ')).toBe(true);
  });
});
