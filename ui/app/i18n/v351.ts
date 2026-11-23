import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.1: the Strato-native line, wave 3 (the lists, the inventory tiles and
 * the daily lines on the platform's charts — Coverage, Adoption and every page that uses them). Merged in `strings.ts`.
 */

export const v351Strings = {
  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i93': {
    en: '3.5.1 — More of the app on the platform’s own charts: every ranked list draws its bars with the platform’s MeterBarChart (names, values and ranks stay as text), every inventory tile is the compact SingleValue card with its icon, and Platform adoption’s use over time is drawn on TimeseriesCharts with the peak written above.',
    'pt-BR': '3.5.1 — Mais do app nos gráficos da própria plataforma: cada lista ranqueada desenha as barras com o MeterBarChart da plataforma (nomes, valores e posições continuam como texto), cada quadro de inventário é o cartão SingleValue compacto com o seu ícone, e o uso ao longo do tempo da Adoção da plataforma é desenhado em TimeseriesCharts com o pico escrito acima.',
  },
} satisfies Record<string, Entry>;
