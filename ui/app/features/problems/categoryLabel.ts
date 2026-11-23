import type { Translation } from '../../i18n/useTranslation';

/**
 * The reader's name for a Davis problem category (3.3.11: shared by AIOps & RCA and Dynatrace
 * Intelligence). An unknown category is shown as Dynatrace reports it.
 */
export function problemCategoryLabel(category: string, t: Translation['t']): string {
  const map: Record<string, string> = {
    AVAILABILITY: t('p.rca.cat.availability'),
    ERROR: t('p.rca.cat.error'),
    SLOWDOWN: t('p.rca.cat.slowdown'),
    RESOURCE_CONTENTION: t('p.rca.cat.resource'),
    CUSTOM_ALERT: t('p.rca.cat.custom'),
  };
  return map[category] ?? category;
}
