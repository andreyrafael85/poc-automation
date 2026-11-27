import { TRIAGE_RULE } from '../triage/triage';
import { AI_ACTION, aiAnswer, type ScheduleTrigger, type WorkflowBody } from './pocAutomation';

/**
 * 3.8.3 (the owner, 2026-11-27: "um workflow como um agente de segurança de tokens na tenant … quantos estão em uso, data de
 * validação e indicar a desativação, e incluir o Dynatrace Assist … para mitigar qualquer risco de exposição de tokens"): a
 * daily workflow handed to Workflows that reads, with the permissions of whoever saves it, the environment's access tokens —
 * API tokens and personal access tokens, ActiveGate tokens — and its credential vault, and only when it finds something sends
 * an e-mail with the findings, what to disable and Dynatrace Assist's reading. It never reads a token's secret (the APIs return
 * metadata only) and never changes anything: disabling stays the SE's click in the access tokens page.
 *
 * What lives in the account and not in the environment — OAuth clients, platform tokens, who holds an administrator role — is
 * out of an environment workflow's reach (Account Management's API takes an account OAuth client), so the e-mail closes with
 * those checks as steps and the link.
 */

/** Every day at 07:30 in the SE's time zone; the e-mail goes out only when there is a finding. */
export const TOKEN_CRON = '30 7 * * *';
export const AUDIT_TASK = 'token_audit';
const JS_ACTION = 'dynatrace.automations:run-javascript';

/** Scopes that write configuration, manage tokens or credentials, or export data — a leaked token with one of them is costly. */
export const HIGH_PRIVILEGE_SCOPES = [
  'WriteConfig',
  'settings.write',
  'apiTokens.write',
  'credentialVault.write',
  'credentialVault.read',
  'TenantTokenManagement',
  'tenantTokenRotation.write',
  'activeGateTokenManagement.write',
  'activeGateTokenManagement.create',
  'DataExport',
  'LogExport',
  'MemoryDump',
  'DiagnosticExport',
  'DataImport',
  'RestRequestForwarding',
  'entities.write',
  'extensions.write',
  'hub.install',
  'oneAgents.write',
  'securityProblems.write',
] as const;

/** The lines the audit reads by: unused for this many days, expiring within that many, created this long ago to count as "never used". */
export const TOKEN_LINES = { unusedDays: 30, disableUnusedDays: 90, expiringDays: 14, neverUsedAfterDays: 7 } as const;

/**
 * The audit, as plain JavaScript (it runs inside the workflow's script and in the tests, from this one source): each enabled
 * API token and each ActiveGate token gets its findings — no expiry, expiring soon, unused, never used, high-privilege scopes —
 * and one recommendation: disable (never used, or unused for 90 days), set an expiry and rotate (no expiry with a high-privilege
 * scope), or review. The credential vault: its entries and those shared beyond their owner.
 */
