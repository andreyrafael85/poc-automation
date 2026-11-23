import { type Entry } from './locales';

/** PoC Value Studio 3.3.21 — Licensing and Settings on the chart engine. Merged in `strings.ts`. */

export const v3321Strings = {
  // Settings — the PoC at a glance before the tabs.
  'settings.ready.title': { en: 'Ready to present', 'pt-BR': 'Pronto para apresentar' },
  'settings.ready.caption': {
    en: 'What the story and the exports take from this page. Each item is set in the tab named under it; Apply saves them all.',
    'pt-BR': 'O que a história e as exportações levam desta página. Cada item se define na guia indicada abaixo dele; Aplicar salva todos.',
  },
  'settings.ready.ring': { en: 'Set up', 'pt-BR': 'Configurado' },
  'settings.ready.ringCaption': { en: '{done} of {total} items set', 'pt-BR': '{done} de {total} itens definidos' },
  'settings.ready.aria': { en: 'Share of the PoC set-up already filled in', 'pt-BR': 'Parcela da configuração da PoC já preenchida' },
  'settings.ready.done': { en: 'set', 'pt-BR': 'definido' },
  'settings.ready.open': { en: 'to fill in', 'pt-BR': 'a preencher' },
  'settings.ready.customer': { en: 'Customer name', 'pt-BR': 'Nome do cliente' },
  'settings.ready.logo': { en: 'Customer logo', 'pt-BR': 'Logo do cliente' },
  'settings.ready.description': { en: 'What the PoC is about', 'pt-BR': 'Do que trata a PoC' },
  'settings.ready.dates': { en: 'Start and end dates', 'pt-BR': 'Datas de início e fim' },
  'settings.ready.criteria': { en: 'Success criteria', 'pt-BR': 'Critérios de sucesso' },
  'settings.ready.dashboard': { en: '“PoC value” dashboard', 'pt-BR': 'Dashboard “Valor da PoC”' },
  'settings.ready.rate': { en: 'Hourly cost of the team', 'pt-BR': 'Custo por hora da equipe' },

  // Licensing — what the sizing rests on, and where the estimate goes.
  'p.lic.basis.title': { en: 'What the sizing rests on', 'pt-BR': 'Em que o dimensionamento se apoia' },
  'p.lic.basis.caption': {
    en: 'Each capability of the sizing with the usage read on this environment, per month. An open item has no reading in this sizing; it stays out of the totals instead of counting as zero.',
    'pt-BR': 'Cada capacidade do dimensionamento com o uso lido neste ambiente, por mês. Um item em aberto não tem leitura neste dimensionamento; ele fica fora dos totais em vez de contar como zero.',
  },
  'p.lic.basis.ring': { en: 'Read', 'pt-BR': 'Lido' },
  'p.lic.basis.ringCaption': { en: '{done} of {total} capabilities read', 'pt-BR': '{done} de {total} capacidades lidas' },
  'p.lic.basis.aria': { en: 'Share of the sizing that rests on a reading', 'pt-BR': 'Parcela do dimensionamento apoiada numa leitura' },
  'p.lic.basis.perMonth': { en: '{value} per month', 'pt-BR': '{value} por mês' },
  'p.lic.basis.noReading': { en: 'Not read in this sizing', 'pt-BR': 'Sem leitura neste dimensionamento' },
  'p.lic.basis.done': { en: 'read', 'pt-BR': 'lido' },
  'p.lic.basis.open': { en: 'to read', 'pt-BR': 'a ler' },
  'p.lic.split.title': { en: 'Where the estimate goes', 'pt-BR': 'Para onde vai a estimativa' },
  'p.lic.split.caption': {
    en: 'The annual estimate at the public list price, by capability, largest first, with its share of the total. A projection for the SE and the partner, never a quote.',
    'pt-BR': 'A estimativa anual a preço público de lista, por capacidade, da maior para a menor, com a parcela do total. Uma projeção para o SE e o parceiro, nunca uma proposta.',
  },
  'p.lic.split.display': { en: '{money} · {share}%', 'pt-BR': '{money} · {share}%' },

  'help.whatsNew.i72': {
    en: '3.3.21 — Licensing and Settings on the chart engine: Settings opens on what is ready to present, a ring and the items still to fill in with the tab where each is set; Licensing opens its sizing on what it rests on — every capability read or still open, never a zero — and, for the SE and the partner, shows where the estimate goes by capability.',
    'pt-BR': '3.3.21 — Licenciamento e Configurações no motor gráfico: Configurações abre com o que está pronto para apresentar, um anel e os itens a preencher com a guia onde cada um se define; Licenciamento abre o dimensionamento pelo que o apoia — cada capacidade lida ou em aberto, nunca um zero — e, para o SE e o parceiro, mostra para onde vai a estimativa por capacidade.',
  },
} satisfies Record<string, Entry>;
