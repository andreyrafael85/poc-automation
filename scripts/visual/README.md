# Visual verification harness (DEV-ONLY)

Renders the **real** PoC Automation 3.0 UI (`ui/main.tsx` -> `ui/app/App.tsx`) in a
plain headless browser, with the Dynatrace platform SDK replaced by local mocks and all
data replaced by synthetic fixtures, then captures screenshots and runs automated
layout / accessibility / robustness checks.

Everything lives under `scripts/visual/`. It is not read by `dt-app build`, `tsc`,
`vitest` or ESLint, so it cannot change the shipped bundle or the repo gates. Output goes
to `.visual-qa/` in the repo (git-ignored; pass `--out DIR` for elsewhere). No `node_modules` are added to the repo.

```
scripts/visual/
  capture.mjs        CLI: starts Vite, drives Playwright, writes PNGs + JSON reports
  checks.mjs         in-page measurement functions (overflow, headings, targets, focus ...)
  vite.config.mjs    standalone Vite config: aliases the SDK to mocks/, serves /ui/assets
  index.html         same <base href="/ui/"> and #root as the platform's index.html
  entry.jsx          one line: imports the real ui/main.tsx (so there is no copy to drift)
  mocks/             react-hooks (useDql), client-query, client-state, client-document, app-environment, error envelopes
  fixtures/          synthetic data per catalog query id: rich.mjs, sparse.mjs, lib.mjs;
                     prints.mjs (real-prints evidence), evidenceIds.mjs (the dynamic evidence query ids)
```

Note on file types: the harness uses `.mjs` / `.jsx`, not `.ts` / `.tsx`. The repo's
ESLint config type-checks every `**/*.ts(x)` through the TypeScript project service, and
files outside `ui/tsconfig.json` would turn `npm run lint` red.

## Run it

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
cd <repo>

node scripts/visual/capture.mjs                  # default: rich; desktop-light, mobile-light, desktop-dark; all routes
node scripts/visual/capture.mjs --help           # every flag
node scripts/visual/capture.mjs --list           # routes, catalog ids, fixture coverage gaps

# limit the matrix
node scripts/visual/capture.mjs --routes /,/coverage --viewports desktop,tablet --themes light,dark
node scripts/visual/capture.mjs --scenarios sparse,denied,loading,error --viewports desktop
node scripts/visual/capture.mjs --viewports wide,tablet,mobile --full all     # full matrix pieces

# interaction states on "/" (help menu, help sheets, sidebar, evidence overlay, exec mode, pt-BR)
node scripts/visual/capture.mjs --states
node scripts/visual/capture.mjs --states --viewports mobile,tablet --themes light,dark

# English vs pt-BR text comparison (lists strings identical in both locales)
node scripts/visual/capture.mjs --i18n

# what leaves the app: /report printed to PDF through Chromium (page count, chrome hidden, no sideways overflow), the
# Tech Wrapup .pptx downloaded and opened as a zip, the deck tab, and the real-prints deck end to end (see below).
# Output: .visual-qa/exports/ (report.pdf, the .pptx files, deck.pdf, prints-deck/)
node scripts/visual/capture.mjs --mode build --seed --exports
node scripts/visual/capture.mjs --mode build --seed --exports --only prints-deck      # one block (names below)

# 3.2.7 real prints: the tab under rich and sparse data, both themes, desktop and phone
node scripts/visual/capture.mjs --mode build --seed --routes /wrapup,/wrapup/prints --scenarios rich,sparse \
  --viewports desktop,mobile --themes light,dark --out .visual-qa/v327-prints --report v327-prints

# production bundle instead of the dev server (no React dev-mode warnings; use it for the console pass/fail count)
node scripts/visual/capture.mjs --mode build --out .visual-qa/build --report report-build
# two build-mode runs at once: give each its own bundle directory (default .visual-qa/.dist, emptied by every build)
PVS_HARNESS_DIST=/tmp/pvs-dist-a node scripts/visual/capture.mjs --mode build --exports --out .visual-qa/run-a

