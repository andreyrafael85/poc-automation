import React from 'react';

import { NavLink } from 'react-router-dom';
import {
  AIModelIcon,
  AiIcon,
  ApplicationsIcon,
  BarChartIcon,
  BugReportIcon,
  CalendarIcon,
  CompareIcon,
  ContainerIcon,
  DocumentIcon,
  GroupIcon,
  HomeIcon,
  HostsIcon,
  IdeaIcon,
  KeyIcon,
  ListIcon,
  LogsIcon,
  MoneyIcon,
  PieChartIcon,
  SecurityIcon,
  ServicesIcon,
  SettingIcon,
  TemplateIcon,
  ShopIcon,
  SmartscapeIcon,
  TargetNodeIcon,
  TechnologiesIcon,
  WorldmapIcon,
  WorkflowIcon,
} from '@dynatrace/strato-icons';

import { useAudience } from '../hooks/useAudience';
import { STORY_STAGES, isRouteVisible, sectionFor } from '../config/navigation';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The story navigation.
 *
 * v2 put 25 page names in one horizontal row; on anything narrower than a wide
 * desktop most of them collapsed into an overflow menu, so a presenter could not
 * see where they were or what came next. This is the same 25 pages, grouped into
 * the nine stages of a PoC and read top to bottom.
 *
 * Position in the story is carried by a numbered step badge and the stage name —
 * text and shape, not hue. The current page is marked with `aria-current="page"`
 * (set by `NavLink`), a filled background and an edge rule, so it is findable
 * without colour too.
 *
 * Sections whose data may be unavailable stay in the list and declare the gap on
 * the page itself, because hiding them would let a permission problem read as a
 * clean result (the v2 rule, unchanged). In executive mode the deep-technical
 * pages are hidden, and a stage left with no pages is omitted entirely.
 */

/**
 * 3.5.2 (owner: "o menu… com cara de app Dynatrace"): a functional icon beside each page, as in the platform's own
 * apps' navigation — decoration only (the label says it), hidden from assistive technology.
 */
const NAV_ICON: Record<string, React.ReactNode> = {
  '/': <HomeIcon />,
  '/settings': <SettingIcon />,
  '/builder': <TemplateIcon />,
  '/timeline': <CalendarIcon />,
  '/coverage': <TargetNodeIcon />,
  '/topology': <SmartscapeIcon />,
  '/technologies': <TechnologiesIcon />,
  '/cloud': <WorldmapIcon />,
  '/business': <ShopIcon />,
  '/experience': <ApplicationsIcon />,
  '/problems': <AiIcon />,
  '/rca': <BugReportIcon />,
  '/security': <SecurityIcon />,
  '/competitor': <CompareIcon />,
  '/services': <ServicesIcon />,
  '/infrastructure': <HostsIcon />,
  '/kubernetes': <ContainerIcon />,
  '/logs': <LogsIcon />,
  '/automation': <WorkflowIcon />,
  '/ai-observability': <AIModelIcon />,
  '/executive': <PieChartIcon />,
  '/adoption': <GroupIcon />,
  '/consumption': <BarChartIcon />,
  '/value': <MoneyIcon />,
  '/report': <DocumentIcon />,
  '/opportunities': <IdeaIcon />,
  '/licensing': <KeyIcon />,
};

export const navIconFor = (route: string): React.ReactNode => NAV_ICON[route] ?? <ListIcon />;

export const StageNav = () => {
  const { t } = useTranslation();
  const audience = useAudience();
  const { executiveMode } = audience;

  return (
    <nav className="pvs-nav" aria-label={t('shell.nav.label')}>
      {STORY_STAGES.map((stage, index) => {
        const routes = stage.routes.filter((route) => isRouteVisible(route, audience));
        if (routes.length === 0) return null;
        const headingId = `pvs-stage-${stage.id}`;

        return (
          <div key={stage.id} role="group" aria-labelledby={headingId}>
            <p className="pvs-nav__stage-title" id={headingId}>
              <span className="pvs-step" aria-hidden="true">
                {index + 1}
              </span>
              {t(stage.labelKey)}
            </p>
            <ul className="pvs-nav__stage">
              {routes.map((route) => {
                const section = sectionFor(route);
                if (section === undefined) return null;
                return (
                  <li key={route}>
                    <NavLink className="pvs-nav__link" to={route} end={route === '/'}>
                      <span className="pvs-nav__icon" aria-hidden="true">
                        {navIconFor(route)}
                      </span>
                      {t(section.labelKey)}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {executiveMode && <p className="pvs-nav__note pvs-caption">{t('shell.executiveHidden')}</p>}
    </nav>
  );
};
