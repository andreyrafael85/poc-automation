#!/usr/bin/env node
/**
 * Release do PoC Automation 3.0.
 *
 * Faz três coisas, e só elas — nunca implanta nada:
 *   --check               confere que a versão bate nos 5 lugares;
 *   --version <x.y.z>     sobe a versão nos 5 lugares (e só neles);
 *   --pack                roda o build otimizado e grava out/<versão>.zip + .sha256.
 * Sem argumento vale `--check`. `--version` e `--pack` podem vir juntos.
 *
 * Os 5 lugares:
 *   package.json .version
 *   package-lock.json .version e .packages[""].version   (as outras ocorrências do
 *                                                         número são do vitest)
 *   app.config.json .app.version
 *   ui/app/config/appInfo.ts  APP_VERSION
 *
 * O pacote é recusado quando out/<versão>.zip já existe (uma versão implantada
 * nunca é regravada) e quando o dist contém a estação, o tenant de laboratório
 * ou um tenant de cliente.
 */

import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'out');
const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * Cadeias que nunca podem sair no pacote: o diretório home de quem constrói (caminhos da estação) e
 * os ids de tenant que você não quer ver no bundle. `custa001`/`custb002` são marcadores de exemplo;
 * acrescente os seus em PVS_RELEASE_FORBIDDEN (lista separada por vírgulas), por exemplo o id do
 * tenant de laboratório e os dos clientes.
 */
const FORBIDDEN = [
  ...(homedir().length > 1 ? [homedir()] : []),
  'custa001',
  'custb002',
  ...(process.env.PVS_RELEASE_FORBIDDEN ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
];

const say = (line) => process.stdout.write(`${line}\n`);

/** Erro do script: a mensagem sai no stderr e a saída é 1, mas quem subiu a versão pode desfazer. */
class ReleaseError extends Error {}
const die = (line) => {
  throw new ReleaseError(line);
};

function parseArgs(argv) {
  const args = { check: false, version: null, pack: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--pack') args.pack = true;
    else if (arg === '--version') {
      args.version = argv[i + 1] ?? '';
      i += 1;
    } else die(`argumento desconhecido: ${arg}`);
  }
  if (!args.pack && args.version === null) args.check = true;
  return args;
}

/** A versão em cada um dos 5 lugares, para conferência e para a troca. */
async function readVersions() {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(join(ROOT, 'package-lock.json'), 'utf8'));
  const app = JSON.parse(await readFile(join(ROOT, 'app.config.json'), 'utf8'));
  const info = await readFile(join(ROOT, 'ui/app/config/appInfo.ts'), 'utf8');
  const match = info.match(/export const APP_VERSION = '([^']+)';/);
  if (match === null) die('APP_VERSION não encontrado em ui/app/config/appInfo.ts');
  return {
    'package.json': pkg.version,
    'package-lock.json (.version)': lock.version,
    'package-lock.json (packages."")': lock.packages?.['']?.version,
    'app.config.json': app.app?.version,
    'appInfo.ts': match[1],
  };
}

function singleVersion(places) {
  const values = [...new Set(Object.values(places))];
  return values.length === 1 ? values[0] : null;
}

/**
 * Sobe a versão nos 5 lugares.
 *
 * Devolve também `undo()`, que repõe o conteúdo exato dos 5 arquivos. Com `--version --pack`
 * juntos, o empacotamento só acontece depois da troca, e qualquer falha dele (build, sanitização)
 * desfaz a troca: senão a árvore ficava num número novo sem artefato nenhum, e a execução
 * seguinte do mesmo comando morria em "a versão já é x.y.z".
 */
