import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.7 (the owner: "Seguir com a 3.6.7 com suas recomendações"): on the PoC Builder, two
 * new dashboards (runtime security; logs and data quality), the investigation notebook and the PoC launchpad. Merged in
 * `strings.ts`.
 */

export const v367Strings = {
  // ------------------------------------------------------------------ the two new dashboards
  'dash3.security.name': { en: 'Runtime security', 'pt-BR': 'Segurança em runtime' },
  'dash3.security.audience': { en: 'For security and application teams', 'pt-BR': 'Para os times de segurança e de aplicação' },
  'dash3.security.question': {
    en: 'Which vulnerabilities are real in production — reachable, exploitable, in use — and where each one runs.',
    'pt-BR': 'Quais vulnerabilidades são reais em produção — alcançáveis, exploráveis, em uso — e onde cada uma roda.',
  },
  'dash3.logs.name': { en: 'Logs and data quality', 'pt-BR': 'Logs e qualidade de dados' },
  'dash3.logs.audience': { en: 'For platform and observability teams', 'pt-BR': 'Para os times de plataforma e observabilidade' },
  'dash3.logs.question': {
    en: 'What arrives, with what context, the errors of the last minutes and how long each bucket keeps its records.',
    'pt-BR': 'O que chega, com que contexto, os erros dos últimos minutos e por quanto tempo cada bucket guarda os registros.',
  },
  'dash3.section.security.posture': { en: '🛡️ {n}. Posture', 'pt-BR': '🛡️ {n}. Postura' },
  'dash3.section.security.queue': { en: '🔥 {n}. The queue to act on', 'pt-BR': '🔥 {n}. A fila para agir' },
  'dash3.section.security.context': { en: '🧭 {n}. Where each one runs', 'pt-BR': '🧭 {n}. Onde cada uma roda' },
  'dash3.section.logs.volume': { en: '📈 {n}. Volume', 'pt-BR': '📈 {n}. Volume' },
  'dash3.section.logs.context': { en: '🧾 {n}. Context', 'pt-BR': '🧾 {n}. Contexto' },
  'dash3.section.logs.errors': { en: '🚨 {n}. Recent errors', 'pt-BR': '🚨 {n}. Erros recentes' },
  'dash3.section.logs.retention': { en: '🗄️ {n}. Retention', 'pt-BR': '🗄️ {n}. Retenção' },
  'dash2.tile.sec.public': { en: '🌐 Publicly exposed', 'pt-BR': '🌐 Expostas publicamente' },
  'dash2.tile.sec.list': { en: '📋 Vulnerabilities, highest score first', 'pt-BR': '📋 Vulnerabilidades, maior pontuação primeiro' },
  'dash2.tile.sec.context': { en: '🧭 Components, services and workloads of each vulnerability', 'pt-BR': '🧭 Componentes, serviços e workloads de cada vulnerabilidade' },
  'dash2.tile.logs.ingest': { en: '💾 Logs ingested and queried', 'pt-BR': '💾 Logs ingeridos e consultados' },
  'dash2.tile.logs.errors': { en: '🚨 The most recent error records', 'pt-BR': '🚨 Os registros de erro mais recentes' },
  'dash2.tile.logs.buckets': { en: '🗄️ Volume and retention per bucket', 'pt-BR': '🗄️ Volume e retenção por bucket' },
  'dash2.tile.logs.sfm': { en: '🩺 Ingestion quality reported by the platform', 'pt-BR': '🩺 Qualidade da ingestão informada pela plataforma' },

  // ------------------------------------------------------------------ the document kits
  'builder.tab.documents': { en: 'Notebook and launchpad', 'pt-BR': 'Notebook e launchpad' },
  'builder.notebook.name': { en: 'PoC investigation', 'pt-BR': 'Investigação da PoC' },
  'builder.notebook.what': {
    en: 'A notebook with the app’s queries in the order an engineer investigates, each explained, ready to run with the customer.',
    'pt-BR': 'Um notebook com as consultas do app na ordem em que se investiga, cada uma explicada, pronto para rodar com o cliente.',
  },
  'builder.notebook.intro': {
    en: 'Each section runs one of the queries PoC Automation 3.0 uses, exactly as the app runs it. Prepared on {at}; run it again to see the environment now.',
    'pt-BR': 'Cada seção roda uma das consultas do PoC Automation 3.0, exatamente como o app a roda. Preparado em {at}; rode de novo para ver o ambiente agora.',
  },
  'builder.nb.open.title': { en: '{n}. The most recent problems', 'pt-BR': '{n}. Os problemas mais recentes' },
  'builder.nb.open.why': { en: 'Start with what Dynatrace Intelligence opened, newest first.', 'pt-BR': 'Comece pelo que a Dynatrace Intelligence abriu, do mais novo para o mais antigo.' },
  'builder.nb.mix.title': { en: '{n}. Problems by category and status', 'pt-BR': '{n}. Problemas por categoria e status' },
  'builder.nb.mix.why': { en: 'Which kind of problem dominates, and how many are still open.', 'pt-BR': 'Que tipo de problema domina, e quantos seguem abertos.' },
  'builder.nb.recurring.title': { en: '{n}. What keeps coming back', 'pt-BR': '{n}. O que volta a acontecer' },
  'builder.nb.recurring.why': { en: 'A recurring pattern is the first candidate for a fix or a workflow.', 'pt-BR': 'Um padrão recorrente é o primeiro candidato a uma correção ou a um workflow.' },
  'builder.nb.services.title': { en: '{n}. The busiest services and their failures', 'pt-BR': '{n}. Os serviços mais usados e as suas falhas' },
  'builder.nb.services.why': { en: 'Where users feel it: requests, failures and response time per service.', 'pt-BR': 'Onde o usuário sente: requisições, falhas e tempo de resposta por serviço.' },
  'builder.nb.errors.title': { en: '{n}. The most recent log errors', 'pt-BR': '{n}. Os erros de log mais recentes' },
  'builder.nb.errors.why': { en: 'What the systems themselves said, with where each error came from.', 'pt-BR': 'O que os próprios sistemas disseram, com a origem de cada erro.' },
  'builder.nb.logContext.title': { en: '{n}. How much of the logs carries context', 'pt-BR': '{n}. Quanto dos logs carrega contexto' },
  'builder.nb.logContext.why': { en: 'Logs with a service, a host or a namespace can be tied to a problem.', 'pt-BR': 'Logs com serviço, host ou namespace podem ser ligados a um problema.' },
  'builder.nb.capacity.title': { en: '{n}. Hosts near their ceiling', 'pt-BR': '{n}. Hosts perto do limite' },
  'builder.nb.capacity.why': { en: 'CPU and memory at their peak, highest first.', 'pt-BR': 'CPU e memória no pico, do maior para o menor.' },
  'builder.nb.kubernetes.title': { en: '{n}. Workloads that restart', 'pt-BR': '{n}. Workloads que reiniciam' },
  'builder.nb.kubernetes.why': { en: 'A restarting workload is often where an incident begins.', 'pt-BR': 'Um workload que reinicia costuma ser onde um incidente começa.' },
  'builder.nb.security.title': { en: '{n}. Vulnerabilities by exposure', 'pt-BR': '{n}. Vulnerabilidades por exposição' },
  'builder.nb.security.why': { en: 'Which ones are exploitable, public and in use — the ones to act on first.', 'pt-BR': 'Quais são exploráveis, públicas e em uso — as primeiras para agir.' },
  'builder.launchpad.name': { en: 'PoC launchpad', 'pt-BR': 'Launchpad da PoC' },
  'builder.launchpad.what': {
    en: 'A start page on the environment for this PoC: the customer logo, the dashboards and the notebook it created, and the app’s pages — one link for the customer’s team.',
    'pt-BR': 'Uma página inicial no ambiente para esta PoC: o logo do cliente, os dashboards e o notebook que ela criou e as páginas do app — um único link para o time do cliente.',
  },
  'builder.launchpad.intro': {
    en: 'Everything this PoC built on the environment, in one place. Each card opens a dashboard, the investigation notebook or a page of PoC Automation 3.0.',
    'pt-BR': 'Tudo o que esta PoC construiu no ambiente, num só lugar. Cada cartão abre um dashboard, o notebook de investigação ou uma página do PoC Automation 3.0.',
  },
  'builder.launchpad.what1': { en: 'A card for each dashboard the PoC created', 'pt-BR': 'Um cartão para cada dashboard que a PoC criou' },
  'builder.launchpad.what2': { en: 'A card for the investigation notebook, once created', 'pt-BR': 'Um cartão para o notebook de investigação, depois de criado' },
  'builder.launchpad.what3': { en: 'Cards to the app’s Overview, Executive summary, Coverage, Dynatrace Intelligence and AIOps & RCA', 'pt-BR': 'Cartões para a Visão geral, o Resumo executivo, a Cobertura, a Dynatrace Intelligence e o AIOps e RCA do app' },
  'builder.launchpad.dashboards': { en: 'Dashboards of the PoC', 'pt-BR': 'Dashboards da PoC' },
  'builder.launchpad.notebooks': { en: 'Investigation', 'pt-BR': 'Investigação' },
  'builder.launchpad.app': { en: 'PoC Automation 3.0', 'pt-BR': 'PoC Automation 3.0' },
  'builder.launchpad.appPage': { en: 'A page of the PoC app, read live from this environment.', 'pt-BR': 'Uma página do app da PoC, lida ao vivo deste ambiente.' },
  'builder.launchpad.openDashboard': { en: 'Open the dashboard', 'pt-BR': 'Abrir o dashboard' },
  'builder.launchpad.openNotebook': { en: 'Open the notebook', 'pt-BR': 'Abrir o notebook' },
  'builder.launchpad.openPage': { en: 'Open the page', 'pt-BR': 'Abrir a página' },
  'builder.footer': {
    en: 'Created by PoC Automation 3.0, only by the SE’s click; the queries are the app’s own, validated before use.',
    'pt-BR': 'Criado pelo PoC Automation 3.0, só pelo clique do SE; as consultas são as do próprio app, validadas antes do uso.',
  },
  'builder.doc.name': { en: 'Name on the environment', 'pt-BR': 'Nome no ambiente' },
  'builder.doc.shared': {
    en: 'Let every user of this environment open it (read-only). Unchecked, only you can.',
    'pt-BR': 'Deixar todos os usuários deste ambiente abrirem (somente leitura). Desmarcado, só você.',
  },
  'builder.doc.create': { en: 'Create on the environment', 'pt-BR': 'Criar no ambiente' },
  'builder.doc.update': { en: 'Update', 'pt-BR': 'Atualizar' },
  'builder.doc.createNew': { en: 'Create a new one', 'pt-BR': 'Criar outro' },
  'builder.doc.busy': { en: 'Writing on the environment…', 'pt-BR': 'Gravando no ambiente…' },
  'builder.doc.confirm.title': { en: 'Create "{name}" on this environment?', 'pt-BR': 'Criar "{name}" neste ambiente?' },
  'builder.doc.confirm.body': {
    en: 'It is written once, now, and listed in the PoC’s register. Nothing else on the environment changes.',
    'pt-BR': 'Ele é gravado uma vez, agora, e entra no registro da PoC. Nada mais no ambiente muda.',
  },
  'builder.doc.created': { en: 'Created on the environment', 'pt-BR': 'Criado no ambiente' },
  'builder.doc.updated': { en: 'Updated on the environment', 'pt-BR': 'Atualizado no ambiente' },
  'builder.doc.failed.title': { en: 'Nothing was written on the environment', 'pt-BR': 'Nada foi gravado no ambiente' },
  'builder.doc.failed.forbidden': {
    en: 'Your user may not write documents on this environment. Ask for the document write permission and try again.',
    'pt-BR': 'O seu usuário não pode gravar documentos neste ambiente. Peça a permissão de escrita de documentos e tente de novo.',
  },
  'builder.doc.failed.missing': {
    en: 'The document is no longer on the environment. Create a new one.',
    'pt-BR': 'O documento não está mais no ambiente. Crie outro.',
  },
  'builder.doc.failed.conflict': {
    en: 'Someone changed the document meanwhile. Open it, then try again.',
    'pt-BR': 'Alguém mudou o documento nesse meio-tempo. Abra-o e tente de novo.',
  },
  'builder.doc.failed.error': {
    en: 'The document service did not accept the request. Try again in a moment.',
    'pt-BR': 'O serviço de documentos não aceitou o pedido. Tente de novo daqui a pouco.',
  },
  'builder.ledger.notebook': { en: 'Notebook "{name}"', 'pt-BR': 'Notebook "{name}"' },
  'builder.ledger.launchpad': { en: 'Launchpad "{name}"', 'pt-BR': 'Launchpad "{name}"' },
  'help.whatsNew.i109': {
    en: '3.6.7 — More to build on the PoC Builder. Two new dashboards, Runtime security and Logs and data quality, join the four, with the customer logo too; an investigation notebook puts the app’s queries in the order an engineer investigates, each explained; and a PoC launchpad gives the customer’s team one start page with the dashboards, the notebook and the app’s pages. Everything is created only by the SE’s click and listed in the register.',
    'pt-BR': '3.6.7 — Mais para construir no PoC Builder. Dois dashboards novos, Segurança em runtime e Logs e qualidade de dados, se juntam aos quatro, também com o logo do cliente; um notebook de investigação põe as consultas do app na ordem em que se investiga, cada uma explicada; e um launchpad da PoC dá ao time do cliente uma página inicial com os dashboards, o notebook e as páginas do app. Tudo é criado só pelo clique do SE e entra no registro.',
  },
} satisfies Record<string, Entry>;
