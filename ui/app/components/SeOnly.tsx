import React from 'react';

import { useAccess } from '../config/AccessContext';

/**
 * Shows its children only while commercial data is on screen: an SE or a partner, outside
 * executive mode. The "Commercial data" switch this used to read was retired in 3.2.6.
 *
 * Licensing, DPS rates, cost and anything priced is validation material for the Sales Engineer,
 * a commercial conversation that belongs after the PoC. Wrapping it here means the one switch in
 * the header decides, for every page and every export, whether a customer could see it.
 */
export const SeOnly = ({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
  const { commercialVisible } = useAccess();
  return <>{commercialVisible ? children : fallback}</>;
};

/** The same decision for code that builds data rather than markup (exports). */
export function useCommercialVisible(): boolean {
  return useAccess().commercialVisible;
}