export const AUDIT_SOURCE = `function auditTokens(input, cfg) {
  var DAY = 86400000;
  var now = cfg.nowMs;
  var broadSet = {};
  for (var b = 0; b < cfg.broad.length; b++) broadSet[cfg.broad[b]] = true;
  var age = function (iso) { var t = Date.parse(iso || ""); return isFinite(t) ? (now - t) / DAY : null; };
  var until = function (iso) { var t = Date.parse(iso || ""); return isFinite(t) ? (t - now) / DAY : null; };
  var rows = [];
  var summary = function () { return { total: 0, active: 0, personal: 0, noExpiry: 0, expiring: 0, unused: 0, neverUsed: 0, broad: 0 }; };
  var api = summary();
  var gates = summary();
  var judge = function (token, kind, sum) {
    sum.total++;
    if (token.enabled === false) return;
    sum.active++;
    if (token.personalAccessToken) sum.personal++;
    var findings = [];
    var lastAge = age(token.lastUsedDate);
    var createdAge = age(token.creationDate);
    var left = until(token.expirationDate);
    if (!token.expirationDate) { sum.noExpiry++; findings.push("noExpiry"); }
    else if (left !== null && left <= cfg.lines.expiringDays) { sum.expiring++; findings.push("expiring"); }
    var never = !token.lastUsedDate && createdAge !== null && createdAge >= cfg.lines.neverUsedAfterDays;
    if (never) { sum.neverUsed++; findings.push("neverUsed"); }
    else if (lastAge !== null && lastAge >= cfg.lines.unusedDays) { sum.unused++; findings.push("unused"); }
    var broad = (token.scopes || []).filter(function (s) { return broadSet[s]; });
    if (broad.length > 0) { sum.broad++; findings.push("broad"); }
    if (findings.length === 0) return;
    var action = never || (lastAge !== null && lastAge >= cfg.lines.disableUnusedDays) ? "disable" : !token.expirationDate && broad.length > 0 ? "rotate" : "review";
    rows.push({
      name: String(token.name || token.id || "—").slice(0, 80),
      id: String(token.id || "").slice(0, 14),
      kind: kind === "api" ? (token.personalAccessToken ? "personal" : "api") : "activeGate",
      owner: String(token.owner || "—").slice(0, 80),
      lastUsed: token.lastUsedDate ? String(token.lastUsedDate).slice(0, 10) : null,
      lastIp: token.lastUsedIpAddress || null,
      expires: token.expirationDate ? String(token.expirationDate).slice(0, 10) : null,
      findings: findings,
      broad: broad.slice(0, 4),
      action: action
    });
  };
  for (var i = 0; i < (input.apiTokens || []).length; i++) judge(input.apiTokens[i], "api", api);
  for (var j = 0; j < (input.activeGateTokens || []).length; j++) judge(input.activeGateTokens[j], "activeGate", gates);
  // The vault: how many entries and how many are shared beyond their owner (its usage summary is not filled in a listing —
  // read on the lab on 2026-11-27 —, so no "unused" count is claimed).
  var vault = { total: 0, shared: 0 };
  var creds = input.credentials || [];
  for (var k = 0; k < creds.length; k++) {
    vault.total++;
    if (creds[k].ownerAccessOnly === false) vault.shared++;
  }
  var rank = { disable: 0, rotate: 1, review: 2 };
  rows.sort(function (a, b) { return rank[a.action] - rank[b.action] || (a.lastUsed || "") .localeCompare(b.lastUsed || ""); });
  return { api: api, activeGate: gates, vault: vault, rows: rows, unread: input.unread || [] };
}`;

/** The e-mail's Markdown from the audit (plain JavaScript as well): a callout, the summary table, the findings, the account steps. */
export const TOKEN_MARKDOWN_SOURCE = `function tokenMarkdown(audit, cfg) {
  var w = cfg.words;
  var fill = function (text, values) { return text.replace(/\\{(\\w+)\\}/g, function (all, key) { return values[key] === undefined ? all : String(values[key]); }); };
  var count = function (action) { var c = 0; for (var i = 0; i < audit.rows.length; i++) if (audit.rows[i].action === action) c++; return c; };
  var lines = [];
  lines.push("## " + w.heading);
  lines.push("");
  lines.push("> " + fill(w.gist, { n: audit.rows.length, disable: count("disable"), rotate: count("rotate"), review: count("review") }));
  lines.push("");
  lines.push("| " + w.colKind + " | " + w.colTotal + " | " + w.colActive + " | " + w.colNoExpiry + " | " + w.colExpiring + " | " + w.colUnused + " | " + w.colNever + " | " + w.colBroad + " |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  var row = function (label, s) { lines.push("| " + label + " | " + s.total + " | " + s.active + " | " + s.noExpiry + " | " + s.expiring + " | " + s.unused + " | " + s.neverUsed + " | " + s.broad + " |"); };
  row(w.kindApi + " (" + fill(w.personalOf, { n: audit.api.personal }) + ")", audit.api);
  row(w.kindActiveGate, audit.activeGate);
  lines.push("");
  lines.push("### " + w.findingsHeading);
  lines.push("");
  lines.push("| " + w.colToken + " | " + w.colKind + " | " + w.colOwner + " | " + w.colLastUsed + " | " + w.colExpires + " | " + w.colFindings + " | " + w.colAction + " |");
  lines.push("|---|---|---|---|---|---|---|");
  var shown = audit.rows.slice(0, cfg.shown);
  for (var i = 0; i < shown.length; i++) {
    var r = shown[i];
    var found = r.findings.map(function (f) { return w.finding[f] || f; }).join(", ") + (r.broad.length > 0 ? " (" + r.broad.join(", ") + ")" : "");
    lines.push("| " + r.name.replace(/\\|/g, "/") + " · " + r.id + "… | " + (w.kind[r.kind] || r.kind) + " | " + r.owner.replace(/\\|/g, "/") + " | " + (r.lastUsed || w.never) + " | " + (r.expires || w.noExpiry) + " | " + found + " | **" + (w.action[r.action] || r.action) + "** |");
  }
  if (audit.rows.length > shown.length) lines.push("", fill(w.more, { n: audit.rows.length - shown.length }));
  lines.push("");
  lines.push("### " + w.vaultHeading);
  lines.push("");
  lines.push(fill(w.vault, { total: audit.vault.total, shared: audit.vault.shared }));
  if (audit.unread.length > 0) lines.push("", fill(w.unread, { list: audit.unread.join(", ") }));
  lines.push("");
  lines.push("### " + w.accountHeading);
  lines.push("");
  for (var s = 0; s < w.accountSteps.length; s++) lines.push("- " + w.accountSteps[s]);
  lines.push("", "_" + w.method + "_");
  return {
    subject: fill(w.subject, { n: audit.rows.length, disable: count("disable") }),
    body: lines.join("\\n"),
    closing: "_" + w.footer + "_"
  };
}`;

