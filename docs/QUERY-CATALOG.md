# Query catalog and validation record

> **Generated file.** Produced from `ui/app/queries/catalog.ts` by
> `scripts/generate-query-catalog-doc.mjs`. Do not edit by hand — regenerate it.

## Summary

- **128 queries** across 15 domains
- **92 queries scan zero Grail bytes** (entity model, bucket metadata and metric queries)
- **11.7 GB** across 23 distinct scan measurements — the four problem queries share a single measurement because they read the same 7-day history, so their figures are not additive
- **3 queries** were executed and inspected, but their individual cost accounting was not captured — recorded as `not captured`, never as zero
- **4 queries** were refused for lack of a scope, and are retained deliberately so the gap is visible

Cost figures come from the platform's own `QUERY_EXECUTION_EVENT`
(`scanned_bytes.on_demand`), not from an estimate made by this app.

## Validation method

Per query: executed against a real environment → result shape inspected →
empty, error and permission states considered → cost recorded → purpose
documented. No query was allowed to back a visualization before this ran.

## Register

| Query | Domain | Shape | Scope required | Window | Scan ceiling | Recorded scan | Duration | Rows | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cov.inventory` | coverage | table | `storage:entities:read` | selector | — | 0 B | — | 10 | ok |
| `cov.buckets` | coverage | table | `storage:buckets:read` | selector | — | 0 B | — | 39 | ok |
| `cov.hosts.breakdown` | coverage | table | `storage:entities:read` | selector | — | 0 B | 211 ms | 7 | ok |
| `cov.hosts.table` | infrastructure | table | `storage:entities:read` | selector | — | 0 B | — | 67 | ok |
| `cov.dataobjects` | coverage | table | `storage:buckets:read` | selector | — | 0 B | — | 60 | ok |
| `prob.summary` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 470 MB | 1455 ms | 8 | ok |
| `prob.recurrent` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 470 MB | — | 25 | ok |
| `prob.recurrent.total` | problems | scalar | `storage:events:read` | timeframe.pinned.7d | 25 GB | 309 MB | 119 ms | 1 | ok |
| `prob.list` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 470 MB | — | 100 | ok |
| `prob.timeline` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 470 MB | — | 40 | ok |
| `prob.status.rows` | problems | table | `storage:events:read` | timeframe.pinned.7d | 3 GB | 286 MB | 77 ms | 205 | ok |
| `prob.mttx` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 470 MB | — | 4 | ok |
| `prob.exposure` | problems | scalar | `storage:events:read` | timeframe.pinned.7d | 25 GB | 470 MB | — | 1 | ok |
| `prob.exposure.rca` | problems | scalar | `storage:events:read` | timeframe.pinned.7d | 25 GB | 288 MB | — | 1 | ok |
| `prob.mttx.rca` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 288 MB | — | 4 | ok |
| `prob.topentities` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 470 MB | — | 15 | ok |
| `prob.topentities.total` | problems | scalar | `storage:events:read` | timeframe.pinned.7d | 25 GB | 342 MB | — | 1 | ok |
| `rca.top` | problems | table | `storage:events:read` | timeframe.pinned.15d | 40 GB | 652 MB | — | 8 | ok |
| `rca.kpi` | problems | scalar | `storage:events:read` | timeframe.pinned.15d | 40 GB | 650 MB | — | 1 | ok |
| `rca.logs` | logs | table | `storage:logs:read` | timeframe.pinned.6h | 10 GB | 666 MB | — | 10 | ok |
| `rca.trend` | problems | table | `storage:events:read` | timeframe.pinned.7d | 25 GB | 339 MB | — | 8 | ok |
| `rca.catmix` | problems | table | `storage:events:read` | timeframe.pinned.15d | 40 GB | 650 MB | — | 5 | ok |
| `svc.golden` | services | timeseries | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `svc.ranking` | services | table | `storage:metrics:read` | selector | — | 0 B | — | 10 | ok |
| `svc.ranking.total` | services | scalar | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `svc.breakdown` | services | table | `storage:entities:read` | selector | — | 0 B | 112 ms | 13 | ok |
| `svc.topology` | topology | table | `storage:entities:read` | selector | — | 0 B | — | 71 | ok |
| `svc.topology.total` | topology | scalar | `storage:entities:read` | selector | — | 0 B | — | 1 | ok |
| `svc.topology.mix` | topology | table | `storage:entities:read` | selector | — | 0 B | — | 18 | ok |
| `svc.topology.calls` | topology | table | `storage:entities:read` | selector | — | 0 B | — | 21 | ok |
| `infra.trend` | infrastructure | timeseries | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `cloud.hosts` | cloud | table | `storage:entities:read` | selector | — | 0 B | — | 3 | ok |
| `cloud.hosts.detail` | cloud | table | `storage:entities:read` | selector | — | 0 B | — | 19 | ok |
| `cloud.services` | cloud | table | `storage:smartscape:read` | selector | — | 0 B | 33 ms | 100 | ok |
| `lic.hosts` | consumption | table | `storage:entities:read` | selector | — | 0 B | — | 6 | ok |
| `lic.k8spods` | consumption | table | `storage:smartscape:read` | selector | — | 0 B | 20 ms | 1 | ok |
| `lic.k8spodhours` | consumption | table | `storage:system:read` | timeframe.pinned.7d | 2 GB | 0 B | 59 ms | 1 | ok |
| `k8s.clusters` | kubernetes | table | `storage:entities:read` | selector | — | 0 B | 48 ms | 6 | ok |
| `k8s.inventory` | kubernetes | table | `storage:entities:read` | selector | — | 0 B | — | 5 | ok |
| `k8s.restarts` | kubernetes | table | `storage:metrics:read` | selector | — | 0 B | — | 12 | ok |
| `k8s.restarts.total` | kubernetes | scalar | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `k8s.restarts.trend` | kubernetes | timeseries | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `k8s.pressure` | kubernetes | table | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `k8s.pressure.total` | kubernetes | scalar | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `proc.technologies` | processes | table | `storage:entities:read` | selector | — | 0 B | — | 30 | ok |
| `comp.agents` | competitor | table | `storage:entities:read` | selector | — | 0 B | — | 11 | ok |
| `log.levels.preview` | logs | scalar | `storage:logs:read` | timeframe.pinned.30m | 1 GB | 18.5 MB | — | 1 | ok |
| `log.sources.nolevel` | logs | table | `storage:logs:read` | timeframe.pinned.30m | 1 GB | 4.9 MB | — | 9 | ok |
| `log.pipeline.check` | logs | scalar | `storage:logs:read` | timeframe.pinned.30m | 1 GB | 1.8 MB | — | 1 | ok |
| `log.quality` | logs | table | `storage:logs:read` | timeframe.pinned.30m | 3 GB | 1.2 GB | — | 9 | ok |
| `log.errors.recent` | logs | table | `storage:logs:read` | timeframe.pinned.30m | 3 GB | 68.4 MB | 209 ms | 12 | ok |
| `log.errors.grouped` | logs | table | `storage:logs:read` | selector | 20 GB | 1.9 GB | 472 ms | 12 | ok |
| `slo.hosts.cpu` | infrastructure | timeseries | `storage:metrics:read` | selector | 1 GB | 0 B | 221 ms | 3 | ok |
| `slo.hosts.memory` | infrastructure | timeseries | `storage:metrics:read` | selector | 1 GB | 0 B | 221 ms | 3 | ok |
| `slo.k8s.restarts` | kubernetes | timeseries | `storage:metrics:read` | selector | 1 GB | 0 B | 221 ms | 3 | ok |
| `app.query.billing` | consumption | table | `storage:system:read` | timeframe.pinned.30d | 1 GB | 0 B | — | 6 | ok |
| `ai.tokens` | services | table | `storage:metrics:read` | selector | 1 GB | 0 B | 31 ms | 12 | ok |
| `ai.tokens.trend` | services | timeseries | `storage:metrics:read` | selector | 1 GB | 0 B | 27 ms | 2 | ok |
| `ai.calls` | services | table | `storage:metrics:read` | selector | 1 GB | 0 B | 25 ms | 3 | ok |
| `log.ingest` | logs | table | `storage:system:read` | selector | 5 GB | 0 B | — | 2 | ok |
| `log.ingest.trend` | logs | timeseries | `storage:system:read` | selector | 5 GB | 0 B | — | 1 | ok |
| `log.buckets` | logs | table | `storage:buckets:read` | selector | — | 0 B | — | 10 | ok |
| `log.sfm` | logs | table | `storage:system:read` | selector | 2 GB | 0 B | — | 6 | ok |
| `cons.capabilities` | consumption | table | `storage:system:read` | selector | 3 GB | 0 B | — | 19 | ok |
| `cons.advisor` | consumption | table | `storage:system:read` | selector | 3 GB | 0 B | 43 ms | 11 | ok |
| `cons.advisor.total` | consumption | table | `storage:system:read` | selector | 3 GB | 0 B | 38 ms | 1 | ok |
| `auto.workflows` | automation | table | `storage:system:read` | selector | 2 GB | 0 B | — | 1 | ok |
| `auto.workflows.total` | automation | scalar | `storage:system:read` | selector | 2 GB | 0 B | — | 1 | ok |
| `auto.trend` | automation | timeseries | `storage:system:read` | selector | 2 GB | 0 B | — | 1 | ok |
| `auto.failing` | automation | table | `storage:system:read` | selector | 2 GB | 0 B | — | 4 | ok |
| `biz.events` | business | table | `storage:bizevents:read` | timeframe.pinned.6h | 2 GB | 0 B | — | 20 | ok |
| `biz.events.total` | business | scalar | `storage:bizevents:read` | timeframe.pinned.6h | 2 GB | 346 MB | — | 1 | ok |
| `infra.capacity` | infrastructure | table | `storage:metrics:read` | selector | — | 0 B | — | 24 | ok |
| `infra.capacity.summary` | infrastructure | scalar | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `infra.capacity.total` | infrastructure | scalar | `storage:entities:read` | selector | — | 0 B | — | 1 | ok |
| `svc.totals` | services | scalar | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `sec.vulnerabilities` | security | table | `storage:security.events:read` | timeframe.pinned.30m | 25 GB | 120 MB | — | 0 | no-permission |
| `sec.posture` | security | table | `storage:security.events:read` | timeframe.pinned.30m | 25 GB | 120 MB | — | 0 | no-permission |
| `rum.sessions` | experience | table | `storage:user.sessions:read` | selector | 1 GB | 329 MB | — | 0 | no-permission |
| `rum.scorecard` | experience | table | `storage:metrics:read` | selector | — | 0 B | 34 ms | 2 | ok |
| `rum.webvitals` | experience | table | `storage:metrics:read` | selector | — | 0 B | 38 ms | 2 | ok |
| `rum.funnel` | experience | table | `storage:metrics:read` | selector | — | 0 B | 61 ms | 2 | ok |
| `rum.audience` | experience | table | `storage:metrics:read` | selector | — | 0 B | 84 ms | 2 | ok |
| `rum.audience.total` | experience | scalar | `storage:metrics:read` | selector | — | 0 B | — | 1 | ok |
| `cov.inventory.day0` | coverage | table | `storage:entities:read` | timeframe.poc.day0 | — | 0 B | — | 10 | ok |
| `prob.poc.daily` | problems | table | `storage:events:read` | timeframe.poc.since | 40 GB | 1.7 GB | — | 38 | ok |
| `cons.daily` | consumption | timeseries | `storage:system:read` | timeframe.pinned.30d | 3 GB | 0 B | — | 21 | ok |
| `sec.context` | security | table | `storage:security.events:read` | timeframe.pinned.30m | 25 GB | 120 MB | — | 0 | no-permission |
| `svc.owners` | services | table | `storage:entities:read` | selector | — | 0 B | — | 5 | ok |
| `poc.daily.signals` | automation | timeseries | `storage:system:read` | timeframe.poc.since | 5 GB | 0 B | — | 1 | ok |
| `poc.daily.rum` | experience | timeseries | `storage:metrics:read` | timeframe.poc.since | — | 0 B | — | 1 | ok |
| `rum.app.flow` | experience | table | `storage:entities:read` | selector | — | 0 B | — | 22 | ok |
| `rum.frontend.ids` | experience | table | `storage:metrics:read` | timeframe.pinned.7d | — | 0 B | — | 2 | ok |
| `k8s.cluster.ids` | kubernetes | table | `storage:metrics:read` | timeframe.pinned.24h | — | 0 B | — | 6 | ok |
| `rca.callers` | problems | table | `storage:metrics:read` | timeframe.caller.incident | 1 GB | 0 B | — | 4 | ok |
| `rca.edges` | problems | table | `storage:entities:read` | timeframe.caller.incident | 1 GB | 0 B | 197 ms | 3 | ok |
| `rca.incident.logs` | logs | table | `storage:logs:read` | timeframe.caller.incident | 10 GB | 817 MB | — | 9 | ok |
| `rca.incident.logs.services` | logs | table | `storage:logs:read` | timeframe.caller.incident | 10 GB | 666 MB | — | 9 | ok |
| `ev.problem.events` | problems | table | `storage:events:read` | timeframe.caller.evidence | 2 GB | 558 MB | — | 6 | ok |
| `ev.problem.recurrence` | problems | table | `storage:events:read` | timeframe.caller.evidence | 5 GB | not captured | — | 5 | ok |
| `ev.service.minutes` | services | timeseries | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 2 | ok |
| `ev.service.endpoints` | services | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 10 | ok |
| `ev.service.screen` | services | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 11 | ok |
| `ev.frontend.summary` | experience | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 1 | ok |
| `ev.frontend.minutes` | experience | timeseries | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 1 | ok |
| `ev.k8s.capacity` | kubernetes | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 2 | ok |
| `ev.k8s.workloads` | kubernetes | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 8 | ok |
| `ev.k8s.churn` | kubernetes | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 6 | ok |
| `ev.k8s.incidentRestarts` | kubernetes | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 10 | ok |
| `ev.failing.services` | services | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 6 | ok |
| `ev.failing.endpoints` | services | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 6 | ok |
| `ev.entity.events` | problems | table | `storage:events:read` | timeframe.caller.evidence | 1 GB | not captured | — | 1 | ok |
| `ev.failed.endpoints` | services | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 9 | ok |
| `ev.logs.errors` | logs | table | `storage:logs:read` | timeframe.caller.evidence | 5 GB | not captured | — | 7 | ok |
| `ev.topology.blast` | topology | table | `storage:entities:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 1 | ok |
| `ev.topology.hubs` | topology | table | `storage:entities:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 6 | ok |
| `ev.host.cpu` | infrastructure | table | `storage:metrics:read` | timeframe.caller.evidence | 1 GB | 0 B | — | 5 | ok |
| `slo.availability` | services | timeseries | `storage:metrics:read` | timeframe.caller.slo | 1 GB | 0 B | 177 ms | 1 | ok |
| `slo.performance` | services | timeseries | `storage:metrics:read` | timeframe.caller.slo | 1 GB | 0 B | 177 ms | 1 | ok |
| `triage.problem` | problems | table | `storage:events:read` | timeframe.caller.triage | 1 GB | 21.0 MB | 47 ms | 1 | ok |
| `adopt.platform.total` | automation | scalar | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 978 ms | 1 | ok |
| `adopt.platform.daily` | automation | scalar | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 670 ms | 1 | ok |
| `adopt.platform.apps` | automation | table | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 1752 ms | 49 | ok |
| `adopt.platform.breadth` | automation | table | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 586 ms | 4 | ok |
| `adopt.platform.trend` | automation | table | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 294 ms | 25 | ok |
| `adopt.platform.hours` | automation | table | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 206 ms | 243 | ok |
| `adopt.ai.skills` | automation | table | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 665 ms | 4 | ok |
| `adopt.ai.total` | automation | scalar | `storage:system:read` | timeframe.pinned.30d | 2 GB | 0 B | 533 ms | 1 | ok |

## Detail by domain

### automation

#### `auto.workflows`

**Purpose.** Workflow executions by state and trigger type - measured automation already running, rather than a claim about what automation could do.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"
| filter dt.automation_engine.state.is_final == true
| summarize executions = count(), avgDurationNs = avg(duration),
    by:{title = dt.automation_engine.workflow.title,
        state = dt.automation_engine.state,
        trigger = dt.automation_engine.workflow_execution.trigger.type}
| sort executions desc
| limit 40
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Schema confirmed on a real record: dt.automation_engine.workflow.title, .state (SUCCESS), .workflow_execution.trigger.type (Schedule) and duration. 12,940 workflow executions observed in 24 h.

#### `auto.workflows.total`

**Purpose.** Exact workflow totals over every finished execution: how many distinct workflows ran, how many executions there were and how many failed. The ranked list only shows the busiest workflow, state and trigger combinations.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"
| filter dt.automation_engine.state.is_final == true
| summarize workflows = countDistinctExact(dt.automation_engine.workflow.title),
    executions = count(),
    succeeded = countIf(dt.automation_engine.state == "SUCCESS"),
    failed = countIf(dt.automation_engine.state == "ERROR"),
    failingWorkflows = countDistinctExact(if(dt.automation_engine.state == "ERROR", dt.automation_engine.workflow.title))
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 20 workflows, 6,469 executions (5,580 succeeded, 889 failed), 4 workflows failing. Replaces counting the rows of a list capped at 40 title/state/trigger groups. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `auto.trend`

**Purpose.** Finished workflow executions per hour, split into succeeded and failed, so a failure that repeats on a schedule shows as a steady band rather than one number.

**Shape.** timeseries · **Visualization.** Spectrum area charts · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"
| filter dt.automation_engine.state.is_final == true
| makeTimeseries {
    succeeded = countIf(dt.automation_engine.state == "SUCCESS"),
    failed = countIf(dt.automation_engine.state == "ERROR")
  }, interval: 1h
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 5,579 succeeded and 889 failed executions in 25 hourly bins (about 232 and 37 per hour), matching auto.workflows.total. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `auto.failing`

**Purpose.** The workflows that fail, worst first: failed executions, all executions and the failure rate of each, and when it last failed. A ranked list; the totals come from auto.workflows.total.

**Shape.** table · **Visualization.** Ranked bars · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"
| filter dt.automation_engine.state.is_final == true
| summarize executions = count(),
    failed = countIf(dt.automation_engine.state == "ERROR"),
    lastFailure = takeMax(if(dt.automation_engine.state == "ERROR", timestamp)),
    by:{title = dt.automation_engine.workflow.title}
| filter failed > 0
| fieldsAdd failureRatePct = failed * 100.0 / executions
| sort failed desc
| limit 10
```

**Validation.** 2026-11-03 in `internal-lab` · 4 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 4 failing workflows, each failing every run (576, 288, 24 and 1 executions). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `poc.daily.signals`

**Purpose.** Workflow executions (and how many succeeded) and log volume ingested on each day of the PoC, so the PoC Timeline shows automation and log adoption beside the problems, and dates the first automation.

**Shape.** timeseries · **Visualization.** PoC Timeline: daily adoption series · **Window.** timeframe.poc.since

