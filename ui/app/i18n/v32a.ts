import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2 — strings, group B: the assumptions registry (`config/assumptions.ts`).
 *
 * Every entry of the registry needs `assumption.<id>` (what the number decides) and
 * `assumption.<id>.basis` (where it comes from); `tests/assumptions.test.ts` enforces both, in
 * both locales.
 */

export const v32aStrings = {
  // --------------------------------------------------------------- the panel
  // Said once, above the list and above the experience group, instead of on every row.
  'assumption.note.convention': {
    en: 'A review line chosen for this app, not a Dynatrace threshold or an agreed objective. A customer’s own target replaces it.',
    'pt-BR': 'Uma linha de revisão escolhida para este app, não um limiar da Dynatrace nem um objetivo acordado. A meta do próprio cliente a substitui.',
  },
  'assumption.note.vitals': {
    en: 'The Core Web Vitals line published by Google (web.dev), judged at the 75th percentile.',
    'pt-BR': 'A linha dos Core Web Vitals publicada pelo Google (web.dev), avaliada no percentil 75.',
  },
  'help.assumptions': { en: 'Assumptions', 'pt-BR': 'Premissas' },
  'help.assumptions.title': { en: 'Assumptions behind the verdicts', 'pt-BR': 'Premissas por trás dos veredictos' },
  'assumption.intro': {
    en: 'A figure is either read from the tenant or it applies a rule someone had to choose. These are the rules, with the number and where it comes from, so a verdict can be challenged. Change the rule and the verdict changes with it; none of them changes what was measured.',
    'pt-BR': 'Um número ou é lido da tenant ou aplica uma regra que alguém precisou escolher. Estas são as regras, com o número e a origem de cada uma, para que um veredito possa ser questionado. Mudar a regra muda o veredito; nenhuma delas muda o que foi medido.',
  },
  'assumption.col.rule': { en: 'What it decides', 'pt-BR': 'O que decide' },
  'assumption.col.value': { en: 'Value', 'pt-BR': 'Valor' },
  'assumption.col.origin': { en: 'Origin', 'pt-BR': 'Origem' },
  'assumption.col.basis': { en: 'Basis', 'pt-BR': 'Base' },
  'assumption.asOf': { en: 'Confirmed {date}', 'pt-BR': 'Confirmada em {date}' },
  'assumption.origin.platform': { en: 'Platform fact', 'pt-BR': 'Fato da plataforma' },
  'assumption.origin.industry': { en: 'Industry convention', 'pt-BR': 'Convenção do setor' },
  'assumption.origin.convention': { en: 'App convention', 'pt-BR': 'Convenção do app' },

  'assumption.group.capacity': { en: 'Capacity', 'pt-BR': 'Capacidade' },
  'assumption.group.problems': { en: 'Problems and resolution', 'pt-BR': 'Problemas e resolução' },
  'assumption.group.findings': { en: 'Findings and suggestions', 'pt-BR': 'Achados e sugestões' },
  'assumption.group.services': { en: 'Services and workloads', 'pt-BR': 'Serviços e cargas' },
  'assumption.group.experience': { en: 'Digital experience', 'pt-BR': 'Experiência digital' },
  'assumption.group.licensing': { en: 'Licence sizing', 'pt-BR': 'Dimensionamento de licenças' },
  'assumption.group.windows': { en: 'Time windows and lists', 'pt-BR': 'Janelas de tempo e listas' },

  // ---------------------------------------------------------------- capacity
  'assumption.capacity.saturated': { en: 'Saturated host: peak at or above', 'pt-BR': 'Host saturado: pico a partir de' },
  'assumption.capacity.saturated.basis': {
    en: 'The highest peak across CPU, memory and disk in the window. It also colours the estate memory utilisation in the report.',
    'pt-BR': 'O maior pico entre CPU, memória e disco na janela. Também colore a utilização de memória do ambiente no relatório.',
  },
  'assumption.capacity.pressured': { en: 'Host under pressure: peak at or above', 'pt-BR': 'Host sob pressão: pico a partir de' },
  'assumption.capacity.pressured.basis': {
    en: 'Worth watching, not yet a fault.',
    'pt-BR': 'Vale acompanhar, ainda não é uma falha.',
  },
  'assumption.capacity.oversized': { en: 'Oversized host: peak below, on every dimension', 'pt-BR': 'Host superdimensionado: pico abaixo disso em todas as dimensões' },
  'assumption.capacity.oversized.basis': {
    en: 'Never got busy on CPU or memory: sized for a load it does not see.',
    'pt-BR': 'Nunca ficou ocupado em CPU nem memória: dimensionado para uma carga que não vê.',
  },

  // ---------------------------------------------------------------- problems
  'assumption.problems.mttr.good': { en: 'Resolution time rated good: up to', 'pt-BR': 'Tempo de resolução considerado bom: até' },
  'assumption.problems.mttr.good.basis': {
    en: 'Mean time to resolve, as Dynatrace reports it. The executive verdict and the report use the same line.',
    'pt-BR': 'Tempo médio de resolução, como a Dynatrace informa. O veredito executivo e o relatório usam a mesma linha.',
  },
  'assumption.problems.mttr.attention': { en: 'Resolution time that needs attention: up to', 'pt-BR': 'Tempo de resolução que pede atenção: até' },
  'assumption.problems.mttr.attention.basis': {
    en: 'Above this the resolution time is rated poor.',
    'pt-BR': 'Acima disso o tempo de resolução é considerado ruim.',
  },
  'assumption.problems.open.good': { en: 'Open problems rated good: up to', 'pt-BR': 'Problemas abertos considerados bons: até' },
  'assumption.problems.open.good.basis': {
    en: 'Problems still open when the data was read. Sized for a mid-size estate: a very large one sits higher without being unhealthy.',
    'pt-BR': 'Problemas ainda abertos quando o dado foi lido. Dimensionado para um ambiente médio: um ambiente muito grande fica acima sem estar doente.',
  },
  'assumption.problems.open.attention': { en: 'Open problems that need attention: up to', 'pt-BR': 'Problemas abertos que pedem atenção: até' },
  'assumption.problems.open.attention.basis': {
    en: 'Above this the open count is rated poor and the alerting-tuning suggestion appears.',
    'pt-BR': 'Acima disso a contagem de abertos é considerada ruim e a sugestão de ajuste de alertas aparece.',
  },
  'assumption.problems.closed.good': { en: 'Problems closed rated good: from', 'pt-BR': 'Problemas encerrados considerados bons: a partir de' },
  'assumption.problems.closed.good.basis': {
    en: 'Closed means no longer open (all problems minus those still open). It does not say whether Dynatrace Intelligence or a person closed them.',
    'pt-BR': 'Encerrado significa que não está mais aberto (todos os problemas menos os ainda abertos). Não diz se foi a Dynatrace Intelligence ou uma pessoa que encerrou.',
  },
  'assumption.problems.closed.attention': { en: 'Problems closed that need attention: from', 'pt-BR': 'Problemas encerrados que pedem atenção: a partir de' },
  'assumption.problems.closed.attention.basis': {
    en: 'Below this the share closed is rated poor.',
    'pt-BR': 'Abaixo disso a parcela encerrada é considerada ruim.',
  },
  'assumption.problems.recurring.pattern': { en: 'Recurring pattern: repeats at least', 'pt-BR': 'Padrão recorrente: se repete ao menos' },
  'assumption.problems.recurring.pattern.basis': {
    en: 'How many times a problem name must appear in the window to count as recurring. It is written into the DQL, so the count is exact.',
    'pt-BR': 'Quantas vezes um nome de problema precisa aparecer na janela para contar como recorrente. Está escrito na DQL, então a contagem é exata.',
  },
  'assumption.problems.recurring.candidate': { en: 'Automation candidate: repeats at least', 'pt-BR': 'Candidato a automação: se repete ao menos' },
  'assumption.problems.recurring.candidate.basis': {
    en: 'Repeating often enough to be worth a workflow. Every "automation candidates" figure uses this one number.',
    'pt-BR': 'Se repete o bastante para valer um workflow. Todo número de "candidatos a automação" usa este mesmo valor.',
  },
  'assumption.problems.stale': { en: 'Open problem worth triaging: open longer than', 'pt-BR': 'Problema aberto que vale triar: aberto há mais de' },
  'assumption.problems.stale.basis': {
    en: 'One week. It triggers the triage suggestion, not a verdict.',
    'pt-BR': 'Uma semana. Aciona a sugestão de triagem, não um veredito.',
  },
  'assumption.problems.trend.min': { en: 'Fewer problems arriving: a drop of at least', 'pt-BR': 'Menos problemas chegando: queda de pelo menos' },
  'assumption.problems.trend.min.basis': {
    en: 'A smaller change is not called an improvement.',
    'pt-BR': 'Uma variação menor não é chamada de melhora.',
  },

  // ---------------------------------------------------------------- findings
  'assumption.findings.pattern.min': { en: 'Pattern worth automating: occurrences from', 'pt-BR': 'Padrão que vale automatizar: ocorrências a partir de' },
  'assumption.findings.pattern.min.basis': { en: 'Raises the automation suggestion.', 'pt-BR': 'Aciona a sugestão de automação.' },
  'assumption.findings.entity.min': { en: 'Entity worth a closer look: problems from', 'pt-BR': 'Entidade que merece atenção: problemas a partir de' },
  'assumption.findings.entity.min.basis': { en: 'Raises the "most affected entity" suggestion.', 'pt-BR': 'Aciona a sugestão da "entidade mais afetada".' },
  'assumption.findings.restarts.min': { en: 'Workload worth a look: restarts from', 'pt-BR': 'Carga que merece atenção: reinícios a partir de' },
  'assumption.findings.restarts.min.basis': { en: 'Raises the restart finding.', 'pt-BR': 'Aciona o achado de reinícios.' },
  'assumption.findings.logContext.low': { en: 'Logs with service context: below this share is a finding', 'pt-BR': 'Logs com contexto de serviço: abaixo desta parcela é um achado' },
  'assumption.findings.logContext.low.basis': { en: 'Logs that cannot be tied to a service are hard to use in an investigation.', 'pt-BR': 'Logs que não se ligam a um serviço são difíceis de usar numa investigação.' },
  'assumption.findings.logContext.veryLow': { en: 'Logs with service context: below this share is a strong finding', 'pt-BR': 'Logs com contexto de serviço: abaixo desta parcela é um achado forte' },
  'assumption.findings.logContext.veryLow.basis': { en: 'Escalates the wording of the log-context finding.', 'pt-BR': 'Reforça o texto do achado de contexto de logs.' },
  'assumption.findings.unclassified.high': { en: 'Unclassified logs: above this share is a finding', 'pt-BR': 'Logs sem classificação: acima desta parcela é um achado' },
  'assumption.findings.unclassified.high.basis': { en: 'Logs with no severity cannot be filtered by it.', 'pt-BR': 'Logs sem severidade não podem ser filtrados por ela.' },
  'assumption.findings.tableShare.min': { en: 'Largest table: a share from this is highlighted', 'pt-BR': 'Maior tabela: uma parcela a partir deste valor é destacada' },
  'assumption.findings.tableShare.min.basis': { en: 'Decides when one table’s share of ingested volume is called out.', 'pt-BR': 'Decide quando a parcela de uma tabela no volume ingerido é destacada.' },

  // ---------------------------------------------------------------- services
  'assumption.services.failure.good': { en: 'Service failure rate rated good: up to', 'pt-BR': 'Taxa de falha de serviço considerada boa: até' },
  'assumption.services.failure.good.basis': { en: 'Failed requests as a share of requests.', 'pt-BR': 'Requisições com falha como parcela das requisições.' },
  'assumption.services.failure.attention': { en: 'Service failure rate that needs attention: up to', 'pt-BR': 'Taxa de falha de serviço que pede atenção: até' },
  'assumption.services.failure.attention.basis': { en: 'Above this the failure rate is rated poor.', 'pt-BR': 'Acima disso a taxa de falha é considerada ruim.' },
  'assumption.services.latency.good': { en: 'Slowest service response rated good: up to', 'pt-BR': 'Resposta do serviço mais lento considerada boa: até' },
  'assumption.services.latency.good.basis': { en: 'Mean response time of the slowest service.', 'pt-BR': 'Tempo médio de resposta do serviço mais lento.' },
  'assumption.services.latency.attention': { en: 'Slowest service response that needs attention: up to', 'pt-BR': 'Resposta do serviço mais lento que pede atenção: até' },
  'assumption.services.latency.attention.basis': { en: 'Above this the response time is rated poor.', 'pt-BR': 'Acima disso o tempo de resposta é considerado ruim.' },
  'assumption.services.consumer.good': { en: 'Consumer average time rated good: up to', 'pt-BR': 'Tempo médio do consumidor considerado bom: até' },
  'assumption.services.consumer.good.basis': { en: 'Mean processing time of message consumers.', 'pt-BR': 'Tempo médio de processamento dos consumidores de mensagens.' },
  'assumption.services.consumer.attention': { en: 'Consumer average time that needs attention: up to', 'pt-BR': 'Tempo médio do consumidor que pede atenção: até' },
  'assumption.services.consumer.attention.basis': { en: 'Above this the time is rated poor.', 'pt-BR': 'Acima disso o tempo é considerado ruim.' },
  'assumption.services.restarts.good': { en: 'Container restarts rated good: up to', 'pt-BR': 'Reinícios de contêiner considerados bons: até' },
  'assumption.services.restarts.good.basis': { en: 'Total restarts in the window.', 'pt-BR': 'Total de reinícios na janela.' },
  'assumption.services.restarts.attention': { en: 'Container restarts that need attention: up to', 'pt-BR': 'Reinícios de contêiner que pedem atenção: até' },
  'assumption.services.restarts.attention.basis': { en: 'Above this the restart count is rated poor.', 'pt-BR': 'Acima disso a contagem de reinícios é considerada ruim.' },

  // -------------------------------------------------------------- experience
  'assumption.experience.error.good': { en: 'User-facing error rate rated good: up to', 'pt-BR': 'Taxa de erro percebida pelo usuário considerada boa: até' },
  'assumption.experience.error.good.basis': { en: 'Error share of user actions across the applications.', 'pt-BR': 'Parcela de erros nas ações de usuário entre as aplicações.' },
  'assumption.experience.error.attention': { en: 'User-facing error rate that needs attention: up to', 'pt-BR': 'Taxa de erro percebida pelo usuário que pede atenção: até' },
  'assumption.experience.error.attention.basis': { en: 'Above this the error rate is rated poor.', 'pt-BR': 'Acima disso a taxa de erro é considerada ruim.' },
  'assumption.experience.lcp.good': { en: 'Largest Contentful Paint: good below', 'pt-BR': 'Largest Contentful Paint: bom abaixo de' },
  'assumption.experience.lcp.good.basis': { en: 'Time until the largest piece of content is drawn.', 'pt-BR': 'Tempo até o maior conteúdo ser desenhado.' },
  'assumption.experience.lcp.poor': { en: 'Largest Contentful Paint: poor from', 'pt-BR': 'Largest Contentful Paint: ruim a partir de' },
  'assumption.experience.lcp.poor.basis': { en: 'Time until the largest piece of content is drawn.', 'pt-BR': 'Tempo até o maior conteúdo ser desenhado.' },
  'assumption.experience.inp.good': { en: 'Interaction to Next Paint: good below', 'pt-BR': 'Interaction to Next Paint: bom abaixo de' },
  'assumption.experience.inp.good.basis': { en: 'How long the page takes to respond to a click or key press.', 'pt-BR': 'Quanto a página demora a responder a um clique ou tecla.' },
  'assumption.experience.inp.poor': { en: 'Interaction to Next Paint: poor from', 'pt-BR': 'Interaction to Next Paint: ruim a partir de' },
  'assumption.experience.inp.poor.basis': { en: 'How long the page takes to respond to a click or key press.', 'pt-BR': 'Quanto a página demora a responder a um clique ou tecla.' },
  'assumption.experience.cls.good': { en: 'Cumulative Layout Shift: good below', 'pt-BR': 'Cumulative Layout Shift: bom abaixo de' },
  'assumption.experience.cls.good.basis': {
    en: 'How much the layout jumps while loading. Written in the unit the tenant’s field reports: the published 0.1, scaled for it.',
    'pt-BR': 'Quanto o layout pula durante o carregamento. Escrito na unidade que o campo da tenant informa: o 0,1 publicado, na escala dele.',
  },
  'assumption.experience.cls.poor': { en: 'Cumulative Layout Shift: poor from', 'pt-BR': 'Cumulative Layout Shift: ruim a partir de' },
  'assumption.experience.cls.poor.basis': {
    en: 'How much the layout jumps while loading. Written in the unit the tenant’s field reports: the published 0.25, scaled for it.',
    'pt-BR': 'Quanto o layout pula durante o carregamento. Escrito na unidade que o campo da tenant informa: o 0,25 publicado, na escala dele.',
  },
  'assumption.experience.ttfb.good': { en: 'Time to First Byte: good below', 'pt-BR': 'Time to First Byte: bom abaixo de' },
  'assumption.experience.ttfb.good.basis': { en: 'Time until the first byte of the response arrives.', 'pt-BR': 'Tempo até chegar o primeiro byte da resposta.' },
  'assumption.experience.ttfb.poor': { en: 'Time to First Byte: poor from', 'pt-BR': 'Time to First Byte: ruim a partir de' },
  'assumption.experience.ttfb.poor.basis': { en: 'Time until the first byte of the response arrives.', 'pt-BR': 'Tempo até chegar o primeiro byte da resposta.' },

  // --------------------------------------------------------------- licensing
  'assumption.licensing.gibPerHostUnit': { en: 'Memory covered by one Host Unit', 'pt-BR': 'Memória coberta por uma Host Unit' },
  'assumption.licensing.gibPerHostUnit.basis': {
    en: 'How the platform sizes Full-Stack hosts: a host with more memory counts as more than one unit.',
    'pt-BR': 'Como a plataforma dimensiona hosts Full-Stack: um host com mais memória conta como mais de uma unidade.',
  },
  'assumption.licensing.hoursPerYear': { en: 'Hours in a year, for annual consumption', 'pt-BR': 'Horas em um ano, para o consumo anual' },
  'assumption.licensing.hoursPerYear.basis': { en: '365 days of 24 hours.', 'pt-BR': '365 dias de 24 horas.' },

  // ----------------------------------------------------------------- windows
  'assumption.windows.maxReportDays': { en: 'Widest window the app reports over', 'pt-BR': 'Maior janela sobre a qual o app reporta' },
  'assumption.windows.maxReportDays.basis': {
    en: 'A longer window is refused, to keep each read of Grail bounded and its cost predictable.',
    'pt-BR': 'Uma janela maior é recusada, para manter cada leitura do Grail limitada e o custo previsível.',
  },
  'assumption.windows.problemsDays': { en: 'Window of the problem and root-cause analysis', 'pt-BR': 'Janela da análise de problemas e causa raiz' },
  'assumption.windows.problemsDays.basis': {
    en: 'Fixed on the root-cause page, whatever the global window.',
    'pt-BR': 'Fixa na página de causa raiz, seja qual for a janela global.',
  },
  'assumption.windows.trendDays': { en: 'Days drawn in the small trend lines', 'pt-BR': 'Dias desenhados nas linhas de tendência pequenas' },
  'assumption.windows.trendDays.basis': {
    en: 'The last days of a daily series, enough to show direction.',
    'pt-BR': 'Os últimos dias de uma série diária, o bastante para mostrar a direção.',
  },
  'assumption.windows.incidentSignatures': { en: 'Log signatures listed per incident', 'pt-BR': 'Assinaturas de log listadas por incidente' },
  'assumption.windows.incidentSignatures.basis': {
    en: 'The most frequent ones; the total is counted separately, so it is exact.',
    'pt-BR': 'As mais frequentes; o total é contado à parte, então é exato.',
  },
} as const satisfies Record<string, Entry>;