export interface TokenWords {
  title: string;
  description: string;
  auditDescription: string;
  aiDescription: string;
  aiPrompt: string;
  aiHeading: string;
  mailDescription: string;
  /** For the e-mail's Markdown. */
  heading: string;
  gist: string;
  subject: string;
  colKind: string;
  colTotal: string;
  colActive: string;
  colNoExpiry: string;
  colExpiring: string;
  colUnused: string;
  colNever: string;
  colBroad: string;
  kindApi: string;
  kindActiveGate: string;
  personalOf: string;
  findingsHeading: string;
  colToken: string;
  colOwner: string;
  colLastUsed: string;
  colExpires: string;
  colFindings: string;
  colAction: string;
  never: string;
  noExpiry: string;
  more: string;
  vaultHeading: string;
  vault: string;
  unread: string;
  accountHeading: string;
  accountSteps: string[];
  method: string;
  footer: string;
  finding: Record<'noExpiry' | 'expiring' | 'unused' | 'neverUsed' | 'broad', string>;
  kind: Record<'api' | 'personal' | 'activeGate', string>;
  action: Record<'disable' | 'rotate' | 'review', string>;
}

export interface TokenChoice {
  recipients: readonly string[];
  shared: boolean;
  timezone: string;
}

/** The words the e-mail's Markdown reads (the workflow's own names and prompts left out). Pure. */
export function mailWordsOf(words: TokenWords): Omit<TokenWords, 'title' | 'description' | 'auditDescription' | 'aiDescription' | 'aiPrompt' | 'aiHeading' | 'mailDescription'> {
  const mail: Partial<TokenWords> = { ...words };
  for (const key of ['title', 'description', 'auditDescription', 'aiDescription', 'aiPrompt', 'aiHeading', 'mailDescription'] as const) delete mail[key];
  return mail as Omit<TokenWords, 'title' | 'description' | 'auditDescription' | 'aiDescription' | 'aiPrompt' | 'aiHeading' | 'mailDescription'>;
}

/** The token fields the audit reads (metadata only). */
const TOKEN_FIELDS = ['expirationDate', 'lastUsedDate', 'lastUsedIpAddress', 'scopes', 'personalAccessToken', 'owner', 'creationDate', 'enabled'].map((field) => `+${field}`).join(',');

