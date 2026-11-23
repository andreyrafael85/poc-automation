import { assumed } from '../../config/assumptions';
import type { RadarAxis } from '../../engine/chart/RadarChart';
import type { RadialBar } from '../../engine/chart/RadialBars';
import type { StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import type { CoverageIndex, DomainId } from './coverageIndex';
import { DOMAIN_LABEL, shareDisplay } from './DomainList';

/** The word a measured share is read with (3.4.3), from the lines in the assumptions register. */
export const bandOf = (pct: number): StringKey =>
  pct >= assumed('assessment.band.excellent')
    ? 'asm.band.excellent'
    : pct >= assumed('assessment.band.good')
      ? 'asm.band.good'
      : pct >= assumed('assessment.band.moderate')
        ? 'asm.band.moderate'
        : pct >= assumed('assessment.band.developing')
          ? 'asm.band.developing'
          : 'asm.band.initial';

/**
 * The radar's axes (3.4.3; shared with the Tech Wrapup's capture in 3.4.10): one per applicable domain, its share
 * and its word; a domain not read keeps its spoke with no value, never a zero.
 */
export const radarAxesFor = (index: CoverageIndex, t: Translation['t']): RadarAxis[] =>
  index.domains
    .filter((domain) => domain.state.kind !== 'not-applicable')
    .map((domain) => {
      const label = t(DOMAIN_LABEL[domain.id]);
      if (domain.state.kind !== 'measured') return { key: domain.id, label, value: null, display: t('p.asm.hist.unread') };
      const pct = domain.state.share * 100;
      return { key: domain.id, label, value: pct, display: `${shareDisplay(domain.state.share)} · ${t(bandOf(pct))}` };
    });

/** 3.4.10: each domain keeps its hue on the radial bars (bar and rim), the same in every reading. */
const DOMAIN_FAMILY: Record<DomainId, RadialBar['family']> = {
  infra: 'blue',
  apm: 'purple',
  logs: 'orange',
  k8s: 'turquoise',
  experience: 'pink-purple',
  business: 'moss',
};

/**
 * Coverage by domain as radial bars (3.4.10, the owner's reference images): one bar per applicable domain, its
 * share on one line with its word ("100% · Excellent"), a domain not read kept as a dashed track.
 */
export const radialBarsFor = (index: CoverageIndex, t: Translation['t']): RadialBar[] =>
  index.domains
    .filter((domain) => domain.state.kind !== 'not-applicable')
    .map((domain) => {
      const label = t(DOMAIN_LABEL[domain.id]);
      const family = DOMAIN_FAMILY[domain.id];
      if (domain.state.kind !== 'measured') return { key: domain.id, label, value: null, display: t('p.asm.hist.unread'), family };
      const pct = domain.state.share * 100;
      return { key: domain.id, label, value: pct, display: shareDisplay(domain.state.share), band: t(bandOf(pct)), family };
    });
