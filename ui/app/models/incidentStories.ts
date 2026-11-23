import type { RcaIncident } from './rca';

/**
 * Incident stories (3.2.5, milestone M5): the three most telling incidents of the window, told as
 * a story — when Davis detected it, what it named as the root cause, how long it lasted, how wide
 * it spread — and, as a suggestion, what an automation would have done. Built from the incidents
 * the RCA page already reads (`rca.top`), at no extra cost.
 *
 * The automation line is a suggestion by problem category, labelled as such: the app never
 * claims a workflow ran.
 */

export const STORY_COUNT = 3;

export type AutomationPlay = 'availability' | 'error' | 'slowdown' | 'resource' | 'custom' | 'generic';

/** The playbook a problem category suggests. */
export function automationPlay(category: string): AutomationPlay {
  switch (category.toUpperCase()) {
    case 'AVAILABILITY':
      return 'availability';
    case 'ERROR':
      return 'error';
    case 'SLOWDOWN':
      return 'slowdown';
    case 'RESOURCE_CONTENTION':
      return 'resource';
    case 'CUSTOM_ALERT':
      return 'custom';
    default:
      return 'generic';
  }
}

export interface IncidentStory {
  displayId: string;
  name: string;
  category: string;
  startIso: string | null;
  durationNs: number | null;
  open: boolean;
  rootCauseName: string | null;
  affectedCount: number;
  /** The first affected entities, for the sentence. */
  affected: string[];
  namespaces: string[];
  play: AutomationPlay;
}

export function incidentStories(incident: RcaIncident | null, others: readonly RcaIncident[], count = STORY_COUNT): IncidentStory[] {
  const incidents = incident === null ? [] : [incident, ...others];
  return incidents.slice(0, count).map((item) => ({
    displayId: item.displayId,
    name: item.name,
    category: item.category,
    startIso: item.startIso,
    durationNs: item.durationNs,
    open: item.status.toUpperCase() === 'ACTIVE',
    rootCauseName: item.rootCauseName,
    affectedCount: item.affectedCount,
    affected: item.affectedNames.slice(0, 3),
    namespaces: item.namespaces,
    play: automationPlay(item.category),
  }));
}
