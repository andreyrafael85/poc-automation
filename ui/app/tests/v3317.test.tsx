import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { executiveLayout } from '../features/wrapup/geometry';
import { executiveSlide, type ExecutiveInput } from '../features/wrapup/spec';
import { translate } from '../i18n/strings';

/**
 * 3.3.17 — the owner's 3.3.16 validation: the Tech Wrapup opens on "The PoC on one page" (three
 * questions, each answered by its ring and a measured sentence, beside the next steps — no longer a
 * second "Executive summary"), and the SE Report's "How problems behave" prints four figures to a row.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const INPUT: ExecutiveInput = {
  title: 'The PoC on one page',
  subtitle: 'Three questions',
  verdict: null,
  rings: [
    { label: 'A', value: 88, display: '88%', question: 'Do we see the whole estate?', answer: '695 entities monitored.' },
    { label: 'B', value: 99, display: '99%', question: 'Are problems found and solved?', answer: '7,693 problems; 99% closed.' },
    { label: 'C', value: null, display: '—', question: 'Are services and users well served?', answer: 'Not measured in this window.' },
  ],
  numbers: [],
  stepsTitle: 'Next steps',
  steps: [],
  note: '',
};

describe('The PoC on one page', () => {
  it('lays a question over each ring and its answer under it, beside the next steps, with no row of numbers', () => {
    const layout = executiveLayout(0, true);
    expect(layout.questions).toHaveLength(3);
    expect(layout.answers).toHaveLength(3);
    expect(layout.numbers).toHaveLength(0);
    for (const [index, ring] of layout.rings.entries()) {
      expect(layout.questions[index]!.y + layout.questions[index]!.h).toBeLessThanOrEqual(ring.y);
      expect(layout.answers[index]!.y).toBeGreaterThanOrEqual(ring.y + ring.h);
      expect(layout.answers[index]!.y + layout.answers[index]!.h).toBeLessThanOrEqual(layout.steps.y + layout.steps.h);
    }
    expect(layout.note.y).toBeGreaterThanOrEqual(layout.steps.y + layout.steps.h);
  });

  it('keeps the questions and answers on the slide, cut to their budgets', () => {
    const slide = executiveSlide(INPUT);
    expect(slide.rings.map((ring) => ring.question)).toEqual(INPUT.rings.map((ring) => ring.question));
    expect(slide.rings.every((ring) => (ring.answer ?? '').length <= 180)).toBe(true);
  });

  it('no longer shares its title with the business section, and speaks without pointing at a screen', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      expect(translate('deck.exec.title', locale)).not.toBe(translate('tw.exec.title', locale));
      for (const key of ['healthy', 'stable', 'attention', 'partial', 'blocked', 'unknown'] as const) {
        expect(translate(`deck.verdict.${key}`, locale)).not.toMatch(/below|abaixo/i);
      }
    }
    const hook = read('ui/app/features/wrapup/useExecutiveInput.ts');
    expect(hook).toContain("t('deck.exec.title')");
    expect(hook).toContain('numbers: []');
  });
});

describe('the SE Report', () => {
  it('prints "How problems behave" four figures to a row', () => {
    const report = read('ui/app/pages/ValueReport.tsx');
    const section = report.slice(report.indexOf("{t('report.s2.title')}"));
    expect(section.slice(0, 400)).toContain('<Grid data-print-grid min={150}>');
  });
});
