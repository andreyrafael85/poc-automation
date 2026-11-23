#!/usr/bin/env node
// The brand pack of the Tech Wrapup deck (3.3.5): what makes the deck the corporate one instead of the
// neutral one the app writes itself (`ui/app/features/wrapup/neutralTemplate.ts`).
//
//   npm run brand:status
//   npm run brand:install -- --brand <brand kit folder> [--template <deck template .pptx>] [--glyphs <third-party icon gallery index.html>]
//   npm run brand:strip
//
// `install` reads a brand kit you are entitled to use and writes, in one go:
//   - ui/assets/techwrapup-brand-template.pptx  the corporate template: the kit's .pptx/.potx whose layouts
//                                               1/28/33/56 are the cover, dark standard, dark blank and end
//                                               slides (sample slides removed, then `clean-pptx-template.cjs`)
//   - ui/app/features/wrapup/fonts.ts           DT Flow Light/Medium/Bold as base64 @font-face
//   - ui/app/features/wrapup/brand.ts           the horizontal logo, white and colour, as PNG
//   - ui/app/features/wrapup/productLogos.ts    the product logomarks as PNG
//   - ui/app/components/spectrum/brandGlyphs.ts with --glyphs (`gen-brand-glyphs.cjs`)
//   - ui/assets/Dynatrace_Logo.svg              the Overview banner's vendor mark
//   - ui/app/features/wrapup/brandPack.ts       BRAND_PACK_INSTALLED = true
// Each file is looked up by name anywhere under --brand, so the kit's own folder layout is fine.
// The logos are rasterised with @resvg/resvg-js, installed on first use into a temporary folder —
// package.json and the lockfile are never touched.
//
// `strip` does the reverse, for a checkout that must not carry the brand (a public repository):
// empty stubs with the same exports, no template, BRAND_PACK_INSTALLED = false. The app then builds
// every deck on the neutral template.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const WRAPUP = path.join(ROOT, 'ui/app/features/wrapup');
const OUT = {
  template: path.join(ROOT, 'ui/assets/techwrapup-brand-template.pptx'),
  mark: path.join(ROOT, 'ui/assets/Dynatrace_Logo.svg'),
  fonts: path.join(WRAPUP, 'fonts.ts'),
  brand: path.join(WRAPUP, 'brand.ts'),
  products: path.join(WRAPUP, 'productLogos.ts'),
  glyphs: path.join(ROOT, 'ui/app/components/spectrum/brandGlyphs.ts'),
  flag: path.join(WRAPUP, 'brandPack.ts'),
};

/** Product key → the logomark file the kit names it by. Order is the order of the generated file. */
const PRODUCTS = {
  davis: 'Davis AI_logomark_no padding.svg',
  grail: 'Grail_logomark_no padding.svg',
  smartscape: 'Smartscape_logomark.svg',
  oneagent: 'OneAgent_logomark_no padding.svg',
  appengine: 'AppEngine_logomark_no padding.svg',
  automation: 'Automation Engine_logomark_no padding.svg',
  purepath: 'PurePath_logomark_no padding.svg',
  dql: 'DQL_logomark_no padding.svg',
  openpipeline: 'OpenPipeline_logomark_no padding.svg',
  loganalytics: 'Log Analytics_logomark_no padding.svg',
  appsec: 'Application Security_logomark_no padding.svg',
  infra: 'Infrastructure Monitoring_logomark_no padding.svg',
  dex: 'Digital Experience_logomark_no padding.svg',
  platform: 'Platform_logomark_no padding.svg',
};
const FONTS = [
  { file: 'DTFlow-Light.otf', weight: 300 },
  { file: 'DTFlow-Medium.otf', weight: 600 },
  { file: 'DTFlow-Bold.otf', weight: 800 },
];
const LOGOS = { white: 'Dt_Logo_White-Horzontal.svg', color: 'Dt_Logo_Color-Horizontal.svg' };
const KEEP_LAYOUT = 28;

const args = process.argv.slice(2);
const command = args[0] ?? 'status';
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};

const flagSource = (installed) =>
  `/**
 * Whether this checkout of the app carries the brand pack (3.3.5): the corporate PowerPoint template
 * (\`ui/assets/techwrapup-brand-template.pptx\`), the DT Flow font (\`fonts.ts\`) and the logos
 * (\`brand.ts\`, \`productLogos.ts\`). Written by \`npm run brand:install\` — never by hand.
 *
 * Without it the Tech Wrapup and the Real proof deck are built on the neutral template the app
 * writes itself (\`neutralTemplate.ts\`): every slide, the same layout, the deck's own colours.
 */
export const BRAND_PACK_INSTALLED: boolean = ${installed};
`;

