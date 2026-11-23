# Changelog

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

- 128 catalogued DQL queries with cost guards and validation records; every number a `Fact` with its evidence class,
  query and read time; no money outside Licensing; nothing created on the tenant without a click.
- Strato Design System 3.18, React 18, TypeScript, Node 24; English and Brazilian Portuguese.
- 25 scopes, each documented in [docs/PERMISSIONS.md](docs/PERMISSIONS.md).
