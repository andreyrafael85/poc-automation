import React, { createContext, useContext } from 'react';

import { MessageContainer } from '@dynatrace/strato-components/content';
import { ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import { Strong, Text } from '@dynatrace/strato-components/typography';

import { Cluster, Panel, Stack } from '../../engine';
import { useTranslation } from '../../i18n/useTranslation';
import type { DeckProfile } from './spec';

/**
 * The export profile of the SE Report (3.2.4): **Customer**, the default, is ready to hand over —
 * no licensing, DPS, consumption, rate or priced figure in any tab or file; **SE** keeps them and
 * marks every page and slide "SE internal". The profile narrows "Commercial data" for the whole
 * report through `CommercialScope`, so every `SeOnly` block and every export below obeys it; the
 * SE profile can only be chosen while "Commercial data" is on.
 */

const ExportProfileContext = createContext<DeckProfile>('customer');

export const ExportProfileProvider = ExportProfileContext.Provider;

/** The profile the exports below are made for (Customer when no report is around). */
export function useExportProfile(): DeckProfile {
  return useContext(ExportProfileContext);
}

/** The profile a choice resolves to: SE only while the session may see commercial data. */
export function effectiveProfile(choice: DeckProfile, commercialVisible: boolean): DeckProfile {
  return choice === 'se' && commercialVisible ? 'se' : 'customer';
}

export const ExportProfileBar = ({
  profile,
  onChange,
  seAvailable,
}: {
  profile: DeckProfile;
  onChange: (profile: DeckProfile) => void;
  seAvailable: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <Panel pad="roomy" className="pvs-profile" data-profile={profile}>
      <Stack gap="tight">
        <Cluster gap="group">
          <Text id="pvs-profile-label" className="pvs-label">
            {t('profile.label')}
          </Text>
          {/* Without commercial data there is one profile to choose: it is stated, not offered disabled. */}
          {seAvailable ? (
            <ToggleButtonGroup
              value={profile}
              onChange={(value: string) => onChange(value === 'se' ? 'se' : 'customer')}
              aria-labelledby="pvs-profile-label"
            >
              <ToggleButtonGroup.Item value="customer">{t('profile.customer')}</ToggleButtonGroup.Item>
              <ToggleButtonGroup.Item value="se">{t('profile.se')}</ToggleButtonGroup.Item>
            </ToggleButtonGroup>
          ) : (
            <Strong>{t('profile.customer')}</Strong>
          )}
        </Cluster>
        <Text id="pvs-profile-help" className="pvs-caption">
          {profile === 'se' ? t('profile.se.help') : seAvailable ? t('profile.customer.help') : `${t('profile.customer.help')} ${t('profile.se.locked')}`}
        </Text>
      </Stack>
    </Panel>
  );
};

/** The line every page of an SE-profile export carries (printed in the general report). */
export const SeProfileBanner = () => {
  const { t } = useTranslation();
  return (
    <MessageContainer variant="warning" data-wrap-hide>
      <MessageContainer.Title>{t('profile.watermark')}</MessageContainer.Title>
      <MessageContainer.Description>{t('profile.banner')}</MessageContainer.Description>
    </MessageContainer>
  );
};
