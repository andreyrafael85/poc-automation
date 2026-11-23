import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.13 — the app's consumption moves to Licensing with its expected cost at the public list
 * price, and Settings gains "Prerequisites", a guide to what a PoC needs before it starts. From the owner's
 * requests of 2026-11-19. Merged in `strings.ts`.
 */

export const v3413Strings = {
  // ---------------------------------------------------------------- the expected cost of using the app (Licensing)
  'lic.appcost.title': { en: 'Expected cost of using this app', 'pt-BR': 'Expectativa de custo do uso do app' },
  'lic.appcost.caption': {
    en: 'What the app’s own reads are expected to cost at the public list price of queries — one full visit (every page once), the PoC team for a day and the whole PoC — from this tenant’s log volume. The lower figure leaves out the Dynatrace Intelligence problems, queried at no charge with Full-Stack Monitoring; the upper one prices every GiB read.',
    'pt-BR': 'Quanto as leituras do próprio app devem custar ao preço público de lista das consultas — uma visita completa (cada página uma vez), o time da PoC num dia e a PoC inteira — a partir do volume de logs deste tenant. O valor menor deixa de fora os problemas da Dynatrace Intelligence, consultados sem custo com o Full-Stack Monitoring; o maior precifica cada GiB lido.',
  },
  'lic.appcost.unread': {
    en: 'Available as soon as this tenant’s log volume is read (billing events, 0 bytes).',
    'pt-BR': 'Disponível assim que o volume de logs deste tenant for lido (eventos de cobrança, 0 byte).',
  },
  'lic.appcost.visit': { en: 'One full visit', 'pt-BR': 'Uma visita completa' },
  'lic.appcost.visitCalc': { en: '≈ {gib} GiB read, {billable} GiB of them billable', 'pt-BR': '≈ {gib} GiB lidos, {billable} GiB deles cobráveis' },
  'lic.appcost.day': { en: 'One day of the PoC team', 'pt-BR': 'Um dia do time da PoC' },
  'lic.appcost.dayCalc': {
    en: '{people} people × {visits} full visit(s) a day each (assumptions register)',
    'pt-BR': '{people} pessoas × {visits} visita(s) completa(s) por dia cada (registro de premissas)',
  },
  'lic.appcost.poc': { en: 'The whole PoC ({days} days)', 'pt-BR': 'A PoC inteira ({days} dias)' },
  'lic.appcost.pocCalc': { en: '{visits} full visits, ≈ {gib} GiB read', 'pt-BR': '{visits} visitas completas, ≈ {gib} GiB lidos' },
  'lic.appcost.session': { en: 'This session so far, at most', 'pt-BR': 'Esta sessão até agora, no máximo' },
  'lic.appcost.sessionCalc': {
    en: '{gib} GiB read in {reads} answers, every GiB at the query price',
    'pt-BR': '{gib} GiB lidos em {reads} respostas, cada GiB ao preço de consulta',
  },
  'lic.appcost.logsBilled': {
    en: 'Log queries were billed in this window: here logs are read pay-per-query, as priced above.',
    'pt-BR': 'Houve consultas de log cobradas nesta janela: aqui os logs são lidos por consulta, como no cálculo acima.',
  },
  'lic.appcost.logsIncluded': {
    en: 'No log query was billed in this window: the logs may be kept with “Retain with included queries”, which reads them at no charge — the cost then sits at the lower figure or below it.',
    'pt-BR': 'Nenhuma consulta de log foi cobrada nesta janela: os logs podem estar retidos com “Retain with included queries”, que os lê sem custo — então o custo fica no valor menor ou abaixo dele.',
  },
  'lic.appcost.logsUnknown': {
    en: 'Whether logs are billed per query here could not be read in this window.',
    'pt-BR': 'Nesta janela ainda não foi possível ler se os logs são cobrados por consulta.',
  },
  'lic.appcost.disclaimer': {
    en: 'An expectation at the public list price ({price} per GiB read by Log, Events and Traces queries), not a quote. In DPS it comes out of the customer’s annual commitment, not a separate bill. The visit is the one measured on the lab tenant, its log part scaled by this tenant’s logs per hour; the team’s use is in the assumptions register.',
    'pt-BR': 'Uma expectativa ao preço público de lista ({price} por GiB lido por consultas de Log, Events e Traces), não uma cotação. Em DPS, sai do compromisso anual do cliente, não de uma fatura à parte. A visita é a medida no tenant de laboratório, com a parte de logs ajustada aos logs por hora deste tenant; o uso do time está no registro de premissas.',
  },
  'lic.consumption.toCost': {
    en: 'What these reads are expected to cost at the public list price — per visit, per day and for the whole PoC — is in the cost projection.',
    'pt-BR': 'Quanto essas leituras devem custar ao preço público de lista — por visita, por dia e na PoC inteira — está na projeção de custo.',
  },
  'lic.consumption.toCostButton': { en: 'See the expected cost', 'pt-BR': 'Ver a expectativa de custo' },

  'assumption.consumption.poc.people': { en: 'PoC: people using the app', 'pt-BR': 'PoC: pessoas usando o app' },
  'assumption.consumption.poc.people.basis': { en: 'The SE and the partner.', 'pt-BR': 'O SE e o parceiro.' },
  'assumption.consumption.poc.visitsPerDay': { en: 'PoC: full visits a day per person', 'pt-BR': 'PoC: visitas completas por dia por pessoa' },
  'assumption.consumption.poc.visitsPerDay.basis': { en: 'About one tour of every page a day.', 'pt-BR': 'Cerca de uma volta por todas as páginas por dia.' },
  'assumption.consumption.poc.days': { en: 'PoC: days', 'pt-BR': 'PoC: dias' },
  'assumption.consumption.poc.days.basis': { en: 'A typical PoC of 30 days.', 'pt-BR': 'Uma PoC típica de 30 dias.' },

  // ---------------------------------------------------------------- Settings → Prerequisites
  'settings.tab.prerequisites': { en: 'Prerequisites', 'pt-BR': 'Pré-requisitos' },
  'prq.title': { en: 'What a PoC needs before day one', 'pt-BR': 'O que uma PoC precisa antes do primeiro dia' },
  'prq.intro': {
    en: 'A guide for the SE and the partner to agree, with the customer’s network, security and platform teams, what must be ready before the PoC starts on Dynatrace SaaS. Every line comes from Dynatrace’s documentation and links to its page — the page is always the reference, as the product evolves.',
    'pt-BR': 'Um guia para o SE e o parceiro combinarem, com os times de rede, segurança e plataforma do cliente, o que precisa estar pronto antes de a PoC começar no Dynatrace SaaS. Cada linha vem da documentação da Dynatrace e leva à sua página — a página é sempre a referência, já que o produto evolui.',
  },
  'prq.when': {
    en: 'Share it one or two weeks before the kick-off: firewall changes and restart windows usually take that long to schedule.',
    'pt-BR': 'Compartilhe uma ou duas semanas antes do kick-off: mudanças de firewall e janelas de reinício costumam levar esse tempo para agendar.',
  },
  'prq.download': { en: 'Download the checklist', 'pt-BR': 'Baixar o checklist' },
  'prq.download.hint': {
    en: 'A text file with every line and its documentation link, to send to the customer.',
    'pt-BR': 'Um arquivo de texto com cada linha e o seu link da documentação, para enviar ao cliente.',
  },
  'prq.readDocs': { en: 'In the documentation:', 'pt-BR': 'Na documentação:' },
  'prq.source': {
    en: 'Read on docs.dynatrace.com on 2026-11-19. Where a figure differs from older slides, the documentation wins.',
    'pt-BR': 'Lido em docs.dynatrace.com em 2026-11-19. Quando um número difere de slides antigos, vale a documentação.',
  },

  'prq.diagram.title': { en: 'How the data reaches Dynatrace SaaS', 'pt-BR': 'Como os dados chegam ao Dynatrace SaaS' },
  'prq.diagram.caption': {
    en: 'Every connection starts inside your network and goes out over TLS: OneAgent talks to an Environment ActiveGate on port 9999 when you have one; the ActiveGate — or OneAgent directly — reaches your Dynatrace SaaS environment on port 443; your users’ browsers send the Real User Monitoring beacons to the same environment. No connection from outside has to come into your network.',
    'pt-BR': 'Toda conexão parte da sua rede e sai por TLS: o OneAgent fala com um Environment ActiveGate na porta 9999, quando houver um; o ActiveGate — ou o próprio OneAgent — chega ao seu ambiente Dynatrace SaaS na porta 443; os navegadores dos seus usuários enviam os beacons do Real User Monitoring para o mesmo ambiente. Nenhuma conexão de fora precisa entrar na sua rede.',
  },
  'prq.diagram.aria': {
    en: 'Connectivity diagram: your hosts with OneAgent connect to an optional Environment ActiveGate on port 9999; the ActiveGate, or OneAgent directly, connects to your Dynatrace SaaS environment on port 443; your users’ browsers send Real User Monitoring beacons.',
    'pt-BR': 'Diagrama de conectividade: os seus servidores com OneAgent se conectam a um Environment ActiveGate opcional na porta 9999; o ActiveGate, ou o próprio OneAgent, se conecta ao seu ambiente Dynatrace SaaS na porta 443; os navegadores dos seus usuários enviam os beacons do Real User Monitoring.',
  },
  'prq.diagram.hosts': {
    en: 'Your hosts',
    'pt-BR': 'Seus servidores',
  },
  'prq.diagram.oneagent': { en: 'OneAgent', 'pt-BR': 'OneAgent' },
  'prq.diagram.activegate': { en: 'Environment ActiveGate', 'pt-BR': 'Environment ActiveGate' },
  'prq.diagram.optional': {
    en: 'optional · one way out',
    'pt-BR': 'opcional · um único ponto de saída',
  },
  'prq.diagram.cluster': {
    en: 'Dynatrace SaaS',
    'pt-BR': 'Dynatrace SaaS',
  },
  'prq.diagram.browsers': {
    en: 'Your users’ browsers',
    'pt-BR': 'Navegadores dos seus usuários',
  },
  'prq.diagram.beacon': {
    en: 'Real User Monitoring beacons',
    'pt-BR': 'beacons do Real User Monitoring',
  },
  'prq.diagram.direct': {
    en: 'direct, without an ActiveGate',
    'pt-BR': 'direto, sem ActiveGate',
  },
  'prq.diagram.network': {
    en: 'Your network',
    'pt-BR': 'Sua rede',
  },
  'prq.diagram.firewall': { en: 'Firewall', 'pt-BR': 'Firewall' },

  'prq.network.title': { en: 'Network and firewall', 'pt-BR': 'Rede e firewall' },
  'prq.network.who': {
    en: 'Your network and security teams',
    'pt-BR': 'Seus times de rede e segurança',
  },
  'prq.network.443': {
    en: 'Outbound HTTPS on port 443 from your hosts (or from the ActiveGate) to your Dynatrace SaaS environment; the network must allow SSL/TLS.',
    'pt-BR': 'HTTPS de saída na porta 443, dos seus servidores (ou do ActiveGate) para o seu ambiente Dynatrace SaaS; a rede precisa permitir SSL/TLS.',
  },
  'prq.network.9999': {
    en: 'With an Environment ActiveGate, your OneAgents connect to it on port 9999 and only the ActiveGate goes out — one exit point instead of opening the firewall for every host.',
    'pt-BR': 'Com um Environment ActiveGate, os seus OneAgents se conectam a ele na porta 9999 e só o ActiveGate sai — um único ponto de saída em vez de abrir o firewall para cada servidor.',
  },
  'prq.network.allowlist': {
    en: 'The Dynatrace addresses to allow are listed on the OneAgent installation page and at the bottom of the ActiveGate installation page of your environment — see “Where to find the addresses to allow”.',
    'pt-BR': 'Os endereços da Dynatrace a liberar aparecem na página de instalação do OneAgent e no rodapé da página de instalação do ActiveGate do seu ambiente — veja “Onde encontrar os endereços a liberar”.',
  },
  'prq.network.proxy': {
    en: 'If traffic goes out through a proxy: the OneAgent installer accepts --set-proxy=host:port (and reads the system-wide proxy); for the ActiveGate, the proxy goes in the [http.client] section of custom.properties.',
    'pt-BR': 'Se a saída passa por um proxy: o instalador do OneAgent aceita --set-proxy=host:porta (e lê o proxy do sistema); no ActiveGate, o proxy fica na seção [http.client] do custom.properties.',
  },
  'prq.network.tls': {
    en: 'If your proxy inspects TLS and replaces the server certificate, add the proxy’s CA chain as custom-proxy.pem in the OneAgent customkeys folder so the connection check passes.',
    'pt-BR': 'Se o seu proxy inspeciona o TLS e troca o certificado do servidor, coloque a cadeia de CA do proxy como custom-proxy.pem na pasta customkeys do OneAgent, para a checagem de conexão passar.',
  },
  'prq.network.k8s': {
    en: 'Kubernetes: the Operator, OneAgent and ActiveGate go out on TCP 443 (and 9999 to the ActiveGate), DNS on 53; the webhook takes TCP 8443 from the kube-apiserver.',
    'pt-BR': 'Kubernetes: o Operator, o OneAgent e o ActiveGate saem por TCP 443 (e 9999 para o ActiveGate), DNS na 53; o webhook recebe TCP 8443 do kube-apiserver.',
  },

  'prq.activegate.title': {
    en: 'ActiveGate, when you need one',
    'pt-BR': 'ActiveGate, quando for preciso',
  },
  'prq.activegate.who': {
    en: 'Your infrastructure team',
    'pt-BR': 'Seu time de infraestrutura',
  },
  'prq.activegate.when': {
    en: 'You need one to route many hosts through a single exit point, and for Kubernetes/OpenShift, Azure, Cloud Foundry, AWS above 2,000 resources, VMware vCenter, extensions and private Synthetic locations.',
    'pt-BR': 'É preciso para levar muitos servidores por uma única saída e para Kubernetes/OpenShift, Azure, Cloud Foundry, AWS acima de 2.000 recursos, VMware vCenter, extensões e locais privados de Synthetic.',
  },
  'prq.activegate.machine': {
    en: 'A machine dedicated to the ActiveGate, Linux or Windows on x86-64: at least 2 GB of RAM (4 GB recommended) and a dual-core CPU; root or administrator rights to install.',
    'pt-BR': 'Uma máquina só para o ActiveGate, Linux ou Windows em x86-64: ao menos 2 GB de RAM (4 GB recomendados) e uma CPU dual-core; root ou administrador para instalar.',
  },
  'prq.activegate.disk': {
    en: 'Disk on Linux: 4 GB for installation, configuration and logs, 4 GB for cached installers and images, and 600 MB plus a 1.5 GB buffer for extensions.',
    'pt-BR': 'Disco no Linux: 4 GB para instalação, configuração e logs, 4 GB para instaladores e imagens em cache, e 600 MB mais uma folga de 1,5 GB para extensões.',
  },
  'prq.activegate.sizing': {
    en: 'For routing OneAgents: 2 vCPU / 3.75 GiB serve about 800 hosts, 4 vCPU / 7.5 GiB about 1,800, 8 vCPU / 15 GiB about 2,500 — keeping CPU under 50% and memory under 80%.',
    'pt-BR': 'Para rotear OneAgents: 2 vCPU / 3,75 GiB atendem cerca de 800 hosts, 4 vCPU / 7,5 GiB cerca de 1.800, 8 vCPU / 15 GiB cerca de 2.500 — mantendo CPU abaixo de 50% e memória abaixo de 80%.',
  },
  'prq.activegate.order': {
    en: 'Install the ActiveGate before you download the OneAgent installer, so your OneAgents find it without being reinstalled.',
    'pt-BR': 'Instale o ActiveGate antes de baixar o instalador do OneAgent, para que os seus OneAgents o encontrem sem precisar reinstalar.',
  },

  'prq.oneagent.title': {
    en: 'OneAgent on your hosts',
    'pt-BR': 'OneAgent nos seus servidores',
  },
  'prq.oneagent.who': {
    en: 'Your server and application teams',
    'pt-BR': 'Seus times de servidores e de aplicação',
  },
  'prq.oneagent.rights': {
    en: 'Administrator or root rights to install: on Linux only to start the installation (it then runs non-privileged); on Windows for installation and operation.',
    'pt-BR': 'Direitos de administrador ou root para instalar: no Linux, só para iniciar a instalação (depois roda sem privilégios); no Windows, para instalar e operar.',
  },
  'prq.oneagent.memory': {
    en: 'Memory to install: at least 256 MB free on Linux, 200 MB of RAM on Windows; plan about 200 MB more per monitored process (most use under 100 MB).',
    'pt-BR': 'Memória para instalar: ao menos 256 MB livres no Linux, 200 MB de RAM no Windows; planeje cerca de 200 MB a mais por processo monitorado (a maioria usa menos de 100 MB).',
  },
  'prq.oneagent.disk': {
    en: 'Disk: about 11.5 GB in total with logs, data and updates (Linux x86 and Windows); the installation itself is about 1.3 GB on Linux and 775 MB on Windows.',
    'pt-BR': 'Disco: cerca de 11,5 GB no total, com logs, dados e atualizações (Linux x86 e Windows); a instalação em si ocupa cerca de 1,3 GB no Linux e 775 MB no Windows.',
  },
  'prq.oneagent.support': {
    en: 'Check your operating systems and the technologies you want monitored on the technology support pages; on x86-64 the CPU needs the x86-64-v2 microarchitecture.',
    'pt-BR': 'Confira os seus sistemas operacionais e as tecnologias a monitorar nas páginas de suporte a tecnologias; em x86-64 a CPU precisa da microarquitetura x86-64-v2.',
  },
  'prq.oneagent.restart': {
    en: 'Plan a restart window: OneAgent does not inject into processes that are already running, so each process you want monitored in depth is restarted once. For the proof of concept, use the Full-Stack monitoring mode.',
    'pt-BR': 'Planeje uma janela de reinício: o OneAgent não se injeta em processos já em execução, então cada processo a monitorar em profundidade é reiniciado uma vez. Na prova de conceito, use o modo Full-Stack.',
  },
  'prq.oneagent.coexist': {
    en: 'Other agents: some APM agents are not supported in the same process (for example SAP Introscope in the same JVM) — check each one with your Dynatrace contact; ask your antivirus to trust the OneAgent folder.',
    'pt-BR': 'Outros agentes: alguns agentes de APM não são suportados no mesmo processo (por exemplo, SAP Introscope na mesma JVM) — confira cada um com o seu contato na Dynatrace; peça ao antivírus para confiar na pasta do OneAgent.',
  },

  'prq.rum.title': { en: 'Real User Monitoring (web)', 'pt-BR': 'Real User Monitoring (web)' },
  'prq.rum.who': {
    en: 'Your web, CDN and security teams',
    'pt-BR': 'Seus times de web, CDN e segurança',
  },
  'prq.rum.passThrough': {
    en: 'Your firewalls, proxies, load balancers, CDNs and web servers let the Real User Monitoring requests, headers and cookies pass unchanged.',
    'pt-BR': 'Os seus firewalls, proxies, balanceadores, CDNs e servidores web deixam passar sem alteração as requisições, os cabeçalhos e os cookies do Real User Monitoring.',
  },
  'prq.rum.code': {
    en: 'The monitoring code comes from js-cdn.dynatrace.com (agentless) or from the application server (auto-injection); beacons are POST text/plain and their query string is never altered.',
    'pt-BR': 'O código de monitoramento vem de js-cdn.dynatrace.com (sem agente) ou do servidor da aplicação (injeção automática); os beacons são POST text/plain e a query string nunca é alterada.',
  },
  'prq.rum.headers': {
    en: 'Headers x-dtc, x-dtpc, x-dtreferer and x-dynatrace-application, and cookies such as dtCookie, dtPC and rxVisitor, reach Dynatrace; responses that set dtCookie are never cached.',
    'pt-BR': 'Os cabeçalhos x-dtc, x-dtpc, x-dtreferer e x-dynatrace-application e cookies como dtCookie, dtPC e rxVisitor chegam à Dynatrace; respostas que definem dtCookie nunca vão para cache.',
  },
  'prq.rum.csp': {
    en: 'With a Content Security Policy: script-src allows \'self\' or https://js-cdn.dynatrace.com and connect-src the beacon endpoint; nonces and hashes are not supported (use SRI).',
    'pt-BR': 'Com Content Security Policy: o script-src permite \'self\' ou https://js-cdn.dynatrace.com e o connect-src o endpoint de beacon; nonces e hashes não são suportados (use SRI).',
  },

  'prq.access.title': { en: 'Access and accounts', 'pt-BR': 'Acessos e contas' },
  'prq.access.who': {
    en: 'Your Dynatrace environment administrator',
    'pt-BR': 'O administrador do seu ambiente Dynatrace',
  },
  'prq.access.token': {
    en: 'A token to download the installers (scope “Download OneAgent and ActiveGate installers”) — it is shown only once, so keep it in a safe place.',
    'pt-BR': 'Um token para baixar os instaladores (escopo “Download OneAgent and ActiveGate installers”) — ele aparece uma vez só, então guarde-o em lugar seguro.',
  },
  'prq.access.permissions': {
    en: 'Whoever installs needs the “Install OneAgent” permission, and “Manage monitoring settings” to change settings.',
    'pt-BR': 'Quem instala precisa da permissão “Install OneAgent”, e de “Manage monitoring settings” para mudar configurações.',
  },
  'prq.access.hostTeams': {
    en: 'Your host teams have administrator rights and the credentials to restart the application services; on Windows, also to change the firewall.',
    'pt-BR': 'Os times dos seus servidores têm direitos de administrador e as credenciais para reiniciar os serviços da aplicação; no Windows, também para mudar o firewall.',
  },
  'prq.access.k8s': {
    en: 'Kubernetes: two platform tokens on a service user — Operator and Data Ingest — granted by an account administrator.',
    'pt-BR': 'Kubernetes: dois tokens de plataforma num usuário de serviço — Operator e Data Ingest — concedidos por um administrador da conta.',
  },

  'prq.ips.title': { en: 'Where to find the addresses to allow', 'pt-BR': 'Onde encontrar os endereços a liberar' },
  'prq.ips.caption': {
    en: 'With a strict firewall policy, your own Dynatrace environment lists the addresses your hosts need to reach. They differ from one environment to another, so always take them from your installation page.',
    'pt-BR': 'Com uma política de firewall restrita, o seu próprio ambiente Dynatrace lista os endereços que os seus servidores precisam alcançar. Eles mudam de um ambiente para outro, por isso pegue-os sempre na sua página de instalação.',
  },
  'prq.ips.step1': {
    en: 'In your Dynatrace environment, open Discovery & Coverage → Install → Install OneAgent.',
    'pt-BR': 'No seu ambiente Dynatrace, abra Discovery & Coverage → Install → Install OneAgent.',
  },
  'prq.ips.step2': {
    en: 'Choose Linux or Windows: the installation page gives the remote Dynatrace addresses to add to the allow list.',
    'pt-BR': 'Escolha Linux ou Windows: a página de instalação traz os endereços remotos da Dynatrace a incluir na lista de liberação.',
  },
  'prq.ips.step3': {
    en: 'For an ActiveGate (Dynatrace Hub → ActiveGate → Set up), the addresses are in the footer of its installation page.',
    'pt-BR': 'Para um ActiveGate (Dynatrace Hub → ActiveGate → Set up), os endereços ficam no rodapé da página de instalação.',
  },
  'prq.ips.step4': {
    en: 'Or through the API: GET /api/v1/deployment/installer/agent/connectioninfo on your environment returns the communication endpoints, highest priority first.',
    'pt-BR': 'Ou pela API: GET /api/v1/deployment/installer/agent/connectioninfo no seu ambiente devolve os endpoints de comunicação, do mais prioritário ao menos.',
  },
  'prq.ips.mock.title': { en: 'Install OneAgent · Linux', 'pt-BR': 'Install OneAgent · Linux' },
  'prq.ips.mock.steps': { en: 'Download the installer · Run it on the host · Restart the processes', 'pt-BR': 'Baixe o instalador · Rode no host · Reinicie os processos' },
  'prq.ips.mock.box': { en: 'Addresses to allow in the firewall', 'pt-BR': 'Endereços a liberar no firewall' },
  'prq.ips.mock.example': {
    en: 'Drawing for orientation: the addresses shown are documentation examples (RFC 5737), not Dynatrace’s.',
    'pt-BR': 'Desenho para orientação: os endereços mostrados são exemplos de documentação (RFC 5737), não os da Dynatrace.',
  },
  'prq.ips.mock.aria': {
    en: 'Example drawing of an installation page with the box of addresses to allow highlighted.',
    'pt-BR': 'Desenho de exemplo de uma página de instalação com o quadro de endereços a liberar em destaque.',
  },
  'prq.ips.noteTitle': { en: 'The account’s IP allowlist is another list', 'pt-BR': 'A lista de IPs da conta é outra lista' },
  'prq.ips.note': {
    en: 'The account’s IP allowlist only limits who reaches the web UI and the API; it does not affect OneAgent or ActiveGate traffic.',
    'pt-BR': 'A lista de IPs permitidos da conta só limita quem acessa a interface web e a API; ela não afeta o tráfego do OneAgent nem do ActiveGate.',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i86': {
    en: '3.4.13 — App consumption is now a Licensing tab, and the cost projection says what using this app is expected to cost at the public list price: one full visit, a day of the PoC team and the whole PoC, plus this session so far. Settings gains “Prerequisites”: what a Dynatrace SaaS PoC needs before day one — network and firewall, ActiveGate, OneAgent, Real User Monitoring and access — with a connectivity drawing, where to find the addresses to allow, every line linked to its documentation page, and a checklist to download.',
    'pt-BR': '3.4.13 — O consumo do app agora é uma guia do Licenciamento, e a projeção de custo diz quanto o uso do app deve custar ao preço público de lista: uma visita completa, um dia do time da PoC e a PoC inteira, mais esta sessão até agora. As Configurações ganham “Pré-requisitos”: o que uma PoC no Dynatrace SaaS precisa antes do primeiro dia — rede e firewall, ActiveGate, OneAgent, Real User Monitoring e acessos — com um desenho da conectividade, onde encontrar os endereços a liberar, cada linha ligada à sua página da documentação e um checklist para baixar.',
  },
} satisfies Record<string, Entry>;
