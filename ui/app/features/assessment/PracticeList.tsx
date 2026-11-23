import React from 'react';

import type { Translation } from '../../i18n/useTranslation';
import { PRACTICE_LABEL, PRACTICE_STATE_LABEL, type Practice } from './sre';
import './assessment.css';

/**
 * The SRE and platform-engineering practices (3.4.3): one card per practice, its state in words, what
 * was measured and, for the SE and the partner, the queries behind it. Same visual language as the
 * platform-usage cards: established in green, developing soft yellow, early soft orange, not read dashed.
 */
export const PracticeList = ({ practices, showEvidence, ariaLabel, t }: { practices: readonly Practice[]; showEvidence: boolean; ariaLabel: string; t: Translation['t'] }) => (
  <ul className="pvs-adopt" aria-label={ariaLabel} data-testid="asm-sre">
    {practices.map((practice) => (
      <li key={practice.id} className="pvs-adopt__item" data-state={practice.state} data-print-atom data-testid={`asm-sre-${practice.id}`}>
        <span className="pvs-adopt__head">
          <span className="pvs-adopt__name">{t(PRACTICE_LABEL[practice.id])}</span>
          <span className="pvs-adopt__state">{t(PRACTICE_STATE_LABEL[practice.state])}</span>
        </span>
        <span className="pvs-adopt__measured">{practice.measured}</span>
        {showEvidence && practice.evidence.length > 0 && <span className="pvs-adopt__evidence">{practice.evidence.join(', ')}</span>}
      </li>
    ))}
  </ul>
);
