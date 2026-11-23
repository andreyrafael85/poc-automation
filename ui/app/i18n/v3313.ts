import { type Entry } from './locales';

/** PoC Value Studio 3.3.13 — the Impact stage and Automation on the chart engine (lot 4). Merged in `strings.ts`. */

export const v3313Strings = {
  'cockpit.cons.title': { en: 'How usage spreads across the capabilities', 'pt-BR': 'Como o uso se distribui entre as capacidades' },
  'cockpit.cons.topOf': { en: 'top {shown} of {total} capabilities', 'pt-BR': 'top {shown} de {total} capacidades' },
  'p.auto.assist.title': { en: 'Where to look first in automation', 'pt-BR': 'Onde olhar primeiro na automação' },
  'p.auto.assist.s.rate': {
    en: '{executions} executions finished in the window and {rate}% of them succeeded — measured by the automation engine, not sampled.',
    'pt-BR': '{executions} execuções terminaram na janela e {rate}% delas tiveram sucesso — medido pelo motor de automação, sem amostragem.',
  },
  'p.auto.assist.s.worst': {
    en: 'Start with “{name}”: {failed} of its {runs} runs failed. The reason is in each run’s own record, one click away in Workflows.',
    'pt-BR': 'Comece por “{name}”: {failed} das {runs} execuções falharam. O motivo está no registro de cada execução, a um clique em Workflows.',
  },
  'p.auto.assist.s.clean': {
    en: 'No execution failed in the window — the workflows in use are holding steady.',
    'pt-BR': 'Nenhuma execução falhou na janela — os workflows em uso estão estáveis.',
  },
  'help.whatsNew.i64': {
    en: '3.3.13 — The Impact stage and Automation on the chart engine: the Executive summary puts the resolution speed beside the Assist; Consumption shows where the billed volume goes beside what the review cannot say; and Automation gains a Dynatrace Assist, beside its success ring and the workflows that fail first.',
    'pt-BR': '3.3.13 — A etapa Impacto e a Automação no motor gráfico: o Resumo executivo põe a velocidade de resolução ao lado do Assist; Consumo mostra para onde vai o volume faturado ao lado do que a revisão não afirma; e Automação ganha um Dynatrace Assist, ao lado do anel de sucesso e dos workflows que mais falham.',
  },
} satisfies Record<string, Entry>;
