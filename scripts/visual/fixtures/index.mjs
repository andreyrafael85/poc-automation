/**
 * Fixture registry.
 *
 * `fixtureFor(scenarioDataset, id)` returns a Grail-shaped result
 * (`{ records, types, metadata }`) for a catalog id, or `undefined` when no
 * fixture exists (the mock then warns and returns an empty table, so a catalog
 * entry added to ui/ shows up as a visible warning rather than a crash).
 *
 * Datasets are built lazily and cached per page load.
 */

import { buildRich } from './rich.mjs';
import { buildSparse } from './sparse.mjs';

const builders = { rich: buildRich, sparse: buildSparse };
const cache = new Map();

/** `denied`, `error`, `loading` and `scanlimit` reuse the rich dataset. */
export function datasetFor(scenario) {
  return scenario === 'sparse' ? 'sparse' : 'rich';
}

export function fixtureFor(scenario, id) {
  const dataset = datasetFor(scenario);
  if (!cache.has(dataset)) cache.set(dataset, builders[dataset]());
  return cache.get(dataset)[id];
}

export function fixtureIds(dataset = 'rich') {
  if (!cache.has(dataset)) cache.set(dataset, builders[dataset]());
  return Object.keys(cache.get(dataset)).filter((key) => !key.startsWith('__'));
}
