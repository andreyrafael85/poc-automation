import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.3 — strings of wave V4 ("Value Spectrum" on every page) and of the data
 * fixes that came with it. Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment
 * silently overrides a key defined by another.
 */

export const v323Strings = {
  // ------------------------------------------------------------------ Spectrum charts
  'chart.peak': { en: 'Peak {value} at {time}', 'pt-BR': 'Pico de {value} em {time}' },
  'chart.summary': {
    en: '{bins} points from {from} to {to}; peak {peak} at {time}; last {last}.',
    'pt-BR': '{bins} pontos de {from} a {to}; pico de {peak} em {time}; último {last}.',
  },
  'chart.stat.total': { en: 'Total in the window', 'pt-BR': 'Total na janela' },
  'chart.stat.mean': { en: 'Average', 'pt-BR': 'Média' },
  'chart.stat.peak': { en: 'Peak', 'pt-BR': 'Pico' },
  'chart.stat.last': { en: 'Latest', 'pt-BR': 'Mais recente' },
  'chart.gaps': {
    en: 'Gaps are hours the platform reported no value for; they are not zeros.',
    'pt-BR': 'Lacunas são horas sem valor reportado pela plataforma; não são zeros.',
  },
  'chart.empty': {
    en: 'The query answered, but with no data points in the window.',
    'pt-BR': 'A consulta respondeu, mas sem pontos de dados na janela.',
  },

  // ------------------------------------------------------------------ Services: one chart per unit
  'p.svc.chart.requests': { en: 'Requests per hour', 'pt-BR': 'Requisições por hora' },
  'p.svc.chart.requestsCaption': {
    en: 'Every request every service handled, summed per hour.',
    'pt-BR': 'Todas as requisições que os serviços atenderam, somadas por hora.',
  },
  'p.svc.chart.rate': { en: 'Failure rate per hour', 'pt-BR': 'Taxa de falhas por hora' },
  'p.svc.chart.rateCaption': {
    en: 'Failed requests over all requests in each hour.',
    'pt-BR': 'Requisições com falha sobre todas as requisições de cada hora.',
  },
  'p.svc.chart.rateOverall': { en: 'Over the window', 'pt-BR': 'Na janela' },
  'p.svc.chart.time': { en: 'Response time', 'pt-BR': 'Tempo de resposta' },
  'p.svc.chart.timeCaption': {
    en: 'The platform\'s average response time across services, per hour.',
    'pt-BR': 'O tempo médio de resposta entre os serviços, por hora, como a plataforma o reporta.',
  },

  // ------------------------------------------------------------------ Infrastructure
  'p.infra.chart.cpu': { en: 'CPU usage', 'pt-BR': 'Uso de CPU' },
  'p.infra.chart.cpuCaption': {
    en: 'Average CPU usage across the monitored hosts, per hour.',
    'pt-BR': 'Uso médio de CPU entre os hosts monitorados, por hora.',
  },
  'p.infra.chart.memory': { en: 'Memory usage', 'pt-BR': 'Uso de memória' },
  'p.infra.chart.memoryCaption': {
    en: 'Average memory usage across the monitored hosts, per hour.',
    'pt-BR': 'Uso médio de memória entre os hosts monitorados, por hora.',
  },

  // ------------------------------------------------------------------ catalog purposes (3.2.3 queries)
  'catalog.purpose.k8s.inventory': {
    en: 'The Kubernetes estate in one call: clusters, nodes, namespaces, workloads and the pods seen in the window, so the page opens with the size of what is monitored before it shows what restarts.',
    'pt-BR':
      'O ambiente Kubernetes em uma chamada: clusters, nós, namespaces, workloads e os pods vistos na janela, para a página abrir com o tamanho do que é monitorado antes de mostrar o que reinicia.',
  },
  'catalog.purpose.k8s.restarts.trend': {
    en: 'Container restarts and out-of-memory kills per hour across every workload, so the page shows when the platform restarts, not only which workload restarts most.',
    'pt-BR':
      'Reinícios de contêiner e encerramentos por falta de memória por hora em todos os workloads, para a página mostrar quando a plataforma reinicia, não só qual workload reinicia mais.',
  },
  'catalog.purpose.svc.topology.calls': {
    en: 'Who calls what, from the Smartscape call relationships of every service: the calls between service types and into each database vendor and messaging system, with how many services sit on each side. Measured edges, not a drawn hierarchy.',
    'pt-BR':
      'Quem chama o quê, a partir das relações de chamada do Smartscape de todos os serviços: as chamadas entre tipos de serviço e para cada fornecedor de banco de dados e sistema de mensageria, com quantos serviços há de cada lado. Ligações medidas, não uma hierarquia desenhada.',
  },
  'catalog.purpose.log.ingest.trend': {
    en: "Log bytes ingested per hour, read from the platform's own billing usage events, so the page shows the rhythm of ingestion and not only its total. Volume only: no price is applied.",
    'pt-BR':
      'Bytes de log ingeridos por hora, lidos dos próprios eventos de uso da plataforma, para a página mostrar o ritmo da ingestão e não só o total. Só volume: nenhum preço é aplicado.',
  },
  'catalog.purpose.auto.trend': {
    en: 'Finished workflow executions per hour, split into succeeded and failed, so a failure that repeats on a schedule shows as a steady band rather than one number.',
    'pt-BR':
      'Execuções de workflow concluídas por hora, separadas entre sucesso e falha, para uma falha que se repete por agendamento aparecer como uma faixa constante, e não como um número só.',
  },
  'catalog.purpose.auto.failing': {
    en: 'The workflows that fail, worst first: failed executions, all executions and the failure rate of each, and when it last failed. A ranked list; the totals come from auto.workflows.total.',
    'pt-BR':
      'Os workflows que falham, do pior para o melhor: execuções com falha, todas as execuções, a taxa de falha de cada um e quando falhou pela última vez. Uma lista ordenada; os totais vêm de auto.workflows.total.',
  },

  // ------------------------------------------------------------------ service types
  'svctype.webRequest': { en: 'Web request services', 'pt-BR': 'Serviços de requisição web' },
  'svctype.web': { en: 'Web services', 'pt-BR': 'Web services' },
  'svctype.database': { en: 'Databases', 'pt-BR': 'Bancos de dados' },
  'svctype.messaging': { en: 'Messaging', 'pt-BR': 'Mensageria' },
  'svctype.queueListener': { en: 'Queue listeners', 'pt-BR': 'Consumidores de fila' },
  'svctype.custom': { en: 'Custom services', 'pt-BR': 'Serviços personalizados' },
  'svctype.remoteCall': { en: 'Remote calls', 'pt-BR': 'Chamadas remotas' },
  'svctype.rmi': { en: 'RMI services', 'pt-BR': 'Serviços RMI' },
  'svctype.unified': { en: 'Unified services', 'pt-BR': 'Serviços unificados' },

  // ------------------------------------------------------------------ Topology: who calls what
  'p.topo.calls.title': { en: 'Who calls what', 'pt-BR': 'Quem chama quem' },
  'p.topo.calls.subtitle': {
    en: 'The call relationships Smartscape recorded between your services, grouped by kind of service and by database vendor. Every link is a measured call relationship; nothing here was drawn by hand.',
    'pt-BR':
      'As relações de chamada que o Smartscape registrou entre os seus serviços, agrupadas por tipo de serviço e por fornecedor de banco de dados. Cada ligação é uma relação de chamada medida; nada aqui foi desenhado à mão.',
  },
  'p.topo.calls.coverage': {
    en: '{calls} of {services} services make calls the platform recorded.',
    'pt-BR': '{calls} de {services} serviços fazem chamadas que a plataforma registrou.',
  },
  'p.topo.calls.col.callers': { en: 'Who calls', 'pt-BR': 'Quem chama' },
  'p.topo.calls.col.callees': { en: 'What is called', 'pt-BR': 'O que é chamado' },
  'p.topo.calls.unit': { en: 'services', 'pt-BR': 'serviços' },
  'p.topo.calls.unit.one': { en: 'service', 'pt-BR': 'serviço' },
  'p.topo.calls.callerAria': { en: '{name}: {count} services that call others', 'pt-BR': '{name}: {count} serviços que chamam outros' },
  'p.topo.calls.calleeAria': { en: '{name}: {count} services called', 'pt-BR': '{name}: {count} serviços chamados' },
  'p.topo.calls.aria': {
    en: 'Measured call relationships between service types and database vendors',
    'pt-BR': 'Relações de chamada medidas entre tipos de serviço e fornecedores de banco',
  },
  'p.topo.calls.legend.link': {
    en: 'A link is a call relationship Smartscape measured between services of those kinds.',
    'pt-BR': 'Uma ligação é uma relação de chamada que o Smartscape mediu entre serviços desses tipos.',
  },
  'p.topo.calls.legend.width': {
    en: 'Its width grows with the number of call relationships (log scale).',
    'pt-BR': 'A espessura cresce com o número de relações de chamada (escala logarítmica).',
  },
  'p.topo.calls.legend.count': {
    en: 'The number on a node counts distinct services on that side.',
    'pt-BR': 'O número de cada nó conta serviços distintos daquele lado.',
  },
  'p.topo.calls.none': {
    en: 'The entity model reports no call relationships between services in this window.',
    'pt-BR': 'O modelo de entidades não reporta relações de chamada entre serviços nesta janela.',
  },
  'p.topo.calls.dbNoVendor': { en: 'Database (vendor not reported)', 'pt-BR': 'Banco de dados (fornecedor não reportado)' },
  'p.topo.calls.dbUndeclared': { en: 'Database (vendor not declared by the agent)', 'pt-BR': 'Banco de dados (fornecedor não declarado pelo agente)' },
  'p.topo.comp.title': { en: 'What the services are made of', 'pt-BR': 'Do que os serviços são feitos' },
  'p.topo.comp.subtitle': {
    en: 'The most common service types, technologies, databases and public domains, each counted over every service.',
    'pt-BR': 'Os tipos de serviço, tecnologias, bancos e domínios públicos mais comuns, cada um contado sobre todos os serviços.',
  },

  // ------------------------------------------------------------------ RCA trail as a flow map
  'p.rca.trail.col.problem': { en: 'Problem', 'pt-BR': 'Problema' },
  'p.rca.trail.durationUnit': { en: 'duration', 'pt-BR': 'de duração' },
  'p.rca.trail.rootUnit': { en: 'root cause', 'pt-BR': 'causa raiz' },
  'p.rca.trail.affectedUnit': { en: 'affected', 'pt-BR': 'afetado' },
  'p.rca.trail.moreName': { en: 'Other affected entities', 'pt-BR': 'Outras entidades afetadas' },
  'p.rca.trail.problemAria': { en: 'Problem {id}, {name}, lasted {duration}', 'pt-BR': 'Problema {id}, {name}, durou {duration}' },
  'p.rca.trail.rootAria': { en: 'Root cause: {name} ({kind})', 'pt-BR': 'Causa raiz: {name} ({kind})' },
  'p.rca.trail.affectedAria': { en: 'Affected: {name} ({kind})', 'pt-BR': 'Afetada: {name} ({kind})' },
  'p.rca.trail.legend.links': {
    en: 'Every node and link is what Dynatrace Intelligence attached to the problem: its root cause and the entities it affected. It is a picture of the analysis, not a trace of calls.',
    'pt-BR': 'Cada nó e ligação é o que a Dynatrace Intelligence associou ao problema: a causa raiz e as entidades afetadas. É o retrato da análise, não um rastro de chamadas.',
  },
  'p.rca.trail.legend.root': {
    en: 'The raised node is the root cause; the trail starts there.',
    'pt-BR': 'O nó em destaque é a causa raiz; a trilha começa nele.',
  },
  'p.rca.kind.service': { en: 'Service', 'pt-BR': 'Serviço' },
  'p.rca.kind.application': { en: 'Application', 'pt-BR': 'Aplicação' },
  'p.rca.kind.host': { en: 'Host', 'pt-BR': 'Host' },
  'p.rca.kind.process': { en: 'Process', 'pt-BR': 'Processo' },
  'p.rca.kind.synthetic': { en: 'Synthetic monitor', 'pt-BR': 'Monitor sintético' },
  'p.rca.kind.workload': { en: 'Workload', 'pt-BR': 'Workload' },
  'p.rca.kind.kubernetes': { en: 'Kubernetes', 'pt-BR': 'Kubernetes' },
  'p.rca.kind.entity': { en: 'Entity', 'pt-BR': 'Entidade' },
  'p.rca.kpi.sparkDays': {
    en: 'Daily trend of {metric}, complete days only',
    'pt-BR': 'Tendência diária de {metric}, só dias completos',
  },
  'p.rca.mttr.title': { en: 'How long problems take to close', 'pt-BR': 'Quanto tempo os problemas levam para fechar' },
  'p.rca.mttr.subtitle': {
    en: 'Median and 90th percentile of resolution time per category, problems closed in the last 7 days.',
    'pt-BR': 'Mediana e percentil 90 do tempo de resolução por categoria, problemas fechados nos últimos 7 dias.',
  },
  'p.rca.mttr.row': { en: 'median {median} · p90 {p90} · {count} closed', 'pt-BR': 'mediana {median} · p90 {p90} · {count} fechados' },
  'p.rca.mttr.aria': { en: 'Median resolution time per category', 'pt-BR': 'Tempo mediano de resolução por categoria' },
  'p.rca.assist.s.logsRecent': {
    en: '{errors} error logs in {ns} over the last 6 hours: the namespace of this incident is still logging errors.',
    'pt-BR': '{errors} logs de erro em {ns} nas últimas 6 horas: o namespace deste incidente ainda registra erros.',
  },

  // ------------------------------------------------------------------ Kubernetes
  'p.k8s.inv.title': { en: 'The Kubernetes estate', 'pt-BR': 'O ambiente Kubernetes' },
  'p.k8s.inv.clusters': { en: 'Clusters', 'pt-BR': 'Clusters' },
  'p.k8s.inv.nodes': { en: 'Nodes', 'pt-BR': 'Nós' },
  'p.k8s.inv.namespaces': { en: 'Namespaces', 'pt-BR': 'Namespaces' },
  'p.k8s.inv.workloads': { en: 'Workloads', 'pt-BR': 'Workloads' },
  'p.k8s.inv.pods': { en: 'Pods seen', 'pt-BR': 'Pods vistos' },
  'p.k8s.inv.podsDetail': {
    en: 'Existed in the window; not how many run now.',
    'pt-BR': 'Existiram na janela; não é quantos rodam agora.',
  },
  'p.k8s.trend.title': { en: 'When the platform restarts', 'pt-BR': 'Quando a plataforma reinicia' },
  'p.k8s.trend.restarts': { en: 'Container restarts per hour', 'pt-BR': 'Reinícios de contêiner por hora' },
  'p.k8s.trend.restartsCaption': { en: 'Across every workload.', 'pt-BR': 'Em todos os workloads.' },
  'p.k8s.trend.oom': { en: 'Out-of-memory kills per hour', 'pt-BR': 'Encerramentos por falta de memória por hora' },
  'p.k8s.trend.oomCaption': {
    en: 'Containers the kernel stopped for exceeding their memory limit.',
    'pt-BR': 'Contêineres que o kernel encerrou por passar do limite de memória.',
  },
  'p.k8s.h.throttlePct': { en: 'CPU throttled (of limit)', 'pt-BR': 'CPU limitada (do limite)' },
  'p.k8s.throttle.noLimit': { en: '{mc} mCPU (no limit set)', 'pt-BR': '{mc} mCPU (sem limite definido)' },

  // ------------------------------------------------------------------ Services: health
  'p.svc.band.none': { en: 'No failures', 'pt-BR': 'Sem falhas' },
  'p.svc.band.under': { en: 'Under 1%', 'pt-BR': 'Abaixo de 1%' },
  'p.svc.band.review': { en: '1% to 5%', 'pt-BR': 'De 1% a 5%' },
  'p.svc.band.high': { en: '5% or more', 'pt-BR': '5% ou mais' },
  'p.svc.hive.title': { en: 'The busiest services by failure rate', 'pt-BR': 'Os serviços com mais tráfego, por taxa de falhas' },
  'p.svc.hive.caption': {
    en: 'One hexagon per service, the {shown} with most requests in the window, coloured by the review lines of 1% and 5% failed requests.',
    'pt-BR': 'Um hexágono por serviço, os {shown} com mais requisições na janela, coloridos pelas linhas de revisão de 1% e 5% de requisições com falha.',
  },
  'p.svc.hive.aria': {
    en: 'The {shown} busiest services, coloured by failure rate band',
    'pt-BR': 'Os {shown} serviços com mais tráfego, coloridos pela faixa de taxa de falhas',
  },

  // ------------------------------------------------------------------ Logs
  'p.logs.ctx.title': { en: 'Context per bucket', 'pt-BR': 'Contexto por bucket' },
  'p.logs.ctx.caption': {
    en: 'Every readable log bucket, {window}: the share of each bucket\'s records that carry a service, a host or a Kubernetes namespace.',
    'pt-BR': 'Todos os buckets de log legíveis, {window}: a parcela dos registros de cada bucket com serviço, host ou namespace do Kubernetes.',
  },
  'p.logs.ctx.records': { en: '{count} records', 'pt-BR': '{count} registros' },
  'p.logs.trend.title': { en: 'Ingestion over time', 'pt-BR': 'Ingestão no tempo' },
  'p.logs.trend.ingested': { en: 'Log volume ingested per hour', 'pt-BR': 'Volume de logs ingerido por hora' },
  'p.logs.trend.ingestedCaption': {
    en: 'Bytes the platform billed as log ingestion each hour. Volume only, no price.',
    'pt-BR': 'Bytes que a plataforma contabilizou como ingestão de logs a cada hora. Só volume, sem preço.',
  },

  // ------------------------------------------------------------------ Automation
  'p.auto.ring.label': { en: 'Executions that succeeded', 'pt-BR': 'Execuções com sucesso' },
  'p.auto.ring.caption': { en: 'of {count} finished executions', 'pt-BR': 'de {count} execuções concluídas' },
  'p.auto.ring.aria': { en: 'Share of finished workflow executions that succeeded', 'pt-BR': 'Parcela das execuções de workflow concluídas com sucesso' },
  'p.auto.failing.title': { en: 'Workflows that fail first', 'pt-BR': 'Workflows que mais falham' },
  'p.auto.failing.caption': {
    en: 'Ranked by failed executions in the window; the totals above count every workflow.',
    'pt-BR': 'Ordenados pelas execuções com falha na janela; os totais acima contam todos os workflows.',
  },
  'p.auto.failing.row': { en: '{failed} of {runs} runs failed ({rate}%)', 'pt-BR': '{failed} de {runs} execuções falharam ({rate}%)' },
  'p.auto.failing.none': { en: 'No workflow failed in the window.', 'pt-BR': 'Nenhum workflow falhou na janela.' },
  'p.auto.untitled': { en: 'Untitled workflow', 'pt-BR': 'Workflow sem título' },
  'p.auto.trend.title': { en: 'Executions over time', 'pt-BR': 'Execuções no tempo' },
  'p.auto.trend.succeeded': { en: 'Succeeded per hour', 'pt-BR': 'Com sucesso por hora' },
  'p.auto.trend.failed': { en: 'Failed per hour', 'pt-BR': 'Com falha por hora' },

  // ------------------------------------------------------------------ Security
  'p.sec.act.title': { en: 'Act now', 'pt-BR': 'Agir agora' },
  'p.sec.act.caption': {
    en: 'Open vulnerabilities that meet all three: a public exploit, public exposure and the vulnerable function in use.',
    'pt-BR': 'Vulnerabilidades abertas que atendem aos três: exploit público, exposição pública e a função vulnerável em uso.',
  },
  'p.sec.act.none': {
    en: 'No open vulnerability meets all three criteria at once. Each criterion on its own:',
    'pt-BR': 'Nenhuma vulnerabilidade aberta atende aos três critérios ao mesmo tempo. Cada critério sozinho:',
  },

  // ------------------------------------------------------------------ Value & ROI
  'roi.split.title': { en: 'Where the problem hours went', 'pt-BR': 'Onde foram as horas de problema' },
  'roi.split.caption': {
    en: 'Hours problems stayed open until they closed, per category, {window}. Measured hours; no rate is applied here.',
    'pt-BR': 'Horas em que os problemas ficaram abertos até fechar, por categoria, {window}. Horas medidas; nenhuma taxa é aplicada aqui.',
  },
  'roi.split.aria': { en: 'Problem hours per category: {items}', 'pt-BR': 'Horas de problema por categoria: {items}' },

  // ------------------------------------------------------------------ Executive summary as a story
  'exec.changed.title': { en: 'What changed this week', 'pt-BR': 'O que mudou na semana' },
  'exec.changed.fell': {
    en: 'New problems fell {pct}% in the second half of the week against the first.',
    'pt-BR': 'Os problemas novos caíram {pct}% na segunda metade da semana em relação à primeira.',
  },
  'exec.changed.rose': {
    en: 'New problems rose {pct}% in the second half of the week against the first.',
    'pt-BR': 'Os problemas novos subiram {pct}% na segunda metade da semana em relação à primeira.',
  },
  'exec.changed.stable': {
    en: 'New problems held steady: the two halves of the week differ by {pct}%.',
    'pt-BR': 'Os problemas novos ficaram estáveis: as duas metades da semana diferem {pct}%.',
  },
  'exec.changed.none': {
    en: 'No problem began in the first half of the week, so there is no change to state.',
    'pt-BR': 'Nenhum problema começou na primeira metade da semana, então não há variação a afirmar.',
  },
  'exec.changed.aria': { en: 'Problems that began every 6 hours over 7 days', 'pt-BR': 'Problemas iniciados a cada 6 horas em 7 dias' },
  'exec.changed.caption': {
    en: 'Problems that began every 6 hours, {window}; periods with none count as zero.',
    'pt-BR': 'Problemas iniciados a cada 6 horas, {window}; períodos sem nenhum contam como zero.',
  },
  'exec.next.title': { en: 'Next steps', 'pt-BR': 'Próximos passos' },
  'exec.next.open': { en: 'See the evidence', 'pt-BR': 'Ver a evidência' },

  // ------------------------------------------------------------------ Inventory
  'inv.synthetic.split': { en: '{browser} browser · {http} HTTP', 'pt-BR': '{browser} de navegador · {http} HTTP' },

  // ------------------------------------------------------------------ What's new in 3.2.3
  'help.whatsNew.i22': {
    en: '3.2.3 — Every page now speaks the Value Spectrum: headline cards, tiles, ranked bars, shares and donuts take the family colours and painted numerals of the Overview.',
    'pt-BR': '3.2.3 — Todas as páginas falam o Value Spectrum: cartões de destaque, blocos, barras ordenadas, participações e roscas ganham as cores de família e os números pintados da Visão geral.',
  },
  'help.whatsNew.i23': {
    en: '3.2.3 — Charts are one per unit: on Services, requests, failure rate and response time each have their own axis (the failures no longer read as zero); Infrastructure, Kubernetes, Logs and Automation get the same area charts with the peak marked.',
    'pt-BR': '3.2.3 — Um gráfico por unidade: em Serviços, requisições, taxa de falhas e tempo de resposta têm cada um o seu eixo (as falhas não parecem mais zero); Infraestrutura, Kubernetes, Logs e Automação ganham os mesmos gráficos de área com o pico marcado.',
  },
  'help.whatsNew.i24': {
    en: '3.2.3 — Topology draws “who calls what” from the call relationships Smartscape measured between your services, and the RCA trail (problem → root cause → affected entities) uses the stack map’s grammar.',
    'pt-BR': '3.2.3 — A Topologia desenha “quem chama quem” a partir das relações de chamada que o Smartscape mediu entre os seus serviços, e a trilha da RCA (problema → causa raiz → entidades afetadas) usa a gramática do mapa da pilha.',
  },
  'help.whatsNew.i25': {
    en: '3.2.3 — The Executive summary opens as a story: three rings, five numbers, what changed this week and the next three steps. Digital experience shows each Core Web Vital on a dial with its published zones.',
    'pt-BR': '3.2.3 — O Resumo executivo abre como uma história: três anéis, cinco números, o que mudou na semana e os três próximos passos. A Experiência digital mostra cada Core Web Vital num mostrador com as faixas publicadas.',
  },
  'help.whatsNew.i26': {
    en: '3.2.3 — Data: logs are read from every readable bucket, not only default_logs (on the lab tenant the share with Kubernetes context went from 0 % to 14 %); HTTP monitors count as synthetic monitors; CPU throttling is a share of the CPU limit; the RCA sparklines count complete days only.',
    'pt-BR': '3.2.3 — Dados: logs lidos de todos os buckets legíveis, não só do default_logs (no tenant de laboratório a parcela com contexto Kubernetes foi de 0 % para 14 %); monitores HTTP entram nos monitores sintéticos; o throttling de CPU vira % do limite de CPU; as sparklines da RCA contam só dias completos.',
  },
} as const satisfies Record<string, Entry>;
