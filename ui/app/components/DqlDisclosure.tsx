import React from 'react';

import { Accordion, CodeSnippet } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Text } from '@dynatrace/strato-components/typography';

import { localizedPurpose } from '../queries/purpose';
import type { CatalogEntry } from '../queries/types';
import { useAccess } from '../config/AccessContext';
import { useStudio } from '../config/StudioContext';
import { useTranslation } from '../i18n/useTranslation';
import { formatBytes } from '../utils/time';

/**
 * Shows the exact DQL behind a section, together with the platform's own
 * accounting of what it cost when validated.
 *
 * This is what turns a slide into an auditable claim: the technical audience can
 * copy the query, run it themselves and compare. Hidden entirely in executive
 * mode, where the query text is noise for the audience.
 */

export interface DqlDisclosureProps {
  entries: readonly CatalogEntry[];
  /** Overrides the default heading. Already translated by the caller. */
  title?: string;
}

export const DqlDisclosure = ({ entries, title }: DqlDisclosureProps) => {
  const { t } = useTranslation();
  const { executiveMode } = useStudio();
  const { canWork } = useAccess();
  // The customer's read-only view shows no DQL (PLANO §3): it is SE and partner material.
  if (entries.length === 0 || executiveMode || !canWork) return null;

  const heading = title ?? t('c.dql.title');

  return (
    <Accordion>
      <Accordion.Section id="dql-disclosure" title={`${heading} (${entries.length})`}>
        <Flex flexDirection="column" gap={16}>
          {entries.map((entry) => (
            <Flex key={entry.id} flexDirection="column" gap={8}>
              <Text>
                {entry.id} — {localizedPurpose(entry, t)}
              </Text>
              <CodeSnippet language="dql" showLineNumbers={false} size="condensed" lineBreaks>
                {/* Strato 3.18: copy as an explicit action (the implicit copy button goes away in 4.0). */}
                <CodeSnippet.ActionsMenu>
                  <CodeSnippet.Copy />
                </CodeSnippet.ActionsMenu>
                {entry.dql}
              </CodeSnippet>
              <Text>
                {t('c.dql.validated', {
                  date: entry.validation.validatedOn,
                  env: entry.validation.environmentId,
                  records: entry.validation.records ?? '—',
                  scan:
                    entry.validation.scannedBytesOnDemand === null
                      ? t('c.dql.scanNotCaptured')
                      : t('c.dql.scanned', {
                          bytes: formatBytes(entry.validation.scannedBytesOnDemand),
                        }),
                  duration:
                    entry.validation.durationMs === null
                      ? ''
                      : ` · ${entry.validation.durationMs} ms`,
                  outcome: entry.validation.outcome,
                })}
              </Text>
              {/* The validation notes describe the lab tenant (its counts, its quirks). They stay in the
                  catalog and in docs/QUERY-CATALOG.md for maintainers; on a customer's tenant they
                  would read as that customer's numbers, so they are not rendered (3.2.1). */}
            </Flex>
          ))}
        </Flex>
      </Accordion.Section>
    </Accordion>
  );
};
