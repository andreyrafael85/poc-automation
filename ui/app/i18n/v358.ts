import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.8, the visual proposal v6 wave 1 (approved by the owner on 2026-11-21): the side
 * menu, the neutral dark surfaces and the number cards with their icon box and change chip. Merged in `strings.ts`.
 */

export const v358Strings = {
  'v6.delta.day0': { en: '{change} since the PoC’s Day 0', 'pt-BR': '{change} desde o Dia 0 da PoC' },
  'v6.delta.day0Note': {
    en: 'The chips compare each count with the PoC’s Day 0 (the same inventory, read over the PoC’s first day — cov.inventory.day0).',
    'pt-BR': 'Os chips comparam cada contagem com o Dia 0 da PoC (o mesmo inventário, lido no primeiro dia da PoC — cov.inventory.day0).',
  },
  'help.whatsNew.i100': {
    en: '3.5.8 — The app in the v6 look, first wave. The side menu reads like the platform\'s dashboards: small stage headings, compact items with their icons and the current page on a quiet fill with a turquoise edge. In the dark theme the surfaces are a neutral near-black with quiet borders (the light theme stays the platform\'s own). Every number card has its icon in a box at the right, the number large and flat, and the evidence at the foot. On the Overview, each count of the monitored inventory carries a chip with its change since the PoC\'s Day 0 (▲ +17 hosts), read from the same inventory over the PoC\'s first day — shown only once a PoC start date is set.',
    'pt-BR': '3.5.8 — O app no visual da v6, primeira onda. O menu lateral fica como o dos painéis da plataforma: títulos de etapa pequenos, itens compactos com seus ícones e a página atual num fundo discreto com um filete turquesa. No tema escuro as superfícies são de um quase-preto neutro com bordas discretas (o tema claro segue o da plataforma). Cada cartão de número tem o ícone numa caixa à direita, o número grande e sem degradê, e a evidência no rodapé. Na Visão geral, cada contagem do inventário monitorado ganha um chip com a variação desde o Dia 0 da PoC (▲ +17 hosts), lida do mesmo inventário no primeiro dia da PoC — só aparece quando há data de início da PoC.',
  },
} satisfies Record<string, Entry>;
