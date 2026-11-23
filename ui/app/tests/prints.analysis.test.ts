import { describe, expect, it } from 'vitest';

import { ALL_KEYS, pluralKey, translate, type Locale, type StringKey } from '../i18n/strings';
import { PRINT_SPACE, THRESHOLDS } from '../features/wrapup/prints/constants';
import { PRINT_BUDGET } from '../features/wrapup/prints/deck/budget';
import { assembleBundle, assemblePack } from '../features/wrapup/prints/evidence/assemble';
import { planEvidenceRequests } from '../features/wrapup/prints/evidence/plan';
import { capacitySignals, detectAnomalies, frontendSignals, minRequestsGuard, per100Peak, type Anomaly } from '../features/wrapup/prints/analysis/anomalies';
import { buildCrossLinks } from '../features/wrapup/prints/analysis/crossLinks';
import { methodologyFor, methodologyGaps, methodologyOrder } from '../features/wrapup/prints/analysis/methodology';
import { analysisFor, chartFocus, customerSafe, hubLabels } from '../features/wrapup/prints/analysis/narrative';
import { PIN_LEGEND_KEYS, crossCheck, pinsFor, placeBeside, placePins, separatePins, type PinLayoutLike } from '../features/wrapup/prints/analysis/pins';
import { PIN_SIZE } from '../features/wrapup/geometry';
import { PRINT_IMAGE_BOX } from '../features/wrapup/prints/deck/printGeometry';
import { LAYOUTS, NUMBER_UNDER_LABEL } from '../features/wrapup/prints/plan/pinTemplates';
import { deckTimeZone, formatInstant, formatRatio, sourced, windowLabel } from '../features/wrapup/prints/analysis/sourced';
import { storyFor } from '../features/wrapup/prints/analysis/story';
import { summariseFrontendMinutes } from '../features/wrapup/prints/evidence/summarise';
import type { AnalysisContent, AnalysisCtx, EvidenceBundle, EvidencePack, EvidenceQueryId, ExecutedQuery, ShotSlot } from '../features/wrapup/prints/types';
import { v327Wp5Strings } from '../i18n/v327wp5';
import { A12_LOGS, A7_FRONTEND_MINUTES, A8_CAPACITY_ARD, A9_RECURRENCE, LAB, LAB_INCIDENT, LAB_PLAN, labPlanInput, labPrint, labResult, labResults, labSlotOf } from './fixtures/prints.lab';

/**
 * The analysis of the real-prints deck (3.2.7, WP5) on the P-260914359 lab: the detector
 * reproduces every hit of §4.10 with its window, a per-minute ratio skips thin minutes, a partial
 * read never feeds a rule a missing row could invert, every number of a finding is a measured
 * `Sourced` value, the DQL printed is the DQL that ran, cross-links follow the deck, pins keep
 * apart, the story never claims a detection time, and the screen is checked against Grail without
 * reconciling the two.
 */

const ctxOf = (locale: Locale = 'pt-BR', profile: 'se' | 'customer' = 'se'): AnalysisCtx => ({
  locale,
  profile,
  t: (key, params) => translate(key, locale, params),
  tCount: (key, count, params) => translate(pluralKey(key, count), locale, params),
  timeZone: 'UTC',
  numbers: new Map(),
});

const lab = () => assembleBundle(LAB_PLAN, labResults());
const present = LAB_PLAN.slots.filter((slot) => slot.included).map((slot) => slot.id);
const hhmm = (iso: string | undefined) => iso?.slice(11, 16);

function analyses(locale: Locale = 'pt-BR', profile: 'se' | 'customer' = 'se', bundle: EvidenceBundle = lab().bundle, shots: readonly string[] = present) {
  const ctx = ctxOf(locale, profile);
  const links = buildCrossLinks(bundle, shots, LAB_PLAN, ctx);
  const out = new Map<ShotSlot['kind'], { content: AnalysisContent | null; anomalies: Anomaly[]; slot: ShotSlot; pack: EvidencePack }>();
  for (const slot of LAB_PLAN.slots) {
    const pack = bundle[slot.id];
    if (pack === undefined) continue;
    const anomalies = detectAnomalies(pack, ctx, slot);
    out.set(slot.kind, { content: analysisFor(slot, pack, anomalies, links, ctx), anomalies, slot, pack });
  }
  return out;
}

const anomaliesOf = (kind: ShotSlot['kind'], rule: Anomaly['rule']) => (analyses().get(kind)?.anomalies ?? []).filter((anomaly) => anomaly.rule === rule);

// ------------------------------------------------------------------ the detector (§4.6, §4.10)

