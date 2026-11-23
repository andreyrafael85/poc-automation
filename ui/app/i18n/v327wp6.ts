import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — top-up keys of work package WP6 of the real-prints deck (keys not already in v327prints.ts).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 */

export const v327Wp6Strings = {
  // The cross-reference on a story card to the print it stands on ("→ 02"); numbers are the deck's own.
  'prt.deck.storyRef': { en: '→ {n}', 'pt-BR': '→ {n}' },
  // 3.2.7 review UX-L4: a story card whose step has no print in this deck says what proves it instead of a blank box.
  'prt.deck.storyNoPrint': { en: 'Proof by DQL', 'pt-BR': 'Prova por DQL' },
} as const satisfies Record<string, Entry>;
