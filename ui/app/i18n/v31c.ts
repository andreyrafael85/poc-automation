import { type Entry } from './locales';

/**
 * PoC Value Studio 3.1 — page strings, group C.
 *
 * One file per migration group so parallel work never edits the same file. Merged
 * into the single dictionary in `strings.ts`; both locales are required.
 */
export const v31CStrings = {
  'p.dx2.kpi.usersEstimateNote': {
    en: 'Dynatrace reports unique users as an estimated count and gives no exact figure for them. This is that platform estimate, taken across all applications together, so a person who uses two applications counts once.',
    'pt-BR': 'A Dynatrace informa os usuários únicos como uma contagem estimada e não fornece um valor exato. Esta é essa estimativa da plataforma, tomada em todas as aplicações juntas, de modo que uma pessoa que usa duas aplicações conta uma vez.',
  },
  // ------------------------------------------------------------- cloud: FinOps phases
  // The step number is drawn by a `pvs-step` badge, so these are the bare phase names
  // (the older `p.cloud.finops.inform|optimize|operate` keys carry "1 ·" in the text).
  'p.cloud.finops.phase.inform': { en: 'Inform', 'pt-BR': 'Informar' },
  'p.cloud.finops.phase.optimize': { en: 'Optimize', 'pt-BR': 'Otimizar' },
  'p.cloud.finops.phase.operate': { en: 'Operate', 'pt-BR': 'Operar' },

  // ------------------------------------------------------------- roadmap: horizons
  // "H1" reads the same in both languages (horizon / horizonte).
  'roadmap.horizonBadge': { en: 'H{n}', 'pt-BR': 'H{n}' },
  'roadmap.itemCount': { en: '{count} items', 'pt-BR': '{count} itens' },
  // Replaces `p.roadmap.howToReadBody1`, whose first sentence ("Colour marks the
  // horizon") is no longer true: a horizon is a time window and is drawn neutral.
  'roadmap.howToRead.horizon': {
    en: 'The horizon is a time window, not a severity. Items in the first horizon either block the assessment itself or are cheap enough to commit to immediately; the second needs building; the third needs sustained effort.',
    'pt-BR':
      'O horizonte é uma janela de tempo, não uma severidade. Os itens do primeiro horizonte ou bloqueiam a própria avaliação ou são baratos o bastante para assumir de imediato; o segundo exige construção; o terceiro exige esforço sustentado.',
  },

  // ------------------------------------------------------------- roadmap: suggested owner (by role)
  'roadmap.owner.security': {
    en: 'Platform administrator, with security owner',
    'pt-BR': 'Administrador da plataforma, com o responsável por segurança',
  },
  'roadmap.owner.platform': {
    en: 'Observability platform owner',
    'pt-BR': 'Responsável pela plataforma de observabilidade',
  },
  'roadmap.owner.dataSources': {
    en: 'Observability platform owner, with data source owners',
    'pt-BR': 'Responsável pela plataforma de observabilidade, com os responsáveis pelas fontes de dados',
  },
  'roadmap.owner.sre': {
    en: 'Site reliability or operations lead',
    'pt-BR': 'Líder de site reliability ou de operações',
  },
  'roadmap.owner.workload': {
    en: 'Application or workload owner, with platform engineering',
    'pt-BR': 'Responsável pela aplicação ou pelo workload, com engenharia de plataforma',
  },
  'roadmap.owner.frontend': {
    en: 'Application owner, with front-end engineering',
    'pt-BR': 'Responsável pela aplicação, com engenharia de front-end',
  },

  // ------------------------------------------------------------- roadmap: success criterion
  'roadmap.success.security': {
    en: 'The security section renders findings instead of a permission error.',
    'pt-BR': 'A seção de segurança exibe descobertas em vez de um erro de permissão.',
  },
  'roadmap.success.coverage': {
    en: 'Every data source is either readable by the reviewer or deliberately restricted.',
    'pt-BR': 'Cada fonte de dados é legível pelo avaliador ou foi restringida de propósito.',
  },
  'roadmap.success.dataQuality': {
    en: 'The share of log records carrying service context is measurably higher than today.',
    'pt-BR': 'A parcela de registros de log com contexto de serviço é mensuravelmente maior que a de hoje.',
  },
  'roadmap.success.automationFailing': {
    en: 'No scheduled workflow reports a failing final state.',
    'pt-BR': 'Nenhum workflow agendado reporta um estado final com falha.',
  },
  'roadmap.success.automationPattern': {
    en: 'The chosen recurring pattern has a workflow with an approval gate, and its recurrence is tracked from go-live.',
    'pt-BR':
      'O padrão recorrente escolhido tem um workflow com etapa de aprovação, e sua recorrência é acompanhada desde a entrada em produção.',
  },
  'roadmap.success.consumption': {
    en: 'Scanned bytes per delivered record for the named table is measurably lower than today.',
    'pt-BR': 'Os bytes escaneados por registro entregue na tabela indicada são mensuravelmente menores que os de hoje.',
  },
  'roadmap.success.reliability': {
    en: 'The named workload or service shows a measurable reduction against its own baseline in this app.',
    'pt-BR':
      'O workload ou serviço indicado mostra uma redução mensurável em relação à sua própria linha de base neste app.',
  },
  'roadmap.success.capacity': {
    en: 'No out-of-memory kill or throttling event is recorded for the named workloads over a comparable window.',
    'pt-BR':
      'Nenhum evento de OOM kill ou de throttling é registrado para os workloads indicados em uma janela comparável.',
  },
  'roadmap.success.experience': {
    en: 'Session data is readable and arriving for at least one instrumented user journey.',
    'pt-BR': 'Os dados de sessão estão legíveis e chegando para ao menos uma jornada de usuário instrumentada.',
  },
  'roadmap.success.default': {
    en: 'The measurement behind this item has moved in the intended direction against its recorded baseline.',
    'pt-BR':
      'A medição por trás deste item se moveu na direção pretendida em relação à sua linha de base registrada.',
  },
} as const satisfies Record<string, Entry>;
