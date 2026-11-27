import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.8.2 (the owner's approval of the 3.8.2 proposal, "seguir com as recomendações", D1–D5): the
 * scope `iam:service-users:use` and a readiness badge on the anomaly kit; four predictive-capacity workflows on the PoC Builder.
 * Merged in `strings.ts`.
 */

export const v382Strings = {
  // ------------------------------------------------------------------ the service user, readable refusals and the badge
  'su.refused.noUse': {
    en: 'the app could not use this service user — your user needs the “iam:service-users:use” permission (Dynatrace Pro and Admin users have it). The service user itself is fine.',
    'pt-BR': 'o app não pôde usar este usuário de serviço — o seu usuário precisa da permissão “iam:service-users:use” (os usuários Dynatrace Pro e Admin já têm). O usuário de serviço em si está certo.',
  },
  'builder.ad.actor.badgeOk': { en: 'Ready', 'pt-BR': 'Pronto' },
  'builder.ad.actor.badgeRefused': { en: 'Not accepted', 'pt-BR': 'Não aceito' },
  'builder.ad.actor.badgeChecking': { en: 'Checking…', 'pt-BR': 'Conferindo…' },

  // ------------------------------------------------------------------ predictive capacity
  'cap.title': { en: 'Predictive capacity', 'pt-BR': 'Capacidade preditiva' },
  'cap.what': {
    en: 'Four workflows that ask Dynatrace Intelligence every day for a forecast of the environment’s capacity — the fullest disks, host memory and CPU, and each Kubernetes container’s memory against its own limit — and act only when the forecast reaches the line: an e-mail with Dynatrace Assist’s reading and, if chosen, an event that opens a problem before the capacity runs out.',
    'pt-BR': 'Quatro workflows que pedem todo dia à Dynatrace Intelligence a previsão da capacidade do ambiente — os discos mais cheios, a memória e a CPU dos hosts, e a memória de cada contêiner do Kubernetes contra o próprio limite — e só agem quando a previsão alcança a linha: um e-mail com a leitura do Dynatrace Assist e, se escolhido, um evento que abre um problema antes de a capacidade acabar.',
  },
  'cap.step1': {
    en: 'Every day at 07:00 ({timezone}), each workflow reads the last weeks of its metric and forecasts the next days with Dynatrace Intelligence (the generic forecast, a 90 % interval).',
    'pt-BR': 'Todo dia às 07:00 ({timezone}), cada workflow lê as últimas semanas da sua métrica e prevê os próximos dias com a Dynatrace Intelligence (a previsão genérica, intervalo de 90 %).',
  },
  'cap.step2': {
    en: 'A series is “over the line now”, “likely” (the central forecast crosses it) or “possible” (only the upper bound does); a series without a valid forecast is left out.',
    'pt-BR': 'Uma série fica “acima da linha agora”, “provável” (a previsão central cruza a linha) ou “possível” (só o limite superior cruza); uma série sem previsão válida fica de fora.',
  },
  'cap.step3': {
    en: 'Only then: Dynatrace Assist reads the risk, the e-mail goes out and, if chosen, a resource-contention event opens a problem on the host or the disk.',
    'pt-BR': 'Só então: o Dynatrace Assist lê o risco, o e-mail sai e, se escolhido, um evento de contenção de recurso abre um problema no host ou no disco.',
  },
  'cap.horizon': { en: 'How far ahead', 'pt-BR': 'Até quando prever' },
  'cap.horizon.days': { en: '{n} days', 'pt-BR': '{n} dias' },
  'cap.line': { en: 'Line', 'pt-BR': 'Linha' },
  'cap.open': { en: 'Open in Workflows', 'pt-BR': 'Abrir no Workflows' },
  'cap.download': { en: 'Download (.json)', 'pt-BR': 'Baixar (.json)' },
  'cap.events': {
    en: 'Raise an event (it opens a problem) for each series at risk — up to 10 per run',
    'pt-BR': 'Gerar um evento (que abre um problema) para cada série em risco — até 10 por execução',
  },
  'cap.opened': {
    en: 'The “{signal}” workflow is open in Workflows with its daily schedule on: save it there and it runs as you.',
    'pt-BR': 'O workflow “{signal}” está aberto no Workflows com a agenda diária ligada: salve lá e ele roda como você.',
  },
  'cap.why': {
    en: 'The forecast runs inside the workflow, with the permissions of whoever saves it (analyzers and metrics) — nothing of this app is involved, and it reads metrics only. The workflows are not in the Register: remove them in Workflows.',
    'pt-BR': 'A previsão roda dentro do workflow, com as permissões de quem o salva (analisadores e métricas) — nada deste app participa, e só métricas são lidas. Os workflows não entram no Registro: remova-os no Workflows.',
  },
  'cap.language': {
    en: 'The workflows write their e-mails in this screen’s language.',
    'pt-BR': 'Os workflows escrevem os e-mails no idioma desta tela.',
  },
  'cap.kind.disk': { en: 'Disk', 'pt-BR': 'Disco' },
  'cap.kind.disk.what': { en: 'Used space of each host’s disks (container mounts left out).', 'pt-BR': 'Espaço usado dos discos de cada host (montagens de contêiner de fora).' },
  'cap.kind.memory': { en: 'Host memory', 'pt-BR': 'Memória dos hosts' },
  'cap.kind.memory.what': { en: 'Memory used by each host.', 'pt-BR': 'Memória usada por cada host.' },
  'cap.kind.cpu': { en: 'Host CPU', 'pt-BR': 'CPU dos hosts' },
  'cap.kind.cpu.what': { en: 'CPU used by each host.', 'pt-BR': 'CPU usada por cada host.' },
  'cap.kind.k8sMemory': { en: 'Kubernetes memory', 'pt-BR': 'Memória do Kubernetes' },
  'cap.kind.k8sMemory.what': {
    en: 'Each container’s memory in use against its own limit — what comes before an OOM kill.',
    'pt-BR': 'A memória em uso de cada contêiner contra o próprio limite — o que vem antes de um OOM kill.',
  },
  'cap.wf.name': { en: 'Predictive capacity — {signal} ({customer})', 'pt-BR': 'Capacidade preditiva — {signal} ({customer})' },
  'cap.wf.description': {
    en: 'Created by PoC Automation 3.0 (PoC Builder): a daily Dynatrace Intelligence forecast of {signal}, acting only when it reaches the line.',
    'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder): uma previsão diária da Dynatrace Intelligence de {signal}, que só age quando alcança a linha.',
  },
  'cap.wf.forecastTask': {
    en: 'Forecasts the series with Dynatrace Intelligence and reads which reach the line, and when.',
    'pt-BR': 'Prevê as séries com a Dynatrace Intelligence e lê quais alcançam a linha, e quando.',
  },
  'cap.wf.eventTask': {
    en: 'Raises a resource-contention event (a problem) for each series at risk.',
    'pt-BR': 'Gera um evento de contenção de recurso (um problema) para cada série em risco.',
  },
  'cap.wf.eventTitle': { en: 'Capacity forecast — {signal}: {name}', 'pt-BR': 'Previsão de capacidade — {signal}: {name}' },
  'cap.wf.aiPrompt': {
    en: 'You are an SRE. Below is a Dynatrace Intelligence capacity forecast. In up to six short bullets starting with "- ", say which resources run out first, how soon, the likely cause and the first action to take. No emoji, no heading, no note about language support. Answer in English.',
    'pt-BR': 'Você é um SRE. Abaixo está uma previsão de capacidade da Dynatrace Intelligence. Em até seis tópicos curtos começando com "- ", diga quais recursos acabam primeiro, em quanto tempo, a causa provável e a primeira ação. Sem emoji, sem título, sem nota sobre o suporte a idiomas. Responda em português do Brasil.',
  },
  'cap.mail.heading': { en: 'Predictive capacity — {signal} · {customer}', 'pt-BR': 'Capacidade preditiva — {signal} · {customer}' },
  'cap.mail.gist': {
    en: '▲ {n} of {valid} series reach {line}% within {days} days — {now} over the line now, {likely} likely, {possible} possible',
    'pt-BR': '▲ {n} de {valid} séries alcançam {line}% em até {days} dias — {now} acima da linha agora, {likely} prováveis, {possible} possíveis',
  },
  'cap.mail.subject': { en: 'Capacity forecast — {signal} ({customer}): {n} at risk in {days} days', 'pt-BR': 'Previsão de capacidade — {signal} ({customer}): {n} em risco em {days} dias' },
  'cap.mail.col.name.disk': { en: 'Host · disk', 'pt-BR': 'Host · disco' },
  'cap.mail.col.name.host': { en: 'Host', 'pt-BR': 'Host' },
  'cap.mail.col.name.k8s': { en: 'Cluster · namespace · workload · container', 'pt-BR': 'Cluster · namespace · workload · contêiner' },
  'cap.mail.col.status': { en: 'Status', 'pt-BR': 'Situação' },
  'cap.mail.status.now': { en: 'Over the line now', 'pt-BR': 'Acima da linha agora' },
  'cap.mail.status.likely': { en: 'Likely', 'pt-BR': 'Provável' },
  'cap.mail.status.possible': { en: 'Possible', 'pt-BR': 'Possível' },
  'cap.mail.col.when': { en: 'Reaches the line', 'pt-BR': 'Alcança a linha' },
  'cap.mail.col.days': { en: 'Days', 'pt-BR': 'Dias' },
  'cap.mail.col.end': { en: 'Forecast at the end', 'pt-BR': 'Previsão no fim' },
  'cap.mail.col.top': { en: 'Upper bound (90%)', 'pt-BR': 'Limite superior (90%)' },
  'cap.mail.more': { en: 'And {n} more.', 'pt-BR': 'E mais {n}.' },
  'cap.mail.method': {
    en: '{analyzed} series analysed, {valid} with a valid forecast — Dynatrace Intelligence, generic forecast analysis, 90 % interval.',
    'pt-BR': '{analyzed} séries analisadas, {valid} com previsão válida — Dynatrace Intelligence, análise de previsão genérica, intervalo de 90 %.',
  },
  'cap.mail.footer': { en: 'Read by the PoC Automation 3.0 capacity workflow.', 'pt-BR': 'Lido pelo workflow de capacidade do PoC Automation 3.0.' },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i124': {
    en: '3.8.2 — The PoC Builder’s Workflows tab gains “Predictive capacity”: four workflows that ask Dynatrace Intelligence every day for a forecast of the fullest disks, host memory and CPU, and each Kubernetes container’s memory against its limit, and act only when the forecast reaches the line — an e-mail with Dynatrace Assist’s reading and an event that opens a problem —, handed to Workflows like the triage. The app now declares the permission to use the service user set in Settings as the detectors’ actor, and the anomaly kit checks it on opening: “Ready” enables the creation.',
    'pt-BR': '3.8.2 — A aba Workflows do PoC Builder ganha “Capacidade preditiva”: quatro workflows que pedem todo dia à Dynatrace Intelligence a previsão dos discos mais cheios, da memória e da CPU dos hosts, e da memória de cada contêiner do Kubernetes contra o limite, e só agem quando a previsão alcança a linha — um e-mail com a leitura do Dynatrace Assist e um evento que abre um problema —, entregues ao Workflows como a triagem. O app agora declara a permissão de usar o usuário de serviço definido em Configurações como ator dos detectores, e o kit de anomalias confere ao abrir: “Pronto” libera a criação.',
  },
} satisfies Record<string, Entry>;
