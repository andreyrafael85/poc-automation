import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.4 (visual proposal v4, its second release): Services → "Quadrants" and AIOps & RCA
 * told as a propagation, in tabs. Merged in `strings.ts`.
 */

export const v354Strings = {
  // ---------------------------------------------------------------- Services → Quadrants
  'p.svc.tab.quadrants': { en: 'Quadrants', 'pt-BR': 'Quadrantes' },
  'svc.quad.title': { en: 'Every busy service before the two review lines', 'pt-BR': 'Cada serviço movimentado diante das duas linhas de revisão' },
  'svc.quad.caption': {
    en: 'Failure rate across, response time up; the larger the point, the more requests. Lines: {failure} of failed requests and {latency} of response time (review conventions of this app).',
    'pt-BR': 'Taxa de falha na horizontal, tempo de resposta na vertical; quanto maior o ponto, mais requisições. Linhas: {failure} de requisições com falha e {latency} de tempo de resposta (convenções de revisão deste app).',
  },
  'svc.quad.topOf': { en: 'top {shown} by requests', 'pt-BR': 'top {shown} por requisições' },
  'svc.quad.topOfTotal': { en: 'top {shown} of {total} services with traffic', 'pt-BR': 'top {shown} de {total} serviços com tráfego' },
  'svc.quad.countsAria': { en: 'Services per quadrant', 'pt-BR': 'Serviços por quadrante' },
  'svc.quad.both': { en: 'Above both lines — look first', 'pt-BR': 'Acima das duas linhas — olhar primeiro' },
  'svc.quad.slow': { en: 'Above the time line', 'pt-BR': 'Acima da linha de tempo' },
  'svc.quad.failing': { en: 'Above the failure line', 'pt-BR': 'Acima da linha de falhas' },
  'svc.quad.within': { en: 'Within both lines', 'pt-BR': 'Dentro das duas linhas' },
  'svc.quad.aria': {
    en: 'Scatter of {shown} services by failure rate and response time; {both} above both review lines. The table that follows lists every point.',
    'pt-BR': 'Dispersão de {shown} serviços por taxa de falha e tempo de resposta; {both} acima das duas linhas de revisão. A tabela a seguir lista cada ponto.',
  },
  'svc.quad.point': {
    en: '{name}: {rate} failed, {time} response time, {requests} requests — {quadrant}',
    'pt-BR': '{name}: {rate} com falha, {time} de tempo de resposta, {requests} requisições — {quadrant}',
  },
  'svc.quad.failureLine': { en: '{value} failure line', 'pt-BR': 'linha de {value} de falhas' },
  'svc.quad.latencyLine': { en: '{value} response-time line', 'pt-BR': 'linha de {value} de resposta' },
  'svc.quad.xAxis': { en: 'Failed requests (%)', 'pt-BR': 'Requisições com falha (%)' },
  'svc.quad.yAxis': { en: 'Response time', 'pt-BR': 'Tempo de resposta' },
  'svc.quad.requests': { en: 'Requests', 'pt-BR': 'Requisições' },
  'svc.quad.quadrant': { en: 'Quadrant', 'pt-BR': 'Quadrante' },
  'svc.quad.legend': {
    en: 'Hover a point for its figures. The counts cover the points shown (the busiest services), never the whole estate.',
    'pt-BR': 'Passe o cursor num ponto para ver os números. As contagens cobrem os pontos mostrados (os serviços mais movimentados), não o ambiente inteiro.',
  },
  'svc.quad.untimed': {
    en: '{n} of the listed services reported no response time and are left off the chart.',
    'pt-BR': '{n} dos serviços listados não informaram tempo de resposta e ficam fora do gráfico.',
  },

  // ---------------------------------------------------------------- AIOps & RCA in tabs, the propagation
  'rca.tab.propagation': { en: 'Propagation', 'pt-BR': 'Propagação' },
  'rca.tab.investigation': { en: 'Investigation', 'pt-BR': 'Linha da investigação' },
  'rca.tab.affected': { en: 'Affected entities', 'pt-BR': 'Entidades afetadas' },
  'rca.tab.history': { en: 'History', 'pt-BR': 'Histórico' },
  'rca.prop.title': { en: 'How the incident propagated', 'pt-BR': 'Como o incidente se propagou' },
  'rca.prop.aria': { en: 'The incident by hop, from the root cause to the users', 'pt-BR': 'O incidente por salto, da causa raiz aos usuários' },
  'rca.prop.origin': { en: 'Origin', 'pt-BR': 'Origem' },
  'rca.prop.hop': { en: 'Hop {n}', 'pt-BR': 'Salto {n}' },
  'rca.prop.col.cause': { en: 'Root cause', 'pt-BR': 'Causa raiz' },
  'rca.prop.col.callers': { en: 'Calls into the cause', 'pt-BR': 'Chamam a causa' },
  'rca.prop.col.affected': { en: 'Affected services and infrastructure', 'pt-BR': 'Serviços e infraestrutura afetados' },
  'rca.prop.col.users': { en: 'Where users met it', 'pt-BR': 'Onde os usuários sentiram' },
  'rca.prop.hint.cause': { en: 'named by Dynatrace Intelligence', 'pt-BR': 'nomeada pela Dynatrace Intelligence' },
  'rca.prop.hint.callers': { en: 'failures measured during the incident', 'pt-BR': 'falhas medidas durante o incidente' },
  'rca.prop.hint.affected': { en: 'attached to the problem by the platform', 'pt-BR': 'ligados ao problema pela plataforma' },
  'rca.prop.hint.users': { en: 'applications and synthetic checks', 'pt-BR': 'aplicações e verificações sintéticas' },
  'rca.prop.more': { en: '+{n} more', 'pt-BR': '+{n} outras' },
  'rca.prop.moreHint': { en: 'in the Affected entities tab', 'pt-BR': 'na guia Entidades afetadas' },
  'rca.prop.legend': {
    en: 'Each card is something the platform attached to the problem or measured during it, and opens its page. The platform reports when the problem began and ended, not when each entity was reached, so no per-entity time is drawn.',
    'pt-BR': 'Cada cartão é algo que a plataforma ligou ao problema ou mediu durante ele, e abre a página de origem. A plataforma informa quando o problema começou e terminou, não quando cada entidade foi atingida; por isso não há hora por entidade.',
  },
  'rca.prop.ruler.aria': { en: 'When the problem began, how long it lasted and whether it is open', 'pt-BR': 'Quando o problema começou, quanto durou e se segue aberto' },
  'rca.prop.ruler.start': { en: 'Began', 'pt-BR': 'Começou' },
  'rca.prop.ruler.duration': { en: 'Duration', 'pt-BR': 'Duração' },
  'rca.prop.ruler.open': { en: 'Still open', 'pt-BR': 'Ainda aberto' },
  'rca.prop.ruler.closed': { en: 'Closed', 'pt-BR': 'Fechado' },
  'rca.prop.ruler.now': { en: 'now', 'pt-BR': 'agora' },
  'rca.affected.title': { en: 'Every entity the problem touched', 'pt-BR': 'Cada entidade que o problema tocou' },
  'rca.affected.subtitle': { en: '{n} entities, as the platform attached them to the problem', 'pt-BR': '{n} entidades, como a plataforma as ligou ao problema' },
  'rca.affected.caption': { en: '{n} affected entities', 'pt-BR': '{n} entidades afetadas' },
  'rca.affected.h.entity': { en: 'Entity', 'pt-BR': 'Entidade' },
  'rca.affected.h.kind': { en: 'Kind', 'pt-BR': 'Tipo' },
  'rca.affected.h.page': { en: 'Page', 'pt-BR': 'Página' },
  'rca.affected.open': { en: 'Open in Dynatrace', 'pt-BR': 'Abrir no Dynatrace' },
  'rca.affected.none': { en: 'The platform attached no entity to this problem.', 'pt-BR': 'A plataforma não ligou entidades a este problema.' },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i96': {
    en: '3.5.4 — Services gain a "Quadrants" tab: every busy service as a point, failure rate across and response time up, the larger the point the more requests, before the 1% and 1 s review lines — the ones above both lines are named first. AIOps & RCA tells the incident as a propagation, in tabs: Propagation (the root cause, the services calling it with their failures, the affected services and infrastructure, and where users met it, under a ruler of when it began and how long it lasted), Investigation (Dynatrace Intelligence’s explanation and the incident’s logs), Affected entities (every one, with its page) and History.',
    'pt-BR': '3.5.4 — Serviços ganham a guia "Quadrantes": cada serviço movimentado como um ponto, taxa de falha na horizontal e tempo de resposta na vertical, quanto maior o ponto mais requisições, diante das linhas de revisão de 1% e 1 s — os que passam das duas linhas aparecem nomeados primeiro. AIOps e RCA contam o incidente como uma propagação, em guias: Propagação (a causa raiz, os serviços que a chamam com suas falhas, os serviços e a infraestrutura afetados e onde os usuários sentiram, sob uma régua de quando começou e quanto durou), Linha da investigação (a explicação da Dynatrace Intelligence e os logs do incidente), Entidades afetadas (todas, com a página de cada uma) e Histórico.',
  },
} satisfies Record<string, Entry>;
