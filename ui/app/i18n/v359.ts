import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.9, the visual proposal v6 wave 2: smooth areas with a period selector over what was
 * read, donuts with a tabular legend, segment bars for "x of y". Merged in `strings.ts`.
 */

export const v359Strings = {
  'v6.period.aria': { en: 'Period shown', 'pt-BR': 'Período exibido' },
  'v6.period.24h': { en: '24 h', 'pt-BR': '24 h' },
  'v6.period.7d': { en: '7 d', 'pt-BR': '7 d' },
  'v6.period.30d': { en: '30 d', 'pt-BR': '30 d' },
  'v6.period.all': { en: 'All', 'pt-BR': 'Tudo' },
  'v6.period.note': {
    en: 'Showing part of what was read; the figures above are for the whole window.',
    'pt-BR': 'Mostrando parte do que foi lido; os números acima valem para a janela inteira.',
  },
  'v6.legend.name': { en: 'Name', 'pt-BR': 'Nome' },
  'v6.legend.count': { en: 'Count', 'pt-BR': 'Qtd' },
  'v6.legend.share': { en: '%', 'pt-BR': '%' },
  'v6.ticks.of': { en: '{value} of {max}', 'pt-BR': '{value} de {max}' },
  'help.whatsNew.i101': {
    en: '3.5.9 — The v6 look, second wave: the charts. Series over time are drawn as smooth areas, and where the read spans more than a day a period selector (24 h, 7 d, 30 d, All) narrows what is drawn to the latest part of what was read — never a new read; a line says the figures above stay those of the whole window. Donut legends read as a table (name, count, share).',
    'pt-BR': '3.5.9 — O visual da v6, segunda onda: os gráficos. As séries no tempo viram áreas de curva suave e, quando a leitura cobre mais de um dia, um seletor de período (24 h, 7 d, 30 d, Tudo) mostra a parte mais recente do que foi lido — nunca uma leitura nova; uma linha avisa que os números acima seguem valendo para a janela inteira. As legendas dos donuts viram tabela (nome, quantidade, parcela).',
  },
} satisfies Record<string, Entry>;
