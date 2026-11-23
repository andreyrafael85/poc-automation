/**
 * The dynamic evidence queries of the real-prints deck (3.2.7) that the harness serves from its
 * fixtures: the ids `identifyEvidenceQuery` (ui/app/features/wrapup/prints/evidence/registry.ts)
 * resolves a DQL text to, in the registry's order.
 *
 * It must stay equal to the registry's `DYNAMIC_EVIDENCE_IDS` (`tests/prints.harness.test.ts`
 * checks it). B3 `ev.incident.callers` is not in it: its text is the trail's `rca.callers`, which
 * `mocks/react-hooks.mjs` resolves first with its own regex.
 *
 * Plain data in a `.mjs` (no TypeScript), so `capture.mjs` can read it in Node without a build.
 */

export const EVIDENCE_IDS = Object.freeze([
  'ev.problem.events',
  'ev.problem.recurrence',
  'ev.service.minutes',
  'ev.service.endpoints',
  'ev.service.screen',
  'ev.frontend.summary',
  'ev.frontend.minutes',
  'ev.k8s.capacity',
  'ev.k8s.workloads',
  'ev.k8s.churn',
  'ev.k8s.incidentRestarts',
  'ev.failing.services',
  'ev.failing.endpoints',
  'ev.entity.events',
  'ev.failed.endpoints',
  'ev.logs.errors',
  'ev.topology.blast',
  'ev.topology.hubs',
  'ev.host.cpu',
]);
