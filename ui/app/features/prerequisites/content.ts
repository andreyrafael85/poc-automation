import type { StringKey } from '../../i18n/strings';

/**
 * What a Dynatrace SaaS PoC needs before day one (3.4.13, owner's order of 2026-11-19: "criar uma nova guia
 * 'Pré-requisito' para guiar o SE e o Parceiro para identificar nas documentações Dynatrace, e exemplos visuais
 * quais são os pré-requisitos para iniciar uma POC"). Every line comes from a docs.dynatrace.com page opened and
 * checked on 2026-11-19, and links to it — never a guessed address (as `features/assessment/docLinks.ts`). Where the
 * owner's own slide and the documentation differ (ActiveGate and OneAgent figures, other APM agents), the guide
 * follows the documentation. Static content: no query, no scope, no tenant data.
 */

export interface PrereqDoc {
  /** The page's title on docs.dynatrace.com, as written there (not translated). */
  title: string;
  url: string;
}

const DOCS_BASE = 'https://docs.dynatrace.com/docs/';
const doc = (title: string, path: string): PrereqDoc => ({ title, url: `${DOCS_BASE}${path}` });
/** A public dynatrace.com page outside the docs (the free trial), with its title as written there. */
const page = (title: string, url: string): PrereqDoc => ({ title, url });

export const PREREQ_DOCS = {
  connectivity: doc('Supported connectivity schemes for ActiveGates', 'ingest-from/dynatrace-activegate/supported-connectivity-schemes-for-activegates#saas-scheme'),
  oneagentInstall: doc('OneAgent installation and operation', 'ingest-from/dynatrace-oneagent/installation-and-operation'),
  oneagentLinux: doc('Install OneAgent on Linux', 'ingest-from/dynatrace-oneagent/installation-and-operation/linux/installation/install-oneagent-on-linux'),
  oneagentWindows: doc('Install OneAgent on Windows', 'ingest-from/dynatrace-oneagent/installation-and-operation/windows/installation/install-oneagent-on-windows'),
  connectionInfo: doc('Deployment API - View connectivity information for OneAgent', 'dynatrace-api/environment-api/deployment/oneagent/get-connectivity-info'),
  ipAllowlist: doc('Allow IP ranges that can access your environment', 'manage/account-management/settings/ip-allowlist'),
  proxyLinux: doc('Pass a proxy address during OneAgent installation on Linux', 'ingest-from/dynatrace-oneagent/installation-and-operation/linux/installation/how-to-pass-a-proxy-address-during-oneagent-installation-on-linux'),
  proxyActiveGate: doc('Set up proxy for ActiveGate', 'ingest-from/dynatrace-activegate/configuration/set-up-proxy-authentication-for-activegate'),
  oneagentSecurity: doc('OneAgent security', 'ingest-from/dynatrace-oneagent/oneagent-security'),
  k8sNetwork: doc('Network traffic (Kubernetes)', 'ingest-from/setup-on-k8s/reference/network'),
  activegate: doc('Dynatrace ActiveGate', 'ingest-from/dynatrace-activegate'),
  activegateRouting: doc('ActiveGate routing and monitoring purposes', 'ingest-from/dynatrace-activegate/capabilities/routing-monitoring-purpose'),
  activegateLinuxReq: doc('ActiveGate hardware and system requirements (Linux)', 'ingest-from/dynatrace-activegate/installation/linux/linux-activegate-hardware-and-system-requirements'),
  activegateWindowsReq: doc('ActiveGate hardware and system requirements (Windows)', 'ingest-from/dynatrace-activegate/installation/windows/windows-activegate-hardware-and-system-requirements'),
  activegateInstall: doc('Install an Environment ActiveGate on Linux', 'ingest-from/dynatrace-activegate/installation/linux/linux-install-an-environment-activegate'),
  oneagentReq: doc('OneAgent requirements', 'ingest-from/dynatrace-oneagent/oa-requirements'),
  diskLinux: doc('Disk space requirements for OneAgent on Linux', 'ingest-from/dynatrace-oneagent/installation-and-operation/linux/installation/disk-space-requirements-for-oneagent-installation-and-update-on-linux'),
  diskWindows: doc('Disk space requirements for OneAgent on Windows', 'ingest-from/dynatrace-oneagent/installation-and-operation/windows/installation/disk-space-requirements-for-oneagent-installation-and-update-on-windows'),
  technologySupport: doc('Technology support', 'ingest-from/technology-support'),
  supportMatrix: doc('OneAgent platform and capability support matrix', 'ingest-from/technology-support/oneagent-platform-and-capability-support-matrix'),
  java: doc('Java (technology support)', 'ingest-from/technology-support/application-software/java'),
  troubleshoot: doc('Troubleshoot OneAgent installation', 'ingest-from/dynatrace-oneagent/oneagent-troubleshooting/troubleshoot-oneagent-installation'),
  monitoringModes: doc('OneAgent monitoring modes', 'platform/oneagent/monitoring-modes/monitoring-modes'),
  rumPassThrough: doc('Infrastructure pass-through requirements (RUM Classic)', 'observe/digital-experience-classic/rum-classic/web-applications/initial-setup/infrastructure-pass-through-requirements-classic'),
  rumCsp: doc('Modify CSP for RUM Classic', 'observe/digital-experience-classic/rum-classic/web-applications/additional-configuration/modify-csp-for-rum'),
  rumInfra: doc('Infrastructure requirements for RUM', 'observe/digital-experience/rum/infrastructure-requirements'),
  accessTokens: doc('Access tokens', 'manage/identity-access-management-classic/access-tokens-and-oauth-clients/access-tokens'),
  rolePermissions: doc('Role-based permissions', 'manage/identity-access-management-classic/permission-management/role-based-permissions'),
  k8sTokens: doc('Tokens and permissions (Kubernetes)', 'ingest-from/setup-on-k8s/deployment/tokens-permissions/tokens-permissions'),
  // 3.4.17 (owner's request): how to get the tenant itself — both pages opened on 2026-11-20.
  getStarted: doc('Get started with Dynatrace', 'discover-dynatrace/get-started'),
  signup: page('Dynatrace free trial (sign up)', 'https://www.dynatrace.com/signup/'),
} as const satisfies Record<string, PrereqDoc>;

