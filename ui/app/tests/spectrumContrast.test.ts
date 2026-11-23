import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SPECTRUM_FAMILIES } from '../components/spectrum/family';

/**
 * Gradient ink is the one kind of text the visual harness cannot measure: under
 * `background-clip: text` the computed colour is the solid fallback, and the checker skips text
 * over a gradient as "unknowable". So the contrast of every painted numeral and headline is
 * measured here, before it ships, from the token values Strato itself puts on the page.
 *
 * Source of truth: the theme blocks of Strato's `AppRoot.css` (light, dark, and the "visual
 * refresh" variants of both), cascaded the way the browser does. Picks: the families in
 * `engine/spectrum.css`, light stops for the light themes and the `data-theme='dark'` stops for
 * the dark ones.
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

const APP_ROOT_CSS = join(ROOT, 'node_modules/@dynatrace/strato-components/esm/core/components/app-root/AppRoot.css');
const SPECTRUM_CSS = join(ROOT, 'ui/app/engine/spectrum.css');

type Tokens = Record<string, string>;

/** The top-level rule blocks of a stylesheet (nested `@media` blocks are skipped whole). */
function topLevelBlocks(css: string): { selector: string; body: string }[] {
  const blocks: { selector: string; body: string }[] = [];
  let depth = 0;
  let selectorStart = 0;
  let bodyStart = 0;
  let selector = '';
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === '{') {
      if (depth === 0) {
        selector = css.slice(selectorStart, index).trim();
        bodyStart = index + 1;
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const body = css.slice(bodyStart, index);
        // Strato 3.18 (3.4.15) wraps its base and theme rules in CSS cascade layers (`@layer x { … }`): a
        // layer is not a rule of its own, so its rules count as top-level ones, in the order they come.
        if (selector.startsWith('@layer')) blocks.push(...topLevelBlocks(body));
        else blocks.push({ selector, body });
        selectorStart = index + 1;
      }
    }
  }
  return blocks;
}

const declarations = (body: string): Tokens =>
  Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1] as string, (match[2] as string).trim()]));

/** The four themes the app can be shown in, cascaded as the browser cascades them. */
function strato(): Record<'light' | 'dark' | 'light-refresh' | 'dark-refresh', Tokens> {
  const light: Tokens = {};
  const dark: Tokens = {};
  const refreshLight: Tokens = {};
  const refreshDark: Tokens = {};
  for (const { selector, body } of topLevelBlocks(readFileSync(APP_ROOT_CSS, 'utf8'))) {
    if (selector === ':root') Object.assign(light, declarations(body));
    else if (selector === ':root[data-theme="dark"]') Object.assign(dark, declarations(body));
    else if (/^:root\.[\w-]+$/.test(selector)) Object.assign(refreshLight, declarations(body));
    else if (/^:root\[data-theme="dark"\]\.[\w-]+$/.test(selector)) Object.assign(refreshDark, declarations(body));
  }
  // `:root._x` and `:root[data-theme="dark"]` have the same specificity; the refresh block
  // comes later in the sheet, so it wins over plain dark, and refresh-dark wins over both.
  return {
    light,
    dark: { ...light, ...dark },
    'light-refresh': { ...light, ...refreshLight },
    'dark-refresh': { ...light, ...dark, ...refreshLight, ...refreshDark },
  };
}

function resolve(tokens: Tokens, value: string): string {
  let current: string | undefined = value;
  for (let hops = 0; current !== undefined && current.startsWith('var(') && hops < 10; hops += 1) {
    current = tokens[current.slice(4, -1).split(',')[0]?.trim() ?? ''];
  }
  if (current === undefined || !current.startsWith('#')) throw new Error(`unresolved colour: ${value}`);
  return current;
}

const rgb = (hex: string): [number, number, number] => {
  let digits = hex.slice(1);
  if (digits.length === 3 || digits.length === 4) digits = [...digits.slice(0, 3)].map((d) => d + d).join('');
  return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16) / 255) as [number, number, number];
};
const luminance = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a: [number, number, number], b: [number, number, number], share: number) =>
  a.map((value, index) => value * share + (b[index] as number) * (1 - share)) as [number, number, number];

