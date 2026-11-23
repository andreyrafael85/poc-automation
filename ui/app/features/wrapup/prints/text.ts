import { REDACTED, redactText, stripControlChars } from '../../../utils/sanitize';
import { fit, type DeckProfile } from '../spec';

/**
 * Text that comes from the tenant or from a screen, for the real-prints deck (3.2.7).
 *
 * Every tenant string — a service or host name, a log signature, a Davis event detail, a pin
 * legend — reaches the deck through `printText`, once, at the deck boundary (privacy rule 3 of the
 * spec). The Customer profile also masks cloud host names (`ip-172-31-93-120.ec2.internal`,
 * `*.internal.cloudapp.net`, `*.internal`, `*.amazonaws.com`, `*.cloudapp.azure.com`,
 * `*.azurewebsites.net`, `*.cluster.local`), which name the customer's infrastructure without being
 * IPs, and any tenant host. The SE profile keeps them: the SE needs to know which host it was. A
 * tenant URL (with its scheme) is redacted in both, labs domains included.
 *
 * The other helpers read what the companion saw on a screen (1.0 manifests carry the raw label
 * only; 1.1 adds the numeric tokens): the numbers next to an anchor, and the screen's own
 * timeframe label, so a legend number is computed over the window the screen shows.
 */

/** `ip-a-b-c-d` hosts (EC2 private DNS names), with any domain suffix. */
const IP_HOST = /\bip-\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}(?!\d)(?:\.[A-Za-z0-9-]+)*/gi;
/**
 * Cloud host names: `*.ec2.internal`, `*.compute.internal`, `*.internal.cloudapp.net`, any other
 * `*.internal` name (GCE's `vm.c.<project>.internal` carries the customer's project id), and the
 * public and in-cluster forms (3.2.7 review PS-1): `ec2-54-210-12-34.compute-1.amazonaws.com` (a
 * public IPv4 in the name), `*.rds.amazonaws.com`, `*.cloudapp.azure.com`, `*.azurewebsites.net`
 * and `*.svc.cluster.local`.
 */
const CLOUD_HOST = /\b[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:internal\.cloudapp\.net|internal|amazonaws\.com|cloudapp\.azure\.com|azurewebsites\.net|cluster\.local)\b/gi;
/**
 * A GCE name cut before or inside its `.internal` (B15 keeps 110 characters of a log line):
 * `vm.c.<project>` or `vm.c.<project>.inter` still names the project. Only at the end of a name —
 * `x.c.y.example.com` is not one.
 */
