import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import { useLocation } from 'react-router-dom';

import { APP_CREATOR, APP_DISPLAY_NAME, APP_TAGLINE, installedVersion } from '../config/appInfo';
import { useTranslation } from '../i18n/useTranslation';

/** Routes whose output is a customer deliverable — the credit never appears there. */
const HIDDEN_PREFIXES = ['/report', '/wrapup'];

/**
 * App creator + version signature, shown on every screen except the report
 * deliverables (General report / First day / Tech Wrapup) and never in print.
 * Deliberately quiet so it reads as a signature, not a banner.
 */
export const AppFooter = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <footer className="pvs-footer" data-print-hide>
      <Text className="pvs-muted">
        {t('footer.credit', { app: APP_DISPLAY_NAME, tagline: APP_TAGLINE, name: APP_CREATOR.name, role: APP_CREATOR.role })}
        {'  ·  '}v{installedVersion()}
      </Text>
    </footer>
  );
};
