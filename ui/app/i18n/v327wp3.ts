import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — top-up keys of work package WP3 of the real-prints deck (keys not already in v327prints.ts).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 */

export const v327Wp3Strings = {
} as const satisfies Record<string, Entry>;
