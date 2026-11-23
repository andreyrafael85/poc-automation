# Permissions

The app's manifest (`app.config.json`) declares **25 scopes**, each with a comment. The platform shows them at
install time and the installing administrator accepts them. Scopes limit what the **app** may call; what a person
can actually read or change is still decided by their own IAM permissions on the environment. A query whose scope
the user lacks shows an explicit "no permission" state — never "no data".

A test (`ui/app/tests/catalog.test.ts`) fails if a catalog query needs a scope that is not declared, or if a storage
scope is declared but never used.

## Grail — reading data

| Scope | Why the app needs it |
| --- | --- |
| `storage:entities:read` | The inventory of hosts, services, applications, processes, Kubernetes and synthetic monitors. Entity-model reads scan 0 bytes. |
| `storage:smartscape:read` | Smartscape on Grail (`smartscapeNodes` / `smartscapeEdges`): cloud service families and Kubernetes pods. Without it those queries are refused. |
| `storage:events:read` | Problems (`dt.davis.problems`), Kubernetes operational events and synthetic events. |
| `storage:system:read` | `dt.system.events`: billing usage, workflow and query execution events, platform adoption, and the billing of the app's own queries (Licensing → App consumption). |
| `storage:buckets:read` | `dt.system.buckets`: retention, volume and access per bucket. |
| `storage:logs:read` | Log volume, levels and data quality. Every log read is scan-limited and sampled or kept to a short window. |
| `storage:metrics:read` | Timeseries for hosts, services, Kubernetes and real users, the SLO indicators and the GenAI metrics of AI Observability. |
| `storage:bizevents:read` | Business observability. |
| `storage:security.events:read` | Vulnerabilities and runtime risk. Without it the Security page shows an explicit no-permission state. |
| `storage:user.sessions:read` | Real user sessions. Without access the app shows an explicit gap. |

## App State — the PoC's configuration

| Scope | Why the app needs it |
| --- | --- |
| `state:app-states:read` | Read the shared PoC configuration (customer, scope, logos, plan, partner access, Coverage history and action plan). |
| `state:app-states:write` | Save the shared PoC configuration, so it is still there when the app is reopened. |
| `state:app-states:delete` | "New PoC": delete the shared configuration. |
| `state:user-app-states:read` | Read the user's own working figures (rates, rate card, baseline, language, window). Readable only by that user. |
| `state:user-app-states:write` | Save the user's own working figures. |
| `state:user-app-states:delete` | "New PoC": delete the user's own figures. |

## Documents — what the PoC Builder and the real proofs keep

| Scope | Why the app needs it |
| --- | --- |
| `document:documents:read` | Read the version of a document the app created, so "Update" replaces the same document instead of creating a copy; read back the SE's private real-proofs set. |
| `document:documents:write` | Create and update the Builder's dashboards, investigation notebook and launchpad — only when the SE clicks and confirms; keep the SE's private real-proofs set (a JSON and a ZIP of screenshots); and, with the workflow actor's permissions, the weekly report notebook. |
| `document:documents:delete` | The end-of-PoC clean-up: remove the documents in the PoC's Register, only after the SE ticks them and confirms. |

## Building on the environment

| Scope | Why the app needs it |
| --- | --- |
| `slo:slos:read` | Read an SLO's current version before removing it (the platform's optimistic lock). |
| `slo:slos:write` | Create the availability, performance and fleet SLOs the SE picks, and remove them in the clean-up. |
| `environment-api:synthetic:read` | List the environment's public synthetic locations, so the SE picks where the monitors run. |
| `environment-api:synthetic-monitors:write` | Create the Browser and HTTP monitors the SE confirms, and remove them in the clean-up. |
| `settings:objects:write` | Create and remove the OpenPipeline logs pipeline (`builtin:openpipeline.logs.pipelines`) and write the logs routing back with the PoC's route. |
| `settings:objects:read` | Read the OpenPipeline logs routing (`builtin:openpipeline.logs.routing`) — one settings object whose routes every pipeline shares — so only the PoC's route is added or removed. |

## What the app does not request

- **No `automation:*` scope.** The platform reserves workflow writing to Dynatrace's own apps. The PoC Builder builds
  the workflow and hands it to the Workflows app through its intent; the SE saves it there with their own
  permissions.
- **Anomaly detectors** are opened in the Anomaly Detection app through its intent and saved there by the SE, so no
  extra scope is needed for them.
- **No API token and no client secret.** Authentication is handled by AppEngine at runtime and by the `dt-app`
  session at deploy time.

## Workflow actions

The two workflow actions (`poc-triage`, `poc-weekly`) declare no scope of their own. They run with the **workflow
actor's** permissions and read only query-catalog entries, using the storage scopes above; the weekly action writes
its notebook with the actor's `document:documents:write`.

## Content security policy

One addition: `img-src blob:`, so the real-proofs thumbnails, editor and crop dialog can show the SE's own
screenshots from in-memory Blobs. Nothing is loaded from another origin.

## Changing the scopes

Adding or removing a scope is a manifest change: add it with a comment in `app.config.json`, document it here,
deploy a new version and accept it at install. Some scopes are reserved by the platform to Dynatrace's own apps and
are refused at install.
