import { AutomationEngineIcon, HeartIcon, MoneyIcon, StopwatchIcon } from '@dynatrace/strato-icons';

import type { SpectrumFamily } from '../../components/spectrum';
import type { IconComponent } from '../../engine/evidence';
import type { PillarId } from '../../models/pillars';

/**
 * How a value pillar looks wherever it appears (3.2.6): the plan in Settings, the pillar tiles of
 * the Overview, the Executive summary and the report. A family is identity, never a verdict — the
 * verdicts are the statuses of the points and of the objectives.
 */
export const PILLAR_LOOK: Record<PillarId, { Icon: IconComponent; family: SpectrumFamily }> = {
  resilience: { Icon: HeartIcon, family: 'pink-purple' },
  productivity: { Icon: AutomationEngineIcon, family: 'blue-turquoise' },
  cost: { Icon: MoneyIcon, family: 'moss' },
  agility: { Icon: StopwatchIcon, family: 'orange' },
};