# browse the harness by hand
npx vite --config scripts/visual/vite.config.mjs    # then http://127.0.0.1:5199/ui/?scenario=rich
```

Default run is about 5 minutes for 81 captures (about 32 MB of PNGs): a 20-30 s warm-up that lets Vite finish
optimising dependencies (skip with `--no-warmup`), then 3 parallel pages. `--mode build` takes about 20 s longer to build
the bundle and is faster per page.

### Output

```
<repo>/.visual-qa/
  <scenario>/<routeSlug>__<viewport>__<theme>.png     e.g. rich/coverage__desktop__light.png ("/" is "home")
  states/<scenario>/<state>__<viewport>__<theme>.png
  report.json            per-page results + summary counts (pass / warn / fail per check)
  report-states.json     --states results
  report-i18n.json       --i18n results
```

Viewports: `desktop` 1440x900, `wide` 1920x1080, `tablet` 1024x768, `mobile` 390x844 (a
narrow desktop browser, not device emulation). Themes via `colorScheme` light/dark.
`deviceScaleFactor` is 1. Full-height capture (default for desktop, wide, tablet; cap
`--max-height`, default 9000 px) is done by growing the viewport, because the app
scrolls inside `PageLayout.Content` and not the document, so Playwright's `fullPage`
would only capture one screen. The clock is frozen at 2026-09-15T12:00Z, so repeated
runs are byte-for-byte comparable.

### URL parameters (also usable by hand)

| Param | Values | Effect |
| --- | --- | --- |
| `scenario` | `rich` (default), `sparse`, `denied`, `loading`, `error`, `scanlimit` | which data the mocked `useDql` serves |
| `locale` | `en` (default), `pt-BR` | seeds the app's language state |
| `exec` | `0` / `1` | seeds executive mode |

All three are persisted in `sessionStorage`, so in-app navigation keeps them. URLs are
`http://127.0.0.1:<port>/ui/<route>` (`BrowserRouter basename="ui"`, like the real app).
`locale` and `exec` work through a text transform of `StudioContext.tsx` applied in memory
by the Vite config (the source file is never modified). If the patterns stop matching the
harness prints a warning and `--states` still exercises the header controls.

### Scenarios

| Scenario | What the mocked `useDql` does |
| --- | --- |
| `rich` | busy estate: 62 hosts, 70 services, long (80+ char, unbroken) names, nulls and missing fields, numeric-string counters, a long markdown problem description, series with gaps |
| `sparse` | zero or near-zero counts, empty lists, several entity categories at 0 (not all: "all zero" is the separate entity-model-down state the app diagnoses itself) |
| `denied` | rich data, except queries whose `requiredScope` is `storage:security.events:read` or `storage:user.sessions:read` fail with a 403 error envelope (`isErrorEnvelopeError` true, `body.error.missingScopes`, `errorType`, "Missing OAuth scope" message), so the app reaches its no-permission state |
| `loading` | promises never resolve; `isLoading` stays true |
| `error` | every query fails with a generic 500 envelope (not a permission error) |
| `scanlimit` | rich data plus a Grail scan-limit notification (`metadata.grail.notifications`, `SCAN_LIMIT_GBYTES`), as `mocks/react-hooks.mjs` serves it |

The Document Service mock (`mocks/client-document.mjs`, 3.2.7) keeps documents in memory for the page's
lifetime, with optimistic versions (a stale version is HTTP 409, a missing document 404). Under `denied` every
call fails with the 403 envelope, so the real-prints tab reaches its memory-only state. `deleteDocument`
throws and logs a console error: the app has no delete scope and must never call it.
`globalThis.__pvsDocuments()` (harness only, not in the SDK) returns what was stored, so `prints-deck` can
inspect the saved documents.

## What it checks (per page, in `report.json`)

