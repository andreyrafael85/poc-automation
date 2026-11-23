import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.4.15: Strato 3.18 (components 3.18.0, design tokens 1.8.1, icons 2.7.0), the first
 * step of the design plan (docs/v3.4/PROPOSTA-DESIGN-STRATO-3.18.md §7), from the owner's order of 2026-11-19 to
 * implement it "com base nas suas recomendações". Merged in `strings.ts`.
 */

export const v3415Strings = {
  'help.whatsNew.i88': {
    en: '3.4.15 — PoC Automation 3.0 runs on Strato 3.18, Dynatrace’s latest design system: each capability page shows its Dynatrace product signet beside the title (Dynatrace Intelligence, Application Observability, Infrastructure, Log Analytics, Application Security, Digital Experience, Business Analytics, Automation, Smartscape and more), the DQL blocks copy through Strato’s new actions menu, and the coverage chart explains its radial bars. Every reading and figure stays as it was.',
    'pt-BR': '3.4.15 — O PoC Automation 3.0 roda no Strato 3.18, o design system mais recente da Dynatrace: cada página de capacidade mostra o ícone do produto Dynatrace ao lado do título (Dynatrace Intelligence, Application Observability, Infrastructure, Log Analytics, Application Security, Digital Experience, Business Analytics, Automation, Smartscape e outros), os blocos de DQL são copiados pelo novo menu de ações do Strato, e o gráfico de cobertura explica as barras radiais. Cada leitura e número continua como estava.',
  },
} satisfies Record<string, Entry>;
