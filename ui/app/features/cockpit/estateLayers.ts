import { ENTITY_TILES } from '../../components/spectrum/entityTiles';
import type { DonutSegment } from '../../components/viz/DonutBreakdown';
import type { Translation } from '../../i18n/useTranslation';
import { diagnoseEntityModel } from '../../models/entityHealth';
import { num, str, type GrailRecord } from '../../utils/records';

/** How many layers the donut names before folding the rest into "other layers". */
export const ESTATE_DONUT_TOP = 5;

/**
 * The monitored estate by layer, for the donut of the Overview cockpit (3.3.7) and of Coverage
 * (3.3.12): every layer `cov.inventory` counts above zero, largest first, the top five named and
 * the rest folded. `cov.inventory` is an aggregate (one count per category), so the total in the
 * centre is a sum of measured counts, never of a capped list. Empty when the entity model was not
 * readable.
 */
export function estateLayers(
  records: readonly GrailRecord[],
  answered: boolean,
  t: Translation['t'],
  formatNumber: Translation['formatNumber'],
): { segments: DonutSegment[]; estate: number } {
  const model = diagnoseEntityModel(records);
  if (!answered || model.state === 'unavailable') return { segments: [], estate: 0 };
  const layers = ENTITY_TILES.map((tile) => ({ tile, value: num(records.find((record) => str(record, 'category') === tile.inventoryCategory), 'value') }))
    .filter((layer): layer is { tile: (typeof ENTITY_TILES)[number]; value: number } => layer.value !== null && layer.value > 0)
    .sort((a, b) => b.value - a.value);
  const estate = layers.reduce((sum, layer) => sum + layer.value, 0);
  const others = layers.slice(ESTATE_DONUT_TOP).reduce((sum, layer) => sum + layer.value, 0);
  const segments: DonutSegment[] = [
    ...layers.slice(0, ESTATE_DONUT_TOP).map((layer) => ({ key: layer.tile.inventoryCategory, label: t(layer.tile.labelKey), value: layer.value, display: formatNumber(layer.value) })),
    ...(others > 0 ? [{ key: 'others', label: t('cockpit.donut.others'), value: others, display: formatNumber(others) }] : []),
  ];
  return { segments, estate };
}
