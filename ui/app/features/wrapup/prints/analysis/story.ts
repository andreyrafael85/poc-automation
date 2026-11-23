import { entityType } from '../../../../utils/deepLinks';
import type { AnalysisCtx, EvidenceBundle, EvidencePack, ShotKind, ShotPlan, Sourced, StoryContent, StoryStep } from '../types';
import { anchorFor, frontendSignals, recurrenceSignals, serviceSignals } from './anomalies';
import { tenantName } from './crossLinks';
import { firstEventPerSource, rootKindOf } from './narrative';
import { formatClock, readOf, sourced, type SourcedUnit } from './sourced';

/**
 * The incident, screen by screen (3.2.7, spec §4.7 and D8): what users felt, when the anomaly
 * started, the cause Davis named, the evidence in the minutes and the pattern over 15 days — each
 * step tied to the print that proves it, so the deck can crop a thumbnail from it.
 *
 * Wording follows D8: every time is the `event.start` of an anomaly (or a measured minute), never a
 * detection time — the Davis records were all written later (23:11:55Z on P-260914359). Steps
 * follow the investigation (symptom → onset → cause → evidence → pattern); a step whose numbers
 * were not read is left out, and with fewer than three there is no story.
 */

type Fact = Sourced<number | string>;

const MIN_STEPS = 3;

