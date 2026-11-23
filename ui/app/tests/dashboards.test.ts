import { describe, expect, it } from 'vitest';

import { SPECIALTY_BLUEPRINTS, SPECIALTY_IDS, VALIDATED_DQL } from '../features/dashboard/blueprints';
import { DQL, POC_BLUEPRINT, bannerHeading, buildDashboard, buildPocDashboard, type DashboardBlueprint, type DashboardDocument, type DashboardEvidence, type DashboardWords } from '../features/dashboard/pocDashboard';
import { ALL_KEYS, translate, type StringKey } from '../i18n/strings';
import { parsePocPlan } from '../models/pocPlan';
import { ALL_QUERIES, getQuery } from '../queries/catalog';

/**
 * The four dashboards an SE can deploy (3.3.4): "Value of the PoC" and the three specialty ones.
 * These pin what the repository rules ask of any dashboard tile: a catalog query or a query with a
 * live validation record (rule 9/8), nothing commercial (rule 6), no total from a capped list
 * (rule 7), and every word in both languages.
 */

const ALL: readonly DashboardBlueprint[] = [POC_BLUEPRINT, ...SPECIALTY_IDS.map((id) => SPECIALTY_BLUEPRINTS[id])];
const KEYS = new Set<string>(ALL_KEYS);
const EVERYTHING = new Set<DashboardEvidence>(['experience', 'security', 'automation', 'kubernetes', 'synthetic']);

const words = (evidence: ReadonlySet<DashboardEvidence> = EVERYTHING): DashboardWords => ({
  title: 'Board — Acme',
  intro: 'Intro',
  objectivesTitle: 'Objectives',
  objectives: ['One'],
  footer: 'Footer',
  sectionTitle: (section, index) => `${index}. ${section}`,
  tileTitle: (key) => key,
  evidence,
});

const dataTiles = (doc: DashboardDocument) => Object.values(doc.tiles).filter((tile): tile is Extract<typeof tile, { type: 'data' }> => tile.type === 'data');

describe('every dashboard is a valid document on a 24-column grid', () => {
  for (const blueprint of ALL) {
    it(`${blueprint.id}: version 21, inside the grid, no two tiles on the same cell`, () => {
      const doc = buildDashboard(blueprint, words());
      expect(doc.version).toBe(21);
      const cells = new Set<string>();
      for (const [id, box] of Object.entries(doc.layouts)) {
        expect(box.x, id).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w, id).toBeLessThanOrEqual(24);
        for (let x = box.x; x < box.x + box.w; x += 1) {
          for (let y = box.y; y < box.y + box.h; y += 1) {
            const cell = `${x},${y}`;
            expect(cells.has(cell), `${blueprint.id} tile ${id} overlaps at ${cell}`).toBe(false);
            cells.add(cell);
          }
        }
      }
      expect(dataTiles(doc).length).toBeGreaterThan(5);
    });
  }

  it('keeps "Value of the PoC" exactly as before the blueprints (same document)', () => {
    expect(JSON.stringify(buildPocDashboard(words()))).toBe(JSON.stringify(buildDashboard(POC_BLUEPRINT, words())));
  });
});

describe('the repository rules, tile by tile', () => {
  const validated = new Set<string>([...Object.values(VALIDATED_DQL).map((entry) => entry.dql), ...Object.values(DQL)]);

  for (const blueprint of ALL) {
    it(`${blueprint.id}: every query is a catalog entry or a validated dashboard query (rules 8, 9)`, () => {
      for (const tile of blueprint.tiles) {
        if (tile.queryId !== undefined) expect(ALL_QUERIES.some((entry) => entry.id === tile.queryId), tile.key).toBe(true);
        else expect(validated.has(tile.dql ?? ''), tile.key).toBe(true);
      }
    });

    it(`${blueprint.id}: nothing commercial (rule 6)`, () => {
      for (const tile of blueprint.tiles) {
        expect(tile.queryId ?? '', tile.key).not.toMatch(/^(lic|cons)\./);
        // 3.7.1: the logs dashboard reads the ingested volume per month from the billing usage events — bytes, never money.
        const dql = tile.dql ?? '';
        expect(dql, tile.key).not.toMatch(/cost|price|currency|usd|rate.?card/i);
        if (/billing|dt\.system\.events/i.test(dql)) expect(dql, tile.key).toMatch(/BILLING_USAGE_EVENT[\s\S]*sum\(billed_bytes\)/);
      }
    });

    it(`${blueprint.id}: a single value never reads a list cut by a limit (rule 7)`, () => {
      for (const tile of blueprint.tiles.filter((plan) => plan.visualization === 'singleValue')) {
        const text = tile.queryId === undefined ? (tile.dql ?? '') : getQuery(tile.queryId).dql;
        expect(text, tile.key).not.toMatch(/\|\s*limit\b/);
      }
    });

    it(`${blueprint.id}: every tile title exists in English and Portuguese`, () => {
      for (const tile of blueprint.tiles) {
        const key = `dash2.tile.${tile.key}`;
        expect(KEYS.has(key), key).toBe(true);
        expect(translate(key as StringKey, 'pt-BR')).not.toBe(translate(key as StringKey, 'en'));
      }
    });
  }

  it('names every specialty section in both languages', () => {
    for (const id of SPECIALTY_IDS) {
      for (const section of SPECIALTY_BLUEPRINTS[id].sections) {
        expect(KEYS.has(`dash3.section.${id}.${section}`), `${id}.${section}`).toBe(true);
      }
      for (const part of ['name', 'audience', 'question']) expect(KEYS.has(`dash3.${id}.${part}`), `${id}.${part}`).toBe(true);
    }
  });

  it('keeps the validation record of every dashboard query (date, window, records, bytes)', () => {
    for (const [name, entry] of Object.entries(VALIDATED_DQL)) {
      expect(entry.validation.validatedOn, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.validation.records, name).toBeGreaterThan(0);
      expect(entry.validation.scannedBytes, name).toBeGreaterThanOrEqual(0);
    }
    // The capped lists of the infrastructure dashboard are top 10s drawn as lines, never summed.
    for (const name of ['cpuTop', 'memoryTop', 'diskTop'] as const) expect(VALIDATED_DQL[name].dql).toMatch(/\| limit 10/);
  });
});

