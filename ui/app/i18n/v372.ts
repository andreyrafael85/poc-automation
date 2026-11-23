import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.2 (the owner: "Seguir com a 3.7.2, porém valide estes pontos antes"): the dashboards laid
 * out after his own resize, the overview's SLO tiles fixed, Logs without empty columns and with more of his log-analytics
 * example, the notebook on the golden signals with its charts kept, the launchpad as lists, the e-mail with when it began.
 * Merged in `strings.ts`.
 */

export const v372Strings = {
  // ------------------------------------------------------------------ the Logs dashboard
  'dash2.tile.logErrorPct': { en: '🚨 Records at ERROR (%, 1:100 sample)', 'pt-BR': '🚨 Registros em ERROR (%, amostra 1:100)' },
  'dash2.tile.logWarnPct': { en: '⚠️ Records at WARN (%, 1:100 sample)', 'pt-BR': '⚠️ Registros em WARN (%, amostra 1:100)' },
  'dash2.tile.logNoLevelPct': { en: '❔ Records without a level (%, 1:100 sample)', 'pt-BR': '❔ Registros sem nível (%, amostra 1:100)' },
  'dash2.tile.logLevels': { en: '🍩 Records by level (1:100 sample)', 'pt-BR': '🍩 Registros por nível (amostra 1:100)' },
  'dash2.tile.logTopMessages': { en: '📋 The most frequent messages, with level and origin (1:100 sample)', 'pt-BR': '📋 As mensagens mais frequentes, com nível e origem (amostra 1:100)' },

  // ------------------------------------------------------------------ the notebook (the golden signals)
  'dash2.tile.nb.problemList': { en: '🚨 The most recent problems', 'pt-BR': '🚨 Os problemas mais recentes' },
  'dash2.tile.nb.restarts': { en: '🔄 Workloads by restarts', 'pt-BR': '🔄 Workloads por reinícios' },
  'builder.nb.status.title': { en: '{n}. Status', 'pt-BR': '{n}. Status' },
  'builder.nb.status.why': {
    en: 'Where to look first: each service by its active problem, the problems open now and the share of requests that succeed.',
    'pt-BR': 'Por onde olhar primeiro: cada serviço pelo seu problema ativo, os problemas abertos agora e a parcela das requisições que dão certo.',
  },
  'builder.nb.traffic.title': { en: '{n}. Traffic', 'pt-BR': '{n}. Tráfego' },
  'builder.nb.traffic.why': { en: 'How much each of the busiest services receives over time.', 'pt-BR': 'Quanto cada um dos serviços mais usados recebe ao longo do tempo.' },
  'builder.nb.latency.title': { en: '{n}. Latency', 'pt-BR': '{n}. Latência' },
  'builder.nb.latency.why': { en: 'The median and the 90th percentile, then the response time over time.', 'pt-BR': 'A mediana e o percentil 90, depois o tempo de resposta ao longo do tempo.' },
  'builder.nb.failures.title': { en: '{n}. Errors', 'pt-BR': '{n}. Erros' },
  'builder.nb.failures.why': { en: 'The failure rate of the services that fail most, and every busy service with its failures.', 'pt-BR': 'A taxa de falha dos serviços que mais falham, e cada serviço movimentado com as suas falhas.' },
  'builder.nb.saturation.title': { en: '{n}. Saturation', 'pt-BR': '{n}. Saturação' },
  'builder.nb.saturation.why': { en: 'The hosts and processes closest to their ceiling: CPU and memory.', 'pt-BR': 'Os hosts e processos mais perto do limite: CPU e memória.' },
  'builder.nb.problems.title': { en: '{n}. Problems', 'pt-BR': '{n}. Problemas' },
  'builder.nb.problems.why': { en: 'What Dynatrace Intelligence opened, which kinds dominate and what keeps coming back.', 'pt-BR': 'O que a Dynatrace Intelligence abriu, quais tipos dominam e o que volta a acontecer.' },
  'builder.nb.logs.title': { en: '{n}. Logs', 'pt-BR': '{n}. Logs' },
  'builder.nb.logs.why': { en: 'The error patterns with their origin, and how much of the logs carries context.', 'pt-BR': 'Os padrões de erro com a sua origem, e quanto dos logs carrega contexto.' },

  // ------------------------------------------------------------------ the launchpad (lists)
  'builder.launchpad.dashboardsWhat': { en: 'The dashboards this PoC created on the environment.', 'pt-BR': 'Os dashboards que esta PoC criou no ambiente.' },
  'builder.launchpad.notebooksWhat': { en: 'The investigation notebook, with its charts ready.', 'pt-BR': 'O notebook de investigação, com os gráficos prontos.' },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i114': {
    en: '3.7.2 — The PoC Builder’s documents, finished. Every dashboard follows one layout (figures first, charts and tables two to a row, three-row headers), the overview shows its SLO tiles, the Experience banners take a calmer tone and the Logs dashboard drops its empty columns and gains the share of records by level and the most frequent messages. The investigation notebook follows the golden signals — status, traffic, latency, errors, saturation — and opens with its charts drawn. The launchpad lists the dashboards and the notebook without images, and the triage e-mail says when the problem began and for how long.',
    'pt-BR': '3.7.2 — Os documentos do PoC Builder, prontos. Todo dashboard segue um só layout (números primeiro, gráficos e tabelas dois por linha, cabeçalho de três linhas), a visão geral mostra os tiles de SLO, as faixas da Experiência ganham um tom mais calmo e o dashboard de Logs perde as colunas vazias e ganha a parcela de registros por nível e as mensagens mais frequentes. O notebook de investigação segue os sinais de ouro — status, tráfego, latência, erros, saturação — e abre com os gráficos desenhados. O launchpad lista os dashboards e o notebook sem imagens, e o e-mail de triagem diz quando o problema começou e quanto durou.',
  },
} satisfies Record<string, Entry>;