`console` (errors and uncaught page errors), `consoleWarnings`, `render` (page has content),
`overflow` (horizontal overflow of the document **and** of the real page scroller, with the
widest offending elements), `offscreenControls` (buttons/links/inputs positioned outside the
viewport horizontally), `imageAlt` (img without alt, unnamed images in the accessibility
tree), `duplicateIds`, `headings` (exactly one h1, no skipped levels), `landmarks` (exactly
one main), `targetSize` (interactive elements under 24x24 CSS px; inline text links are
marked and tolerated), `accessibleNames` (buttons, links, inputs, comboboxes ... with an
empty accessible name, from Chromium's accessibility tree), `reducedMotion`
(`prefers-reduced-motion: reduce` emulation still renders, and how many infinite animations
still run), `keyboard` (15 Tab presses from the top: sequence of focused elements and names,
whether each has a visible indicator by the outline/box-shadow rule or by a visible style
change on itself or a wrapper, focus loss, traps, skip link first), `offline` (any request
to a non-local host; `dt-cdn.net` web fonts are tolerated and counted separately).

`--states` adds: help menu open, each help sheet (guide, what's new, methodology, data
sources, about), sidebar toggle, evidence-badge overlay, window and language selects open,
executive mode (clicked and seeded), and Portuguese (seeded, via the header Select, and the
help menu in Portuguese). Each state records whether the control was found, and for sheets the dialog size and how many buttons/focusable
elements it contains. Every state runs in a fresh page.

## Export blocks (`--exports`)

| Block | What it proves |
| --- | --- |
| `report-print` | `/report` prints on several A4 pages, chrome hidden, no sideways overflow |
| `wrapup-pptx` | the Tech Wrapup "Download PowerPoint" file is an OOXML zip with its slide parts |
| `wrapup-deck` | the deck tab: preview = file = PDF pages (16:9 MediaBox), captures, executive slide, no one-pager tab |
| `prints-deck` | 3.2.7 real prints, end to end, below |

`prints-deck` never uses a real screenshot. On `/wrapup/prints` (rich) it downloads the shot list
(`prt-download-plan`), then **draws** one 1720x1080 JPEG per shot in a blank page of the same browser
context: a dark page, a title bar with the shot title, the identity text inside its layout zone, three cards
whose headings are the shot's anchor words (each with a number) and `ana.silva@contoso.example` / `10.1.2.3`
on a light pill. It writes the companion's manifest 1.1.0 for them (tenant = the mocked environment host,
anchors at the drawn coordinates with their numbers, mask suggestions over the e-mail and the IP, sha256,
`browserTimeZone: 'UTC'`), zips it with the companion's own `zipStore` and imports it through
`prt-import-zip`. Every print but the root cause's is approved (`prt-accept-masks-<id>`, `prt-checklist-<id>`,
`prt-identity-<id>` when shown, `prt-approve-<id>`). Then it checks:

- 4 report tabs, the 4th "Wrapup deck test — real prints", no one-pager tab; plan rows >= 7; the import
  report says "{n} ok · 0 not ok · 0 outside the plan"; every identity anchor was recognised (no SE confirmation);
- both profiles' preview: `cover` first, `end` last, a `story` and a `methodology`, every `print` followed by its
  `analysis`; `img[data-print-image]` = print slides; no `img[alt="What it shows"]`; no button says "PowerPoint";
- Customer: the unapproved print has no print slide, its analysis is `data-analysis-variant="dql-only"`, and its
  pixels are on no slide (story thumbnail, lupa); the .pptx has one JPEG per print and the slides of the preview;
- SE: the .pptx has the preview's slides, one `ppt/media/genimgN.jpeg` per distinct print, stored (ZIP method 0),
  `[Content_Types].xml` declares jpeg, < 8 MB, file name `…-SE-interno.pptx`;
- the PDF (`preferCSSPageSize`): one page per slide, every MediaBox `[0 0 960 540]`;
- mask pixel: the centre of the e-mail mask reads ΔE > 20 from `MASK_FILL` in every drawn JPEG (the point is on the
  light pill: the dark page around it is itself within ΔE 6 of the mask colour) and within ΔE 6 (CIE76) in every
  Customer JPEG; in the SE deck all prints but the unapproved one (suggestions never accepted) are masked;
- privacy: the fixtures put the fake e-mail and IP in a B1 event detail and a B15 log signature, so neither may
  appear in the text of either preview or of either .pptx (slides and notes); the Customer preview and .pptx
  carry no tenant host either. The manifest's anchor labels and page titles carry markers; after the tab says
  "Saved on the tenant at …", the stored documents (print set and images, both private) must not contain them;
- hygiene: no duplicate ids, no contrast failures, no page or console errors, no request off localhost.

Everything it makes stays under `<out>/exports/prints-deck/` (shot list, manifest, drawn JPEGs, ZIP, both .pptx
files, the PDF, one PNG per slide per profile, three tab screenshots); none of it is committed.

## What it cannot do

