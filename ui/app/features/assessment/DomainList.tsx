import React from 'react';

import type { StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import { decimal } from '../../utils/activeLocale';
import type { DomainId, DomainScore } from './coverageIndex';
import './assessment.css';

export const DOMAIN_LABEL: Record<DomainId, StringKey> = {
  infra: 'p.asm.domain.infra',
  apm: 'p.asm.domain.apm',
  logs: 'p.asm.domain.logs',
  k8s: 'p.asm.domain.k8s',
  experience: 'p.asm.domain.experience',
  business: 'p.asm.domain.business',
};

const RATIO_KEY: Record<Exclude<DomainId, 'business'>, StringKey> = {
  infra: 'p.asm.ratio.infra',
  apm: 'p.asm.ratio.apm',
  logs: 'p.asm.ratio.logs',
  k8s: 'p.asm.ratio.k8s',
  experience: 'p.asm.ratio.experience',
};

const NA_KEY: Partial<Record<DomainId, StringKey>> = { k8s: 'p.asm.na.k8s', experience: 'p.asm.na.experience' };

/** The share as printed: one decimal under 10 %, whole percent above. */
export const shareDisplay = (share: number) => {
  const pct = share * 100;
  return `${pct > 0 && pct < 10 ? decimal(pct, 1) : decimal(pct, 0)}%`;
};

/** What a domain reads, in words: its two counts, why it has none, or why it does not apply. */
export function domainLine(domain: DomainScore, t: Translation['t'], formatNumber: Translation['formatNumber']): string {
  const { state } = domain;
  if (state.kind === 'not-applicable') return t(NA_KEY[domain.id] ?? 'p.asm.na');
  if (state.kind === 'unavailable') return t(`p.asm.gap.${state.reason}` as StringKey);
  if (domain.id === 'business') return t(state.share > 0 ? 'p.asm.ratio.businessYes' : 'p.asm.ratio.businessNo');
  return t(RATIO_KEY[domain.id], { num: formatNumber(state.numerator), den: formatNumber(state.denominator) });
}

/**
 * The six domains of the index as rows (3.4.0): name and weight, a bar of the measured share, the
 * share, and one line saying what was counted — or why the domain is out of the index. The state is
 * in the text, never in the bar alone; a domain out of the index draws an empty dashed track, not 0 %.
 */
export const DomainList = ({
  domains,
  focus,
  ariaLabel,
  t,
  formatNumber,
}: {
  domains: readonly DomainScore[];
  focus: (id: DomainId) => boolean;
  ariaLabel: string;
  t: Translation['t'];
  formatNumber: Translation['formatNumber'];
}) => (
  <ul className="pvs-domains" aria-label={ariaLabel}>
    {domains.map((domain) => {
      const measured = domain.state.kind === 'measured' ? domain.state : null;
      return (
        <li
          key={domain.id}
          className="pvs-domains__row"
          data-state={domain.state.kind}
          data-focus={focus(domain.id) ? 'true' : undefined}
          data-testid={`asm-domain-${domain.id}`}
        >
          <span className="pvs-domains__name">
            {t(DOMAIN_LABEL[domain.id])}
            <span className="pvs-domains__weight">{t('p.asm.weight', { weight: String(domain.weight) })}</span>
          </span>
          <span className="pvs-domains__track" aria-hidden="true">
            {measured !== null && <span className="pvs-domains__fill" style={{ width: `${Math.min(100, measured.share * 100).toFixed(2)}%` }} />}
          </span>
          <span className="pvs-domains__value">{measured === null ? '—' : shareDisplay(measured.share)}</span>
          <span className="pvs-domains__line">{domainLine(domain, t, formatNumber)}</span>
        </li>
      );
    })}
  </ul>
);