function status() {
  const installed = /BRAND_PACK_INSTALLED: boolean = true/.test(fs.readFileSync(OUT.flag, 'utf8'));
  const size = (file) => (fs.existsSync(file) ? fs.statSync(file).size : 0);
  console.log(`brand pack: ${installed ? 'installed' : 'not installed (decks use the neutral template)'}`);
  console.log(`  template      ${size(OUT.template) > 0 ? `${(size(OUT.template) / 1e6).toFixed(2)} MB` : 'absent'}`);
  console.log(`  DT Flow font  ${size(OUT.fonts) > 10000 ? 'embedded' : 'absent'}`);
  console.log(`  logos         ${size(OUT.brand) > 10000 ? 'embedded' : 'absent'}`);
  console.log(`  product marks ${size(OUT.products) > 10000 ? 'embedded' : 'absent'}`);
  console.log(`  glyphs        ${size(OUT.glyphs) > 20000 ? 'embedded' : 'absent'}`);
}

/** Every file under `dir`, by base name: all the paths that carry it. */
function index(dir) {
  const found = new Map();
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.set(entry.name, [...(found.get(entry.name) ?? []), full]);
    }
  };
  walk(dir);
  return found;
}

/** A kit file by name: the copy under `_assets` when there is one, else the newest version folder. */
function need(files, name) {
  const all = files.get(name) ?? [];
  if (all.length === 0) throw new Error(`The brand kit has no "${name}".`);
  return all.find((file) => file.includes(`${path.sep}_assets${path.sep}`)) ?? [...all].sort().reverse()[0];
}

/** @resvg/resvg-js from the project, or installed once into a temporary folder (no package.json change). */
function resvg() {
  try {
    return require('@resvg/resvg-js').Resvg;
  } catch {
    const dir = path.join(os.tmpdir(), 'pvs-brand-pack-resvg');
    if (!fs.existsSync(path.join(dir, 'node_modules/@resvg/resvg-js'))) {
      console.log('installing @resvg/resvg-js into a temporary folder (one time)…');
      fs.mkdirSync(dir, { recursive: true });
      execFileSync('npm', ['install', '--no-audit', '--no-fund', '--no-save', '--prefix', dir, '@resvg/resvg-js@2.6.2'], { stdio: 'inherit' });
    }
    return createRequire(path.join(dir, 'index.js'))('@resvg/resvg-js').Resvg;
  }
}

const png = (Resvg, file, fit) => `data:image/png;base64,${new Resvg(fs.readFileSync(file), { fitTo: fit }).render().asPng().toString('base64')}`;

/** The layouts the deck writer uses, by number, and the name each must carry. */
const LAYOUT_NAMES = { 1: 'Cover slide', 28: 'Dark: standard slide', 33: 'Dark: blank slide', 56: 'End slide' };

/** Whether a template carries the deck's four layouts at their numbers, under their names. */
async function compatible(zip) {
  for (const [n, name] of Object.entries(LAYOUT_NAMES)) {
    const xml = await zip.file(`ppt/slideLayouts/slideLayout${n}.xml`)?.async('string');
    if (xml === undefined || !xml.includes(`<p:cSld name="${name}"`)) return false;
  }
  return true;
}

/**
 * The deck's template from the kit: the first .pptx/.potx (or `--template`) whose layouts 1, 28, 33
 * and 56 are the cover, dark standard, dark blank and end slides — the writer names them by number.
 * A .potx is turned into a presentation; sample slides go, keeping one blank slide the writer
 * reuses; what only they used goes with them; then `clean-pptx-template.cjs`.
 */
