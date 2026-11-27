import { describe, expect, it } from 'vitest';

import {
  ALL_KEYS,
  LOCALES,
  LOCALE_LABELS,
  LOCALE_TAG,
  entryFor,
  pluralKey,
  translate,
  type StringKey,
} from '../i18n/strings';
import { NAVIGATION } from '../config/navigation';
import { TIMEFRAME_PRESETS } from '../utils/time';
import { coreStrings } from '../i18n/strings';
import { pageStrings } from '../i18n/pages';
import { v2Strings } from '../i18n/v2';
import { v31Strings } from '../i18n/v31';
import { v31AStrings } from '../i18n/v31a';
import { v31BStrings } from '../i18n/v31b';
import { v31CStrings } from '../i18n/v31c';
import { v31DStrings } from '../i18n/v31d';
import { v31EStrings } from '../i18n/v31e';
import { v31FStrings } from '../i18n/v31f';
import { v32Strings } from '../i18n/v32';
import { v32aStrings } from '../i18n/v32a';
import { v321Strings } from '../i18n/v321';
import { v323Strings } from '../i18n/v323';
import { v324Strings } from '../i18n/v324';
import { v325Strings } from '../i18n/v325';
import { v326Strings } from '../i18n/v326';
import { v327Strings } from '../i18n/v327';
import { v327PrintsStrings } from '../i18n/v327prints';
import { v327Wp2Strings } from '../i18n/v327wp2';
import { v327Wp3Strings } from '../i18n/v327wp3';
import { v327Wp4Strings } from '../i18n/v327wp4';
import { v327Wp5Strings } from '../i18n/v327wp5';
import { v327Wp6Strings } from '../i18n/v327wp6';
import { v327Wp7Strings } from '../i18n/v327wp7';
import { v327Wp8Strings } from '../i18n/v327wp8';
import { v33Strings } from '../i18n/v33';
import { v332CapsStrings } from '../i18n/v332caps';
import { v332CatStrings } from '../i18n/v332cat';
import { v332PrintsStrings } from '../i18n/v332prints';
import { v333DeckStrings } from '../i18n/v333deck';
import { v334DashStrings } from '../i18n/v334dash';
import { v335Strings } from '../i18n/v335';
import { v336Strings } from '../i18n/v336';
import { v337Strings } from '../i18n/v337';
import { v338Strings } from '../i18n/v338';
import { v339Strings } from '../i18n/v339';
import { v3310Strings } from '../i18n/v3310';
import { v3311Strings } from '../i18n/v3311';
import { v3312Strings } from '../i18n/v3312';
import { v3313Strings } from '../i18n/v3313';
import { v3314Strings } from '../i18n/v3314';
import { v3315Strings } from '../i18n/v3315';
import { v3316Strings } from '../i18n/v3316';
import { v3317Strings } from '../i18n/v3317';
import { v3318Strings } from '../i18n/v3318';
import { v3319Strings } from '../i18n/v3319';
import { v3320Strings } from '../i18n/v3320';
import { v3321Strings } from '../i18n/v3321';
import { v340Strings } from '../i18n/v340';
import { v341Strings } from '../i18n/v341';
import { v342Strings } from '../i18n/v342';
import { v343Strings } from '../i18n/v343';
import { v344Strings } from '../i18n/v344';
import { v345Strings } from '../i18n/v345';
import { v346Strings } from '../i18n/v346';
import { v347Strings } from '../i18n/v347';
import { v348Strings } from '../i18n/v348';
import { v349Strings } from '../i18n/v349';
import { v3410Strings } from '../i18n/v3410';
import { v3411Strings } from '../i18n/v3411';
import { v3412Strings } from '../i18n/v3412';
import { v3413Strings } from '../i18n/v3413';
import { v3414Strings } from '../i18n/v3414';
import { v3415Strings } from '../i18n/v3415';
import { v3416Strings } from '../i18n/v3416';
import { v3417Strings } from '../i18n/v3417';
import { v3418Strings } from '../i18n/v3418';
import { v350Strings } from '../i18n/v350';
import { v351Strings } from '../i18n/v351';
import { v352Strings } from '../i18n/v352';
import { v353Strings } from '../i18n/v353';
import { v354Strings } from '../i18n/v354';
import { v355Strings } from '../i18n/v355';
import { v356Strings } from '../i18n/v356';
import { v357Strings } from '../i18n/v357';
import { v358Strings } from '../i18n/v358';
import { v359Strings } from '../i18n/v359';
import { v360Strings } from '../i18n/v360';
import { v361Strings } from '../i18n/v361';
import { v362Strings } from '../i18n/v362';
import { v363Strings } from '../i18n/v363';
import { v364Strings } from '../i18n/v364';
import { v365Strings } from '../i18n/v365';
import { v366Strings } from '../i18n/v366';
import { v367Strings } from '../i18n/v367';
import { v368Strings } from '../i18n/v368';
import { v369Strings } from '../i18n/v369';
import { v370Strings } from '../i18n/v370';
import { v371Strings } from '../i18n/v371';
import { v372Strings } from '../i18n/v372';
import { v373Strings } from '../i18n/v373';
import { v374Strings } from '../i18n/v374';
import { v375Strings } from '../i18n/v375';
import { v376Strings } from '../i18n/v376';
import { v377Strings } from '../i18n/v377';
import { v378Strings } from '../i18n/v378';
import { v379Strings } from '../i18n/v379';
import { v380Strings } from '../i18n/v380';
import { v381Strings } from '../i18n/v381';

