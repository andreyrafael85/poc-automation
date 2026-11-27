# Changelog

## 3.8.1 — the service user in Settings, the brand colour on the dashboards, seven stages

**The service user that runs the anomaly detectors moves to Settings**

- Settings → PoC plan holds the service user that runs the PoC Builder's anomaly detectors, as a step of the
  preparation. The account's UUID opens its service users in Account Management; the SE picks one already running
  detectors on the environment or pastes the id of one made for the PoC, and the platform checks it before it is
  saved — the check no longer sends an empty event description.
- The PoC Builder only reads it and can check it again. Creating a service user stays in Account Management.

**Dashboards, AI Observability and the menu**

- The dashboards' section banners take the customer's brand colour chosen in Settings, which gains navy and green.
- AI Observability in proportion: tokens over time across the page, then tokens by model, tokens by service and the
  models in use side by side, with the tables below.
- The menu has seven stages: the Executive summary opens Demonstrated value, and Consumption and events and Licensing
  close Recommendations.

## 3.8.0 — anomaly detectors run by a service user

**The PoC Builder creates the anomaly detectors again**

- A detector runs its query on behalf of an actor, and the platform takes a **service user** as that actor — a
  person's own account is not accepted. The Anomaly detection tab now asks for that service user: those already
  running detectors on the environment are offered once the platform accepts them, or an id is pasted and checked
  with the platform's validate-only call before anything is written. The choice is kept with the PoC.
- One detector per golden signal over the services ticked, or one per signal and per service, named after it;
  created only on the SE's click after a confirmation, kept in the Register and removed by the clean-up.
- Opening a detector in the Anomaly Detection app instead arrives with its event already filled in.

**Links and AI Observability**

- The OpenPipeline link opens the logs' dynamic routes; the detectors' link opens Settings → all the alerts.
- On AI Observability, the models in use sit beside the table of tokens by service and model.

## 3.7.9 — the Autonomous Value Cycle

**Coverage tells the value the PoC delivered**

- The **Autonomous Value Cycle** replaces the maturity journey on the Coverage page: around a Foundation, five links
  that feed each other — Context, Cause, Impact, Action and Prevention — count the **value events** the PoC already
  demonstrated, from what the app reads on the environment (nothing new is queried), with the **next wave** of each
  link. No level, step or score: the count only grows over a PoC.
- An **autonomy ladder** — Observe, Explain, Prioritise, Propose, Act — shows the rungs the PoC demonstrated and the
  target agreed with the customer for this PoC, chosen on the panel and kept in the PoC plan.
- AI Observability and runtime security run across the cycle; for the SE and the partner, each link also says what
  Professional Services brings.
- The Coverage card, the conversation guide and the Tech Wrapup (its Coverage section and a new "Value cycle"
  capture) speak of value events.

**A menu in nine stages**

- Context · PoC objectives · Coverage achieved (Coverage, Platform adoption) · Evidence (every page that reads the
  environment, from Dynatrace Intelligence to Competitor overlap) · Impact (Executive summary, Consumption and
  events) · Demonstrated value · Recommendations · Next steps (Licensing, for the SE and partners) · Settings & Build.
- The Roadmap page became the **30-60-90 action plan**, a tab of Opportunities (the old address opens it).

**The Dynatrace brand kit included**

- The deck template, the DT Flow typeface, the logos, product logomarks and technology glyphs are now part of the
  repository, so the Tech Wrapup, the Real proofs and the PDFs come out in the Dynatrace brand — for Dynatrace
  collaborators and official Dynatrace partners only; all rights belong to Dynatrace LLC (see the README's rights
  notice). `npm run brand:strip` turns the app back to a neutral theme.
- The tests that need the brand kit now run: 2,079 passing, none skipped.

## 3.7.8 — first public release of PoC Automation 3.0

The all-in-one Dynatrace AppEngine app for running a proof of concept end to end.

**The story of the PoC**

- Ten stages in the side menu — Context, PoC objectives, Coverage achieved, Discoveries, Evidence, Impact,
  Demonstrated value, Recommendations, Next steps, Settings & Build — over 28 pages, each read from the customer's
  own environment.
- Coverage with an observable-coverage index, a maturity journey on four pillars, findings, a depth map and an agreed
  action plan; Dynatrace Intelligence and AIOps & RCA with the incident's propagation; Services, Infrastructure,
  Kubernetes, Logs, Automation and **AI Observability** (GenAI tokens, models, services and calls); the Executive
  summary with Day 0 against today; Platform adoption; Value & ROI; Licensing with what the app itself consumes.
- A setup guide of seven readiness steps; while the PoC is being prepared the menu stays hidden and the whole app
  opens at five of the seven.
- Three audiences — SE, partner (PoC password or master password, PBKDF2 verifiers only) and a read-only customer
  view — and an executive mode for presenting.

**The PoC Builder**

- Eight Smart Dashboards, an investigation notebook that opens with its charts drawn, and a PoC launchpad — with the
  customer's logo.
- Service and fleet SLOs; Browser and HTTP monitors of the customer's addresses.
- A problem-triage workflow and a weekly PoC summary, handed to the Workflows app ready to save, running the app's
  own workflow actions **PoC Automation · Triage** and **PoC Automation · Weekly**, with a Dynatrace Assist reading;
  formal Markdown e-mails with a summary callout, a table of facts and ▲ / ▼ changes; a weekly notebook with the
  week's charts.
- An OpenPipeline logs pipeline that gives a level to records written without one, its route and a check.
- Anomaly detectors on the golden signals, opened in the Anomaly Detection app already filled in.
- A Register of everything the PoC created and an end-of-PoC clean-up.

**Exports**

- SE Report (PDF), Coverage (PDF, JSON, CSV), Prerequisites guide (PDF), Tech Wrapup deck (PPTX and PDF) with
  pinned captures of the app's panels, and Real proofs from the platform's own screens.

**Foundations**

- 128 catalogued DQL queries with scan guards and validation records; every number a `Fact` with its evidence class,
  query and read time; licensing figures only in Licensing; nothing created on the tenant without a click.
- Strato Design System 3.18, React 18, TypeScript, Node 24; English and Brazilian Portuguese.
- 25 scopes, each documented in [docs/PERMISSIONS.md](docs/PERMISSIONS.md).