```dql
fetch dt.system.events
| filter (event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION" and dt.automation_engine.state.is_final == true)
    or (event.kind == "BILLING_USAGE_EVENT" and event.type == "Log Management & Analytics - Ingest & Process")
| makeTimeseries {
    executions = countIf(event.kind == "WORKFLOW_EVENT"),
    succeeded = countIf(event.kind == "WORKFLOW_EVENT" and dt.automation_engine.state == "SUCCESS"),
    logBytes = sum(if(event.kind == "BILLING_USAGE_EVENT", billed_bytes))
  }, interval: 1d
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant from 28 Sep: 8 daily bins aligned to UTC midnight, ~6,500 workflow executions a day (~5,600 succeeded) and ~23.4 GB of logs ingested a day; the last bin partial. Log volume only — no price is applied. 0 bytes scanned. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `adopt.platform.total`

**Purpose.** How the platform is used by people and by integrations: distinct users in the browser (and how many of them belong to the Dynatrace organisation), distinct apps opened, browser actions, API calls and calls to Dynatrace Intelligence and its analyzers. Counted only; no user is named.

**Shape.** scalar · **Visualization.** Summary band and the adoption index · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY"
| filter `user.id` != "UNKNOWN" and `user.id` != "system"
| summarize { users = countDistinctExact(if(`request.source` == "BROWSER", `user.id`)),
    dynatraceUsers = countDistinctExact(if(`request.source` == "BROWSER" and user.organization == "DYNATRACE", `user.id`)),
    apps = countDistinctExact(if(`request.source` == "BROWSER" and `dt.app.id` != "dynatrace.appshell" and `dt.app.id` != "dynatrace.launcher", `dt.app.id`)),
    browserActions = countIf(`request.source` == "BROWSER"),
    apiCalls = countIf(`request.source` == "OTHER"),
    aiCalls = countIf(contains(toString(resource), "/davis/")),
    analyzerCalls = countIf(contains(toString(resource), "/davis/analyzer")) }
```

**Validation.** 2026-11-18 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval: 16 browser users (13 of the Dynatrace organisation), 49 apps, 82,616 browser actions, 9,155 API calls, 2,016 Davis calls, 573 analyzer calls. 0 scanned bytes.

#### `adopt.platform.daily`

**Purpose.** Distinct browser users per day, averaged over the days with activity, so stickiness (daily ÷ monthly users) is a measured ratio. Counted only; no user is named.

**Shape.** scalar · **Visualization.** Stickiness figure · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"
| filter `user.id` != "UNKNOWN" and `user.id` != "system"
| fieldsAdd day = formatTimestamp(timestamp, format: "yyyy-MM-dd")
| summarize { dau = countDistinctExact(`user.id`) }, by: { day }
| summarize { avgDau = avg(toDouble(dau)), activeDays = count() }
```

**Validation.** 2026-11-18 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval: 4.36 users a day on average over 25 active days. 0 scanned bytes.

#### `adopt.platform.apps`

**Purpose.** Every app opened in the browser, with its actions and distinct users, so the page shows which parts of the platform the teams use. The list is bounded by the apps installed, not cut. Counted only; no user is named.

**Shape.** table · **Visualization.** Bars of the apps in use · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"
| filter `user.id` != "UNKNOWN" and `user.id` != "system"
| filter isNotNull(`dt.app.id`) and `dt.app.id` != "dynatrace.appshell" and `dt.app.id` != "dynatrace.launcher"
| summarize { actions = count(), users = countDistinctExact(`user.id`) }, by: { app = `dt.app.id` }
| sort actions desc
```

**Validation.** 2026-11-18 in `internal-lab` · 49 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval: 49 apps; the most used were Notebooks (20,069 actions, 8 users) and Dashboards (12,040, 10). 0 scanned bytes.

#### `adopt.platform.breadth`

**Purpose.** How many distinct apps each user opened, grouped 1, 2–3, 4–6 and 7 or more, so the page shows how broadly people use the platform; 7 or more is a power user in the DPA method. Counted only; no user is named.

**Shape.** table · **Visualization.** Bars of users by breadth · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"
| filter `user.id` != "UNKNOWN" and `user.id` != "system"
| filter isNotNull(`dt.app.id`) and `dt.app.id` != "dynatrace.appshell" and `dt.app.id` != "dynatrace.launcher"
| summarize { appCount = countDistinctExact(`dt.app.id`) }, by: { `user.id` }
| fieldsAdd segment = if(appCount == 1, "1", else: if(appCount <= 3, "2-3", else: if(appCount <= 6, "4-6", else: "7+")))
| summarize { users = count() }, by: { segment }
| sort segment asc
```

**Validation.** 2026-11-18 in `internal-lab` · 4 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval: 1 / 3 / 4 / 8 users with 1, 2–3, 4–6 and 7+ apps. 0 scanned bytes.

#### `adopt.platform.trend`

**Purpose.** Distinct browser users and their actions for each day of the window, so the page draws how use rises and falls over time and names the busiest day. A day without a row had no browser activity. Counted only; no user is named.

**Shape.** table · **Visualization.** Daily line of users and actions · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"
| filter `user.id` != "UNKNOWN" and `user.id` != "system"
| summarize { users = countDistinctExact(`user.id`), actions = count() }, by: { day = bin(timestamp, 1d) }
| sort day asc
```

**Validation.** 2026-11-18 in `internal-lab` · 25 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval (3.4.7): 25 days with activity, the busiest 10,717 actions by 7 users; at most one row per day of the window. 0 scanned bytes.

#### `adopt.platform.hours`

**Purpose.** Browser actions for each hour of the window, so the page shows on which weekdays and at which hours the platform is used, folded into the viewer's own time zone. At most one row per hour. Counted only; no user is named.

**Shape.** table · **Visualization.** Weekday × hour heat map · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"
| filter `user.id` != "UNKNOWN" and `user.id` != "system"
| summarize { actions = count() }, by: { hour = bin(timestamp, 1h) }
| sort hour asc
```

**Validation.** 2026-11-18 in `internal-lab` · 243 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval (3.4.7): 243 hours with activity out of 720; at most 720 rows, under the platform's 1,000-record default. 0 scanned bytes.

#### `adopt.ai.skills`

**Purpose.** Dynatrace Intelligence by skill (Assist chat, natural-language queries, explanations, document search…): invocations, successes and distinct users of each. The list is bounded by the skills the platform offers. Counted only; no user is named.

**Shape.** table · **Visualization.** Bars by skill · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "GENAI_EVENT" and event.type == "GenAI Skill Invocation"
| summarize { invocations = count(), succeeded = countIf(status == "SUCCESSFUL"), users = countDistinctExact(user_email) }, by: { skill }
| sort invocations desc
```

**Validation.** 2026-11-18 in `internal-lab` · 4 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval: nl2dql 318 (307 succeeded, 3 users), operator 314 (313, 6), chat 144 (144, 6), document-search 1. 0 scanned bytes.

#### `adopt.ai.total`

**Purpose.** How much the teams use Dynatrace Intelligence (Assist, natural-language queries, explanations): invocations, how many succeeded, failed or were blocked, how many distinct users and skills, and the feedback given. Counted only; no user is named.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "GENAI_EVENT"
| summarize { invocations = countIf(event.type == "GenAI Skill Invocation"),
    succeeded = countIf(event.type == "GenAI Skill Invocation" and status == "SUCCESSFUL"),
    failed = countIf(event.type == "GenAI Skill Invocation" and status == "FAILED"),
    blocked = countIf(event.type == "GenAI Skill Invocation" and status == "BLOCKED"),
    users = countDistinctExact(if(event.type == "GenAI Skill Invocation", user_email)),
    skills = countDistinctExact(if(event.type == "GenAI Skill Invocation", skill)),
    feedback = countIf(event.type == "GenAI Feedback"),
    positive = countIf(event.type == "GenAI Feedback" and feedback.type == "positive"),
    negative = countIf(event.type == "GenAI Feedback" and feedback.type == "negative") }
```

**Validation.** 2026-11-18 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 30 days, with the owner's approval: 777 invocations (765 succeeded, 11 failed, 1 blocked), 7 users, 4 skills, no feedback yet. 0 scanned bytes (dt.system.events is not billed by scan).

### business

#### `biz.events`

**Purpose.** Business event types actually flowing into Grail. Establishes that business context exists before any business-impact statement is made.

**Shape.** table · **Visualization.** DataTable · **Window.** timeframe.pinned.6h

```dql
fetch bizevents
| summarize events = count(), by:{event.type}
| sort events desc
| limit 25
```

**Validation.** 2026-08-31 in `internal-lab` · 20 records · 0 B scanned on demand · outcome `ok`

**Notes.** Real business domains observed: pos.transaction, loan.application, credit-analysis, ecom.order.placed, trade.execution and others. Volume is real; mapping an event type to a monetary outcome is not attempted.

#### `biz.events.total`

**Purpose.** Exact business-event totals: how many events were captured and how many distinct event types they span. A busy tenant has hundreds of types, so the list shows only the 25 most frequent.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** timeframe.pinned.6h

```dql
fetch bizevents
| summarize events = count(), types = countDistinctExact(event.type)
```

**Validation.** 2026-10-04 in `internal-lab` · 1 records · 346 MB scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 3,992,534 events across 1,626 distinct event types (the list showed 25). Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 6 h, 5 runs).

### cloud

#### `cloud.hosts`

**Purpose.** Cloud footprint per provider: how many hosts, cores and memory Dynatrace attributed to each cloud, with the full-stack / infrastructure split. Only hosts the platform tagged with a cloud type are counted.

**Shape.** table · **Visualization.** DonutBreakdown + provider cards · **Window.** follows the app selector

```dql
fetch dt.entity.host
| filter isNotNull(cloudType)
| summarize hosts = count(),
    cores = sum(toLong(cpuCores)),
    memBytes = sum(toLong(memoryTotal)),
    fullStack = countIf(monitoringMode == "FULL_STACK"),
    infra = countIf(monitoringMode == "INFRASTRUCTURE"),
    by:{cloudType}
| sort hosts desc
```

**Validation.** 2026-08-31 in `internal-lab` · 3 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated on the validation tenant: EC2 (AWS) 14 hosts, GOOGLE_CLOUD_PLATFORM 3, AZURE 2. Entity model query, no on-demand Grail scan.

#### `cloud.hosts.detail`

**Purpose.** Per-host cloud inventory for the technical audience: provider, OS, size and monitoring mode of every cloud-attributed host.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.entity.host
| filter isNotNull(cloudType)
| fields id, name = entity.name, cloudType, osType, cpuCores,
    memoryTotal, hostGroupName, monitoringMode, state
| sort name asc
| limit 500
```

**Validation.** 2026-08-31 in `internal-lab` · 19 records · 0 B scanned on demand · outcome `ok`

**Notes.** Returned 19 cloud-attributed hosts across AWS, GCP and Azure.

#### `cloud.services`

**Purpose.** Which cloud services Dynatrace actually monitors, read from the Smartscape topology. The model folds the raw types into friendly service families but counts only PRIMARY managed services (Lambda, RDS, SQS, App Service, PostgreSQL, AKS, Apigee, ...) via an allow-list — cloud inventory/CSPM objects (configurations, patch results, IAM, security groups, network interfaces, volumes, backups) and compute hosts are excluded, so the count reflects genuine monitored services, not raw topology nodes.

**Shape.** table · **Visualization.** Monitored cloud services by provider and family · **Window.** follows the app selector

```dql
smartscapeNodes "*"
| filter startsWith(type, "AWS_") or startsWith(type, "AZURE_") or startsWith(type, "GOOGLE_") or startsWith(type, "GCP_")
| summarize resources = count(), by:{type}
| sort resources desc
```

**Validation.** 2026-08-31 in `internal-lab` · 100 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl on the validation tenant (2026-09-09). Smartscape topology read (0 Grail bytes). Raw feed returns 167 AWS/Azure types (8,744 nodes) dominated by CSPM inventory; the model allow-list folds this to 39 genuine monitored service families / 440 primary resources (AWS 367, Azure 73). GCP services use a separate cloud feed and are not present as GCP_/GOOGLE_ smartscape nodes on this tenant.

### competitor

#### `comp.agents`

**Purpose.** Third-party observability and log agents running alongside OneAgent, discovered by the platform. Evidence for consolidation, never a claim against a competitor beyond what is observed.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.entity.process_group
| fieldsAdd name = entity.name
| filter (matchesPhrase(name,"datadog") or matchesPhrase(name,"newrelic") or matchesPhrase(name,"new relic")
  or matchesPhrase(name,"appdynamics") or matchesPhrase(name,"splunk") or matchesPhrase(name,"filebeat")
  or matchesPhrase(name,"metricbeat") or matchesPhrase(name,"elastic-agent") or matchesPhrase(name,"zabbix")
  or matchesPhrase(name,"prometheus") or matchesPhrase(name,"node_exporter") or matchesPhrase(name,"grafana")
  or matchesPhrase(name,"nagios") or matchesPhrase(name,"collectd") or matchesPhrase(name,"logstash"))
  and not matchesPhrase(name,"dynatrace")
| fields name
```

**Validation.** 2026-08-31 in `internal-lab` · 11 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated on the validation tenant 2026-09-03: 11 process groups matched (Datadog agent/cluster-agent/operator/system-probe/security-agent/trace-agent, New Relic infra, Prometheus, Grafana). Pure log forwarders (Fluentd) excluded as not a direct APM/observability competitor; Dynatrace-owned processes excluded to avoid false positives.

### consumption

#### `lic.hosts`

**Purpose.** Every monitored host grouped by monitoring mode and Host-Unit band (memory in 16 GiB steps), the input the licence sizer turns into Classic Host Units and the DPS host footprint. Counted in the query over all hosts, so a large estate is never cut off. Entity model only, no scan.

**Shape.** table · **Visualization.** Sizing model (not rendered directly) · **Window.** follows the app selector

```dql
fetch dt.entity.host
| fieldsAdd huBucket = ceil(toDouble(memoryTotal) / 17179869184.0)
| summarize hosts = count(), memoryBytes = sum(toDouble(memoryTotal)), by:{monitoringMode, huBucket}
| sort hosts desc
```

**Validation.** 2026-08-31 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-10-03): 77 hosts in 6 groups (13 full-stack, 4 infrastructure, 60 without a reported mode). Replaces a per-host list that stopped at 1,000 rows and so under-counted Host Units on a larger estate.

#### `lic.k8spods`

**Purpose.** Count of monitored Kubernetes pods, the driver for the DPS Kubernetes Platform pod-hour estimate. Smartscape topology read, no Grail scan.

**Shape.** table · **Visualization.** Sizing input (not rendered directly) · **Window.** follows the app selector

```dql
smartscapeNodes "K8S_POD"
| summarize pods = count()
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Smartscape topology read (0 Grail bytes). Returned the current monitored pod count (~6,000 on the validation tenant).

#### `lic.k8spodhours`

**Purpose.** Kubernetes pod-hours the platform actually billed in the window, with the window it covers, so the annual sizing is extrapolated from measured hours instead of from a count of pods that happen to exist right now.

**Shape.** table · **Visualization.** Sizing input (not rendered directly) · **Window.** timeframe.pinned.7d

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE_EVENT" and event.type == "Kubernetes Platform Monitoring"
| summarize podHours = sum(billed_pod_hours), windows = count(),
    firstSeen = min(usage.start), lastSeen = max(usage.end)
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** 3.3.1 (backlog Q11). Measured over 7 d: 172,417.5 pod-hours across 40,992 fifteen-minute windows, 0 bytes scanned. That is an average of 1,026 pods against the 1,571 `lic.k8spods` counts right now - annualising the snapshot gave 13,761,960 pod-hours against the 8,989,826 the measured hours extrapolate to, an overstatement of 53 %. `billed_pod_hours` is the platform's own billing field, per namespace and cluster, so this is what a PoC is actually charged for rather than what the app guesses.

#### `app.query.billing`

**Purpose.** The query consumption the platform billed to this app (and its two earlier app ids) over the last 30 days, by kind of query, read from the billing usage events — the bytes the licence was charged for, not an estimate.

**Shape.** table · **Visualization.** App consumption cost · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE_EVENT"
| filter in(client.application_context, array("my.poc.automation", "my.poc.value.studio", "my.poc.value.studio.v31"))
| filter contains(event.type, "Query")
| summarize queries = count(), billedBytes = sum(toDouble(billed_bytes)), by: {app = client.application_context, event.type}
| sort billedBytes desc
```

**Validation.** 2026-11-23 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 30 days at 0 B: the earlier ids had 14.9 GB of queries billed (logs 11.7 GB, events 3.1 GB, DEM 0.06 GB); the current id my.poc.automation had none billed in the window.

#### `cons.capabilities`

**Purpose.** Which licensed capabilities the environment actually exercised, with billed volume as reported by the platform. Volume only - this app never shows money.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE_EVENT"
| summarize events = count(), billedBytes = sum(billed_bytes), by:{event.type}
| sort events desc
```

**Validation.** 2026-08-31 in `internal-lab` · 19 records · 0 B scanned on demand · outcome `ok`

**Notes.** 17 distinct capabilities observed in 24 h. billed_bytes is reported verbatim: for "Retain" capability types the platform-reported figure is not a plain byte count, so the UI labels its unit as source-reported and flags it as requiring commercial confirmation.

#### `cons.advisor`

**Purpose.** Query cost per table from the platform's own query accounting, counting distinct queries rather than records. Feeds the DQL Efficiency Advisor. user.email is deliberately excluded: aggregate only, no PII.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "QUERY_EXECUTION_EVENT" and isNotNull(table) and table != ""
| summarize queries = countDistinctExact(query_id),
    aggregatedRecords = countIf(isNull(query_id)),
    scannedOnDemandBytes = sum(`scanned_bytes.on_demand`),
    avgDurationMs = avg(execution_duration_ms),
    maxDurationMs = max(execution_duration_ms),
    deliveredRecords = sum(delivered_records),
    by:{table}
| fieldsAdd bytesPerDeliveredRecord = if(deliveredRecords > 0, scannedOnDemandBytes / deliveredRecords, else: 0)
| sort scannedOnDemandBytes desc
```

**Validation.** 2026-11-03 in `internal-lab` · 11 records · 0 B scanned on demand · outcome `ok`

**Notes.** 3.3.1 (backlog Q8): `executions = count()` counted RECORDS, not queries. The platform writes one record per table a query touched, so the column read far above the truth where it matters most - measured on 2026-11-03 over 24 h: `events` 930 records for 305 distinct queries (3x), `logs` 105 for 37 (2.8x). It now counts `query_id` distinctly. `query_id` is null on aggregated events (platform docs), which `countDistinctExact` would silently drop, so `aggregatedRecords` carries them beside the count - it was 0 on every table in that run. Totals come from `cons.advisor.total`, never from summing these rows across tables. Schema confirmed on real records: query_string, scanned_bytes.on_demand, execution_duration_ms, sampling_ratio, table, status, flags. The platform masks literals inside query_string, and user.email is on the raw record - this query never selects it. The read scanned 0 bytes: dt.system.events is zero-rated.

#### `cons.advisor.total`

**Purpose.** Exact totals of the query accounting over every table at once: how many distinct queries ran, how much they scanned on demand and how many records they delivered. Exists because one query touching several tables appears once per table, so adding up the per-table rows counts it twice.

**Shape.** table · **Visualization.** SingleValue · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "QUERY_EXECUTION_EVENT" and isNotNull(table) and table != ""
| summarize queries = countDistinctExact(query_id),
    aggregatedRecords = countIf(isNull(query_id)),
    scannedOnDemandBytes = sum(`scanned_bytes.on_demand`),
    deliveredRecords = sum(delivered_records),
    tables = countDistinctExact(table)
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** 3.3.1 (backlog Q8). Measured on 2026-11-03 over 24 h: 33,154 distinct queries across 11 tables, against the 33,974 the page used to reach by adding the per-table rows - 820 of them were one query counted in a second table. 0 aggregated records in that run. 0 bytes scanned.

#### `cons.daily`

**Purpose.** Daily billed usage per capability over the last 30 days, in each capability's own unit, for the SE-only consumption trend and its labelled projection.

**Shape.** timeseries · **Visualization.** SE-only consumption trend and projection · **Window.** timeframe.pinned.30d

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE_EVENT"
| fieldsAdd amount = coalesce(toDouble(billed_gibibyte_hours), toDouble(billed_host_hours),
    toDouble(billed_pod_hours), toDouble(billed_container_hours), toDouble(billed_sessions),
    toDouble(billed_http_request_count), toDouble(billed_synthetic_action_count),
    toDouble(billed_invocations), toDouble(data_points), toDouble(billed_bytes), 1.0)
| makeTimeseries {amount = sum(amount), events = count()}, by:{event.type}, interval: 1d
```

