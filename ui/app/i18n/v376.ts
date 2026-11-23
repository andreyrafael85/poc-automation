import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.6 (the owner's validation of 3.7.5, "Segue validações da 3.7.5 antes de próximos
 * releases"): the e-mails in the right order, the weekly e-mail without the app's links, detectors for every service when none
 * is chosen, the Builder's links absolute on the tenant, the clean-up's "Remove", the OpenPipeline check, the Overview and the
 * Executive summary on one banner, and Licensing's app consumption in money with the app's query practices. Merged in
 * `strings.ts`.
 */

export const v376Strings = {
  // ------------------------------------------------------------------ the Register's clean-up
  'builder.clean.remove': { en: 'Remove', 'pt-BR': 'Remover' },
  'builder.clean.type.monitor': { en: 'HTTP monitor', 'pt-BR': 'monitor HTTP' },
  'builder.clean.type.detector': { en: 'anomaly detector', 'pt-BR': 'detector de anomalia' },
  'builder.clean.type.pipeline': { en: 'OpenPipeline pipeline', 'pt-BR': 'pipeline do OpenPipeline' },

  // ------------------------------------------------------------------ anomaly detection: none chosen = every service
  'builder.ad.noneMeansAll': {
    en: 'No service ticked: each detector watches every service, one series per service.',
    'pt-BR': 'Nenhum serviço marcado: cada detector vigia todos os serviços, uma série por serviço.',
  },
  'builder.ad.chosen': { en: 'Each detector watches the {n} service(s) ticked.', 'pt-BR': 'Cada detector vigia o(s) {n} serviço(s) marcado(s).' },
  'builder.ad.createFor': { en: 'Create {n} detector(s) · {services}', 'pt-BR': 'Criar {n} detector(es) · {services}' },
  'builder.ad.allServices': { en: 'every service', 'pt-BR': 'todos os serviços' },
  'builder.ad.someServices': { en: '{n} service(s)', 'pt-BR': '{n} serviço(s)' },
  'builder.ad.descriptionAll': {
    en: 'Created by PoC Automation 3.0 (PoC Builder) for every service.',
    'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder) para todos os serviços.',
  },

  // ------------------------------------------------------------------ OpenPipeline: the check and the routing
  'builder.op.check.title': { en: 'Through the pipeline (last 30 minutes, 1:100 sample)', 'pt-BR': 'Pelo pipeline (últimos 30 minutos, amostra 1:100)' },
  'builder.op.check.none': {
    en: 'No record through the pipeline yet: it receives data only once a route sends it some (see the steps below).',
    'pt-BR': 'Nenhum registro passou pelo pipeline ainda: ele só recebe dados depois que uma rota mandar (veja os passos abaixo).',
  },
  'builder.op.check.some': {
    en: '{sampled} sampled records went through it: {error} left as ERROR, {warn} as WARN, {info} as INFO and {none} still without a level (data records).',
    'pt-BR': '{sampled} registros amostrados passaram por ele: {error} saíram como ERROR, {warn} como WARN, {info} como INFO e {none} seguem sem nível (registros de dados).',
  },
  'builder.op.check.unread': { en: 'The check could not be read here.', 'pt-BR': 'A verificação não pôde ser lida aqui.' },
  'builder.op.openRouting': { en: 'Open the logs routing', 'pt-BR': 'Abrir o roteamento de logs' },
  'builder.op.route.title': { en: 'Send sources to the pipeline', 'pt-BR': 'Enviar fontes ao pipeline' },
  'builder.op.route.what': {
    en: 'The sources whose records come without a level (last 30 minutes, 1:100 sample). Tick the ones the pipeline should receive: the app adds one route at the top of the logs routing, the other routes stay as they are.',
    'pt-BR': 'As fontes cujos registros chegam sem nível (últimos 30 minutos, amostra 1:100). Marque as que o pipeline deve receber: o app acrescenta uma rota no topo do roteamento de logs, e as outras rotas ficam como estão.',
  },
  'builder.op.route.none': { en: 'No source without a level in the last 30 minutes.', 'pt-BR': 'Nenhuma fonte sem nível nos últimos 30 minutos.' },
  'builder.op.route.counts': { en: '{sampled} sampled · {errors} read as errors', 'pt-BR': '{sampled} amostrados · {errors} parecem erros' },
  'builder.op.route.create': { en: 'Send {n} source(s) to the pipeline', 'pt-BR': 'Enviar {n} fonte(s) ao pipeline' },
  'builder.op.route.go': { en: 'Send', 'pt-BR': 'Enviar' },
  'builder.op.route.description': { en: 'PoC Automation: {name}', 'pt-BR': 'PoC Automation: {name}' },
  'builder.op.route.confirm.title': { en: 'Send {n} source(s) to the pipeline?', 'pt-BR': 'Enviar {n} fonte(s) ao pipeline?' },
  'builder.op.route.confirm.body': {
    en: 'From now on the records of these sources go through the PoC pipeline instead of the route they take today; the route goes first in the logs routing and the other routes do not change. Condition: {matcher}. The clean-up removes the route before the pipeline.',
    'pt-BR': 'A partir de agora os registros dessas fontes passam pelo pipeline da PoC no lugar da rota que seguem hoje; a rota entra em primeiro no roteamento de logs e as outras rotas não mudam. Condição: {matcher}. A limpeza remove a rota antes do pipeline.',
  },

  // ------------------------------------------------------------------ Licensing → App consumption: in money, and the practices
  'cons.bill.title': { en: 'What the app’s queries cost the licence', 'pt-BR': 'Quanto as consultas do app custam ao licenciamento' },
  'cons.bill.body': {
    en: 'Measured, not estimated: the query consumption the platform billed to this app in the last 30 days, read from its billing usage events by the app that ran each query — this install and its two earlier app ids apart. Queries a licence includes (for example logs retained with included queries) are not billed and do not appear.',
    'pt-BR': 'Medido, não estimado: o consumo de consultas que a plataforma faturou para este app nos últimos 30 dias, lido dos eventos de cobrança pelo app que rodou cada consulta — esta instalação e os dois ids anteriores do app separados. Consultas que o licenciamento inclui (por exemplo logs retidos com consultas incluídas) não são faturadas e não aparecem.',
  },
  'cons.bill.unread': { en: 'The billing usage events could not be read here.', 'pt-BR': 'Os eventos de cobrança não puderam ser lidos aqui.' },
  'cons.bill.current': { en: 'Billed to this install (30 days)', 'pt-BR': 'Faturado para esta instalação (30 dias)' },
  'cons.bill.currentCaption': { en: '{gib} GiB of queries billed to my.poc.automation', 'pt-BR': '{gib} GiB de consultas faturadas para my.poc.automation' },
  'cons.bill.earlier': { en: 'Billed to the earlier app ids (30 days)', 'pt-BR': 'Faturado para os ids anteriores (30 dias)' },
  'cons.bill.earlierCaption': { en: '{gib} GiB — the same app under its previous ids', 'pt-BR': '{gib} GiB — o mesmo app com os ids anteriores' },
  'cons.bill.session': { en: 'This session at most', 'pt-BR': 'Esta sessão, no máximo' },
  'cons.bill.sessionCaption': { en: '{gib} GiB read so far, priced as if all of it were billed', 'pt-BR': '{gib} GiB lidos até agora, como se tudo fosse faturado' },
  'cons.bill.method': {
    en: 'Priced at the public query price per GiB, in the rate card’s currency; the expected cost of a visit and of the whole PoC is in the Cost projection tab.',
    'pt-BR': 'Pelo preço público de consulta por GiB, na moeda da tabela de preços; o custo esperado de uma visita e da PoC inteira está na guia Projeção de custo.',
  },
  'cons.bill.noRateCard': {
    en: 'In GiB: turn on the rate card in Settings to see these figures in money.',
    'pt-BR': 'Em GiB: ligue a tabela de preços em Configurações para ver estes números em dinheiro.',
  },
  'cons.dql.title': { en: 'How the app follows the query practices', 'pt-BR': 'Como o app segue as boas práticas de consulta' },
  'cons.dql.body': {
    en: 'Counted from the app’s own query catalog — every read the app makes is an entry of it, so these counts describe the app as it is.',
    'pt-BR': 'Contado do próprio catálogo de consultas do app — toda leitura do app é uma entrada dele, então estas contagens descrevem o app como ele é.',
  },
  'cons.dql.col.practice': { en: 'Practice', 'pt-BR': 'Prática' },
  'cons.dql.col.queries': { en: 'Queries', 'pt-BR': 'Consultas' },
  'cons.dql.col.why': { en: 'Why it matters', 'pt-BR': 'Por que importa' },
  'cons.dql.count': { en: '{met} of {of}', 'pt-BR': '{met} de {of}' },
  'cons.dql.catalog': { en: 'Every read from a reviewed catalog', 'pt-BR': 'Toda leitura de um catálogo revisado' },
  'cons.dql.catalog.why': { en: 'No ad-hoc DQL: each query has a purpose, a scope and a recorded cost.', 'pt-BR': 'Sem DQL solta: cada consulta tem propósito, escopo e custo registrado.' },
  'cons.dql.scanCeiling': { en: 'A scan ceiling on every read that scans Grail data', 'pt-BR': 'Limite de varredura em toda leitura que varre dados do Grail' },
  'cons.dql.scanCeiling.why': { en: 'Grail stops the read at the ceiling instead of scanning on; reads at 0 bytes need none.', 'pt-BR': 'O Grail para a leitura no limite em vez de seguir varrendo; leituras de 0 byte não precisam.' },
  'cons.dql.recordLimit': { en: 'A record limit on the request', 'pt-BR': 'Limite de registros na requisição' },
  'cons.dql.recordLimit.why': { en: 'Lists return only what the page shows.', 'pt-BR': 'Listas devolvem só o que a página mostra.' },
  'cons.dql.logsBounded': { en: 'Log reads sampled or in a short window', 'pt-BR': 'Leituras de log amostradas ou em janela curta' },
  'cons.dql.logsBounded.why': { en: 'Logs are the largest data; a sample or a short window keeps a read small.', 'pt-BR': 'Logs são o maior volume; amostra ou janela curta mantêm a leitura pequena.' },
  'cons.dql.metricsFirst': { en: 'Read from metrics', 'pt-BR': 'Lidas de métricas' },
  'cons.dql.metricsFirst.why': { en: 'Metrics are pre-aggregated and the cheapest data to read.', 'pt-BR': 'Métricas são pré-agregadas e o dado mais barato de ler.' },
  'cons.dql.measured': { en: 'Cost measured on a tenant', 'pt-BR': 'Custo medido num tenant' },
  'cons.dql.measured.why': { en: 'Each read was run and its scanned bytes recorded before it shipped.', 'pt-BR': 'Cada leitura foi executada e teve os bytes varridos registrados antes de entrar.' },
  'cons.dql.zeroScan': { en: 'Reads that scan no Grail data', 'pt-BR': 'Leituras que não varrem dados do Grail' },
  'cons.dql.zeroScan.why': { en: 'Entity model, metrics and system events answer at 0 bytes.', 'pt-BR': 'Modelo de entidades, métricas e eventos de sistema respondem a 0 bytes.' },
  'cons.dql.parameterised': { en: 'Ids passed as validated parameters', 'pt-BR': 'Ids passados como parâmetros validados' },
  'cons.dql.parameterised.why': { en: 'No id is concatenated into DQL text.', 'pt-BR': 'Nenhum id é concatenado ao texto da DQL.' },
  'cons.dql.method': {
    en: 'The tests refuse a query outside the catalog and a declared scope that no query uses.',
    'pt-BR': 'Os testes recusam uma consulta fora do catálogo e um escopo declarado que nenhuma consulta usa.',
  },

  // ------------------------------------------------------------------ the catalog
  'catalog.purpose.log.pipeline.check': {
    en: 'How many log records went through the PoC Builder’s OpenPipeline pipeline and the level each left with (error, warning, info, still without one), from a 1:100 sample over 30 minutes — the proof that the pipeline works once a route sends it data.',
    'pt-BR': 'Quantos registros de log passaram pelo pipeline do OpenPipeline do PoC Builder e o nível com que cada um saiu (erro, aviso, info, ainda sem nível), de uma amostra 1:100 em 30 minutos — a prova de que o pipeline funciona depois que uma rota manda dados.',
  },
  'catalog.purpose.log.sources.nolevel': {
    en: 'The log sources whose records come without a level — by log source, Kubernetes workload and ingest path — and how many of their lines read as errors, from a 1:100 sample over 30 minutes: the choices for the route the PoC Builder adds to its OpenPipeline pipeline. A list of sources, never added up.',
    'pt-BR': 'As fontes de log cujos registros chegam sem nível — por fonte, workload do Kubernetes e caminho de ingestão — e quantas das suas linhas parecem erros, de uma amostra 1:100 em 30 minutos: as escolhas da rota que o PoC Builder acrescenta ao pipeline do OpenPipeline. Uma lista de fontes, nunca somada.',
  },
  'catalog.purpose.app.query.billing': {
    en: 'The query consumption the platform billed to this app (and its two earlier app ids) over the last 30 days, by kind of query, read from the billing usage events — the bytes the licence was charged for, not an estimate.',
    'pt-BR': 'O consumo de consultas que a plataforma faturou para este app (e para os dois ids anteriores dele) nos últimos 30 dias, por tipo de consulta, lido dos eventos de cobrança — os bytes cobrados do licenciamento, não uma estimativa.',
  },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i118': {
    en: '3.7.6 — The e-mails in the right order: the triage and the weekly summary open with the problem or the week, then Dynatrace Assist’s reading, and close with the links and the footer; the weekly e-mail links only platform pages the customer can open (Problems and the PoC’s overview dashboard), never the app. Anomaly detectors can watch every service (none ticked). The Builder’s links open the right pages on the tenant (OpenPipeline, Anomaly Detection, Synthetic, the SLO app), the clean-up says “Remove”, and the OpenPipeline kit sends the sources the SE ticks to the pipeline (one route at the top of the logs routing, removed by the clean-up) and shows how many records went through it. The Overview and the Executive summary share one banner on the brand background. Licensing → App consumption shows what the app’s queries cost the licence, measured from the billing events, and how the app follows the query practices.',
    'pt-BR': '3.7.6 — Os e-mails na ordem certa: a triagem e o resumo semanal abrem com o problema ou a semana, depois a leitura do Dynatrace Assist, e fecham com os links e o rodapé; o e-mail semanal só leva páginas da plataforma que o cliente abre (Problemas e o dashboard de visão geral da PoC), nunca o app. Os detectores de anomalia podem vigiar todos os serviços (nenhum marcado). Os links do Builder abrem as páginas certas no tenant (OpenPipeline, Anomaly Detection, Sintéticos, o app de SLO), a limpeza diz “Remover” e o kit do OpenPipeline envia ao pipeline as fontes que o SE marcar (uma rota no topo do roteamento de logs, removida pela limpeza) e mostra quantos registros passaram por ele. A Visão geral e o Resumo executivo têm o mesmo banner, no fundo da marca. Licenciamento → Consumo do app mostra quanto as consultas do app custam ao licenciamento, medido nos eventos de cobrança, e como o app segue as boas práticas de consulta.',
  },
} satisfies Record<string, Entry>;
