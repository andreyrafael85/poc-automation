#!/usr/bin/env node
/**
 * Visual verification harness for PoC Automation 3.0 (DEV-ONLY).
 *
 * Starts the standalone Vite setup in this directory (the REAL app with the
 * Dynatrace SDK mocked and synthetic fixtures), drives it with Playwright
 * (headless Chromium, localhost only, no tenant contact), and writes
 * screenshots plus a machine-readable report under .visual-qa/.
 *
 *   export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
 *   node scripts/visual/capture.mjs                      default run (rich; 3 cells)
 *   node scripts/visual/capture.mjs --help               every flag
 *
 * Nothing here is imported by the app, and nothing here touches ui/, docs/,
 * package.json, app.config.json or the ESLint config.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { build, createServer, preview } from 'vite';

import { captureBaseline, describeFocus, domChecks, installDescribe, waitForQuiet } from './checks.mjs';
import { EVIDENCE_IDS } from './fixtures/evidenceIds.mjs';
import { fixtureIds } from './fixtures/index.mjs';
import { FAKE_EMAIL, FAKE_IP } from './fixtures/prints.mjs';

/**
 * The partner states log in with a password that exists only in the harness: the owner's real
 * PoC password is never written in the repository (KT rule 6). The mocked App State is seeded
 * with this password's verifier, computed exactly as the app does (PBKDF2-SHA256, 120,000
 * iterations, 32 bytes), so the vault runs its real check against it.
 */
const HARNESS_PARTNER_PASSWORD = process.env.PVS_HARNESS_PARTNER_PASSWORD ?? 'harness-partner-pass';
const HARNESS_SALT = 'pvs.harness.access.v1';
const HARNESS_ACCESS_SEED = {
  'pvs.tenant.app.pvs.access.v1': JSON.stringify({
    v: 1,
    rev: 1,
    password: {
      salt: HARNESS_SALT,
      iterations: 120000,
      hash: pbkdf2Sync(HARNESS_PARTNER_PASSWORD, HARNESS_SALT, 120000, 32, 'sha256').toString('hex'),
      version: 1,
      setBy: 'harness@example.com',
      setAt: '2026-09-14T15:42:00.000Z',
    },
    expiryHours: 12,
    partners: {},
  }),
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const require = createRequire(import.meta.url);

// ------------------------------------------------------------------ options
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
};
const SCENARIOS = ['rich', 'sparse', 'denied', 'loading', 'error', 'scanlimit'];
const DEFAULT_CELLS = [
  ['desktop', 'light'],
  ['mobile', 'light'],
  ['desktop', 'dark'],
];
/** Frozen "now" so fixtures, "as of" stamps and screenshots are reproducible. */
const FIXED_NOW = '2026-09-15T12:00:00.000Z';

const HELP = `
Usage: node scripts/visual/capture.mjs [flags]

Matrix
  --scenarios a,b      ${SCENARIOS.join(' | ')}            (default rich)
  --routes /,/rca      routes to capture, or "all"                (default all = every STORY_STAGES route + the URL-only ones)
  --viewports a,b      ${Object.keys(VIEWPORTS).join(' | ')}   (default: see below)
  --themes light,dark  colour schemes                          (default: see below)
                       With neither --viewports nor --themes the default cells are
                       desktop-light, mobile-light, desktop-dark. If either is given the
                       cross product is used (viewports default desktop, themes default light).
  --full desktop,wide  viewports captured full height (default desktop,wide,tablet; "none" | "all")
  --max-height 9000    cap for full-height captures, in CSS px

Checks (all on by default)
  --no-checks          screenshots only (no DOM / a11y / keyboard / motion checks)
  --no-screenshots     checks only
  --no-keyboard        skip the 15-Tab keyboard smoke test
  --no-motion          skip the prefers-reduced-motion pass

Other modes
  --states             on "/": help menu, help sheets, sidebar, evidence overlay, executive mode, pt-BR
                       (viewports default desktop,tablet,mobile; scenario default rich)
  --only a,b           with --states: run only the states with these names; with --exports: only these blocks
  --i18n               compare English vs pt-BR text per route and list untranslated candidates
  --seed               start every page with a saved PoC on the mocked tenant (App State "seeded")
  --exports            what leaves the app: /report as a print-media PDF (page count, chrome hidden, no sideways overflow),
                       the Tech Wrapup .pptx (opens as a zip, one slide part per slide), the deck tab, and (3.2.7)
                       the real-prints deck end to end (shot list -> drawn companion ZIP -> approvals -> .pptx, PDF)
                       --only report-print,assessment-print,wrapup-pptx,wrapup-deck,prints-deck   limits the exports to those blocks
  --captures a,b       with --exports (wrapup-deck): pick these capture options before "Prepare captures", e.g.
                       problems.arrivals,problems.mix (3.4.18 — to photograph options that are not a section's default)
  --list               print routes, catalog ids and fixture coverage, then exit

Runtime
  --out DIR            output directory                        (default <repo>/.visual-qa)
  --mode dev|build     Vite dev server (default) or production build + preview
  --port N             dev server port                         (default 5199)
  --no-warmup          skip the all-routes warm-up that lets Vite finish optimising dependencies
  --workers N          parallel pages per cell                 (default 2)
  --report NAME        report file name without extension      (default report / report-states / report-i18n)
`;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}
const list = (value, fallback) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : fallback);

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  console.log(HELP);
  process.exit(0);
}
const OUT = typeof args.out === 'string' ? path.resolve(args.out) : path.join(repo, '.visual-qa');

// ----------------------------------------------------------------- playwright
const PLAYWRIGHT_CORE = process.env.PVS_PLAYWRIGHT_CORE ?? 'playwright-core';
const { chromium } = require(PLAYWRIGHT_CORE);

/**
 * 3.4.15 (design proposal D-11): the platform's own typeface in the screenshots. Strato loads DT Flow from
 * dt-cdn.net, which the offline harness cannot reach, so every capture used a system font and hid how the app
 * really reads (weights included). When the brand kit is on this machine (`PVS_BRAND_FONTS`, default below), each
 * DT Flow face Strato asks for is answered from the local file of the same weight; anything else stays offline.
 */
const BRAND_FONTS = process.env.PVS_BRAND_FONTS ?? path.join(os.homedir(), 'dynatrace-brand', 'DTFlow - V1.2');
const brandFontsAvailable = fs.existsSync(BRAND_FONTS);
/**
 * 3.4.15: Strato 3.18's AppHeader fetches the app's icon from the platform registry; offline that request never
 * answers and the header keeps a loading skeleton (an unnamed graphic). The harness answers it as the platform
 * would, with a small generated icon, so the header is captured as on the tenant.
 */
const APP_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" rx="4" fill="#3d3d47"/><text x="10" y="14" font-size="9" font-family="sans-serif" fill="#fff" text-anchor="middle">Po</text></svg>';
async function serveAppIcon(context) {
  await context.route(/\/platform\/app-engine\/registry\/v1\/app-icons\//, (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: APP_ICON_SVG }));
}

async function serveBrandFonts(context) {
  await serveAppIcon(context);
  if (!brandFontsAvailable) return;
  await context.route(/^https:\/\/dt-cdn\.net\/fonts\/DTFlow-([A-Za-z]+)-v[\d.]+\.woff2$/, async (route) => {
    const weight = /DTFlow-([A-Za-z]+)-v/.exec(route.request().url())?.[1] ?? '';
    const file = path.join(BRAND_FONTS, `DTFlow-${weight}.otf`);
    if (!fs.existsSync(file)) return route.abort();
    return route.fulfill({ status: 200, contentType: 'font/otf', body: fs.readFileSync(file) });
  });
}

async function launchBrowser() {
  const launchArgs = [
    // Offline by construction: every host except localhost fails DNS resolution.
    '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost',
    '--disable-gpu',
    '--font-render-hinting=none',
    '--force-color-profile=srgb',
  ];
  const attempts = [
    { args: launchArgs },
    ...(process.env.PVS_CHROMIUM ? [{ executablePath: process.env.PVS_CHROMIUM, args: launchArgs }] : []),
    { executablePath: '/snap/bin/chromium', args: launchArgs },
  ];
  let lastError;
  for (const attempt of attempts) {
    try {
      return await chromium.launch({ headless: true, ...attempt });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// --------------------------------------------------------------------- server
async function startServer() {
  const configFile = path.join(here, 'vite.config.mjs');
  if (args.mode === 'build') {
    console.log('[harness] building production bundle (vite build) ...');
    await build({ configFile, logLevel: 'warn' });
    // Module loader for introspection only (routes, catalog ids); it serves nothing.
    const loader = await createServer({ configFile, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
    const server = await preview({ configFile, preview: { port: Number(args.port ?? 5198), host: '127.0.0.1' } });
    return { loader, url: server.resolvedUrls.local[0], close: async () => { await server.close(); await loader.close(); } };
  }
  const server = await createServer({ configFile, server: { port: Number(args.port ?? 5199), strictPort: false } });
  await server.listen();
  return { loader: server, url: server.resolvedUrls.local[0], close: () => server.close() };
}

async function loadRoutes(loader) {
  const nav = await loader.ssrLoadModule(`/@fs${path.join(repo, 'ui/app/config/navigation.ts')}`);
  const stageRoutes = nav.STORY_STAGES.flatMap((stage) => stage.routes);
  const appSource = fs.readFileSync(path.join(repo, 'ui/app/App.tsx'), 'utf8');
  // The catch-all (`path="*"`, the 404 page since 3.3.0) is a fallback, not an address: it would
  // be captured as a route called "*". The 404 itself is covered by tests/v330.test.tsx.
  const declared = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((route) => route !== '*');
  // 3.3.0: /problems-classic is gone; the URL-only routes are whatever App.tsx declares and
  // STORY_STAGES does not list (today /wrapup and /wrapup/prints), picked up just below.
  const base = [...new Set(stageRoutes)];
  // Routes that exist in App.tsx but are not in the story navigation are captured too.
  const notInNavigation = declared.filter((route) => !base.includes(route));
  // 3.3.5: a tab that only an address opens is captured as its own route (the four dashboards). 3.6.6: the dashboards
  // live on the PoC builder (/builder, a stage route), so no tab needs its own capture.
  const tabRoutes = [];
  const routes = [...base, ...notInNavigation, ...tabRoutes];
  const notCaptured = notInNavigation;
  const notRouted = base.filter((route) => !declared.includes(route));
  const catalog = await loader.ssrLoadModule(`/@fs${path.join(repo, 'ui/app/queries/catalog.ts')}`);
  const catalogIds = Object.keys(catalog.CATALOG);
  return { routes, notCaptured, notRouted, catalogIds, stages: nav.STORY_STAGES.length };
}

const slug = (route) => (route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-'));

// ------------------------------------------------------------------- helpers
/** Signatures of dev-server dependency re-optimisation, not of app bugs. */
const FLAKY = /Invalid hook call|Outdated Optimize Dep|Failed to fetch dynamically imported module|reading 'use(Context|Ref|State|Effect|Memo)'\)/;

const HARNESS_NOISE = [
  /Missing get(Timezone|Theme|Language|RegionalFormat|NumberFormat|DateFormat)\w* function from web runtime/i,
  /Download the React DevTools/i,
  /^\[vite\]/,
  // dt-cdn.net web fonts cannot load offline; the harness falls back to system fonts.
  /Failed to load resource: net::ERR_NAME_NOT_RESOLVED/i,
];
const DEV_ONLY_WARNINGS = [/React Router Future Flag Warning/i];

function classify(text) {
  if (HARNESS_NOISE.some((re) => re.test(text))) return 'harness';
  if (DEV_ONLY_WARNINGS.some((re) => re.test(text))) return 'router-future-flag';
  return 'app';
}

async function formatConsole(message) {
  let text = message.text();
  if (text.includes('%s')) {
    try {
      const values = await Promise.all(message.args().slice(1).map((handle) => handle.jsonValue().catch(() => '')));
      let i = 0;
      text = text.replace(/%[sdo]/g, () => String(values[i++] ?? ''));
    } catch {
      /* keep raw text */
    }
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, 400);
}

function attachSinks(page) {
  const sink = { errors: new Map(), warnings: new Map(), pageErrors: [], blocked: [], fontsBlocked: 0, noise: 0, devWarnings: 0 };
  page.on('console', (message) => {
    const type = message.type();
    if (type !== 'error' && type !== 'warning') return;
    void formatConsole(message).then((text) => {
      const kind = classify(text);
      if (kind === 'harness') {
        sink.noise += 1;
        return;
      }
      if (kind === 'router-future-flag') {
        sink.devWarnings += 1;
        return;
      }
      const bucket = type === 'error' ? sink.errors : sink.warnings;
      bucket.set(text, (bucket.get(text) ?? 0) + 1);
    });
  });
  page.on('pageerror', (error) => sink.pageErrors.push(String(error.message ?? error).slice(0, 400)));
  page.on('crash', () => sink.pageErrors.push('PAGE CRASHED (renderer process died)'));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      if (/^https:\/\/dt-cdn\.net\/fonts\//.test(url)) sink.fontsBlocked += 1;
      else sink.blocked.push(url.slice(0, 120));
    }
  });
  return sink;
}
const resetSink = (sink) => {
  sink.errors.clear();
  sink.warnings.clear();
  sink.pageErrors.length = 0;
  sink.blocked.length = 0;
  sink.fontsBlocked = 0;
  sink.noise = 0;
  sink.devWarnings = 0;
};
const mapToList = (map) => [...map.entries()].map(([text, count]) => ({ text, count }));

async function settle(page, scenario) {
  // Lazy route chunks compile on first request in dev; real content (more than the short loading fallback) marks "rendered".
  await page
    .waitForFunction(() => ((document.querySelector('main#pvs-main') ?? document.querySelector('main'))?.innerText ?? '').trim().length > 80, null, { timeout: 15000 })
    .catch(() => undefined);
  for (let round = 0; round < 3; round += 1) {
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
    await page.waitForFunction(() => window.__PVS__ && window.__PVS__.pending === 0, null, { timeout: 20000 }).catch(() => undefined);
    // Outside the `loading` scenario a visible spinner means a lazy chunk or query has not finished yet
    // (the pager and footer already make the page look "non-empty", so text length alone is not enough).
    if (scenario !== 'loading') {
      await page
        .waitForFunction(() => document.querySelector('main [data-dt-component="ProgressCircle"]') === null && window.__PVS__.pending === 0, null, { timeout: 15000 })
        .catch(() => undefined);
    }
    await page.evaluate(waitForQuiet, { quietMs: scenario === 'loading' ? 300 : 450, maxMs: 4000 });
    const pending = await page.evaluate(() => window.__PVS__?.pending ?? 0);
    if (pending === 0) break;
  }
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => undefined);
}

function pageUrl(base, route, scenario, extra = {}) {
  // `--seed`: the tenant's App State starts with a saved PoC (customer, pillars and, since 3.2.5,
  // a PoC plan with dates and success criteria), so the configured pages are captured too.
  // A route may carry its own query (3.2.6: `/settings?tab=plan` opens a tab of the page).
  const [path, query = ''] = route.split('?');
  const params = new URLSearchParams({ scenario, locale: 'en', exec: '0', ...(args.seed ? { state: 'seeded' } : {}), ...Object.fromEntries(new URLSearchParams(query)), ...extra });
  const trimmed = path === '/' ? '' : path.replace(/^\//, '');
  return `${base}ui/${trimmed}?${params.toString()}`;
}

async function axUnnamed(cdp) {
  const interactive = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'slider', 'spinbutton']);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  let checked = 0;
  const bad = [];
  const badImages = [];
  let images = 0;
  for (const node of nodes) {
    if (node.ignored) continue;
    const role = node.role?.value;
    const unnamedNode = (node.name?.value ?? '').toString().trim() === '';
    if (role === 'img' || role === 'image' || role === 'graphics-symbol' || role === 'graphics-document') {
      images += 1;
      if (unnamedNode) badImages.push(node);
      continue;
    }
    if (!interactive.has(role)) continue;
    checked += 1;
    if (unnamedNode) bad.push(node);
  }
  const resolve = async (node) => {
    if (node.backendDOMNodeId === undefined) return { role: node.role.value, selector: '(unresolved)', text: '' };
    try {
      const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: node.backendDOMNodeId });
      const result = await cdp.send('Runtime.callFunctionOn', {
        objectId: object.objectId,
        functionDeclaration: 'function () { return window.__pvsDescribe(this); }',
        returnByValue: true,
      });
      return { role: node.role.value, ...result.result.value };
    } catch {
      return { role: node.role.value, selector: '(unresolved)', text: '' };
    }
  };
  const unnamedImages = [];
  for (const node of badImages.slice(0, 10)) unnamedImages.push(await resolve(node));
  const unnamed = [];
  for (const node of bad.slice(0, 15)) {
    unnamed.push(await resolve(node));
  }
  return { checked, unnamedCount: bad.length, unnamed, images, unnamedImageCount: badImages.length, unnamedImages };
}

