import type { StringKey } from '../../i18n/strings';
import type { DomainId } from './coverageIndex';
import type { AssessmentFinding } from './findings';

/**
 * Lenses (proposal §C4): what the page shows first, never what it measures. A lens keeps the findings
 * and actions of its area and puts its domains first; the index and its weights do not change.
 */
export type Lens = 'general' | 'apm' | 'infra' | 'kubernetes' | 'logs' | 'experience';

export const LENSES: readonly Lens[] = ['general', 'apm', 'infra', 'kubernetes', 'logs', 'experience'];

export const LENS_LABEL: Record<Lens, StringKey> = {
  general: 'p.asm.lens.general',
  apm: 'p.asm.lens.apm',
  infra: 'p.asm.lens.infra',
  kubernetes: 'p.asm.lens.kubernetes',
  logs: 'p.asm.lens.logs',
  experience: 'p.asm.lens.experience',
};

/** The rules each lens keeps. `general` keeps every rule. */
const LENS_RULES: Record<Exclude<Lens, 'general'>, ReadonlySet<string>> = {
  apm: new Set(['ASM-03', 'ASM-04', 'ASM-19', 'ASM-23', 'STR-02', 'STR-03']),
  infra: new Set(['ASM-01', 'ASM-02', 'ASM-18', 'ASM-20', 'STR-01']),
  kubernetes: new Set(['ASM-12', 'ASM-13', 'ASM-14']),
  logs: new Set(['ASM-10', 'ASM-11', 'ASM-20', 'ASM-25']),
  experience: new Set(['ASM-15', 'ASM-16', 'ASM-21', 'ASM-22', 'ASM-24']),
};

/** The domains each lens puts first. */
const LENS_DOMAINS: Record<Exclude<Lens, 'general'>, readonly DomainId[]> = {
  apm: ['apm'],
  infra: ['infra'],
  kubernetes: ['k8s'],
  logs: ['logs'],
  experience: ['experience', 'business'],
};

export function findingsFor(lens: Lens, findings: readonly AssessmentFinding[]): AssessmentFinding[] {
  if (lens === 'general') return [...findings];
  const rules = LENS_RULES[lens];
  return findings.filter((finding) => rules.has(finding.rule));
}

/** The domains in reading order for a lens: its own first, the rest after, each group in index order. */
export function domainOrderFor<T extends { id: DomainId }>(lens: Lens, domains: readonly T[]): T[] {
  if (lens === 'general') return [...domains];
  const first = LENS_DOMAINS[lens];
  return [...domains.filter((domain) => first.includes(domain.id)), ...domains.filter((domain) => !first.includes(domain.id))];
}

export const isLensDomain = (lens: Lens, id: DomainId): boolean => lens !== 'general' && LENS_DOMAINS[lens].includes(id);
