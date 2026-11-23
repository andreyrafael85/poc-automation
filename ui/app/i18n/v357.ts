import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.7, from the owner's validation of 3.5.6 (2026-11-21): the Tech Wrapup's pins on the
 * Dynatrace Intelligence calendar, the RCA trail and the value chain placed right and without repeating each other,
 * and richer Real proofs. Merged in `strings.ts`.
 */

export const v357Strings = {
  // ---------------------------------------------------------------- Tech Wrapup pins
  'cap.pin2.busiestDay': { en: 'Busiest day: {day} — {value} problems', 'pt-BR': 'Dia mais cheio: {day} — {value} problemas' },
  'cap.pin2.affected': { en: 'Affected: {name} and {count} entities in all', 'pt-BR': 'Afetada: {name}, de {count} entidades no total' },
  'cap.pin2.caller': { en: 'Calls the root cause: {name} — {value}', 'pt-BR': 'Chama a causa raiz: {name} — {value}' },
  'cap.pin2.k8s': { en: 'Where it ran: {value}', 'pt-BR': 'Onde rodou: {value}' },
  'cap.d.cal.summary': {
    en: 'The window in one sentence: how many problems began, the daily average and the busiest day and period.',
    'pt-BR': 'A janela numa frase: quantos problemas começaram, a média por dia e o dia e o período mais cheios.',
  },
  'cap.d.rca.caller': {
    en: 'The services that call the root cause, with the failures measured on their traces during the incident.',
    'pt-BR': 'Os serviços que chamam a causa raiz, com as falhas medidas nos traces deles durante o incidente.',
  },
  'cap.d.rca.k8s': {
    en: 'The cluster, namespace and workload the incident ran on, joined to it by Smartscape.',
    'pt-BR': 'O cluster, o namespace e a workload em que o incidente rodou, ligados a ele pelo Smartscape.',
  },

  // ---------------------------------------------------------------- Real proofs: the deck waits for the reading
  'prt.deck.readingScreens': {
    en: 'Reading {count} screen(s) to place their pins — the deck is ready to download as soon as the reading ends.',
    'pt-BR': 'Lendo {count} tela(s) para posicionar os alfinetes — o deck fica pronto para baixar assim que a leitura terminar.',
  },

  // ---------------------------------------------------------------- Real proofs: the problem screen, richer
  'prt.pin.problem.events': {
    en: 'Events: every signal of the incident grouped in one problem by Dynatrace Intelligence — one notification, not one per symptom',
    'pt-BR': 'Eventos: todos os sinais do incidente agrupados num só problema pela Dynatrace Intelligence — uma notificação, não uma por sintoma',
  },
  'prt.pin.problem.automation': {
    en: 'Remediation: the problem triggered an AutomationEngine workflow on its own — the response starts before anyone opens a ticket',
    'pt-BR': 'Remediação: o problema disparou sozinho um workflow do AutomationEngine — a resposta começa antes de alguém abrir um chamado',
  },
  'prt.read.cropped': {
    en: 'This screen was cut to fit when it was added: labels at its edges may be missing. To read it whole and get more pins, use "Replace" with the full screenshot.',
    'pt-BR': 'Esta tela foi cortada para caber quando entrou: rótulos nas bordas podem ter ficado de fora. Para lê-la inteira e ganhar mais alfinetes, use "Substituir" com a captura completa.',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i99': {
    en: '3.5.7 — The pins, reviewed. Tech Wrapup: on the Dynatrace Intelligence calendar the busiest day\'s pin sits right after its total and the busiest slot\'s pin inside its own cell, with the window\'s sentence as a new pin; on the root-cause trail the affected entity is read with how many the problem reached, and the new pins show who calls the root cause (with the failures measured) and where in Kubernetes it ran; on the value chain the pins no longer hide the steps\' icons. Real proofs: the problem screen gains two pins the reading finds on any screen — the events grouped in the problem and the remediation it triggered; the deck waits until every screen has been read ("Reading N screens…"); and a screen cut when it was added (before 3.5.5) says so, with the way to read it whole.',
    'pt-BR': '3.5.7 — Os alfinetes, revisados. Tech Wrapup: no calendário da Dynatrace Intelligence o alfinete do dia mais cheio fica logo depois do total e o da faixa mais cheia dentro da própria célula, com a frase da janela como alfinete novo; na trilha da causa raiz a entidade afetada é lida com quantas o problema alcançou, e os alfinetes novos mostram quem chama a causa raiz (com as falhas medidas) e onde no Kubernetes ela rodou; na cadeia de valor os alfinetes não cobrem mais os ícones das etapas. Provas reais: a tela do problema ganha dois alfinetes que a leitura encontra em qualquer tela — os eventos agrupados no problema e a remediação que ele disparou; o deck espera todas as telas serem lidas ("Lendo N telas…"); e uma tela cortada quando entrou (antes da 3.5.5) avisa, com o caminho para lê-la inteira.',
  },
} satisfies Record<string, Entry>;
