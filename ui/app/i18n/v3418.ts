import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.4.18: the Strato-native line begins (`docs/v3.4/DESIGN-STRATO-NATIVO-PLANO.md`,
 * wave 0 the foundation `engine/strato/`, wave 1 the Overview). Merged in `strings.ts`.
 */

export const v3418Strings = {
  'cockpit.arrivals.series': { en: 'Problems that began', 'pt-BR': 'Problemas que começaram' },
  'cockpit.arrivals.peak': { en: 'Peak: {count} at {at}', 'pt-BR': 'Pico: {count} em {at}' },
  'cockpit.ranked.bands': {
    en: 'Colour by failure band: {attention} or more critical · from the {line} line warning · failures under {line} good.',
    'pt-BR': 'Cor pela faixa de falha: {attention} ou mais crítica · a partir da linha de {line} atenção · falhas abaixo de {line} boa.',
  },

  // The posture gauges are ratios of two measured counts: Derived, with the arithmetic in the evidence.
  'ai.ring.reliability.calc': {
    en: 'Closed problems ÷ all problems in the window (prob.summary).',
    'pt-BR': 'Problemas encerrados ÷ todos os problemas da janela (prob.summary).',
  },
  'ai.ring.recurrence.calc': {
    en: 'Problems of the recurring patterns ÷ problems of every pattern (prob.recurrent.total).',
    'pt-BR': 'Problemas dos padrões recorrentes ÷ problemas de todos os padrões (prob.recurrent.total).',
  },
  'ai.ring.active.calc': {
    en: 'Open problems ÷ all problems in the window (prob.summary).',
    'pt-BR': 'Problemas abertos ÷ todos os problemas da janela (prob.summary).',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i91': {
    en: '3.4.18 — The Overview and Dynatrace Intelligence on the platform’s own charts: a calm header with three Strato gauges, one KPI card on the platform’s SingleValue with a measured split under each number, problem arrivals on the TimeseriesChart (zoom, tooltip, “Download data”) with the peak and the mean written above it, the estate by layer and the problems by category on the DonutChart showing every slice, the failing services on the CategoricalBarChart against the 1 % review line in their “Status and health” tones, and the closure, recurrence and open-problem gauges with their evidence. The Tech Wrapup photographs the new charts.',
    'pt-BR': '3.4.18 — A Visão geral e a Dynatrace Intelligence nos gráficos da própria plataforma: um cabeçalho calmo com três medidores Strato, um único cartão de KPI no SingleValue da plataforma com a divisão medida sob cada número, a chegada de problemas no TimeseriesChart (zoom, dica, “Download data”) com o pico e a média escritos acima, o ambiente por camada e os problemas por categoria no DonutChart com todas as fatias, os serviços com falhas no CategoricalBarChart diante da linha de revisão de 1 % nos tons de “Status and health”, e os medidores de encerramento, recorrência e problemas abertos com a sua evidência. O Tech Wrapup fotografa os gráficos novos.',
  },
} satisfies Record<string, Entry>;