**Validation.** 2026-11-03 in `internal-lab` · 21 records · 0 B scanned on demand · outcome `ok`

**Notes.** 21 capabilities, 31 daily bins (30 complete days and today, partial). Each capability bills in its own field: GiB-hours (Full-Stack, Runtime Vulnerability Analytics, Application Protection), host-hours (Infrastructure), pod-hours (Kubernetes), container-hours (Code Monitoring), sessions (RUM), requests (HTTP monitors), actions (browser monitors), invocations (AppEngine functions), data points (metrics), bytes (ingest, query, retain); Automation Workflow and Security Posture Management carry no amount, one event per billed unit. 0 bytes. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

### coverage

#### `cov.inventory`

**Purpose.** Single-call inventory of every monitored entity category, so the opening screen states scope before it states any conclusion.

**Shape.** table · **Visualization.** SingleValueGrid / DataTable · **Window.** follows the app selector

```dql
fetch dt.entity.host | summarize value = count() | fieldsAdd category = "Hosts"
| append [ fetch dt.entity.service | summarize value = count() | fieldsAdd category = "Services" ]
| append [ fetch dt.entity.application | summarize value = count() | fieldsAdd category = "Web applications" ]
| append [ fetch dt.entity.mobile_application | summarize value = count() | fieldsAdd category = "Mobile applications" ]
| append [ fetch dt.entity.process_group_instance | summarize value = count() | fieldsAdd category = "Process instances" ]
| append [ fetch dt.entity.kubernetes_cluster | summarize value = count() | fieldsAdd category = "Kubernetes clusters" ]
| append [ fetch dt.entity.cloud_application | summarize value = count() | fieldsAdd category = "Kubernetes workloads" ]
| append [ fetch dt.entity.synthetic_test | fields id | append [ fetch dt.entity.http_check | fields id ]
    | summarize value = count() | fieldsAdd category = "Synthetic monitors" ]
| append [ fetch dt.entity.synthetic_test | summarize value = count() | fieldsAdd category = "Synthetic monitors (browser)" ]
| append [ fetch dt.entity.http_check | summarize value = count() | fieldsAdd category = "Synthetic monitors (HTTP)" ]
| fields category, value
```

**Validation.** 2026-10-04 in `internal-lab` · 10 records · 0 B scanned on demand · outcome `ok`

**Notes.** Returned 8 categories plus the synthetic split. Mobile applications legitimately 0 - rendered as an explicit gap, never as a zero KPI. 3.2.3: synthetic monitors counted only browser monitors; on the validation tenant 67 = 42 browser + 25 HTTP (dt.entity.http_check). Entity model, 0 bytes. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model, 32 runs).

#### `cov.buckets`

**Purpose.** Retention, volume and readability per bucket. `has_access` is the authoritative source for the permission column of the coverage matrix.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.system.buckets
| fields name, table = `dt.system.table`, retentionDays = retention_days,
    includedQueryDays = included_query_days, records,
    bytes = estimated_uncompressed_bytes, hasAccess = has_access
| sort bytes desc
```

**Validation.** 2026-08-31 in `internal-lab` · 39 records · 0 B scanned on demand · outcome `ok`

**Notes.** Returned 39 buckets. 10 reported has_access=false, which is surfaced as an explicit permission gap rather than hidden.

#### `cov.hosts.breakdown`

**Purpose.** Monitoring-mode and cloud distribution across hosts, to show instrumentation depth instead of a bare host count.

**Shape.** table · **Visualization.** DataTable / CategoricalBarChart · **Window.** follows the app selector

```dql
fetch dt.entity.host
| summarize hosts = count(), by:{osType, cloudType, monitoringMode}
| sort hosts desc
```

**Validation.** 2026-08-31 in `internal-lab` · 7 records · 0 B scanned on demand · outcome `ok`

**Notes.** A large share of hosts report a null monitoringMode. This is presented as an absent attribute, not as an unmonitored host.

#### `cov.dataobjects`

**Purpose.** Full list of queryable Grail data objects. Backs the technical appendix so reviewers can see what the environment exposes beyond what this app reads.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.system.data_objects
| fields name
| sort name asc
```

**Validation.** 2026-08-31 in `internal-lab` · 60 records · 0 B scanned on demand · outcome `ok`

**Notes.** Truncated at 60 during validation; the environment exposes considerably more.

#### `cov.inventory.day0`

**Purpose.** The same entity inventory read over the first day of the PoC, so the PoC Timeline can show what was monitored on Day 0 next to what is monitored today.

**Shape.** table · **Visualization.** Day 0 to today cards · **Window.** timeframe.poc.day0

```dql
fetch dt.entity.host | summarize value = count() | fieldsAdd category = "Hosts"
| append [ fetch dt.entity.service | summarize value = count() | fieldsAdd category = "Services" ]
| append [ fetch dt.entity.application | summarize value = count() | fieldsAdd category = "Web applications" ]
| append [ fetch dt.entity.mobile_application | summarize value = count() | fieldsAdd category = "Mobile applications" ]
| append [ fetch dt.entity.process_group_instance | summarize value = count() | fieldsAdd category = "Process instances" ]
| append [ fetch dt.entity.kubernetes_cluster | summarize value = count() | fieldsAdd category = "Kubernetes clusters" ]
| append [ fetch dt.entity.cloud_application | summarize value = count() | fieldsAdd category = "Kubernetes workloads" ]
| append [ fetch dt.entity.synthetic_test | fields id | append [ fetch dt.entity.http_check | fields id ]
    | summarize value = count() | fieldsAdd category = "Synthetic monitors" ]
| append [ fetch dt.entity.synthetic_test | summarize value = count() | fieldsAdd category = "Synthetic monitors (browser)" ]
| append [ fetch dt.entity.http_check | summarize value = count() | fieldsAdd category = "Synthetic monitors (HTTP)" ]
| fields category, value
| sort category asc
```

**Validation.** 2026-10-05 in `internal-lab` · 10 records · 0 B scanned on demand · outcome `ok`

**Notes.** The entity model honours a past window: over one day 20 days back it returned 69 hosts, 106 services and 574 process instances; over the last day 77, 75 and 1,300. Entity model, 0 bytes. Entities whose history the tenant no longer keeps are absent from Day 0, and the page says so. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model (same query as cov.inventory), 32 runs).

### experience

#### `rum.sessions`

**Purpose.** Real user session volume. Retained to make the digital-experience gap explicit and to avoid staging a story the data cannot support.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch user.sessions
| summarize sessions = count(), by:{userType = usersession.type}
| sort sessions desc
| limit 10
```

**Validation.** 2026-08-31 in `internal-lab` · 0 records · 329 MB scanned on demand · outcome `no-permission`

**Notes.** Buckets default_user_sessions and default_synthetic_user_sessions both report has_access=false, and hold 5 and 6 records respectively. Both a permission gap and a telemetry gap - the field name usersession.type could not be schema-verified and is therefore not trusted for display until the scope is granted. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, up to 30 d, 30 runs).

#### `rum.scorecard`

**Purpose.** Per-application digital-experience scorecard from the dt.frontend.* metrics, real users only: user actions, requests, errors and the derived error rate. Metric-based, so it reads under storage:metrics:read without the user.sessions table.

**Shape.** table · **Visualization.** Per-app experience scorecard · **Window.** follows the app selector

```dql
timeseries {
    actions = sum(dt.frontend.user_action.count, scalar: true),
    requests = sum(dt.frontend.request.count, scalar: true),
    errors = sum(dt.frontend.error.count, scalar: true)
  }, by: {frontend.name}, filter: (dt.rum.user_type == "real_user")
| filter isNotNull(frontend.name)
| fieldsAdd errorRatePct = if(requests > 0, round((errors / requests) * 100, decimals: 2), else: 0.0)
| fields frontend.name, actions, requests, errors, errorRatePct
| sort requests desc
```

**Validation.** 2026-09-04 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl on the validation tenant (2026-09-04). Two named frontends returned: easytrade-frontendreverseproxy (0% error rate) and frontendreverseproxy-easytrade (~3.5-3.8% error rate, all of type "request"). Classic RUM exposes these as dt.frontend.* metrics; the New-RUM user.sessions / user.events tables are empty in this tenant. No hardcoded app name, so it works for any engagement. The active-users / active-sessions estimated_count metrics are not populated here and are shown as not observed rather than zero.

#### `rum.webvitals`

**Purpose.** Per-application Core Web Vitals (LCP, INP, CLS) and navigation timings (load, TTFB, DOM interactive) plus user-action duration, at the 75th percentile and for real users only - the standard way to grade perceived web experience.

**Shape.** table · **Visualization.** Core Web Vitals scorecard · **Window.** follows the app selector

```dql
timeseries {
    lcp = percentile(dt.frontend.web.page.largest_contentful_paint, 75, rollup: avg, scalar: true),
    inp = percentile(dt.frontend.web.page.interaction_to_next_paint, 75, rollup: avg, scalar: true),
    cls = percentile(dt.frontend.web.page.cumulative_layout_shift, 75, rollup: avg, scalar: true),
    load = percentile(dt.frontend.web.navigation.load_event_end, 75, rollup: avg, scalar: true),
    ttfb = percentile(dt.frontend.web.navigation.time_to_first_byte, 75, rollup: avg, scalar: true),
    dom = percentile(dt.frontend.web.navigation.dom_interactive, 75, rollup: avg, scalar: true),
    actionDur = percentile(dt.frontend.user_action.duration, 75, rollup: avg, scalar: true)
  }, by: {frontend.name}, filter: (dt.rum.user_type == "real_user")
| filter isNotNull(frontend.name)
| fields frontend.name, lcp, inp, cls, load, ttfb, dom, actionDur
```

**Validation.** 2026-09-04 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl on the validation tenant (2026-09-04). Both frontends returned real p75 values: LCP ~324-402 ms (good), CLS good, load ~275-286 ms, TTFB ~5-10 ms, DOM ~107-155 ms - but INP ~5.4-6.4 s, which is roughly ten times the 500 ms "poor" line and is the headline finding for these apps. Metric-based (0 on-demand bytes), no hardcoded app name.

#### `rum.funnel`

**Purpose.** The experience funnel per application, real users only: every user action, the actions not frustrated (satisfied or tolerating) and the satisfied ones, by the experience level the platform gives each action; and the requests, those answered without a 4xx or 5xx, and those with one. Each step is part of the one before, in the same unit.

**Shape.** table · **Visualization.** Experience funnel per application · **Window.** follows the app selector

```dql
timeseries { w = sum(dt.frontend.experience.weight, scalar: true) }, by: {frontend.name, experience.level}, filter: (dt.rum.user_type == "real_user")
| append [timeseries { r = sum(dt.frontend.request.count, scalar: true) }, by: {frontend.name, http.response.status_code_class}, filter: (dt.rum.user_type == "real_user")]
| filter isNotNull(frontend.name)
| summarize {
    actions = sum(w),
    satisfied = sum(if(experience.level == "satisfied", w, else: 0)),
    tolerating = sum(if(experience.level == "tolerating", w, else: 0)),
    frustrated = sum(if(experience.level == "frustrated", w, else: 0)),
    requests = sum(r),
    requestsOk = sum(if(in(http.response.status_code_class, {"2xx", "3xx"}), r, else: 0)),
    requestsFailed = sum(if(in(http.response.status_code_class, {"4xx", "5xx"}), r, else: 0))
  }, by: {frontend.name}
| sort actions desc
```

**Validation.** 2026-11-22 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 24 hours, 0 bytes scanned: metrics). The experience weight counts one per user action: its satisfied + tolerating + frustrated equal dt.frontend.user_action.count exactly on both frontends (37,381 and 10,749 on the day measured). Two frontends: 37,396 actions (31,950 satisfied, 5,416 tolerating, 30 frustrated; 108,350 requests, 13 with a 4xx/5xx) and 10,762 actions (4,040 / 1,362 / 5,360; 31,922 requests, 431 with a 4xx/5xx). user.sessions is not readable on this tenant, so the funnel is in user actions, not sessions.

#### `rum.audience`

**Purpose.** Per-application audience size: estimated active user sessions and unique active users. These estimated_count metrics are distinct-count gauges, so they are read with countDistinct (not sum) and scoped to real users (dt.rum.user_type real_user; synthetic monitors and robots excluded) to match the platform RUM overview.

**Shape.** table · **Visualization.** Per-app audience scorecard · **Window.** follows the app selector

```dql
timeseries {
    sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true),
    users = countDistinct(dt.frontend.user.active.estimated_count, scalar: true)
  }, by: {frontend.name}, filter: (dt.rum.user_type == "real_user")
| filter isNotNull(frontend.name)
| fields frontend.name, sessions, users
| sort sessions desc
```

**Validation.** 2026-09-08 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl on the validation tenant (2026-09-08). Reading the active-user/active-session estimated_count metrics with countDistinct (they are distinct-count gauges, not sums) and excluding synthetic traffic returns real audience: over 24h ~99 unique users on each frontend and thousands of sessions (frontendreverseproxy-easytrade ~12,540; easytrade-frontendreverseproxy ~11,105). The earlier sum-based reading returned null, which is why the tiles previously showed "not observed". Metric-based, so 0 on-demand bytes and no hardcoded app name.

#### `rum.audience.total`

**Purpose.** Active sessions and unique users across all frontends together, real users only, as the platform estimates them. Adding the per-app figures would count a user once for every application they use.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
timeseries {
    sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true),
    users = countDistinct(dt.frontend.user.active.estimated_count, scalar: true)
  }, filter: (dt.rum.user_type == "real_user")
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 23,762 sessions and 99 unique users overall, where the two frontends each report 99 users (summing them printed 198). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `poc.daily.rum`

**Purpose.** Real-user actions, requests and errors on each day of the PoC, so the PoC Timeline shows the digital experience beside the problems.

**Shape.** timeseries · **Visualization.** PoC Timeline: daily adoption series · **Window.** timeframe.poc.since

```dql
timeseries {
    actions = sum(dt.frontend.user_action.count),
    requests = sum(dt.frontend.request.count),
    errors = sum(dt.frontend.error.count)
  }, interval: 1d, filter: (dt.rum.user_type == "real_user")
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant from 28 Sep: 8 daily bins, ~93k-101k real-user actions, ~265k-287k requests and ~2.3k-5k errors a day. Metric query, 0 bytes. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `rum.app.flow`

**Purpose.** Which services each web frontend calls, and what those services call next, from the entity model, so the Digital experience page draws the flow of its busiest applications.

**Shape.** table · **Visualization.** Per-application flow map · **Window.** follows the app selector

```dql
fetch dt.entity.application
| fieldsAdd entry = calls[dt.entity.service]
| filter isNotNull(entry)
| expand entry
| lookup [fetch dt.entity.service | fields id, entity.name, next = calls[dt.entity.service]], sourceField: entry, lookupField: id, prefix: "entry."
| expand hop = entry.next
| lookup [fetch dt.entity.service | fields id, entity.name], sourceField: hop, lookupField: id, prefix: "hop."
| fields frontend = entity.name, frontendId = id, entry, entryName = entry.entity.name, hop, hopName = hop.entity.name
| limit 400
```

**Validation.** 2026-10-05 in `internal-lab` · 22 records · 0 B scanned on demand · outcome `ok`

**Notes.** Entity model, 0 bytes. On the validation tenant two frontends call one entry service each (the reverse proxies), which call 13 and 8 services; a frontend that calls no service is filtered out. Capped at 400 rows: the page draws only the two busiest frontends and never counts the rows. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model, 2 runs).

#### `rum.frontend.ids`

**Purpose.** The Experience Vitals id (FRONTEND-…) of each web application Dynatrace Intelligence reports by its classic id (APPLICATION-…), read from the dimensions of the frontend request metric, so a frontend opens straight on its own page in the platform. Problems never carry the FRONTEND id.

**Shape.** table · **Visualization.** Frontend id map (links only) · **Window.** timeframe.pinned.7d

```dql
timeseries requests = sum(dt.frontend.request.count, scalar: true), by: {frontend.name, dt.rum.application.entity, dt.smartscape.frontend}
| filter isNotNull(dt.rum.application.entity) and isNotNull(dt.smartscape.frontend)
| fieldsAdd applicationId = toString(dt.rum.application.entity), frontendId = toString(dt.smartscape.frontend)
| fields frontend.name, applicationId, frontendId, requests
| sort requests desc
```

**Validation.** 2026-11-03 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** Metric dimensions, 0 bytes. Both frontends of the validation tenant mapped: APPLICATION-6331991FD4EFBB24 → FRONTEND-32E311F297817EA0 and APPLICATION-1F31F034940B45EF → FRONTEND-1C56BD052D1AD8FF. The smartscape id only compares through toString() or toSmartscapeId(); a plain string filter returns no rows. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `ev.frontend.summary`

**Purpose.** Core Web Vitals, errors, users and sessions of the real users of one frontend, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Frontend screenshot analysis slide · **Window.** timeframe.caller.evidence

```dql
timeseries { lcp_p75 = percentile(dt.frontend.web.page.largest_contentful_paint, 75, scalar: true), inp_p75 = percentile(dt.frontend.web.page.interaction_to_next_paint, 75, scalar: true), cls_x10k_p75 = percentile(dt.frontend.web.page.cumulative_layout_shift, 75, scalar: true), ttfb_p75 = percentile(dt.frontend.web.navigation.time_to_first_byte, 75, scalar: true), reqs = sum(dt.frontend.request.count, scalar: true), errs = sum(dt.frontend.error.count, scalar: true), ua_p75 = percentile(dt.frontend.user_action.duration, 75, scalar: true), users = countDistinct(dt.frontend.user.active.estimated_count, scalar: true), sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true) }, filter: dt.smartscape.frontend == toSmartscapeId({{frontendId}}) and dt.rum.user_type == "real_user"
| fieldsAdd cls = cls_x10k_p75 / 10000.0, errorsPer100 = round(100.0 * errs / reqs, decimals: 2)
```

**Validation.** 2026-10-05 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** A5 over W (INP 4,978.8 ms) and A6 over the problem window: 30 users, 46 sessions — the screen’s numbers. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B6 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.frontend.minutes`

**Purpose.** Real-user requests and errors per minute of one frontend, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** timeseries · **Visualization.** Frontend screenshot analysis slide (per-minute chart) · **Window.** timeframe.caller.evidence

```dql
timeseries { reqs = sum(dt.frontend.request.count), errs = sum(dt.frontend.error.count) }, filter: dt.smartscape.frontend == toSmartscapeId({{frontendId}}) and dt.rum.user_type == "real_user", interval: 1m
| fieldsAdd totalReqs = arraySum(reqs), totalErrs = arraySum(errs)
| fields timeframe, interval, reqs, errs, totalReqs, totalErrs
```

**Validation.** 2026-10-05 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** A7 over W, 1 minute: errors per minute peak 81 at 22:54 against a median of 3. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B7 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

### infrastructure

#### `cov.hosts.table`

**Purpose.** Host inventory with capacity and placement attributes for the technical audience.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.entity.host
| fields id, name = entity.name, osType, osVersion, cloudType, monitoringMode,
    cpuCores, memoryTotal, hostGroupName, networkZone, state
| sort name asc
```