async function bump(next) {
  if (!SEMVER.test(next)) die(`versão inválida: "${next}" (esperado x.y.z)`);
  const places = await readVersions();
  const current = singleVersion(places);
  if (current === null) die(`a versão atual diverge entre os arquivos:\n${JSON.stringify(places, null, 2)}`);
  if (current === next) die(`a versão já é ${next}; o AppEngine recusa reimplantar o mesmo número com outro conteúdo`);

  const pkgPath = join(ROOT, 'package.json');
  const lockPath0 = join(ROOT, 'package-lock.json');
  const appPath0 = join(ROOT, 'app.config.json');
  const infoPath0 = join(ROOT, 'ui/app/config/appInfo.ts');
  // O conteúdo exato de antes, para repor byte a byte se o empacotamento falhar.
  const before = await Promise.all(
    [pkgPath, lockPath0, appPath0, infoPath0].map(async (path) => [path, await readFile(path, 'utf8')]),
  );

  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  pkg.version = next;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  // No lock só as duas ocorrências do próprio pacote mudam; as demais são de dependências.
  const lockPath = join(ROOT, 'package-lock.json');
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  lock.version = next;
  lock.packages[''].version = next;
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  const appPath = join(ROOT, 'app.config.json');
  const app = JSON.parse(await readFile(appPath, 'utf8'));
  app.app.version = next;
  await writeFile(appPath, `${JSON.stringify(app, null, 2)}\n`);

  const infoPath = join(ROOT, 'ui/app/config/appInfo.ts');
  const info = await readFile(infoPath, 'utf8');
  await writeFile(infoPath, info.replace(/export const APP_VERSION = '[^']+';/, `export const APP_VERSION = '${next}';`));

  say(`versão ${current} → ${next} nos 5 lugares`);
  say('lembre do resto da subida: help.whatsNew.i<NN>, helpPanels.test.tsx numa minor e o CHANGELOG.md');
  return { version: next, undo: () => Promise.all(before.map(([path, text]) => writeFile(path, text))) };
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

/** Procura a estação e os tenants nos arquivos de texto do dist. */
async function sanitise(files) {
  const hits = [];
  for (const file of files) {
    if (!/\.(js|mjs|cjs|css|html|json|map|txt|svg)$/i.test(file)) continue;
    const text = await readFile(file, 'utf8');
    for (const needle of FORBIDDEN) if (text.includes(needle)) hits.push(`${relative(ROOT, file)}: "${needle}"`);
  }
  return hits;
}

function run(command, args) {
  say(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) die(`"${command} ${args.join(' ')}" terminou com ${result.status ?? result.signal}`);
}

async function pack(version) {
  await mkdir(OUT, { recursive: true });
  const zipPath = join(OUT, `poc-value-studio-${version}.zip`);
  const exists = await stat(zipPath).then(() => true, () => false);
  if (exists) die(`${relative(ROOT, zipPath)} já existe — uma versão arquivada nunca é regravada`);

  run('npm', ['run', 'build', '--', '--optimize', '--enable-code-splitting']);

  const files = (await walk(DIST)).sort();
  say(`dist/: ${files.length} arquivos`);

  const hits = await sanitise(files);
  if (hits.length > 0) die(`o pacote não pode sair com estas ocorrências:\n  ${hits.join('\n  ')}`);
  say(`sanitização: nenhuma ocorrência de ${FORBIDDEN.join(', ')}`);

  // zip determinístico: entradas em ordem, caminhos relativos ao dist e data fixa,
  // para que o mesmo dist gere sempre o mesmo SHA-256.
  const zip = new JSZip();
  const stamp = new Date(Date.UTC(1980, 0, 1));
  for (const file of files) {
    zip.file(relative(DIST, file).split(sep).join('/'), await readFile(file), { date: stamp, createFolders: false });
  }
  await writeFile(zipPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'UNIX' }));
  const digest = await sha256(zipPath);
  await writeFile(`${zipPath}.sha256`, `${digest}  ${relative(OUT, zipPath)}\n`);

  const manifest = {
    version,
    builtAt: new Date().toISOString(),
    node: process.version,
    distFiles: files.length,
    zip: relative(ROOT, zipPath).split(sep).join('/'),
    sha256: digest,
  };
  await writeFile(join(OUT, `poc-value-studio-${version}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  say(`pacote: ${manifest.zip}`);
  say(`sha256: ${digest}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.check) {
    const places = await readVersions();
    const version = singleVersion(places);
    if (version === null) die(`a versão diverge entre os arquivos:\n${JSON.stringify(places, null, 2)}`);
    say(`versão ${version} igual nos 5 lugares`);
  }

  const bumped = args.version === null ? null : await bump(args.version);
  const version = bumped === null ? singleVersion(await readVersions()) : bumped.version;
  if (version === null) die('a versão diverge entre os arquivos; rode --check');

  if (!args.pack) return;

  try {
    await pack(version);
  } catch (error) {
    // Com `--version --pack` juntos, uma falha do empacotamento (build, sanitização, disco)
    // desfaz a troca: senão a árvore fica num número novo sem artefato, e a execução seguinte
    // morre em "a versão já é x.y.z".
    if (bumped !== null) {
      await bumped.undo();
      say('versão revertida nos 5 arquivos: o pacote não saiu');
    }
    throw error;
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`erro: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
