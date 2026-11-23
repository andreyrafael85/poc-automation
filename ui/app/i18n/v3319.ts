import { type Entry } from './locales';

/** PoC Value Studio 3.3.19 — a capture marked "no data" is tried again; pictures and marks of another version never count. Merged in `strings.ts`. */

export const v3319Strings = {
  'deck.ready.retry': { en: 'Try again', 'pt-BR': 'Tentar de novo' },
  'help.whatsNew.i70': {
    en: '3.3.19 — Tech Wrapup captures you can trust: a panel that had no data in a read now offers "Try again" (and "Capture what is missing" includes it), and a picture or a "no data" mark taken by another version of the app no longer counts — a panel can change between versions under the same name, as Problems\' arrivals did in 3.3.16.',
    'pt-BR': '3.3.19 — Capturas do Tech Wrapup confiáveis: um painel que ficou sem dados numa leitura agora oferece "Tentar de novo" (e "Capturar o que falta" o inclui), e uma imagem ou uma marca de "sem dados" feita por outra versão do app deixa de valer — um painel pode mudar entre versões com o mesmo nome, como a chegada de problemas mudou na 3.3.16.',
  },
} satisfies Record<string, Entry>;
