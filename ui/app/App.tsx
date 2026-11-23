import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';

import { ProgressCircle } from '@dynatrace/strato-components/content';
import { Flex, PageLayout } from '@dynatrace/strato-components/layouts';
import { Text } from '@dynatrace/strato-components/typography';
import { Navigate, NavigationType, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';

import { setMeterPage } from './features/consumption/sessionMeter';

import { StageNav } from './components/StageNav';
import { StoryPager } from './components/StoryPager';
import { StudioHeader } from './components/StudioHeader';
import { PresentationBar, PresentationProvider } from './features/presentation/Presentation';
import { AppFooter } from './components/AppFooter';
import { AccessProvider, CommercialScope, useAccess } from './config/AccessContext';
import { isRouteBlocked } from './config/navigation';
import { SETUP_OPEN_ROUTES, useReadiness } from './features/setup/readiness';
import { SetupBanner, SetupWizard } from './features/setup/SetupWizard';
import { StudioProvider, useStudio } from './config/StudioContext';
import type { Identity } from './config/identity';
import { sdkStateStore, type StateStore } from './config/stateStore';
import { AccessGate } from './components/AccessGate';
import { NotFoundPage } from './components/NotFoundPage';
import { RestrictedPage } from './components/RestrictedPage';
import { RouteBoundary } from './components/RouteBoundary';
import { PageCanvas } from './engine';
import { useTranslation } from './i18n/useTranslation';

/**
 * Application shell.
 *
 * Every page is lazily loaded and every query lives inside a page, so opening the
 * app runs only the queries the landing view needs. Nothing is prefetched.
 */

const CommandCenter = lazy(async () => ({
  default: (await import('./pages/CommandCenter')).CommandCenter,
}));
const PocTimeline = lazy(async () => ({
  default: (await import('./pages/PocTimeline')).PocTimeline,
}));
const ExecutiveSummary = lazy(async () => ({
  default: (await import('./pages/ExecutiveSummary')).ExecutiveSummary,
}));
const PlatformAdoption = lazy(async () => ({ default: (await import('./pages/PlatformAdoption')).PlatformAdoption }));
const AiObservability = lazy(async () => ({ default: (await import('./pages/AiObservability')).AiObservability }));
const Assessment = lazy(async () => ({ default: (await import('./pages/Assessment')).Assessment }));
const AiInsightsCenter = lazy(async () => ({
  default: (await import('./pages/AiInsightsCenter')).AiInsightsCenter,
}));
const ProblemsRca = lazy(async () => ({
  default: (await import('./pages/ProblemsRca')).ProblemsRca,
}));
const CompetitorIntelligence = lazy(async () => ({
  default: (await import('./pages/CompetitorIntelligence')).CompetitorIntelligence,
}));
const ValueRoiEngine = lazy(async () => ({
  default: (await import('./pages/ValueRoiEngine')).ValueRoiEngine,
}));
const SeReport = lazy(async () => ({
  default: (await import('./pages/SeReport')).SeReport,
}));
const Topology = lazy(async () => ({ default: (await import('./pages/Topology')).Topology }));
const PocBuilder = lazy(async () => ({ default: (await import('./pages/PocBuilder')).PocBuilder }));
const ServicesAndTracing = lazy(async () => ({
  default: (await import('./pages/ServicesAndTracing')).ServicesAndTracing,
}));
const InfrastructureAndCloud = lazy(async () => ({
  default: (await import('./pages/InfrastructureAndCloud')).InfrastructureAndCloud,
}));
const CloudObservability = lazy(async () => ({
  default: (await import('./pages/CloudObservability')).CloudObservability,
}));
const KubernetesAndContainers = lazy(async () => ({
  default: (await import('./pages/KubernetesAndContainers')).KubernetesAndContainers,
}));
const ProcessesAndTechnologies = lazy(async () => ({
  default: (await import('./pages/ProcessesAndTechnologies')).ProcessesAndTechnologies,
}));
const LogsAndDataQuality = lazy(async () => ({
  default: (await import('./pages/LogsAndDataQuality')).LogsAndDataQuality,
}));
const ConsumptionAndLicensing = lazy(async () => ({
  default: (await import('./pages/ConsumptionAndLicensing')).ConsumptionAndLicensing,
}));
const Licensing = lazy(async () => ({
  default: (await import('./pages/Licensing')).Licensing,
}));
const AutomationAndWorkflows = lazy(async () => ({
  default: (await import('./pages/AutomationAndWorkflows')).AutomationAndWorkflows,
}));
const BusinessObservability = lazy(async () => ({
  default: (await import('./pages/BusinessObservability')).BusinessObservability,
}));
const SecurityAndRuntimeRisk = lazy(async () => ({
  default: (await import('./pages/SecurityAndRuntimeRisk')).SecurityAndRuntimeRisk,
}));
const DigitalExperience = lazy(async () => ({
  default: (await import('./pages/DigitalExperience')).DigitalExperience,
}));
const ImprovementOpportunities = lazy(async () => ({
  default: (await import('./pages/ImprovementOpportunities')).ImprovementOpportunities,
}));
const Settings = lazy(async () => ({ default: (await import('./pages/Settings')).Settings }));

const PageFallback = () => {
  const { t } = useTranslation();
  return (
    <Flex flexDirection="column" alignItems="center" gap={8} padding={32} role="status">
      <ProgressCircle aria-label={t('shell.loadingSection')} />
      <Text>{t('shell.loadingSectionText')}</Text>
    </Flex>
  );
};

/**
 * Moves focus to the content region when the route changes.
 *
 * In a single-page app a navigation does not reload the document, so a keyboard
 * or screen-reader user is left on the link they activated, with the new page
 * somewhere after it. Focusing the content wrapper (a programmatic target,
 * `tabIndex={-1}`, inside Strato's own `main` landmark)
 * puts them at the top of the new page. It is skipped on first load so the app
 * does not steal focus when it opens, and on a redirect (3.6.5).
 */
const useRouteFocus = (target: React.RefObject<HTMLElement | null>) => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // 3.6.5: a redirect (an old address such as `/assessment` replaced by `/coverage`) is not the user moving: the
    // focus stays where the document left it, so the first Tab still reaches "Skip to content".
    if (navigationType === NavigationType.Replace) return;
    target.current?.focus({ preventScroll: false });
  }, [pathname, navigationType, target]);
};