describe('the detector reproduces the lab hits of §4.10', () => {
  it('D1: TradeManagement 22:58–23:02 (5 min), easyTradeManager 22:58–23:01 (4 min), over W', () => {
    const hits = anomaliesOf('root-cause', 'D1');
    expect(hits.map((hit) => [hit.entityId, hhmm(hit.fromIso), hhmm(hit.toIso), hit.value.value, hit.severity])).toEqual([
      [LAB.root, '22:58', '23:02', 5, 'critical'],
      [LAB.caller, '22:58', '23:01', 4, 'critical'],
    ]);
    expect(hits[0]?.value.window).toMatchObject({ kind: 'incident', startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z' });
  });

  it('D3: TradeManagement baseline 621.5/min, run 22:55–23:00, −98.6 % in the worst minute', () => {
    const hit = anomaliesOf('root-cause', 'D3').find((anomaly) => anomaly.entityId === LAB.root);
    expect(hit?.baseline?.value).toBe(621.5);
    expect([hhmm(hit?.fromIso), hhmm(hit?.toIso)]).toEqual(['22:55', '23:00']);
    expect(hit?.value.value).toBeCloseTo(98.55, 1);
    expect(hit?.value.display).toBe('98,6 %');
    expect(translate(hit?.headline.key ?? 'prt.anom.D3', 'pt-BR', hit?.headline.params)).toBe('Throughput caiu 98,6 % no pior minuto');
  });

  it('D4: easyTradeManager recorded nothing 22:54–22:57 (4 min)', () => {
    const hits = anomaliesOf('root-cause', 'D4');
    expect(hits.map((hit) => [hit.entityId, hhmm(hit.fromIso), hhmm(hit.toIso), hit.value.value])).toEqual([[LAB.caller, '22:54', '22:57', 4]]);
  });

  it('D5a: p90 5.61 ms → 20,709 ms at 23:02 (TradeManagement) and 51.7 ms → 116,597 ms at 23:04 (easyTradeManager)', () => {
    const hits = anomaliesOf('root-cause', 'D5a');
    const tm = hits.find((hit) => hit.entityId === LAB.root);
    const em = hits.find((hit) => hit.entityId === LAB.caller);
    expect(tm?.baseline?.value).toBeCloseTo(5.61, 2);
    expect(tm?.value.value).toBeCloseTo(20709.375, 3);
    expect(hhmm(tm?.fromIso)).toBe('23:02');
    expect(em?.baseline?.value).toBeCloseTo(51.67, 2);
    expect(em?.value.value).toBeCloseTo(116597.3, 1);
    expect(hhmm(em?.fromIso)).toBe('23:04');
    // From 10 s on a duration reads in seconds (3.2.7 review UX-L4): never '20.709 ms' or '116.597 ms'.
    expect(tm?.value.display).toBe('20,7 s');
    expect(em?.value.display).toBe('117 s');
  });

  it('D6: INP p75 4,979 ms over W, 24.9× the 200 ms goal; LCP 576 ms is good', () => {
    const hit = anomaliesOf('frontend', 'D6')[0];
    expect(hit?.value.value).toBe(4978.8);
    expect(hit?.ratio).toBeCloseTo(24.9, 1);
    expect(hit?.severity).toBe('high');
    expect(hit?.value.window?.kind).toBe('incident');
  });

  it('D7: 81 frontend errors/min at 22:54 against a median of 3 before 22:44 (27×)', () => {
    const hit = anomaliesOf('frontend', 'D7')[0];
    expect([hit?.value.value, hit?.baseline?.value, hit?.ratio, hhmm(hit?.fromIso)]).toEqual([81, 3, 27, '22:54']);
  });

  it('D8a: ard-dynatrace-gcp-monitor memory 100 % reserved / 8.8 % used; CPU 86.6 % / 3.6 %', () => {
    const k8s = labSlotOf('k8s-cluster');
    const requests = planEvidenceRequests(labPlanInput());
    const pack = assemblePack(k8s, LAB_PLAN, labResults({ k8sCapacity: labResult(A8_CAPACITY_ARD, requests.k8sCapacity) }));
    const capacity = pack.k8s?.capacity;
    expect(capacity).toBeDefined();
    const signals = capacitySignals(capacity ?? ({} as never));
    expect(signals.memReqOfAlloc).toBeCloseTo(1, 6);
    expect(signals.memUsedOfReq).toBeCloseTo(0.088, 3);
    expect(signals.cpuReqOfAlloc).toBeCloseTo(0.866, 3);
    expect(signals.cpuUsedOfReq).toBeCloseTo(0.036, 3);
    expect(signals.memoryIdle && signals.cpuIdle).toBe(true);
    const hit = detectAnomalies(pack, ctxOf(), k8s).find((anomaly) => anomaly.rule === 'D8a');
    expect([hit?.value.display, hit?.baseline?.display]).toEqual(['100 %', '8,8 %']);
    // loan-app-dynakube reserves 36.8 % of its memory: no D8a.
    expect(anomaliesOf('k8s-cluster', 'D8a')).toEqual([]);
  });

  it('D8b and D9: kafka-broker at 117.5 % of its request; sqs-demo 669 restarts and 257 OOM kills, top 2 = 80.4 % of 1,522', () => {
    expect(anomaliesOf('k8s-cluster', 'D8b')[0]?.value.value).toBe(117.5);
    const churn = anomaliesOf('k8s-cluster', 'D9')[0];
    expect([churn?.severity, churn?.value.value]).toEqual(['high', 257]);
    expect(churn?.ratio).toBeCloseTo((669 + 555) / 1522, 6);
    expect(Math.round((churn?.ratio ?? 0) * 1000) / 10).toBe(80.4);
  });

  it('D11: 4 signatures × 2,754 = 72.8 % of 15,126 ERROR logs in 2 h', () => {
    const hit = anomaliesOf('logs-errors', 'D11')[0];
    expect(hit?.value.value).toBe(4);
    const finding = analyses().get('logs-errors')?.content?.findings.find((item) => item.basis === 'D11');
    expect(finding?.text).toBe('4 assinaturas têm exatamente 2.754 ocorrências cada: uma mesma falha gera 4 linhas — 72,8 % dos logs ERROR.');
  });

  it('D13: the same root id in 6 problems, rank 1, 3.0× the next (the 15-day window)', () => {
    const hit = anomaliesOf('problem', 'D13')[0];
    expect([hit?.value.value, hit?.severity, hit?.ratio, hit?.entityId]).toEqual([6, 'high', 3, LAB.root]);
    expect(hit?.value.window?.kind).toBe('recurrence');
  });

  it('D14: 4 + 2 upstream services and 1 frontend', () => {
    const hit = anomaliesOf('smartscape', 'D14')[0];
    expect(hit?.value.value).toBe(6);
    const finding = analyses().get('smartscape')?.content?.findings.find((item) => item.basis === 'D14');
    expect(finding?.text).toBe('TradeManagement tem 4 chamadores diretos e 2 serviços de entrada acima deles, até 1 frontend: o raio de impacto que o grafo previa.');
  });

  it('D18: GET v1/instrument holds 86/218 = 39.4 %; POST v1/trade/long/process fails at 3.01 %, 10.8× the service', () => {
    const hit = anomaliesOf('failing-service', 'D18')[0];
    expect(hit?.value.value).toBeCloseTo(39.45, 2);
    expect(hit?.ratio).toBeCloseTo(3.01 / 0.28, 6);
    expect(hit?.entityId).toBe(LAB.broker);
  });

  it('D15, D16 and D17 fire on their own data only', () => {
    const vulns = assemblePack(labSlotOf('vulnerabilities'), LAB_PLAN, labResults(), {
      security: { id: 'sec.posture', dql: 'x', outcome: 'ok', records: [{ level: 'CRITICAL', technology: 'JAVA', vulnerabilities: 4, actNow: 2 }], window: { kind: 'global', startIso: '2026-10-05T18:30:00.000Z', endIso: '2026-10-05T19:00:00.000Z', source: 'app', minutes: 30 }, readAtIso: null, scannedBytes: null },
      incidentLogs: null,
    });
    expect(detectAnomalies(vulns, ctxOf()).map((anomaly) => [anomaly.rule, anomaly.severity, anomaly.value.value])).toEqual([['D15', 'critical', 2]]);
    const logs = assemblePack(labSlotOf('logs-errors'), LAB_PLAN, labResults(), { security: null, incidentLogs: { outcome: 'ok', total: 0 } });
    expect(detectAnomalies(logs, ctxOf()).map((anomaly) => anomaly.rule)).toEqual(['D11', 'D17']);
    const hot: EvidencePack = { shotId: 'host--host-aaaaaaaaaaaaaaaa', kind: 'host', outcome: 'ok', windows: {}, queries: [], host: { id: 'HOST-AAAAAAAAAAAAAAAA', name: 'ip-172-31-93-120', cpuAvg: 75.7, cpuPeak: 98, memAvg: 50, fleetMedianCpu: 2.3, hosts: 40, under10: 31 } };
    const d16 = detectAnomalies(hot, ctxOf())[0];
    expect([d16?.rule, Math.round(d16?.ratio ?? 0)]).toEqual(['D16', 33]);
  });

  it('orders the anomalies by severity, then ratio, and heads the print with the strongest (≤ 60 characters)', () => {
    const problem = analyses().get('problem');
    const severities = problem?.anomalies.map((anomaly) => anomaly.severity) ?? [];
    const rank = { critical: 0, high: 1, medium: 2, info: 3 } as const;
    expect([...severities].sort((a, b) => rank[a] - rank[b])).toEqual(severities);
    expect(problem?.content?.headline).toBe('5 min com 100 % de falhas');
    for (const [, item] of analyses()) if (item.content?.headline != null) expect(item.content.headline.length).toBeLessThanOrEqual(PRINT_BUDGET.headline);
  });
});

describe('guards', () => {
  it('MIN_REQ: a minute below max(20, 0.5 × the baseline requests) never gives a per-minute ratio', () => {
    const minutes = summariseFrontendMinutes(A7_FRONTEND_MINUTES);
    if (minutes === null) throw new Error('fixture');
    expect(minRequestsGuard(63.5)).toBe(31.75);
    expect(minRequestsGuard(10)).toBe(THRESHOLDS.minRequestsPerMinute);
    const guarded = per100Peak(minutes.requests, minutes.errors, 31.75);
    expect(guarded?.value).toBeCloseTo(135.29, 2);
    expect([hhmm(guarded?.iso), guarded?.requests]).toEqual(['22:55', 34]);
    // A 10-request minute with 30 errors (300 per 100) is suppressed by the guard, and only by it.
    const thin = { ...minutes, requests: { ...minutes.requests, values: minutes.requests.values.map((value, index) => (index === 60 ? 10 : value)) }, errors: { ...minutes.errors, values: minutes.errors.values.map((value, index) => (index === 60 ? 30 : value)) } };
    expect(per100Peak(thin.requests, thin.errors, 31.75)?.value).toBeCloseTo(135.29, 2);
    expect(per100Peak(thin.requests, thin.errors, 0)?.value).toBe(300);
    const signals = frontendSignals(thin, Date.parse('2026-09-22T22:44:00.000Z'));
    expect(signals.guard).toBe(31.75);
    expect(signals.per100?.value).toBeCloseTo(135.29, 2);
  });

  it('skips D11 and the logs shares on a partial read, and states "at least" on a partial recurrence', () => {
    const requests = planEvidenceRequests(labPlanInput());
    const partial = labResults({
      logErrors: labResult(A12_LOGS, requests.logErrors, 'partial'),
      recurrence: labResult(A9_RECURRENCE, requests.recurrence, 'partial'),
    });
    const { bundle } = assembleBundle(LAB_PLAN, partial);
    const result = analyses('pt-BR', 'se', bundle);
    const logs = result.get('logs-errors');
    expect(logs?.anomalies.map((anomaly) => anomaly.rule)).not.toContain('D11');
    expect(logs?.content?.findings.map((finding) => finding.basis)).not.toContain('D11');
    expect(logs?.content?.kpis.map((kpi) => kpi.label)).not.toContain(translate('prt.an.kpi.top3', 'pt-BR'));
    expect(logs?.content?.kpis[0]?.footer).toContain('leitura parcial');
    expect(logs?.content?.kpis[0]?.value.display).toBe('15.126 (pelo menos)');
    const d13 = result.get('problem')?.anomalies.find((anomaly) => anomaly.rule === 'D13');
    expect(translate(d13?.headline.key ?? 'prt.anom.D13', 'pt-BR', d13?.headline.params)).toBe('Causa raiz de 6 (pelo menos) problemas em 15 dias');
    expect(d13?.value.quality).toBe('partial');
  });
});

// ------------------------------------------------------------------ the analysis slides (§4.8)

/** Digit runs a template writes itself ("100 %", "200 ms", "15 dias"…): not measured, so allowed. */
const TEMPLATE_DIGITS = new Set(
  ALL_KEYS.filter((key) => key.startsWith('prt.an.f.'))
    .flatMap((key) => (['en', 'pt-BR'] as const).map((locale) => translate(key, locale).replace(/\{[a-zA-Z]+(\|[^{}]*)?\}/g, ' ')))
    .flatMap((text) => text.match(/\d[\d.,]*/g) ?? []),
);

describe('analysisFor', () => {
  it('gives every analysed kind ≤ 4 KPIs, each Sourced with a window and a "{source} · {window}" footer', () => {
    const result = analyses();
    const kinds = [...result.entries()].filter(([, item]) => item.content !== null).map(([kind]) => kind);
    expect(kinds.sort()).toEqual(['failed-requests', 'failing-service', 'frontend', 'k8s-cluster', 'logs-errors', 'problem', 'root-cause', 'smartscape'].sort());
    for (const [kind, { content }] of result) {
      if (content === null) continue;
      expect(content.kpis.length, kind).toBeGreaterThanOrEqual(2);
      expect(content.kpis.length, kind).toBeLessThanOrEqual(PRINT_BUDGET.kpis);
      for (const kpi of content.kpis) {
        expect(kpi.value.window, `${kind}: ${kpi.label}`).not.toBeNull();
        expect(kpi.footer).toMatch(/^(DQL|Dynatrace Intelligence|RUM|Na tela|App) · /);
        expect(kpi.value.display).not.toMatch(/NaN|undefined|null/);
      }
      expect(content.findings.length, kind).toBeLessThanOrEqual(PRINT_BUDGET.findings);
      expect(content.reco.length, kind).toBeLessThanOrEqual(PRINT_BUDGET.reco);
      expect(content.matters.length, kind).toBeGreaterThan(0);
    }
  });

  it('pins the lab readings of the root-cause shot', () => {
    const content = analyses().get('root-cause')?.content;
    expect(content?.kpis.map((kpi) => [kpi.label, kpi.value.display, kpi.footer])).toEqual([
      ['com 100 % de falhas (TradeManagement)', '5 min', 'DQL · incidente 22/09 22:14–23:24 UTC'],
      ['queda de throughput no pior minuto', '98,6 %', 'DQL · incidente 22/09 22:14–23:24 UTC'],
      ['das falhas dos chamadores em easyTradeManager', '94,7 %', 'DQL · incidente 22/09 22:14–23:24 UTC'],
      ['p90 do pior minuto (normal 51,7 ms)', '117 s', 'DQL · incidente 22/09 22:14–23:24 UTC'],
    ]);
    expect(content?.findings.map((finding) => finding.basis)).toEqual(['D1', 'X1', 'D5a']);
    expect(content?.findings[1]?.text).toBe('easyTradeManager concentrou 94,7 % das falhas de todos os chamadores de TradeManagement (341 de 360): a página dele é a que mostra o impacto.');
    expect(content?.matters).toBe(translate('prt.an.matters.rootDb', 'pt-BR'));
    expect(content?.visual?.kind).toBe('columns');
  });

  it('pins the users of the problem: RUM 30 · Davis 52, never reconciled', () => {
    const problem = analyses().get('problem')?.content;
    const users = problem?.kpis.find((kpi) => kpi.label === translate('prt.an.kpi.users', 'pt-BR'));
    expect(users?.value.display).toBe('30 · 52');
    expect(users?.footer).toBe('RUM · problema 22/09 22:57–23:09 UTC');
    const frontend = analyses().get('frontend')?.content;
    expect(frontend?.findings.some((finding) => finding.text.includes('30 usuários e 46 sessões') && finding.text.includes('52'))).toBe(true);
  });

  it('labels a Davis-only users value as Davis, never as RUM users (3.2.7 review UX-H1)', () => {
    for (const locale of ['pt-BR', 'en'] as const) {
      const bundle = structuredClone(lab().bundle);
      for (const pack of Object.values(bundle)) {
        if (pack.frontend?.problem !== undefined) pack.frontend.problem = { ...pack.frontend.problem, users: null };
      }
      const problem = analyses(locale, 'customer', bundle).get('problem')?.content;
      const labels = problem?.kpis.map((kpi) => kpi.label) ?? [];
      const users = problem?.kpis.find((kpi) => kpi.label === translate('prt.an.kpi.usersDavis', locale));
      expect(users?.value.display, locale).toBe('52');
      expect(labels, locale).not.toContain(translate('prt.an.kpi.users', locale));
    }
    for (const key of ['prt.an.kpi.users', 'prt.an.kpi.usersDavis', 'prt.an.kpi.usersRum'] as const) {
      for (const locale of ['pt-BR', 'en'] as const) expect(translate(key, locale).length, `${key} ${locale}`).toBeLessThanOrEqual(PRINT_BUDGET.kpiLabel);
    }
  });

  it('writes findings as comparisons whose every number is a measured value (the number lint)', () => {
    for (const locale of ['pt-BR', 'en'] as const) {
      for (const [kind, { content }] of analyses(locale)) {
        for (const finding of content?.findings ?? []) {
          expect(finding.facts.length, `${kind}: ${finding.text}`).toBeGreaterThanOrEqual(2);
          let rest = finding.text;
          for (const display of finding.facts.map((fact) => fact.display).sort((a, b) => b.length - a.length)) rest = rest.split(display).join(' ');
          const stray = (rest.match(/\d[\d.,]*/g) ?? []).filter((run) => !TEMPLATE_DIGITS.has(run));
          expect(stray, `${locale} ${kind}: ${finding.text}`).toEqual([]);
        }
      }
    }
  });

  it('prints the DQL that ran: the visual’s query text equals its executed request', () => {
    const requests = planEvidenceRequests(labPlanInput());
    const expected: Partial<Record<ShotSlot['kind'], string | undefined>> = {
      problem: requests.incidentMinutes?.dql,
      'root-cause': requests.incidentMinutes?.dql,
      frontend: requests.frontendMinutes?.dql,
      'k8s-cluster': requests.k8sCapacity?.dql,
      'failing-service': requests.failingEndpoints?.dql,
      'failed-requests': requests.failedEndpoints?.dql,
      'logs-errors': requests.logErrors?.dql,
      smartscape: requests.topologyHubs?.dql,
    };
    for (const [kind, { content }] of analyses()) {
      if (content === null) continue;
      expect(content.dql, kind).toBe(expected[kind]);
      expect(content.dqlSource?.windowLine.length, kind).toBeGreaterThan(0);
    }
    expect(analyses().get('root-cause')?.content?.dqlSource?.windowLine).toBe('incidente 22/09 22:14–23:24 UTC');
  });

  it('states the endpoints that carry the failures, and tells the two BrokerService hubs apart by id', () => {
    const { bundle } = lab();
    const root = labSlotOf('root-cause');
    const pack = { ...(bundle[root.id] as EvidencePack), callers: undefined };
    const content = analysisFor(root, pack, detectAnomalies(pack, ctxOf(), root), [], ctxOf());
    expect(content?.findings.map((finding) => finding.text)).toContain('GetPackages e GetProducts somam 97,1 % das falhas de easyTradeManager no incidente.');
    const hubs = (bundle['smartscape--service-overview'] as EvidencePack).topology?.hubs ?? [];
    expect(hubLabels(hubs, ctxOf())).toEqual([':8080', ':80', 'EasytravelService', 'BrokerService ·4F4F', 'BrokerService ·41A4']);
    const visual = analyses().get('smartscape')?.content?.visual;
    expect(visual?.kind === 'bars' ? visual.items.map((item) => item.label) : []).toContain('BrokerService ·41A4');
  });

  it('heads a churn without OOM kills by its restarts', () => {
    const pack: EvidencePack = {
      shotId: 'k8s-cluster--k8s_cluster-87e7e0b19f2b0431',
      kind: 'k8s-cluster',
      outcome: 'ok',
      windows: {},
      queries: [],
      k8s: { capacity: null, workloads: [], churn: { total: 40, rows: [{ workload: 'a', namespace: 'n', restarts: 30, oom: null }, { workload: 'b', namespace: 'n', restarts: 10, oom: null }] }, incidentRestarts: [] },
    };
    const hit = detectAnomalies(pack, ctxOf())[0];
    expect([hit?.rule, hit?.severity, translate(hit?.headline.key ?? 'prt.anom.D9', 'pt-BR', hit?.headline.params)]).toEqual(['D9', 'medium', '40 reinícios em 24 h']);
  });

  it('gives no slide when no query was read or fewer than two KPIs resolve', () => {
    const ctx = ctxOf();
    const empty: EvidencePack = { shotId: 'failed-requests--list', kind: 'failed-requests', outcome: 'error', windows: {}, queries: [] };
    expect(analysisFor(labSlotOf('failed-requests'), empty, [], [], ctx)).toBeNull();
    expect(analyses().get('host')?.content).toBeNull();
    expect(analyses().get('vulnerabilities')?.content).toBeNull();
  });

  it('reads in English with English decimals, and in pt-BR with commas (3,0×, never 3.0×)', () => {
    expect(formatRatio(3, 'pt-BR')).toBe('3,0×');
    expect(formatRatio(3, 'en')).toBe('3.0×');
    expect(formatRatio(27.2, 'pt-BR')).toBe('27×');
    const texts = (locale: Locale) =>
      [...analyses(locale).values()].flatMap(({ content }) => (content === null ? [] : [...content.findings.map((finding) => finding.text), content.matters, ...content.reco, ...content.kpis.map((kpi) => `${kpi.label} ${kpi.value.display} ${kpi.footer}`)]));
    const pt = texts('pt-BR').join('\n');
    expect(pt).toContain('3,0×');
    expect(pt).not.toMatch(/\d\.\d×/);
    const en = texts('en').join('\n');
    expect(en).toContain('3.0×');
    expect(en).not.toMatch(/\bprt\./);
    expect(pt).not.toMatch(/\bprt\./);
    // Tone: hedged and positive.
    expect(pt).not.toMatch(/limitações|ruim|péssimo|culpa|falha grave|erro do cliente/i);
    for (const entry of Object.values(v327Wp5Strings)) expect(entry['pt-BR']).not.toMatch(/limitações|ruim|péssimo|culpa|falha grave|erro do cliente/i);
    // The tone rule of the spec's prints.tone.test.ts, folded in here: every prt.* pt-BR string.
    for (const key of ALL_KEYS.filter((item) => item.startsWith('prt.'))) expect(translate(key, 'pt-BR'), key).not.toMatch(/limitações|ruim|péssimo|culpa|falha grave|erro do cliente/i);
  });

  it('masks cloud hosts and tenant text in the Customer profile', () => {
    const se = analyses('pt-BR', 'se').get('problem')?.content?.findings.map((finding) => finding.text).join('\n') ?? '';
    const customer = analyses('pt-BR', 'customer').get('problem')?.content?.findings.map((finding) => finding.text).join('\n') ?? '';
    expect(se).toContain('ag-env-public-br');
    expect(customer).not.toContain('ag-env-public-br');
    expect(customer).toContain('‹host›');
  });

  it('cuts the screen-sourced values for an unapproved print (Prova por DQL)', () => {
    const content = analyses().get('root-cause')?.content;
    if (content == null) throw new Error('fixture');
    const screenFact = sourced(30, 'screen', 'screen', null, ctxOf());
    const tainted: AnalysisContent = { ...content, kpis: [...content.kpis, { label: 'x', value: screenFact, footer: 'x' }], findings: [...content.findings, { text: 'x', facts: [screenFact], basis: null }] };
    const safe = customerSafe(tainted);
    expect(safe.kpis).toHaveLength(content.kpis.length);
    expect(safe.findings).toHaveLength(content.findings.length);
  });
});

// ------------------------------------------------------------------ cross-links (§4.7)

describe('cross-links', () => {
  it('ties the lab’s shots by id: X1 (94.7 %), X2, X3 (22:57), X4 (pricing-service at 23:01), X5 (3 of 8), X7', () => {
    const { bundle } = lab();
    const links = buildCrossLinks(bundle, present, LAB_PLAN, ctxOf());
    expect(links.map((link) => link.id)).toEqual(['X1', 'X2', 'X3', 'X4', 'X5', 'X7']);
    const x1 = links.find((link) => link.id === 'X1');
    expect([x1?.facts.share?.display, x1?.facts.failures?.display, x1?.facts.total?.display, x1?.ref]).toEqual(['94,7 %', '341', '360', '01']);
    expect(links.find((link) => link.id === 'X3')?.facts.eventAt?.display).toBe('22:57 UTC');
    const x4 = links.find((link) => link.id === 'X4');
    expect([x4?.facts.workload?.display, x4?.facts.count?.display, x4?.facts.at?.display]).toEqual(['pricing-service (easytrade)', '2', '23:01 UTC']);
    const x5 = links.find((link) => link.id === 'X5');
    expect([x5?.facts.count?.value, x5?.facts.total?.value]).toEqual([3, 8]);
    expect(links.find((link) => link.id === 'X2')?.ref).toBe('02');
  });

  it('drops a link whose target is not in the deck, and renumbers the refs over the kept pairs', () => {
    const { bundle } = lab();
    const withoutRoot = present.filter((id) => !id.startsWith('root-cause'));
    const links = buildCrossLinks(bundle, withoutRoot, LAB_PLAN, ctxOf());
    expect(links.map((link) => link.id)).toEqual(['X3', 'X4', 'X5']);
    const reordered = buildCrossLinks(bundle, ['root-cause--service-c44033de8492cf45', 'failing-service--service-41a4f03120e830e8', 'problem--p-260914359'], LAB_PLAN, ctxOf());
    expect(reordered.map((link) => [link.id, link.ref])).toEqual([
      ['X1', '03'],
      ['X2', '01'],
    ]);
    // The finding that stood on X1 loses its link basis, never its numbers.
    const result = analyses('pt-BR', 'se', bundle, withoutRoot.concat('root-cause--service-c44033de8492cf45').filter((id) => !id.startsWith('problem')));
    const callerShare = result.get('root-cause')?.content?.findings.find((finding) => finding.text.includes('94,7 %'));
    expect(callerShare?.basis).toBeNull();
  });

  it('adds X6 for an opted-in host that is a frequent root cause, and states a quiet cluster when nothing restarted', () => {
    const plan = { ...LAB_PLAN, slots: LAB_PLAN.slots.map((slot) => (slot.kind === 'host' ? { ...slot, included: true } : slot)) };
    const { bundle } = assembleBundle(plan, labResults());
    const host = plan.slots.find((slot) => slot.kind === 'host') as ShotSlot;
    const links = buildCrossLinks(bundle, plan.slots.map((slot) => slot.id), plan, ctxOf());
    const x6 = links.find((link) => link.id === 'X6');
    expect([x6?.fromShotId, x6?.facts.rank?.value, x6?.facts.count?.value]).toEqual([host.id, 2, 2]);
    const requests = planEvidenceRequests(labPlanInput());
    const quiet = assembleBundle(LAB_PLAN, labResults({ k8sIncidentRestarts: labResult([], requests.k8sIncidentRestarts, 'empty') })).bundle;
    const k8s = analyses('pt-BR', 'se', quiet).get('k8s-cluster')?.content;
    expect(k8s?.findings.map((finding) => finding.text)).toContain('Nenhum reinício em easytrade durante o incidente: a plataforma Kubernetes não parece explicar a falha.');
  });

  it('adds X9 when the incident’s entities wrote no logs', () => {
    const { bundle } = assembleBundle(LAB_PLAN, labResults(), { security: null, incidentLogs: { outcome: 'ok', total: 0 } });
    const links = buildCrossLinks(bundle, present, LAB_PLAN, ctxOf());
    const x9 = links.find((link) => link.id === 'X9');
    expect([x9?.facts.id?.display, x9?.facts.cluster?.display]).toEqual([LAB.displayId, LAB.clusterName]);
    const logs = analyses('pt-BR', 'se', bundle).get('logs-errors')?.content;
    expect(logs?.findings.some((finding) => finding.basis === 'X9' && finding.text.includes(LAB.clusterName))).toBe(true);
    expect(logs?.reco[1]).toBe(translate('prt.an.reco.enableLogs', 'pt-BR', { cluster: LAB.clusterName }));
  });
});

// ------------------------------------------------------------------ pins (§5.6)

/** The problem screen's pins as the planner lays them out (spec §5.6). */
const PROBLEM_LAYOUT: PinLayoutLike = {
  pins: [
    { n: 1, x: 0.395, y: 0.092, anchor: { key: 'identity', zone: { x0: 0, y0: 0, x1: 1, y1: 0.12 }, place: 'right', offsetPx: 18 }, stability: 'stable', legendKey: 'prt.pin.problem.header' },
    { n: 2, x: 0.355, y: 0.131, anchor: { key: 'users', zone: { x0: 0, y0: 0.1, x1: 1, y1: 0.16 }, place: 'below', offsetPx: 18 }, stability: 'stable', legendKey: 'prt.pin.problem.impact' },
    { n: 3, x: 0.209, y: 0.342, anchor: { key: 'frontend', zone: { x0: 0, y0: 0.3, x1: 0.5, y1: 0.4 }, place: 'right', offsetPx: 18 }, stability: 'stable', legendKey: 'prt.pin.problem.frontend' },
    { n: 4, x: 0.6, y: 0.24, anchor: { key: 'rootCause', zone: { x0: 0.5, y0: 0.2, x1: 1, y1: 0.27 }, place: 'right', offsetPx: 18 }, stability: 'stable', legendKey: 'prt.pin.problem.root' },
    { n: 5, x: 0.84, y: 0.361, anchor: { key: 'signals', zone: { x0: 0.5, y0: 0.33, x1: 1, y1: 0.42 }, place: 'left', offsetPx: 18 }, stability: 'variable', legendKey: 'prt.pin.problem.signals' },
    { n: 6, x: 0.512, y: 0.497, anchor: { key: 'path', zone: { x0: 0.5, y0: 0.45, x1: 1, y1: 0.55 }, place: 'left', offsetPx: 18 }, stability: 'stable', legendKey: 'prt.pin.problem.path' },
  ],
};

describe('pins', () => {
  const problemSlot = labSlotOf('problem');
  const problemPack = () => lab().bundle[problemSlot.id] as EvidencePack;

  it('snaps to the anchor found inside its zone, else takes the fallback; a variable pin needs an anchor', () => {
    const record = labPrint(problemSlot, {
      anchors: [
        { key: 'users', hit: 0, rect: { x: 600, y: 900, w: 80, h: 20 } }, // outside its zone (y 0.10–0.16)
        { key: 'users', hit: 1, rect: { x: 574, y: 130, w: 80, h: 20 } }, // inside: snapped below it
      ],
    });
    const pins = placePins(record, problemSlot, problemPack(), ctxOf(), PROBLEM_LAYOUT);
    expect(pins.map((pin) => pin.n)).toEqual([1, 2, 3, 4, 6]);
    expect(pins.find((pin) => pin.n === 2)).toMatchObject({ x: 614, y: 168, origin: 'anchor', anchorKey: 'users' });
    expect(pins.find((pin) => pin.n === 1)).toMatchObject({ origin: 'template', x: Math.round(0.395 * 1720 * 1000) / 1000 });
    const withSignals = labPrint(problemSlot, { anchors: [{ key: 'signals', hit: 0, rect: { x: 1400, y: 400, w: 120, h: 20 } }] });
    expect(placePins(withSignals, problemSlot, problemPack(), ctxOf(), PROBLEM_LAYOUT).find((pin) => pin.n === 5)).toMatchObject({ origin: 'anchor', x: 1382, y: 410 });
  });

  it('writes the legend from the pack, drops a pin without its numbers, and caps at 4 with the lupa', () => {
    const record = labPrint(problemSlot);
    const { pins, legend } = pinsFor(record, problemSlot, problemPack(), ctxOf(), PROBLEM_LAYOUT);
    // 3.5.5: on their found labels the six pins sit apart (at the layout's reference spots two of them overlapped).
    expect(pins.map((pin) => pin.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(legend[0]).toBe('Cabeçalho: P-260914359 · ERROR · severidade 3 · 12 min, desde 22:57 UTC');
    expect(legend[1]).toBe('Impacto: 30 usuários e 46 sessões no frontend (RUM) · a Dynatrace Intelligence estima 52 afetados · 5 eventos num problema');
    expect(legend[2]).toBe('Frontend afetado: easyTrade — pico de 81 erros por minuto às 22:54 UTC (RUM)');
    expect(legend[3]).toBe('Causa raiz: TradeManagement (banco de dados) apontada pela Dynatrace Intelligence — causa de 6 problemas em 15 dias');
    for (const pin of pins) {
      expect(pin.x).toBeGreaterThan(0);
      expect(pin.x).toBeLessThan(1);
      expect(pin.label).toBe(legend[pin.n - 1]);
    }
    const noPack = pinsFor(record, problemSlot, null, ctxOf(), PROBLEM_LAYOUT);
    expect(noPack.legend.every((line) => !/\d/.test(line.replace('P-260914359', '')))).toBe(true);
    const lupa = pinsFor({ ...record, lupaOn: true, focus: { x: 574, y: 121, w: 481, h: 41 } }, problemSlot, problemPack(), ctxOf(), PROBLEM_LAYOUT);
    expect(lupa.pins).toHaveLength(PRINT_BUDGET.pinsWithZoom);
  });

  it('3.5.5: draws no pin where no label was found — its reading becomes an unnumbered note', () => {
    const record = labPrint(problemSlot, { anchors: [], source: 'manual' });
    const { pins, legend, notes } = pinsFor(record, problemSlot, problemPack(), ctxOf(), PROBLEM_LAYOUT);
    expect(pins).toEqual([]);
    expect(legend).toEqual([]);
    expect(notes[0]).toBe('Cabeçalho: P-260914359 · ERROR · severidade 3 · 12 min, desde 22:57 UTC');
    // One label found: that pin is drawn, the rest stay notes.
    const one = pinsFor({ ...record, anchors: [{ key: 'rootCause', hit: 0, rect: { x: 1000, y: 250, w: 90, h: 16 } }] }, problemSlot, problemPack(), ctxOf(), PROBLEM_LAYOUT);
    expect(one.pins).toHaveLength(1);
    expect(one.legend[0]).toMatch(/^Causa raiz: TradeManagement/);
    expect(one.notes.some((line) => line.startsWith('Causa raiz'))).toBe(false);
  });

  it('keeps the SE’s own pins: positions, hidden flags and legend overrides', () => {
    const record = labPrint(problemSlot, {
      pins: [
        { n: 1, x: 860, y: 540, origin: 'manual' },
        { n: 2, x: 100, y: 100, origin: 'manual', hidden: true },
        { n: 4, x: 1000, y: 300, origin: 'manual', labelOverride: 'Causa raiz: confirmada com o time do banco' },
      ],
    });
    const { pins, legend } = pinsFor(record, problemSlot, problemPack(), ctxOf(), PROBLEM_LAYOUT);
    expect(pins.map((pin) => [pin.n, pin.x, pin.y])).toEqual([
      [1, 0.5, 0.5],
      [2, 1000 / 1720, 300 / 1080],
    ]);
    expect(legend[1]).toBe('Causa raiz: confirmada com o time do banco');
  });

  it('sets a pin beside its label without covering it: the slide pin’s radius plus a gap away (3.2.7 review UX-M2)', () => {
    // The pin on the slide is PIN_SIZE EMU on an image PRINT_IMAGE_BOX.w EMU wide for 1720 print px: about 30 px of radius.
    const radiusPx = PIN_SIZE / 2 / (PRINT_IMAGE_BOX.w / PRINT_SPACE.width);
    expect(radiusPx).toBeGreaterThan(29);
    const label = { x: 600, y: 300, w: 140, h: 16 };
    for (const layout of Object.values(LAYOUTS)) {
      for (const template of layout.pins) {
        if (template.anchor === null) continue;
        const { place, offsetPx } = template.anchor;
        expect(offsetPx, `${layout.key} pin ${template.n}`).toBeGreaterThanOrEqual(radiusPx + 4);
        const centre = placeBeside(label, place, offsetPx);
        if (place === 'left') expect(centre.x + radiusPx).toBeLessThanOrEqual(label.x);
        if (place === 'right') expect(centre.x - radiusPx).toBeGreaterThanOrEqual(label.x + label.w);
        if (place === 'below') expect(centre.y - radiusPx).toBeGreaterThanOrEqual(label.y + label.h);
        if (place === 'above') expect(centre.y + radiusPx).toBeLessThanOrEqual(label.y);
      }
    }
    // The default offset clears the label too.
    expect(placeBeside(label, 'right').x - radiusPx).toBeGreaterThanOrEqual(label.x + label.w);
  });

  it('keeps a pin off the number printed under its label: left of a tile heading, above a column header (3.2.7 final review D1)', () => {
    const radiusPx = PIN_SIZE / 2 / (PRINT_IMAGE_BOX.w / PRINT_SPACE.width);
    // A short heading over a wider value, left-aligned ("INP" over "1,240"), as the platform's tiles and the harness draw them.
    const label = { x: 600, y: 300, w: 42, h: 22 };
    const value = { x: 600, y: label.y + label.h + 4, w: 160, h: 44 };
    const covers = (centre: { x: number; y: number }, rect: typeof label) => {
      const dx = Math.max(rect.x - centre.x, 0, centre.x - (rect.x + rect.w));
      const dy = Math.max(rect.y - centre.y, 0, centre.y - (rect.y + rect.h));
      return Math.hypot(dx, dy) < radiusPx;
    };
    let checked = 0;
    for (const [layoutKey, keys] of Object.entries(NUMBER_UNDER_LABEL)) {
      const layout = LAYOUTS[layoutKey as keyof typeof LAYOUTS];
      for (const key of keys ?? []) {
        const anchor = layout.pins.find((template) => template.anchor?.key === key)?.anchor;
        expect(anchor, `${layoutKey} ${key}`).toBeDefined();
        if (anchor === null || anchor === undefined) continue;
        const centre = placeBeside(label, anchor.place, anchor.offsetPx);
        expect(covers(centre, label), `${layoutKey} ${key} covers its label`).toBe(false);
        expect(covers(centre, value), `${layoutKey} ${key} covers the number under its label`).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBe(10);
    // What the review saw: below the label lands on the number, and beside a short label it still reaches it.
    expect(covers(placeBeside(label, 'below'), value)).toBe(true);
    expect(covers(placeBeside(label, 'right'), value)).toBe(true);
  });

  it('covers every legend of the planner’s layouts, and lays every lab print out with them', () => {
    const keys: readonly string[] = PIN_LEGEND_KEYS;
    for (const layout of Object.values(LAYOUTS)) for (const template of layout.pins) expect(keys, `${layout.key} pin ${template.n}`).toContain(template.legendKey);
    for (const variant of ['prt.pin.service.rootName', 'prt.pin.service.failingName', 'prt.pin.service.rtPlain', 'prt.pin.service.failVsEnv']) expect(keys).toContain(variant);
    const { bundle } = lab();
    for (const slot of LAB_PLAN.slots) {
      const layout: PinLayoutLike = LAYOUTS[slot.layout];
      const { pins, legend } = pinsFor(labPrint(slot), slot, bundle[slot.id] ?? null, ctxOf(), layout);
      expect(pins.length, slot.id).toBeLessThanOrEqual(PRINT_BUDGET.pins);
      for (const line of legend) {
        expect(line, slot.id).not.toMatch(/\{[a-zA-Z]+\}|\bprt\.|undefined|NaN/);
        expect(line, slot.id).toMatch(/^[^:]+: /);
      }
    }
    const root = labSlotOf('root-cause');
    const { legend } = pinsFor(labPrint(root), root, bundle[root.id] ?? null, ctxOf(), LAYOUTS['services.details']);
    expect(legend).toContain('Saúde: 7 falhas em 6.004 requisições (0,12 %) nos 31 min da tela');
    expect(legend[0]).toBe('Serviço: easyTradeManager — chamador nº 1 do banco de dados TradeManagement no P-260914359 (341 falhas na janela do incidente)');
    const frontend = labSlotOf('frontend');
    expect(pinsFor(labPrint(frontend), frontend, bundle[frontend.id] ?? null, ctxOf(), LAYOUTS['vitals.web']).legend).toContain('Core web vitals: LCP 576 ms, CLS 0,001 e INP 4.979 ms');
  });

  it('pulls overlapping pins 72 px apart, at most three times, and drops what still collides', () => {
    const pins = separatePins([
      { x: 100, y: 100 },
      { x: 110, y: 110 },
      { x: 100, y: 100 },
    ]);
    expect(pins.map((pin) => pin.y)).toEqual([100, 182, 316]);
    for (let a = 0; a < pins.length; a += 1) {
      for (let b = a + 1; b < pins.length; b += 1) {
        const [p, q] = [pins[a], pins[b]];
        if (p !== undefined && q !== undefined) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(72);
      }
    }
    expect(separatePins([{ x: 100, y: 1000 }, { x: 100, y: 1010 }])).toHaveLength(1);
  });

  it('checks the screen against Grail: 30 vs 30 → checked; 30 vs 52 → different measures, both stated', () => {
    const ctx = ctxOf();
    const screen = sourced(30, 'screen', 'screen', null, ctx);
    expect(crossCheck('users', screen, sourced(30, 'rum', 'ev.frontend.summary', null, ctx), ctx)).toMatchObject({ agree: true, text: 'conferido no Grail' });
    expect(crossCheck('users', screen, sourced(52, 'davis', 'ev.problem.events', null, ctx), ctx)).toMatchObject({ agree: false, text: 'tela 30 · Grail 52 — medidas diferentes' });
    const record = labPrint(problemSlot, { screenNumbers: [{ anchorKey: 'users', hit: 0, values: [30, 46] }] });
    const { legend, crossChecks } = pinsFor(record, problemSlot, problemPack(), ctx, PROBLEM_LAYOUT);
    expect(crossChecks.map((check) => check.agree)).toEqual([true]);
    expect(legend[1]?.endsWith('(conferido no Grail)')).toBe(true);
    const off = pinsFor(labPrint(problemSlot, { screenNumbers: [{ anchorKey: 'users', hit: 0, values: [52] }] }), problemSlot, problemPack(), ctx, PROBLEM_LAYOUT);
    expect(off.legend[1]?.endsWith('(tela 52 · Grail 30 — medidas diferentes)')).toBe(true);
  });
});

// ------------------------------------------------------------------ story and methodology

describe('the story', () => {
  it('tells the lab incident in 5 steps, every time an event start or a measured minute (never a detection)', () => {
    const { bundle } = lab();
    const story = storyFor(bundle, LAB_PLAN, present, ctxOf());
    expect(story?.steps.map((step) => [step.stage, step.time])).toEqual([
      ['symptom', '22:54 UTC'],
      ['onset', '22:44 UTC'],
      ['cause', null],
      ['evidence', '22:58 UTC'],
      ['pattern', null],
    ]);
    expect(story?.steps.length).toBeGreaterThanOrEqual(3);
    expect(story?.steps.length).toBeLessThanOrEqual(PRINT_BUDGET.storySteps);
    for (const step of story?.steps ?? []) {
      if (step.time !== null) expect(step.text).not.toMatch(/detect|detecç/i);
      expect(step.text.length).toBeLessThanOrEqual(PRINT_BUDGET.storyText);
    }
    expect(story?.steps[1]?.text).toBe('TradeManagement: SLOWDOWN a partir das 22:44 UTC (início no evento da Dynatrace Intelligence); o problema começa às 22:57 UTC');
    // The band's own lead says when each anomaly started: no second lead-in, no raw field name (3.2.7 review UX-L4).
    expect(story?.chain).toBe('TradeManagement 22:44 → :80 22:52 → easyTrade 22:57 · 13 min do primeiro ao último');
    // The title counts the steps shown, not the distinct screens behind them.
    expect(story?.title).toBe('O incidente em 5 passos');
    expect(`${story?.chain} ${story?.caveat}`).not.toMatch(/detect|detecç/i);
  });

  it('points each step to a kept print only, and has no story below three steps', () => {
    const { bundle } = lab();
    const story = storyFor(bundle, LAB_PLAN, ['problem--p-260914359'], ctxOf());
    expect(new Set(story?.steps.map((step) => step.shotId))).toEqual(new Set(['problem--p-260914359', null]));
    const thin: EvidenceBundle = { 'problem--p-260914359': bundle['problem--p-260914359'] as EvidencePack };
    const onlyProblem = storyFor({ ...thin, 'problem--p-260914359': { ...(thin['problem--p-260914359'] as EvidencePack), recurrence: undefined, services: undefined, frontend: undefined, callers: undefined } }, LAB_PLAN, present, ctxOf());
    expect(onlyProblem).toBeNull();
    expect(storyFor(bundle, { ...LAB_PLAN, incident: null }, present, ctxOf())).toBeNull();
  });
});

describe('the methodology', () => {
  const executed = (): ExecutedQuery[] => [
    ...lab().executed.slice(0, 3),
    { id: 'ev.logs.errors', dql: 'x', window: null, records: 0, scannedBytes: null, outcome: 'no-permission', readAtIso: null },
  ];
  const prints = LAB_PLAN.slots.slice(0, 3).map((slot, index) => labPrint(slot, index === 2 ? { identity: 'se-confirmed', source: 'manual' } : {}));
  const gaps = () => methodologyGaps(LAB_PLAN, lab().bundle);

  it('lists the screens, the queries with their windows and reads, and the gaps', () => {
    const page = methodologyFor(executed(), prints, gaps(), ctxOf(), { tenantHost: 'abc12345.apps.dynatrace.com' });
    expect(page.scope[0]).toEqual({ label: 'Ambiente', value: 'abc12345.apps.dynatrace.com' });
    expect(page.scope[1]?.value).toBe('3 (2 verificadas) via capturador + manual');
    expect(page.prints[0]).toEqual([translate('prt.title.problem', 'pt-BR', { id: LAB.displayId }), '05/10 18:58 UTC', 'capturador', 'verificado', 'tela verificada']);
    expect(page.prints[2]?.[4]).toBe('confirmada pelo SE');
    expect(page.queries[0]).toEqual(['ev.problem.events', translate('prt.win.app', 'pt-BR', { label: '22/09 21:57–23/09 00:09 UTC' }), '6', '1 KB']);
    expect(page.queries[3]).toEqual(['ev.logs.errors', '—', 'sem permissão', 'não informado']);
    expect(page.gaps).toEqual([translate('prt.meth.gap.users', 'pt-BR'), translate('prt.meth.gap.security', 'pt-BR'), translate('prt.meth.gap.spans', 'pt-BR')]);
    expect(page.queries.length).toBeLessThanOrEqual(PRINT_BUDGET.methodRows);
  });

  // Seventeen queries as the harness deck ran them (3.2.7 final review D3, D4): the two its appendix prints last in run order.
  const SEVENTEEN: readonly EvidenceQueryId[] = [
    'ev.problem.events',
    'ev.incident.callers',
    'ev.problem.recurrence',
    'ev.service.minutes',
    'ev.service.endpoints',
    'ev.service.screen',
    'ev.frontend.summary',
    'ev.k8s.capacity',
    'ev.k8s.workloads',
    'ev.k8s.churn',
    'ev.k8s.incidentRestarts',
    'ev.failing.services',
    'ev.failing.endpoints',
    'ev.entity.events',
    'ev.topology.blast',
    'ev.topology.hubs',
    'ev.logs.errors',
  ];
  const ranAt = (ids: readonly EvidenceQueryId[], readAtIso: (index: number) => string | null): ExecutedQuery[] =>
    ids.map((id, index) => ({ id, dql: `fetch ${id}`, window: null, records: index, scannedBytes: 0, outcome: 'ok', readAtIso: readAtIso(index) }));
  const CITED = ['ev.service.minutes', 'ev.frontend.summary', 'ev.k8s.capacity', 'ev.failing.endpoints', 'ev.logs.errors'];

  it('lists the queries the deck cites first and counts the ones it leaves out: "+8 outras", never a silent cut (3.2.7 final review D3)', () => {
    const all = ranAt(SEVENTEEN, () => '2026-09-15T12:00:00.000Z');
    const page = methodologyFor(all, prints, gaps(), ctxOf(), { cited: CITED });
    expect(page.queries).toHaveLength(PRINT_BUDGET.methodRows);
    expect(page.queries.slice(0, CITED.length).map((row) => row[0])).toEqual(CITED);
    // The rest in the order they ran, up to the row the count takes.
    expect(page.queries.slice(CITED.length, -1).map((row) => row[0])).toEqual(['ev.problem.events', 'ev.incident.callers', 'ev.problem.recurrence', 'ev.service.endpoints']);
    expect(page.queries.at(-1)).toEqual(['+8 outras', '', '', '']);
    // Listed plus counted is every query that ran: nothing is lost, nothing counted twice.
    expect(page.queries.length - 1 + 8).toBe(all.length);
    expect(page.scope[2]?.value).toBe('17 executadas às 12:00 UTC');
    const en = methodologyFor(all, prints, gaps(), ctxOf('en'), { cited: CITED });
    expect(en.queries.at(-1)?.[0]).toBe('+8 more');
    // Without the deck's citations, the run order; ten fit whole with no count line.
    expect(methodologyFor(all, prints, gaps(), ctxOf()).queries.slice(0, 9).map((row) => row[0])).toEqual(SEVENTEEN.slice(0, 9));
    const ten = methodologyFor(all.slice(0, PRINT_BUDGET.methodRows), prints, gaps(), ctxOf(), { cited: CITED });
    expect(ten.queries.map((row) => row[0])).toEqual(methodologyOrder(all.slice(0, PRINT_BUDGET.methodRows), CITED).map((query) => query.id));
    expect(ten.queries.some((row) => row[0]?.startsWith('+'))).toBe(false);
  });

  it('keeps the runs of one query together and the uncited ones in run order', () => {
    const runs = ranAt(['ev.frontend.summary', 'ev.problem.events', 'ev.frontend.summary', 'ev.k8s.churn'], () => null);
    expect(methodologyOrder(runs, ['ev.k8s.churn', 'ev.frontend.summary', 'ev.k8s.churn']).map((query) => [query.id, query.records])).toEqual([
      ['ev.k8s.churn', 3],
      ['ev.frontend.summary', 0],
      ['ev.frontend.summary', 2],
      ['ev.problem.events', 1],
    ]);
  });

  it('says when the queries ran: one instant once, a span from the first to the last (3.2.7 final review D4)', () => {
    const scopeOf = (iso: (index: number) => string | null, locale: Locale = 'pt-BR') => methodologyFor(ranAt(SEVENTEEN.slice(0, 3), iso), prints, gaps(), ctxOf(locale)).scope[2]?.value;
    expect(scopeOf(() => '2026-09-15T12:00:00.000Z')).toBe('3 executadas às 12:00 UTC');
    expect(scopeOf(() => '2026-09-15T12:00:00.000Z', 'en')).toBe('3 run at 12:00 UTC');
    // The same minute is one instant, whatever the seconds.
    expect(scopeOf((index) => `2026-09-15T12:00:${String(index * 10).padStart(2, '0')}.000Z`)).toBe('3 executadas às 12:00 UTC');
    expect(scopeOf((index) => `2026-09-15T${['11:58', '11:59', '12:00'][index] ?? ''}:00.000Z`)).toBe('3 executadas entre 11:58 UTC e 12:00 UTC');
    // The same clock a day apart is a span: the day tells the two ends apart.
    expect(scopeOf((index) => (index === 0 ? '2026-09-14T12:00:00.000Z' : '2026-09-15T12:00:00.000Z'))).toBe('3 executadas entre 14/09 12:00 UTC e 15/09 12:00 UTC');
  });

  it('never names the tenant in the Customer profile', () => {
    const page = methodologyFor(executed(), prints, gaps(), ctxOf('pt-BR', 'customer'), { tenantHost: 'abc12345.apps.dynatrace.com' });
    expect(JSON.stringify(page)).not.toContain('abc12345');
    expect(page.scope[0]?.value).toBe(translate('prt.meth.envCustomer', 'pt-BR'));
    expect(page.scope[3]?.value).toBe(translate('profile.customer', 'pt-BR'));
  });
});

describe('formatting (§4.9)', () => {
  it('labels windows and instants in the deck zone, with its short name', () => {
    const W = { kind: 'incident' as const, startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z', source: 'derived' as const, minutes: 70 };
    expect(windowLabel(W, 'pt-BR', 'UTC')).toBe('22/09 22:14–23:24 UTC');
    expect(windowLabel(W, 'en', 'UTC')).toBe('22/09 22:14–23:24 UTC');
    expect(formatInstant('2026-09-22T22:57:00.000Z', 'pt-BR', 'America/Sao_Paulo')).toBe('19:57 BRT');
    expect(formatInstant('2026-09-22T22:57:00.000Z', 'pt-BR', 'Not/AZone')).toBe('22:57 UTC');
    const ctx = ctxOf('en');
    expect(sourced(135.3, 'rum', 'ev.frontend.minutes', null, ctx, { unit: 'per100' }).display).toBe('135.3 per 100 req');
    expect(sourced(135.3, 'rum', 'ev.frontend.minutes', null, ctxOf(), { unit: 'per100' }).display).toBe('135,3 por 100 req');
    expect(sourced(2.76, 'dql', 'ev.service.minutes', null, ctx, { unit: 'pct' }).display).toBe('2.8%');
    expect(sourced(12344, 'dql', 'ev.service.minutes', null, ctx).display).toBe('12,344');
  });

  it('takes the deck zone from the kept prints (the most common capture zone), else the viewer’s', () => {
    expect(deckTimeZone([{ captureTimeZone: 'UTC' }, { captureTimeZone: 'America/Sao_Paulo' }, { captureTimeZone: 'America/Sao_Paulo' }])).toBe('America/Sao_Paulo');
    expect(deckTimeZone([{ captureTimeZone: null }, { captureTimeZone: 'Bad/Zone' }], 'Europe/Lisbon')).toBe('Europe/Lisbon');
  });

  it('keeps every new WP5 key in both languages', () => {
    for (const [key, entry] of Object.entries(v327Wp5Strings)) {
      expect(entry.en.length, key).toBeGreaterThan(0);
      expect(entry['pt-BR'].length, key).toBeGreaterThan(0);
      expect(ALL_KEYS).toContain(key as StringKey);
    }
  });
});

// ------------------------------------------------------------------ review fixes (verification of WP5)

describe('claims that need their evidence', () => {
  it('gives D7 only against a measured, non-zero baseline (no ratio is invented from a zero)', () => {
    const minutes = summariseFrontendMinutes(A7_FRONTEND_MINUTES);
    if (minutes === null) throw new Error('fixture');
    const anchor = Date.parse('2026-09-22T22:44:00.000Z');
    // No error at all before the anomaly: the 81 errors at 22:54 have no "× the usual" to state.
    const quiet = { ...minutes, errors: { ...minutes.errors, values: minutes.errors.values.map((value, index) => (index < 30 ? 0 : value)) } };
    const signals = frontendSignals(quiet, anchor);
    expect([signals.peak, signals.ratio, signals.spike]).toEqual([81, null, false]);
    const pack: EvidencePack = { shotId: 'frontend--frontend-32e311f297817ea0', kind: 'frontend', outcome: 'ok', windows: {}, queries: [], frontend: { minutes: quiet } };
    expect(detectAnomalies(pack, ctxOf()).map((anomaly) => anomaly.rule)).not.toContain('D7');
    expect(frontendSignals(minutes, anchor).spike).toBe(true);
  });

  it('names CPU, not memory, when only the CPU reservation is idle (D8a), and never calls it balanced', () => {
    const k8s = labSlotOf('k8s-cluster');
    const requests = planEvidenceRequests(labPlanInput());
    // CPU 90 % of allocatable reserved, 5 % of it used; memory 40 % reserved, 60 % used.
    const cpuIdle = [
      { cpuUsedCores: 0.5, cpuReqCores: 10, cpuLimCores: 20, memUsedGiB: 12, memReqGiB: 20, memLimGiB: 30 },
      { isAllocatable: true, cpuAllocCores: 11.11, memAllocGiB: 50 },
    ];
    const pack = assemblePack(k8s, LAB_PLAN, labResults({ k8sCapacity: labResult(cpuIdle, requests.k8sCapacity) }));
    const ctx = ctxOf();
    const anomalies = detectAnomalies(pack, ctx, k8s);
    const d8a = anomalies.find((anomaly) => anomaly.rule === 'D8a');
    expect(d8a?.headline.key).toBe('prt.anom.D8a.cpu');
    expect(translate(d8a?.headline.key ?? 'prt.anom.D8a', 'pt-BR', d8a?.headline.params)).toBe('CPU 90 % reservada, 5 % em uso');
    const content = analysisFor(k8s, pack, anomalies, [], ctx);
    const texts = content?.findings.map((finding) => finding.text) ?? [];
    expect(texts).toContain('90 % da CPU alocável está reservada e só 5 % do reservado está em uso: alerta de reserva, não de saturação.');
    expect(texts.some((text) => text.startsWith('Reserva e uso estão equilibrados'))).toBe(false);
    // Use above the reservation is not "balanced" either (D8b's territory).
    const over = [
      { cpuUsedCores: 4, cpuReqCores: 10, cpuLimCores: 20, memUsedGiB: 30, memReqGiB: 20, memLimGiB: 40 },
      { isAllocatable: true, cpuAllocCores: 40, memAllocGiB: 80 },
    ];
    const overPack = assemblePack(k8s, LAB_PLAN, labResults({ k8sCapacity: labResult(over, requests.k8sCapacity) }));
    const overTexts = analysisFor(k8s, overPack, detectAnomalies(overPack, ctx, k8s), [], ctx)?.findings.map((finding) => finding.text) ?? [];
    expect(overTexts.some((text) => text.startsWith('Reserva e uso estão equilibrados'))).toBe(false);
  });

  it('cuts and redacts the workload named in the D8b pill', () => {
    const pack: EvidencePack = {
      shotId: 'k8s-cluster--k8s_cluster-87e7e0b19f2b0431',
      kind: 'k8s-cluster',
      outcome: 'ok',
      windows: {},
      queries: [],
      k8s: { capacity: null, workloads: [{ name: 'ip-10-0-0-1.ec2.internal-very-long-workload-name', namespace: 'n', memOfReqPct: 130, cpuOfReqPct: 10, memReqGiB: 1, memUsedGiB: 1.3 }], churn: null, incidentRestarts: [] },
    };
    const d8b = detectAnomalies(pack, ctxOf('pt-BR', 'customer')).find((anomaly) => anomaly.rule === 'D8b');
    const pill = translate(d8b?.headline.key ?? 'prt.anom.D8b', 'pt-BR', d8b?.headline.params);
    expect(pill).not.toContain('ip-10-0-0-1');
    expect(pill.length).toBeLessThanOrEqual(PRINT_BUDGET.headline);
  });

  it('states a failing service is off the incident’s path only when the full callers list proves it', () => {
    const { bundle } = lab();
    const failing = labSlotOf('failing-service');
    const base = bundle[failing.id] as EvidencePack;
    expect(base.callers?.rows).toHaveLength(4);
    const other = 'SERVICE-AAAAAAAAAAAAAAAA';
    const row = base.failing?.rows[0];
    if (row === undefined || base.failing === undefined) throw new Error('fixture');
    const slot: ShotSlot = { ...failing, subject: { kind: 'service', serviceId: other, role: 'failing' } };
    const pack: EvidencePack = { ...base, shotId: failing.id, failing: { ...base.failing, rows: [{ ...row, id: other }] } };
    const independent = (content: AnalysisContent | null) => content?.findings.some((finding) => finding.text.includes('não está no caminho')) ?? false;
    const ctx = ctxOf();
    // The planner gives this slot no incident: the plan's is passed in.
    expect(failing.incident).toBeNull();
    expect(independent(analysisFor(slot, pack, [], [], ctx))).toBe(false);
    expect(independent(analysisFor(slot, pack, [], [], ctx, LAB_PLAN.incident))).toBe(true);
    // BrokerService calls the root: with the root-cause shot out of the deck (no X2), nothing is claimed.
    expect(independent(analysisFor(failing, base, [], [], ctx, LAB_PLAN.incident))).toBe(false);
    // A cut callers list (as many rows as the query's limit) proves nothing either.
    const full = { ...pack, callers: { rootType: 'DATABASE_SERVICE', rows: [...(base.callers?.rows ?? []), { id: 'SERVICE-BBBBBBBBBBBBBBBB', name: 'x', requests: 1, failures: 0 }] } };
    expect(independent(analysisFor(slot, full, [], [], ctx, LAB_PLAN.incident))).toBe(false);
    // Nor does a service Davis marked as affected.
    expect(independent(analysisFor(slot, pack, [], [], ctx, { ...LAB_INCIDENT, affectedIds: [...LAB_INCIDENT.affectedIds, other] }))).toBe(false);
  });

  it('states the logs coverage gap from the plan’s incident even without the problem shot', () => {
    const { bundle } = assembleBundle(LAB_PLAN, labResults(), { security: null, incidentLogs: { outcome: 'ok', total: 0 } });
    const logsSlot = labSlotOf('logs-errors');
    expect(logsSlot.incident).toBeNull();
    const pack = bundle[logsSlot.id] as EvidencePack;
    const ctx = ctxOf();
    const withoutProblem = buildCrossLinks(bundle, present.filter((id) => !id.startsWith('problem')), LAB_PLAN, ctx);
    expect(withoutProblem.some((link) => link.id === 'X9')).toBe(false);
    const content = analysisFor(logsSlot, pack, detectAnomalies(pack, ctx, logsSlot), withoutProblem, ctx, LAB_PLAN.incident);
    const coverage = content?.findings.find((finding) => finding.basis === 'D17');
    expect(coverage?.text).toContain(LAB.clusterName);
    expect(content?.reco[1]).toBe(translate('prt.an.reco.enableLogs', 'pt-BR', { cluster: LAB.clusterName }));
    // An incident on no cluster gives no X9: its finding would have no cluster to name.
    const noCluster = { ...LAB_PLAN, incident: { ...LAB_INCIDENT, clusters: [] } };
    expect(buildCrossLinks(bundle, present, noCluster, ctx).some((link) => link.id === 'X9')).toBe(false);
  });

  it('labels W "(sem eventos)" when the problem events read failed and W fell back to the problem start', () => {
    const requests = planEvidenceRequests(labPlanInput({ firstEventStartIso: null }));
    const results = labResults({ problemEvents: labResult([], requests.problemEvents, 'error') }, { firstEventStartIso: null });
    const { bundle } = assembleBundle(LAB_PLAN, results);
    const content = analyses('pt-BR', 'se', bundle).get('root-cause')?.content;
    const footers = content?.kpis.map((kpi) => kpi.footer) ?? [];
    expect(footers.length).toBeGreaterThan(0);
    expect(footers.every((footer) => footer === 'DQL · incidente 22/09 22:27–23:24 UTC (sem eventos)')).toBe(true);
    expect(content?.dqlSource?.windowLine).toBe('incidente 22/09 22:27–23:24 UTC (sem eventos)');
  });

  it('keeps a long incident chart in "per minute": each column is its bucket’s worst minute', () => {
    const { bundle } = lab();
    const root = labSlotOf('root-cause');
    const base = bundle[root.id] as EvidencePack;
    const values = Array.from({ length: 300 }, (_, index) => (index === 150 ? 50 : 1));
    const services = (base.services ?? []).map((service) => ({ ...service, failures: { ...service.failures, values } }));
    const content = analysisFor(root, { ...base, services }, [], [], ctxOf());
    const visual = content?.visual;
    if (visual?.kind !== 'columns') throw new Error('columns expected');
    expect(visual.points.length).toBeLessThanOrEqual(PRINT_BUDGET.columns);
    expect(Math.max(...visual.points.map((point) => point.value ?? 0))).toBe(50);
    expect(visual.maxLabel).toBe('50');
  });

  it('zooms a chart on a short outage in a long window, and keeps the whole window otherwise (3.2.7 review UX-M3)', () => {
    const series = { startIso: '2026-09-09T04:33:00.000Z', stepMs: 60_000 };
    const at = (minute: number) => new Date(Date.parse(series.startIso) + minute * 60_000).toISOString();
    // 400 minutes; the outage is minutes 44–48, the first events at 30, 38 and 43.
    const outage = (index: number) => index >= 44 && index <= 48;
    expect(chartFocus(series, 400, outage, [at(30), at(38), at(43)])).toEqual({ from: 15, to: 63, zoomed: true });
    // What the chart is about spans more than half of it: the whole window.
    expect(chartFocus(series, 70, (index) => index >= 30 && index <= 34, [at(10)])).toEqual({ from: 0, to: 69, zoomed: false });
    // Nothing highlighted and no marker: the whole window.
    expect(chartFocus(series, 400, () => false, [])).toEqual({ from: 0, to: 399, zoomed: false });

    // Through the root-cause analysis: a 5-minute outage in a 400-minute series fills the chart, with its own title.
    const { bundle } = lab();
    const root = labSlotOf('root-cause');
    const base = bundle[root.id] as EvidencePack;
    const services = (base.services ?? []).map((service) => {
      const length = 400;
      const failures = Array.from({ length }, (_, index) => (index >= 200 && index < 205 ? 120 : 0));
      const requests = Array.from({ length }, (_, index) => (index >= 200 && index < 205 ? 120 : 400));
      return { ...service, failures: { ...service.failures, values: failures }, requests: { ...service.requests, values: requests } };
    });
    const content = analysisFor(root, { ...base, services }, [], [], ctxOf());
    const visual = content?.visual;
    if (visual?.kind !== 'columns') throw new Error('columns expected');
    // One column per minute: the 5 outage minutes and 15 on each side; the lab's problem (minutes 43–55) is off this chart.
    expect(visual.points.filter((point) => point.highlight)).toHaveLength(5);
    expect(visual.points).toHaveLength(5 + 2 * 15);
    expect(visual.title).toBe(translate('prt.an.viz.failuresPerMinZoom', 'pt-BR', { name: 'easyTradeManager' }));
    expect(visual.band).toBeNull();
  });

  it('rounds a ratio on its shown value (9.96 → 10×, never 10,0×)', () => {
    expect(formatRatio(9.96, 'pt-BR')).toBe('10×');
    expect(formatRatio(9.94, 'pt-BR')).toBe('9,9×');
    expect(formatRatio(10.75, 'en')).toBe('11×');
  });
});

describe('pins and methodology after review', () => {
  const problemSlot = labSlotOf('problem');

  it('leaves the SE’s pins where the SE put them, even close together', () => {
    const record = labPrint(problemSlot, {
      pins: [
        { n: 1, x: 860, y: 540, origin: 'manual' },
        { n: 2, x: 880, y: 560, origin: 'manual' },
      ],
    });
    const { pins } = pinsFor(record, problemSlot, lab().bundle[problemSlot.id] ?? null, ctxOf(), PROBLEM_LAYOUT);
    expect(pins.map((pin) => [pin.x * 1720, pin.y * 1080])).toEqual([
      [860, 540],
      [880, 560],
    ]);
  });

  it('drops the cause-signals pin when the cause’s first event did not come before the frontend’s', () => {
    const base = lab().bundle[problemSlot.id] as EvidencePack;
    if (base.problem === undefined) throw new Error('fixture');
    const late = { ...base, problem: { ...base.problem, events: base.problem.events.map((event) => (event.sourceId === LAB.root ? { ...event, startIso: '2026-09-22T23:00:00.000Z' } : event)) } };
    const record = labPrint(problemSlot, { anchors: [{ key: 'signals', hit: 0, rect: { x: 1400, y: 400, w: 120, h: 20 } }] });
    const legend = pinsFor(record, problemSlot, late, ctxOf(), PROBLEM_LAYOUT).legend;
    expect(legend.some((line) => line.startsWith('Sinais na causa'))).toBe(false);
    expect(pinsFor(record, problemSlot, base, ctxOf(), PROBLEM_LAYOUT).legend.some((line) => line.startsWith('Sinais na causa: 2 eventos (SLOWDOWN, ERROR); o primeiro começou às 22:44 UTC, 13 min'))).toBe(true);
  });

  it('states a count read from a full top list as a floor ("pelo menos")', () => {
    const failed = labSlotOf('failed-requests');
    const pack = lab().bundle[failed.id] as EvidencePack;
    expect(pack.failed?.rows).toHaveLength(8);
    const full = pinsFor(labPrint(failed), failed, pack, ctxOf(), LAYOUTS['tracing.failedList']).legend;
    expect(full.some((line) => line.includes('8 (pelo menos) endpoints com falha'))).toBe(true);
    const short = { ...pack, failed: { ...(pack.failed as NonNullable<EvidencePack['failed']>), rows: (pack.failed?.rows ?? []).slice(0, 3) } };
    expect(pinsFor(labPrint(failed), failed, short, ctxOf(), LAYOUTS['tracing.failedList']).legend.some((line) => line.includes('— 3 endpoints com falha'))).toBe(true);
  });

  it('redacts tenant text in the screen titles and the gap lines for the Customer profile', () => {
    const host = LAB.hostRootName;
    const slot = { ...labSlotOf('failing-service'), titleText: { key: 'prt.title.failing' as const, params: { name: host } } };
    const page = methodologyFor([], [labPrint(slot)], [{ key: 'prt.meth.gap.logs', params: { cluster: host } }], ctxOf('pt-BR', 'customer'));
    expect(JSON.stringify(page)).not.toContain('cloudapp');
    expect(page.prints[0]?.[0]).toContain('‹host›');
    expect(page.gaps[0]).toContain('‹host›');
    const se = methodologyFor([], [labPrint(slot)], [], ctxOf('pt-BR', 'se'));
    expect(se.prints[0]?.[0]).toContain('ag-env-public-br');
  });
});
