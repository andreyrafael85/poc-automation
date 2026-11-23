import { type Entry } from './locales';

/**
 * PoC Value Studio 3.1 — strings, group F.
 *
 * One file per workstream so parallel work never edits the same file. Merged into the
 * single dictionary in `strings.ts`; both locales are required.
 *
 * Group F: the one-sentence `purpose` of every DQL catalog entry (`queries/catalog.ts`),
 * keyed `catalog.purpose.<id>`. The catalog stays English-only source of truth; the
 * `en` text here must equal it verbatim (`catalogPurposes.test.ts` enforces that), and
 * `queries/purpose.ts` resolves the key at render time. These sentences contain no
 * `{placeholder}`, so keep any new one free of curly braces.
 */
export const v31FStrings = {
  'catalog.purpose.cov.inventory': {
    en: 'Single-call inventory of every monitored entity category, so the opening screen states scope before it states any conclusion.',
    'pt-BR':
      'Inventário em uma única chamada de todas as categorias de entidades monitoradas, para que a tela de abertura declare o escopo antes de declarar qualquer conclusão.',
  },
  'catalog.purpose.cov.buckets': {
    en: 'Retention, volume and readability per bucket. `has_access` is the authoritative source for the permission column of the coverage matrix.',
    'pt-BR':
      'Retenção, volume e legibilidade por bucket. `has_access` é a fonte autoritativa para a coluna de permissão da matriz de cobertura.',
  },
  'catalog.purpose.cov.hosts.breakdown': {
    en: 'Monitoring-mode and cloud distribution across hosts, to show instrumentation depth instead of a bare host count.',
    'pt-BR':
      'Distribuição de modo de monitoramento e de cloud entre os hosts, para mostrar a profundidade da instrumentação em vez de uma simples contagem de hosts.',
  },
  'catalog.purpose.cov.hosts.table': {
    en: 'Host inventory with capacity and placement attributes for the technical audience.',
    'pt-BR':
      'Inventário de hosts com atributos de capacidade e de posicionamento para o público técnico.',
  },
  'catalog.purpose.cov.dataobjects': {
    en: 'Full list of queryable Grail data objects. Backs the technical appendix so reviewers can see what the environment exposes beyond what this app reads.',
    'pt-BR':
      'Lista completa dos data objects do Grail que podem ser consultados. Sustenta o apêndice técnico, para que os revisores vejam o que o ambiente expõe além do que este app lê.',
  },
  'catalog.purpose.prob.summary': {
    en: 'Problem mix by category and lifecycle status, Dynatrace Intelligence duplicates excluded. Pinned to 7 days so the problem figures always describe the same window.',
    'pt-BR':
      'Distribuição de problemas por categoria e por status do ciclo de vida, sem as duplicatas da Dynatrace Intelligence. Fixada em 7 dias para que os números de problemas descrevam sempre a mesma janela.',
  },
  'catalog.purpose.prob.recurrent': {
    en: 'Recurring problem patterns, keyed by the entity Dynatrace Intelligence blamed as well as the problem name. Recurrence is the honest argument for automation: the same problem returning on the same thing is measured, not asserted.',
    'pt-BR': 'Padrões de problemas recorrentes, com a entidade que a Dynatrace Intelligence apontou na chave, além do nome do problema. A recorrência é o argumento honesto para automação: o mesmo problema voltando na mesma coisa é medido, não afirmado.',
  },
  'catalog.purpose.prob.list': {
    en: 'Problem detail with the Smartscape entities Dynatrace Intelligence itself attached. Backs the "what happened / what was affected / what evidence" narrative.',
    'pt-BR':
      'Detalhe dos problemas com as entidades do Smartscape que a própria Dynatrace Intelligence associou. Sustenta a narrativa "o que aconteceu / o que foi afetado / qual a evidência".',
  },
  'catalog.purpose.prob.timeline': {
    en: 'Problem arrival grouped by the time each problem began, to show whether the environment is improving or degrading.',
    'pt-BR':
      'Chegada de problemas agrupada pelo momento em que cada problema começou, para mostrar se o ambiente está melhorando ou piorando.',
  },
  'catalog.purpose.prob.mttx': {
    en: 'Mean, median and 90th-percentile time to resolve per problem category, plus total accumulated problem time. This is the measured MTTR of the environment.',
    'pt-BR':
      'Tempo médio, mediano e no percentil 90 para resolver cada categoria de problema, mais o tempo total acumulado de problemas. Este é o MTTR medido do ambiente.',
  },
  'catalog.purpose.prob.exposure': {
    en: 'Currently open problems and the time they have accumulated while open. This is the observed basis for any operational-exposure statement.',
    'pt-BR':
      'Problemas atualmente abertos e o tempo que acumularam enquanto abertos. Esta é a base observada para qualquer afirmação sobre exposição operacional.',
  },
  'catalog.purpose.prob.topentities': {
    en: 'Entities appearing in the most problems. Answers "where is the pain concentrated" without needing a topology graph.',
    'pt-BR':
      'Entidades que aparecem no maior número de problemas. Responde "onde a dor está concentrada" sem precisar de um grafo de topologia.',
  },
  'catalog.purpose.rca.top': {
    en: 'The most impactful problems of the last 15 days, ranked so the War Room can open on the single incident that best demonstrates Dynatrace Intelligence root-cause analysis: root-caused first, then by breadth of affected entities, then by duration. Carries the full Dynatrace Intelligence detail — root-cause entity, affected/related entity trail, K8s context and the markdown RCA narrative — for the top few.',
    'pt-BR':
      'Os problemas de maior impacto dos últimos 15 dias, ordenados para que a War Room possa abrir com o único incidente que melhor demonstra a análise de causa raiz da Dynatrace Intelligence: primeiro os que tiveram causa raiz identificada, depois pela abrangência de entidades afetadas e, por fim, pela duração. Traz o detalhe completo da Dynatrace Intelligence — entidade de causa raiz, trilha de entidades afetadas/relacionadas, contexto de K8s e a narrativa de RCA em markdown — para os primeiros da lista.',
  },
  'catalog.purpose.rca.kpi': {
    en: 'Environment-wide problem KPIs over the 15-day RCA window: total problems, how many Dynatrace Intelligence root-caused automatically, how many are still active and the average number of entities each problem touched.',
    'pt-BR':
      'KPIs de problemas de todo o ambiente na janela de RCA de 15 dias: total de problemas, quantos a Dynatrace Intelligence identificou a causa raiz automaticamente, quantos ainda estão ativos e o número médio de entidades que cada problema envolveu.',
  },
  'catalog.purpose.rca.logs': {
    en: 'Error and warning log volume by Kubernetes namespace over the last 6 hours, in every readable log bucket, as the corroborating failure signal beside the RCA incident. Aggregate counts only — no log content, no PII.',
    'pt-BR':
      'Volume de logs de erro e de warning por namespace do Kubernetes nas últimas 6 horas, em todos os buckets de log legíveis, como sinal de falha corroborante ao lado do incidente de RCA. Apenas contagens agregadas — sem conteúdo de log, sem PII.',
  },
  'catalog.purpose.rca.trend': {
    en: 'A 7-day daily trend of the RCA headline numbers — problems opened, how many Dynatrace Intelligence root-caused and the average entities touched per day — so the key tiles can carry a micro-sparkline showing direction. Aggregate counts only.',
    'pt-BR':
      'Tendência diária de 7 dias dos números principais de RCA — problemas abertos, quantos a Dynatrace Intelligence identificou a causa raiz e a média de entidades envolvidas por dia — para que os tiles principais possam exibir um micro-sparkline mostrando a direção. Apenas contagens agregadas.',
  },
  'catalog.purpose.rca.catmix': {
    en: 'The mix of Dynatrace Intelligence problems by category over the 15-day window (availability, error, slowdown, resource, custom) — an executive read on what kind of problems dominate the environment. Aggregate counts only.',
    'pt-BR':
      'A distribuição dos problemas da Dynatrace Intelligence por categoria na janela de 15 dias (disponibilidade, erro, lentidão, recurso, personalizado) — uma leitura executiva do tipo de problema que predomina no ambiente. Apenas contagens agregadas.',
  },
  'catalog.purpose.svc.golden': {
    en: 'Environment-wide request rate, failures and response time trend.',
    'pt-BR':
      'Tendência, em todo o ambiente, de taxa de requisições, falhas e tempo de resposta.',
  },
  'catalog.purpose.svc.ranking': {
    en: 'Per-service golden signals with a derived failure rate, to select which service is worth drilling into.',
    'pt-BR':
      'Golden signals por serviço com uma taxa de falha derivada, para selecionar qual serviço vale a pena detalhar.',
  },
  'catalog.purpose.svc.breakdown': {
    en: 'Service mix by type and instrumentation technology - what the platform detected on its own.',
    'pt-BR':
      'Distribuição de serviços por tipo e por tecnologia de instrumentação - o que a plataforma detectou por conta própria.',
  },
  'catalog.purpose.svc.topology': {
    en: 'Service dependency attributes and database bindings, read from the entity model. No inferred or decorative edges.',
    'pt-BR':
      'Atributos de dependência entre serviços e vínculos com bancos de dados, lidos do modelo de entidades. Sem arestas inferidas ou decorativas.',
  },
  'catalog.purpose.infra.trend': {
    en: 'Host CPU and memory saturation trend across the monitored estate.',
    'pt-BR':
      'Tendência de saturação de CPU e memória dos hosts em todo o parque monitorado.',
  },
  'catalog.purpose.cloud.hosts': {
    en: 'Cloud footprint per provider: how many hosts, cores and memory Dynatrace attributed to each cloud, with the full-stack / infrastructure split. Only hosts the platform tagged with a cloud type are counted.',
    'pt-BR':
      'Pegada de cloud por provedor: quantos hosts, cores e quanta memória a Dynatrace atribuiu a cada cloud, com a divisão entre full-stack e infraestrutura. Apenas hosts que a plataforma marcou com um tipo de cloud são contados.',
  },
  'catalog.purpose.cloud.hosts.detail': {
    en: 'Per-host cloud inventory for the technical audience: provider, OS, size and monitoring mode of every cloud-attributed host.',
    'pt-BR':
      'Inventário de cloud por host para o público técnico: provedor, SO, tamanho e modo de monitoramento de cada host atribuído a uma cloud.',
  },
  'catalog.purpose.cloud.services': {
    en: 'Which cloud services Dynatrace actually monitors, read from the Smartscape topology. The model folds the raw types into friendly service families but counts only PRIMARY managed services (Lambda, RDS, SQS, App Service, PostgreSQL, AKS, Apigee, ...) via an allow-list — cloud inventory/CSPM objects (configurations, patch results, IAM, security groups, network interfaces, volumes, backups) and compute hosts are excluded, so the count reflects genuine monitored services, not raw topology nodes.',
    'pt-BR':
      'Quais serviços de cloud a Dynatrace realmente monitora, lidos da topologia do Smartscape. O modelo agrupa os tipos brutos em famílias de serviços mais legíveis, mas conta apenas os serviços gerenciados PRIMARY (Lambda, RDS, SQS, App Service, PostgreSQL, AKS, Apigee, ...) por meio de uma allow-list — objetos de inventário/CSPM de cloud (configurações, resultados de patch, IAM, security groups, network interfaces, volumes, backups) e hosts de computação são excluídos, de modo que a contagem reflete serviços genuinamente monitorados, e não nós brutos da topologia.',
  },
  'catalog.purpose.lic.hosts': {
    en: 'Every monitored host grouped by monitoring mode and Host-Unit band (memory in 16 GiB steps), the input the licence sizer turns into Classic Host Units and the DPS host footprint. Counted in the query over all hosts, so a large estate is never cut off. Entity model only, no scan.',
    'pt-BR':
      'Todos os hosts monitorados agrupados por modo de monitoramento e faixa de Host Unit (memória em passos de 16 GiB), a entrada que o dimensionador de licenças transforma em Classic Host Units e na pegada de hosts do DPS. Contados na própria consulta sobre todos os hosts, de modo que um parque grande nunca é cortado. Apenas modelo de entidades, sem varredura.',
  },
  'catalog.purpose.lic.k8spods': {
    en: 'Count of monitored Kubernetes pods, the driver for the DPS Kubernetes Platform pod-hour estimate. Smartscape topology read, no Grail scan.',
    'pt-BR':
      'Contagem de pods Kubernetes monitorados, o fator que determina a estimativa de pod-hours do DPS Kubernetes Platform. Leitura da topologia do Smartscape, sem varredura no Grail.',
  },
  'catalog.purpose.k8s.clusters': {
    en: 'Cluster inventory as the entry point for Kubernetes drill-down.',
    'pt-BR':
      'Inventário de clusters como ponto de entrada para o drill-down em Kubernetes.',
  },
  'catalog.purpose.k8s.restarts': {
    en: 'Workloads by container restarts. Restart churn is the most legible reliability signal for a mixed audience.',
    'pt-BR':
      'Workloads por restarts de contêiner. A rotatividade de restarts é o sinal de confiabilidade mais legível para um público misto.',
  },
  'catalog.purpose.k8s.pressure': {
    en: 'Out-of-memory kills and CPU throttling per workload - the evidence behind any right-sizing recommendation.',
    'pt-BR':
      'Out-of-memory kills e throttling de CPU por workload - a evidência por trás de qualquer recomendação de right-sizing.',
  },
  'catalog.purpose.proc.technologies': {
    en: 'Technology and runtime version inventory discovered automatically, including edition and version where the platform reports them.',
    'pt-BR':
      'Inventário de tecnologias e versões de runtime descobertas automaticamente, incluindo edição e versão quando a plataforma as informa.',
  },
  'catalog.purpose.comp.agents': {
    en: 'Third-party observability and log agents running alongside OneAgent, discovered by the platform. Evidence for consolidation, never a claim against a competitor beyond what is observed.',
    'pt-BR':
      'Agentes de observabilidade e de logs de terceiros em execução ao lado do OneAgent, descobertos pela plataforma. Evidência para consolidação, nunca uma afirmação contra um concorrente além do que é observado.',
  },
  'catalog.purpose.log.quality': {
    en: 'Severity mix and topology-enrichment coverage of ingested logs. This is the difference between storing logs and being able to use them.',
    'pt-BR':
      'Distribuição de severidade e cobertura de enriquecimento de topologia dos logs ingeridos. Esta é a diferença entre armazenar logs e conseguir usá-los.',
  },
  'catalog.purpose.log.ingest': {
    en: 'Log bytes ingested and log bytes queried over the window, read from the platform\'s own billing usage events. Gives the log page a sense of scale that a record count alone cannot.',
    'pt-BR':
      'Bytes de log ingeridos e bytes de log consultados no período, lidos dos próprios eventos de uso de billing da plataforma. Dá à página de logs uma noção de escala que uma simples contagem de registros não consegue dar.',
  },
  'catalog.purpose.log.buckets': {
    en: 'Log volume and retention per bucket, for retention and governance decisions.',
    'pt-BR':
      'Volume e retenção de logs por bucket, para decisões de retenção e governança.',
  },
  'catalog.purpose.log.sfm': {
    en: 'The platform\'s own self-monitoring on log ingestion quality: unparsed timestamps, ambiguous patterns and process-group ambiguity.',
    'pt-BR':
      'O próprio automonitoramento da plataforma sobre a qualidade da ingestão de logs: timestamps não interpretados, padrões ambíguos e ambiguidade de process group.',
  },
  'catalog.purpose.cons.capabilities': {
    en: 'Which licensed capabilities the environment actually exercised, with billed volume as reported by the platform. Volume only - this app never shows money.',
    'pt-BR':
      'Quais capacidades licenciadas o ambiente realmente utilizou, com o volume faturado conforme informado pela plataforma. Apenas volume - este app nunca exibe valores monetários.',
  },
  'catalog.purpose.cons.advisor': {
    en: 'Query cost per table from the platform\'s own query accounting, counting distinct queries rather than records. Feeds the DQL Efficiency Advisor. user.email is deliberately excluded: aggregate only, no PII.',
    'pt-BR': 'Custo de consulta por tabela, pela própria contabilidade da plataforma, contando consultas distintas em vez de registros. Alimenta o Conselheiro de Eficiência DQL. O user.email fica de fora de propósito: só agregado, sem dado pessoal.',
  },
  'catalog.purpose.auto.workflows': {
    en: 'Workflow executions by state and trigger type - measured automation already running, rather than a claim about what automation could do.',
    'pt-BR':
      'Execuções de workflows por estado e tipo de trigger - automação medida que já está em execução, em vez de uma afirmação sobre o que a automação poderia fazer.',
  },
  'catalog.purpose.biz.events': {
    en: 'Business event types actually flowing into Grail. Establishes that business context exists before any business-impact statement is made.',
    'pt-BR':
      'Tipos de bizevent que realmente estão chegando ao Grail. Estabelece que existe contexto de negócio antes de qualquer afirmação sobre impacto no negócio.',
  },
  'catalog.purpose.infra.capacity': {
    en: 'Declared capacity against measured usage, per host. This is the evidence behind both halves of a right-sizing conversation: a host running at its ceiling, and a host that was sized for load it never sees.',
    'pt-BR':
      'Capacidade declarada versus uso medido, por host. Esta é a evidência por trás das duas metades de uma conversa de right-sizing: um host operando no limite e um host dimensionado para uma carga que nunca recebe.',
  },
  'catalog.purpose.infra.capacity.summary': {
    en: 'Exact capacity verdicts over every host: how many are saturated, under pressure, balanced or oversized, and the memory declared, in use and reclaimable. Classified inside the query with the same thresholds the page shows, so a large estate is never cut to its biggest hosts.',
    'pt-BR':
      'Veredictos de capacidade exatos sobre todos os hosts: quantos estão saturados, sob pressão, equilibrados ou superdimensionados, e a memória declarada, em uso e recuperável. Classificados dentro da própria consulta com os mesmos limiares que a página mostra, de modo que um parque grande nunca é reduzido aos seus maiores hosts.',
  },
  'catalog.purpose.infra.capacity.total': {
    en: 'Estate-level declared capacity: how many hosts, how many cores and how much memory Dynatrace found. The denominator for every headroom statement.',
    'pt-BR':
      'Capacidade declarada de todo o parque: quantos hosts, quantos cores e quanta memória a Dynatrace encontrou. O denominador de toda afirmação sobre folga de capacidade.',
  },
  'catalog.purpose.svc.totals': {
    en: 'Estate-wide request and failure totals with the derived failure rate, so the services page opens with the overall picture before it ranks anything.',
    'pt-BR':
      'Totais de requisições e falhas de todo o parque, com a taxa de falha derivada, para que a página de serviços abra com o quadro geral antes de ranquear qualquer coisa.',
  },
  'catalog.purpose.sec.vulnerabilities': {
    en: 'Current open, non-muted runtime vulnerabilities, deduplicated to their latest state per affected entity and rolled up per vulnerability. Carries the Security Score, the technology stack, and the exploit / public-exposure / vulnerable-function signals that drive remediation priority.',
    'pt-BR':
      'Vulnerabilidades de runtime atualmente abertas e não silenciadas, deduplicadas para o estado mais recente por entidade afetada e consolidadas por vulnerabilidade. Traz o Security Score, o stack de tecnologia e os sinais de exploit / exposição pública / função vulnerável que determinam a prioridade de remediação.',
  },
  'catalog.purpose.sec.posture': {
    en: 'Exact vulnerability posture: how many open, non-muted vulnerabilities exist in total, by severity and by technology stack, and how many are exploitable, publicly exposed, in use or all three at once. Aggregated in the query over every vulnerability, so no row cap can turn a total into a floor.',
    'pt-BR':
      'Postura exata de vulnerabilidades: quantas vulnerabilidades abertas e não silenciadas existem no total, por severidade e por stack de tecnologia, e quantas são exploráveis, expostas publicamente, em uso ou as três ao mesmo tempo. Agregada na própria consulta sobre todas as vulnerabilidades, de modo que nenhum limite de linhas transforma um total em piso.',
  },
  'catalog.purpose.auto.workflows.total': {
    en: 'Exact workflow totals over every finished execution: how many distinct workflows ran, how many executions there were and how many failed. The ranked list only shows the busiest workflow, state and trigger combinations.',
    'pt-BR':
      'Totais exatos de workflows sobre toda execução concluída: quantos workflows distintos rodaram, quantas execuções houve e quantas falharam. A lista ranqueada mostra apenas as combinações de workflow, estado e gatilho mais ativas.',
  },
  'catalog.purpose.prob.recurrent.total': {
    en: 'Exact count of recurring problem patterns: how many distinct problem names repeated at least twice, how many repeated often enough (five or more) to be worth a workflow, and the problems they account for. Counted over every pattern, not the 25 most frequent.',
    'pt-BR':
      'Contagem exata de padrões de problemas recorrentes: quantos nomes distintos de problema se repetiram ao menos duas vezes, quantos se repetiram o bastante (cinco ou mais) para justificar um workflow e os problemas que eles somam. Contados sobre todos os padrões, não apenas os 25 mais frequentes.',
  },
  'catalog.purpose.k8s.restarts.total': {
    en: 'Exact restart totals over every workload: how many restarted at all and how many restarts that adds up to, so the headline is not the sum of the 25 noisiest.',
    'pt-BR':
      'Totais exatos de reinícios sobre todos os workloads: quantos reiniciaram e quantos reinícios isso soma, para que o destaque não seja a soma dos 25 mais ruidosos.',
  },
  'catalog.purpose.k8s.pressure.total': {
    en: 'Exact resource-pressure totals over every workload: how many were out-of-memory killed, how many were CPU-throttled and the number of OOM kills, not just the 25 worst.',
    'pt-BR':
      'Totais exatos de pressão de recursos sobre todos os workloads: quantos sofreram OOM kill, quantos tiveram CPU limitada (throttling) e o número de OOM kills, não apenas os 25 piores.',
  },
  'catalog.purpose.svc.ranking.total': {
    en: 'Exact service counts over every service that handled traffic: how many, how many had at least one failure, how many are above the 1% review line, and the request-weighted response time. The ranked list shows only the 50 busiest.',
    'pt-BR':
      'Contagens exatas de serviços sobre todo serviço que recebeu tráfego: quantos, quantos tiveram ao menos uma falha, quantos estão acima da linha de revisão de 1% e o tempo de resposta ponderado por requisições. A lista ranqueada mostra apenas os 50 mais movimentados.',
  },
  'catalog.purpose.svc.topology.total': {
    en: 'Exact service-topology counts over every service: how many exist, how many are bound to a data store (and how many distinct database vendors that spans), how many are external and how many are publicly reachable. The list is capped at 300 services by name.',
    'pt-BR':
      'Contagens exatas da topologia de serviços sobre todos os serviços: quantos existem, quantos estão ligados a um repositório de dados (e quantos fornecedores de banco distintos isso abrange), quantos são externos e quantos são acessíveis publicamente. A lista é limitada a 300 serviços, por nome.',
  },
  'catalog.purpose.biz.events.total': {
    en: 'Exact business-event totals: how many events were captured and how many distinct event types they span. A busy tenant has hundreds of types, so the list shows only the 25 most frequent.',
    'pt-BR':
      'Totais exatos de eventos de negócio: quantos eventos foram capturados e quantos tipos de evento distintos eles abrangem. Um tenant movimentado tem centenas de tipos, então a lista mostra apenas os 25 mais frequentes.',
  },
  'catalog.purpose.rum.audience.total': {
    en: 'Active sessions and unique users across all frontends together, real users only, as the platform estimates them. Adding the per-app figures would count a user once for every application they use.',
    'pt-BR':
      'Sessões ativas e usuários únicos em todos os frontends juntos, só usuários reais, como a plataforma os estima. Somar os números por aplicação contaria um usuário uma vez para cada aplicação que ele usa.',
  },
  'catalog.purpose.prob.topentities.total': {
    en: 'Exact count of distinct entities that Dynatrace Intelligence attached to a problem, and the problem-entity links they account for. The ranked list shows only the 15 most affected.',
    'pt-BR':
      'Contagem exata de entidades distintas que a Dynatrace Intelligence associou a um problema e dos vínculos problema-entidade que elas somam. A lista ranqueada mostra apenas as 15 mais afetadas.',
  },
  'catalog.purpose.svc.topology.mix': {
    en: 'What the service topology is made of, counted over every service: the most common service types, technologies, database vendors and public domains. One row per entry, tagged with its tier, so the Smartscape view never describes only an alphabetical slice of the estate.',
    'pt-BR':
      'Do que a topologia de serviços é feita, contado sobre todos os serviços: os tipos de serviço, tecnologias, fornecedores de banco de dados e domínios públicos mais comuns. Uma linha por item, marcada com sua camada, para que a visão Smartscape nunca descreva apenas uma fatia alfabética do parque.',
  },
  'catalog.purpose.rum.sessions': {
    en: 'Real user session volume. Retained to make the digital-experience gap explicit and to avoid staging a story the data cannot support.',
    'pt-BR':
      'Volume de sessões de usuários reais. Mantida para tornar explícita a lacuna de experiência digital e evitar encenar uma história que os dados não conseguem sustentar.',
  },
  'catalog.purpose.rum.scorecard': {
    en: 'Per-application digital-experience scorecard from the dt.frontend.* metrics, real users only: user actions, requests, errors and the derived error rate. Metric-based, so it reads under storage:metrics:read without the user.sessions table.',
    'pt-BR':
      'Scorecard de experiência digital por aplicação a partir das métricas dt.frontend.*, só usuários reais: ações de usuário, requisições, erros e a taxa de erro derivada. Baseado em métricas, lê com storage:metrics:read sem depender da tabela user.sessions.',
  },
  'catalog.purpose.rum.webvitals': {
    en: 'Per-application Core Web Vitals (LCP, INP, CLS) and navigation timings (load, TTFB, DOM interactive) plus user-action duration, at the 75th percentile and for real users only - the standard way to grade perceived web experience.',
    'pt-BR':
      'Core Web Vitals por aplicação (LCP, INP, CLS) e tempos de navegação (carga, TTFB, DOM interativo), mais a duração das ações de usuário, no percentil 75 e só para usuários reais - a forma padrão de avaliar a experiência web percebida.',
  },
  'catalog.purpose.rum.audience': {
    en: 'Per-application audience size: estimated active user sessions and unique active users. These estimated_count metrics are distinct-count gauges, so they are read with countDistinct (not sum) and scoped to real users (dt.rum.user_type real_user; synthetic monitors and robots excluded) to match the platform RUM overview.',
    'pt-BR':
      'Tamanho do público por aplicação: sessões ativas estimadas e usuários ativos únicos. Essas métricas estimated_count são medidores de contagem distinta, então são lidas com countDistinct (não sum) e restritas a usuários reais (dt.rum.user_type real_user; monitores sintéticos e robôs fora) para bater com a visão de RUM da plataforma.',
  },
} as const satisfies Record<string, Entry>;
