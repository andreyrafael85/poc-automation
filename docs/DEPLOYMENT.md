# Deployment

PoC Automation 3.0 is deployed with the Dynatrace App Toolkit (`dt-app`, a dev dependency of this project).

## Before the first deploy

1. **Node.js 24** and `npm ci` in the repository.
2. A user on the target environment allowed to install and run apps (`app-engine:apps:install`,
   `app-engine:apps:run`).
3. Review the placeholders (see the README, "Before you deploy"):
   - `ui/app/config/access.ts` — the partner master-password verifier (`deadbeef…` placeholder, matches nothing);
   - `ui/app/config/appInfo.ts` — the footer's contact address (`se@example.com`);
   - `ui/app/features/wrapup/prints/capture/tenantGuard.ts` — the SHA-256 of environment ids the Real proofs refuse.
4. Optional: brand assets. Without them the decks use a neutral theme; `npm run brand:status` reports which.

`app.config.json` keeps `environmentUrl` as a placeholder (`https://YOUR-ENVIRONMENT-ID.apps.dynatrace.com/`) on
purpose: the target environment is always given on the command line, so every deploy names its destination.

## Run the gates

```bash
npm run typecheck
npm run lint
npm test
npm run analyze
npm run build -- --optimize --enable-code-splitting
npm run docs:catalog        # regenerates docs/QUERY-CATALOG.md; review any drift
```

`scripts/release-gates.sh <label>` runs all of them, plus the visual harness's routes and exports, and writes the
results to `.visual-qa/<label>-*`. It reads and builds only — no deploy, no tenant read.

## Deploy

```bash
npx dt-app deploy --optimize --enable-code-splitting \
  --environment-url https://<your-environment-id>.apps.dynatrace.com/
```

or, with the same flags, `scripts/deploy.sh https://<your-environment-id>.apps.dynatrace.com/`, which first checks
the version (`npm run release:check`) and can sign in without a browser when an OAuth-client credentials file
exists (`$PVS_DEPLOY_ENV`, mode 600, outside the repository; the script never prints its values).

At install the platform validates the manifest (for instance, the description must stay within 80 characters) and
asks to accept the **25 scopes** ([PERMISSIONS.md](PERMISSIONS.md)). The two workflow actions in `actions/` are
installed with the app and appear in Workflows as `my.poc.automation:poc-triage` and `my.poc.automation:poc-weekly`.

## Versions

The version lives in five places that move together: `package.json` `version`, `package-lock.json` (`.version` and
`.packages[""].version`), `app.config.json` `app.version` and `ui/app/config/appInfo.ts` `APP_VERSION`.

```bash
npm run release -- --version x.y.z   # bumps exactly those five
npm run release:check                # verifies they agree
npm run release:pack                 # optimized build → out/poc-value-studio-x.y.z.zip + .sha256
```

`release:pack` refuses to overwrite an existing archive and refuses a bundle that contains the builder's home path
or any string listed in `PVS_RELEASE_FORBIDDEN` (comma-separated, for example environment ids you never want in a
bundle). The archive name keeps the project's historic `poc-value-studio` prefix.

Each release also adds a "What's new" entry (`WHATS_NEW` in `ui/app/components/HelpPanels.tsx`, with its
publication day) and a line in `CHANGELOG.md`.

**Rules of thumb**

- Deploy each version **once**, always with a new number. A version the platform refused before installing anything
  (at manifest validation or at install) can be fixed and retried under the same number.
- Never edit the manifest's `environmentUrl`; pass the URL on the command line.

## Rollback

Deploy the previous release's tree **under a new, higher version number** (check it out, run
`npm run release -- --version <next>`, the gates, then deploy).

- The app's App State (`pvs.*` keys) stays: the stored documents are parsed field by field, so an older release
  reads a newer document and ignores what it does not know.
- What the PoC Builder created on the environment (dashboards, notebook, launchpad, SLOs, monitors, the OpenPipeline
  pipeline and its route) stays there. Remove it first with the Builder's clean-up if the older release cannot
  manage it, or remove it in the platform's own apps.
- Workflows saved in the Workflows app keep running as long as the actions they use still exist; an older release
  without an action makes that task fail until it is removed.
- A scope added by the newer release leaves with the older manifest.

## Moving a PoC to another app id or environment

App State belongs to one app id on one environment. Settings → "Export this PoC" writes a file with the shared
configuration, the SE's private figures and the Coverage history and plan; "Import a PoC" in the other install
reads it back. The partner password, the partner list and any data read from the environment never travel.

## Uninstall

```bash
npx dt-app uninstall --environment-url https://<your-environment-id>.apps.dynatrace.com/
```

Uninstalling removes the app and its App State. Run the PoC Builder's clean-up first to remove what the PoC created
on the environment, and export the PoC if you want to keep its configuration.
