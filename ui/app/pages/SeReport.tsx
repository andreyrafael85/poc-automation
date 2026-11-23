import React, { Suspense, lazy, useState } from 'react';

import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { Text } from '@dynatrace/strato-components/typography';

import { ValueReport } from './ValueReport';
import { TechWrapup } from './TechWrapup';
import { FirstDayContent } from '../components/FirstDayContent';
import { SectionIntro } from '../components/SectionIntro';
import { CommercialScope, useAccess } from '../config/AccessContext';
import { Stack } from '../engine';
import '../engine/page-a.css';
import { ExportProfileBar, ExportProfileProvider, SeProfileBanner, effectiveProfile } from '../features/wrapup/exportProfile';
import type { DeckProfile } from '../features/wrapup/spec';
import { useTranslation } from '../i18n/useTranslation';

/**
 * SE Report — the customer-facing deliverables under one roof.
 *
 * The tabs share a header and one **export profile** (3.2.4): the printable **General report**,
 * the copyable **First-day** message, the **Tech Wrapup** deck (preview = file, PowerPoint and
 * PDF) and, since 3.2.7, the **real-prints deck** ("Teste Deck Wrapup Print": real Dynatrace
 * screens, each with its DQL reading), loaded lazily so the other tabs do not carry its code. The profile starts on Customer — nothing commercial in any tab or file — and can move to
 * SE (internal, watermarked) while the session may see commercial data (SE or partner, outside
 * executive mode); it narrows commercial data for everything below through `CommercialScope`.
 *
 * 3.2.6: the "Executive (one page)" tab is gone — the executive page is the deck's slide after the
 * agenda, and the deck prints it with the rest.
 *
 * Only the active tab's content mounts (no `keepMounted`), so each keeps its own data loading,
 * print styles and download actions. The tabs are Strato's own `Tabs`. The header, the profile and
 * the tab bar are screen-only (`data-print-hide` / `data-wrap-hide`, and a print rule in
 * `page-a.css` for the tablist). This page owns the `h1`.
 */

// The real-prints tab is its own chunk: the planner, the evidence engine and the capture code load only when it opens.
const PrintDeckTab = lazy(async () => ({ default: (await import('../features/wrapup/prints/ui/PrintDeckTab')).PrintDeckTab }));

/** The tabs, in order; `/wrapup` opens the deck tab, `/wrapup/prints` the real-prints tab. */
export const SE_REPORT_TABS = { general: 0, firstDay: 1, deck: 2, prints: 3 } as const;

export const SeReport = ({ initialTab = SE_REPORT_TABS.general }: { initialTab?: number }) => {
  const { t } = useTranslation();
  const { commercialVisible } = useAccess();
  const [choice, setChoice] = useState<DeckProfile>('customer');
  const profile = effectiveProfile(choice, commercialVisible);

  return (
    <>
      <div data-print-hide data-wrap-hide>
        <Stack gap="group">
          <SectionIntro titleKey="sereport.eyebrow" questionKey="sereport.subtitle" />
          <ExportProfileBar profile={profile} onChange={setChoice} seAvailable={commercialVisible} />
        </Stack>
      </div>

      <CommercialScope allow={profile === 'se'}>
        <ExportProfileProvider value={profile}>
          {profile === 'se' && <SeProfileBanner />}
          <div className="pvs-sereport" data-profile={profile}>
            <Tabs defaultIndex={initialTab}>
              <Tab title={t('sereport.tab.general')}>
                <ValueReport />
              </Tab>
              <Tab title={t('sereport.tab.firstday')}>
                <FirstDayContent />
              </Tab>
              <Tab title={t('sereport.tab.deck')}>
                <TechWrapup embedded />
              </Tab>
              <Tab title={t('sereport.tab.prints')}>
                <Suspense fallback={<Text>{t('prt.loading')}</Text>}>
                  <PrintDeckTab />
                </Suspense>
              </Tab>
            </Tabs>
          </div>
        </ExportProfileProvider>
      </CommercialScope>
    </>
  );
};
