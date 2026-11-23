import { type Entry } from './locales';

/** PoC Value Studio 3.3.9 — compact maps, the inventory on one line and the AIOps cockpit grid. Merged in `strings.ts`. */

export const v339Strings = {
  'cockpit.rca.storyMore': { en: 'See the full explanation ({count} more blocks)', 'pt-BR': 'Ver a explicação completa (mais {count} blocos)' },
  'cockpit.rca.storyLess': { en: 'Show the opening only', 'pt-BR': 'Mostrar só a abertura' },
  'cockpit.inv.source': { en: 'Every tile: {window} · query {query}', 'pt-BR': 'Todos os tiles: {window} · consulta {query}' },
  'help.whatsNew.i60': {
    en: '3.3.9 — The Overview inventory fits on one line (the source is stated once under it); the incident maps of the Executive summary and AIOps, the frontend flow and the call map are compact; and on AIOps the Dynatrace Intelligence explanation, the incident’s logs, the problem mix and the time to close sit as four tiles, the explanation opening on its first blocks.',
    'pt-BR': '3.3.9 — O inventário da Visão geral cabe em uma linha (a fonte aparece uma vez embaixo); os mapas do incidente do Resumo executivo e do AIOps, o fluxo de front-end e o mapa de chamadas ficaram compactos; e no AIOps a explicação da Dynatrace Intelligence, os logs do incidente, a distribuição de problemas e o tempo de encerramento viram quatro tiles, com a explicação abrindo nos primeiros blocos.',
  },
} satisfies Record<string, Entry>;
