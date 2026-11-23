import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.2: the owner's validation of 3.5.0 and 3.5.1 (2026-11-20) — the Overview's header
 * with the Dynatrace brand gradient and its gauges filled again, livelier number cards, the PoC scorecard's radar
 * restyled. Merged in `strings.ts`.
 */

export const v352Strings = {
  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i94': {
    en: '3.5.2 — From your validation of 3.5.0 and 3.5.1: the Overview’s header is back on the Dynatrace brand gradient and its three gauges are drawn again; every number card has a coloured icon badge, an accent line and a soft wash in its own colour; the PoC scorecard’s radar is restyled — sized to keep its text readable, the status in the colour of each point, the ranking beside it with proportional bars and each dimension’s step on the scale (“4/5”). The side navigation shows each page’s icon, and the headline cards of the Executive summary, Security, Value and the PoC timeline share the new card.',
    'pt-BR': '3.5.2 — Da sua validação da 3.5.0 e da 3.5.1: o cabeçalho da Visão geral voltou ao degradê da marca Dynatrace e os três medidores são desenhados de novo; cada cartão de número tem um selo de ícone colorido, um filete de destaque e um brilho suave na sua cor; o radar do placar da PoC foi reestilizado — no tamanho que mantém o texto legível, o status na cor de cada ponto, a lista ao lado com barras proporcionais e o degrau de cada dimensão na escala (“4/5”). O menu lateral mostra o ícone de cada página, e os cartões de destaque do Resumo executivo, Segurança, Valor e Linha do tempo usam o cartão novo.',
  },
} satisfies Record<string, Entry>;