async function keyboardSmoke(page) {
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.evaluate(captureBaseline);
  const sequence = [];
  for (let i = 0; i < 15; i += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(130); // let focus transitions finish before reading computed style
    sequence.push(await page.evaluate(describeFocus));
  }
  // Fails the spec test (outline-style != none or box-shadow != none) AND shows no visible change on itself or a wrapper.
  const noIndicator = sequence.filter((s) => !s.focusLost && !s.indicator && !s.indicatorOnWrapper && s.changedAt < 0);
  const specOnly = sequence.filter((s) => !s.focusLost && !s.indicator);
  let trapped = false;
  for (let i = 2; i < sequence.length; i += 1) {
    if (sequence[i].selector && sequence[i].selector === sequence[i - 1].selector && sequence[i].selector === sequence[i - 2].selector) trapped = true;
  }
  return {
    firstIsSkipLink: /skip/i.test(sequence[0]?.name ?? '') || /pvs-skip/.test(sequence[0]?.selector ?? ''),
    focusLost: sequence.filter((s) => s.focusLost).length,
    offscreenFocus: sequence.filter((s) => !s.focusLost && !s.inViewport && !/skip/i.test(s.name)).length,
    trapped,
    noIndicator: noIndicator.map((s) => ({ step: sequence.indexOf(s) + 1, tag: s.tag, name: s.name, selector: s.selector })),
    indicatorOnWrapperOnly: specOnly.length - noIndicator.length,
    sequence: sequence.map((s, i) => ({
      step: i + 1,
      tag: s.tag,
      role: s.role,
      name: s.name,
      indicator: s.indicator,
      wrapperIndicator: s.indicatorOnWrapper,
      changedAtLevel: s.changedAt,
      inViewport: s.inViewport,
      focusVisible: s.focusVisible,
      outline: `${s.outlineStyle ?? ''} ${s.outlineWidth ?? ''}`.trim(),
      boxShadow: s.boxShadow,
    })),
  };
}

/** Tall-viewport screenshots crash Chromium's software renderer when several run at once. */
let shotChain = Promise.resolve();
function serialised(task) {
  const run = shotChain.then(task, task);
  shotChain = run.catch(() => undefined);
  return run;
}

async function fullHeightScreenshot(page, file, viewport, full, maxHeight) {
  return serialised(() => fullHeightScreenshotNow(page, file, viewport, full, maxHeight));
}

async function fullHeightScreenshotNow(page, file, viewport, full, maxHeight) {
  let resized = false;
  if (full) {
    const extra = await page.evaluate(() => {
      let best = 0;
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.clientWidth > 300 && el.scrollHeight > el.clientHeight) {
          best = Math.max(best, el.scrollHeight - el.clientHeight);
        }
      }
      return best;
    });
    if (extra > 8) {
      const height = Math.min(viewport.height + extra + 8, maxHeight);
      await page.setViewportSize({ width: viewport.width, height });
      resized = true;
      await page.waitForTimeout(450);
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, animations: 'disabled', caret: 'hide', timeout: 30000 });
  if (resized) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
  }
  return resized;
}

// ----------------------------------------------------------------- evaluation
const verdict = (fail, warn = false) => (fail ? 'fail' : warn ? 'warn' : 'pass');

function evaluate(entry) {
  const c = {};
  c.console = verdict(entry.console.errors.length > 0 || entry.pageErrors.length > 0);
  c.consoleWarnings = verdict(false, entry.console.warnings.length > 0);
  if (entry.dom) {
    const d = entry.dom;
    c.render = verdict(d.render.mainTextLength < 40);
    c.overflow = verdict(d.overflow.document.overflowing || d.overflow.scroller?.overflowing === true);
    c.offscreenControls = verdict(d.offscreenControls.length > 0);
    c.imageAlt = verdict(d.images.missingAlt.length > 0 || (entry.a11yNames?.unnamedImageCount ?? 0) > 0);
    c.duplicateIds = verdict(d.duplicateIds.length > 0);
    c.headings = verdict(d.headings.h1Count !== 1 || d.headings.skips.length > 0);
    c.landmarks = verdict(d.landmarks.main !== 1);
    c.contrast = verdict(d.contrast.failing > 0);
    c.targetSize = verdict(d.targets.small.some((t) => !t.inline), d.targets.small.length > 0);
    if (d.pvs.unmatched.length > 0) c.fixtures = 'warn';
    // 3.5.3: cards that do not fit their row are a warning for review, never a failure.
    if (d.fit) c.fit = verdict(false, d.fit.unbalancedCount > 0 || d.fit.hollowCount > 0);
  }
  if (entry.a11yNames) c.accessibleNames = verdict(entry.a11yNames.unnamedCount > 0);
  if (entry.reducedMotion) c.reducedMotion = verdict(!entry.reducedMotion.renders || entry.reducedMotion.pageErrors > 0, entry.reducedMotion.infiniteAnimations > 0);
  if (entry.keyboard) {
    const k = entry.keyboard;
    // 3.6.5: a ring drawn by a wrapper that focusing changed (the platform's Select draws it on its box) is a visible
    // indicator — reported (`indicatorOnWrapperOnly`), no longer a warning.
    c.keyboard = verdict(k.noIndicator.length > 0 || k.trapped || k.focusLost > 3, !k.firstIsSkipLink || k.offscreenFocus > 0);
  }
  c.offline = verdict(entry.blocked.length > 0);
  return c;
}

// -------------------------------------------------------------- page capture
async function capturePage({ page, cdp, sink, base, cell, route, scenario, opts }) {
  const { viewportName, theme } = cell;
  const viewport = VIEWPORTS[viewportName];
  resetSink(sink);
  const url = pageUrl(base, route, scenario);
  const entry = { scenario, route, viewport: viewportName, size: `${viewport.width}x${viewport.height}`, theme, url: url.replace(base, '/') };
  const started = Date.now();
  const timings = {};
  const mark = (name, since) => {
    timings[name] = Date.now() - since;
  };
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((error) => sink.pageErrors.push(`navigation: ${error.message}`));
  mark('goto', started);
  const settleStart = Date.now();
  await settle(page, scenario);
  mark('settle', settleStart);
  entry.loadMs = Date.now() - started;
  entry.timings = timings;

  const shotStart = Date.now();
  if (opts.screenshots) {
    const file = path.join(OUT, scenario, `${slug(route)}__${viewportName}__${theme}.png`);
    const full = opts.full.has(viewportName);
    entry.screenshot = path.relative(OUT, file);
    entry.fullHeight = await fullHeightScreenshot(page, file, viewport, full, opts.maxHeight).catch((error) => {
      sink.pageErrors.push(`screenshot: ${error.message}`);
      return false;
    });
    entry.bytes = fs.existsSync(file) ? fs.statSync(file).size : 0;
  }

  mark('screenshot', shotStart);
  const checksStart = Date.now();
  if (opts.checks) {
    entry.dom = await page.evaluate(domChecks);
    // What still loads: a spinner, or a progress bar without a value. A determinate bar (3.2.7: the guided
    // capture's "screen n of m") is content, not loading, and must not make the page look unfinished.
    entry.loadingIndicators = await page.evaluate(
      () =>
        [...document.querySelectorAll('[role=progressbar], [data-dt-component="ProgressCircle"]')].filter((el) => {
          const box = el.getBoundingClientRect();
          const determinate = el.getAttribute('role') === 'progressbar' && el.hasAttribute('aria-valuenow');
          return box.width > 0 && box.height > 0 && !determinate;
        }).length,
    );
    entry.a11yNames = await axUnnamed(cdp).catch((error) => ({ checked: 0, unnamedCount: 0, unnamed: [], error: String(error.message) }));
    mark('domAndAx', checksStart);
    const kbStart = Date.now();
    if (opts.keyboard) entry.keyboard = await keyboardSmoke(page);
    mark('keyboard', kbStart);
  }
  entry.console = { errors: mapToList(sink.errors), warnings: mapToList(sink.warnings), routerFutureFlagWarnings: sink.devWarnings, harnessNoiseIgnored: sink.noise, webFontsBlockedOffline: sink.fontsBlocked };
  entry.pageErrors = [...sink.pageErrors];
  entry.blocked = [...sink.blocked];

  const motionStart = Date.now();
  if (opts.checks && opts.motion) {
    resetSink(sink);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => undefined);
    await settle(page, scenario);
    const probe = await page.evaluate(() => {
      const main = document.querySelector('main#pvs-main') ?? document.querySelector('main');
      const anims = document.getAnimations().filter((a) => a.playState === 'running');
      return {
        textLength: (main?.innerText ?? '').trim().length,
        infiniteAnimations: anims.filter((a) => a.effect?.getComputedTiming?.().iterations === Infinity).length,
        runningAnimations: anims.length,
        matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    });
    entry.reducedMotion = {
      emulated: probe.matches,
      renders: probe.textLength >= 40,
      mainTextLength: probe.textLength,
      runningAnimations: probe.runningAnimations,
      infiniteAnimations: probe.infiniteAnimations,
      pageErrors: sink.pageErrors.length,
    };
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    mark('motion', motionStart);
  }

  if (opts.checks) entry.checks = evaluate(entry);
  return entry;
}

async function newCell(browser, cell) {
  const viewport = VIEWPORTS[cell.viewportName];
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: cell.theme,
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
    acceptDownloads: false,
  });
  await serveBrandFonts(context);
  await context.clock.setFixedTime(new Date(FIXED_NOW));
  await context.addInitScript(installDescribe);
  return context;
}

