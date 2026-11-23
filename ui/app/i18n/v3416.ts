import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.4.16: AI presence, the Categorical Vivid palette, the "Status and health" scale,
 * neutral provenance and the platform's type (design proposal D-21, D-01, D-10, D-24, D-31, D-32), from the owner's
 * order of 2026-11-19 to implement the recommendations. Merged in `strings.ts`.
 */

export const v3416Strings = {
  'ai.mark.label': { en: 'Dynatrace Intelligence', 'pt-BR': 'Dynatrace Intelligence' },
  'ai.mark.hint': {
    en: 'Produced by Dynatrace Intelligence, the platform’s AI — shown as it was written.',
    'pt-BR': 'Produzido pela Dynatrace Intelligence, a IA da plataforma — mostrado como foi escrito.',
  },
  'assist.note.rule': {
    en: 'From the app’s rules over the figures measured on this page.',
    'pt-BR': 'Das regras do app sobre os números medidos nesta página.',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i89': {
    en: '3.4.16 — The Dynatrace look, with every reading as before: numbers in neutral ink like the platform’s single values, the colour kept on rings, bars and edges; categories in Categorical Vivid, the platform’s newer palette; failure bands on the “Status and health” scale (no failure green, under 1 % blue, above it amber); provenance badges neutral, so green and amber mean measured health only; the DT Flow weights the platform loads and no text under 12 px. What Dynatrace Intelligence wrote carries its mark; the app’s own advice is labelled “Recommendation”.',
    'pt-BR': '3.4.16 — A cara da Dynatrace, com cada leitura como antes: números em tinta neutra, como os valores únicos da plataforma, e a cor nos anéis, barras e bordas; categorias na Categorical Vivid, a paleta mais nova da plataforma; faixas de falha na escala “Status and health” (sem falha verde, abaixo de 1% azul, acima âmbar); selos de procedência neutros, para verde e âmbar significarem só saúde medida; os pesos da DT Flow que a plataforma carrega e nenhum texto abaixo de 12 px. O que a Dynatrace Intelligence escreveu leva a sua marca; o conselho do próprio app aparece como “Recomendação”.',
  },
} satisfies Record<string, Entry>;