describe('only what the environment proves gets a section', () => {
  const sectionsOf = (doc: DashboardDocument) =>
    Object.values(doc.tiles)
      .map((tile) => bannerHeading(tile))
      .filter((heading): heading is string => heading !== null);

  it('leaves out Kubernetes, synthetic, real users and automation when the environment has none', () => {
    const bare = new Set<DashboardEvidence>();
    expect(sectionsOf(buildDashboard(SPECIALTY_BLUEPRINTS.infra, words(bare))).join(' ')).not.toMatch(/kubernetes/);
    expect(sectionsOf(buildDashboard(SPECIALTY_BLUEPRINTS.sre, words(bare))).join(' ')).not.toMatch(/automation/);
    const experience = sectionsOf(buildDashboard(SPECIALTY_BLUEPRINTS.experience, words(bare))).join(' ');
    expect(experience).not.toMatch(/synthetic|audience|health|journeys/);
    expect(experience).toMatch(/business/);
    // Control: with the evidence, the sections are there.
    expect(sectionsOf(buildDashboard(SPECIALTY_BLUEPRINTS.infra, words())).join(' ')).toMatch(/kubernetes/);
  });

  it('opens a specialty dashboard on its header, without the PoC objectives', () => {
    const doc = buildDashboard(SPECIALTY_BLUEPRINTS.sre, words());
    expect(Object.values(doc.tiles).some((tile) => tile.type === 'markdown' && tile.content.includes('Objectives'))).toBe(false);
    expect(Object.values(buildPocDashboard(words()).tiles).some((tile) => tile.type === 'markdown' && tile.content.includes('Objectives'))).toBe(true);
  });
});

describe('the PoC plan keeps the specialty dashboards the SE created', () => {
  const ref = { id: 'doc-1', name: 'Operations — Acme', createdAt: '2026-11-16T20:00:00.000Z', createdBy: 'se@example.com', shared: true };

  it('reads them back, and drops ids it does not know', () => {
    const plan = parsePocPlan({ startDate: null, endDate: null, criteria: [], dashboard: null, specialtyDashboards: { sre: ref, infra: { id: '' }, bogus: ref } });
    expect(plan.specialtyDashboards).toEqual({ sre: ref });
  });

  it('still reads a plan saved before 3.3.4', () => {
    const plan = parsePocPlan({ startDate: null, endDate: null, criteria: [], dashboard: ref });
    expect(plan.dashboard).toEqual(ref);
    expect(plan.specialtyDashboards).toBeUndefined();
  });
});

describe('the catalog costs measured from the app’s own runs (3.3.4, TD-17)', () => {
  it('leaves only the three entries the app did not run in the period without a cost', async () => {
    const { MEASURED_COSTS } = await import('../queries/measuredCosts');
    const unknown = ALL_QUERIES.filter((entry) => entry.validation.scannedBytesOnDemand === null).map((entry) => entry.id).sort();
    expect(unknown).toEqual(['ev.entity.events', 'ev.logs.errors', 'ev.problem.recurrence']);
    for (const id of Object.keys(MEASURED_COSTS)) expect(ALL_QUERIES.some((entry) => entry.id === id), id).toBe(true);
  });
});
