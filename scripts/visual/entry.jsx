/**
 * Harness entry.
 *
 * Deliberately tiny: it imports the REAL application entry (`ui/main.tsx`), so
 * whatever providers, CSS and router configuration the app ships with are what
 * the harness renders, with no copy to drift. All platform access is replaced
 * by the aliases in `vite.config.mjs` (see `mocks/`).
 *
 * This is `.jsx` rather than `.tsx` on purpose: the repository's ESLint config
 * type-checks every `**\/*.ts(x)` through the project service, and files outside
 * `ui/tsconfig.json` would turn `npm run lint` red.
 */

import '../../ui/main.tsx';
