import { useAccess } from '../../config/AccessContext';
import { useStudio } from '../../config/StudioContext';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * 3.7.7 (the owner: "para novas POCs ou quando o deploy for feito limpo na tenant, gerar um wizard … atingir ao menos 5/7
 * etapas preenchidas … para seguir com o App full"): what the PoC needs before the story is told — the same items Settings
 * has listed since 3.3.21 (from what is saved, never the draft) — and how many the app asks for before it opens in full.
 */
export type ReadinessKey = 'customer' | 'logo' | 'description' | 'dates' | 'criteria' | 'dashboard' | 'serviceUser' | 'rate';

export interface ReadinessStep {
  key: ReadinessKey;
  done: boolean;
  /** Where the step is done: Settings with its tab, or the PoC Builder. */
  path: string;
}

/** Five of seven (about 70 %): the share the owner set; with fewer items listed, the same share rounded up. */
export function requiredSteps(total: number): number {
  return Math.min(total, Math.ceil((total * 5) / 7));
}

/** The readiness of what is saved. Pure. */
export function readinessSteps(
  saved: {
    customerName: string;
    customerLogoDataUrl: string | null;
    pocDescription: string;
    scopeDescription: string;
    startDate: string | null;
    endDate: string | null;
    criteria: number;
    dashboards: number;
    ratePerHour: number | null;
    /** 3.8.1: the service user that runs the PoC's anomaly detectors (Settings → PoC plan). */
    serviceUser?: string;
  },
  who: { canManageAccess: boolean; commercialVisible: boolean },
): ReadinessStep[] {
  const filled = (value: string | null | undefined) => (value ?? '').trim() !== '';
  const steps: ReadinessStep[] = [
    { key: 'customer', done: filled(saved.customerName), path: '/settings?tab=customer' },
    { key: 'logo', done: saved.customerLogoDataUrl !== null, path: '/settings?tab=customer' },
    { key: 'description', done: filled(saved.pocDescription) || filled(saved.scopeDescription), path: '/settings?tab=customer' },
    { key: 'dates', done: saved.startDate !== null && saved.endDate !== null, path: '/settings?tab=plan' },
    { key: 'criteria', done: saved.criteria > 0, path: '/settings?tab=plan' },
  ];
  // The dashboard is the SE's (only they create it); the hourly cost is commercial — listed only where it is visible.
  if (who.canManageAccess) steps.push({ key: 'dashboard', done: saved.dashboards > 0, path: '/builder' });
  // 3.8.1 (the owner: "incluir a criação do usuário de serviço nos passos de configurações … ser um dos pontos de 8/8").
  if (who.canManageAccess) steps.push({ key: 'serviceUser', done: filled(saved.serviceUser), path: '/settings?tab=plan' });
  if (who.commercialVisible) steps.push({ key: 'rate', done: saved.ratePerHour !== null, path: '/settings?tab=cost' });
  return steps;
}

export interface Readiness {
  steps: ReadinessStep[];
  done: number;
  total: number;
  required: number;
  ready: boolean;
}

/** The readiness of the PoC as saved, for the person looking. */
export function useReadiness(): Readiness {
  const { parameters, pocPlan, costModel } = useStudio();
  const access = useAccess();
  const steps = readinessSteps(
    {
      customerName: parameters.customerName,
      customerLogoDataUrl: parameters.customerLogoDataUrl,
      pocDescription: parameters.pocDescription,
      scopeDescription: parameters.scopeDescription,
      startDate: pocPlan.startDate,
      endDate: pocPlan.endDate,
      criteria: pocPlan.criteria.length,
      dashboards: Object.values(pocPlan.specialtyDashboards ?? {}).filter((ref) => ref !== undefined).length,
      ratePerHour: costModel.ratePerHour,
      serviceUser: pocPlan.detectorActor,
    },
    { canManageAccess: access.canManageAccess, commercialVisible: access.commercialVisible },
  );
  const done = steps.filter((step) => step.done).length;
  const required = requiredSteps(steps.length);
  return { steps, done, total: steps.length, required, ready: done >= required };
}

/** The label of a step (Settings' own words). */
export const STEP_LABEL: Record<ReadinessKey, StringKey> = {
  customer: 'settings.ready.customer',
  logo: 'settings.ready.logo',
  description: 'settings.ready.description',
  dates: 'settings.ready.dates',
  criteria: 'settings.ready.criteria',
  dashboard: 'settings.ready.builderDashboards',
  serviceUser: 'settings.ready.serviceUser',
  rate: 'settings.ready.rate',
};

/** What a step brings to the story (the wizard's reason to do it). */
export const STEP_WHY: Record<ReadinessKey, StringKey> = {
  customer: 'setup.why.customer',
  logo: 'setup.why.logo',
  description: 'setup.why.description',
  dates: 'setup.why.dates',
  criteria: 'setup.why.criteria',
  dashboard: 'setup.why.dashboard',
  serviceUser: 'setup.why.serviceUser',
  rate: 'setup.why.rate',
};

/** Routes the SE and the partner may open while the PoC is being prepared (where the steps are done). */
export const SETUP_OPEN_ROUTES: readonly string[] = ['/settings', '/builder'];

/** The translated label of a step. */
export function useStepLabel(): (key: ReadinessKey) => string {
  const { t } = useTranslation();
  return (key) => t(STEP_LABEL[key]);
}
