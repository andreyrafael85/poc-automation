import type { StringKey } from '../../i18n/strings';
import type { CoverageIndex } from './coverageIndex';
import type { AssessmentFinding, AssessmentSignals } from './findings';

/**
 * The conversation guide by audience (3.4.9, proposal §C8 F-08: "roteiro por persona — CIO, SRE, desenvolvimento,
 * segurança: perguntas e achados por público; prepara a reunião certa para cada interlocutor").
 *
 * The same reading, told to four audiences. For each one: what it cares about, the measured figures that open the
 * conversation (only figures the Assessment already holds — never a new or estimated one), three opening
 * questions, the findings that concern it with the question to ask (`asm.q.<rule>`), and the Dynatrace
 * capabilities to show. Critical findings reach the leadership as well, whatever their area. SE and partner
 * material: never shown to a customer viewer nor in executive mode, and printed only when the SE asks for it.
 */

export type Persona = 'executive' | 'sre' | 'dev' | 'security';
export const PERSONAS: readonly Persona[] = ['executive', 'sre', 'dev', 'security'];

export const PERSONA_KEY: Record<Persona, StringKey> = {
  executive: 'asm.persona.executive',
  sre: 'asm.persona.sre',
  dev: 'asm.persona.dev',
  security: 'asm.persona.security',
};

/** The rules each audience owns (a rule may concern several). */
const PERSONA_RULES: Record<Persona, ReadonlySet<string>> = {
  executive: new Set(['ASM-05', 'ASM-15', 'ASM-22', 'ASM-24', 'ASM-28', 'ASM-29', 'ASM-30', 'STR-01', 'STR-03', 'STR-05']),
  sre: new Set([
    'ASM-01',
    'ASM-02',
    'ASM-07',
    'ASM-10',
    'ASM-11',
    'ASM-12',
    'ASM-13',
    'ASM-14',
    'ASM-16',
    'ASM-18',
    'ASM-19',
    'ASM-23',
    'ASM-25',
    'ASM-27',
    'ASM-30',
    'STR-01',
    'STR-02',
    'STR-03',
    'STR-05',
  ]),
  dev: new Set(['ASM-03', 'ASM-04', 'ASM-05', 'ASM-07', 'ASM-10', 'ASM-11', 'ASM-13', 'ASM-15', 'ASM-24', 'ASM-29', 'STR-02']),
  security: new Set(['ASM-20', 'ASM-21', 'ASM-26', 'ASM-27', 'STR-04']),
};

/** The capabilities each audience should see on the platform (their labels and documentation pages exist). */
export const PERSONA_SHOW: Record<Persona, readonly StringKey[]> = {
  executive: ['asm.cap.business', 'asm.cap.rum', 'asm.cap.platform', 'asm.cap.davis'],
  sre: ['asm.cap.davis', 'asm.cap.workflows', 'asm.cap.kubernetes', 'asm.cap.slo', 'asm.cap.synthetic'],
  dev: ['asm.cap.tracing', 'asm.cap.logs', 'asm.cap.rum', 'asm.cap.serviceDetection'],
  security: ['asm.cap.security', 'asm.cap.grail', 'asm.cap.tagging'],
};

export function findingsForPersona(persona: Persona, findings: readonly AssessmentFinding[]): AssessmentFinding[] {
  const rules = PERSONA_RULES[persona];
  return findings.filter((finding) => rules.has(finding.rule) || (persona === 'executive' && finding.cls === 'critical'));
}

export const personasOf = (rule: string): Persona[] => PERSONAS.filter((persona) => PERSONA_RULES[persona].has(rule));

/** A figure that opens the conversation: a label key and its value, already formatted by the caller's helpers. */
export interface OpeningFigure {
  key: StringKey;
  params: Record<string, string>;
}

/**
 * The figures that open each conversation, from what the Assessment already read. A figure whose read did not
 * answer is left out — the guide never says "0" for something not read.
 */
export function openingFigures(
  persona: Persona,
  input: { signals: AssessmentSignals; index: CoverageIndex; valueEvents: number | null; findings: readonly AssessmentFinding[] },
  formatNumber: (value: number) => string,
): OpeningFigure[] {
  const { signals, index, valueEvents, findings } = input;
  const out: OpeningFigure[] = [];
  const critical = findings.filter((finding) => finding.cls === 'critical').length;
  if (persona === 'executive') {
    if (index.value !== null) out.push({ key: 'asm.persona.fig.index', params: { value: formatNumber(index.value) } });
    // 3.7.9: the value events the PoC demonstrated (the Value cycle), never a maturity step.
    if (valueEvents !== null) out.push({ key: 'asm.persona.fig.valueEvents', params: { count: formatNumber(valueEvents) } });
    out.push({ key: 'asm.persona.fig.critical', params: { count: formatNumber(critical) } });
    if (signals.thirdPartyTools !== null && signals.thirdPartyTools.length > 0) {
      out.push({ key: 'asm.persona.fig.tools', params: { count: formatNumber(signals.thirdPartyTools.length) } });
    }
  }
  if (persona === 'sre') {
    if (signals.resolved !== null && signals.resolved.problems > 0) {
      out.push({ key: 'asm.persona.fig.mttr', params: { problems: formatNumber(signals.resolved.problems), hours: formatNumber(Math.round(signals.resolved.meanHours * 10) / 10) } });
    }
    if (signals.workflows !== null) {
      out.push({ key: 'asm.persona.fig.workflows', params: { workflows: formatNumber(signals.workflows.workflows), runs: formatNumber(signals.workflows.executions) } });
    }
    if (signals.clusters !== null && signals.clustersWithMetrics !== null && signals.clusters > 0) {
      out.push({ key: 'asm.persona.fig.clusters', params: { reporting: formatNumber(signals.clustersWithMetrics), total: formatNumber(signals.clusters) } });
    }
  }
  if (persona === 'dev') {
    if (signals.servicesWithTraffic !== null) out.push({ key: 'asm.persona.fig.services', params: { count: formatNumber(signals.servicesWithTraffic) } });
    if (signals.servicesAboveOnePct !== null) out.push({ key: 'asm.persona.fig.failing', params: { count: formatNumber(signals.servicesAboveOnePct) } });
    if (signals.logRecords !== null && signals.logRecordsWithContext !== null && signals.logRecords > 0) {
      out.push({ key: 'asm.persona.fig.logContext', params: { pct: formatNumber(Math.round((signals.logRecordsWithContext / signals.logRecords) * 1000) / 10) } });
    }
  }
  if (persona === 'security' && signals.vulnerabilities !== null) {
    out.push({
      key: 'asm.persona.fig.vulns',
      params: { total: formatNumber(signals.vulnerabilities.total), actNow: formatNumber(signals.vulnerabilities.actNow), critical: formatNumber(signals.vulnerabilities.critical) },
    });
  }
  return out;
}
