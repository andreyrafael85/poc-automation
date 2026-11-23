import { parseScreenTimeframe } from '../text';
import type { EvidenceWindow, IncidentSnapshot, LayoutKey, PrintRecord, WindowKind } from '../types';

/**
 * The time windows the evidence of the real-prints deck is read over (3.2.7, spec §4.1).
 *
 * Every number on an analysis slide is read over the same entity and the same window the screen
 * shows, so the windows are computed here, once, from data the app already holds: the incident's
 * own start and end, the start of its first correlated Davis event, the print's capture time and
 * the timeframe label the companion read on the screen. Never from the number inside `event.id`
 * (the first grouped event's start, not the problem's), and never from the clock of the render:
 * `now` is injected, so a window only moves on a deliberate refresh.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** W = anchor − 30 min … min(problem end ?? now, anchor + 6 h) + 15 min (capped at now). */
export const INCIDENT_LEAD_MS = 30 * MINUTE_MS;
export const INCIDENT_MAX_MS = 6 * HOUR_MS;
export const INCIDENT_TAIL_MS = 15 * MINUTE_MS;
/** The events window pads the problem by an hour each side, so it holds the records' write time. */
export const EVENTS_PAD_MS = HOUR_MS;
/** The same 15 days as `rca.top`. */
export const RECURRENCE_MS = 15 * DAY_MS;
/** The logs screen never reads more than six hours (the incident-logs rule of `catalog.test.ts`). */
export const LOGS_WINDOW_MAX_MS = 6 * HOUR_MS;
/** The one new logs query (B15) is requested over at most two hours, inside the 6 h guard (spec §4.2). */
export const LOGS_REQUEST_MAX_MS = 2 * HOUR_MS;

/**
 * The window each layout shows when the screen's own label was not read (`source` says how it is
 * known): the services, Kubernetes and vulnerabilities apps open on 30 minutes, Experience Vitals,
 * the request list, Logs and Smartscape on 2 hours. Logs, vulnerabilities and Smartscape carry
 * their window in the address (`url`); the others keep the user's persisted timeframe.
 */
export const SCREEN_FALLBACK: Readonly<Record<LayoutKey, { minutes: number; source: 'layout-default' | 'url' }>> = {
  'problems.detail': { minutes: 120, source: 'layout-default' },
  'services.details': { minutes: 30, source: 'layout-default' },
  'vitals.web': { minutes: 120, source: 'layout-default' },
  'k8s.cluster': { minutes: 30, source: 'layout-default' },
  'tracing.failedList': { minutes: 120, source: 'layout-default' },
  'logs.filter': { minutes: 120, source: 'url' },
  'smartscape.services': { minutes: 120, source: 'url' },
  'vulns.list': { minutes: 30, source: 'url' },
  'infraops.host': { minutes: 120, source: 'layout-default' },
  free: { minutes: 120, source: 'layout-default' },
};

/** Epoch ms of an ISO instant (Grail writes nanoseconds; `Date.parse` reads them), or NaN. */
export function instantMs(iso: string | null | undefined): number {
  return typeof iso === 'string' && iso !== '' ? Date.parse(iso) : Number.NaN;
}

function windowOf(kind: WindowKind, startMs: number, endMs: number, source: EvidenceWindow['source']): EvidenceWindow {
  const end = Math.max(endMs, startMs);
  return {
    kind,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(end).toISOString(),
    source,
    minutes: Math.round((end - startMs) / MINUTE_MS),
  };
}

/** The problem's start, or `now` when the snapshot carries no readable start. */
function problemStartMs(incident: IncidentSnapshot, now: number): number {
  const start = instantMs(incident.startIso);
  return Number.isFinite(start) ? Math.min(start, now) : now;
}

/** The problem's end, or `now` while it is open (or unreadable). */
function problemEndMs(incident: IncidentSnapshot, now: number): number {
  const end = instantMs(incident.endIso);
  return Number.isFinite(end) ? Math.min(end, now) : now;
}

/**
 * The one incident window W (D7). `anchor = min(problem.start, first correlated event.start)`;
 * `start = anchor − 30 min`; `end = min(problem.end ?? now, anchor + 6 h) + 15 min`, capped at now.
 * Without a first event (B1 not ok) the anchor is the problem's start, and the 30 minutes before it
 * are still the baseline. On P-260914359: 22:14–23:24 UTC (70 min).
 */