/** `/assessment` was the Assessment's address until 3.4.11: it now opens Coverage, keeping the query (`?locale=…`). */
/** 3.6.6: `/settings?tab=dashboards` (the dashboards' old address) opens the PoC builder; any other address, Settings. */
const SettingsRoute = () => {
  const { search } = useLocation();
  return new URLSearchParams(search).get('tab') === 'dashboards' ? <Navigate to={{ pathname: '/builder' }} replace /> : <Settings />;
};

const ToCoverage = () => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: '/coverage', search, hash }} replace />;
};

const Shell = () => {
  const { t } = useTranslation();
  const access = useAccess();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  useRouteFocus(mainRef);
  // 3.4.11 (F-16): the session meter files each read under the page that asked for it.
  setMeterPage(pathname);

  // A page the viewer may not open is refused even when it is reached by URL, not just hidden.
  const restricted = access.level === 'customer' && access.restrictedView;
  const blocked = isRouteBlocked(pathname, { commercialVisible: access.commercialVisible, restricted });
  // 3.7.7 (the owner: the app opens in full once at least 5 of the 7 readiness steps are saved): while a PoC is being
  // prepared, the SE and the partner see the wizard instead of the story's pages; Settings and the PoC Builder stay open.
  // Only when the configuration lives on the tenant (a session-only store, as in the tests, never gates) and never for a
  // customer or in executive mode.
  const { executiveMode, persistence } = useStudio();
  const readiness = useReadiness();
  const preparing =
    access.canWork && !executiveMode && !readiness.ready && ['saved', 'saving', 'conflict'].includes(persistence.status);
  const setupOpen = SETUP_OPEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  return (
    <PresentationProvider>
    <PageLayout>
      <PageLayout.Header>
        {/* Excluded from printed output: the report page carries its own header. */}
        <div data-print-hide>
          {/* A same-page `#hash` link would resolve against the document base and
              navigate away, so the skip link focuses the target directly. */}
          <a
            className="pvs-skip"
            href="#pvs-main"
            onClick={(event) => {
              event.preventDefault();
              mainRef.current?.focus();
            }}
          >
            {t('shell.skipToContent')}
          </a>
          <StudioHeader />
        </div>
      </PageLayout.Header>
      {/* 3.7.8 (the owner: "habilitar o menu somente depois de atingir os níveis de preenchimento"): while the PoC is being
          prepared the menu stays hidden; the wizard and the banner lead to Settings and the PoC Builder. */}
      {!preparing && (
        <PageLayout.Sidebar label={t('shell.nav.label')} defaultWidth={296} minWidth={248} maxWidth={420}>
          <StageNav />
        </PageLayout.Sidebar>
      )}
      <PageLayout.Content>
        {/* Strato's `PageLayout.Content` is already the page's one `main` landmark, so
            this is a plain focus target inside it, not a second `main`. */}
        <div id="pvs-main" className="pvs-main" ref={mainRef} tabIndex={-1}>
          <PageCanvas>
            {/* 3.3.0: one boundary around the routed page, keyed by the address, so a page that
                throws (a chunk missing after a redeploy, a tenant shape no fixture had) shows a
                recovery card instead of blanking the app, and leaving the route arms it again.
                The header, the navigation, the pager and the footer stay outside it and keep
                working. */}
            <RouteBoundary resetKey={pathname}>
              <Suspense fallback={<PageFallback />}>
                {preparing && setupOpen && <SetupBanner readiness={readiness} />}
                {blocked ? (
                  <RestrictedPage reason={restricted || !access.canWork ? 'customer' : 'commercial'} />
                ) : preparing && !setupOpen ? (
                  <SetupWizard readiness={readiness} />
                ) : (
                <Routes>
                  <Route path="/" element={<CommandCenter />} />
                  <Route path="/timeline" element={<PocTimeline />} />
                  <Route path="/executive" element={<ExecutiveSummary />} />
                  <Route path="/report" element={<SeReport />} />
                  {/* 3.4.12: the Assessment and Coverage are one page, "Coverage"; old links still land there. */}
                  <Route path="/assessment" element={<ToCoverage />} />
                  <Route path="/adoption" element={<PlatformAdoption />} />
                  <Route path="/ai-observability" element={<AiObservability />} />
                  <Route path="/coverage" element={<Assessment />} />
                  <Route path="/problems" element={<AiInsightsCenter />} />
                  <Route path="/rca" element={<ProblemsRca />} />
                  <Route path="/competitor" element={<CompetitorIntelligence />} />
                  <Route path="/value" element={<ValueRoiEngine />} />
                  {/* 3.2.4: the deck lives in the SE Report, under its export profile; the old address opens that tab. */}
                  <Route path="/wrapup" element={<SeReport initialTab={2} />} />
                  {/* 3.2.7: 3 = SE_REPORT_TABS.prints; literal so App does not pull the SeReport chunk. */}
                  <Route path="/wrapup/prints" element={<SeReport initialTab={3} />} />
                  <Route path="/topology" element={<Topology />} />
                  <Route path="/services" element={<ServicesAndTracing />} />
                  <Route path="/infrastructure" element={<InfrastructureAndCloud />} />
                  <Route path="/cloud" element={<CloudObservability />} />
                  <Route path="/kubernetes" element={<KubernetesAndContainers />} />
                  <Route path="/technologies" element={<ProcessesAndTechnologies />} />
                  <Route path="/logs" element={<LogsAndDataQuality />} />
                  <Route path="/consumption" element={<ConsumptionAndLicensing />} />
                  <Route path="/licensing" element={<Licensing />} />
                  <Route path="/automation" element={<AutomationAndWorkflows />} />
                  <Route path="/business" element={<BusinessObservability />} />
                  <Route path="/security" element={<SecurityAndRuntimeRisk />} />
                  <Route path="/experience" element={<DigitalExperience />} />
                  <Route path="/opportunities" element={<ImprovementOpportunities />} />
                  {/* 3.7.9: the Roadmap page became the 30-60-90 action plan, a tab of Opportunities. */}
                  <Route path="/roadmap" element={<Navigate to={{ pathname: '/opportunities', search: '?tab=plan' }} replace />} />
                  <Route path="/settings" element={<SettingsRoute />} />
                  <Route path="/builder" element={<PocBuilder />} />
                  {/* 3.3.0: an address this app does not have renders a page that says so, instead
                      of an empty content area that looks like a page that failed to load. */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                )}
              </Suspense>
            </RouteBoundary>
            {!preparing && <StoryPager />}
            <AppFooter />
          </PageCanvas>
        </div>
        {/* 3.6.4: the presentation mode's thin bar (screen only). */}
        <PresentationBar />
      </PageLayout.Content>
    </PageLayout>
    </PresentationProvider>
  );
};

/**
 * Decides what a viewer gets: nothing yet (the roster is still being read), the partner logon, or
 * the app. After a successful logon the gate stays a moment so the vault can finish opening.
 */
const Gate = () => {
  const { level, restrictedView } = useAccess();
  const gated = level === 'customer' && !restrictedView;
  const wasGated = useRef(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (gated) wasGated.current = true;
    if (level === 'partner' && wasGated.current) {
      wasGated.current = false;
      setOpening(true);
      const timer = setTimeout(() => setOpening(false), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gated, level]);

  if (level === 'loading') return <PageFallback />;
  if (opening) return <AccessGate opened />;
  if (gated) return <AccessGate />;
  return <Shell />;
};

export interface AppProps {
  /** Where the configuration and the partner roster are kept; the platform's App State by default. */
  store?: StateStore | null;
  /** Overrides who is signed in (tests). */
  identity?: Identity;
}

/**
 * Executive mode is the presentation mode (3.2.6): with commercial data native to the SE and the
 * partner, it is what puts licensing, DPS and cost away for the whole app before a screen is
 * shared — pages, links, the nav and the export profile all read the narrowed value.
 */
const PresentationScope = ({ children }: { children: React.ReactNode }) => {
  const { executiveMode } = useStudio();
  return <CommercialScope allow={!executiveMode}>{children}</CommercialScope>;
};

export const App = ({ store = sdkStateStore, identity }: AppProps = {}) => (
  <AccessProvider store={store} identity={identity}>
    <StudioProvider store={store}>
      <PresentationScope>
        <Gate />
      </PresentationScope>
    </StudioProvider>
  </AccessProvider>
);
