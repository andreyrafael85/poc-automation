#!/usr/bin/env node
/**
 * Finds charts that are not using the app's colour language.
 *
 * The complaint this answers: "ainda temos gráficos com cores estáticas, sem um
 * diferencial que traga uma harmonia na visualização geral das guias". Charts
 * were each falling back to whatever Strato defaulted to, so the same kind of
 * quantity was drawn in a different colour on every tab and colour carried no
 * meaning.
 *
 * The rule this enforces: every chart declares a `colorPalette`, and that
 * palette comes from `design/palette`. A page may choose which role a chart is
 * measuring; it may not choose a colour.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

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

const SCANNED_DIRS = ['pages', 'features', 'components'];

/**
 * Every Strato chart component.
 *
 * All of them measure their container and render nothing at zero height, which
 * is the defect a customer reported against 0.5.0: a `SingleValue` inside a
 * column flex container resolved its default `height: 100%` against a parent of
 * `height: auto`, got zero, and silently drew nothing. The label, the provenance
 * badge and the query footer all rendered, so the tile looked fine — it just had
 * no number in it.
 *
 * jsdom performs no layout, so no unit test can reproduce that. A static rule
 * can: every chart declares an explicit height.
 */
const HEIGHT_REQUIRED = new Set([
  'CategoricalBarChart',
  'TimeseriesChart',
  'DonutChart',
  'PieChart',
  'HistogramChart',
  'HoneycombChart',
  'TreeMapChart',
  'SankeyChart',
  'GaugeChart',
  'XYChart',
  'SingleValue',
  'Sparkline',
]);

/**
 * Chart components that plot a series and therefore need a palette.
 *
 * `SingleValue` and `Sparkline` are excluded here: they render one figure and
 * inherit their colour from the surrounding tone. They still need a height.
 */
const PALETTE_REQUIRED = new Set([
  'CategoricalBarChart',
  'TimeseriesChart',
  'DonutChart',
  'PieChart',
  'HistogramChart',
  'HoneycombChart',
  'TreeMapChart',
  'SankeyChart',
  'GaugeChart',
  'XYChart',
]);

function collectFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full));
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function tagName(node) {
  const tag = ts.isJsxSelfClosingElement(node) ? node.tagName : node.openingElement.tagName;
  return tag.getText();
}

function attributes(node) {
  const opening = ts.isJsxSelfClosingElement(node) ? node : node.openingElement;
  const names = new Set();
  let paletteExpression = null;
  for (const attribute of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name)) continue;
    names.add(attribute.name.text);
    if (attribute.name.text === 'colorPalette' && attribute.initializer !== undefined) {
      paletteExpression = attribute.initializer.getText();
    }
  }
  return { names, paletteExpression };
}

export function scanFile(filePath, sourceText) {
  const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];

  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxElement(node)) {
      const tag = tagName(node);

      if (HEIGHT_REQUIRED.has(tag)) {
        const { names } = attributes(node);
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        if (!names.has('height')) {
          findings.push({
            line: line + 1,
            tag,
            issue: 'no explicit height — will render blank at zero height',
          });
        }
      }

      if (PALETTE_REQUIRED.has(tag)) {
        const { names, paletteExpression } = attributes(node);
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));

        if (!names.has('colorPalette')) {
          findings.push({ line: line + 1, tag, issue: 'no colorPalette' });
        } else if (paletteExpression !== null && !paletteExpression.includes('paletteFor')) {
          // A literal palette here is exactly the drift this guards against.
          findings.push({
            line: line + 1,
            tag,
            issue: `colorPalette not from design/palette: ${paletteExpression}`,
          });
        }

        if (!names.has('aria-label') && !names.has('aria-labelledby')) {
          findings.push({ line: line + 1, tag, issue: 'no accessible name' });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return findings;
}

export function scanCharts() {
  const results = [];
  for (const dirName of SCANNED_DIRS) {
    for (const file of collectFiles(join(APP, dirName))) {
      const findings = scanFile(file, readFileSync(file, 'utf8'));
      if (findings.length > 0) results.push({ file: relative(ROOT, file), findings });
    }
  }
  return results;
}

const invokedDirectly = process.argv[1]?.endsWith('scan-chart-consistency.mjs') === true;
if (invokedDirectly) {
  const results = scanCharts();
  let total = 0;
  for (const { file, findings } of results) {
    total += findings.length;
    process.stdout.write(`\n${file}\n`);
    for (const finding of findings) {
      process.stdout.write(`  ${String(finding.line).padStart(4)}  ${finding.tag}: ${finding.issue}\n`);
    }
  }
  process.stdout.write(`\n${total} chart issues\n`);
  process.exit(total === 0 ? 0 : 1);
}
