import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { LockIcon } from '@dynatrace/strato-icons';
import { useNavigate } from 'react-router-dom';

import { useAccess } from '../config/AccessContext';
import { useStudio } from '../config/StudioContext';
import { Callout, Cluster, Stack } from '../engine';
import { useTranslation } from '../i18n/useTranslation';

/**
 * What a page shows when it may not be opened: the reason, and the way out.
 *
 * A direct URL must not bypass the navigation, so the route is guarded as well as hidden. Since
 * 3.2.6 an SE or partner meets the commercial reason only in executive mode (the presentation
 * mode), and the way out is leaving it.
 */
export const RestrictedPage = ({ reason }: { reason: 'customer' | 'commercial' }) => {
  const { t } = useTranslation();
  const access = useAccess();
  const { executiveMode, setExecutiveMode } = useStudio();
  const navigate = useNavigate();

  return (
    <Stack gap="section">
      {/* This page replaces the whole route, so it carries the page's one h1; the callout takes its
          name from that heading instead of repeating it. */}
      <Callout kind="limitation">
        <Stack gap="tight">
          <Cluster gap="tight">
            <LockIcon aria-hidden="true" />
            <Heading level={3} as="h1">
              {t('restricted.title')}
            </Heading>
          </Cluster>
          <Paragraph>{t(reason === 'customer' ? 'restricted.body.customer' : 'restricted.body.presentation')}</Paragraph>
          <Cluster>
            {reason === 'commercial' && access.canWork && executiveMode && (
              <Button variant="emphasized" onClick={() => setExecutiveMode(false)}>
                {t('restricted.leavePresentation')}
              </Button>
            )}
            <Button onClick={() => void navigate('/')}>{t('restricted.back')}</Button>
          </Cluster>
        </Stack>
      </Callout>
    </Stack>
  );
};
