import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.1 — strings for the exactness and credibility fixes and for the
 * "Value Spectrum" visual (V1). Merged in `strings.ts`; `tests/i18n.test.ts` checks that no
 * fragment silently overrides a key defined by another.
 */

export const v321Strings = {
  // A count that could only be read from a capped list, because the exact total did not answer.
  'common.atLeast': { en: 'at least {n}', 'pt-BR': 'pelo menos {n}' },
  'common.unit.records': { en: 'records', 'pt-BR': 'registros' },
  // What a section says when its query has not answered: never "none", never a zero.
  'common.loadingShort': { en: 'Reading from the tenant…', 'pt-BR': 'Lendo do tenant…' },
  'common.noPermissionShort': {
    en: 'Not read: this identity lacks the scope for it.',
    'pt-BR': 'Não lido: esta identidade não tem o escopo necessário.',
  },
  'common.notRead': {
    en: 'Not read: the query did not answer, so nothing is claimed here.',
    'pt-BR': 'Não lido: a consulta não respondeu, então nada é afirmado aqui.',
  },

  // Settings footer when "Commercial data" is off: no rates on a shared screen.
  'settings.willSave.neutral': {
    en: 'Apply all changes saves this configuration on the tenant.',
    'pt-BR': 'Aplicar todas as alterações salva esta configuração na tenant.',
  },

  // Licensing sizing needs a daily rate, which a window shorter than a day cannot give.
  'p.lic.window.short.title': { en: 'Choose a window of 24 hours or more', 'pt-BR': 'Escolha uma janela de 24 horas ou mais' },
  'p.lic.window.short.body': {
    en: 'Log ingest and sessions are sized per day and then per year. A window shorter than a day cannot give a daily rate, so those rows stay empty instead of showing a figure that would be too small.',
    'pt-BR': 'Ingestão de logs e sessões são dimensionadas por dia e depois por ano. Uma janela menor que um dia não dá uma taxa diária, então essas linhas ficam vazias em vez de mostrar um número pequeno demais.',
  },

  // ------------------------------------------------------------------ Value Spectrum (V1–V3)

  // Overview rings. The third ring is the estate's service health, not this app's own queries.
  'cc.ring.services.label': { en: 'Services under 1% failures', 'pt-BR': 'Serviços abaixo de 1% de falhas' },
  'cc.ring.services.caption': {
    en: 'of the {count} services that handled traffic',
    'pt-BR': 'dos {count} serviços que receberam tráfego',
  },
  'cc.ring.services.aria': { en: 'Services below 1% failed requests', 'pt-BR': 'Serviços abaixo de 1% de requisições com falha' },
  'cc.ring.services.calc': {
    en: '(services with traffic − services above 1% failed requests) ÷ services with traffic, all services counted in the query',
    'pt-BR': '(serviços com tráfego − serviços acima de 1% de falhas) ÷ serviços com tráfego, todos contados na consulta',
  },
  'cc.ring.coverage.calc': {
    en: 'entity categories with at least one entity ÷ the 8 categories the app checks',
    'pt-BR': 'categorias de entidade com pelo menos uma entidade ÷ as 8 categorias que o app verifica',
  },
  'cc.ring.health.captionWindow': {
    en: 'of the problems in the {window} are closed',
    'pt-BR': 'dos problemas dos {window} estão encerrados',
  },
  'cc.ring.health.calc': {
    en: 'closed problems ÷ all problems, Dynatrace Intelligence duplicates excluded',
    'pt-BR': 'problemas encerrados ÷ todos os problemas, sem duplicados da Dynatrace Intelligence',
  },
  'cc.kpi.problems.spark': {
    en: 'Problems that began in each 6-hour period over the last 7 days',
    'pt-BR': 'Problemas iniciados em cada período de 6 horas nos últimos 7 dias',
  },
  'cc.kpi.problems.trend': {
    en: 'Line: problems begun per 6 h, last 7 days',
    'pt-BR': 'Linha: problemas iniciados a cada 6 h, últimos 7 dias',
  },

  // The stack map (V2).
  'stack.title': { en: 'Stack map: from the user to the cloud', 'pt-BR': 'Mapa da pilha: do usuário à nuvem' },
  'stack.aria': { en: 'Stack map, from applications to clouds', 'pt-BR': 'Mapa da pilha, das aplicações às nuvens' },
  'stack.open': { en: '{node}. Opens its page.', 'pt-BR': '{node}. Abre a página de origem.' },
  'stack.notRead': { en: 'not read', 'pt-BR': 'não lido' },
  'stack.col.experience': { en: 'Experience', 'pt-BR': 'Experiência' },
  'stack.col.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'stack.col.processes': { en: 'Processes', 'pt-BR': 'Processos' },
  'stack.col.infrastructure': { en: 'Infrastructure', 'pt-BR': 'Infraestrutura' },
  'stack.col.cloud': { en: 'Cloud', 'pt-BR': 'Nuvem' },
  'stack.node.aws': { en: 'AWS', 'pt-BR': 'AWS' },
  'stack.node.azure': { en: 'Azure', 'pt-BR': 'Azure' },
  'stack.node.gcp': { en: 'Google Cloud', 'pt-BR': 'Google Cloud' },
  'stack.node.otherCloud': { en: 'Other cloud', 'pt-BR': 'Outra nuvem' },
  'stack.node.unattributed': { en: 'No cloud attribution', 'pt-BR': 'Sem atribuição de nuvem' },
  'stack.unit.apps': { en: 'apps', 'pt-BR': 'apps' },
  'stack.unit.monitors': { en: 'monitors', 'pt-BR': 'monitores' },
  'stack.unit.services': { en: 'services', 'pt-BR': 'serviços' },
  'stack.unit.workloads': { en: 'workloads', 'pt-BR': 'workloads' },
  'stack.unit.instances': { en: 'instances', 'pt-BR': 'instâncias' },
  'stack.unit.hosts': { en: 'hosts', 'pt-BR': 'hosts' },
  'stack.unit.clusters': { en: 'clusters', 'pt-BR': 'clusters' },
  'stack.legend.width': {
    en: 'Width: size of the level a link leaves (entity count)',
    'pt-BR': 'Espessura: tamanho do nível de onde a ligação sai (contagem de entidades)',
  },
  'stack.legend.links': {
    en: 'Links show the hierarchy of the stack, not measured calls between services',
    'pt-BR': 'As ligações mostram a hierarquia da pilha, não chamadas medidas entre serviços',
  },
  'stack.legend.open': {
    en: 'Each node opens the page its count comes from',
    'pt-BR': 'Cada nó abre a página de onde vem a contagem',
  },
  'stack.unattributedNote': {
    en: '“No cloud attribution” is every monitored host the platform did not tag with a cloud: on-premises, or a cloud VM without the cloud integration.',
    'pt-BR': '“Sem atribuição de nuvem” são os hosts monitorados que a plataforma não marcou com uma nuvem: on-premises, ou VM em nuvem sem a integração da nuvem.',
  },

  // When problems begin: a calendar of day × six-hour period (3.2.2; the 3.2.1 strip read as one bar).
  'ai.heat.title': { en: 'When problems begin', 'pt-BR': 'Quando os problemas começam' },
  'ai.heat.caption': {
    en: 'Each row is a day and each column a 6-hour period in your time zone. The number is how many problems began there (Dynatrace Intelligence duplicates excluded); the stronger the colour, the closer to the busiest period, which is outlined. “·” is a period outside the 7 days. A problem that began earlier and was still open in the window is not counted.',
    'pt-BR': 'Cada linha é um dia e cada coluna, um período de 6 horas no seu fuso. O número é quantos problemas começaram ali (sem duplicados da Dynatrace Intelligence); quanto mais forte a cor, mais perto do período mais intenso, que aparece contornado. “·” é um período fora dos 7 dias. Problema iniciado antes e ainda aberto na janela não entra na conta.',
  },
  'ai.heat.summary': {
    en: 'In the last 7 days {total} problems began, {perDay} a day on average. Busiest day: {day} ({dayTotal}). Busiest period: {period} ({count}).',
    'pt-BR': 'Nos últimos 7 dias começaram {total} problemas, {perDay} por dia em média. Dia mais intenso: {day} ({dayTotal}). Período mais intenso: {period} ({count}).',
  },
  'ai.heat.dayHeader': { en: 'Day', 'pt-BR': 'Dia' },
  'ai.heat.totalHeader': { en: 'That day', 'pt-BR': 'No dia' },
  'ai.heat.cell': {
    en: '{day}, {period}: {count} problems began',
    'pt-BR': '{day}, {period}: {count} problemas iniciados',
  },
  'ai.heat.outside': { en: 'outside the 7 days', 'pt-BR': 'fora dos 7 dias' },
  'ai.heat.legendLow': { en: 'none', 'pt-BR': 'nenhum' },
  'ai.heat.legendHigh': { en: 'busiest period ({max})', 'pt-BR': 'período mais intenso ({max})' },
  'ai.heat.none': { en: 'No problem began in the last 7 days.', 'pt-BR': 'Nenhum problema começou nos últimos 7 dias.' },

  // Scorecard status profile (V3). Ordinal on purpose: the dimensions are never scored.
  'f.score.radar.title': { en: 'Status profile', 'pt-BR': 'Perfil de status' },
  'f.score.radar.caption': {
    en: 'Each axis is a dimension, placed on the rung of its status. The scale is ordinal, not a score: the dimensions are never combined into one number. A dimension that was not read has no point.',
    'pt-BR': 'Cada eixo é uma dimensão, posicionada no degrau do seu status. A escala é ordinal, não uma nota: as dimensões nunca viram um número único. Dimensão não lida fica sem ponto.',
  },
  'f.score.radar.aria': {
    en: 'Status profile of the scorecard dimensions: {list}',
    'pt-BR': 'Perfil de status das dimensões do scorecard: {list}',
  },

  // Technologies as chips (V2).
  'p.tech.chips.title': { en: 'Technologies at a glance', 'pt-BR': 'Tecnologias num relance' },
  'p.tech.chips.aria': { en: 'Technologies by process instances', 'pt-BR': 'Tecnologias por instâncias de processo' },
  'p.tech.chips.caption': {
    en: 'Process instances running each technology, all versions together. The mark is the official one where the Dynatrace icon gallery has it.',
    'pt-BR': 'Instâncias de processo que executam cada tecnologia, todas as versões juntas. A marca é a oficial quando a galeria de ícones da Dynatrace a tem.',
  },

  // Help → What's new, 3.2.2 (listed first).
  'help.whatsNew.i19': {
    en: '3.2.2 — Fixes the headline numbers that disappeared under the coloured edge on the tenant (Overview cards and every page’s headline band): the edge was drawn on the panel’s own layer, which the platform’s stylesheet overrides in the production build.',
    'pt-BR': '3.2.2 — Corrige os números principais que sumiam sob o destaque colorido no tenant (cards da Visão geral e a faixa de números de cada página): o destaque era desenhado na camada do próprio painel, que a folha de estilo da plataforma sobrescreve no build de produção.',
  },
  'help.whatsNew.i20': {
    en: '3.2.2 — “When problems begin” is now a calendar: a row per day, a column per 6-hour period in your time zone, the count in every cell, each day’s total and a one-line reading of the busiest day and period.',
    'pt-BR': '3.2.2 — “Quando os problemas começam” virou um calendário: uma linha por dia, uma coluna por período de 6 horas no seu fuso, o número em cada célula, o total de cada dia e uma frase com o dia e o período mais intensos.',
  },
  'help.whatsNew.i21': {
    en: '3.2.2 — “What’s new” also shows in the header until you open it for the installed version.',
    'pt-BR': '3.2.2 — “Novidades” também aparece no cabeçalho até você abrir a lista da versão instalada.',
  },

  // Help → What's new, 3.2.1 (listed first).
  'help.whatsNew.i13': {
    en: '3.2.1 — “Value Spectrum”: gradient rings, painted headline numbers and icons. The paint is a skin: every number keeps its evidence class, an unmeasured value is still a dash, print draws everything flat and “reduce motion” stops every animation.',
    'pt-BR': '3.2.1 — “Value Spectrum”: anéis com gradiente, números em destaque pintados e ícones. A pintura é uma camada: todo número mantém sua classe de evidência, valor não medido continua sendo um traço, a impressão sai plana e “reduzir movimento” para toda animação.',
  },
  'help.whatsNew.i14': {
    en: '3.2.1 — The stack map draws the estate from the user to the cloud (Overview and Topology). Each node is a count read from the tenant and opens its page; the links show the stack’s hierarchy, not measured calls.',
    'pt-BR': '3.2.1 — O mapa da pilha desenha o ambiente do usuário à nuvem (Visão geral e Topologia). Cada nó é uma contagem lida do tenant e abre a sua página; as ligações mostram a hierarquia da pilha, não chamadas medidas.',
  },
  'help.whatsNew.i15': {
    en: '3.2.1 — The Overview’s third ring is the share of services under 1 % failed requests, counted over every service with traffic. It replaces “Query efficiency (this app)”, which measured the tool, not your estate.',
    'pt-BR': '3.2.1 — O terceiro anel da Visão geral é a parcela de serviços abaixo de 1 % de requisições com falha, contada sobre todos os serviços com tráfego. Ele substitui “Eficiência de consultas (este app)”, que media a ferramenta, não o seu ambiente.',
  },
  'help.whatsNew.i16': {
    en: '3.2.1 — Cloud providers and runtimes use the official Dynatrace glyphs instead of raster logos, severities use the platform’s security risk colours, the Scorecard shows a status profile and Problems shows when problems begin.',
    'pt-BR': '3.2.1 — Provedores de nuvem e runtimes usam os glifos oficiais da Dynatrace no lugar de logos rasterizados, severidades usam as cores de risco de segurança da plataforma, o Scorecard mostra um perfil de status e Problemas mostra quando os problemas começam.',
  },
  'help.whatsNew.i17': {
    en: '3.2.1 — Exactness: a read that stopped at its scan limit is labelled “At least” (the 3.2.0 check could never fire), Dynatrace Intelligence duplicates are left out of every problem count, totals are never counted from a capped list, and no text claims a cause the data cannot show.',
    'pt-BR': '3.2.1 — Exatidão: uma leitura que parou no limite de varredura é rotulada “No mínimo” (a verificação da 3.2.0 nunca disparava), duplicados da Dynatrace Intelligence ficam fora de toda contagem de problemas, totais nunca são contados a partir de uma lista limitada e nenhum texto afirma uma causa que os dados não mostram.',
  },
  'help.whatsNew.i18': {
    en: '3.2.1 — Security: Settings flags the built-in partner password until you set your own, the customer view no longer shows DQL or validation notes, and text sent to the deck is cleaned of control characters.',
    'pt-BR': '3.2.1 — Segurança: Configurações sinaliza a senha de parceiro embutida até você definir a sua, a visão do cliente não mostra mais DQL nem notas de validação, e o texto enviado ao deck é limpo de caracteres de controle.',
  },

  // Infrastructure: the host map (V3).
  'p.infra.hive.title': { en: 'Hosts by capacity class', 'pt-BR': 'Hosts por classe de capacidade' },
  'p.infra.hive.caption': {
    en: 'One hexagon per host: the {shown} largest by memory, of {total}. The colour is the class from the higher of the CPU and memory peaks, by the rules in Help → Assumptions.',
    'pt-BR': 'Um hexágono por host: os {shown} maiores em memória, de {total}. A cor é a classe pelo maior pico entre CPU e memória, pelas regras em Ajuda → Premissas.',
  },
  'p.infra.hive.aria': { en: 'Host map by capacity class: {list}', 'pt-BR': 'Mapa de hosts por classe de capacidade: {list}' },
} as const satisfies Record<string, Entry>;
