import React from 'react';

import { ArrowLeftIcon, ArrowRightIcon } from '@dynatrace/strato-icons';
import { Link, useLocation } from 'react-router-dom';

import { storyNeighbours } from '../config/navigation';
import { useAudience } from '../hooks/useAudience';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The foot of every page: where the story was, and where it goes next.
 *
 * A presenter's most frequent question mid-meeting is "what do I show now?". The
 * pager answers it on the page itself, in story order, honouring executive mode —
 * so an executive audience steps from one value-facing page to the next without
 * ever landing on a technical one.
 *
 * Renders nothing for a route outside the story (the URL-only classic problems
 * view) and on the printable report.
 */

const HIDDEN_PREFIXES = ['/report', '/wrapup'];

export const StoryPager = () => {
  const { t } = useTranslation();
  const audience = useAudience();
  const { pathname } = useLocation();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  const { previous, next } = storyNeighbours(pathname, audience);
  if (previous === undefined && next === undefined) return null;

  return (
    <nav className="pvs-pager" aria-label={t('shell.pager.label')} data-print-hide>
      {previous !== undefined && (
        <Link className="pvs-pager__link" data-dir="previous" to={previous.route}>
          <ArrowLeftIcon aria-hidden="true" />
          {t('shell.pager.previous', { title: t(previous.labelKey) })}
        </Link>
      )}
      {next !== undefined && (
        <Link className="pvs-pager__link" data-dir="next" to={next.route}>
          {t('shell.pager.next', { title: t(next.labelKey) })}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
};
