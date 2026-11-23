import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.4 (the owner: "Seguir com a 3.7.4, porém valide estes pontos antes da 3.7.3"): the
 * weekly PoC summary (the app's second workflow action — its texts are read by the action itself, `features/weekly/weekly.ts`,
 * so this fragment is imported there on its own), the PoC Builder's tabs one per subject, the OpenPipeline and anomaly
 * detection kits, and Settings' buttons and readiness. Merged in `strings.ts`.
 */

export const v374Strings = {
  // ------------------------------------------------------------------ the weekly summary (e-mail)
  'weekly.subject': { en: 'Weekly PoC summary — {customer} · {problems} problems, MTTR {mttr}', 'pt-BR': 'Resumo semanal da PoC — {customer} · {problems} problemas, MTTR {mttr}' },
  'weekly.head': { en: '## Weekly PoC summary — {customer}', 'pt-BR': '## Resumo semanal da PoC — {customer}' },
  'weekly.better': { en: 'better', 'pt-BR': 'melhor' },
  'weekly.worse': { en: 'worse', 'pt-BR': 'pior' },
  'weekly.same': { en: 'same', 'pt-BR': 'igual' },
  'weekly.period': { en: '**Period:** {from} to {to} (UTC)', 'pt-BR': '**Período:** {from} a {to} (UTC)' },
  'weekly.col.indicator': { en: 'Indicator', 'pt-BR': 'Indicador' },
  'weekly.col.thisWeek': { en: 'This week', 'pt-BR': 'Esta semana' },
  'weekly.col.before': { en: 'Week before', 'pt-BR': 'Semana anterior' },
  'weekly.col.change': { en: 'Change', 'pt-BR': 'Variação' },
  'weekly.row.problems': { en: 'Problems', 'pt-BR': 'Problemas' },
  'weekly.row.open': { en: 'Still open', 'pt-BR': 'Ainda abertos' },
  'weekly.col.problem': { en: 'Problem', 'pt-BR': 'Problema' },
  'weekly.col.occurrences': { en: 'Occurrences', 'pt-BR': 'Ocorrências' },
  'weekly.col.rootCause': { en: 'Root cause', 'pt-BR': 'Causa raiz' },
  'weekly.col.service': { en: 'Service', 'pt-BR': 'Serviço' },
  'weekly.col.failed': { en: 'Failed', 'pt-BR': 'Falhas' },
  'weekly.col.requests': { en: 'Requests', 'pt-BR': 'Requisições' },
  'weekly.notNamed': { en: 'not named yet', 'pt-BR': 'ainda não apontada' },
  'weekly.points': { en: '{sign}{n} pp', 'pt-BR': '{sign}{n} p.p.' },
  'weekly.linkNotebook': { en: '[The week’s report, with its charts (notebook)]({link})', 'pt-BR': '[O relatório da semana, com os gráficos (notebook)]({link})' },
  'weekly.nb.name': { en: 'PoC weekly report — {customer} — {day}', 'pt-BR': 'Relatório semanal da PoC — {customer} — {day}' },
  'weekly.nb.mix': { en: 'Problems by category and status', 'pt-BR': 'Problemas por categoria e status' },
  'weekly.nb.recurring': { en: 'What repeated most', 'pt-BR': 'O que mais se repetiu' },
  'weekly.nb.responseTime': { en: 'Response time of the services (ms)', 'pt-BR': 'Tempo de resposta dos serviços (ms)' },
  'weekly.nb.failureRate': { en: 'Failure rate of the services failing most (%)', 'pt-BR': 'Taxa de falha dos serviços com mais falhas (%)' },
  'weekly.nb.services': { en: 'The services by traffic, failures and response time', 'pt-BR': 'Os serviços por tráfego, falhas e tempo de resposta' },
  'weekly.nb.chartsNote': {
    en: 'Every chart below reads this same week, from Grail, with the platform’s own charts.',
    'pt-BR': 'Cada gráfico abaixo lê esta mesma semana, do Grail, com os gráficos da própria plataforma.',
  },
  'weekly.nb.footer': {
    en: 'Written by the weekly action of PoC Automation 3.0 with the workflow’s own permissions; the figures come from Grail and the charts keep the week they describe.',
    'pt-BR': 'Escrito pela ação semanal do PoC Automation 3.0 com as permissões do workflow; os números vêm do Grail e os gráficos mantêm a semana que descrevem.',
  },
  'weekly.sec.problems': { en: '### The week against the week before', 'pt-BR': '### A semana contra a semana anterior' },
  'weekly.problems': { en: '**{n} problems** in the last 7 days ({change} against the week before) · **MTTR {mttr}**', 'pt-BR': '**{n} problemas** nos últimos 7 dias ({change} contra a semana anterior) · **MTTR {mttr}**' },
  'weekly.closedOpen': { en: 'Closed', 'pt-BR': 'Fechados' },
  'weekly.mttr': { en: 'MTTR (mean time to resolve)', 'pt-BR': 'MTTR (tempo médio de resolução)' },
  'weekly.rootCause': { en: 'Closed with a root cause named by Dynatrace Intelligence', 'pt-BR': 'Fechados com causa raiz apontada pela Dynatrace Intelligence' },
  'weekly.sec.recurring': { en: '### What repeated most', 'pt-BR': '### O que mais se repetiu' },
  'weekly.sec.failing': { en: '### Services failing most', 'pt-BR': '### Serviços com mais falhas' },
  'weekly.failing': { en: 'Share of requests that failed, among the services with at least 100 requests in the week.', 'pt-BR': 'Parcela das requisições que falharam, entre os serviços com ao menos 100 requisições na semana.' },
  'weekly.none': { en: 'Nothing to list this week.', 'pt-BR': 'Nada a listar nesta semana.' },
  'weekly.sec.links': { en: '### Links', 'pt-BR': '### Links' },
  'weekly.linkProblems': { en: '[Problems in Dynatrace]({link})', 'pt-BR': '[Os problemas no Dynatrace]({link})' },
  'weekly.linkDashboard': { en: '[The PoC’s environment health dashboard]({link})', 'pt-BR': '[O dashboard de saúde do ambiente da PoC]({link})' },
  'weekly.footer': { en: '_Read by the weekly action of PoC Automation 3.0 with this workflow’s own permissions; every figure comes from Grail._', 'pt-BR': '_Lido pela ação semanal do PoC Automation 3.0 com as permissões deste workflow; todo número vem do Grail._' },

  // ------------------------------------------------------------------ Settings
  'settings.customer.urlUse': {
    en: 'The PoC Builder’s Synthetic tab offers an HTTP monitor of this address, created on one click.',
    'pt-BR': 'A guia Sintéticos do PoC Builder oferece um monitor HTTP deste endereço, criado em um clique.',
  },
  'settings.ready.builderDashboards': { en: 'A dashboard created on the PoC Builder', 'pt-BR': 'Um dashboard criado no PoC Builder' },

  // ------------------------------------------------------------------ the PoC Builder's tabs (one per subject)
  'builder.tab.slos': { en: 'SLOs', 'pt-BR': 'SLOs' },
  'builder.tab.workflows': { en: 'Workflows', 'pt-BR': 'Workflows' },
  'builder.tab.synthetic': { en: 'Synthetic', 'pt-BR': 'Sintéticos' },
  'builder.tab.openpipeline': { en: 'OpenPipeline', 'pt-BR': 'OpenPipeline' },
  'builder.tab.anomaly': { en: 'Anomaly detection', 'pt-BR': 'Detecção de anomalias' },
  'builder.ledger.detector': { en: 'Anomaly detector · {name}', 'pt-BR': 'Detector de anomalia · {name}' },
  'builder.ledger.pipeline': { en: 'OpenPipeline pipeline · {name}', 'pt-BR': 'Pipeline do OpenPipeline · {name}' },
  'builder.mon.fromSettings': {
    en: '{url} — taken from Settings → Customer & engagement; its monitor is ready to create below.',
    'pt-BR': '{url} — vem de Configurações → Cliente e engajamento; o monitor dele está pronto para criar abaixo.',
  },

  // ------------------------------------------------------------------ the weekly summary workflow
  'builder.weekly.title': { en: 'Weekly PoC summary by e-mail', 'pt-BR': 'Resumo semanal da PoC por e-mail' },
  'builder.weekly.what': {
    en: 'Every Monday the team receives the week of the PoC against the week before — problems, closed and open, the MTTR, the share with a root cause, what repeated and the services that failed most — with Dynatrace Assist’s reading and the links to the SE Report and the executive summary.',
    'pt-BR': 'Toda segunda-feira o time recebe a semana da PoC contra a semana anterior — problemas, fechados e abertos, o MTTR, a parcela com causa raiz, o que se repetiu e os serviços com mais falhas — com a leitura do Dynatrace Assist e os links para o Relatório do SE e o resumo executivo.',
  },
  'builder.weekly.step1': { en: 'Schedule: Mondays at 09:00 ({timezone}), already on', 'pt-BR': 'Agenda: segundas-feiras às 09:00 ({timezone}), já ligada' },
  'builder.weekly.step2': {
    en: 'PoC Automation · Weekly reads the week, Dynatrace Assist writes its reading',
    'pt-BR': 'PoC Automation · Weekly lê a semana, o Dynatrace Assist escreve a leitura',
  },
  'builder.weekly.step3': { en: 'The e-mail: the week in tables, Dynatrace Assist’s reading, then the link to the week’s report notebook (written by the action, with the platform’s charts)', 'pt-BR': 'O e-mail: a semana em tabelas, a leitura do Dynatrace Assist e o link do relatório da semana em notebook (escrito pela ação, com os gráficos da plataforma)' },
  'builder.weekly.name': { en: 'Weekly PoC summary — {customer}', 'pt-BR': 'Resumo semanal da PoC — {customer}' },
  'builder.weekly.description': {
    en: 'Created by PoC Automation 3.0 (PoC Builder): every Monday, the week of the PoC by e-mail.',
    'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder): toda segunda-feira, a semana da PoC por e-mail.',
  },
  'builder.weekly.task': { en: 'PoC Automation · Weekly: the week against the week before', 'pt-BR': 'PoC Automation · Weekly: a semana contra a semana anterior' },
  'builder.weekly.aiPrompt': {
    en: 'You are Dynatrace Assist. Read the weekly PoC summary below and write at most six short lines for the sponsors: how the week went against the week before, what improved, what needs attention and the next step. Use only the facts given; do not invent figures. Answer in English, in Markdown: up to six short bullet points, each starting with “- ”, with no emoji and no heading, and add no note about language or support.',
    'pt-BR': 'Você é o Dynatrace Assist. Leia o resumo semanal da PoC abaixo e escreva no máximo seis linhas curtas para os patrocinadores: como foi a semana contra a anterior, o que melhorou, o que pede atenção e o próximo passo. Use só os fatos fornecidos; não invente números. Responda em português do Brasil, em Markdown: até seis tópicos curtos, cada um começando com “- ”, sem emoji e sem título, e não acrescente observações sobre idioma ou suporte.',
  },
  'builder.weekly.opened': {
    en: 'The schedule comes on: just save it there (if the platform asks which app, choose Workflows). From the next Monday on, the summary arrives by e-mail.',
    'pt-BR': 'A agenda já vem ligada: é só salvar lá (se a plataforma perguntar qual app, escolha Workflows). A partir da próxima segunda, o resumo chega por e-mail.',
  },

  // ------------------------------------------------------------------ the anomaly detection kit
  'builder.ad.title': { en: 'Anomaly detectors on the golden signals', 'pt-BR': 'Detectores de anomalia nos sinais de ouro' },
  'builder.ad.what': {
    en: 'Dynatrace Intelligence anomaly detectors watch the services you pick and open a problem when a golden signal leaves its normal: the failure rate above a fixed line, the response time (p90) above its own baseline, the traffic dropping below it. The baseline is learnt by Dynatrace from each service’s own history — no threshold to guess.',
    'pt-BR': 'Os detectores de anomalia da Dynatrace Intelligence vigiam os serviços escolhidos e abrem um problema quando um sinal de ouro sai do normal: a taxa de falha acima de uma linha fixa, o tempo de resposta (p90) acima da própria linha de base, o tráfego caindo abaixo dela. A linha de base é aprendida pela Dynatrace do histórico de cada serviço — sem limite para adivinhar.',
  },
  'builder.ad.signals': { en: 'Golden signals', 'pt-BR': 'Sinais de ouro' },
  'builder.ad.kind.failureRate': { en: 'Failure rate', 'pt-BR': 'Taxa de falha' },
  'builder.ad.kind.responseTime': { en: 'Response time (p90)', 'pt-BR': 'Tempo de resposta (p90)' },
  'builder.ad.kind.traffic': { en: 'Traffic drop', 'pt-BR': 'Queda de tráfego' },
  'builder.ad.rule.failureRate': { en: 'a problem when it stays above {line}% for 3 of 5 minutes', 'pt-BR': 'um problema quando fica acima de {line}% por 3 de 5 minutos' },
  'builder.ad.rule.responseTime': { en: 'a problem when it stays above its learnt baseline', 'pt-BR': 'um problema quando fica acima da linha de base aprendida' },
  'builder.ad.rule.traffic': { en: 'a problem when requests fall below their learnt baseline', 'pt-BR': 'um problema quando as requisições caem abaixo da linha de base aprendida' },
  'builder.ad.event.failureRate': { en: 'Failure rate above the PoC line', 'pt-BR': 'Taxa de falha acima da linha da PoC' },
  'builder.ad.event.responseTime': { en: 'Response time above its baseline', 'pt-BR': 'Tempo de resposta acima da linha de base' },
  'builder.ad.event.traffic': { en: 'Traffic below its baseline', 'pt-BR': 'Tráfego abaixo da linha de base' },
  'builder.ad.eventDescription': { en: 'Opened by a detector the PoC Builder of PoC Automation 3.0 created.', 'pt-BR': 'Aberto por um detector criado pelo PoC Builder do PoC Automation 3.0.' },
  'builder.ad.name': { en: '{signal} — golden signal (PoC of {customer})', 'pt-BR': '{signal} — sinal de ouro (PoC de {customer})' },
  'builder.ad.description': { en: 'Created by PoC Automation 3.0 (PoC Builder) for {n} service(s).', 'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder) para {n} serviço(s).' },
  'builder.ad.existing': { en: '{n} detector(s) of this PoC already on the environment (see the Register).', 'pt-BR': '{n} detector(es) desta PoC já no ambiente (veja o Registro).' },
  'builder.ad.create': { en: 'Create {n} detector(s)', 'pt-BR': 'Criar {n} detector(es)' },
  'builder.ad.confirm.title': { en: 'Create {n} anomaly detector(s) on this environment?', 'pt-BR': 'Criar {n} detector(es) de anomalia neste ambiente?' },
  'builder.ad.confirm.body': {
    en: 'Each detector runs its query every minute as you, and opens a Dynatrace Intelligence problem (and its notifications) when the signal leaves its normal. The clean-up at the end of the PoC removes them.',
    'pt-BR': 'Cada detector roda a sua consulta a cada minuto em seu nome e abre um problema da Dynatrace Intelligence (e as suas notificações) quando o sinal sai do normal. A limpeza do fim da PoC os remove.',
  },
  'builder.ad.openApp': { en: 'Open Anomaly Detection', 'pt-BR': 'Abrir Anomaly Detection' },

  // ------------------------------------------------------------------ the OpenPipeline kit
  'builder.op.title': { en: 'A level for logs written without one (OpenPipeline)', 'pt-BR': 'Um nível para logs escritos sem nível (OpenPipeline)' },
  'builder.op.why': {
    en: 'A log record without a level never counts as an error: it does not raise the error rate, it escapes alerts and log metrics, and a problem’s analysis does not see it. An application that writes "ERROR …" in its text but sends no level hides its own failures. An OpenPipeline processor reads the record’s words and gives it the level it states — only to records that have none.',
    'pt-BR': 'Um registro de log sem nível nunca conta como erro: não sobe a taxa de erro, escapa de alertas e de métricas de log, e a análise de um problema não o enxerga. Uma aplicação que escreve "ERROR …" no texto mas não envia o nível esconde as próprias falhas. Um processador do OpenPipeline lê as palavras do registro e dá a ele o nível que elas dizem — só para registros que não têm nenhum.',
  },
  'builder.op.measured': { en: 'Measured on this environment (last 30 minutes, 1:100 sample)', 'pt-BR': 'Medido neste ambiente (últimos 30 minutos, amostra 1:100)' },
  'builder.op.preview': {
    en: '{pct} of the records have no level. Of the {without} sampled without one, the rule would set ERROR on {error}, WARN on {warn} and INFO on {info}; the rest are data records and stay as they are.',
    'pt-BR': '{pct} dos registros estão sem nível. Dos {without} amostrados sem nível, a regra daria ERROR a {error}, WARN a {warn} e INFO a {info}; o resto são registros de dados e ficam como estão.',
  },
  'builder.op.notRead': { en: 'The preview could not be read here.', 'pt-BR': 'A prévia não pôde ser lida aqui.' },
  'builder.op.rule': { en: 'The rule', 'pt-BR': 'A regra' },
  'builder.op.rule.match': { en: 'Reads only records without a level ({matcher})', 'pt-BR': 'Lê só registros sem nível ({matcher})' },
  'builder.op.rule.error': { en: 'ERROR when the text says error, exception, fatal or failed', 'pt-BR': 'ERROR quando o texto diz error, exception, fatal ou failed' },
  'builder.op.rule.warn': { en: 'WARN when it says warn or warning', 'pt-BR': 'WARN quando diz warn ou warning' },
  'builder.op.rule.info': { en: 'INFO when it says info; otherwise the record is left as it is', 'pt-BR': 'INFO quando diz info; caso contrário o registro fica como está' },
  'builder.op.after': { en: 'After creating it', 'pt-BR': 'Depois de criar' },
  'builder.op.step1': {
    en: 'The pipeline is created with no route: nothing changes in the ingestion until a route sends it data.',
    'pt-BR': 'O pipeline é criado sem rota: nada muda na ingestão até uma rota mandar dados para ele.',
  },
  'builder.op.step2': {
    en: 'Tick the sources in "Send sources to the pipeline" below and confirm: the app adds one route at the top of the logs routing (Settings → OpenPipeline → Logs → Dynamic routing), the other routes untouched. Or add it yourself there — a condition such as matchesValue(log.source, "my-app"), above broader routes.',
    'pt-BR': 'Marque as fontes em "Enviar fontes ao pipeline" abaixo e confirme: o app acrescenta uma rota no topo do roteamento de logs (Configurações → OpenPipeline → Logs → Dynamic routing), sem mexer nas outras. Ou crie você mesmo lá — uma condição como matchesValue(log.source, "minha-app"), acima de rotas mais amplas.',
  },
  'builder.op.step3': {
    en: 'To check it: in the pipeline, open Preview and run its sample record (an ERROR line without a level); after the route, the line "Through the pipeline" below counts the records that went through it and the level each left with, and the Logs dashboard and the error rate count them.',
    'pt-BR': 'Para validar: no pipeline, abra o Preview e rode o registro de exemplo (uma linha ERROR sem nível); depois da rota, a linha "Pelo pipeline" abaixo conta os registros que passaram por ele e o nível com que saíram, e o dashboard de Logs e a taxa de erro passam a contá-los.',
  },
  'builder.op.name': { en: 'PoC Automation — log levels ({customer})', 'pt-BR': 'PoC Automation — níveis de log ({customer})' },
  'builder.op.processor': { en: 'PoC Automation: a level for logs written without one', 'pt-BR': 'PoC Automation: um nível para logs escritos sem nível' },
  'builder.op.existing': { en: 'Created: {name} (see the Register).', 'pt-BR': 'Criado: {name} (veja o Registro).' },
  'builder.op.create': { en: 'Create the pipeline', 'pt-BR': 'Criar o pipeline' },
  'builder.op.confirm.title': { en: 'Create the OpenPipeline pipeline on this environment?', 'pt-BR': 'Criar o pipeline do OpenPipeline neste ambiente?' },
  'builder.op.confirm.body': {
    en: 'It is created without a route, so the ingestion does not change until you route sources to it in the OpenPipeline app. The clean-up at the end of the PoC removes it.',
    'pt-BR': 'Ele é criado sem rota, então a ingestão não muda até você rotear fontes para ele no app OpenPipeline. A limpeza do fim da PoC o remove.',
  },
  'builder.op.openApp': { en: 'Open OpenPipeline', 'pt-BR': 'Abrir o OpenPipeline' },

  // ------------------------------------------------------------------ the catalog
  'catalog.purpose.log.levels.preview': {
    en: 'The share of log records written without a level and the level the PoC Builder’s OpenPipeline rule would give them (error, warning, info), from a 1:100 sample — proportions, not counts.',
    'pt-BR': 'A parcela de registros de log escritos sem nível e o nível que a regra do OpenPipeline do PoC Builder daria a eles (erro, aviso, info), de uma amostra 1:100 — proporções, não contagens.',
  },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i116': {
    en: '3.7.4 — The PoC Builder, one subject per tab. SLOs, Workflows, Synthetic, OpenPipeline and Anomaly detection each have their own tab. New: a weekly PoC summary by e-mail every Monday (the week against the week before, with Dynatrace Assist’s reading), Dynatrace Intelligence anomaly detectors on the golden signals of the services you pick, and an OpenPipeline pipeline that gives a level to logs written without one — each created on one click and removed by the clean-up. The triage e-mail now opens with the problem and gives Dynatrace Assist’s reading after it; Settings’ buttons stand out in the dark theme.',
    'pt-BR': '3.7.4 — O PoC Builder com um assunto por guia. SLOs, Workflows, Sintéticos, OpenPipeline e Detecção de anomalias têm cada um a sua guia. Novos: um resumo semanal da PoC por e-mail toda segunda (a semana contra a anterior, com a leitura do Dynatrace Assist), detectores de anomalia da Dynatrace Intelligence nos sinais de ouro dos serviços escolhidos e um pipeline do OpenPipeline que dá nível aos logs escritos sem nível — cada um criado num clique e removido pela limpeza. O e-mail de triagem agora abre com o problema e traz a leitura do Dynatrace Assist depois; os botões das Configurações aparecem bem no tema escuro.',
  },
} satisfies Record<string, Entry>;
