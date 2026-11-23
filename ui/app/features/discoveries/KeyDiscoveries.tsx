import React from 'react';

import { Chip, ProgressBar, Skeleton } from '@dynatrace/strato-components/content';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import {
  CheckmarkIcon,
  GuideIcon,
  LockIcon,
  SyncOffIcon,
  WarningIcon,
} from '@dynatrace/strato-icons';
import { Link as RouterLink } from 'react-router-dom';

import { Cluster, Grid, Panel, Stack } from '../../engine';
import type { IconComponent } from '../../engine/evidence';
import { rankDiscoveries, type DiscoverySeverity } from './ranking';
import { useInsightSignals } from '../../hooks/useInsightSignals';
import { useCommercialVisible } from '../../components/SeOnly';
import { useTranslation } from '../../i18n/useTranslation';
import { formatBytes } from '../../utils/time';
import { decimal } from '../../utils/activeLocale';
import { assumed } from '../../config/assumptions';

/**
 * Headline discoveries for the landing screen.
 *
 * Each card is generated from a live signal that crossed a stated threshold, and
 * carries the measurement that produced it plus a route into the evidence. A
 * signal that did not cross its threshold produces no card, so the screen never
 * pads itself.
 *
 * ## Colour discipline (v3.1)
 *
 * A card that reports a **measured condition** in the estate ("needs attention")
 * is a quiet card with one amber edge, an icon and the words. A card that reports
 * that **this review could not read** something (security events, real user
 * monitoring) is a limitation of the review, not a fault in the estate: it is
 * neutral, dashed, and says so, and never borrows the amber of a measured fault.
 * Every other card is plain.
 *
 * The numbers underneath are the same measured ones used everywhere else.
 */

type Severity = DiscoverySeverity;

interface Discovery {
  id: string;
  headline: string;
  /** The measurement, stated exactly. */
  measurement: string;
  /** Why it matters, in one sentence. */
  meaning: string;
  severity: Severity;
  /**
   * Set when the card says this review could not read a source. That is a
   * limitation of the review, so the card is neutral and dashed whatever its
   * severity ranking.
   */
  gap?: 'no-permission' | 'no-telemetry';
  route: string;
  /** Optional 0-100 bar, used only where a ratio is genuinely meaningful. */
  ratio?: { value: number; label: string };
}

/**
 * Severity chip: an icon and a word, then a tone.
 *
 * Amber rather than red for the attention case: these cards sit on the landing
 * screen an executive sees first, and a wall of red reads as "your environment
 * is broken" when the finding is usually an improvement opportunity. A card about
 * a source this review could not read is neutral (see the file comment).
 */
const SeverityChip = ({ discovery }: { discovery: Discovery }) => {
  const { t } = useTranslation();
  const { severity, gap } = discovery;

  let color: 'neutral' | 'primary' | 'success' | 'warning' = 'success';
  let label = t('disc.working');
  let Icon: IconComponent = CheckmarkIcon;

  if (gap !== undefined) {
    color = 'neutral';
    label = t('disc.notReadable');
    Icon = gap === 'no-permission' ? LockIcon : SyncOffIcon;
  } else if (severity === 'critical') {
    color = 'warning';
    label = t('disc.needsAttention');
    Icon = WarningIcon;
  } else if (severity === 'warning') {
    color = 'primary';
    label = t('disc.opportunity');
    Icon = GuideIcon;
  }

  return (
    <Chip color={color} variant="accent" size="condensed">
      <Chip.Prefix>
        <Icon aria-hidden="true" />
      </Chip.Prefix>
      {label}
    </Chip>
  );
};

