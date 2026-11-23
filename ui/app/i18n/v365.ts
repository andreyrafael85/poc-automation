import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.5 (the owner: "pode seguir com a 3.6.5 com suas recomendações"): accessibility
 * without a known exception — the tables size their own columns (no resize handles), every target meets WCAG 2.5.8 and
 * every page passes the keyboard check. Merged in `strings.ts`.
 */

export const v365Strings = {
  'help.whatsNew.i107': {
    en: '3.6.5 — Accessible to the last control. The tables keep the columns the app sized for them — the small drag handles between column headers are gone, and with them the last controls too small to touch or without a visible focus. Every page now meets the 24-pixel target size of WCAG 2.2 and passes the keyboard check, on desktop, tablet and phone, in both languages.',
    'pt-BR': '3.6.5 — Acessível até o último controle. As tabelas mantêm as colunas no tamanho que o app definiu — saíram as pequenas alças de arrastar entre os cabeçalhos, e com elas os últimos controles pequenos demais para tocar ou sem foco visível. Todas as páginas atendem agora ao tamanho de alvo de 24 pixels do WCAG 2.2 e passam na verificação de teclado, no computador, no tablet e no celular, nos dois idiomas.',
  },
} satisfies Record<string, Entry>;