async function installTemplate(files) {
  const JSZip = require('jszip');
  const given = flag('template');
  const candidates = [
    ...(given === undefined ? [] : [path.resolve(given)]),
    ...[...files.entries()].filter(([name]) => /\.(potx|pptx)$/i.test(name)).flatMap(([, paths]) => paths),
  ];
  let zip = null;
  for (const candidate of candidates) {
    const loaded = await JSZip.loadAsync(fs.readFileSync(candidate)).catch(() => null);
    if (loaded !== null && (await compatible(loaded))) {
      zip = loaded;
      console.log(`template: ${path.relative(process.cwd(), candidate)}`);
      break;
    }
  }
  if (zip === null) {
    throw new Error(
      `No template in the kit has the deck's layouts (${Object.entries(LAYOUT_NAMES).map(([n, name]) => `${n} "${name}"`).join(', ')}). Pass one with --template <file>.`,
    );
  }
  let types = await zip.file('[Content_Types].xml').async('string');
  types = types.replace('presentationml.template.main+xml', 'presentationml.presentation.main+xml');

  // Keep one slide, blank, for the deck writer to reuse; the samples and their notes go.
  const presRelsName = 'ppt/_rels/presentation.xml.rels';
  let presRels = await zip.file(presRelsName).async('string');
  let presentation = await zip.file('ppt/presentation.xml').async('string');
  const keep = 'ppt/slides/slide1.xml';
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  if (slides.length !== 1 || !slides.includes(keep)) {
    for (const name of [...slides, ...Object.keys(zip.files).filter((n) => n.startsWith('ppt/notesSlides/'))]) {
      zip.remove(name);
      zip.remove(name.replace(/([^/]+)$/, '_rels/$1.rels'));
    }
    presRels = presRels.replace(/<Relationship\b[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
    presRels = presRels.replace('</Relationships>', '<Relationship Id="rIdDeckSlide" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>');
    presentation = presentation.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>|<p:sldIdLst\/>/, '<p:sldIdLst><p:sldId id="256" r:id="rIdDeckSlide"/></p:sldIdLst>');
    zip.file(
      keep,
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>',
    );
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout${KEEP_LAYOUT}.xml"/></Relationships>`,
    );
    if (!types.includes('PartName="/ppt/slides/slide1.xml"')) {
      types = types.replace('</Types>', '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>');
    }
  }
  // Fonts embedded in the template are not carried into a customer deck.
  presentation = presentation.replace(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/, '');
  presRels = presRels.replace(/<Relationship\b[^>]*Target="fonts\/[^"]+"[^>]*\/>/g, '');
  zip.file('[Content_Types].xml', types);
  zip.file(presRelsName, presRels);
  zip.file('ppt/presentation.xml', presentation);

  // Whatever no relationship reaches any more (the samples' charts, embeddings, media) goes too.
  const reached = new Set(['[Content_Types].xml', '_rels/.rels']);
  const queue = ['_rels/.rels'];
  while (queue.length > 0) {
    const relsName = queue.shift();
    const holder = relsName === '_rels/.rels' ? '' : relsName.replace(/_rels\/([^/]+)\.rels$/, '$1');
    const xml = (await zip.file(relsName)?.async('string')) ?? '';
    for (const rel of xml.match(/<Relationship\b[^>]*\/>/g) ?? []) {
      if (/TargetMode="External"/.test(rel)) continue;
      const target = /Target="([^"]+)"/.exec(rel)?.[1];
      if (target === undefined) continue;
      const part = holder === '' ? path.posix.normalize(target) : path.posix.normalize(path.posix.join(path.posix.dirname(holder), target));
      if (reached.has(part) || zip.file(part) === null) continue;
      reached.add(part);
      const partRels = part.replace(/([^/]+)$/, '_rels/$1.rels');
      if (zip.file(partRels) !== null) {
        reached.add(partRels);
        queue.push(partRels);
      }
    }
  }
  const dropped = Object.keys(zip.files).filter((name) => !zip.files[name].dir && !reached.has(name));
  for (const name of dropped) zip.remove(name);
  types = (await zip.file('[Content_Types].xml').async('string')).replace(/<Override PartName="\/([^"]+)"[^>]*\/>/g, (override, name) => (dropped.includes(name) ? '' : override));
  zip.file('[Content_Types].xml', types);

  const staged = path.join(os.tmpdir(), `pvs-template-${process.pid}.pptx`);
  fs.writeFileSync(staged, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  fs.mkdirSync(path.dirname(OUT.template), { recursive: true });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/clean-pptx-template.cjs'), staged, OUT.template], { stdio: 'inherit' });
  fs.rmSync(staged, { force: true });
}