export const KeyDiscoveries = () => {
  const { signals, isLoading } = useInsightSignals();
  const { t, tCount, formatNumber } = useTranslation();
  // How the customer is billed for scanning data is for the SE, not for the customer's screen.
  const commercial = useCommercialVisible();

  if (isLoading) {
    return (
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('disc.title')}
        </Heading>
        {/* Skeletons are drawn as unnamed images; they are decoration, so they are hidden
            from assistive technology and the state is announced in words instead. */}
        <Text className="pvs-sr-only" role="status">
          {t('shell.loadingSectionText')}
        </Text>
        <Grid min={320} aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <Panel key={index}>
              <Stack gap="tight">
                <Skeleton height={16} width="40%" />
                <Skeleton height={28} width="80%" />
                <Skeleton height={14} width="100%" />
                <Skeleton height={14} width="70%" />
              </Stack>
            </Panel>
          ))}
        </Grid>
      </Stack>
    );
  }

  const discoveries: Discovery[] = [];

  // --- log volume without context ----------------------------------------
  if (signals.logServiceContextPct !== null && signals.logServiceContextPct < assumed('findings.logContext.low')) {
    discoveries.push({
      id: 'log-context',
      headline: t('f.disc.logs'),
      measurement: t('f.disc.logs.measure', { pct: decimal(signals.logServiceContextPct, 2) }),
      meaning: t('f.disc.logs.meaning'),
      severity: 'critical',
      route: '/logs',
      ratio: { value: signals.logServiceContextPct, label: t('f.disc.logsLabel') },
    });
  }

  // --- recurring problems -------------------------------------------------
  const topPattern = signals.recurringProblems[0];
  if (topPattern !== undefined && topPattern.occurrences >= assumed('findings.pattern.min')) {
    discoveries.push({
      id: 'recurrence',
      headline: t('f.disc.recurring'),
      measurement: t('f.disc.recurring.measure', {
        name: topPattern.name,
        count: formatNumber(topPattern.occurrences),
        // The recurrence query is pinned to 7 days; the global window is not its window.
        window: signals.recurringWindowLabel,
      }),
      meaning: t('f.disc.recurring.meaning'),
      severity: 'warning',
      route: '/problems',
    });
  }

  // --- workload instability ----------------------------------------------
  const topRestart = signals.restartingWorkloads[0];
  if (topRestart !== undefined && topRestart.restarts >= assumed('findings.restarts.min')) {
    discoveries.push({
      id: 'restarts',
      headline: t('f.disc.workload'),
      measurement: t('f.disc.workload.measure', {
        count: formatNumber(topRestart.restarts),
        workload: topRestart.workload,
        cluster: topRestart.cluster,
      }),
      meaning: t('f.disc.workload.meaning'),
      severity: 'critical',
      route: '/kubernetes',
    });
  }

  // --- query efficiency ---------------------------------------------------
  const worstTable = signals.inefficientTables[0];
  if (commercial && worstTable !== undefined && worstTable.bytesPerRecord > 1_000_000) {
    discoveries.push({
      id: 'query-cost',
      headline: t('f.disc.queryCost'),
      measurement: t('f.disc.queryCost.measure', {
        table: worstTable.table,
        scanned: formatBytes(worstTable.scannedBytes),
        perRecord: formatBytes(worstTable.bytesPerRecord),
      }),
      meaning: t('f.disc.queryCost.meaning'),
      severity: 'warning',
      route: '/consumption',
    });
  }

  // --- failing automation -------------------------------------------------
  // Exact totals (`auto.workflows.total`); the 40-row ranked list would undercount (exactness rule).
  const failing = signals.failingWorkflowsTotal;
  if (failing !== null && failing.workflows > 0) {
    discoveries.push({
      id: 'failing-workflows',
      headline: t('f.disc.automation'),
      measurement: t('f.disc.automation.measure', {
        runs: formatNumber(failing.failedRuns),
        count: failing.workflows,
      }),
      meaning: t('f.disc.automation.meaning'),
      severity: 'critical',
      route: '/automation',
    });
  }

  // --- declared gaps ------------------------------------------------------
  if (signals.securityUnreadable) {
    discoveries.push({
      id: 'security-gap',
      headline: t('f.disc.security'),
      measurement: t('f.disc.security.measure'),
      meaning: t('f.disc.security.meaning'),
      severity: 'critical',
      gap: 'no-permission',
      route: '/security',
    });
  }

  if (signals.experienceUnavailable) {
    discoveries.push({
      id: 'rum-gap',
      headline: t('f.disc.rum'),
      measurement: t('f.disc.rum.measure'),
      meaning: t('f.disc.rum.meaning'),
      severity: 'warning',
      gap: 'no-telemetry',
      route: '/experience',
    });
  }

  const ranked = rankDiscoveries(discoveries);

  if (ranked.length === 0) {
    return (
      <Stack gap="tight">
        <Heading level={4} as="h2">
          {t('disc.title')}
        </Heading>
        <Paragraph className="pvs-prose">{t('disc.none', { window: signals.windowLabel })}</Paragraph>
      </Stack>
    );
  }

  return (
    <Stack gap="group">
      <Cluster align="baseline" justify="between">
        <Heading level={4} as="h2">
          {t('disc.title')}
        </Heading>
        <Text className="pvs-caption">
          {tCount('disc.count', ranked.length, { count: formatNumber(ranked.length), window: signals.windowLabel })}
        </Text>
      </Cluster>

      <Grid min={340}>
        {ranked.map((discovery) => (
          <Panel
            key={discovery.id}
            pad="roomy"
            // The one edge is for a measured condition in the estate: a card
            // ranked "critical" from a measurement. A source this review could not
            // read is dashed and neutral instead, and an opportunity is plain.
            rail={discovery.severity === 'critical' && discovery.gap === undefined}
            railTone="warning"
            evidence={discovery.gap}
          >
            <Stack gap="group">
              <SeverityChip discovery={discovery} />
              <Heading level={5} as="h3">
                {discovery.headline}
              </Heading>
              <Text>{discovery.measurement}</Text>

              {discovery.ratio !== undefined && (
                <ProgressBar
                  value={Math.max(discovery.ratio.value, 0.5)}
                  max={100}
                  aria-label={discovery.ratio.label}
                >
                  <ProgressBar.Label>{discovery.ratio.label}</ProgressBar.Label>
                </ProgressBar>
              )}

              <Paragraph>{discovery.meaning}</Paragraph>
              <Link as={RouterLink} to={discovery.route}>
                {t('disc.seeEvidence')}
              </Link>
            </Stack>
          </Panel>
        ))}
      </Grid>
    </Stack>
  );
};
