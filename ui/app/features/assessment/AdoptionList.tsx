import React from 'react';

import { ExternalLink } from '@dynatrace/strato-components/typography';

import type { Translation } from '../../i18n/useTranslation';
import { ADOPTION_STATE_LABEL, CAPABILITY_LABEL, type AdoptionRow } from './adoption';
import { docFor } from './docLinks';
import './assessment.css';

/**
 * How the platform is used (3.4.1): one card per capability — its name, its state in words (never a
 * colour alone), what was measured and, for the SE and the partner, the queries behind it. Since 3.4.6 (F-09) a
 * capability with room to grow or not detected yet links to its page of the Dynatrace documentation.
 */
export const AdoptionList = ({
  rows,
  showEvidence,
  ariaLabel,
  t,
}: {
  rows: readonly AdoptionRow[];
  showEvidence: boolean;
  ariaLabel: string;
  t: Translation['t'];
}) => (
  <ul className="pvs-adopt" aria-label={ariaLabel}>
    {rows.map((row) => (
      <li key={row.id} className="pvs-adopt__item" data-state={row.state} data-print-atom data-testid={`asm-adopt-${row.id}`}>
        <span className="pvs-adopt__head">
          <span className="pvs-adopt__name">{t(CAPABILITY_LABEL[row.id])}</span>
          <span className="pvs-adopt__state">{t(ADOPTION_STATE_LABEL[row.state])}</span>
        </span>
        <span className="pvs-adopt__measured">{row.measured}</span>
        {showEvidence && <span className="pvs-adopt__evidence">{row.evidence.join(', ')}</span>}
        {(row.state === 'room' || row.state === 'not-detected') && docFor(CAPABILITY_LABEL[row.id]) !== null && (
          <span className="pvs-doc">
            <ExternalLink href={docFor(CAPABILITY_LABEL[row.id]) ?? ''} aria-label={t('asm.plan.docsFor', { capability: t(CAPABILITY_LABEL[row.id]) })}>
              {t('asm.plan.docs')}
            </ExternalLink>
          </span>
        )}
      </li>
    ))}
  </ul>
);
