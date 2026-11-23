#!/usr/bin/env node
/**
 * Finds user-facing English text that is not going through the i18n dictionary.
 *
 * Two rounds of "the translation is incomplete" feedback came from replacing
 * strings by hand and believing the job was done. Eyeballing 28 files does not
 * scale and does not stay true after the next edit, so this walks the TypeScript
 * AST instead and reports every literal that would reach a customer's screen
 * untranslated.
 *
 * Run directly for a report, or via `ui/app/tests/translation-coverage.test.ts`
 * to fail the build when prose is added without a dictionary entry.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

/**
 * Repository root.
 *
 * `import.meta.url` is not a `file:` URL under the vitest transform, so fall
 * back to walking up from the working directory until `app.config.json` is
 * found. Both the CLI and the test then resolve the same tree.
 */
const ROOT = (() => {
  try {
    return fileURLToPath(new URL('..', import.meta.url));
  } catch {
    let dir = process.cwd();
    while (!existsSync(join(dir, 'app.config.json'))) {
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return dir;
  }
})();
const APP = join(ROOT, 'ui', 'app');

/**
 * Directories whose output the customer actually reads.
 *
 * `models` and `utils` were missing from this list until 0.7.0, and that gap is
 * exactly how a customer ended up reading *"Requires additional configuration or
 * source"* and *"Cost already absorbed by problems…"* on a Portuguese screen: the
 * strings live on a `Fact` built in `models/`, get rendered verbatim by a tile in
 * `components/`, and the scanner only ever looked at the tile.
 *
 * A string does not become safe by being one function call away from the JSX.
 */
const SCANNED_DIRS = ['pages', 'features', 'components', 'models', 'utils', 'hooks'];

/**
 * Object properties and JSX attributes that carry prose.
 *
 * Keeping this explicit is what stops the scanner flagging `id`, `accessor`,
 * `queryId` and the rest of the structural strings.
 */
const PROSE_PROPS = new Set([
  'header',
  'title',
  'question',
  'takeaway',
  'label',
  'detail',
  'footnote',
  'headline',
  'supportingLabel',
  'supportingDisplay',
  'interpretation',
  'category',
  'placeholder',
  'description',
  'summary',
  'caption',
  'note',
  'hint',
  'text',
  'message',
  'ariaLabel',
  'aria-label',
  // Data-model fields whose values are rendered verbatim. These were the ones
  // that survived the first translation pass, because they never look like UI
  // props at the call site.
  'emptyMessage',
  'permissionImpact',
  'measurement',
  'meaning',
  'observation',
  'consequence',
  'dependencies',
  'gap',
  'why',
  'action',
  'takeaway',
  'question',
  'purpose',
  'statusLabel',
  'dimension',
  'premise',
  'presenterNotes',
  'unavailableReason',
  // Fields on a `Fact`, rendered verbatim by every tile in the app.
  'requirement',
]);

/**
 * Literals that are legitimately not translated.
 *
 * Product and technology names stay in English by the customer's own request:
 * "nomes de serviços, entidades do Dynatrace se manterão em inglês".
 */
const ALLOWED = new Set([
  '—',
  '-',
  '·',
  '/',
  ':',
  ',',
  '.',
  '%',
  '(',
  ')',
  'Dynatrace',
  'Davis',
  'Davis AI',
  'Grail',
  'DQL',
  'Kubernetes',
  'OneAgent',
  'AppEngine',
  'PoC',
  'SLO',
  'RUM',
  'MTTR',
  'MTTD',
  'MTTA',
  'CPU',
  'GB',
  'PDF',
  'API',
  'SRE',
  'DevOps',
  'ROI',
  'Smartscape',
]);

/**
 * Fact constructors that take prose as a positional argument.
 *
 * `unavailable('no-permission', 'Requires storage:events:read.')` puts that
 * second string straight onto a `Fact.requirement`, which every tile renders.
 * Matching on property name alone never sees it, which is how the cost model's
 * English survived three translation passes.
 *
 * Maps the callee name to the argument indices that carry prose.
 */
const PROSE_CALLS = new Map([
  ['unavailable', [1]],
  ['derived', [2]],
]);

/** A translation key such as `page.coverage.title`. */
const KEY_SHAPE = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_-]+)+$/;

