import { type Entry } from './locales';

/** PoC Value Studio 3.3.20 — Value & ROI, Opportunities and Roadmap on the chart engine. Merged in `strings.ts`. */

export const v3320Strings = {
  'opp.matrix.title': { en: 'Where to act first — impact × effort', 'pt-BR': 'Por onde agir primeiro — impacto × esforço' },
  'opp.matrix.caption': {
    en: 'Each opportunity in the cell of its impact and effort, numbered as in the table below. Both are the judgement each rule states from its measured signal.',
    'pt-BR': 'Cada oportunidade na célula do seu impacto e esforço, numerada como na tabela abaixo. Os dois são o julgamento que cada regra faz a partir do sinal medido.',
  },
  'opp.matrix.quickWins': { en: 'Quick wins', 'pt-BR': 'Ganhos rápidos' },
  'roadmap.glance.title': { en: 'The roadmap at a glance', 'pt-BR': 'O roadmap num relance' },
  'help.whatsNew.i71': {
    en: '3.3.20 — Value & ROI, Opportunities and Roadmap on the chart engine: Opportunities opens on where to act first, an impact × effort matrix with the quick wins marked and every row numbered as in the table; Roadmap opens on its three horizons at a glance; and Value & ROI puts where the problem hours went beside the daily time to resolve.',
    'pt-BR': '3.3.20 — Valor & ROI, Oportunidades e Roadmap no motor gráfico: Oportunidades abre com por onde agir primeiro, uma matriz impacto × esforço com os ganhos rápidos destacados e cada linha numerada como na tabela; Roadmap abre com os três horizontes num relance; e Valor & ROI põe para onde foram as horas de problema ao lado do tempo de resolução dia a dia.',
  },
} satisfies Record<string, Entry>;
