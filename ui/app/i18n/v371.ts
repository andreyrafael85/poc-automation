import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.1 (the owner: "Seguir com a 3.7.1, porém valide estes pontos antes"): the PoC Builder's
 * dashboards enriched after his examples (services overview, infrastructure and capacity, log analytics, vulnerability
 * tracker), with coloured section banners; the new "Environment overview and SLOs" dashboard in place of "Value of the PoC";
 * the notebook with charts, the launchpad fixed, the items open from the Builder; the triage workflow on and its e-mail in
 * sections. Merged in `strings.ts`.
 */

export const v371Strings = {
  // ------------------------------------------------------------------ the overview dashboard
  // 3.7.7 (the owner: "o termo 'visão' é ruim"): renamed from "Visão geral do ambiente e SLOs" / "Environment overview and SLOs".
  'dash3.overview.name': { en: 'Environment health and SLOs', 'pt-BR': 'Saúde do ambiente e SLOs' },
  'dash3.overview.audience': { en: 'For the PoC sponsors and every team', 'pt-BR': 'Para os patrocinadores da PoC e todos os times' },
  'dash3.overview.question': {
    en: 'Are the objectives being met — the SLOs, the pulse of services and hosts, Kubernetes, the latest log errors and security — on one page?',
    'pt-BR': 'Os objetivos estão sendo cumpridos — os SLOs, o pulso de serviços e hosts, o Kubernetes, os erros de log mais recentes e a segurança — numa página só?',
  },
  'dash3.sloNone': {
    en: 'The SLOs appear here once they are created in the PoC Builder (tab “SLOs and workflow”). Update this dashboard after creating them.',
    'pt-BR': 'Os SLOs aparecem aqui assim que forem criados no PoC Builder (guia “SLOs e workflow”). Atualize este dashboard depois de criá-los.',
  },
  'dash3.section.overview.slos': { en: '🎯 {n}. Service-level objectives', 'pt-BR': '🎯 {n}. Objetivos de nível de serviço (SLOs)' },
  'dash3.section.overview.pulse': { en: '🚦 {n}. Pulse', 'pt-BR': '🚦 {n}. Pulso' },
  'dash3.section.overview.health': { en: '⬢ {n}. Health of services and hosts', 'pt-BR': '⬢ {n}. Saúde de serviços e hosts' },
  'dash3.section.overview.services': { en: '⚡ {n}. Services', 'pt-BR': '⚡ {n}. Serviços' },
  'dash3.section.overview.estate': { en: '🌡️ {n}. CPU, memory and disk', 'pt-BR': '🌡️ {n}. CPU, memória e disco' },
  'dash3.section.overview.kubernetes': { en: '☸️ {n}. Kubernetes', 'pt-BR': '☸️ {n}. Kubernetes' },
  'dash3.section.overview.logs': { en: '📜 {n}. Latest log errors', 'pt-BR': '📜 {n}. Erros de log mais recentes' },
  'dash3.section.overview.security': { en: '🛡️ {n}. Security', 'pt-BR': '🛡️ {n}. Segurança' },

  // ------------------------------------------------------------------ new sections of the specialty dashboards
  'dash3.section.sre.health': { en: '⬢ {n}. Service health', 'pt-BR': '⬢ {n}. Saúde dos serviços' },
  'dash3.section.infra.inventory': { en: '🧭 {n}. Inventory and monitoring', 'pt-BR': '🧭 {n}. Inventário e monitoramento' },
  'dash3.section.security.distribution': { en: '📊 {n}. By severity and technology', 'pt-BR': '📊 {n}. Por severidade e tecnologia' },
  'dash3.section.security.technology': { en: '🧩 {n}. Technologies and versions in use', 'pt-BR': '🧩 {n}. Tecnologias e versões em uso' },
  'dash3.section.logs.status': { en: '🚥 {n}. Records by level', 'pt-BR': '🚥 {n}. Registros por nível' },
  'dash3.section.logs.patterns': { en: '🔎 {n}. Error patterns for troubleshooting', 'pt-BR': '🔎 {n}. Padrões de erro para troubleshooting' },
  'dash3.section.logs.sources': { en: '🧾 {n}. Sources and context', 'pt-BR': '🧾 {n}. Fontes e contexto' },

  // ------------------------------------------------------------------ new tiles
  'dash2.tile.serviceHealth': { en: '⬢ Services — health by failure rate', 'pt-BR': '⬢ Serviços — saúde pela taxa de falha' },
  'dash2.tile.hostHealth': { en: '⬢ Hosts — health by CPU and memory', 'pt-BR': '⬢ Hosts — saúde por CPU e memória' },
  'dash2.tile.p50': { en: '⏱️ Response time p50 (ms)', 'pt-BR': '⏱️ Tempo de resposta p50 (ms)' },
  'dash2.tile.p90': { en: '⏱️ Response time p90 (ms)', 'pt-BR': '⏱️ Tempo de resposta p90 (ms)' },
  'dash2.tile.p99': { en: '⏱️ Response time p99 (ms)', 'pt-BR': '⏱️ Tempo de resposta p99 (ms)' },
  'dash2.tile.serviceThroughput': { en: '📈 Requests per service', 'pt-BR': '📈 Requisições por serviço' },
  'dash2.tile.serviceFailureRate': { en: '📉 Failure rate per service (%)', 'pt-BR': '📉 Taxa de falha por serviço (%)' },
  'dash2.tile.processCpu': { en: '⚙️ CPU of the busiest processes', 'pt-BR': '⚙️ CPU dos processos mais ocupados' },
  'dash2.tile.hostInventory': { en: '🧭 Hosts: OS, cloud, mode and size', 'pt-BR': '🧭 Hosts: SO, nuvem, modo e tamanho' },
  'dash2.tile.monitoringTypes': { en: '🧩 Hosts by monitoring mode', 'pt-BR': '🧩 Hosts por modo de monitoramento' },
  'dash2.tile.cpuTable': { en: '🌡️ CPU use per host (%)', 'pt-BR': '🌡️ Uso de CPU por host (%)' },
  'dash2.tile.memoryTable': { en: '🧠 Memory use per host (%)', 'pt-BR': '🧠 Uso de memória por host (%)' },
  'dash2.tile.diskTable': { en: '💽 Disk use per host and disk (%)', 'pt-BR': '💽 Uso de disco por host e disco (%)' },
  'dash2.tile.networkTable': { en: '🌐 Network traffic per host', 'pt-BR': '🌐 Tráfego de rede por host' },
  'dash2.tile.secCritical': { en: '🔴 Critical', 'pt-BR': '🔴 Críticas' },
  'dash2.tile.secHigh': { en: '🟠 High', 'pt-BR': '🟠 Altas' },
  'dash2.tile.secByLevel': { en: '🍩 Open vulnerabilities by severity', 'pt-BR': '🍩 Vulnerabilidades abertas por severidade' },
  'dash2.tile.secByTechnology': { en: '📊 Open vulnerabilities by technology', 'pt-BR': '📊 Vulnerabilidades abertas por tecnologia' },
  'dash2.tile.techVersions': { en: '🧩 Technologies and versions of the running processes', 'pt-BR': '🧩 Tecnologias e versões dos processos em execução' },
  'dash2.tile.logMonthly': { en: '🗓️ Logs ingested per month (GiB)', 'pt-BR': '🗓️ Logs ingeridos por mês (GiB)' },
  'dash2.tile.logStatusTrend': { en: '🚥 Records by level over time (1:100 sample)', 'pt-BR': '🚥 Registros por nível ao longo do tempo (amostra 1:100)' },
  'dash2.tile.logTracePct': { en: '🔗 Records with a trace (%, 1:100 sample)', 'pt-BR': '🔗 Registros com trace (%, amostra 1:100)' },
  'dash2.tile.logServicePct': { en: '⚡ Records with a service (%, 1:100 sample)', 'pt-BR': '⚡ Registros com serviço (%, amostra 1:100)' },
  'dash2.tile.logPatterns': { en: '🔎 Error patterns, most recent first (numbers and ids grouped)', 'pt-BR': '🔎 Padrões de erro, mais recentes primeiro (números e ids agrupados)' },
  'dash2.tile.logExceptions': { en: '💥 Exceptions in the messages (1:100 sample)', 'pt-BR': '💥 Exceções nas mensagens (amostra 1:100)' },
  'dash2.tile.logHiddenErrors': { en: '🕵️ Errors written without an ERROR level (1:100 sample)', 'pt-BR': '🕵️ Erros escritos sem o nível ERROR (amostra 1:100)' },
  'dash2.tile.logSources': { en: '🧾 Sources sending logs (1:100 sample)', 'pt-BR': '🧾 Fontes que enviam logs (amostra 1:100)' },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i113': {
    en: '3.7.1 — Dashboards worth presenting. The PoC Builder’s dashboards gain coloured section banners in the Dynatrace style and much more content: health maps, percentiles and throughput for SRE; inventory, monitoring modes and coloured CPU, memory and disk tables for infrastructure; volume per month, levels, error patterns and hidden errors for logs; severity, technology and versions for security. A new “Environment overview and SLOs” dashboard shows the SLOs created in the Builder on the platform’s own SLO tiles. The notebook comes with charts, the launchpad opens without errors, every created item opens from the Builder, and the triage workflow comes with its trigger on and an e-mail in sections.',
    'pt-BR': '3.7.1 — Dashboards prontos para apresentar. Os dashboards do PoC Builder ganham faixas coloridas por seção no estilo Dynatrace e muito mais conteúdo: mapas de saúde, percentis e vazão para SRE; inventário, modos de monitoramento e tabelas coloridas de CPU, memória e disco para infraestrutura; volume por mês, níveis, padrões de erro e erros escondidos para logs; severidade, tecnologia e versões para segurança. Um novo dashboard “Visão geral do ambiente e SLOs” mostra os SLOs criados no Builder nos tiles de SLO da própria plataforma. O notebook já vem com gráficos, o launchpad abre sem erro, todo item criado abre direto do Builder e o workflow de triagem já vem com o gatilho ligado e um e-mail em seções.',
  },
} satisfies Record<string, Entry>;
