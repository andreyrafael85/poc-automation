import type { StringKey } from '../../i18n/strings';

/**
 * F-09 (3.4.6): where the Dynatrace documentation explains each capability the Assessment names, so the
 * customer can act on a recommendation without waiting for the SE. Public pages of docs.dynatrace.com, each
 * checked to answer on 2026-11-18 (the final address after redirects, so no link depends on one). A
 * capability without a page here simply shows no link — never a guessed address.
 */
const DOCS = 'https://docs.dynatrace.com/docs/';

export const CAPABILITY_DOCS: Readonly<Partial<Record<StringKey, string>>> = {
  'asm.cap.oneagent': `${DOCS}ingest-from/dynatrace-oneagent`,
  'asm.cap.infrastructure': `${DOCS}observe/infrastructure-observability`,
  'asm.cap.kubernetes': `${DOCS}ingest-from/setup-on-k8s`,
  'asm.cap.cloud': `${DOCS}observe/infrastructure-observability/cloud-platform-monitoring`,
  'asm.cap.tracing': `${DOCS}observe/application-observability/distributed-tracing`,
  'asm.cap.serviceDetection': `${DOCS}observe/application-observability/services/service-detection`,
  'asm.cap.logs': `${DOCS}analyze-explore-automate/logs`,
  'asm.cap.openpipeline': `${DOCS}platform/openpipeline`,
  'asm.cap.workflows': `${DOCS}analyze-explore-automate/workflows`,
  'asm.cap.grail': `${DOCS}platform/grail/organize-data/assign-permissions-in-grail`,
  'asm.cap.security': `${DOCS}secure/application-security`,
  'asm.cap.rum': `${DOCS}observe/digital-experience/rum`,
  'asm.cap.synthetic': `${DOCS}observe/digital-experience/synthetic`,
  'asm.cap.business': `${DOCS}observe/business-observability`,
  'asm.cap.slo': `${DOCS}analyze-explore-automate/service-level-objectives`,
  'asm.cap.davis': `${DOCS}dynatrace-intelligence`,
  'asm.cap.smartscape': `${DOCS}analyze-explore-automate/smartscape`,
  'asm.cap.tagging': `${DOCS}deliver/ownership`,
  'asm.cap.platform': `${DOCS}ingest-from`,
};

/** The documentation page of a capability, or null when the app keeps none for it. */
export const docFor = (capability: StringKey): string | null => CAPABILITY_DOCS[capability] ?? null;
