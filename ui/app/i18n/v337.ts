import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.7 — the chart engine's first marks and the Overview cockpit. Merged in
 * `strings.ts`.
 */

export const v337Strings = {
  'chart.status.critical': { en: 'Above the line', 'pt-BR': 'Acima da linha' },
  'chart.status.warning': { en: 'Close to the line', 'pt-BR': 'Perto da linha' },
  'chart.status.good': { en: 'Within the line', 'pt-BR': 'Dentro da linha' },

  'cockpit.arrivals.title': { en: 'When problems begin — every 6 hours', 'pt-BR': 'Quando os problemas começam — a cada 6 horas' },
  'cockpit.arrivals.mean': { en: 'Mean of the window: {value}', 'pt-BR': 'Média da janela: {value}' },
  'cockpit.donut.title': { en: 'The estate by layer', 'pt-BR': 'O ambiente por camada' },
  'cockpit.donut.center': { en: 'entities', 'pt-BR': 'entidades' },
  'cockpit.donut.others': { en: 'Other layers', 'pt-BR': 'Outras camadas' },
  'cockpit.ranked.title': { en: 'Services with the highest failure rate', 'pt-BR': 'Serviços com maior taxa de falha' },
  'cockpit.ranked.line': { en: '1 % review line', 'pt-BR': 'Linha de revisão de 1 %' },
  'cockpit.ranked.topOf': { en: 'top {shown} of the {listed} busiest', 'pt-BR': 'top {shown} dos {listed} mais movimentados' },
  'cockpit.ranked.topOfTotal': {
    en: 'top {shown} of the {listed} busiest · {total} with traffic',
    'pt-BR': 'top {shown} dos {listed} mais movimentados · {total} com tráfego',
  },
  'cockpit.heat.title': { en: 'When problems happen — by day and 6-hour block', 'pt-BR': 'Quando os problemas acontecem — por dia e faixa de 6 horas' },
  'cockpit.act.title': { en: 'Where to act first', 'pt-BR': 'Onde agir primeiro' },
  'cockpit.act.caption': {
    en: 'Measured values against their review lines: {line} of failed requests for a service, the {ceiling} saturation ceiling for a host. Worst first.',
    'pt-BR': 'Valores medidos contra as linhas de revisão: {line} de requisições com falha num serviço, o teto de saturação de {ceiling} num host. Os mais urgentes primeiro.',
  },
  'cockpit.act.entity': { en: 'Entity', 'pt-BR': 'Entidade' },
  'cockpit.act.signal': { en: 'Signal', 'pt-BR': 'Sinal' },
  'cockpit.act.measured': { en: 'Measured', 'pt-BR': 'Medido' },
  'cockpit.act.versus': { en: 'vs. the line', 'pt-BR': 'vs. a linha' },
  'cockpit.act.status': { en: 'Status', 'pt-BR': 'Status' },
  'cockpit.act.failure': { en: 'Failure rate', 'pt-BR': 'Taxa de falha' },
  'cockpit.act.memory': { en: 'Peak memory', 'pt-BR': 'Memória no pico' },
  'cockpit.act.cpu': { en: 'Peak CPU', 'pt-BR': 'CPU no pico' },
  'cockpit.assist.title': { en: 'Recommendation', 'pt-BR': 'Recomendação' },
  'cockpit.assist.capacity': {
    en: 'Of {hosts} hosts, {saturated} reached their capacity ceiling and {oversized} never got busy. Start with the ones at the ceiling: they have the least margin.',
    'pt-BR': 'Dos {hosts} hosts, {saturated} chegaram ao teto de capacidade e {oversized} nunca ficaram ocupados. Comece pelos que estão no teto: são os que têm menos margem.',
  },
  'cockpit.assist.reclaimable': { en: 'Memory never used on the {oversized} hosts with headroom', 'pt-BR': 'Memória nunca usada nos {oversized} hosts com folga' },

  'help.whatsNew.i58': {
    en: '3.3.7 — The Overview becomes a cockpit: when problems begin (with the window’s mean), the estate by layer, the services with the highest failure rate against the 1 % line, a day-by-block calendar of when it hurts, where to act first and the Dynatrace Assist with the measured fact. Every panel keeps its evidence badge and query.',
    'pt-BR': '3.3.7 — A Visão geral vira um cockpit: quando os problemas começam (com a média da janela), o ambiente por camada, os serviços com maior taxa de falha contra a linha de 1 %, um calendário por dia e faixa de horário de quando dói, onde agir primeiro e o Dynatrace Assist com o fato medido. Cada painel mantém o selo de evidência e a consulta.',
  },
} satisfies Record<string, Entry>;
