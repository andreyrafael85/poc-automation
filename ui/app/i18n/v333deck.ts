import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.3 — the Tech Wrapup deck the customer receives, after the owner's 3.3.2
 * validation: at most two slides per subject (the capture, then the detail), and on the detail
 * slide what the platform did here. These lines are qualitative on purpose — every number on the
 * slide still comes from a measured fact (AGENTS.md rule 8); these say what the platform did to
 * produce it. Merged in `strings.ts`.
 */

export const v333DeckStrings = {
  'deck.value.label': { en: 'Why it matters', 'pt-BR': 'Por que importa' },

  'deck.value.problems.a': {
    en: 'Dynatrace Intelligence turned a flood of raw signals into a short list of problems with impact and timeline — no alerting rules to write.',
    'pt-BR': 'A Dynatrace Intelligence transformou um volume enorme de sinais numa lista curta de problemas, com impacto e linha do tempo — sem regras de alerta.',
  },
  'deck.value.problems.b': {
    en: 'Every problem links to the evidence behind it, so teams start from the cause instead of a wall of alerts.',
    'pt-BR': 'Cada problema leva à evidência por trás dele, e o time começa pela causa em vez de uma parede de alertas.',
  },
  'deck.value.rca.a': {
    en: 'Causal AI follows the real dependencies in Smartscape to name the root cause and the blast radius of each incident.',
    'pt-BR': 'A IA causal segue as dependências reais do Smartscape para apontar a causa raiz e o alcance de cada incidente.',
  },
  'deck.value.rca.b': {
    en: 'The hours that went into war rooms and manual correlation go back into fixing the issue.',
    'pt-BR': 'As horas de sala de guerra e de correlação manual voltam para a correção do problema.',
  },
  'deck.value.infrastructure.a': {
    en: 'OneAgent discovered every host and process and its capacity automatically, and keeps the inventory current as the estate changes.',
    'pt-BR': 'O OneAgent descobriu automaticamente cada host, cada processo e a capacidade de cada um, e mantém o inventário atual conforme o ambiente muda.',
  },
  'deck.value.infrastructure.b': {
    en: 'Measured peaks against provisioned capacity show where to right-size before anyone opens a ticket.',
    'pt-BR': 'Os picos medidos contra a capacidade provisionada mostram onde ajustar o dimensionamento antes de alguém abrir um chamado.',
  },
  'deck.value.cloud.a': {
    en: 'One platform covers hosts, managed services and clouds side by side, with the same data model and the same queries.',
    'pt-BR': 'Uma única plataforma cobre hosts, serviços gerenciados e nuvens lado a lado, com o mesmo modelo de dados e as mesmas consultas.',
  },
  'deck.value.cloud.b': {
    en: 'The multicloud estate becomes one map, ready for FinOps and right-sizing conversations.',
    'pt-BR': 'O ambiente multicloud vira um mapa só, pronto para as conversas de FinOps e de dimensionamento.',
  },
  'deck.value.kubernetes.a': {
    en: 'Clusters, workloads and pods are tied to the services they run, so a restart or a memory limit is read in its business context.',
    'pt-BR': 'Clusters, workloads e pods ficam ligados aos serviços que executam, e um restart ou um limite de memória é lido no seu contexto de negócio.',
  },
  'deck.value.kubernetes.b': {
    en: 'Platform and application teams look at the same picture, from the node to the user.',
    'pt-BR': 'Times de plataforma e de aplicação olham o mesmo quadro, do nó até o usuário.',
  },
  'deck.value.services.a': {
    en: 'Distributed traces follow every request end to end, with response time, failures and dependencies captured automatically, with no code changes.',
    'pt-BR': 'Os traces distribuídos acompanham cada requisição de ponta a ponta, com tempo de resposta, falhas e dependências capturados automaticamente, sem mudar código.',
  },
  'deck.value.services.b': {
    en: 'The slowest and most failing services surface on their own, ranked by their impact.',
    'pt-BR': 'Os serviços mais lentos e com mais falhas aparecem sozinhos, ordenados pelo impacto.',
  },
  'deck.value.technologies.a': {
    en: 'Every technology and version in use was identified automatically — the starting point for upgrade, end-of-support and security planning.',
    'pt-BR': 'Cada tecnologia e versão em uso foi identificada automaticamente — o ponto de partida para planos de atualização, fim de suporte e segurança.',
  },
  'deck.value.technologies.b': {
    en: 'No spreadsheet to maintain: the inventory updates itself as processes start and stop.',
    'pt-BR': 'Sem planilha para manter: o inventário se atualiza sozinho conforme os processos sobem e param.',
  },
  'deck.value.logs.a': {
    en: 'Logs land in Grail already connected to hosts, services and traces, so a log line is one click away from its context.',
    'pt-BR': 'Os logs chegam ao Grail já conectados a hosts, serviços e traces, e uma linha de log fica a um clique do seu contexto.',
  },
  'deck.value.logs.b': {
    en: 'Teams query everything with one language, DQL, without managing indexes by hand.',
    'pt-BR': 'O time consulta tudo com uma linguagem só, a DQL, sem gerenciar índices à mão.',
  },
  'deck.value.consumption.a': {
    en: 'Consumption is visible per capability, which makes the investment predictable from day one.',
    'pt-BR': 'O consumo fica visível por capacidade, o que torna o investimento previsível desde o primeiro dia.',
  },
  'deck.value.consumption.b': {
    en: 'The same data that runs operations explains what each team uses.',
    'pt-BR': 'Os mesmos dados que sustentam a operação explicam o que cada time usa.',
  },
  'deck.value.security.a': {
    en: 'Runtime vulnerability analytics shows which vulnerable code is actually loaded and exposed, so the team fixes what matters first.',
    'pt-BR': 'A análise de vulnerabilidades em tempo de execução mostra qual código vulnerável está de fato carregado e exposto, e o time corrige primeiro o que importa.',
  },
  'deck.value.security.b': {
    en: 'Security and operations share one source of truth, with the same entities and the same context.',
    'pt-BR': 'Segurança e operação compartilham uma única fonte de verdade, com as mesmas entidades e o mesmo contexto.',
  },
  'deck.value.experience.a': {
    en: 'Real user monitoring measures what customers actually experience — Core Web Vitals, errors and journeys — on every session.',
    'pt-BR': 'O monitoramento de usuários reais mede o que os clientes de fato vivem — Core Web Vitals, erros e jornadas — em cada sessão.',
  },
  'deck.value.experience.b': {
    en: 'Front end and back end are linked, so a slow page leads straight to the service behind it.',
    'pt-BR': 'Front-end e back-end ficam ligados, e uma página lenta leva direto ao serviço por trás dela.',
  },
  'deck.value.competitor.a': {
    en: 'One agent and one platform replace overlapping tools, with less to deploy, update and maintain.',
    'pt-BR': 'Um agente e uma plataforma substituem ferramentas sobrepostas, com menos para instalar, atualizar e manter.',
  },
  'deck.value.competitor.b': {
    en: 'Data that lived in silos now shares one model and one query language.',
    'pt-BR': 'Dados que viviam em silos passam a compartilhar um modelo e uma linguagem de consulta.',
  },
  'deck.value.overview.a': {
    en: 'The whole stack, from the user to the cloud, was mapped automatically within the PoC window.',
    'pt-BR': 'A pilha inteira, do usuário à nuvem, foi mapeada automaticamente dentro da janela da PoC.',
  },
  'deck.value.overview.b': {
    en: 'Every number in this deck was read from this environment and traces back to the query that produced it.',
    'pt-BR': 'Cada número deste deck foi lido deste ambiente e leva à consulta que o produziu.',
  },
  'deck.value.executive.a': {
    en: 'The PoC objectives were checked against measured outcomes from this environment.',
    'pt-BR': 'Os objetivos da PoC foram conferidos contra resultados medidos neste ambiente.',
  },
  'deck.value.executive.b': {
    en: 'What was proven here is ready to scale from the PoC scope to the whole estate.',
    'pt-BR': 'O que foi comprovado aqui está pronto para escalar do escopo da PoC para o ambiente inteiro.',
  },
  'deck.value.roi.a': {
    en: 'The value chain — discover, detect, resolve, automate — is built from what the platform measured here.',
    'pt-BR': 'A cadeia de valor — descobrir, detectar, resolver, automatizar — foi montada a partir do que a plataforma mediu aqui.',
  },
  'deck.value.roi.b': {
    en: 'Each step frees time the team can put back into delivery.',
    'pt-BR': 'Cada etapa libera tempo que o time pode devolver às entregas.',
  },

  // ------------------------------------------------------------------ What's new (3.3.3)
  'help.whatsNew.i50': {
    en: '3.3.3 — Tech Wrapup deck, reworked after your review: at most two slides per subject. A captured subject opens on the real capture of the app, with its KPIs, what each pin shows and the Dynatrace Assist; the next slide holds the detail — the chart or table, every finding and “Why it matters”, what the platform did here — without repeating a number. Pins no longer sit on the figure they point at.',
    'pt-BR': '3.3.3 — Deck Tech Wrapup, refeito depois da sua revisão: no máximo dois slides por assunto. Um assunto capturado abre na captura real do app, com os KPIs, o que cada pino mostra e o Dynatrace Assist; o slide seguinte traz o detalhe — o gráfico ou a tabela, todos os achados e “Por que importa”, o que a plataforma fez aqui — sem repetir número. Os pinos não ficam mais em cima do número que apontam.',
  },
  'help.whatsNew.i51': {
    en: '3.3.3 — Partner access now lasts 5, 15, 30, 60 or 90 days (15 by default) instead of hours. Partners already let in keep the time they were given.',
    'pt-BR': '3.3.3 — O acesso do parceiro passa a valer 5, 15, 30, 60 ou 90 dias (15 por padrão), em vez de horas. Quem já entrou mantém o prazo que recebeu.',
  },
} satisfies Record<string, Entry>;

/** The section ids that have value lines (the deck's sections). */
export const DECK_VALUE_SECTIONS = [
  'problems',
  'rca',
  'infrastructure',
  'cloud',
  'kubernetes',
  'services',
  'technologies',
  'logs',
  'consumption',
  'security',
  'experience',
  'competitor',
  'overview',
  'executive',
  'roi',
] as const;