**Validation.** 2026-08-31 in `internal-lab` · 67 records · 0 B scanned on demand · outcome `ok`

**Notes.** Returned 67 hosts.

#### `infra.trend`

**Purpose.** Host CPU and memory saturation trend across the monitored estate.

**Shape.** timeseries · **Visualization.** TimeseriesChart · **Window.** follows the app selector

```dql
timeseries {
    cpuPct = avg(dt.host.cpu.usage),
    memoryPct = avg(dt.host.memory.usage)
  }, interval: 1h
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Real values observed: CPU ~12%, memory ~24% average across hosts.

#### `slo.hosts.cpu`

**Purpose.** The indicator of the hosts CPU SLO the SE creates on the PoC Builder: for every monitored host, the minutes whose mean CPU use stays within 80 %. A minute not yet reported is a gap, never a failure. Evaluated by the platform.

**Shape.** timeseries · **Visualization.** SLO indicator (evaluated by the platform) · **Window.** follows the app selector

```dql
timeseries cpu = avg(dt.host.cpu.usage), by: { dt.entity.host }
| fieldsAdd sli = iCollectArray(if(isNull(cpu[]), cpu[], else: if(cpu[] <= 80, 100.0, else: 0.0)))
| fieldsAdd entityName(dt.entity.host)
| fieldsRemove cpu
```

**Validation.** 2026-11-22 in `internal-lab` · 3 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 2 hours, every host, first 3 rows read): metrics, 0 bytes, one series of 100 % per minute each; the last, unreported minute read 0 % before the gap rule.

#### `slo.hosts.memory`

**Purpose.** The indicator of the hosts memory SLO the SE creates on the PoC Builder: for every monitored host, the minutes whose mean memory use stays within 85 %. A minute not yet reported is a gap, never a failure. Evaluated by the platform.

**Shape.** timeseries · **Visualization.** SLO indicator (evaluated by the platform) · **Window.** follows the app selector

```dql
timeseries mem = avg(dt.host.memory.usage), by: { dt.entity.host }
| fieldsAdd sli = iCollectArray(if(isNull(mem[]), mem[], else: if(mem[] <= 85, 100.0, else: 0.0)))
| fieldsAdd entityName(dt.entity.host)
| fieldsRemove mem
```

**Validation.** 2026-11-22 in `internal-lab` · 3 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 2 hours, every host, first 3 rows read): metrics, 0 bytes, one series of 100 % per minute each.

#### `infra.capacity`

**Purpose.** Declared capacity against measured usage, per host. This is the evidence behind both halves of a right-sizing conversation: a host running at its ceiling, and a host that was sized for load it never sees.

**Shape.** table · **Visualization.** DataTable with headroom classification · **Window.** follows the app selector

```dql
timeseries {
    cpu = avg(dt.host.cpu.usage), cpuMax = max(dt.host.cpu.usage),
    mem = avg(dt.host.memory.usage), memMax = max(dt.host.memory.usage),
    disk = avg(dt.host.disk.used.percent), diskMax = max(dt.host.disk.used.percent)
  }, by:{dt.entity.host}, interval: 1h
| fieldsAdd avgCpuPct = arrayAvg(cpu), maxCpuPct = arrayMax(cpuMax),
    avgMemPct = arrayAvg(mem), maxMemPct = arrayMax(memMax),
    avgDiskPct = arrayAvg(disk), maxDiskPct = arrayMax(diskMax)
| fields hostId = dt.entity.host, avgCpuPct, maxCpuPct, avgMemPct, maxMemPct,
    avgDiskPct, maxDiskPct
| lookup [
    fetch dt.entity.host
    | fields id, name = entity.name, cores = toLong(cpuCores),
        memBytes = toLong(memoryTotal)
  ], sourceField:hostId, lookupField:id, fields:{name, cores, memBytes}
| filter isNotNull(memBytes) and memBytes > 0
| fieldsAdd memUsedBytes = memBytes * avgMemPct / 100.0,
    memHeadroomBytes = memBytes * (100.0 - maxMemPct) / 100.0
| sort memBytes desc
| limit 200
```

**Validation.** 2026-08-31 in `internal-lab` · 24 records · 0 B scanned on demand · outcome `ok`

**Notes.** Metric plus entity lookup: no on-demand Grail scan. Validated live on the validation tenant (2026-10-03): peaks are now the true maximum of each hour (max(), not the largest hourly average, which understated a short spike), e.g. one 8-core host at 14.6% CPU peak against a 7.0% average. The list holds the largest hosts by memory; every count and total on the page comes from infra.capacity.summary over all of them.

#### `infra.capacity.summary`

**Purpose.** Exact capacity verdicts over every host: how many are saturated, under pressure, balanced or oversized, and the memory declared, in use and reclaimable. Classified inside the query with the same thresholds the page shows, so a large estate is never cut to its biggest hosts.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
timeseries {
    cpuMax = max(dt.host.cpu.usage),
    memMax = max(dt.host.memory.usage),
    memAvg = avg(dt.host.memory.usage)
  }, by:{dt.entity.host}, interval: 1h
| fieldsAdd peakCpu = arrayMax(cpuMax), peakMem = arrayMax(memMax), avgMem = arrayAvg(memAvg)
| lookup [
    fetch dt.entity.host
    | fields id, cores = toLong(cpuCores), memBytes = toLong(memoryTotal)
  ], sourceField:dt.entity.host, lookupField:id, fields:{cores, memBytes}
| filter isNotNull(memBytes) and memBytes > 0
| fieldsAdd verdict = if(isNull(peakCpu) and isNull(peakMem), "unknown",
    else:if(peakCpu >= 90 or peakMem >= 90, "saturated",
    else:if(peakCpu >= 75 or peakMem >= 75, "pressured",
    else:if(peakCpu < 25 and peakMem < 25, "oversized", else:"balanced"))))
| summarize {
    hosts = count(),
    saturated = countIf(verdict == "saturated"),
    pressured = countIf(verdict == "pressured"),
    balanced = countIf(verdict == "balanced"),
    oversized = countIf(verdict == "oversized"),
    unknown = countIf(verdict == "unknown"),
    declaredMemBytes = sum(memBytes),
    usedMemBytes = sum(memBytes * avgMem / 100.0),
    reclaimableMemBytes = sum(if(verdict == "oversized", memBytes * (100.0 - peakMem) / 100.0, else:0.0)),
    oversizedCores = sum(if(verdict == "oversized", cores, else:0))
  }
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-10-03) over 24 h: 24 hosts with memory and metrics, 3 saturated, 1 under pressure, 11 balanced, 9 oversized, 465 GB declared, 97 GB in use, 237 GB reclaimable on the oversized ones. Metric plus entity lookup: no on-demand Grail scan.

#### `infra.capacity.total`

**Purpose.** Estate-level declared capacity: how many hosts, how many cores and how much memory Dynatrace found. The denominator for every headroom statement.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
fetch dt.entity.host
| summarize hosts = count(),
    totalCores = sum(toLong(cpuCores)),
    totalMemBytes = sum(toLong(memoryTotal))
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Observed on the validation tenant: 63 hosts, 106 cores, 622,306,312,192 bytes of memory.

#### `ev.host.cpu`

**Purpose.** The hosts with the highest CPU peak, the screenshot's own host as a tagged row, and the fleet median, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Host screenshot analysis slide · **Window.** timeframe.caller.evidence

```dql
timeseries { cpu = avg(dt.host.cpu.usage), mem = avg(dt.host.memory.usage) }, by: {dt.entity.host}, interval: 5m
| fieldsAdd name = entityName(dt.entity.host), cpuAvg = round(arrayAvg(cpu), decimals: 1), cpuPeak = round(arrayMax(cpu), decimals: 1), memAvg = round(arrayAvg(mem), decimals: 1), memPeak = round(arrayMax(mem), decimals: 1)
| fields dt.entity.host, name, cpuAvg, cpuPeak, memAvg, memPeak
| sort cpuPeak desc
| limit 3
| append [timeseries { cpu = avg(dt.host.cpu.usage), mem = avg(dt.host.memory.usage) }, by: {dt.entity.host}, filter: dt.entity.host == {{hostId}}, interval: 5m | fieldsAdd name = entityName(dt.entity.host), cpuAvg = round(arrayAvg(cpu), decimals: 1), cpuPeak = round(arrayMax(cpu), decimals: 1), memAvg = round(arrayAvg(mem), decimals: 1), memPeak = round(arrayMax(mem), decimals: 1), isSubject = true | fields dt.entity.host, name, cpuAvg, cpuPeak, memAvg, memPeak, isSubject]
| append [timeseries cpu = avg(dt.host.cpu.usage), by: {dt.entity.host}, interval: 5m | fieldsAdd c = arrayAvg(cpu) | summarize hosts = count(), medianCpu = median(c), under10 = countIf(c < 10) | fieldsAdd isTotal = true]
```

**Validation.** 2026-10-05 in `internal-lab` · 5 records · 0 B scanned on demand · outcome `ok`

**Notes.** Evidence lens Q20 (not re-run in the synthesis): ip-172-31-93-120 at 75.7 % CPU on average, 33× the fleet median. 2026-10-06 on the lab tenant over 2 h with the isSubject append: HOST-F91F108503DD0BA8 (not in the top 3) returned at 7.3 % / 41.6 %, 29 hosts, median 3.4 %. Row count not recorded: the figure is the shape’s ceiling (the three hottest hosts, the subject row and the fleet row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B19 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

### kubernetes

#### `k8s.clusters`

**Purpose.** Cluster inventory as the entry point for Kubernetes drill-down.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.entity.kubernetes_cluster
| fields id, name = entity.name
| sort name asc
```

**Validation.** 2026-08-31 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** Returned 6 clusters.

#### `k8s.inventory`

**Purpose.** The Kubernetes estate in one call: clusters, nodes, namespaces, workloads and the pods seen in the window, so the page opens with the size of what is monitored before it shows what restarts.

**Shape.** table · **Visualization.** Inventory tiles · **Window.** follows the app selector

```dql
fetch dt.entity.kubernetes_cluster | summarize value = count() | fieldsAdd kind = "clusters"
| append [ fetch dt.entity.kubernetes_node | summarize value = count() | fieldsAdd kind = "nodes" ]
| append [ fetch dt.entity.cloud_application_namespace | summarize value = count() | fieldsAdd kind = "namespaces" ]
| append [ fetch dt.entity.cloud_application | summarize value = count() | fieldsAdd kind = "workloads" ]
| append [ fetch dt.entity.cloud_application_instance | summarize value = count() | fieldsAdd kind = "pods" ]
| fields kind, value
```

**Validation.** 2026-10-04 in `internal-lab` · 5 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 6 clusters, 42 nodes, 61 namespaces, 308 workloads and 4,738 pods seen (pods churn, so the pod count is "seen in the window", not "running now"). Entity model query, 0 bytes scanned. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model, 2 runs).

#### `k8s.restarts`

**Purpose.** Workloads by container restarts. Restart churn is the most legible reliability signal for a mixed audience.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
timeseries restarts = sum(dt.kubernetes.container.restarts),
    by:{k8s.workload.name, k8s.cluster.name}, interval: 1h
| fieldsAdd total = arraySum(restarts)
| filter total > 0
| fields workload = k8s.workload.name, cluster = k8s.cluster.name, total
| sort total desc
| limit 25
```

**Validation.** 2026-08-31 in `internal-lab` · 12 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated over 24 h: 12 workloads with restarts, the highest at 2375 restarts in a single workload.

#### `k8s.restarts.total`

**Purpose.** Exact restart totals over every workload: how many restarted at all and how many restarts that adds up to, so the headline is not the sum of the 25 noisiest.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
timeseries restarts = sum(dt.kubernetes.container.restarts),
    by:{k8s.workload.name, k8s.cluster.name}, interval: 1h
| fieldsAdd total = arraySum(restarts)
| filter total > 0
| summarize workloads = count(), restarts = sum(total), worst = max(total)
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 14 workloads restarting, 1,971 restarts, the worst at 654. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `k8s.restarts.trend`

**Purpose.** Container restarts and out-of-memory kills per hour across every workload, so the page shows when the platform restarts, not only which workload restarts most.

**Shape.** timeseries · **Visualization.** Spectrum area chart · **Window.** follows the app selector

```dql
timeseries {
    restarts = sum(dt.kubernetes.container.restarts),
    oomKills = sum(dt.kubernetes.container.oom_kills)
  }, interval: 1h
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 25 hourly bins, 1,765 restarts (51 to 89 per hour) and 252 OOM kills. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `k8s.pressure`

**Purpose.** Out-of-memory kills and CPU throttling per workload - the evidence behind any right-sizing recommendation.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
timeseries {
    oomKills = sum(dt.kubernetes.container.oom_kills),
    throttled = avg(dt.kubernetes.container.cpu_throttled),
    cpuLimit = avg(dt.kubernetes.container.limits_cpu)
  }, by:{k8s.workload.name, k8s.cluster.name}, interval: 1h
| fieldsAdd totalOom = arraySum(oomKills), throttledAvg = arrayAvg(throttled), limitAvg = arrayAvg(cpuLimit)
| fieldsAdd throttledPct = if(limitAvg > 0, throttledAvg * 100.0 / limitAvg)
| filter totalOom > 0 or throttledAvg > 0
| fields workload = k8s.workload.name, cluster = k8s.cluster.name, totalOom, throttledAvg, throttledPct
| sort totalOom desc, throttledPct desc
| limit 25
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Metric keys dt.kubernetes.container.oom_kills, .cpu_throttled and .limits_cpu confirmed on the validation tenant over 24 h: sqs-demo (loan-app-dynakube) with 252 OOM kills and 85.8 of its 500 millicores throttled on average (17.2 %). Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `k8s.pressure.total`

**Purpose.** Exact resource-pressure totals over every workload: how many were out-of-memory killed, how many were CPU-throttled and the number of OOM kills, not just the 25 worst.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
timeseries {
    oomKills = sum(dt.kubernetes.container.oom_kills),
    cpuThrottled = sum(dt.kubernetes.container.cpu_throttled)
  }, by:{k8s.workload.name, k8s.cluster.name}, interval: 1h
| fieldsAdd totalOom = arraySum(oomKills), totalThrottled = arraySum(cpuThrottled)
| filter totalOom > 0 or totalThrottled > 0
| summarize workloads = count(), oomKills = sum(totalOom), throttled = sum(totalThrottled),
    oomWorkloads = countIf(totalOom > 0), throttledWorkloads = countIf(totalThrottled > 0)
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 1 workload under pressure, 288 OOM kills, 1 OOM-killed and 1 throttled workload. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `slo.k8s.restarts`

**Purpose.** The indicator of the Kubernetes SLO the SE creates on the PoC Builder: for every workload, the minutes in which none of its containers restarted. Evaluated by the platform.

**Shape.** timeseries · **Visualization.** SLO indicator (evaluated by the platform) · **Window.** follows the app selector

```dql
timeseries restarts = sum(dt.kubernetes.container.restarts, default: 0), by: { k8s.cluster.name, k8s.workload.name }
| fieldsAdd sli = iCollectArray(if(restarts[] == 0, 100.0, else: 0.0))
| fieldsRemove restarts
```

**Validation.** 2026-11-22 in `internal-lab` · 3 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 2 hours, first 3 workloads read): metrics, 0 bytes; workloads of the lab cluster restart every few minutes (series of 100 and 0), the reading the SLO is for.

#### `k8s.cluster.ids`

**Purpose.** The Smartscape id (K8S_CLUSTER-…) of each Kubernetes cluster, read from the dimensions of the container CPU metric, so a cluster opens straight on its page in the Kubernetes app. The classic KUBERNETES_CLUSTER-… id shares no digits with it.

**Shape.** table · **Visualization.** Cluster id map (links only) · **Window.** timeframe.pinned.24h

```dql
timeseries cpu = sum(dt.kubernetes.container.cpu_usage, scalar: true), by: {k8s.cluster.name, dt.smartscape.k8s_cluster}
| filter isNotNull(k8s.cluster.name) and isNotNull(dt.smartscape.k8s_cluster)
| fieldsAdd clusterId = toString(dt.smartscape.k8s_cluster)
| fields clusterName = k8s.cluster.name, clusterId
| sort clusterName asc
```

**Validation.** 2026-11-03 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** Metric dimensions, 0 bytes. ard-dynatrace-gcp-monitor → K8S_CLUSTER-53B76CCF6F84D68E (the verified owner link); loan-app-dynakube → K8S_CLUSTER-87E7E0B19F2B0431. The smartscape id must go through toString(). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `ev.k8s.capacity`

**Purpose.** CPU and memory used, requested and limited against what the nodes can allocate, for one Kubernetes cluster, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Kubernetes cluster screenshot analysis slide · **Window.** timeframe.caller.evidence

```dql
timeseries { cpu = sum(dt.kubernetes.container.cpu_usage, rollup: avg), cpuReq = sum(dt.kubernetes.container.requests_cpu, rollup: avg), cpuLim = sum(dt.kubernetes.container.limits_cpu, rollup: avg), mem = sum(dt.kubernetes.container.memory_working_set, rollup: avg), memReq = sum(dt.kubernetes.container.requests_memory, rollup: avg), memLim = sum(dt.kubernetes.container.limits_memory, rollup: avg) }, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}}), interval: 5m
| fieldsAdd cpuUsedCores = arrayAvg(cpu) / 1000, cpuReqCores = arrayAvg(cpuReq) / 1000, cpuLimCores = arrayAvg(cpuLim) / 1000, memUsedGiB = arrayAvg(mem) / 1073741824, memReqGiB = arrayAvg(memReq) / 1073741824, memLimGiB = arrayAvg(memLim) / 1073741824
| fields cpuUsedCores, cpuReqCores, cpuLimCores, memUsedGiB, memReqGiB, memLimGiB
| append [timeseries { cpuA = sum(dt.kubernetes.node.cpu_allocatable, rollup: avg), memA = sum(dt.kubernetes.node.memory_allocatable, rollup: avg) }, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}}), interval: 5m | fieldsAdd cpuAllocCores = arrayAvg(cpuA) / 1000, memAllocGiB = arrayAvg(memA) / 1073741824, isAllocatable = true | fields isAllocatable, cpuAllocCores, memAllocGiB]
```

**Validation.** 2026-10-05 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** A8 over now-30m: ard-dynatrace-gcp-monitor 15.8 / 13.7 / 31.1 cores and 55.2 / 55.2 / 58.5 GiB, as the reference print. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B10 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.k8s.workloads`

**Purpose.** Use against request per workload of one Kubernetes cluster, the largest memory reservations first, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Kubernetes cluster screenshot analysis slide (workloads) · **Window.** timeframe.caller.evidence

```dql
timeseries { cpu = sum(dt.kubernetes.container.cpu_usage, rollup: avg), cpuReq = sum(dt.kubernetes.container.requests_cpu, rollup: avg), mem = sum(dt.kubernetes.container.memory_working_set, rollup: avg), memReq = sum(dt.kubernetes.container.requests_memory, rollup: avg) }, by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}}), interval: 5m
| fieldsAdd cpuAvg = arrayAvg(cpu), cpuReqAvg = arrayAvg(cpuReq), memAvg = arrayAvg(mem), memReqAvg = arrayAvg(memReq)
| fieldsAdd memOfReqPct = round(100.0 * memAvg / memReqAvg, decimals: 1), cpuOfReqPct = round(100.0 * cpuAvg / cpuReqAvg, decimals: 1), memReqGiB = round(memReqAvg / 1073741824, decimals: 2), memUsedGiB = round(memAvg / 1073741824, decimals: 2)
| fields k8s.workload.name, k8s.namespace.name, memOfReqPct, cpuOfReqPct, memReqGiB, memUsedGiB
| sort memReqGiB desc
| limit 8
```

**Validation.** 2026-10-05 in `internal-lab` · 8 records · 0 B scanned on demand · outcome `ok`

**Notes.** A8b over now-30m: 8 workloads; kafka-broker at 117.5 % of its memory request. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B11 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.k8s.churn`

