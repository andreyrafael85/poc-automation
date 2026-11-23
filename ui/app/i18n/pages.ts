import type { Entry } from './locales';

/**
 * Page and component copy.
 *
 * Split from `strings.ts` purely for size: the core dictionary holds the shell,
 * navigation, result states and the printable report, and this file holds the
 * prose of every domain page. `strings.ts` merges the two, so callers keep
 * importing from `i18n/strings`.
 *
 * ## What is translated and what is not
 *
 * Explanatory prose, questions, takeaways, table headers and interpretation are
 * translated. Names that belong to the platform or to the customer's estate are
 * not: entity names, service names, technology names, DQL text, query ids,
 * bucket names and Dynatrace product terms (Dynatrace Intelligence, Grail, Smartscape, OneAgent)
 * stay as the platform reports them. Translating those would make a finding
 * impossible to match against the Dynatrace UI.
 *
 * `scripts/scan-untranslated.mjs` walks the AST of every page and component and
 * fails the build when prose is added without a key here.
 */

export const pageStrings = {
  // ------------------------------------------------------- narrative chapters
  'chapter.Observe': { en: 'Observe', 'pt-BR': 'Observar' },
  'chapter.Understand': { en: 'Understand', 'pt-BR': 'Entender' },
  'chapter.Explain': { en: 'Explain', 'pt-BR': 'Explicar' },
  'chapter.Prioritise': { en: 'Prioritise', 'pt-BR': 'Priorizar' },
  'chapter.Act': { en: 'Act', 'pt-BR': 'Agir' },
  'chapter.Prove': { en: 'Prove', 'pt-BR': 'Comprovar' },
  'chapter.Expand': { en: 'Expand', 'pt-BR': 'Expandir' },

  // -------------------------------------------------- shared column headings
  'common.category': { en: 'Category', 'pt-BR': 'Categoria' },
  'common.status': { en: 'Status', 'pt-BR': 'Situação' },
  'common.records': { en: 'Records', 'pt-BR': 'Registros' },
  'common.recommendation': { en: 'Recommendation', 'pt-BR': 'Recomendação' },
  'common.evidence': { en: 'Evidence', 'pt-BR': 'Evidência' },
  'common.confidence': { en: 'Confidence', 'pt-BR': 'Confiança' },
  'common.source': { en: 'Source', 'pt-BR': 'Fonte' },
  'common.window': { en: 'Window', 'pt-BR': 'Janela' },
  'common.query': { en: 'Query', 'pt-BR': 'Consulta' },
  'common.rows': { en: 'Rows', 'pt-BR': 'Linhas' },
  'common.type': { en: 'Type', 'pt-BR': 'Tipo' },
  'common.table': { en: 'Table', 'pt-BR': 'Tabela' },
  'common.bucket': { en: 'Bucket', 'pt-BR': 'Bucket' },
  'common.readable': { en: 'Readable', 'pt-BR': 'Legível' },
  'common.yes': { en: 'Yes', 'pt-BR': 'Sim' },
  'common.no': { en: 'No', 'pt-BR': 'Não' },
  'common.cloud': { en: 'Cloud', 'pt-BR': 'Nuvem' },
  'common.hosts': { en: 'Hosts', 'pt-BR': 'Hosts' },
  'common.host': { en: 'Host', 'pt-BR': 'Host' },
  'common.service': { en: 'Service', 'pt-BR': 'Serviço' },
  'common.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'common.cluster': { en: 'Cluster', 'pt-BR': 'Cluster' },
  'common.workload': { en: 'Workload', 'pt-BR': 'Workload' },
  'common.technology': { en: 'Technology', 'pt-BR': 'Tecnologia' },
  'common.technologies': { en: 'Technologies', 'pt-BR': 'Tecnologias' },
  'common.version': { en: 'Version', 'pt-BR': 'Versão' },
  'common.entities': { en: 'Entities', 'pt-BR': 'Entidades' },
  'common.entityId': { en: 'Entity id', 'pt-BR': 'ID da entidade' },
  'common.retentionDays': { en: 'Retention (days)', 'pt-BR': 'Retenção (dias)' },
  'common.uncompressed': { en: 'Uncompressed', 'pt-BR': 'Descomprimido' },
  'common.monitoringMode': { en: 'Monitoring mode', 'pt-BR': 'Modo de monitoramento' },
  'common.occurrences': { en: 'Occurrences', 'pt-BR': 'Ocorrências' },
  'common.avgDuration': { en: 'Avg duration', 'pt-BR': 'Duração média' },
  'common.signal': { en: 'Signal', 'pt-BR': 'Sinal' },
  'common.impactLevel': { en: 'Impact level', 'pt-BR': 'Nível de impacto' },
  'common.dataQuality': { en: 'Data quality', 'pt-BR': 'Qualidade de dados' },
  'common.reliability': { en: 'Reliability', 'pt-BR': 'Confiabilidade' },
  'common.automation': { en: 'Automation', 'pt-BR': 'Automação' },
  'common.notReported': { en: 'Not reported', 'pt-BR': 'Não informado' },
  'common.attributeNotReported': {
    en: 'Attribute not reported',
    'pt-BR': 'Atributo não informado',
  },
  'common.noneDetected': { en: 'None detected', 'pt-BR': 'Nenhuma detectada' },

  // --------------------------------------------------------------- CatalogTable
  'c.table.empty': {
    en: 'No rows matched after transformation.',
    'pt-BR': 'Nenhuma linha restou após a transformação.',
  },
  'c.table.capped': {
    en: 'Top {cap}: the query stops there and more rows exist',
    'pt-BR': 'Top {cap}: a consulta para aí e existem mais linhas',
  },
  'c.table.footer': {
    en: 'Window: {window} · Query: {query} · Rows: {rows}',
    'pt-BR': 'Janela: {window} · Consulta: {query} · Linhas: {rows}',
  },

  // -------------------------------------------------------------- DqlDisclosure
  'c.dql.title': { en: 'Queries behind this section', 'pt-BR': 'Consultas por trás desta seção' },
  'c.dql.validated': {
    en: 'Validated {date} in {env} · {records} records · {scan}{duration} · outcome: {outcome}',
    'pt-BR':
      'Validada em {date} no ambiente {env} · {records} registros · {scan}{duration} · resultado: {outcome}',
  },
  'c.dql.scanNotCaptured': {
    en: 'scanned volume not captured',
    'pt-BR': 'volume de varredura não registrado',
  },
  'c.dql.scanned': { en: '{bytes} scanned on demand', 'pt-BR': '{bytes} varridos sob demanda' },

  // ----------------------------------------------------------------- HeroBanner
  'c.hero.defaultTitle': {
    en: 'Proof of concept — evidence of value',
    'pt-BR': 'Prova de conceito — evidência de valor',
  },
  'c.hero.namedTitle': { en: '{name} — evidence of value', 'pt-BR': '{name} — evidência de valor' },
  'c.hero.customerLogoAlt': { en: 'Customer logo', 'pt-BR': 'Logotipo do cliente' },
  'c.hero.namedLogoAlt': { en: '{name} logo', 'pt-BR': 'Logotipo de {name}' },
  'c.hero.asOf': { en: 'as of {time}', 'pt-BR': 'em {time}' },

  // ----------------------------------------------------------- tiles and cards
  'c.tile.notMeasured': { en: 'Not measured', 'pt-BR': 'Não medido' },
  'c.tile.notMeasuredInline': { en: 'not measured', 'pt-BR': 'não medido' },
  'c.tile.notInScope': {
    en: 'Not available in the current scope',
    'pt-BR': 'Não disponível no escopo atual',
  },
  'c.tile.notInPocScope': {
    en: 'Data not available in the current PoC scope',
    'pt-BR': 'Dado não disponível no escopo atual da PoC',
  },

  // ------------------------------------------------------------ ProvenanceBadge
  'c.prov.query': { en: 'Query: {value}', 'pt-BR': 'Consulta: {value}' },
  'c.prov.source': { en: 'Source: {value}', 'pt-BR': 'Fonte: {value}' },
  'c.prov.window': { en: 'Window: {value}', 'pt-BR': 'Janela: {value}' },
  'c.prov.readAt': { en: 'Read at {value}', 'pt-BR': 'Lido às {value}' },

  // ----------------------------------------------------------------- TrendChart
  'c.chart.notChartable': {
    en: 'The query succeeded but the result is not chartable: {error}. Query: {query}',
    'pt-BR':
      'A consulta funcionou, mas o resultado não pode ser plotado: {error}. Consulta: {query}',
  },
  'c.chart.conversionFailed': {
    en: 'The result could not be charted.',
    'pt-BR': 'Não foi possível plotar o resultado.',
  },
  'c.chart.series': { en: 'Series: {list}', 'pt-BR': 'Séries: {list}' },
  'c.chart.footer': {
    en: 'Window: {window} · Query: {query}',
    'pt-BR': 'Janela: {window} · Consulta: {query}',
  },
  'c.read.at': { en: ' · read at {time}', 'pt-BR': ' · lido às {time}' },

  // ======================================================= page: coverage
  'p.cov.title': { en: 'Environment coverage', 'pt-BR': 'Cobertura do ambiente' },
  'p.cov.question': {
    en: 'What is in scope, what is only partially covered, and what could not be read at all?',
    'pt-BR':
      'O que está no escopo, o que está apenas parcialmente coberto e o que não pôde ser lido?',
  },
  'p.cov.takeaway': {
    en: 'Coverage is stated per data source, including the sources this identity is not allowed to read.',
    'pt-BR':
      'A cobertura é declarada por fonte de dados, incluindo as fontes que esta identidade não tem permissão para ler.',
  },
  'p.cov.entities': { en: 'Monitored entities', 'pt-BR': 'Entidades monitoradas' },
  'p.cov.depth': { en: 'Instrumentation depth by host', 'pt-BR': 'Profundidade de instrumentação por host' },
  'p.cov.depthBody': {
    en: 'Monitoring mode determines how much Dynatrace can see. Where the attribute is absent this table says so rather than assuming the host is unmonitored.',
    'pt-BR':
      'O modo de monitoramento determina o quanto a Dynatrace consegue enxergar. Quando o atributo não é informado, a tabela diz isso em vez de assumir que o host não está monitorado.',
  },
  'p.cov.sources': {
    en: 'Data sources, retention and readability',
    'pt-BR': 'Fontes de dados, retenção e legibilidade',
  },
  'p.cov.zeroDaysTitle': {
    en: 'Every bucket reports zero included query days',
    'pt-BR': 'Todos os buckets reportam zero dias de consulta inclusos',
  },
  'p.cov.zeroDaysBody': {
    en: 'That means all querying against these buckets is on-demand. It is the single most important input to the consumption discussion and is read directly from bucket metadata.',
    'pt-BR':
      'Isso significa que toda consulta a esses buckets é sob demanda. É a informação mais importante para a discussão de consumo e vem diretamente dos metadados do bucket.',
  },
  'p.cov.unreadableTitle': {
    en: '{count} buckets are not readable by the signed-in identity',
    'pt-BR': '{count} buckets não são legíveis pela identidade autenticada',
  },
  'p.cov.unreadableBody': {
    en: 'These sources hold data that this review cannot see. Any conclusion about the domains they cover would be unsupported.',
    'pt-BR':
      'Essas fontes guardam dados que esta análise não consegue ver. Qualquer conclusão sobre os domínios que elas cobrem não teria sustentação.',
  },
  'p.cov.includedQueryDays': { en: 'Included query days', 'pt-BR': 'Dias de consulta inclusos' },
  'p.cov.operatingSystem': { en: 'Operating system', 'pt-BR': 'Sistema operacional' },

  // ======================================================= page: problems
  'p.prob.title': { en: 'Dynatrace Intelligence', 'pt-BR': 'Dynatrace Intelligence' },
  'p.prob.question': {
    en: 'What went wrong, what did it affect, and what evidence did the platform attach to it?',
    'pt-BR': 'O que deu errado, o que foi afetado e qual evidência a plataforma anexou a isso?',
  },
  'p.prob.takeaway': {
    en: 'Problem detection here required no alert rule to be authored. Categories, affected entities and root-cause context are produced by Dynatrace Intelligence.',
    'pt-BR':
      'A detecção de problemas aqui não exigiu escrever nenhuma regra de alerta. Categorias, entidades afetadas e contexto de causa raiz são produzidos pela Dynatrace Intelligence.',
  },
  'p.prob.howToRead': { en: 'How to read this section', 'pt-BR': 'Como ler esta seção' },
  'p.prob.howToReadBody': {
    en: 'Affected and related entities are the ones Dynatrace Intelligence attached to each problem through Smartscape. Where Dynatrace Intelligence did not indicate a root cause, this app reports that rather than proposing one of its own. Correlation is never presented as causation.',
    'pt-BR':
      'As entidades afetadas e relacionadas são as que a Dynatrace Intelligence anexou a cada problema via Smartscape. Onde a Dynatrace Intelligence não indicou uma causa raiz, este app informa isso em vez de propor uma própria. Correlação nunca é apresentada como causalidade.',
  },
  'p.prob.mix': { en: 'Problem mix by category and status', 'pt-BR': 'Distribuição de problemas por categoria e situação' },
  'p.prob.recurring': { en: 'Recurring patterns', 'pt-BR': 'Padrões recorrentes' },
  'p.prob.recurringBody': {
    en: 'Recurrence is the measurable argument for automation. A pattern that keeps returning is operational effort that repeats, and each row below is a candidate for a workflow.',
    'pt-BR':
      'Recorrência é o argumento mensurável para automação. Um padrão que volta sempre é esforço operacional que se repete, e cada linha abaixo é candidata a um workflow.',
  },
  'p.prob.detail': { en: 'Problem detail with Smartscape context', 'pt-BR': 'Detalhe do problema com contexto do Smartscape' },
  'p.prob.detailBody': {
    en: 'Expand a row to read the description Dynatrace Intelligence generated for that problem, including the evidence it correlated.',
    'pt-BR':
      'Expanda uma linha para ler a descrição que a Dynatrace Intelligence gerou para aquele problema, incluindo a evidência que ele correlacionou.',
  },
  'p.prob.noDescription': {
    en: 'Dynatrace Intelligence did not attach a description to this problem.',
    'pt-BR': 'A Dynatrace Intelligence não anexou descrição a este problema.',
  },
  'p.prob.h.problems': { en: 'Problems', 'pt-BR': 'Problemas' },
  'p.prob.h.pattern': { en: 'Problem pattern', 'pt-BR': 'Padrão do problema' },
  'p.prob.h.lastSeen': { en: 'Last seen', 'pt-BR': 'Visto por último' },
  'p.prob.h.id': { en: 'ID', 'pt-BR': 'ID' },
  'p.prob.h.whatHappened': { en: 'What happened', 'pt-BR': 'O que aconteceu' },
  'p.prob.h.whatAffected': { en: 'What was affected', 'pt-BR': 'O que foi afetado' },
  'p.prob.h.k8sContext': { en: 'Kubernetes context', 'pt-BR': 'Contexto Kubernetes' },
  'p.prob.h.duration': { en: 'Duration', 'pt-BR': 'Duração' },
  'p.prob.h.started': { en: 'Started', 'pt-BR': 'Início' },
  'p.prob.h.maintenance': { en: 'Maintenance', 'pt-BR': 'Manutenção' },

  // ======================================================= page: topology
  'p.topo.title': { en: 'Topology and dependencies', 'pt-BR': 'Topologia e dependências' },
  'p.topo.question': {
    en: 'How do applications, services, processes and infrastructure actually relate to each other?',
    'pt-BR':
      'Como aplicações, serviços, processos e infraestrutura realmente se relacionam entre si?',
  },
  'p.topo.takeaway': {
    en: 'These relationships were mapped automatically. Nothing below was declared by hand.',
    'pt-BR': 'Essas relações foram mapeadas automaticamente. Nada abaixo foi declarado à mão.',
  },
  'p.topo.whyTable': {
    en: 'Which links are measured, and which are not',
    'pt-BR': 'Quais ligações são medidas, e quais não são',
  },
  'p.topo.whyTableBody': {
    en: 'The map "who calls what" draws measured edges: the call relationships Smartscape keeps on every service, read from the entity model and grouped by service type and database vendor. The stack map above draws counts and the hierarchy of the stack, not calls. Single-service dependencies are in the two tables below: the databases and public endpoints recorded on each service, and the entities Dynatrace Intelligence correlated with each problem. To follow one service through the graph, use Smartscape in the Dynatrace interface.',
    'pt-BR':
      'O mapa "quem chama quem" desenha ligações medidas: as relações de chamada que o Smartscape guarda em cada serviço, lidas do modelo de entidades e agrupadas por tipo de serviço e fornecedor de banco. O mapa da pilha acima desenha contagens e a hierarquia da pilha, não chamadas. As dependências de cada serviço estão nas duas tabelas abaixo: os bancos e endpoints públicos registrados em cada serviço, e as entidades que a Dynatrace Intelligence correlacionou com cada problema. Para seguir um serviço pelo grafo, use o Smartscape na interface da Dynatrace.',
  },
  'p.topo.deps': { en: 'Service dependencies and data stores', 'pt-BR': 'Dependências de serviço e repositórios de dados' },
  'p.topo.depsBody': {
    en: 'Database bindings and external endpoints as recorded on each service entity. An empty cell means the attribute was not reported, which is different from the dependency not existing.',
    'pt-BR':
      'Vínculos de banco de dados e endpoints externos conforme registrados em cada entidade de serviço. Célula vazia significa que o atributo não foi informado, o que é diferente de a dependência não existir.',
  },
  'p.topo.davisRel': {
    en: 'Relationships Dynatrace Intelligence used to explain problems',
    'pt-BR': 'Relações que a Dynatrace Intelligence usou para explicar problemas',
  },
  'p.topo.davisRelBody': {
    en: "For each problem, these are the entities Dynatrace Intelligence identified as affected and the surrounding entities it correlated through Smartscape. This is the platform's own reasoning, shown without reinterpretation.",
    'pt-BR':
      'Para cada problema, estas são as entidades que a Dynatrace Intelligence identificou como afetadas e as entidades ao redor que ele correlacionou via Smartscape. É o raciocínio da própria plataforma, mostrado sem reinterpretação.',
  },
  'p.topo.path': {
    en: 'Navigation path represented here: application → service → process → host or workload → infrastructure → database or external dependency. The calls between services are drawn in "who calls what"; each other hop is a column or a row in the two tables above.',
    'pt-BR':
      'Caminho de navegação representado aqui: aplicação → serviço → processo → host ou workload → infraestrutura → banco de dados ou dependência externa. As chamadas entre serviços estão desenhadas em "quem chama quem"; cada outro salto é uma coluna ou uma linha nas duas tabelas acima.',
  },
  'p.topo.h.dbVendor': { en: 'Database vendor', 'pt-BR': 'Fabricante do banco' },
  'p.topo.h.database': { en: 'Database', 'pt-BR': 'Banco de dados' },
  'p.topo.h.dbHosts': { en: 'Database hosts', 'pt-BR': 'Hosts do banco' },
  'p.topo.h.external': { en: 'External', 'pt-BR': 'Externo' },
  'p.topo.h.publicEndpoint': { en: 'Public endpoint', 'pt-BR': 'Endpoint público' },
  'p.topo.h.problem': { en: 'Problem', 'pt-BR': 'Problema' },
  'p.topo.h.affectedEntity': { en: 'Affected entity', 'pt-BR': 'Entidade afetada' },
  'p.topo.h.entityType': { en: 'Entity type', 'pt-BR': 'Tipo de entidade' },
  'p.topo.h.related': {
    en: 'Related entities (Smartscape)',
    'pt-BR': 'Entidades relacionadas (Smartscape)',
  },

  // ======================================================= page: services
  'p.svc.title': { en: 'Services and distributed tracing', 'pt-BR': 'Serviços e tracing distribuído' },
  'p.svc.question': {
    en: 'Which services carry the load, which of them are failing, and how deep can analysis go?',
    'pt-BR': 'Quais serviços sustentam a carga, quais estão falhando e até onde a análise consegue ir?',
  },
  'p.svc.takeaway': {
    en: 'Service detection, technology identification and request tracing were all automatic. No instrumentation code was written for this review.',
    'pt-BR':
      'Detecção de serviços, identificação de tecnologia e tracing de requisições foram todos automáticos. Nenhuma linha de instrumentação foi escrita para esta análise.',
  },
  'p.svc.trend': { en: 'Environment request trend', 'pt-BR': 'Tendência de requisições do ambiente' },
  'p.svc.ranking': { en: 'Service ranking', 'pt-BR': 'Ranking de serviços' },
  'p.svc.rankingBody': {
    en: 'Failure rate is a derived field: failures divided by requests over the selected window. Use it to choose a service, then open that service in the platform to read individual traces.',
    'pt-BR':
      'A taxa de falha é um campo derivado: falhas divididas por requisições na janela selecionada. Use-a para escolher um serviço e então abra esse serviço na plataforma para ler traces individuais.',
  },
  'p.svc.noneAbove': {
    en: 'No service exceeded a 1% failure rate in this window. This is a measured result over the selected timeframe only.',
    'pt-BR':
      'Nenhum serviço passou de 1% de taxa de falha nesta janela. Este é um resultado medido apenas no período selecionado.',
  },
  'p.svc.aboveCount': { en: '{count} above a 1% failure rate', 'pt-BR': '{count} acima de 1% de taxa de falha' },
  'p.svc.highest': {
    en: 'Highest among the busiest services: {name} at {rate}%. The 1% line is a review convention chosen for this app, not a Dynatrace threshold or an agreed objective.',
    'pt-BR':
      'Maior entre os serviços mais acessados: {name} com {rate}%. A linha de 1% é uma convenção de análise escolhida para este app, não um limiar da Dynatrace nem um objetivo acordado.',
  },
  'p.svc.autoDetected': { en: 'What was detected automatically', 'pt-BR': 'O que foi detectado automaticamente' },
  'p.svc.assist.title': { en: 'Where to attack first', 'pt-BR': 'Onde atacar primeiro' },
  'p.svc.assist.s.worst': {
    en: 'Among the busiest services, {name} leads failures at {pct}% ({failures} of {requests} requests) — start the trace analysis here.',
    'pt-BR': 'Entre os serviços mais acessados, {name} lidera as falhas com {pct}% ({failures} de {requests} requisições) — comece a análise de traces por aqui.',
  },
  'p.svc.assist.s.above': {
    en: '{count} {count|service sits|services sit} above the 1% failure line and {count|deserves|deserve} a look this sprint.',
    'pt-BR': '{count} {count|serviço está|serviços estão} acima da linha de 1% de falha e {count|merece|merecem} atenção neste sprint.',
  },
  'p.svc.assist.s.clean': {
    en: 'No service breaches the 1% failure line — reliability is holding across the tier.',
    'pt-BR': 'Nenhum serviço ultrapassa a linha de 1% de falha — a confiabilidade se mantém na camada.',
  },
  'p.svc.h.requests': { en: 'Requests', 'pt-BR': 'Requisições' },
  'p.svc.h.failures': { en: 'Failures', 'pt-BR': 'Falhas' },
  'p.svc.h.failureRate': { en: 'Failure rate (derived)', 'pt-BR': 'Taxa de falha (derivada)' },
  'p.svc.h.avgResponse': { en: 'Avg response time', 'pt-BR': 'Tempo médio de resposta' },
  'p.svc.h.serviceType': { en: 'Service type', 'pt-BR': 'Tipo de serviço' },
  'p.svc.h.detectedTech': { en: 'Detected technology', 'pt-BR': 'Tecnologia detectada' },

  // ======================================================= page: infrastructure
  'p.infra.title': { en: 'Infrastructure', 'pt-BR': 'Infraestrutura' },
  // ---------------------------------------------------------------- cloud
  'p.cloud.title': { en: 'Cloud Observability', 'pt-BR': 'Observabilidade de Nuvem' },
  'p.cloud.question': {
    en: 'Which clouds is this estate running in, and how deeply is each one instrumented?',
    'pt-BR': 'Em quais nuvens este ambiente roda e quão profundamente cada uma está instrumentada?',
  },
  'p.cloud.takeaway': {
    en: 'Cloud attribution comes only from the platform. A host without a cloud type is on-prem or undetected — never assumed to be in a cloud.',
    'pt-BR': 'A atribuição de nuvem vem apenas da plataforma. Um host sem tipo de nuvem é on-prem ou não detectado — nunca presumido como estando em nuvem.',
  },
  'p.cloud.band.hosts': { en: 'Cloud hosts', 'pt-BR': 'Hosts em nuvem' },
  'p.cloud.band.hostsDetail': { en: 'of {total} hosts total', 'pt-BR': 'de {total} hosts no total' },
  'p.cloud.band.providers': { en: 'Cloud providers', 'pt-BR': 'Provedores de nuvem' },
  'p.cloud.band.providersDetail': { en: 'distinct clouds detected', 'pt-BR': 'nuvens distintas detectadas' },
  'p.cloud.band.cores': { en: 'Cloud cores', 'pt-BR': 'Cores em nuvem' },
  'p.cloud.band.coresDetail': { en: 'vCPUs across cloud hosts', 'pt-BR': 'vCPUs nos hosts em nuvem' },
  'p.cloud.band.memory': { en: 'Cloud memory', 'pt-BR': 'Memória em nuvem' },
  'p.cloud.band.memoryDetail': { en: 'RAM across cloud hosts', 'pt-BR': 'RAM nos hosts em nuvem' },
  'p.cloud.band.coverage': { en: 'Cloud share', 'pt-BR': 'Participação da nuvem' },
  'p.cloud.band.coverageCalc': { en: 'cloud hosts ÷ all hosts', 'pt-BR': 'hosts em nuvem ÷ todos os hosts' },
  'p.cloud.band.coverageDetail': { en: 'of {total} monitored hosts', 'pt-BR': 'de {total} hosts monitorados' },
  'p.cloud.band.footnote': {
    en: 'Providers are normalised from the platform cloud type (EC2 → AWS, GOOGLE_CLOUD_PLATFORM → GCP).',
    'pt-BR': 'Provedores são normalizados a partir do tipo de nuvem da plataforma (EC2 → AWS, GOOGLE_CLOUD_PLATFORM → GCP).',
  },
  'p.cloud.card.hosts': { en: '{hosts} hosts monitored', 'pt-BR': '{hosts} hosts monitorados' },
  'p.cloud.card.cores': { en: 'vCPU cores', 'pt-BR': 'Cores vCPU' },
  'p.cloud.card.memory': { en: 'Memory', 'pt-BR': 'Memória' },
  'p.cloud.card.fullStack': { en: 'Full-stack', 'pt-BR': 'Full-stack' },
  'p.cloud.card.infra': { en: 'Infra-only', 'pt-BR': 'Só infra' },
  'p.cloud.distTitle': { en: 'Distribution by provider', 'pt-BR': 'Distribuição por provedor' },
  'p.cloud.distBody': {
    en: 'How the monitored cloud estate splits across providers, by host count.',
    'pt-BR': 'Como o ambiente de nuvem monitorado se divide entre provedores, por número de hosts.',
  },
  'p.cloud.distChartTitle': { en: 'Cloud hosts by provider', 'pt-BR': 'Hosts em nuvem por provedor' },
  'p.cloud.tableTitle': { en: 'Cloud host inventory', 'pt-BR': 'Inventário de hosts em nuvem' },
  'p.cloud.svc.title': { en: 'Monitored cloud services', 'pt-BR': 'Serviços de nuvem monitorados' },
  'p.cloud.svc.body': {
    en: 'Beyond virtual machines, Dynatrace monitors {families} managed-service families ({resources} resources) across your clouds — the databases, queues, gateways and functions the applications actually depend on.',
    'pt-BR': 'Além das máquinas virtuais, a Dynatrace monitora {families} famílias de serviços gerenciados ({resources} recursos) nas suas nuvens — os bancos, filas, gateways e funções dos quais as aplicações realmente dependem.',
  },
  'p.cloud.svc.aria': { en: 'Monitored {provider} services by resource count', 'pt-BR': 'Serviços {provider} monitorados por quantidade de recursos' },
  'p.cloud.finops.eyebrow': { en: 'FinOps', 'pt-BR': 'FinOps' },
  'p.cloud.finops.title': { en: 'Turn cloud visibility into cloud cost control', 'pt-BR': 'Transforme visibilidade de nuvem em controle de custo' },
  'p.cloud.finops.body': {
    en: 'FinOps is the practice of running the cloud as a shared, measured responsibility — Inform, Optimize, Operate. Dynatrace already holds the ground truth each phase needs: what runs where, how much of it is real work, and which services carry the load. No invented bill — just the usage signals that make a cost conversation honest.',
    'pt-BR': 'FinOps é a prática de operar a nuvem como responsabilidade compartilhada e medida — Informar, Otimizar, Operar. A Dynatrace já detém a verdade que cada fase precisa: o que roda onde, quanto disso é trabalho real e quais serviços sustentam a carga. Sem conta inventada — apenas os sinais de uso que tornam a conversa de custo honesta.',
  },
  'p.cloud.finops.inform': { en: '1 · Inform', 'pt-BR': '1 · Informar' },
  'p.cloud.finops.informCap': { en: 'cloud coverage across {providers}, with {families} service families in view', 'pt-BR': 'cobertura de nuvem em {providers}, com {families} famílias de serviços à vista' },
  'p.cloud.finops.informAct': {
    en: 'Give every team one shared view of what they run in the cloud — allocation starts with visibility, and it is already here.',
    'pt-BR': 'Dê a cada time uma visão compartilhada do que rodam na nuvem — a alocação começa pela visibilidade, e ela já está aqui.',
  },
  'p.cloud.finops.optimize': { en: '2 · Optimize', 'pt-BR': '2 · Otimizar' },
  'p.cloud.finops.optimizeCap': { en: '{infra} infrastructure-only vs {full} full-stack cloud hosts', 'pt-BR': '{infra} hosts só-infra vs {full} full-stack na nuvem' },
  'p.cloud.finops.optimizeAct': {
    en: 'Right-size from evidence: deepen instrumentation on infra-only hosts to expose idle and over-provisioned capacity, which you can then review for right-sizing.',
    'pt-BR': 'Faça right-sizing com evidência: aprofunde a instrumentação nos hosts só-infra para expor capacidade ociosa e superdimensionada, que você poderá então revisar para right-sizing.',
  },
  'p.cloud.finops.operate': { en: '3 · Operate', 'pt-BR': '3 · Operar' },
  'p.cloud.finops.operateCap': { en: 'monitored cloud resources feeding automation and anomaly detection', 'pt-BR': 'recursos de nuvem monitorados alimentando automação e detecção de anomalias' },
  'p.cloud.finops.operateAct': {
    en: 'Operationalise it: alert on cost-driving anomalies (runaway functions, idle databases) and automate tagging and clean-up with Workflows.',
    'pt-BR': 'Coloque em operação: alerte sobre anomalias que geram custo (funções descontroladas, bancos ociosos) e automatize tagueamento e limpeza com Workflows.',
  },
  'p.cloud.finops.footnote': {
    en: 'A FinOps framing (finops.org: Inform → Optimize → Operate) grounded in measured signals. Dynatrace shows usage and waste; it never invents a cloud bill.',
    'pt-BR': 'Um enquadramento FinOps (finops.org: Informar → Otimizar → Operar) ancorado em sinais medidos. A Dynatrace mostra uso e desperdício; nunca inventa uma conta de nuvem.',
  },
  'p.cloud.tableBody': {
    en: 'Every cloud-attributed host with its provider, size and instrumentation depth.',
    'pt-BR': 'Cada host atribuído a uma nuvem, com provedor, tamanho e profundidade de instrumentação.',
  },
  'p.cloud.empty': { en: 'No cloud-attributed hosts were found in this environment.', 'pt-BR': 'Nenhum host atribuído a nuvem foi encontrado neste ambiente.' },
  'p.cloud.h.provider': { en: 'Provider', 'pt-BR': 'Provedor' },
  'p.cloud.h.os': { en: 'OS', 'pt-BR': 'SO' },
  'p.cloud.h.cores': { en: 'Cores', 'pt-BR': 'Cores' },
  'p.cloud.h.memory': { en: 'Memory', 'pt-BR': 'Memória' },
  'p.cloud.h.state': { en: 'State', 'pt-BR': 'Estado' },
  // ------------------------------------------------------------- licensing
  'p.lic.title': { en: 'Licensing & sizing', 'pt-BR': 'Licenciamento & sizing' },
  'p.lic.question': {
    en: 'How does the monitored estate translate into DPS and Classic licensing units?',
    'pt-BR': 'Como o ambiente monitorado se traduz em unidades de licenciamento DPS e Classic?',
  },
  'p.lic.takeaway': {
    en: 'Sizing is measured from the environment. A price appears only if a public rate card is enabled in Settings — never the negotiated price.',
    'pt-BR': 'O sizing é medido do ambiente. Um preço só aparece se um rate card público for ativado em Configurações — nunca o preço negociado.',
  },
  'p.lic.band.hosts': { en: 'Monitored hosts', 'pt-BR': 'Hosts monitorados' },
  'p.lic.band.hostsDetail': { en: '{fs} full-stack · {inf} infra', 'pt-BR': '{fs} full-stack · {inf} infraestrutura' },
  'p.lic.band.hostUnits': { en: 'Classic Host Units', 'pt-BR': 'Host Units (Classic)' },
  'p.lic.band.huCalc': { en: 'full-stack ⌈RAM ÷ 16 GiB⌉, infra capped at 1', 'pt-BR': 'full-stack ⌈RAM ÷ 16 GiB⌉, infra limitado a 1' },
  'p.lic.band.huDetail': { en: 'calculated from measured RAM', 'pt-BR': 'calculado a partir da RAM medida' },
  'p.lic.band.logs': { en: 'Log ingest', 'pt-BR': 'Ingestão de logs' },
  'p.lic.band.logsDetail': { en: 'per day, over the window', 'pt-BR': 'por dia, no período' },
  'p.lic.band.k8s': { en: 'K8s workloads', 'pt-BR': 'Workloads K8s' },
  'p.lic.band.k8sDetail': { en: 'Kubernetes monitoring scope', 'pt-BR': 'escopo de monitoramento Kubernetes' },
  'p.lic.band.cloud': { en: 'Cloud hosts', 'pt-BR': 'Hosts em nuvem' },
  'p.lic.band.cloudDetail': { en: 'AWS / Azure / GCP attributed', 'pt-BR': 'atribuídos a AWS / Azure / GCP' },
  'p.lic.band.footnote': {
    en: 'Host Units are calculated from the measured entity model; the usage-based rows are projections from billing usage. Refine in the official estimator before a quote.',
    'pt-BR': 'Os Host Units são calculados a partir do modelo de entidades medido; as linhas baseadas em uso são projeções do uso de billing. Refine no estimador oficial antes de uma cotação.',
  },
  'p.lic.tab.dps': { en: 'DPS', 'pt-BR': 'DPS' },
  'p.lic.tab.classic': { en: 'Classic', 'pt-BR': 'Classic' },
  'p.lic.cls.title': { en: 'Classic — measured unit drivers', 'pt-BR': 'Classic — drivers de unidades medidos' },
  'p.lic.cls.huDriver': { en: 'Server RAM ÷ 16 GiB = 1 licence', 'pt-BR': 'RAM do servidor ÷ 16 GiB = 1 licença' },
  'p.lic.cls.huFs': { en: 'Full-Stack ({fs})', 'pt-BR': 'Full-Stack ({fs})' },
  'p.lic.cls.huInf': { en: 'Infra-Only ({inf})', 'pt-BR': 'Infra-Only ({inf})' },
  'p.lic.cls.body': {
    en: 'The four Classic unit families and the measured signal behind each: Host Units from RAM, DEM from real-user sessions and synthetic monitors, DDU from log volume, ASU from Application Security host memory.',
    'pt-BR': 'As quatro famílias de unidades Classic e o sinal medido por trás de cada uma: Host Units pela RAM, DEM por sessões de usuários reais e monitores sintéticos, DDU pelo volume de logs, ASU pela memória de hosts com Application Security.',
  },
  'p.lic.cls.note.title': { en: 'These are the measured drivers, not final unit counts', 'pt-BR': 'Estes são os drivers medidos, não as contagens finais de unidades' },
  'p.lic.cls.note.body': {
    en: 'Host Units are exact; DEM, DDU and ASU are shown as the measured signal that drives them. The exact unit conversion factors live in the Classic estimator spreadsheet — paste these measured drivers there for the final Classic number.',
    'pt-BR': 'Os Host Units são exatos; DEM, DDU e ASU são mostrados como o sinal medido que os direciona. Os fatores exatos de conversão vivem na planilha do estimador Classic — cole estes drivers medidos lá para o número final do Classic.',
  },
  'p.lic.cls.fullStack': { en: 'Full-stack hosts', 'pt-BR': 'Hosts full-stack' },
  'p.lic.cls.infra': { en: 'Infrastructure hosts', 'pt-BR': 'Hosts de infraestrutura' },
  'p.lic.cls.total': { en: 'Total Host Units', 'pt-BR': 'Total de Host Units' },
  'p.lic.dps.title': { en: 'DPS — Results Summary (estimated annual usage)', 'pt-BR': 'DPS — Results Summary (uso anual estimado)' },
  'p.lic.dps.body': {
    en: 'The estimated annual usage per capability, in the same layout as the official DPS Usage Estimator “Results Summary” tab — ready to copy or export. Capabilities Dynatrace could not measure here show a dash, exactly like the estimator.',
    'pt-BR': 'O uso anual estimado por capacidade, no mesmo layout da aba “Results Summary” do estimador oficial de DPS — pronto para copiar ou exportar. Capacidades que a Dynatrace não mediu aqui aparecem com um traço, exatamente como no estimador.',
  },
  'p.lic.rs.category': { en: 'Category', 'pt-BR': 'Categoria' },
  'p.lic.rs.capability': { en: 'Capability', 'pt-BR': 'Capacidade' },
  'p.lic.rs.usageMonthly': { en: 'Est. monthly usage', 'pt-BR': 'Uso mensal estimado' },
  'p.lic.rs.usage': { en: 'Est. annual usage', 'pt-BR': 'Uso anual estimado' },
  'p.lic.rs.volume': { en: 'Rate-card volume', 'pt-BR': 'Volume do rate card' },
  'p.lic.rs.cost': { en: 'Est. annual ({currency})', 'pt-BR': 'Est. anual ({currency})' },
  'p.lic.rs.costMonthly': { en: 'Monthly ({currency})', 'pt-BR': 'Mensal ({currency})' },
  'p.lic.rs.costAnnual': { en: 'Annual ({currency})', 'pt-BR': 'Anual ({currency})' },
  'p.lic.rs.per': { en: 'per', 'pt-BR': 'por' },
  'p.lic.rs.unit': { en: 'Unit', 'pt-BR': 'Unidade' },
  'p.lic.rs.driver': { en: 'Measured driver', 'pt-BR': 'Driver medido' },
  'p.lic.rs.measuredMonthly': { en: 'Measured (monthly)', 'pt-BR': 'Medido (mensal)' },
  'p.lic.rs.measured': { en: 'Measured (annual)', 'pt-BR': 'Medido (anual)' },
  'p.lic.rs.measureUnit': { en: 'Unit of measure', 'pt-BR': 'Unidade de medida' },
  'p.lic.dps.fullStack': { en: 'Full-Stack Monitoring', 'pt-BR': 'Monitoramento Full-Stack' },
  'p.lic.dps.infra': { en: 'Infrastructure Monitoring', 'pt-BR': 'Monitoramento de Infraestrutura' },
  'p.lic.dps.hostHour': { en: 'host-hour', 'pt-BR': 'host-hora' },
  'p.lic.dps.logs': { en: 'Log Management & Analytics', 'pt-BR': 'Log Management e Analytics' },
  'p.lic.dps.perMonth': { en: 'GiB / month', 'pt-BR': 'GiB / mês' },
  'p.lic.dps.k8s': { en: 'Kubernetes Platform', 'pt-BR': 'Plataforma Kubernetes' },
  'p.lic.dps.workloads': { en: 'workloads', 'pt-BR': 'workloads' },
  'p.lic.dps.synthetics': { en: 'Synthetic Monitoring', 'pt-BR': 'Monitoramento Sintético' },
  'p.lic.dps.monitors': { en: 'monitors', 'pt-BR': 'monitores' },
  'p.lic.dps.cloud': { en: 'Cloud Services', 'pt-BR': 'Serviços de Nuvem' },
  'p.lic.dps.hosts': { en: 'hosts', 'pt-BR': 'hosts' },
  'p.lic.dps.rum': { en: 'Real User Monitoring', 'pt-BR': 'Real User Monitoring' },
  'p.lic.dps.sessions': { en: 'sessions', 'pt-BR': 'sessões' },
  'p.lic.dps.appsec': { en: 'Application Security', 'pt-BR': 'Application Security' },
  'p.lic.active': { en: 'Active', 'pt-BR': 'Ativo' },
  'p.lic.inactive': { en: 'Not in use', 'pt-BR': 'Não usado' },
  'p.lic.h.component': { en: 'Component', 'pt-BR': 'Componente' },
  'p.lic.h.quantity': { en: 'Quantity', 'pt-BR': 'Quantidade' },
  'p.lic.h.unit': { en: 'Sizing unit', 'pt-BR': 'Unidade de sizing' },
  'p.lic.export': { en: 'Download CSV', 'pt-BR': 'Baixar CSV' },
  'p.lic.est.classicAnnual': { en: 'Estimated annual (Classic)', 'pt-BR': 'Estimativa anual (Classic)' },
  'p.lic.est.classicCalc': { en: '{hu} Host Units × your per-HU rate', 'pt-BR': '{hu} Host Units × sua taxa por HU' },
  'p.lic.est.dpsMonthly': { en: 'Estimated monthly (DPS)', 'pt-BR': 'Estimativa mensal (DPS)' },
  'p.lic.est.dpsAnnual': { en: 'Estimated annual (DPS)', 'pt-BR': 'Estimativa anual (DPS)' },
  'p.lic.est.dpsCalc': { en: 'sum of measured rows × public list price', 'pt-BR': 'soma das linhas medidas × preço de lista público' },
  'p.lic.est.dpsAnnualCalc': { en: 'monthly estimate × 12', 'pt-BR': 'estimativa mensal × 12' },
  'p.lic.est.dpsHint': { en: 'Add DPS unit rates in Settings to estimate a value.', 'pt-BR': 'Adicione taxas de unidade DPS em Configurações para estimar um valor.' },
  'p.lic.est.setRate': { en: 'Set a rate in Settings', 'pt-BR': 'Defina uma taxa em Configurações' },
  'p.lic.est.disclaimer': {
    en: 'Indicative estimate from the public rate card — not a quote. Negotiated pricing differs.',
    'pt-BR': 'Estimativa indicativa do rate card público — não é uma cotação. O preço negociado difere.',
  },
  'p.lic.gate.title': { en: 'Value estimate is off', 'pt-BR': 'Estimativa de valor desativada' },
  'p.lic.gate.body': {
    en: 'Enable the public rate card in Settings to turn this sizing into an indicative price. Until then, only units are shown.',
    'pt-BR': 'Ative o rate card público em Configurações para transformar este sizing em um preço indicativo. Até lá, apenas as unidades são exibidas.',
  },
  'p.infra.question': {
    en: 'What is the estate made of, how saturated is it, and where does cloud attribution exist?',
    'pt-BR': 'Do que o parque é feito, quão saturado ele está e onde existe atribuição de nuvem?',
  },
  'p.infra.takeaway': {
    en: 'Host discovery, operating-system detection and capacity attributes all come from the agent, not from an inventory list.',
    'pt-BR':
      'Descoberta de hosts, detecção de sistema operacional e atributos de capacidade vêm todos do agente, não de uma planilha de inventário.',
  },
  'p.infra.saturation': { en: 'Saturation trend', 'pt-BR': 'Tendência de saturação' },
  'p.infra.saturationBody': {
    en: 'These are averages across every monitored host. An average hides outliers by construction, so use it to judge overall headroom, not to clear an individual host.',
    'pt-BR':
      'São médias entre todos os hosts monitorados. Uma média esconde outliers por construção, então use-a para avaliar folga geral, não para inocentar um host específico.',
  },
  'p.infra.cloudCost': { en: 'On cloud cost data', 'pt-BR': 'Sobre dados de custo de nuvem' },
  'p.infra.cloudCostBody': {
    en: 'Cloud provider and region attributes are read where the platform reports them. Cloud cost-allocation data are a separate configuration, and the platform’s usage is on the Consumption page. Nothing on this page is converted into a monetary figure.',
    'pt-BR':
      'Os atributos de provedor e região de nuvem são lidos onde a plataforma os reporta. Dados de rateio de custo de nuvem são uma configuração separada, e o uso da plataforma está na página de Consumo. Nada nesta página é convertido em valor monetário.',
  },
  'p.infra.inventory': { en: 'Host inventory', 'pt-BR': 'Inventário de hosts' },
  'p.infra.assist.title': { en: 'Where to act on capacity first', 'pt-BR': 'Onde agir na capacidade primeiro' },
  'p.infra.assist.s.risk': {
    en: '{saturated} host(s) are saturated and {pressured} under pressure, with memory utilisation at {pct}% — right-size or rebalance these before they page you.',
    'pt-BR': '{saturated} host(s) saturado(s) e {pressured} sob pressão, com utilização de memória em {pct}% — redimensione ou rebalanceie antes que gerem alerta.',
  },
  'p.infra.assist.s.reclaim': {
    en: '{count} over-provisioned {count|host holds|hosts hold} about {memory} of reclaimable memory — the clearest cost reduction on the estate.',
    'pt-BR': '{count} {count|host superdimensionado soma|hosts superdimensionados somam} cerca de {memory} de memória recuperável — a redução de custo mais clara do parque.',
  },
  'p.infra.assist.s.balanced': {
    en: 'Capacity is balanced: no host is saturated and none is materially over-provisioned in the window.',
    'pt-BR': 'A capacidade está equilibrada: nenhum host está saturado nem materialmente superdimensionado no período.',
  },
  'p.infra.h.os': { en: 'OS', 'pt-BR': 'SO' },
  'p.infra.h.osVersion': { en: 'OS version', 'pt-BR': 'Versão do SO' },
  'p.infra.h.cpuCores': { en: 'CPU cores', 'pt-BR': 'Núcleos de CPU' },
  'p.infra.h.memory': { en: 'Memory', 'pt-BR': 'Memória' },
  'p.infra.h.hostGroup': { en: 'Host group', 'pt-BR': 'Grupo de hosts' },
  'p.infra.h.networkZone': { en: 'Network zone', 'pt-BR': 'Zona de rede' },
  'p.infra.h.state': { en: 'State', 'pt-BR': 'Estado' },

  // ======================================================= page: kubernetes
  'p.k8s.title': { en: 'Kubernetes and containers', 'pt-BR': 'Kubernetes e contêineres' },
  'p.k8s.question': {
    en: 'Which workloads are unstable, and what is the evidence behind any resource recommendation?',
    'pt-BR':
      'Quais workloads estão instáveis e qual é a evidência por trás de qualquer recomendação de recurso?',
  },
  'p.k8s.takeaway': {
    en: 'Cluster, node, namespace, workload and container relationships were discovered automatically from the cluster.',
    'pt-BR':
      'As relações entre cluster, nó, namespace, workload e contêiner foram descobertas automaticamente a partir do cluster.',
  },
  'p.k8s.clusters': { en: 'Clusters in scope', 'pt-BR': 'Clusters no escopo' },
  'p.k8s.instability': { en: 'Workload instability', 'pt-BR': 'Instabilidade de workloads' },
  'p.k8s.instabilityBody': {
    en: 'A container restart is a workload that stopped and was replaced. High counts mean the workload is not holding steady state, which is visible to Dynatrace without any application change.',
    'pt-BR':
      'Um restart de contêiner é um workload que parou e foi substituído. Contagens altas indicam que o workload não está mantendo estado estável, o que a Dynatrace enxerga sem nenhuma alteração na aplicação.',
  },
  'p.k8s.highestRestart': {
    en: 'Highest restart count: {name} with {count} container {count|restart|restarts} over the selected window, across {total} {total|workload|workloads} with any restart at all. Restart counts show instability; they do not by themselves identify the cause.',
    'pt-BR':
      'Maior número de restarts: {name}, com {count} {count|reinício|reinícios} de contêiner na janela selecionada, entre {total} {total|workload que teve|workloads que tiveram} algum restart. A contagem de restarts mostra instabilidade; ela sozinha não identifica a causa.',
  },
  'p.k8s.pressure': { en: 'Memory and CPU pressure', 'pt-BR': 'Pressão de memória e CPU' },
  'p.k8s.assist.title': { en: 'Where to stabilise the platform first', 'pt-BR': 'Onde estabilizar a plataforma primeiro' },
  'p.k8s.assist.s.restart': {
    en: '{workload} on {cluster} restarted {restarts} {restarts|time|times} ({total} across the fleet) — the top crash-loop candidate to investigate.',
    'pt-BR': '{workload} em {cluster} reiniciou {restarts} {restarts|vez|vezes} ({total} no total) — o principal candidato a crash-loop para investigar.',
  },
  'p.k8s.assist.s.pressure': {
    en: 'Resource pressure is real: {oom} OOM kill(s) and {throttled} throttled workload(s) — revisit memory limits and CPU requests.',
    'pt-BR': 'A pressão de recursos é real: {oom} OOM kill(s) e {throttled} workload(s) com throttling — revise os limits de memória e requests de CPU.',
  },
  'p.k8s.assist.s.stable': {
    en: 'No restarts, OOM kills or throttling were measured — the clusters are running clean in this window.',
    'pt-BR': 'Nenhum restart, OOM kill ou throttling foi medido — os clusters estão rodando limpos neste período.',
  },
  'p.k8s.pressureBody': {
    en: 'Out-of-memory kills and CPU throttling are the measured evidence behind a right-sizing conversation. The measurement shows that a workload is constrained; it does not tell you what the correct request or limit should be.',
    'pt-BR':
      'Mortes por falta de memória e throttling de CPU são a evidência medida por trás de uma conversa de dimensionamento. A medição mostra que um workload está restrito; ela não diz qual deveria ser o request ou o limit correto.',
  },
  'p.k8s.pressureRec': {
    en: 'Recommendation, not a finding: review requests and limits for the workloads listed here together with their owners. Any change should be validated in a non-production namespace first.',
    'pt-BR':
      'Recomendação, não constatação: revise requests e limits dos workloads listados aqui junto com seus responsáveis. Qualquer mudança deve ser validada primeiro em um namespace fora de produção.',
  },
  'p.k8s.h.restarts': { en: 'Container restarts', 'pt-BR': 'Restarts de contêiner' },
  'p.k8s.h.oom': { en: 'Out-of-memory kills', 'pt-BR': 'Mortes por falta de memória' },
  'p.k8s.h.throttling': { en: 'CPU throttling', 'pt-BR': 'Throttling de CPU' },

  // ======================================================= page: technologies
  'p.tech.title': { en: 'Processes and technologies', 'pt-BR': 'Processos e tecnologias' },
  'p.tech.question': {
    en: 'What technologies are actually running, and at which versions?',
    'pt-BR': 'Quais tecnologias estão realmente rodando, e em quais versões?',
  },
  'p.tech.takeaway': {
    en: 'This inventory was not supplied by anyone. Every row is a technology Dynatrace identified by itself, including runtime versions where they are detectable.',
    'pt-BR':
      'Este inventário não foi fornecido por ninguém. Cada linha é uma tecnologia que a Dynatrace identificou sozinha, incluindo versões de runtime onde são detectáveis.',
  },
  'p.tech.noClaim': { en: 'What this page does not claim', 'pt-BR': 'O que esta página não afirma' },
  'p.tech.noClaimBody': {
    en: 'Versions are shown exactly as the platform reports them. This app does not label any version as end-of-life, unsupported or vulnerable, because that would require a vendor lifecycle source it does not have. Use this inventory as the input to that assessment, not as the assessment itself.',
    'pt-BR':
      'As versões são mostradas exatamente como a plataforma as reporta. Este app não classifica nenhuma versão como fora de suporte, obsoleta ou vulnerável, porque isso exigiria uma fonte de ciclo de vida do fabricante que ele não possui. Use este inventário como entrada dessa avaliação, não como a avaliação em si.',
  },
  'p.tech.inventory': { en: 'Detected technology inventory', 'pt-BR': 'Inventário de tecnologias detectadas' },
  'p.tech.inventoryBody': {
    en: 'Rows where the version is not reported indicate the technology was identified but its version was not exposed to the agent. That is a detection-depth observation, not a missing technology.',
    'pt-BR':
      'Linhas sem versão indicam que a tecnologia foi identificada mas sua versão não foi exposta ao agente. Isso é uma observação sobre profundidade de detecção, não uma tecnologia faltando.',
  },
  'p.tech.h.edition': { en: 'Edition', 'pt-BR': 'Edição' },
  'p.tech.h.instances': { en: 'Process instances', 'pt-BR': 'Instâncias de processo' },

  // ======================================================= page: logs
  'p.logs.title': { en: 'Logs and data quality', 'pt-BR': 'Logs e qualidade de dados' },
  'p.logs.question': {
    en: 'Are the logs being stored actually usable for analysis, and what does storing them cost?',
    'pt-BR':
      'Os logs armazenados são realmente utilizáveis para análise, e quanto custa armazená-los?',
  },
  'p.logs.takeaway': {
    en: 'Volume is easy to achieve. Context is what makes a log answer a question.',
    'pt-BR': 'Volume é fácil de alcançar. Contexto é o que faz um log responder a uma pergunta.',
  },
  'p.logs.sampleNote': {
    en: 'Counted over every record of a deliberately short window in every log bucket this identity can read, because logs are the costliest table to scan.',
    'pt-BR':
      'Contado sobre todos os registros de uma janela deliberadamente curta em todos os buckets de log que esta identidade pode ler, porque logs são a tabela mais cara de varrer.',
  },
  'p.logs.kpi.records': { en: 'Log records in the 30-minute window', 'pt-BR': 'Registros de log na janela de 30 minutos' },
  'p.logs.kpi.withService': { en: 'Records with service context', 'pt-BR': 'Registros com contexto de serviço' },
  'p.logs.kpi.noSeverity': { en: 'Records without a severity', 'pt-BR': 'Registros sem severidade' },
  'p.logs.noContextTitle': {
    en: 'Logs are being stored with almost no topology context',
    'pt-BR': 'Os logs estão sendo armazenados quase sem contexto de topologia',
  },
  'p.logs.noContextBody': {
    en: 'Only {pct} of the log records read in the last 30 minutes (every readable bucket) carry a service entity. A log line without service, host or namespace context cannot be pivoted to a problem, a trace or an owner, so its analytical value is close to zero while its ingest and retention cost is unchanged.',
    'pt-BR':
      'Apenas {pct} dos registros de log lidos nos últimos 30 minutos (todos os buckets legíveis) carregam uma entidade de serviço. Uma linha de log sem contexto de serviço, host ou namespace não pode ser cruzada com um problema, um trace ou um responsável, então seu valor analítico é próximo de zero enquanto o custo de ingestão e retenção permanece o mesmo.',
  },
  'p.logs.noContextRec': {
    en: 'Recommendation, requiring validation before any change: enrich these sources at ingest so that service, host and namespace are attached, and convert the recurring patterns into metrics or events where a count is what matters rather than the text.',
    'pt-BR':
      'Recomendação, que exige validação antes de qualquer mudança: enriqueça essas fontes na ingestão para que serviço, host e namespace sejam anexados, e converta os padrões recorrentes em métricas ou eventos onde o que importa é a contagem e não o texto.',
  },
  'p.logs.severityMix': { en: 'Severity mix and context coverage', 'pt-BR': 'Distribuição de severidade e cobertura de contexto' },
  'p.logs.ingestQuality': { en: 'Ingestion quality reported by the platform', 'pt-BR': 'Qualidade de ingestão reportada pela plataforma' },
  'p.logs.ingestQualityBody': {
    en: "These are Dynatrace's own self-monitoring signals about log ingestion, not this app's interpretation. Unparsed or ambiguous timestamps and process-group ambiguity all degrade the ability to correlate a log line with anything else.",
    'pt-BR':
      'Estes são os sinais de automonitoramento da própria Dynatrace sobre a ingestão de logs, não uma interpretação deste app. Timestamps não interpretados ou ambíguos e ambiguidade de process group degradam a capacidade de correlacionar uma linha de log com qualquer outra coisa.',
  },
  'p.logs.buckets': { en: 'Log buckets, volume and retention', 'pt-BR': 'Buckets de log, volume e retenção' },
  'p.logs.assist.title': { en: 'Where to raise log value first', 'pt-BR': 'Onde elevar o valor dos logs primeiro' },
  'p.logs.assist.s.context': {
    en: 'Only {pct}% of {records} log records carry service context — enrich at ingest (OpenPipeline) so logs are queryable by service, not just by text.',
    'pt-BR': 'Apenas {pct}% de {records} registros de log carregam contexto de serviço — enriqueça na ingestão (OpenPipeline) para que os logs sejam consultáveis por serviço, não apenas por texto.',
  },
  'p.logs.assist.s.unclassified': {
    en: '{pct}% of logs are unclassified — classifying them turns dead storage into searchable signal at the same cost.',
    'pt-BR': '{pct}% dos logs estão não classificados — classificá-los transforma armazenamento morto em sinal pesquisável pelo mesmo custo.',
  },
  'p.logs.assist.s.ingest': {
    en: '{bytes} were ingested in the window — the bill is identical whether or not each record carries context, so context is free leverage.',
    'pt-BR': '{bytes} foram ingeridos no período — a conta é idêntica independentemente de cada registro ter contexto, então contexto é alavancagem grátis.',
  },
  'p.logs.neverChangesTitle': { en: 'This app never changes your data', 'pt-BR': 'Este app nunca altera seus dados' },
  'p.logs.neverChangesBody': {
    en: 'No bucket, retention setting or pipeline is created, modified or deleted from here. Every item below is a recommendation for a human to review and apply deliberately.',
    'pt-BR':
      'Nenhum bucket, configuração de retenção ou pipeline é criado, alterado ou removido a partir daqui. Cada item abaixo é uma recomendação para uma pessoa revisar e aplicar deliberadamente.',
  },
  'p.logs.emptyBuckets': {
    en: 'Buckets holding zero records may be leftovers from testing. Consolidating them is a governance improvement with no data loss, but confirm ownership first.',
    'pt-BR':
      'Buckets com zero registros podem ser resquícios de teste. Consolidá-los é uma melhoria de governança sem perda de dados, mas confirme a titularidade antes.',
  },
  'p.logs.h.severity': { en: 'Severity', 'pt-BR': 'Severidade' },
  'p.logs.h.withService': { en: 'With service context', 'pt-BR': 'Com contexto de serviço' },
  'p.logs.h.withHost': { en: 'With host context', 'pt-BR': 'Com contexto de host' },
  'p.logs.h.withNamespace': { en: 'With namespace context', 'pt-BR': 'Com contexto de namespace' },

  // ======================================================= page: consumption
  'p.cons.title': { en: 'Consumption and events', 'pt-BR': 'Consumo e eventos' },
  'p.cons.question': {
    en: 'Which capabilities were actually used, where do queries concentrate, and what can be governed?',
    'pt-BR':
      'Quais capacidades foram de fato usadas, onde as consultas se concentram e o que pode ser governado?',
  },
  'p.cons.takeaway': {
    en: "Usage is measured from the platform's own usage and query events. This page shows volume and effort, never money.",
    'pt-BR':
      'O uso é medido a partir dos próprios eventos de uso e de consulta da plataforma. Esta página mostra volume e esforço, nunca dinheiro.',
  },
  'p.cons.notTell': { en: 'What this page will not tell you', 'pt-BR': 'O que esta página não vai dizer' },
  'p.cons.notTellBody1': {
    en: 'There is no pricing information in this environment, so this app contains no rate card, no currency and no cost calculation. Every figure below is usage as the platform reported it, with the source unit stated.',
    'pt-BR':
      'Não há informação de preços neste ambiente, então este app não contém tabela de preços, moeda nem cálculo de custo. Cada número abaixo é o uso conforme a plataforma reportou, com a unidade de origem declarada.',
  },
  'p.cons.notTellBody2': {
    en: 'Commercial terms, committed volumes and any monetary interpretation must come from your Dynatrace commercial documentation. Nothing here should be presented as a saving, a forecast or a contractual figure.',
    'pt-BR':
      'Termos comerciais, volumes contratados e qualquer interpretação monetária devem vir da sua documentação comercial Dynatrace. Nada aqui deve ser apresentado como economia, previsão ou valor contratual.',
  },
  'p.cons.capabilities': { en: 'Capabilities exercised', 'pt-BR': 'Capacidades exercitadas' },
  'p.cons.capabilitiesBody': {
    en: 'Each row is a licensed capability that recorded usage in the window. This is the honest answer to "what did we actually try during the PoC", and it is read from the platform’s own usage events rather than from a feature checklist.',
    'pt-BR':
      'Cada linha é uma capacidade licenciada que registrou uso na janela. Esta é a resposta honesta para "o que realmente experimentamos durante a PoC", lida dos próprios eventos de uso da plataforma e não de uma lista de features.',
  },
  'p.cons.unitWarning': {
    en: '{count} capability {count|figure needs|figures need} unit confirmation',
    'pt-BR': '{count} {count|número de capacidade precisa|números de capacidade precisam} de confirmação de unidade',
  },
  'p.cons.unitWarningBody': {
    en: 'Retention capabilities report a figure that is not a plain byte count. It is shown unconverted and must be interpreted against your licensing documentation before being quoted. Reading it as bytes would overstate consumption dramatically.',
    'pt-BR':
      'Capacidades de retenção reportam um número que não é uma contagem simples de bytes. Ele é exibido sem conversão e deve ser interpretado com base na sua documentação de licenciamento antes de ser citado. Lê-lo como bytes superestimaria drasticamente o consumo.',
  },
  'p.cons.queryCost': { en: 'Where query cost concentrates', 'pt-BR': 'Onde o custo de consulta se concentra' },
  'p.cons.queryCostBody': {
    en: 'Read from the platform\'s own query accounting across all clients of this environment, not just this app. "Scanned per record" is a derived field and is the most useful column here: a high value means a query is reading a great deal of data to return very little.',
    'pt-BR':
      'Lido da própria contabilidade de consultas da plataforma, considerando todos os clientes deste ambiente e não apenas este app. "Varrido por registro" é um campo derivado e é a coluna mais útil aqui: um valor alto significa que a consulta está lendo muitos dados para devolver muito pouco.',
  },
  'p.cons.privacyTitle': { en: 'Personal data deliberately excluded', 'pt-BR': 'Dados pessoais deliberadamente excluídos' },
  'p.cons.privacyBody': {
    en: 'The underlying records carry the email address of whoever ran each query. This app never selects that field, and its export path strips identifiers as a second line of defence.',
    'pt-BR':
      'Os registros de origem carregam o e-mail de quem executou cada consulta. Este app nunca seleciona esse campo, e seu caminho de exportação remove identificadores como segunda linha de defesa.',
  },
  'p.cons.leastEfficient': {
    en: 'Least efficient table by scan-per-record: {table}, at {value} scanned for every record returned. Every bucket in this environment reports zero included query days, so all of this scanning is on-demand.',
    'pt-BR':
      'Tabela menos eficiente por varredura-por-registro: {table}, com {value} varridos para cada registro devolvido. Todos os buckets deste ambiente reportam zero dias de consulta inclusos, então toda essa varredura é sob demanda.',
  },
  'p.cons.h.capability': { en: 'Licensed capability', 'pt-BR': 'Capacidade licenciada' },
  'p.cons.h.usageEvents': { en: 'Usage events', 'pt-BR': 'Eventos de uso' },
  'p.cons.h.reportedVolume': { en: 'Reported volume', 'pt-BR': 'Volume reportado' },
  'p.cons.h.interpretation': { en: 'Interpretation', 'pt-BR': 'Interpretação' },
  'p.cons.i.byteBased': { en: 'Ingest volume, byte based', 'pt-BR': 'Volume de ingestão, baseado em bytes' },
  'p.cons.i.needsConfirm': { en: 'Unit needs confirmation', 'pt-BR': 'Unidade precisa de confirmação' },
  'p.cons.i.counted': { en: 'Counted, not volume based', 'pt-BR': 'Contado, não baseado em volume' },
  'p.cons.h.queries': { en: 'Queries', 'pt-BR': 'Consultas' },
  'p.cons.h.scannedOnDemand': { en: 'Scanned on demand', 'pt-BR': 'Varrido sob demanda' },
  'p.cons.h.recordsDelivered': { en: 'Records delivered', 'pt-BR': 'Registros devolvidos' },
  'p.cons.h.scannedPerRecord': { en: 'Scanned per record', 'pt-BR': 'Varrido por registro' },

  // ======================================================= page: automation
  'p.auto.title': { en: 'Automation and workflows', 'pt-BR': 'Automação e workflows' },
  'p.auto.question': {
    en: 'What is already automated in this environment, and is that automation actually reliable?',
    'pt-BR': 'O que já está automatizado neste ambiente, e essa automação é de fato confiável?',
  },
  'p.auto.takeaway': {
    en: 'These are real executions recorded by the automation engine, not a description of what automation could do.',
    'pt-BR':
      'Estas são execuções reais registradas pelo motor de automação, não uma descrição do que a automação poderia fazer.',
  },
  'p.auto.noExecTitle': { en: 'This app does not execute anything', 'pt-BR': 'Este app não executa nada' },
  'p.auto.noExecBody': {
    en: 'No workflow is triggered, created or modified from here, and no remediation is performed. The purpose of this page is to evidence existing automation and identify where more would remove repeated effort.',
    'pt-BR':
      'Nenhum workflow é disparado, criado ou alterado a partir daqui, e nenhuma remediação é executada. O propósito desta página é evidenciar a automação existente e identificar onde mais automação eliminaria esforço repetido.',
  },
  'p.auto.executions': {
    en: 'Workflow executions that reached a final state',
    'pt-BR': 'Execuções de workflow que chegaram a um estado final',
  },
  'p.auto.allGood': {
    en: '{success} successful {success|execution|executions} across {count} {count|workflow|workflows}, with no failures in this window.',
    'pt-BR':
      '{success} {success|execução bem-sucedida|execuções bem-sucedidas} em {count} {count|workflow|workflows}, sem nenhuma falha nesta janela.',
  },
  'p.auto.failingTitle': { en: '{count} are failing on a schedule', 'pt-BR': '{count} estão falhando de forma recorrente' },
  'p.auto.failingBody': {
    en: '{failed} failed executions against {success} successful ones. Fix these before presenting automation as a proven outcome: a scheduled workflow that fails repeatedly is operational debt, not automation.',
    'pt-BR':
      '{failed} execuções com falha contra {success} bem-sucedidas. Resolva isso antes de apresentar automação como resultado comprovado: um workflow agendado que falha repetidamente é dívida operacional, não automação.',
  },
  'p.auto.failingList': { en: 'Failing: {list}', 'pt-BR': 'Falhando: {list}' },
  'p.auto.whereNext': {
    en: 'Where automation would remove repeated effort',
    'pt-BR': 'Onde a automação eliminaria esforço repetido',
  },
  'p.auto.whereNextBody': {
    en: 'The recurring problem patterns on the Problems page are the evidence-backed candidates. Each pattern that repeats is effort that repeats. Turning one into a workflow is a scoped change with a measurable before and after, which is exactly what makes it defensible.',
    'pt-BR':
      'Os padrões recorrentes de problema na página de Problemas são os candidatos com evidência. Cada padrão que se repete é esforço que se repete. Transformar um deles em workflow é uma mudança delimitada, com antes e depois mensuráveis — que é exatamente o que a torna defensável.',
  },
  'p.auto.whereNextRec': {
    en: 'Recommendation, not a finding: pick the single highest-recurrence pattern, define the response, and add an approval gate before any action that changes state. Automated remediation without an approval control is not something this app will suggest running unattended.',
    'pt-BR':
      'Recomendação, não constatação: escolha o padrão de maior recorrência, defina a resposta e adicione uma etapa de aprovação antes de qualquer ação que altere estado. Remediação automática sem controle de aprovação não é algo que este app sugira rodar sem supervisão.',
  },
  'p.auto.h.workflow': { en: 'Workflow', 'pt-BR': 'Workflow' },
  'p.auto.h.finalState': { en: 'Final state', 'pt-BR': 'Estado final' },
  'p.auto.h.trigger': { en: 'Trigger', 'pt-BR': 'Gatilho' },
  'p.auto.h.executions': { en: 'Executions', 'pt-BR': 'Execuções' },

  // ======================================================= page: business
  'p.biz.title': { en: 'Business observability', 'pt-BR': 'Observabilidade de negócio' },
  'p.biz.question': {
    en: 'Is business context reaching the platform, and can technical findings be connected to it?',
    'pt-BR':
      'O contexto de negócio está chegando à plataforma, e as constatações técnicas podem ser conectadas a ele?',
  },
  'p.biz.takeaway': {
    en: 'Business events are arriving with recognisable domain semantics. That is the prerequisite for connecting a technical problem to a business outcome.',
    'pt-BR':
      'Eventos de negócio estão chegando com semântica de domínio reconhecível. Esse é o pré-requisito para conectar um problema técnico a um resultado de negócio.',
  },
  'p.biz.stopsTitle': { en: 'Where this page stops deliberately', 'pt-BR': 'Onde esta página para deliberadamente' },
  'p.biz.stopsBody1': {
    en: 'Event volume is measured. Business value is not, and cannot be derived from a count. To state that a problem cost a specific amount, you would need a value per event supplied and confirmed by the business.',
    'pt-BR':
      'O volume de eventos é medido. O valor de negócio não é, e não pode ser derivado de uma contagem. Para afirmar que um problema custou um valor específico, seria necessário um valor por evento fornecido e confirmado pela área de negócio.',
  },
  'p.biz.stopsBody2': {
    en: 'This app will not estimate that number. A fabricated business impact figure is the fastest way to lose credibility in a closing meeting, and it is not needed: the fact that this data is already in the same platform as the problems is the point.',
    'pt-BR':
      'Este app não vai estimar esse número. Um valor de impacto de negócio inventado é o jeito mais rápido de perder credibilidade em uma reunião de fechamento — e é desnecessário: o ponto é que esse dado já está na mesma plataforma que os problemas.',
  },
  'p.biz.observed': { en: 'Business event types observed', 'pt-BR': 'Tipos de evento de negócio observados' },
  'p.biz.summary': {
    en: '{types} distinct event types and {events} events in this window. Each type is a business process already visible to the platform without a separate analytics tool.',
    'pt-BR':
      '{types} tipos distintos de evento e {events} eventos nesta janela. Cada tipo é um processo de negócio já visível à plataforma sem uma ferramenta de analytics separada.',
  },
  'p.biz.nextTitle': { en: 'What becomes possible next', 'pt-BR': 'O que passa a ser possível' },
  'p.biz.nextBody': {
    en: 'Because these events sit in the same store as problems, traces and logs, a single query can relate a technical failure to the business process it interrupted. Agreeing the value model with the business is the step that turns that from a correlation into an impact statement, and it is a decision for the customer rather than an output of this app.',
    'pt-BR':
      'Como esses eventos ficam no mesmo repositório que problemas, traces e logs, uma única consulta consegue relacionar uma falha técnica ao processo de negócio que ela interrompeu. Acordar o modelo de valor com a área de negócio é o passo que transforma isso de correlação em declaração de impacto — e é uma decisão do cliente, não uma saída deste app.',
  },
  'p.biz.h.eventType': { en: 'Business event type', 'pt-BR': 'Tipo de evento de negócio' },
  'p.biz.h.events': { en: 'Events', 'pt-BR': 'Eventos' },

  // ======================================================= page: security
  'p.sec.title': { en: 'Security and runtime risk', 'pt-BR': 'Segurança e risco em runtime' },
  'p.sec.question': {
    en: 'What vulnerabilities exist, and which of them are actually reachable at runtime?',
    'pt-BR': 'Quais vulnerabilidades existem, e quais delas são realmente alcançáveis em runtime?',
  },
  'p.sec.takeaway': {
    en: 'Runtime context is what separates a long vulnerability list from a short list that matters. Whether that can be shown here depends on permissions.',
    'pt-BR':
      'O contexto de runtime é o que separa uma lista longa de vulnerabilidades de uma lista curta que importa. Se isso pode ser mostrado aqui depende de permissões.',
  },
  'p.sec.readFirst': { en: 'Read this before drawing any conclusion', 'pt-BR': 'Leia isto antes de tirar qualquer conclusão' },
  'p.sec.readFirstBody1': {
    en: 'An empty result on this page must never be read as "no vulnerabilities". If the query below is refused, it means this identity cannot see the data, not that the data is clean.',
    'pt-BR':
      'Um resultado vazio nesta página nunca deve ser lido como "sem vulnerabilidades". Se a consulta abaixo for recusada, significa que esta identidade não consegue ver os dados, não que os dados estejam limpos.',
  },
  'p.sec.readFirstBody2': {
    en: 'During validation, this environment reported holding a very large volume of security event records at long retention, while refusing the query for lack of a scope. Both facts matter, and presenting only the second would be misleading.',
    'pt-BR':
      'Durante a validação, este ambiente reportou guardar um volume muito grande de registros de eventos de segurança com retenção longa, ao mesmo tempo em que recusou a consulta por falta de escopo. Os dois fatos importam, e apresentar apenas o segundo seria enganoso.',
  },
  'p.sec.findings': { en: 'Runtime vulnerability findings', 'pt-BR': 'Achados de vulnerabilidade em runtime' },
  'p.sec.closeGap': { en: 'How to close this gap', 'pt-BR': 'Como fechar essa lacuna' },
  'p.sec.closeGapBody': {
    en: "Grant the scope below to the identity used for the review, then reload this page. The scope name is taken from the platform's own error response, not guessed.",
    'pt-BR':
      'Conceda o escopo abaixo à identidade usada na análise e recarregue esta página. O nome do escopo vem da própria resposta de erro da plataforma, não foi adivinhado.',
  },
  'p.sec.manifestNote': {
    en: 'Note that the app already declares this scope in its manifest. The gap is in what the signed-in identity is permitted to do, which is a separate decision from what the app requests.',
    'pt-BR':
      'Observe que o app já declara esse escopo em seu manifesto. A lacuna está no que a identidade autenticada tem permissão de fazer, que é uma decisão separada do que o app solicita.',
  },
  'p.sec.h.findingType': { en: 'Finding type', 'pt-BR': 'Tipo de achado' },
  'p.sec.h.findings': { en: 'Findings', 'pt-BR': 'Achados' },

  // ======================================================= page: experience
  'p.dx.title': { en: 'Applications and digital experience', 'pt-BR': 'Aplicações e experiência digital' },
  'p.dx.question': {
    en: 'What did real users actually experience?',
    'pt-BR': 'O que os usuários reais de fato vivenciaram?',
  },
  'p.dx.takeaway': {
    en: 'This question cannot be answered from this environment. The section states why rather than substituting a different measurement.',
    'pt-BR':
      'Esta pergunta não pode ser respondida a partir deste ambiente. A seção explica o motivo em vez de substituir por outra medição.',
  },
  'p.dx.gapTitle': {
    en: 'Declared gap: real user monitoring is not usable here',
    'pt-BR': 'Lacuna declarada: o monitoramento de usuário real não é utilizável aqui',
  },
  'p.dx.gapBody1': {
    en: 'Two independent problems apply at once. The session buckets are not readable by the signed-in identity, and they hold a negligible number of records, so even with access granted there would be almost nothing to analyse.',
    'pt-BR':
      'Dois problemas independentes ocorrem ao mesmo tempo. Os buckets de sessão não são legíveis pela identidade autenticada, e guardam um número irrisório de registros — então, mesmo com o acesso concedido, quase não haveria o que analisar.',
  },
  'p.dx.gapBody2': {
    en: 'This app therefore makes no claim about page load times, Apdex, Core Web Vitals, conversion or user satisfaction. Service-side latency and synthetic results are real and are shown elsewhere, but neither of them is a measurement of what a user experienced, and this page will not present them as if they were.',
    'pt-BR':
      'Por isso este app não faz nenhuma afirmação sobre tempo de carregamento, Apdex, Core Web Vitals, conversão ou satisfação do usuário. Latência do lado do serviço e resultados sintéticos são reais e aparecem em outras páginas, mas nenhum dos dois é uma medição do que o usuário vivenciou, e esta página não vai apresentá-los como se fossem.',
  },
  'p.dx.kpi.web': { en: 'Web applications defined', 'pt-BR': 'Aplicações web definidas' },
  'p.dx.kpi.mobile': { en: 'Mobile applications defined', 'pt-BR': 'Aplicações mobile definidas' },
  'p.dx.kpi.synthetic': { en: 'Synthetic monitors configured', 'pt-BR': 'Monitores sintéticos configurados' },
  'p.dx.kpi.sessions': { en: 'Readable user session records', 'pt-BR': 'Registros de sessão legíveis' },
  'p.dx.liveTitle': { en: 'Live confirmation of the gap', 'pt-BR': 'Confirmação ao vivo da lacuna' },
  'p.dx.liveBody': {
    en: 'The session query below is executed rather than assumed, so the reason it fails is shown by the platform itself.',
    'pt-BR':
      'A consulta de sessões abaixo é executada, e não presumida, para que o motivo da falha seja mostrado pela própria plataforma.',
  },
  'p.dx.whatItTakes': {
    en: 'What it would take to answer this question',
    'pt-BR': 'O que seria necessário para responder a esta pergunta',
  },
  'p.dx.whatItTakesBody': {
    en: 'Instrument one real user journey end to end, confirm session data is arriving, and grant read access to the reviewing identity. Only then does an experience discussion have evidence behind it. Until that is done, treat digital experience as out of scope for this engagement rather than as an unmeasured strength.',
    'pt-BR':
      'Instrumente uma jornada real de usuário de ponta a ponta, confirme que os dados de sessão estão chegando e conceda acesso de leitura à identidade que faz a análise. Só então uma discussão sobre experiência tem evidência por trás. Até lá, trate experiência digital como fora do escopo deste engajamento, e não como um ponto forte não medido.',
  },

  // ======================================================= page: opportunities
  'p.opp.title': { en: 'Improvement opportunities', 'pt-BR': 'Oportunidades de melhoria' },
  'p.opp.question': {
    en: 'Given what was measured, what is worth doing, in what order, and what does each item depend on?',
    'pt-BR':
      'Diante do que foi medido, o que vale a pena fazer, em que ordem, e do que cada item depende?',
  },
  'p.opp.takeaway': {
    en: 'Each row exists because a specific measurement justified it. Effort and impact are qualitative on purpose.',
    'pt-BR':
      'Cada linha existe porque uma medição específica a justificou. Esforço e impacto são qualitativos de propósito.',
  },
  'p.opp.noClaimsTitle': { en: 'No financial or MTTR claims', 'pt-BR': 'Nenhuma promessa financeira ou de MTTR' },
  'p.opp.noClaimsBody': {
    en: 'This page states no monetary saving, no reduction in mean time to resolve and no percentage gain. Any of those would require a baseline and an agreed methodology that this environment does not contain. Impact and effort are qualitative judgements offered for discussion, not calculations.',
    'pt-BR':
      'Esta página não declara economia monetária, redução de tempo médio de resolução nem ganho percentual. Qualquer um desses exigiria uma linha de base e uma metodologia acordada que este ambiente não possui. Impacto e esforço são julgamentos qualitativos oferecidos para discussão, não cálculos.',
  },
  'p.opp.incompleteTitle': { en: 'This synthesis is incomplete', 'pt-BR': 'Esta síntese está incompleta' },
  'p.opp.incompleteBody': {
    en: '{count} sources could not be read, so any opportunity they would have surfaced is absent from the list below: {list}. Absence of a row is not evidence of absence of an opportunity.',
    'pt-BR':
      '{count} fontes não puderam ser lidas, então qualquer oportunidade que elas revelariam está ausente da lista abaixo: {list}. A ausência de uma linha não é evidência da ausência de uma oportunidade.',
  },
  'p.opp.deriving': { en: 'Collecting signals across every domain…', 'pt-BR': 'Coletando sinais de todos os domínios…' },
  'p.opp.derivingAria': {
    en: 'Deriving opportunities from live signals',
    'pt-BR': 'Derivando oportunidades a partir de sinais ao vivo',
  },
  'p.opp.noneTitle': {
    en: 'No opportunity met its evidence threshold',
    'pt-BR': 'Nenhuma oportunidade atingiu o limiar de evidência',
  },
  'p.opp.noneBody': {
    en: 'None of the measured signals crossed the thresholds this app uses to raise an opportunity in the selected window. That is a narrow statement about this window, not a verdict that the environment is optimal.',
    'pt-BR':
      'Nenhum dos sinais medidos cruzou os limiares que este app usa para levantar uma oportunidade na janela selecionada. Essa é uma afirmação restrita a esta janela, não um veredito de que o ambiente está ótimo.',
  },
  'p.opp.count': {
    en: '{count} opportunities, ordered by impact then effort',
    'pt-BR': '{count} oportunidades, ordenadas por impacto e depois por esforço',
  },
  'p.opp.tableAria': {
    en: 'Improvement opportunities derived from live measurements',
    'pt-BR': 'Oportunidades de melhoria derivadas de medições ao vivo',
  },
  'p.opp.openSection': { en: 'Open section', 'pt-BR': 'Abrir seção' },
  'p.opp.h.opportunity': { en: 'Opportunity', 'pt-BR': 'Oportunidade' },
  'p.opp.h.measured': { en: 'What was measured', 'pt-BR': 'O que foi medido' },
  'p.opp.h.subject': { en: 'Subject', 'pt-BR': 'Objeto' },
  'p.opp.h.consequence': { en: 'Possible consequence', 'pt-BR': 'Consequência possível' },
  'p.opp.h.impact': { en: 'Impact', 'pt-BR': 'Impacto' },
  'p.opp.h.effort': { en: 'Effort', 'pt-BR': 'Esforço' },
  'p.opp.h.dependencies': { en: 'Dependencies', 'pt-BR': 'Dependências' },
  'p.opp.h.drillDown': { en: 'Drill down', 'pt-BR': 'Aprofundar' },

  // ======================================================= page: evidence
  'p.evid.title': { en: 'Evidence Center', 'pt-BR': 'Central de evidências' },
  'p.evid.question': {
    en: 'For any statement in this app, what query produced it, over what window, and at what cost?',
    'pt-BR':
      'Para qualquer afirmação deste app: qual consulta a produziu, sobre qual janela e a que custo?',
  },
  'p.evid.takeaway': {
    en: 'Every conclusion in this app reduces to one of the rows below.',
    'pt-BR': 'Toda conclusão deste app se reduz a uma das linhas abaixo.',
  },
  'p.evid.limitsTitle': { en: 'Honest limits of this register', 'pt-BR': 'Limites honestos deste registro' },
  'p.evid.limitsBody1': {
    en: "{count} queries have no recorded scan figure. Those queries were executed and their results inspected, but the platform's cost accounting was not captured for them individually. They are marked as not captured rather than as zero.",
    'pt-BR':
      '{count} consultas não têm registro de varredura. Elas foram executadas e seus resultados inspecionados, mas a contabilidade de custo da plataforma não foi capturada individualmente para cada uma. Estão marcadas como não capturadas, e não como zero.',
  },
  'p.evid.limitsBody2': {
    en: '{count} queries have no scan ceiling. Most of these read the entity model or bucket metadata and scan no Grail data at all, which the advisor on the Consumption page distinguishes explicitly.',
    'pt-BR':
      '{count} consultas não têm teto de varredura. A maioria delas lê o modelo de entidades ou metadados de bucket e não varre nenhum dado do Grail, o que o consultor na página de Consumo distingue explicitamente.',
  },
  'p.evid.register': { en: 'Query register', 'pt-BR': 'Registro de consultas' },
  'p.evid.registerAria': {
    en: 'Register of every query used by this app',
    'pt-BR': 'Registro de todas as consultas usadas por este app',
  },
  'p.evid.exportTitle': { en: 'Export a sanitised summary', 'pt-BR': 'Exportar um resumo sanitizado' },
  'p.evid.exportBody': {
    en: 'The export contains the query register and validation notes only. It carries no query results, no environment URL, no entity identifiers and no personal data, so it is safe to share outside the platform.',
    'pt-BR':
      'A exportação contém apenas o registro de consultas e as notas de validação. Não leva resultados de consulta, URL do ambiente, identificadores de entidade nem dados pessoais, portanto é seguro compartilhá-la fora da plataforma.',
  },
  'p.evid.generate': { en: 'Generate summary', 'pt-BR': 'Gerar resumo' },
  'p.evid.clear': { en: 'Clear', 'pt-BR': 'Limpar' },
  'p.evid.reviewBeforeSharing': {
    en: 'Review this before sharing it.',
    'pt-BR': 'Revise antes de compartilhar.',
  },
  'p.evid.h.queryId': { en: 'Query id', 'pt-BR': 'ID da consulta' },
  'p.evid.h.domain': { en: 'Domain', 'pt-BR': 'Domínio' },
  'p.evid.h.supports': { en: 'What it supports', 'pt-BR': 'O que sustenta' },
  'p.evid.h.scopeRequired': { en: 'Scope required', 'pt-BR': 'Escopo exigido' },
  'p.evid.h.scanCeiling': { en: 'Scan ceiling', 'pt-BR': 'Teto de varredura' },
  'p.evid.h.recordedScan': { en: 'Recorded scan', 'pt-BR': 'Varredura registrada' },
  'p.evid.h.recordedDuration': { en: 'Recorded duration', 'pt-BR': 'Duração registrada' },
  'p.evid.h.outcome': { en: 'Validation outcome', 'pt-BR': 'Resultado da validação' },
  'p.evid.h.validated': { en: 'Validated', 'pt-BR': 'Validada em' },

  // ======================================================= page: appendix
  'p.appx.title': { en: 'Technical appendix', 'pt-BR': 'Apêndice técnico' },
  'p.appx.question': {
    en: 'What exactly does this app run, and what does it deliberately not look at?',
    'pt-BR': 'O que exatamente este app executa, e o que ele deliberadamente não olha?',
  },
  'p.appx.takeaway': {
    en: 'Every query is reproducible. The environment exposes considerably more than this app reads.',
    'pt-BR':
      'Toda consulta é reproduzível. O ambiente expõe consideravelmente mais do que este app lê.',
  },
  'p.appx.scope': { en: 'Scope of the analysis', 'pt-BR': 'Escopo da análise' },
  'p.appx.scopeBody': {
    en: 'This app reads {count} queries across a deliberately narrow set of sources. The data-object list below is the full surface the environment exposes to DQL. Anything in that list which is not covered by a query above is outside the scope of the conclusions this app draws, and should not be assumed to be healthy.',
    'pt-BR':
      'Este app executa {count} consultas sobre um conjunto deliberadamente estreito de fontes. A lista de objetos de dados abaixo é toda a superfície que o ambiente expõe à DQL. Tudo o que estiver nessa lista e não for coberto por uma consulta acima está fora do escopo das conclusões deste app, e não deve ser presumido saudável.',
  },
  'p.appx.catalog': { en: 'Complete query catalog', 'pt-BR': 'Catálogo completo de consultas' },
  'p.appx.catalogTitle': {
    en: 'All queries with validation records',
    'pt-BR': 'Todas as consultas com registro de validação',
  },
  'p.appx.objects': {
    en: 'Queryable data objects in this environment',
    'pt-BR': 'Objetos de dados consultáveis neste ambiente',
  },
  'p.appx.objectsBody': {
    en: 'Read live from the platform. Sources absent from the query catalog above were not analysed.',
    'pt-BR':
      'Lido ao vivo da plataforma. Fontes ausentes do catálogo de consultas acima não foram analisadas.',
  },
  'p.appx.h.dataObject': { en: 'Data object', 'pt-BR': 'Objeto de dados' },
  'p.appx.objectsQueryTitle': {
    en: 'Query behind the data-object list',
    'pt-BR': 'Consulta por trás da lista de objetos de dados',
  },

  // ======================================================= page: demo story
  'p.story.title': { en: 'Guided demonstration', 'pt-BR': 'Demonstração guiada' },
  'p.story.question': {
    en: 'How do we walk an audience through the findings in a way both an executive and an engineer can follow?',
    'pt-BR':
      'Como conduzir uma audiência pelas constatações de um jeito que tanto um executivo quanto um engenheiro consigam acompanhar?',
  },
  'p.story.takeaway': {
    en: 'Every chapter is backed by the same live queries used elsewhere in this app.',
    'pt-BR':
      'Cada capítulo é sustentado pelas mesmas consultas ao vivo usadas no restante deste app.',
  },
  'p.story.noSynthTitle': { en: 'No synthetic data exists in this app', 'pt-BR': 'Não existe dado sintético neste app' },
  'p.story.noSynthBody': {
    en: 'There is no demo-data mode, no fixture set and no seeded example anywhere in the bundle. If a chapter shows a figure, that figure came from this environment. If the data is missing, the chapter says so.',
    'pt-BR':
      'Não há modo de dados de demonstração, conjunto de fixtures nem exemplo pré-carregado em nenhum lugar do pacote. Se um capítulo mostra um número, esse número veio deste ambiente. Se o dado está ausente, o capítulo diz isso.',
  },
  'p.story.none': { en: 'No value stories are defined.', 'pt-BR': 'Nenhum roteiro de valor definido.' },
  'p.story.label': { en: 'Story', 'pt-BR': 'Roteiro' },
  'p.story.presentationMode': { en: 'Presentation mode', 'pt-BR': 'Modo apresentação' },
  'p.story.hideControls': { en: 'Hide configuration controls', 'pt-BR': 'Ocultar controles de configuração' },
  'p.story.cannotTell': {
    en: 'This story cannot be told with this environment',
    'pt-BR': 'Este roteiro não pode ser contado com este ambiente',
  },
  'p.story.noChapters': { en: 'This story has no chapters defined.', 'pt-BR': 'Este roteiro não tem capítulos definidos.' },
  'p.story.progressAria': { en: 'Story progress', 'pt-BR': 'Progresso do roteiro' },
  'p.story.chapter': { en: 'Chapter {current} of {total}', 'pt-BR': 'Capítulo {current} de {total}' },
  'p.story.businessQuestion': { en: 'Business question', 'pt-BR': 'Pergunta de negócio' },
  'p.story.keyMessage': { en: 'Key message', 'pt-BR': 'Mensagem central' },
  'p.story.evidenceUsed': { en: 'Evidence used', 'pt-BR': 'Evidência usada' },
  'p.story.presenterNotes': { en: 'Presenter notes', 'pt-BR': 'Notas do apresentador' },
  'p.story.exploreTechnically': { en: 'Explore this technically', 'pt-BR': 'Explorar tecnicamente' },
  'p.story.previous': { en: 'Previous', 'pt-BR': 'Anterior' },
  'p.story.next': { en: 'Next chapter', 'pt-BR': 'Próximo capítulo' },
  'p.story.restart': { en: 'Back to the start', 'pt-BR': 'Voltar ao início' },
  'p.story.queriesTitle': { en: 'Queries behind this chapter', 'pt-BR': 'Consultas por trás deste capítulo' },
  'p.story.audience.both': { en: 'Executive and technical', 'pt-BR': 'Executivo e técnico' },
  'p.story.audience.executive': { en: 'Executive', 'pt-BR': 'Executivo' },
  'p.story.audience.technical': { en: 'Technical', 'pt-BR': 'Técnico' },
  'p.story.unavailableSuffix': { en: '{title} (unavailable)', 'pt-BR': '{title} (indisponível)' },

  // ======================================================= feature: advisor
  'f.advisor.title': { en: 'DQL Efficiency Advisor', 'pt-BR': 'Consultor de eficiência DQL' },
  'f.advisor.body': {
    en: 'Every query this app runs, checked against the practices that drive Grail cost. The advisor produces recommendations only: it never rewrites a query and never changes a bucket, a retention setting or a pipeline.',
    'pt-BR':
      'Todas as consultas que este app executa, verificadas contra as práticas que determinam o custo no Grail. O consultor só produz recomendações: nunca reescreve uma consulta nem altera bucket, retenção ou pipeline.',
  },
  'f.advisor.counts': {
    en: '{queries} queries analysed · {findings} observations worth a look · {free} scan no Grail data at all',
    'pt-BR':
      '{queries} consultas analisadas · {findings} observações que merecem atenção · {free} não varrem nenhum dado do Grail',
  },
  'f.advisor.freeNote': {
    en: "Queries that read the entity model or bucket metadata cost nothing to run, which is why most of this app's inventory views can be refreshed freely. The cost is concentrated in the few queries that read logs, spans and problem history.",
    'pt-BR':
      'Consultas que leem o modelo de entidades ou metadados de bucket não têm custo de execução, e é por isso que a maioria das visões de inventário deste app pode ser atualizada à vontade. O custo se concentra nas poucas consultas que leem logs, spans e histórico de problemas.',
  },
  'f.advisor.tableAria': {
    en: 'DQL efficiency observations per query',
    'pt-BR': 'Observações de eficiência DQL por consulta',
  },
  'f.advisor.staticNote': {
    en: 'This analysis is static: it inspects query text and the recorded validation of each query. It does not re-run anything, so opening this panel costs nothing.',
    'pt-BR':
      'Esta análise é estática: ela inspeciona o texto da consulta e o registro de validação de cada uma. Não reexecuta nada, então abrir este painel não tem custo.',
  },
  'f.advisor.verdict.look': { en: 'Look at this', 'pt-BR': 'Vale olhar' },
  'f.advisor.verdict.consider': { en: 'Consider', 'pt-BR': 'Considerar' },
  'f.advisor.verdict.fine': { en: 'Fine', 'pt-BR': 'Adequada' },
  'f.advisor.h.practice': { en: 'Practice checked', 'pt-BR': 'Prática verificada' },
  'f.advisor.h.verdict': { en: 'Verdict', 'pt-BR': 'Veredito' },
  'f.advisor.h.finding': { en: 'Finding', 'pt-BR': 'Constatação' },

  // ======================================================= feature: scorecard
  'f.score.title': { en: 'PoC Value Scorecard', 'pt-BR': 'Placar de valor da PoC' },
  'f.score.body': {
    en: 'Ten independent dimensions. Each one carries its own evidence, source and gap. They are not combined into a single score.',
    'pt-BR':
      'Dez dimensões independentes. Cada uma carrega sua própria evidência, fonte e lacuna. Elas não são combinadas em uma nota única.',
  },
  'f.score.evaluating': { en: 'Evaluating dimensions…', 'pt-BR': 'Avaliando dimensões…' },
  'f.score.tableAria': {
    en: 'PoC value scorecard by dimension',
    'pt-BR': 'Placar de valor da PoC por dimensão',
  },
  'f.score.h.dimension': { en: 'Dimension', 'pt-BR': 'Dimensão' },
  'f.score.h.gap': { en: 'Gap', 'pt-BR': 'Lacuna' },

  // ======================================================= feature: problem impact
  'f.impact.openTitle': {
    en: 'Operational impact of problems still open',
    'pt-BR': 'Impacto operacional dos problemas ainda em aberto',
  },
  'f.impact.hoursTitle': {
    en: 'Hours are measured. Money needs your assumption.',
    'pt-BR': 'As horas são medidas. O valor em dinheiro depende da sua premissa.',
  },
  'f.impact.hoursBody': {
    en: 'Dynatrace measures how long every problem stays open. What an hour of that is worth to this customer is not in any environment, so set an hourly rate in Settings to see a monetary estimate. Until then the hours below stand on their own.',
    'pt-BR':
      'A Dynatrace mede quanto tempo cada problema fica aberto. Quanto vale uma hora disso para este cliente não está em nenhum ambiente, então defina um valor por hora em Configurações para ver uma estimativa monetária. Até lá, as horas abaixo falam por si.',
  },
  'f.impact.openNow': { en: 'Problems open now', 'pt-BR': 'Problemas abertos agora' },
  'f.impact.accumulated': { en: 'Accumulated open time', 'pt-BR': 'Tempo acumulado em aberto' },
  'f.impact.clockRunning': { en: 'Clock still running on each', 'pt-BR': 'O relógio segue correndo em cada um' },
  'f.impact.avgOpen': { en: 'Average time open', 'pt-BR': 'Tempo médio em aberto' },
  'f.impact.avgOpenNote': {
    en: 'Mean age of the problems that are currently open.',
    'pt-BR': 'Idade média dos problemas atualmente abertos.',
  },
  'f.impact.longestOpen': { en: 'Longest open', 'pt-BR': 'Mais tempo em aberto' },
  'f.impact.longestOpenNote': {
    en: 'Oldest unresolved problem. A problem open this long is usually either accepted risk or forgotten — both worth naming.',
    'pt-BR':
      'Problema não resolvido mais antigo. Um problema aberto há tanto tempo costuma ser risco aceito ou esquecido — vale nomear qual dos dois.',
  },
  'f.impact.estimatedOpen': { en: 'Estimated cost of open problems', 'pt-BR': 'Custo estimado dos problemas em aberto' },
  'f.impact.resolutionTitle': {
    en: 'How fast problems resolve, and what they already absorbed',
    'pt-BR': 'Com que rapidez os problemas se resolvem, e quanto já consumiram',
  },
  'f.impact.totalTime': { en: 'Total problem time in window', 'pt-BR': 'Tempo total de problema na janela' },
  'f.impact.totalTimeDetail': { en: 'Across problems that closed', 'pt-BR': 'Entre os problemas que fecharam' },
  'f.impact.absorbed': { en: 'Estimated cost already absorbed', 'pt-BR': 'Custo estimado já absorvido' },
  'f.impact.mttxAria': {
    en: 'Resolution time per problem category',
    'pt-BR': 'Tempo de resolução por categoria de problema',
  },
  'f.impact.medianNote': {
    en: 'Medians well below the means indicate most problems close quickly while a small number of long-running ones dominate the total. Quote both, never the mean alone.',
    'pt-BR':
      'Medianas bem abaixo das médias indicam que a maioria dos problemas fecha rápido enquanto poucos de longa duração dominam o total. Cite os dois, nunca só a média.',
  },
  'f.impact.recurringTitle': { en: 'Top 10 recurring problem patterns', 'pt-BR': 'Top 10 padrões recorrentes de problema' },
  'f.impact.recurringBody': {
    en: 'Each repetition is the same diagnosis and the same response, performed again. This is the measured case for automation.',
    'pt-BR':
      'Cada repetição é o mesmo diagnóstico e a mesma resposta, executados de novo. Este é o argumento medido para automação.',
  },
  'f.impact.recurringAria': {
    en: 'Top 10 recurring problem patterns by occurrence',
    'pt-BR': 'Top 10 padrões recorrentes por número de ocorrências',
  },
  'f.impact.noRecurring': { en: 'No recurring pattern in this window.', 'pt-BR': 'Nenhum padrão recorrente nesta janela.' },
  'f.impact.topEntitiesTitle': { en: 'Top 10 entities by problem count', 'pt-BR': 'Top 10 entidades por número de problemas' },
  'f.impact.topEntitiesBody': {
    en: 'Where the pain concentrates. One entity at the top of this list is usually the single fastest improvement available.',
    'pt-BR':
      'Onde a dor se concentra. A entidade no topo desta lista costuma ser a melhoria mais rápida disponível.',
  },
  'f.impact.topEntitiesAria': {
    en: 'Top 10 entities by number of problems',
    'pt-BR': 'Top 10 entidades por número de problemas',
  },
  'f.impact.noEntity': {
    en: 'No entity appeared in a problem in this window.',
    'pt-BR': 'Nenhuma entidade apareceu em um problema nesta janela.',
  },
  'f.impact.quickWinTriage': {
    en: 'Triage the long-running open problems',
    'pt-BR': 'Triar os problemas abertos de longa duração',
  },
  'f.impact.quickWinAlerting': {
    en: 'Review alerting profiles before expanding coverage',
    'pt-BR': 'Revisar perfis de alerta antes de expandir a cobertura',
  },
  'f.impact.noQuickWinTitle': {
    en: 'No quick win met its evidence threshold',
    'pt-BR': 'Nenhum ganho rápido atingiu o limiar de evidência',
  },
  'f.impact.noQuickWinBody': {
    en: 'None of the measured signals crossed the thresholds this app uses to raise a recommendation in this window. Rather than fill the space with generic advice, it stays empty.',
    'pt-BR':
      'Nenhum dos sinais medidos cruzou os limiares que este app usa para levantar uma recomendação nesta janela. Em vez de preencher o espaço com conselho genérico, ele fica vazio.',
  },
  'f.impact.quickWinsTitle': { en: 'Quick wins, from what was measured', 'pt-BR': 'Ganhos rápidos, a partir do que foi medido' },
  'f.impact.quickWinsFooter': {
    en: 'These are recommendations, not findings. Each one names the measurement that justified it so you can judge whether it applies.',
    'pt-BR':
      'Estas são recomendações, não constatações. Cada uma nomeia a medição que a justificou para você julgar se ela se aplica.',
  },
  'f.impact.h.resolved': { en: 'Resolved', 'pt-BR': 'Resolvidos' },
  'f.impact.h.mttr': { en: 'Mean time to resolve', 'pt-BR': 'Tempo médio de resolução' },
  'f.impact.h.median': { en: 'Median', 'pt-BR': 'Mediana' },
  'f.impact.h.p90': { en: '90th percentile', 'pt-BR': 'Percentil 90' },
  'f.impact.h.totalTime': { en: 'Total problem time', 'pt-BR': 'Tempo total de problema' },

  // ======================================================= feature: discoveries
  'f.disc.logs': {
    en: 'Logs are stored without the context needed to use them',
    'pt-BR': 'Os logs são armazenados sem o contexto necessário para usá-los',
  },
  'f.disc.logsLabel': { en: 'records with service context', 'pt-BR': 'registros com contexto de serviço' },
  'f.disc.recurring': { en: 'The same problems keep returning', 'pt-BR': 'Os mesmos problemas continuam voltando' },
  'f.disc.workload': {
    en: 'A workload is not holding steady state',
    'pt-BR': 'Um workload não está mantendo estado estável',
  },
  'f.disc.queryCost': {
    en: 'Query cost is concentrated and addressable',
    'pt-BR': 'O custo de consulta está concentrado e é tratável',
  },
  'f.disc.automation': {
    en: 'Some automation is failing on a schedule',
    'pt-BR': 'Parte da automação está falhando de forma recorrente',
  },
  'f.disc.security': {
    en: 'Security findings could not be read',
    'pt-BR': 'Os achados de segurança não puderam ser lidos',
  },
  'f.disc.rum': {
    en: 'Real user experience cannot be assessed',
    'pt-BR': 'A experiência real do usuário não pode ser avaliada',
  },

  // ======================================================= feature: insights
  'f.insight.cat.automation': { en: 'Automation', 'pt-BR': 'Automação' },
  'f.insight.cat.reliability': { en: 'Reliability', 'pt-BR': 'Confiabilidade' },
  'f.insight.cat.capacity': { en: 'Capacity', 'pt-BR': 'Capacidade' },
  'f.insight.cat.performance': { en: 'Performance', 'pt-BR': 'Desempenho' },
  'f.insight.cat.dataQuality': { en: 'Data quality', 'pt-BR': 'Qualidade de dados' },
  'f.insight.cat.governance': { en: 'Governance', 'pt-BR': 'Governança' },
  'f.insight.cat.coverage': { en: 'Coverage', 'pt-BR': 'Cobertura' },
  'f.insight.cat.consumption': { en: 'Consumption', 'pt-BR': 'Consumo' },
  'f.insight.cat.security': { en: 'Security', 'pt-BR': 'Segurança' },
  'f.insight.cat.experience': { en: 'Experience', 'pt-BR': 'Experiência' },
  'f.insight.title.logContext': {
    en: 'Attach topology context to logs at ingest',
    'pt-BR': 'Anexar contexto de topologia aos logs na ingestão',
  },
  'f.insight.title.logSeverity': {
    en: 'Classify log severity at ingest',
    'pt-BR': 'Classificar severidade de log na ingestão',
  },
  'f.insight.title.securityScope': {
    en: 'Grant read access to security findings',
    'pt-BR': 'Conceder acesso de leitura aos achados de segurança',
  },
  'f.insight.title.rumJourney': {
    en: 'Instrument one real user journey',
    'pt-BR': 'Instrumentar uma jornada real de usuário',
  },

  // ======================================================= page: value report
  'p.report.h.instances': { en: 'Instances', 'pt-BR': 'Instâncias' },
  'p.report.tooWide': { en: 'Report window too wide', 'pt-BR': 'Janela do relatório ampla demais' },
  'p.report.tooWideBody': {
    en: 'The selected window covers {days} days. Reports are bounded to {max} days. The problem history is the most expensive source this app reads and scan volume scales with the window, so a wider report would cost more than it informs.',
    'pt-BR':
      'A janela selecionada cobre {days} dias. Relatórios são limitados a {max} dias. O histórico de problemas é a fonte mais cara que este app lê e o volume de varredura cresce com a janela, então um relatório mais amplo custaria mais do que informaria.',
  },
  'p.report.switch30': { en: 'Switch to the last 30 days', 'pt-BR': 'Mudar para os últimos 30 dias' },
  'p.report.consider30': {
    en: 'Consider the 30-day window for a closing report',
    'pt-BR': 'Considere a janela de 30 dias para um relatório de fechamento',
  },
  'p.report.estimatedCost': { en: 'Estimated operational cost: {value}', 'pt-BR': 'Custo operacional estimado: {value}' },
  'p.report.techAria': {
    en: 'Technologies detected in the environment',
    'pt-BR': 'Tecnologias detectadas no ambiente',
  },
  'p.report.deriving': { en: 'Deriving recommendations…', 'pt-BR': 'Derivando recomendações…' },
  'p.report.noSignal': {
    en: 'No measured signal crossed the thresholds this app uses to raise a recommendation in this window.',
    'pt-BR':
      'Nenhum sinal medido cruzou os limiares que este app usa para levantar uma recomendação nesta janela.',
  },
  'p.report.impactEffort': {
    en: '{impact} impact, {effort} effort',
    'pt-BR': 'impacto {impact}, esforço {effort}',
  },
  'p.report.measured': { en: 'Measured: {value}', 'pt-BR': 'Medido: {value}' },
  'p.report.recommended': { en: 'Recommended: {value}', 'pt-BR': 'Recomendado: {value}' },

  // ======================================================= page: roadmap extras
  'p.roadmap.title': { en: '30-60-90 action plan', 'pt-BR': 'Plano de ação 30-60-90' },
  'p.roadmap.question': {
    en: 'What should happen in the next 30, 60 and 90 days, and how will we know each step worked?',
    'pt-BR':
      'O que deve acontecer nos próximos 30, 60 e 90 dias, e como saberemos que cada passo funcionou?',
  },
  'p.roadmap.takeaway': {
    en: 'Every item traces back to a measurement taken in this environment. Nothing here is a generic maturity template.',
    'pt-BR':
      'Cada item remete a uma medição feita neste ambiente. Nada aqui é um modelo genérico de maturidade.',
  },
  'p.roadmap.howToRead': { en: 'How to read this plan', 'pt-BR': 'Como ler este plano' },
  'p.roadmap.howToReadBody1': {
    en: 'Colour marks the horizon, not a severity. Items in the first horizon either block the assessment itself or are cheap enough to commit to immediately; the second needs building; the third needs sustained effort.',
    'pt-BR':
      'A cor marca o horizonte, não uma severidade. Os itens do primeiro horizonte ou bloqueiam a própria avaliação ou são baratos o bastante para assumir de imediato; o segundo exige construção; o terceiro exige esforço sustentado.',
  },
  'p.roadmap.howToReadBody2': {
    en: "Owners are suggested by role, never by name. Success criteria are written so they can be checked against this app's own recorded baseline — which is why none of them is expressed as a saving or a percentage improvement.",
    'pt-BR':
      'Os responsáveis são sugeridos por papel, nunca por nome. Os critérios de sucesso são escritos para poderem ser verificados contra a linha de base registrada por este app — e é por isso que nenhum deles é expresso como economia ou ganho percentual.',
  },
  'p.roadmap.partialTitle': { en: 'The plan is built on partial information', 'pt-BR': 'O plano está construído sobre informação parcial' },
  'p.roadmap.partialBody': {
    en: '{count} sources could not be read, so items those sources would have produced are missing: {list}',
    'pt-BR':
      '{count} fontes não puderam ser lidas, então os itens que elas teriam produzido estão faltando: {list}',
  },
  'p.roadmap.derivingAria': { en: 'Building the action plan from live signals', 'pt-BR': 'Construindo o plano de ação a partir de sinais ao vivo' },
  'p.roadmap.deriving': { en: 'Deriving the action plan from measured signals…', 'pt-BR': 'Derivando o plano de ação a partir dos sinais medidos…' },
  'p.roadmap.none': { en: 'No action was generated for the plan', 'pt-BR': 'Nenhuma ação foi gerada para o plano' },
  'p.roadmap.emptyHorizon': {
    en: 'Nothing in this horizon from the current measurements.',
    'pt-BR': 'Nada neste horizonte a partir das medições atuais.',
  },
  'p.roadmap.evidence': { en: 'Evidence: {list}', 'pt-BR': 'Evidência: {list}' },

  // ======================================================= page: settings extras
  'p.settings.currencyPlaceholder': { en: 'e.g. BRL', 'pt-BR': 'ex.: BRL' },
  'p.settings.rateInvalid': {
    en: 'A zero or negative rate would produce a misleading figure, so it is treated as not configured.',
    'pt-BR':
      'Um valor zero ou negativo produziria um número enganoso, então é tratado como não configurado.',
  },
  'p.settings.verbatimTitle': {
    en: 'Why the declared scope is shown verbatim',
    'pt-BR': 'Por que o escopo declarado é mostrado na íntegra',
  },
  'p.settings.verbatimBody': {
    en: 'Putting the agreed scope next to the measured coverage lets the audience see for themselves where the two match and where they do not. That comparison is more useful than a coverage percentage, because only the customer knows what was supposed to be in scope.',
    'pt-BR':
      'Colocar o escopo acordado ao lado da cobertura medida deixa a audiência ver por conta própria onde os dois batem e onde não batem. Essa comparação é mais útil que um percentual de cobertura, porque só o cliente sabe o que deveria estar no escopo.',
  },

  // ======================================================= executive extras
  'exec.note.measuredZero': {
    en: 'Dynatrace detected no entities of this type while detecting others normally. This is a measured zero, not a missing measurement.',
    'pt-BR':
      'A Dynatrace não detectou entidades deste tipo enquanto detectava outras normalmente. Este é um zero medido, não uma medição ausente.',
  },
  'exec.note.openSum': {
    en: 'Problems still open at query time, summed across all categories.',
    'pt-BR': 'Problemas ainda abertos no momento da consulta, somados em todas as categorias.',
  },
  'exec.note.longestOpen': {
    en: 'Longest currently open problem, measured from its start to now.',
    'pt-BR': 'Problema aberto há mais tempo, medido do seu início até agora.',
  },
  'exec.label.webApps': { en: 'Web applications', 'pt-BR': 'Aplicações web' },
  'exec.label.mobileApps': { en: 'Mobile applications', 'pt-BR': 'Aplicações mobile' },
  'exec.detail.distinctTech': {
    en: 'Distinct runtime and framework types, identified automatically',
    'pt-BR': 'Tipos distintos de runtime e framework, identificados automaticamente',
  },
  'exec.detail.autoClosed': {
    en: 'Closed automatically as conditions recovered, unless acted on',
    'pt-BR': 'Fechados automaticamente conforme as condições se recuperaram, salvo intervenção',
  },
  'exec.mttxTitle': {
    en: 'Mean time to resolve by category, in hours',
    'pt-BR': 'Tempo médio de resolução por categoria, em horas',
  },
  'exec.mttxAria': {
    en: 'Mean time to resolve per problem category',
    'pt-BR': 'Tempo médio de resolução por categoria de problema',
  },
  'exec.noCostTitle': { en: 'No cost assumption configured', 'pt-BR': 'Nenhuma premissa de custo configurada' },
  'exec.noCostBody': {
    en: 'Problem-hours below are measured by Dynatrace. To turn them into a monetary estimate, set an hourly rate in Settings. This app will not invent one.',
    'pt-BR':
      'As horas de problema abaixo são medidas pela Dynatrace. Para transformá-las em estimativa monetária, defina um valor por hora em Configurações. Este app não vai inventar um.',
  },
  'exec.label.longestOpen': { en: 'longest open', 'pt-BR': 'mais tempo em aberto' },
  'exec.label.problemsOpen': { en: 'problems open', 'pt-BR': 'problemas em aberto' },
  'exec.label.accumulated': { en: 'accumulated open time', 'pt-BR': 'tempo acumulado em aberto' },
  'exec.label.oldest': { en: 'oldest still unresolved', 'pt-BR': 'mais antigo ainda sem resolução' },
  'exec.interp.openTime': {
    en: 'Open time keeps accruing until each problem closes, so this figure grows on its own. A very old open problem is usually either accepted risk or forgotten — both worth naming out loud.',
    'pt-BR':
      'O tempo em aberto continua acumulando até cada problema fechar, então este número cresce sozinho. Um problema aberto há muito tempo costuma ser risco aceito ou esquecido — vale dizer em voz alta qual dos dois.',
  },
  'exec.label.perHour': { en: 'per hour, your assumption', 'pt-BR': 'por hora, premissa sua' },
  'exec.label.measuredHours': { en: 'measured hours behind it', 'pt-BR': 'horas medidas por trás' },
  'exec.resolvedAria': { en: 'Resolved problems by category', 'pt-BR': 'Problemas resolvidos por categoria' },
  'exec.noResolved': { en: 'No resolved problems in this window.', 'pt-BR': 'Nenhum problema resolvido nesta janela.' },
  'exec.topEntitiesAria': {
    en: 'Entities appearing in the most problems',
    'pt-BR': 'Entidades que aparecem no maior número de problemas',
  },
  'exec.noEntity': {
    en: 'No entity appeared in a problem in this window.',
    'pt-BR': 'Nenhuma entidade apareceu em um problema nesta janela.',
  },
  'exec.gap.usersLabel': { en: 'Users impacted.', 'pt-BR': 'Usuários impactados.' },
  'exec.gap.usersBody': {
    en: 'Real user monitoring is not usable in this environment — session data is unreadable by this identity and effectively empty. No statement about affected users, sessions or conversion is made anywhere in this app, and service-side latency is not substituted for it.',
    'pt-BR':
      'O monitoramento de usuário real não é utilizável neste ambiente — os dados de sessão não são legíveis por esta identidade e estão praticamente vazios. Nenhuma afirmação sobre usuários afetados, sessões ou conversão é feita em qualquer parte deste app, e a latência do lado do serviço não é usada como substituta.',
  },
  'exec.gap.securityLabel': { en: 'Security exposure.', 'pt-BR': 'Exposição de segurança.' },
  'exec.gap.securityBody': {
    en: 'The security findings table was queried and refused for lack of a scope. That is a permission gap, not a clean result.',
    'pt-BR':
      'A tabela de achados de segurança foi consultada e recusada por falta de escopo. Isso é uma lacuna de permissão, não um resultado limpo.',
  },
  'exec.declaredScope': {
    en: 'Declared scope, for comparison against the above:',
    'pt-BR': 'Escopo declarado, para comparação com o acima:',
  },

  // -------------------------------------------------- scorecard dimensions
  'f.score.status.ideal': { en: 'Demonstrated', 'pt-BR': 'Demonstrado' },
  'f.score.status.good': { en: 'Working', 'pt-BR': 'Funcionando' },
  'f.score.status.neutral': { en: 'In progress', 'pt-BR': 'Em andamento' },
  'f.score.status.warning': { en: 'Worth reviewing', 'pt-BR': 'Vale revisar' },
  'f.score.status.critical': { en: 'Blocked', 'pt-BR': 'Bloqueado' },

  'f.score.d.coverage': { en: 'Observational coverage', 'pt-BR': 'Cobertura de observação' },
  'f.score.d.coverage.evidence': {
    en: '{hosts} hosts, {services} services and {processes} process instances discovered automatically.',
    'pt-BR':
      '{hosts} hosts, {services} serviços e {processes} instâncias de processo descobertos automaticamente.',
  },
  'f.score.d.coverage.gap': {
    en: 'Monitoring mode is not reported for every host, so instrumentation depth cannot be stated for the whole estate.',
    'pt-BR':
      'O modo de monitoramento não é reportado para todos os hosts, então a profundidade de instrumentação não pode ser afirmada para todo o parque.',
  },
  'f.score.d.coverage.rec': {
    en: 'Review hosts without a reported monitoring mode on the Infrastructure page before quoting a coverage percentage.',
    'pt-BR':
      'Revise os hosts sem modo de monitoramento reportado na página de Infraestrutura antes de citar um percentual de cobertura.',
  },

  'f.score.d.topology': { en: 'Topological context', 'pt-BR': 'Contexto topológico' },
  'f.score.d.topology.evidence': {
    en: 'Entity relationships available across {services} services, {clusters} clusters and {workloads} workloads. Dynatrace Intelligence attaches Smartscape entities to each problem.',
    'pt-BR':
      'Relações entre entidades disponíveis em {services} serviços, {clusters} clusters e {workloads} workloads. A Dynatrace Intelligence anexa entidades do Smartscape a cada problema.',
  },
  'f.score.d.topology.gap': {
    en: 'Dependencies are shown tabularly: smartscape.nodes and smartscape.edges are not queryable from user DQL in this environment, and no official Strato topology-graph component was confirmed.',
    'pt-BR':
      'As dependências são mostradas em tabela: smartscape.nodes e smartscape.edges não são consultáveis via DQL de usuário neste ambiente, e nenhum componente oficial de grafo de topologia do Strato foi confirmado.',
  },
  'f.score.d.topology.rec': {
    en: 'Use the Topology page for dependency review and Smartscape in the platform UI for free-form graph exploration.',
    'pt-BR':
      'Use a página de Topologia para revisar dependências e o Smartscape na interface da plataforma para exploração livre do grafo.',
  },

  'f.score.d.anomaly': { en: 'Anomaly detection', 'pt-BR': 'Detecção de anomalias' },
  'f.score.d.anomaly.evidence': {
    en: 'Dynatrace Intelligence produced problems across availability, error, slowdown and resource-contention categories without any alert rule being authored for this review.',
    'pt-BR':
      'A Dynatrace Intelligence produziu problemas nas categorias de disponibilidade, erro, lentidão e contenção de recurso sem que nenhuma regra de alerta fosse escrita para esta análise.',
  },
  'f.score.d.anomaly.gap': {
    en: 'Alerting profiles and notification routing were not assessed.',
    'pt-BR': 'Perfis de alerta e roteamento de notificações não foram avaliados.',
  },
  'f.score.d.anomaly.rec': {
    en: 'Confirm alerting profiles and ownership routing before treating detection as production ready.',
    'pt-BR':
      'Confirme perfis de alerta e roteamento de responsabilidade antes de considerar a detecção pronta para produção.',
  },

  'f.score.d.diagnostic': { en: 'Diagnostic capability', 'pt-BR': 'Capacidade de diagnóstico' },
  'f.score.d.diagnostic.evidence': {
    en: '{spans} spans retained and queryable for distributed tracing.',
    'pt-BR': '{spans} spans retidos e consultáveis para tracing distribuído.',
  },
  'f.score.d.diagnostic.none': {
    en: 'No readable span data was found.',
    'pt-BR': 'Nenhum dado de span legível foi encontrado.',
  },
  'f.score.d.diagnostic.gapUnknown': {
    en: 'Span retention could not be read.',
    'pt-BR': 'A retenção de spans não pôde ser lida.',
  },
  'f.score.d.diagnostic.gap': {
    en: 'Span retention is {days} days, which is shorter than the problem history, so older incidents cannot be traced.',
    'pt-BR':
      'A retenção de spans é de {days} dias, menor que o histórico de problemas, então incidentes mais antigos não podem ser rastreados.',
  },
  'f.score.d.diagnostic.rec': {
    en: 'Decide the required trace look-back window deliberately, since it bounds how far back root-cause analysis can reach.',
    'pt-BR':
      'Defina deliberadamente a janela de retrospectiva de traces, pois ela limita até onde a análise de causa raiz consegue chegar.',
  },

  'f.score.d.dx': { en: 'Digital experience', 'pt-BR': 'Experiência digital' },
  'f.score.d.dx.evidence': {
    en: '{web} web applications and {mobile} mobile applications are defined; readable user-session records: {sessions}. {synthetic} synthetic monitors are configured.',
    'pt-BR':
      '{web} aplicações web e {mobile} aplicações mobile estão definidas; registros de sessão legíveis: {sessions}. {synthetic} monitores sintéticos estão configurados.',
  },
  'f.score.d.dx.denied': { en: 'none, access denied', 'pt-BR': 'nenhum, acesso negado' },
  'f.score.d.dx.gap': {
    en: 'Real user monitoring is both unreadable by this identity and effectively empty, so no statement about end-user experience can be supported.',
    'pt-BR':
      'O monitoramento de usuário real é ilegível por esta identidade e está praticamente vazio, então nenhuma afirmação sobre a experiência do usuário final tem sustentação.',
  },
  'f.score.d.dx.rec': {
    en: 'Treat digital experience as out of scope for this review, or grant storage:user.sessions:read and instrument a real user journey before making experience claims.',
    'pt-BR':
      'Trate experiência digital como fora do escopo desta análise, ou conceda storage:user.sessions:read e instrumente uma jornada real de usuário antes de fazer afirmações sobre experiência.',
  },

  'f.score.d.automation': { en: 'Automation', 'pt-BR': 'Automação' },
  'f.score.d.automation.evidence': {
    en: '{success} successful and {failed} failed workflow executions reached a final state in the window.',
    'pt-BR':
      '{success} execuções de workflow bem-sucedidas e {failed} com falha chegaram a um estado final na janela.',
  },
  'f.score.d.automation.none': {
    en: 'Workflow execution data was not readable.',
    'pt-BR': 'Os dados de execução de workflow não puderam ser lidos.',
  },
  'f.score.d.automation.gapFailing': {
    en: 'Some scheduled workflows are failing repeatedly, which undermines any claim that automation is reliable today.',
    'pt-BR':
      'Alguns workflows agendados estão falhando repetidamente, o que enfraquece qualquer afirmação de que a automação é confiável hoje.',
  },
  'f.score.d.automation.gapOk': {
    en: 'Approval gates and remediation controls were not assessed.',
    'pt-BR': 'Etapas de aprovação e controles de remediação não foram avaliados.',
  },
  'f.score.d.automation.recFailing': {
    en: 'Fix the failing scheduled workflows listed on the Automation page before presenting automation as a proven outcome.',
    'pt-BR':
      'Corrija os workflows agendados com falha listados na página de Automação antes de apresentar automação como resultado comprovado.',
  },
  'f.score.d.automation.recOk': {
    en: 'Extend automation to the recurring problems identified on the Problems page.',
    'pt-BR': 'Estenda a automação aos problemas recorrentes identificados na página de Problemas.',
  },

  'f.score.d.security': { en: 'Security', 'pt-BR': 'Segurança' },
  'f.score.d.security.denied': {
    en: 'The platform refused the query with a missing-scope error. Security data exists in this environment but cannot be read by this identity.',
    'pt-BR':
      'A plataforma recusou a consulta com erro de escopo ausente. Existem dados de segurança neste ambiente, mas eles não podem ser lidos por esta identidade.',
  },
  'f.score.d.security.evidence': {
    en: '{count} security finding {count|group|groups} returned.',
    'pt-BR': '{count} {count|grupo de achados de segurança retornado|grupos de achados de segurança retornados}.',
  },
  'f.score.d.security.gapScope': { en: 'Missing scope: {scopes}.', 'pt-BR': 'Escopo ausente: {scopes}.' },
  'f.score.d.security.gapOk': {
    en: 'Remediation workflow and ownership were not assessed.',
    'pt-BR': 'O fluxo de remediação e a responsabilidade não foram avaliados.',
  },
  'f.score.d.security.rec': {
    en: 'Grant the missing scope to the reviewing identity, then re-run this section. Do not present the absence of findings as an absence of risk.',
    'pt-BR':
      'Conceda o escopo ausente à identidade que faz a análise e execute esta seção novamente. Não apresente a ausência de achados como ausência de risco.',
  },

  'f.score.d.governance': { en: 'Data governance', 'pt-BR': 'Governança de dados' },
  'f.score.d.governance.evidence': {
    en: '{buckets} buckets enumerated; {unreadable} are not readable by this identity. Logs hold {records} readable records.',
    'pt-BR':
      '{buckets} buckets enumerados; {unreadable} não são legíveis por esta identidade. Os logs guardam {records} registros legíveis.',
  },
  'f.score.d.governance.gap': {
    en: 'Several buckets appear to exist for testing rather than for a defined retention purpose, and access restrictions are uneven.',
    'pt-BR':
      'Vários buckets parecem existir para teste e não para um propósito definido de retenção, e as restrições de acesso são irregulares.',
  },
  'f.score.d.governance.rec': {
    en: 'Consolidate ad-hoc buckets, set retention from a stated requirement, and confirm which buckets should stay access restricted. Review this before any deletion.',
    'pt-BR':
      'Consolide os buckets criados ad hoc, defina a retenção a partir de um requisito declarado e confirme quais buckets devem permanecer com acesso restrito. Revise isso antes de qualquer exclusão.',
  },

  'f.score.d.consumption': { en: 'Consumption sustainability', 'pt-BR': 'Sustentabilidade do consumo' },
  'f.score.d.consumption.evidence': {
    en: '{count} licensed {count|capability recorded|capabilities recorded} usage in the window, with billed volume reported per capability.',
    'pt-BR':
      '{count} {count|capacidade licenciada registrou|capacidades licenciadas registraram} uso na janela, com o volume faturado reportado por capacidade.',
  },
  'f.score.d.consumption.none': {
    en: 'The platform’s usage events were not readable.',
    'pt-BR': 'Os eventos de uso da plataforma não puderam ser lidos.',
  },
  'f.score.d.consumption.gap': {
    en: 'No pricing exists in the environment, and every bucket reports zero included query days, so all querying is on-demand. Query cost is concentrated in a few tables.',
    'pt-BR':
      'Não há preços no ambiente, e todos os buckets reportam zero dias de consulta inclusos, então toda consulta é sob demanda. O custo de consulta se concentra em poucas tabelas.',
  },
  'f.score.d.consumption.rec': {
    en: 'Review the DQL Efficiency Advisor on the Consumption page. Treat all volume figures as usage, not cost: this app never converts them into money.',
    'pt-BR':
      'Revise o Consultor de eficiência DQL na página de Consumo. Trate todos os números de volume como uso, não como custo: este app nunca os converte em dinheiro.',
  },

  'f.score.d.expansion': { en: 'Expansion readiness', 'pt-BR': 'Prontidão para expansão' },
  'f.score.d.expansion.evidence': {
    en: 'Breadth is already demonstrated across {capabilities} capabilities, {clusters} clusters and {services} services.',
    'pt-BR':
      'A amplitude já está demonstrada em {capabilities} capacidades, {clusters} clusters e {services} serviços.',
  },
  'f.score.d.expansion.gap': {
    en: 'Digital experience and readable security posture are the two capabilities that are demonstrably not exercised in this scope.',
    'pt-BR':
      'Experiência digital e postura de segurança legível são as duas capacidades comprovadamente não exercitadas neste escopo.',
  },
  'f.score.d.expansion.rec': { en: 'See the 30-60-90 action plan in Opportunities, generated from the gaps recorded on this scorecard.', 'pt-BR': 'Veja o plano de ação 30-60-90 em Oportunidades, gerado a partir das lacunas registradas neste placar.' },

  // ----------------------------------------------- improvement opportunities
  'f.insight.recurring.title': {
    en: 'Automate the response to "{name}"',
    'pt-BR': 'Automatizar a resposta para "{name}"',
  },
  'f.insight.recurring.obs': {
    en: '"{name}" occurred {count} {count|time|times} in the {window}, in the {category} category.',
    'pt-BR': '"{name}" ocorreu {count} {count|vez|vezes} em {window}, na categoria {category}.',
  },
  'f.insight.recurring.cons': {
    en: 'A pattern at this frequency means the same diagnosis and the same response are being repeated by people.',
    'pt-BR':
      'Um padrão nessa frequência significa que o mesmo diagnóstico e a mesma resposta estão sendo repetidos por pessoas.',
  },
  'f.insight.recurring.rec': {
    en: 'Define the standard response for this pattern and build it as a workflow, with an approval gate before any action that changes state. Measure the effort before and after so the improvement is evidenced rather than claimed.',
    'pt-BR':
      'Defina a resposta padrão para este padrão e construa-a como um workflow, com uma etapa de aprovação antes de qualquer ação que altere estado. Meça o esforço antes e depois para que a melhoria seja evidenciada e não apenas afirmada.',
  },
  'f.insight.recurring.dep': {
    en: 'Agreement on the correct response, and an owner for the workflow. No remediation should run unattended without an approval control.',
    'pt-BR':
      'Acordo sobre a resposta correta e um responsável pelo workflow. Nenhuma remediação deve rodar sem supervisão e sem controle de aprovação.',
  },

  'f.insight.restart.title': {
    en: 'Stabilise the workload "{name}"',
    'pt-BR': 'Estabilizar o workload "{name}"',
  },
  'f.insight.restart.obs': {
    en: '{count} container {count|restart|restarts} in the {window} on workload {workload} in cluster {cluster}, the highest in the environment.',
    'pt-BR':
      '{count} {count|restart|restarts} de contêiner em {window} no workload {workload}, cluster {cluster} — o maior do ambiente.',
  },
  'f.insight.restart.cons': {
    en: 'A workload restarting at this rate is not holding steady state, which can surface as intermittent errors or latency in anything that depends on it.',
    'pt-BR':
      'Um workload reiniciando nessa taxa não está mantendo estado estável, o que pode aparecer como erros intermitentes ou latência em tudo o que depende dele.',
  },
  'f.insight.restart.rec': {
    en: 'Investigate the restart reason for this workload with its owner. The restart count establishes instability; it does not by itself identify the cause.',
    'pt-BR':
      'Investigue o motivo dos restarts deste workload junto ao responsável. A contagem estabelece a instabilidade; sozinha ela não identifica a causa.',
  },
  'f.insight.restart.dep': {
    en: 'Access to the workload owner and to its deployment history.',
    'pt-BR': 'Acesso ao responsável pelo workload e ao histórico de deployments.',
  },

  'f.insight.limits.title': {
    en: 'Review requests and limits on {count} {count|workload|workloads}',
    'pt-BR': 'Revisar requests e limits em {count} {count|workload|workloads}',
  },
  'f.insight.limits.obs': {
    en: '{count} {count|workload recorded|workloads recorded} out-of-memory kills or CPU throttling in the {window}.',
    'pt-BR': '{count} {count|workload registrou|workloads registraram} mortes por falta de memória ou throttling de CPU em {window}.',
  },
  'f.insight.limits.cons': {
    en: 'Constrained workloads are killed or slowed by the platform rather than by their own logic, which makes their behaviour hard to reason about.',
    'pt-BR':
      'Workloads restritos são mortos ou desacelerados pela plataforma, e não pela própria lógica, o que torna seu comportamento difícil de interpretar.',
  },
  'f.insight.limits.rec': {
    en: 'Right-sizing recommendation, requiring validation: review requests and limits with each workload owner and verify any change in a non-production namespace first. The measurement shows constraint, not the correct value.',
    'pt-BR':
      'Recomendação de dimensionamento, que exige validação: revise requests e limits com cada responsável e verifique qualquer mudança primeiro em um namespace fora de produção. A medição mostra restrição, não o valor correto.',
  },
  'f.insight.limits.dep': {
    en: 'Workload ownership, and a non-production namespace to validate changes in.',
    'pt-BR': 'Titularidade do workload e um namespace fora de produção para validar as mudanças.',
  },

  'f.insight.service.title': {
    en: 'Investigate the failure rate of "{name}"',
    'pt-BR': 'Investigar a taxa de falha de "{name}"',
  },
  'f.insight.service.obs': {
    en: '{name} returned a {rate}% failure rate over the {window}, derived from request and failure counts.',
    'pt-BR':
      '{name} apresentou {rate}% de taxa de falha em {window}, derivada das contagens de requisições e falhas.',
  },
  'f.insight.service.cons': {
    en: 'A sustained failure rate at the service layer propagates to every caller, including callers that are not themselves failing.',
    'pt-BR':
      'Uma taxa de falha sustentada na camada de serviço se propaga para todos os chamadores, inclusive os que não estão falhando por conta própria.',
  },
  'f.insight.service.rec': {
    en: 'Open this service in the platform and read the failing requests directly. Distributed traces are available for the retained window and will show where the failure originates.',
    'pt-BR':
      'Abra este serviço na plataforma e leia diretamente as requisições com falha. Os traces distribuídos estão disponíveis na janela retida e mostrarão onde a falha se origina.',
  },
  'f.insight.service.dep': {
    en: 'Span retention must still cover the period being investigated.',
    'pt-BR': 'A retenção de spans precisa ainda cobrir o período investigado.',
  },

  'f.insight.logContext.obs': {
    en: 'Only {pct}% of the log records read in the last 30 minutes carry a service entity.',
    'pt-BR': 'Apenas {pct}% dos registros de log lidos nos últimos 30 minutos carregam uma entidade de serviço.',
  },
  'f.insight.logContext.subject': { en: 'Log ingest pipeline', 'pt-BR': 'Pipeline de ingestão de logs' },
  'f.insight.logContext.cons': {
    en: 'A log line with no service, host or namespace cannot be pivoted to a problem, a trace or an owner. Its ingest and retention cost is unchanged, while its analytical value is close to zero.',
    'pt-BR':
      'Uma linha de log sem serviço, host ou namespace não pode ser cruzada com um problema, um trace ou um responsável. O custo de ingestão e retenção continua o mesmo, enquanto o valor analítico é próximo de zero.',
  },
  'f.insight.logContext.rec': {
    en: 'Enrich these sources at ingest so service, host and namespace are attached. Where only a count matters rather than the text, convert the pattern into a metric or an event instead of storing every line.',
    'pt-BR':
      'Enriqueça essas fontes na ingestão para anexar serviço, host e namespace. Onde só a contagem importa e não o texto, converta o padrão em métrica ou evento em vez de armazenar cada linha.',
  },
  'f.insight.logContext.dep': {
    en: 'Identify the specific sources lacking context first. No pipeline change should be made from this app, and none is.',
    'pt-BR':
      'Identifique primeiro as fontes específicas sem contexto. Nenhuma mudança de pipeline deve ser feita a partir deste app, e nenhuma é.',
  },

  'f.insight.logSeverity.obs': {
    en: '{pct}% of the log records read in the last 30 minutes carry no severity.',
    'pt-BR': '{pct}% dos registros de log lidos nos últimos 30 minutos não têm severidade.',
  },
  'f.insight.logSeverity.cons': {
    en: 'Without a severity, errors cannot be separated from routine output, so alerting and triage on logs are not practical.',
    'pt-BR':
      'Sem severidade, não é possível separar erros da saída rotineira, então alertar e triar sobre logs deixa de ser prático.',
  },
  'f.insight.logSeverity.rec': {
    en: 'Add severity extraction for the affected sources. The platform already reports which sources have unparsed or ambiguous timestamps, which is a good place to start.',
    'pt-BR':
      'Adicione extração de severidade para as fontes afetadas. A plataforma já informa quais fontes têm timestamps não interpretados ou ambíguos, e esse é um bom ponto de partida.',
  },
  'f.insight.logSeverity.dep': {
    en: 'Knowledge of the log formats in use per source.',
    'pt-BR': 'Conhecimento dos formatos de log usados em cada fonte.',
  },

  'f.insight.emptyBuckets.title': {
    en: 'Review {count} {count|bucket|buckets} holding no data',
    'pt-BR': 'Revisar {count} {count|bucket|buckets} sem dados',
  },
  'f.insight.emptyBuckets.obs': {
    en: '{count} {count|bucket exists|buckets exist} with zero records: {list}{more}.',
    'pt-BR': '{count|Existe|Existem} {count} {count|bucket|buckets} com zero registros: {list}{more}.',
  },
  'f.insight.emptyBuckets.more': { en: ' and others', 'pt-BR': ' e outros' },
  'f.insight.emptyBuckets.subject': { en: 'Bucket configuration', 'pt-BR': 'Configuração de buckets' },
  'f.insight.emptyBuckets.cons': {
    en: 'Buckets that exist without a stated purpose make retention and access policy harder to reason about and harder to audit.',
    'pt-BR':
      'Buckets sem propósito declarado tornam a política de retenção e de acesso mais difícil de raciocinar e de auditar.',
  },
  'f.insight.emptyBuckets.rec': {
    en: 'Confirm ownership and intent for each, then consolidate the ones that were created for testing. Never delete a bucket on the basis of this list alone.',
    'pt-BR':
      'Confirme titularidade e intenção de cada um e então consolide os criados para teste. Nunca exclua um bucket apenas com base nesta lista.',
  },
  'f.insight.emptyBuckets.dep': {
    en: 'Bucket ownership must be confirmed before any removal.',
    'pt-BR': 'A titularidade do bucket precisa ser confirmada antes de qualquer remoção.',
  },

  'f.insight.access.title': {
    en: 'Resolve read access for {count} data {count|source|sources}',
    'pt-BR': 'Resolver o acesso de leitura a {count} {count|fonte|fontes} de dados',
  },
  'f.insight.access.obs': {
    en: '{count} {count|bucket reports|buckets report} that the signed-in identity cannot read {count|it|them}.',
    'pt-BR': '{count} {count|bucket informa|buckets informam} que a identidade autenticada não consegue {count|lê-lo|lê-los}.',
  },
  'f.insight.access.cons': {
    en: 'Any conclusion about the domains these sources cover is unsupported, and an empty section could be mistaken for a clean result.',
    'pt-BR':
      'Qualquer conclusão sobre os domínios que essas fontes cobrem não tem sustentação, e uma seção vazia pode ser confundida com um resultado limpo.',
  },
  'f.insight.access.rec': {
    en: 'Decide deliberately which of these the reviewing identity should read. Restricted access may well be correct; what matters is that the restriction is intentional and known.',
    'pt-BR':
      'Decida deliberadamente quais destes a identidade da análise deve ler. Acesso restrito pode muito bem estar correto; o que importa é que a restrição seja intencional e conhecida.',
  },
  'f.insight.access.dep': {
    en: 'A permissions decision, which sits with the platform owner rather than with the reviewer.',
    'pt-BR':
      'Uma decisão de permissão, que cabe ao dono da plataforma e não a quem faz a análise.',
  },

  'f.insight.workflows.title': {
    en: 'Fix {count} scheduled {count|workflow that is|workflows that are} failing',
    'pt-BR': 'Corrigir {count} {count|workflow agendado que está|workflows agendados que estão} falhando',
  },
  'f.insight.workflows.obs': {
    en: '{runs} failed {runs|execution|executions} in the {window} across {count} {count|workflow|workflows}: {list}.',
    'pt-BR': '{runs} {runs|execução|execuções} com falha em {window} em {count} {count|workflow|workflows}: {list}.',
  },
  'f.insight.workflows.cons': {
    en: 'A workflow failing on a schedule consumes capacity and produces nothing, and it undermines any claim that automation in this environment is reliable.',
    'pt-BR':
      'Um workflow que falha de forma agendada consome capacidade e não produz nada, além de enfraquecer qualquer afirmação de que a automação deste ambiente é confiável.',
  },
  'f.insight.workflows.rec': {
    en: 'Fix or disable these before presenting automation as a proven outcome. This one is worth doing before the closing meeting rather than after it.',
    'pt-BR':
      'Corrija ou desative esses workflows antes de apresentar automação como resultado comprovado. Vale fazer isso antes da reunião de fechamento, não depois.',
  },
  'f.insight.workflows.dep': {
    en: 'Access to each workflow definition and its execution log.',
    'pt-BR': 'Acesso à definição de cada workflow e ao seu log de execução.',
  },

  'f.insight.queryCost.title': {
    en: 'Improve query efficiency against the {table} table',
    'pt-BR': 'Melhorar a eficiência das consultas à tabela {table}',
  },
  'f.insight.queryCost.obs': {
    en: 'Queries against {table} scanned {scanned} in the {window} to return their results, averaging {perRecord} scanned per record delivered.',
    'pt-BR':
      'As consultas a {table} varreram {scanned} em {window} para devolver seus resultados, com média de {perRecord} varridos por registro entregue.',
  },
  'f.insight.queryCost.cons': {
    en: 'Every bucket in this environment reports zero included query days, so all of this scanning is on demand. Inefficient queries convert directly into consumption.',
    'pt-BR':
      'Todos os buckets deste ambiente reportam zero dias de consulta inclusos, então toda essa varredura é sob demanda. Consultas ineficientes se convertem diretamente em consumo.',
  },
  'f.insight.queryCost.rec': {
    en: 'Scope these queries to specific buckets, narrow their timeframes and aggregate in Grail rather than in the client. Review the advisor on the Consumption page for the specific practice each query misses.',
    'pt-BR':
      'Restrinja essas consultas a buckets específicos, reduza os períodos e agregue no Grail em vez de no cliente. Consulte o consultor na página de Consumo para ver a prática específica que cada consulta deixa de seguir.',
  },
  'f.insight.queryCost.dep': {
    en: 'The queries are run by several clients of this environment, so improving them needs the owners of those clients. Quote no monetary figure until before-and-after measurements exist.',
    'pt-BR':
      'As consultas são executadas por vários clientes deste ambiente, então melhorá-las depende dos donos desses clientes. Não cite valor monetário enquanto não houver medições antes e depois.',
  },

  'f.insight.security.obs': {
    en: 'The security events table was queried and refused for lack of a scope, while the environment reports holding a large volume of security records.',
    'pt-BR':
      'A tabela de eventos de segurança foi consultada e recusada por falta de escopo, enquanto o ambiente informa guardar um grande volume de registros de segurança.',
  },
  'f.insight.security.cons': {
    en: 'Security cannot form part of the engagement conclusion, and an empty section risks being read as an absence of risk.',
    'pt-BR':
      'Segurança não pode fazer parte da conclusão do engajamento, e uma seção vazia corre o risco de ser lida como ausência de risco.',
  },
  'f.insight.security.rec': {
    en: 'Grant storage:security.events:read to the reviewing identity and re-run the section. Do not characterise the environment as low risk until it has been read.',
    'pt-BR':
      'Conceda storage:security.events:read à identidade da análise e execute a seção novamente. Não caracterize o ambiente como de baixo risco enquanto ele não for lido.',
  },
  'f.insight.security.dep': {
    en: 'A permissions decision by the platform owner.',
    'pt-BR': 'Uma decisão de permissão do dono da plataforma.',
  },

  'f.insight.rum.obs': {
    en: 'Session data is either unreadable by this identity or effectively empty, so no measurement of real user experience exists in this scope.',
    'pt-BR':
      'Os dados de sessão são ilegíveis por esta identidade ou estão praticamente vazios, então não existe medição de experiência real do usuário neste escopo.',
  },
  'f.insight.rum.subject': { en: 'Real user monitoring', 'pt-BR': 'Monitoramento de usuário real' },
  'f.insight.rum.cons': {
    en: 'The engagement cannot speak to what users experienced, which is usually the part a business audience cares about most.',
    'pt-BR':
      'O engajamento não consegue falar sobre o que os usuários vivenciaram, que costuma ser justamente a parte que mais importa para uma audiência de negócio.',
  },
  'f.insight.rum.rec': {
    en: 'Instrument a single important journey end to end and confirm sessions are arriving. One real journey is worth more here than broad partial coverage.',
    'pt-BR':
      'Instrumente uma única jornada importante de ponta a ponta e confirme que as sessões estão chegando. Uma jornada real vale mais aqui do que uma cobertura ampla e parcial.',
  },
  'f.insight.rum.dep': {
    en: 'Application access to deploy instrumentation, plus read access for the reviewer.',
    'pt-BR':
      'Acesso à aplicação para implantar a instrumentação, mais acesso de leitura para quem analisa.',
  },

  // -------------------------------------------- problem impact: quick wins
  'f.impact.qw.automate.title': {
    en: 'Automate the response to "{name}"',
    'pt-BR': 'Automatizar a resposta para "{name}"',
  },
  'f.impact.qw.automate.why': {
    en: 'It occurred {count} {count|time|times} in this window, the most of any pattern.',
    'pt-BR': 'Ocorreu {count} {count|vez|vezes} nesta janela, mais que qualquer outro padrão.',
  },
  'f.impact.qw.automate.action': {
    en: 'Define the standard response and build it as a workflow, with an approval gate before any action that changes state. Track recurrence from the day it goes live so the improvement is measured rather than claimed.',
    'pt-BR':
      'Defina a resposta padrão e construa-a como um workflow, com uma etapa de aprovação antes de qualquer ação que altere estado. Acompanhe a recorrência desde o dia em que entrar no ar, para que a melhoria seja medida e não apenas afirmada.',
  },
  'f.impact.qw.entity.title': { en: 'Investigate {name} first', 'pt-BR': 'Investigar {name} primeiro' },
  'f.impact.qw.entity.why': {
    en: 'It appears in {count} {count|problem|problems}, more than any other entity.',
    'pt-BR': 'Aparece em {count} {count|problema|problemas}, mais que qualquer outra entidade.',
  },
  'f.impact.qw.entity.action': {
    en: 'Fixing one entity that appears this often reduces problem volume across several categories at once. Start with its owner.',
    'pt-BR':
      'Corrigir uma entidade que aparece com essa frequência reduz o volume de problemas em várias categorias ao mesmo tempo. Comece pelo responsável por ela.',
  },
  'f.impact.qw.triage.why': {
    en: 'The oldest open problem has been open for {duration}. One week is the review threshold this app applies; it is not a Dynatrace rule.',
    'pt-BR':
      'O problema aberto mais antigo está aberto há {duration}. Uma semana é o limiar de análise que este app aplica; não é uma regra da Dynatrace.',
  },
  'f.impact.qw.triage.action': {
    en: 'Decide explicitly for each: resolve it, or accept it and mute it with a documented reason. An open problem nobody intends to fix trains people to ignore the list.',
    'pt-BR':
      'Decida explicitamente para cada um: resolver, ou aceitar e silenciar com um motivo documentado. Um problema aberto que ninguém pretende corrigir ensina as pessoas a ignorarem a lista.',
  },
  'f.impact.qw.alerting.why': {
    en: '{count} {count|problem is|problems are} open simultaneously.',
    'pt-BR': '{count} {count|problema está aberto|problemas estão abertos} ao mesmo tempo.',
  },
  'f.impact.qw.alerting.action': {
    en: 'At this volume, routing and ownership matter more than detection. Confirm which problems reach a human and which are informational.',
    'pt-BR':
      'Nesse volume, roteamento e responsabilidade importam mais que detecção. Confirme quais problemas chegam a uma pessoa e quais são informativos.',
  },
  'f.impact.setRate': { en: 'Set a rate in Settings', 'pt-BR': 'Defina um valor em Configurações' },
  'common.uncategorised': { en: 'Uncategorised', 'pt-BR': 'Sem categoria' },

  // ------------------------------------------- interpolated summary lines
  'p.auto.allGoodLine': {
    en: '{runs} successful {runs|execution|executions} across {count} {count|workflow|workflows}, with no failures in this window.',
    'pt-BR': '{runs} {runs|execução bem-sucedida|execuções bem-sucedidas} em {count} {count|workflow|workflows}, sem nenhuma falha nesta janela.',
  },
  'p.auto.failingCount': {
    en: '{count} workflows are failing on a schedule',
    'pt-BR': '{count} workflows estão falhando de forma recorrente',
  },
  'p.biz.summaryLine': {
    en: '{types} distinct event types and {events} events in this window. Each type is a business process already visible to the platform without a separate analytics tool.',
    'pt-BR':
      '{types} tipos distintos de evento e {events} eventos nesta janela. Cada tipo é um processo de negócio já visível à plataforma sem uma ferramenta de analytics separada.',
  },
  'p.cons.unitWarningCount': {
    en: '{count} capability figures need unit confirmation',
    'pt-BR': '{count} números de capacidade precisam de confirmação de unidade',
  },
  'p.dx.sessionGroups': { en: '{count} session {count|group|groups} returned.', 'pt-BR': '{count} {count|grupo de sessão retornado|grupos de sessão retornados}.' },
  'p.dx.sessionsImpact': {
    en: 'Granting this scope would make session data readable, but instrumentation of a real user journey is also required before any experience claim could be supported.',
    'pt-BR':
      'Conceder este escopo tornaria os dados de sessão legíveis, mas também é necessário instrumentar uma jornada real de usuário antes que qualquer afirmação sobre experiência tenha sustentação.',
  },
  'p.dx.sessionsEmpty': {
    en: 'The query succeeded but returned no sessions, confirming that real user monitoring is not producing data in this scope.',
    'pt-BR':
      'A consulta funcionou mas não retornou sessões, confirmando que o monitoramento de usuário real não está produzindo dados neste escopo.',
  },
  'p.evid.notCaptured': {
    en: '{count} of {total} queries have no recorded scan figure. Those queries were executed and their results inspected, but the platform\'s cost accounting was not captured for them individually. They are marked as not captured rather than as zero.',
    'pt-BR':
      '{count} de {total} consultas não têm registro de varredura. Elas foram executadas e seus resultados inspecionados, mas a contabilidade de custo da plataforma não foi capturada individualmente. Estão marcadas como não capturadas, e não como zero.',
  },
  'p.evid.noCeiling': {
    en: '{count} queries have no scan ceiling. Most of these read the entity model or bucket metadata and scan no Grail data at all, which the advisor on the Consumption page distinguishes explicitly.',
    'pt-BR':
      '{count} consultas não têm teto de varredura. A maioria lê o modelo de entidades ou metadados de bucket e não varre nenhum dado do Grail, o que o consultor na página de Consumo distingue explicitamente.',
  },
  'p.opp.incompleteLine': {
    en: '{count} sources could not be read, so any opportunity they would have surfaced is absent from the list below: {list}. Absence of a row is not evidence of absence of an opportunity.',
    'pt-BR':
      '{count} fontes não puderam ser lidas, então qualquer oportunidade que elas revelariam está ausente da lista abaixo: {list}. A ausência de uma linha não é evidência da ausência de uma oportunidade.',
  },
  'p.k8s.highestTitle': {
    en: 'Highest restart count: {workload} in {cluster}',
    'pt-BR': 'Maior contagem de restarts: {workload} no cluster {cluster}',
  },
  'p.k8s.highestBody': {
    en: '{count} container {count|restart|restarts} over the selected window, across {total} {total|workload|workloads} with any restart at all. Restart counts show instability; they do not by themselves identify the cause.',
    'pt-BR':
      '{count} {count|restart|restarts} de contêiner na janela selecionada, entre {total} {total|workload que teve|workloads que tiveram} algum restart. A contagem de restarts mostra instabilidade; sozinha ela não identifica a causa.',
  },
  'p.logs.onlyPct': {
    en: 'Only {pct} of the log records read in the last 30 minutes (every readable bucket) carry a service entity. A log line without service, host or namespace context cannot be pivoted to a problem, a trace or an owner, so its analytical value is close to zero while its ingest and retention cost is unchanged.',
    'pt-BR':
      'Apenas {pct} dos registros de log lidos nos últimos 30 minutos (todos os buckets legíveis) carregam uma entidade de serviço. Uma linha de log sem contexto de serviço, host ou namespace não pode ser cruzada com um problema, um trace ou um responsável, então seu valor analítico é próximo de zero enquanto o custo de ingestão e retenção permanece o mesmo.',
  },
  'p.roadmap.partialLine': {
    en: '{list} could not be read, so items those sources would have produced are missing.',
    'pt-BR': '{list} não puderam ser lidas, então os itens que elas teriam produzido estão faltando.',
  },
  'p.svc.aboveTitle': {
    en: '{count} services above a 1% failure rate',
    'pt-BR': '{count} serviços acima de 1% de taxa de falha',
  },
  'p.appx.scopeLine': {
    en: 'This app reads {count} queries across a deliberately narrow set of sources. The data-object list below is the full surface the environment exposes to DQL. Anything in that list which is not covered by a query above is outside the scope of the conclusions this app draws, and should not be assumed to be healthy.',
    'pt-BR':
      'Este app executa {count} consultas sobre um conjunto deliberadamente estreito de fontes. A lista de objetos de dados abaixo é toda a superfície que o ambiente expõe à DQL. Tudo o que estiver nessa lista e não for coberto por uma consulta acima está fora do escopo das conclusões deste app, e não deve ser presumido saudável.',
  },
  'p.cons.leastEfficientLine': {
    en: 'Least efficient table by scan-per-record: {table}, at {value} scanned for every record returned. Every bucket in this environment reports zero included query days, so all of this scanning is on-demand.',
    'pt-BR':
      'Tabela menos eficiente por varredura-por-registro: {table}, com {value} varridos para cada registro devolvido. Todos os buckets deste ambiente reportam zero dias de consulta inclusos, então toda essa varredura é sob demanda.',
  },

  // ------------------------------------------------- key discoveries cards
  'f.disc.logs.measure': {
    en: '{pct}% of the log records read in the last 30 minutes carry a service entity.',
    'pt-BR': '{pct}% dos registros de log lidos nos últimos 30 minutos carregam uma entidade de serviço.',
  },
  'f.disc.logs.meaning': {
    en: 'A log line with no service, host or namespace cannot reach a problem, a trace or an owner. Full ingest and retention cost, close to zero analytical value.',
    'pt-BR':
      'Uma linha de log sem serviço, host ou namespace não chega a um problema, a um trace nem a um responsável. Custo integral de ingestão e retenção, valor analítico próximo de zero.',
  },
  'f.disc.recurring.measure': {
    en: '"{name}" occurred {count} {count|time|times} in the {window}.',
    'pt-BR': '"{name}" ocorreu {count} {count|vez|vezes} em {window}.',
  },
  'f.disc.recurring.meaning': {
    en: 'Repetition at this rate is repeated human effort. It is the measured case for automation, with a before-and-after you can actually track.',
    'pt-BR':
      'Repetição nessa taxa é esforço humano repetido. É o argumento medido para automação, com um antes e um depois que dá para acompanhar de verdade.',
  },
  'f.disc.workload.measure': {
    en: '{count} container {count|restart|restarts} on {workload} in cluster {cluster}.',
    'pt-BR': '{count} {count|restart|restarts} de contêiner em {workload}, cluster {cluster}.',
  },
  'f.disc.workload.meaning': {
    en: 'Dynatrace detected this without any application change. Restart churn surfaces as intermittent errors in whatever depends on it.',
    'pt-BR':
      'A Dynatrace detectou isso sem nenhuma alteração na aplicação. A rotatividade de restarts aparece como erros intermitentes em tudo o que depende do workload.',
  },
  'f.disc.queryCost.measure': {
    en: 'Queries against {table} scanned {scanned}, averaging {perRecord} scanned per record returned.',
    'pt-BR':
      'As consultas a {table} varreram {scanned}, com média de {perRecord} varridos por registro devolvido.',
  },
  'f.disc.queryCost.meaning': {
    en: 'Every bucket in this environment reports zero included query days, so all of this scanning is on demand. Scoping and narrowing these queries is a direct reduction.',
    'pt-BR':
      'Todos os buckets deste ambiente reportam zero dias de consulta inclusos, então toda essa varredura é sob demanda. Delimitar e estreitar essas consultas é uma redução direta.',
  },
  'f.disc.automation.measure': {
    en: '{runs} failed workflow {runs|execution|executions} across {count} {count|workflow|workflows}.',
    'pt-BR': '{runs} {runs|execução|execuções} de workflow com falha em {count} {count|workflow|workflows}.',
  },
  'f.disc.automation.meaning': {
    en: 'Worth fixing before automation is presented as a proven outcome. A scheduled workflow that fails repeatedly is operational debt.',
    'pt-BR':
      'Vale corrigir antes de apresentar automação como resultado comprovado. Um workflow agendado que falha repetidamente é dívida operacional.',
  },
  'f.disc.security.measure': {
    en: 'The security events table was queried and refused for lack of a scope, while the environment reports holding a large volume of security records.',
    'pt-BR':
      'A tabela de eventos de segurança foi consultada e recusada por falta de escopo, enquanto o ambiente informa guardar um grande volume de registros de segurança.',
  },
  'f.disc.security.meaning': {
    en: 'This is a permission gap, not a clean result. Granting one scope turns it into a runtime-aware vulnerability view.',
    'pt-BR':
      'Isto é uma lacuna de permissão, não um resultado limpo. Conceder um escopo transforma isso em uma visão de vulnerabilidades com contexto de runtime.',
  },
  'f.disc.rum.measure': {
    en: 'Session data is unreadable by this identity and effectively empty in this environment.',
    'pt-BR':
      'Os dados de sessão são ilegíveis por esta identidade e estão praticamente vazios neste ambiente.',
  },
  'f.disc.rum.meaning': {
    en: 'No claim about page load, Apdex or conversion is made anywhere in this app, and backend latency is not substituted for it.',
    'pt-BR':
      'Nenhuma afirmação sobre carregamento de página, Apdex ou conversão é feita em qualquer parte deste app, e a latência de backend não é usada como substituta.',
  },

  // ------------------------------------------------------ remaining notes
  'exec.note.measuredZeroShort': {
    en: 'Dynatrace detected no entities of this type while detecting others normally. This is a measured zero, not a missing measurement.',
    'pt-BR':
      'A Dynatrace não detectou entidades deste tipo enquanto detectava outras normalmente. Este é um zero medido, não uma medição ausente.',
  },
  'p.logs.sampleNoteShort': {
    en: 'Counted over every record of a deliberately short window in every log bucket this identity can read, because logs are the costliest table to scan.',
    'pt-BR':
      'Contado sobre todos os registros de uma janela deliberadamente curta em todos os buckets de log que esta identidade pode ler, porque logs são a tabela mais cara de varrer.',
  },
  'p.report.tooWideTitle': {
    en: 'The selected window covers {days} days',
    'pt-BR': 'A janela selecionada cobre {days} dias',
  },
  'p.report.tooWideBound': {
    en: 'Reports are bounded to {max} days. The problem history is the most expensive source this app reads and scan volume scales with the window, so a wider report would cost more than it informs.',
    'pt-BR':
      'Relatórios são limitados a {max} dias. O histórico de problemas é a fonte mais cara que este app lê e o volume de varredura cresce com a janela, então um relatório mais amplo custaria mais do que informaria.',
  },
  'p.report.costLabel': { en: 'Estimated operational cost:', 'pt-BR': 'Custo operacional estimado:' },
  'p.report.insightLine': {
    en: '{index}. {title} — {impact} impact, {effort} effort',
    'pt-BR': '{index}. {title} — impacto {impact}, esforço {effort}',
  },

  // ---------------------------------- per-query empty and permission states
  'st.auto.perm': {
    en: 'Without system event access, existing automation cannot be evidenced.',
    'pt-BR': 'Sem acesso a eventos de sistema, a automação existente não pode ser evidenciada.',
  },
  'st.auto.empty': {
    en: 'No workflow reached a final state in this window. If workflows exist but run less frequently, widen the timeframe.',
    'pt-BR':
      'Nenhum workflow chegou a um estado final nesta janela. Se existem workflows que rodam com menos frequência, amplie o período.',
  },
  'st.biz.perm': {
    en: 'Without business event access, no link between technical findings and business processes can be shown.',
    'pt-BR':
      'Sem acesso a eventos de negócio, não é possível mostrar nenhuma ligação entre constatações técnicas e processos de negócio.',
  },
  'st.biz.empty': {
    en: 'No business events were recorded in this window. If ingestion is scheduled rather than continuous, widen the timeframe.',
    'pt-BR':
      'Nenhum evento de negócio foi registrado nesta janela. Se a ingestão é agendada e não contínua, amplie o período.',
  },
  'st.cons.perm': {
    en: 'Without system event access, capability usage cannot be evidenced and this discussion has to rely on recollection.',
    'pt-BR':
      'Sem acesso a eventos de sistema, o uso por capacidade não pode ser evidenciado e essa conversa passa a depender de memória.',
  },
  'st.exec.perm': {
    en: 'Without entity read access this app cannot state what was monitored, which makes every other conclusion unverifiable.',
    'pt-BR':
      'Sem acesso de leitura ao modelo de entidades, este app não consegue afirmar o que foi monitorado, o que torna todas as outras conclusões inverificáveis.',
  },
  'st.mttr.perm': {
    en: 'Without event access, resolution times cannot be measured and no MTTR statement is possible.',
    'pt-BR':
      'Sem acesso a eventos, os tempos de resolução não podem ser medidos e nenhuma afirmação de MTTR é possível.',
  },
  'st.k8s.restarts.empty': {
    en: 'No container restarts were recorded for any workload in this window. That is a measured result.',
    'pt-BR':
      'Nenhum restart de contêiner foi registrado para nenhum workload nesta janela. Este é um resultado medido.',
  },
  'st.k8s.pressure.empty': {
    en: 'No workload recorded an out-of-memory kill or CPU throttling in this window.',
    'pt-BR':
      'Nenhum workload registrou morte por falta de memória ou throttling de CPU nesta janela.',
  },
  'st.logs.perm': {
    en: 'Without log read access, neither log volume nor log quality can be assessed.',
    'pt-BR': 'Sem acesso de leitura a logs, nem o volume nem a qualidade dos logs podem ser avaliados.',
  },
  'st.prob.empty': {
    en: 'No problems were recorded in the last 7 days. That is a measured result, not a coverage gap — the categories above are queried directly from Dynatrace Intelligence output.',
    'pt-BR':
      'Nenhum problema foi registrado nos últimos 7 dias. Este é um resultado medido, não uma lacuna de cobertura — as categorias acima são consultadas diretamente da saída da Dynatrace Intelligence.',
  },
  'st.prob.perm': {
    en: 'Without event read access, no statement can be made about what the platform detected.',
    'pt-BR':
      'Sem acesso de leitura a eventos, nenhuma afirmação pode ser feita sobre o que a plataforma detectou.',
  },
  'st.sec.empty': {
    en: 'The query succeeded and returned no findings for this window. Confirm the timeframe and the buckets in scope before treating this as a clean result.',
    'pt-BR':
      'A consulta funcionou e não retornou achados para esta janela. Confirme o período e os buckets no escopo antes de tratar isso como resultado limpo.',
  },
  'st.sec.perm': {
    en: 'Granting this scope to the reviewing identity turns this page into a prioritised, runtime-aware vulnerability view. Without it, security cannot be part of the PoC conclusion at all.',
    'pt-BR':
      'Conceder este escopo à identidade que faz a análise transforma esta página em uma visão priorizada de vulnerabilidades com contexto de runtime. Sem ele, segurança não pode fazer parte da conclusão da PoC de forma alguma.',
  },
  'st.topo.empty': {
    en: 'No problem in this window carried Smartscape entity context.',
    'pt-BR': 'Nenhum problema nesta janela trouxe contexto de entidade do Smartscape.',
  },
  'st.impact.perm': {
    en: 'Without event access, open problem exposure cannot be quantified at all.',
    'pt-BR': 'Sem acesso a eventos, a exposição de problemas em aberto não pode ser quantificada.',
  },

  // ------------------------------------------ pillar metrics, measured live
  'pillar.m.problemsDetected': { en: 'problems detected', 'pt-BR': 'problemas detectados' },
  'pillar.m.problemCategories': { en: 'categories distinguished', 'pt-BR': 'categorias distinguidas' },
  'pillar.m.problemsOpen': { en: 'open right now', 'pt-BR': 'abertos agora' },
  'pillar.m.entitiesAttached': { en: 'entities Dynatrace Intelligence attached', 'pt-BR': 'entidades anexadas pela Dynatrace Intelligence' },
  'pillar.m.mostAffected': { en: 'most affected entity', 'pt-BR': 'entidade mais afetada' },
  'pillar.m.problemsOnTopEntity': {
    en: 'problems on that entity',
    'pt-BR': 'problemas nessa entidade',
  },
  'pillar.m.servicesMeasured': { en: 'services measured', 'pt-BR': 'serviços medidos' },
  'pillar.m.recurringPatterns': { en: 'recurring patterns', 'pt-BR': 'padrões recorrentes' },
  'pillar.m.topRecurrence': { en: 'worst recurrence', 'pt-BR': 'maior recorrência' },
  'pillar.m.mttr': { en: 'mean time to resolve', 'pt-BR': 'tempo médio de resolução' },
  'pillar.m.mttr.calc': {
    en: 'Mean of the per-category MTTR reported by Dynatrace, weighted by the number of problems in each category.',
    'pt-BR':
      'Média do MTTR por categoria reportado pela Dynatrace, ponderada pelo número de problemas de cada categoria.',
  },
  'pillar.m.problemsResolved': { en: 'problems resolved', 'pt-BR': 'problemas resolvidos' },
  'pillar.m.technologies': { en: 'technologies identified', 'pt-BR': 'tecnologias identificadas' },
  'pillar.m.processInstances': { en: 'process instances', 'pt-BR': 'instâncias de processo' },
  'pillar.m.serviceTypes': { en: 'service types', 'pt-BR': 'tipos de serviço' },
  'pillar.m.hosts': { en: 'hosts discovered', 'pt-BR': 'hosts descobertos' },
  'pillar.m.services': { en: 'services discovered', 'pt-BR': 'serviços descobertos' },
  'pillar.m.processes': { en: 'processes discovered', 'pt-BR': 'processos descobertos' },
  'pillar.m.hostsInstrumented': { en: 'hosts instrumented', 'pt-BR': 'hosts instrumentados' },
  'pillar.m.osFamilies': { en: 'operating systems', 'pt-BR': 'sistemas operacionais' },
  'pillar.m.fullStackShare': { en: 'of hosts are full-stack', 'pt-BR': 'dos hosts são full-stack' },
  'pillar.m.fullStackShare.calc': {
    en: 'Full-stack hosts divided by all hosts the agent reported, from the monitoring-mode attribute.',
    'pt-BR':
      'Hosts full-stack divididos por todos os hosts que o agente reportou, a partir do atributo de modo de monitoramento.',
  },
  'pillar.m.fullStackHosts': { en: 'full-stack hosts', 'pt-BR': 'hosts full-stack' },
  'pillar.m.workflows': { en: 'workflows running', 'pt-BR': 'workflows em execução' },
  'pillar.m.workflowRuns': { en: 'executions recorded', 'pt-BR': 'execuções registradas' },
  'pillar.m.capabilities': { en: 'capabilities exercised', 'pt-BR': 'capacidades exercitadas' },
  'pillar.m.sessions': { en: 'user sessions', 'pt-BR': 'sessões de usuário' },
  'pillar.m.sessionTypes': { en: 'session types', 'pt-BR': 'tipos de sessão' },
  'pillar.m.avgResponse': { en: 'average response time', 'pt-BR': 'tempo médio de resposta' },
  'pillar.m.avgResponse.calc': {
    en: 'Per-service average response time, weighted by each service\'s request count over the window.',
    'pt-BR':
      'Tempo médio de resposta por serviço, ponderado pelo número de requisições de cada serviço na janela.',
  },
  'pillar.m.businessEventTypes': { en: 'business event types', 'pt-BR': 'tipos de evento de negócio' },
  'pillar.m.businessEvents': { en: 'business events', 'pt-BR': 'eventos de negócio' },
  'pillar.m.derived': {
    en: 'Calculated by this app from the query result.',
    'pt-BR': 'Calculado por este app a partir do resultado da consulta.',
  },

  // ------------------------------------------------- pillar status, live
  'pillar.status.measuring': { en: 'Measuring…', 'pt-BR': 'Medindo…' },
  'pillar.measuredOver': {
    en: 'Measured over {window}',
    'pt-BR': 'Medido em {window}',
  },
  'pillar.liveIntro': {
    en: 'Each point below is measured against this environment over the selected window, not asserted. A point with no figure says why.',
    'pt-BR':
      'Cada ponto abaixo é medido neste ambiente na janela selecionada, não afirmado. Um ponto sem número explica o porquê.',
  },
  'pillar.noMetric': {
    en: 'This app has no measurement for this point.',
    'pt-BR': 'Este app não tem medição para este ponto.',
  },
  'pillar.blockedBy': { en: 'Blocked by missing scope: {scopes}', 'pt-BR': 'Bloqueado por escopo ausente: {scopes}' },
  'pillar.coverageLive': {
    en: '{evidenced} measured · {partial} partial · {missing} not measurable',
    'pt-BR': '{evidenced} medidos · {partial} parciais · {missing} não mensuráveis',
  },
  'pillar.strength': { en: 'Evidence strength', 'pt-BR': 'Força da evidência' },

  // -------------------------------------------------------- chart roles
  'chart.role.magnitude': { en: 'Ranked count', 'pt-BR': 'Contagem ordenada' },
  'chart.role.category': { en: 'By category', 'pt-BR': 'Por categoria' },
  'chart.role.duration': { en: 'Elapsed time', 'pt-BR': 'Tempo decorrido' },
  'chart.role.volume': { en: 'Throughput', 'pt-BR': 'Vazão' },
  'chart.role.exposure': { en: 'Worth reviewing', 'pt-BR': 'Vale revisar' },

  // -------------------------------------------------- chart series labels
  'series.requests': { en: 'Requests', 'pt-BR': 'Requisições' },
  'series.failures': { en: 'Failures', 'pt-BR': 'Falhas' },
  'series.responseTime': { en: 'Avg response time (µs)', 'pt-BR': 'Tempo médio de resposta (µs)' },
  'series.cpu': { en: 'CPU %', 'pt-BR': 'CPU %' },
  'series.memory': { en: 'Memory %', 'pt-BR': 'Memória %' },

  // ------------------------------------------------- overview headline band
  'overview.band.entities': { en: 'Entities monitored', 'pt-BR': 'Entidades monitoradas' },
  'overview.band.entitiesDetail': {
    en: 'discovered automatically, no inventory supplied',
    'pt-BR': 'descobertas automaticamente, sem inventário fornecido',
  },
  'overview.band.hostsDetail': { en: 'running {services} services', 'pt-BR': 'executando {services} serviços' },
  'overview.band.openDetail': { en: 'of {total} in the window', 'pt-BR': 'de {total} na janela' },
  'overview.band.closed': { en: 'Problems closed', 'pt-BR': 'Problemas fechados' },
  'overview.band.closedNote': {
    en: 'Problems no longer in an ACTIVE state, summed across all categories.',
    'pt-BR': 'Problemas que não estão mais em estado ACTIVE, somados em todas as categorias.',
  },
  'overview.band.closedDetail': { en: '{pct}% of the window', 'pt-BR': '{pct}% da janela' },
  'overview.band.closedResolvedDetail': {
    en: 'no longer active; how each one closed is not measured',
    'pt-BR': 'não estão mais ativos; como cada um foi encerrado não é medido',
  },
  'overview.band.shareDetail': { en: 'share of all problems in the window', 'pt-BR': 'proporção de todos os problemas da janela' },
  'overview.band.categories': { en: 'Problem categories', 'pt-BR': 'Categorias de problema' },
  'overview.band.categoriesNote': {
    en: 'Distinct Dynatrace Intelligence categories seen in the window: availability, error, slowdown, resource contention.',
    'pt-BR':
      'Categorias distintas da Dynatrace Intelligence vistas na janela: disponibilidade, erro, lentidão, contenção de recurso.',
  },
  'overview.band.categoriesDetail': {
    en: 'distinguished without an alert rule',
    'pt-BR': 'distinguidas sem nenhuma regra de alerta',
  },
  'overview.band.footnote': {
    en: 'Entity counts come from the entity model and cost nothing to read. Problem counts are pinned to the last 7 days, which is the most expensive query in this app.',
    'pt-BR':
      'As contagens de entidades vêm do modelo de entidades e não têm custo de leitura. As contagens de problemas são fixas nos últimos 7 dias, que é a consulta mais cara deste app.',
  },

  // -------------------------------------------------- services headline band
  'p.svc.band.requests': { en: 'Requests traced', 'pt-BR': 'Requisições rastreadas' },
  'p.svc.band.requestsDetail': {
    en: 'across {services} ranked services',
    'pt-BR': 'em {services} serviços ranqueados',
  },
  'p.svc.band.failures': { en: 'Failed requests', 'pt-BR': 'Requisições com falha' },
  'p.svc.band.failuresDetail': {
    en: 'counted by the platform, not sampled',
    'pt-BR': 'contadas pela plataforma, sem amostragem',
  },
  'p.svc.band.rate': { en: 'Overall failure rate', 'pt-BR': 'Taxa de falha geral' },
  'p.svc.band.rateCalc': {
    en: 'Failed requests divided by all requests over the window, both summed across every service.',
    'pt-BR':
      'Requisições com falha divididas por todas as requisições da janela, ambas somadas em todos os serviços.',
  },
  'p.svc.band.rateDetail': {
    en: 'estate-wide, all services combined',
    'pt-BR': 'no parque inteiro, todos os serviços somados',
  },
  'p.svc.band.failingServices': { en: 'Services with failures', 'pt-BR': 'Serviços com falhas' },
  'p.svc.band.failingCalc': {
    en: 'Services whose failure count over the window is greater than zero.',
    'pt-BR': 'Serviços cuja contagem de falhas na janela é maior que zero.',
  },
  'p.svc.band.failingDetail': {
    en: '{count} above the 1% review line',
    'pt-BR': '{count} acima da linha de revisão de 1%',
  },
  'p.svc.band.footnote': {
    en: 'The 1% line is a review convention chosen for this app, not a Dynatrace threshold and not an agreed objective. Totals are read from metrics, so they cost nothing to refresh.',
    'pt-BR':
      'A linha de 1% é uma convenção de análise escolhida para este app, não um limiar da Dynatrace nem um objetivo acordado. Os totais vêm de métricas, então atualizá-los não tem custo.',
  },

  // ------------------------------------------------ infrastructure capacity
  'p.infra.capacityTitle': {
    en: 'Capacity against usage, per host',
    'pt-BR': 'Capacidade versus uso, por host',
  },
  'p.infra.capacityBody': {
    en: 'Dynatrace reports both halves without any configuration: the agent says what each host has, and metrics say what it actually used. Putting them side by side finds the two hosts nobody looks for — the one running out of room, and the one that was sized for load it never sees.',
    'pt-BR':
      'A Dynatrace reporta as duas metades sem nenhuma configuração: o agente informa o que cada host tem, e as métricas informam o que ele de fato usou. Colocar as duas lado a lado revela os dois hosts que ninguém procura — o que está ficando sem espaço e o que foi dimensionado para uma carga que nunca aparece.',
  },
  'p.infra.peakChartTitle': { en: 'Peak memory use per host', 'pt-BR': 'Pico de uso de memória por host' },
  'p.infra.peakChartCaption': {
    en: 'Peak, not average — an average hides the spike that matters. Bars at or above {saturated}% are at their ceiling; bars below {oversized}% never got busy.',
    'pt-BR':
      'Pico, não média — a média esconde justamente o pico que importa. Barras em {saturated}% ou acima estão no limite; barras abaixo de {oversized}% nunca ficaram ocupadas.',
  },
  'p.infra.peakChartAria': {
    en: 'Peak memory utilisation per host, highest first',
    'pt-BR': 'Pico de utilização de memória por host, do maior para o menor',
  },
  'p.infra.thresholdNote': {
    en: 'Classification lines used here: saturated at {saturated}% peak, under pressure at {pressured}%, over-provisioned below {oversized}% peak on both CPU and memory. These are review conventions chosen for this app, not Dynatrace thresholds and not agreed objectives.',
    'pt-BR':
      'Linhas de classificação usadas aqui: saturado a partir de {saturated}% de pico, sob pressão a partir de {pressured}%, superdimensionado abaixo de {oversized}% de pico tanto em CPU quanto em memória. São convenções de análise escolhidas para este app, não limiares da Dynatrace nem objetivos acordados.',
  },
  'p.infra.class.saturated': { en: 'At its ceiling', 'pt-BR': 'No limite' },
  'p.infra.class.pressured': { en: 'Under pressure', 'pt-BR': 'Sob pressão' },
  'p.infra.class.balanced': { en: 'Well sized', 'pt-BR': 'Bem dimensionado' },
  'p.infra.class.oversized': { en: 'Room to reclaim', 'pt-BR': 'Espaço a recuperar' },
  'p.infra.class.unknown': { en: 'Not measured', 'pt-BR': 'Não medido' },
  'p.infra.h.verdict': { en: 'Sizing', 'pt-BR': 'Dimensionamento' },
  'p.infra.h.memoryHas': { en: 'Memory it has', 'pt-BR': 'Memória que tem' },
  'p.infra.h.memoryUses': { en: 'Memory it uses', 'pt-BR': 'Memória que usa' },
  'p.infra.h.peakMem': { en: 'Peak memory', 'pt-BR': 'Pico de memória' },
  'p.infra.h.peakCpu': { en: 'Peak CPU', 'pt-BR': 'Pico de CPU' },
  'p.infra.h.peakDisk': { en: 'Peak disk', 'pt-BR': 'Pico de disco' },
  'p.infra.h.headroom': { en: 'Never used', 'pt-BR': 'Nunca usado' },

  'p.infra.band.hosts': { en: 'Hosts monitored', 'pt-BR': 'Hosts monitorados' },
  'p.infra.band.hostsDetail': { en: '{cores} CPU cores in total', 'pt-BR': '{cores} núcleos de CPU no total' },
  'p.infra.band.memory': { en: 'Memory provisioned', 'pt-BR': 'Memória provisionada' },
  'p.infra.band.memoryDetail': {
    en: 'reported by the agent, not from a spreadsheet',
    'pt-BR': 'reportada pelo agente, não vinda de planilha',
  },
  'p.infra.band.used': { en: 'Memory actually used', 'pt-BR': 'Memória realmente usada' },
  'p.infra.band.usedCalc': {
    en: 'Average memory in use summed across hosts, divided by the memory those hosts report having.',
    'pt-BR':
      'Média de memória em uso somada entre os hosts, dividida pela memória que esses hosts informam ter.',
  },
  'p.infra.band.usedDetail': { en: '{used} of the total', 'pt-BR': '{used} do total' },
  'p.infra.band.saturated': { en: 'Hosts needing attention', 'pt-BR': 'Hosts que pedem atenção' },
  'p.infra.band.saturatedCalc': {
    en: 'Hosts whose peak CPU or peak memory reached {pressured}% or more; {saturated}% or more counts as at the ceiling.',
    'pt-BR':
      'Hosts cujo pico de CPU ou de memória atingiu {pressured}% ou mais; {saturated}% ou mais conta como no limite.',
  },
  'p.infra.band.saturatedDetail': { en: '{atCeiling} at their ceiling', 'pt-BR': '{atCeiling} no limite' },
  'p.infra.band.oversized': { en: 'Hosts with room to reclaim', 'pt-BR': 'Hosts com espaço a recuperar' },
  'p.infra.band.oversizedCalc': {
    en: 'Hosts whose peak CPU and peak memory both stayed below {pct}% for the whole window.',
    'pt-BR':
      'Hosts cujo pico de CPU e de memória ficaram ambos abaixo de {pct}% durante toda a janela.',
  },
  'p.infra.band.oversizedDetail': { en: '{memory} never touched', 'pt-BR': '{memory} nunca tocados' },
  'p.infra.band.footnote': {
    en: 'Capacity comes from the entity model and usage from metrics, so this whole section scans no Grail data. Reclaimable memory is counted only on hosts that never got busy — headroom on a busy host is the margin that keeps it standing, not spare capacity.',
    'pt-BR':
      'A capacidade vem do modelo de entidades e o uso vem de métricas, então esta seção inteira não varre dados do Grail. A memória recuperável é contada apenas em hosts que nunca ficaram ocupados — folga em host ocupado é a margem que o mantém de pé, não capacidade sobrando.',
  },
  'st.infra.capacity.empty': {
    en: 'No host reported both capacity attributes and usage metrics in this window.',
    'pt-BR': 'Nenhum host reportou atributos de capacidade e métricas de uso nesta janela.',
  },
  'st.infra.capacity.perm': {
    en: 'Without metric and entity read access, capacity cannot be compared against usage and no right-sizing statement is possible.',
    'pt-BR':
      'Sem acesso de leitura a métricas e entidades, a capacidade não pode ser comparada ao uso e nenhuma afirmação sobre dimensionamento é possível.',
  },

  // ----------------------------------------------- technologies headline band
  'p.tech.band.families': { en: 'Technologies detected', 'pt-BR': 'Tecnologias detectadas' },
  'p.tech.band.familiesDetail': {
    en: 'identified by the agent, nobody supplied a list',
    'pt-BR': 'identificadas pelo agente, ninguém forneceu uma lista',
  },
  'p.tech.band.instances': { en: 'Process instances', 'pt-BR': 'Instâncias de processo' },
  'p.tech.band.instancesDetail': {
    en: 'running across the estate',
    'pt-BR': 'em execução no parque',
  },
  'p.tech.band.top': { en: 'Most deployed', 'pt-BR': 'Mais implantada' },
  'p.tech.band.topDetail': { en: '{count} instances', 'pt-BR': '{count} instâncias' },
  'p.tech.band.versions': { en: 'With a version', 'pt-BR': 'Com versão' },
  'p.tech.band.versionsCalc': {
    en: 'Rows where the agent exposed a runtime version, counted against all detected rows.',
    'pt-BR':
      'Linhas em que o agente expôs uma versão de runtime, contadas sobre todas as linhas detectadas.',
  },
  'p.tech.band.versionsDetail': { en: 'of {total} rows', 'pt-BR': 'de {total} linhas' },
  'p.tech.band.footnote': {
    en: 'Read from the entity model, so this page costs nothing to refresh. A row without a version means the technology was identified but did not expose one — a detection-depth observation, not a missing technology.',
    'pt-BR':
      'Lido do modelo de entidades, então atualizar esta página não tem custo. Uma linha sem versão significa que a tecnologia foi identificada mas não expôs a versão — uma observação sobre profundidade de detecção, não uma tecnologia faltando.',
  },
  'p.tech.chartTitle': { en: 'Where the estate concentrates', 'pt-BR': 'Onde o parque se concentra' },
  'p.tech.chartCaption': {
    en: 'Process instances per technology, most deployed first. This is the shape of what an operations team actually has to support.',
    'pt-BR':
      'Instâncias de processo por tecnologia, das mais implantadas para as menos. Este é o retrato do que a equipe de operações realmente precisa sustentar.',
  },
  'p.tech.chartAria': {
    en: 'Process instances per detected technology',
    'pt-BR': 'Instâncias de processo por tecnologia detectada',
  },

  // -------------------------------------------------- security headline band
  'p.sec.band.total': { en: 'Findings in window', 'pt-BR': 'Achados na janela' },
  'p.sec.band.totalDetail': { en: 'all severities combined', 'pt-BR': 'todas as severidades somadas' },
  'p.sec.sev.critical': { en: 'Critical', 'pt-BR': 'Crítica' },
  'p.sec.sev.high': { en: 'High', 'pt-BR': 'Alta' },
  'p.sec.sev.medium': { en: 'Medium', 'pt-BR': 'Média' },
  'p.sec.sev.low': { en: 'Low', 'pt-BR': 'Baixa' },
  'p.sec.band.severityDetail': {
    en: 'as classified by the platform',
    'pt-BR': 'conforme classificado pela plataforma',
  },
  'p.sec.band.footnote': {
    en: 'Severity is the platform\'s own classification, not this app\'s. A severity showing zero was measured as zero; a severity showing a dash was not readable.',
    'pt-BR':
      'A severidade é a classificação da própria plataforma, não deste app. Uma severidade em zero foi medida como zero; uma severidade com traço não pôde ser lida.',
  },
  'p.sec.band.blockedFootnote': {
    en: 'Every tile above reads as not measured because the query was refused for a missing scope — not because the environment is clean. These four tiles start reporting real counts the moment storage:security.events:read is granted.',
    'pt-BR':
      'Todos os indicadores acima aparecem como não medidos porque a consulta foi recusada por falta de escopo — não porque o ambiente esteja limpo. Estes quatro indicadores passam a reportar contagens reais assim que storage:security.events:read for concedido.',
  },

  // -------------------------------------- pillar metrics added in the rework
  'pillar.m.servicesMapped': { en: 'services mapped', 'pt-BR': 'serviços mapeados' },
  'pillar.m.dataStores': { en: 'data store types', 'pt-BR': 'tipos de repositório de dados' },
  'pillar.m.requestsCaptured': { en: 'requests captured', 'pt-BR': 'requisições capturadas' },
  'pillar.m.failuresCaptured': { en: 'failures captured', 'pt-BR': 'falhas capturadas' },

  // ------------------------------------------ downtime rate and its builder
  'settings.downtime.heading': {
    en: 'Cost of an hour of downtime',
    'pt-BR': 'Custo de uma hora de indisponibilidade',
  },
  'settings.downtime.body': {
    en: 'Separate from the response rate above, and applied only to problems Dynatrace Intelligence classified as availability. An outage costs the business its revenue and costs the team its hours; those are different money and are added, not swapped.',
    'pt-BR':
      'Separado do valor de resposta acima, e aplicado apenas a problemas que a Dynatrace Intelligence classificou como disponibilidade. Uma indisponibilidade custa ao negócio a receita e custa à equipe as horas; são dinheiros diferentes e se somam, não se substituem.',
  },
  'settings.downtime.rate': { en: 'Downtime cost per hour', 'pt-BR': 'Custo por hora de indisponibilidade' },
  'settings.downtime.ratePlaceholder': { en: 'e.g. 25000', 'pt-BR': 'ex.: 25000' },
  'settings.downtime.basis': { en: 'How this rate was arrived at', 'pt-BR': 'Como este valor foi obtido' },
  'settings.downtime.basisPlaceholder': {
    en: 'e.g. lost revenue on the checkout path plus 40 people unable to work',
    'pt-BR': 'ex.: receita perdida no fluxo de checkout mais 40 pessoas impedidas de trabalhar',
  },

  'settings.builder.heading': {
    en: 'Build the downtime rate from figures you already have',
    'pt-BR': 'Monte o custo de indisponibilidade a partir de números que você já tem',
  },
  'settings.builder.body': {
    en: 'Optional. Fill in either half or both — every field is your figure, nothing is read from the environment and nothing is defaulted. The arithmetic is shown in full so your finance team can check it rather than trust it.',
    'pt-BR':
      'Opcional. Preencha uma das metades ou as duas — cada campo é um número seu, nada é lido do ambiente e nada é preenchido por padrão. A conta aparece completa para que a sua área financeira possa conferir em vez de confiar.',
  },
  'settings.builder.revenueHeading': {
    en: 'Revenue that stops during an outage',
    'pt-BR': 'Receita que para durante uma indisponibilidade',
  },
  'settings.builder.annualRevenue': { en: 'Annual revenue in scope', 'pt-BR': 'Receita anual no escopo' },
  'settings.builder.operatingHours': {
    en: 'Operating hours per year',
    'pt-BR': 'Horas de operação por ano',
  },
  'settings.builder.revenueShare': { en: '% actually interrupted', 'pt-BR': '% realmente interrompida' },
  'settings.builder.productivityHeading': {
    en: 'Work that cannot happen during an outage',
    'pt-BR': 'Trabalho que não acontece durante uma indisponibilidade',
  },
  'settings.builder.employees': { en: 'People affected', 'pt-BR': 'Pessoas afetadas' },
  'settings.builder.wage': { en: 'Loaded cost per hour', 'pt-BR': 'Custo por hora com encargos' },
  'settings.builder.lossPct': { en: '% of the hour lost', 'pt-BR': '% da hora perdida' },
  'settings.builder.empty': {
    en: 'Fill in revenue and operating hours, or headcount and loaded cost, to see a suggested rate.',
    'pt-BR':
      'Informe receita e horas de operação, ou número de pessoas e custo com encargos, para ver um valor sugerido.',
  },
  'settings.builder.suggested': { en: 'Suggested downtime rate', 'pt-BR': 'Custo de indisponibilidade sugerido' },
  'settings.builder.use': { en: 'Use this rate', 'pt-BR': 'Usar este valor' },
  'settings.builder.caveat': {
    en: 'A suggestion, not a measurement. It is built entirely from the numbers typed above and is labelled an estimate wherever it appears. Common refinements your finance team may want: exclude revenue that is merely deferred rather than lost, and use a productivity loss below 100% where people can still do other work.',
    'pt-BR':
      'Uma sugestão, não uma medição. Ela é construída inteiramente a partir dos números digitados acima e aparece rotulada como estimativa em todos os lugares. Refinamentos comuns que a área financeira pode querer: excluir a receita apenas adiada em vez de perdida, e usar uma perda de produtividade abaixo de 100% quando as pessoas ainda conseguem fazer outras coisas.',
  },

  // ------------------------------------------- downtime tiles on the impact view
  'f.impact.downtimeHours': { en: 'Availability downtime', 'pt-BR': 'Indisponibilidade medida' },
  'f.impact.downtimeHoursDetail': {
    en: 'problems Dynatrace Intelligence classified as availability',
    'pt-BR': 'problemas que a Dynatrace Intelligence classificou como disponibilidade',
  },
  'f.impact.downtimeCost': { en: 'Estimated cost of downtime', 'pt-BR': 'Custo estimado da indisponibilidade' },
  'f.impact.downtimeCostDetail': {
    en: 'availability hours only, at your downtime rate',
    'pt-BR': 'apenas horas de disponibilidade, ao seu custo de indisponibilidade',
  },
  'f.impact.setDowntimeRate': {
    en: 'Set a downtime rate in Settings',
    'pt-BR': 'Defina um custo de indisponibilidade em Configurações',
  },
  'f.impact.combined': { en: 'Combined exposure', 'pt-BR': 'Exposição combinada' },
  'f.impact.combinedDetail': {
    en: 'response effort plus business downtime',
    'pt-BR': 'esforço de resposta mais indisponibilidade de negócio',
  },

  // -------------------------------------------- report: executive exposure
  'report.exec.avgOpen': { en: 'Average time open', 'pt-BR': 'Tempo médio em aberto' },
  'report.exec.avgOpenDetail': {
    en: 'mean age of the problems still open',
    'pt-BR': 'idade média dos problemas ainda abertos',
  },
  'report.exec.downtime': { en: 'Availability downtime', 'pt-BR': 'Indisponibilidade medida' },
  'report.exec.downtimeDetail': {
    en: 'across {count} availability problems',
    'pt-BR': 'em {count} problemas de disponibilidade',
  },
  'report.exec.slowestCategory': { en: 'Slowest category to resolve', 'pt-BR': 'Categoria mais lenta de resolver' },
  'report.exec.absorbed': { en: 'Problem time absorbed', 'pt-BR': 'Tempo de problema absorvido' },
  'report.exec.absorbedDetail': {
    en: 'across problems that closed in the window',
    'pt-BR': 'entre os problemas que fecharam na janela',
  },
  'report.exec.exposureTitle': { en: 'Operational exposure', 'pt-BR': 'Exposição operacional' },
  'report.exec.exposureBody': {
    en: 'Two costs that behave differently, kept apart on purpose. Response effort applies to every problem-hour; downtime applies only to the hours a service was actually unavailable. Every hour below was measured by Dynatrace; the rates are your assumptions, and each figure carries the arithmetic that produced it.',
    'pt-BR':
      'Dois custos que se comportam de formas diferentes, mantidos separados de propósito. O esforço de resposta se aplica a cada hora-problema; a indisponibilidade se aplica apenas às horas em que um serviço esteve de fato fora. Cada hora abaixo foi medida pela Dynatrace; os valores por hora são premissas suas, e cada número carrega a conta que o produziu.',
  },
  'report.exec.responseCost': { en: 'Response effort', 'pt-BR': 'Esforço de resposta' },
  'report.exec.responseCostDetail': { en: '{hours} of problem time', 'pt-BR': '{hours} de tempo de problema' },
  'report.exec.downtimeCost': { en: 'Business downtime', 'pt-BR': 'Indisponibilidade de negócio' },
  'report.exec.downtimeCostDetail': {
    en: '{hours} of availability loss',
    'pt-BR': '{hours} de perda de disponibilidade',
  },
  'report.exec.combined': { en: 'Combined exposure', 'pt-BR': 'Exposição combinada' },
  'report.exec.combinedDetail': {
    en: 'the two added, not the larger of them',
    'pt-BR': 'os dois somados, não o maior deles',
  },

  // ------------------------------------------------------- page headline bands
  'p.cov.band.entities': { en: 'Entities in scope', 'pt-BR': 'Entidades no escopo' },
  'p.cov.band.entitiesDetail': {
    en: 'across {categories} categories with data',
    'pt-BR': 'em {categories} categorias com dados',
  },
  'p.cov.band.sources': { en: 'Data sources', 'pt-BR': 'Fontes de dados' },
  'p.cov.band.sourcesDetail': { en: 'buckets enumerated', 'pt-BR': 'buckets enumerados' },
  'p.cov.band.records': { en: 'Records held', 'pt-BR': 'Registros armazenados' },
  'p.cov.band.recordsDetail': { en: 'across every readable bucket', 'pt-BR': 'em todos os buckets legíveis' },
  'p.cov.band.unreadable': { en: 'Sources not readable', 'pt-BR': 'Fontes não legíveis' },
  'p.cov.band.unreadableDetail': {
    en: 'by the signed-in identity',
    'pt-BR': 'pela identidade autenticada',
  },
  'p.cov.band.footnote': {
    en: 'A source this identity cannot read is a limit on the review, not a finding about the environment. Every conclusion in this app is bounded by the readable half of this band.',
    'pt-BR':
      'Uma fonte que esta identidade não consegue ler é um limite da análise, não uma constatação sobre o ambiente. Toda conclusão deste app está limitada à metade legível desta faixa.',
  },

  'p.prob.band.total': { en: 'Problems detected', 'pt-BR': 'Problemas detectados' },
  'p.prob.band.totalDetail': {
    en: 'without an alert rule being written',
    'pt-BR': 'sem que uma regra de alerta fosse escrita',
  },
  'p.prob.band.open': { en: 'Still open', 'pt-BR': 'Ainda abertos' },
  'p.prob.band.openDetail': { en: '{closed} already closed', 'pt-BR': '{closed} já fechados' },
  'p.prob.band.categories': { en: 'Categories', 'pt-BR': 'Categorias' },
  'p.prob.band.categoriesDetail': {
    en: 'distinguished automatically by Dynatrace Intelligence',
    'pt-BR': 'distinguidas automaticamente pela Dynatrace Intelligence',
  },
  'p.prob.band.patterns': { en: 'Recurring patterns', 'pt-BR': 'Padrões recorrentes' },
  'p.prob.band.patternsDetail': { en: 'worst repeats {worst}×', 'pt-BR': 'o pior repete {worst}×' },
  'p.prob.band.footnote': {
    en: 'Pinned to the last 7 days, independently of the window selector, because problem history is the most expensive source this app reads. Recurrence is the measurable case for automation.',
    'pt-BR':
      'Fixado nos últimos 7 dias, independentemente do seletor de período, porque o histórico de problemas é a fonte mais cara que este app lê. A recorrência é o argumento mensurável para automação.',
  },

  'p.k8s.band.clusters': { en: 'Clusters', 'pt-BR': 'Clusters' },
  'p.k8s.band.clustersDetail': { en: 'discovered from the cluster itself', 'pt-BR': 'descobertos a partir do próprio cluster' },
  'p.k8s.band.restarting': { en: 'Workloads restarting', 'pt-BR': 'Workloads reiniciando' },
  'p.k8s.band.restartingDetail': { en: '{total} restarts in total', 'pt-BR': '{total} restarts no total' },
  'p.k8s.band.oom': { en: 'Out-of-memory kills', 'pt-BR': 'Mortes por falta de memória' },
  'p.k8s.band.oomDetail': { en: 'the platform ended the container', 'pt-BR': 'a plataforma encerrou o contêiner' },
  'p.k8s.band.throttled': { en: 'Workloads throttled', 'pt-BR': 'Workloads com throttling' },
  'p.k8s.band.throttledDetail': { en: 'CPU capped below demand', 'pt-BR': 'CPU limitada abaixo da demanda' },
  'p.k8s.band.footnote': {
    en: 'A restart count establishes instability; it does not identify the cause. Out-of-memory kills and throttling are the measured evidence behind a right-sizing conversation, not the answer to it.',
    'pt-BR':
      'A contagem de restarts estabelece a instabilidade; ela não identifica a causa. Mortes por falta de memória e throttling são a evidência medida por trás de uma conversa de dimensionamento, não a resposta dela.',
  },

  'p.auto.band.workflows': { en: 'Workflows running', 'pt-BR': 'Workflows em execução' },
  'p.auto.band.workflowsDetail': { en: 'reaching a final state', 'pt-BR': 'que chegam a um estado final' },
  'p.auto.band.executions': { en: 'Executions recorded', 'pt-BR': 'Execuções registradas' },
  'p.auto.band.executionsDetail': { en: 'real runs, not a capability list', 'pt-BR': 'execuções reais, não uma lista de recursos' },
  'p.auto.band.rate': { en: 'Success rate', 'pt-BR': 'Taxa de sucesso' },
  'p.auto.band.rateCalc': {
    en: 'Executions that did not end in ERROR, divided by all executions that reached a final state.',
    'pt-BR':
      'Execuções que não terminaram em ERROR, divididas por todas as execuções que chegaram a um estado final.',
  },
  'p.auto.band.rateDetail': { en: 'of executions in the window', 'pt-BR': 'das execuções na janela' },
  'p.auto.band.failed': { en: 'Failed executions', 'pt-BR': 'Execuções com falha' },
  'p.auto.band.failedDetail': { en: 'worth fixing before the close', 'pt-BR': 'vale corrigir antes do fechamento' },
  'p.auto.band.footnote': {
    en: 'This app triggers, creates and modifies nothing. Everything here is automation the environment already runs, including the parts that are currently failing.',
    'pt-BR':
      'Este app não dispara, cria nem altera nada. Tudo aqui é automação que o ambiente já executa, incluindo as partes que estão falhando no momento.',
  },

  'p.biz.band.types': { en: 'Event types', 'pt-BR': 'Tipos de evento' },
  'p.biz.band.typesDetail': { en: 'business processes already visible', 'pt-BR': 'processos de negócio já visíveis' },
  'p.biz.band.events': { en: 'Events received', 'pt-BR': 'Eventos recebidos' },
  'p.biz.band.eventsDetail': { en: 'in the same store as the problems', 'pt-BR': 'no mesmo repositório dos problemas' },
  'p.biz.band.busiest': { en: 'Busiest process', 'pt-BR': 'Processo mais movimentado' },
  'p.biz.band.busiestDetail': { en: '{count} events', 'pt-BR': '{count} eventos' },
  'p.biz.band.footnote': {
    en: 'Volume is measured; business value is not, and cannot be derived from a count. The point of this page is that the data already sits beside the problems — assigning it a value is a decision for the business.',
    'pt-BR':
      'O volume é medido; o valor de negócio não é, e não pode ser derivado de uma contagem. O ponto desta página é que o dado já está ao lado dos problemas — atribuir-lhe um valor é uma decisão do negócio.',
  },

  'p.topo.band.services': { en: 'Services mapped', 'pt-BR': 'Serviços mapeados' },
  'p.topo.band.servicesDetail': { en: 'nobody drew this by hand', 'pt-BR': 'ninguém desenhou isso à mão' },
  'p.topo.band.databases': { en: 'Bound to a data store', 'pt-BR': 'Ligados a um repositório' },
  'p.topo.band.databasesDetail': { en: 'vendor recorded on the entity', 'pt-BR': 'fabricante registrado na entidade' },
  'p.topo.band.external': { en: 'External services', 'pt-BR': 'Serviços externos' },
  'p.topo.band.externalDetail': { en: 'outside the monitored estate', 'pt-BR': 'fora do parque monitorado' },
  'p.topo.band.public': { en: 'Public endpoints', 'pt-BR': 'Endpoints públicos' },
  'p.topo.band.publicDetail': { en: 'a public domain was reported', 'pt-BR': 'um domínio público foi reportado' },
  'p.topo.band.footnote': {
    en: 'An empty attribute means it was not reported, which is different from the dependency not existing. Relationships are shown as recorded, never as inferred.',
    'pt-BR':
      'Um atributo vazio significa que ele não foi informado, o que é diferente de a dependência não existir. As relações são mostradas como registradas, nunca como inferidas.',
  },

  'p.cons.band.capabilities': { en: 'Capabilities used', 'pt-BR': 'Capacidades usadas' },
  'p.cons.band.capabilitiesDetail': { en: 'recorded real usage', 'pt-BR': 'registraram uso real' },
  'p.cons.band.queries': { en: 'Queries executed', 'pt-BR': 'Consultas executadas' },
  'p.cons.band.queriesDetail': { en: 'by every client, not just this app', 'pt-BR': 'por todos os clientes, não só este app' },
  'p.cons.band.scanned': { en: 'Scanned on demand', 'pt-BR': 'Varrido sob demanda' },
  'p.cons.band.scannedDetail': { en: 'every bucket has zero included days', 'pt-BR': 'todos os buckets têm zero dias inclusos' },
  'p.cons.band.efficiency': { en: 'Scanned per record', 'pt-BR': 'Varrido por registro' },
  'p.cons.band.efficiencyCalc': {
    en: 'Bytes scanned on demand divided by records delivered, across every table.',
    'pt-BR': 'Bytes varridos sob demanda divididos pelos registros entregues, em todas as tabelas.',
  },
  'p.cons.band.efficiencyDetail': { en: '{records} records delivered', 'pt-BR': '{records} registros entregues' },
  'p.cons.band.footnote': {
    en: 'Volume and effort only. There is no pricing in a Dynatrace environment, so this app holds no rate card, no currency and no cost calculation for consumption — every figure here is usage as the platform reported it.',
    'pt-BR':
      'Apenas volume e esforço. Não há preços em um ambiente Dynatrace, então este app não tem tabela de preços, moeda nem cálculo de custo para consumo — cada número aqui é o uso conforme a plataforma reportou.',
  },

  'p.logs.band.stored': { en: 'Log records stored', 'pt-BR': 'Registros de log armazenados' },
  'p.logs.band.storedDetail': { en: 'across {buckets} log buckets', 'pt-BR': 'em {buckets} buckets de log' },
  'p.logs.band.sampled': { en: 'Records read (30 min)', 'pt-BR': 'Registros lidos (30 min)' },
  'p.logs.band.sampledDetail': {
    en: 'every record of a short window in every readable bucket, by design — none sampled',
    'pt-BR': 'todos os registros de uma janela curta em todos os buckets legíveis, por escolha — sem amostragem',
  },
  'p.logs.band.context': { en: 'Carry service context', 'pt-BR': 'Com contexto de serviço' },
  'p.logs.band.contextCalc': {
    en: 'Records read with a service entity attached, divided by all records read in the window.',
    'pt-BR':
      'Registros lidos com entidade de serviço anexada, divididos por todos os registros lidos na janela.',
  },
  'p.logs.band.contextDetail': {
    en: 'the rest cannot reach a problem or an owner',
    'pt-BR': 'o resto não chega a um problema nem a um responsável',
  },
  'p.logs.band.unclassified': { en: 'Without a severity', 'pt-BR': 'Sem severidade' },
  'p.logs.band.unclassifiedCalc': {
    en: 'Records read with no severity status, divided by all records read in the window.',
    'pt-BR': 'Registros lidos sem status de severidade, divididos por todos os registros lidos na janela.',
  },
  'p.logs.band.unclassifiedDetail': {
    en: 'errors cannot be separated from noise',
    'pt-BR': 'não é possível separar erros de ruído',
  },
  'p.logs.band.footnote': {
    en: 'Volume and context cost exactly the same to ingest and retain. That is the finding: the storage bill is identical whether a line can answer a question or not.',
    'pt-BR':
      'Volume e contexto custam exatamente o mesmo para ingerir e reter. Esta é a constatação: a conta de armazenamento é idêntica, quer a linha consiga responder a uma pergunta ou não.',
  },

  // ------------------------------- provenance descriptions and unavailability
  'prov.unavailable.not-configured': {
    en: 'Requires additional configuration or source',
    'pt-BR': 'Requer configuração ou fonte adicional',
  },
  'prov.unavailable.no-telemetry': {
    en: 'No data available in the current PoC scope',
    'pt-BR': 'Dado não disponível no escopo atual da PoC',
  },
  'prov.unavailable.no-permission': {
    en: 'Insufficient permission for the signed-in identity',
    'pt-BR': 'Permissão insuficiente para a identidade autenticada',
  },
  'prov.desc.observed': {
    en: 'Measured by Dynatrace and read verbatim from Grail.',
    'pt-BR': 'Medido pela Dynatrace e lido literalmente do Grail.',
  },
  'prov.desc.derived': {
    en: 'Calculated deterministically from observed values.',
    'pt-BR': 'Calculado de forma determinística a partir de valores observados.',
  },
  'prov.desc.partial': {
    en: 'A lower bound: the read stopped early (scan limit) or a list reached its limit, so the real figure is at least this.',
    'pt-BR': 'Um piso: a leitura parou antes (limite de varredura) ou uma lista atingiu o limite, então o valor real é no mínimo este.',
  },
  'prov.desc.platform-estimate': {
    en: 'A count Dynatrace itself reports as an estimate. There is no exact source for it.',
    'pt-BR': 'Uma contagem que a própria Dynatrace informa como estimativa. Não existe fonte exata para ela.',
  },
  'prov.desc.projection': {
    en: 'Calculated from assumptions you can see and change (rates, baselines). A projection, not a measurement.',
    'pt-BR': 'Calculada a partir de premissas que você vê e pode alterar (taxas, referências). Uma projeção, não uma medição.',
  },
  'prov.desc.recommendation': {
    en: 'Suggested action. Not a measured finding.',
    'pt-BR': 'Ação sugerida. Não é uma constatação medida.',
  },
  'prov.desc.hypothesis': {
    en: 'A plausible reading that is not yet confirmed by evidence.',
    'pt-BR': 'Uma leitura plausível ainda não confirmada por evidência.',
  },
  'prov.desc.not-configured': {
    en: 'The capability exists but is not enabled in this environment.',
    'pt-BR': 'O recurso existe, mas não está habilitado neste ambiente.',
  },
  'prov.desc.no-telemetry': {
    en: 'No data was produced in the analysed scope.',
    'pt-BR': 'Nenhum dado foi produzido no escopo analisado.',
  },
  'prov.desc.no-permission': {
    en: 'The signed-in identity cannot read the underlying source.',
    'pt-BR': 'A identidade autenticada não consegue ler a fonte subjacente.',
  },
  'conf.high': { en: 'High confidence', 'pt-BR': 'Confiança alta' },
  'conf.medium': { en: 'Medium confidence', 'pt-BR': 'Confiança média' },
  'conf.low': { en: 'Low confidence', 'pt-BR': 'Confiança baixa' },
  'conf.desc.high': {
    en: 'Direct measurement over a complete window.',
    'pt-BR': 'Medição direta sobre uma janela completa.',
  },
  'conf.desc.medium': {
    en: 'Complete source, but partial coverage or a short window.',
    'pt-BR': 'Fonte completa, mas cobertura parcial ou janela curta.',
  },
  'conf.desc.low': {
    en: 'Sparse, sampled or indirectly inferred data.',
    'pt-BR': 'Dados esparsos, amostrados ou inferidos indiretamente.',
  },

  // -------------------------------------------------- cost model, translated
  'cost.hoursNote': {
    en: 'Sum of time each problem spent open, measured by the platform. For problems still open the clock is running, so this figure grows until they close.',
    'pt-BR':
      'Soma do tempo que cada problema ficou aberto, medida pela plataforma. Para problemas ainda abertos o relógio segue correndo, então este número cresce até que eles fechem.',
  },
  'cost.noRate.requirement': {
    en: 'Set an hourly rate in Settings to see a monetary estimate. Problem-hours above are measured regardless.',
    'pt-BR':
      'Defina um valor por hora em Configurações para ver uma estimativa monetária. As horas-problema acima são medidas de qualquer forma.',
  },
  'cost.noRate.note': {
    en: 'No rate configured. This app never invents a cost figure.',
    'pt-BR': 'Nenhum valor configurado. Este app nunca inventa um número de custo.',
  },
  'cost.response.calc': {
    en: '{hours} of measured problem time × {rate} per hour = {total}.',
    'pt-BR': '{hours} de tempo de problema medido × {rate} por hora = {total}.',
  },
  'cost.basisSuffix': {
    en: ' Rate basis, as stated by the operator: {basis}.',
    'pt-BR': ' Base do valor, conforme declarado pelo operador: {basis}.',
  },
  'cost.response.caveat': {
    en: ' Only problems whose root cause Dynatrace Intelligence named are counted — a real problem with a cause, not a false alarm. The hours are measured by Dynatrace. The rate was supplied by the operator of this app, not read from the environment, so treat the result as an estimate for discussion.',
    'pt-BR':
      ' Só entram problemas com a causa raiz apontada pela Dynatrace Intelligence — um problema real, com causa, e não um alarme falso. As horas são medidas pela Dynatrace. O valor por hora foi fornecido por quem opera este app, não lido do ambiente, então trate o resultado como estimativa para discussão.',
  },
  'cost.noDowntime.requirement': {
    en: 'Set a downtime rate in Settings, or build one there from revenue and headcount figures. The availability hours above are measured regardless.',
    'pt-BR':
      'Defina um custo de indisponibilidade em Configurações, ou monte um lá a partir de receita e número de pessoas. As horas de disponibilidade acima são medidas de qualquer forma.',
  },
  'cost.noDowntime.note': {
    en: 'No downtime rate configured. This app never invents one.',
    'pt-BR': 'Nenhum custo de indisponibilidade configurado. Este app nunca inventa um.',
  },
  'cost.downtime.calc': {
    en: '{hours} of measured availability problem time × {rate} per hour = {total}.',
    'pt-BR': '{hours} de tempo de problema de disponibilidade medido × {rate} por hora = {total}.',
  },
  'cost.downtime.caveat': {
    en: ' Only problems Dynatrace Intelligence classified as AVAILABILITY and whose root cause it named are counted here. The hours are measured by Dynatrace; the rate is the operator\'s assumption.',
    'pt-BR':
      ' Somente problemas que a Dynatrace Intelligence classificou como AVAILABILITY e cuja causa raiz ela apontou são contados aqui. As horas são medidas pela Dynatrace; o valor por hora é uma premissa do operador.',
  },
  'cost.noAnyRate.requirement': {
    en: 'Set at least one rate in Settings to see a combined figure.',
    'pt-BR': 'Defina pelo menos um valor em Configurações para ver um número combinado.',
  },
  'cost.noAnyRate.note': { en: 'No rate configured.', 'pt-BR': 'Nenhum valor configurado.' },
  'cost.total.response': { en: 'response {value}', 'pt-BR': 'resposta {value}' },
  'cost.total.downtime': { en: 'downtime {value}', 'pt-BR': 'indisponibilidade {value}' },
  'cost.total.calc': { en: '{parts} = {total}.', 'pt-BR': '{parts} = {total}.' },
  'cost.total.partial': {
    en: ' Only one of the two rates is configured, so this is a partial figure.',
    'pt-BR': ' Apenas um dos dois valores está configurado, então este número é parcial.',
  },
  'cost.absorbed': {
    en: 'Cost already absorbed by problems that occurred in this window. This is not a projected saving: no baseline exists to support one.',
    'pt-BR':
      'Custo já absorvido pelos problemas que ocorreram nesta janela. Não é uma economia projetada: não existe linha de base que sustente isso.',
  },

  // ------------------------------------------------ scope requirement notices
  'req.scope': { en: 'Requires {scope}.', 'pt-BR': 'Requer {scope}.' },
  'req.sessions': {
    en: 'Requires storage:user.sessions:read for the signed-in identity.',
    'pt-BR': 'Requer storage:user.sessions:read para a identidade autenticada.',
  },
  'req.entityOutage': {
    en: 'The entity model returned no records for any category. Metrics and events are still arriving, so this is a source outage rather than an empty environment.',
    'pt-BR':
      'O modelo de entidades não retornou registros para nenhuma categoria. Métricas e eventos continuam chegando, então trata-se de indisponibilidade da fonte e não de um ambiente vazio.',
  },
  'req.entityOutageShort': {
    en: 'The entity model returned no records for any category. This is a source outage, not an empty estate.',
    'pt-BR':
      'O modelo de entidades não retornou registros para nenhuma categoria. É indisponibilidade da fonte, não um parque vazio.',
  },
  'calc.distinctTech': {
    en: 'Distinct technology types counted from the process inventory, collapsing versions and editions.',
    'pt-BR':
      'Tipos distintos de tecnologia contados a partir do inventário de processos, agrupando versões e edições.',
  },
  'calc.overallMttr': {
    en: 'Total resolved problem time divided by resolved problems, weighted across all categories. Medians are far lower than means here, which means most problems close quickly and a small number of long-running ones pull the average up.',
    'pt-BR':
      'Tempo total de problemas resolvidos dividido pelos problemas resolvidos, ponderado entre todas as categorias. As medianas aqui são muito menores que as médias, o que significa que a maioria dos problemas fecha rápido e um pequeno conjunto de longa duração puxa a média para cima.',
  },
  'calc.logServiceShare': {
    en: 'Records carrying a service entity divided by all records: {part} of {total}.',
    'pt-BR': 'Registros com entidade de serviço divididos por todos os registros: {part} de {total}.',
  },
  'calc.logSeverityShare': {
    en: 'Records whose severity is NONE divided by all records: {part} of {total}.',
    'pt-BR': 'Registros cuja severidade é NONE divididos por todos os registros: {part} de {total}.',
  },

  // ------------------------------------------------ pinned query timeframes
  'timeframe.pinned.30m': { en: 'last 30 minutes', 'pt-BR': 'últimos 30 minutos' },
  'timeframe.pinned.6h': { en: 'last 6 hours', 'pt-BR': 'últimas 6 horas' },
  'timeframe.pinned.24h': { en: 'last 24 hours', 'pt-BR': 'últimas 24 horas' },
  'timeframe.pinned.7d': { en: 'last 7 days', 'pt-BR': 'últimos 7 dias' },
  'timeframe.pinned.15d': { en: 'last 15 days', 'pt-BR': 'últimos 15 dias' },
  'timeframe.follows': { en: 'Follows selector', 'pt-BR': 'Segue o seletor' },

  // ------------------------------------------------- settings: single apply
  'settings.applyAll': { en: 'Apply all changes', 'pt-BR': 'Aplicar todas as alterações' },
  'settings.willSave': {
    en: 'Will save — response rate: {rate} · downtime rate: {downtime}',
    'pt-BR': 'Será salvo — valor de resposta: {rate} · custo de indisponibilidade: {downtime}',
  },
  'settings.willSave.none': { en: 'not set', 'pt-BR': 'não definido' },
  'settings.independent': {
    en: 'The two rates are independent. Fill in whichever your business can support and leave the other blank — both outcomes are saved, and every figure that depends on the missing one says so rather than showing a zero.',
    'pt-BR':
      'Os dois valores são independentes. Preencha o que o seu negócio conseguir sustentar e deixe o outro em branco — os dois casos são salvos, e cada número que depende do que ficou de fora informa isso em vez de mostrar zero.',
  },

  // ------------------------------------------------ settings: brand accent
  'settings.brand.heading': { en: "Customer's brand colour", 'pt-BR': 'Cor da marca do cliente' },
  'settings.brand.body': {
    en: 'Accent used for the customer name beside their logo. Decoration only — it is deliberately kept away from every colour that carries meaning, so a brand choice can never make a finding look better or worse than it is.',
    'pt-BR':
      'Destaque usado no nome do cliente ao lado do logotipo. Apenas decoração — é deliberadamente mantido longe de qualquer cor que carregue significado, para que a escolha de marca nunca faça uma constatação parecer melhor ou pior do que é.',
  },
  'settings.brand.preview': { en: 'Preview', 'pt-BR': 'Prévia' },
  'settings.brand.placeholder': { en: 'Customer name', 'pt-BR': 'Nome do cliente' },
  'settings.brand.default': { en: 'Default', 'pt-BR': 'Padrão' },
  'settings.brand.blue': { en: 'Blue', 'pt-BR': 'Azul' },
  'settings.brand.orange': { en: 'Orange', 'pt-BR': 'Laranja' },
  'settings.brand.red': { en: 'Red', 'pt-BR': 'Vermelho' },
  'settings.brand.magenta': { en: 'Magenta', 'pt-BR': 'Magenta' },
  'settings.brand.pink': { en: 'Pink', 'pt-BR': 'Rosa' },
  'settings.brand.purple': { en: 'Purple', 'pt-BR': 'Roxo' },
  'settings.brand.petrol': { en: 'Petrol', 'pt-BR': 'Petróleo' },
  'settings.brand.turquoise': { en: 'Turquoise', 'pt-BR': 'Turquesa' },
  'settings.brand.moss': { en: 'Moss', 'pt-BR': 'Verde-musgo' },
  'settings.brand.yellow': { en: 'Yellow', 'pt-BR': 'Amarelo' },
  'settings.brand.brown': { en: 'Brown', 'pt-BR': 'Marrom' },
  'settings.brand.grey': { en: 'Grey', 'pt-BR': 'Cinza' },

  // ------------------------------------------- executive cost cards, both halves
  'exec.label.responseExposure': { en: 'estimated response cost', 'pt-BR': 'custo de resposta estimado' },
  'exec.label.setRate': { en: 'set a rate in Settings', 'pt-BR': 'defina um valor em Configurações' },
  'exec.interp.costConfigured': {
    en: 'The hours are measured by Dynatrace. The rate is your assumption, so the money is an estimate for discussion — the arithmetic is on the badge.',
    'pt-BR':
      'As horas são medidas pela Dynatrace. O valor por hora é uma premissa sua, então o valor em dinheiro é uma estimativa para discussão — a conta está no selo.',
  },
  'exec.interp.costMissing': {
    en: 'Dynatrace measures the hours. What an hour is worth to this customer is not in any environment, so this app will not invent it.',
    'pt-BR':
      'A Dynatrace mede as horas. Quanto vale uma hora para este cliente não está em nenhum ambiente, então este app não vai inventar.',
  },
  'exec.downtimeCost': { en: 'Cost of downtime', 'pt-BR': 'Custo da indisponibilidade' },
  'exec.label.perHourDowntime': { en: 'per hour of outage, your assumption', 'pt-BR': 'por hora fora do ar, premissa sua' },
  'exec.label.downtimeExposure': { en: 'estimated downtime cost', 'pt-BR': 'custo de indisponibilidade estimado' },
  'exec.label.setDowntimeRate': {
    en: 'set a downtime rate in Settings',
    'pt-BR': 'defina um custo de indisponibilidade em Configurações',
  },
  'exec.label.availabilityHours': { en: 'availability hours measured', 'pt-BR': 'horas de disponibilidade medidas' },
  'exec.label.combined': { en: 'combined exposure', 'pt-BR': 'exposição combinada' },
  'exec.interp.downtime': {
    en: 'Only problems Dynatrace Intelligence classified as availability count at the downtime rate — a slowdown is not an outage. The combined figure adds response effort to business downtime, and says so when only one of the two rates is configured.',
    'pt-BR':
      'Somente problemas que a Dynatrace Intelligence classificou como disponibilidade entram no custo de indisponibilidade — uma lentidão não é uma queda. O número combinado soma o esforço de resposta à indisponibilidade de negócio, e informa quando apenas um dos dois valores está configurado.',
  },

  // ------------------------------------------------------- log ingest volume
  'p.logs.band.ingested': { en: 'Log volume ingested', 'pt-BR': 'Volume de log ingerido' },
  'p.logs.band.ingestedDetail': {
    en: 'bytes ingested over the window',
    'pt-BR': 'bytes ingeridos na janela',
  },
  'p.logs.band.queried': { en: 'Log volume queried', 'pt-BR': 'Volume de log consultado' },
  'p.logs.band.queriedDetail': {
    en: 'scanned by every client, not just this app',
    'pt-BR': 'varrido por todos os clientes, não só este app',
  },
} as const satisfies Record<string, Entry>;
