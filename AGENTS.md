# Contributor and AI coding agent guide

PoC Automation 3.0 — app id `my.poc.automation`, a Dynatrace AppEngine app built with the App Toolkit (`dt-app`),
React 18 and the Strato Design System. Overview: `README.md`; architecture: `docs/ARCHITECTURE.md`. The code wins
over any document.

## Rules for every change

1. **Version in five places**, moved together: `package.json` `version`, `package-lock.json` (`.version` and
   `.packages[""].version`), `app.config.json` `app.version`, `ui/app/config/appInfo.ts` `APP_VERSION`. Use
   `npm run release -- --version x.y.z` and check with `npm run release:check`. Add a "What's new" entry
   (`WHATS_NEW` in `ui/app/components/HelpPanels.tsx`, keys `help.whatsNew.i<NN>`) and a `CHANGELOG.md` line.
2. **Gates before a deploy**, all green: `npm run typecheck` (UI and `actions/`), `npm run lint`, `npm test`,
   `npm run build -- --optimize --enable-code-splitting`, `npm run analyze`, `npm run docs:catalog` (no unexplained
   drift), and the visual harness (`scripts/visual/`, see its README) with its exports reviewed page by page.
   `scripts/release-gates.sh <label>` runs them in one go.
3. **Deploy with a new version number every time**, always passing `--environment-url` and
   `--optimize --enable-code-splitting` (`docs/DEPLOYMENT.md`). The manifest's `environmentUrl` stays a placeholder.
4. **Scopes**: a new or removed scope is a manifest change with a comment, a line in `docs/PERMISSIONS.md` and a
   deploy. `ui/app/tests/catalog.test.ts` checks that every catalog scope is declared and every storage scope used.
5. **Money only in Licensing.** Prices, DPS cost and currency appear only in Licensing and as `projection` figures
   inside `SeOnly` / `commercialVisible`; executive mode (`CommercialScope`) hides them; never in a customer export.
6. **Never sum or count a capped list.** A list with `| limit` or `maxResultRecords` shows "top N"; totals come from
   an aggregate companion query registered in `ui/app/tests/catalogCaps.test.ts`.
7. **Every number has provenance**: a `Fact` with its evidence class, query id and read time. Absence is
   `unavailable(...)`, never `?? 0`. No invented or AI-made numbers.
8. **Data goes through the catalog.** New queries are entries in `ui/app/queries/catalog.ts` (purpose, DQL without
   interpolation or window, `requiredScope`, `timeframe`, cost `guards`, a `validation` record) read with
   `useCatalogQuery`. A query that needs an id is a parameterised entry in `queries/catalogTemplates.ts`, rendered
   only by `queries/params.ts` — never concatenate an id into DQL. Dashboard tiles and notebook sections read a
   catalog entry or a validated query of `features/dashboard/blueprints.ts`. The workflow actions read only catalog
   entries. `ui/app/tests/td08.catalogParams.test.ts` fails if `useDql` is imported outside `useCatalogQuery`.
9. **Nothing is created on the tenant automatically.** Every PoC Builder kit writes only after the SE's click and a
   confirmation, is kept in the Register and can be removed by the clean-up; workflows and anomaly detectors are
   handed to their platform apps and saved there by the user.
10. **The Tech Wrapup fingerprint** (`ui/app/tests/deckFingerprint.test.ts`) stays green; re-pin it only for a
    deliberate deck change, and record why in the test's re-pin log.
11. **Languages**: every key exists in `en` and `pt-BR`; Portuguese UI text is positive and hedged. A new i18n
    fragment needs three edits: the file, the import and spread in `ui/app/i18n/strings.ts`, and the `fragments`
    list in `ui/app/tests/i18n.test.ts`.
12. **No secrets in the repository**: never commit `.env` files, `.dt-app/` tokens, credentials or tenant ids; the
    partner and master passwords exist only as PBKDF2 verifiers. Tests read passwords from environment variables.
13. **Keep the storage contract.** The App State keys (`pvs.*`), the PoC export format (`poc-value-studio.poc`) and
    the document types keep their historic names; renaming them would orphan existing PoCs.

## DQL

Before writing a DQL query, consult the DQL documentation and examples (the `dt-app` MCP knowledge base, when
available). Prefer metrics and the entity model (0 bytes scanned); keep log reads sampled or in a short window, and
always set a scan limit.

## Strato

Import Strato components from their category subpath (`@dynatrace/strato-components/layouts`, `/tables`, …), never
from the package root. Pages reach the Strato charts only through `ui/app/engine/strato/`. Check component APIs in
the `.d.ts` files under `node_modules/@dynatrace/strato-components/<category>/<component>/`.

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npx dt-app dev --environment-url https://<env>.apps.dynatrace.com/` |
| Typecheck / lint / tests | `npm run typecheck` · `npm run lint` · `npm test` |
| Delivery build | `npm run build -- --optimize --enable-code-splitting` |
| Query catalog doc | `npm run docs:catalog` |
| Deploy | `npx dt-app deploy --optimize --enable-code-splitting --environment-url https://<env>.apps.dynatrace.com/` |

## Common tasks

- **Add a route:** the `lazy()` import and `<Route>` in `ui/app/App.tsx`; an entry in `NAVIGATION` and the route in
  exactly one stage of `STORY_STAGES` (`ui/app/config/navigation.ts`); decide `EXECUTIVE_HIDDEN_ROUTES`,
  `SE_ONLY_ROUTES` and `RESTRICTED_ROUTES`; add `nav.*` keys in both languages.
- **Query data:** add a catalog entry and `catalog.purpose.<id>`, read it with `useCatalogQuery(id, useQueryScope())`,
  render `Fact`s, then run `npm run docs:catalog`.
- **Style:** use `ui/app/engine/` and Strato design tokens; gradients only in `engine/spectrum.css`; font weight
  ≤ 600 and text ≥ 12 px (checked by a test).
