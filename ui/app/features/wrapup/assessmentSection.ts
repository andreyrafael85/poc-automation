import type { Translation } from '../../i18n/useTranslation';
import { CAPABILITY_LABEL } from '../assessment/adoption';
import { DOMAIN_LABEL } from '../assessment/DomainList';
import { LEVEL_KEY, PILLAR_KEY } from '../assessment/maturity';
import { priorityOf } from '../assessment/findings';
import type { Assessment } from '../assessment/useAssessment';
import type { WrapupKpi, WrapupSection } from './deck';
import { PRODUCT_LOGOS } from './productLogos';

/**
 * The Assessment in the Tech Wrapup (3.4.10, proposal §C8 F-02 — "capturas no deck do Tech Wrapup", the deck's
 * golden re-pinned at the owner's request). One business section built from the very reading the Assessment page
 * shows: the observable-coverage index and its domains, the maturity step, the capabilities in use, the findings
 * and the first actions. Nothing is computed here that the page does not show, and nothing commercial is in it.
 * Absent while the Assessment is still reading, or when nothing of it was read.
 */
export function assessmentSection(assessment: Assessment, t: Translation['t'], formatNumber: Translation['formatNumber']): WrapupSection | null {
  if (assessment.isLoading) return null;
  const { index, maturity, findings, adoption } = assessment;
  const measured = index.domains.filter((domain) => domain.state.kind === 'measured');
  if (index.value === null && measured.length === 0) return null;
  const count = (cls: string) => findings.filter((finding) => finding.cls === cls).length;
  const inUse = adoption.filter((row) => row.state === 'in-use').length;
  const levelName = t(LEVEL_KEY[maturity.level].name);
  const kpis: WrapupKpi[] = [
    { label: t('tw.asm.k.index'), value: index.value === null ? '—' : `${formatNumber(index.value)}/100` },
    { label: t('tw.asm.k.maturity'), value: `${maturity.level}/5 · ${levelName}` },
    { label: t('tw.asm.k.capabilities'), value: `${formatNumber(inUse)}/${formatNumber(adoption.length)}` },
    { label: t('tw.asm.k.critical'), value: formatNumber(count('critical')), ...(count('critical') > 0 ? { status: 'warn' as const } : {}) },
  ];
  const narrative = [
    t('tw.asm.n1'),
    t('tw.asm.i.maturity', { level: String(maturity.level), name: levelName }),
    t('tw.asm.i.findings', { critical: formatNumber(count('critical')), warning: formatNumber(count('warning')), opportunity: formatNumber(count('opportunity')) }),
  ];
  const next = maturity.level < 5 ? maturity.criteria.filter((criterion) => criterion.level === maturity.level + 1 && criterion.state !== 'met') : [];
  if (next.length > 0) {
    narrative.push(
      t('tw.asm.i.next', {
        name: t(LEVEL_KEY[(maturity.level + 1) as 2 | 3 | 4 | 5].name),
        pillars: [...new Set(next.map((criterion) => t(PILLAR_KEY[criterion.pillar])))].join(', '),
      }),
    );
  }
  const notDetected = adoption.filter((row) => row.state === 'not-detected').map((row) => t(CAPABILITY_LABEL[row.id]));
  // The first actions, in the order of the page's actions table (P1 first), by their recommendation.
  const actions = findings
    .map((finding) => ({ finding, priority: priorityOf(finding) }))
    .filter((entry) => entry.priority !== null)
    .sort((a, b) => (a.priority ?? '').localeCompare(b.priority ?? ''))
    .slice(0, 3)
    .map((entry) => t('tw.asm.assist.action', { priority: entry.priority ?? '', title: entry.finding.title }));
  const assist = [...actions];
  if (notDetected.length > 0) assist.push(t('tw.asm.assist.grow', { names: notDetected.slice(0, 3).join(', ') }));
  return {
    id: 'assessment',
    title: t('tw.asm.title'),
    subtitle: t('tw.asm.subtitle'),
    logo: PRODUCT_LOGOS.platform,
    highlight:
      index.value === null
        ? { value: `${maturity.level}/5`, caption: t('tw.asm.hiMaturity', { name: levelName }) }
        : { value: `${formatNumber(index.value)}/100`, caption: t('tw.asm.hi') },
    narrative,
    kpis,
    bars:
      measured.length > 0
        ? {
            title: t('tw.asm.bars'),
            items: measured.map((domain) => ({
              label: t(DOMAIN_LABEL[domain.id]),
              value: domain.state.kind === 'measured' ? Math.round(domain.state.share * 100) : 0,
            })),
          }
        : undefined,
    ...(assist.length > 0 ? { assist } : {}),
  };
}
