import React from 'react';

import { Accordion } from '@dynatrace/strato-components/content';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';

import { Panel, Stack } from '../../../../engine';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { StringKey } from '../../../../i18n/strings';

/**
 * E · Como funciona (3.2.7, spec §2.10): the flow in four steps, the batch import, the manual path
 * and the privacy notes. Screen-only. The capture companion's runbooks (VM with noVNC, laptop)
 * left with the companion in 3.3.2.
 */

const SECTIONS: readonly { id: string; title: StringKey; body: readonly StringKey[] }[] = [
  { id: 'flow', title: 'prt.how.flow.title', body: ['prt.how.plan', 'prt.how.capture', 'prt.how.review', 'prt.how.deck'] },
  { id: 'batch', title: 'prt.how.batch.title', body: ['prt.how.batch.body'] },
  { id: 'manual', title: 'prt.how.manual.title', body: ['prt.how.manual.body'] },
  { id: 'privacy', title: 'prt.how.privacy.title', body: ['prt.how.privacy.body'] },
];

export const HowItWorks = () => {
  const { t } = useTranslation();
  return (
    <Panel pad="roomy" data-wrap-hide>
      <Stack gap="group">
        <Heading level={5} as="h3">
          {t('prt.how.title')}
        </Heading>
        <Accordion>
          {SECTIONS.map((section) => (
            <Accordion.Section key={section.id} id={`prt-how-${section.id}`}>
              <Accordion.SectionLabel>{t(section.title)}</Accordion.SectionLabel>
              <Accordion.SectionContent>
                <Stack gap="tight">
                  {section.body.map((key) => (
                    <Paragraph key={key} className="pvs-prose">
                      {t(key)}
                    </Paragraph>
                  ))}
                </Stack>
              </Accordion.SectionContent>
            </Accordion.Section>
          ))}
        </Accordion>
      </Stack>
    </Panel>
  );
};
