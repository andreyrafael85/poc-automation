import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import Breakpoints from '@dynatrace/strato-design-tokens/breakpoints';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Easings from '@dynatrace/strato-design-tokens/easings';
import Elevations from '@dynatrace/strato-design-tokens/elevations';
import Spacings from '@dynatrace/strato-design-tokens/spacings';
import Timings from '@dynatrace/strato-design-tokens/timings';
import Typography from '@dynatrace/strato-design-tokens/typography';

import { EXECUTIVE_HIDDEN_ROUTES, NAVIGATION, STORY_STAGES, storyNeighbours, storyRoutes } from '../config/navigation';
import { ALL_KEYS } from '../i18n/strings';
import { PROVENANCE_META } from '../models/provenance';
import { EVIDENCE, EVIDENCE_ORDER, evidenceAttribute } from '../engine/evidence';
import { BREAKPOINT, SPACE, SPACE_PX } from '../engine/tokens';

/**
 * Guards the engine — the composition layer v3.1 puts over Strato.
 *
 * The engine's promise is that nothing in it reaches for a value of its own: every
 * colour, space, radius and duration is an official design token, every layout
 * breakpoint mirrors one, and every semantic distinction survives without colour.
 * Those are all statements a compiler cannot check, so they are asserted here.
 */

/** `ui/app`, found from the project root (jsdom gives `import.meta.url` no file scheme). */
const APP = (() => {
  let dir = process.cwd();
  while (!existsSync(join(dir, 'app.config.json'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('app.config.json not found above the working directory');
    dir = parent;
  }
  return join(dir, 'ui', 'app');
})();

/** Every stylesheet of the engine: the core two and the per-group page sheets. */
const ENGINE_CSS: string[] = (() => {
  const dir = join(APP, 'engine');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.css'))
    .sort()
    .map((name) => `engine/${name}`);
})();

function read(relative: string): string {
  return readFileSync(join(APP, relative), 'utf8');
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === 'tests' || entry === 'node_modules') continue;
      sourceFiles(path, out);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/** Every custom property name Strato actually defines. */
const TOKEN_NAMES: ReadonlySet<string> = (() => {
  const names = new Set<string>();
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      const match = value.match(/var\((--dt-[\w-]+)/);
      if (match?.[1] !== undefined) names.add(match[1]);
    } else if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };
  [Borders, BoxShadows, Breakpoints, Colors, Easings, Elevations, Spacings, Timings, Typography].forEach(walk);
  return names;
})();

/** `var(--dt-spacings-size-8, 8px)` → `8`. */
function fallbackPx(token: string): number {
  const match = token.match(/,\s*(\d+(?:\.\d+)?)px\)/);
  if (match?.[1] === undefined) throw new Error(`no px fallback in ${token}`);
  return Number(match[1]);
}

/** Returns the text of the first block opened by `header`, brace-matched. */
function blockAfter(css: string, header: RegExp): string | null {
  const start = css.search(header);
  if (start === -1) return null;
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  return null;
}

const STRATO_COMPONENT_VARS = new Set(['--dt-charts-single-value-global-value-font-size']);

describe('design tokens', () => {
  it('knows the real Strato token names', () => {
    // A sanity floor: if the token modules ever stop exporting `var(--dt-…)`
    // strings, every check below would pass vacuously.
    expect(TOKEN_NAMES.size).toBeGreaterThan(500);
    expect(TOKEN_NAMES.has('--dt-colors-text-neutral-default')).toBe(true);
    expect(TOKEN_NAMES.has('--dt-spacings-size-16')).toBe(true);
  });

  it('references only Strato tokens that exist, anywhere in the app', () => {
    // A typo in a `var(--dt-…)` string type-checks and lints cleanly and renders
    // as "no value" — an invisible border, a collapsed gap, text in the wrong ink.
    const unknown: string[] = [];
    for (const file of sourceFiles(APP)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/--dt-[a-z0-9-]+/g)) {
        const name = match[0];
        // Prefixes written in prose or built by concatenation end in a dash.
        if (name.endsWith('-')) continue;
        // 3.4.18: a Strato component variable the app sets on purpose (not a design token) — the KPI row caps every
        // SingleValue at one size, as SingleValueGrid does (engine/strato/StratoKpi.tsx).
        if (STRATO_COMPONENT_VARS.has(name)) continue;
        if (!TOKEN_NAMES.has(name)) unknown.push(`${file.slice(APP.length)}: ${name}`);
      }
    }
    expect(unknown, unknown.join('\n')).toEqual([]);
  });

  it('resolves every engine spacing step to the Strato token it names', () => {
    expect(SPACE_PX.tight).toBe(fallbackPx(SPACE.tight));
    expect(SPACE_PX.group).toBe(fallbackPx(SPACE.group));
    expect(SPACE_PX.section).toBe(fallbackPx(SPACE.section));
    expect(SPACE_PX.chapter).toBe(fallbackPx(SPACE.chapter));
  });

  it('keeps the four rhythm steps strictly increasing', () => {
    const steps = [SPACE_PX.tight, SPACE_PX.group, SPACE_PX.section, SPACE_PX.chapter];
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    expect(new Set(steps).size).toBe(steps.length);
  });
});

