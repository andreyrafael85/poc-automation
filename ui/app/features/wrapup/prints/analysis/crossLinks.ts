import { entityType } from '../../../../utils/deepLinks';
import { printText } from '../text';
import type { AnalysisCtx, CrossLink, CrossLinkId, EvidenceBundle, EvidencePack, ShotKind, ShotPlan, ShotSlot, Sourced } from '../types';
import { anchorFor, serviceSignals, type SeriesRun } from './anomalies';
import { readOf, sourced } from './sourced';

/**
 * The links between the shots of the deck (3.2.7, spec §4.7), by entity id only — the lab has two
 * TradeManagement, two BrokerService and two datadog-agent entities, so a name never joins
 * anything. A link exists only when both of its shots are in the deck, and its `ref` is the target's
 * number over the kept pairs (01..N), so dropping a print renumbers every reference with it.
 *
 * Each link carries the facts the finding that cites it prints, keyed by that finding's i18n
 * param names (`{share}`, `{failures}`, `{eventAt}`…), already `Sourced`.
 */

type Facts = Record<string, Sourced<number | string>>;

/** The deck number of a shot: its 1-based position among the kept pairs, two digits. */
export function refOf(present: readonly string[], shotId: string): string | null {
  const index = present.indexOf(shotId);
  return index < 0 ? null : String(index + 1).padStart(2, '0');
}

/** A tenant name for a slide: redacted for the profile, cut. */
export function tenantName(text: string | null | undefined, ctx: AnalysisCtx, max = 60): string {
  return printText(text ?? '—', max, ctx.profile);
}

const shotOf = (plan: ShotPlan, present: readonly string[], kind: ShotKind): ShotSlot | null => plan.slots.find((slot) => slot.kind === kind && present.includes(slot.id)) ?? null;
const serviceIdOf = (slot: ShotSlot | null) => (slot?.subject.kind === 'service' ? slot.subject.serviceId : null);

/** The D1 minutes of the root service, read from whichever pack holds its per-minute series. */
export function rootOutage(bundle: EvidenceBundle, rootId: string | null): (SeriesRun & { serviceId: string }) | null {
  for (const pack of Object.values(bundle)) {
    for (const service of pack.services ?? []) {
      if (rootId !== null && service.id !== rootId) continue;
      const outage = serviceSignals(service, anchorFor(pack, service.requests)).outage;
      if (outage !== null) return { ...outage, serviceId: service.id };
    }
  }
  return null;
}

/** The first Davis event on a frontend (APPLICATION), from any pack that read the problem's events. */
export function frontendEvent(bundle: EvidenceBundle, applicationId: string | null): { startIso: string; name: string | null } | null {
  for (const pack of Object.values(bundle)) {
    const event = pack.problem?.events.find((item) => entityType(item.sourceId) === 'APPLICATION' && (applicationId === null || item.sourceId === applicationId));
    if (event !== undefined) return { startIso: event.startIso, name: event.sourceName };
  }
  return null;
}

/** The callers of the root (B3), from whichever pack read them. */
function callersOf(bundle: EvidenceBundle): NonNullable<EvidencePack['callers']> | null {
  for (const pack of Object.values(bundle)) if (pack.callers !== undefined) return pack.callers;
  return null;
}

