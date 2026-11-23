import { type Entry } from './locales';

/**
 * PoC Value Studio 3.1 — page strings, group B.
 *
 * One file per migration group so parallel work never edits the same file. Merged
 * into the single dictionary in `strings.ts`; both locales are required.
 */
export const v31BStrings = {
  'p.rca.kpi.avgCalc': {
    en: 'Mean number of entities affected per problem in the window.',
    'pt-BR': 'Número médio de entidades afetadas por problema na janela.',
  },
  'ai.unit.percent': { en: '%', 'pt-BR': '%' },
  'ai.lens.impact.calc': {
    en: 'Sum of the problems with status ACTIVE in the window.',
    'pt-BR': 'Soma dos problemas com status ACTIVE na janela.',
  },
  'ai.lens.risk.calc': {
    en: 'Count of distinct recurring problem patterns Dynatrace Intelligence reported.',
    'pt-BR': 'Contagem de padrões distintos de problemas recorrentes reportados pela Dynatrace Intelligence.',
  },
  'ai.lens.savings.calc': {
    en: 'Count of recurring patterns with at least 5 occurrences — automation candidates by this app’s rule. It is a count of candidates, not a saving.',
    'pt-BR': 'Contagem de padrões recorrentes com pelo menos 5 ocorrências — candidatos à automação pela regra deste app. É uma contagem de candidatos, não uma economia.',
  },
  'ai.lens.reliability.calc': {
    en: 'Problems no longer active ÷ all problems in the window.',
    'pt-BR': 'Problemas que não estão mais ativos ÷ todos os problemas na janela.',
  },
  'ai.lens.performance.calc': {
    en: 'Problems whose category contains SLOW, RESOURCE or PERF.',
    'pt-BR': 'Problemas cuja categoria contém SLOW, RESOURCE ou PERF.',
  },
  'ai.lens.security.calc': {
    en: 'Open, non-muted runtime vulnerabilities the query returned (at most 500).',
    'pt-BR': 'Vulnerabilidades de runtime abertas e não silenciadas retornadas pela consulta (no máximo 500).',
  },
  'p.sec.empty.title': {
    en: 'No open vulnerabilities were returned',
    'pt-BR': 'Nenhuma vulnerabilidade aberta foi retornada',
  },
  'p.sec.empty.body': {
    en: 'The source answered, and it held no open, non-muted runtime vulnerability in this window. That is not the same as “scope not granted”, and it is not proof of a clean estate: Runtime Vulnerability Analytics may not be enabled on these hosts.',
    'pt-BR': 'A fonte respondeu e não havia vulnerabilidade de runtime aberta e não silenciada nesta janela. Isso não é o mesmo que “escopo não concedido” e não prova um ambiente limpo: o Runtime Vulnerability Analytics pode não estar habilitado nestes hosts.',
  },
  'p.sec.cap.title': {
    en: 'The exact totals could not be read',
    'pt-BR': 'Os totais exatos não puderam ser lidos',
  },
  'p.sec.cap.body': {
    en: 'The aggregate that counts every open vulnerability did not answer, and the list of highest-risk vulnerabilities stops at {cap}. The total is therefore a floor ({cap}+) and every share below is a share of those {cap}. Refresh to read the exact total.',
    'pt-BR': 'O agregado que conta todas as vulnerabilidades abertas não respondeu, e a lista das vulnerabilidades de maior risco para em {cap}. O total é, portanto, um piso ({cap}+) e cada percentual abaixo é uma fatia dessas {cap}. Atualize para ler o total exato.',
  },
  'p.biz.topOf': {
    en: 'The table lists the {shown} most frequent types.',
    'pt-BR': 'A tabela lista os {shown} tipos mais frequentes.',
  },
  'p.infra.cap.showing': {
    en: 'Showing the {shown} largest hosts by memory of {total}. Every count above covers all {total}.',
    'pt-BR': 'Mostrando os {shown} maiores hosts por memória entre {total}. Cada contagem acima cobre todos os {total}.',
  },
  'p.sec.top.showing': {
    en: 'Showing the {shown} highest-risk of {total} open vulnerabilities. The totals and shares above count all {total}.',
    'pt-BR': 'Mostrando as {shown} de maior risco entre {total} vulnerabilidades abertas. Os totais e percentuais acima contam todas as {total}.',
  },
  'p.sec.rem.listTitle': {
    en: '{count} {count|vulnerability meets|vulnerabilities meet} all three conditions',
    'pt-BR': '{count} {count|vulnerabilidade atende|vulnerabilidades atendem} às três condições',
  },
  'p.sec.rem.listBody': {
    en: 'The count is exact, but the list that names them has not loaded. Refresh to see which ones they are.',
    'pt-BR': 'A contagem é exata, mas a lista que as nomeia ainda não carregou. Atualize para ver quais são.',
  },
  'p.sec.rem.showing': {
    en: 'Showing the {shown} highest-scoring of {total} that meet all three conditions.',
    'pt-BR': 'Mostrando as {shown} de maior score entre {total} que atendem às três condições.',
  },
  'p.sec.scanLimit.title': {
    en: 'Partial result: the scan limit was reached',
    'pt-BR': 'Resultado parcial: o limite de varredura foi atingido',
  },
  'p.sec.scanLimit.body': {
    en: 'The query stopped at its scan limit, so the findings below are real but incomplete.',
    'pt-BR': 'A consulta parou no limite de varredura, então as descobertas abaixo são reais, mas incompletas.',
  },
  'p.rca.logs.noPermission': {
    en: 'This incident’s logs could not be read: the signed-in identity lacks the logs scope (storage:logs:read). That is a gap in this review, not an absence of errors.',
    'pt-BR': 'Os logs deste incidente não puderam ser lidos: a identidade autenticada não tem o escopo de logs (storage:logs:read). Isso é uma lacuna desta análise, não ausência de erros.',
  },
  'p.rca.logs.failed': {
    en: 'The query for this incident’s logs failed, so its logs are unknown — not absent. Refresh to try again.',
    'pt-BR': 'A consulta dos logs deste incidente falhou, então os logs são desconhecidos — não inexistentes. Atualize para tentar de novo.',
  },
  // ----------------------------------------------------- Problems & RCA
  'p.rca.trail.aria': {
    en: 'Root-cause trail: root cause, affected entities and Kubernetes context',
    'pt-BR': 'Trilha de causa raiz: causa raiz, entidades afetadas e contexto Kubernetes',
  },
  'p.rca.logs.aria': {
    en: 'Most frequent log signatures of this incident',
    'pt-BR': 'Assinaturas de log mais frequentes deste incidente',
  },
  'p.rca.mix.aria': {
    en: 'Problem mix by category: {items}',
    'pt-BR': 'Mix de problemas por categoria: {items}',
  },
  'p.rca.others.rc': {
    en: 'Root cause: {name}',
    'pt-BR': 'Causa raiz: {name}',
  },

  // ------------------------------------------------------------- Security
  'p.sec.v2.stackOrder': {
    en: 'Segments run from the most to the least severe, left to right. The counts below are the same figures.',
    'pt-BR':
      'Os segmentos vão do mais grave ao menos grave, da esquerda para a direita. As contagens abaixo são os mesmos números.',
  },
} as const satisfies Record<string, Entry>;
