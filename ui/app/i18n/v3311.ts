import { type Entry } from './locales';

/** PoC Value Studio 3.3.11 — the Discoveries stage on the chart engine (lot 2). Merged in `strings.ts`. */

export const v3311Strings = {
  'cockpit.ai.mix.title': { en: 'Problems by category', 'pt-BR': 'Problemas por categoria' },
  'cockpit.ai.mix.center': { en: 'problems', 'pt-BR': 'problemas' },
  'cockpit.ai.mix.others': { en: 'Other categories', 'pt-BR': 'Outras categorias' },
  'help.whatsNew.i62': {
    en: '3.3.11 — The Discoveries stage on the chart engine: Dynatrace Intelligence opens on when problems begin (7 days, the mean dashed) beside the Assist, then its rings beside the problems by category; Security puts the technologies beside the Assist; Competitor overlap puts the vendors beside its three counts. A summary band with six or more figures keeps to one line.',
    'pt-BR': '3.3.11 — A etapa Descobertas no motor gráfico: Dynatrace Intelligence abre com quando os problemas começam (7 dias, com a média tracejada) ao lado do Assist e, em seguida, os anéis ao lado dos problemas por categoria; Segurança põe as tecnologias ao lado do Assist; Overlap de concorrentes põe os fornecedores ao lado das três contagens. Uma faixa de indicadores com seis ou mais números cabe em uma linha.',
  },
} satisfies Record<string, Entry>;
