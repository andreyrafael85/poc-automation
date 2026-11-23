import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { Panel, Stack } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import type { AutomationPlay, IncidentStory } from '../../models/incidentStories';
import { formatNanos } from '../../utils/time';

/**
 * Incident stories (3.2.5, milestone M5): the three most telling incidents of the window, each told
 * as detection → root cause → duration and reach, with what an automation would have done — a
 * suggestion by problem category, labelled as such.
 */

const PLAY_KEY: Record<AutomationPlay, StringKey> = {
  availability: 'story.play.availability',
  error: 'story.play.error',
  slowdown: 'story.play.slowdown',
  resource: 'story.play.resource',
  custom: 'story.play.custom',
  generic: 'story.play.generic',
};

const FAMILY = ['pink-purple', 'blue-turquoise', 'purple'] as const;

export const IncidentStories = ({ stories, headingLevel = 3 }: { stories: readonly IncidentStory[]; headingLevel?: 3 | 4 }) => {
  const { t, formatNumber, formatDateTime } = useTranslation();
  if (stories.length === 0) return null;
  return (
    <Stack as="section" gap="group" className="pvs-stories">
      <Stack gap="tight">
        <Heading level={headingLevel} as={headingLevel === 3 ? 'h2' : 'h3'}>
          {t('story.title')}
        </Heading>
        <Paragraph className="pvs-prose pvs-muted">{t('story.body')}</Paragraph>
      </Stack>
      <ol className="pvs-stories__list">
        {stories.map((story, index) => (
          <li key={story.displayId} className="pvs-stories__item">
            <Panel as="article" pad="roomy" className="pvs-spec-band" data-spectrum={FAMILY[index % FAMILY.length]}>
              <span className="pvs-spec-band__edge" aria-hidden="true" />
              <Stack gap="tight">
                <Text className="pvs-label">
                  {story.displayId} · {story.category}
                </Text>
                <Heading level={headingLevel === 3 ? 4 : 5} as={headingLevel === 3 ? 'h3' : 'h4'} className="pvs-wrap">
                  {story.name}
                </Heading>
                <ol className="pvs-stories__beats">
                  <li>
                    <Text>
                      {story.startIso === null ? t('story.detected.unknown') : t('story.detected', { at: formatDateTime(story.startIso) })}
                    </Text>
                  </li>
                  <li>
                    <Text>{story.rootCauseName === null ? t('story.root.none') : t('story.root', { name: story.rootCauseName })}</Text>
                  </li>
                  <li>
                    <Text>
                      {story.durationNs === null
                        ? t('story.duration.unknown')
                        : story.open
                          ? t('story.duration.open', { duration: formatNanos(story.durationNs) })
                          : t('story.duration', { duration: formatNanos(story.durationNs) })}
                    </Text>
                  </li>
                  <li>
                    <Text>
                      {story.affectedCount === 0
                        ? t('story.affected.none')
                        : t('story.affected', { count: formatNumber(story.affectedCount), names: story.affected.join(', ') })}
                      {story.namespaces.length > 0 ? ` ${t('story.namespaces', { names: story.namespaces.slice(0, 3).join(', ') })}` : ''}
                    </Text>
                  </li>
                </ol>
                <div className="pvs-stories__play">
                  <Chip color="neutral" variant="accent" size="condensed">
                    {t('story.suggestion')}
                  </Chip>
                  <Text>{t(PLAY_KEY[story.play], { root: story.rootCauseName ?? t('story.root.itsCause') })}</Text>
                </div>
              </Stack>
            </Panel>
          </li>
        ))}
      </ol>
    </Stack>
  );
};