/** The audit task's script: read the three lists (each on its own: a refused read is named, never a zero), audit, write the e-mail. Pure. */
export function auditScript(words: TokenWords): string {
  const cfg = { broad: [...HIGH_PRIVILEGE_SCOPES], lines: TOKEN_LINES, shown: 25, words: mailWordsOf(words) };
  return [
    'import { accessTokensApiTokensClient, accessTokensActiveGateTokensClient, credentialVaultClient } from "@dynatrace-sdk/client-classic-environment-v2";',
    '',
    `const CFG = ${JSON.stringify(cfg, null, 2)};`,
    '',
    AUDIT_SOURCE,
    '',
    TOKEN_MARKDOWN_SOURCE,
    '',
    'async function pages(read, field) {',
    '  const all = [];',
    '  let response = await read({});',
    '  all.push(...(response[field] || []));',
    '  let guard = 0;',
    '  while (response.nextPageKey && guard < 20) {',
    '    guard++;',
    '    response = await read({ nextPageKey: response.nextPageKey });',
    '    all.push(...(response[field] || []));',
    '  }',
    '  return all;',
    '}',
    '',
    'export default async function () {',
    '  const input = { apiTokens: [], activeGateTokens: [], credentials: [], unread: [] };',
    '  try {',
    `    input.apiTokens = await pages((page) => accessTokensApiTokensClient.listApiTokens(page.nextPageKey ? page : { pageSize: 1000, fields: ${JSON.stringify(TOKEN_FIELDS)} }), "apiTokens");`,
    '  } catch (error) { input.unread.push("API tokens (environment-api:api-tokens:read)"); }',
    '  try {',
    '    input.activeGateTokens = await pages((page) => accessTokensActiveGateTokensClient.listTokens(page.nextPageKey ? page : { pageSize: 1000 }), "activeGateTokens");',
    '  } catch (error) { input.unread.push("ActiveGate tokens (environment-api:activegate-tokens:read)"); }',
    '  try {',
    '    input.credentials = await pages((page) => credentialVaultClient.listCredentials(page), "credentials");',
    '  } catch (error) { input.unread.push("credential vault (environment-api:credentials:read)"); }',
    '  const audit = auditTokens(input, { nowMs: Date.now(), broad: CFG.broad, lines: CFG.lines });',
    '  const mail = tokenMarkdown(audit, CFG);',
    '  const risk = audit.rows.length > 0 || audit.unread.length > 0;',
    '  return { risk: risk, findings: audit.rows.length, api: audit.api, activeGate: audit.activeGate, vault: audit.vault, unread: audit.unread, subject: mail.subject, body: mail.body, closing: mail.closing };',
    '}',
  ].join('\n');
}

const RISK = `{{ result("${AUDIT_TASK}").risk }}`;
const auditField = (field: string) => `{{ result("${AUDIT_TASK}")["${field}"] }}`;

/** The token security workflow: audit → (finding) Dynatrace Assist → e-mail. Pure. */
export function buildTokenWorkflow(choice: TokenChoice, words: TokenWords): WorkflowBody<ScheduleTrigger> {
  const onRisk = { custom: RISK, else: 'SKIP' as const };
  return {
    title: words.title.slice(0, 200),
    description: words.description.slice(0, 500),
    isPrivate: !choice.shared,
    trigger: {
      schedule: {
        isActive: true,
        isFaulty: false,
        timezone: choice.timezone === '' ? 'UTC' : choice.timezone,
        trigger: { type: 'cron', cron: TOKEN_CRON },
        filterParameters: {},
        inputs: {},
      },
    },
    tasks: {
      [AUDIT_TASK]: {
        name: AUDIT_TASK,
        action: JS_ACTION,
        description: words.auditDescription,
        input: { script: auditScript(words) },
        position: { x: 0, y: 1 },
        predecessors: [],
      },
      token_assist: {
        name: 'token_assist',
        action: AI_ACTION,
        description: words.aiDescription,
        input: { autoTrim: true, config: 'disabled', instruction: '', prompt: `${words.aiPrompt}\n\n${auditField('body')}`, supplementary: '' },
        position: { x: 0, y: 2 },
        predecessors: [AUDIT_TASK],
        conditions: { states: { [AUDIT_TASK]: 'OK' }, ...onRisk },
      },
      notify_team: {
        name: 'notify_team',
        action: 'dynatrace.email:send-email',
        description: words.mailDescription,
        input: {
          to: [...choice.recipients],
          cc: [],
          bcc: [],
          subject: auditField('subject'),
          content: `${auditField('body')}${TRIAGE_RULE}${words.aiHeading}\n\n${aiAnswer('token_assist')}${TRIAGE_RULE}${auditField('closing')}`,
        },
        position: { x: 0, y: 3 },
        predecessors: ['token_assist'],
        conditions: { states: { token_assist: 'ANY' }, ...onRisk },
      },
    },
  };
}
