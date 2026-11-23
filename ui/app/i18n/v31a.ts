import { type Entry } from './locales';

/**
 * PoC Value Studio 3.1 — page strings, group A.
 *
 * One file per migration group so parallel work never edits the same file. Merged
 * into the single dictionary in `strings.ts`; both locales are required.
 *
 * Group A: the Overview, the PoC timeline, the Executive summary, the printable
 * report (and the SE Report that hosts it), and the pillar / discovery cards.
 */
export const v31AStrings = {
  'cc.card.entities.calc': {
    en: 'Sum of the entity categories the inventory returned (hosts, services, processes, workloads, applications, synthetic monitors…).',
    'pt-BR': 'Soma das categorias de entidade retornadas pelo inventário (hosts, serviços, processos, workloads, aplicações, monitores sintéticos…).',
  },
  'cc.card.closed.calc': {
    en: 'All problems in the window minus those still active.',
    'pt-BR': 'Todos os problemas na janela menos os que ainda estão ativos.',
  },
  'rum.kpi.errorRateCalc': {
    en: 'Front-end errors ÷ front-end requests across the applications measured.',
    'pt-BR': 'Erros de front-end ÷ requisições de front-end nas aplicações medidas.',
  },
  // ------------------------------------------------------------- discoveries
  // A discovery that is about something this review could not read is a
  // limitation of the review, not a fault in the estate, so it gets its own word
  // instead of borrowing "Needs attention".
  'disc.notReadable': { en: 'Not readable here', 'pt-BR': 'Não legível aqui' },

  // ---------------------------------------------------------- printable report
  'report.mttrRow': {
    en: '{category}: {mttr} across {count} {count|problem|problems}',
    'pt-BR': '{category}: {mttr} em {count} {count|problema|problemas}',
  },
  'report.partner.logoAlt': { en: 'Partner logo', 'pt-BR': 'Logo do parceiro' },
  'report.partner.namedLogoAlt': { en: '{name} logo', 'pt-BR': 'Logo de {name}' },
} as const satisfies Record<string, Entry>;
