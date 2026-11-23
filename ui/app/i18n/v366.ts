import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.6 (the owner, 2026-11-22: Settings moves to a stage 10 of its own, a page that creates
 * things on the tenant for the PoC, the dashboards tab too large, the customer's logo in the dashboards; the proposal
 * the 3.6.6 proposal page "Construtor da PoC"). Merged in `strings.ts`.
 */

export const v366Strings = {
  // The owner, 2026-11-22: "Configurações & Construção" for the stage and "PoC Builder" for the page, in both languages.
  'nav.builder': { en: 'PoC Builder', 'pt-BR': 'PoC Builder' },
  'stage.manage': { en: 'Settings & Build', 'pt-BR': 'Configurações & Construção' },
  'stage.manage.blurb': {
    en: 'What the SE and the partner set up for the PoC, and what the app builds on the environment for it.',
    'pt-BR': 'O que o SE e o parceiro configuram para a PoC, e o que o app constrói no ambiente para ela.',
  },
  'builder.title': { en: 'PoC Builder', 'pt-BR': 'PoC Builder' },
  'builder.question': {
    en: 'What has this PoC already created on the environment, and what else can it create with one click?',
    'pt-BR': 'O que esta PoC já criou no ambiente, e o que mais dá para criar com um clique?',
  },
  'builder.takeaway': {
    en: 'Each kit shows what it will create before it does, creates only when the SE clicks, and joins the register of the PoC with its link.',
    'pt-BR': 'Cada kit mostra o que vai criar antes de criar, cria só quando o SE clica, e entra no registro da PoC com o seu link.',
  },
  // 3.6.7: the count covers every kit (the dashboards, the notebook and the launchpad).
  'builder.count': { en: '{n} of {total} kits on the environment', 'pt-BR': '{n} de {total} kits no ambiente' },
  'builder.rules': {
    en: 'Nothing is created on its own: every kit is created or updated by its own button, with the validated queries of the app.',
    'pt-BR': 'Nada é criado sozinho: cada kit é criado ou atualizado pelo seu próprio botão, com as consultas validadas do app.',
  },
  'builder.logo.title': { en: 'Customer logo in the dashboards', 'pt-BR': 'Logo do cliente nos dashboards' },
  'builder.logo.none': {
    en: 'Upload the customer logo on Settings → Customer & engagement and it goes into the top-left corner of every dashboard you create here.',
    'pt-BR': 'Envie o logo do cliente em Configurações → Cliente e engajamento e ele vai para o canto superior esquerdo de cada dashboard criado aqui.',
  },
  'builder.logo.toSettings': { en: 'Open Settings', 'pt-BR': 'Abrir as Configurações' },
  'builder.logo.alt': { en: 'Customer logo', 'pt-BR': 'Logo do cliente' },
  'builder.logo.include': {
    en: 'Put the customer logo in the top-left corner of the dashboards',
    'pt-BR': 'Colocar o logo do cliente no canto superior esquerdo dos dashboards',
  },
  'builder.logo.how': {
    en: 'Drawn at most 320 × 120 pixels. "Update" on a dashboard already created brings the current logo to it.',
    'pt-BR': 'Desenhado com no máximo 320 × 120 pixels. "Atualizar" num dashboard já criado leva o logo atual para ele.',
  },
  // 3.7.7 (the owner): "Smart Dashboards".
  'builder.tab.dashboards': { en: 'Smart Dashboards · {n}', 'pt-BR': 'Smart Dashboards · {n}' },
  'builder.tab.ledger': { en: 'Register', 'pt-BR': 'Registro' },
  'builder.poc.audience': { en: 'For the sponsors', 'pt-BR': 'Para os patrocinadores' },
  'builder.kit.ready': { en: 'Ready to create', 'pt-BR': 'Pronto para criar' },
  'builder.kit.created': { en: 'Created', 'pt-BR': 'Criado' },
  'builder.kit.sections': { en: '{count} sections', 'pt-BR': '{count} seções' },
  'builder.kit.sections.one': { en: '{count} section', 'pt-BR': '{count} seção' },
  'builder.kit.notYet': { en: 'Not on the environment yet', 'pt-BR': 'Ainda não está no ambiente' },
  'builder.kit.since': { en: 'Created on {at}', 'pt-BR': 'Criado em {at}' },
  'builder.kit.open': { en: 'Open', 'pt-BR': 'Abrir' },
  'builder.kit.details': { en: 'Details and create', 'pt-BR': 'Detalhes e criar' },
  'builder.kit.manage': { en: 'Details and update', 'pt-BR': 'Detalhes e atualizar' },
  'builder.kit.close': { en: 'Close details', 'pt-BR': 'Fechar detalhes' },
  'builder.seOnly': {
    en: 'The SE creates, updates and removes what the PoC builds; the links open what is already on the environment.',
    'pt-BR': 'O SE cria, atualiza e remove o que a PoC constrói; os links abrem o que já está no ambiente.',
  },
  'builder.ledger.title': { en: 'What this PoC created on the environment', 'pt-BR': 'O que esta PoC criou no ambiente' },
  'builder.ledger.body': {
    en: 'Every item the app created for this PoC, with when, who could see it and its link — the list to review with the customer at the end of the PoC.',
    'pt-BR': 'Cada item que o app criou para esta PoC, com quando, quem podia ver e o link — a lista para revisar com o cliente no fim da PoC.',
  },
  'builder.ledger.none': {
    en: 'Nothing created yet: the dashboards you create on the first tab appear here.',
    'pt-BR': 'Nada criado ainda: os dashboards criados na primeira guia aparecem aqui.',
  },
  'builder.ledger.dashboard': { en: 'Dashboard "{name}"', 'pt-BR': 'Dashboard "{name}"' },
  'builder.ledger.shared': { en: 'Every user can open it', 'pt-BR': 'Todos os usuários podem abrir' },
  'builder.ledger.private': { en: 'Private to its creator', 'pt-BR': 'Privado de quem criou' },
  'builder.ledger.next': {
    en: 'Everything here was created by the SE’s click; at the end of the PoC, the clean-up below removes what should leave the environment.',
    'pt-BR': 'Tudo aqui foi criado pelo clique do SE; no fim da PoC, a limpeza abaixo remove o que deve sair do ambiente.',
  },
  'help.whatsNew.i108': {
    en: '3.6.6 — The PoC Builder. Settings moved to the end of the menu, in a stage of its own, "Settings & Build", beside a new page: the PoC Builder, where the SE creates on the environment what the PoC needs. The four dashboards left the long Settings tab for compact cards there, each opening its details only when asked, and they now carry the customer logo in their top-left corner. A register lists everything the PoC created, with its link.',
    'pt-BR': '3.6.6 — O PoC Builder. As Configurações foram para o fim do menu, numa etapa própria, "Configurações & Construção", ao lado de uma página nova: o PoC Builder, onde o SE cria no ambiente o que a PoC precisa. Os quatro dashboards saíram da guia longa das Configurações para cartões compactos ali, cada um abrindo os detalhes só quando pedido, e agora levam o logo do cliente no canto superior esquerdo. Um registro lista tudo o que a PoC criou, com o link.',
  },
} satisfies Record<string, Entry>;