**Purpose.** Container restarts per workload of one Kubernetes cluster, out-of-memory kills beside them, and the restart total, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Kubernetes cluster screenshot analysis slide (churn) · **Window.** timeframe.caller.evidence

```dql
timeseries restarts = sum(dt.kubernetes.container.restarts, scalar: true), by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}})
| filter restarts > 0
| lookup [timeseries oom = sum(dt.kubernetes.container.oom_kills, scalar: true), by: {k8s.workload.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}})], sourceField: k8s.workload.name, lookupField: k8s.workload.name, prefix: "x."
| fields k8s.workload.name, k8s.namespace.name, restarts, oomKills = x.oom
| sort restarts desc
| limit 5
| append [timeseries { restarts = sum(dt.kubernetes.container.restarts, scalar: true) }, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}}) | fieldsAdd isTotal = true]
```

**Validation.** 2026-10-05 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** A8c over 24 h: sqs-demo 669 restarts and 257 OOM kills; 1,522 restarts in total. Row count not recorded: the figure is the shape’s ceiling (five workloads and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B12 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.k8s.incidentRestarts`

**Purpose.** Container restarts per minute and workload of one Kubernetes cluster during the incident, with the first restarting minute, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Kubernetes cluster screenshot analysis slide (restarts in the incident) · **Window.** timeframe.caller.evidence

```dql
timeseries restarts = sum(dt.kubernetes.container.restarts), by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}}), interval: 1m
| fieldsAdd total = arraySum(restarts)
| filter total > 0
| fieldsAdd firstIdx = arrayIndexOf(iCollectArray(if(restarts[] > 0, 1, else: 0)), 1)
| fields k8s.workload.name, k8s.namespace.name, total, firstIdx, timeframe
| sort total desc
| limit 10
```

**Validation.** 2026-10-05 in `internal-lab` · 10 records · 0 B scanned on demand · outcome `ok`

**Notes.** A8d over W, 1 minute: pricing-service (easytrade) 2 restarts, first at 23:01. Row count not recorded: the figure is the shape’s ceiling. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B13 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

### logs

#### `rca.logs`

**Purpose.** Error and warning log volume by Kubernetes namespace over the last 6 hours, in every readable log bucket, as the corroborating failure signal beside the RCA incident. Aggregate counts only — no log content, no PII.

**Shape.** table · **Visualization.** Failure-by-namespace table · **Window.** timeframe.pinned.6h

```dql
fetch logs
| filter loglevel == "ERROR" or loglevel == "SEVERE" or loglevel == "WARN"
| summarize errors = countIf(loglevel == "ERROR" or loglevel == "SEVERE"),
    warnings = countIf(loglevel == "WARN"),
    by:{namespace = k8s.namespace.name}
| sort errors desc
| limit 12
```

**Validation.** 2026-08-31 in `internal-lab` · 10 records · 666 MB scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl (2026-09-09): easytrade namespace showed 498 error logs in 24h, matching the top RCA incident namespace — a genuine cross-signal. 3.2.3: re-validated over every bucket (default_logs, logs_teste, field_sets_tests on the validation tenant). Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 6 h, 9 runs).

#### `log.levels.preview`

**Purpose.** The share of log records written without a level and the level the PoC Builder’s OpenPipeline rule would give them (error, warning, info), from a 1:100 sample — proportions, not counts.

**Shape.** scalar · **Visualization.** OpenPipeline kit preview · **Window.** timeframe.pinned.30m

```dql
fetch logs, samplingRatio: 100
| fieldsAdd noLevel = isNull(loglevel) or loglevel == "NONE"
| fieldsAdd pocLevel = if(noLevel and (matchesPhrase(content, "error") or matchesPhrase(content, "exception") or matchesPhrase(content, "fatal") or matchesPhrase(content, "failed")), "ERROR", else: if(noLevel and (matchesPhrase(content, "warn") or matchesPhrase(content, "warning")), "WARN", else: if(noLevel and matchesPhrase(content, "info"), "INFO")))
| summarize sampled = count(), withoutLevel = countIf(noLevel), toError = countIf(pocLevel == "ERROR"), toWarn = countIf(pocLevel == "WARN"), toInfo = countIf(pocLevel == "INFO")
| fieldsAdd withoutLevelPct = round(100.0 * withoutLevel / sampled, decimals: 1)
```

**Validation.** 2026-11-23 in `internal-lab` · 1 records · 18.5 MB scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 30 minutes at 1:100: 86.7 % of the sampled records carry no level; the rule would set ERROR on 13, WARN on 2 and INFO on 39 of 14,882 (the rest are data records).

#### `log.sources.nolevel`

**Purpose.** The log sources whose records come without a level — by log source, Kubernetes workload and ingest path — and how many of their lines read as errors, from a 1:100 sample over 30 minutes: the choices for the route the PoC Builder adds to its OpenPipeline pipeline. A list of sources, never added up.

**Shape.** table · **Visualization.** OpenPipeline kit route choices · **Window.** timeframe.pinned.30m

```dql
fetch logs, samplingRatio: 100
| filter isNull(loglevel) or loglevel == "NONE"
| summarize sampled = count(), looksError = countIf(matchesPhrase(content, "error") or matchesPhrase(content, "exception")),
    by: {log.source, k8s.workload.name, dt.openpipeline.source}
| sort sampled desc
| limit 12
```

**Validation.** 2026-11-23 in `internal-lab` · 9 records · 4.9 MB scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 30 minutes at 1:100: 9 sources without a level — the logs ingest API (14,608 sampled), Container Output (207, 7 reading as errors), OTLP (184), a OneAgent extension log (19, 4 as errors), the easytrade-loadgen workload (9, 4 as errors) and four smaller ones.

#### `log.pipeline.check`

**Purpose.** How many log records went through the PoC Builder’s OpenPipeline pipeline and the level each left with (error, warning, info, still without one), from a 1:100 sample over 30 minutes — the proof that the pipeline works once a route sends it data.

**Shape.** scalar · **Visualization.** OpenPipeline kit check · **Window.** timeframe.pinned.30m

```dql
fetch logs, samplingRatio: 100
| filter iAny(dt.openpipeline.pipelines[] == "logs:pipeline_poc_automation_log_levels")
| summarize sampled = count(), error = countIf(loglevel == "ERROR"), warn = countIf(loglevel == "WARN"),
    info = countIf(loglevel == "INFO"), stillNone = countIf(isNull(loglevel) or loglevel == "NONE"), last = max(timestamp)
```

**Validation.** 2026-11-23 in `internal-lab` · 1 records · 1.8 MB scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 30 minutes at 1:100: 0 records for the PoC pipeline (created, no route yet); the same read on another pipeline of the lab answered 1,964 sampled records (773 INFO, 11 WARN, 1 ERROR, 226 without a level).

#### `log.quality`

**Purpose.** Severity mix and topology-enrichment coverage of ingested logs. This is the difference between storing logs and being able to use them.

**Shape.** table · **Visualization.** DataTable · **Window.** timeframe.pinned.30m

```dql
fetch logs
| summarize total = count(),
    withService = countIf(isNotNull(dt.entity.service)),
    withHost = countIf(isNotNull(dt.entity.host)),
    withK8sNamespace = countIf(isNotNull(k8s.namespace.name)),
    by:{status, bucket = dt.system.bucket}
| sort total desc
```

**Validation.** 2026-10-04 in `internal-lab` · 9 records · 1.2 GB scanned on demand · outcome `ok`

**Notes.** Over 30 minutes and every bucket: 1,879,105 records (default_logs 1,576,248, logs_teste 259,695, field_sets_tests 3,786); 10,186 with service context and 263,481 with a Kubernetes namespace. On default_logs alone the namespace share was 0 %, which the 3.2.2 page reported as "logs without context". Pinned to a short window because logs are the costliest table to scan. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 30 min, 174 runs).

#### `log.errors.recent`

**Purpose.** The most recent error records of every readable bucket in the last 30 minutes, as console lines: when, where they came from (service, workload, host or bucket) and the start of the message. A list; the total comes from log.quality.

**Shape.** table · **Visualization.** Console lines · **Window.** timeframe.pinned.30m

```dql
fetch logs
| filter status == "ERROR"
| sort timestamp desc
| limit 12
| fields timestamp, content = substring(content, from: 0, to: 220), service = entityName(dt.entity.service), host = host.name, workload = k8s.workload.name, bucket = dt.system.bucket
```

**Validation.** 2026-11-22 in `internal-lab` · 12 records · 68.4 MB scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 30 minutes, every bucket) after a ~0.5 GiB estimate the owner approved: 0.064 GiB scanned, 12 lines (Prometheus extension connection errors on the EC2 hosts and a container-detector message in logs_teste). Pinned to log.quality's short window, whose ERROR rows give the total.

#### `log.errors.grouped`

**Purpose.** The error records of every readable bucket in the selected window, grouped by message — numbers written as # and ids as <id>, so a repeated error counts as one — with how many times each appeared, when it was last seen and on how many hosts. The 12 most recently seen; a list of counts, never summed.

**Shape.** table · **Visualization.** Console lines with a count · **Window.** follows the app selector

```dql
fetch logs
| filter status == "ERROR"
| fieldsAdd message = substring(replacePattern(replacePattern(content, "[0-9a-fA-F\\-]{8,}", "<id>"), "DIGIT+", "#"), from: 0, to: 160), service = entityName(dt.entity.service), bucket = dt.system.bucket
| summarize count = count(), last = max(timestamp), hosts = countDistinct(host.name), workload = takeAny(k8s.workload.name), by: {message, service, bucket}
| sort last desc
| limit 12
```

**Validation.** 2026-11-22 in `internal-lab` · 12 records · 1.9 GB scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22) at the owner's choice "Sempre no período" for the count: last 2 hours 0.20 GiB, last 24 hours 1.72 GiB in 472 ms (about 0.072 GiB per hour of window; 7 days ≈ 12 GiB), 12 rows. Grouping by the raw message start counted every line once (timestamps and ids differ); with numbers as # and ids as <id> the same error groups: 11,517 Prometheus connection errors on 8 hosts and 4,314 container-detector messages in 24 hours. The ceiling of 20 GiB covers a week; a longer window that reaches it is shown as "at least".

#### `log.ingest`

**Purpose.** Log bytes ingested and log bytes queried over the window, read from the platform's own billing usage events. Gives the log page a sense of scale that a record count alone cannot.

**Shape.** table · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE_EVENT"
| filter event.type == "Log Management & Analytics - Ingest & Process"
    or event.type == "Log Management & Analytics - Query"
| summarize bytes = sum(billed_bytes), events = count(), by:{event.type}
| sort bytes desc
```

**Validation.** 2026-08-31 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** Observed on the validation tenant over 24 hours: 22,934,202,611 bytes ingested and 60,754,085,732 bytes scanned by log queries. The "Retain" capability was deliberately excluded: its billed_bytes is a byte-day retention figure rather than a plain byte count, and showing it as GB would overstate ingest by three orders of magnitude.

#### `log.ingest.trend`

**Purpose.** Log bytes ingested per hour, read from the platform's own billing usage events, so the page shows the rhythm of ingestion and not only its total. Volume only: no price is applied.

**Shape.** timeseries · **Visualization.** Spectrum area chart · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE_EVENT"
| filter event.type == "Log Management & Analytics - Ingest & Process"
| makeTimeseries bytes = sum(billed_bytes), interval: 1h
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 25 hourly bins, about 1 GB ingested per hour, 24.1 GB in total (the first bin empty, the last partial). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `log.buckets`

**Purpose.** Log volume and retention per bucket, for retention and governance decisions.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.system.buckets
| filter `dt.system.table` == "logs"
| fields name, records, retentionDays = retention_days,
    bytes = estimated_uncompressed_bytes, hasAccess = has_access
| sort bytes desc
```

**Validation.** 2026-08-31 in `internal-lab` · 10 records · 0 B scanned on demand · outcome `ok`

**Notes.** Reads bucket metadata rather than log content, so bucket-level volume costs nothing to display.

#### `log.sfm`

**Purpose.** The platform's own self-monitoring on log ingestion quality: unparsed timestamps, ambiguous patterns and process-group ambiguity.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.system.events
| filter event.kind == "LOG_SFM" or event.kind == "LOG_SOURCE_STATUS"
| summarize occurrences = count(), by:{event.kind, event.type}
| sort occurrences desc
| limit 25
```

**Validation.** 2026-08-31 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** Observed over 24 h: pgi.multiple_pgis 2250, log_source.status 3355, timestamp.no_pattern 40, timestamp.multiple_patterns 33. These are platform-reported, not app-inferred.

#### `rca.incident.logs`

**Purpose.** The selected incident's own error and warning logs, scoped to its affected and related entities over its padded window, summarised by message signature with one exact totals row. Used when no affected entity is a service.

**Shape.** table · **Visualization.** Incident log signatures (RCA page, Tech Wrapup and the logs print) · **Window.** timeframe.caller.incident

```dql
fetch logs
| filter in(dt.source_entity, array({{entityIds}}))
| filter status == "ERROR" or status == "WARN"
| fieldsAdd sig = if(isNotNull(content) and content != "", substring(trim(content), from: 0, to: 110), else: "")
| summarize count = count(), errors = countIf(status == "ERROR"), by:{ sig }
| sort count desc
| limit 8
| append [
    fetch logs
    | filter in(dt.source_entity, array({{entityIds}}))
    | filter status == "ERROR" or status == "WARN"
    | summarize count = count(), errors = countIf(status == "ERROR")
    | fieldsAdd isTotal = true
  ]
```

**Validation.** 2026-10-05 in `internal-lab` · 9 records · 817 MB scanned on demand · outcome `ok`

**Notes.** The scope without services (no process-group selector). Validated read-only on the lab tenant with 3.2.3 (Q6: entity-id validation, a 6-hour window, a 10 GB ceiling; deploy record of 2026-10-05). Row count and scanned bytes not recorded: the row figure is the shape’s ceiling (the listed signatures and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder buildIncidentLogsDql (models/rca.ts). Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, the incident, up to 6 h, 12 runs).

#### `rca.incident.logs.services`

**Purpose.** The selected incident's own error and warning logs, scoped to its affected and related entities and to the process groups of its affected services, over its padded window, summarised by message signature with one exact totals row.

**Shape.** table · **Visualization.** Incident log signatures (RCA page, Tech Wrapup and the logs print) · **Window.** timeframe.caller.incident

```dql
fetch logs
| filter in(dt.source_entity, array({{entityIds}})) or in(dt.entity.process_group, classicEntitySelector("""type(PROCESS_GROUP), toRelationship.isServiceOfProcessGroup(entityId({{serviceIds}}))"""))
| filter status == "ERROR" or status == "WARN"
| fieldsAdd sig = if(isNotNull(content) and content != "", substring(trim(content), from: 0, to: 110), else: "")
| summarize count = count(), errors = countIf(status == "ERROR"), by:{ sig }
| sort count desc
| limit 8
| append [
    fetch logs
    | filter in(dt.source_entity, array({{entityIds}})) or in(dt.entity.process_group, classicEntitySelector("""type(PROCESS_GROUP), toRelationship.isServiceOfProcessGroup(entityId({{serviceIds}}))"""))
    | filter status == "ERROR" or status == "WARN"
    | summarize count = count(), errors = countIf(status == "ERROR")
    | fieldsAdd isTotal = true
  ]
```

**Validation.** 2026-10-05 in `internal-lab` · 9 records · 666 MB scanned on demand · outcome `ok`

**Notes.** The scope with services (entity ids or their process groups). Validated read-only on the lab tenant with 3.2.3 (Q6: entity-id validation, a 6-hour window, a 10 GB ceiling; deploy record of 2026-10-05). Row count and scanned bytes not recorded: the row figure is the shape’s ceiling (the listed signatures and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder buildIncidentLogsDql (models/rca.ts). Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, the incident, up to 6 h, 16 runs).

#### `ev.logs.errors`

**Purpose.** The most frequent ERROR log signatures with digits folded, where they come from, and the ERROR total, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Logs screenshot analysis slide · **Window.** timeframe.caller.evidence

```dql
fetch logs
| filter status == "ERROR"
| fieldsAdd signature = substring(replacePattern(replaceString(content, "\n", " "), "DIGIT+", "#"), from: 0, to: 110), origin = coalesce(k8s.namespace.name, dt.process.name, log.source, "n/a")
| summarize occurrences = count(), origins = countDistinct(origin), topOrigin = takeMax(origin), by: {signature}
| sort occurrences desc
| limit 6
| append [fetch logs | filter status == "ERROR" | summarize occurrences = count() | fieldsAdd isTotal = true]
```

**Validation.** 2026-10-05 in `internal-lab` · 7 records · not captured scanned on demand · outcome `ok`

