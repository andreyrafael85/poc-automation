import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.10 — the Tech Wrapup photographs the new Dynatrace Intelligence charts (the heat calendar
 * and the rings) and carries the Assessment (proposal §C8 F-02, the deck's golden re-pinned at the owner's
 * request). Merged in `strings.ts`.
 */

export const v3410Strings = {
  'cap.opt.problems.calendar': { en: 'When problems arrive (heat calendar)', 'pt-BR': 'Quando os problemas chegam (calendário de calor)' },
  'cap.opt.problems.rings': { en: 'Closure, recurrence and active problems (rings)', 'pt-BR': 'Encerramento, recorrência e problemas ativos (anéis)' },
  'cap.pin.calendar.busiest': { en: 'Busiest day: {value} problems', 'pt-BR': 'Dia de mais problemas: {value}' },
  'cap.pin.rings.closed': { en: '{value} of the problems closed', 'pt-BR': '{value} dos problemas encerrados' },

  // ---------------------------------------------------------------- the Assessment in the deck (F-02)
  'tw.asm.title': { en: 'Environment coverage', 'pt-BR': 'Cobertura do ambiente' },
  'tw.asm.subtitle': { en: 'What Dynatrace covers and maps, maturity and the next steps', 'pt-BR': 'O que a Dynatrace cobre e mapeia, maturidade e próximos passos' },
  'tw.asm.hi': { en: 'observable coverage of the environment', 'pt-BR': 'cobertura observável do ambiente' },
  'tw.asm.hiMaturity': { en: 'maturity step: {name}', 'pt-BR': 'etapa de maturidade: {name}' },
  'tw.asm.k.index': { en: 'Observable coverage', 'pt-BR': 'Cobertura observável' },
  'tw.asm.k.maturity': { en: 'Maturity', 'pt-BR': 'Maturidade' },
  'tw.asm.k.capabilities': { en: 'Capabilities in use', 'pt-BR': 'Capacidades em uso' },
  'tw.asm.k.critical': { en: 'Critical findings', 'pt-BR': 'Achados críticos' },
  'tw.asm.bars': { en: 'Coverage by domain (%)', 'pt-BR': 'Cobertura por domínio (%)' },
  'tw.asm.n1': {
    en: 'Coverage reads the environment through the app’s query catalogue: what Dynatrace covers and maps, how deeply, and what to do next — every figure from a query.',
    'pt-BR': 'A Cobertura lê o ambiente pelo catálogo de consultas do app: o que a Dynatrace cobre e mapeia, com que profundidade e o que fazer em seguida — cada número vem de uma consulta.',
  },
  'tw.asm.i.maturity': { en: 'Today the environment is at step {level} of the maturity journey, {name}.', 'pt-BR': 'Hoje o ambiente está na etapa {level} da jornada de maturidade, {name}.' },
  'tw.asm.i.findings': {
    en: 'Findings: critical {critical}, attention {warning}, opportunities {opportunity}.',
    'pt-BR': 'Achados: críticos {critical}, atenção {warning}, oportunidades {opportunity}.',
  },
  'tw.asm.i.next': { en: 'To reach {name}, the pillars to advance with Dynatrace: {pillars}.', 'pt-BR': 'Para chegar a {name}, os pilares a avançar com a Dynatrace: {pillars}.' },
  'tw.asm.assist.action': { en: '{priority} — {title}', 'pt-BR': '{priority} — {title}' },
  'tw.asm.assist.grow': { en: 'Capabilities not detected yet, with room to grow: {names}.', 'pt-BR': 'Capacidades ainda não detectadas, com espaço para crescer: {names}.' },
  'cap.opt.assessment.maturity': { en: 'Maturity journey (rings and steps)', 'pt-BR': 'Jornada de maturidade (anéis e etapas)' },
  'cap.opt.assessment.radar': { en: 'Coverage by domain (radar)', 'pt-BR': 'Cobertura por domínio (radar)' },
  'cap.pin.assessment.level': { en: 'Step reached: {value}', 'pt-BR': 'Etapa alcançada: {value}' },

  'asm.radar.centre': { en: 'Coverage', 'pt-BR': 'Cobertura' },
  'asm.radar.rings': { en: 'Rings at 25, 50, 75 and 100%', 'pt-BR': 'Anéis em 25, 50, 75 e 100%' },
  'asm.mat.aheadProgress': { en: 'What this step brings: {total} achievements', 'pt-BR': 'O que esta etapa traz: {total} conquistas' },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i83': {
    en: '3.4.10 — the Tech Wrapup photographs the new Dynatrace Intelligence charts (the heat calendar opens the section; the rings, the arrivals and the mix are options), waits longer before saying a panel has no picture, and carries the Coverage page: a slide with the coverage, the maturity step, the findings and the first actions, with a picture of the maturity rings or the coverage radar.',
    'pt-BR': '3.4.10 — o Tech Wrapup fotografa os gráficos novos da Dynatrace Intelligence (o calendário de calor abre a seção; os anéis, as chegadas e as categorias são opções), espera mais antes de dizer que um painel não tem imagem e traz a página Cobertura: um slide com a cobertura, a etapa de maturidade, os achados e as primeiras ações, com a imagem dos anéis de maturidade ou do radar de cobertura.',
  },
} satisfies Record<string, Entry>;
