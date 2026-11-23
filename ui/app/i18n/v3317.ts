import { type Entry } from './locales';

/** PoC Value Studio 3.3.17 — "The PoC on one page" opens the Tech Wrapup; the SE Report's section 2 side by side. Merged in `strings.ts`. */

export const v3317Strings = {
  'deck.exec.title': { en: 'The PoC on one page', 'pt-BR': 'A PoC em uma página' },
  'deck.exec.subtitle': {
    en: 'Three questions the PoC answered, with figures read from your environment',
    'pt-BR': 'Três perguntas que a PoC respondeu, com números lidos do seu ambiente',
  },
  'deck.exec.notMeasured': { en: 'Not measured in this window — the slide says so instead of guessing.', 'pt-BR': 'Sem leitura nesta janela — o slide diz isso em vez de estimar.' },
  'deck.exec.q1': { en: 'Do we see the whole estate?', 'pt-BR': 'Vemos o ambiente inteiro?' },
  'deck.exec.q2': { en: 'Are problems found and solved?', 'pt-BR': 'Os problemas são encontrados e resolvidos?' },
  'deck.exec.q3': { en: 'Are services and users well served?', 'pt-BR': 'Serviços e usuários estão bem atendidos?' },
  'deck.exec.a1': {
    en: '{entities} entities monitored and {coverage} of the categories with telemetry — discovered by OneAgent, none declared by hand.',
    'pt-BR': '{entities} entidades monitoradas e {coverage} das categorias com telemetria — descobertas pelo OneAgent, nenhuma cadastrada à mão.',
  },
  'deck.exec.a2': {
    en: '{problems} problems detected in 7 days and {closed} of them already closed; the mean time to resolve is {mttr}.',
    'pt-BR': '{problems} problemas detectados em 7 dias e {closed} deles já encerrados; o tempo médio de resolução é de {mttr}.',
  },
  'deck.exec.a2NoMttr': {
    en: '{problems} problems detected in 7 days and {closed} of them already closed.',
    'pt-BR': '{problems} problemas detectados em 7 dias e {closed} deles já encerrados.',
  },
  'deck.exec.a3': {
    en: '{health} of the {services} services with traffic stay under 1% failures, and the front-end error rate is {rate}.',
    'pt-BR': '{health} dos {services} serviços com tráfego ficam abaixo de 1% de falhas, e a taxa de erro no front-end é de {rate}.',
  },
  'deck.exec.a3NoRum': {
    en: '{health} of the {services} services with traffic stay under 1% failures.',
    'pt-BR': '{health} dos {services} serviços com tráfego ficam abaixo de 1% de falhas.',
  },
  'deck.verdict.healthy': {
    en: 'problems resolve quickly and few remain open, both measured in this window.',
    'pt-BR': 'os problemas se resolvem rápido e poucos ficam abertos, ambos medidos nesta janela.',
  },
  'deck.verdict.stable': {
    en: 'resolution times are reasonable and the open backlog is contained; the next steps say where the remaining effort sits.',
    'pt-BR': 'os tempos de resolução são razoáveis e o backlog aberto está contido; os próximos passos dizem onde está o esforço restante.',
  },
  'deck.verdict.attention': {
    en: 'a few entities account for most of the open or slow problems, so a few targeted fixes would move the figures.',
    'pt-BR': 'poucas entidades respondem pela maior parte dos problemas abertos ou lentos, então poucas correções direcionadas moveriam os números.',
  },
  'deck.verdict.partial': {
    en: 'problem behaviour is measured; the size of the estate will read once the entity model answers.',
    'pt-BR': 'o comportamento dos problemas está medido; o tamanho do ambiente aparece quando o modelo de entidades responder.',
  },
  'deck.verdict.blocked': {
    en: 'problem data needs a read permission before this environment can be judged.',
    'pt-BR': 'os dados de problemas precisam de uma permissão de leitura antes de avaliar este ambiente.',
  },
  'deck.verdict.unknown': {
    en: 'this window holds too little measured signal for a conclusion yet.',
    'pt-BR': 'esta janela ainda tem pouco sinal medido para uma conclusão.',
  },
  'help.whatsNew.i68': {
    en: '3.3.17 — The Tech Wrapup opens on "The PoC on one page": three questions a customer asks — do we see the whole estate, are problems found and solved, are services and users well served — each answered by its ring and a measured sentence, beside the next steps; the business section later in the deck is now "Business impact". In the SE Report, "How problems behave" prints its eight figures four to a row.',
    'pt-BR': '3.3.17 — O Tech Wrapup abre com "A PoC em uma página": três perguntas que o cliente faz — vemos o ambiente inteiro, os problemas são encontrados e resolvidos, serviços e usuários estão bem atendidos — cada uma respondida pelo seu anel e por uma frase medida, ao lado dos próximos passos; a seção de negócio, mais adiante no deck, passa a se chamar "Impacto no negócio". No Relatório SE, "Como os problemas se comportam" imprime os oito números em linhas de quatro.',
  },
} satisfies Record<string, Entry>;