**Notes.** A12 over 2 h at a 5 GB cap: 15,126 ERROR logs; 4 signatures × 2,754 (a cascade). Row count not recorded: the figure is the shape’s ceiling (six signatures and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B15 validated on 2026-10-05.

### problems

#### `prob.summary`

**Purpose.** Problem mix by category and lifecycle status, Dynatrace Intelligence duplicates excluded. Pinned to 7 days so the problem figures always describe the same window.

**Shape.** table · **Visualization.** CategoricalBarChart / DataTable · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| summarize problems = count(), by:{event.category, event.status}
| sort problems desc
```

**Validation.** 2026-08-31 in `internal-lab` · 8 records · 470 MB scanned on demand · outcome `ok`

**Notes.** Measured via QUERY_EXECUTION_EVENT: 469.8 MB on-demand across 3 bucket shards, 1455 ms. Dominant cost in the app - cached and never widened past 7 days by default.

#### `prob.recurrent`

**Purpose.** Recurring problem patterns, keyed by the entity Dynatrace Intelligence blamed as well as the problem name. Recurrence is the honest argument for automation: the same problem returning on the same thing is measured, not asserted.

**Shape.** table · **Visualization.** DataTable / TopList · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| fieldsAdd rootCause = if(isNull(root_cause_entity_name), "Cause not named by Davis", else: root_cause_entity_name)
| summarize occurrences = count(), lastSeen = max(timestamp),
    frequentEvent = countIf(dt.davis.is_frequent_event),
    by:{event.name, event.category, rootCause}
| filter occurrences >= 2
| sort occurrences desc
| limit 25
```

**Validation.** 2026-08-31 in `internal-lab` · 25 records · 470 MB scanned on demand · outcome `ok`

**Notes.** 3.3.1 (backlog Q12): the root-cause entity joins the key. Measured on 2026-11-03 over 7 d: keyed by name and category alone there were 25 patterns, and "Failure rate increase" showed as ONE pattern of 59 occurrences - it is really 32 with no cause named, 8 on TradeManagement and 7 on easytrade_offer_service, three different things wearing one label. With the entity in the key: 31 patterns, named causes such as TradeManagement, easytrade_offer_service and LoanConsumer finally visible. The worst pattern is 318 either way, because Davis names no cause for it: on this tenant most problems have none, so they group under an explicit sentinel instead of a null. Shares the 7-day problem scan with prob.summary; duplicates excluded.

#### `prob.recurrent.total`

**Purpose.** Exact count of recurring problem patterns: how many distinct problem names repeated at least twice, how many repeated often enough (five or more) to be worth a workflow, and the problems they account for. Counted over every pattern, not the 25 most frequent.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| fieldsAdd rootCause = if(isNull(root_cause_entity_name), "Cause not named by Davis", else: root_cause_entity_name)
| summarize occurrences = count(), by:{event.name, event.category, rootCause}
| summarize patterns = countIf(occurrences >= 2),
    candidates = countIf(occurrences >= 5),
    recurringVolume = sum(if(occurrences >= 2, occurrences, else:0)),
    allVolume = sum(occurrences),
    worst = max(occurrences)
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 309 MB scanned on demand · outcome `ok`

**Notes.** 3.3.1 (backlog Q12): same key as prob.recurrent, so the totals describe the list. Measured over 7 d: 31 patterns (was 25 before the root-cause entity joined the key), 23 worth a workflow, 1,500 of 1,538 problems inside a recurring pattern, worst 318, and 9 of the 31 patterns have a cause Davis named. Counted over every pattern, not the 25 the list shows.

#### `prob.list`

**Purpose.** Problem detail with the Smartscape entities Dynatrace Intelligence itself attached. Backs the "what happened / what was affected / what evidence" narrative.

**Shape.** table · **Visualization.** DataTable with expandable rows · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| fields displayId = display_id, name = event.name, category = event.category,
    status = event.status, severity = event.severity, start = event.start, end = event.end,
    durationNs = resolved_problem_duration, impactLevel = dt.davis.impact_level,
    affected = affected_entity_names, affectedTypes = affected_entity_types,
    related = related_entity_names, cluster = k8s.cluster.name,
    namespace = k8s.namespace.name, workload = k8s.workload.name,
    underMaintenance = maintenance.is_under_maintenance,
    analysisReady = dt.analysis.ready, description = event.description
| sort start desc
| limit 100
```

**Validation.** 2026-08-31 in `internal-lab` · 100 records · 470 MB scanned on demand · outcome `ok`

**Notes.** Schema confirmed on a real record: smartscape.affected_entities / related_entities, dt.davis.impact_level and a markdown event.description are all populated by the platform.

#### `prob.timeline`

**Purpose.** Problem arrival grouped by the time each problem began, to show whether the environment is improving or degrading.

**Shape.** table · **Visualization.** TimeseriesChart (from binned table) · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| summarize problems = count(), by:{interval = bin(event.start, 6h)}
| sort interval asc
```

**Validation.** 2026-08-31 in `internal-lab` · 40 records · 470 MB scanned on demand · outcome `ok`

**Notes.** A first attempt using makeTimeseries with a status_transition filter returned an almost entirely null series and was discarded. Binning on event.start returns a dense distribution. Buckets can predate the window because a problem active in the window may have started earlier - the UI states this explicitly rather than silently clipping it.

#### `prob.status.rows`

**Purpose.** Problems by category and the 3-hour slot each began in, with how many of them are still open — the status rows of Dynatrace Intelligence, one bar per slot. One row per problem (duplicates and repeated records left out).

**Shape.** table · **Visualization.** Status rows (bars per 3-hour slot) · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| dedup event.id, sort: {timestamp desc}
| summarize problems = count(), open = countIf(event.status == "ACTIVE"), by: {category = event.category, slot = bin(event.start, 3h)}
| sort category asc, slot asc
```

**Validation.** 2026-11-22 in `internal-lab` · 205 records · 286 MB scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 7 days) after a 0.08–1.7 GiB estimate the owner approved: 0.27 GiB scanned, 205 rows over four categories (AVAILABILITY, ERROR, RESOURCE_CONTENTION, SLOWDOWN). Slots can predate the window (a problem still open that began earlier); the rows draw only the window and say so.

#### `prob.mttx`

**Purpose.** Mean, median and 90th-percentile time to resolve per problem category, plus total accumulated problem time. This is the measured MTTR of the environment.

**Shape.** table · **Visualization.** SingleValue row + DataTable · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| filter event.status == "CLOSED" and isNotNull(resolved_problem_duration)
| summarize problems = count(),
    mttrNs = avg(resolved_problem_duration),
    medianNs = percentile(resolved_problem_duration, 50),
    p90Ns = percentile(resolved_problem_duration, 90),
    totalNs = sum(resolved_problem_duration),
    by:{event.category}
| sort totalNs desc
```

**Validation.** 2026-08-31 in `internal-lab` · 4 records · 470 MB scanned on demand · outcome `ok`

**Notes.** Durations are returned as raw nanoseconds and formatted in the UI. An earlier version divided inside DQL to get hours and silently truncated to integers (11 instead of 11.5), because resolved_problem_duration is a long. Keeping the native unit and formatting client-side avoids the whole class of problem. Real values observed: MTTR 11.5 h for ERROR, 18.9 h for RESOURCE_CONTENTION, with medians well under an hour - most problems close quickly and a long tail drags the mean up.

#### `prob.exposure`

**Purpose.** Currently open problems and the time they have accumulated while open. This is the observed basis for any operational-exposure statement.

**Shape.** scalar · **Visualization.** SingleValue tiles · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| filter event.status == "ACTIVE"
| fieldsAdd openNs = now() - event.start
| summarize activeProblems = count(),
    totalOpenNs = sum(openNs),
    avgOpenNs = avg(openNs),
    oldestOpenNs = max(openNs)
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 470 MB scanned on demand · outcome `ok`

**Notes.** Observed: 110 open problems accumulating 18,247 problem-hours, the oldest open for 1,419 hours (59 days). Open time is computed against now(), so it grows until the problem closes. These hours are an observation; converting them into money requires a rate the user supplies.

#### `prob.exposure.rca`

**Purpose.** Open problems with a root cause named by Dynatrace Intelligence and the time they have accumulated while open — the basis of the cost per hour of an open problem.

**Shape.** scalar · **Visualization.** Cost basis · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| filter event.status == "ACTIVE"
| filter isNotNull(root_cause_entity_id)
| fieldsAdd openNs = now() - event.start
| summarize activeProblems = count(),
    totalOpenNs = sum(openNs),
    avgOpenNs = avg(openNs),
    oldestOpenNs = max(openNs)
```

**Validation.** 2026-11-23 in `internal-lab` · 1 records · 288 MB scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 7 days: 1 of the 109 open problems has a named root cause (of 1,438 problems, 76 have one) — the cost no longer counts problems without a cause.

#### `prob.mttx.rca`

**Purpose.** Resolved problems with a root cause named by Dynatrace Intelligence, per category, with their total time — the basis of the cost of resolved problem time and of downtime.

**Shape.** table · **Visualization.** Cost basis · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| filter event.status == "CLOSED" and isNotNull(resolved_problem_duration)
| filter isNotNull(root_cause_entity_id)
| summarize problems = count(),
    mttrNs = avg(resolved_problem_duration),
    medianNs = percentile(resolved_problem_duration, 50),
    p90Ns = percentile(resolved_problem_duration, 90),
    totalNs = sum(resolved_problem_duration),
    by:{event.category}
| sort totalNs desc
```

**Validation.** 2026-11-23 in `internal-lab` · 4 records · 288 MB scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 7 days: 4 categories (ERROR 40, SLOWDOWN 19, AVAILABILITY and RESOURCE_CONTENTION) of resolved problems with a named root cause.

#### `prob.topentities`

**Purpose.** Entities appearing in the most problems. Answers "where is the pain concentrated" without needing a topology graph.

**Shape.** table · **Visualization.** CategoricalBarChart + DataTable · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| expand affected = affected_entity_names
| summarize problems = count(),
    categories = countDistinctExact(event.category),
    lastSeen = max(timestamp),
    by:{affected}
| sort problems desc
| limit 15
```

**Validation.** 2026-08-31 in `internal-lab` · 15 records · 470 MB scanned on demand · outcome `ok`

**Notes.** Uses expand on the affected_entity_names array, so a problem affecting several entities counts once per entity. That is intended here - the question is which entity is involved most often, not how many problems exist. Real top entity observed with 344 problems in 7 days.

#### `prob.topentities.total`

**Purpose.** Exact count of distinct entities that Dynatrace Intelligence attached to a problem, and the problem-entity links they account for. The ranked list shows only the 15 most affected.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| expand affected = affected_entity_names
| summarize entities = countDistinctExact(affected), problems = count()
```

**Validation.** 2026-10-04 in `internal-lab` · 1 records · 342 MB scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 7 d: 134 distinct affected entities across 2,818 problem-entity links (the list showed 15). Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 7 d, 117 runs).

#### `rca.top`

**Purpose.** The most impactful problems of the last 15 days, ranked so the War Room can open on the single incident that best demonstrates Dynatrace Intelligence root-cause analysis: root-caused first, then by breadth of affected entities, then by duration. Carries the full Dynatrace Intelligence detail — root-cause entity, affected/related entity trail, K8s context and the markdown RCA narrative — for the top few.

**Shape.** table · **Visualization.** War Room incident + root-cause trail · **Window.** timeframe.pinned.15d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| fieldsAdd affectedCount = arraySize(affected_entity_names)
| fieldsAdd durationNs = coalesce(resolved_problem_duration, now() - event.start)
| fieldsAdd hasRootCause = if(isNotNull(root_cause_entity_name), 1, else: 0)
| fieldsAdd serviceRca = if((event.category == "SLOWDOWN" or event.category == "ERROR") and isNotNull(root_cause_entity_name), 1, else: 0)
| fields displayId = display_id, name = event.name, category = event.category,
    status = event.status, severity = event.severity, impact = dt.davis.impact_level,
    affectedNames = affected_entity_names, affectedTypes = affected_entity_types,
    relatedNames = related_entity_names, affectedIds = affected_entity_ids,
    relatedIds = related_entity_ids, rootCauseName = root_cause_entity_name,
    rootCauseId = root_cause_entity_id, eventId = event.id, start = event.start,
    end = event.end, durationNs, affectedCount, hasRootCause, serviceRca,
    cluster = k8s.cluster.name, namespace = k8s.namespace.name,
    workload = k8s.workload.name, description = event.description
| sort serviceRca desc, hasRootCause desc, affectedCount desc, durationNs desc
| limit 8
```

**Validation.** 2026-08-31 in `internal-lab` · 8 records · 652 MB scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl (2026-09-09): top incident P-26086733 "Response time degradation" (SLOWDOWN), root cause easytrade_offer_service, 5 affected services, K8s namespace easytrade, with a full markdown event.description RCA narrative. Ranking is deterministic and cross-tenant. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 15 d, 102 runs).

#### `rca.kpi`

**Purpose.** Environment-wide problem KPIs over the 15-day RCA window: total problems, how many Dynatrace Intelligence root-caused automatically, how many are still active and the average number of entities each problem touched.

**Shape.** scalar · **Visualization.** SingleValue tiles · **Window.** timeframe.pinned.15d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| summarize total = count(),
    rootCaused = countIf(isNotNull(root_cause_entity_name)),
    active = countIf(event.status == "ACTIVE"),
    resolved = countIf(event.status == "CLOSED"),
    avgAffected = avg(arraySize(affected_entity_names))
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 650 MB scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl (2026-09-09): 9,485 problems in 15 days, 161 root-caused, 102 active. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 15 d, 9 runs).

#### `rca.trend`

**Purpose.** A 7-day daily trend of the RCA headline numbers — problems opened, how many Dynatrace Intelligence root-caused and the average entities touched per day — so the key tiles can carry a micro-sparkline showing direction. Aggregate counts only.

**Shape.** table · **Visualization.** Sparklines under the KPI tiles · **Window.** timeframe.pinned.7d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| summarize opened = count(),
    rootCaused = countIf(isNotNull(root_cause_entity_name)),
    avgAffected = avg(arraySize(affected_entity_names)),
    by:{ day = bin(event.start, 1d) }
| sort day asc
```

**Validation.** 2026-08-31 in `internal-lab` · 8 records · 339 MB scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl (2026-09-10): 7 daily buckets, ~700–830 problems/day, 6–19 root-caused/day, avgAffected ~1.0 — a genuine daily series for the sparklines. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 7 d, 9 runs).

#### `rca.catmix`

**Purpose.** The mix of Dynatrace Intelligence problems by category over the 15-day window (availability, error, slowdown, resource, custom) — an executive read on what kind of problems dominate the environment. Aggregate counts only.

**Shape.** table · **Visualization.** Problem-mix bars · **Window.** timeframe.pinned.15d

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| summarize count = count(), by:{ category = event.category }
| sort count desc
```

**Validation.** 2026-08-31 in `internal-lab` · 5 records · 650 MB scanned on demand · outcome `ok`

**Notes.** Validated live via dtctl (2026-09-10): AVAILABILITY ~3.5k, ERROR ~2.7k, RESOURCE ~0.9k, SLOWDOWN ~0.6k, CUSTOM_ALERT ~7 — a genuine category breakdown. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 15 d, 9 runs).

#### `prob.poc.daily`

**Purpose.** Problems that began on each day of the PoC, with how many closed, their total time to resolve and how many had a root cause, so the first week can be compared with the latest.

**Shape.** table · **Visualization.** PoC Timeline: first week against the latest · **Window.** timeframe.poc.since

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| fieldsAdd closed = event.status == "CLOSED" and isNotNull(resolved_problem_duration)
| summarize opened = count(),
    closedCount = countIf(closed),
    closedNs = sum(if(closed, resolved_problem_duration)),
    rootCaused = countIf(isNotNull(root_cause_entity_name)),
    by:{day = bin(event.start, 1d)}
| sort day asc
```

**Validation.** 2026-10-05 in `internal-lab` · 38 records · 1.7 GB scanned on demand · outcome `ok`

**Notes.** Daily bins on event.start over 30 days. The duration sum is `sum(if(closed, resolved_problem_duration))` with no else branch: with `else: 0` it mixed a duration with a number and every day that still had an open problem summed to null. Days before the start date appear (a problem active in the window may have begun earlier) and the app drops them. 0 bytes on the validation tenant. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, since the PoC start (up to 39 d), 21 runs).

#### `rca.callers`

**Purpose.** The callers of an incident's root-cause service with their requests and failures over the incident's own window, so a database root cause opens the caller that failed most. Also the evidence of the root-cause screenshot (B3).

**Shape.** table · **Visualization.** RCA trail links and the root-cause analysis slide · **Window.** timeframe.caller.incident

```dql
timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}
| lookup [fetch dt.entity.service | filter id == {{rootId}} | fieldsAdd rootType = serviceType | expand caller = called_by[dt.entity.service] | fields caller, rootType], sourceField: dt.entity.service, lookupField: caller, prefix: "root."
| filter isNotNull(root.caller)
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), rootType = root.rootType
| fields id, name, requests, failures, rootType
| sort failures desc, requests desc
| limit 5
```

**Validation.** 2026-10-05 in `internal-lab` · 4 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated on the validation tenant: metrics and the entity model, 0 bytes; 4 callers of the DATABASE_SERVICE root, easyTradeManager 341 failures of 12,344 requests, then 14, 3 and 1. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder buildRootCallersDql (models/trailLinks.ts), which the deck also ran as ev.incident.callers (A2), validated on 2026-10-05.

#### `rca.edges`

**Purpose.** The calls between an incident's affected services (and its root cause), read from the entity model, so the propagation draws each hop from the service it reached — never a link the platform did not record.

**Shape.** table · **Visualization.** RCA propagation graph (the links between hops) · **Window.** timeframe.caller.incident

```dql
fetch dt.entity.service
| filter in(id, array({{serviceIds}}))
| expand callee = calls[dt.entity.service]
| filter in(callee, array({{serviceIds}}))
| fields from = toString(id), to = toString(callee)
| limit 200
```

**Validation.** 2026-11-21 in `internal-lab` · 3 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant with the owner's approval (v5 proposal) after a 0 B estimate (entity model, zero-rated): over four services (easyTradeManager, OrderController and two callees) it returned the 3 calls among them, 0 bytes scanned, 4 records read, 197 ms.

#### `ev.problem.events`

**Purpose.** The Dynatrace Intelligence events grouped in one problem, then the problem row itself (users, event count, impact, status), read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Problem analysis slide (timeline of the grouped events) · **Window.** timeframe.caller.evidence

```dql
fetch dt.davis.events
| lookup [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | filter event.id == {{eventId}} | sort timestamp desc | limit 1 | expand eid = dt.davis.event_ids | fields eid], sourceField: event.id, lookupField: eid, prefix: "p."
| filter isNotNull(p.eid)
| dedup event.id, sort: {timestamp desc}
| fieldsAdd source = toString(dt.source_entity), sourceName = coalesce(dt.entity.service.name, dt.entity.application.name), detail = substring(event.description, from: 0, to: 160), writtenAt = timestamp
| fields event.id, event.name, event.category, event.start, event.end, writtenAt, source, sourceName, detail
| sort event.start asc
| limit 12
| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | filter event.id == {{eventId}} | sort timestamp desc | limit 1 | fieldsAdd isProblem = true, users = toLong(dt.davis.affected_users_count), eventCount = arraySize(dt.davis.event_ids), impact = dt.davis.impact_level, problemStatus = event.status, severity = event.severity, pStart = event.start, pEnd = event.end | fields isProblem, users, eventCount, impact, problemStatus, severity, pStart, pEnd]
```

**Validation.** 2026-10-05 in `internal-lab` · 6 records · 558 MB scanned on demand · outcome `ok`

**Notes.** A1: 5 events and the problem row of P-260914359 (users 52, CLOSED), all written 23:11:55Z; window 21:57–00:09Z. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B1 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, the incident, up to 17 h observed, 24 runs).

#### `ev.problem.recurrence`

**Purpose.** The root causes with most problems, this root's own problems with their median and p90 duration, and the totals of the window, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Problem analysis slide (recurrence) · **Window.** timeframe.caller.evidence

```dql
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate) and isNotNull(root_cause_entity_id)
| dedup event.id, sort: {timestamp desc}
| summarize problems = count(), medianMin = median(toLong(resolved_problem_duration)) / 60000000000, rankName = takeFirst(root_cause_entity_name), by: {rootId = root_cause_entity_id}
| sort problems desc
| limit 3
| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) and root_cause_entity_id == {{rootId}} | dedup event.id, sort: {timestamp desc} | summarize problems = count(), closed = countIf(event.status == "CLOSED"), medianMin = median(toLong(resolved_problem_duration)) / 60000000000, p90Min = percentile(toLong(resolved_problem_duration), 90) / 60000000000 | fieldsAdd isAnchor = true]
| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | dedup event.id, sort: {timestamp desc} | summarize problems = count(), rootCaused = countIf(isNotNull(root_cause_entity_id)), medianMin = median(toLong(resolved_problem_duration)) / 60000000000 | fieldsAdd isTotal = true]
```

**Validation.** 2026-10-05 in `internal-lab` · 5 records · not captured scanned on demand · outcome `ok`

