import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { AiIcon } from '@dynatrace/strato-icons';

import { useTranslation } from '../i18n/useTranslation';

/**
 * "Dynatrace Intelligence" on content the platform's AI produced (3.4.16, design proposal D-21, the pattern "AI
 * presence"): the problem explanation it wrote, the root cause it named, the categories it assigned. Only there —
 * the app's own advice, built by fixed rules over measured figures, is labelled "Recommendation" instead, so a
 * customer can always tell what the AI said from what the app derived. The words carry the meaning; the icon is
 * Strato's `AiIcon`; the title explains it on hover.
 */
export const IntelligenceMark = () => {
  const { t } = useTranslation();
  return (
    <span title={t('ai.mark.hint')} data-testid="intelligence-mark" className="pvs-ai-mark">
      <Chip color="primary" variant="emphasized" size="condensed">
        <Chip.Prefix>
          <AiIcon />
        </Chip.Prefix>
        {t('ai.mark.label')}
      </Chip>
    </span>
  );
};
