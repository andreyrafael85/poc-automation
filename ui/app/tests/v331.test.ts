import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BAR_VALUE_GAP, barValueGutterEmu, barValueWidthEmu, deckBoldEm } from '../features/wrapup/spec';
import { TYPE } from '../features/wrapup/geometry';
import { EMPTY_ACCESS, currentVerifier, hasNoPassword, isEntryValid } from '../config/access';
import { CATALOG, CAUSE_NOT_NAMED } from '../queries/catalog';

/**
 * PoC Value Studio 3.3.1 — "Exatidão e acesso".
 *
 * §17-a: the owner's 3.2.7 round reported that the Tech Wrapup logs slide printed "1.557.000"
 * without its last digit. Both writers gave a bar's value a fixed 600,000 EMU box — about 33 pt
 * of usable width — and the value needs 62 pt in the deck's own bold face. These tests fail on
 * the 3.2.7 geometry.
 */

/** EMU in a point, and PowerPoint's default text inset on each side, as `spec.ts` uses them. */
const EMU_PER_PT = 12700;
const TEXT_INSET_PT = 7.2;

/** What a value genuinely needs, from the same advance-width table the deck is set with. */
const needEmu = (display: string) => (deckBoldEm(display) * TYPE.small + 2 * TEXT_INSET_PT) * EMU_PER_PT;

describe('a bar chart value is never cut (§17-a)', () => {
  it('reserves more than the old fixed box for the number that was reported cut', () => {
    // 7 digits at 0.59 em and 2 separators at 0.274 em = 4.678 em = 46.8 pt at TYPE.small.
    expect(barValueWidthEmu('1.557.000')).toBeGreaterThan(600000);
    expect(barValueWidthEmu('1.557.000')).toBeGreaterThanOrEqual(needEmu('1.557.000'));
  });

  it('measures every value it is given, not just that one', () => {
    for (const display of ['1.557.000', '1,557,000', '12.345.678', '91.113.158.730', '0,30%', '6.842']) {
      expect(barValueWidthEmu(display), display).toBeGreaterThanOrEqual(needEmu(display));
    }
  });

  it('keeps the 3.2.7 layout for a short value, so only the cut case moves', () => {
    for (const display of ['12', '554', '1.203']) expect(barValueWidthEmu(display)).toBe(600000);
  });

  it('gives every row of one chart the same gutter, so the bars stay comparable', () => {
    const items = [{ display: '1.557.000' }, { display: '12' }, { display: '554' }];
    const gutter = barValueGutterEmu(items);
    expect(gutter).toBe(barValueWidthEmu('1.557.000'));
    for (const item of items) expect(gutter).toBeGreaterThanOrEqual(barValueWidthEmu(item.display));
  });

  it('never falls below what 3.2.7 reserved', () => {
    expect(barValueGutterEmu([{ display: '1' }])).toBe(600000);
    expect(barValueGutterEmu([])).toBe(600000);
  });

  it('is the one source both writers measure with, so the preview and the .pptx cannot drift', () => {
    const pptx = readFileSync(join(process.cwd(), 'ui/app/features/wrapup/pptxTemplate.ts'), 'utf8');
    const preview = readFileSync(join(process.cwd(), 'ui/app/features/wrapup/DeckPreview.tsx'), 'utf8');
    for (const [name, source] of [['pptxTemplate', pptx], ['DeckPreview', preview]] as const) {
      const bars = source.slice(source.indexOf('trackW = rect.w - labelW - 40000'));
      const chart = bars.slice(0, bars.indexOf('\n}'));
      expect(chart, `${name} must take the gutter from barValueGutterEmu`).toContain('barValueGutterEmu');
      // The fixed box and the old reservation are gone from the bar path.
      expect(chart, `${name} must not keep the fixed 600000 box`).not.toContain('600000');
      expect(chart, `${name} must not keep the old 620000 reservation`).not.toContain('620000');
    }
  });

  it('shares the gap between the bar and its value', () => {
    expect(BAR_VALUE_GAP).toBe(30000);
  });
});

// ------------------------------------------------------------------ S2: no password, no partner

describe('a PoC with no password of its own (S2)', () => {
  it('has no verifier in force, so there is nothing for the gate to check against', () => {
    expect(currentVerifier(EMPTY_ACCESS)).toBeNull();
    expect(hasNoPassword(EMPTY_ACCESS)).toBe(true);
  });

  it('honours no roster entry, however fresh — a grant made under no password is no grant', () => {
    const entry = {
      email: 'pat@partner.example',
      name: 'Pat',
      unlockedAt: '2026-11-03T08:00:00Z',
      expiresAt: '2099-01-01T00:00:00Z',
      passwordVersion: 0,
    };
    expect(isEntryValid(entry, EMPTY_ACCESS, Date.parse('2026-11-03T12:00:00Z'))).toBe(false);
  });

  it('ships no password hash anywhere a build could carry one', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const file of ['ui/app/config/access.ts', 'ui/app/config/AccessContext.tsx']) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, `${file} must not name a built-in verifier`).not.toContain('DEFAULT_VERIFIER');
      // 3.7.7: only the master verifier (the owner's order; a PBKDF2 hash, never the password) may be a 64-hex literal.
      expect((source.match(/['"`][0-9a-f]{64}['"`]/g) ?? []).length, `${file} holds one hash at most, the master verifier`).toBeLessThanOrEqual(file.endsWith('access.ts') ? 1 : 0);
    }
  });
});

// ------------------------------------------------------------------ Q8 / Q12: the DQL that changed

describe('query accounting counts queries, not records (Q8)', () => {
  it('counts distinct query ids per table, and keeps the aggregated ones visible', () => {
    const dql = CATALOG['cons.advisor']!.dql;
    expect(dql).toContain('countDistinctExact(query_id)');
    expect(dql, 'aggregated events carry no query_id and would vanish silently').toContain('countIf(isNull(query_id))');
    expect(dql, 'count() per table counted one query once per table it touched').not.toContain('executions = count()');
  });

  it('has an aggregate for the totals, because summing the per-table rows double counts', () => {
    const total = CATALOG['cons.advisor.total'];
    expect(total, 'cons.advisor.total must exist').toBeDefined();
    expect(total!.dql).toContain('countDistinctExact(query_id)');
    // A real aggregate: one row for the whole environment, so no `by:` and no limit.
    expect(total!.dql).not.toMatch(/by:\s*\{/);
    expect(total!.dql).not.toMatch(/\|\s*limit\s+\d+/);
  });
});

describe('recurrence is keyed by the entity Davis blamed (Q12)', () => {
  it('groups by the root cause as well as the name, in the list and in its totals', () => {
    for (const id of ['prob.recurrent', 'prob.recurrent.total']) {
      const dql = CATALOG[id]!.dql;
      expect(dql, `${id} must key on the cause`).toContain('rootCause');
      expect(dql, `${id} must group by it`).toContain('by:{event.name, event.category, rootCause}');
    }
  });

  it('gives the patterns Davis did not attribute one explicit bucket, not a null', () => {
    expect(CAUSE_NOT_NAMED).toBe('Cause not named by Davis');
    expect(CATALOG['prob.recurrent']!.dql).toContain(`isNull(root_cause_entity_name), "${CAUSE_NOT_NAMED}"`);
  });

  it('keeps the two queries on the same key, so the totals describe the list', () => {
    const key = (id: string) => CATALOG[id]!.dql.match(/by:\{[^}]*\}/)?.[0];
    expect(key('prob.recurrent.total')).toBe(key('prob.recurrent'));
  });
});