const spectrum = readFileSync(SPECTRUM_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The custom properties a selector sets in `spectrum.css`. */
function picks(selector: RegExp): Tokens {
  const match = spectrum.match(selector);
  if (match === null) throw new Error(`no block for ${String(selector)}`);
  return declarations(match[1] as string);
}

const familyPicks = (family: string, dark: boolean): Tokens => ({
  ...picks(new RegExp(`\\n\\[data-spectrum='${family}'\\]\\s*\\{([^}]*)\\}`)),
  ...(dark ? picks(new RegExp(`:root\\[data-theme='dark'\\] \\[data-spectrum='${family}'\\]\\s*\\{([^}]*)\\}`)) : {}),
});

const titlePicks = (dark: boolean): Tokens => ({
  ...picks(/\n:root\s*\{([^}]*)\}/),
  ...(dark ? picks(/\n\s*:root\[data-theme='dark'\]\s*\{([^}]*)\}/) : {}),
});

describe('Spectrum ink stays readable in every theme', () => {
  const themes = strato();

  it('reads the four themes from Strato', () => {
    for (const tokens of Object.values(themes)) {
      expect(tokens['--dt-colors-background-surface-default']).toMatch(/^#/);
    }
    // The dark surface really is dark, so the dark picks are tested against the right ground.
    expect(luminance(rgb(resolve(themes.dark, 'var(--dt-colors-background-surface-default)')))).toBeLessThan(0.05);
  });

  for (const [theme, tokens] of Object.entries(themes)) {
    const dark = theme.startsWith('dark');
    const surface = rgb(resolve(tokens, 'var(--dt-colors-background-surface-default)'));

    it(`paints every numeral at 4.5:1 or better (${theme})`, () => {
      const failures: string[] = [];
      for (const family of SPECTRUM_FAMILIES) {
        const chosen = familyPicks(family, dark);
        // The KPI card washes its ground with 8 % of the family's first mark colour.
        const wash = mix(rgb(resolve(tokens, chosen['--pvs-sp-from'] as string)), surface, 0.08);
        for (const stop of ['--pvs-ink-from', '--pvs-ink-to']) {
          const ink = rgb(resolve(tokens, chosen[stop] as string));
          const ratio = Math.min(contrast(ink, surface), contrast(ink, wash));
          if (ratio < 4.5) failures.push(`${family} ${stop}: ${ratio.toFixed(2)}`);
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });

    it(`keeps every mark at 3:1 or better where a gradient starts (${theme})`, () => {
      // The arc, the bar and the icon tile start from `--pvs-sp-from`; a mark is never the only
      // carrier of its number, but its strong end must still stand out from the surface.
      const failures: string[] = [];
      for (const family of SPECTRUM_FAMILIES) {
        const from = rgb(resolve(tokens, familyPicks(family, dark)['--pvs-sp-from'] as string));
        const ratio = contrast(from, surface);
        if (ratio < 3) failures.push(`${family}: ${ratio.toFixed(2)}`);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });

    it(`paints the hero headline at 3:1 or better, large text (${theme})`, () => {
      // Heading sizes (24 px and up) are large text in WCAG terms. Measured against the hero's
      // ground and against its two light sources at full strength.
      const chosen = titlePicks(dark);
      const ground = rgb(resolve(tokens, 'var(--dt-colors-background-container-primary-default)'));
      const grounds = [
        ground,
        mix(rgb(resolve(tokens, 'var(--dt-colors-charts-sequential-blue-turquoise-color-05-default)')), ground, 0.2),
        mix(rgb(resolve(tokens, 'var(--dt-colors-charts-sequential-pink-purple-color-06-default)')), ground, 0.16),
        surface,
      ];
      const failures: string[] = [];
      for (const stop of ['--pvs-title-ink-1', '--pvs-title-ink-2', '--pvs-title-ink-3']) {
        const ink = rgb(resolve(tokens, chosen[stop] as string));
        const ratio = Math.min(...grounds.map((g) => contrast(ink, g)));
        if (ratio < 3) failures.push(`${stop}: ${ratio.toFixed(2)}`);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }

  it('would have caught the 3.2.0 gate title: turquoise-07 on white is under 3:1', () => {
    // The mini-logon headline used `--pvs-spec-ok` (turquoise-07) in the light theme.
    const ink = rgb(resolve(themes.light, 'var(--dt-colors-charts-sequential-turquoise-color-07-default)'));
    expect(contrast(ink, rgb(resolve(themes.light, 'var(--dt-colors-background-surface-default)')))).toBeLessThan(3);
  });
});
