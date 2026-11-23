import { type Entry } from './locales';

/** PoC Value Studio 3.3.18 — the SE Report on the chart engine. Merged in `strings.ts`. */

export const v3318Strings = {
  // The owner's 3.3.18 review: the Overview is the first screen a customer sees, so the Assist card
  // speaks to them — where its figure comes from — and no longer states the app's own money rule.
  'cockpit.assist.footnote': {
    en: 'Read by Dynatrace from this environment — each figure’s badge shows the query it came from.',
    'pt-BR': 'Lido pelo Dynatrace neste ambiente — o selo de cada número mostra a consulta de onde ele veio.',
  },
  'help.whatsNew.i69': {
    en: '3.3.18 — The SE Report on the chart engine: the general report now prints the same panels as the pages and the Tech Wrapup — the slowest of the busiest services against the 1 s line, hosts below 75% at peak beside the ones at their ceiling, when problems begin with the mean of the window, and requests without a front-end error beside the errors by application — and "How problems behave" keeps its eight figures together on one page. On the Overview, the Dynatrace Assist card now closes on where its figure comes from.',
    'pt-BR': '3.3.18 — O Relatório SE no motor gráfico: o relatório geral passa a imprimir os mesmos painéis das páginas e do Tech Wrapup — os serviços mais lentos contra a linha de 1 s, os hosts abaixo de 75% no pico ao lado dos que estão no teto, quando os problemas começam com a média da janela e as requisições sem erro de front-end ao lado dos erros por aplicação — e "Como os problemas se comportam" mantém os oito números juntos na mesma página. Na Visão geral, o cartão Dynatrace Assist passa a fechar dizendo de onde vem o seu número.',
  },
} satisfies Record<string, Entry>;
