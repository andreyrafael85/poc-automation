import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.5 — strings of milestone M5 (the PoC plan: dates, success criteria and the
 * baseline reconstructed from Grail; measured MTTR; incident stories; the security fix queue with
 * context; the "Value of the PoC" dashboard; consumption and its projection, SE only).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 */

export const v325Strings = {
  // ------------------------------------------------------------------ windows
  'timeframe.poc.since': { en: 'since the start of the PoC', 'pt-BR': 'desde o início da PoC' },
  'timeframe.poc.day0': { en: 'the first day of the PoC', 'pt-BR': 'o primeiro dia da PoC' },
  'timeframe.pinned.30d': { en: 'last 30 days', 'pt-BR': 'últimos 30 dias' },
  'f.advisor.find.timeframeAnchored': { en: 'Anchored to the PoC dates in Settings ({label}).', 'pt-BR': 'Ancorada nas datas da PoC em Configurações ({label}).' },
  'f.advisor.rec.timeframeAnchored': {
    en: 'No change needed. The window follows the start date, is capped at 90 days, and the query does not run until a date is set.',
    'pt-BR': 'Nenhuma mudança necessária. A janela segue a data de início, é limitada a 90 dias, e a consulta não roda até haver uma data.',
  },

  // ------------------------------------------------------------------ catalog purposes
  'catalog.purpose.cov.inventory.day0': {
    en: 'The same entity inventory read over the first day of the PoC, so the PoC Timeline can show what was monitored on Day 0 next to what is monitored today.',
    'pt-BR': 'O mesmo inventário de entidades lido sobre o primeiro dia da PoC, para a PoC Timeline mostrar o que era monitorado no Dia 0 ao lado do que é monitorado hoje.',
  },
  'catalog.purpose.prob.poc.daily': {
    en: 'Problems that began on each day of the PoC, with how many closed, their total time to resolve and how many had a root cause, so the first week can be compared with the latest.',
    'pt-BR': 'Problemas que começaram em cada dia da PoC, com quantos fecharam, o tempo total de resolução e quantos tiveram causa raiz, para comparar a primeira semana com a mais recente.',
  },
  'catalog.purpose.cons.daily': {
    en: "Daily billed usage per capability over the last 30 days, in each capability's own unit, for the SE-only consumption trend and its labelled projection.",
    'pt-BR': 'Uso faturado por dia e por capacidade nos últimos 30 dias, na unidade de cada capacidade, para a tendência de consumo (só SE) e a sua projeção rotulada.',
  },
  'catalog.purpose.sec.context': {
    en: 'For each open vulnerability, the vulnerable component and the services and workloads it reaches, so the top five fixes can say what to upgrade, where it runs and who answers for it.',
    'pt-BR': 'Para cada vulnerabilidade aberta, o componente vulnerável e os serviços e workloads que ela alcança, para as cinco primeiras correções dizerem o que atualizar, onde roda e quem responde.',
  },
  'catalog.purpose.svc.owners': {
    en: 'The tags of every tagged service, from which the security fix queue reads an owner or team tag, or falls back to the Kubernetes namespace, labelled as such.',
    'pt-BR': 'As tags de cada serviço com tags, de onde a fila de correções de segurança lê uma tag de dono ou time, ou recorre ao namespace do Kubernetes, rotulado como tal.',
  },

  // ------------------------------------------------------------------ success criteria
  'crit.m.coverage': { en: 'Categories with telemetry (%)', 'pt-BR': 'Categorias com telemetria (%)' },
  'crit.m.servicesTraced': { en: 'Services with traffic traced', 'pt-BR': 'Serviços com tráfego rastreados' },
  'crit.m.servicesHealthy': { en: 'Services under 1% failures (%)', 'pt-BR': 'Serviços abaixo de 1% de falhas (%)' },
  'crit.m.mttr': { en: 'Mean time to resolve (hours)', 'pt-BR': 'Tempo médio de resolução (horas)' },
  'crit.m.open': { en: 'Problems open', 'pt-BR': 'Problemas abertos' },
  'crit.m.closed': { en: 'Problems closed (%)', 'pt-BR': 'Problemas encerrados (%)' },
  'crit.m.recurring': { en: 'Recurring problem patterns', 'pt-BR': 'Padrões de problemas recorrentes' },
  'crit.m.workflows': { en: 'Workflows that ran', 'pt-BR': 'Workflows executados' },
  'crit.m.critical': { en: 'Critical vulnerabilities open', 'pt-BR': 'Vulnerabilidades críticas abertas' },
  'crit.m.users': { en: 'Real users monitored', 'pt-BR': 'Usuários reais monitorados' },
  'crit.status.met': { en: 'Met', 'pt-BR': 'Atingido' },
  'crit.status.notMet': { en: 'Not met yet', 'pt-BR': 'Ainda não atingido' },
  'crit.status.measuring': { en: 'Measuring', 'pt-BR': 'Medindo' },
  'crit.status.notRead': { en: 'Not read: the query did not answer', 'pt-BR': 'Não lido: a consulta não respondeu' },
  'crit.status.noTarget': { en: 'Measured, no target set', 'pt-BR': 'Medido, sem meta definida' },
  'crit.status.manualMet': { en: 'Met (assessed by the team)', 'pt-BR': 'Atingido (avaliado pelo time)' },
  'crit.status.manualNotMet': { en: 'Not met (assessed by the team)', 'pt-BR': 'Não atingido (avaliado pelo time)' },
  'crit.status.manualPending': { en: 'Awaiting assessment', 'pt-BR': 'Aguardando avaliação' },
  'crit.panel.title': { en: 'Objectives × what was proven', 'pt-BR': 'Objetivos × o que foi provado' },
  'crit.panel.none': {
    en: 'No success criterion was recorded for this PoC. Add them in Settings → PoC plan, and each is judged here from what the tenant measures.',
    'pt-BR': 'Nenhum critério de sucesso foi registrado para esta PoC. Adicione em Configurações → Plano da PoC e cada um é julgado aqui pelo que o tenant mede.',
  },
  'crit.panel.score': {
    en: '{met} of {total} {total|objective|objectives} proven so far, each judged live from the query that measures it.',
    'pt-BR': '{met} de {total} {total|objetivo provado|objetivos provados} até agora, cada um julgado ao vivo pela consulta que o mede.',
  },
  'crit.panel.measured': { en: 'Measured: {value}', 'pt-BR': 'Medido: {value}' },
  'crit.panel.origin': { en: 'Agreed: {origin}', 'pt-BR': 'Combinado: {origin}' },
  'crit.panel.progress': { en: '{pct}% of the way to the target', 'pt-BR': '{pct}% do caminho até a meta' },
  'crit.deck.n1': {
    en: 'The objectives were agreed with the team at the start of the PoC; each measurable one is judged from the same query the app shows it with.',
    'pt-BR': 'Os objetivos foram combinados com o time no início da PoC; cada um mensurável é julgado pela mesma consulta com que o app o mostra.',
  },
  'crit.deck.n2': {
    en: 'An objective the data could not read is marked as such, never as missed; one only people can judge carries their verdict.',
    'pt-BR': 'Um objetivo que o dado não conseguiu ler aparece como tal, nunca como perdido; um que só pessoas podem julgar traz o veredito delas.',
  },
  'crit.deck.k.met': { en: 'Objectives proven', 'pt-BR': 'Objetivos provados' },
  'crit.deck.table': { en: 'Objective by objective', 'pt-BR': 'Objetivo por objetivo' },
  'crit.deck.h.objective': { en: 'Objective', 'pt-BR': 'Objetivo' },
  'crit.deck.h.measured': { en: 'Measured', 'pt-BR': 'Medido' },
  'crit.deck.h.status': { en: 'Status', 'pt-BR': 'Situação' },

  // ------------------------------------------------------------------ Settings → PoC plan
  'settings.tab.plan': { en: 'PoC plan', 'pt-BR': 'Plano da PoC' },
  'plan.dates.title': { en: 'Dates of the PoC', 'pt-BR': 'Datas da PoC' },
  'plan.dates.body': {
    en: 'With a start date the PoC Timeline rebuilds Day 0 from Grail (what was monitored on the first day) and compares the first days with the latest. Nothing is snapshotted.',
    'pt-BR': 'Com a data de início, a PoC Timeline reconstrói o Dia 0 a partir do Grail (o que era monitorado no primeiro dia) e compara os primeiros dias com os mais recentes. Nada é guardado em snapshot.',
  },
  'plan.dates.start': { en: 'Start date (kick-off)', 'pt-BR': 'Data de início (kick-off)' },
  'plan.dates.end': { en: 'Planned end date', 'pt-BR': 'Data prevista de encerramento' },
  'plan.dates.day': { en: 'Today is day {day} of the PoC.', 'pt-BR': 'Hoje é o dia {day} da PoC.' },
  'plan.dates.future': { en: 'The PoC has not started yet: the baseline is read from its first day on.', 'pt-BR': 'A PoC ainda não começou: a linha de base é lida a partir do primeiro dia.' },
  'plan.dates.clamped': {
    en: 'The start date is more than {days} days ago: the comparisons read the last {days} days, and say so.',
    'pt-BR': 'A data de início tem mais de {days} dias: as comparações leem os últimos {days} dias, e dizem isso.',
  },
  'plan.dates.endBeforeStart': { en: 'The end date is before the start date', 'pt-BR': 'A data de encerramento é anterior à de início' },
  'plan.dates.endBeforeStartBody': { en: 'Correct one of the two dates to save the plan.', 'pt-BR': 'Corrija uma das duas datas para salvar o plano.' },
  'plan.criteria.title': { en: 'Success criteria', 'pt-BR': 'Critérios de sucesso' },
  'plan.criteria.body': {
    en: 'What was agreed with the customer, one line each: a figure the app measures with a target (judged live on the PoC Timeline, in the report and in the deck), or a statement the team assesses.',
    'pt-BR': 'O que foi combinado com o cliente, um por linha: um número que o app mede com uma meta (julgado ao vivo na PoC Timeline, no relatório e no deck), ou uma afirmação que o time avalia.',
  },
  'plan.criteria.empty': { en: 'No criterion yet.', 'pt-BR': 'Nenhum critério ainda.' },
  'plan.criteria.item': { en: 'Objective {n}', 'pt-BR': 'Objetivo {n}' },
  'plan.criteria.removeAria': { en: 'Remove objective {n}', 'pt-BR': 'Remover objetivo {n}' },
  'plan.criteria.remove': { en: 'Remove', 'pt-BR': 'Remover' },
  'plan.criteria.metric': { en: 'What is measured', 'pt-BR': 'O que é medido' },
  'plan.criteria.manual': { en: 'Assessed by the team (not measurable here)', 'pt-BR': 'Avaliado pelo time (não mensurável aqui)' },
  'plan.criteria.operator': { en: 'Rule', 'pt-BR': 'Regra' },
  'plan.criteria.atLeast': { en: 'At least (≥)', 'pt-BR': 'No mínimo (≥)' },
  'plan.criteria.atMost': { en: 'At most (≤)', 'pt-BR': 'No máximo (≤)' },
  'plan.criteria.target': { en: 'Target', 'pt-BR': 'Meta' },
  'plan.criteria.targetUnit': { en: 'Target ({unit})', 'pt-BR': 'Meta ({unit})' },
  'plan.criteria.assessment': { en: "The team's verdict", 'pt-BR': 'Veredito do time' },
  'plan.criteria.textRequired': { en: 'The criterion, as agreed (required)', 'pt-BR': 'O critério, como combinado (obrigatório)' },
  'plan.criteria.text': { en: 'The criterion, as agreed (optional)', 'pt-BR': 'O critério, como combinado (opcional)' },
  'plan.criteria.textPlaceholder': { en: 'e.g. Root cause found without a war room', 'pt-BR': 'ex.: Causa raiz encontrada sem sala de guerra' },
  'plan.criteria.origin': { en: 'Where it was agreed', 'pt-BR': 'Onde foi combinado' },
  'plan.criteria.originPlaceholder': { en: 'e.g. Kick-off meeting', 'pt-BR': 'ex.: Reunião de kick-off' },
  'plan.criteria.manualNeedsText': {
    en: 'A criterion the team assesses is only its words: write it to save the plan.',
    'pt-BR': 'Um critério avaliado pelo time é só o seu texto: escreva-o para salvar o plano.',
  },
  'plan.criteria.add': { en: 'Add an objective', 'pt-BR': 'Adicionar objetivo' },
  'plan.criteria.max': { en: 'Up to {max} objectives.', 'pt-BR': 'Até {max} objetivos.' },

  // ------------------------------------------------------------------ the "Value of the PoC" dashboard
  'dash.title': { en: '"Value of the PoC" dashboard', 'pt-BR': 'Dashboard “Valor da PoC”' },
  'dash.body': {
    en: 'A dashboard on the tenant that tells the PoC by itself: scope, problems and how fast they closed, services, automation, security posture, real-user experience and what was discovered. Validated catalog queries only, with no licensing, consumption or price. It is created only when you click, never on its own.',
    'pt-BR': 'Um dashboard na tenant que conta a PoC sozinho: escopo, problemas e quão rápido fecharam, serviços, automação, postura de segurança, experiência de usuários reais e o que foi descoberto. Só consultas validadas do catálogo — sem licenciamento, consumo ou preço. Ele só é criado quando você clica, nunca sozinho.',
  },
  'dash.preview': { en: 'What it will hold', 'pt-BR': 'O que ele vai ter' },
  'dash.preview.header': { en: 'Header: customer, engagement and the agreed objectives', 'pt-BR': 'Cabeçalho: cliente, engajamento e os objetivos combinados' },
  'dash.preview.note': {
    en: "Default window: last 7 days. Each tile keeps the app's scan ceiling, so the dashboard never costs more than the app.",
    'pt-BR': 'Janela padrão: últimos 7 dias. Cada bloco mantém o teto de varredura do app, então o dashboard nunca custa mais que o app.',
  },
  'dash.tile.cov.inventory': { en: 'What is monitored', 'pt-BR': 'O que é monitorado' },
  'dash.tile.prob.summary': { en: 'Problems by category and status', 'pt-BR': 'Problemas por categoria e situação' },
  'dash.tile.prob.mttx': { en: 'Time to resolve by category', 'pt-BR': 'Tempo de resolução por categoria' },
  'dash.tile.svc.ranking.total': { en: 'Services with traffic and their health', 'pt-BR': 'Serviços com tráfego e sua saúde' },
  'dash.tile.auto.workflows.total': { en: 'Automation: workflows and executions', 'pt-BR': 'Automação: workflows e execuções' },
  'dash.tile.sec.posture': { en: 'Open vulnerabilities by severity', 'pt-BR': 'Vulnerabilidades abertas por severidade' },
  'dash.tile.rum.scorecard': { en: 'Real-user experience by application', 'pt-BR': 'Experiência de usuários reais por aplicação' },
  'dash.tile.proc.technologies': { en: 'Technologies discovered', 'pt-BR': 'Tecnologias descobertas' },
  'dash.name': { en: 'Name of the dashboard', 'pt-BR': 'Nome do dashboard' },
  'dash.defaultName': { en: 'Value of the PoC', 'pt-BR': 'Valor da PoC' },
  'dash.defaultNameNamed': { en: 'Value of the PoC — {customer}', 'pt-BR': 'Valor da PoC — {customer}' },
  'dash.shared': {
    en: 'Let every user of this environment open it (read-only). Unchecked, only you can.',
    'pt-BR': 'Permitir que todos os usuários deste ambiente o abram (somente leitura). Desmarcado, só você.',
  },
  'dash.exists': { en: 'Created: “{name}”, on {at}.', 'pt-BR': 'Criado: “{name}”, em {at}.' },
  'dash.open': { en: 'Open the dashboard', 'pt-BR': 'Abrir o dashboard' },
  'dash.create': { en: 'Create on the tenant', 'pt-BR': 'Criar na tenant' },
  'dash.update': { en: 'Update the dashboard', 'pt-BR': 'Atualizar o dashboard' },
  'dash.createNew': { en: 'Create a new one', 'pt-BR': 'Criar um novo' },
  'dash.busy': { en: 'Writing the dashboard…', 'pt-BR': 'Gravando o dashboard…' },
  'dash.confirm.title': { en: 'Create the dashboard on this tenant?', 'pt-BR': 'Criar o dashboard nesta tenant?' },
  'dash.confirm.private': { en: 'It will be yours and private.', 'pt-BR': 'Ele será seu e privado.' },
  'dash.confirm.shared': { en: 'It will be yours, readable by every user of this environment.', 'pt-BR': 'Ele será seu, legível por todos os usuários deste ambiente.' },
  'dash.confirm.go': { en: 'Create', 'pt-BR': 'Criar' },
  'dash.confirm.cancel': { en: 'Cancel', 'pt-BR': 'Cancelar' },
  'dash.done.created': { en: 'Dashboard created', 'pt-BR': 'Dashboard criado' },
  'dash.done.updated': { en: 'Dashboard updated', 'pt-BR': 'Dashboard atualizado' },
  'dash.done.body': {
    en: 'Its reference is kept with the PoC, so the next update replaces the same document.',
    'pt-BR': 'A referência fica guardada com a PoC, então a próxima atualização substitui o mesmo documento.',
  },
  'dash.failed.title': { en: 'The dashboard was not written', 'pt-BR': 'O dashboard não foi gravado' },
  'dash.failed.forbidden': {
    en: 'This identity may not write documents on the tenant (scope document:documents:write). An administrator may need to approve it.',
    'pt-BR': 'Esta identidade não pode gravar documentos na tenant (escopo document:documents:write). Um administrador pode precisar aprová-lo.',
  },
  'dash.failed.missing': {
    en: 'The dashboard no longer exists or is not yours. Create a new one.',
    'pt-BR': 'O dashboard não existe mais ou não é seu. Crie um novo.',
  },
  'dash.failed.conflict': { en: 'Someone changed the dashboard meanwhile. Try again.', 'pt-BR': 'Alguém alterou o dashboard nesse meio-tempo. Tente de novo.' },
  'dash.failed.error': { en: 'The document service did not accept it. Try again in a moment.', 'pt-BR': 'O serviço de documentos não aceitou. Tente de novo em instantes.' },
  'dash.intro': {
    en: '{engagement}. Read live from this environment by PoC Automation 3.0; created on {at}. Every tile is a validated query of the app catalog.',
    'pt-BR': '{engagement}. Lido ao vivo deste ambiente pelo PoC Automation 3.0; criado em {at}. Cada bloco é uma consulta validada do catálogo do app.',
  },
  'dash.noEngagement': { en: 'Proof of concept', 'pt-BR': 'Prova de conceito' },
  'dash.objectives': { en: 'Objectives agreed', 'pt-BR': 'Objetivos combinados' },
  'dash.footer': {
    en: 'Generated by PoC Automation 3.0. No licensing, consumption or price is shown.',
    'pt-BR': 'Gerado pelo PoC Automation 3.0. Nenhum licenciamento, consumo ou preço é mostrado.',
  },

  // ------------------------------------------------------------------ PoC Timeline
  'tl.plan.title': { en: 'Set the start date of the PoC', 'pt-BR': 'Informe a data de início da PoC' },
  'tl.plan.body': {
    en: 'With a start date in Settings → PoC plan, this page rebuilds Day 0 from Grail, compares the first days with the latest and judges the agreed objectives.',
    'pt-BR': 'Com a data de início em Configurações → Plano da PoC, esta página reconstrói o Dia 0 a partir do Grail, compara os primeiros dias com os mais recentes e julga os objetivos combinados.',
  },
  'tl.plan.futureTitle': { en: 'The PoC has not started yet', 'pt-BR': 'A PoC ainda não começou' },
  'tl.plan.futureBody': {
    en: 'Its start date is in the future: the baseline is read from that day on.',
    'pt-BR': 'A data de início está no futuro: a linha de base é lida a partir desse dia.',
  },
  'tl.plan.open': { en: 'Open the PoC plan', 'pt-BR': 'Abrir o plano da PoC' },
  'tl.track.title': { en: 'The PoC, day by day', 'pt-BR': 'A PoC, dia a dia' },
  'tl.track.lead': { en: 'Day {day} of the PoC, which started on {start}.', 'pt-BR': 'Dia {day} da PoC, que começou em {start}.' },
  'tl.track.notStarted': { en: 'The PoC has not started yet.', 'pt-BR': 'A PoC ainda não começou.' },
  'tl.track.aria': { en: 'Timeline of the PoC, today is day {day}', 'pt-BR': 'Linha do tempo da PoC, hoje é o dia {day}' },
  'tl.track.kickoff': { en: 'Kick-off', 'pt-BR': 'Kick-off' },
  'tl.track.firstRoot': { en: 'First root cause', 'pt-BR': 'Primeira causa raiz' },
  'tl.track.today': { en: 'Today', 'pt-BR': 'Hoje' },
  'tl.track.todayDay': { en: 'Today · day {day}', 'pt-BR': 'Hoje · dia {day}' },
  'tl.track.end': { en: 'Planned end', 'pt-BR': 'Fim previsto' },
  'tl.track.clamped': {
    en: 'The start date is older than the read window: the comparisons read from {from}.',
    'pt-BR': 'A data de início é anterior à janela de leitura: as comparações leem a partir de {from}.',
  },
  'tl.base.title': { en: 'Day 0 → today', 'pt-BR': 'Dia 0 → hoje' },
  'tl.base.body': {
    en: 'What was monitored on the first day of the PoC ({day0}), read again from the entity model, against what is monitored today.',
    'pt-BR': 'O que era monitorado no primeiro dia da PoC ({day0}), lido de novo do modelo de entidades, contra o que é monitorado hoje.',
  },
  'tl.base.hosts': { en: 'Hosts', 'pt-BR': 'Hosts' },
  'tl.base.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'tl.base.processes': { en: 'Process instances', 'pt-BR': 'Instâncias de processo' },
  'tl.base.workloads': { en: 'Kubernetes workloads', 'pt-BR': 'Workloads do Kubernetes' },
  'tl.base.webApps': { en: 'Web applications', 'pt-BR': 'Aplicações web' },
  'tl.base.synthetic': { en: 'Synthetic monitors', 'pt-BR': 'Monitores sintéticos' },
  'tl.base.caption': { en: 'Day 0: {day0} · change {delta}', 'pt-BR': 'Dia 0: {day0} · variação {delta}' },
  'tl.base.noHistory': { en: 'Day 0: no history kept by the tenant', 'pt-BR': 'Dia 0: sem histórico guardado pela tenant' },
  'tl.base.provenance': {
    en: 'Day 0 is reconstructed from Grail for {day0}; entities whose history the tenant no longer keeps are absent from it.',
    'pt-BR': 'O Dia 0 é reconstruído do Grail para {day0}; entidades cujo histórico a tenant não guarda mais ficam de fora.',
  },
  'tl.weeks.title': { en: 'First days × latest days', 'pt-BR': 'Primeiros dias × dias mais recentes' },
  'tl.weeks.body': {
    en: 'The problems that began in the first {days} days of the PoC against those of its latest {days} complete days (today is partial and left out).',
    'pt-BR': 'Os problemas que começaram nos primeiros {days} dias da PoC contra os dos últimos {days} dias completos (hoje é parcial e fica de fora).',
  },
  'tl.weeks.tooEarly': {
    en: 'Four complete days are needed to compare the start of the PoC with its latest days.',
    'pt-BR': 'São precisos quatro dias completos para comparar o início da PoC com os dias mais recentes.',
  },
  'tl.weeks.perDay': { en: 'Problems per day, latest days', 'pt-BR': 'Problemas por dia, dias mais recentes' },
  'tl.weeks.perDayCaption': { en: 'First days: {first} per day · change {change}', 'pt-BR': 'Primeiros dias: {first} por dia · variação {change}' },
  'tl.weeks.perDayCalc': {
    en: 'Problems that began in the latest {days} complete days ÷ {days}.',
    'pt-BR': 'Problemas que começaram nos últimos {days} dias completos ÷ {days}.',
  },
  'tl.weeks.mttr': { en: 'Mean time to resolve, latest days', 'pt-BR': 'Tempo médio de resolução, dias mais recentes' },
  'tl.weeks.mttrCaption': { en: 'First days: {first} · change {change}', 'pt-BR': 'Primeiros dias: {first} · variação {change}' },
  'tl.weeks.mttrCalc': {
    en: 'Total time to resolve of the problems that began in the {days}-day period and closed ÷ how many closed.',
    'pt-BR': 'Tempo total de resolução dos problemas que começaram no período de {days} dias e fecharam ÷ quantos fecharam.',
  },
  'tl.weeks.chart': { en: 'Problems that began each day of the PoC', 'pt-BR': 'Problemas que começaram em cada dia da PoC' },
  'tl.weeks.chartCaption': {
    en: 'From {from}. A day with no problem counts as zero; today is partial.',
    'pt-BR': 'A partir de {from}. Um dia sem problema conta como zero; hoje é parcial.',
  },

  // ------------------------------------------------------------------ Value & ROI: measured MTTR
  'roi.measured.title': { en: 'MTTR measured during the PoC', 'pt-BR': 'MTTR medido durante a PoC' },
  'roi.measured.body': {
    en: 'Measured, not estimated: the problems that began in the first {days} days of the PoC and closed, against those of its latest {days} complete days.',
    'pt-BR': 'Medido, não estimado: os problemas que começaram nos primeiros {days} dias da PoC e fecharam, contra os dos últimos {days} dias completos.',
  },
  'roi.measured.noStart': {
    en: 'Set the start date of the PoC in Settings → PoC plan and its first days are compared with its latest here.',
    'pt-BR': 'Informe a data de início da PoC em Configurações → Plano da PoC e os primeiros dias são comparados aqui com os mais recentes.',
  },
  'roi.measured.first': { en: 'First {days} days', 'pt-BR': 'Primeiros {days} dias' },
  'roi.measured.latest': { en: 'Latest {days} days', 'pt-BR': 'Últimos {days} dias' },
  'roi.measured.closed': { en: '{count} {count|problem|problems} closed', 'pt-BR': '{count} {count|problema fechado|problemas fechados}' },
  'roi.measured.faster': { en: '{pct}% faster than at the start', 'pt-BR': '{pct}% mais rápido que no início' },
  'roi.measured.slower': { en: '{pct}% slower than at the start', 'pt-BR': '{pct}% mais lento que no início' },
  'roi.measured.same': { en: 'The same as at the start', 'pt-BR': 'O mesmo que no início' },

  // ------------------------------------------------------------------ incident stories
  'story.title': { en: 'Incident stories', 'pt-BR': 'Histórias de incidente' },
  'story.body': {
    en: 'The three most telling incidents of the window, from detection to root cause, and what an automation would have done.',
    'pt-BR': 'Os três incidentes mais marcantes da janela, da detecção à causa raiz, e o que uma automação teria feito.',
  },
  'story.detected': { en: 'Dynatrace Intelligence detected it on {at}.', 'pt-BR': 'A Dynatrace Intelligence o detectou em {at}.' },
  'story.detected.unknown': { en: 'Detected by Dynatrace Intelligence.', 'pt-BR': 'Detectado pela Dynatrace Intelligence.' },
  'story.root': { en: 'Root cause named: {name}.', 'pt-BR': 'Causa raiz apontada: {name}.' },
  'story.root.none': { en: 'No root cause was attached.', 'pt-BR': 'Nenhuma causa raiz foi anexada.' },
  'story.root.itsCause': { en: 'its cause', 'pt-BR': 'a sua causa' },
  'story.duration': { en: 'It lasted {duration}.', 'pt-BR': 'Durou {duration}.' },
  'story.duration.open': { en: 'Open for {duration} and counting.', 'pt-BR': 'Aberto há {duration}, ainda em curso.' },
  'story.duration.unknown': { en: 'Its duration was not recorded.', 'pt-BR': 'A duração não foi registrada.' },
  'story.affected': { en: '{count} {count|entity|entities} affected: {names}.', 'pt-BR': '{count} {count|entidade afetada|entidades afetadas}: {names}.' },
  'story.affected.none': { en: 'No affected entity was recorded.', 'pt-BR': 'Nenhuma entidade afetada foi registrada.' },
  'story.namespaces': { en: 'Kubernetes namespace: {names}.', 'pt-BR': 'Namespace do Kubernetes: {names}.' },
  'story.suggestion': { en: 'Automation (suggestion)', 'pt-BR': 'Automação (sugestão)' },
  'story.play.availability': {
    en: 'A workflow restarts or scales {root} and opens the ticket with the root cause attached.',
    'pt-BR': 'Um workflow reinicia ou escala {root} e abre o chamado já com a causa raiz anexada.',
  },
  'story.play.error': {
    en: 'A workflow opens the incident with the root cause and the error trail, and notifies the owner of {root}.',
    'pt-BR': 'Um workflow abre o incidente com a causa raiz e a trilha de erros, e avisa o dono de {root}.',
  },
  'story.play.slowdown': {
    en: 'A workflow compares {root} with its previous release and proposes a rollback or more capacity.',
    'pt-BR': 'Um workflow compara {root} com a versão anterior e propõe rollback ou mais capacidade.',
  },
  'story.play.resource': {
    en: 'A workflow raises the limits of {root} or moves load, before saturation becomes an outage.',
    'pt-BR': 'Um workflow ajusta os limites de {root} ou move carga, antes que a saturação vire indisponibilidade.',
  },
  'story.play.custom': {
    en: 'A workflow routes the alert on {root} to the team that owns it, with the context Dynatrace Intelligence gathered.',
    'pt-BR': 'Um workflow encaminha o alerta de {root} ao time responsável, com o contexto que a Dynatrace Intelligence reuniu.',
  },
  'story.play.generic': {
    en: 'A workflow opens the ticket with the root cause, {root}, and the affected entities already in it.',
    'pt-BR': 'Um workflow abre o chamado já com a causa raiz, {root}, e as entidades afetadas.',
  },

  // ------------------------------------------------------------------ security fix queue
  'fix.title': { en: 'The five fixes to make first', 'pt-BR': 'As cinco correções a fazer primeiro' },
  'fix.body': {
    en: 'Ordered by what Dynatrace Intelligence says to act on now (an exploit exists, it is reachable from the internet, the vulnerable function is in use), then by score — with what to upgrade, where it runs and who answers for it.',
    'pt-BR': 'Na ordem do que a Dynatrace Intelligence indica agir agora (existe exploit, é alcançável pela internet, a função vulnerável está em uso), depois pela nota — com o que atualizar, onde roda e quem responde.',
  },
  'fix.actNow': { en: 'Dynatrace Intelligence: act now', 'pt-BR': 'Dynatrace Intelligence: agir agora' },
  'fix.component': { en: 'Upgrade', 'pt-BR': 'Atualizar' },
  'fix.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'fix.workloads': { en: 'Workloads', 'pt-BR': 'Workloads' },
  'fix.entities': { en: 'Affected entities', 'pt-BR': 'Entidades afetadas' },
  'fix.owner': { en: 'Owner (tag)', 'pt-BR': 'Dono (tag)' },
  'fix.namespace': { en: 'Namespace (no owner tag)', 'pt-BR': 'Namespace (sem tag de dono)' },
  'fix.noOwner': { en: 'Not identified', 'pt-BR': 'Não identificado' },
  'fix.unknown': { en: 'Not reported by the platform', 'pt-BR': 'Não informado pela plataforma' },
  'fix.source': {
    en: 'Component, services and workloads: sec.context; owner: the owner or team tags of the services (svc.owners), else their Kubernetes namespace.',
    'pt-BR': 'Componente, serviços e workloads: sec.context; dono: as tags de dono ou time dos serviços (svc.owners), senão o namespace do Kubernetes.',
  },
  'fix.noContext': {
    en: 'The context query did not answer: the queue shows each vulnerability without its component and services.',
    'pt-BR': 'A consulta de contexto não respondeu: a fila mostra cada vulnerabilidade sem o componente e os serviços.',
  },

  // ------------------------------------------------------------------ consumption and projection (SE only)
  'cons.f.title': { en: 'Consumption by capability, and where it is heading', 'pt-BR': 'Consumo por capacidade, e para onde vai' },
  'cons.f.projection': { en: 'Projection', 'pt-BR': 'Projeção' },
  'cons.f.body': {
    en: "Daily billed usage over the last 30 days, in each capability's own unit, from the platform's billing usage events. The projection needs {days} complete days.",
    'pt-BR': 'Uso faturado por dia nos últimos 30 dias, na unidade de cada capacidade, a partir dos eventos de uso de faturamento da plataforma. A projeção precisa de {days} dias completos.',
  },
  'cons.f.h.capability': { en: 'Capability', 'pt-BR': 'Capacidade' },
  'cons.f.h.trend': { en: '30 days', 'pt-BR': '30 dias' },
  'cons.f.h.avg': { en: 'Per day (last 7)', 'pt-BR': 'Por dia (últimos 7)' },
  'cons.f.h.change': { en: 'Trend', 'pt-BR': 'Tendência' },
  'cons.f.h.next30': { en: 'Next 30 days', 'pt-BR': 'Próximos 30 dias' },
  'cons.f.h.next365': { en: 'Next 12 months', 'pt-BR': 'Próximos 12 meses' },
  'cons.f.sparkLabel': { en: 'Daily usage of {capability}, last 30 days', 'pt-BR': 'Uso diário de {capability}, últimos 30 dias' },
  'cons.f.empty': { en: 'No usage event recorded in the window.', 'pt-BR': 'Nenhum evento de uso registrado na janela.' },
  'cons.f.assumptionsTitle': { en: 'How the projection is made', 'pt-BR': 'Como a projeção é feita' },
  'cons.f.assumptions': {
    en: 'A straight line through the complete days (today is partial and left out), rolled forward; no seasonality, no contract terms, no price. Volume only: a price needs the rate card, with its date, and stays with the SE.',
    'pt-BR': 'Uma reta pelos dias completos (hoje é parcial e fica de fora), estendida adiante; sem sazonalidade, sem termos de contrato, sem preço. Só volume: preço exige a tabela de preços, com data, e fica com o SE.',
  },
  'cons.unit.gibHours': { en: 'GiB-hours of memory', 'pt-BR': 'GiB-hora de memória' },
  'cons.unit.hostHours': { en: 'host-hours', 'pt-BR': 'host-hora' },
  'cons.unit.podHours': { en: 'pod-hours', 'pt-BR': 'pod-hora' },
  'cons.unit.containerHours': { en: 'container-hours', 'pt-BR': 'container-hora' },
  'cons.unit.sessions': { en: 'sessions', 'pt-BR': 'sessões' },
  'cons.unit.requests': { en: 'monitor requests', 'pt-BR': 'requisições de monitor' },
  'cons.unit.actions': { en: 'synthetic actions', 'pt-BR': 'ações sintéticas' },
  'cons.unit.invocations': { en: 'invocations', 'pt-BR': 'invocações' },
  'cons.unit.dataPoints': { en: 'data points', 'pt-BR': 'pontos de dados' },
  'cons.unit.bytes': { en: 'bytes', 'pt-BR': 'bytes' },
  'cons.unit.bytesRetained': { en: 'bytes held (daily average)', 'pt-BR': 'bytes retidos (média do dia)' },
  'cons.unit.events': { en: 'usage units', 'pt-BR': 'unidades de uso' },
  'cons.unit.gibDays': { en: '{value} GiB-days', 'pt-BR': '{value} GiB-dia' },

  // ------------------------------------------------------------------ assumptions registry
  'assumption.windows.pocMaxDays': { en: 'Furthest a "since the start of the PoC" read goes back', 'pt-BR': 'Até onde volta uma leitura “desde o início da PoC”' },
  'assumption.windows.pocMaxDays.basis': {
    en: 'Bounds what a forgotten or very old start date can cost; an older start reads from this many days ago and says so.',
    'pt-BR': 'Limita o custo de uma data de início esquecida ou muito antiga; um início mais antigo lê a partir desses dias atrás e diz isso.',
  },
  'assumption.windows.pocCompareDays': { en: 'Length of the first and latest periods compared', 'pt-BR': 'Tamanho dos períodos inicial e mais recente comparados' },
  'assumption.windows.pocCompareDays.basis': {
    en: 'A working week on each side; before fourteen complete days, half of the complete days each, never overlapping.',
    'pt-BR': 'Uma semana de trabalho de cada lado; antes de catorze dias completos, metade dos dias completos para cada um, sem sobreposição.',
  },
  'assumption.windows.projectionMinDays': { en: 'Complete days a consumption projection needs', 'pt-BR': 'Dias completos que uma projeção de consumo exige' },
  'assumption.windows.projectionMinDays.basis': {
    en: 'Fewer days fit a line to noise. The projection is a straight line with no seasonality, labelled as a projection, volume only.',
    'pt-BR': 'Com menos dias a reta se ajusta a ruído. A projeção é uma reta sem sazonalidade, rotulada como projeção, só volume.',
  },

  // ------------------------------------------------------------------ what's new
  'help.whatsNew.i30': {
    en: '3.2.5 — The PoC plan in Settings: start and end dates and the success criteria agreed with the customer, judged live on the PoC Timeline, in the report and in the deck.',
    'pt-BR': '3.2.5 — O plano da PoC em Configurações: datas de início e fim e os critérios de sucesso combinados com o cliente, julgados ao vivo na PoC Timeline, no relatório e no deck.',
  },
  'help.whatsNew.i31': {
    en: '3.2.5 — The PoC Timeline rebuilds Day 0 from Grail and compares the first days with the latest; Value & ROI shows the MTTR measured during the PoC; AIOps tells the three most telling incidents as stories; Security lists the five fixes to make first, with component, services and owner.',
    'pt-BR': '3.2.5 — A PoC Timeline reconstrói o Dia 0 a partir do Grail e compara os primeiros dias com os mais recentes; Valor e ROI mostra o MTTR medido durante a PoC; AIOps conta os três incidentes mais marcantes como histórias; Segurança lista as cinco correções a fazer primeiro, com componente, serviços e dono.',
  },
  'help.whatsNew.i32': {
    en: '3.2.5 — For the SE: a "Value of the PoC" dashboard created on the tenant by one click (never on its own), and consumption by capability with a labelled projection, behind "Commercial data".',
    'pt-BR': '3.2.5 — Para o SE: um dashboard “Valor da PoC” criado na tenant com um clique (nunca sozinho), e o consumo por capacidade com uma projeção rotulada, atrás de “Dados comerciais”.',
  },
} as const satisfies Record<string, Entry>;