export function incidentWindow(incident: IncidentSnapshot, firstEventStartIso: string | null, now: number): EvidenceWindow {
  const problemStart = problemStartMs(incident, now);
  const firstEvent = instantMs(firstEventStartIso);
  const anchor = Number.isFinite(firstEvent) ? Math.min(problemStart, firstEvent) : problemStart;
  const start = anchor - INCIDENT_LEAD_MS;
  const end = Math.min(Math.min(problemEndMs(incident, now), anchor + INCIDENT_MAX_MS) + INCIDENT_TAIL_MS, now);
  return windowOf('incident', start, end, 'derived');
}

/** The anchor of W: its start plus the 30-minute lead (the end of the baseline). */
export function incidentAnchorMs(window: EvidenceWindow): number {
  return instantMs(window.startIso) + INCIDENT_LEAD_MS;
}

/** `[problem.start, problem.end ?? now]`: the window the Problems screen counts users and sessions over. */
export function problemWindow(incident: IncidentSnapshot, now: number): EvidenceWindow {
  return windowOf('problem', problemStartMs(incident, now), problemEndMs(incident, now), 'derived');
}

/**
 * `problem.start − 60 min … min(problem.end + 60 min, now)`. Davis writes the event records after
 * the fact (23:11:55Z for events that started at 22:44), so the window must reach past the end.
 */
export function eventsWindow(incident: IncidentSnapshot, now: number): EvidenceWindow {
  const start = problemStartMs(incident, now) - EVENTS_PAD_MS;
  const end = Number.isFinite(instantMs(incident.endIso)) ? Math.min(problemEndMs(incident, now) + EVENTS_PAD_MS, now) : now;
  return windowOf('events', start, end, 'derived');
}

/**
 * The window a screen shows: `[capturedAt − m, capturedAt]`, where `m` is read from the screen's
 * own timeframe label (`screen-label`) or, failing that, the layout's fallback (`layout-default`
 * or `url`). Before a capture it is `[now − m, now]` (a preview). Logs are capped at six hours.
 */
export function screenWindow(
  record: Pick<PrintRecord, 'layout' | 'capturedAtIso' | 'screenTimeframeLabel'> | null,
  layout: LayoutKey,
  now: number,
): EvidenceWindow {
  const fallback = SCREEN_FALLBACK[record?.layout ?? layout];
  const read = parseScreenTimeframe(record?.screenTimeframeLabel);
  let minutes = read ?? fallback.minutes;
  if ((record?.layout ?? layout) === 'logs.filter') minutes = Math.min(minutes, LOGS_WINDOW_MAX_MS / MINUTE_MS);
  const captured = instantMs(record?.capturedAtIso);
  const end = Number.isFinite(captured) ? Math.min(captured, now) : now;
  return windowOf('screen', end - minutes * MINUTE_MS, end, read === null ? fallback.source : 'screen-label');
}

/** `now − 15 d … now`: the same 15 days as `rca.top`. */
export function recurrenceWindow(now: number): EvidenceWindow {
  return windowOf('recurrence', now - RECURRENCE_MS, now, 'derived');
}

/** `now − 24 h … now`. */
export function dayWindow(now: number): EvidenceWindow {
  return windowOf('day', now - DAY_MS, now, 'derived');
}

/** The app's global window (`useQueryScope().globalWindow`, the same as `svc.ranking`). */
export function globalWindow(scope: { startIso: string; endIso: string }): EvidenceWindow {
  const start = instantMs(scope.startIso);
  const end = instantMs(scope.endIso);
  return windowOf('global', start, Number.isFinite(end) ? end : start, 'app');
}

/**
 * The window cut to its newest `maxMs` (a registry guard); unchanged when it already fits. A cut
 * screen window is no longer the one the screen showed, so it stops claiming the screen's label
 * (`derived`: "janela da consulta").
 */
export function clampWindow(window: EvidenceWindow, maxMs: number): EvidenceWindow {
  const start = instantMs(window.startIso);
  const end = instantMs(window.endIso);
  if (!(end - start > maxMs)) return window;
  return windowOf(window.kind, end - maxMs, end, window.source === 'screen-label' ? 'derived' : window.source);
}
