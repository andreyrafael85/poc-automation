import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.6 — strings of the v3.2.5 validation round (commercial data native to the
 * SE and partner, the Overview and pillars redesign, pillars tied to the success criteria, the
 * detailed "Value of the PoC" dashboard, the timeline fixes and adoption series, the per-app flows
 * of the Digital experience, clickable flow maps, the Value & ROI restyle and the richer deck).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 */

export const v326Strings = {
  // ------------------------------------------------------------------ catalog purposes
  'catalog.purpose.poc.daily.signals': {
    en:
      'Workflow executions (and how many succeeded) and log volume ingested on each day of the PoC, so the PoC ' +
      'Timeline shows automation and log adoption beside the problems, and dates the first automation.',
    'pt-BR':
      'Execuções de workflows (e quantas tiveram sucesso) e volume de logs ingerido em cada dia da PoC, para a PoC ' +
      'Timeline mostrar a adoção de automação e de logs ao lado dos problemas, e datar a primeira automação.',
  },
  'catalog.purpose.poc.daily.rum': {
    en: 'Real-user actions, requests and errors on each day of the PoC, so the PoC Timeline shows the digital experience beside the problems.',
    'pt-BR': 'Ações, requisições e erros de usuários reais em cada dia da PoC, para a PoC Timeline mostrar a experiência digital ao lado dos problemas.',
  },
  'catalog.purpose.rum.app.flow': {
    en:
      'Which services each web frontend calls, and what those services call next, from the entity model, so the ' +
      'Digital experience page draws the flow of its busiest applications.',
    'pt-BR':
      'Quais serviços cada frontend web chama, e o que esses serviços chamam em seguida, a partir do modelo de ' +
      'entidades, para a página de Experiência digital desenhar o fluxo das aplicações mais movimentadas.',
  },

  // ------------------------------------------------------------------ access (commercial data native to SE and partner)
  'access.internal.chip': { en: 'Internal view', 'pt-BR': 'Visão interna' },
  'access.internal.help': {
    en: 'Licensing, DPS and cost are visible to the SE and the partner, never to the customer. Switch Executive mode on before sharing your screen.',
    'pt-BR': 'Licenciamento, DPS e custos ficam visíveis para o SE e o parceiro, nunca para o cliente. Ative o Modo executivo antes de compartilhar a tela.',
  },
  'shell.executiveMode.help': {
    en: 'Presentation mode: hides the technical pages, the DQL and every commercial figure (licensing, DPS, cost).',
    'pt-BR': 'Modo de apresentação: oculta as páginas técnicas, as DQLs e todo dado comercial (licenciamento, DPS, custos).',
  },
  'restricted.body.presentation': {
    en: 'Licensing and consumption are hidden in Executive mode, the presentation mode for the customer. Leave Executive mode to open this page.',
    'pt-BR': 'Licenciamento e consumo ficam ocultos no Modo executivo, o modo de apresentação ao cliente. Saia do Modo executivo para abrir esta página.',
  },
  'restricted.leavePresentation': { en: 'Leave Executive mode', 'pt-BR': 'Sair do Modo executivo' },

  // ------------------------------------------------------------------ PoC plan: pillars and objectives in one place
  'plan.value.title': { en: 'Value pillars and objectives', 'pt-BR': 'Pilares de valor e objetivos' },
  'plan.value.body': {
    en: 'Choose the value pillars this PoC must prove and tie each objective to one of them. Each objective is measured live, and each pillar shows the objectives that prove it — in the Overview, the Executive summary and the report.',
    'pt-BR': 'Escolha os pilares de valor que esta PoC precisa provar e ligue cada objetivo a um deles. Cada objetivo é medido ao vivo, e cada pilar mostra os objetivos que o provam — na Visão geral, no Resumo executivo e no relatório.',
  },
  'plan.value.boardAria': { en: 'Value pillars of the PoC', 'pt-BR': 'Pilares de valor da PoC' },
  'plan.value.inScope': { en: 'In the PoC scope', 'pt-BR': 'No escopo da PoC' },
  'plan.value.outOfScope': { en: 'Not in scope', 'pt-BR': 'Fora do escopo' },
  'plan.value.noGoals': { en: 'No objective tied yet', 'pt-BR': 'Nenhum objetivo ligado ainda' },
  'plan.value.addGoal': { en: 'Add an objective', 'pt-BR': 'Adicionar objetivo' },
  'plan.value.addGoalAria': { en: 'Add an objective to {pillar}', 'pt-BR': 'Adicionar objetivo em {pillar}' },
  'plan.criteria.pillar': { en: 'Value pillar', 'pt-BR': 'Pilar de valor' },
  'plan.criteria.pillarOut': { en: '{pillar} (not in scope)', 'pt-BR': '{pillar} (fora do escopo)' },
  'plan.criteria.noPillar': { en: 'No pillar', 'pt-BR': 'Sem pilar' },

  // ------------------------------------------------------------------ value pillars as tiles
  'pillar.section.lead': {
    en: 'What the PoC has already proven in each value pillar, with the objectives agreed for it.',
    'pt-BR': 'O que a PoC já provou em cada pilar de valor, com os objetivos acordados para ele.',
  },
  'pillar.noneInPlan': {
    en: 'No value pillar is in scope yet. Choose them, with their objectives, in Settings → PoC plan.',
    'pt-BR': 'Nenhum pilar de valor está no escopo ainda. Escolha-os, com seus objetivos, em Configurações → Plano da PoC.',
  },
  'pillar.tile.proven': { en: '{evidenced} of {total} points proven', 'pt-BR': '{evidenced} de {total} pontos provados' },
  'pillar.tile.noGoals': { en: 'No objective tied to this pillar yet', 'pt-BR': 'Nenhum objetivo ligado a este pilar ainda' },
  'pillar.tile.goals': { en: 'Objectives: {met} of {total} met', 'pt-BR': 'Objetivos: {met} de {total} atingidos' },
  'pillar.tile.howToRead': {
    en: 'The percentage counts a partly measured point as half. Dots: filled measured · half partly measured · ring not measured here.',
    'pt-BR': 'A porcentagem conta meio ponto para um ponto parcialmente medido. Pontos: cheio = medido · meio = parcialmente medido · anel = não medido aqui.',
  },
  'pillar.honestyShort': {
    en: 'A point not measured here is outside what this PoC reads — not a fault of the platform.',
    'pt-BR': 'Um ponto não medido aqui está fora do que esta PoC lê — não é falha da plataforma.',
  },

  // ------------------------------------------------------------------ "Limitation", reworded where a customer reads it
  'report.sec.pendingTitle': { en: 'Reading pending', 'pt-BR': 'Leitura pendente' },
  'report.rum.opportunityTitle': { en: 'Opportunity: digital experience', 'pt-BR': 'Oportunidade: experiência digital' },
  'p.infra.saturationHowTo': { en: 'How to read this trend', 'pt-BR': 'Como ler esta tendência' },

  // ------------------------------------------------------------------ PoC Timeline
  'tl.track.firstAutomation': { en: 'First automation', 'pt-BR': 'Primeira automação' },
  'tl.journey.title': { en: 'The value milestones', 'pt-BR': 'Os marcos de valor' },
  'tl.adopt.title': { en: 'Adoption, day by day', 'pt-BR': 'Adoção, dia a dia' },
  'tl.adopt.body': {
    en: 'What the team is doing with the platform since Day 0: automations running, logs flowing in, real users measured. The first days against the latest, as above.',
    'pt-BR': 'O que o time está fazendo com a plataforma desde o Dia 0: automações rodando, logs chegando, usuários reais medidos. Os primeiros dias contra os mais recentes, como acima.',
  },
  'tl.adopt.firstAutomation': { en: 'First automation of the PoC: {date}.', 'pt-BR': 'Primeira automação da PoC: {date}.' },
  'tl.adopt.automation': { en: 'Automation runs', 'pt-BR': 'Execuções de automação' },
  'tl.adopt.logs': { en: 'Logs ingested', 'pt-BR': 'Logs ingeridos' },
  'tl.adopt.experience': { en: 'Real-user actions', 'pt-BR': 'Ações de usuários reais' },
  'tl.adopt.perDay': { en: 'per day', 'pt-BR': 'por dia' },
  'tl.adopt.tooEarly': { en: 'The first days are compared with the latest from four complete days on.', 'pt-BR': 'Os primeiros dias são comparados com os mais recentes a partir de quatro dias completos.' },
  'tl.adopt.caption': {
    en: 'First days: {first} a day · latest: {latest} a day ({change}).',
    'pt-BR': 'Primeiros dias: {first} por dia · mais recentes: {latest} por dia ({change}).',
  },
  'tl.adopt.provenance': {
    en: 'Read from Grail for every day since {from}: workflow executions and log ingest from the platform\'s own events (volume, no price), real-user actions from the frontend metrics. Today is partial and is never compared.',
    'pt-BR': 'Lido do Grail para cada dia desde {from}: execuções de workflows e ingestão de logs dos eventos da própria plataforma (volume, sem preço), ações de usuários reais das métricas de frontend. Hoje é parcial e nunca é comparado.',
  },

  // ------------------------------------------------------------------ flow maps open the platform's pages
  'flow.openInDynatrace': { en: '{node}. Opens it in Dynatrace, in a new tab.', 'pt-BR': '{node}. Abre no Dynatrace, em uma nova aba.' },
  'flow.legend.open': {
    en: 'Click a box to open it in Dynatrace (new tab): the problem, the service, the host or the frontend.',
    'pt-BR': 'Clique em uma caixa para abri-la no Dynatrace (nova aba): o problema, o serviço, o host ou o frontend.',
  },

  // ------------------------------------------------------------------ Digital experience: spotlight, load, flow, errors
  'p.dx3.spot.title': { en: 'The busiest applications', 'pt-BR': 'As aplicações com mais tráfego' },
  'p.dx3.spot.subtitle': {
    en: 'Core Web Vitals, page load and the services each frontend calls — for the {count} applications with the most real-user traffic.',
    'pt-BR': 'Core Web Vitals, carregamento da página e os serviços que cada frontend chama — para as {count} aplicações com mais tráfego de usuários reais.',
  },
  'p.dx3.spot.topN': {
    en: 'Showing the {shown} busiest of {total} applications; every application is in the error rates below.',
    'pt-BR': 'Mostrando as {shown} com mais tráfego de {total} aplicações; todas aparecem nas taxas de erro abaixo.',
  },
  'p.dx3.spot.traffic': {
    en: '{requests} requests · {actions} user actions · {rate} front-end errors per request',
    'pt-BR': '{requests} requisições · {actions} ações de usuário · {rate} de erros de frontend por requisição',
  },
  'p.dx3.cwv.title': { en: 'Core Web Vitals (p75)', 'pt-BR': 'Core Web Vitals (percentil 75)' },
  'p.dx3.load.title': { en: 'Page load and responsiveness (p75)', 'pt-BR': 'Carregamento e responsividade (p75)' },
  'p.dx3.load.page': { en: 'Page load', 'pt-BR': 'Carregamento da página' },
  'p.dx3.load.action': { en: 'User action', 'pt-BR': 'Ação do usuário' },
  'p.dx3.load.ttfb': { en: 'Server response (TTFB)', 'pt-BR': 'Resposta do servidor (TTFB)' },
  'p.dx3.load.dom': { en: 'DOM interactive', 'pt-BR': 'DOM interativo' },
  'p.dx3.load.load': { en: 'Load event', 'pt-BR': 'Evento load' },
  'p.dx3.load.aria': {
    en: '{app}, 75th percentile: server response {ttfb}, DOM interactive {dom}, load event {load}, user action {action}.',
    'pt-BR': '{app}, percentil 75: resposta do servidor {ttfb}, DOM interativo {dom}, evento load {load}, ação do usuário {action}.',
  },
  'p.dx3.flow.title': { en: 'Who the frontend calls', 'pt-BR': 'Quem o frontend chama' },
  'p.dx3.flow.none': { en: 'The entity model names no service this frontend calls.', 'pt-BR': 'O modelo de entidades não aponta serviço chamado por este frontend.' },
  'p.dx3.flow.service': { en: 'service', 'pt-BR': 'serviço' },
  'p.dx3.flow.req': { en: 'requests', 'pt-BR': 'requisições' },
  'p.dx3.flow.reqFail': { en: 'req. · {pct}% failed', 'pt-BR': 'req. · {pct}% falhas' },
  'p.dx3.flow.serviceAria': { en: 'Service {name}: {figure}', 'pt-BR': 'Serviço {name}: {figure}' },
  'p.dx3.flow.frontend': { en: 'frontend', 'pt-BR': 'frontend' },
  'p.dx3.flow.appAria': { en: 'Frontend {name}', 'pt-BR': 'Frontend {name}' },
  'p.dx3.flow.moreName': { en: 'Other services', 'pt-BR': 'Outros serviços' },
  'p.dx3.flow.services': { en: 'services', 'pt-BR': 'serviços' },
  'p.dx3.flow.more': { en: '{count} more services this frontend reaches', 'pt-BR': 'Mais {count} serviços alcançados por este frontend' },
  'p.dx3.flow.col.app': { en: 'Frontend', 'pt-BR': 'Frontend' },
  'p.dx3.flow.col.entry': { en: 'Entry services', 'pt-BR': 'Serviços de entrada' },
  'p.dx3.flow.col.next': { en: 'What they call', 'pt-BR': 'O que eles chamam' },
  'p.dx3.flow.aria': { en: 'Services called by {name}', 'pt-BR': 'Serviços chamados por {name}' },
  'p.dx3.flow.legend': {
    en: "A link is a call the platform recorded in its entity model; the figure is the service's requests in the window, with its failures when there are any.",
    'pt-BR': 'Uma ligação é uma chamada registrada pela plataforma no modelo de entidades; o número são as requisições do serviço na janela, com as falhas quando houver.',
  },
  'p.dx3.err.subtitle': { en: 'Every application, the worst first.', 'pt-BR': 'Todas as aplicações, a pior primeiro.' },
  'p.dx3.err.of': { en: '{errors} errors in {requests} requests', 'pt-BR': '{errors} erros em {requests} requisições' },
  'p.dx3.err.legend': {
    en: 'Front-end errors per request on one absolute scale: under {good} good · from {good} to {attention} worth attention · {attention} or more high.',
    'pt-BR': 'Erros de frontend por requisição, numa escala absoluta: abaixo de {good} bom · de {good} a {attention} merece atenção · {attention} ou mais alto.',
  },
  'p.dx3.err.more': { en: '{count} more applications are not drawn.', 'pt-BR': 'Mais {count} aplicações não desenhadas.' },
  'p.dx3.rem.vitals': {
    en: 'Bring the pages rated "needs improvement" or "poor" on LCP or CLS into the good zone first: they are what real users feel first.',
    'pt-BR': 'Leve primeiro para a zona boa as páginas com nota "precisa melhorar" ou "ruim" em LCP ou CLS: é o que o usuário real sente primeiro.',
  },

  // ------------------------------------------------------------------ Security: the next queue after "act now"
  'p.sec3.next.title': { en: 'Next in line: two of three signals', 'pt-BR': 'Próxima fila: 2 de 3 sinais' },
  'p.sec3.next.caption': {
    en: 'Open vulnerabilities with two of the three signals at once (exploit, public exposure, function in use). Fix these right after "act now".',
    'pt-BR': 'Vulnerabilidades abertas com 2 dos 3 sinais ao mesmo tempo (exploit, exposição pública, função em uso). Corrija logo depois de "agir agora".',
  },
  'p.sec3.next.none': { en: 'No open vulnerability has two of the three signals.', 'pt-BR': 'Nenhuma vulnerabilidade aberta tem 2 dos 3 sinais.' },
  'p.sec3.pairs.title': { en: 'Signals together', 'pt-BR': 'Sinais combinados' },
  'p.sec3.pair.exploitPublic': { en: 'exploit + public exposure', 'pt-BR': 'exploit + exposição pública' },
  'p.sec3.pair.exploitInUse': { en: 'exploit + function in use', 'pt-BR': 'exploit + função em uso' },
  'p.sec3.pair.publicInUse': { en: 'public exposure + function in use', 'pt-BR': 'exposição pública + função em uso' },
  'p.sec3.pairs.note': {
    en: 'Each signal alone is counted above; "act now" needs all three on one vulnerability. "Function in use" is assessed only where code-level analysis exists, so a public, exploitable flaw elsewhere stops at two.',
    'pt-BR': 'Cada sinal isolado está contado acima; "agir agora" exige os três na mesma vulnerabilidade. "Função em uso" só é avaliada onde existe análise em nível de código, então uma falha pública e explorável em outra stack para em dois.',
  },

  // ------------------------------------------------------------------ Competitor overlap, told as consolidation
  'comp3.consol.aria': {
    en: 'Today {agents} third-party agents across {tools} tools; with Dynatrace one OneAgent and one platform.',
    'pt-BR': 'Hoje {agents} agentes de terceiros em {tools} ferramentas; com Dynatrace, um OneAgent e uma plataforma.',
  },
  'comp3.consol.today': { en: 'Today', 'pt-BR': 'Hoje' },
  'comp3.consol.todayFigure': { en: '{agents} · {tools}', 'pt-BR': '{agents} · {tools}' },
  'comp3.consol.withDt': { en: 'With Dynatrace', 'pt-BR': 'Com Dynatrace' },
  'comp3.consol.dtFigure': {
    en: 'One OneAgent · one platform · one root cause',
    'pt-BR': 'Um OneAgent · uma plataforma · uma causa raiz',
  },
  'comp3.compare.recommended': { en: 'Recommended', 'pt-BR': 'Recomendado' },
  'comp3.step1': { en: 'Map the {agents} found and what each one collects.', 'pt-BR': 'Mapeie os {agents} encontrados e o que cada um coleta.' },
  'comp3.step2': {
    en: 'Confirm the same signals in Dynatrace — the OneAgent is already running on these hosts.',
    'pt-BR': 'Confirme os mesmos sinais no Dynatrace — o OneAgent já está rodando nesses hosts.',
  },
  'comp3.step3': {
    en: 'Retire the redundant agents and consolidate licences, upgrades and on-call on one platform.',
    'pt-BR': 'Desligue os agentes redundantes e consolide licenças, atualizações e plantão em uma única plataforma.',
  },

  // ------------------------------------------------------------------ Value & ROI restyle
  'roi3.chain.title': { en: 'The value chain, measured live', 'pt-BR': 'A cadeia de valor, medida ao vivo' },
  'roi3.chain.body': {
    en: 'What the platform found, what it caught, how fast it closed and what it can take off people\'s hands — each figure read from this tenant.',
    'pt-BR': 'O que a plataforma encontrou, o que detectou, com que rapidez resolveu e o que pode tirar das mãos das pessoas — cada número lido desta tenant.',
  },
  'roi3.chain.discover': { en: 'Discover', 'pt-BR': 'Descobrir' },
  'roi3.chain.detect': { en: 'Detect', 'pt-BR': 'Detectar' },
  'roi3.chain.resolve': { en: 'Resolve', 'pt-BR': 'Resolver' },
  'roi3.chain.automate': { en: 'Automate', 'pt-BR': 'Automatizar' },
  'roi3.chain.consolidate': { en: 'Consolidate', 'pt-BR': 'Consolidar' },
  'roi3.chain.resolveCaption': { en: 'of the problems closed · measured MTTR {mttr}', 'pt-BR': 'dos problemas encerrados · MTTR medido {mttr}' },
  'roi3.mttr.preset': { en: '{hours} h', 'pt-BR': '{hours} h' },
  'roi3.mosaic.detail': { en: '{problems} problems · mean time to resolve {mttr}', 'pt-BR': '{problems} problemas · tempo médio de resolução {mttr}' },
  'roi3.act.availability': {
    en: 'Availability took {share} of the hours ({hours}): add availability SLOs and synthetic checks on the critical journeys.',
    'pt-BR': 'Disponibilidade consumiu {share} das horas ({hours}): crie SLOs de disponibilidade e monitores sintéticos nas jornadas críticas.',
  },
  'roi3.act.error': {
    en: 'Errors took {share} of the hours ({hours}): trace the failing exceptions and give the recurring ones a remediation workflow.',
    'pt-BR': 'Erros consumiram {share} das horas ({hours}): rastreie as exceções que falham e dê às recorrentes um workflow de remediação.',
  },
  'roi3.act.slowdown': {
    en: 'Slowdowns took {share} of the hours ({hours}): set latency SLOs and let Dynatrace Intelligence point at the code hotspots.',
    'pt-BR': 'Lentidão consumiu {share} das horas ({hours}): defina SLOs de latência e deixe a Dynatrace Intelligence apontar os hotspots de código.',
  },
  'roi3.act.resource': {
    en: 'Resource contention took {share} of the hours ({hours}): right-size requests, limits and capacity from the saturation data.',
    'pt-BR': 'Contenção de recursos consumiu {share} das horas ({hours}): ajuste requests, limits e capacidade com os dados de saturação.',
  },
  'roi3.act.custom': {
    en: 'Custom alerts took {share} of the hours ({hours}): review their thresholds and turn them into events with context for Dynatrace Intelligence.',
    'pt-BR': 'Alertas personalizados consumiram {share} das horas ({hours}): revise os thresholds e transforme-os em eventos com contexto para a Dynatrace Intelligence.',
  },
  'roi3.back.title': { en: 'What the PoC gave back', 'pt-BR': 'O que a PoC já devolveu' },
  'roi3.back.lead': {
    en: 'Since {since}, {closed} problems were closed with Dynatrace Intelligence, after {hours} open in total — every hour measured, none estimated.',
    'pt-BR': 'Desde {since}, {closed} problemas foram encerrados com a Dynatrace Intelligence, depois de {hours} abertos no total — cada hora medida, nenhuma estimada.',
  },
  'roi3.back.noStart': {
    en: 'Set the PoC start date in Settings → PoC plan to see the hours closed day by day since Day 0.',
    'pt-BR': 'Defina a data de início em Configurações → Plano da PoC para ver as horas encerradas dia a dia desde o Dia 0.',
  },
  'roi3.back.chart': { en: 'Problem hours closed per day', 'pt-BR': 'Horas de problema encerradas por dia' },
  'roi3.back.caption': {
    en: 'Hours the problems that began each day were open, for those already closed (prob.poc.daily).',
    'pt-BR': 'Horas em que os problemas iniciados em cada dia ficaram abertos, para os já encerrados (prob.poc.daily).',
  },
  'roi3.next.hoursTitle': { en: 'Attack the biggest share of hours', 'pt-BR': 'Ataque a maior fatia de horas' },
  'roi3.next.hoursBody': {
    en: 'One category took {share} of the problem hours ({hours}). The mosaic above says which, and what it calls for.',
    'pt-BR': 'Uma categoria consumiu {share} das horas de problema ({hours}). O mosaico acima diz qual, e o que ela pede.',
  },
  'roi3.next.automateTitle': { en: 'Hand the repeats to a workflow', 'pt-BR': 'Entregue as repetições a um workflow' },
  'roi3.next.automateBody': {
    en: '{patterns} recurring patterns repeat often enough for a workflow to take them off the on-call.',
    'pt-BR': '{patterns} padrões recorrentes se repetem o bastante para um workflow tirá-los do plantão.',
  },
  'roi3.next.consolTitle': { en: 'Consolidate on one platform', 'pt-BR': 'Consolide em uma plataforma' },
  'roi3.next.consolBody': {
    en: '{agents} of other tools run beside the OneAgent: retire them and keep one agent, one root cause.',
    'pt-BR': '{agents} de outras ferramentas rodam ao lado do OneAgent: desligue-os e fique com um agente, uma causa raiz.',
  },
  'roi3.next.baselineTitle': { en: 'Agree the MTTR reference', 'pt-BR': 'Combine a referência de MTTR' },
  'roi3.next.baselineBody': {
    en: 'Pick the customer\'s MTTR before Dynatrace above, so the measured MTTR reads against it.',
    'pt-BR': 'Escolha acima o MTTR do cliente antes da Dynatrace, para o MTTR medido ser lido contra ele.',
  },

  // ------------------------------------------------------------------ general report restyle
  'report3.trail.title': { en: 'How Dynatrace Intelligence found the root cause', 'pt-BR': 'Como a Dynatrace Intelligence encontrou a causa raiz' },
  'report3.trail.body': {
    en: 'The most impactful incident of the window, {id} · {name}: the problem, the root cause Dynatrace Intelligence named and the entities it affected — with no rule written.',
    'pt-BR': 'O incidente de maior impacto da janela, {id} · {name}: o problema, a causa raiz apontada pela Dynatrace Intelligence e as entidades afetadas — sem nenhuma regra escrita.',
  },
  'report3.vitals.title': { en: 'Core Web Vitals of {app} (p75)', 'pt-BR': 'Core Web Vitals de {app} (p75)' },

  // ------------------------------------------------------------------ deck: four more captures
  'cap.pin.stack.start': { en: 'Where users come in: {name}', 'pt-BR': 'Onde os usuários entram: {name}' },
  'cap.pin.stack.end': { en: 'How deep the stack is seen: {name}', 'pt-BR': 'Até onde a pilha é vista: {name}' },
  'cap.pin.chain': { en: '{step}: {value}', 'pt-BR': '{step}: {value}' },
  'cap.pin.kpi': { en: '{label}: {value}', 'pt-BR': '{label}: {value}' },

  // ------------------------------------------------------------------ Licensing: the consumption projection, priced (SE only)
  'p.lic.tab.projection': { en: 'Cost projection', 'pt-BR': 'Projeção de custo' },
  'p.lic.proj.title': { en: 'Estimated cost at the public list price', 'pt-BR': 'Custo estimado ao preço de lista público' },
  'p.lic.proj.body': {
    en: 'Two readings, for the SE only: the DPS sizing (the estimated annual usage of the DPS tab) and the billed consumption projected over the next 30 days and 12 months — both times the public DPS list price, converted with the rate card in Settings. Money appears on this tab and nowhere else.',
    'pt-BR': 'Duas leituras, só para o SE: o sizing do DPS (o uso anual estimado da aba DPS) e o consumo faturado projetado para os próximos 30 dias e 12 meses — ambos multiplicados pelo preço de lista público do DPS, convertidos pela tabela em Configurações. Dinheiro aparece nesta aba e em nenhum outro lugar.',
  },
  'p.lic.proj.next30': { en: 'Next 30 days', 'pt-BR': 'Próximos 30 dias' },
  'p.lic.proj.next365': { en: 'Next 12 months', 'pt-BR': 'Próximos 12 meses' },
  'p.lic.proj.calc': { en: 'Projected volume × public list price', 'pt-BR': 'Volume projetado × preço de lista público' },
  'p.lic.proj.tooEarly': { en: 'Needs more complete days of consumption', 'pt-BR': 'Precisa de mais dias completos de consumo' },
  'p.lic.proj.price': { en: 'List price per unit', 'pt-BR': 'Preço de lista por unidade' },
  'p.lic.proj.unpriced': { en: 'Billed here but not in the app\'s price table (not priced): {list}.', 'pt-BR': 'Faturado aqui, mas fora da tabela de preços do app (sem preço): {list}.' },
  'p.lic.proj.disclaimer': {
    en: 'A projection, not a quote: a straight line through the complete days (no seasonality, no growth plan) times the public list price — no negotiated discount, commitment or currency hedge. Never show it to the customer.',
    'pt-BR': 'Uma projeção, não uma proposta: uma reta pelos dias completos (sem sazonalidade, sem plano de crescimento) vezes o preço de lista público — sem desconto negociado, compromisso ou proteção cambial. Nunca mostre ao cliente.',
  },

  // ------------------------------------------------------------------ the "Value of the PoC" dashboard, detailed
  'dash2.question': {
    en: 'This dashboard answers: what has Dynatrace already proven in this environment — and what is left to prove?',
    'pt-BR': 'Este dashboard responde: o que a Dynatrace já provou neste ambiente — e o que ainda falta provar?',
  },
  'dash2.fact.customer': { en: 'Customer', 'pt-BR': 'Cliente' },
  'dash2.fact.start': { en: 'Start', 'pt-BR': 'Início' },
  'dash2.fact.end': { en: 'Planned end', 'pt-BR': 'Término previsto' },
  'dash2.fact.day': { en: 'Day of the PoC', 'pt-BR': 'Dia da PoC' },
  'dash2.goals.title': { en: '1. Objectives of the PoC, by value pillar', 'pt-BR': '1. Objetivos da PoC, por pilar de valor' },
  'dash2.goals.pillar': { en: 'Pillar', 'pt-BR': 'Pilar' },
  'dash2.goals.goal': { en: 'Objective', 'pt-BR': 'Objetivo' },
  'dash2.goals.target': { en: 'Target', 'pt-BR': 'Meta' },
  'dash2.goals.measured': { en: 'Measured', 'pt-BR': 'Medido' },
  'dash2.goals.status': { en: 'Status', 'pt-BR': 'Situação' },
  'dash2.goals.met': { en: 'Met', 'pt-BR': 'Atingido' },
  'dash2.goals.notMet': { en: 'Not met', 'pt-BR': 'Não atingido' },
  'dash2.goals.open': { en: 'In progress', 'pt-BR': 'Em andamento' },
  'dash2.goals.snapshot': {
    en: 'Snapshot taken by PoC Automation 3.0 on {at} — update the dashboard from the app to refresh it.',
    'pt-BR': 'Retrato tirado pelo PoC Automation 3.0 em {at} — atualize o dashboard pelo app para renová-lo.',
  },
  'dash2.section.estate': { en: '🗺️ {n}. The environment under observation', 'pt-BR': '🗺️ {n}. O ambiente sob observação' },
  'dash2.section.problems': { en: '🧠 {n}. Problems and root cause (Dynatrace Intelligence)', 'pt-BR': '🧠 {n}. Problemas e causa raiz (Dynatrace Intelligence)' },
  'dash2.section.services': { en: '⚡ {n}. Services — golden signals', 'pt-BR': '⚡ {n}. Serviços — sinais dourados' },
  'dash2.section.experience': { en: '🖥️ {n}. Digital experience (real users)', 'pt-BR': '🖥️ {n}. Experiência digital (usuários reais)' },
  'dash2.section.security': { en: '🛡️ {n}. Runtime security', 'pt-BR': '🛡️ {n}. Segurança em runtime' },
  'dash2.section.automation': { en: '🤖 {n}. Automation', 'pt-BR': '🤖 {n}. Automação' },
  'dash2.section.coverage': { en: '🧩 {n}. Technologies discovered', 'pt-BR': '🧩 {n}. Tecnologias descobertas' },
  'dash2.tile.hosts': { en: '🖥️ Hosts monitored', 'pt-BR': '🖥️ Hosts monitorados' },
  'dash2.tile.services': { en: '⚙️ Services discovered', 'pt-BR': '⚙️ Serviços descobertos' },
  'dash2.tile.processes': { en: '📦 Processes', 'pt-BR': '📦 Processos' },
  'dash2.tile.webApps': { en: '🌐 Web applications', 'pt-BR': '🌐 Aplicações web' },
  'dash2.tile.inventory': { en: '📊 Everything monitored, by category', 'pt-BR': '📊 Tudo o que é monitorado, por categoria' },
  'dash2.tile.problemsActive': { en: '🚨 Problems open now', 'pt-BR': '🚨 Problemas abertos agora' },
  'dash2.tile.problemsTotal': { en: '🧠 Problems detected by Dynatrace Intelligence', 'pt-BR': '🧠 Problemas detectados pela Dynatrace Intelligence' },
  'dash2.tile.rootCausePct': { en: '🎯 Root cause named (%)', 'pt-BR': '🎯 Causa raiz apontada (%)' },
  'dash2.tile.mttrHours': { en: '⏱️ MTTR — mean time to resolve (h)', 'pt-BR': '⏱️ MTTR — tempo médio de resolução (h)' },
  'dash2.tile.problemTimeline': { en: '📉 Problems by start, every 6 hours', 'pt-BR': '📉 Problemas por início, a cada 6 horas' },
  'dash2.tile.problemMix': { en: '📊 Problems by category and status', 'pt-BR': '📊 Problemas por categoria e situação' },
  'dash2.tile.mttx': { en: '⏳ Time to resolve by category', 'pt-BR': '⏳ Tempo de resolução por categoria' },
  'dash2.tile.topEntities': { en: '🏢 Entities involved in the most problems', 'pt-BR': '🏢 Entidades envolvidas em mais problemas' },
  'dash2.tile.svcTraffic': { en: '⚙️ Services with traffic', 'pt-BR': '⚙️ Serviços com tráfego' },
  'dash2.tile.svcAboveOne': { en: '🔴 Services above 1% failures', 'pt-BR': '🔴 Serviços acima de 1% de falhas' },
  'dash2.tile.svcResponse': { en: '⏱️ Response time, weighted by traffic (ms)', 'pt-BR': '⏱️ Tempo de resposta ponderado pelo tráfego (ms)' },
  'dash2.tile.golden': { en: '🚗 Requests and failures', 'pt-BR': '🚗 Requisições e falhas' },
  'dash2.tile.responseTime': { en: '⏱️ Response time (ms)', 'pt-BR': '⏱️ Tempo de resposta (ms)' },
  'dash2.tile.svcRanking': { en: '🏁 Busiest services — traffic, failures, response', 'pt-BR': '🏁 Serviços mais movimentados — tráfego, falhas, resposta' },
  'dash2.tile.rumScorecard': { en: '🖥️ Real-user traffic and errors by application', 'pt-BR': '🖥️ Tráfego e erros de usuários reais por aplicação' },
  'dash2.tile.rumVitals': { en: '⚡ Core Web Vitals (p75) by application', 'pt-BR': '⚡ Core Web Vitals (p75) por aplicação' },
  'dash2.tile.secTotal': { en: '🛡️ Open vulnerabilities', 'pt-BR': '🛡️ Vulnerabilidades abertas' },
  'dash2.tile.secActNow': { en: '🔥 Act now (exploit + public + in use)', 'pt-BR': '🔥 Agir agora (exploit + pública + em uso)' },
  'dash2.tile.secExploitable': { en: '💣 With a public exploit', 'pt-BR': '💣 Com exploit público' },
  'dash2.tile.secPosture': { en: '📋 Open vulnerabilities by severity and technology', 'pt-BR': '📋 Vulnerabilidades abertas por severidade e tecnologia' },
  'dash2.tile.wfCount': { en: '🤖 Workflows that ran', 'pt-BR': '🤖 Workflows que rodaram' },
  'dash2.tile.wfExecutions': { en: '🔁 Executions', 'pt-BR': '🔁 Execuções' },
  'dash2.tile.wfSuccess': { en: '✅ Success rate (%)', 'pt-BR': '✅ Taxa de sucesso (%)' },
  'dash2.tile.technologies': { en: '🧩 Technologies and versions discovered', 'pt-BR': '🧩 Tecnologias e versões descobertas' },
  'dash2.next.title': { en: 'Next steps', 'pt-BR': 'Próximos passos' },
  'dash2.next.goal': { en: 'Close the objective: {goal}.', 'pt-BR': 'Fechar o objetivo: {goal}.' },
  'dash2.next.close': {
    en: 'Present the Tech Wrapup deck and agree the success of the PoC with the customer.',
    'pt-BR': 'Apresentar o deck Tech Wrapup e formalizar o sucesso da PoC com o cliente.',
  },

  // ------------------------------------------------------------------ what's new
  'help.whatsNew.i33': {
    en: '3.2.6 — Commercial data is part of the SE\'s and partner\'s view, with no switch; Executive mode is the presentation mode and puts licensing, DPS and cost away. Value pillars and objectives are planned together in Settings → PoC plan, and each pillar shows the objectives that prove it.',
    'pt-BR': '3.2.6 — Os dados comerciais fazem parte da visão do SE e do parceiro, sem chave; o Modo executivo é o modo de apresentação e oculta licenciamento, DPS e custos. Pilares de valor e objetivos são planejados juntos em Configurações → Plano da PoC, e cada pilar mostra os objetivos que o provam.',
  },
  'help.whatsNew.i34': {
    en: '3.2.6 — A cleaner Overview (the stack map ends at the infrastructure on premises), pillar tiles, the PoC track fixed (dates in UTC, one mark per day), the milestones as a journey and adoption day by day with the first automation.',
    'pt-BR': '3.2.6 — Uma Visão geral mais limpa (o mapa da pilha termina na infraestrutura quando on-premises), pilares em blocos, a trilha da PoC corrigida (datas em UTC, uma marca por dia), os marcos como jornada e a adoção dia a dia com a primeira automação.',
  },
  'help.whatsNew.i35': {
    en: '3.2.6 — Digital experience puts its two busiest applications in the spotlight (vitals, page load on one axis, the services each frontend calls) and reads error rates on one absolute scale. Flow-map boxes open the problem, the service or the host in Dynatrace. Security names the queue after "act now"; the overlap reads as consolidation.',
    'pt-BR': '3.2.6 — Experiência digital destaca as duas aplicações com mais tráfego (vitals, carregamento num eixo, os serviços que cada frontend chama) e lê as taxas de erro numa escala absoluta. As caixas dos mapas abrem o problema, o serviço ou o host no Dynatrace. Segurança mostra a fila depois do "agir agora"; o overlap vira consolidação.',
  },
  'help.whatsNew.i36': {
    en: '3.2.6 — Value & ROI as a value chain with the problem hours as a mosaic; the general report in the app\'s own skin; capture slides with numbers and Assist, for eleven features; a detailed "Value of the PoC" dashboard; and, in Licensing only, the consumption projected at the public list price.',
    'pt-BR': '3.2.6 — Valor e ROI como cadeia de valor, com as horas de problema em mosaico; o relatório geral na pele do app; slides de captura com números e Assist, para onze funcionalidades; um dashboard “Valor da PoC” detalhado; e, só em Licenciamento, o consumo projetado ao preço de lista público.',
  },

  // ------------------------------------------------------------------ overview
  'stack.titleOnPrem': { en: 'Stack map: from the user to the infrastructure', 'pt-BR': 'Mapa da pilha: do usuário à infraestrutura' },
  'f.score.bodyCount': {
    en: '{count} independent dimensions. Each one carries its own evidence, source and gap. They are not combined into a single score.',
    'pt-BR': '{count} dimensões independentes. Cada uma carrega sua própria evidência, fonte e lacuna. Elas não são combinadas em uma nota única.',
  },
} as const satisfies Record<string, Entry>;