**Notes.** A9 over 7 days (the connector caps at 7; the app reads 15): root 6 problems, rank 1, 3.0× the next; 2,505 problems, 22 root-caused. Row count not recorded: the figure is the shape’s ceiling (three ranked roots, the anchor row and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B2 validated on 2026-10-05.

#### `ev.entity.events`

**Purpose.** The Dynatrace Intelligence events on one entity, as their source or among the affected, counted by category with the latest start, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Failing-service screenshot analysis slide (Dynatrace Intelligence events) · **Window.** timeframe.caller.evidence

```dql
fetch dt.davis.events
| filter toString(dt.source_entity) == {{entityId}} or in({{entityId}}, affected_entity_ids)
| dedup event.id, sort: {timestamp desc}
| summarize events = count(), byCategory = collectDistinct(event.category), last = max(event.start), names = collectDistinct(event.name)
```

**Validation.** 2026-10-05 in `internal-lab` · 1 records · not captured scanned on demand · outcome `ok`

**Notes.** A14 over 24 h: 8 events on BrokerService (ERROR, SLOWDOWN), the last at 18:02Z. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B9 validated on 2026-10-05.

#### `triage.problem`

**Purpose.** The problem a workflow hands to the PoC triage action (its event id from the trigger): name, category, status, root cause, affected and related entities and the Kubernetes context, as the RCA page reads them — the latest record of it.

**Shape.** table · **Visualization.** PoC triage workflow action (its e-mail summary) · **Window.** timeframe.caller.triage

```dql
fetch dt.davis.problems
| filter not dt.davis.is_duplicate
| filter event.id == {{problemId}}
| sort timestamp desc
| limit 1
| fieldsAdd affectedCount = arraySize(affected_entity_names)
| fieldsAdd durationNs = coalesce(resolved_problem_duration, now() - event.start)
| fields displayId = display_id, name = event.name, category = event.category,
    status = event.status, severity = event.severity, impact = dt.davis.impact_level,
    affectedNames = affected_entity_names, affectedTypes = affected_entity_types,
    relatedNames = related_entity_names, affectedIds = affected_entity_ids,
    relatedIds = related_entity_ids, rootCauseName = root_cause_entity_name,
    rootCauseId = root_cause_entity_id, eventId = event.id, start = event.start,
    end = event.end, durationNs, affectedCount,
    cluster = k8s.cluster.name, namespace = k8s.namespace.name,
    workload = k8s.workload.name
```

**Validation.** 2026-11-22 in `internal-lab` · 1 records · 21.0 MB scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 24 hours, one open CPU-saturation problem that began 20 days before): 0.015 GiB, one row with its root cause and affected host — the latest record of a long problem is inside the day. Re-run with the duplicate filter the same day: 0.020 GiB in 47 ms, the same row.

### processes

#### `proc.technologies`

**Purpose.** Technology and runtime version inventory discovered automatically, including edition and version where the platform reports them.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
fetch dt.entity.process_group_instance
| expand softwareTechnologies
| summarize instances = count(), by:{softwareTechnologies}
| sort instances desc
```

**Validation.** 2026-08-31 in `internal-lab` · 30 records · 0 B scanned on demand · outcome `ok`

**Notes.** Real versions surfaced, e.g. Spring Boot 3.2.0, Tomcat 10.1.16.0, Node.js 24.18.1, Kafka 3.6.0 and Java 1.8.0_292. Version strings are reported verbatim; no end-of-support claim is derived from them.

### security

#### `sec.vulnerabilities`

**Purpose.** Current open, non-muted runtime vulnerabilities, deduplicated to their latest state per affected entity and rolled up per vulnerability. Carries the Security Score, the technology stack, and the exploit / public-exposure / vulnerable-function signals that drive remediation priority.

**Shape.** table · **Visualization.** Top vulnerabilities table + remediation queue · **Window.** timeframe.pinned.30m

```dql
fetch security.events
| filter event.provider == "Dynatrace"
| filter in(event.type, {"VULNERABILITY_STATE_REPORT_EVENT",
    "VULNERABILITY_STATUS_CHANGE_EVENT", "VULNERABILITY_TRACKING_LINK_CHANGE_EVENT"})
    and event.level == "ENTITY"
| dedup {vulnerability.display_id, affected_entity.id}, sort:{timestamp desc}
| summarize {
    title = takeFirst(vulnerability.title),
    cve = takeFirst(vulnerability.references.cve),
    stack = takeAny(vulnerability.stack),
    score = round(takeMax(if(vulnerability.mute.status != "MUTED", vulnerability.risk.score, else:0)), decimals:1),
    muteStatuses = collectDistinct(vulnerability.mute.status),
    resolutionStatuses = collectDistinct(vulnerability.resolution.status),
    functionStatuses = collectDistinct(vulnerability.davis_assessment.vulnerable_function_status),
    exposureStatuses = collectDistinct(vulnerability.davis_assessment.exposure_status),
    exploitStatuses = collectDistinct(vulnerability.davis_assessment.exploit_status),
    entityNames = collectDistinct(affected_entity.name)
  }, by: {vulnerability.display_id, vulnerability.id}
| fieldsAdd resolutionStatus = if(in("OPEN", resolutionStatuses), "OPEN", else:"RESOLVED"),
    muteStatus = if(in("NOT_MUTED", muteStatuses), "NOT_MUTED", else:"MUTED"),
    level = if(score >= 9, "CRITICAL", else:if(score >= 7, "HIGH",
        else:if(score >= 4, "MEDIUM", else:if(score >= 0.1, "LOW", else:"NONE")))),
    functionStatus = if(in("IN_USE", functionStatuses), "IN_USE", else:"NOT_IN_USE"),
    exposureStatus = if(in("PUBLIC_NETWORK", exposureStatuses), "PUBLIC_NETWORK", else:"NOT_PUBLIC"),
    exploitStatus = if(in("AVAILABLE", exploitStatuses), "AVAILABLE", else:"NOT_AVAILABLE")
| filter resolutionStatus == "OPEN" and muteStatus != "MUTED"
| fields displayId = vulnerability.display_id, title, cve, technology = stack,
    score, level, functionStatus, exposureStatus, exploitStatus, entityNames
| sort score desc
| limit 500
```

**Validation.** 2026-08-31 in `internal-lab` · 0 records · 120 MB scanned on demand · outcome `no-permission`

**Notes.** The detail list only: the highest-risk vulnerabilities by Davis risk score, capped at 500 rows. It is never summed or counted for a total — every total, share and severity count comes from sec.posture, which aggregates the same rollup over all of them. Same rollup as the operator-supplied best-practice pattern (event.provider == "Dynatrace", the three vulnerability event types at ENTITY level, dedup by {display_id, affected_entity.id} to the latest state, risk level from the Davis risk.score, OPEN/NOT_MUTED only). Could not be run from here: the MCP validating identity lacks storage:security.events:read; the reference dashboard on the validation tenant reports 508 open vulnerabilities, which is why a 500-row cap had to stop being a total. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 30 min (shared head), 125 runs).

#### `sec.posture`

**Purpose.** Exact vulnerability posture: how many open, non-muted vulnerabilities exist in total, by severity and by technology stack, and how many are exploitable, publicly exposed, in use or all three at once. Aggregated in the query over every vulnerability, so no row cap can turn a total into a floor.

**Shape.** table · **Visualization.** Severity stack + technology bars + headline totals · **Window.** timeframe.pinned.30m

```dql
fetch security.events
| filter event.provider == "Dynatrace"
| filter in(event.type, {"VULNERABILITY_STATE_REPORT_EVENT",
    "VULNERABILITY_STATUS_CHANGE_EVENT", "VULNERABILITY_TRACKING_LINK_CHANGE_EVENT"})
    and event.level == "ENTITY"
| dedup {vulnerability.display_id, affected_entity.id}, sort:{timestamp desc}
| summarize {
    title = takeFirst(vulnerability.title),
    cve = takeFirst(vulnerability.references.cve),
    stack = takeAny(vulnerability.stack),
    score = round(takeMax(if(vulnerability.mute.status != "MUTED", vulnerability.risk.score, else:0)), decimals:1),
    muteStatuses = collectDistinct(vulnerability.mute.status),
    resolutionStatuses = collectDistinct(vulnerability.resolution.status),
    functionStatuses = collectDistinct(vulnerability.davis_assessment.vulnerable_function_status),
    exposureStatuses = collectDistinct(vulnerability.davis_assessment.exposure_status),
    exploitStatuses = collectDistinct(vulnerability.davis_assessment.exploit_status),
    entityNames = collectDistinct(affected_entity.name)
  }, by: {vulnerability.display_id, vulnerability.id}
| fieldsAdd resolutionStatus = if(in("OPEN", resolutionStatuses), "OPEN", else:"RESOLVED"),
    muteStatus = if(in("NOT_MUTED", muteStatuses), "NOT_MUTED", else:"MUTED"),
    level = if(score >= 9, "CRITICAL", else:if(score >= 7, "HIGH",
        else:if(score >= 4, "MEDIUM", else:if(score >= 0.1, "LOW", else:"NONE")))),
    functionStatus = if(in("IN_USE", functionStatuses), "IN_USE", else:"NOT_IN_USE"),
    exposureStatus = if(in("PUBLIC_NETWORK", exposureStatuses), "PUBLIC_NETWORK", else:"NOT_PUBLIC"),
    exploitStatus = if(in("AVAILABLE", exploitStatuses), "AVAILABLE", else:"NOT_AVAILABLE")
| filter resolutionStatus == "OPEN" and muteStatus != "MUTED"
| summarize {
    vulnerabilities = count(),
    actNow = countIf(exploitStatus == "AVAILABLE" and exposureStatus == "PUBLIC_NETWORK" and functionStatus == "IN_USE"),
    exploitable = countIf(exploitStatus == "AVAILABLE"),
    publicExposed = countIf(exposureStatus == "PUBLIC_NETWORK"),
    inUse = countIf(functionStatus == "IN_USE"),
    exploitPublic = countIf(exploitStatus == "AVAILABLE" and exposureStatus == "PUBLIC_NETWORK"),
    exploitInUse = countIf(exploitStatus == "AVAILABLE" and functionStatus == "IN_USE"),
    publicInUse = countIf(exposureStatus == "PUBLIC_NETWORK" and functionStatus == "IN_USE")
  }, by: {level, technology = stack}
```

**Validation.** 2026-08-31 in `internal-lab` · 0 records · 120 MB scanned on demand · outcome `no-permission`

**Notes.** One row per severity level and technology stack (a handful, never near any limit), each carrying the exact count and the exploit / public-exposure / in-use counts, so the totals are sums of exact counts over every open vulnerability. The rollup is the same text as sec.vulnerabilities and the tail follows the sec_rva_levels aggregation of the operator-supplied pattern. Could not be run from here: the MCP validating identity lacks storage:security.events:read, so it is checked for shape against the list query and by the unit tests that feed its rows through the model. 3.2.6: three pair counts added (exploit + public, exploit + in use, public + in use) — the same countIf over the same derived fields — so "two of three signals" is exact by inclusion-exclusion. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 30 min (shared head), 125 runs).

#### `sec.context`

**Purpose.** For each open vulnerability, the vulnerable component and the services and workloads it reaches, so the top five fixes can say what to upgrade, where it runs and who answers for it.

**Shape.** table · **Visualization.** Security fix queue context · **Window.** timeframe.pinned.30m

```dql
fetch security.events
| filter event.provider == "Dynatrace"
| filter in(event.type, {"VULNERABILITY_STATE_REPORT_EVENT",
    "VULNERABILITY_STATUS_CHANGE_EVENT", "VULNERABILITY_TRACKING_LINK_CHANGE_EVENT"})
    and event.level == "ENTITY"
| dedup {vulnerability.display_id, affected_entity.id}, sort:{timestamp desc}
| summarize {
    title = takeFirst(vulnerability.title),
    cve = takeFirst(vulnerability.references.cve),
    stack = takeAny(vulnerability.stack),
    score = round(takeMax(if(vulnerability.mute.status != "MUTED", vulnerability.risk.score, else:0)), decimals:1),
    muteStatuses = collectDistinct(vulnerability.mute.status),
    resolutionStatuses = collectDistinct(vulnerability.resolution.status),
    functionStatuses = collectDistinct(vulnerability.davis_assessment.vulnerable_function_status),
    exposureStatuses = collectDistinct(vulnerability.davis_assessment.exposure_status),
    exploitStatuses = collectDistinct(vulnerability.davis_assessment.exploit_status),
    components = collectDistinct(affected_entity.vulnerable_component.short_name),
    servicesNested = collectArray(related_entities.services.names),
    workloadsNested = collectArray(related_entities.kubernetes_workloads.names),
    entityNames = collectDistinct(affected_entity.name)
  }, by: {vulnerability.display_id, vulnerability.id}
| fieldsAdd resolutionStatus = if(in("OPEN", resolutionStatuses), "OPEN", else:"RESOLVED"),
    muteStatus = if(in("NOT_MUTED", muteStatuses), "NOT_MUTED", else:"MUTED"),
    level = if(score >= 9, "CRITICAL", else:if(score >= 7, "HIGH",
        else:if(score >= 4, "MEDIUM", else:if(score >= 0.1, "LOW", else:"NONE")))),
    functionStatus = if(in("IN_USE", functionStatuses), "IN_USE", else:"NOT_IN_USE"),
    exposureStatus = if(in("PUBLIC_NETWORK", exposureStatuses), "PUBLIC_NETWORK", else:"NOT_PUBLIC"),
    exploitStatus = if(in("AVAILABLE", exploitStatuses), "AVAILABLE", else:"NOT_AVAILABLE")
| filter resolutionStatus == "OPEN" and muteStatus != "MUTED"
| fieldsAdd services = arrayDistinct(arrayFlatten(servicesNested)),
    workloads = arrayDistinct(arrayFlatten(workloadsNested))
| fields displayId = vulnerability.display_id, score, components, services, workloads
| sort score desc
| limit 500
```

**Validation.** 2026-10-05 in `internal-lab` · 0 records · 120 MB scanned on demand · outcome `no-permission`

**Notes.** The validation identity cannot read security.events (403), like sec.vulnerabilities. The added fields (affected_entity.vulnerable_component.short_name, related_entities.services.names, related_entities.kubernetes_workloads.names) follow the platform vulnerability-event schema; absent fields collect to empty lists, so the fix queue then shows the vulnerability without its component. Check on a tenant where storage:security.events:read is granted. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, 30 min (shared head), 125 runs).

### services

#### `svc.golden`

**Purpose.** Environment-wide request rate, failures and response time trend.

**Shape.** timeseries · **Visualization.** TimeseriesChart · **Window.** follows the app selector

```dql
timeseries {
    requests = sum(dt.service.request.count),
    failures = sum(dt.service.request.failure_count),
    responseTime = avg(dt.service.request.response_time)
  }, interval: 1h
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Real values observed: ~146k-232k requests/h; failures fell from 1696/h to 18/h across the window. response_time is reported in microseconds by the metric.

#### `svc.ranking`

**Purpose.** Per-service golden signals with a derived failure rate, to select which service is worth drilling into.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
timeseries {
    requests = sum(dt.service.request.count),
    failures = sum(dt.service.request.failure_count),
    responseTime = avg(dt.service.request.response_time)
  }, by:{dt.entity.service}, interval: 1h
| fieldsAdd name = entityName(dt.entity.service),
    totalRequests = arraySum(requests),
    totalFailures = arraySum(failures),
    avgResponseTimeUs = arrayAvg(responseTime)
| filter totalRequests > 0
| fieldsAdd failureRatePct = totalFailures * 100.0 / totalRequests
| fields name, serviceId = dt.entity.service, totalRequests, totalFailures,
    failureRatePct, avgResponseTimeUs
| sort totalRequests desc
| limit 50
```

**Validation.** 2026-08-31 in `internal-lab` · 10 records · 0 B scanned on demand · outcome `ok`

**Notes.** entityName() resolves service ids to names in-query. failureRatePct is a derived field and is labelled as derived in the UI.

#### `svc.ranking.total`

**Purpose.** Exact service counts over every service that handled traffic: how many, how many had at least one failure, how many are above the 1% review line, and the request-weighted response time. The ranked list shows only the 50 busiest.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
timeseries {
    requests = sum(dt.service.request.count),
    failures = sum(dt.service.request.failure_count),
    responseTime = avg(dt.service.request.response_time)
  }, by:{dt.entity.service}, interval: 1h
| fieldsAdd totalRequests = arraySum(requests), totalFailures = arraySum(failures),
    avgResponseTimeUs = arrayAvg(responseTime)
| filter totalRequests > 0
| summarize services = count(),
    failing = countIf(totalFailures > 0),
    aboveOnePct = countIf(totalFailures * 100.0 / totalRequests > 1),
    weightedResponseUs = sum(avgResponseTimeUs * totalRequests) / sum(totalRequests)
```

**Validation.** 2026-11-03 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 72 services with traffic, 23 with failures, 5 above 1%, 144 ms request-weighted response time. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).

#### `svc.breakdown`

**Purpose.** Service mix by type and instrumentation technology - what the platform detected on its own.

**Shape.** table · **Visualization.** DataTable / CategoricalBarChart · **Window.** follows the app selector

```dql
fetch dt.entity.service
| summarize services = count(), by:{serviceType, agentTechnologyType}
| sort services desc
```

**Validation.** 2026-08-31 in `internal-lab` · 13 records · 0 B scanned on demand · outcome `ok`

**Notes.** Returned 13 type/technology combinations across 71 services.

#### `ai.tokens`

**Purpose.** Tokens sent and received by the generative-AI clients of the environment over the window, by service, model and kind (input or output), from the OpenTelemetry GenAI metric gen_ai.client.token.usage.

**Shape.** table · **Visualization.** KPI tiles / DataTable · **Window.** follows the app selector

```dql
timeseries tokens = sum(gen_ai.client.token.usage), by: {service.name, gen_ai.request.model, gen_ai.token.type}
| fieldsAdd total = arraySum(tokens)
| fields service.name, gen_ai.request.model, gen_ai.token.type, total
| sort total desc
```

**Validation.** 2026-11-23 in `internal-lab` · 12 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 24 h at 0 B: 12 rows (4 services); about 184 million input tokens and 0.36 million output tokens, most of them from one desktop assistant; rows without a model where the client does not report one.

#### `ai.tokens.trend`

**Purpose.** Input and output tokens of the generative-AI clients over time (one series per kind), from gen_ai.client.token.usage.

**Shape.** timeseries · **Visualization.** Spectrum area chart · **Window.** follows the app selector

```dql
timeseries tokens = sum(gen_ai.client.token.usage), by: {gen_ai.token.type}
```

**Validation.** 2026-11-23 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 24 h at 0 B: two series (input, output), 10-minute bins.

#### `ai.calls`

**Purpose.** Calls to generative-AI models over the window, by service, model and error type, with their mean duration, from the OpenTelemetry GenAI metric gen_ai.client.operation.duration.

**Shape.** table · **Visualization.** DataTable · **Window.** follows the app selector

```dql
timeseries calls = sum(gen_ai.client.operation.duration, rollup: count), seconds = avg(gen_ai.client.operation.duration), by: {service.name, gen_ai.request.model, error.type}
| fieldsAdd calls = arraySum(calls), avgSeconds = arrayAvg(seconds)
| fields service.name, gen_ai.request.model, error.type, calls, avgSeconds
| sort calls desc
```

**Validation.** 2026-11-23 in `internal-lab` · 3 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated on the lab tenant over 24 h at 0 B: 3 rows, 5 calls in total with no error, 0.27–0.34 s on average.

#### `svc.totals`

**Purpose.** Estate-wide request and failure totals with the derived failure rate, so the services page opens with the overall picture before it ranks anything.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
timeseries {
    requests = sum(dt.service.request.count),
    failures = sum(dt.service.request.failure_count)
  }, interval: 1h
| fieldsAdd totalRequests = arraySum(requests), totalFailures = arraySum(failures)
| fieldsAdd failureRatePct =
    if(totalRequests > 0, totalFailures * 100.0 / totalRequests, else: 0.0)
