import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.11 — the cost pre-flight (F-14), the session meter (F-16 layer 1) and the link from a gap
 * to its expansion in Licensing (F-15). Merged in `strings.ts`.
 */

export const v3411Strings = {
  'cons.app.gibPerHour': { en: '{value} GiB/h', 'pt-BR': '{value} GiB/h' },
  'cons.app.approxGib': { en: '≈ {value} GiB', 'pt-BR': '≈ {value} GiB' },
  'cons.app.gib': { en: '{value} GiB', 'pt-BR': '{value} GiB' },
  'cons.app.gibHeader': { en: 'GiB', 'pt-BR': 'GiB' },
  'settings.tab.consumption': { en: 'App consumption', 'pt-BR': 'Consumo do app' },

  // ---------------------------------------------------------------- pre-flight (F-14)
  'cons.app.preflight.title': { en: 'Pre-flight: what this tenant will read', 'pt-BR': 'Pré-voo: o que este tenant vai ler' },
  'cons.app.preflight.body': {
    en: 'Before walking a large tenant, the app projects what one full visit (every page once) will read, from this tenant’s own log volume — read at 0 bytes from the platform’s billing events — and the visit measured on the lab tenant. In GiB read; the price lives in Licensing.',
    'pt-BR': 'Antes de percorrer um tenant grande, o app projeta o que uma visita completa (todas as páginas uma vez) vai ler, a partir do volume de logs do próprio tenant — lido a 0 byte dos eventos de cobrança da plataforma — e da visita medida no tenant de laboratório. Em GiB lidos; o preço fica no Licenciamento.',
  },
  'cons.app.preflight.unread': {
    en: 'The log volume could not be read with this identity yet; the projection appears once it is.',
    'pt-BR': 'O volume de logs ainda não pôde ser lido com esta identidade; a projeção aparece assim que for lido.',
  },
  'cons.app.preflight.logsPerHour': { en: 'Logs ingested per hour (window)', 'pt-BR': 'Logs ingeridos por hora (período)' },
  'cons.app.preflight.ratio': { en: '{ratio}× the lab tenant', 'pt-BR': '{ratio}× o tenant de laboratório' },
  'cons.app.preflight.visit': { en: 'One full visit, projected', 'pt-BR': 'Uma visita completa, projetada' },
  'cons.app.preflight.split': {
    en: 'logs {logs} · Dynatrace Intelligence problems {events} (included with Full-Stack) · other {other} GiB',
    'pt-BR': 'logs {logs} · problemas da Dynatrace Intelligence {events} (incluídos no Full-Stack) · outros {other} GiB',
  },
  'cons.app.preflight.billedQuery': { en: 'Log queries billed in the window (all apps)', 'pt-BR': 'Consultas de log faturadas no período (todos os apps)' },
  'cons.app.preflight.payPerQuery': {
    en: 'Logs are billed per query here: log reads count against the subscription.',
    'pt-BR': 'Aqui os logs são cobrados por consulta: leituras de log contam na assinatura.',
  },
  'cons.app.preflight.noLogQuery': {
    en: 'No log query billed in the window: logs may be retained with included queries.',
    'pt-BR': 'Nenhuma consulta de log faturada no período: os logs podem estar retidos com consultas incluídas.',
  },
  'cons.app.preflight.normalTitle': { en: 'A regular read', 'pt-BR': 'Leitura normal' },
  'cons.app.preflight.normalBody': {
    en: 'One full visit should read about {visit} GiB. The app keeps every answer for 10 to 15 minutes, so moving between pages reads nothing again.',
    'pt-BR': 'Uma visita completa deve ler cerca de {visit} GiB. O app guarda cada resposta por 10 a 15 minutos, então navegar entre as páginas não relê nada.',
  },
  'cons.app.preflight.largeTitle': { en: 'A large tenant: read with a plan', 'pt-BR': 'Um tenant grande: leia com um plano' },
  'cons.app.preflight.largeBody': {
    en: 'One full visit should read about {visit} GiB. Open the log pages, the Coverage page and the Tech Wrapup once per session, avoid repeated Refresh, and follow the session meter below; the "metrics first" plan (docs/v3.4/CONSUMO-DO-APP.md §11) lowers the log reads without changing any figure.',
    'pt-BR': 'Uma visita completa deve ler cerca de {visit} GiB. Abra as páginas de logs, a página Cobertura e o Tech Wrapup uma vez por sessão, evite "Atualizar" em sequência e acompanhe o medidor da sessão abaixo; o plano "métricas primeiro" (docs/v3.4/CONSUMO-DO-APP.md §11) reduz as leituras de log sem mudar nenhum número.',
  },
  'cons.app.preflight.method': {
    en: 'Projection: the log part of the lab visit scaled by this tenant’s logs per hour; the Dynatrace Intelligence and other parts kept at the lab’s figures (Help → Assumptions, group "App consumption"). A projection, not a measurement.',
    'pt-BR': 'Projeção: a parte de logs da visita de laboratório multiplicada pelos logs por hora deste tenant; as partes da Dynatrace Intelligence e outras mantidas nos números do laboratório (Ajuda → Premissas, grupo "Consumo do app"). Uma projeção, não uma medição.',
  },

  // ---------------------------------------------------------------- session meter (F-16 layer 1)
  'cons.app.meter.title': { en: 'This session’s reads', 'pt-BR': 'Leituras desta sessão' },
  'cons.app.meter.body': {
    en: 'Every answer from Grail says how many bytes it scanned; the app adds them up for this session, by query and by page. It runs no query of its own.',
    'pt-BR': 'Cada resposta do Grail informa quantos bytes leu; o app soma para esta sessão, por consulta e por página. Ele não executa nenhuma consulta própria.',
  },
  'cons.app.meter.total': { en: 'Read in this session: {gib} GiB in {reads} answers', 'pt-BR': 'Lido nesta sessão: {gib} GiB em {reads} respostas' },
  'cons.app.meter.none': { en: 'No answer with a scan figure yet in this session.', 'pt-BR': 'Ainda nenhuma resposta com número de leitura nesta sessão.' },
  'cons.app.meter.by.query': { en: 'Query', 'pt-BR': 'Consulta' },
  'cons.app.meter.by.page': { en: 'Page', 'pt-BR': 'Página' },
  'cons.app.meter.reads': { en: 'Answers', 'pt-BR': 'Respostas' },
  'cons.app.meter.more': { en: 'And {count} more.', 'pt-BR': 'E mais {count}.' },
  'cons.app.meter.reset': { en: 'Start counting again', 'pt-BR': 'Recomeçar a contagem' },
  'cons.app.meter.method': {
    en: 'An answer shared by several panels counts once; Refresh is a new read and counts again. The meter lives in this browser tab and starts at zero with each session.',
    'pt-BR': 'Uma resposta usada por vários painéis conta uma vez; "Atualizar" é uma nova leitura e conta de novo. O medidor vive nesta aba do navegador e começa em zero a cada sessão.',
  },

  // ---------------------------------------------------------------- assumptions
  'assumption.group.consumption': { en: 'App consumption (pre-flight)', 'pt-BR': 'Consumo do app (pré-voo)' },
  'assumption.consumption.lab.logsIngestPerHour': { en: 'Lab tenant: logs ingested per hour', 'pt-BR': 'Tenant de laboratório: logs ingeridos por hora' },
  'assumption.consumption.lab.logsIngestPerHour.basis': { en: 'Measured on 2026-11-18 (22.3 GiB a day).', 'pt-BR': 'Medido em 2026-11-18 (22,3 GiB por dia).' },
  'assumption.consumption.lab.visitLogs': { en: 'Lab tenant: log GiB read by one full visit', 'pt-BR': 'Tenant de laboratório: GiB de logs lidos numa visita completa' },
  'assumption.consumption.lab.visitLogs.basis': { en: 'Scales with the tenant’s logs per hour.', 'pt-BR': 'Cresce com os logs por hora do tenant.' },
  'assumption.consumption.lab.visitEvents': { en: 'Lab tenant: Dynatrace Intelligence problem GiB read by one full visit', 'pt-BR': 'Tenant de laboratório: GiB de problemas da Dynatrace Intelligence lidos numa visita completa' },
  'assumption.consumption.lab.visitEvents.basis': { en: 'Query included with Full-Stack Monitoring.', 'pt-BR': 'Consulta incluída no Full-Stack Monitoring.' },
  'assumption.consumption.lab.visitOther': { en: 'Lab tenant: other GiB read by one full visit', 'pt-BR': 'Tenant de laboratório: outros GiB lidos numa visita completa' },
  'assumption.consumption.lab.visitOther.basis': { en: 'Business events, vulnerabilities and sessions.', 'pt-BR': 'Eventos de negócio, vulnerabilidades e sessões.' },
  'assumption.consumption.preflight.visitLine': { en: 'Pre-flight: a visit reads as "large" above', 'pt-BR': 'Pré-voo: uma visita é "grande" acima de' },
  'assumption.consumption.preflight.visitLine.basis': { en: 'About 3× the lab visit.', 'pt-BR': 'Cerca de 3× a visita de laboratório.' },

  // ---------------------------------------------------------------- gap → expansion (F-15)
  'lic.gap.title': { en: 'From the coverage gaps to the expansion', 'pt-BR': 'Das lacunas de cobertura à expansão' },
  'lic.gap.caption': {
    en: 'Each gap the Coverage page measured, the DPS capability that closes it and, where the units were measured, its annual list price. SE and partner material: never in the deck nor in the customer’s PDF.',
    'pt-BR': 'Cada lacuna medida pela página Cobertura, a capacidade DPS que a resolve e, quando as unidades foram medidas, o preço anual de lista. Material do SE e do parceiro: nunca no deck nem no PDF do cliente.',
  },
  'lic.gap.col.gap': { en: 'Gap', 'pt-BR': 'Lacuna' },
  'lic.gap.col.capability': { en: 'DPS capability', 'pt-BR': 'Capacidade DPS' },
  'lic.gap.col.annual': { en: 'Annual, list ({currency})', 'pt-BR': 'Anual, lista ({currency})' },
  'lic.gap.toSize': { en: 'to size with the customer', 'pt-BR': 'a dimensionar com o cliente' },
  'lic.gap.replaces': { en: 'net of {amount} of infrastructure monitoring', 'pt-BR': 'já descontados {amount} do monitoramento de infraestrutura' },
  'lic.gap.total': { en: 'Measured gaps, annual list total: {amount}.', 'pt-BR': 'Lacunas medidas, total anual de lista: {amount}.' },
  'lic.gap.disclaimer': {
    en: 'Public list prices on measured units; the lines "to size with the customer" depend on sessions, journeys, pods or events the environment does not show yet. The account manager applies the negotiated terms.',
    'pt-BR': 'Preços públicos de lista sobre unidades medidas; as linhas "a dimensionar com o cliente" dependem de sessões, jornadas, pods ou eventos que o ambiente ainda não mostra. O executivo de contas aplica as condições negociadas.',
  },
  'lic.gap.fullStack': { en: '{hosts} hosts in infrastructure mode ({ram} GiB of memory) to full-stack', 'pt-BR': '{hosts} hosts em modo infraestrutura ({ram} GiB de memória) para full-stack' },
  'lic.gap.appsec': { en: 'Runtime security on the {gib} GiB already in full-stack', 'pt-BR': 'Segurança em runtime sobre os {gib} GiB já em full-stack' },
  'lic.gap.rum': { en: '{apps} web applications without real-user monitoring', 'pt-BR': '{apps} aplicações web sem monitoramento de usuários reais' },
  'lic.gap.synthetic': { en: 'No synthetic monitor on the key journeys yet', 'pt-BR': 'Ainda nenhum monitor sintético nas jornadas principais' },
  'lic.gap.kubernetes': { en: '{clusters} Kubernetes clusters without container metrics', 'pt-BR': '{clusters} clusters Kubernetes sem métricas de contêiner' },
  'lic.gap.business': { en: 'No business event captured yet', 'pt-BR': 'Ainda nenhum evento de negócio capturado' },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i84': {
    en: '3.4.11 — App consumption in Settings: a pre-flight projects what one full visit of this tenant will read, from its own log volume (0 bytes), and a session meter adds up what each answer from Grail actually read, by query and by page. In Licensing, each gap the Coverage page measured is paired with the DPS capability that closes it and, where the units were measured, its annual list price.',
    'pt-BR': '3.4.11 — Consumo do app nas Configurações: um pré-voo projeta o que uma visita completa a este tenant vai ler, a partir do volume de logs dele (0 byte), e um medidor da sessão soma o que cada resposta do Grail realmente leu, por consulta e por página. No Licenciamento, cada lacuna medida pela página Cobertura aparece com a capacidade DPS que a resolve e, quando as unidades foram medidas, o preço anual de lista.',
  },
} satisfies Record<string, Entry>;
