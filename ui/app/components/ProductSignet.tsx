import React from 'react';

import {
  ApplicationObservabilitySignetIcon,
  ApplicationSecuritySignetIcon,
  AutomationEngineSignetIcon,
  BusinessAnalyticsSignetIcon,
  DigitalExperienceSignetIcon,
  DynatraceIntelligenceSignetIcon,
  GrailSignetIcon,
  InfrastructureObservabilitySignetIcon,
  LogAnalyticsSignetIcon,
  ObservabilitySignetIcon,
  OneAgentSignetIcon,
  PlatformSignetIcon,
  SmartscapeSignetIcon,
} from '@dynatrace/strato-icons';

/**
 * The Dynatrace product behind a page, as its signet beside the page title (3.4.15, proposal D-12): the customer
 * recognises at a glance which part of the platform each page shows. Decorative — the title says it in words — and
 * read from the route, so no page passes it. A page that is not one product (the Overview, Settings, the reports)
 * has none.
 */
const SIGNETS: Readonly<Record<string, React.ComponentType>> = {
  '/coverage': ObservabilitySignetIcon,
  '/topology': SmartscapeSignetIcon,
  '/technologies': OneAgentSignetIcon,
  '/cloud': InfrastructureObservabilitySignetIcon,
  '/business': BusinessAnalyticsSignetIcon,
  '/experience': DigitalExperienceSignetIcon,
  '/problems': DynatraceIntelligenceSignetIcon,
  '/rca': DynatraceIntelligenceSignetIcon,
  '/security': ApplicationSecuritySignetIcon,
  '/services': ApplicationObservabilitySignetIcon,
  '/infrastructure': InfrastructureObservabilitySignetIcon,
  '/kubernetes': InfrastructureObservabilitySignetIcon,
  '/logs': LogAnalyticsSignetIcon,
  '/automation': AutomationEngineSignetIcon,
  '/adoption': PlatformSignetIcon,
  '/consumption': GrailSignetIcon,
  '/licensing': PlatformSignetIcon,
};

export const signetFor = (pathname: string): React.ComponentType | undefined => SIGNETS[pathname];

export const ProductSignet = ({ pathname }: { pathname: string }) => {
  const Icon = signetFor(pathname);
  if (Icon === undefined) return null;
  return (
    <span className="pvs-frame__signet" aria-hidden="true" data-testid="product-signet">
      <Icon />
    </span>
  );
};
