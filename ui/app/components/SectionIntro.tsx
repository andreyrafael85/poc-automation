import React from 'react';

import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { useInRouterContext, useLocation } from 'react-router-dom';

import { Callout } from '../engine';
import { ProductSignet } from './ProductSignet';
import { STORY_STAGES, stageOf } from '../config/navigation';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The narrative header of a page: where this page sits in the story, the
 * question it answers, and what to take from it.
 *
 * Each section states the business question it answers before showing any
 * widget, which is what keeps this app a guided story rather than a wall of
 * charts.
 *
 * ## What changed from v2
 *
 * v2 drew this as a glass hero with one of seven neon hues per chapter — a
 * rainbow whose colours meant nothing. v3.1 drops the hue entirely. The position
 * in the story is a number and a name ("Stage 3 of 9 · Coverage achieved"), read
 * by everyone, derived from the route so no page has to pass it.
 *
 * Takes dictionary keys rather than strings: a page heading is the first thing
 * an audience reads, and it is the last place an untranslated string should be
 * able to survive.
 */

type Params = Readonly<Record<string, string | number>>;

export interface SectionIntroProps {
  titleKey: StringKey;
  /** Interpolation values for a title that names the customer or the window. */
  titleParams?: Params;
  /** The question a stakeholder is actually asking here. */
  questionKey: StringKey;
  /** What the audience should take away, phrased without commercial language. */
  takeawayKey?: StringKey;
  takeawayParams?: Params;
}

/**
 * The stage crumb, read from the route. Separate so the header works without a
 * Router, and exported so a page that opens with its own banner (the Overview) can
 * still show where it sits in the story.
 */
export const StageCrumb = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const located = stageOf(pathname);
  if (located === undefined) return null;
  const total = STORY_STAGES.length;

  return (
    <div className="pvs-frame__crumb">
      <span className="pvs-step" data-current="true" aria-hidden="true">
        {located.position}
      </span>
      <p className="pvs-eyebrow">
        {t('shell.stageOf', { n: located.position, total })} · {t(located.stage.labelKey)}
      </p>
    </div>
  );
};

/** The product signet of the current route (3.4.15), only inside a Router. */
const RouteSignet = () => {
  const { pathname } = useLocation();
  return <ProductSignet pathname={pathname} />;
};

export const SectionIntro = ({
  titleKey,
  titleParams,
  questionKey,
  takeawayKey,
  takeawayParams,
}: SectionIntroProps) => {
  const { t } = useTranslation();
  const inRouter = useInRouterContext();

  return (
    <header className="pvs-frame">
      {inRouter && <StageCrumb />}
      <div className="pvs-frame__titlerow">
        {inRouter && <RouteSignet />}
        <Heading level={1} className="pvs-frame__title">
          {t(titleKey, titleParams)}
        </Heading>
      </div>
      <Paragraph className="pvs-lead">{t(questionKey)}</Paragraph>
      {takeawayKey !== undefined && (
        <div className="pvs-frame__takeaway">
          <Callout kind="note" title={t('frame.takeaway')}>
            {t(takeawayKey, takeawayParams)}
          </Callout>
        </div>
      )}
    </header>
  );
};