/**
 * A half-translated screen in front of a customer is worse than an English one,
 * so completeness is asserted rather than assumed.
 */

describe('dictionary completeness', () => {
  it('has a non-empty translation for every key in every locale', () => {
    for (const key of ALL_KEYS) {
      const entry = entryFor(key);
      for (const locale of LOCALES) {
        expect(entry[locale], `${key} / ${locale}`).toBeTruthy();
        expect(entry[locale].trim().length, `${key} / ${locale}`).toBeGreaterThan(0);
      }
    }
  });

  it('does not leave Portuguese entries identical to English by accident', () => {
    // Some strings are legitimately identical across locales - product names,
    // "Kubernetes", "Roadmap". Anything longer than a few words that is byte
    // identical is almost certainly an untranslated placeholder.
    // 3.4.13: a product name (Real User Monitoring) and the title of a Dynatrace screen, which the product shows in English.
    // 3.7.0: two formats of the triage action's e-mail, placeholders and punctuation only.
    const allowedIdentical = new Set<string>(['twt.coverTitle', 'prt.src.davis', 'prq.rum.title', 'prq.ips.mock.title', 'triage.head', 'triage.subject', 'triage.k8s', 'triage.sec.links', 'weekly.sec.links', 'builder.tab.dashboards']);
    const suspicious = ALL_KEYS.filter((key) => {
      if (allowedIdentical.has(key)) return false;
      const entry = entryFor(key);
      return entry.en === entry['pt-BR'] && entry.en.split(' ').length > 3;
    });
    expect(suspicious, `untranslated: ${suspicious.join(', ')}`).toHaveLength(0);
  });

  it('keeps placeholders consistent between locales', () => {
    const placeholders = (text: string) => (text.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
    for (const key of ALL_KEYS) {
      const entry = entryFor(key);
      expect(placeholders(entry['pt-BR']), key).toEqual(placeholders(entry.en));
    }
  });

  it('labels and formats every supported locale', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale]).toBeTruthy();
      expect(LOCALE_TAG[locale]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });
});

describe('coverage of the surfaces this pass claims to translate', () => {
  it('has a translation for every navigation entry', () => {
    for (const section of NAVIGATION) {
      expect(ALL_KEYS, section.route).toContain(section.labelKey);
    }
  });

  it('has a translation for every timeframe preset', () => {
    for (const preset of TIMEFRAME_PRESETS) {
      expect(ALL_KEYS, preset.expression).toContain(`timeframe.${preset.expression}`);
    }
  });

  it('has a translation for every provenance value shown as a badge', () => {
    for (const provenance of [
      'observed',
      'derived',
      'partial',
      'platform-estimate',
      'projection',
      'recommendation',
      'hypothesis',
      'not-configured',
      'no-telemetry',
      'no-permission',
      'loading',
      'failed',
    ]) {
      expect(ALL_KEYS, provenance).toContain(`prov.${provenance}`);
    }
  });
});