export function storyFor(bundle: EvidenceBundle, plan: ShotPlan, keptShotIds: readonly string[], ctx: AnalysisCtx): StoryContent | null {
  const incident = plan.incident;
  if (incident === null) return null;
  const shot = (kind: ShotKind) => plan.slots.find((slot) => slot.kind === kind) ?? null;
  const packOf = (kind: ShotKind): EvidencePack | null => {
    const slot = shot(kind);
    return slot === null ? null : (bundle[slot.id] ?? null);
  };
  const kept = (kind: ShotKind) => {
    const slot = shot(kind);
    return slot !== null && keptShotIds.includes(slot.id) ? slot.id : null;
  };
  const problemPack = packOf('problem');
  const rootPack = packOf('root-cause');
  const frontendPack = packOf('frontend');
  const eventsPack = [problemPack, rootPack, frontendPack].find((pack) => pack?.problem !== undefined) ?? null;
  const rootId = incident.rootCauseId;
  const rootName = tenantName(incident.rootCauseName ?? rootId, ctx);
  const steps: StoryStep[] = [];
  const fact = (pack: EvidencePack, value: number | string, source: Sourced['source'], id: Parameters<typeof readOf>[1], unit?: SourcedUnit, kind: 'incident' | 'events' = 'incident'): Fact => {
    const read = readOf(pack, id);
    return sourced<number | string>(value, source, id, pack.windows[kind] ?? null, ctx, { ...(unit === undefined ? {} : { unit }), partial: read.partial, collectedAtIso: read.collectedAtIso });
  };
  const step = (stage: StoryStep['stage'], time: Fact | null, key: Parameters<AnalysisCtx['t']>[0], params: Record<string, Fact>, shotId: string | null) => {
    steps.push({
      stage,
      label: ctx.t(`prt.story.stage.${stage}`),
      time: time === null ? null : time.display,
      text: ctx.t(key, Object.fromEntries(Object.entries(params).map(([name, value]) => [name, value.display]))),
      shotId,
      facts: [...(time === null ? [] : [time]), ...Object.values(params)],
    });
  };

  // SYMPTOM — the frontend's errors per minute at their peak, against the minutes before the anomaly.
  const minutesPack = [frontendPack, problemPack].find((pack) => pack?.frontend?.minutes !== undefined) ?? null;
  const minutes = minutesPack?.frontend?.minutes;
  if (minutesPack !== null && minutes !== undefined) {
    const signals = frontendSignals(minutes, anchorFor(minutesPack, minutes.errors));
    if (signals.spike && signals.peak !== null && signals.peakIso !== null && signals.ratio !== null) {
      const frontendName = tenantName(eventsPack?.problem?.events.find((event) => entityType(event.sourceId) === 'APPLICATION')?.sourceName ?? shot('frontend')?.chosen?.entityName ?? '—', ctx);
      const at = fact(minutesPack, signals.peakIso, 'rum', 'ev.frontend.minutes', 'instant');
      step(
        'symptom',
        at,
        'prt.story.text.symptom',
        { frontend: fact(minutesPack, frontendName, 'rum', 'ev.frontend.minutes'), peak: fact(minutesPack, signals.peak, 'rum', 'ev.frontend.minutes'), at, ratio: fact(minutesPack, signals.ratio, 'rum', 'ev.frontend.minutes', 'ratio') },
        kept('frontend') ?? kept('problem'),
      );
    }
  }

  // ONSET — the root's first event: its event.start, and the problem's own start beside it (D8).
  const problem = eventsPack?.problem;
  const rootEvent = problem?.events.find((event) => event.sourceId === rootId);
  if (eventsPack !== null && problem !== undefined && rootEvent !== undefined) {
    const at = fact(eventsPack, rootEvent.startIso, 'davis', 'ev.problem.events', 'instant', 'events');
    step(
      'onset',
      at,
      'prt.story.text.onset',
      {
        root: fact(eventsPack, rootName, 'davis', 'ev.problem.events', undefined, 'events'),
        category: fact(eventsPack, rootEvent.category, 'davis', 'ev.problem.events', undefined, 'events'),
        at,
        problemAt: fact(eventsPack, problem.startIso, 'davis', 'ev.problem.events', 'instant', 'events'),
      },
      kept('problem'),
    );
  }

  // CAUSE — the root Davis named, and the caller that took the failures (a database is seen through it).
  const callersPack = [rootPack, problemPack].find((pack) => pack?.callers !== undefined) ?? null;
  const callers = callersPack?.callers;
  const top = callers?.rows[0];
  const total = callers?.rows.reduce((sum, row) => sum + (row.failures ?? 0), 0) ?? 0;
  if (callersPack !== null && callers !== undefined && top !== undefined && top.failures !== null && total > 0) {
    const kind = rootKindOf(rootId, callersPack);
    step(
      'cause',
      null,
      'prt.story.text.cause',
      {
        root: fact(callersPack, rootName, 'davis', 'ev.incident.callers'),
        kind: fact(callersPack, ctx.t(kind === 'database' ? 'prt.kind.database' : kind === 'host' ? 'prt.kind.host' : 'prt.kind.service'), 'davis', 'ev.incident.callers'),
        caller: fact(callersPack, tenantName(top.name, ctx), 'dql', 'ev.incident.callers'),
        share: fact(callersPack, (100 * top.failures) / total, 'dql', 'ev.incident.callers', 'pct'),
      },
      kept('root-cause'),
    );
  }

  // EVIDENCE — the root's minutes at 100 % failures, and its throughput falling from the baseline.
  const servicesPack = [rootPack, problemPack].find((pack) => pack?.services?.some((service) => service.id === rootId) === true) ?? null;
  const rootService = servicesPack?.services?.find((service) => service.id === rootId);
  if (servicesPack !== null && rootService !== undefined) {
    const signals = serviceSignals(rootService, anchorFor(servicesPack, rootService.requests));
    if (signals.outage !== null && signals.collapse !== null && signals.baseline.value !== null) {
      const from = fact(servicesPack, signals.outage.fromIso, 'dql', 'ev.service.minutes', 'instant');
      step(
        'evidence',
        from,
        'prt.story.text.evidence',
        {
          minutes: fact(servicesPack, signals.outage.minutes, 'dql', 'ev.service.minutes'),
          from,
          to: fact(servicesPack, signals.outage.toIso, 'dql', 'ev.service.minutes', 'instant'),
          base: fact(servicesPack, signals.baseline.value, 'dql', 'ev.service.minutes'),
          min: fact(servicesPack, signals.collapse.min, 'dql', 'ev.service.minutes'),
        },
        // The root-cause screen only: these minutes are its service's, so the problem screen's
        // thumbnail would sit under numbers it does not show.
        kept('root-cause'),
      );
    }
  }

  // PATTERN — the same root id in other problems over 15 days.
  if (problemPack?.recurrence !== undefined) {
    const recurrence = recurrenceSignals(problemPack.recurrence, rootId);
    if (recurrence?.fires === true && recurrence.rank === 1 && recurrence.ratio !== null) {
      const window = problemPack.windows.recurrence ?? null;
      const partial = readOf(problemPack, 'ev.problem.recurrence').partial;
      step(
        'pattern',
        null,
        'prt.story.text.pattern',
        {
          count: sourced(recurrence.count, 'dql', 'ev.problem.recurrence', window, ctx, { partial }),
          ratio: sourced(recurrence.ratio, 'dql', 'ev.problem.recurrence', window, ctx, { unit: 'ratio' }),
        },
        kept('problem'),
      );
    }
  }

  if (steps.length < MIN_STEPS) return null;
  const chainEvents = eventsPack === null ? [] : firstEventPerSource(eventsPack);
  const starts = chainEvents.map((event) => Date.parse(event.startIso));
  const chain = chainEvents.map((event) => `${tenantName(event.sourceName ?? event.sourceId, ctx, 30)} ${formatClock(event.startIso, ctx.locale, ctx.timeZone)}`).join(' → ');
  const spread = starts.length === 0 ? 0 : Math.round((Math.max(...starts) - Math.min(...starts)) / 60_000);
  const shown = steps.slice(0, 5);
  return {
    // The steps the slide shows, not the distinct screens behind them: four steps over one print read "1 tela" (3.2.7 review UX-L4).
    title: ctx.t('prt.story.title', { count: String(shown.length) }),
    subtitle: ctx.t('prt.story.subtitle', { id: incident.displayId }),
    steps: shown,
    chain: chain === '' ? '' : ctx.t('prt.story.chain', { chain, minutes: String(spread) }),
    caveat: ctx.t('prt.story.caveat'),
  };
}