/** Visits every route once so Vite discovers and optimises all dependencies before anything is measured. */
async function warmUp(browser, base, routes) {
  const context = await browser.newContext({ viewport: VIEWPORTS.desktop, serviceWorkers: 'block' });
  await serveBrandFonts(context);
  const queue = [...routes];
  const started = Date.now();
  const worker = async () => {
    for (;;) {
      const route = queue.shift();
      if (route === undefined) return;
      const page = await context.newPage();
      await page.goto(pageUrl(base, route, 'rich'), { waitUntil: 'networkidle', timeout: 90000 }).catch(() => undefined);
      await page.waitForSelector('main', { timeout: 20000 }).catch(() => undefined);
      await page.close().catch(() => undefined);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  await context.close();
  console.log(`[harness] warm-up: ${routes.length} routes in ${((Date.now() - started) / 1000).toFixed(0)} s`);
}

async function runMatrix({ browser, base, routes }) {
  const scenarios = list(args.scenarios, ['rich']);
  for (const scenario of scenarios) if (!SCENARIOS.includes(scenario)) throw new Error(`unknown scenario "${scenario}"`);
  const chosenRoutes = args.routes === undefined || args.routes === 'all' ? routes : list(args.routes, routes);
  let cells;
  if (args.viewports === undefined && args.themes === undefined) {
    cells = DEFAULT_CELLS.map(([viewportName, theme]) => ({ viewportName, theme }));
  } else {
    const viewportNames = list(args.viewports, ['desktop']);
    const themes = list(args.themes, ['light']);
    cells = viewportNames.flatMap((viewportName) => themes.map((theme) => ({ viewportName, theme })));
  }
  for (const cell of cells) if (!VIEWPORTS[cell.viewportName]) throw new Error(`unknown viewport "${cell.viewportName}"`);
  const fullArg = args.full ?? 'desktop,wide,tablet';
  const opts = {
    screenshots: !args['no-screenshots'],
    checks: !args['no-checks'],
    keyboard: !args['no-keyboard'],
    motion: !args['no-motion'],
    full: new Set(fullArg === 'all' ? Object.keys(VIEWPORTS) : fullArg === 'none' ? [] : list(fullArg, [])),
    maxHeight: Number(args['max-height'] ?? 9000),
  };
  const workers = Math.max(1, Number(args.workers ?? 2));
  const results = [];
  const total = scenarios.length * cells.length * chosenRoutes.length;
  let done = 0;

  for (const scenario of scenarios) {
    for (const cell of cells) {
      const context = await newCell(browser, cell);
      const queue = [...chosenRoutes];
      const worker = async () => {
        for (;;) {
          const route = queue.shift();
          if (route === undefined) break;
          let entry;
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            // A fresh page per route: a crashed or leaky page can never poison the next route.
            const page = await context.newPage();
            const sink = attachSinks(page);
            const cdp = await context.newCDPSession(page);
            await cdp.send('Accessibility.enable').catch(() => undefined);
            await cdp.send('DOM.enable').catch(() => undefined);
            try {
              entry = await capturePage({ page, cdp, sink, base, cell, route, scenario, opts });
              entry.attempts = attempt;
              await page.close().catch(() => undefined);
              // Vite re-optimising dependencies mid-run (a newly imported package) leaves a page with two
              // React copies or a stale chunk. That is a harness artefact, not an app defect: look again.
              entry.harnessFlaky = FLAKY.test([...entry.pageErrors, ...entry.console.errors.map((e) => e.text)].join('\n'));
              const stillSpinning = scenario !== 'loading' && (entry.loadingIndicators ?? entry.dom?.render.spinnersVisible ?? 0) > 0;
              if ((entry.harnessFlaky || stillSpinning || (opts.checks && entry.checks?.render === 'fail')) && attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                continue;
              }
              break;
            } catch (error) {
              entry = { scenario, route, viewport: cell.viewportName, theme: cell.theme, attempts: attempt, fatal: String(error.stack ?? error).slice(0, 600), checks: { console: 'fail' }, console: { errors: [], warnings: [] }, pageErrors: [String(error.message)], blocked: [] };
              await page.close().catch(() => undefined);
              if (!/crash|closed/i.test(String(error.message))) break;
            }
          }
          results.push(entry);
          done += 1;
          const failed = Object.entries(entry.checks ?? {}).filter(([, v]) => v === 'fail').map(([k]) => k);
          console.log(`[${String(done).padStart(3)}/${total}] ${scenario} ${cell.viewportName}-${cell.theme} ${route.padEnd(18)} ${failed.length === 0 ? 'ok' : `FAIL: ${failed.join(',')}`}${entry.fatal ? ` | ${entry.fatal.split('\n')[0]}` : ''}${entry.attempts > 1 ? ` (attempt ${entry.attempts})` : ''}`);
        }
      };
      await Promise.all(Array.from({ length: workers }, worker));
      await context.close();
    }
  }
  const order = new Map(chosenRoutes.map((route, i) => [route, i]));
  results.sort((a, b) => a.scenario.localeCompare(b.scenario) || a.viewport.localeCompare(b.viewport) || a.theme.localeCompare(b.theme) || (order.get(a.route) ?? 0) - (order.get(b.route) ?? 0));
  return { results, scenarios, cells, routes: chosenRoutes, opts };
}

function summarise(results) {
  const byCheck = {};
  for (const entry of results) {
    for (const [name, value] of Object.entries(entry.checks ?? {})) {
      byCheck[name] ??= { pass: 0, warn: 0, fail: 0 };
      byCheck[name][value] += 1;
    }
  }
  return byCheck;
}

function printSummary(summary, total) {
  console.log(`\nSummary over ${total} page captures (pass / warn / fail):`);
  for (const [name, counts] of Object.entries(summary)) {
    console.log(`  ${name.padEnd(18)} ${String(counts.pass).padStart(4)} ${String(counts.warn).padStart(4)} ${String(counts.fail).padStart(4)}`);
  }
}

// -------------------------------------------------------------------- states
async function clickFirstVisible(page, locator, timeout = 4000) {
  await locator.first().waitFor({ state: 'visible', timeout }).catch(() => undefined);
  const count = await locator.count();
  for (let i = 0; i < count; i += 1) {
    const item = locator.nth(i);
    if (await item.isVisible().catch(() => false)) {
      await item.scrollIntoViewIfNeeded().catch(() => undefined);
      await item.click({ timeout });
      return true;
    }
  }
  return false;
}

async function runStates({ browser, base }) {
  const scenarios = list(args.scenarios, ['rich']);
  const viewportNames = list(args.viewports, ['desktop', 'tablet', 'mobile']);
  const themes = list(args.themes, ['light']);
  const results = [];

  const states = [
    {
      name: 'baseline',
      run: async () => ({ ok: true }),
    },
    {
      name: 'help-menu-open',
      run: async (page) => {
        const ok = await clickFirstVisible(page, page.getByRole('button', { name: /^help$/i }));
        await page.waitForSelector('[role=menu]', { timeout: 3000 }).catch(() => undefined);
        const items = await page.locator('[role=menuitem]').allInnerTexts().catch(() => []);
        return { ok, note: `menu items: ${items.map((s) => s.trim()).join(' | ')}` };
      },
    },
    ...[
      ['guide', /get started|primeiros passos/i],
      ['whats-new', /what.?s new|novidades/i],
      ['methodology', /methodology|metodologia/i],
      ['sources', /data sources|fontes/i],
      ['about', /^about|sobre/i],
    ].map(([key, pattern]) => ({
      name: `help-sheet-${key}`,
      run: async (page) => {
        if (!(await clickFirstVisible(page, page.getByRole('button', { name: /^help$/i })))) return { ok: false, note: 'help trigger not found' };
        await page.waitForSelector('[role=menu]', { timeout: 3000 }).catch(() => undefined);
        let item = page.getByRole('menuitem', { name: pattern }).first();
        if (!(await item.isVisible().catch(() => false))) {
          // Methodology and data sources live under the "Documentation" submenu.
          await page.getByRole('menuitem', { name: /documentation|documenta/i }).first().click().catch(() => undefined);
          await page.waitForTimeout(400);
          item = page.getByRole('menuitem', { name: pattern }).first();
        }
        if (!(await item.isVisible().catch(() => false))) return { ok: false, note: `menu entry ${pattern} not found` };
        await item.click();
        await page.waitForSelector('[role=dialog]', { timeout: 4000 }).catch(() => undefined);
        await page.waitForTimeout(500);
        const dialog = await page.evaluate(() => {
          const d = document.querySelector('[role=dialog]');
          if (!d) return null;
          const r = d.getBoundingClientRect();
          const focusable = d.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length;
          return { width: Math.round(r.width), height: Math.round(r.height), focusable, buttons: d.querySelectorAll('button').length, focusInside: d.contains(document.activeElement), modal: d.getAttribute('aria-modal') };
        });
        return { ok: dialog !== null, note: dialog === null ? 'no dialog opened' : `dialog ${dialog.width}x${dialog.height}, ${dialog.buttons} buttons, ${dialog.focusable} focusable, focus inside: ${dialog.focusInside}, aria-modal: ${dialog.modal}`, dialog };
      },
    })),
    {
      name: 'sidebar',
      run: async (page, viewportName) => {
        // Strato <= 3.14 named the button "Expand sidebar" / "Collapse sidebar"; 3.15 names it "Sidebar"
        // and reports the state with aria-expanded.
        const open = page.locator('button[aria-expanded="false"]').filter({ hasText: /^$/ }).and(page.getByRole('button', { name: /^sidebar$|expand sidebar|open sidebar|expandir/i }));
        if (await clickFirstVisible(page, open)) {
          await page.waitForTimeout(500);
          return { ok: true, note: 'clicked expand' };
        }
        const close = page.locator('button[aria-expanded="true"]').and(page.getByRole('button', { name: /^sidebar$|collapse sidebar|close sidebar|recolher/i }));
        if (await clickFirstVisible(page, close)) {
          await page.waitForTimeout(500);
          return { ok: true, note: `clicked collapse (${viewportName})` };
        }
        return { ok: false, note: 'no sidebar toggle found' };
      },
    },
    {
      name: 'sidebar-collapsed-after-toggle',
      run: async (page) => {
        // Expand then collapse again, to capture the narrow state at wider viewports.
        const toggle = () => page.getByRole('button', { name: /^sidebar$|(expand|collapse|open|close) sidebar/i });
        const first = await clickFirstVisible(page, toggle());
        await page.waitForTimeout(400);
        const second = await clickFirstVisible(page, toggle());
        await page.waitForTimeout(400);
        return { ok: first && second, note: `toggled twice: ${first},${second}` };
      },
    },
    {
      name: 'evidence-badge-overlay',
      run: async (page) => {
        const badge = page.locator('main button[aria-label*="vidence class" i], main button[aria-label*="evid" i]');
        const ok = await clickFirstVisible(page, badge);
        await page.waitForTimeout(500);
        return { ok, note: ok ? 'badge opened' : 'no evidence badge trigger found' };
      },
    },
    {
      name: 'timeframe-select-open',
      run: async (page) => {
        const select = page.locator('header [data-dt-component="Select"]').nth(1);
        const ok = await select.click({ timeout: 3000 }).then(() => true).catch(() => false);
        await page.waitForTimeout(400);
        return { ok, note: ok ? 'opened' : 'window select not found' };
      },
    },
    {
      name: 'language-select-open',
      run: async (page) => {
        const select = page.locator('header [data-dt-component="Select"]').first();
        const ok = await select.click({ timeout: 3000 }).then(() => true).catch(() => false);
        await page.waitForTimeout(400);
        return { ok, note: ok ? 'opened' : 'language select not found' };
      },
    },
    {
      name: 'executive-mode-on',
      run: async (page) => {
        const before = await page.locator('nav a').count();
        const toggle = page.getByRole('switch').first();
        const ok = await toggle.click({ force: true, timeout: 3000 }).then(() => true).catch(() => false);
        await page.waitForTimeout(600);
        const after = await page.locator('nav a').count();
        return { ok, note: `nav links ${before} -> ${after}` };
      },
    },
    {
      name: 'executive-mode-seeded',
      url: { exec: '1' },
      run: async (page) => {
        const checked = await page.getByRole('switch').first().isChecked().catch(() => false);
        return { ok: checked, note: `switch checked: ${checked}` };
      },
    },
    // ---- 3.4.6: the Assessment's action plan — the SE edits an owner and saves it to the mocked tenant ----
    {
      name: 'assessment-plan-edit',
      route: '/coverage',
      url: { state: 'seeded' },
      run: async (page) => {
        // 3.6.4: by name — the Coverage page gained the "Depth map" tab before it.
        await page.getByRole('tab', { name: 'Findings and actions' }).click({ timeout: 8000 });
        const plan = page.getByTestId('asm-plan');
        await plan.waitFor({ timeout: 15000 });
        const owner = plan.getByPlaceholder('Team or role').nth(3);
        await owner.fill('Logging team');
        const unsaved = await plan.getByText('Changes not saved yet.').isVisible().catch(() => false);
        await page.getByTestId('asm-plan-save').click();
        const saved = await plan
          .getByText('Plan saved for the PoC team.')
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false);
        const stored = await page.evaluate(() => globalThis.sessionStorage.getItem('pvs.tenant.app.pvs.assessment.plan.v1') ?? '');
        await plan.scrollIntoViewIfNeeded();
        return { ok: unsaved && saved && stored.includes('Logging team'), note: `unsaved shown: ${unsaved}; saved: ${saved}; stored: ${stored.includes('Logging team')}` };
      },
    },
    // ---- 3.4.9: the conversation guide by audience — the SE picks "SRE & operations" ----
    {
      name: 'assessment-persona',
      route: '/coverage',
      url: { state: 'seeded' },
      run: async (page) => {
        // 3.6.4: by name — the Coverage page gained the "Depth map" tab before it.
        await page.getByRole('tab', { name: 'Findings and actions' }).click({ timeout: 8000 });
        const guide = page.getByTestId('asm-guide');
        await guide.waitFor({ timeout: 15000 });
        // 3.4.13: on a phone the audience selector scrolls sideways — bring the option into view, then pick it.
        const radio = guide.getByRole('radio', { name: 'SRE & operations' });
        // (a forced click there lands on the scroll arrow drawn over the option, so the click is sent to the option).
        await radio.scrollIntoViewIfNeeded().catch(() => undefined);
        await radio.dispatchEvent('click');
        const persona = page.getByTestId('asm-persona-sre');
        const shown = await persona.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        const text = shown ? await persona.innerText() : '';
        await guide.scrollIntoViewIfNeeded();
        return { ok: shown && text.includes('Opening questions'), note: `persona shown: ${shown}` };
      },
    },
    // ---- 3.4.11: app consumption — since 3.4.13 a Licensing tab, priced in the cost projection (rate card on) ----
    {
      name: 'settings-consumption',
      // 3.4.13: opened by its route — on a phone the side navigation is collapsed, so a click on "Licensing" never
      // reached the page (the state failed there since 3.4.11); Licensing's own reads feed the meter.
      route: '/licensing',
      url: { state: 'priced' },
      run: async (page) => {
        await page.waitForTimeout(1500);
        await page.getByRole('tab', { name: 'App consumption' }).click({ timeout: 8000 });
        const meter = page.getByTestId('consumption-meter');
        await meter.waitFor({ timeout: 15000 });
        const total = await page.getByTestId('consumption-meter-total').innerText();
        const preflightShown = await page.getByTestId('consumption-preflight').isVisible();
        await page.getByTestId('lic-consumption-tocost').click({ timeout: 8000 });
        const cost = page.getByTestId('lic-appcost');
        const priced = await cost.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
        const costText = priced ? await cost.innerText() : '';
        if (priced) await cost.scrollIntoViewIfNeeded();
        return { ok: preflightShown && /GiB/.test(total) && priced && /USD/.test(costText), note: `${total.trim()} · cost panel: ${priced}` };
      },
    },
    // ---- 3.7.7: the first-run wizard — an empty tenant shows the steps instead of the pages; Settings stays open with a banner ----
    {
      name: 'setup-wizard',
      route: '/',
      url: { state: 'empty' },
      run: async (page) => {
        const wizard = page.getByTestId('setup-wizard');
        await wizard.waitFor({ timeout: 15000 });
        const steps = await page.locator('[data-testid^="setup-step-"]').count();
        const progress = ((await page.getByTestId('setup-progress').textContent()) ?? '').trim();
        await page.getByTestId('setup-next').click({ timeout: 8000 });
        const banner = await page.getByTestId('setup-banner').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
        const onSettings = /\/settings/.test(page.url());
        return { ok: steps === 7 && /0/.test(progress) && banner && onSettings, note: `steps: ${steps}; progress: "${progress.slice(0, 40)}"; next opens Settings with the banner: ${banner && onSettings}` };
      },
    },
    // ---- 3.7.6: the OpenPipeline kit with its pipeline created — the check line, the sources and the route's confirmation ----
    {
      name: 'builder-openpipeline-route',
      route: '/builder',
      url: { state: 'built' },
      run: async (page) => {
        await page.getByRole('tab', { name: 'OpenPipeline', exact: true }).click({ timeout: 8000 });
        await page.getByTestId('builder-op-route').waitFor({ timeout: 15000 });
        const check = (await page.getByTestId('builder-op-check').textContent({ timeout: 15000 })) ?? '';
        const sources = await page.locator('[data-testid^="builder-op-src-"]').count();
        await page.locator('[data-testid="builder-op-src-1"] input, [data-testid="builder-op-src-1"]').first().click({ timeout: 8000 });
        await page.getByTestId('builder-op-route-create').click({ timeout: 8000 });
        const confirm = await page.getByTestId('builder-op-route-confirm').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        await page.getByTestId('builder-op-route').scrollIntoViewIfNeeded();
        return { ok: /1,964/.test(check) && sources === 3 && confirm, note: `check: "${check.slice(0, 50)}…"; sources: ${sources}; route confirmation: ${confirm}; nothing written` };
      },
    },
    // ---- 3.7.6: Licensing → App consumption — what the licence was billed for the app's queries, and its query practices ----
    {
      name: 'licensing-app-consumption',
      route: '/licensing',
      url: { state: 'priced' },
      run: async (page) => {
        await page.waitForTimeout(1500);
        await page.getByRole('tab', { name: 'App consumption' }).click({ timeout: 8000 });
        const billing = page.getByTestId('consumption-billing');
        await billing.waitFor({ timeout: 15000 });
        await page.getByTestId('consumption-billing-current').waitFor({ timeout: 15000 });
        const text = await billing.innerText();
        const practices = await page.locator('[data-testid="consumption-practices"] tbody tr').count();
        await billing.scrollIntoViewIfNeeded();
        return { ok: /USD/.test(text) && practices === 8, note: `billing panel priced: ${/USD/.test(text)}; practices: ${practices}` };
      },
    },
    // ---- 3.4.13: Settings → Prerequisites — the PoC's prerequisites guide, drawing and checklist ----
    {
      name: 'settings-prerequisites',
      route: '/settings',
      url: { state: 'seeded' },
      run: async (page) => {
        await page.getByRole('tab', { name: 'Prerequisites' }).click({ timeout: 8000 });
        const guide = page.getByTestId('prq-guide');
        await guide.waitFor({ timeout: 15000 });
        const sections = await page.locator('[data-testid="prq-tenant"], [data-testid="prq-network"], [data-testid="prq-activegate"], [data-testid="prq-oneagent"], [data-testid="prq-rum"], [data-testid="prq-access"]').count();
        const diagram = await page.getByTestId('prq-diagram').isVisible();
        const links = await guide.locator('a[href^="https://docs.dynatrace.com/docs/"]').count();
        // The picture shows the connectivity drawing and the first checklists (the steps were reviewed in 3.4.13).
        await page.getByTestId('prq-diagram').scrollIntoViewIfNeeded();
        return { ok: sections === 6 && diagram && links > 20, note: `sections: ${sections}; diagram: ${diagram}; doc links: ${links}` };
      },
    },
    // ---- 3.5.4: Services → Quadrants (a tab not shown by default) and the RCA propagation with its affected-entities tab ----
    {
      name: 'services-quadrants',
      route: '/services',
      run: async (page) => {
        await page.getByRole('tab', { name: 'Quadrants' }).click({ timeout: 8000 });
        const chart = page.locator('[data-pvs-chart="service-quadrants"]');
        await chart.waitFor({ timeout: 15000 });
        const dots = await chart.locator('.pvs-quad__dot').count();
        const named = await chart.locator('.pvs-quad__name').count();
        await chart.scrollIntoViewIfNeeded();
        return { ok: dots > 0, note: `points: ${dots}; named: ${named}` };
      },
    },
    // ---- 3.7.3: Infrastructure's capacity against usage as a map (the owner: the old bars were too large) ----
    {
      name: 'infra-capacity-map',
      route: '/infrastructure',
      run: async (page) => {
        await page.getByRole('tab', { name: 'Capacity by host' }).click({ timeout: 8000 });
        const map = page.locator('[data-pvs-chart="capacity-map"]');
        await map.waitFor({ timeout: 15000 });
        const groups = await map.locator('.pvs-capmap__group').count();
        const cards = await map.locator('.pvs-capmap__card').count();
        await map.scrollIntoViewIfNeeded();
        return { ok: groups > 0 && cards > 0, note: `classes: ${groups}; host cards shown: ${cards}` };
      },
    },
    {
      name: 'rca-propagation',
      route: '/rca',
      run: async (page) => {
        const prop = page.getByTestId('rca-propagation');
        await prop.waitFor({ timeout: 15000 });
        const columns = await prop.locator('.pvs-prop__col').count();
        const cards = await prop.locator('.pvs-prop__card').count();
        await page.getByRole('tab', { name: 'Affected entities' }).click({ timeout: 8000 });
        const rows = await page.getByTestId('rca-affected-table').locator('tbody tr').count();
        await page.getByRole('tab', { name: 'Propagation' }).click({ timeout: 8000 });
        await prop.scrollIntoViewIfNeeded();
        return { ok: columns >= 2 && cards > 0 && rows > 0, note: `columns: ${columns}; cards: ${cards}; affected rows: ${rows}` };
      },
    },
    // ---- 3.6.6: the PoC builder — the four dashboards as cards; one card's details open below the grid (nothing created) ----
    {
      name: 'builder-dashboards',
      route: '/builder',
      url: { state: 'seeded' },
      run: async (page) => {
        const kits = await page.locator('[data-testid^="builder-kit-"]').count();
        await page.getByTestId('builder-details-infra').click({ timeout: 8000 });
        const create = await page.getByTestId('dash3-create-infra').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        const logo = await page.getByTestId('builder-logo').locator('img').count();
        await page.getByTestId('dash3-create-infra').scrollIntoViewIfNeeded().catch(() => undefined);
        // 3.7.3: eight dashboard cards (Kubernetes and Databases joined).
        return { ok: kits === 8 && create && logo === 1, note: `kits: ${kits}; details open: ${create}; logo preview: ${logo}` };
      },
    },
    // ---- 3.6.9: the PoC Builder's SLO and workflow kits — their tabs, the services offered, the confirmations ----
    // 3.7.4: one subject per tab — SLOs, Workflows (the triage and the weekly summary) and Synthetic.
    {
      name: 'builder-automation',
      route: '/builder',
      url: { state: 'seeded' },
      run: async (page) => {
        await page.getByRole('tab', { name: 'SLOs', exact: true }).click({ timeout: 8000 });
        await page.getByTestId('builder-slo-kit').waitFor({ timeout: 8000 });
        const services = await page.locator('[data-testid^="builder-slo-svc-"]').count();
        await page.getByTestId('builder-slo-create').click({ timeout: 8000 });
        const sloConfirm = await page.getByTestId('builder-slo-confirm').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        const fleet = await page.locator('[data-testid^="builder-slo-fleet-"]').count();
        await page.getByRole('tab', { name: 'Workflows', exact: true }).click({ timeout: 8000 });
        await page.getByTestId('builder-wf-kit').waitFor({ timeout: 8000 });
        const wfOpen = await page.getByTestId('builder-wf-open').count();
        const wfDownload = await page.getByTestId('builder-wf-download').count();
        const weekly = await page.getByTestId('builder-weekly-kit').count();
        const weeklyOpen = await page.getByTestId('builder-weekly-open').count();
        await page.getByRole('tab', { name: 'Synthetic', exact: true }).click({ timeout: 8000 });
        // The harness answers no synthetic location, so the kit says so.
        const monitors = await page.getByTestId('builder-monitor-kit').waitFor({ timeout: 8000 }).then(() => 1).catch(() => 0);
        // 3.7.8: the browser monitors kit sits first in the tab, beside the HTTP one.
        const browsers = await page.getByTestId('builder-browser-kit').waitFor({ timeout: 8000 }).then(() => 1).catch(() => 0);
        const ok = services > 0 && sloConfirm && fleet === 3 && wfOpen === 1 && wfDownload === 1 && weekly === 1 && weeklyOpen === 1 && monitors === 1 && browsers === 1;
        return { ok, note: `services offered: ${services}; fleet SLOs: ${fleet}; SLO confirmation: ${sloConfirm}; triage workflow (open/download): ${wfOpen}/${wfDownload}; weekly summary: ${weekly}; HTTP / browser monitor kits: ${monitors}/${browsers}; nothing created` };
      },
    },
    // ---- 3.7.4: the PoC Builder's OpenPipeline and anomaly detection kits — their tabs and the confirmations ----
    {
      name: 'builder-settings-kits',
      route: '/builder',
      url: { state: 'seeded' },
      run: async (page) => {
        await page.getByRole('tab', { name: 'OpenPipeline', exact: true }).click({ timeout: 8000 });
        await page.getByTestId('builder-openpipeline-kit').waitFor({ timeout: 8000 });
        const preview = (await page.getByTestId('builder-op-preview').textContent({ timeout: 8000 })) ?? '';
        await page.getByTestId('builder-op-create').click({ timeout: 8000 });
        const opConfirm = await page.getByTestId('builder-op-confirm').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        await page.getByRole('tab', { name: 'Anomaly detection', exact: true }).click({ timeout: 8000 });
        await page.getByTestId('builder-anomaly-kit').waitFor({ timeout: 8000 });
        const services = await page.locator('[data-testid^="builder-ad-svc-"]').count();
        const signals = await page.locator('[data-testid^="builder-ad-kind-"]').count();
        // 3.7.8: one button per signal opens the Anomaly Detection app (an intent); nothing is clicked, nothing is created.
        const adButtons = await page.locator('[data-testid^="builder-ad-open-"]').count();
        await page.getByTestId('builder-ad-how').scrollIntoViewIfNeeded();
        const ok = /86\.7%/.test(preview) && opConfirm && services > 0 && signals === 3 && adButtons === 3;
        return { ok, note: `preview: "${preview.slice(0, 60)}…"; pipeline confirmation: ${opConfirm}; services: ${services}; signals: ${signals}; detector buttons: ${adButtons}; nothing created` };
      },
    },
    // ---- 3.6.7: the PoC Builder's notebook and launchpad kits — their tab, and the confirmation before a create ----
    {
      name: 'builder-documents',
      route: '/builder',
      url: { state: 'seeded' },
      run: async (page) => {
        await page.getByRole('tab', { name: 'Notebook and launchpad' }).click({ timeout: 8000 });
        const notebook = await page.getByTestId('builder-doc-notebook').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        const launchpad = await page.getByTestId('builder-doc-launchpad').count();
        await page.getByTestId('builder-create-launchpad').click({ timeout: 8000 });
        const confirm = await page.getByTestId('builder-confirm-launchpad').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        return { ok: notebook && launchpad === 1 && confirm, note: `notebook kit: ${notebook}; launchpad kit: ${launchpad}; confirmation shown: ${confirm} (nothing created)` };
      },
    },
    // ---- 3.6.4: Coverage → "Depth map" — every host a square, grouped by cloud, coloured by monitoring mode ----
    {
      name: 'coverage-depth-map',
      route: '/coverage',
      url: { state: 'seeded' },
      run: async (page) => {
        await page.getByRole('tab', { name: 'Depth map' }).click({ timeout: 8000 });
        const map = page.getByTestId('asm-depth');
        const shown = await map.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
        const groups = await map.locator('.pvs-depth__group').count();
        const squares = await map.locator('.pvs-depth__sq').count();
        const modes = await map.locator('.pvs-depth__key').count();
        await map.scrollIntoViewIfNeeded().catch(() => undefined);
        return { ok: shown && groups > 0 && squares > 0 && modes === 4, note: `groups: ${groups}; squares: ${squares}; legend: ${modes}` };
      },
    },
    // ---- 3.6.4: the discreet presentation mode — start it, step forward, read the bar, leave with Esc ----
    {
      name: 'presentation-mode',
      route: '/',
      run: async (page) => {
        let started = await clickFirstVisible(page, page.getByRole('button', { name: /^(Present|Apresentar)$/ }), 8000);
        if (!started) {
          // On a narrow header the actions fold into a menu.
          await clickFirstVisible(page, page.getByRole('button', { name: /more|mais/i }), 3000).catch(() => false);
          started = await clickFirstVisible(page, page.getByRole('menuitem', { name: /^(Present|Apresentar)$/ }), 3000).catch(() => false);
        }
        const bar = page.getByTestId('present-bar');
        const shown = await bar.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        // The steps are the page's panels: wait until the page has laid out more than its header.
        await page
          .waitForFunction(() => /\d+ of (\d{2,}|[3-9])$/.test((document.querySelector('[data-testid="present-step"]')?.textContent ?? '').trim()), null, { timeout: 15000 })
          .catch(() => undefined);
        await page.waitForTimeout(400);
        const first = (await page.getByTestId('present-step').innerText().catch(() => '')).trim();
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(600);
        const second = (await page.getByTestId('present-step').innerText().catch(() => '')).trim();
        const focused = await page.locator('[data-present-focus]').count();
        const faded = await page.locator('[data-present-step]:not([data-present-focus])').count();
        const phrase = (await page.locator('.pvs-present__phrase').innerText().catch(() => '')).trim();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        const closed = (await bar.count()) === 0;
        // Present again and step twice, so the state's picture shows the mode on (the bar, the panel in focus).
        await clickFirstVisible(page, page.getByRole('button', { name: /^(Present|Apresentar)$/ }), 3000).catch(() => false);
        await page.waitForTimeout(600);
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(900);
        return {
          ok: started && shown && /^2 of \d+$/.test(second) && focused === 1 && faded > 0 && phrase.replace(/^Now:\s*/, '') !== '—' && closed,
          note: `started: ${started}; steps: ${first} -> ${second}; focused: ${focused}; faded: ${faded}; phrase: "${phrase.slice(0, 60)}"; closed by Esc: ${closed}`,
        };
      },
    },
    // ---- 3.2: who may use the app (the partner's mini logon) and where the configuration lives ----
    {
      name: 'access-customer-gate',
      url: { as: 'customer' },
      run: async (page) => {
        const gate = await page.locator('.pvs-gate').isVisible().catch(() => false);
        const nav = await page.locator('nav a').count();
        return { ok: gate && nav === 0, note: `gate shown: ${gate}; nav links behind it: ${nav}` };
      },
    },
    {
      name: 'access-partner-wrong-password',
      url: { as: 'partner' },
      seed: HARNESS_ACCESS_SEED,
      run: async (page) => {
        await page.locator('.pvs-gate input').first().fill('not-the-password');
        await page.keyboard.press('Enter');
        const shown = await page
          .waitForFunction(() => (document.querySelector('.pvs-gate__msg')?.textContent ?? '').trim() !== '', null, { timeout: 8000 })
          .then(() => true)
          .catch(() => false);
        const message = await page.locator('.pvs-gate__msg').innerText().catch(() => '');
        const stillLocked = await page.locator('.pvs-gate').isVisible().catch(() => false);
        return { ok: shown && stillLocked, note: `message: "${message.trim()}"` };
      },
    },
    {
      name: 'access-partner-vault-open',
      url: { as: 'partner' },
      seed: HARNESS_ACCESS_SEED,
      run: async (page) => {
        await page.locator('.pvs-gate input').first().fill(HARNESS_PARTNER_PASSWORD);
        await page.keyboard.press('Enter');
        const open = await page
          .waitForSelector('.pvs-vault[data-state="ok"]', { timeout: 8000 })
          .then(() => true)
          .catch(() => false);
        return { ok: open, note: open ? 'vault opened with the PoC password' : 'vault did not open' };
      },
    },
    {
      name: 'access-partner-in-the-app',
      url: { as: 'partner' },
      seed: HARNESS_ACCESS_SEED,
      run: async (page, viewportName) => {
        await page.locator('.pvs-gate input').first().fill(HARNESS_PARTNER_PASSWORD);
        await page.keyboard.press('Enter');
        // A timeline, not a single probe: the vault shows "open" for under a second, then the app.
        const timeline = [];
        for (let step = 0; step < 16; step += 1) {
          await page.waitForTimeout(250);
          timeline.push(
            await page.evaluate(() => `${document.querySelector('.pvs-gate') ? 'gate' : 'no-gate'}/${document.querySelectorAll('nav a').length}`),
          );
        }
        const links = await page.locator('nav a').allInnerTexts().catch(() => []);
        const commercial = links.filter((text) => /licens|consum/i.test(text));
        // 3.6.4: commercial data is native to the partner since the switch was retired (rule 6), so Licensing and
        // Consumption are in the menu; on a phone the menu is folded behind its button.
        const folded = viewportName === 'mobile';
        const inApp = timeline[timeline.length - 1].startsWith('no-gate') && (folded || links.length > 3);
        return { ok: inApp && (folded || commercial.length > 0), note: `timeline ${timeline.join(' ')}; nav links: ${links.length}; licence/consumption links shown: ${commercial.length}` };
      },
    },
    {
      name: 'access-customer-executive-view',
      url: { as: 'customer' },
      run: async (page) => {
        const ok = await clickFirstVisible(page, page.getByRole('button', { name: /executive view|visão executiva/i }));
        await page.waitForSelector('nav a', { timeout: 8000 }).catch(() => undefined);
        const links = await page.locator('nav a').allInnerTexts().catch(() => []);
        const commercial = links.filter((text) => /licens|consum/i.test(text));
        return { ok: ok && links.length > 0 && commercial.length === 0, note: `nav links: ${links.join(' | ')}` };
      },
    },
    {
      name: 'access-se-commercial-switch',
      url: { as: 'se' },
      run: async (page, viewportName) => {
        // 3.6.4: the "Commercial data" switch was retired (rule 6): commercial data is native to the SE, and the
        // header's executive mode hides it. The state keeps its name and checks exactly that.
        const count = async () => (await page.locator('nav a').allInnerTexts().catch(() => [])).filter((text) => /licens|consum/i.test(text)).length;
        const toggle = page.getByRole('switch', { name: /executive mode|modo executivo/i }).first();
        if (viewportName === 'mobile' && !(await toggle.isVisible().catch(() => false))) {
          return { ok: true, note: 'executive mode switch folded on mobile by design' };
        }
        const before = await count();
        const ok = await toggle.click({ force: true, timeout: 3000 }).then(() => true).catch(() => false);
        await page.waitForTimeout(500);
        const after = await count();
        if (viewportName === 'mobile') {
          // The phone folds the menu behind its button: the switch itself says executive mode is on.
          const on = (await toggle.getAttribute('aria-checked').catch(() => null)) === 'true';
          return { ok: ok && on, note: `executive mode switched on: ${on} (menu folded on a phone)` };
        }
        return { ok: ok && before > 0 && after === 0, note: `licence/consumption links ${before} -> ${after} (executive mode on)` };
      },
    },
    {
      name: 'persistence-seeded-settings',
      route: '/settings',
      url: { state: 'seeded' },
      run: async (page) => {
        const name = await page.getByRole('textbox', { name: /customer or organi[sz]ation|cliente ou organiza/i }).first().inputValue().catch(() => null);
        const line = await page.getByText(/saved on the tenant|salvo na tenant/i).first().innerText().catch(() => '');
        return { ok: name === 'Acme Corp', note: `customer name "${name}"; ${line.trim()}` };
      },
    },
    {
      name: 'persistence-survives-reload',
      route: '/settings',
      url: { state: 'seeded' },
      run: async (page) => {
        const box = page.getByRole('textbox', { name: /customer or organi[sz]ation|cliente ou organiza/i }).first();
        await box.fill('Beta Industries');
        const apply = page.getByRole('button', { name: /apply all changes|aplicar (todas|tudo)/i }).first();
        const buttons = await page.getByRole('button').allInnerTexts().catch(() => []);
        const applyState = `${await apply.count()} apply button(s), disabled: ${await apply.isDisabled().catch(() => 'n/a')}; value in box: "${await box.inputValue()}"; buttons: ${buttons.map((b) => b.trim()).filter(Boolean).slice(-8).join(' | ')}`;
        const applied = await apply.click({ timeout: 4000 }).then(() => true).catch(() => false);
        await page.waitForFunction(() => /saved on the tenant|salvo na tenant/i.test(document.body.innerText), null, { timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(1600);
        const stored = await page.evaluate(() => {
          const raw = Object.entries(sessionStorage).find(([key]) => key.includes('pvs.shared.v1'))?.[1];
          try {
            return JSON.parse(raw ?? 'null')?.parameters?.customerName ?? null;
          } catch {
            return 'unparseable';
          }
        });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        const after = await page.getByRole('textbox', { name: /customer or organi[sz]ation|cliente ou organiza/i }).first().inputValue().catch(() => null);
        return { ok: after === 'Beta Industries', note: `${applyState}; apply clicked: ${applied}; stored on the tenant mock: "${stored}"; after leaving and returning: "${after}"` };
      },
    },
    {
      name: 'persistence-forbidden',
      route: '/settings',
      url: { state: 'forbidden' },
      run: async (page) => {
        const callout = await page.getByText(/not being kept|não está sendo guardada/i).first().isVisible().catch(() => false);
        const scope = await page.getByText(/state:(app|user-app)-states:/i).first().isVisible().catch(() => false);
        return { ok: callout && scope, note: `says it is not kept: ${callout}; names the missing scope: ${scope}` };
      },
    },
    {
      name: 'persistence-platform-error',
      route: '/settings',
      url: { state: 'fail' },
      run: async (page) => {
        const callout = await page.getByText(/could not be saved or read|não foi possível (salvar|ler)/i).first().isVisible().catch(() => false);
        return { ok: callout, note: `error shown instead of silence: ${callout}` };
      },
    },
    {
      name: 'assumptions-sheet',
      run: async (page) => {
        if (!(await clickFirstVisible(page, page.getByRole('button', { name: /^help$/i })))) return { ok: false, note: 'help trigger not found' };
        await page.waitForSelector('[role=menu]', { timeout: 3000 }).catch(() => undefined);
        await page.getByRole('menuitem', { name: /documentation|documenta/i }).first().click().catch(() => undefined);
        await page.waitForTimeout(400);
        const item = page.getByRole('menuitem', { name: /assumptions|premissas/i }).first();
        if (!(await item.isVisible().catch(() => false))) return { ok: false, note: 'assumptions entry not found' };
        await item.click();
        await page.waitForSelector('[role=dialog]', { timeout: 4000 }).catch(() => undefined);
        await page.waitForTimeout(500);
        const rows = await page.locator('[role=dialog] dl.pvs-facts dt').count();
        return { ok: rows >= 30, note: `assumption rows listed: ${rows}` };
      },
    },
    {
      name: 'locale-pt-BR-seeded',
      // 3.6.4: a language the user saved wins over the platform's, and the seeded config saved English — so this state
      // starts with nothing saved and checks the platform's pt-BR reaches the header.
      url: { locale: 'pt-BR', state: 'empty' },
      run: async (page) => {
        const shown = await page.locator('header [data-dt-component="Select"]').first().innerText().catch(() => '');
        return { ok: /portugu/i.test(shown), note: `language select shows "${shown.trim()}"` };
      },
    },
    {
      name: 'locale-pt-BR-via-ui',
      run: async (page) => {
        const select = page.locator('header [data-dt-component="Select"]').first();
        await select.click({ timeout: 3000 }).catch(() => undefined);
        const option = page.getByRole('option', { name: /portugu/i }).first();
        const ok = await option.click({ timeout: 3000 }).then(() => true).catch(() => false);
        await page.waitForTimeout(600);
        const shown = await select.innerText().catch(() => '');
        return { ok: ok && /portugu/i.test(shown), note: `language select shows "${shown.trim()}"` };
      },
    },
    {
      name: 'locale-pt-BR-help-menu',
      url: { locale: 'pt-BR' },
      run: async (page) => {
        const ok = await clickFirstVisible(page, page.getByRole('button', { name: /^(help|ajuda)$/i }));
        await page.waitForSelector('[role=menu]', { timeout: 3000 }).catch(() => undefined);
        return { ok, note: 'help menu in pt-BR' };
      },
    },
  ];

  const only = args.only === undefined ? null : list(args.only, []);
  const chosenStates = only === null ? states : states.filter((candidate) => only.includes(candidate.name));
  if (only !== null) {
    const unknown = only.filter((name) => !states.some((candidate) => candidate.name === name));
    if (unknown.length > 0) throw new Error(`unknown state(s): ${unknown.join(', ')}`);
  }

  for (const scenario of scenarios) {
    for (const viewportName of viewportNames) {
      for (const theme of themes) {
        const context = await newCell(browser, { viewportName, theme });
        for (const state of chosenStates) {
          let entry;
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            // A fresh page per state: one crashed or half-open page can never poison the next state.
            const page = await context.newPage();
            const sink = attachSinks(page);
            const cdp = await context.newCDPSession(page);
            await cdp.send('Accessibility.enable').catch(() => undefined);
            await cdp.send('DOM.enable').catch(() => undefined);
            entry = { scenario, route: state.route ?? '/', state: state.name, viewport: viewportName, theme, attempts: attempt };
            try {
              if (state.seed) {
                // Written into the mocked tenant (sessionStorage) before the app first reads it.
                await page.addInitScript((entries) => {
                  for (const [key, value] of entries) globalThis.sessionStorage.setItem(key, value);
                }, Object.entries(state.seed));
              }
              // 3.7.7: a state starts on the seeded PoC unless it names its own App State — an empty tenant now opens the
              // first-run wizard (the `setup-wizard` state checks it), which would hide the page under test.
              await page.goto(pageUrl(base, state.route ?? '/', scenario, { state: 'seeded', ...(state.url ?? {}) }), { waitUntil: 'networkidle', timeout: 60000 });
              await settle(page, scenario);
              const outcome = await state.run(page, viewportName);
              await page.waitForTimeout(350);
              Object.assign(entry, outcome);
              const file = path.join(OUT, 'states', scenario, `${state.name}__${viewportName}__${theme}.png`);
              fs.mkdirSync(path.dirname(file), { recursive: true });
              await page.screenshot({ path: file, animations: 'disabled', caret: 'hide', timeout: 30000 });
              entry.screenshot = path.relative(OUT, file);
              const dom = await page.evaluate(domChecks);
              entry.overflow = dom.overflow.document.overflowing || dom.overflow.scroller?.overflowing === true;
              entry.offscreenControls = dom.offscreenControls;
              entry.headings = { h1Count: dom.headings.h1Count, skips: dom.headings.skips };
              entry.a11yNames = await axUnnamed(cdp).catch(() => null);
            } catch (error) {
              entry.ok = false;
              entry.fatal = String(error.message).slice(0, 300);
            }
            entry.console = { errors: mapToList(sink.errors), warnings: mapToList(sink.warnings) };
            entry.pageErrors = [...sink.pageErrors];
            await page.close().catch(() => undefined);
            const retryable = /crash|closed/i.test(entry.fatal ?? '') || /help trigger not found|menu entry/.test(entry.note ?? '');
            if (!retryable) break;
          }
          results.push(entry);
          console.log(`[states] ${scenario} ${viewportName}-${theme} ${state.name.padEnd(32)} ${entry.ok ? 'ok' : 'NOT OK'} ${entry.note ?? entry.fatal ?? ''}${entry.attempts > 1 ? ` (attempt ${entry.attempts})` : ''}`);
        }
        await context.close();
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------- i18n
async function runI18n({ browser, base, routes }) {
  const chosenRoutes = args.routes === undefined || args.routes === 'all' ? routes : list(args.routes, routes);
  const scenario = list(args.scenarios, ['rich'])[0];
  const context = await newCell(browser, { viewportName: 'desktop', theme: 'light' });
  const page = await context.newPage();
  const sink = attachSinks(page);
  const collect = () =>
    page.evaluate(() => {
      const texts = new Set();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const el = node.parentElement;
        const text = (node.textContent ?? '').trim().replace(/\s+/g, ' ');
        if (el && text.length >= 4 && !el.closest('script, style, noscript') && el.getClientRects().length > 0) texts.add(text);
        node = walker.nextNode();
      }
      for (const el of document.querySelectorAll('[aria-label], [title]')) {
        for (const attr of ['aria-label', 'title']) {
          const value = (el.getAttribute(attr) ?? '').trim();
          if (value.length >= 4) texts.add(`[${attr}] ${value}`);
        }
      }
      return [...texts];
    });
  const IGNORE = /^[\d\s.,%:/\-–—·()+×≥≤<>|#&;*'"°]+$|^\[?[a-z-]+\]?\s?[\d\s.,%:/\-–—·()+]*$/i;
  const results = [];
  for (const route of chosenRoutes) {
    resetSink(sink);
    const entry = { route };
    try {
      await page.goto(pageUrl(base, route, scenario, { locale: 'en' }), { waitUntil: 'networkidle', timeout: 60000 });
      await settle(page, scenario);
      const en = new Set(await collect());
      await page.goto(pageUrl(base, route, scenario, { locale: 'pt-BR' }), { waitUntil: 'networkidle', timeout: 60000 });
      await settle(page, scenario);
      const pt = await collect();
      const same = pt.filter((text) => en.has(text) && !IGNORE.test(text) && /[a-z]{3}/i.test(text));
      entry.ptTexts = pt.length;
      entry.untranslatedCandidates = same.slice(0, 80);
      entry.untranslatedCount = same.length;
    } catch (error) {
      entry.fatal = String(error.message).slice(0, 300);
    }
    results.push(entry);
    console.log(`[i18n] ${route.padEnd(18)} ${entry.untranslatedCount ?? '?'} strings identical in en and pt-BR`);
  }
  await context.close();
  return results;
}


// -------------------------------------------------------------------- exports
/**
 * What leaves the app. The printable report is printed with Chromium's own print pipeline
 * (the same one the "Download as PDF" button reaches through `window.print`), and the Tech
 * Wrapup deck is downloaded through the page's own button and opened as the OOXML zip it is.
 */
async function runExports({ browser, base, loader }) {
  const outDir = path.join(OUT, 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const JSZip = (await import('jszip')).default;
  const blocks = ['report-print', 'assessment-print', 'prerequisites-print', 'wrapup-pptx', 'wrapup-deck', 'prints-deck'];
  const only = args.only === undefined ? null : list(args.only, []);
  if (only !== null) {
    const unknown = only.filter((name) => !blocks.includes(name));
    if (unknown.length > 0) throw new Error(`unknown export block(s): ${unknown.join(', ')}`);
  }
  const want = (name) => only === null || only.includes(name);
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    locale: 'en-US',
    timezoneId: 'UTC',
    serviceWorkers: 'block',
    acceptDownloads: true,
  });
  await serveBrandFonts(context);
  await context.clock.setFixedTime(new Date(FIXED_NOW));
  const results = [];

  // ---- a printable page (the SE Report; since 3.4.1 also the Assessment report)
  const printRoute = async (name, route, file) => {
    const entry = { name, ok: false };
    const page = await context.newPage();
    try {
      await page.goto(pageUrl(base, route, 'rich'), { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForSelector('main', { timeout: 20000 });
      await page.evaluate(waitForQuiet, { quietMs: 450, maxMs: 4000 });
      await page.emulateMedia({ media: 'print' });
      const probe = await page.evaluate(() => {
        const visible = (el) => {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        };
        const chrome = [...document.querySelectorAll('nav, aside, header, [data-dt-component="AppHeader"], [data-print-hide]')]
          .filter(visible)
          .map((el) => `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''}`);
        const skip = [...document.querySelectorAll('a')].filter((a) => /skip to content/i.test(a.textContent ?? '') && visible(a)).length;
        return {
          chrome,
          skipLinkVisible: skip > 0,
          sections: document.querySelectorAll('[data-print-section]').length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          // 3.3.18: the elements that cross the right edge, innermost first, so a sideways overflow
          // names its cause instead of a number.
          offenders: (() => {
            const edge = document.documentElement.clientWidth + 1;
            const reach = (el) => el.getBoundingClientRect().left + Math.max(el.scrollWidth, el.getBoundingClientRect().width);
            // SVG text reports a scrollWidth of its own coordinate space, not of the page: skip it.
            if (document.documentElement.scrollWidth <= edge) return [];
            const over = [...document.querySelectorAll('body *')].filter((el) => !(el instanceof SVGElement) && reach(el) > edge);
            return over
              .filter((el) => ![...el.children].some((child) => reach(child) > edge))
              .slice(0, 8)
              .map((el) => `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className ?? '').split(/\s+/).slice(0, 3).join('.')} reach=${Math.round(reach(el))} text=${(el.textContent ?? '').trim().slice(0, 40)}`);
          })(),
        };
      });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
      fs.writeFileSync(path.join(outDir, file), pdf);
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
      Object.assign(entry, probe, { pdfPages: pages, pdfBytes: pdf.length });
      entry.problems = [
        ...(pages < 2 ? [`the report printed on ${pages} page(s): it must flow across several`] : []),
        ...(probe.chrome.length > 0 ? [`chrome visible in print: ${probe.chrome.join(', ')}`] : []),
        ...(probe.skipLinkVisible ? ['the skip link is visible in print'] : []),
        ...(probe.scrollWidth > probe.clientWidth + 1 ? [`sideways overflow in print (${probe.scrollWidth} > ${probe.clientWidth})`] : []),
        ...(probe.sections < 3 ? [`only ${probe.sections} [data-print-section] blocks`] : []),
      ];
      entry.ok = entry.problems.length === 0;
    } catch (error) {
      entry.problems = [`failed: ${String(error).slice(0, 300)}`];
    }
    await page.close().catch(() => undefined);
    results.push(entry);
  };
  if (want('report-print')) await printRoute('report-print', '/report', 'report.pdf');
  if (want('assessment-print')) await printRoute('assessment-print', '/coverage', 'assessment.pdf');

  // ---- 3.4.17: Settings → Prerequisites as a PDF for the customer (its own print document, A4 landscape)
  if (want('prerequisites-print')) {
    const entry = { name: 'prerequisites-print', ok: false };
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        window.print = () => {
          window.__pvsPrinted = (window.__pvsPrinted ?? 0) + 1;
        };
      });
      await page.goto(pageUrl(base, '/settings?state=seeded', 'rich'), { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForSelector('main', { timeout: 20000 });
      await page.getByRole('tab', { name: 'Prerequisites' }).click({ timeout: 8000 });
      await page.getByTestId('prq-pdf').click({ timeout: 8000 });
      await page.waitForSelector('[data-testid="prq-print"]', { state: 'attached', timeout: 8000 });
      await page.waitForFunction(() => (window.__pvsPrinted ?? 0) > 0, null, { timeout: 8000 });
      await page.emulateMedia({ media: 'print' });
      const probe = await page.evaluate(() => {
        const doc = document.querySelector('[data-testid="prq-print"]');
        const shown = [...document.body.children].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.className || el.tagName);
        return {
          shown,
          cards: doc?.querySelectorAll('.pvs-prq-card').length ?? 0,
          links: doc?.querySelectorAll('a[href^="https://"]').length ?? 0,
          exampleAddresses: /\b(203\.0\.113|198\.51\.100)\./.test(doc?.textContent ?? ''),
        };
      });
      const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
      fs.writeFileSync(path.join(outDir, 'prerequisites.pdf'), pdf);
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
      Object.assign(entry, probe, { pdfPages: pages, pdfBytes: pdf.length });
      entry.problems = [
        ...(probe.shown.length !== 1 ? [`more than the print document shown: ${probe.shown.join(', ')}`] : []),
        ...(probe.cards !== 6 ? [`${probe.cards} cards printed, 6 expected`] : []),
        ...(probe.links < 25 ? [`only ${probe.links} documentation links`] : []),
        ...(probe.exampleAddresses ? ['the example addresses reached the PDF'] : []),
      ];
      entry.ok = entry.problems.length === 0;
    } catch (error) {
      entry.problems = [`failed: ${String(error).slice(0, 300)}`];
    }
    await page.close().catch(() => undefined);
    results.push(entry);
  }

  // ---- the Tech Wrapup deck
  if (want('wrapup-pptx')) {
    const entry = { name: 'wrapup-pptx', ok: false };
    const page = await context.newPage();
    try {
      await page.goto(pageUrl(base, '/wrapup', 'rich'), { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForSelector('main', { timeout: 20000 });
      await page.evaluate(waitForQuiet, { quietMs: 450, maxMs: 4000 });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 120000 }),
        page.getByRole('button', { name: /Download PowerPoint/ }).click(),
      ]);
      const file = path.join(outDir, download.suggestedFilename());
      await download.saveAs(file);
      const buffer = fs.readFileSync(file);
      const zip = await JSZip.loadAsync(buffer);
      const names = Object.keys(zip.files);
      const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
      const media = names.filter((n) => n.startsWith('ppt/media/')).length;
      const sections = await page.evaluate(() => document.querySelectorAll('[data-slide], .pvs-slide, section[aria-label]').length);
      Object.assign(entry, { file: path.relative(OUT, file), bytes: buffer.length, slides, media, hasContentTypes: names.includes('[Content_Types].xml'), hasPresentation: names.includes('ppt/presentation.xml'), previewSections: sections });
      entry.problems = [
        ...(buffer.subarray(0, 2).toString('latin1') !== 'PK' ? ['not a zip (no PK signature)'] : []),
        ...(!entry.hasContentTypes || !entry.hasPresentation ? ['missing [Content_Types].xml or ppt/presentation.xml'] : []),
        ...(slides < 5 ? [`only ${slides} slide parts`] : []),
      ];
      entry.ok = entry.problems.length === 0;
    } catch (error) {
      entry.problems = [`failed: ${String(error).slice(0, 300)}`];
    }
    await page.close().catch(() => undefined);
    results.push(entry);
  }

  // ---- the deck tab (3.2.4): the preview is the file, captures of the app, the 16:9 PDF (the executive page is a slide)
  if (want('wrapup-deck')) {
    const entry = { name: 'wrapup-deck', ok: false };
    const page = await context.newPage();
    // 3.5.6: `--dump-captures` keeps, per capture, every piece of text the stage laid out (class, text, box), so a
    // release can anchor each pin on a text the app wrote (capture-dump.json).
    if (args['dump-captures']) {
      await page.addInitScript(() => {
        window.__pvsDump = {};
        setInterval(() => {
          for (const slot of document.querySelectorAll('[data-capture]')) {
            const box = slot.getBoundingClientRect();
            if (box.width === 0) continue;
            const items = [];
            for (const el of slot.querySelectorAll('*')) {
              if (![...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')) continue;
              const r = el.getBoundingClientRect();
              if (r.width < 2) continue;
              items.push({ cls: String(el.getAttribute('class') ?? el.tagName).slice(0, 70), text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50), x: Math.round(r.left - box.left), y: Math.round(r.top - box.top), w: Math.round(r.width), h: Math.round(r.height) });
              if (items.length >= 120) break;
            }
            if (items.length > 0) window.__pvsDump[slot.getAttribute('data-capture')] = { w: Math.round(box.width), h: Math.round(box.height), items };
          }
        }, 300);
      });
    }
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
    try {
      await page.goto(pageUrl(base, '/wrapup', 'rich'), { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForSelector('[data-wrap-slide]', { timeout: 30000 });
      await page.evaluate(waitForQuiet, { quietMs: 600, maxMs: 8000 });
      const kinds = await page.evaluate(() => [...document.querySelectorAll('[data-wrap-slide]')].map((slide) => slide.getAttribute('data-slide-kind')));
      await page.locator('.pvs-deck').screenshot({ path: path.join(outDir, 'deck-preview.png') });

      // 3.4.18: `--captures a,b` picks those options first (at most two per section, at least one), so a release can
      // photograph the panels that are not a section's default.
      const wanted = list(args.captures, []);
      if (wanted.length > 0) {
        const bySection = new Map();
        for (const id of wanted) bySection.set(id.split('.')[0], [...(bySection.get(id.split('.')[0]) ?? []), id]);
        const isOn = async (id) => page.evaluate((captureId) => {
          const el = document.querySelector(`[data-testid="cap-opt-${captureId}"]`);
          const input = el?.matches('input') ? el : el?.querySelector('input');
          return input?.checked === true || el?.getAttribute('aria-checked') === 'true';
        }, id);
        const click = async (id) => {
          const el = page.locator(`[data-testid="cap-opt-${id}"]`).first();
          await el.click({ force: true });
          await page.waitForTimeout(150);
        };
        for (const [section, all] of bySection) {
          const options = await page.evaluate((sec) => [...document.querySelectorAll(`[data-choice="${sec}"] [data-testid^="cap-opt-"]`)].map((el) => el.getAttribute('data-testid').slice('cap-opt-'.length)), section);
          // A section with a single capture has no choice to make (no checkbox): it is always photographed.
          const ids = all.filter((id) => options.includes(id));
          for (const id of ids) {
            if (await isOn(id)) continue;
            const onNow = [];
            for (const option of options) if (await isOn(option)) onNow.push(option);
            if (onNow.length >= 2) {
              const drop = onNow.find((option) => !ids.includes(option));
              if (drop !== undefined) await click(drop);
            }
            await click(id);
          }
          for (const option of options) if (!ids.includes(option) && (await isOn(option))) await click(option);
        }
        entry.capturesPicked = [];
        for (const id of wanted) {
          const hasChoice = (await page.locator(`[data-testid="cap-opt-${id}"]`).count()) > 0;
          entry.capturesPicked.push({ id, on: hasChoice ? await isOn(id) : 'single option (always taken)' });
        }
      }

      await page.getByRole('button', { name: /Prepare captures/ }).click();
      await page.waitForFunction(
        () => /on the slides\.|No data to photograph|could not draw the captures|None of the selected sections/.test(document.body.innerText),
        null,
        { timeout: 120000 },
      );
      const captureNote = await page.evaluate(() => {
        const match = document.body.innerText.match(/\d+ captures? on the slides\.|This browser could not draw the captures[^\n]*|None of the selected sections[^\n]*/);
        const skipped = document.body.innerText.match(/No data to photograph for: [^\n]*/);
        return { note: match?.[0] ?? null, skipped: skipped?.[0] ?? null };
      });
      if (args['dump-captures']) fs.writeFileSync(path.join(outDir, 'capture-dump.json'), JSON.stringify(await page.evaluate(() => window.__pvsDump), null, 1));
      const captured = await page.locator('[data-wrap-slide] img[data-capture-img]').count();
      // Each capture adds a slide right after its section's: the preview after the captures is the file.
      const kindsAfter = await page.evaluate(() => [...document.querySelectorAll('[data-wrap-slide]')].map((slide) => slide.getAttribute('data-slide-kind')));
      const captureSizes = await page.evaluate(() =>
        [...document.querySelectorAll('[data-wrap-slide] img[data-capture-img]')].map((img) => ({ w: img.naturalWidth, h: img.naturalHeight, bytes: img.getAttribute('src')?.length ?? 0 })),
      );
      await page.locator('.pvs-deck').screenshot({ path: path.join(outDir, 'deck-preview-captures.png') });
      // Each captured slide on its own, for a close look.
      const capturedSlides = page.locator('[data-wrap-slide]:has(img[data-capture-img])');
      for (let index = 0; index < Math.min(await capturedSlides.count(), 8); index += 1) {
        await capturedSlides.nth(index).screenshot({ path: path.join(outDir, `deck-capture-${index + 1}.png`) });
      }

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 120000 }),
        page.getByRole('button', { name: /Download PowerPoint/ }).click(),
      ]);
      const file = path.join(outDir, `with-captures-${download.suggestedFilename()}`);
      await download.saveAs(file);
      const zip = await JSZip.loadAsync(fs.readFileSync(file));
      const names = Object.keys(zip.files);
      const slideParts = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
      const generated = names.filter((n) => /^ppt\/media\/genimg\d+\.png$/.test(n)).length;
      const fallback = await page.getByText('If the download did not start, save it from here.').count();

      await page.emulateMedia({ media: 'print' });
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      fs.writeFileSync(path.join(outDir, 'deck.pdf'), pdf);
      const latin = pdf.toString('latin1');
      const pdfPages = (latin.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
      const boxes = [...new Set((latin.match(/\/MediaBox\s*\[[^\]]*\]/g) ?? []).map((box) => box.replace(/\s+/g, ' ')))];
      await page.emulateMedia({ media: 'screen' });

      // 3.2.6: the one-pager tab is gone; the executive page is the deck's slide after the agenda.
      const tabs = await page.getByRole('tab').allTextContents();

      // 3.5.6 (owner's validation of 3.5.5: "4 a 5 pins por captura com informações ricas"): the pins each capture slide
      // reads in its "How to read" legend, and how many carry their technical reading.
      const pinsPerSlide = await page.evaluate(() =>
        [...document.querySelectorAll('[data-wrap-slide]:has(img[data-capture-img])')].map((slide) => ({
          title: (slide.querySelector('h2, h3, [role="heading"]')?.textContent ?? '').trim().slice(0, 60),
          pins: slide.querySelectorAll('[data-deck-pin]').length,
        })),
      );
      Object.assign(entry, { kinds, kindsAfter, captureNote, captured, captureSizes, slideParts, generatedImages: generated, fallbackLink: fallback > 0, pdfPages, pdfBoxes: boxes, tabs, pageErrors: errors, pinsPerSlide });
      entry.problems = [
        ...(kinds[0] !== 'cover' || kinds[kinds.length - 1] !== 'end' ? [`slide order ${kinds.join(',')}`] : []),
        ...(!kinds.includes('executive') ? ['no executive slide'] : []),
        ...(captured < 3 ? [`only ${captured} captures on the slides (${captureNote.note ?? 'no note'})`] : []),
        ...pinsPerSlide.filter((slide) => slide.pins < 3).map((slide) => `capture slide "${slide.title}" reads ${slide.pins} pins (3 or more expected)`),
        ...(generated < captured ? [`the PowerPoint has ${generated} generated pictures for ${captured} captures`] : []),
        ...(kindsAfter.filter((kind) => kind === 'capture').length !== captured ? [`${captured} captures but ${kindsAfter.filter((kind) => kind === 'capture').length} capture slides`] : []),
        ...(slideParts !== kindsAfter.length ? [`the file has ${slideParts} slides, the preview ${kindsAfter.length}`] : []),
        ...(pdfPages !== kindsAfter.length ? [`the PDF has ${pdfPages} pages for ${kindsAfter.length} slides`] : []),
        ...(boxes.some((box) => !/\[ ?0 0 960 540 ?\]/.test(box)) ? [`PDF pages not 16:9 13.333 x 7.5 in: ${boxes.join(' ')}`] : []),
        ...(kinds[2] !== 'executive' ? [`the executive page does not follow the agenda: ${kinds.join(',')}`] : []),
        ...(tabs.some((tab) => /one-pager|1 página/i.test(tab)) ? ['the one-pager tab is still there'] : []),
        ...(!entry.fallbackLink ? ['no fallback link after the download'] : []),
        ...(errors.length > 0 ? [`page errors: ${errors.join(' | ')}`] : []),
      ];
      entry.ok = entry.problems.length === 0;
    } catch (error) {
      entry.problems = [`failed: ${String(error).slice(0, 300)}`, ...errors];
    }
    await page.close().catch(() => undefined);
    results.push(entry);
  }

  await context.close();

  // ---- the real-prints deck (3.2.7): its own context, so the blocks above run exactly as before
  if (want('prints-deck')) results.push(await runPrintsDeck({ browser, base, loader, outDir, JSZip }));

  return results;
}

// ---------------------------------------------------------------- prints deck
/*
 * 3.2.7, spec §7.6: the real-prints deck end to end, with no tenant and no real screenshot.
 *
 *   1. /wrapup/prints (rich): read the plan on screen — each included screen's "Save as NN-<id>.png"
 *      and its link (3.3.2: the shot list and the capture companion are retired).
 *   2. Draw one 1720x1080 JPEG per screen in a blank page (a dark page, a title bar and a fake
 *      e-mail and IP on a light pill), named as the plan says.
 *   3. Import them shuffled through the batch (`prt-import-batch`): each must be proposed with high
 *      confidence for its own screen; confirm, then confirm each screen's identity as the SE does.
 *   4. Approve every print but one (the root cause's, so the customer deck must drop its pixels
 *      everywhere, the story thumbnail included).
 *   5. Check the preview, the SE and Customer .pptx, the PDF, the burned-in mask, and the page.
 * The generated JPEGs, ZIP and files are written under <out>/exports/prints-deck/ (never committed).
 */

/** Modules of the app the drawing must agree with (zones, layouts, windows, the mask colour) and the mocked tenant. */
async function printsModules(loader) {
  const load = (rel) => loader.ssrLoadModule(`/@fs${path.join(repo, rel)}`);
  const [templates, planner, windows, constants, environment, sanitize] = await Promise.all([
    load('ui/app/features/wrapup/prints/plan/pinTemplates.ts'),
    load('ui/app/features/wrapup/prints/plan/planner.ts'),
    load('ui/app/features/wrapup/prints/evidence/windows.ts'),
    load('ui/app/features/wrapup/prints/constants.ts'),
    load('scripts/visual/mocks/app-environment.mjs'),
    load('ui/app/utils/sanitize.ts'),
  ]);
  return {
    LAYOUTS: templates.LAYOUTS,
    IDENTITY_KEY: templates.IDENTITY_KEY,
    LAYOUT_OF: planner.LAYOUT_OF,
    SCREEN_FALLBACK: windows.SCREEN_FALLBACK,
    MASK_FILL: constants.MASK_FILL,
    PRINT_SPACE: constants.PRINT_SPACE,
    REDACTED: sanitize.REDACTED,
    tenantHost: new URL(environment.getEnvironmentUrl()).host.toLowerCase(),
  };
}

const clamp01 = (value, low, high) => Math.min(high, Math.max(low, value));

/** Where a label goes: its pin's template position, kept inside the anchor's zone; the zone's centre without a pin. */
function labelCentre(zone, pin) {
  const inset = 0.01;
  const x = pin === undefined ? (zone.x0 + zone.x1) / 2 : pin.x;
  const y = pin === undefined ? (zone.y0 + zone.y1) / 2 : pin.y;
  return { cx: clamp01(x, zone.x0 + inset, zone.x1 - inset), cy: clamp01(y, zone.y0 + inset, zone.y1 - inset) };
}

const CARD_NUMBERS = ['1,240', '38.2 %', '485 ms', '6,004', '12', '2.3 s'];

/**
 * Page text the companion records and the app must never persist (spec §7.3, rule 3): written into
 * the manifest's anchor labels and page titles, then looked for in every stored document.
 */
const LABEL_MARK = 'pvs-harness-anchor-label';
const PAGE_TITLE_MARK = 'pvs-harness-page-title';
/** The fake IP as a whole address (not the start of 10.1.2.30). */
const FAKE_IP_RE = new RegExp(`(?<![\\d.])${FAKE_IP.replace(/\./g, '\\.')}(?![\\d])`);

/** What a deck's text must not carry: the fake personal data always, the tenant host in the Customer profile. */
function leaksIn(text, { host }) {
  return [
    ...(text.includes(FAKE_EMAIL) ? [FAKE_EMAIL] : []),
    ...(FAKE_IP_RE.test(text) ? [FAKE_IP] : []),
    ...(host !== null && text.toLowerCase().includes(host) ? [host] : []),
  ];
}

/** What to draw for one shot, from its anchors and its layout's template (identity zone, pin positions). */
function shotSpec(shot, app) {
  const layoutKey = app.LAYOUT_OF[shot.kind] ?? 'free';
  const layout = app.LAYOUTS[layoutKey];
  const zoneOf = (key) => layout.pins.find((pin) => pin.anchor?.key === key)?.anchor?.zone;
  const pinOf = (key) => layout.pins.find((pin) => pin.anchor?.key === key);
  const anchors = Array.isArray(shot.anchors) ? shot.anchors : [];
  const identityAnchor = anchors.find((anchor) => anchor.key === app.IDENTITY_KEY);
  let identity = null;
  if (layout.identity !== null && identityAnchor !== undefined && identityAnchor.match.length > 0) {
    const zone = layout.identity.zone;
    const { cx, cy } = labelCentre(zone, pinOf(app.IDENTITY_KEY));
    // Below the drawn title bar (60 px), still inside the zone.
    const cyPx = Math.min(Math.max(cy * app.PRINT_SPACE.height, 84), zone.y1 * app.PRINT_SPACE.height - 4);
    identity = { text: identityAnchor.match[0], cx: cx * app.PRINT_SPACE.width, cy: cyPx };
  }
  const cards = [];
  const aliases = [];
  for (const anchor of anchors) {
    if (anchor.key === app.IDENTITY_KEY || anchor.match.length === 0) continue;
    // A pin on the identity's own words (the vulnerabilities total) is found at the identity's place.
    if (identity !== null && anchor.match.includes(identity.text)) {
      aliases.push({ key: anchor.key, text: identity.text });
      continue;
    }
    if (cards.length >= 3) continue;
    const zone = zoneOf(anchor.key) ?? { x0: 0, y0: 0.1, x1: 1, y1: 0.9 };
    const { cx, cy } = labelCentre(zone, pinOf(anchor.key));
    cards.push({ key: anchor.key, heading: anchor.match[0], number: CARD_NUMBERS[cards.length % CARD_NUMBERS.length], cx: cx * app.PRINT_SPACE.width, cy: Math.max(cy * app.PRINT_SPACE.height, 84) });
  }
  const minutes = app.SCREEN_FALLBACK[layoutKey]?.minutes ?? 120;
  const timeframeLabel = minutes % 60 === 0 ? `Last ${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `Last ${minutes} minutes`;
  return { id: shot.id, title: shot.title, layoutKey, identity, cards, aliases, timeframeLabel };
}

/**
 * In the page: lays out and draws every shot on a canvas, with ONE place for the e-mail/IP pills
 * that no card of any shot covers, and returns each JPEG (q82) with the rectangles it drew.
 */
function drawShots({ specs, size, email, ip }) {
  const W = size.width;
  const H = size.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const font = (px, weight) => `${weight} ${px}px Arial, "DejaVu Sans", "Liberation Sans", sans-serif`;
  const measure = (text, px, weight) => {
    g.font = font(px, weight);
    return Math.ceil(g.measureText(text).width);
  };
  const box = (cx, cy, w, h) => ({
    x: Math.round(Math.max(8, Math.min(W - 8 - w, cx - w / 2))),
    y: Math.round(Math.max(68, Math.min(H - 8 - h, cy - h / 2))),
    w,
    h,
  });
  const hits = (a, b, pad) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

  const laid = specs.map((spec) => {
    const identity = spec.identity === null ? null : { text: spec.identity.text, rect: box(spec.identity.cx, spec.identity.cy, measure(spec.identity.text, 26, 700), 26) };
    const cards = spec.cards.map((card) => {
      const rect = box(card.cx, card.cy, measure(card.heading, 22, 700), 22);
      const width = Math.max(rect.w, 180) + 36;
      return { ...card, rect, frame: { x: rect.x - 18, y: rect.y - 14, w: width, h: rect.h + 78 } };
    });
    return { ...spec, identity, cards };
  });

  // One place for the pills, free in every shot (the mask check samples the same point in every image).
  const emailW = measure(email, 24, 400);
  const ipW = measure(ip, 24, 400);
  const blockW = emailW + 28 + 24 + ipW + 28;
  const candidates = [[40, 1010], [W - 40 - blockW, 1010], [40, 940], [W / 2 - blockW / 2, 1010], [40, 620], [W - 40 - blockW, 620]];
  const taken = laid.flatMap((shot) => [...(shot.identity === null ? [] : [shot.identity.rect]), ...shot.cards.map((card) => card.frame)]);
  const free = candidates.find(([x, y]) => !taken.some((rect) => hits({ x, y, w: blockW, h: 44 }, rect, 16)));
  const [px, py] = free ?? candidates[0];
  const emailRect = { x: Math.round(px + 14), y: Math.round(py + 10), w: emailW, h: 24 };
  const ipRect = { x: Math.round(px + emailW + 28 + 24 + 14), y: Math.round(py + 10), w: ipW, h: 24 };

  const shots = laid.map((shot) => {
    g.fillStyle = '#14161f';
    g.fillRect(0, 0, W, H);
    // Title bar with the shot's title.
    g.fillStyle = '#262a3a';
    g.fillRect(0, 0, W, 60);
    g.fillStyle = '#ffffff';
    g.font = font(22, 400);
    g.textBaseline = 'middle';
    let title = shot.title;
    while (title.length > 8 && g.measureText(title).width > 760) title = `${title.slice(0, -2)}…`;
    g.fillText(title, 28, 30);
    // The identity text inside its zone.
    if (shot.identity !== null) {
      g.fillStyle = '#ffffff';
      g.font = font(26, 700);
      g.fillText(shot.identity.text, shot.identity.rect.x, shot.identity.rect.y + 13);
    }
    // Three cards whose headings are the anchor words, each with a number under it.
    for (const card of shot.cards) {
      g.fillStyle = '#232838';
      g.fillRect(card.frame.x, card.frame.y, card.frame.w, card.frame.h);
      g.strokeStyle = '#3a4058';
      g.lineWidth = 2;
      g.strokeRect(card.frame.x, card.frame.y, card.frame.w, card.frame.h);
      g.fillStyle = '#e8ecf6';
      g.font = font(22, 700);
      g.fillText(card.heading, card.rect.x, card.rect.y + 11);
      g.fillStyle = '#7fd3ff';
      g.font = font(34, 700);
      g.fillText(card.number, card.rect.x, card.rect.y + 52);
    }
    // The fake personal data, dark blue on a light pill: far from the mask colour either way.
    for (const [text, rect] of [[email, emailRect], [ip, ipRect]]) {
      g.fillStyle = '#f5f7fb';
      g.fillRect(rect.x - 14, rect.y - 10, rect.w + 28, rect.h + 20);
      g.fillStyle = '#0b3d91';
      g.font = font(24, 400);
      g.fillText(text, rect.x, rect.y + 12);
    }
    return {
      id: shot.id,
      dataUrl: canvas.toDataURL('image/jpeg', 0.82),
      identity: shot.identity,
      cards: shot.cards.map((card) => ({ key: card.key, heading: card.heading, number: card.number, rect: card.rect })),
    };
  });
  return { shots, emailRect, ipRect, sharedPlace: free !== undefined };
}

/** The app id of an address on the tenant (`/ui/apps/<id>/…`, `/ui/intent/<id>/…`), as the companion records it. */
function appIdOf(url) {
  try {
    return /^\/ui\/(?:apps|intent)\/([^/]+)/.exec(new URL(url).pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** The entries of a ZIP's central directory: name → compression method (0 = STORE, 8 = DEFLATE). */
function zipMethods(buffer) {
  const methods = new Map();
  let end = -1;
  for (let at = buffer.length - 22; at >= Math.max(0, buffer.length - 65_557); at -= 1) {
    if (buffer.readUInt32LE(at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) return methods;
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  for (let n = 0; n < count && offset + 46 <= buffer.length; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    methods.set(buffer.toString('utf8', offset + 46, offset + 46 + nameLength), buffer.readUInt16LE(offset + 10));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return methods;
}

/** CIE76 ΔE between two sRGB colours (D65). */
function deltaE(a, b) {
  const lab = ({ r, g, b: blue }) => {
    const lin = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const [R, G, B] = [lin(r), lin(g), lin(blue)];
    const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
    const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  };
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
const hexRgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });

/** In the page: the mean colour of a 5x5 patch of each JPEG at a point given in print pixels (1720 wide). */
async function samplePixels({ images, point, printWidth }) {
  const out = [];
  for (const b64 of images) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(bitmap, 0, 0);
    const k = bitmap.width / printWidth;
    const x = Math.round(point.x * k);
    const y = Math.round(point.y * k);
    const data = g.getImageData(x - 2, y - 2, 5, 5).data;
    let r = 0;
    let gg = 0;
    let b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      gg += data[i + 1];
      b += data[i + 2];
    }
    const n = data.length / 4;
    out.push({ width: bitmap.width, height: bitmap.height, r: r / n, g: gg / n, b: b / n });
  }
  return out;
}

/** The OOXML package as the checks read it. */
async function readPptx(JSZip, buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files);
  const methods = zipMethods(buffer);
  const jpegs = names.filter((name) => /^ppt\/media\/genimg\d+\.jpeg$/.test(name)).sort();
  const contentTypes = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
  // The text of every slide and note (the XML, entities decoded enough for the leak checks).
  const textParts = names.filter((name) => /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/.test(name));
  const text = (await Promise.all(textParts.map((name) => zip.file(name).async('string'))))
    .join('\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return {
    text,
    slides: names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length,
    jpegs,
    jpegMethods: [...new Set(jpegs.map((name) => methods.get(name)))],
    jpegBase64: await Promise.all(jpegs.map(async (name) => (await zip.file(name).async('nodebuffer')).toString('base64'))),
    contentTypesJpeg: /Extension="jpe?g"/i.test(contentTypes) || /ContentType="image\/jpeg"/i.test(contentTypes),
    bytes: buffer.length,
  };
}

async function runPrintsDeck({ browser, base, loader, outDir, JSZip }) {
  const entry = { name: 'prints-deck', ok: false };
  const dir = path.join(outDir, 'prints-deck');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'zip', 'shots'), { recursive: true });
  const problems = [];
  const check = (ok, message) => {
    if (!ok) problems.push(message);
  };
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
    serviceWorkers: 'block',
    acceptDownloads: true,
  });
  await serveBrandFonts(context);
  await context.clock.setFixedTime(new Date(FIXED_NOW));
  await context.addInitScript(installDescribe);
  const page = await context.newPage();
  const sink = attachSinks(page);
  const kindsNow = () => page.evaluate(() => [...document.querySelectorAll('[data-wrap-slide]')].map((slide) => slide.getAttribute('data-slide-kind')));
  const deckReady = async () => {
    await page.waitForSelector('[data-testid="prt-download-deck"]', { timeout: 120000 });
    await page.waitForFunction(() => !/Reading the evidence of the prints|Preparing the images with their masks/.test(document.body.innerText), null, { timeout: 120000 });
    await page.evaluate(waitForQuiet, { quietMs: 700, maxMs: 10000 });
  };
  const download = async (testId) => {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click(`[data-testid="${testId}"]`)]);
    const target = path.join(dir, file.suggestedFilename());
    await file.saveAs(target);
    return { name: file.suggestedFilename(), path: target, buffer: fs.readFileSync(target) };
  };
  const hygiene = async (label) => {
    const dom = await page.evaluate(domChecks);
    return { label, duplicateIds: dom.duplicateIds, contrastFailing: dom.contrast.failing, contrastWorst: dom.contrast.worst.slice(0, 5) };
  };
  const slideShots = async (prefix) => {
    const slides = page.locator('[data-wrap-slide]');
    const count = await slides.count();
    for (let index = 0; index < count; index += 1) {
      const kind = await slides.nth(index).getAttribute('data-slide-kind');
      await slides.nth(index).screenshot({ path: path.join(dir, `${prefix}-slide-${String(index + 1).padStart(2, '0')}-${kind}.png`) }).catch(() => undefined);
    }
  };

  try {
    const app = await printsModules(loader);
    entry.tenantHost = app.tenantHost;

    // 1. the tab and its plan (3.3.2: no shot list any more — the plan on screen is what the SE follows)
    await page.goto(pageUrl(base, '/wrapup/prints', 'rich'), { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForSelector('[data-testid="prt-import-batch"]', { state: 'attached', timeout: 90000 });
    await page.evaluate(waitForQuiet, { quietMs: 500, maxMs: 6000 });
    const tabs = (await page.getByRole('tab').allTextContents()).map((text) => text.trim());
    entry.tabs = tabs;
    check(tabs.length === 4, `${tabs.length} tabs, expected 4: ${tabs.join(' | ')}`);
    check(tabs[3] === 'Real proof', `the 4th tab is "${tabs[3]}"`);
    check(!tabs.some((tab) => /one-pager|1 página/i.test(tab)), 'a one-pager tab is back');
    check((await page.locator('[data-testid="prt-import-zip"], [data-testid="prt-download-plan"]').count()) === 0, 'the retired capture companion is still offered');
    entry.planRows = await page.evaluate(
      () => [...document.querySelectorAll('.pvs-prt-table [role="row"]')].filter((row) => row.querySelector('[role="cell"], [role="gridcell"]') !== null).length,
    );
    check(entry.planRows >= 7, `the plan has ${entry.planRows} rows, expected >= 7`);
    await page.screenshot({ path: path.join(dir, 'tab-plan.png'), fullPage: false });

    // Every included screen as the SE sees it: the file name the plan offers, its title and its link.
    const planned = await page.evaluate(() =>
      [...document.querySelectorAll('.pvs-prt-table [role="row"]')].flatMap((row) => {
        const name = /Save as (\d{2})-(\S+)\.png/.exec(row.textContent ?? '');
        const link = row.querySelector('a[href^="https://"]');
        if (name === null || link === null) return [];
        const cells = [...row.querySelectorAll('[role="cell"], [role="gridcell"]')];
        const title = (cells[2]?.querySelector('strong, b, [class*="Strong"]')?.textContent ?? cells[2]?.textContent ?? '').trim();
        return [{ number: name[1], id: name[2], url: link.getAttribute('href'), title }];
      }),
    );
    const list = { shots: planned.map((shot) => ({ ...shot, kind: shot.id.split('--')[0], anchors: [] })) };
    fs.writeFileSync(path.join(dir, 'plan.json'), `${JSON.stringify(list, null, 2)}\n`);
    entry.plan = { shots: list.shots.length, kinds: list.shots.map((shot) => shot.kind) };
    check(list.shots.length >= 7, `the plan offers ${list.shots.length} file names, expected the default batch of 7`);

    // 2. the screenshots, drawn in a blank page of the same context and named as the plan says
    const specs = list.shots.map((shot) => shotSpec(shot, app));
    const blank = await context.newPage();
    const drawn = await blank.evaluate(drawShots, { specs, size: app.PRINT_SPACE, email: FAKE_EMAIL, ip: FAKE_IP });
    await blank.close();
    entry.emailRect = drawn.emailRect;
    const files = list.shots.map((shot, index) => {
      const buffer = Buffer.from(drawn.shots[index].dataUrl.split(',')[1], 'base64');
      const name = `${shot.number}-${shot.id}.jpg`;
      fs.writeFileSync(path.join(dir, 'zip', 'shots', name), buffer);
      return { name, mimeType: 'image/jpeg', buffer };
    });
    // Shuffled on purpose: the batch must place each one by its name, not by the order it arrived in.
    const shuffled = files.map((file, index) => ({ file, key: (index * 7919) % 101 })).sort((a, b) => a.key - b.key).map((item) => item.file);

    // 3. the batch import: every image proposed with high confidence, then confirmed
    await page.setInputFiles('[data-testid="prt-import-batch"]', shuffled);
    await page.waitForSelector('[data-testid="prt-batch-confirm"]', { timeout: 60000 });
    entry.batchReview = await page.evaluate(() => ({
      rows: document.querySelectorAll('.pvs-prt-batch__row').length,
      high: (document.body.innerText.match(/High confidence/g) ?? []).length,
    }));
    check(entry.batchReview.rows === list.shots.length && entry.batchReview.high === list.shots.length, `batch review ${JSON.stringify(entry.batchReview)} for ${list.shots.length} images`);
    await page.screenshot({ path: path.join(dir, 'tab-batch-review.png'), fullPage: false });
    await page.click('[data-testid="prt-batch-confirm"]');
    const reportLine = await page
      .waitForFunction(() => document.body.innerText.match(/(\d+) of (\d+) imported/)?.[0] ?? null, null, { timeout: 120000 })
      .then((handle) => handle.jsonValue())
      .catch(() => null);
    entry.importReport = reportLine;
    check(reportLine === `${list.shots.length} of ${list.shots.length} imported`, `import "${reportLine}" for ${list.shots.length} images`);
    await page.waitForSelector(`[data-testid="prt-checklist-${list.shots[0].id}"]`, { timeout: 60000 });
    await page.evaluate(waitForQuiet, { quietMs: 500, maxMs: 6000 });

    // 4. approve every print but one: the root cause's (its pixels feed the story), else the last
    const ids = list.shots.map((shot) => shot.id);
    const left = list.shots.find((shot) => shot.kind === 'root-cause') ?? list.shots[list.shots.length - 1];
    entry.unapproved = { id: left.id, kind: left.kind, title: left.title };
    entry.identityConfirmedBySe = [];
    for (const id of ids) {
      if (id === left.id) continue;
      const accept = page.locator(`[data-testid="prt-accept-masks-${id}"]`);
      if ((await accept.count()) > 0) await accept.click();
      const identity = page.locator(`[data-testid="prt-identity-${id}"]`);
      if ((await identity.count()) > 0) {
        entry.identityConfirmedBySe.push(id);
        await identity.click();
      }
      // 3.5.5: the pins are the SE's — open the editor and confirm each estimated one where it is (the companion's
      // anchored pins are already in place), as an SE would after checking them; approval asks for at least three.
      await page.click(`[data-testid="prt-edit-${id}"]`);
      await page.waitForSelector('[data-prt-pin-progress]', { timeout: 20000 });
      for (let guard = 0; guard < 8; guard += 1) {
        const confirm = page.locator('[data-prt-confirm]').first();
        if ((await confirm.count()) === 0) break;
        await confirm.click();
        await page.waitForTimeout(150);
      }
      entry.pinsConfirmedBySe = (entry.pinsConfirmedBySe ?? 0) + 1;
      await page.click('[data-testid="prt-editor-close"]');
      await page.waitForSelector('[data-prt-pin-progress]', { state: 'detached', timeout: 20000 });
      await page.click(`[data-testid="prt-checklist-${id}"]`);
      await page.waitForSelector(`[data-testid="prt-approve-${id}"]`, { timeout: 20000 });
      await page.click(`[data-testid="prt-approve-${id}"]`);
      await page.waitForFunction((testId) => document.querySelector(`[data-testid="${testId}"] input`)?.checked === true, `prt-approve-${id}`, { timeout: 20000 });
    }
    // The unapproved one is left as imported: no masks accepted, no checklist, no approval (the SE deck's control image).
    const identityLeft = await page.locator(`[data-testid="prt-identity-${left.id}"]`).count();
    // An imported screenshot carries no anchor: the SE confirms each screen ("Esta é a tela de …") before approving it.
    check(entry.identityConfirmedBySe.length === ids.length - 1 && identityLeft === 1, `identity confirmations: ${entry.identityConfirmedBySe.length} of ${ids.length - 1}, left one offered: ${identityLeft}`);
    // The SE confirms the left one's screen too, but never approves it: an imported print enters the SE deck only
    // once its screen is confirmed (§5.7), and there its caption must say it is not approved (3.3.2, §17-g).
    if (identityLeft === 1) await page.click(`[data-testid="prt-identity-${left.id}"]`);
    const notice = await page
      .waitForFunction(() => document.body.innerText.match(/(\d+) unapproved prints? (?:stays|stay) out of the customer deck/)?.[0] ?? null, null, { timeout: 30000 })
      .then((handle) => handle.jsonValue())
      .catch(() => null);
    entry.customerNotice = notice;
    check(notice !== null && notice.startsWith('1 '), `customer notice "${notice}"`);
    await page.screenshot({ path: path.join(dir, 'tab-after-approval.png'), fullPage: false });

    // What the tab stored on the (mocked) tenant: private documents only, and none of the page text the
    // companion sent (anchor labels, page titles: spec §7.3, rule 3).
    entry.saveStatus = await page
      .waitForFunction(
        () => {
          const text = document.body.innerText;
          return /Saving…/.test(text) ? null : (text.match(/Saved on the tenant at [^\n]*/)?.[0] ?? null);
        },
        null,
        { timeout: 30000 },
      )
      .then((handle) => handle.jsonValue())
      .catch(() => null);
    check(entry.saveStatus !== null, 'the prints were never saved on the tenant (no "Saved on the tenant at …")');
    const stored = (await page.evaluate(() => (typeof window.__pvsDocuments === 'function' ? window.__pvsDocuments() : null))) ?? [];
    entry.stored = stored.map(({ text, ...meta }) => ({ ...meta, pageText: [LABEL_MARK, PAGE_TITLE_MARK].filter((mark) => text.includes(mark)) }));
    check(
      stored.some((doc) => /printset$/.test(doc.type)) && stored.some((doc) => /printimages$/.test(doc.type)),
      `stored documents: ${stored.map((doc) => doc.type).join(', ') || 'none'} (expected the print set and its images)`,
    );
    check(stored.every((doc) => doc.isPrivate === true), `a stored document is not private: ${stored.filter((doc) => doc.isPrivate !== true).map((doc) => doc.type).join(', ')}`);
    const persisted = entry.stored.filter((doc) => doc.pageText.length > 0);
    check(persisted.length === 0, `page text the companion sent was stored: ${persisted.map((doc) => `${doc.type} has ${doc.pageText.join(', ')}`).join('; ')}`);

    // 5a. Customer profile (the default): the preview
    await deckReady();
    // 3.5.5: the methodology and the DQL appendix are an option, off by default. Check that, then turn it on so the
    // methodology's privacy controls below keep measuring something.
    const kindsByDefault = await kindsNow();
    entry.appendixByDefault = kindsByDefault.includes('methodology');
    check(!entry.appendixByDefault, `customer: the default deck carries the methodology (${kindsByDefault.join(',')})`);
    await page.click('[data-testid="prt-include-appendix"]');
    await page.waitForFunction(() => document.querySelector('[data-wrap-slide][data-slide-kind="methodology"]') !== null, null, { timeout: 30000 }).catch(() => undefined);
    await deckReady();
    const customerKinds = await kindsNow();
    const customer = await page.evaluate((title) => {
      const deck = [...document.querySelectorAll('[data-wrap-slide]')];
      const printImages = [...document.querySelectorAll('img[data-print-image]')];
      const dqlOnly = [...document.querySelectorAll('[data-analysis-variant="dql-only"]')];
      return {
        printImages: printImages.length,
        printAlts: printImages.map((img) => img.getAttribute('alt') ?? ''),
        whatItShows: document.querySelectorAll('img[data-capture-img]').length,
        dqlOnly: dqlOnly.length,
        dqlOnlyMentionsLeft: dqlOnly.some((slide) => (slide.textContent ?? '').includes(title)),
        imageSources: [...new Set(deck.flatMap((slide) => [...slide.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '')))],
        storyThumbs: [...document.querySelectorAll('[data-print-deck-slide="story"] img')].length,
        text: deck.map((slide) => slide.innerText).join('\n'),
      };
    }, left.title);
    customer.kinds = customerKinds;
    customer.buttonsWithPowerPoint = (await page.getByRole('button').allTextContents()).filter((text) => /PowerPoint/.test(text));
    const printCount = (kinds) => kinds.filter((kind) => kind === 'print').length;
    const kindChecks = (label, kinds) => {
      check(kinds[0] === 'cover' && kinds[kinds.length - 1] === 'end', `${label}: slide order ${kinds.join(',')}`);
      check(kinds.includes('story'), `${label}: no story slide (${kinds.join(',')})`);
      check(kinds.includes('methodology'), `${label}: no methodology slide`);
      const lonely = kinds.flatMap((kind, index) => (kind === 'print' && kinds[index + 1] !== 'analysis' ? [index + 1] : []));
      check(lonely.length === 0, `${label}: print slide(s) ${lonely.join(', ')} not followed by their analysis`);
    };
    kindChecks('customer', customerKinds);
    check(customer.printImages === printCount(customerKinds), `customer: ${customer.printImages} img[data-print-image] for ${printCount(customerKinds)} print slides`);
    check(customer.whatItShows === 0, `customer: ${customer.whatItShows} img[data-capture-img] on this tab`);
    check(printCount(customerKinds) === list.shots.length - 1, `customer: ${printCount(customerKinds)} print slides, expected ${list.shots.length - 1} (one print unapproved)`);
    check(!customer.printAlts.some((alt) => alt.includes(left.title)), `customer: the unapproved print "${left.title}" still has its print slide`);
    check(customer.dqlOnly >= 1 && customer.dqlOnlyMentionsLeft, `customer: the unapproved print's analysis is not a dql-only slide (${customer.dqlOnly} dql-only)`);
    check(customer.buttonsWithPowerPoint.length === 0, `customer: buttons naming PowerPoint on this tab: ${customer.buttonsWithPowerPoint.join(' | ')}`);
    // The fixtures carry a fake e-mail and IP (B1 event detail, B15 log signature); the Customer deck also hides the host.
    const customerLeaks = leaksIn(customer.text, { host: app.tenantHost });
    check(customerLeaks.length === 0, `customer preview: the slides show ${customerLeaks.join(', ')}`);
    entry.customer = { kinds: customerKinds, printImages: customer.printImages, dqlOnly: customer.dqlOnly, storyThumbs: customer.storyThumbs };
    await slideShots('customer');
    const customerHygiene = await hygiene('customer');

    const customerFile = await download('prt-download-deck');
    const customerPptx = await readPptx(JSZip, customerFile.buffer);
    entry.customer.file = { name: customerFile.name, bytes: customerPptx.bytes, slides: customerPptx.slides, jpegs: customerPptx.jpegs.length, methods: customerPptx.jpegMethods };
    check(customerPptx.slides === customerKinds.length, `customer: the file has ${customerPptx.slides} slides, the preview ${customerKinds.length}`);
    check(customerPptx.jpegs.length === printCount(customerKinds), `customer: ${customerPptx.jpegs.length} JPEG media for ${printCount(customerKinds)} prints`);
    const customerFileLeaks = leaksIn(customerPptx.text, { host: app.tenantHost });
    check(customerFileLeaks.length === 0, `customer .pptx: the slides or notes carry ${customerFileLeaks.join(', ')}`);

    // Mask pixel: every customer image carries the burned-in e-mail mask (all of them were approved with their masks).
    const blank2 = await context.newPage();
    const emailCentre = { x: drawn.emailRect.x + drawn.emailRect.w / 2, y: drawn.emailRect.y + drawn.emailRect.h / 2 };
    const fill = hexRgb(app.MASK_FILL);
    // The point must sit on the light e-mail pill of the drawn JPEGs: the dark page around it is itself within
    // ΔE 6 of the mask colour, so a point off the pill would pass the mask check without measuring anything.
    const sourcePixels = await blank2.evaluate(samplePixels, { images: drawn.shots.map((shot) => shot.dataUrl.split(',')[1]), point: emailCentre, printWidth: app.PRINT_SPACE.width });
    entry.sourceDeltaE = sourcePixels.map((pixel) => Math.round(deltaE(pixel, fill) * 10) / 10);
    check(entry.sourceDeltaE.every((value) => value > 20), `drawn JPEGs: the e-mail sample point reads ΔE ${entry.sourceDeltaE.join(', ')} from ${app.MASK_FILL} before masking (must be > 20)`);
    const customerPixels = await blank2.evaluate(samplePixels, { images: customerPptx.jpegBase64, point: emailCentre, printWidth: app.PRINT_SPACE.width });
    entry.maskDeltaE = customerPixels.map((pixel) => Math.round(deltaE(pixel, fill) * 10) / 10);
    // 3.3.2: imported screenshots carry no mask suggestions (those came from the retired companion), and drawing a
    // mask is the SE's own act in the editor. So nothing here is masked, and the burn-in itself is covered by
    // tests/prints.capture.test.ts ("masks are burned in as a solid fill"). What this still proves: the sample point
    // reads the e-mail pill, and the deck does not alter the pixels it was given.
    entry.masks = 'not exercised in the harness since 3.3.2 (batch imports carry no suggestions); burn-in covered by prints.capture tests';
    check(customerPixels.length > 0 && entry.maskDeltaE.every((value) => value > 20), `customer: e-mail sample ΔE to ${app.MASK_FILL} = ${entry.maskDeltaE.join(', ')} (unmasked prints must read > 20)`);

    // 5b. SE profile
    await page.getByText('SE (internal)', { exact: true }).first().click();
    await page.waitForFunction((count) => document.querySelectorAll('img[data-print-image]').length > count, customer.printImages, { timeout: 60000 }).catch(() => undefined);
    await deckReady();
    const seKinds = await kindsNow();
    const se = await page.evaluate((title) => {
      const printImages = [...document.querySelectorAll('img[data-print-image]')];
      const left = printImages.find((img) => (img.getAttribute('alt') ?? '').includes(title));
      return {
        printImages: printImages.length,
        distinct: new Set(printImages.map((img) => img.getAttribute('src'))).size,
        leftSrc: left?.getAttribute('src') ?? null,
        whatItShows: document.querySelectorAll('img[data-capture-img]').length,
        text: [...document.querySelectorAll('[data-wrap-slide]')].map((slide) => slide.innerText).join('\n'),
      };
    }, left.title);
    const seLeaks = leaksIn(se.text, { host: null });
    check(seLeaks.length === 0, `SE preview: the slides show ${seLeaks.join(', ')}`);
    // Controls: the leak checks above measure something only while the carriers reach a slide — the B15 signature
    // that starts with the fake e-mail (shown redacted) and, for the Customer host check, the SE methodology's host.
    check(se.text.includes(app.REDACTED), `SE preview: no "${app.REDACTED}" on any slide, so the fake e-mail of the B15 signature no longer reaches one and the leak checks prove nothing`);
    kindChecks('SE', seKinds);
    check(se.printImages === printCount(seKinds), `SE: ${se.printImages} img[data-print-image] for ${printCount(seKinds)} print slides`);
    check(se.whatItShows === 0, `SE: ${se.whatItShows} img[data-capture-img]`);
    check(printCount(seKinds) === list.shots.length, `SE: ${printCount(seKinds)} print slides for ${list.shots.length} prints`);
    // The customer deck never shows the unapproved print's pixels: no print slide, no lupa, no story thumbnail.
    check(se.leftSrc !== null, 'SE: the unapproved print is not in the SE deck (expected with its pixels)');
    check(se.leftSrc === null || !customer.imageSources.includes(se.leftSrc), "customer: the unapproved print's pixels appear on a slide (story thumbnail or lupa)");
    entry.se = { kinds: seKinds, printImages: se.printImages, distinctPrints: se.distinct };
    await slideShots('se');
    const seHygiene = await hygiene('se');

    const seFile = await download('prt-download-deck');
    const sePptx = await readPptx(JSZip, seFile.buffer);
    entry.se.file = { name: seFile.name, bytes: sePptx.bytes, slides: sePptx.slides, jpegs: sePptx.jpegs.length, methods: sePptx.jpegMethods, contentTypesJpeg: sePptx.contentTypesJpeg };
    check(/-SE-interno\.pptx$/.test(seFile.name), `SE: file name ${seFile.name}`);
    check(sePptx.slides === seKinds.length, `SE: the file has ${sePptx.slides} slides, the preview ${seKinds.length}`);
    check(sePptx.jpegs.length === se.distinct, `SE: ${sePptx.jpegs.length} genimg JPEG media for ${se.distinct} distinct prints`);
    check(sePptx.jpegMethods.length === 1 && sePptx.jpegMethods[0] === 0, `SE: JPEG media compression methods ${sePptx.jpegMethods.join(',')} (must be STORE = 0)`);
    check(sePptx.contentTypesJpeg, 'SE: [Content_Types].xml does not declare jpeg');
    check(sePptx.bytes < 8 * 1024 * 1024, `SE: the file is ${(sePptx.bytes / 1e6).toFixed(2)} MB (must be < 8 MB)`);
    const seFileLeaks = leaksIn(sePptx.text, { host: null });
    check(seFileLeaks.length === 0, `SE .pptx: the slides or notes carry ${seFileLeaks.join(', ')}`);
    check(sePptx.text.toLowerCase().includes(app.tenantHost), `SE .pptx: the tenant host is on no slide, so the Customer host check proves nothing`);
    // Control: the SE deck keeps the unapproved print as captured (its suggestions were never accepted, so they are
    // not masks), which proves the sample point measures the pill and not the dark page around it.
    const sePixels = await blank2.evaluate(samplePixels, { images: sePptx.jpegBase64, point: emailCentre, printWidth: app.PRINT_SPACE.width });
    entry.se.maskDeltaE = sePixels.map((pixel) => Math.round(deltaE(pixel, fill) * 10) / 10);
    const seMasked = entry.se.maskDeltaE.filter((value) => value <= 6).length;
    check(seMasked === 0, `SE: ${seMasked} of ${sePptx.jpegs.length} images read as masked at the e-mail (ΔE ${entry.se.maskDeltaE.join(', ')}); nothing was masked`);
    check(/Not approved for the customer/.test(se.text), 'SE preview: the unapproved print\'s caption does not say "Not approved for the customer" (§17-g)');
    check(entry.se.maskDeltaE.some((value) => value > 20), `SE: the unmasked control reads ΔE ${Math.max(...entry.se.maskDeltaE)} from ${app.MASK_FILL}: the sample point does not measure the e-mail pill`);
    await blank2.close();

    // 5c. the PDF of the SE preview
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    fs.writeFileSync(path.join(dir, 'prints-deck.pdf'), pdf);
    const latin = pdf.toString('latin1');
    entry.pdfPages = (latin.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
    entry.pdfBoxes = [...new Set((latin.match(/\/MediaBox\s*\[[^\]]*\]/g) ?? []).map((box) => box.replace(/\s+/g, ' ')))];
    check(entry.pdfPages === seKinds.length, `PDF: ${entry.pdfPages} pages for ${seKinds.length} slides`);
    check(entry.pdfBoxes.length > 0 && entry.pdfBoxes.every((box) => /\[ ?0 0 960 540 ?\]/.test(box)), `PDF: MediaBox ${entry.pdfBoxes.join(' ')}`);

    // 6. hygiene of the tab
    entry.hygiene = [customerHygiene, seHygiene];
    for (const report of entry.hygiene) {
      check(report.duplicateIds.length === 0, `${report.label}: duplicate ids ${report.duplicateIds.map((item) => item.id).join(', ')}`);
      check(report.contrastFailing === 0, `${report.label}: ${report.contrastFailing} contrast failures (${report.contrastWorst.map((item) => `${item.text} ${item.ratio}`).join('; ')})`);
    }
    await page.screenshot({ path: path.join(dir, 'tab-final.png'), fullPage: false });
  } catch (error) {
    problems.push(`failed: ${String(error.stack ?? error).slice(0, 400)}`);
  }
  entry.console = { errors: mapToList(sink.errors), warnings: mapToList(sink.warnings), webFontsBlockedOffline: sink.fontsBlocked };
  entry.pageErrors = [...sink.pageErrors];
  entry.blocked = [...sink.blocked];
  check(entry.pageErrors.length === 0, `page errors: ${entry.pageErrors.join(' | ')}`);
  check(entry.console.errors.length === 0, `console errors: ${entry.console.errors.map((item) => item.text).join(' | ')}`);
  check(entry.blocked.length === 0, `requests to other hosts: ${entry.blocked.join(', ')}`);
  await context.close().catch(() => undefined);
  entry.dir = path.relative(OUT, dir);
  entry.problems = problems;
  entry.ok = problems.length === 0;
  return entry;
}