/** Every link of the deck, numbered over `present` (shot ids in deck order). */
export function buildCrossLinks(bundle: EvidenceBundle, present: readonly string[], plan: ShotPlan, ctx: AnalysisCtx): CrossLink[] {
  const incident = plan.incident;
  const links: CrossLink[] = [];
  const add = (id: CrossLinkId, from: ShotSlot, to: ShotSlot, facts: Facts) => {
    const ref = refOf(present, to.id);
    if (ref !== null && present.includes(from.id)) links.push({ id, fromShotId: from.id, toShotId: to.id, ref, facts });
  };
  const problem = shotOf(plan, present, 'problem');
  const root = shotOf(plan, present, 'root-cause');
  const frontend = shotOf(plan, present, 'frontend');
  const k8s = shotOf(plan, present, 'k8s-cluster');
  const failing = shotOf(plan, present, 'failing-service');
  const failed = shotOf(plan, present, 'failed-requests');
  const logs = shotOf(plan, present, 'logs-errors');
  const topology = shotOf(plan, present, 'smartscape');
  const host = shotOf(plan, present, 'host');
  const callers = callersOf(bundle);
  const rootId = incident?.rootCauseId ?? null;
  const W = (pack: EvidencePack | undefined) => pack?.windows.incident ?? null;
  const text = (value: string, pack: EvidencePack | undefined) => sourced(value, 'dql', 'ev.incident.callers', W(pack), ctx);

  // X1 — problem ↔ root-cause: a database root shown through its top failing caller.
  const rootSubject = serviceIdOf(root);
  if (root !== null && problem !== null && callers !== null && callers.rootType === 'DATABASE_SERVICE' && callers.rows[0]?.id === rootSubject) {
    const top = callers.rows[0];
    const total = callers.rows.reduce((sum, row) => sum + (row.failures ?? 0), 0);
    const pack = bundle[root.id];
    const read = pack === undefined ? { partial: false, collectedAtIso: null } : readOf(pack, 'ev.incident.callers');
    if (top !== undefined && top.failures !== null && total > 0) {
      const dql = (value: number, unit: 'count' | 'pct') => sourced(value, 'dql', 'ev.incident.callers', W(pack), ctx, { unit, partial: read.partial, collectedAtIso: read.collectedAtIso });
      add('X1', root, problem, {
        caller: text(tenantName(top.name, ctx), pack),
        root: text(tenantName(incident?.rootCauseName, ctx), pack),
        failures: dql(top.failures, 'count'),
        total: dql(total, 'count'),
        share: dql((100 * top.failures) / total, 'pct'),
      });
    }
  }

  // X2 — failing-service ↔ root-cause: the failing service calls the root directly, or is the root.
  const failingId = serviceIdOf(failing);
  if (failing !== null && root !== null && failingId !== null && incident !== null && (failingId === rootId || (callers?.rows.some((row) => row.id === failingId) ?? false))) {
    const pack = bundle[failing.id];
    const name = pack?.failing?.rows.find((row) => row.id === failingId)?.name ?? failing.chosen?.entityName ?? failingId;
    add('X2', failing, root, {
      name: text(tenantName(name, ctx), pack),
      root: text(tenantName(incident.rootCauseName, ctx), pack),
      id: sourced(incident.displayId, 'davis', 'ev.problem.events', null, ctx),
    });
  }

  // X3 — problem ↔ frontend: the incident's application is the frontend shown; its event start.
  if (frontend !== null && problem !== null && frontend.subject.kind === 'frontend' && incident !== null) {
    const applicationId = frontend.subject.applicationId;
    if (frontend.subject.incidentBound || (applicationId !== null && incident.affectedIds.includes(applicationId))) {
      const event = frontendEvent(bundle, applicationId);
      if (event !== null) add('X3', frontend, problem, { eventAt: sourced(event.startIso, 'davis', 'ev.problem.events', bundle[problem.id]?.windows.events ?? null, ctx, { unit: 'instant' }) });
    }
  }

  // X4 — problem ↔ k8s: a restart in the incident's namespaces inside the minutes at 100 % failures.
  if (k8s !== null && problem !== null && k8s.subject.kind === 'k8s-cluster' && k8s.subject.incidentBound) {
    const outage = rootOutage(bundle, rootId) ?? rootOutage(bundle, null);
    const pack = bundle[k8s.id];
    if (outage !== null && pack?.k8s !== undefined) {
      const from = Date.parse(outage.fromIso);
      const to = Date.parse(outage.toIso) + 60_000;
      const hit = pack.k8s.incidentRestarts.find((row) => row.firstIso !== null && Date.parse(row.firstIso) >= from && Date.parse(row.firstIso) < to);
      if (hit !== undefined && hit.firstIso !== null) {
        const window = pack.windows.incident ?? null;
        add('X4', k8s, problem, {
          workload: sourced(tenantName(`${hit.workload} (${hit.namespace})`, ctx), 'dql', 'ev.k8s.incidentRestarts', window, ctx),
          count: sourced(hit.total, 'dql', 'ev.k8s.incidentRestarts', window, ctx),
          at: sourced(hit.firstIso, 'dql', 'ev.k8s.incidentRestarts', window, ctx, { unit: 'instant' }),
        });
      }
    }
  }

  // X5 — problem ↔ smartscape: the nodes of the predicted path Davis marked as affected.
  const blast = topology === null ? null : (bundle[topology.id]?.topology?.blast ?? null);
  if (topology !== null && problem !== null && incident !== null && blast !== null && rootId !== null) {
    const path = new Set([rootId, ...blast.hop1Ids, ...blast.hop2Ids, ...blast.apps]);
    const marked = [...path].filter((id) => incident.affectedIds.includes(id)).length;
    if (marked > 0) {
      const window = bundle[topology.id]?.windows.screen ?? null;
      add('X5', topology, problem, {
        count: sourced(marked, 'dql', 'ev.topology.blast', window, ctx),
        total: sourced(path.size, 'dql', 'ev.topology.blast', window, ctx),
        id: sourced(incident.displayId, 'davis', 'ev.problem.events', null, ctx),
      });
    }
  }

  // X6 — problem ↔ host: the host is one of the most frequent root causes in 15 days.
  if (host !== null && problem !== null && host.subject.kind === 'host') {
    const hostId = host.subject.hostId;
    const recurrence = bundle[problem.id]?.recurrence;
    const index = recurrence?.rank.findIndex((row) => row.id === hostId) ?? -1;
    const row = index >= 0 ? recurrence?.rank[index] : undefined;
    if (row !== undefined) {
      const window = bundle[problem.id]?.windows.recurrence ?? null;
      add('X6', host, problem, {
        host: sourced(tenantName(row.name, ctx), 'dql', 'ev.problem.recurrence', window, ctx),
        rank: sourced(index + 1, 'dql', 'ev.problem.recurrence', window, ctx),
        count: sourced(row.problems, 'dql', 'ev.problem.recurrence', window, ctx),
      });
    }
  }

  // X7 — failed-requests ↔ root-cause: the root-cause service's top incident endpoint fails now too.
  if (failed !== null && root !== null && rootSubject !== null && incident !== null) {
    const endpoints = bundle[root.id]?.endpoints?.filter((row) => row.serviceId === rootSubject) ?? [];
    const top = [...endpoints].sort((a, b) => b.failures - a.failures)[0];
    const now = bundle[failed.id]?.failed?.rows.find((row) => row.serviceId === rootSubject && row.endpoint === top?.endpoint);
    if (top !== undefined && now !== undefined && top.failures > 0) {
      const window = bundle[root.id]?.windows.incident ?? null;
      add('X7', failed, root, {
        endpoint: sourced(tenantName(top.endpoint, ctx), 'dql', 'ev.failed.endpoints', bundle[failed.id]?.windows.screen ?? null, ctx),
        name: sourced(tenantName(now.name, ctx), 'dql', 'ev.failed.endpoints', bundle[failed.id]?.windows.screen ?? null, ctx),
        count: sourced(top.failures, 'dql', 'ev.service.endpoints', window, ctx),
        id: sourced(incident.displayId, 'davis', 'ev.problem.events', null, ctx),
      });
    }
  }

  // X9 — logs ↔ problem: the incident's entities wrote no logs in its window (D17). Its finding names
  // the cluster to collect logs from, so an incident without one gives no link.
  const cluster = incident?.clusters[0];
  if (logs !== null && problem !== null && incident !== null && cluster !== undefined && bundle[logs.id]?.logs?.incidentLogCount === 0) {
    add('X9', logs, problem, {
      id: sourced(incident.displayId, 'davis', 'ev.problem.events', null, ctx),
      cluster: sourced(tenantName(cluster, ctx), 'davis', 'ev.problem.events', null, ctx),
    });
  }
  return links;
}

/** The link of an id that starts at a shot, if it survived the gating. */
export function linkFrom(links: readonly CrossLink[], id: CrossLinkId, shotId: string): CrossLink | null {
  return links.find((link) => link.id === id && link.fromShotId === shotId) ?? null;
}
