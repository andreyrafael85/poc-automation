import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.5 (the owner: "encapsular tudo da 'O que falta da v6 (onda 4, parte 2)' … na próxima
 * release a 3.7.5, tudo em uma única entrega"): the status hex maps' and the donut legends' column headers, and What's new.
 * Merged in `strings.ts`.
 */

export const v375Strings = {
  'v6.hex.class': { en: 'Capacity class', 'pt-BR': 'Classe de capacidade' },
  'v6.hex.band': { en: 'Failure band', 'pt-BR': 'Faixa de falhas' },
  'v6.hex.hosts': { en: 'Hosts', 'pt-BR': 'Hosts' },
  'v6.hex.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'v6.hex.share': { en: 'Share', 'pt-BR': 'Parte' },

  'help.whatsNew.i117': {
    en: '3.7.5 — The rest of the v6 look, in one release. The honeycombs of Infrastructure and Services are status hex maps — the classes that call for action first, with a table of counts and shares beside them; the app’s donut has a tabular legend with its share in micro-blocks; the banners of the Executive summary, Coverage, the SE Report and AIOps & RCA are flat and neutral, the brand gradient only as a thin strip; the value chain, the value pillars and the PoC journey show their icons in square boxes, without coloured washes; the PoC timeline’s track runs in the menu’s turquoise; the older number tiles show their state as a dot, without a coloured rail; and Adoption’s heat map is in neutral tones with the busiest hour outlined. No figure, query or permission changed.',
    'pt-BR': '3.7.5 — O resto do visual v6, numa entrega só. Os favos de Infraestrutura e de Serviços viraram mapas hexagonais de status — as classes que pedem ação primeiro, com uma tabela de quantidades e partes ao lado; a rosca do app tem legenda em tabela com a parte em microblocos; os banners do Resumo executivo, da Cobertura, do Relatório do SE e de AIOps & RCA ficaram planos e neutros, com o degradê da marca só numa faixa fina; a cadeia de valor, os pilares de valor e a jornada da PoC mostram os ícones em caixas quadradas, sem lavagens de cor; a trilha da linha do tempo da PoC corre no turquesa do menu; os cartões de número antigos mostram o estado num ponto, sem a barra colorida; e o mapa de calor da Adoção ficou em tons neutros, com a hora mais movimentada contornada. Nenhum número, consulta ou permissão mudou.',
  },
} satisfies Record<string, Entry>;
