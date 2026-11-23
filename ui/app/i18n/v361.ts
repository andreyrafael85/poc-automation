import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.1, from the v5 proposal (approved 2026-11-21): the RCA propagation v4 (the graph from
 * the cause to the impact, the time on each entity, the ruler) above the 3.5.4 layers, and Day 0 × today on the
 * Executive summary. Merged in `strings.ts`.
 */

export const v361Strings = {
  'catalog.purpose.rca.edges': {
    en: "The calls between an incident's affected services (and its root cause), read from the entity model, so the propagation draws each hop from the service it reached — never a link the platform did not record.",
    'pt-BR': 'As chamadas entre os serviços afetados de um incidente (e a sua causa raiz), lidas do modelo de entidades, para a propagação desenhar cada salto a partir do serviço que ele alcançou — nunca uma ligação que a plataforma não registrou.',
  },
  'rca.v4.title': { en: 'How the incident spread', 'pt-BR': 'Como o incidente se propagou' },
  'rca.v4.col.cause': { en: 'Root cause', 'pt-BR': 'Causa raiz' },
  'rca.v4.col.hop1': { en: '1 hop', 'pt-BR': '1 salto' },
  'rca.v4.col.hop2': { en: '2 hops', 'pt-BR': '2 saltos' },
  'rca.v4.col.hop3': { en: '3 hops', 'pt-BR': '3 saltos' },
  'rca.v4.col.also': { en: 'Also affected', 'pt-BR': 'Também afetados' },
  'rca.v4.col.users': { en: 'Where users met it', 'pt-BR': 'Onde os usuários sentiram' },
  'rca.v4.failures': { en: '{kind} · {count} failures', 'pt-BR': '{kind} · {count} falhas' },
  'rca.v4.more': { en: '+{count} more', 'pt-BR': '+{count} mais' },
  'rca.v4.ruler': { en: 'The incident over time', 'pt-BR': 'O incidente no tempo' },
  'rca.v4.firstSignal': { en: 'First signal {time}', 'pt-BR': 'Primeiro sinal {time}' },
  'rca.v4.start': { en: 'Problem opened {time}', 'pt-BR': 'Problema aberto {time}' },
  'rca.v4.events': { en: '{count} first events on the graph', 'pt-BR': '{count} primeiros eventos no grafo' },
  'rca.v4.end': { en: 'Closed {time}', 'pt-BR': 'Fechou {time}' },
  'rca.v4.open': { en: 'Still open', 'pt-BR': 'Ainda aberto' },
  'rca.v4.legend': {
    en: 'Each link is a call the entity model recorded between the incident\'s services (rca.edges) or a measured caller of the root (rca.callers); light runs from the cause to the impact. The time on a node is the first event Dynatrace Intelligence grouped on it (ev.problem.events). An affected entity no recorded call reaches is listed apart, without a link. Up to {shown} per column; the layers below and the Affected entities tab list them all.',
    'pt-BR': 'Cada ligação é uma chamada registrada no modelo de entidades entre os serviços do incidente (rca.edges) ou um chamador medido da causa raiz (rca.callers); a luz corre da causa ao impacto. A hora num nó é o primeiro evento que a Dynatrace Intelligence agrupou nele (ev.problem.events). Uma entidade afetada sem chamada registrada que a alcance aparece à parte, sem ligação. Até {shown} por coluna; as camadas abaixo e a aba Entidades afetadas listam todas.',
  },
  'rca.v4.layers': { en: 'By layers', 'pt-BR': 'Por camadas' },
  'exec.d0.title': { en: 'Day 0 and today', 'pt-BR': 'Dia 0 e hoje' },
  'exec.d0.caption': {
    en: 'Each indicator read on both sides: the PoC’s first day ({day0}) — or its first week, for problems — in grey, now in colour.',
    'pt-BR': 'Cada indicador lido dos dois lados: o primeiro dia da PoC ({day0}) — ou a primeira semana, para problemas — em cinza, hoje em cor.',
  },
  'exec.d0.hosts': { en: 'Monitored hosts', 'pt-BR': 'Hosts monitorados' },
  'exec.d0.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'exec.d0.processes': { en: 'Process instances', 'pt-BR': 'Instâncias de processo' },
  'exec.d0.problems': { en: 'Problems per day', 'pt-BR': 'Problemas por dia' },
  'exec.d0.hint.count': { en: 'count, more is wider coverage', 'pt-BR': 'contagem, mais é cobertura maior' },
  'exec.d0.hint.problems': { en: 'daily average, first week × latest week, fewer is better', 'pt-BR': 'média por dia, primeira semana × última semana, menos é melhor' },
  'exec.d0.day0': { en: 'Day 0', 'pt-BR': 'Dia 0' },
  'exec.d0.today': { en: 'Today', 'pt-BR': 'Hoje' },
  'exec.d0.source': {
    en: 'From the reads of the PoC timeline (cov.inventory.day0, cov.inventory, prob.poc.daily). An indicator without both sides measured is left out, never estimated.',
    'pt-BR': 'Das leituras da Linha do tempo da PoC (cov.inventory.day0, cov.inventory, prob.poc.daily). Um indicador sem os dois lados medidos fica de fora, nunca estimado.',
  },
  'help.whatsNew.i103': {
    en: '3.6.1 — The incident as a propagation, and Day 0 beside today. On AIOps & RCA the incident is drawn as a graph from the root cause to where users met it, hop by hop along the calls the platform recorded between its services, light running from the cause to the impact, each entity with the time of its first event and a ruler from the first signal to the close; the layers of 3.5.4 stay below it. The Executive summary shows each indicator on Day 0 and today — hosts, services, process instances and problems per day — the change in a chip, coloured by which way is better.',
    'pt-BR': '3.6.1 — O incidente como propagação, e o Dia 0 ao lado de hoje. Em AIOps e RCA o incidente vira um grafo da causa raiz até onde os usuários sentiram, salto a salto pelas chamadas que a plataforma registrou entre os serviços, com a luz correndo da causa ao impacto, cada entidade com a hora do seu primeiro evento e uma régua do primeiro sinal ao fechamento; as camadas da 3.5.4 ficam logo abaixo. O Resumo executivo mostra cada indicador no Dia 0 e hoje — hosts, serviços, instâncias de processo e problemas por dia — com a variação num chip, na cor de qual direção é melhor.',
  },
} satisfies Record<string, Entry>;