| fields totalRequests, totalFailures, failureRatePct
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Observed on the validation tenant over 24 hours: 3,918,313 requests, 19,776 failures, 0.5047% failure rate. Metric query, so no on-demand Grail scan.

#### `svc.owners`

**Purpose.** The tags of every tagged service, from which the security fix queue reads an owner or team tag, or falls back to the Kubernetes namespace, labelled as such.

**Shape.** table · **Visualization.** Owner lookup (not shown on its own) · **Window.** follows the app selector

```dql
fetch dt.entity.service
| fields name = entity.name, tags
| filter isNotNull(tags) and arraySize(tags) > 0
```

**Validation.** 2026-10-05 in `internal-lab` · 5 records · 0 B scanned on demand · outcome `ok`

**Notes.** Entity model, 0 bytes. On the validation tenant the tags are Env:, k8s.namespace.name:, k8s.cluster.name: and kubernetes-pod: — no owner or team tag, so the queue shows the namespace there. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model, 3 runs).

#### `ev.service.minutes`

**Purpose.** Requests, failures and p90 response time per minute of up to six services, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** timeseries · **Visualization.** Root-cause and problem analysis slides (per-minute chart) · **Window.** timeframe.caller.evidence

```dql
timeseries { requests = sum(dt.service.request.count), failures = sum(dt.service.request.failure_count), p90 = percentile(dt.service.request.response_time, 90) }, by: {dt.entity.service}, filter: in(dt.entity.service, array({{serviceIds}})), interval: 1m
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), req = arraySum(requests), fail = arraySum(failures)
| fields id, name, timeframe, interval, requests, failures, p90, req, fail
```

**Validation.** 2026-10-05 in `internal-lab` · 2 records · 0 B scanned on demand · outcome `ok`

**Notes.** A3 over W, 1 minute: 70 points per service; TradeManagement 38,248 / 351, easyTradeManager 12,344 / 341. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B4 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.service.endpoints`

**Purpose.** Requests, failures and failure rate per endpoint of one service, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Root-cause analysis slide (endpoints) · **Window.** timeframe.caller.evidence

```dql
timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service, endpoint.name}, filter: in(dt.entity.service, array({{serviceId}}))
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), ratePct = round(100.0 * failures / requests, decimals: 2)
| fields id, name, endpoint.name, requests, failures, ratePct
| sort failures desc, requests desc
| limit 10
```

**Validation.** 2026-10-05 in `internal-lab` · 10 records · 0 B scanned on demand · outcome `ok`

**Notes.** A4 over W: GetPackages 166 / 5,776, GetProducts 165 / 5,775. Row count not recorded: the figure is the shape’s ceiling. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B5 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.service.screen`

**Purpose.** The numbers the service page shows: endpoints by median response time and one totals row, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Service screenshot analysis slide · **Window.** timeframe.caller.evidence

```dql
timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), p50 = percentile(dt.service.request.response_time, 50, scalar: true) }, by: {endpoint.name}, filter: dt.entity.service == {{serviceId}}
| fieldsAdd p50Ms = round(p50 / 1000, decimals: 2), failurePct = round(100.0 * failures / requests, decimals: 2)
| fields endpoint.name, requests, failures, failurePct, p50Ms
| sort p50Ms desc
| limit 10
| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), avgRt = avg(dt.service.request.response_time, scalar: true), p50All = percentile(dt.service.request.response_time, 50, scalar: true) }, filter: dt.entity.service == {{serviceId}} | fieldsAdd isTotal = true, failurePct = round(100.0 * failures / requests, decimals: 2), avgMs = round(avgRt / 1000, decimals: 1), p50Ms = round(p50All / 1000, decimals: 2)]
```

**Validation.** 2026-10-05 in `internal-lab` · 11 records · 0 B scanned on demand · outcome `ok`

**Notes.** A13 over now-30m resolved to 31 min: 6,004 requests, 7 failures, avg 485.9 ms, p50 2.78 ms. Row count not recorded: the figure is the shape’s ceiling (ten endpoints and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B8 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.failing.services`

**Purpose.** The services with most failures in excess of the environment rate, and the screenshot's own service as a tagged row, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Failing-service screenshot analysis slide · **Window.** timeframe.caller.evidence

```dql
timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}
| filter requests >= 500 and failures > 0
| fieldsAdd k = 1
| lookup [timeseries { r = sum(dt.service.request.count, scalar: true), f = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd k = 1, envRate = toDouble(f) / r | fields k, envRate, envRequests = r, envFailures = f], sourceField: k, lookupField: k, prefix: "env."
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), failurePct = round(100.0 * failures / requests, decimals: 2), excess = round(failures - requests * env.envRate, decimals: 0), timesEnv = round((toDouble(failures) / requests) / env.envRate, decimals: 1)
| sort failures - requests * env.envRate desc, id asc
| limit 5
| fields id, name, requests, failures, failurePct, excess, timesEnv, env.envRequests, env.envFailures
| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}, filter: dt.entity.service == {{serviceId}} | filter requests >= 500 and failures > 0 | fieldsAdd k = 1 | lookup [timeseries { r = sum(dt.service.request.count, scalar: true), f = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd k = 1, envRate = toDouble(f) / r | fields k, envRate, envRequests = r, envFailures = f], sourceField: k, lookupField: k, prefix: "env." | fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), failurePct = round(100.0 * failures / requests, decimals: 2), excess = round(failures - requests * env.envRate, decimals: 0), timesEnv = round((toDouble(failures) / requests) / env.envRate, decimals: 1), isSubject = true | fields id, name, requests, failures, failurePct, excess, timesEnv, env.envRequests, env.envFailures, isSubject]
```

**Validation.** 2026-10-05 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** A10 over 24 h: BrokerService 218 / 78,818, excess 196, 10.1× the environment; datadog-agent excess 144. 2026-10-06 on the lab tenant with the isSubject append: EasyTravelWebserver:9079 (9th by excess) returned as its own row, 197.1× the environment. Row count not recorded: the figure is the shape’s ceiling (five services and the subject row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B14 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.failing.endpoints`

**Purpose.** Failures, failure rate and latency per endpoint of the failing service, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Failing-service screenshot analysis slide (endpoints) · **Window.** timeframe.caller.evidence

```dql
timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), p50 = percentile(dt.service.request.response_time, 50, scalar: true), p90 = percentile(dt.service.request.response_time, 90, scalar: true) }, by: {endpoint.name}, filter: dt.entity.service == {{serviceId}}
| fieldsAdd failurePct = round(100.0 * failures / requests, decimals: 2), p50Ms = round(p50 / 1000, decimals: 1), p90Ms = round(p90 / 1000, decimals: 1)
| fields endpoint.name, requests, failures, failurePct, p50Ms, p90Ms
| sort failures desc
| limit 6
```

**Validation.** 2026-10-05 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** A15 over 24 h: GET v1/instrument 86 / 16,727; POST v1/trade/long/process 3.01 %, p50 6,682.5 ms. Row count not recorded: the figure is the shape’s ceiling. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B14b validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `ev.failed.endpoints`

**Purpose.** The endpoints with most failed requests in the screenshot's window, and the request and failure totals, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Failed-requests screenshot analysis slide · **Window.** timeframe.caller.evidence

```dql
timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service, endpoint.name}
| filter failures > 0
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), ratePct = round(100.0 * failures / requests, decimals: 2)
| fields id, name, endpoint.name, requests, failures, ratePct
| sort failures desc, requests desc
| limit 8
| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd isTotal = true]
```

**Validation.** 2026-10-05 in `internal-lab` · 9 records · 0 B scanned on demand · outcome `ok`

**Notes.** A11 over 2 h: 284 failed of 832,433; flagd EventStream 12 / 12. Row count not recorded: the figure is the shape’s ceiling (eight endpoints and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B16 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, metrics).

#### `slo.availability`

**Purpose.** The indicator of an availability SLO the SE creates on the PoC Builder: the share of a service’s requests without a failure, per minute — the form the platform’s SLO app writes. Evaluated by the platform, not read by this app.

**Shape.** timeseries · **Visualization.** SLO indicator (evaluated by the platform) · **Window.** timeframe.caller.slo

```dql
timeseries { total = sum(dt.service.request.count), failures = sum(dt.service.request.failure_count) }, by: { dt.entity.service }, filter: { dt.entity.service == {{serviceId}} }
| fieldsAdd sli = (total[] - failures[]) / total[] * 100
| fieldsAdd entityName(dt.entity.service)
| fieldsRemove total, failures
```

**Validation.** 2026-11-22 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 2 hours, one service): metrics, 0 bytes, one series of 100 % per minute. An SLO with this indicator was created on the lab, read back and removed the same day.

#### `slo.performance`

**Purpose.** The indicator of a performance SLO the SE creates on the PoC Builder: the share of minutes whose mean response time stays within 1 second for a service — the form the platform’s SLO app writes. Evaluated by the platform.

**Shape.** timeseries · **Visualization.** SLO indicator (evaluated by the platform) · **Window.** timeframe.caller.slo

```dql
timeseries total = avg(dt.service.request.response_time, default: 0), by: { dt.entity.service }, filter: { dt.entity.service == {{serviceId}} }
| fieldsAdd high = iCollectArray(if(total[] > 1000000, total[]))
| fieldsAdd low = iCollectArray(if(total[] <= 1000000, total[]))
| fieldsAdd highRespTimes = iCollectArray(if(isNull(high[]), 0, else: 1))
| fieldsAdd lowRespTimes = iCollectArray(if(isNull(low[]), 0, else: 1))
| fieldsAdd sli = 100 * (lowRespTimes[] / (lowRespTimes[] + highRespTimes[]))
| fieldsAdd entityName(dt.entity.service)
| fieldsRemove total, high, low, highRespTimes, lowRespTimes
```

**Validation.** 2026-11-22 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant (2026-11-22, last 2 hours, one service): metrics, 0 bytes, one series of 100 % per minute. A filter on the request duration inside the count returned nothing (not a dimension), so the indicator follows the platform SLO app’s own form; the line of 1 s is the app’s services.latency.attention.

### topology

#### `svc.topology`

**Purpose.** Service dependency attributes and database bindings, read from the entity model. No inferred or decorative edges.

**Shape.** table · **Visualization.** DataTable (hierarchical) · **Window.** follows the app selector

```dql
fetch dt.entity.service
| fields id, name = entity.name, serviceType, technologies = softwareTechnologies,
    databaseVendor, databaseName, databaseHosts = databaseHostNames,
    isExternal = isExternalService, publicDomain = publicDomainName, port
| sort name asc
```

**Validation.** 2026-08-31 in `internal-lab` · 71 records · 0 B scanned on demand · outcome `ok`

**Notes.** Relationship record fields (calls / called_by / runs_on) exist on the entity but are not rendered as a graph: no official Strato topology-graph component was confirmed, so dependencies are shown tabularly. Topology comes from the entity model plus the Smartscape arrays Davis attaches to problems. (The note that smartscape.nodes and smartscape.edges had been rejected outright was written before 3.2.1: the app does declare storage:smartscape:read and does read smartscapeNodes in cloud.services and lic.k8spods. Moving this entry to Smartscape is backlog TD-16/R17, not a platform refusal.)

#### `svc.topology.total`

**Purpose.** Exact service-topology counts over every service: how many exist, how many are bound to a data store (and how many distinct database vendors that spans), how many are external and how many are publicly reachable. The list is capped at 300 services by name.

**Shape.** scalar · **Visualization.** Summary tiles · **Window.** follows the app selector

```dql
fetch dt.entity.service
| summarize services = count(),
    withDatabase = countIf(isNotNull(databaseVendor)),
    external = countIf(isExternalService == true),
    publicDomain = countIf(isNotNull(publicDomainName)),
    vendors = countDistinctExact(databaseVendor)
```

**Validation.** 2026-08-31 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant: 71 services, 3 bound to a database, 6 external, 0 with a public domain. Entity model query, no Grail scan.

#### `svc.topology.mix`

**Purpose.** What the service topology is made of, counted over every service: the most common service types, technologies, database vendors and public domains. One row per entry, tagged with its tier, so the Smartscape view never describes only an alphabetical slice of the estate.

**Shape.** table · **Visualization.** Smartscape tiers · **Window.** follows the app selector

```dql
fetch dt.entity.service
| summarize services = count(), by:{label = serviceType}
| sort services desc
| limit 8
| fieldsAdd tier = "type"
| append [
    fetch dt.entity.service
    | expand tech = softwareTechnologies
    | fieldsAdd family = splitString(splitString(tech, ",")[0], ":")[1]
    | filter isNotNull(family)
    | summarize services = countDistinctExact(id), by:{label = family}
    | sort services desc
    | limit 8
    | fieldsAdd tier = "technology"
  ]
| append [
    fetch dt.entity.service
    | filter isNotNull(databaseVendor)
    | summarize services = count(), by:{label = databaseVendor}
    | sort services desc
    | limit 8
    | fieldsAdd tier = "database"
  ]
| append [
    fetch dt.entity.service
    | filter isNotNull(publicDomainName)
    | summarize services = count(), by:{label = publicDomainName}
    | sort services desc
    | limit 8
    | fieldsAdd tier = "domain"
  ]
```

**Validation.** 2026-08-31 in `internal-lab` · 18 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant: 7 service types (39 web-request services leading), 8 technologies, 3 database vendors, no public domains. Each tier is the top 8 over all services, each count exact. Entity model query, no Grail scan.

#### `svc.topology.calls`

**Purpose.** Who calls what, from the Smartscape call relationships of every service: the calls between service types and into each database vendor and messaging system, with how many services sit on each side. Measured edges, not a drawn hierarchy.

**Shape.** table · **Visualization.** Flow map (Smartscape calls) · **Window.** follows the app selector

```dql
fetch dt.entity.service
| fields id, source = serviceType, callee = calls[dt.entity.service]
| expand callee
| filter isNotNull(callee)
| lookup [ fetch dt.entity.service | fields id, targetType = serviceType, vendor = databaseVendor ],
    sourceField: callee, lookupField: id, fields: {targetType, vendor}
| fieldsAdd target = if(targetType == "DATABASE_SERVICE", coalesce(vendor, "DATABASE_SERVICE"), else: targetType)
| summarize calls = count(), callers = countDistinctExact(id), callees = countDistinctExact(callee),
    by:{source, target, targetType}
| fieldsAdd row = "link"
| append [
    fetch dt.entity.service
    | fields id, source = serviceType, callee = calls[dt.entity.service]
    | expand callee
    | filter isNotNull(callee)
    | summarize services = countDistinctExact(id), by:{source}
    | fieldsAdd row = "caller"
  ]
| append [
    fetch dt.entity.service
    | fields id, callee = calls[dt.entity.service]
    | expand callee
    | filter isNotNull(callee)
    | lookup [ fetch dt.entity.service | fields id, targetType = serviceType, vendor = databaseVendor ],
        sourceField: callee, lookupField: id, fields: {targetType, vendor}
    | fieldsAdd target = if(targetType == "DATABASE_SERVICE", coalesce(vendor, "DATABASE_SERVICE"), else: targetType)
    | summarize services = countDistinctExact(callee), by:{target, targetType}
    | fieldsAdd row = "callee"
  ]
| append [
    fetch dt.entity.service
    | summarize services = count(), withCalls = countIf(arraySize(calls[dt.entity.service]) > 0)
    | fieldsAdd row = "total"
  ]
```

**Validation.** 2026-10-04 in `internal-lab` · 21 records · 0 B scanned on demand · outcome `ok`

**Notes.** Validated live on the validation tenant over 24 h: 76 services, 23 with outgoing calls; 9 caller→callee type pairs (web request → web request 25 calls, → web service 11, → SQL Server 6, → PostgreSQL 2, queue listener → messaging 5…). The calls relationship is read from the entity model (0 bytes), unlike smartscapeEdges, which needs storage:smartscape:read. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model, 3 runs).

#### `ev.topology.blast`

**Purpose.** The services up to two hops above the root cause and the frontends at the top, counted by id, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Smartscape screenshot analysis slide (blast radius) · **Window.** timeframe.caller.evidence

```dql
fetch dt.entity.service
| filter id == {{rootId}}
| fieldsAdd rootType = serviceType
| expand hop1 = called_by[dt.entity.service]
| lookup [fetch dt.entity.service | fields id, entity.name, up = called_by[dt.entity.service], apps = called_by[dt.entity.application]], sourceField: hop1, lookupField: id, prefix: "h1."
| expand hop2 = h1.up
| lookup [fetch dt.entity.service | fields id, entity.name, apps = called_by[dt.entity.application]], sourceField: hop2, lookupField: id, prefix: "h2."
| summarize rootType = takeAny(rootType), hop1 = countDistinct(hop1), hop2 = countDistinct(hop2), hop1Ids = collectDistinct(hop1), hop2Ids = collectDistinct(hop2), appsNested = collectArray(arrayConcat(coalesce(h1.apps, array()), coalesce(h2.apps, array())))
| fieldsAdd apps = arrayDistinct(arrayFlatten(appsNested))
| fieldsAdd appCount = arraySize(apps)
| fieldsRemove appsNested
```

**Validation.** 2026-10-05 in `internal-lab` · 1 records · 0 B scanned on demand · outcome `ok`

**Notes.** A16: DATABASE_SERVICE root; 4 direct callers, 2 entry services, 1 frontend. TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B17 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model).

#### `ev.topology.hubs`

**Purpose.** The services with most connections in the entity model, and the totals of the model, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.

**Shape.** table · **Visualization.** Smartscape screenshot analysis slide (hubs) · **Window.** timeframe.caller.evidence

```dql
fetch dt.entity.service
| fieldsAdd callers = coalesce(arraySize(called_by[dt.entity.service]), 0), callees = coalesce(arraySize(calls[dt.entity.service]), 0)
| fieldsAdd degree = callers + callees
| fields id, entity.name, serviceType, callers, callees, degree
| sort degree desc
| limit 5
| append [fetch dt.entity.service | fieldsAdd d = coalesce(arraySize(called_by[dt.entity.service]), 0) + coalesce(arraySize(calls[dt.entity.service]), 0) | summarize services = count(), isolated = countIf(d == 0), dbServices = countIf(serviceType == "DATABASE_SERVICE") | fieldsAdd isTotal = true]
```

**Validation.** 2026-10-05 in `internal-lab` · 6 records · 0 B scanned on demand · outcome `ok`

**Notes.** A17: 94 services, 29 isolated, 7 database services; two BrokerService hubs told apart by id. Row count not recorded: the figure is the shape’s ceiling (five hubs and the totals row). TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder B18 validated on 2026-10-05. Cost measured 2026-11-16 from the app's own executions in dt.system.events (largest on-demand scan, entity model).

## Queries deliberately rejected during validation

Recorded because a rejected approach is evidence too.

| Attempted | Why it was rejected |
| --- | --- |
| `fetch smartscape.nodes` / `fetch smartscape.edges` | Returns `DATA_OBJECT_NOT_SUPPORTED` for user DQL, even though internal platform services query these tables. This is why topology is tabular rather than a graph. |
| `fetch metric.metadata` | Not a valid data object. Metric discovery uses `fetch metric.series` instead. |
| `fetch dt.davis.problems \| makeTimeseries count(), interval:6h` with a `status_transition` filter | Returned an almost entirely null series. Replaced with `summarize by:{bin(event.start, 6h)}`. |
| `fetch dt.system.buckets \| fields table` | The field is `dt.system.table`, not `table`. Confirmed with `describe`. |
| `fetch dt.entity.host \| fields hostGroup.name` | The field is `hostGroupName`. Confirmed with `describe`. |