/** Screaming-snake or kebab technical constants, entity types, field names. */
const TECHNICAL_SHAPE = /^[a-z0-9_.:-]+$/;

function isProse(value) {
  const text = value.trim();
  if (text.length === 0) return false;
  if (ALLOWED.has(text)) return false;
  // Needs at least one letter to be prose at all.
  if (!/[A-Za-z]/.test(text)) return false;
  // A dictionary key, not the text itself.
  if (KEY_SHAPE.test(text)) return false;
  // Lowercase technical token: `dt.entity.host`, `now-24h`, `error-free`.
  if (TECHNICAL_SHAPE.test(text)) return false;
  // Interpolation-only expressions and units.
  if (/^\{[^}]*\}$/.test(text)) return false;
  return true;
}

function collectFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function propertyName(node) {
  const parent = node.parent;
  if (parent === undefined) return null;

  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const name = parent.name;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  }

  if (ts.isJsxAttribute(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }

  // `label={'text'}` wraps the literal in a JsxExpression.
  if (ts.isJsxExpression(parent) && parent.parent !== undefined && ts.isJsxAttribute(parent.parent)) {
    const attr = parent.parent;
    if (ts.isIdentifier(attr.name)) return attr.name.text;
  }

  return null;
}

/** True when the literal sits directly inside JSX as rendered content. */
function isJsxChild(node) {
  const parent = node.parent;
  if (parent === undefined) return false;
  if (!ts.isJsxExpression(parent)) return false;
  const grand = parent.parent;
  return (
    grand !== undefined &&
    (ts.isJsxElement(grand) || ts.isJsxFragment(grand) || ts.isJsxSelfClosingElement(grand))
  );
}

export function scanFile(filePath, sourceText) {
  const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];

  const record = (node, text, kind) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    findings.push({ line: line + 1, text: text.trim().replace(/\s+/g, ' '), kind });
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      if (isProse(node.text)) record(node, node.text, 'jsx-text');
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const prop = propertyName(node);
      if (prop !== null && PROSE_PROPS.has(prop) && isProse(node.text)) {
        record(node, node.text, `prop:${prop}`);
      } else if (isJsxChild(node) && isProse(node.text)) {
        record(node, node.text, 'jsx-expression');
      }
    } else if (ts.isCallExpression(node)) {
      const callee = ts.isIdentifier(node.expression) ? node.expression.text : null;
      const positions = callee === null ? undefined : PROSE_CALLS.get(callee);
      if (positions !== undefined) {
        for (const index of positions) {
          const argument = node.arguments[index];
          if (argument === undefined) continue;
          if (ts.isStringLiteral(argument) && isProse(argument.text)) {
            record(argument, argument.text, `arg:${callee}[${index}]`);
          } else if (ts.isTemplateExpression(argument)) {
            const literal =
              argument.head.text + argument.templateSpans.map((span) => span.literal.text).join(' ');
            if (isProse(literal)) record(argument, literal, `arg:${callee}[${index}]`);
          }
        }
      }
    } else if (ts.isTemplateExpression(node)) {
      // Template literals rendered into JSX, e.g. `{`${n} hosts`}`.
      if (isJsxChild(node)) {
        const literal = node.head.text + node.templateSpans.map((span) => span.literal.text).join(' ');
        if (isProse(literal)) record(node, literal, 'template');
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return findings;
}

export function scanApp() {
  const results = [];
  for (const dirName of SCANNED_DIRS) {
    const dir = join(APP, dirName);
    for (const file of collectFiles(dir)) {
      const findings = scanFile(file, readFileSync(file, 'utf8'));
      if (findings.length > 0) {
        results.push({ file: relative(ROOT, file), findings });
      }
    }
  }
  return results;
}

const invokedDirectly = process.argv[1]?.endsWith('scan-untranslated.mjs') === true;
if (invokedDirectly) {
  const results = scanApp();
  let total = 0;
  for (const { file, findings } of results) {
    total += findings.length;
    process.stdout.write(`\n${file}  (${findings.length})\n`);
    for (const finding of findings) {
      process.stdout.write(`  ${String(finding.line).padStart(4)}  [${finding.kind}] ${finding.text}\n`);
    }
  }
  process.stdout.write(`\n${total} untranslated literals across ${results.length} files\n`);
  process.exit(total === 0 ? 0 : 1);
}