async function install() {
  const brand = flag('brand');
  if (brand === undefined || !fs.existsSync(brand)) throw new Error('Pass the brand kit folder: npm run brand:install -- --brand <folder>');
  const files = index(path.resolve(brand));
  const Resvg = resvg();

  await installTemplate(files);
  // The Overview banner's vendor mark (shown only with the pack); kept as it is when the kit has none.
  if (files.has('Dynatrace_Logo.svg')) fs.copyFileSync(need(files, 'Dynatrace_Logo.svg'), OUT.mark);
  else if (!fs.existsSync(OUT.mark)) console.log('mark: the kit has no Dynatrace_Logo.svg — the Overview banner shows none');

  let css = '';
  for (const font of FONTS) {
    css += `@font-face{font-family:'DTFlow';font-weight:${font.weight};font-style:normal;font-display:swap;src:url(data:font/otf;base64,${fs.readFileSync(need(files, font.file)).toString('base64')}) format('opentype');}`;
  }
  fs.writeFileSync(
    OUT.fonts,
    `/* eslint-disable */\n// AUTO-GENERATED by scripts/brand-pack.mjs — DTFlow brand font embedded as\n// base64 @font-face so the deck preview and PDF render in the official typeface.\n\nexport const DTFLOW_FONT_CSS = ${JSON.stringify(css)};\n`,
  );

  fs.writeFileSync(
    OUT.brand,
    `/* eslint-disable */\n// AUTO-GENERATED by scripts/brand-pack.mjs from the brand kit's horizontal logo (Dt_Logo_*-Horizontal.svg,\n// rasterised to PNG). The source is 800x142, so the aspect ratio is ~5.63:1. Embedded as data URLs\n// because the app runs in the browser and the deck is generated client-side.\nexport const LOGO_ASPECT = 800 / 142;\n` +
      `export const DYNATRACE_LOGO_WHITE = '${png(Resvg, need(files, LOGOS.white), { mode: 'width', value: 1600 })}';\n` +
      `export const DYNATRACE_LOGO_COLOR = '${png(Resvg, need(files, LOGOS.color), { mode: 'width', value: 1600 })}';\n`,
  );

  let products = '/* eslint-disable */\n// AUTO-GENERATED by scripts/brand-pack.mjs — official product logomarks rasterized to\n// compact PNG data URLs. Do not edit by hand.\n\nexport const PRODUCT_LOGOS = {\n';
  for (const [key, file] of Object.entries(PRODUCTS)) products += `  ${key}: '${png(Resvg, need(files, file), { mode: 'height', value: 96 })}',\n`;
  fs.writeFileSync(OUT.products, `${products}} as const;\n\nexport type ProductLogoKey = keyof typeof PRODUCT_LOGOS;\n`);

  const gallery = flag('glyphs');
  if (gallery !== undefined) execFileSync(process.execPath, [path.join(ROOT, 'scripts/gen-brand-glyphs.cjs'), gallery], { stdio: 'inherit' });
  else console.log('glyphs: unchanged (pass --glyphs <gallery index.html> to refresh them)');

  fs.writeFileSync(OUT.flag, flagSource(true));
  status();
  console.log('\nNext: npm run typecheck && npm test — the deck tests pin the template; re-pin them only for a template you chose on purpose.');
}

/** The brand modules as empty stubs with the same exports, and no template. */
function strip() {
  const note = (what, restore) => `// brand asset not included in this repository (npm run brand:strip).\n//\n// ${what}\n// To restore it: ${restore}\n`;
  fs.rmSync(OUT.template, { force: true });
  fs.rmSync(OUT.mark, { force: true });
  fs.writeFileSync(
    OUT.fonts,
    `${note('The DT Flow typeface is not embedded: the preview and the PDF use the next font of their stack.', 'npm run brand:install -- --brand <your brand kit>')}export const DTFLOW_FONT_CSS: string = '';\n`,
  );
  fs.writeFileSync(
    OUT.brand,
    `${note('No vendor logo: the decks and the hero banner show none. LOGO_ASPECT is the artwork’s width / height.', 'npm run brand:install -- --brand <your brand kit>')}export const LOGO_ASPECT = 800 / 142;\nexport const DYNATRACE_LOGO_WHITE: string = '';\nexport const DYNATRACE_LOGO_COLOR: string = '';\n`,
  );
  const keys = Object.keys(PRODUCTS);
  fs.writeFileSync(
    OUT.products,
    `${note('No product logomarks: deck sections carry none.', 'npm run brand:install -- --brand <your brand kit>')}\nexport const PRODUCT_LOGOS: Record<${keys.map((key) => `'${key}'`).join(' | ')}, string> = {\n${keys.map((key) => `  ${key}: '',`).join('\n')}\n};\n\nexport type ProductLogoKey = keyof typeof PRODUCT_LOGOS;\n`,
  );
  // The glyphs keep their keys (and the gallery names in their comments) with empty path lists.
  const glyphs = fs.readFileSync(OUT.glyphs, 'utf8');
  const entries = [...glyphs.matchAll(/^ {2}(\/\/ [^\n]*)\n {2}([A-Za-z0-9_]+): \[/gm)].map((match) => `  ${match[1]}\n  ${match[2]}: [],`);
  if (entries.length > 0) {
    fs.writeFileSync(
      OUT.glyphs,
      `/**\n * Brand glyphs (monochrome, \`currentColor\`, 20×20 SVG paths), one entry per technology the app names.\n *\n * Not included in this repository (npm run brand:strip): every key is kept with an empty path list, so\n * \`BrandGlyph\` draws an empty 20×20 box. To restore them: npm run brand:install -- --brand <kit> --glyphs <gallery index.html>.\n */\n\nexport const BRAND_GLYPHS = {\n${entries.join('\n')}\n} as const satisfies Record<string, readonly string[]>;\n\nexport type BrandGlyph = keyof typeof BRAND_GLYPHS;\n`,
    );
  }
  fs.writeFileSync(OUT.flag, flagSource(false));
  status();
}

try {
  if (command === 'install') await install();
  else if (command === 'strip') strip();
  else if (command === 'status') status();
  else throw new Error(`Unknown command "${command}" (install, strip or status).`);
} catch (error) {
  console.error(`brand-pack: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