const GCE_FRAGMENT = /\b[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.c\.[a-z][a-z0-9-]*(?:\.(?:interna|intern|inter|inte|int|in|i))?(?![A-Za-z0-9-])(?!\.[A-Za-z0-9])/gi;
/**
 * A GCP resource path (`projects/<project-id>/zones/…`, kubelet and exporter logs on GKE): the id
 * names the customer's project as `vm.c.<project>` does. Digits may be folded to `#` (B15).
 */
const GCP_PROJECT_PATH = /\bprojects\/[a-z][a-z0-9#-]*/gi;
/**
 * A Dynatrace environment host and its path, including the labs domains and the sprint/dev forms
 * `redactText` does not know (`abc12345.apps.dynatracelabs.com`, `abc12345.sprint.apps.dynatracelabs.com`).
 * Public sites are not tenants.
 */
const TENANT_ADDRESS = String.raw`(?!(?:www|docs|community|developer|university|support|status)\.)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:apps\.)?(?:live\.)?dynatrace(?:labs)?\.com\b(?:[/:?#][^\s"'<>]*)?`;
/** A tenant URL (with its scheme): redacted in both profiles, as `redactText` does for the plain domain. */
const TENANT_URL = new RegExp(String.raw`\bhttps?:\/\/${TENANT_ADDRESS}`, 'gi');
/** A tenant host, with or without a scheme: masked in the Customer profile only (the SE keeps the bare host). */
const TENANT_HOST = new RegExp(String.raw`\b(?:https?:\/\/)?${TENANT_ADDRESS}`, 'gi');

/**
 * A pt-BR count of a billion or more ("1.234.567.890 requisições") has the shape of a dotted quad,
 * and `redactText` would blank it as an IPv4. A free-standing one in which no four consecutive
 * groups can be an address (one of them is over 255) is a number: it is set aside before the
 * redaction and put back after. Anything that could be an address, or that touches an e-mail or a
 * `key=`, is left to the redaction; a set-aside count that is a secret's value (`token: …`) or part
 * of a tenant URL is removed with it and never put back.
 */
const GROUPED_COUNT = /(?<=^|[\s(«“"'/~–—])\d{1,3}(?:\.\d{3}){3,}(?=$|[\s)»”"',;:!?%×/–—]|\.(?:\s|$))/g;
const SET_ASIDE = /\uE000(\d+)\uE001/g;
const SET_ASIDE_CHARS = /[\uE000\uE001]/g;

function couldBeIpv4(token: string): boolean {
  const groups = token.split('.').map(Number);
  for (let start = 0; start + 4 <= groups.length; start += 1) {
    if (groups.slice(start, start + 4).every((group) => group <= 255)) return true;
  }
  return false;
}

export const HOST_IP_MASK = 'ip-‹…›';
export const HOST_MASK = '‹host›';
export const GCP_PROJECT_MASK = 'projects/‹…›';

/**
 * ip-172-31-93-120(.anything) → 'ip-‹…›'; *.ec2.internal | *.compute.internal | *.internal |
 * *.internal.cloudapp.net | *.amazonaws.com | *.cloudapp.azure.com | *.azurewebsites.net |
 * *.cluster.local, and a GCE `vm.c.<project>` cut short → '‹host›'; `projects/<id>` → 'projects/‹…›'.
 */
export function maskHostIp(text: string): string {
  return text.replace(IP_HOST, HOST_IP_MASK).replace(CLOUD_HOST, HOST_MASK).replace(GCE_FRAGMENT, HOST_MASK).replace(GCP_PROJECT_PATH, GCP_PROJECT_MASK);
}

/**
 * Tenant text for the deck: control chars stripped, secrets/e-mails/UUIDs/IPv4/tenant URLs redacted
 * (both profiles), cloud hosts and tenant hosts masked (Customer profile), cut to `max` with an
 * ellipsis. Redaction runs before the host mask, so an e-mail at a cloud host goes whole.
 */
export function printText(text: string, max: number, profile: DeckProfile): string {
  const kept: string[] = [];
  let clean = stripControlChars(text)
    .replace(SET_ASIDE_CHARS, '')
    .replace(GROUPED_COUNT, (token) => (couldBeIpv4(token) ? token : `\uE000${kept.push(token) - 1}\uE001`));
  clean = redactText(clean).replace(TENANT_URL, REDACTED);
  if (profile === 'customer') clean = maskHostIp(clean).replace(TENANT_HOST, REDACTED);
  clean = clean.replace(SET_ASIDE, (_marker, index: string) => kept[Number(index)] ?? '').replace(SET_ASIDE_CHARS, '');
  return fit(clean, max);
}

/** A number as the platform UI writes it: thousands groups, a decimal part, a K/M suffix or a percent. */
const UI_NUMBER = /^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?[KkMm%]?$/;
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/** Numeric tokens of an on-screen label: /^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?[KkMm%]?$/ only (never an IPv4), ≤ 4. */
export function numericTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .filter((token) => UI_NUMBER.test(token) && !IPV4.test(token))
    .slice(0, 4);
}

/**
 * '1.25K' → 1250 · '8,559' → 8559 · '13.7' → 13.7 · '30' → 30; null otherwise.
 *
 * The anchors are read on the English platform UI, so a comma groups thousands and a point is the
 * decimal mark; a lone comma before 1–2 digits ('13,7') or both marks ('1.234,5') are read as the
 * last mark being the decimal one. A percent returns the number of percent ('2.8%' → 2.8).
 */
export function parseUiNumber(raw: string): number | null {
  const token = raw.trim();
  if (!UI_NUMBER.test(token) || IPV4.test(token)) return null;
  let body = token;
  let scale = 1;
  const suffix = body.slice(-1);
  if (suffix === '%') body = body.slice(0, -1);
  else if (suffix === 'K' || suffix === 'k') {
    scale = 1e3;
    body = body.slice(0, -1);
  } else if (suffix === 'M' || suffix === 'm') {
    scale = 1e6;
    body = body.slice(0, -1);
  }
  const dot = body.lastIndexOf('.');
  const comma = body.lastIndexOf(',');
  let plain: string;
  if (dot >= 0 && comma >= 0) {
    const decimal = dot > comma ? '.' : ',';
    plain = body.split(decimal === '.' ? ',' : '.').join('').replace(decimal, '.');
  } else if (comma >= 0) {
    const groups = body.split(',');
    plain = groups.slice(1).every((group) => group.length === 3) ? groups.join('') : body.replace(',', '.');
  } else if (dot >= 0) {
    const groups = body.split('.');
    plain = groups.length > 2 ? groups.join('') : body;
  } else {
    plain = body;
  }
  const value = Number(plain) * scale;
  // Twelve significant digits drop the binary noise of the scaling ('1.1K' → 1100, not 1100.0000000000002).
  return Number.isFinite(value) ? Number(value.toPrecision(12)) : null;
}

const SCREEN_TIMEFRAME = /^last(?: (\d{1,5}))? (minute|hour|day)s?$/i;
const UNIT_MINUTES: Record<string, number> = { minute: 1, hour: 60, day: 1440 };

/** 'Last 30 minutes' → 30 · 'Last 2 hours' → 120 · 'Last 7 days' → 10080; null for anything else. */
export function parseScreenTimeframe(label: string | null | undefined): number | null {
  if (typeof label !== 'string') return null;
  const match = SCREEN_TIMEFRAME.exec(label.replace(/\s+/g, ' ').trim());
  if (match === null) return null;
  const count = match[1] === undefined ? 1 : Number(match[1]);
  const unit = UNIT_MINUTES[(match[2] ?? '').toLowerCase()];
  if (unit === undefined || !Number.isInteger(count) || count <= 0) return null;
  return count * unit;
}
