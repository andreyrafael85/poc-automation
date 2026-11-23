import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useStudio } from '../config/StudioContext';
import { BRAND_COLOR } from '../design/palette';
import { Panel } from '../engine';
import { DYNATRACE_LOGO_COLOR } from '../features/wrapup/brand';
import { useTranslation } from '../i18n/useTranslation';
import { isSafeImageDataUrl } from '../utils/logo';

/**
 * Engagement banner: the customer's mark next to the Dynatrace mark.
 *
 * The point of showing the customer's logo is not decoration — it is that the
 * audience should recognise the environment being discussed as theirs. The
 * Dynatrace logo sits beside it because the findings are the platform's.
 *
 * The logo is only rendered after `isSafeImageDataUrl` confirms it is a raster
 * data URL. Validation happens on upload too; this is the second gate, at the
 * point the value actually reaches the DOM.
 *
 * v3.1: a flat `Panel` instead of an aurora hero. The title is an `h1` by default
 * (the Overview and the printable report have no other page title); a page that
 * already opens with a `SectionIntro` passes `headingAs="h2"`, so a page never
 * has two `h1`s.
 *
 * 3.2.1 ("Value Spectrum", wave 1): the band gets two soft light sources over the
 * platform's primary container and a headline painted across the spectrum
 * (`engine/spectrum.css`), and it can carry an `aside` — the Overview's gauge rings.
 * Print draws it flat, with the headline in solid ink.
 *
 * 3.7.5 (v6, wave 4): flat and neutral — the surface of every other card, a 1 px border, the brand gradient only as a
 * thin strip along the top, and the window chip neutral (`engine/v6.css`).
 */

export interface HeroBannerProps {
  /** Overrides the default heading, used by the printable report. */
  title?: string;
  subtitle?: string;
  /** Analysis window label, shown so the scope of every figure is explicit. */
  windowLabel: string;
  /** Instant the data is as of. */
  asOfIso?: string;
  /** Semantic level of the title. The look does not change. */
  headingAs?: 'h1' | 'h2';
  /** Drawn beside the text on wide screens and under it on narrow ones (the gauge rings). */
  aside?: React.ReactNode;
  /** 3.7.6 (the owner): the Overview's brand background (the Executive summary); the other banners stay flat. */
  brand?: boolean;
}

export const HeroBanner = ({ title, subtitle, windowLabel, asOfIso, headingAs = 'h1', aside, brand = false }: HeroBannerProps) => {
  const { parameters } = useStudio();
  const { t, formatDateTime } = useTranslation();
  const logo = parameters.customerLogoDataUrl;
  const showLogo = isSafeImageDataUrl(logo);

  const heading =
    title ??
    (parameters.customerName === ''
      ? t('c.hero.defaultTitle')
      : t('c.hero.namedTitle', { name: parameters.customerName }));

  return (
    <Panel pad="roomy" className="pvs-spec-hero" data-brand={brand ? 'true' : undefined}>
      <div className="pvs-spec-hero__grid" data-aside={aside === undefined ? 'false' : 'true'}>
      <div className="pvs-stack">
        <div className="pvs-cluster" style={{ '--pvs-justify': 'space-between', '--pvs-gap': 'var(--pvs-gap-section)' } as React.CSSProperties}>
          <div className="pvs-cluster" style={{ '--pvs-gap': 'var(--pvs-gap-group)' } as React.CSSProperties}>
            {showLogo && logo !== null && (
              <>
                <img
                  className="pvs-hero__logo"
                  src={logo}
                  alt={
                    parameters.customerName === ''
                      ? t('c.hero.customerLogoAlt')
                      : t('c.hero.namedLogoAlt', { name: parameters.customerName })
                  }
                />
                <span className="pvs-hero__rule" aria-hidden="true" />
              </>
            )}
            {/* The vendor logo is a brand asset not included in this repository: shown only when supplied (features/wrapup/brand.ts). */}
            {DYNATRACE_LOGO_COLOR !== '' && (
              <img className="pvs-hero__logo" data-brand="dynatrace" src={DYNATRACE_LOGO_COLOR} alt="Dynatrace" />
            )}
          </div>

          <div className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-4)', alignItems: 'flex-end' } as React.CSSProperties}>
            <Chip color="neutral" size="condensed">
              {windowLabel}
            </Chip>
            {asOfIso !== undefined && <Text className="pvs-caption">{t('c.hero.asOf', { time: formatDateTime(asOfIso) })}</Text>}
          </div>
        </div>

        <div className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-4)' } as React.CSSProperties}>
          <div className="pvs-hero__title">
            {/*
              A brand bar rather than a coloured heading: the customer's colour
              marks their name without competing with the type hierarchy, and it
              stays clear of every tone that carries meaning in this app.
            */}
            <span
              className="pvs-hero__bar"
              aria-hidden="true"
              style={{ backgroundColor: BRAND_COLOR[parameters.brandTone] }}
            />
            <Heading level={1} as={headingAs} className="pvs-spec-hero__title">
              {heading}
            </Heading>
          </div>
          {parameters.engagementName !== '' && <Text className="pvs-muted">{parameters.engagementName}</Text>}
          {subtitle !== undefined && <Paragraph className="pvs-prose">{subtitle}</Paragraph>}
          {parameters.pocDescription !== '' && <Paragraph className="pvs-prose">{parameters.pocDescription}</Paragraph>}
        </div>
      </div>
      {aside !== undefined && <div className="pvs-spec-hero__aside">{aside}</div>}
      </div>
    </Panel>
  );
};
