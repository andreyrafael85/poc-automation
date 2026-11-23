import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Test configuration.
 *
 * Kept separate from the App Toolkit build, which owns bundling and deployment.
 * Vitest only ever runs against the source tree.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['ui/app/tests/**/*.test.{ts,tsx}'],
    setupFiles: ['ui/app/tests/setup.ts'],
    // Strato 3.15 imports its stylesheets from its ESM output (`import './AppRoot.css'`), which
    // Node cannot load. Inlining the packages sends them through Vite, which handles CSS.
    // The stylesheets themselves are not needed (and jsdom cannot parse their modern syntax), so CSS stays off.
    server: { deps: { inline: [/@dynatrace\//] } },
  },
});