export type PrereqDocId = keyof typeof PREREQ_DOCS;

export interface PrereqItem {
  key: StringKey;
  docs: readonly PrereqDocId[];
}

export interface PrereqSection {
  id: 'tenant' | 'network' | 'activegate' | 'oneagent' | 'rum' | 'access';
  titleKey: StringKey;
  whoKey: StringKey;
  items: readonly PrereqItem[];
}

export const PREREQ_SECTIONS: readonly PrereqSection[] = [
  // 3.4.17: the tenant comes first — six cards, three by two on screen and on the PDF.
  {
    id: 'tenant',
    titleKey: 'prq.tenant.title',
    whoKey: 'prq.tenant.who',
    items: [
      { key: 'prq.tenant.trial', docs: ['signup', 'getStarted'] },
      { key: 'prq.tenant.saas', docs: ['getStarted'] },
      { key: 'prq.tenant.next', docs: ['getStarted', 'oneagentInstall'] },
    ],
  },
  {
    id: 'network',
    titleKey: 'prq.network.title',
    whoKey: 'prq.network.who',
    items: [
      { key: 'prq.network.443', docs: ['connectivity', 'oneagentInstall'] },
      { key: 'prq.network.9999', docs: ['connectivity', 'activegateRouting'] },
      { key: 'prq.network.allowlist', docs: ['oneagentLinux', 'activegateInstall'] },
      { key: 'prq.network.proxy', docs: ['proxyLinux', 'proxyActiveGate'] },
      { key: 'prq.network.tls', docs: ['troubleshoot', 'oneagentSecurity'] },
      { key: 'prq.network.k8s', docs: ['k8sNetwork'] },
    ],
  },
  {
    id: 'activegate',
    titleKey: 'prq.activegate.title',
    whoKey: 'prq.activegate.who',
    items: [
      { key: 'prq.activegate.when', docs: ['activegate', 'activegateRouting'] },
      { key: 'prq.activegate.machine', docs: ['activegateLinuxReq', 'activegateWindowsReq'] },
      { key: 'prq.activegate.disk', docs: ['activegateLinuxReq'] },
      { key: 'prq.activegate.sizing', docs: ['activegateLinuxReq'] },
      { key: 'prq.activegate.order', docs: ['activegateInstall'] },
    ],
  },
  {
    id: 'oneagent',
    titleKey: 'prq.oneagent.title',
    whoKey: 'prq.oneagent.who',
    items: [
      { key: 'prq.oneagent.rights', docs: ['oneagentLinux', 'oneagentWindows'] },
      { key: 'prq.oneagent.memory', docs: ['oneagentLinux', 'oneagentWindows', 'oneagentReq'] },
      { key: 'prq.oneagent.disk', docs: ['diskLinux', 'diskWindows'] },
      { key: 'prq.oneagent.support', docs: ['technologySupport', 'supportMatrix', 'oneagentReq'] },
      { key: 'prq.oneagent.restart', docs: ['oneagentInstall', 'monitoringModes'] },
      { key: 'prq.oneagent.coexist', docs: ['java', 'troubleshoot'] },
    ],
  },
  {
    id: 'rum',
    titleKey: 'prq.rum.title',
    whoKey: 'prq.rum.who',
    items: [
      { key: 'prq.rum.passThrough', docs: ['rumPassThrough'] },
      { key: 'prq.rum.code', docs: ['rumPassThrough'] },
      { key: 'prq.rum.headers', docs: ['rumPassThrough', 'rumInfra'] },
      { key: 'prq.rum.csp', docs: ['rumCsp'] },
    ],
  },
  {
    id: 'access',
    titleKey: 'prq.access.title',
    whoKey: 'prq.access.who',
    items: [
      { key: 'prq.access.token', docs: ['oneagentInstall', 'accessTokens'] },
      { key: 'prq.access.permissions', docs: ['rolePermissions'] },
      { key: 'prq.access.hostTeams', docs: ['oneagentLinux', 'oneagentWindows'] },
      { key: 'prq.access.k8s', docs: ['k8sTokens'] },
    ],
  },
];

/** The steps to find the addresses a strict firewall must allow (drawn as an example on the tab). */
export const FIREWALL_STEPS: readonly { key: StringKey; docs: readonly PrereqDocId[] }[] = [
  { key: 'prq.ips.step1', docs: ['oneagentLinux'] },
  { key: 'prq.ips.step2', docs: ['oneagentWindows'] },
  { key: 'prq.ips.step3', docs: ['activegateInstall'] },
  { key: 'prq.ips.step4', docs: ['connectionInfo'] },
];

/**
 * Example addresses in the drawing of the installation page: RFC 5737 documentation ranges (TEST-NET-3,
 * 203.0.113.0/24, and TEST-NET-2, 198.51.100.0/24) — never a real Dynatrace address, which only the customer's
 * own installation page gives.
 */
export const EXAMPLE_ADDRESSES = ['203.0.113.10', '203.0.113.24', '198.51.100.7', '198.51.100.31'] as const;
