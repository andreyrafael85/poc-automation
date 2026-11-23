import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.4 — the three specialty dashboards (SRE/DevOps, Cloud & Infra, Business
 * analytics & experience), deployed by the SE from Settings beside "Value of the PoC". Tile titles
 * reuse the `dash2.tile.<key>` family. Merged in `strings.ts`.
 */

export const v334DashStrings = {
  'dash3.title': { en: 'Specialty dashboards', 'pt-BR': 'Dashboards por especialidade' },
  'dash3.body': {
    en: 'Three more dashboards you can deploy on this environment for the teams that will live with the platform. Each one reads the same validated queries as the app, and only what this environment proves gets a section. Nothing is created until you confirm.',
    'pt-BR': 'Mais três dashboards que você pode implantar neste ambiente para os times que vão conviver com a plataforma. Cada um lê as mesmas consultas validadas do app, e só ganha seção o que este ambiente comprova. Nada é criado antes da sua confirmação.',
  },
  'dash3.sections': { en: 'Sections: {sections}', 'pt-BR': 'Seções: {sections}' },
  'dash3.create': { en: 'Create this dashboard', 'pt-BR': 'Criar este dashboard' },

  'dash3.sre.name': { en: 'Operations and reliability', 'pt-BR': 'Operação e confiabilidade' },
  'dash3.sre.audience': { en: 'For SRE and DevOps', 'pt-BR': 'Para SRE e DevOps' },
  'dash3.sre.question': {
    en: 'What needs attention now, when problems happen, who gets paged and what can already be automated.',
    'pt-BR': 'O que pede atenção agora, quando os problemas acontecem, quem é acionado e o que já dá para automatizar.',
  },
  'dash3.infra.name': { en: 'Infrastructure and cloud', 'pt-BR': 'Infraestrutura e nuvem' },
  'dash3.infra.audience': { en: 'For cloud and infrastructure engineers', 'pt-BR': 'Para engenheiros de nuvem e infraestrutura' },
  'dash3.infra.question': {
    en: 'Where the estate is tight, what Kubernetes is going through, and what fills up first — CPU, memory, disk and network.',
    'pt-BR': 'Onde o ambiente está apertado, o que o Kubernetes está passando e o que enche primeiro — CPU, memória, disco e rede.',
  },
  'dash3.experience.name': { en: 'Digital experience and business', 'pt-BR': 'Experiência digital e negócio' },
  'dash3.experience.audience': { en: 'For business analytics and user experience', 'pt-BR': 'Para análise de negócio e experiência do usuário' },
  'dash3.experience.question': {
    en: 'Who used the applications, what they experienced, which monitors watch them, and what it means for the business.',
    'pt-BR': 'Quem usou as aplicações, o que viveu, quais monitores as observam e o que isso significa para o negócio.',
  },
  'dash3.defaultName': { en: '{dashboard} — {customer}', 'pt-BR': '{dashboard} — {customer}' },
  'dash3.footer': {
    en: 'Created by PoC Automation 3.0. Every tile reads live from this environment over the dashboard’s window; the queries are the app’s own, validated before use.',
    'pt-BR': 'Criado pelo PoC Automation 3.0. Cada tile lê ao vivo deste ambiente na janela do dashboard; as consultas são as do próprio app, validadas antes do uso.',
  },

  // ------------------------------------------------------------------ sections
  'dash3.section.sre.pulse': { en: '🚦 {n}. Pulse', 'pt-BR': '🚦 {n}. Pulso' },
  'dash3.section.sre.problems': { en: '🧠 {n}. Problems and Dynatrace Intelligence', 'pt-BR': '🧠 {n}. Problemas e Dynatrace Intelligence' },
  'dash3.section.sre.rca': { en: '🔍 {n}. Root cause', 'pt-BR': '🔍 {n}. Causa raiz' },
  'dash3.section.sre.services': { en: '⚡ {n}. Services and dependencies', 'pt-BR': '⚡ {n}. Serviços e dependências' },
  'dash3.section.sre.logs': { en: '📜 {n}. Logs', 'pt-BR': '📜 {n}. Logs' },
  'dash3.section.sre.automation': { en: '🤖 {n}. Automation', 'pt-BR': '🤖 {n}. Automação' },
  'dash3.section.infra.estate': { en: '🗺️ {n}. The estate', 'pt-BR': '🗺️ {n}. O parque' },
  'dash3.section.infra.saturation': { en: '🌡️ {n}. Saturation: CPU, memory, disk', 'pt-BR': '🌡️ {n}. Saturação: CPU, memória, disco' },
  'dash3.section.infra.network': { en: '🌐 {n}. Network', 'pt-BR': '🌐 {n}. Rede' },
  'dash3.section.infra.kubernetes': { en: '☸️ {n}. Kubernetes', 'pt-BR': '☸️ {n}. Kubernetes' },
  'dash3.section.infra.problems': { en: '🔥 {n}. Where the infrastructure breaks', 'pt-BR': '🔥 {n}. Onde a infraestrutura quebra' },
  'dash3.section.infra.data': { en: '📦 {n}. Data of the estate', 'pt-BR': '📦 {n}. Dados do ambiente' },
  'dash3.section.experience.audience': { en: '👥 {n}. Audience', 'pt-BR': '👥 {n}. Público' },
  'dash3.section.experience.health': { en: '💚 {n}. Application health and Core Web Vitals', 'pt-BR': '💚 {n}. Saúde das aplicações e Core Web Vitals' },
  'dash3.section.experience.journeys': { en: '🧭 {n}. Journeys', 'pt-BR': '🧭 {n}. Jornadas' },
  'dash3.section.experience.synthetic': { en: '🧪 {n}. Synthetic monitoring', 'pt-BR': '🧪 {n}. Monitoramento sintético' },
  'dash3.section.experience.business': { en: '🏷️ {n}. Business events', 'pt-BR': '🏷️ {n}. Eventos de negócio' },
  'dash3.section.experience.backend': { en: '🔗 {n}. The back end behind the screens', 'pt-BR': '🔗 {n}. O back-end por trás das telas' },

  // ------------------------------------------------------------------ tiles
  'dash2.tile.sre.successPct': { en: '✅ Requests that succeeded (%)', 'pt-BR': '✅ Requisições bem-sucedidas (%)' },
  'dash2.tile.sre.problemsByHour': { en: '🕐 When problems start (hour of day, UTC)', 'pt-BR': '🕐 A que horas os problemas começam (hora do dia, UTC)' },
  'dash2.tile.sre.recurringPatterns': { en: '🔁 Recurring patterns', 'pt-BR': '🔁 Padrões recorrentes' },
  'dash2.tile.sre.automationCandidates': { en: '🤖 Candidates for automation', 'pt-BR': '🤖 Candidatos à automação' },
  'dash2.tile.sre.worstPattern': { en: '📈 Occurrences of the most frequent pattern', 'pt-BR': '📈 Ocorrências do padrão mais frequente' },
  'dash2.tile.sre.recurring': { en: '🔁 Recurring problems by root cause', 'pt-BR': '🔁 Problemas recorrentes por causa raiz' },
  'dash2.tile.sre.rootCausePct': { en: '🎯 Problems with a named root cause (%)', 'pt-BR': '🎯 Problemas com causa raiz apontada (%)' },
  'dash2.tile.sre.rcaTrend': { en: '🔍 Root-cause analysis over time', 'pt-BR': '🔍 Análise de causa raiz ao longo do tempo' },
  'dash2.tile.sre.rcaMix': { en: '🧩 Root causes by category', 'pt-BR': '🧩 Causas raiz por categoria' },
  'dash2.tile.sre.calls': { en: '🔗 Who calls whom', 'pt-BR': '🔗 Quem chama quem' },
  'dash2.tile.sre.logTrend': { en: '📜 Log ingest over time', 'pt-BR': '📜 Ingestão de logs ao longo do tempo' },
  'dash2.tile.sre.logQuality': { en: '🧾 Log quality and context', 'pt-BR': '🧾 Qualidade e contexto dos logs' },
  'dash2.tile.sre.failingWorkflows': { en: '⚠️ Workflows that fail first', 'pt-BR': '⚠️ Workflows que falham primeiro' },
  'dash2.tile.infra.cloudHosts': { en: '☁️ Hosts per cloud', 'pt-BR': '☁️ Hosts por nuvem' },
  'dash2.tile.infra.hostClasses': { en: '🖥️ Hosts by monitoring mode', 'pt-BR': '🖥️ Hosts por modo de monitoramento' },
  'dash2.tile.infra.cloudServices': { en: '🧩 Managed cloud services in view', 'pt-BR': '🧩 Serviços gerenciados de nuvem em observação' },
  'dash2.tile.infra.capacityClasses': { en: '📏 Hosts by capacity class', 'pt-BR': '📏 Hosts por classe de capacidade' },
  'dash2.tile.infra.cpuTop': { en: '🔥 CPU — the 10 busiest hosts', 'pt-BR': '🔥 CPU — os 10 hosts mais ocupados' },
  'dash2.tile.infra.memoryTop': { en: '🧠 Memory — the 10 fullest hosts', 'pt-BR': '🧠 Memória — os 10 hosts mais cheios' },
  'dash2.tile.infra.diskTop': { en: '💽 Disk — the 10 fullest hosts', 'pt-BR': '💽 Disco — os 10 hosts mais cheios' },
  'dash2.tile.infra.capacity': { en: '📋 Capacity against usage, per host', 'pt-BR': '📋 Capacidade contra uso, por host' },
  'dash2.tile.infra.network': { en: '🌐 Network traffic — received and sent', 'pt-BR': '🌐 Tráfego de rede — recebido e enviado' },
  'dash2.tile.infra.restartsTotal': { en: '🔄 Container restarts', 'pt-BR': '🔄 Reinícios de contêiner' },
  'dash2.tile.infra.oomKills': { en: '💥 Out-of-memory kills', 'pt-BR': '💥 Encerramentos por falta de memória' },
  'dash2.tile.infra.restartingWorkloads': { en: '📦 Workloads that restarted', 'pt-BR': '📦 Workloads que reiniciaram' },
  'dash2.tile.infra.restartsTrend': { en: '🔄 Restarts over time', 'pt-BR': '🔄 Reinícios ao longo do tempo' },
  'dash2.tile.infra.pressure': { en: '🌡️ Workloads under pressure', 'pt-BR': '🌡️ Workloads sob pressão' },
  'dash2.tile.infra.k8sInventory': { en: '☸️ Kubernetes inventory', 'pt-BR': '☸️ Inventário do Kubernetes' },
  'dash2.tile.infra.logBuckets': { en: '📦 Log buckets: retention and volume', 'pt-BR': '📦 Buckets de logs: retenção e volume' },
  'dash2.tile.exp.sessions': { en: '👥 Sessions by user type', 'pt-BR': '👥 Sessões por tipo de usuário' },
  'dash2.tile.exp.audience': { en: '🌎 Audience: browsers, systems, regions', 'pt-BR': '🌎 Público: navegadores, sistemas, regiões' },
  'dash2.tile.exp.dailyRum': { en: '📅 Real-user activity per day', 'pt-BR': '📅 Atividade de usuários reais por dia' },
  'dash2.tile.exp.appFlow': { en: '🧭 From the application to the service', 'pt-BR': '🧭 Da aplicação ao serviço' },
  'dash2.tile.exp.browserMonitors': { en: '🧪 Browser monitors — availability (%)', 'pt-BR': '🧪 Monitores de navegador — disponibilidade (%)' },
  'dash2.tile.exp.httpMonitors': { en: '🌐 HTTP monitors — availability (%)', 'pt-BR': '🌐 Monitores HTTP — disponibilidade (%)' },
  'dash2.tile.exp.bizTotal': { en: '🏷️ Business events', 'pt-BR': '🏷️ Eventos de negócio' },
  'dash2.tile.exp.bizTypes': { en: '🗂️ Business event types', 'pt-BR': '🗂️ Tipos de evento de negócio' },
  'dash2.tile.exp.bizEvents': { en: '📊 Business events by type', 'pt-BR': '📊 Eventos de negócio por tipo' },

  // ------------------------------------------------------------------ What's new (3.3.4)
  'help.whatsNew.i52': {
    en: '3.3.4 — Settings → PoC plan: three specialty dashboards you can deploy beside “Value of the PoC” — Operations and reliability (SRE/DevOps: pulse, when problems start, recurring patterns, root cause, services, logs, automation), Infrastructure and cloud (saturation of CPU, memory and disk, network, Kubernetes, where the infrastructure breaks) and Digital experience and business (audience, Core Web Vitals, journeys, synthetic monitors, business events). Each is created only on your click, with the app’s validated queries.',
    'pt-BR': '3.3.4 — Configurações → Plano da PoC: três dashboards por especialidade, para implantar ao lado do “Valor da PoC” — Operação e confiabilidade (SRE/DevOps: pulso, a que horas os problemas começam, padrões recorrentes, causa raiz, serviços, logs, automação), Infraestrutura e nuvem (saturação de CPU, memória e disco, rede, Kubernetes, onde a infraestrutura quebra) e Experiência digital e negócio (público, Core Web Vitals, jornadas, monitores sintéticos, eventos de negócio). Cada um só é criado no seu clique, com as consultas validadas do app.',
  },
  'help.whatsNew.i53': {
    en: '3.3.4 — Every dependency updated to a version with no known vulnerability (react-router 7, vitest 5, dt-app 1.20): the security scan of the code repository reads zero.',
    'pt-BR': '3.3.4 — Todas as dependências foram atualizadas para versões sem vulnerabilidade conhecida (react-router 7, vitest 5, dt-app 1.20): a varredura de segurança do repositório de código fica zerada.',
  },
} satisfies Record<string, Entry>;