// ---------------------------------------------------------------------- main
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const started = Date.now();
  const server = await startServer();
  const info = await loadRoutes(server.loader);
  const rich = fixtureIds('rich');
  // TD-08 (3.3.2): the two incident-logs catalog entries render the text the mock resolves as `incident.logs`.
  const servedAs = (id) => (id === 'rca.incident.logs' || id === 'rca.incident.logs.services' ? 'incident.logs' : id);
  const missing = info.catalogIds.filter((id) => !rich.includes(servedAs(id)));
  // The dynamic (non-catalog) queries: the incident's own logs, its root cause's callers and (3.2.7)
  // the real-prints evidence queries (`fixtures/evidenceIds.mjs` = the registry's DYNAMIC_EVIDENCE_IDS).
  const DYNAMIC = new Set(['incident.logs', 'rca.callers', ...EVIDENCE_IDS]);
  const stale = rich.filter((id) => !info.catalogIds.includes(id) && !DYNAMIC.has(id));

  console.log(`[harness] ${server.url} | ${info.routes.length} routes (${info.stages} story stages + URL-only) | ${info.catalogIds.length} catalog queries`);
  if (missing.length > 0) console.warn(`[harness] WARNING catalog ids with no fixture (will render as empty): ${missing.join(', ')}`);
  if (stale.length > 0) console.warn(`[harness] note: fixtures for ids no longer in the catalog: ${stale.join(', ')}`);
  if (info.notCaptured.length > 0) console.warn(`[harness] note: routes declared in App.tsx but absent from STORY_STAGES (captured as extras): ${info.notCaptured.join(', ')}`);
  if (info.notRouted.length > 0) console.warn(`[harness] WARNING routes in STORY_STAGES with no <Route> in App.tsx: ${info.notRouted.join(', ')}`);

  if (args.list) {
    console.log(JSON.stringify({ routes: info.routes, catalogIds: info.catalogIds, missingFixtures: missing }, null, 2));
    await server.close();
    return;
  }

  const browser = await launchBrowser();
  let closing = false;
  browser.on('disconnected', () => {
    if (!closing) console.error('[harness] browser disconnected unexpectedly');
  });
  const meta = {
    generatedAt: new Date().toISOString(),
    fixedClock: FIXED_NOW,
    node: process.version,
    playwright: require(path.join(PLAYWRIGHT_CORE, 'package.json')).version,
    chromium: browser.version(),
    mode: args.mode === 'build' ? 'build (production bundle)' : 'dev (Vite dev server; React dev-mode warnings are emitted)',
    base: server.url,
    harnessNotes: [
      'Mocked SDK + synthetic data: this verifies layout, styling, accessibility and robustness, not data correctness.',
      'Console messages "Missing getTimezone/getTheme/getLanguage function from web runtime" are harness noise (no platform runtime) and are excluded.',
      'React Router future-flag warnings are counted separately (routerFutureFlagWarnings), not as warnings.',
    ],
  };

  try {
    if (!args['no-warmup'] && args.mode !== 'build') await warmUp(browser, server.url, info.routes);
    if (args.states) {
      const results = await runStates({ browser, base: server.url });
      const file = path.join(OUT, `${args.report ?? 'report-states'}.json`);
      fs.writeFileSync(file, JSON.stringify({ meta, results }, null, 2));
      console.log(`\n[states] ${results.filter((r) => r.ok).length}/${results.length} states reached; report: ${file}`);
    } else if (args.exports) {
      const results = await runExports({ browser, base: server.url, loader: server.loader });
      const file = path.join(OUT, `${args.report ?? 'report-exports'}.json`);
      fs.writeFileSync(file, JSON.stringify({ meta, results }, null, 2));
      for (const r of results) console.log(`[exports] ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.pdfPages ? ` (${r.pdfPages} pages)` : ''}${r.slides ? ` (${r.slides} slides, ${(r.bytes / 1e6).toFixed(1)} MB)` : ''}${r.ok ? '' : ' - ' + (r.problems ?? []).join('; ')}`);
      console.log(`\n[exports] report: ${file}`);
    } else if (args.i18n) {
      const results = await runI18n({ browser, base: server.url, routes: info.routes });
      const file = path.join(OUT, `${args.report ?? 'report-i18n'}.json`);
      fs.writeFileSync(file, JSON.stringify({ meta, results }, null, 2));
      console.log(`\n[i18n] report: ${file}`);
    } else {
      const { results, scenarios, cells, routes, opts } = await runMatrix({ browser, base: server.url, routes: info.routes });
      const summary = summarise(results);
      const file = path.join(OUT, `${args.report ?? 'report'}.json`);
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            meta: { ...meta, scenarios, cells: cells.map((c) => `${c.viewportName}-${c.theme}`), routes, fullHeight: [...opts.full], fixtureGaps: missing, routesNotCaptured: info.notCaptured },
            summary,
            pages: results,
          },
          null,
          2,
        ),
      );
      printSummary(summary, results.length);
      const bytes = results.reduce((sum, r) => sum + (r.bytes ?? 0), 0);
      console.log(`\nreport: ${file}\nscreenshots: ${OUT}/<scenario>/<route>__<viewport>__<theme>.png (${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - started) / 1000).toFixed(0)} s)`);
    }
  } finally {
    closing = true;
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