- There is **no Dynatrace platform**: no real data, no real permissions, no real Grail
  semantics. The SDK is mocked, so this verifies layout, styling, accessibility and
  robustness of the UI, never the correctness of a query or a number.
- `useDql` is a simulation (deterministic short delay, then fixture rows). Caching,
  polling, scan limits and real error shapes beyond the envelopes above are not modelled.
- **Web fonts are missing.** DTFlow and Roboto load from `dt-cdn.net` in production; the
  harness is offline by design, so a system fallback font is used and text widths differ
  slightly. Findings close to a pixel threshold (truncation, wrapping, overflow by a few
  px) can differ on the platform.
- The default mode runs the Vite **dev** server, so React dev-only warnings appear in
  `console` (for example invalid DOM props, duplicate keys) and would not appear in production.
  Use `--mode build` for a production-like check. Neither is the `dt-app build` pipeline.
- Dev-server dependency re-optimisation can briefly leave a page with two React copies ("Invalid hook call");
  the harness detects those signatures and retries the page, and flags `harnessFlaky` if it persists.
- Platform chrome (the Dynatrace app shell around the app, real theme/user preferences,
  real `AppRoot` runtime services) is absent. "Missing getTimezone/getTheme/getLanguage/getRegionalFormat
  function from web runtime" messages are harness noise and excluded.
- Mobile is a 390px-wide desktop browser (no touch emulation, no device pixel ratio).
- Checks are heuristics: the target-size check lists Strato internals too; the focus
  indicator check cannot see ring styles drawn on pseudo-elements.

## Adding or changing a fixture

1. Add the catalog entry in `ui/app/queries/catalog.ts` (the harness matches `useDql`'s
   query text against the catalog's `dql`, so the id is found automatically).
2. Add rows to `fixtures/rich.mjs` (and `fixtures/sparse.mjs`) under the same id, in the
   returned object, using the field names from the DQL `fields` / `summarize` aliases:
   ```js
   'my.new.query': t([{ name: 'svc-checkout-01', total: 1200 }]),
   ```
   Use `table(rows)` for tables and `timeseries({ points, intervalMs, series, metrics })`
   (from `fixtures/lib.mjs`) for `timeseries` queries; the result shape is accepted by
   Strato's `convertQueryResultToTimeseries`. Remember Grail units: durations are
   nanoseconds, `response_time` is microseconds, `memoryTotal` is bytes; 64-bit counters may
   arrive as numeric strings.
3. Names must be synthetic (`svc-checkout-01`, `host-eu-03`, `k8s-cluster-a`), ids come
   from `entityId('HOST', n)`, no real tenant or customer identifiers, no e-mail addresses.
4. Run `node scripts/visual/capture.mjs --list`: it warns about catalog ids with no fixture
   and about fixtures whose id left the catalog. A missing fixture renders as an empty
   table plus a `[pvs-harness]` console warning (never a crash).
5. For a query built dynamically (not in the catalog, like the incident-logs query in
   `useIncidentErrorLogs`), add a pattern to `resolveId()` in `mocks/react-hooks.mjs`.
6. The real-prints evidence queries (3.2.7) need no pattern: `resolveId()` asks the app's own
   `identifyEvidenceQuery` (`ui/app/features/wrapup/prints/evidence/registry.ts`), and their fixtures live in
   `fixtures/prints.mjs`. A fixture there may be a function of `{ query, startIso, endIso }` (the per-minute reads
   start at the window the app asked for; the service reads answer for the ids in the text), and an evidence
   query is keyed by its window too. A new evidence query goes into the registry, into
   `fixtures/evidenceIds.mjs` (`tests/prints.harness.test.ts` keeps it equal to `DYNAMIC_EVIDENCE_IDS`) and
   into `prints.mjs` (and `sparse.mjs` gets it empty through `emptyPrintFixtures`).

## Safety

Localhost only (Chromium is launched with a host-resolver rule that fails every other
host), no tenant contact, no credentials, no `.env`, no session or storage state. The
Playwright library is not a dependency of the app: by default the harness resolves
`playwright-core` from this repository's `node_modules` (install it with
`npm install --no-save playwright-core`), or loads it from the path in `PVS_PLAYWRIGHT_CORE`;
override the browser with `PVS_CHROMIUM`.
