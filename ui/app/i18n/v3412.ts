import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.12 — one Coverage page (the Assessment and the old Coverage page merged), Dynatrace
 * Intelligence as the name of what was "Davis", and the Tech Wrapup's numbers fitted to their tiles. From the
 * owner's validation of 3.4.11 on 2026-11-19. Merged in `strings.ts`.
 */

export const v3412Strings = {
  'asm.tab.mapped': { en: 'What is mapped', 'pt-BR': 'O que está mapeado' },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i85': {
    en: '3.4.12 — One Coverage page: what was the Assessment and the old Coverage page are now a single page, with a new "What is mapped" tab (the inventory by category, the estate by layer, the instrumentation depth by host and the data sources); old links still open it. What was called Davis is now Dynatrace Intelligence everywhere. In the Tech Wrapup, every number is measured against its tile and set to fit, and the busiest-day pin points at the busiest day.',
    'pt-BR': '3.4.12 — Uma página Cobertura: o que era o Assessment e a antiga página Cobertura agora são uma página só, com a nova guia "O que está mapeado" (o inventário por categoria, o ambiente por camada, a profundidade de instrumentação por host e as fontes de dados); os links antigos continuam abrindo a página. O que se chamava Davis agora é Dynatrace Intelligence em todo o app. No Tech Wrapup, cada número é medido contra o seu bloco e ajustado para caber, e o pin do dia de maior volume aponta para esse dia.',
  },
} satisfies Record<string, Entry>;
