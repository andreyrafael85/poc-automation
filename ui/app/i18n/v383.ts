import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.8.3 (the owner, 2026-11-27: "trocar a 3.8.3 para Guia 'Guardian' no PoC Builder e
 * implementar"): five Site Reliability Guardians on the PoC Builder's new Guardian tab, and their daily validation workflow.
 * Merged in `strings.ts`.
 */

export const v383Strings = {
  'builder.tab.guardian': { en: 'Guardian', 'pt-BR': 'Guardian' },
  'builder.ledger.guardian': { en: 'Site Reliability Guardian · {name}', 'pt-BR': 'Site Reliability Guardian · {name}' },
  'builder.clean.type.guardian': { en: 'guardian', 'pt-BR': 'guardian' },

  'grd.title': { en: 'Site Reliability Guardians of the PoC', 'pt-BR': 'Site Reliability Guardians da PoC' },
  'grd.what': {
    en: 'Five guardians that check the environment against its lines — the PoC’s SLOs, infrastructure performance, services, applications and security — each a set of objectives the Site Reliability Guardian app evaluates on demand, after a deployment or every day. They start with the lines below; tune them in the Site Reliability Guardian app.',
    'pt-BR': 'Cinco guardians que conferem o ambiente contra as suas linhas — as SLOs da PoC, o desempenho da infraestrutura, os serviços, as aplicações e a segurança —, cada um um conjunto de objetivos que o app Site Reliability Guardian avalia sob demanda, depois de um deploy ou todo dia. Eles começam com as linhas abaixo; ajuste-as no app Site Reliability Guardian.',
  },
  'grd.name': { en: 'PoC Automation · {kind} ({customer})', 'pt-BR': 'PoC Automation · {kind} ({customer})' },
  'grd.kind.slos': { en: 'The PoC’s SLOs', 'pt-BR': 'SLOs da PoC' },
  'grd.kind.slos.what': {
    en: 'Each SLO the PoC Builder created, evaluated by its own indicator against its target.',
    'pt-BR': 'Cada SLO criada pelo PoC Builder, avaliada pelo próprio indicador contra a sua meta.',
  },
  'grd.kind.infra': { en: 'Infrastructure performance', 'pt-BR': 'Desempenho da infraestrutura' },
  'grd.kind.infra.what': {
    en: 'The busiest host’s CPU and memory and the fullest disk (container mounts left out).',
    'pt-BR': 'A CPU e a memória do host mais ocupado e o disco mais cheio (montagens de contêiner de fora).',
  },
  'grd.kind.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'grd.kind.services.what': {
    en: 'The failure rate and the p90 response time of the services ticked below (none ticked: every service).',
    'pt-BR': 'A taxa de falha e o tempo de resposta p90 dos serviços marcados abaixo (nenhum marcado: todos os serviços).',
  },
  'grd.kind.apps': { en: 'Applications', 'pt-BR': 'Aplicações' },
  'grd.kind.apps.what': {
    en: 'What real users meet: Largest Contentful Paint (p75), the share of frustrated experiences and of requests with an error.',
    'pt-BR': 'O que os usuários reais encontram: o Largest Contentful Paint (p75), a parcela de experiências frustradas e de requisições com erro.',
  },
  'grd.kind.security': { en: 'Security', 'pt-BR': 'Segurança' },
  'grd.kind.security.what': {
    en: 'The open vulnerabilities (not muted): critical, high, and those to act on now — exploit available, publicly exposed and in use.',
    'pt-BR': 'As vulnerabilidades abertas (não silenciadas): críticas, altas e as de agir agora — com exploit disponível, expostas publicamente e em uso.',
  },

  'grd.obj.slo.desc': { en: 'The SLO’s own indicator, over the guardian’s window.', 'pt-BR': 'O indicador da própria SLO, na janela do guardian.' },
  'grd.obj.hostCpu': { en: 'Busiest host’s CPU', 'pt-BR': 'CPU do host mais ocupado' },
  'grd.obj.hostCpu.desc': { en: 'The mean CPU use of the host that used most, over the window.', 'pt-BR': 'O uso médio de CPU do host que mais usou, na janela.' },
  'grd.obj.hostMemory': { en: 'Busiest host’s memory', 'pt-BR': 'Memória do host mais ocupado' },
  'grd.obj.hostMemory.desc': { en: 'The mean memory use of the host that used most, over the window.', 'pt-BR': 'O uso médio de memória do host que mais usou, na janela.' },
  'grd.obj.disk': { en: 'Fullest disk', 'pt-BR': 'Disco mais cheio' },
  'grd.obj.disk.desc': { en: 'The mean used space of the fullest disk, over the window.', 'pt-BR': 'O espaço usado médio do disco mais cheio, na janela.' },
  'grd.obj.failureRate': { en: 'Failure rate', 'pt-BR': 'Taxa de falha' },
  'grd.obj.failureRate.desc': { en: 'Failed requests as a share of all requests.', 'pt-BR': 'As requisições com falha como parcela de todas.' },
  'grd.obj.responseTime': { en: 'Response time (p90)', 'pt-BR': 'Tempo de resposta (p90)' },
  'grd.obj.responseTime.desc': { en: 'The 90th percentile of the response time.', 'pt-BR': 'O percentil 90 do tempo de resposta.' },
  'grd.obj.lcp': { en: 'Largest Contentful Paint (p75)', 'pt-BR': 'Largest Contentful Paint (p75)' },
  'grd.obj.lcp.desc': { en: 'How long real users wait for the page’s main content (Core Web Vitals).', 'pt-BR': 'Quanto os usuários reais esperam pelo conteúdo principal da página (Core Web Vitals).' },
  'grd.obj.frustrated': { en: 'Frustrated experiences', 'pt-BR': 'Experiências frustradas' },
  'grd.obj.frustrated.desc': { en: 'The share of real users’ actions rated frustrated.', 'pt-BR': 'A parcela das ações dos usuários reais avaliadas como frustradas.' },
  'grd.obj.requestErrors': { en: 'Requests with an error', 'pt-BR': 'Requisições com erro' },
  'grd.obj.requestErrors.desc': { en: 'Real users’ requests that ended with an error.', 'pt-BR': 'As requisições dos usuários reais que terminaram com erro.' },
  'grd.obj.critical': { en: 'Critical vulnerabilities open', 'pt-BR': 'Vulnerabilidades críticas abertas' },
  'grd.obj.critical.desc': { en: 'Open, not muted, read from the last 2 hours of vulnerability reports.', 'pt-BR': 'Abertas e não silenciadas, lidas das últimas 2 horas de relatórios de vulnerabilidade.' },
  'grd.obj.actNow': { en: 'Vulnerabilities to act on now', 'pt-BR': 'Vulnerabilidades de agir agora' },
  'grd.obj.actNow.desc': { en: 'Exploit available, publicly exposed and the vulnerable function in use.', 'pt-BR': 'Com exploit disponível, expostas publicamente e com a função vulnerável em uso.' },
  'grd.obj.high': { en: 'High vulnerabilities open', 'pt-BR': 'Vulnerabilidades altas abertas' },
  'grd.obj.high.desc': { en: 'Open, not muted, read from the last 2 hours of vulnerability reports.', 'pt-BR': 'Abertas e não silenciadas, lidas das últimas 2 horas de relatórios de vulnerabilidade.' },

  'grd.unit.percent': { en: '{n}%', 'pt-BR': '{n}%' },
  'grd.unit.ms': { en: '{n} ms', 'pt-BR': '{n} ms' },
  'grd.unit.count': { en: '{n}', 'pt-BR': '{n}' },
  'grd.line.atMost': { en: 'at most {target}', 'pt-BR': 'no máximo {target}' },
  'grd.line.atLeast': { en: 'at least {target}', 'pt-BR': 'no mínimo {target}' },
  'grd.line.atMostWarn': { en: 'at most {target} · warning above {warning}', 'pt-BR': 'no máximo {target} · alerta acima de {warning}' },
  'grd.line.atLeastWarn': { en: 'at least {target} · warning below {warning}', 'pt-BR': 'no mínimo {target} · alerta abaixo de {warning}' },
  'grd.more': { en: 'And {n} more.', 'pt-BR': 'E mais {n}.' },
  'grd.slos.none': {
    en: 'No SLO yet — create them in the SLOs tab, then come back.',
    'pt-BR': 'Nenhuma SLO ainda — crie-as na aba SLOs e volte aqui.',
  },
  'grd.created': { en: 'Created', 'pt-BR': 'Criado' },
  'grd.open': { en: 'Open its validations', 'pt-BR': 'Abrir as validações' },
  'grd.services': { en: 'Services of the services guardian — the {shown} busiest', 'pt-BR': 'Serviços do guardian de serviços — os {shown} mais movimentados' },
  'grd.services.all': { en: 'None ticked: every service.', 'pt-BR': 'Nenhum marcado: todos os serviços.' },
  'grd.services.some': { en: '{n} service(s) ticked.', 'pt-BR': '{n} serviço(s) marcado(s).' },
  'grd.cost': {
    en: 'Each validation runs the objectives’ queries: the metric ones read 0 B on the lab; each security one reads the last 2 hours of vulnerability reports (about 0.3 GB on the lab).',
    'pt-BR': 'Cada validação roda as consultas dos objetivos: as de métricas leram 0 B no laboratório; cada uma de segurança lê as últimas 2 horas de relatórios de vulnerabilidade (cerca de 0,3 GB no laboratório).',
  },
  'grd.create': { en: 'Create {n} guardian(s)', 'pt-BR': 'Criar {n} guardian(s)' },
  'grd.confirm.title': { en: 'Create {n} guardian(s) on the environment?', 'pt-BR': 'Criar {n} guardian(s) no ambiente?' },
  'grd.confirm.body': {
    en: '{list}. Each is a settings object of the Site Reliability Guardian app, kept in the PoC’s register and removed by the clean-up. Nothing runs until a validation is started.',
    'pt-BR': '{list}. Cada um é um objeto de configuração do app Site Reliability Guardian, guardado no registro da PoC e removido pela limpeza. Nada roda até uma validação ser iniciada.',
  },

  'grd.wf.title': { en: 'Validation workflow', 'pt-BR': 'Workflow de validação' },
  'grd.wf.what': {
    en: 'Every day at 08:00 ({timezone}) it validates each guardian the PoC created over the last 24 hours; the results stay in the Site Reliability Guardian app. After a deployment, run it from Workflows. Handed to Workflows: save it there and it runs as you.',
    'pt-BR': 'Todo dia às 08:00 ({timezone}) ele valida cada guardian criado pela PoC nas últimas 24 horas; os resultados ficam no app Site Reliability Guardian. Depois de um deploy, rode-o pelo Workflows. Entregue ao Workflows: salve lá e ele roda como você.',
  },
  'grd.wf.needs': { en: 'Create the guardians first.', 'pt-BR': 'Crie os guardians primeiro.' },
  'grd.wf.opened': {
    en: 'The validation workflow is open in Workflows with its daily schedule on: save it there. It is not in the Register: remove it in Workflows.',
    'pt-BR': 'O workflow de validação está aberto no Workflows com a agenda diária ligada: salve lá. Ele não entra no Registro: remova-o no Workflows.',
  },
  'grd.wf.name': { en: 'PoC guardians validation ({customer})', 'pt-BR': 'Validação dos guardians da PoC ({customer})' },
  'grd.wf.description': {
    en: 'Created by PoC Automation 3.0 (PoC Builder): validates the PoC’s Site Reliability Guardians every day over the last 24 hours.',
    'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder): valida os Site Reliability Guardians da PoC todo dia nas últimas 24 horas.',
  },
  'grd.wf.task': { en: 'Validates the guardian “{name}”.', 'pt-BR': 'Valida o guardian “{name}”.' },

  // ------------------------------------------------------------------ from the owner's validation of 3.8.2
  'builder.ad.eventText.failureRate': {
    en: 'The service’s failure rate stayed above {line}% for 3 of the last 5 minutes — detected by Dynatrace Intelligence on the errors golden signal.',
    'pt-BR': 'A taxa de falha do serviço ficou acima de {line}% em 3 dos últimos 5 minutos — detectado pela Dynatrace Intelligence no sinal de ouro de erros.',
  },
  'builder.ad.eventText.responseTime': {
    en: 'The service’s p90 response time rose above the baseline Dynatrace Intelligence learned for it — the latency golden signal.',
    'pt-BR': 'O tempo de resposta p90 do serviço subiu acima da linha de base que a Dynatrace Intelligence aprendeu para ele — o sinal de ouro de latência.',
  },
  'builder.ad.eventText.traffic': {
    en: 'The service’s requests fell below the baseline Dynatrace Intelligence learned for them — the traffic golden signal.',
    'pt-BR': 'As requisições do serviço caíram abaixo da linha de base que a Dynatrace Intelligence aprendeu para elas — o sinal de ouro de tráfego.',
  },
  'su.policy.title': { en: 'The least the service user needs', 'pt-BR': 'O mínimo que o usuário de serviço precisa' },
  'su.policy.why': {
    en: 'A policy with these statements, bound to the service user’s group for this environment: read the metrics and their buckets, the entities and Smartscape, and run Dynatrace Intelligence’s analyzers.',
    'pt-BR': 'Uma política com estas instruções, ligada ao grupo do usuário de serviço para este ambiente: ler as métricas e os seus buckets, as entidades e o Smartscape, e rodar os analisadores da Dynatrace Intelligence.',
  },
  'su.offer.named': { en: '{name} · {id}…', 'pt-BR': '{name} · {id}…' },
  'su.offer.namedRuns': { en: '{name} · {id}… · runs {n} detector(s)', 'pt-BR': '{name} · {id}… · roda {n} detector(es)' },
  'cap.events.always': {
    en: 'When the forecast finds a series over the line now, or whose forecast crosses it, the workflow raises a predictive event for it (up to 10 per run) that opens a problem — titled with what is happening and described with the forecast. A series only the upper bound crosses stays in the e-mail.',
    'pt-BR': 'Quando a previsão encontra uma série acima da linha agora, ou cuja previsão a cruza, o workflow gera um evento preditivo para ela (até 10 por execução) que abre um problema — com um título que diz o que acontece e a previsão na descrição. Uma série que só o limite superior cruza fica no e-mail.',
  },
  'cap.ev.titleNow': { en: '{signal} above {line}% — {name}', 'pt-BR': '{signal} acima de {line}% — {name}' },
  'cap.ev.titleLikely': { en: 'Forecast: {signal} reaches {line}% in {days} days — {name}', 'pt-BR': 'Previsão: {signal} alcança {line}% em {days} dias — {name}' },
  'cap.ev.textNow': {
    en: '{signal} of {name} is already above the {line}% line. Dynatrace Intelligence forecasts {end} at the end of the next {horizon} days (upper bound of the 90% interval: {top}). First step: free or add capacity on {name} and find what is growing.',
    'pt-BR': '{signal} de {name} já está acima da linha de {line}%. A Dynatrace Intelligence prevê {end} ao fim dos próximos {horizon} dias (limite superior do intervalo de 90%: {top}). Primeiro passo: liberar ou ampliar a capacidade em {name} e achar o que está crescendo.',
  },
  'cap.ev.textLikely': {
    en: 'Dynatrace Intelligence forecasts {signal} of {name} to reach the {line}% line on {at} — in {days} days — and {end} at the end of the next {horizon} days (upper bound of the 90% interval: {top}). First step: plan capacity for {name} before then.',
    'pt-BR': 'A Dynatrace Intelligence prevê que {signal} de {name} alcance a linha de {line}% em {at} — em {days} dias — e {end} ao fim dos próximos {horizon} dias (limite superior do intervalo de 90%: {top}). Primeiro passo: planejar a capacidade de {name} antes disso.',
  },

  // ------------------------------------------------------------------ the token security agent
  'tok.title': { en: 'Token security agent', 'pt-BR': 'Agente de segurança de tokens' },
  'tok.what': {
    en: 'A workflow that checks, every day, the environment’s access tokens — API tokens, personal access tokens, ActiveGate tokens — and its credential vault: how many are active, which never expire or expire soon, which are unused or were never used, which carry high-privilege scopes, and what to disable. Only when it finds something, it sends an e-mail with the findings and Dynatrace Assist’s reading. It reads metadata only (never a token’s secret) and changes nothing.',
    'pt-BR': 'Um workflow que confere todo dia os tokens de acesso do ambiente — tokens de API, tokens de acesso pessoal, tokens de ActiveGate — e o cofre de credenciais: quantos estão ativos, quais não vencem ou vencem logo, quais estão sem uso ou nunca foram usados, quais têm escopos de alto privilégio, e o que desativar. Só quando encontra algo, ele manda um e-mail com os achados e a leitura do Dynatrace Assist. Ele lê só metadados (nunca o segredo de um token) e não muda nada.',
  },
  'tok.step1': {
    en: 'Every day at 07:30 ({timezone}) it reads the tokens and the credential vault with the permissions of whoever saves it (environment-api:api-tokens:read, environment-api:activegate-tokens:read, environment-api:credentials:read); a list it cannot read is named in the e-mail.',
    'pt-BR': 'Todo dia às 07:30 ({timezone}) ele lê os tokens e o cofre de credenciais com as permissões de quem o salva (environment-api:api-tokens:read, environment-api:activegate-tokens:read, environment-api:credentials:read); uma lista que ele não consegue ler é citada no e-mail.',
  },
  'tok.step2': {
    en: 'Each active token gets its findings and one recommendation: disable (never used, or unused for 90 days), set an expiry and rotate (no expiry with a high-privilege scope) or review.',
    'pt-BR': 'Cada token ativo recebe os seus achados e uma recomendação: desativar (nunca usado, ou sem uso há 90 dias), definir validade e rotacionar (sem validade e com escopo de alto privilégio) ou revisar.',
  },
  'tok.step3': {
    en: 'The e-mail closes with what lives in the account — OAuth clients, platform tokens and who holds an administrator role — as steps to check in Account Management (out of an environment workflow’s reach).',
    'pt-BR': 'O e-mail fecha com o que mora na conta — clientes OAuth, platform tokens e quem tem papel de administrador — como passos para conferir no Account Management (fora do alcance de um workflow do ambiente).',
  },
  'tok.why': {
    en: 'Disabling a token stays your click in the access tokens page — the workflow never changes one. It is not in the Register: remove it in Workflows.',
    'pt-BR': 'Desativar um token continua sendo o seu clique na página de tokens de acesso — o workflow nunca muda um token. Ele não entra no Registro: remova-o no Workflows.',
  },
  'tok.opened': {
    en: 'The token security workflow is open in Workflows with its daily schedule on: save it there and it runs as you.',
    'pt-BR': 'O workflow de segurança de tokens está aberto no Workflows com a agenda diária ligada: salve lá e ele roda como você.',
  },
  'tok.wf.name': { en: 'Token security agent ({customer})', 'pt-BR': 'Agente de segurança de tokens ({customer})' },
  'tok.wf.description': {
    en: 'Created by PoC Automation 3.0 (PoC Builder): checks the environment’s access tokens and credential vault every day and reports what to disable, with Dynatrace Assist’s reading.',
    'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder): confere todo dia os tokens de acesso e o cofre de credenciais do ambiente e relata o que desativar, com a leitura do Dynatrace Assist.',
  },
  'tok.wf.auditTask': { en: 'Reads the tokens and the credential vault (metadata only) and audits them.', 'pt-BR': 'Lê os tokens e o cofre de credenciais (só metadados) e os audita.' },
  'tok.wf.aiPrompt': {
    en: 'You are a security engineer. Below is an audit of a Dynatrace environment’s access tokens. In up to six short bullets starting with "- ", say which tokens to disable or rotate first and why, the main exposure risk, and one hygiene rule for the team. No emoji, no heading, no note about language support. Answer in English.',
    'pt-BR': 'Você é um engenheiro de segurança. Abaixo está uma auditoria dos tokens de acesso de um ambiente Dynatrace. Em até seis tópicos curtos começando com "- ", diga quais tokens desativar ou rotacionar primeiro e por quê, o principal risco de exposição e uma regra de higiene para o time. Sem emoji, sem título, sem nota sobre o suporte a idiomas. Responda em português do Brasil.',
  },
  'tok.mail.heading': { en: 'Token security — {customer}', 'pt-BR': 'Segurança de tokens — {customer}' },
  'tok.mail.gist': {
    en: '▲ {n} token(s) with findings — {disable} to disable, {rotate} to set an expiry and rotate, {review} to review',
    'pt-BR': '▲ {n} token(s) com achados — {disable} para desativar, {rotate} para definir validade e rotacionar, {review} para revisar',
  },
  'tok.mail.subject': { en: 'Token security ({customer}): {n} finding(s), {disable} to disable', 'pt-BR': 'Segurança de tokens ({customer}): {n} achado(s), {disable} para desativar' },
  'tok.mail.col.kind': { en: 'Kind', 'pt-BR': 'Tipo' },
  'tok.mail.col.total': { en: 'Total', 'pt-BR': 'Total' },
  'tok.mail.col.active': { en: 'Active', 'pt-BR': 'Ativos' },
  'tok.mail.col.noExpiry': { en: 'No expiry', 'pt-BR': 'Sem validade' },
  'tok.mail.col.expiring': { en: 'Expiring ≤ 14 d', 'pt-BR': 'Vencendo ≤ 14 d' },
  'tok.mail.col.unused': { en: 'Unused ≥ 30 d', 'pt-BR': 'Sem uso ≥ 30 d' },
  'tok.mail.col.never': { en: 'Never used', 'pt-BR': 'Nunca usados' },
  'tok.mail.col.broad': { en: 'High privilege', 'pt-BR': 'Alto privilégio' },
  'tok.mail.kind.api': { en: 'API tokens', 'pt-BR': 'Tokens de API' },
  'tok.mail.kind.activeGate': { en: 'ActiveGate tokens', 'pt-BR': 'Tokens de ActiveGate' },
  'tok.mail.personalOf': { en: '{n} personal', 'pt-BR': '{n} pessoais' },
  'tok.mail.findings': { en: 'What to act on', 'pt-BR': 'O que fazer' },
  'tok.mail.col.token': { en: 'Token', 'pt-BR': 'Token' },
  'tok.mail.col.owner': { en: 'Owner', 'pt-BR': 'Dono' },
  'tok.mail.col.lastUsed': { en: 'Last used', 'pt-BR': 'Último uso' },
  'tok.mail.col.expires': { en: 'Expires', 'pt-BR': 'Vence' },
  'tok.mail.col.findings': { en: 'Findings', 'pt-BR': 'Achados' },
  'tok.mail.col.action': { en: 'Recommendation', 'pt-BR': 'Recomendação' },
  'tok.mail.never': { en: 'never', 'pt-BR': 'nunca' },
  'tok.mail.noExpiry': { en: 'no expiry', 'pt-BR': 'sem validade' },
  'tok.mail.more': { en: 'And {n} more.', 'pt-BR': 'E mais {n}.' },
  'tok.mail.vaultHeading': { en: 'Credential vault', 'pt-BR': 'Cofre de credenciais' },
  'tok.mail.vault': {
    en: '{total} credential(s) — {shared} shared beyond their owner. Review who can use each one.',
    'pt-BR': '{total} credencial(is) — {shared} compartilhada(s) além do dono. Revise quem pode usar cada uma.',
  },
  'tok.mail.unread': { en: 'Not readable with the workflow’s permissions: {list}.', 'pt-BR': 'Não legível com as permissões do workflow: {list}.' },
  'tok.mail.account': { en: 'In the account (Account Management)', 'pt-BR': 'Na conta (Account Management)' },
  'tok.mail.account.oauth': {
    en: 'OAuth clients: Identity & access management → OAuth clients — delete the ones the PoC no longer needs and keep their scopes narrow.',
    'pt-BR': 'Clientes OAuth: Identity & access management → OAuth clients — exclua os que a PoC não usa mais e mantenha os escopos estreitos.',
  },
  'tok.mail.account.platform': {
    en: 'Platform tokens: Identity & access management → Platform tokens — every one with an expiry, none left from people who left the PoC.',
    'pt-BR': 'Platform tokens: Identity & access management → Platform tokens — todos com validade, nenhum de quem saiu da PoC.',
  },
  'tok.mail.account.admins': {
    en: 'Administrators: Identity & access management → Groups — who holds an administrator policy, and whether the PoC still needs it.',
    'pt-BR': 'Administradores: Identity & access management → Groups — quem tem uma política de administrador, e se a PoC ainda precisa disso.',
  },
  'tok.mail.account.link': {
    en: 'Account Management: https://myaccount.dynatrace.com/',
    'pt-BR': 'Gestão da conta (Account Management): https://myaccount.dynatrace.com/',
  },
  'tok.mail.method': {
    en: 'Metadata read from the environment’s access tokens and credential vault APIs; a token’s secret is never read. Lines: unused 30 days (disable at 90), expiring within 14 days, never used after 7 days.',
    'pt-BR': 'Metadados lidos das APIs de tokens de acesso e do cofre de credenciais do ambiente; o segredo de um token nunca é lido. Linhas: sem uso há 30 dias (desativar aos 90), vencendo em até 14 dias, nunca usado depois de 7 dias.',
  },
  'tok.mail.footer': { en: 'Read by the PoC Automation 3.0 token security workflow.', 'pt-BR': 'Lido pelo workflow de segurança de tokens do PoC Automation 3.0.' },
  'tok.finding.noExpiry': { en: 'no expiry', 'pt-BR': 'sem validade' },
  'tok.finding.expiring': { en: 'expiring soon', 'pt-BR': 'vencendo logo' },
  'tok.finding.unused': { en: 'unused 30+ days', 'pt-BR': 'sem uso há 30+ dias' },
  'tok.finding.neverUsed': { en: 'never used', 'pt-BR': 'nunca usado' },
  'tok.finding.broad': { en: 'high privilege', 'pt-BR': 'alto privilégio' },
  'tok.kind.api': { en: 'API', 'pt-BR': 'API' },
  'tok.kind.personal': { en: 'Personal', 'pt-BR': 'Pessoal' },
  'tok.kind.activeGate': { en: 'ActiveGate', 'pt-BR': 'ActiveGate' },
  'tok.action.disable': { en: 'Disable', 'pt-BR': 'Desativar' },
  'tok.action.rotate': { en: 'Set an expiry and rotate', 'pt-BR': 'Definir validade e rotacionar' },
  'tok.action.review': { en: 'Review', 'pt-BR': 'Revisar' },

  'help.whatsNew.i125': {
    en: '3.8.3 — The PoC Builder gains a Guardian tab: five Site Reliability Guardians — the PoC’s SLOs, infrastructure performance, services, applications and security (vulnerabilities) —, each created on your click after a confirmation, kept in the Register and removed by the clean-up, and a validation workflow that runs them every day, handed to Workflows. Also: the anomaly detectors’ events name the service’s problem (no longer the PoC), Settings shows the service users by name and the least policy they need, and the capacity workflows always raise a predictive event, titled and described for the customer. And a token security agent: a daily workflow that audits the environment’s access tokens and credential vault and says what to disable, with Dynatrace Assist’s reading.',
    'pt-BR': '3.8.3 — O PoC Builder ganha a aba Guardian: cinco Site Reliability Guardians — as SLOs da PoC, o desempenho da infraestrutura, os serviços, as aplicações e a segurança (vulnerabilidades) —, cada um criado no seu clique depois de uma confirmação, guardado no Registro e removido pela limpeza, e um workflow de validação que os roda todo dia, entregue ao Workflows. E mais: os eventos dos detectores de anomalia nomeiam o problema do serviço (não mais a PoC), as Configurações mostram os usuários de serviço pelo nome e a política mínima de que precisam, e os workflows de capacidade sempre geram um evento preditivo, com título e descrição para o cliente. E um agente de segurança de tokens: um workflow diário que audita os tokens de acesso e o cofre de credenciais do ambiente e diz o que desativar, com a leitura do Dynatrace Assist.',
  },
} satisfies Record<string, Entry>;