describe('translate', () => {
  it('returns the requested locale', () => {
    expect(translate('shell.refresh', 'en')).toBe('Refresh');
    expect(translate('shell.refresh', 'pt-BR')).toBe('Atualizar');
  });

  it('substitutes placeholders', () => {
    const text = translate('report.windowLine', 'pt-BR', { window: 'Últimos 30 dias', days: 30, max: 30 });
    expect(text).toContain('Últimos 30 dias');
    expect(text).toContain('30');
    expect(text).not.toContain('{window}');
  });

  it('replaces every occurrence of a repeated placeholder', () => {
    const text = translate('metric.problemsSuffix', 'en', { time: '2 h', count: '5' });
    expect(text).not.toContain('{');
  });

  it('never throws on an unknown key', () => {
    // Cast is deliberate: the point is that a bad key at runtime degrades to the
    // key itself rather than crashing a live presentation.
    const unknown = 'does.not.exist' as Parameters<typeof translate>[0];
    expect(translate(unknown, 'pt-BR')).toBe('does.not.exist');
  });

  it('keeps the safety wording intact in Portuguese', () => {
    // These are the sentences that stop a customer misreading a gap as a clean
    // result. If they were dropped in translation the app would lose its point.
    expect(translate('state.noPermission.body', 'pt-BR')).toMatch(/lacuna de permissão/);
    expect(translate('entity.outage.title', 'pt-BR')).toMatch(/não é uma contagem zero/);
    expect(translate('cost.assumptionWarning', 'pt-BR')).toMatch(/não é lido do ambiente/);
    expect(translate('report.s5.disclaimer', 'pt-BR')).toMatch(/não afirma economia financeira/);
  });
});

describe('singular forms', () => {
  const singulars = ALL_KEYS.filter((key) => key.endsWith('.one'));

  it('chooses the singular only for exactly one, and only when it exists', () => {
    expect(pluralKey('common.agentsCount', 1)).toBe('common.agentsCount.one');
    expect(pluralKey('common.agentsCount', 0)).toBe('common.agentsCount');
    expect(pluralKey('common.agentsCount', 2)).toBe('common.agentsCount');
    // No singular entry: the base key is used whatever the count.
    expect(pluralKey('common.unknown', 1)).toBe('common.unknown');
  });

  it('every singular has a base phrase with the same placeholders in every locale', () => {
    expect(singulars.length).toBeGreaterThan(0);
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of singulars) {
      const base = key.slice(0, -'.one'.length) as StringKey;
      expect(ALL_KEYS, `${key} has no base ${base}`).toContain(base);
      for (const locale of LOCALES) {
        expect(placeholders(entryFor(key)[locale]), `${key} / ${locale}`).toEqual(placeholders(entryFor(base)[locale]));
      }
    }
  });

  it('reads right in English and Portuguese', () => {
    expect(translate(pluralKey('common.toolsCount', 1), 'pt-BR', { n: 1 })).toBe('1 ferramenta');
    expect(translate(pluralKey('common.toolsCount', 3), 'pt-BR', { n: 3 })).toBe('3 ferramentas');
    expect(translate(pluralKey('p.cloud.card.hosts', 1), 'en', { hosts: 1 })).toBe('1 host monitored');
  });
});

