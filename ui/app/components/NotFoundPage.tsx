import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CriticalIcon } from '@dynatrace/strato-icons';
import { useLocation, useNavigate } from 'react-router-dom';

import { Callout, Cluster, Stack } from '../engine';
import { useTranslation } from '../i18n/useTranslation';

/**
 * An address this app does not have (3.3.0, backlog TD-24).
 *
 * Until 3.2.7 `<Routes>` had no `path="*"`, so a stale bookmark, a renamed route or a typo rendered
 * the shell with an empty content area — indistinguishable from a page that failed to load. It now
 * says what happened and offers the way back. The address is echoed so the SE can see the typo,
 * and it comes from the router's own location, never from anything the tenant returned.
 */
export const NotFoundPage = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <Stack gap="section">
      <Callout kind="limitation">
        <Stack gap="tight">
          <Cluster gap="tight">
            <CriticalIcon aria-hidden="true" />
            <Heading level={3} as="h1">
              {t('notfound.title')}
            </Heading>
          </Cluster>
          <Paragraph>{t('notfound.body')}</Paragraph>
          <Text className="pvs-caption pvs-wrap">{pathname}</Text>
          <Cluster>
            <Button variant="emphasized" onClick={() => void navigate('/')}>
              {t('notfound.back')}
            </Button>
          </Cluster>
        </Stack>
      </Callout>
    </Stack>
  );
};
