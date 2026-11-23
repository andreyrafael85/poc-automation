import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useAccess } from '../../config/AccessContext';
import { isRouteBlocked } from '../../config/navigation';
import { useQueryScope } from '../../config/StudioContext';
import { Figure, Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useTranslation } from '../../i18n/useTranslation';
import { summariseRca } from '../../models/rca';
import { formatNanos } from '../../utils/time';
import { RcaTrail } from '../rca/RcaTrail';

/**
 * "The incident that shows the value" (3.2.7) — on the Executive summary, in place of the cloud
 * estate panel the Overview's stack map already covers. The most impactful incident of the window
 * (`rca.top`, the RCA page's own query), told in one sentence for an executive: what Davis caught,
 * the root cause it named by itself, how long it lasted and how far it reached — with the trail,
 * whose boxes open the problem and the entities in Dynatrace, and a way to the full analysis.
 */
export const IncidentSpotlight = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const navigate = useNavigate();
  const access = useAccess();
  const top = useCatalogQuery('rca.top', scope);
  const incident = summariseRca(top.records, [], []).incident;
  if (incident === null) return null;

  const restricted = access.level === 'customer' && access.restrictedView;
  const canOpen = !isRouteBlocked('/rca', { commercialVisible: access.commercialVisible, restricted });
  const duration = incident.durationNs === null ? '—' : formatNanos(incident.durationNs);
  const open = incident.status.toUpperCase() === 'ACTIVE';
  // `rca.top` falls back to any root-caused problem, and a CUSTOM_ALERT one was raised by an
  // alerting rule someone wrote: its lead cannot say "no alerting rule written".
  const custom = incident.category.toUpperCase() === 'CUSTOM_ALERT';
  const leadParams = { name: incident.name, count: formatNumber(incident.affectedCount) };

  return (
    <Panel as="section" pad="roomy" className="pvs-spec-band pvs-spotlight" data-spectrum="pink-purple">
      <span className="pvs-spec-band__edge" aria-hidden="true" />
      <Stack gap="group">
        <Stack gap="tight">
          <Text className="pvs-label">{t('exec3.spot.eyebrow', { id: incident.displayId })}</Text>
          <Heading level={4} as="h2">
            {t('exec3.spot.title')}
          </Heading>
          <Paragraph className="pvs-lead">
            {incident.rootCauseName === null
              ? t(custom ? 'exec3.spot.leadCustomNoRoot' : 'exec3.spot.leadNoRoot', leadParams)
              : t(custom ? 'exec3.spot.leadCustom' : 'exec3.spot.lead', { ...leadParams, root: incident.rootCauseName })}
          </Paragraph>
        </Stack>
        <div className="pvs-spotlight__facts">
          <Stack gap="tight">
            <Text className="pvs-label">{t(open ? 'exec3.spot.openFor' : 'exec3.spot.lasted')}</Text>
            <Figure value={duration} size="lg" ink="spectrum" />
          </Stack>
          <Stack gap="tight">
            <Text className="pvs-label">{t('exec3.spot.root')}</Text>
            <Text className="pvs-spotlight__root">{incident.rootCauseName ?? t('story.root.none')}</Text>
          </Stack>
          <Stack gap="tight">
            <Text className="pvs-label">{t('exec3.spot.reach')}</Text>
            <Figure value={formatNumber(incident.affectedCount)} unit={t('exec3.spot.entities')} size="lg" ink="spectrum" />
          </Stack>
        </div>
        <RcaTrail incident={incident} />
        {canOpen && (
          <div>
            <Button variant="emphasized" onClick={() => void navigate('/rca')}>
              {t('exec3.spot.open')}
            </Button>
          </div>
        )}
      </Stack>
    </Panel>
  );
};
