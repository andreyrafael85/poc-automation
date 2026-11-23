import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Link } from 'react-router-dom';

import { STORY_STAGES, isRouteVisible, sectionFor } from '../config/navigation';
import { useAudience } from '../hooks/useAudience';
import { Stack } from '../engine';
import '../engine/page-a.css';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The story of the PoC, as a map: nine stages, each a door into its first page.
 *
 * v2 drew seven neon tiles, each a different hue, that sent a viewer into one
 * domain page. The hue carried no meaning and the seven "chapters" were not the
 * order the app is read in. This is the same navigation idea on the one table the
 * rest of the shell uses (`STORY_STAGES`), so the sidebar, the crumb, the pager
 * and this map can never disagree about which page belongs to which stage.
 *
 * Position is a number and a name, never a colour. Each card is one real link to
 * the first page the viewer can see in that stage; its accessible name says which
 * stage it opens ("Open Stage 3 of 9 · Coverage achieved") and its blurb and page
 * count are read as part of the link. In executive mode the technical pages are
 * neither linked nor counted, and a stage left with no page is left out, exactly
 * as in the sidebar.
 */

const HEADING_ID = 'pvs-story-map-title';

export const StoryMap = () => {
  const { t } = useTranslation();
  const audience = useAudience();
  const total = STORY_STAGES.length;

  const stages = STORY_STAGES.flatMap((stage, index) => {
    const routes = stage.routes.filter((route) => sectionFor(route) !== undefined && isRouteVisible(route, audience));
    const first = routes[0];
    // The number is the stage's place in the full story, so it does not shift
    // when executive mode leaves a stage out.
    return first === undefined ? [] : [{ stage, number: index + 1, first, count: routes.length }];
  });

  return (
    <Stack as="section" gap="group" aria-labelledby={HEADING_ID}>
      <Stack gap="tight">
        <Heading level={4} as="h2" id={HEADING_ID}>
          {t('story.map.title')}
        </Heading>
        <Text className="pvs-caption">{t('story.map.subtitle')}</Text>
      </Stack>

      <ol className="pvs-story">
        {stages.map(({ stage, number, first, count }) => {
          const name = t(stage.labelKey);
          const blurbId = `pvs-story-${stage.id}-blurb`;
          const countId = `pvs-story-${stage.id}-count`;
          return (
            <li key={stage.id} className="pvs-story__item">
              <Link
                className="pvs-story__link"
                to={first}
                aria-describedby={`${blurbId} ${countId}`}
                aria-label={t('story.map.open', {
                  stage: `${t('shell.stageOf', { n: number, total })} · ${name}`,
                })}
              >
                <span className="pvs-step" aria-hidden="true">
                  {number}
                </span>
                <p className="pvs-story__title">{name}</p>
                <Text className="pvs-caption" id={blurbId}>
                  {t(stage.blurbKey)}
                </Text>
                <Text className="pvs-label pvs-story__count" id={countId}>
                  {count === 1 ? t('story.map.page') : t('story.map.pages', { count })}
                </Text>
              </Link>
            </li>
          );
        })}
      </ol>
    </Stack>
  );
};
