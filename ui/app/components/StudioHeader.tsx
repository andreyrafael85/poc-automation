import React, { useState } from 'react';

import { Chip, InformationOverlay } from '@dynatrace/strato-components/content';
import { Select, Switch } from '@dynatrace/strato-components/forms';
import { AppHeader, Flex, HelpMenu } from '@dynatrace/strato-components/layouts';
import { Paragraph, Text } from '@dynatrace/strato-components/typography';
import { LockIcon, RefreshIcon, AccountIcon, PlayIcon, WarningIcon, WhatsNewIcon } from '@dynatrace/strato-icons';

import { useAccess } from '../config/AccessContext';
import { useStudio } from '../config/StudioContext';
import {
  OFFICIAL_REFERENCES,
  feedbackMailto,
  installedVersion,
} from '../config/appInfo';
import { BRAND_COLOR } from '../design/palette';
import { LOCALES, LOCALE_LABELS, type StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { TIMEFRAME_PRESETS, hasCostWarning } from '../utils/time';
import '../engine/shell.css';
import { HelpPanels, type HelpPanelId } from './HelpPanels';
import { usePresentation } from '../features/presentation/Presentation';

/** The version whose "What's new" this viewer has opened (browser storage, per viewer). */
const WHATS_NEW_SEEN_KEY = 'pvs.whatsNew.seenVersion';

/**
 * Application shell header — the global controls.
 *
 * Navigation moved to the story sidebar in v3.1, so the header now carries only
 * what applies to the whole session, in the order a presenter reaches for it:
 * engagement, audience (executive mode), window, language, refresh, help.
 *
 * The timeframe selector is restricted to the app's presets. An unbounded custom
 * window would let a single click scan far more data than intended, and the
 * widest preset the app offers is 30 days.
 *
 * Refresh is explicit. The analysis window is resolved to absolute timestamps
 * once, so figures stay stable while an audience discusses them; pressing
 * refresh is what moves the window forward.
 *
 * Help uses Strato's own `HelpMenu` — the platform's pattern for an app's help
 * entry point — with the app's guide, methodology, data sources, release notes
 * and About opening in a `Sheet`.
 */

/**
 * The Executive-mode switch: the presentation mode (3.2.6), which narrows `CommercialScope` for
 * the whole app. Rendered twice — in the header strip above 640 px (`strip`) and in the row under
 * it below that width (`bar`) — so each instance owns its ids and the stylesheet shows exactly one.
 */
const ExecutiveToggle = ({
  where,
  executiveMode,
  setExecutiveMode,
}: {
  where: 'strip' | 'bar';
  executiveMode: boolean;
  setExecutiveMode: (value: boolean) => void;
}) => {
  const { t } = useTranslation();
  const labelId = `exec-mode-label-${where}`;
  const helpId = `exec-mode-help-${where}`;
  return (
    <Flex className={`pvs-hdr__group pvs-hdr__executive--${where}`} alignItems="center" gap={4}>
      <Text className={where === 'strip' ? 'pvs-hdr__label' : 'pvs-hdr__barlabel'} id={labelId}>
        {t('shell.executiveMode')}
      </Text>
      <Switch value={executiveMode} onChange={setExecutiveMode} aria-labelledby={labelId} aria-describedby={helpId} />
      <span className="pvs-sr-only" id={helpId}>
        {t('shell.executiveMode.help')}
      </span>
    </Flex>
  );
};

export const StudioHeader = () => {
  const presentation = usePresentation();
  const {
    timeframe,
    setTimeframe,
    parameters,
    resolvedTimeframe,
    refresh,
    locale,
    setLocale,
    executiveMode,
    setExecutiveMode,
    persistence,
  } = useStudio();
  const { t, formatTime } = useTranslation();
  const access = useAccess();
  const [panel, setPanel] = useState<HelpPanelId | null>(null);

  // "What's new" also sits in the header until the viewer has opened it for this version: in the
  // help menu alone, the 3.2.1 owner did not find it. Per-viewer convenience, so browser storage;
  // when storage is unavailable the button simply stays.
  const [seenVersion, setSeenVersion] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(WHATS_NEW_SEEN_KEY);
    } catch {
      return null;
    }
  });
  const openWhatsNew = () => {
    setPanel('whatsNew');
    setSeenVersion(version);
    try {
      window.localStorage.setItem(WHATS_NEW_SEEN_KEY, version);
    } catch {
      // Private window or blocked storage: the button reappears next time, nothing breaks.
    }
  };
  const version = installedVersion();

  return (
    <>
      <AppHeader>
        {/*
          Direct children, not a wrapping `Flex`: AppHeader folds only its *direct*
          `ActionButton`s into the "more actions" menu when the strip does not fit,
          and only an `ActionButton` that is a direct child gets its icon. A nested
          button lost its icon and leaked `prefixIcon` to the DOM.
        */}
        <AppHeader.ActionItems>
          {parameters.customerName !== '' && (
            <Chip
              className="pvs-hdr__customer"
              color="neutral"
              variant="accent"
              size="condensed"
              aria-label={`${t('shell.customer')}: ${parameters.customerName}`}
            >
              <Chip.Prefix>
                {/* A decorative mark in the customer's own colour; it never carries meaning. */}
                <span
                  aria-hidden="true"
                  className="pvs-brand-dot"
                  style={{ background: BRAND_COLOR[parameters.brandTone] }}
                />
              </Chip.Prefix>
              {parameters.customerName}
            </Chip>
          )}

          {(persistence.status === 'forbidden' || persistence.status === 'error' || persistence.status === 'conflict') && (
            // The configuration is not being kept: said in the header, on every page, not only in Settings.
            <Chip className="pvs-hdr__customer" color="neutral" variant="accent" size="condensed">
              <Chip.Prefix>
                <WarningIcon aria-hidden="true" />
              </Chip.Prefix>
              {t('persist.header.problem')}
            </Chip>
          )}

          {/* Who is looking: a viewer in the read-only view can ask to sign in; a partner can leave. */}
          {access.level === 'customer' && (
            <Chip className="pvs-hdr__customer" color="neutral" variant="accent" size="condensed">
              <Chip.Prefix>
                <LockIcon aria-hidden="true" />
              </Chip.Prefix>
              {t('access.chip.customer')}
            </Chip>
          )}
          {access.level === 'partner' && (
            <Chip className="pvs-hdr__customer" color="neutral" variant="accent" size="condensed">
              <Chip.Prefix>
                <AccountIcon aria-hidden="true" />
              </Chip.Prefix>
              {t('access.chip.partner')}
            </Chip>
          )}

          {/* 3.2.6: commercial data is part of the SE's and partner's working view; the chip says so,
              and executive mode — the presentation mode — puts it away before a screen is shared. */}
          {access.canWork && !executiveMode && (
            // A plain tag rather than a Strato Chip: the Chip draws its content twice (one copy to
            // measure), which duplicated the ids inside it (3.2.6 harness).
            <span className="pvs-hdr__internal pvs-hdr__commercial" title={t('access.internal.help')}>
              <LockIcon aria-hidden="true" />
              <Text className="pvs-hdr__internal-label">{t('access.internal.chip')}</Text>
              <span className="pvs-sr-only">{t('access.internal.help')}</span>
            </span>
          )}

          <ExecutiveToggle where="strip" executiveMode={executiveMode} setExecutiveMode={setExecutiveMode} />

          <InformationOverlay>
            <InformationOverlay.Trigger className="pvs-hdr__asof">
              <Text>{t('shell.asOf', { time: formatTime(resolvedTimeframe.endIso) })}</Text>
            </InformationOverlay.Trigger>
            <InformationOverlay.Content>
              <Flex flexDirection="column" gap={4}>
                <Paragraph>{t('shell.windowExplain')}</Paragraph>
                <Text>
                  {t('shell.from')}: {resolvedTimeframe.startIso}
                </Text>
                <Text>
                  {t('shell.to')}: {resolvedTimeframe.endIso}
                </Text>
                <Paragraph>{t('shell.windowRefreshHint')}</Paragraph>
              </Flex>
            </InformationOverlay.Content>
          </InformationOverlay>

          {/* Language applies to every section at once, so a customer never sees
              a half-translated screen while navigating. */}
          <Flex className="pvs-hdr__group" alignItems="center" gap={4}>
            <Text className="pvs-hdr__label" id="locale-label">
              {t('shell.language')}
            </Text>
            <Select
              value={locale}
              onChange={(value) => {
                if (typeof value === 'string') setLocale(value);
              }}
              aria-labelledby="locale-label"
            >
              {/* Options are only valid inside Select.Content. Without the
                  wrapper the Select renders its empty state instead. */}
              <Select.Content>
                {LOCALES.map((candidate) => (
                  <Select.Option key={candidate} value={candidate}>
                    {LOCALE_LABELS[candidate]}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          </Flex>

          <Flex className="pvs-hdr__group pvs-hdr__group--window" alignItems="center" gap={4}>
            <Text className="pvs-hdr__label" id="window-label">
              {t('shell.window')}
            </Text>
            <Select
              value={timeframe}
              onChange={(value) => {
                if (typeof value === 'string') setTimeframe(value);
              }}
              aria-labelledby="window-label"
            >
              <Select.Content>
                {TIMEFRAME_PRESETS.map((preset) => (
                  <Select.Option key={preset.expression} value={preset.expression}>
                    {t(`timeframe.${preset.expression}` as StringKey)}
                    {hasCostWarning(preset.expression) ? ' ·' : ''}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          </Flex>

          <HelpMenu
            entries={{
              whatsNew: { onSelect: openWhatsNew },
              getStarted: { onSelect: () => setPanel('guide') },
              documentation: [
                { label: t('help.methodology'), onSelect: () => setPanel('methodology') },
                { label: t('help.assumptions'), onSelect: () => setPanel('assumptions') },
                { label: t('help.sources'), onSelect: () => setPanel('sources') },
                {
                  label: t('help.docs.dqlBestPractices'),
                  href: OFFICIAL_REFERENCES.dqlBestPractices,
                  target: '_blank',
                },
                {
                  label: t('help.docs.logsBestPractices'),
                  href: OFFICIAL_REFERENCES.logsBestPractices,
                  target: '_blank',
                },
              ],
              feedback: { href: feedbackMailto(version) },
              about: { onSelect: () => setPanel('about') },
            }}
          />

          {access.level === 'customer' && (
            <AppHeader.ActionButton prefixIcon={<LockIcon />} onClick={access.leaveRestrictedView}>
              {t('access.signIn')}
            </AppHeader.ActionButton>
          )}
          {access.level === 'partner' && (
            <AppHeader.ActionButton prefixIcon={<LockIcon />} onClick={() => void access.lock()}>
              {t('access.signOut')}
            </AppHeader.ActionButton>
          )}

          {seenVersion !== version && (
            <AppHeader.ActionButton prefixIcon={<WhatsNewIcon />} onClick={openWhatsNew}>
              {t('help.whatsNew', { version })}
            </AppHeader.ActionButton>
          )}

          {/* 3.6.4: the discreet presentation mode — the page stays the page, the panel under discussion stands out. */}
          {!presentation.presenting && (
            <AppHeader.ActionButton prefixIcon={<PlayIcon />} onClick={presentation.start} data-testid="present-start">
              {t('present.start')}
            </AppHeader.ActionButton>
          )}

          <AppHeader.ActionButton prefixIcon={<RefreshIcon />} onClick={refresh}>
            {t('shell.refresh')}
          </AppHeader.ActionButton>
        </AppHeader.ActionItems>
      </AppHeader>

      {/*
        3.3.0 (backlog A9): below 640 px the strip cannot hold the Executive-mode switch — the app
        name, two selects and Strato's own Help and "more actions" buttons already fill 390 px, and
        squeezing it in pushed those two off the strip and cut the selects to "Por…" and
        "Últimas 24 h…" (measured, `.visual-qa/v330b-ptbr-mobile`). So the switch gets a row of its
        own under the header instead of a seat in it, with its label on screen. It is the control
        that puts licensing, DPS and cost away for the whole app before a screen is shared, and
        until now a presenter on a phone or a split screen had no way to turn it on — only
        `RestrictedPage` offered to leave it.

        Two instances of one control, never both visible: `display: none` takes the hidden one out
        of the accessibility tree too, so nothing is announced twice.
      */}
      <div className="pvs-hdr__mobilebar">
        <ExecutiveToggle where="bar" executiveMode={executiveMode} setExecutiveMode={setExecutiveMode} />
      </div>

      <HelpPanels panel={panel} onClose={() => setPanel(null)} />
    </>
  );
};
