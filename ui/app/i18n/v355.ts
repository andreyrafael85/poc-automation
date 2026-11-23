import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.5 (visual proposal v5, its first release): Real proofs whose pins are placed by an
 * automatic reading of the screen (the SE may still adjust them), whole screens without a cut, and the technical
 * appendix as an option. Merged in `strings.ts`.
 */

export const v355Strings = {
  // ---------------------------------------------------------------- the automatic reading of a screen
  'prt.read.running': { en: 'Reading the screen: finding the labels the pins belong to…', 'pt-BR': 'Lendo a tela: localizando os rótulos dos alfinetes…' },
  'prt.read.found': {
    en: 'Pins placed automatically on {count} labels of the screen. A reading with no label found is listed under the legend, without a number.',
    'pt-BR': 'Alfinetes posicionados automaticamente em {count} rótulos da tela. Uma leitura sem rótulo encontrado aparece abaixo da legenda, sem número.',
  },
  'prt.read.none': {
    en: 'No label of this screen was found with confidence: its readings go under the legend, without pins. You can still place pins in the editor.',
    'pt-BR': 'Nenhum rótulo desta tela foi encontrado com segurança: as leituras entram abaixo da legenda, sem alfinetes. Você ainda pode posicionar alfinetes no editor.',
  },

  // ---------------------------------------------------------------- editor: guided placement
  'prt.ed.place.progress': {
    en: '{confirmed} of {total} pins in place (the reading placed them on the labels it found). To add one it did not find, choose "Place" and click the spot, or "Right here" when the estimate is right. A pin left at an estimated spot is not drawn; the deck reads best with {min} or more.',
    'pt-BR': '{confirmed} de {total} alfinetes no lugar (a leitura os posicionou nos rótulos que encontrou). Para incluir um que ela não achou, escolha "Posicionar" e clique no ponto, ou "Está certo aqui" quando a estimativa estiver certa. Alfinete em posição estimada não é desenhado; o deck lê melhor com {min} ou mais.',
  },
  'prt.ed.place.button': { en: 'Place {n}', 'pt-BR': 'Posicionar {n}' },
  'prt.ed.place.waiting': { en: 'Click the spot for {n}', 'pt-BR': 'Clique no ponto do {n}' },
  'prt.ed.place.confirm': { en: 'Right here', 'pt-BR': 'Está certo aqui' },
  'prt.ed.place.inPlace': { en: 'in place', 'pt-BR': 'no lugar' },
  'prt.ed.place.now': { en: 'Click on the screen where pin {n} goes.', 'pt-BR': 'Clique na tela onde vai o alfinete {n}.' },
  'prt.ed.place.next': { en: 'Pin {n} placed. Now pin {next}: click its spot.', 'pt-BR': 'Alfinete {n} posicionado. Agora o {next}: clique no ponto dele.' },
  'prt.ed.place.done': { en: 'Pin {n} placed. Every pin is in place.', 'pt-BR': 'Alfinete {n} posicionado. Todos os alfinetes estão no lugar.' },
  'prt.ed.place.confirmed': { en: 'Pin {n} confirmed where it is.', 'pt-BR': 'Alfinete {n} confirmado onde está.' },
  'prt.ed.place.same': { en: 'The pin is already there.', 'pt-BR': 'O alfinete já está aí.' },

  // ---------------------------------------------------------------- deck: the appendix as an option
  'prt.deck.appendix': {
    en: 'Include the technical appendix (methodology and the queries behind every number)',
    'pt-BR': 'Incluir o apêndice técnico (metodologia e as consultas por trás de cada número)',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i97': {
    en: '3.5.5 — Real proofs that place their own pins: when a screen is added, the app reads it in the background and finds the platform\'s own labels each pin belongs to ("Root cause", the problem\'s id, "Error rate", the service\'s name…), drawing the text in the platform\'s typeface and matching it on the picture, in the browser, nothing sent anywhere. A pin is drawn only on a label found with confidence (or placed by you in the editor); what a pin not found would have said goes under the legend as an unnumbered line — never a pin on empty space or on the wrong column. A screen whose name or problem id is found is verified on its own. Screens added before are read once. A screen added without the platform\'s navigation is no longer cut at its left edge. The methodology and query pages are an option, off by default ("Include the technical appendix").',
    'pt-BR': '3.5.5 — Provas reais que posicionam os próprios alfinetes: ao entrar uma tela, o app a lê em segundo plano e encontra os rótulos da própria plataforma a que cada alfinete pertence ("Root cause", o ID do problema, "Error rate", o nome do serviço…), desenhando o texto na tipografia da plataforma e comparando com a imagem, no navegador, sem enviar nada a lugar nenhum. Um alfinete só é desenhado num rótulo encontrado com segurança (ou posicionado por você no editor); o que um alfinete não encontrado diria entra abaixo da legenda como linha sem número — nunca um alfinete em área vazia ou na coluna errada. A tela cujo nome ou ID do problema é encontrado fica verificada sozinha. Telas enviadas antes são lidas uma vez. Uma tela enviada sem o menu da plataforma não é mais cortada na borda esquerda. As páginas de metodologia e consultas viraram opção, desligada por padrão ("Incluir o apêndice técnico").',
  },
} satisfies Record<string, Entry>;
