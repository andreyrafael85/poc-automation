import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.3 (visual proposal v4, the first of its releases): the Overview's environment flow,
 * top tabs on the long pages, and What's new trimmed to the last ten releases with their dates. Merged in `strings.ts`.
 */

export const v353Strings = {
  // ---------------------------------------------------------------- the environment flow (Overview)
  'flow.title': { en: 'From the user to the cloud, now', 'pt-BR': 'Do usuário à nuvem, agora' },
  'flow.titleOnPrem': { en: 'From the user to the infrastructure, now', 'pt-BR': 'Do usuário à infraestrutura, agora' },
  'flow.aria': {
    en: 'The environment as a flow of layers, from the applications people use to the clouds that host them',
    'pt-BR': 'O ambiente como um fluxo de camadas, das aplicações que as pessoas usam às nuvens que as hospedam',
  },
  'flow.legend.links': {
    en: 'Each circle is a layer Dynatrace measured; the curves follow the stack, thicker where a layer holds more entities.',
    'pt-BR': 'Cada círculo é uma camada medida pelo Dynatrace; as curvas seguem a pilha, mais grossas onde a camada tem mais entidades.',
  },
  'flow.legend.hot': {
    en: 'A pulsing circle marks a layer with a point worth a look now, named beside it.',
    'pt-BR': 'Um círculo pulsando marca uma camada com um ponto que vale olhar agora, descrito ao lado.',
  },
  'flow.hot.services': { en: '{n} above the 1% line', 'pt-BR': '{n} acima da linha de 1%' },
  'flow.hot.hosts': { en: '{n} at capacity peak', 'pt-BR': '{n} no pico de capacidade' },

  // ---------------------------------------------------------------- tabs at the top of the long pages
  'p.svc.tab.health': { en: 'Health', 'pt-BR': 'Saúde' },
  'p.svc.tab.trend': { en: 'Trend', 'pt-BR': 'Tendência' },
  'p.svc.tab.ranking': { en: 'Ranking and types', 'pt-BR': 'Ranking e tipos' },
  'p.infra.tab.overview': { en: 'Estate', 'pt-BR': 'Parque' },
  'p.infra.tab.capacity': { en: 'Capacity by host', 'pt-BR': 'Capacidade por host' },
  'p.infra.tab.trend': { en: 'Trend', 'pt-BR': 'Tendência' },
  'p.infra.tab.inventory': { en: 'Host inventory', 'pt-BR': 'Inventário de hosts' },
  'ai.tab.overview': { en: 'Overview and lenses', 'pt-BR': 'Panorama e lentes' },
  'ai.tab.when': { en: 'When problems arrive', 'pt-BR': 'Quando os problemas chegam' },
  'ai.tab.impact': { en: 'Impact', 'pt-BR': 'Impacto' },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.published': { en: 'Published on {day}', 'pt-BR': 'Publicada em {day}' },
  'help.whatsNew.older': {
    en: 'The last {n} releases are shown here; the earlier ones are kept in the app’s release history.',
    'pt-BR': 'Aqui ficam as últimas {n} releases; as anteriores seguem no histórico de releases do app.',
  },
  'help.whatsNew.i95': {
    en: '3.5.3 — The first release of the visual proposal v4. The Overview draws the environment as a flow from the user to the cloud: a circle per layer Dynatrace measured, with its icon and count, curves along the stack with light moving through them, and a pulse on a layer with a point worth a look now (services above the 1% failure line, hosts at their capacity peak). The long pages — Services, Infrastructure and Dynatrace Intelligence — are organised in tabs at the top, as the Coverage page already was. What’s new keeps the last ten releases, each with the day it was published.',
    'pt-BR': '3.5.3 — A primeira release da proposta visual v4. A Visão geral desenha o ambiente como um fluxo do usuário à nuvem: um círculo por camada medida pelo Dynatrace, com ícone e contagem, curvas ao longo da pilha com luz passando por elas e um pulso na camada com um ponto que vale olhar agora (serviços acima da linha de 1% de falhas, hosts no pico de capacidade). As páginas longas — Serviços, Infraestrutura e Dynatrace Intelligence — ficam organizadas em guias no topo, como a Cobertura já fazia. As Novidades mostram as últimas dez releases, cada uma com a data em que foi publicada.',
  },
} satisfies Record<string, Entry>;
