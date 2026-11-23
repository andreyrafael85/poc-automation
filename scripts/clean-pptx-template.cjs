// Build-time tool (not shipped). Cleans the corporate PowerPoint template that the SE deck is built on
// (`ui/assets/techwrapup-brand-template.pptx`) so no customer deck carries what the template brought
// along from its authors (3.2.4, finding E2 of the technical review):
//
//   - `ppt/authors.xml`: the comment authors of the template, with names, e-mails and corporate ids;
//   - `docProps/core.xml`: the creator and last editor (set to "Dynatrace");
//   - `customXml/*`, `docProps/custom.xml`: SharePoint bookkeeping;
//   - `ppt/webextensions/*`: an Office add-in task pane;
//   - `docProps/thumbnail.jpeg`: a picture of the template's first slide;
//   - every slide layout the deck does not use, and the media only those layouts used (about 8.8 MB,
//     a 5.9 MB EMF among them). The deck uses layouts 1 (cover), 28 (dark standard), 33 (dark blank)
//     and 56 (end); `features/wrapup/pptxTemplate.ts` names them by number, so the kept layouts keep
//     their numbers.
//
// Prints the SHA-256 of the result, which `tests/pptxTemplate.test.ts` pins.
//
// Usage (from the app root):  node scripts/clean-pptx-template.cjs [in.pptx] [out.pptx]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');

const IN = process.argv[2] ?? path.join(__dirname, '..', 'ui', 'assets', 'techwrapup-brand-template.pptx');
const OUT = process.argv[3] ?? IN;
const KEEP_LAYOUTS = new Set([1, 28, 33, 56]);

const posix = path.posix;

/** The relationship file of a part, e.g. ppt/slideLayouts/_rels/slideLayout1.xml.rels. */
const relsOf = (part) => posix.join(posix.dirname(part), '_rels', `${posix.basename(part)}.rels`);

/** Resolves a relationship target against the part that holds it. */
const resolve = (part, target) => posix.normalize(posix.join(posix.dirname(part), target));

async function readText(zip, name) {
  const file = zip.file(name);
  return file === null ? null : file.async('string');
}

/** Drops every relationship whose target (resolved) is in `targets`. */
function dropRels(relsXml, holder, targets) {
  return relsXml.replace(/<Relationship\b[^>]*\/>/g, (rel) => {
    const target = /Target="([^"]+)"/.exec(rel)?.[1];
    if (target === undefined || /TargetMode="External"/.test(rel)) return rel;
    const absolute = holder === '' ? posix.normalize(target) : resolve(holder, target);
    return targets.has(absolute) ? '' : rel;
  });
}

/** Removes the content-type overrides of parts that no longer exist. */
function dropOverrides(contentTypes, parts) {
  return contentTypes.replace(/<Override\b[^>]*\/>/g, (override) => {
    const name = /PartName="\/([^"]+)"/.exec(override)?.[1];
    return name !== undefined && parts.has(name) ? '' : override;
  });
}

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(IN));
  const removed = new Set();
  const remove = (name) => {
    if (zip.file(name) !== null) {
      zip.remove(name);
      removed.add(name);
    }
  };

  // 1. Authors, add-ins, SharePoint bookkeeping, thumbnail.
  remove('ppt/authors.xml');
  for (const name of Object.keys(zip.files)) {
    if (name.startsWith('customXml/') || name.startsWith('ppt/webextensions/')) remove(name);
  }
  remove('docProps/custom.xml');
  remove('docProps/thumbnail.jpeg');

  // 2. Layouts the deck never uses, from the master's list and from the package.
  const masterPart = 'ppt/slideMasters/slideMaster1.xml';
  let master = await readText(zip, masterPart);
  let masterRels = await readText(zip, relsOf(masterPart));
  const dropLayouts = new Set();
  for (const name of Object.keys(zip.files)) {
    const match = /^ppt\/slideLayouts\/slideLayout(\d+)\.xml$/.exec(name);
    if (match !== null && !KEEP_LAYOUTS.has(Number(match[1]))) dropLayouts.add(name);
  }
  // The rIds of the master's relationships to the dropped layouts, to cut them from sldLayoutIdLst.
  const droppedIds = new Set();
  for (const rel of masterRels.match(/<Relationship\b[^>]*\/>/g) ?? []) {
    const target = /Target="([^"]+)"/.exec(rel)?.[1];
    const id = /Id="([^"]+)"/.exec(rel)?.[1];
    if (target !== undefined && id !== undefined && dropLayouts.has(resolve(masterPart, target))) droppedIds.add(id);
  }
  master = master.replace(/<p:sldLayoutId\b[^>]*\/>/g, (entry) => {
    const id = /r:id="([^"]+)"/.exec(entry)?.[1];
    return id !== undefined && droppedIds.has(id) ? '' : entry;
  });
  masterRels = dropRels(masterRels, masterPart, dropLayouts);
  zip.file(masterPart, master);
  zip.file(relsOf(masterPart), masterRels);

  // Media still referenced by any part that stays.
  const keptMedia = new Set();
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith('.rels') || dropLayouts.has(name.replace(/_rels\/(.*)\.rels$/, '$1'))) continue;
    const holder = name.replace(/_rels\/(.*)\.rels$/, '$1');
    const xml = await zip.file(name).async('string');
    for (const target of xml.matchAll(/Target="([^"]+)"/g)) {
      const absolute = resolve(holder, target[1]);
      if (absolute.startsWith('ppt/media/')) keptMedia.add(absolute);
    }
  }
  for (const layout of dropLayouts) {
    remove(layout);
    remove(relsOf(layout));
  }
  for (const name of Object.keys(zip.files)) {
    if (name.startsWith('ppt/media/') && !keptMedia.has(name)) remove(name);
  }

  // 3. Relationships and content types that pointed at what is gone.
  const rootRels = await readText(zip, '_rels/.rels');
  zip.file('_rels/.rels', dropRels(rootRels, '', removed));
  const presRelsName = 'ppt/_rels/presentation.xml.rels';
  zip.file(presRelsName, dropRels(await readText(zip, presRelsName), 'ppt/presentation.xml', removed));
  zip.file('[Content_Types].xml', dropOverrides(await readText(zip, '[Content_Types].xml'), removed));

  // 4. The template's own author and editor, and the app.xml list of layout titles.
  let core = await readText(zip, 'docProps/core.xml');
  core = core
    .replace(/<dc:creator>[\s\S]*?<\/dc:creator>/, '<dc:creator>Dynatrace</dc:creator>')
    .replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, '<cp:lastModifiedBy>Dynatrace</cp:lastModifiedBy>');
  zip.file('docProps/core.xml', core);

  // Deterministic output: fixed dates on every entry, so the same input gives the same hash.
  const fixed = new Date('2026-01-01T00:00:00Z');
  for (const file of Object.values(zip.files)) file.date = fixed;
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.writeFileSync(OUT, bytes);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  console.log(`removed ${removed.size} parts (${[...removed].filter((n) => n.startsWith('ppt/slideLayouts/slideLayout')).length} layouts)`);
  console.log(`${path.relative(process.cwd(), OUT)}: ${(bytes.length / 1e6).toFixed(2)} MB, sha256 ${sha}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
