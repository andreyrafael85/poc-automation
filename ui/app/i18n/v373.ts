import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.3 (the owner: "Seguir com a 3.7.3, porém valide estes pontos antes da 3.7.2"; "Tudo na
 * 3.7.3"): the dashboards named right and the SLO tiles found, the notebook sized as his copy, the Experience dashboard
 * with its pulse and the main SLOs, two new dashboards (Kubernetes and containers; Databases and dependencies), the
 * Dynatrace Assist AI task in the triage workflow, the operational cost from problems with a root cause only, the capacity
 * per host redrawn, and HTTP monitors created from the customer's URLs. Merged in `strings.ts`.
 */

export const v373Strings = {
  // ------------------------------------------------------------------ the triage workflow's AI task
  'builder.wf.aiTask': {
    en: 'Dynatrace Assist: a short reading of the problem by the platform’s generative AI',
    'pt-BR': 'Dynatrace Assist: uma leitura curta do problema pela IA generativa da plataforma',
  },
  'builder.wf.aiPrompt': {
    en: 'You are Dynatrace Assist. Read the problem triage below and write at most six short lines for the operations team: what happened, the most likely root cause, who or what is affected, and the first action to take. Use only the facts given; do not invent figures. Answer in English, in Markdown: up to six short bullet points, each starting with “- ”, with no emoji and no heading, and add no note about language or support.',
    'pt-BR': 'Você é o Dynatrace Assist. Leia a triagem do problema abaixo e escreva no máximo seis linhas curtas para o time de operação: o que aconteceu, a causa raiz mais provável, quem ou o que foi afetado e a primeira ação a tomar. Use só os fatos fornecidos; não invente números. Responda em português do Brasil, em Markdown: até seis tópicos curtos, cada um começando com “- ”, sem emoji e sem título, e não acrescente observações sobre idioma ou suporte.',
  },
  'builder.wf.aiHeading': { en: '### Dynatrace Assist — reading by AI', 'pt-BR': '### Dynatrace Assist — leitura por IA' },

  // ------------------------------------------------------------------ the Experience dashboard (pulse and main SLOs)
  'dash3.section.experience.slos': { en: '🎯 {n}. Main SLOs', 'pt-BR': '🎯 {n}. SLOs principais' },
  'dash3.section.experience.pulse': { en: '💓 {n}. The pulse of real users', 'pt-BR': '💓 {n}. O pulso dos usuários reais' },
  'dash2.tile.exp.sessionsTotal': { en: '👥 Sessions of real users', 'pt-BR': '👥 Sessões de usuários reais' },
  'dash2.tile.exp.sessionsChange': { en: '📈 Sessions against the week before (%)', 'pt-BR': '📈 Sessões contra a semana anterior (%)' },
  'dash2.tile.exp.satisfiedPct': { en: '😊 Satisfied actions (%)', 'pt-BR': '😊 Ações satisfeitas (%)' },
  'dash2.tile.exp.frustratedPct': { en: '😣 Frustrated actions (%)', 'pt-BR': '😣 Ações frustradas (%)' },
  'dash2.tile.exp.errorRatePct': { en: '⚠️ Requests with an error (%)', 'pt-BR': '⚠️ Requisições com erro (%)' },
  'dash2.tile.exp.lcpMs': { en: '⏱️ Largest contentful paint p75 (ms)', 'pt-BR': '⏱️ Maior renderização de conteúdo p75 (ms)' },
  'dash2.tile.exp.funnel': { en: '🔻 From the action to a satisfied experience, per application', 'pt-BR': '🔻 Da ação à experiência satisfeita, por aplicação' },

  // ------------------------------------------------------------------ the Kubernetes dashboard
  'dash3.kubernetes.name': { en: 'Kubernetes and containers', 'pt-BR': 'Kubernetes e containers' },
  'dash3.kubernetes.audience': { en: 'For platform and Kubernetes teams', 'pt-BR': 'Para os times de plataforma e Kubernetes' },
  'dash3.kubernetes.question': {
    en: 'Which workloads use most CPU, memory and network, which restart, and where the clusters are under pressure?',
    'pt-BR': 'Quais workloads usam mais CPU, memória e rede, quais reiniciam e onde os clusters estão sob pressão?',
  },
  'dash3.section.kubernetes.pulse': { en: '☸️ {n}. Pulse of the clusters', 'pt-BR': '☸️ {n}. Pulso dos clusters' },
  'dash3.section.kubernetes.usage': { en: '📦 {n}. CPU and memory by workload', 'pt-BR': '📦 {n}. CPU e memória por workload' },
  'dash3.section.kubernetes.network': { en: '🌐 {n}. Network', 'pt-BR': '🌐 {n}. Rede' },
  'dash3.section.kubernetes.stability': { en: '🔄 {n}. Restarts and pressure', 'pt-BR': '🔄 {n}. Reinícios e pressão' },
  'dash2.tile.k8s.clusters': { en: '☸️ Clusters reporting', 'pt-BR': '☸️ Clusters reportando' },
  'dash2.tile.k8s.namespaces': { en: '🗂️ Kubernetes namespaces', 'pt-BR': '🗂️ Namespaces do Kubernetes' },
  'dash2.tile.k8s.workloads': { en: '📦 Workloads running', 'pt-BR': '📦 Workloads em execução' },
  'dash2.tile.k8s.cpuByWorkload': { en: '🔥 CPU — the ten busiest workloads (millicores)', 'pt-BR': '🔥 CPU — os dez workloads mais ocupados (milicores)' },
  'dash2.tile.k8s.memByWorkload': { en: '🧠 Memory — the ten largest workloads (working set)', 'pt-BR': '🧠 Memória — os dez maiores workloads (working set)' },
  'dash2.tile.k8s.byKind': { en: '🍩 CPU by workload kind', 'pt-BR': '🍩 CPU por tipo de workload' },
  'dash2.tile.k8s.networkRx': { en: '⬇️ Network received — the ten largest workloads', 'pt-BR': '⬇️ Rede recebida — os dez maiores workloads' },
  'dash2.tile.k8s.networkTx': { en: '⬆️ Network sent — the ten largest workloads', 'pt-BR': '⬆️ Rede enviada — os dez maiores workloads' },

  // ------------------------------------------------------------------ the Databases dashboard
  'dash3.database.name': { en: 'Databases and dependencies', 'pt-BR': 'Bancos de dados e dependências' },
  'dash3.database.audience': { en: 'For DBAs, developers and SRE', 'pt-BR': 'Para DBAs, desenvolvimento e SRE' },
  'dash3.database.question': {
    en: 'Which databases are called most, which are slow or failing, and which services depend on each one?',
    'pt-BR': 'Quais bancos são mais chamados, quais estão lentos ou falhando e quais serviços dependem de cada um?',
  },
  'dash3.section.database.health': { en: '🗄️ {n}. Health of the databases', 'pt-BR': '🗄️ {n}. Saúde dos bancos' },
  'dash3.section.database.traffic': { en: '📈 {n}. Calls', 'pt-BR': '📈 {n}. Chamadas' },
  'dash3.section.database.latency': { en: '⏱️ {n}. Response time', 'pt-BR': '⏱️ {n}. Tempo de resposta' },
  'dash3.section.database.failures': { en: '⚠️ {n}. Failures', 'pt-BR': '⚠️ {n}. Falhas' },
  'dash3.section.database.consumers': { en: '🔗 {n}. Who depends on each database', 'pt-BR': '🔗 {n}. Quem depende de cada banco' },
  'dash2.tile.db.health': { en: '⬢ Databases — health by active problem', 'pt-BR': '⬢ Bancos — saúde pelo problema ativo' },
  'dash2.tile.db.calls': { en: '📞 Database calls', 'pt-BR': '📞 Chamadas aos bancos' },
  'dash2.tile.db.failurePct': { en: '⚠️ Failing calls (%)', 'pt-BR': '⚠️ Chamadas com falha (%)' },
  'dash2.tile.db.p90Ms': { en: '⏱️ Response time p90 (ms)', 'pt-BR': '⏱️ Tempo de resposta p90 (ms)' },
  'dash2.tile.db.callsTop': { en: '📊 The databases called most', 'pt-BR': '📊 Os bancos mais chamados' },
  'dash2.tile.db.callsTrend': { en: '📈 Calls per database over time', 'pt-BR': '📈 Chamadas por banco ao longo do tempo' },
  'dash2.tile.db.latencyTop': { en: '🐢 The slowest databases (p90, ms)', 'pt-BR': '🐢 Os bancos mais lentos (p90, ms)' },
  'dash2.tile.db.latencyTrend': { en: '⏱️ Response time p90 per database (ms)', 'pt-BR': '⏱️ Tempo de resposta p90 por banco (ms)' },
  'dash2.tile.db.failuresTop': { en: '⚠️ The databases failing most (%)', 'pt-BR': '⚠️ Os bancos com mais falhas (%)' },
  'dash2.tile.db.failuresTrend': { en: '📉 Failures per database over time', 'pt-BR': '📉 Falhas por banco ao longo do tempo' },
  'dash2.tile.db.table': { en: '📋 Each database: calls, failures, mean and p99 (ms)', 'pt-BR': '📋 Cada banco: chamadas, falhas, média e p99 (ms)' },
  'dash2.tile.db.callers': { en: '🔗 The services that call each database', 'pt-BR': '🔗 Os serviços que chamam cada banco' },

  // ------------------------------------------------------------------ capacity as a map (Infrastructure)
  'p.infra.capmap.cpu': { en: 'CPU', 'pt-BR': 'CPU' },
  'p.infra.capmap.memory': { en: 'Memory', 'pt-BR': 'Memória' },
  'p.infra.capmap.more': { en: 'Show {count} more', 'pt-BR': 'Mostrar mais {count}' },
  'p.infra.capmap.less': { en: 'Show fewer', 'pt-BR': 'Mostrar menos' },
  'p.infra.capmap.reading': { en: 'Peak CPU {cpu}, peak memory {memory}', 'pt-BR': 'Pico de CPU {cpu}, pico de memória {memory}' },

  // ------------------------------------------------------------------ the customer's address and the HTTP monitors
  'settings.customer.url': { en: 'Customer’s main web address', 'pt-BR': 'Endereço web principal do cliente' },
  'settings.customer.urlPlaceholder': { en: 'https://www.example.com', 'pt-BR': 'https://www.exemplo.com.br' },
  'settings.customer.urlInvalid': { en: 'Only an https address is kept (for example https://www.example.com).', 'pt-BR': 'Só um endereço https é guardado (por exemplo https://www.exemplo.com.br).' },
  'builder.mon.title': { en: 'HTTP monitors of the customer’s addresses', 'pt-BR': 'Monitores HTTP dos endereços do cliente' },
  'builder.mon.what': {
    en: 'A synthetic HTTP monitor per address: a GET from a public location, on a schedule, alerting when the address is down everywhere. The main address comes from Settings → Customer & engagement; add others below.',
    'pt-BR': 'Um monitor sintético HTTP por endereço: um GET a partir de um local público, numa frequência, alertando quando o endereço cai em todos os locais. O endereço principal vem de Configurações → Cliente e engajamento; acrescente outros abaixo.',
  },
  'builder.mon.main': { en: 'Main address (Settings)', 'pt-BR': 'Endereço principal (Configurações)' },
  'builder.mon.noMain': { en: 'Not given yet — add it in Settings → Customer & engagement.', 'pt-BR': 'Ainda não informado — cadastre em Configurações → Cliente e engajamento.' },
  'builder.mon.extra': { en: 'Other addresses (https, separated by commas)', 'pt-BR': 'Outros endereços (https, separados por vírgula)' },
  'builder.mon.invalid': { en: 'Left out, not an https address: {list}', 'pt-BR': 'Deixado de fora, não é um endereço https: {list}' },
  'builder.mon.urlPlaceholder': { en: 'https://shop.example.com, https://api.example.com', 'pt-BR': 'https://loja.exemplo.com.br, https://api.exemplo.com.br' },
  'builder.mon.location': { en: 'Runs from', 'pt-BR': 'Executa a partir de' },
  'builder.mon.loadingLocations': { en: 'Reading the public locations…', 'pt-BR': 'Lendo os locais públicos…' },
  'builder.mon.noLocations': { en: 'No public location could be read here.', 'pt-BR': 'Nenhum local público pôde ser lido aqui.' },
  'builder.mon.frequency': { en: 'Frequency', 'pt-BR': 'Frequência' },
  'builder.mon.every': { en: 'Every {minutes} min', 'pt-BR': 'A cada {minutes} min' },
  'builder.mon.existing': { en: '{n} monitor(s) of this PoC already on the environment (see the Register).', 'pt-BR': '{n} monitor(es) desta PoC já no ambiente (veja o Registro).' },
  'builder.mon.create': { en: 'Create {n} HTTP monitor(s)', 'pt-BR': 'Criar {n} monitor(es) HTTP' },
  'builder.mon.confirm.title': { en: 'Create {n} HTTP monitor(s) on this environment?', 'pt-BR': 'Criar {n} monitor(es) HTTP neste ambiente?' },
  'builder.mon.confirm.body': {
    en: 'Each monitor runs every {minutes} minutes from the chosen location, and every run is synthetic consumption on this environment. The clean-up at the end of the PoC removes them.',
    'pt-BR': 'Cada monitor roda a cada {minutes} minutos a partir do local escolhido, e cada execução é consumo de sintético neste ambiente. A limpeza do fim da PoC os remove.',
  },
  'builder.mon.name': { en: '{host} — HTTP (PoC of {customer})', 'pt-BR': '{host} — HTTP (PoC de {customer})' },
  'builder.mon.description': { en: 'Created by PoC Automation 3.0 (PoC Builder).', 'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder).' },
  'builder.ledger.monitor': { en: 'HTTP monitor · {name}', 'pt-BR': 'Monitor HTTP · {name}' },

  // ------------------------------------------------------------------ the catalog (the cost basis)
  'catalog.purpose.prob.exposure.rca': {
    en: 'Open problems with a root cause named by Dynatrace Intelligence and the time they have accumulated while open — the basis of the cost per hour of an open problem.',
    'pt-BR': 'Problemas abertos com a causa raiz apontada pela Dynatrace Intelligence e o tempo que acumularam abertos — a base do custo por hora de problema aberto.',
  },
  'catalog.purpose.prob.mttx.rca': {
    en: 'Resolved problems with a root cause named by Dynatrace Intelligence, per category, with their total time — the basis of the cost of resolved problem time and of downtime.',
    'pt-BR': 'Problemas resolvidos com a causa raiz apontada pela Dynatrace Intelligence, por categoria, com o tempo total — a base do custo do tempo de problema resolvido e da indisponibilidade.',
  },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i115': {
    en: '3.7.3 — More to build, and figures that hold. Two new dashboards (Kubernetes and containers; Databases and dependencies), the Experience dashboard with the pulse of real users and the main SLOs, every dashboard keeping its own name and every SLO tile finding its SLO, the notebook sized to read, HTTP monitors of the customer’s addresses on one click, and a triage e-mail that opens with Dynatrace Assist’s reading by AI. The operational cost now counts only problems whose root cause Dynatrace Intelligence named, and Infrastructure shows capacity against usage as a compact map.',
    'pt-BR': '3.7.3 — Mais para construir, e números que se sustentam. Dois dashboards novos (Kubernetes e containers; Bancos de dados e dependências), o dashboard de Experiência com o pulso dos usuários reais e os SLOs principais, cada dashboard com o seu próprio nome e cada tile de SLO encontrando o seu SLO, o notebook no tamanho certo para ler, monitores HTTP dos endereços do cliente num clique e um e-mail de triagem que abre com a leitura do Dynatrace Assist por IA. O custo operacional agora conta só problemas com a causa raiz apontada pela Dynatrace Intelligence, e a Infraestrutura mostra a capacidade contra o uso num mapa compacto.',
  },
} satisfies Record<string, Entry>;
