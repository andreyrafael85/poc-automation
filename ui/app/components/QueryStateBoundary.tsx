import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import {
  CodeSnippet,
  EmptyState,
  MessageContainer,
  ProgressCircle,
} from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph, Text } from '@dynatrace/strato-components/typography';

import type { CatalogQueryResult } from '../hooks/useCatalogQuery';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Renders one of five explicit states around a catalog query, so that the
 * difference between "we looked and found nothing", "we were not allowed to
 * look" and "we stopped looking to control cost" is always visible.
 *
 * Absence of data is never presented as absence of problems.
 */

export interface QueryStateBoundaryProps {
  result: CatalogQueryResult;
  /** Rendered only when the query returned usable records. */
  children: React.ReactNode;
  /** Overrides the default "nothing found" wording with page-specific context. */
  emptyMessage?: string;
  /** What becomes possible once the missing scope is granted. */
  permissionImpact?: string;
}

export const QueryStateBoundary = ({
  result,
  children,
  emptyMessage,
  permissionImpact,
}: QueryStateBoundaryProps) => {
  const { outcome, entry, missingScopes, errorMessage, timeframe } = result;
  const { t } = useTranslation();
  // Translate the window label rather than printing the English one inside a
  // translated sentence.
  const window = t(`timeframe.${timeframe.expression}` as StringKey);

  if (outcome === 'loading') {
    return (
      <Flex flexDirection="column" alignItems="center" gap={8} padding={24} role="status">
        <ProgressCircle aria-label={t('state.loadingAria', { id: entry.id })} />
        <Text>{t('state.loading', { domain: entry.domain, window })}</Text>
      </Flex>
    );
  }

  if (outcome === 'no-permission') {
    return (
      <EmptyState size="default">
        <EmptyState.VisualPreset context="query" type="no-permission" />
        <EmptyState.Title as="h2">{t('state.noPermission.title')}</EmptyState.Title>
        <EmptyState.Details>{t('state.noPermission.body')}</EmptyState.Details>
        <EmptyState.Footer>
          <Flex flexDirection="column" gap={8}>
            <Text>{t('state.noPermission.scope')}</Text>
            <CodeSnippet showLineNumbers={false} size="condensed">
              {/* Strato 3.18: copy as an explicit action (the implicit copy button goes away in 4.0). */}
              <CodeSnippet.ActionsMenu>
                <CodeSnippet.Copy />
              </CodeSnippet.ActionsMenu>
              {missingScopes.join('\n')}
            </CodeSnippet>
            {permissionImpact !== undefined && <Paragraph>{permissionImpact}</Paragraph>}
            <Text>{t('state.query')}: {entry.id}</Text>
          </Flex>
        </EmptyState.Footer>
      </EmptyState>
    );
  }

  if (outcome === 'scan-limit') {
    return (
      <Flex flexDirection="column" gap={12}>
        <MessageContainer variant="warning">
          <MessageContainer.Title>{t('state.scanLimit.title')}</MessageContainer.Title>
          <MessageContainer.Description>{t('state.scanLimit.body')}</MessageContainer.Description>
        </MessageContainer>
        {children}
      </Flex>
    );
  }

  if (outcome === 'empty') {
    return (
      <EmptyState size="default">
        <EmptyState.VisualPreset context="query" type="no-result" />
        <EmptyState.Title as="h2">{t('state.empty.title')}</EmptyState.Title>
        <EmptyState.Details>{emptyMessage ?? t('state.empty.body', { window })}</EmptyState.Details>
        <EmptyState.Footer>
          <Text>
            {t('state.query')}: {entry.id}
          </Text>
        </EmptyState.Footer>
      </EmptyState>
    );
  }

  if (outcome === 'error') {
    return (
      <MessageContainer variant="critical">
        <MessageContainer.Title>{t('state.error.title')}</MessageContainer.Title>
        <MessageContainer.Description>
          <Flex flexDirection="column" gap={8}>
            <Paragraph>
              {errorMessage ?? t('state.error.generic')}
            </Paragraph>
            <Text>
              {t('state.query')}: {entry.id}
            </Text>
          </Flex>
        </MessageContainer.Description>
        <MessageContainer.Actions>
          <Button onClick={result.refetch} variant="emphasized">
            {t('state.retry')}
          </Button>
        </MessageContainer.Actions>
      </MessageContainer>
    );
  }

  return <>{children}</>;
};
