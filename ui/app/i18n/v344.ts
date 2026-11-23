import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.4 — Platform adoption: how people use the Dynatrace platform, from the "Dynatrace
 * Intelligence feature adoption" and "Dynatrace Platform Adoption" (DPA) v1.5.0 dashboards (owner's order of
 * 2026-11-18, a page of its own). Merged in `strings.ts`.
 */

export const v344Strings = {
  'nav.adoption': { en: 'Platform adoption', 'pt-BR': 'Adoção da plataforma' },
  'adopt.title': { en: 'Platform adoption', 'pt-BR': 'Adoção da plataforma' },
  'adopt.question': {
    en: 'How do people use the Dynatrace platform here — how many, how often, which apps, and how much of it is AI-assisted?',
    'pt-BR': 'Como as pessoas usam a plataforma Dynatrace aqui — quantas, com que frequência, quais apps e quanto disso é assistido por IA?',
  },
  'adopt.takeaway': {
    en: 'Adoption read from the platform’s own activity over the last 30 days: users are counted, never named, and the Dynatrace team’s own use is shown apart.',
    'pt-BR': 'Adoção lida da própria atividade da plataforma nos últimos 30 dias: os usuários são contados, nunca nomeados, e o uso da própria equipe Dynatrace aparece à parte.',
  },

  // band
  'adopt.band.users': { en: 'Active users', 'pt-BR': 'Usuários ativos' },
  'adopt.band.usersDetail': { en: 'of the Dynatrace organisation: {dynatrace}', 'pt-BR': 'da organização Dynatrace: {dynatrace}' },
  'adopt.band.apps': { en: 'Apps in use', 'pt-BR': 'Apps em uso' },
  'adopt.band.dau': { en: 'Daily active users', 'pt-BR': 'Usuários ativos por dia' },
  'adopt.band.dauDetail': { en: 'average over {days} days with activity', 'pt-BR': 'média de {days} dias com atividade' },
  'adopt.band.stickiness': { en: 'Stickiness', 'pt-BR': 'Aderência' },
  'adopt.band.stickinessCalc': { en: 'Daily active users ÷ active users of the period', 'pt-BR': 'Usuários ativos por dia ÷ usuários ativos do período' },
  'adopt.band.api': { en: 'API calls', 'pt-BR': 'Chamadas de API' },
  'adopt.band.apiDetail': { en: 'beside {actions} actions in the browser', 'pt-BR': 'ao lado de {actions} ações no navegador' },
  'adopt.band.ai': { en: 'Dynatrace Intelligence', 'pt-BR': 'Dynatrace Intelligence' },
  'adopt.band.aiDetail': { en: 'invocations · users: {users}', 'pt-BR': 'invocações · usuários: {users}' },
  'adopt.band.footnote': {
    en: 'Read from the platform’s audit and AI events, {window}. Each figure opens its query.',
    'pt-BR': 'Lido dos eventos de auditoria e de IA da plataforma, {window}. Cada número abre a sua consulta.',
  },

  // index
  'adopt.index.title': { en: 'Adoption index', 'pt-BR': 'Índice de adoção' },
  'adopt.index.caption': {
    en: 'After the Dynatrace Platform Adoption (DPA) method: seven parts, each worth points up to its target, with the targets in Help → Assumptions. It measures use, not value.',
    'pt-BR': 'Segundo o método do Dynatrace Platform Adoption (DPA): sete partes, cada uma valendo pontos até a sua meta, com as metas em Ajuda → Premissas. Mede uso, não valor.',
  },
  'adopt.index.ring': { en: 'Adoption', 'pt-BR': 'Adoção' },
  'adopt.index.ringCaption': { en: 'points of 100, DPA method', 'pt-BR': 'pontos de 100, método DPA' },
  'adopt.index.aria': { en: 'Adoption index, 0 to 100', 'pt-BR': 'Índice de adoção, de 0 a 100' },
  'adopt.index.calc': { en: 'Sum of seven parts, each up to its points (DPA method)', 'pt-BR': 'Soma de sete partes, cada uma até os seus pontos (método DPA)' },
  'adopt.index.points': { en: 'up to {max} pts', 'pt-BR': 'até {max} pts' },
  'adopt.index.line': { en: 'measured {value} · target {target}', 'pt-BR': 'medido {value} · meta {target}' },
  'adopt.dpa.users': { en: 'Active users', 'pt-BR': 'Usuários ativos' },
  'adopt.dpa.apps': { en: 'Breadth of apps', 'pt-BR': 'Amplitude de apps' },
  'adopt.dpa.aiVolume': { en: 'Dynatrace Intelligence calls', 'pt-BR': 'Chamadas à Dynatrace Intelligence' },
  'adopt.dpa.aiQuality': { en: 'Dynatrace Intelligence analyzers', 'pt-BR': 'Analyzers da Dynatrace Intelligence' },
  'adopt.dpa.api': { en: 'API and automation', 'pt-BR': 'API e automação' },
  'adopt.dpa.stickiness': { en: 'Stickiness', 'pt-BR': 'Aderência' },
  'adopt.dpa.power': { en: 'Power users (7+ apps)', 'pt-BR': 'Usuários avançados (7+ apps)' },

  // lists
  'adopt.apps.title': { en: 'Dynatrace apps in use', 'pt-BR': 'Apps Dynatrace em uso' },
  'adopt.apps.caption': {
    en: 'By distinct users, the 10 most used. Custom apps in use beside them: {custom}.',
    'pt-BR': 'Por usuários distintos, os 10 mais usados. Apps próprios em uso além deles: {custom}.',
  },
  'adopt.apps.value': { en: 'users: {users} · actions: {actions}', 'pt-BR': 'usuários: {users} · ações: {actions}' },
  'adopt.breadth.title': { en: 'How broadly people use the platform', 'pt-BR': 'Com que amplitude as pessoas usam a plataforma' },
  'adopt.breadth.caption': { en: 'Users by how many distinct apps they opened.', 'pt-BR': 'Usuários pela quantidade de apps distintos que abriram.' },
  'adopt.breadth.1': { en: '1 app', 'pt-BR': '1 app' },
  'adopt.breadth.2-3': { en: '2 to 3 apps', 'pt-BR': '2 a 3 apps' },
  'adopt.breadth.4-6': { en: '4 to 6 apps', 'pt-BR': '4 a 6 apps' },
  'adopt.breadth.7+': { en: '7 apps or more', 'pt-BR': '7 apps ou mais' },
  'adopt.none': { en: 'Nothing read in this window yet.', 'pt-BR': 'Ainda sem leitura nesta janela.' },
  'adopt.unread': { en: 'Not readable with this identity.', 'pt-BR': 'Sem leitura com esta identidade.' },

  // AI
  'adopt.ai.title': { en: 'Dynatrace Intelligence in daily use', 'pt-BR': 'Dynatrace Intelligence no dia a dia' },
  'adopt.ai.caption': {
    en: 'Assist, natural-language queries and explanations: how much they are used, by how many people and how often they succeed.',
    'pt-BR': 'Assist, consultas em linguagem natural e explicações: quanto são usados, por quantas pessoas e com que taxa de sucesso.',
  },
  'adopt.ai.summary': {
    en: 'Invocations: {invocations}; succeeded: {pct}%; users: {users}; skills used: {skills}.',
    'pt-BR': 'Invocações: {invocations}; com sucesso: {pct}%; usuários: {users}; skills usados: {skills}.',
  },
  'adopt.ai.none': { en: 'No Dynatrace Intelligence use in the window yet.', 'pt-BR': 'Ainda sem uso da Dynatrace Intelligence na janela.' },
  'adopt.ai.noFeedback': { en: 'No feedback (👍/👎) given yet.', 'pt-BR': 'Ainda sem feedback (👍/👎).' },
  'adopt.ai.feedback': { en: 'Feedback given — positive: {positive}; negative: {negative}.', 'pt-BR': 'Feedback dado — positivo: {positive}; negativo: {negative}.' },
  'adopt.ai.davis': { en: 'Calls to Dynatrace Intelligence: {davis}; to its analyzers: {analyzers}.', 'pt-BR': 'Chamadas à Dynatrace Intelligence: {davis}; aos analyzers: {analyzers}.' },
  'adopt.skills.value': { en: '{invocations} · {pct}% ok · users: {users}', 'pt-BR': '{invocations} · {pct}% ok · usuários: {users}' },
  'adopt.skill.chat': { en: 'Assist chat', 'pt-BR': 'Chat do Assist' },
  'adopt.skill.operator': { en: 'Assist operator', 'pt-BR': 'Operador do Assist' },
  'adopt.skill.nl2dql': { en: 'Natural language to DQL', 'pt-BR': 'Linguagem natural para DQL' },
  'adopt.skill.dql2nl': { en: 'DQL explained', 'pt-BR': 'DQL explicada' },
  'adopt.skill.documentSearch': { en: 'Document search', 'pt-BR': 'Busca em documentos' },

  // privacy and method
  'adopt.privacy.title': { en: 'No one is named', 'pt-BR': 'Ninguém é nomeado' },
  'adopt.privacy.body': {
    en: 'Every figure here is a count. The queries count user ids and e-mails but never return them, and the use by the Dynatrace organisation (in a customer’s environment: the SE and the partner) is shown apart.',
    'pt-BR': 'Todo número aqui é uma contagem. As consultas contam ids e e-mails de usuários, mas nunca os devolvem, e o uso da organização Dynatrace (num ambiente de cliente: o SE e o parceiro) aparece à parte.',
  },
  'adopt.method.body': {
    en: 'Eight reads of the platform’s own events (audit, AI and query activity) over the last 30 days, through the app’s query catalogue. The adoption index follows the DPA method with its targets in Help → Assumptions; a part whose read did not answer leaves the index unshown.',
    'pt-BR': 'Oito leituras dos próprios eventos da plataforma (auditoria, IA e consultas) dos últimos 30 dias, pelo catálogo de consultas do app. O índice de adoção segue o método DPA com as metas em Ajuda → Premissas; uma parte cuja leitura não respondeu deixa o índice sem número.',
  },

  // catalog purposes (the English text is the catalog entry's own purpose)
  'catalog.purpose.adopt.platform.total': {
    en: "How the platform is used by people and by integrations: distinct users in the browser (and how many of them belong to the Dynatrace organisation), distinct apps opened, browser actions, API calls and calls to Dynatrace Intelligence and its analyzers. Counted only; no user is named.",
    'pt-BR': "Como a plataforma é usada por pessoas e integrações: usuários distintos no navegador (e quantos são da organização Dynatrace), apps distintos abertos, ações no navegador, chamadas de API e à Dynatrace Intelligence e seus analyzers. Somente contagens; nenhum usuário é nomeado.",
  },
  'catalog.purpose.adopt.platform.daily': {
    en: "Distinct browser users per day, averaged over the days with activity, so stickiness (daily ÷ monthly users) is a measured ratio. Counted only; no user is named.",
    'pt-BR': "Usuários distintos no navegador por dia, em média nos dias com atividade, para que a aderência (diários ÷ mensais) seja uma razão medida. Somente contagens; nenhum usuário é nomeado.",
  },
  'catalog.purpose.adopt.platform.apps': {
    en: "Every app opened in the browser, with its actions and distinct users, so the page shows which parts of the platform the teams use. The list is bounded by the apps installed, not cut. Counted only; no user is named.",
    'pt-BR': "Cada app aberto no navegador, com as ações e os usuários distintos, para a página mostrar quais partes da plataforma os times usam. A lista é limitada pelos apps instalados, sem corte. Somente contagens; nenhum usuário é nomeado.",
  },
  'catalog.purpose.adopt.platform.breadth': {
    en: "How many distinct apps each user opened, grouped 1, 2–3, 4–6 and 7 or more, so the page shows how broadly people use the platform; 7 or more is a power user in the DPA method. Counted only; no user is named.",
    'pt-BR': "Quantos apps distintos cada usuário abriu, em faixas de 1, 2–3, 4–6 e 7 ou mais, para mostrar com que amplitude a plataforma é usada; 7 ou mais é um usuário avançado no método DPA. Somente contagens; nenhum usuário é nomeado.",
  },
  'catalog.purpose.adopt.ai.total': {
    en: "How much the teams use Dynatrace Intelligence (Assist, natural-language queries, explanations): invocations, how many succeeded, failed or were blocked, how many distinct users and skills, and the feedback given. Counted only; no user is named.",
    'pt-BR': "Quanto os times usam a Dynatrace Intelligence (Assist, consultas em linguagem natural, explicações): invocações, quantas tiveram sucesso, falharam ou foram bloqueadas, quantos usuários e skills distintos, e o feedback dado. Somente contagens; nenhum usuário é nomeado.",
  },
  'catalog.purpose.adopt.ai.skills': {
    en: "Dynatrace Intelligence by skill (Assist chat, natural-language queries, explanations, document search…): invocations, successes and distinct users of each. The list is bounded by the skills the platform offers. Counted only; no user is named.",
    'pt-BR': "Dynatrace Intelligence por skill (chat do Assist, consultas em linguagem natural, explicações, busca em documentos…): invocações, sucessos e usuários distintos de cada um. A lista é limitada pelos skills da plataforma. Somente contagens; nenhum usuário é nomeado.",
  },

  // assumptions
  'assumption.group.adoption': { en: 'Platform adoption (DPA method)', 'pt-BR': 'Adoção da plataforma (método DPA)' },
  'assumption.adoption.dpa.users': { en: 'Active users: full 15 points at', 'pt-BR': 'Usuários ativos: 15 pontos completos com' },
  'assumption.adoption.dpa.users.basis': { en: 'DPA v1.5.0 target.', 'pt-BR': 'Meta do DPA v1.5.0.' },
  'assumption.adoption.dpa.apps': { en: 'Apps available for the breadth part', 'pt-BR': 'Apps disponíveis para a parte de amplitude' },
  'assumption.adoption.dpa.apps.basis': { en: 'DPA v1.5.0 reference count.', 'pt-BR': 'Contagem de referência do DPA v1.5.0.' },
  'assumption.adoption.dpa.appsShare': { en: 'Breadth: full 20 points at this share of those apps', 'pt-BR': 'Amplitude: 20 pontos completos com esta parcela desses apps' },
  'assumption.adoption.dpa.appsShare.basis': { en: 'DPA v1.5.0 target.', 'pt-BR': 'Meta do DPA v1.5.0.' },
  'assumption.adoption.dpa.aiCalls': { en: 'Dynatrace Intelligence calls: full 10 points at', 'pt-BR': 'Chamadas à Dynatrace Intelligence: 10 pontos completos com' },
  'assumption.adoption.dpa.aiCalls.basis': { en: 'DPA v1.5.0 target.', 'pt-BR': 'Meta do DPA v1.5.0.' },
  'assumption.adoption.dpa.analyzerCalls': { en: 'Dynatrace Intelligence analyzer calls: full 10 points at', 'pt-BR': 'Chamadas aos analyzers da Dynatrace Intelligence: 10 pontos completos com' },
  'assumption.adoption.dpa.analyzerCalls.basis': { en: 'DPA v1.5.0 target.', 'pt-BR': 'Meta do DPA v1.5.0.' },
  'assumption.adoption.dpa.apiCalls': { en: 'API calls: full 15 points at', 'pt-BR': 'Chamadas de API: 15 pontos completos com' },
  'assumption.adoption.dpa.apiCalls.basis': { en: 'DPA v1.5.0 target.', 'pt-BR': 'Meta do DPA v1.5.0.' },
  'assumption.adoption.dpa.stickiness': { en: 'Stickiness: full 15 points at', 'pt-BR': 'Aderência: 15 pontos completos com' },
  'assumption.adoption.dpa.stickiness.basis': { en: 'DPA v1.5.0 target.', 'pt-BR': 'Meta do DPA v1.5.0.' },
  'assumption.adoption.dpa.powerUsers': { en: 'Power users (7+ apps): full 15 points at', 'pt-BR': 'Usuários avançados (7+ apps): 15 pontos completos com' },
  'assumption.adoption.dpa.powerUsers.basis': { en: 'DPA v1.5.0 target.', 'pt-BR': 'Meta do DPA v1.5.0.' },

  'help.whatsNew.i77': {
    en: '3.4.4 — Platform adoption, a page of its own: how people use the Dynatrace platform here over the last 30 days — active users (the Dynatrace team apart), daily users and stickiness, the apps in use and how broadly people use them, API use, Dynatrace Intelligence by skill — and an adoption index after the DPA method with its targets in Help. Users are counted, never named.',
    'pt-BR': '3.4.4 — Adoção da plataforma, numa página própria: como as pessoas usam a plataforma Dynatrace aqui nos últimos 30 dias — usuários ativos (a equipe Dynatrace à parte), usuários por dia e aderência, os apps em uso e com que amplitude são usados, uso de API, Dynatrace Intelligence por skill — e um índice de adoção pelo método DPA com as metas na Ajuda. Os usuários são contados, nunca nomeados.',
  },
} satisfies Record<string, Entry>;
