import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.9 (the owner's approval of the Value cycle proposal, "seguir com a 3.7.9", with D1–D3 as
 * recommended): the Autonomous Value Cycle on the Coverage page, in place of the maturity journey. Merged in `strings.ts`.
 * Words it never uses: level, step, score, "reactive", "not met".
 */

export const v379Strings = {
  'cycle.title': { en: 'Autonomous value cycle — what this PoC already delivered', 'pt-BR': 'Ciclo de valor autônomo — o que esta PoC já entregou' },
  'cycle.caption': {
    en: 'The Foundation, then five links that feed each other: Context, Cause, Impact, Action and Prevention — and Prevention feeds the Context again. Each link counts the value events the PoC demonstrated, from what the app reads on this environment; what comes next is the next wave, with Dynatrace.',
    'pt-BR': 'A Fundação e cinco elos que se alimentam: Contexto, Causa, Impacto, Ação e Prevenção — e a Prevenção realimenta o Contexto. Cada elo conta os eventos de valor que a PoC demonstrou, a partir do que o app lê neste ambiente; o que vem depois é a próxima onda, com a Dynatrace.',
  },
  'cycle.ring.aria': { en: 'The value cycle: {n} value events demonstrated across its links.', 'pt-BR': 'O ciclo de valor: {n} eventos de valor demonstrados nos elos.' },
  'cycle.hub.kicker': { en: 'VALUE CYCLE', 'pt-BR': 'CICLO DE VALOR' },
  'cycle.hub.caption1': { en: 'value events', 'pt-BR': 'eventos de valor' },
  'cycle.hub.caption2': { en: 'demonstrated', 'pt-BR': 'demonstrados' },
  'cycle.count': { en: '{n} demonstrated', 'pt-BR': '{n} demonstrado(s)' },
  'asm.persona.fig.valueEvents': { en: '{count} value events already demonstrated by the PoC', 'pt-BR': '{count} eventos de valor já demonstrados pela PoC' },
  'cycle.kpi.label': { en: 'Value events demonstrated', 'pt-BR': 'Eventos de valor demonstrados' },
  'cycle.kpi.detail': { en: 'across the links of the value cycle', 'pt-BR': 'nos elos do ciclo de valor' },
  'cycle.valueLabel': { en: 'Value event:', 'pt-BR': 'Evento de valor:' },
  'cycle.nextTag': { en: 'next wave', 'pt-BR': 'próxima onda' },
  'cycle.psLabel': { en: 'With Professional Services:', 'pt-BR': 'Com Professional Services:' },

  // ------------------------------------------------------------------ the autonomy ladder
  'cycle.ladder.title': { en: 'Autonomy — the target is agreed with the customer', 'pt-BR': 'Autonomia — o alvo é combinado com o cliente' },
  'cycle.ladder.targetTag': { en: 'target', 'pt-BR': 'alvo' },
  'cycle.ladder.none': { en: 'The ladder starts as the data arrives.', 'pt-BR': 'A escada começa quando os dados chegam.' },
  'cycle.ladder.reached': { en: 'The PoC already demonstrated up to {rung}.', 'pt-BR': 'A PoC já demonstrou até {rung}.' },
  'cycle.ladder.noTarget': { en: 'The target is set with the customer, according to the risk.', 'pt-BR': 'O alvo é definido com o cliente, conforme o risco.' },
  'cycle.ladder.target': { en: 'Target agreed for this PoC: {rung}.', 'pt-BR': 'Alvo combinado para esta PoC: {rung}.' },
  'cycle.ladder.pick': { en: 'Target agreed for this PoC', 'pt-BR': 'Alvo combinado para esta PoC' },
  'cycle.ladder.pickNone': { en: 'Not agreed yet', 'pt-BR': 'Ainda não combinado' },
  'cycle.rung.observe': { en: 'Observe', 'pt-BR': 'Observa' },
  'cycle.rung.explain': { en: 'Explain', 'pt-BR': 'Explica' },
  'cycle.rung.prioritise': { en: 'Prioritise', 'pt-BR': 'Prioriza' },
  'cycle.rung.propose': { en: 'Propose', 'pt-BR': 'Propõe' },
  'cycle.rung.act': { en: 'Act', 'pt-BR': 'Age' },

  // ------------------------------------------------------------------ the lenses across the cycle
  'cycle.lens.ai.title': { en: 'AI Observability, across the cycle', 'pt-BR': 'AI Observability, em todo o ciclo' },
  'cycle.lens.ai.body': {
    en: '{n} service(s) with generative AI in view — tokens, models and calls on the AI Observability page.',
    'pt-BR': '{n} serviço(s) com IA generativa à vista — tokens, modelos e chamadas na página Observabilidade de IA.',
  },
  'cycle.lens.ai.none': {
    en: 'When the customer’s AI apps send their GenAI telemetry, the AI Observability page follows their tokens, models and calls.',
    'pt-BR': 'Quando os apps de IA do cliente enviarem a telemetria GenAI, a página Observabilidade de IA acompanha tokens, modelos e chamadas.',
  },
  'cycle.lens.sec.title': { en: 'Runtime security, across the cycle', 'pt-BR': 'Segurança em runtime, em todo o ciclo' },
  'cycle.lens.sec.body': {
    en: '{total} vulnerabilities in view, {actNow} to act on first, prioritised by real exposure — on the Security page.',
    'pt-BR': '{total} vulnerabilidades à vista, {actNow} para agir primeiro, priorizadas pela exposição real — na página Segurança.',
  },
  'cycle.lens.sec.none': {
    en: 'Runtime vulnerability analytics brings the vulnerabilities in use, prioritised by real exposure and business impact.',
    'pt-BR': 'A análise de vulnerabilidades em runtime traz as vulnerabilidades em uso, priorizadas pela exposição real e pelo impacto no negócio.',
  },

  // ------------------------------------------------------------------ the links
  'cycle.foundation.name': { en: 'Foundation', 'pt-BR': 'Fundação' },
  'cycle.foundation.question': { en: 'What to define before the data?', 'pt-BR': 'O que definir antes dos dados?' },
  'cycle.foundation.value': { en: 'the access, data and views model approved, ready when the first data arrives.', 'pt-BR': 'modelo de acesso, dados e visões aprovado, pronto quando os primeiros dados chegarem.' },
  'cycle.foundation.ps': { en: 'the access model, tags and data policy, and the waves plan by critical journey.', 'pt-BR': 'o modelo de acessos, tags e política de dados, e o plano de ondas por jornada crítica.' },
  'cycle.foundation.onward': { en: 'Segments and boundaries by team or domain', 'pt-BR': 'Segmentos e boundaries por time ou domínio' },
  'cycle.context.name': { en: 'Context', 'pt-BR': 'Contexto' },
  'cycle.context.question': { en: 'What exists, and who owns it?', 'pt-BR': 'O que existe e quem é o dono?' },
  'cycle.context.value': { en: 'silos broken and the environment mapped, with dependencies visible to every team.', 'pt-BR': 'quebra de silos e ambiente mapeado, com dependências visíveis a todas as áreas.' },
  'cycle.context.ps': { en: 'the owners’ workshop — every critical service leaves with a team and a channel.', 'pt-BR': 'a oficina de donos — cada serviço crítico sai com equipe e canal.' },
  'cycle.context.onward': { en: 'Ownership and teams, so every alert reaches the right team', 'pt-BR': 'Ownership e equipes, para todo alerta chegar ao time certo' },
  'cycle.cause.name': { en: 'Cause', 'pt-BR': 'Causa' },
  'cycle.cause.question': { en: 'Why did it happen?', 'pt-BR': 'Por que aconteceu?' },
  'cycle.cause.value': { en: 'faster resolution, with the root cause found without a war room.', 'pt-BR': 'agilidade na resolução, com causa raiz sem war room.' },
  'cycle.cause.ps': { en: 'the root cause validated against the customer’s real incidents, and alerting tuned with the teams.', 'pt-BR': 'a causa raiz validada contra incidentes reais do cliente e os alertas ajustados com os times.' },
  'cycle.cause.onward': { en: 'Triage workflow with Dynatrace Assist, from the PoC Builder', 'pt-BR': 'Workflow de triagem com Dynatrace Assist, pelo PoC Builder' },
  'cycle.impact.name': { en: 'Impact', 'pt-BR': 'Impacto' },
  'cycle.impact.question': { en: 'Who was affected, and how much?', 'pt-BR': 'Quem foi afetado e quanto?' },
  'cycle.impact.value': { en: 'the brand protected and the impact measured, a failure caught early and measured in business terms.', 'pt-BR': 'proteção da marca e impacto medido, com a falha detectada cedo e medida em negócio.' },
  'cycle.impact.ps': { en: 'the critical journeys workshop with the business, with targets and data masking.', 'pt-BR': 'a oficina de jornadas críticas com o negócio, com metas e mascaramento de dados.' },
  'cycle.impact.onward': { en: 'Critical journeys with targets, and Session Replay', 'pt-BR': 'Jornadas críticas com metas, e Session Replay' },
  'cycle.action.name': { en: 'Action', 'pt-BR': 'Ação' },
  'cycle.action.question': { en: 'What to do, and who does it?', 'pt-BR': 'O que fazer e quem faz?' },
  'cycle.action.value': { en: 'an automated response, with investigation and triage on their own.', 'pt-BR': 'resposta automatizada, com investigação e triagem automáticas.' },
  'cycle.action.ps': { en: 'the catalogue of actions by risk, with approvals, built and tested outside production.', 'pt-BR': 'o catálogo de ações por risco, com aprovações, construído e testado fora de produção.' },
  'cycle.action.onward': { en: 'Actions by risk with approvals; agents through MCP and dtctl', 'pt-BR': 'Ações por risco com aprovação; agentes via MCP e dtctl' },
  'cycle.prevention.name': { en: 'Prevention', 'pt-BR': 'Prevenção' },
  'cycle.prevention.question': { en: 'How to avoid it happening again?', 'pt-BR': 'Como evitar a repetição?' },
  'cycle.prevention.value': { en: 'operational clarity, with forecasting, improvements and value stories for the business review.', 'pt-BR': 'clareza operacional, com previsão, melhorias e Value Stories para o QBR.' },
  'cycle.prevention.ps': { en: 'the SLO programme, release gates and post-incident reviews.', 'pt-BR': 'o programa de SLOs, os gates de release e as revisões pós-incidente.' },
  'cycle.prevention.onward': { en: 'Site Reliability Guardian in the delivery pipeline', 'pt-BR': 'Site Reliability Guardian no pipeline de entrega' },

  // ------------------------------------------------------------------ the value events (demonstrated, and as the next wave)
  'cycle.ev.plan': { en: 'The PoC plan agreed — dates and success criteria', 'pt-BR': 'O plano da PoC combinado — datas e critérios de sucesso' },
  'cycle.ev.plan.next': { en: 'The PoC plan — dates and success criteria in Settings', 'pt-BR': 'O plano da PoC — datas e critérios em Configurações' },
  'cycle.ev.data': { en: 'Data reaching this environment', 'pt-BR': 'Dados chegando a este ambiente' },
  'cycle.ev.data.next': { en: 'The first data reaching this environment', 'pt-BR': 'Os primeiros dados chegando a este ambiente' },
  'cycle.ev.mapped': { en: 'The environment mapped by Smartscape, with its dependencies', 'pt-BR': 'O ambiente mapeado pelo Smartscape, com as dependências' },
  'cycle.ev.mapped.next': { en: 'Hosts and services mapped with their dependencies', 'pt-BR': 'Hosts e serviços mapeados com as dependências' },
  'cycle.ev.fullStack': { en: 'Full-Stack depth — code, services and traces', 'pt-BR': 'Profundidade Full-Stack — código, serviços e traces' },
  'cycle.ev.fullStack.next': { en: 'Full-Stack on the hosts that matter most', 'pt-BR': 'Full-Stack nos hosts que mais importam' },
  'cycle.ev.logContext': { en: 'Logs with service context, in one place', 'pt-BR': 'Logs com contexto de serviço, num só lugar' },
  'cycle.ev.logContext.next': { en: 'Logs tied to their services and traces', 'pt-BR': 'Logs ligados aos serviços e traces' },
  'cycle.ev.owners': { en: 'Services with an owner', 'pt-BR': 'Serviços com dono' },
  'cycle.ev.owners.next': { en: 'An owner for each critical service', 'pt-BR': 'Um dono para cada serviço crítico' },
  'cycle.ev.dashboards': { en: 'Smart Dashboards published for the teams', 'pt-BR': 'Smart Dashboards publicados para os times' },
  'cycle.ev.dashboards.next': { en: 'Smart Dashboards for the teams, from the PoC Builder', 'pt-BR': 'Smart Dashboards para os times, pelo PoC Builder' },
  'cycle.ev.pipeline': { en: 'Logs with their severity through OpenPipeline', 'pt-BR': 'Logs com severidade pelo OpenPipeline' },
  'cycle.ev.pipeline.next': { en: 'A severity for the logs that arrive without one, through OpenPipeline', 'pt-BR': 'Uma severidade para os logs que chegam sem ela, pelo OpenPipeline' },
  'cycle.ev.problems': { en: 'Problems detected and explained by Dynatrace Intelligence', 'pt-BR': 'Problemas detectados e explicados pela Dynatrace Intelligence' },
  'cycle.ev.problems.next': { en: 'Problems detected and explained as they happen', 'pt-BR': 'Problemas detectados e explicados quando acontecem' },
  'cycle.ev.resolved': { en: 'Problems resolved in hours, with the cause shown', 'pt-BR': 'Problemas resolvidos em horas, com a causa apontada' },
  'cycle.ev.resolved.next': { en: 'Faster resolution with the cause shown to the owner', 'pt-BR': 'Resolução mais rápida com a causa entregue ao dono' },
  'cycle.ev.dependencies': { en: 'Who calls whom, traced end to end', 'pt-BR': 'Quem chama quem, rastreado de ponta a ponta' },
  'cycle.ev.dependencies.next': { en: 'Service dependencies traced end to end', 'pt-BR': 'Dependências entre serviços rastreadas de ponta a ponta' },
  'cycle.ev.detectors': { en: 'Anomaly detectors on the golden signals', 'pt-BR': 'Detectores de anomalia nos sinais de ouro' },
  'cycle.ev.detectors.next': { en: 'Anomaly detectors on the golden signals, from the PoC Builder', 'pt-BR': 'Detectores de anomalia nos sinais de ouro, pelo PoC Builder' },
  'cycle.ev.realUsers': { en: 'Real users monitored on the applications', 'pt-BR': 'Usuários reais monitorados nas aplicações' },
  'cycle.ev.realUsers.next': { en: 'Real users on the critical applications', 'pt-BR': 'Usuários reais nas aplicações críticas' },
  'cycle.ev.vitals': { en: 'Core Web Vitals measured', 'pt-BR': 'Core Web Vitals medidos' },
  'cycle.ev.vitals.next': { en: 'Core Web Vitals of the critical pages', 'pt-BR': 'Core Web Vitals das páginas críticas' },
  'cycle.ev.synthetic': { en: 'Synthetic monitors watching the customer’s addresses', 'pt-BR': 'Monitores sintéticos vigiando os endereços do cliente' },
  'cycle.ev.synthetic.next': { en: 'Browser and HTTP monitors of the customer’s addresses', 'pt-BR': 'Monitores Browser e HTTP dos endereços do cliente' },
  'cycle.ev.business': { en: 'Business events captured', 'pt-BR': 'Eventos de negócio capturados' },
  'cycle.ev.business.next': { en: 'Business events at the points that matter (order, payment)', 'pt-BR': 'Eventos de negócio nos pontos que importam (pedido, pagamento)' },
  'cycle.ev.workflows': { en: 'Workflows running on the platform', 'pt-BR': 'Workflows rodando na plataforma' },
  'cycle.ev.workflows.next': { en: 'Workflows triggered by problems, with notification and triage', 'pt-BR': 'Workflows disparados por problemas, com notificação e triagem' },
  'cycle.ev.automationRate': { en: 'Automation that succeeds', 'pt-BR': 'Automação que dá certo' },
  'cycle.ev.automationRate.next': { en: 'Workflows tuned until they succeed reliably', 'pt-BR': 'Workflows ajustados até darem certo com regularidade' },
  'cycle.ev.slos': { en: 'SLOs created for the PoC', 'pt-BR': 'SLOs criados para a PoC' },
  'cycle.ev.slos.next': { en: 'SLOs of the critical services and the fleet, from the PoC Builder', 'pt-BR': 'SLOs dos serviços críticos e da frota, pelo PoC Builder' },
  'cycle.ev.runtimeSecurity': { en: 'Vulnerabilities in use prioritised in runtime', 'pt-BR': 'Vulnerabilidades em uso priorizadas em runtime' },
  'cycle.ev.runtimeSecurity.next': { en: 'Runtime vulnerability analytics on the journey’s services', 'pt-BR': 'Análise de vulnerabilidades em runtime nos serviços da jornada' },

  // ------------------------------------------------------------------ figures
  'cycle.fig.mapped': { en: '{hosts} hosts · {services} services', 'pt-BR': '{hosts} hosts · {services} serviços' },
  'cycle.fig.pct': { en: '{pct}%', 'pt-BR': '{pct}%' },
  'cycle.fig.count': { en: '{n}', 'pt-BR': '{n}' },
  'cycle.fig.hours': { en: '{h} h on average', 'pt-BR': '{h} h em média' },
  'cycle.fig.runs': { en: '{n} runs', 'pt-BR': '{n} execuções' },
  'cycle.fig.criteria': { en: '{n} criteria', 'pt-BR': '{n} critérios' },

  // ------------------------------------------------------------------ the Tech Wrapup: the Coverage section and its capture
  'tw.asm.k.valueEvents': { en: 'Value events', 'pt-BR': 'Eventos de valor' },
  'tw.asm.i.cycle': {
    en: 'The PoC already demonstrated {n} value events across the value cycle — {links}.',
    'pt-BR': 'A PoC já demonstrou {n} eventos de valor no ciclo de valor — {links}.',
  },
  'tw.asm.i.nextWave': { en: 'The next wave, in {link}: {next}.', 'pt-BR': 'A próxima onda, em {link}: {next}.' },
  'tw.asm.hiCycle': { en: 'value events demonstrated by the PoC', 'pt-BR': 'eventos de valor demonstrados pela PoC' },
  'cap.opt.assessment.cycle': { en: 'Value cycle (ring, links and autonomy)', 'pt-BR': 'Ciclo de valor (anel, elos e autonomia)' },
  'cap.pin.cycle.total': { en: '{n} value events demonstrated', 'pt-BR': '{n} eventos de valor demonstrados' },
  'cap.d.cycle.total': {
    en: 'Every value event comes from a read of this environment: a number that only grows as the PoC delivers.',
    'pt-BR': 'Cada evento de valor vem de uma leitura deste ambiente: um número que só cresce conforme a PoC entrega.',
  },
  'cap.d.cycle.best': {
    en: 'The link where the PoC delivered most — the story to open the conversation with.',
    'pt-BR': 'O elo em que a PoC mais entregou — a história para abrir a conversa.',
  },
  'cap.d.cycle.cause': {
    en: 'Cause: problems detected and explained by Dynatrace Intelligence, with the root cause found without a war room.',
    'pt-BR': 'Causa: problemas detectados e explicados pela Dynatrace Intelligence, com a causa raiz sem war room.',
  },
  'cap.d.cycle.ladder': {
    en: 'Autonomy grows rung by rung — observe, explain, prioritise, propose, act — up to the target agreed with the customer.',
    'pt-BR': 'A autonomia cresce degrau a degrau — observa, explica, prioriza, propõe, age — até o alvo combinado com o cliente.',
  },

  'help.whatsNew.i121': {
    en: '3.7.9 — Coverage tells the value the PoC delivered: the Autonomous Value Cycle replaces the maturity journey. Around the Foundation, five links — Context, Cause, Impact, Action, Prevention — count the value events the PoC already demonstrated, from what the app reads on this environment, with the next wave of each link; the autonomy ladder shows the rungs demonstrated and the target agreed for this PoC (set in the panel); AI Observability and runtime security run across the cycle. For the SE and the partner, each link also says what Professional Services brings. The Coverage card, the conversation guide and the Tech Wrapup (its Coverage section and the new “Value cycle” capture) speak of value events, never of a step or a level. The menu has nine stages: Coverage holds Coverage and Platform adoption, and Evidence brings together every page that read the environment; the Roadmap page became the “30-60-90 action plan”, a tab of Opportunities.',
    'pt-BR': '3.7.9 — A Cobertura conta o valor que a PoC entregou: o Ciclo de Valor Autônomo substitui a Jornada de maturidade. Em volta da Fundação, cinco elos — Contexto, Causa, Impacto, Ação, Prevenção — contam os eventos de valor que a PoC já demonstrou, a partir do que o app lê neste ambiente, com a próxima onda de cada elo; a escada de autonomia mostra os degraus demonstrados e o alvo combinado para esta PoC (escolhido no painel); AI Observability e segurança em runtime atravessam o ciclo. Para o SE e o parceiro, cada elo diz também o que Professional Services traz. O card da Cobertura, o guia de conversa e o Tech Wrapup (a seção de Cobertura e a nova captura “Ciclo de valor”) falam de eventos de valor, nunca de etapa ou nível. O menu tem nove etapas: Cobertura reúne Cobertura e Adoção da plataforma, e Evidências junta todas as páginas que leram o ambiente; a página Roadmap virou o “Plano de ação 30-60-90”, uma guia de Oportunidades.',
  },

  // ------------------------------------------------------------------ Opportunities: the list and the 30-60-90 action plan
  'p.opp.tab.list': { en: 'Opportunities', 'pt-BR': 'Oportunidades' },
  'p.opp.tab.plan': { en: '30-60-90 action plan', 'pt-BR': 'Plano de ação 30-60-90' },
} satisfies Record<string, Entry>;
