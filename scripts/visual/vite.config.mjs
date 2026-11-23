/**
 * Standalone Vite setup that renders the REAL app (`ui/main.tsx`) in a plain
 * browser with the Dynatrace platform SDK replaced by local mocks.
 *
 * DEV-ONLY. It lives entirely under scripts/visual/ and is never read by
 * `dt-app build`, `tsc`, `vitest` or ESLint, so it cannot change the shipped bundle.
 *
 *   node scripts/visual/capture.mjs            (starts this server itself)
 *   npx vite --config scripts/visual/vite.config.mjs   (manual browsing)
 *
 * Then open http://localhost:<port>/ui/?scenario=rich
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
// Vite resolves symlinks (a node_modules that is one still works), so use the real path.
const nodeModules = fs.realpathSync(path.join(repo, 'node_modules'));
const sdk = (name) => path.join(nodeModules, '@dynatrace-sdk', name, 'esm', 'index.js');
const assetsDir = path.join(repo, 'ui', 'assets');
const outRoot = path.join(repo, '.visual-qa');
export const CACHE_DIR = path.join(outRoot, '.vite');

const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.pptx': 'application/octet-stream' };

/** Serves ui/assets/* at /ui/assets/* (read-only), as the platform does for the built app. */
function assetsPlugin() {
  const middleware = (req, res, next) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (!pathname.startsWith('/ui/assets/')) return next();
    const file = path.resolve(assetsDir, decodeURIComponent(pathname.slice('/ui/assets/'.length)));
    if (!file.startsWith(assetsDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.statusCode = 404;
      res.end('not found');
      return undefined;
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
    return undefined;
  };
  return {
    name: 'pvs-harness-assets',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

/**
 * The app keeps language and executive mode in React state with fixed defaults, so
 * a URL cannot choose them. This build-time text transform lets `?locale=pt-BR` and
 * `?exec=1` seed those two `useState` calls. It touches only the in-memory
 * module text served to the harness; the source file is never modified. If the
 * patterns stop matching (ui/ changed), it warns and capture.mjs falls back to
 * driving the header controls.
 */
function seedStatePlugin() {
  return {
    name: 'pvs-harness-seed-state',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].endsWith('/ui/app/config/StudioContext.tsx')) return null;
      let out = code;
      let hits = 0;
      out = out.replace(/useState<Locale>\(\s*'en'\s*\)/, () => {
        hits += 1;
        return "useState<Locale>((globalThis.__PVS__?.locale ?? 'en') as Locale)";
      });
      out = out.replace(/\[executiveMode, setExecutiveMode\]\s*=\s*useState\(\s*false\s*\)/, () => {
        hits += 1;
        return '[executiveMode, setExecutiveMode] = useState(globalThis.__PVS__?.exec === true)';
      });
      if (hits !== 2) {
        this.warn(`[pvs-harness] seeded ${hits}/2 state defaults in StudioContext.tsx; ?locale and ?exec may be ignored (UI controls still work)`);
      }
      return { code: out, map: null };
    },
  };
}

export default defineConfig({
  root: here,
  cacheDir: CACHE_DIR,
  logLevel: 'warn',
  clearScreen: false,
  plugins: [seedStatePlugin(), assetsPlugin(), react()],
  resolve: {
    alias: [
      { find: /^@dynatrace-sdk\/react-hooks$/, replacement: path.join(here, 'mocks/react-hooks.mjs') },
      { find: /^@dynatrace-sdk\/client-query$/, replacement: path.join(here, 'mocks/client-query.mjs') },
      { find: /^@dynatrace-sdk\/app-environment$/, replacement: path.join(here, 'mocks/app-environment.mjs') },
      { find: /^@dynatrace-sdk\/client-state$/, replacement: path.join(here, 'mocks/client-state.mjs') },
      // 3.2.7: the real-prints store keeps its documents in the Document Service.
      { find: /^@dynatrace-sdk\/client-document$/, replacement: path.join(here, 'mocks/client-document.mjs') },
      // The mocks re-export everything they do not replace from the real packages.
      { find: /^@pvs-real\/react-hooks$/, replacement: sdk('react-hooks') },
      { find: /^@pvs-real\/client-query$/, replacement: sdk('client-query') },
      { find: /^@pvs-real\/app-environment$/, replacement: sdk('app-environment') },
      { find: /^@pvs-real\/client-state$/, replacement: sdk('client-state') },
      { find: /^@pvs-real\/client-document$/, replacement: sdk('client-document') },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: false,
    // Files change under us while the harness runs; a captured run must be one consistent build.
    hmr: false,
    watch: null,
    fs: { allow: [repo, nodeModules] },
  },
  preview: { host: '127.0.0.1', port: 5198, strictPort: false },
  build: {
    // PVS_HARNESS_DIST gives a run its own bundle directory, so two build-mode runs at once never empty each other's.
    outDir: process.env.PVS_HARNESS_DIST ? path.resolve(process.env.PVS_HARNESS_DIST) : path.join(outRoot, '.dist'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
});
