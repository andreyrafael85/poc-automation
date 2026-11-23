import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.0, the visual proposal v6 wave 3, with the goal bar of wave 2 (owner's question of
 * 2026-11-21 on the number cards). Merged in `strings.ts`.
 */

export const v360Strings = {
  'v6.console.title': { en: 'Recent problems', 'pt-BR': 'Problemas recentes' },
  'v6.console.window': { en: 'Last 7 days', 'pt-BR': 'Últimos 7 dias' },
  'v6.console.open': { en: 'Open', 'pt-BR': 'Aberto' },
  'v6.console.closed': { en: 'Closed', 'pt-BR': 'Fechado' },
  'v6.console.affected': { en: '{first} and {more} more', 'pt-BR': '{first} e mais {more}' },
  'v6.console.none': { en: 'No problem began in the last 7 days.', 'pt-BR': 'Nenhum problema começou nos últimos 7 dias.' },
  'v6.console.caption': {
    en: 'The {shown} most recent problems, newest first, from the 100 most recent of the last 7 days (prob.list) — a list, not a count.',
    'pt-BR': 'Os {shown} problemas mais recentes, do mais novo ao mais antigo, entre os 100 mais recentes dos últimos 7 dias (prob.list) — uma lista, não uma contagem.',
  },
  'v6.limit.visitLine': { en: 'Line: {line} GiB per visit (the app’s convention)', 'pt-BR': 'Linha: {line} GiB por visita (convenção do app)' },
  'help.whatsNew.i102': {
    en: '3.6.0 — The v6 look, third wave, and mini bars on every card. Dynatrace Intelligence lists the most recent problems as console lines — when each began, open or closed, its category, its name and id, what it reached, how long it took (the 12 most recent of the 100 the app already reads). The heat calendar of when problems begin is drawn in neutral tones with the busiest slot outlined. Every split on a number card reads as mini bars, each part in its own colour (on the Overview: the estate by layer, the active problems by category, the services by failure band, closed against still-open problems, the front-end errors by application). The projected read of one visit is drawn against the 10 GiB line in App consumption, the app\'s convention, said so.',
    'pt-BR': '3.6.0 — O visual da v6, terceira onda, e mini barras em todos os cartões. A Dynatrace Intelligence lista os problemas mais recentes como linhas de console — quando cada um começou, aberto ou fechado, a categoria, o nome e o ID, o que atingiu, quanto durou (os 12 mais recentes dos 100 que o app já lê). O calendário de quando os problemas começam fica em tons neutros, com a faixa mais cheia em destaque. Toda divisão num cartão de número vira mini barras, cada parte na sua cor (na Visão geral: o parque por camada, os problemas ativos por categoria, os serviços por faixa de falha, os problemas fechados contra os ainda abertos, os erros de front-end por aplicação). A leitura projetada de uma visita aparece contra a linha de 10 GiB no Consumo do app, convenção do app, e isso aparece escrito.',
  },
  'v6.split.open': { en: 'Still open', 'pt-BR': 'Ainda abertos' },
} satisfies Record<string, Entry>;