describe('engine stylesheets', () => {
  const sheets = ENGINE_CSS.map((file) => ({ file, css: stripComments(read(file)) }));

  it('knows every stylesheet of the engine', () => {
    expect(ENGINE_CSS).toEqual(expect.arrayContaining(['engine/engine.css', 'engine/viz.css']));
    expect(ENGINE_CSS.length).toBeGreaterThanOrEqual(2);
  });

  it('uses no raw colour — but for the one declared logo matte', () => {
    // A brand mark is designed for a light ground, so the logo tile fixes one
    // colour regardless of theme. It is a single, named custom property.
    const withoutMatte = sheets.map(({ file, css }) => ({
      file,
      css: css
        .split('\n')
        .filter((line) => !/--pvs-logo-matte\s*:/.test(line))
        .join('\n'),
    }));
    const matteDeclarations = sheets.flatMap(({ css }) => css.match(/--pvs-logo-matte\s*:/g) ?? []);
    expect(matteDeclarations.length).toBeLessThanOrEqual(1);
    for (const { file, css } of withoutMatte) {
      expect(css, `${file}: hex`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css, `${file}: rgb/hsl`).not.toMatch(/\b(?:rgb|rgba|hsl|hsla)\(/);
    }
  });

  it('never nests :has() inside :has() — the browser drops the whole rule', () => {
    // A print rule written as `div:has(+ div:has(main))` was silently ignored.
    for (const { file, css } of sheets) {
      for (const match of css.matchAll(/:has\(/g)) {
        let depth = 1;
        for (let index = (match.index ?? 0) + match[0].length; index < css.length && depth > 0; index += 1) {
          const char = css[index];
          if (char === '(') depth += 1;
          else if (char === ')') depth -= 1;
          else if (css.startsWith(':has(', index)) {
            throw new Error(`${file}: :has() nested in :has() near "${css.slice(match.index, index + 8)}"`);
          }
        }
      }
    }
  });

  it('prints the page without the sidebar column it no longer has', () => {
    // Hiding the navigation left Strato's sidebar wrapper, its drag handle and the inline
    // `width: calc(100% - sidebar)` on the content column, so a printed report used 40 % of the
    // paper. These three rules (checked in the PDF by `capture.mjs --exports`) must stay.
    const css = sheets.find(({ file }) => file === 'engine/engine.css')?.css ?? '';
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toMatch(/div:has\(\.pvs-nav\):not\(:has\(main\)\)\s*\{[^}]*display:\s*none\s*!important/);
    expect(print).toMatch(/\[role='separator'\][^{]*\{[^}]*display:\s*none\s*!important/);
    expect(print).toMatch(/\[style\*='100% - '\][^{]*\{[^}]*width:\s*100%\s*!important/);
  });

  /** The one stylesheet that may draw gradient, glow and gradient ink (3.2 "Value Spectrum"). */
  const SPECTRUM = 'engine/spectrum.css';

  it('draws no decoration outside the Spectrum sheet', () => {
    // v3.1's point: a mark is a fill and an edge. No gradient, glow, blur or text shadow outside
    // the one sheet that was opened for it — they are what made v2 read as a demo, and gradient
    // ink is what printed invisible.
    for (const { file, css } of sheets) {
      if (file === SPECTRUM) continue;
      expect(css, `${file}: gradient`).not.toMatch(/gradient\(/);
      expect(css, `${file}: text-shadow`).not.toMatch(/text-shadow/);
      expect(css, `${file}: backdrop-filter`).not.toMatch(/backdrop-filter/);
      expect(css, `${file}: blur`).not.toMatch(/blur\(/);
      expect(css, `${file}: drop-shadow`).not.toMatch(/drop-shadow/);
      expect(css, `${file}: transparent text`).not.toMatch(/text-fill-color|background-clip:\s*text/);
    }
  });

  it('lets the Spectrum sheet decorate only on terms that keep the page honest', () => {
    const spectrum = sheets.find(({ file }) => file === SPECTRUM);
    expect(spectrum, 'engine/spectrum.css must exist').toBeDefined();
    const css = spectrum?.css ?? '';

    // 1. Ink painted with a gradient keeps a real text colour beneath it, so contrast is measured
    //    on text that exists and the text survives forced colours.
    const rules = css.split('}').map((chunk) => chunk.trim()).filter((chunk) => chunk !== '');
    for (const rule of rules) {
      if (/background-clip:\s*text/.test(rule)) {
        expect(rule, `gradient ink without a colour token: ${rule.slice(0, 60)}`).toMatch(/\bcolor:\s*var\(--dt-colors-text-/);
      }
    }

    // 2. Every colour stop is a token or a transparency: no literal colour reaches a gradient.
    for (const match of css.matchAll(/(?:linear|radial|conic)-gradient\(([^;]*)\)\s*[,;]/g)) {
      expect(match[1] ?? '', 'literal colour in a gradient').not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(/);
    }

    // 3. Motion stops when asked, and print draws it all flat.
    expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/@media print/);
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toMatch(/background:\s*none\s*!important/);
    expect(print).toMatch(/text-fill-color:\s*currentColor\s*!important/);
  });

  it('puts no pseudo-element on a panel: Strato Surface owns ::before and ::after', () => {
    // Strato's Surface sets its own ::before/::after (absolute, 100 % × 100 %) at the same
    // specificity as one class of ours, so the winner depends on stylesheet order. In the
    // production bundle Strato's sheet loads last: a 3 px accent drawn as `.pvs-kpi::before`
    // became a gradient over the whole card and hid its number on the lab tenant (3.2.1), while the
    // dev-server harness, with the opposite order, showed it right. Draw decoration with a child
    // element instead.
    const tsx = sourceFiles(APP)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    const panelClasses = new Set<string>(['pvs-panel']);
    for (const match of tsx.matchAll(/<Panel\b[^>]*\bclassName="([^"]+)"/g)) {
      for (const klass of (match[1] as string).split(/\s+/)) if (klass !== '') panelClasses.add(klass);
    }
    expect(panelClasses.has('pvs-kpi'), 'the KPI card is a Panel').toBe(true);

    const offenders: string[] = [];
    for (const { file, css } of sheets) {
      for (const match of css.matchAll(/([^{}]+)\{/g)) {
        for (const selector of (match[1] as string).split(',')) {
          if (!/::?(?:before|after)\b/.test(selector)) continue;
          for (const klass of panelClasses) {
            if (new RegExp(`\\.${klass}(?![\\w-])[^\\s>+~]*::?(?:before|after)`).test(selector.trim())) {
              offenders.push(`${file}: ${selector.trim()}`);
            }
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('resolves every --pvs custom property it reads', () => {
    const tsx = sourceFiles(APP)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    const defined = new Set<string>();
    for (const { css } of sheets) for (const match of css.matchAll(/(--pvs-[\w-]+)\s*:/g)) defined.add(match[1] as string);
    // Components set some per-instance (`'--pvs-gap'`, `'--pvs-rail-color'`).
    for (const match of tsx.matchAll(/'(--pvs-[\w-]+)'/g)) defined.add(match[1] as string);

    const undefinedUse: string[] = [];
    for (const { file, css } of sheets) {
      for (const match of css.matchAll(/var\((--pvs-[\w-]+)/g)) {
        if (!defined.has(match[1] as string)) undefinedUse.push(`${file}: ${match[1]}`);
      }
    }
    expect(undefinedUse, undefinedUse.join('\n')).toEqual([]);
  });

  it('mirrors the Strato breakpoints it cannot read from a custom property', () => {
    // A media query cannot use `var()`, so the numbers are repeated. This is what
    // keeps the repetition honest.
    expect(BREAKPOINT.tablet).toBe(fallbackPx(Breakpoints.Max.Tablet));
    expect(BREAKPOINT.mobile).toBe(fallbackPx(Breakpoints.Max.Mobile));

    const allowed = new Set<number>([BREAKPOINT.tablet, BREAKPOINT.mobile]);
    for (const { file, css } of sheets) {
      for (const match of css.matchAll(/@media\s*\(\s*max-width:\s*(\d+)px\s*\)/g)) {
        expect(allowed.has(Number(match[1])), `${file}: @media max-width ${match[1]}px`).toBe(true);
      }
    }
  });

  it('switches transitions off under prefers-reduced-motion', () => {
    // Every rule that animates must be listed in a reduced-motion block, in the
    // sheet that declares it.
    for (const { file, css } of sheets) {
      const animated = new Set<string>();
      for (const match of css.matchAll(/([^{}@]+)\{([^{}]*\btransition\b[^{}]*)\}/g)) {
        for (const selector of (match[1] as string).split(',')) {
          const klass = selector.trim().match(/^\.(pvs-[\w-]+)/)?.[1];
          if (klass !== undefined) animated.add(klass);
        }
      }
      if (animated.size === 0) continue;
      const reduced = blockAfter(css, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
      expect(reduced, `${file}: no reduced-motion block`).not.toBeNull();
      for (const klass of animated) {
        expect(reduced, `${file}: .${klass} animates but is not in the reduced-motion block`).toContain(`.${klass}`);
      }
    }
  });

  it('gives every interactive surface a visible keyboard focus', () => {
    const css = sheets.map((sheet) => sheet.css).join('\n');
    expect(css).toMatch(/\.pvs-panel\[data-interactive='true'\]:focus-visible/);
    expect(css).toMatch(/\.pvs-nav__link:focus-visible/);
    expect(css).toMatch(/\.pvs-pager__link:focus-visible/);
    // The evidence badge and the "as of" trigger are Strato information-overlay buttons.
    expect(css).toMatch(/InformationOverlay'\]:focus-visible/);
    // Forced-colours users get system colours, not the theme's.
    expect(css).toMatch(/@media\s*\(\s*forced-colors:\s*active\s*\)/);
  });

  it('measures layout against the content area, not the viewport', () => {
    const css = sheets.map((sheet) => sheet.css).join('\n');
    expect(css).toMatch(/container-type:\s*inline-size/);
    expect(css).toMatch(/@container\s+pvs-page/);
  });
});

describe('story navigation', () => {
  const sectionRoutes = NAVIGATION.map((section) => section.route);
  const storyRouteList = STORY_STAGES.flatMap((stage) => stage.routes);

  it('has seven stages (3.8.1: Impact and Next steps left; 3.7.9: Discoveries and Evidence are one)', () => {
    expect(STORY_STAGES).toHaveLength(7);
  });

  it('places every page in exactly one stage', () => {
    expect([...storyRouteList].sort()).toEqual([...sectionRoutes].sort());
    expect(new Set(storyRouteList).size).toBe(storyRouteList.length);
  });

  it('orients by a number and a name, never by a hue', () => {
    // v2 gave each of seven chapters its own colour, which meant nothing. A stage
    // carries only its identity, its words and its pages.
    for (const stage of STORY_STAGES) {
      expect(Object.keys(stage).sort(), stage.id).toEqual(['blurbKey', 'id', 'labelKey', 'routes']);
    }
  });

  it('leaves the URL-only routes out of the story', () => {
    // 3.3.0 retired /problems-classic; /wrapup and /wrapup/prints are the URL-only routes left.
    expect(storyRouteList).not.toContain('/wrapup');
    expect(storyRouteList).not.toContain('/wrapup/prints');
  });

  it('keeps no stage empty', () => {
    for (const stage of STORY_STAGES) expect(stage.routes.length, stage.id).toBeGreaterThan(0);
  });

  it('translates every stage name and blurb', () => {
    for (const stage of STORY_STAGES) {
      expect(ALL_KEYS, stage.id).toContain(stage.labelKey);
      expect(ALL_KEYS, stage.id).toContain(stage.blurbKey);
    }
  });

  it('only hides pages that exist', () => {
    for (const route of EXECUTIVE_HIDDEN_ROUTES) expect(sectionRoutes, route).toContain(route);
  });

  it('never hides the pages an executive audience is shown', () => {
    for (const route of ['/', '/executive', '/value', '/report', '/opportunities', '/roadmap']) {
      expect(EXECUTIVE_HIDDEN_ROUTES.has(route), route).toBe(false);
    }
  });

  it('walks the whole story forwards and backwards without a gap', () => {
    for (const executive of [false, true]) {
      const order = storyRoutes(executive);
      expect(storyNeighbours(order[0] as string, executive).previous).toBeUndefined();
      expect(storyNeighbours(order[order.length - 1] as string, executive).next).toBeUndefined();
      order.forEach((route, index) => {
        const { previous, next } = storyNeighbours(route, executive);
        expect(previous?.route, `${route} previous`).toBe(order[index - 1]);
        expect(next?.route, `${route} next`).toBe(order[index + 1]);
      });
    }
  });

  it('returns no neighbours for a route outside the story', () => {
    expect(storyNeighbours('/wrapup', false)).toEqual({ previous: undefined, next: undefined });
  });
});

describe('evidence classes', () => {
  const provenances = Object.keys(PROVENANCE_META) as (keyof typeof PROVENANCE_META)[];

  it('describes every provenance class, and lists each exactly once in the legend', () => {
    expect(Object.keys(EVIDENCE).sort()).toEqual([...provenances].sort());
    expect([...EVIDENCE_ORDER].sort()).toEqual([...provenances].sort());
  });

  it('gives every class an icon of its own', () => {
    // The icon is the channel that survives greyscale and colour-blindness, so two
    // classes sharing one would make them indistinguishable there.
    const icons = provenances.map((provenance) => EVIDENCE[provenance].Icon);
    expect(new Set(icons).size).toBe(provenances.length);
  });

  it('reuses the dictionary keys of PROVENANCE_META instead of restating them', () => {
    for (const provenance of provenances) {
      expect(EVIDENCE[provenance].labelKey).toBe(PROVENANCE_META[provenance].labelKey);
      expect(EVIDENCE[provenance].descriptionKey).toBe(PROVENANCE_META[provenance].descriptionKey);
    }
  });

  it('never colours an absence as an alarm', () => {
    // v2 mapped `no-permission` to critical, against its own rule that red marks a
    // measured fault in the customer's estate and never "the app could not read it".
    for (const provenance of provenances) {
      if (EVIDENCE[provenance].family === 'unavailable') {
        expect(EVIDENCE[provenance].tone, provenance).toBe('neutral');
      }
    }
    expect(EVIDENCE['no-permission'].tone).toBe('neutral');
  });

  it('draws every approximation and every absence with a dashed border', () => {
    for (const provenance of provenances) {
      const entry = EVIDENCE[provenance];
      if (entry.family === 'measured') expect(entry.border, provenance).toBe('solid');
      if (entry.family === 'unavailable') expect(entry.border, provenance).toBe('dashed');
    }
    for (const approximate of ['partial', 'platform-estimate', 'projection'] as const) {
      expect(EVIDENCE[approximate].border, approximate).toBe('dashed');
    }
    expect(EVIDENCE.hypothesis.border).toBe('dashed');
  });

  it('marks a card dashed exactly when its class is', () => {
    for (const provenance of provenances) {
      const dashed = EVIDENCE[provenance].border === 'dashed';
      // `recommendation` is interpreted but firm in form, so it is the one
      // class that is not drawn dashed; everything dashed carries the attribute.
      expect(evidenceAttribute(provenance) !== undefined, provenance).toBe(dashed);
    }
  });

  // 3.4.16 (design proposal D-24): provenance is not health — no class wears a status colour; the icon, the word and
  // the dashed edge carry it. Only the recommendation keeps the primary tone (an action, not a reading).
  it('never paints provenance with a health colour', () => {
    const tones = provenances.map((provenance) => EVIDENCE[provenance].tone);
    for (const status of ['success', 'warning', 'critical']) expect(tones).not.toContain(status);
    expect(provenances.filter((provenance) => EVIDENCE[provenance].tone === 'primary')).toEqual(['recommendation']);
    const dashed = provenances.filter((provenance) => EVIDENCE[provenance].border === 'dashed' && EVIDENCE[provenance].family === 'interpreted');
    expect(dashed.sort()).toEqual(['hypothesis', 'partial', 'platform-estimate', 'projection']);
  });
});

describe('legacy styling stays gone', () => {
  /** Source with comments removed, so prose about the old style does not trip the guard. */
  function code(file: string): string {
    return readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
  }
  const files = sourceFiles(APP).map((file) => ({ file, rel: file.slice(APP.length + 1) }));

  /**
   * Where the old vocabulary is legitimately still needed, and why. Everything else
   * in the app must be free of it.
   *
   *  - `pages/TechWrapup.tsx`, `features/wrapup/`: the on-screen slides mirror the
   *    `.pptx` deck, which cannot use Strato tokens, so they carry their own palette.
   *  - `engine/printStyles.ts` (the SE Report's print stylesheet, shared with the Assessment since
   *    3.4.1): it *neutralises* `backdrop-filter`.
   *  - `components/viz/CapacityBars.tsx`: the hatching that marks reclaimable headroom.
   *  - `models/cloud.ts`: cloud providers' brand colours (identity, not decoration).
   */
  const DECK = (rel: string) => rel === 'pages/TechWrapup.tsx' || rel.startsWith('features/wrapup/');

  it('has no trace of the v2 surface vocabulary', () => {
    const offenders: string[] = [];
    for (const { file, rel } of files) {
      const text = code(file);
      for (const word of [
        /\bGlassPanel\b/,
        /\bAuroraBackground\b/,
        /\bNEON\b/,
        /\bglow\(/,
        /design\/premium/,
        /components\/premium/,
        /\baccentRule\b/,
        /\belevate\(/,
        /\bTONE_NEON\b|\bTONE_RULE\b|\bTONE_TEXT\b/,
      ]) {
        if (word.test(text)) offenders.push(`${rel}: ${word}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('draws no gradient, glow, blur or text shadow outside the exceptions', () => {
    const offenders: string[] = [];
    for (const { file, rel } of files) {
      if (DECK(rel)) continue;
      // The Spectrum sheet is the one place decoration is allowed; its own test sets the terms.
      if (rel === 'engine/spectrum.css') continue;
      let text = code(file);
      if (rel === 'components/viz/CapacityBars.tsx') text = text.replace(/repeating-linear-gradient\([^`]*\)/g, '');
      if (rel === 'engine/printStyles.ts') text = text.replace(/-?(?:webkit-)?backdrop-filter:\s*none\s*!important;?/g, '');
      for (const word of [/gradient\(/, /text-?[sS]hadow/, /backdrop-?[fF]ilter/, /\bblur\(/, /text-fill-color|background-clip:\s*text|WebkitBackgroundClip/]) {
        if (word.test(text)) offenders.push(`${rel}: ${word}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('sets no literal font size outside the exceptions', () => {
    // Sizes are Strato typography tokens or classes. A few viz components scale a
    // numeral to the size of the dial they draw; the deck has its own scale.
    const dynamic = new Set(['components/viz/HealthRing.tsx', 'components/viz/DonutBreakdown.tsx']);
    const offenders = files
      .filter(({ rel }) => !DECK(rel) && !dynamic.has(rel))
      .filter(({ file }) => /\bfontSize\s*:/.test(code(file)))
      .map(({ rel }) => rel);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('lets the page canvas own the page padding', () => {
    // `PageCanvas` supplies the padding and the width cap. A page that adds its own
    // doubles the margin, narrows the content and shifts its first heading.
    const offenders = files
      .filter(({ rel }) => rel.startsWith('pages/') && !DECK(rel))
      .filter(({ file }) => /<(?:Flex|Stack|Grid)\b[^>]*\bpadding=\{(?:24|32)\}/.test(code(file)))
      .map(({ rel }) => rel);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('never hands a fact an English unit word', () => {
    // A fact's `unit` is printed beside its figure. "problems" and "data sources" went to the
    // Portuguese screen as English. Units are symbols ('h', '%', 'HU', 'GiB/day') or `t(...)`.
    const offenders: string[] = [];
    for (const { file, rel } of files) {
      if (!(rel.startsWith('pages/') || rel.startsWith('features/') || rel.startsWith('components/'))) continue;
      if (DECK(rel)) continue;
      for (const match of code(file).matchAll(/\bunit:\s*'([^']*)'/g)) {
        if (/[a-z]{3,}/.test(match[1] ?? '')) offenders.push(`${rel}: unit: '${match[1]}'`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('never prints a window label without translating it', () => {
    // `timeframeLabel` (from the studio context) is a dictionary *key*
    // (`timeframe.now-24h`), meant to go through `tWindow`. Interpolated or assigned
    // raw it prints the key itself — "Measured over timeframe.now-24h" — in both
    // languages. (`signals.windowLabel` is already display-ready; the hook translates
    // it, which is why only the context value is matched.)
    const offenders: string[] = [];
    for (const { file, rel } of files) {
      if (/(?:window|windowLabel):\s*timeframeLabel\b/.test(code(file))) offenders.push(rel);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('writes no raw hex colour outside the exceptions', () => {
    const offenders: string[] = [];
    for (const { file, rel } of files) {
      if (DECK(rel) || rel === 'models/cloud.ts' || rel.endsWith('.css')) continue;
      if (/#[0-9a-fA-F]{6}\b/.test(code(file))) offenders.push(rel);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