describe('inline plurals', () => {
  const GROUP = /\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g;
  const withGroups = ALL_KEYS.filter((key) => LOCALES.some((locale) => /\{\w+\|[^|{}]*\|[^|{}]*\}/.test(entryFor(key)[locale])));

  it('picks the first form for exactly 1 and the second otherwise', () => {
    const key = 'tw.sec.assist.critical' as StringKey;
    expect(translate(key, 'en', { count: 1 })).toBe('1 critical finding needs attention before the production rollout.');
    expect(translate(key, 'en', { count: '1' })).toBe('1 critical finding needs attention before the production rollout.');
    expect(translate(key, 'en', { count: 2 })).toBe('2 critical findings need attention before the production rollout.');
    expect(translate(key, 'en', { count: 0 })).toBe('0 critical findings need attention before the production rollout.');
    expect(translate(key, 'pt-BR', { count: 1 })).toBe('1 achado crítico precisa de atenção antes do rollout de produção.');
    expect(translate(key, 'pt-BR', { count: '1.250' })).toContain('achados críticos precisam');
  });

  it('leaves a group alone when its count is not supplied, so a missing param is visible', () => {
    expect(translate('tw.sec.assist.critical' as StringKey, 'en', {})).toContain('{count|finding needs|findings need}');
  });

  it('every phrase with a plural group names a supplied count and resolves cleanly in both languages', () => {
    expect(withGroups.length).toBeGreaterThan(20);
    for (const key of withGroups) {
      const names = (text: string) => [...new Set([...text.matchAll(GROUP)].map((match) => match[1]))].sort();
      const en = entryFor(key).en;
      const pt = entryFor(key)['pt-BR'];
      // Portuguese may need agreement where English does not ("{active} ainda aberto|abertos"), so the
      // groups of the two languages need not match — but every group must name a count that is supplied.
      for (const name of [...names(en), ...names(pt)]) {
        expect(`${en} ${pt}`, `${key}: group {${name}|…} has no plain {${name}} placeholder`).toContain(`{${name}}`);
      }
      const placeholders = new Set([...en.matchAll(/\{(\w+)\}/g), ...pt.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string));
      for (const name of names(en)) placeholders.add(name as string);
      for (const value of [1, 2]) {
        const params = Object.fromEntries([...placeholders].map((name) => [name, value]));
        for (const locale of LOCALES) {
          const text = translate(key, locale, params);
          expect(text, `${key} / ${locale} / ${value}`).not.toMatch(/[{}|]/);
        }
      }
    }
  });
});

describe('dictionary fragments', () => {
  it('never lets one fragment silently override a key defined by another', () => {
    // The fragments are merged with object spread, where the last one wins without a word.
    const fragments: Record<string, object> = {
      coreStrings, pageStrings, v2Strings, v31Strings, v31AStrings, v31BStrings, v31CStrings,
      v31DStrings, v31EStrings, v31FStrings, v32Strings, v32aStrings, v321Strings, v323Strings, v324Strings, v325Strings, v326Strings, v327Strings,
      v327PrintsStrings, v327Wp2Strings, v327Wp3Strings, v327Wp4Strings, v327Wp5Strings, v327Wp6Strings, v327Wp7Strings, v327Wp8Strings,
      v33Strings,
      v332PrintsStrings,
      v332CapsStrings,
      v332CatStrings,
      v333DeckStrings,
      v334DashStrings,
      v335Strings,
      v336Strings,
      v337Strings,
      v338Strings,
      v339Strings,
      v3310Strings,
      v3311Strings,
      v3312Strings,
      v3313Strings,
      v3314Strings,
      v3315Strings,
      v3316Strings,
      v3317Strings,
      v3318Strings,
      v3319Strings,
      v3320Strings,
      v3321Strings,
      v340Strings,
      v341Strings,
      v342Strings,
      v343Strings,
      v344Strings,
      v345Strings,
      v346Strings,
      v347Strings,
      v348Strings,
      v349Strings,
      v3410Strings,
      v3411Strings,
      v3412Strings,
      v3413Strings,
      v3414Strings,
      v3415Strings,
      v3416Strings,
      v3417Strings,
      v3418Strings,
      v350Strings,
      v351Strings,
      v352Strings,
      v353Strings,
      v354Strings,
      v355Strings,
      v356Strings,
      v357Strings,
      v358Strings,
      v359Strings,
      v360Strings,
      v361Strings,
      v362Strings,
      v363Strings,
      v364Strings,
      v365Strings,
      v366Strings,
      v367Strings,
      v368Strings,
      v369Strings,
      v370Strings,
      v371Strings,
      v372Strings,
      v373Strings,
      v374Strings,
      v375Strings,
      v376Strings,
      v377Strings,
      v378Strings,
      v379Strings,
      v380Strings,
      v381Strings,
    };
    const owner = new Map<string, string>();
    const collisions: string[] = [];
    for (const [name, fragment] of Object.entries(fragments)) {
      for (const key of Object.keys(fragment)) {
        const previous = owner.get(key);
        if (previous !== undefined) collisions.push(`${key} (${previous} → ${name})`);
        owner.set(key, name);
      }
    }
    expect(collisions).toEqual([]);
  });
});
