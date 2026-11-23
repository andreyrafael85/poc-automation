import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.4.14: the app takes the name "PoC Automation 3.0" ("All in One", automated) and the
 * address /ui/apps/my.poc.automation, from the owner's order of 2026-11-19; "Move this PoC" carries the Coverage
 * readings and the action plan (file format 2). Merged in `strings.ts`.
 */

export const v3414Strings = {
  'transfer.confirm.coverage': {
    en: 'It also brings the Coverage page’s kept readings ({readings}) and its agreed action plan ({actions} actions).',
    'pt-BR': 'Traz também as leituras guardadas da página Cobertura ({readings}) e o plano de ação combinado ({actions} ações).',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i87': {
    en: '3.4.14 — PoC Value Studio is now PoC Automation 3.0: All in One, automated — the same app, every reading and figure as before, under a new name and the address /ui/apps/my.poc.automation (the version stays 3.4.x). Settings → "Move this PoC" now also carries the Coverage page’s kept readings and its action plan, so the PoC moves whole to the new address.',
    'pt-BR': '3.4.14 — O PoC Value Studio agora é PoC Automation 3.0: All in One, automatizado — o mesmo app, cada leitura e número como antes, com nome novo e o endereço /ui/apps/my.poc.automation (a versão segue 3.4.x). Configurações → "Levar esta PoC" agora leva também as leituras guardadas da página Cobertura e o plano de ação, para a PoC ir inteira para o endereço novo.',
  },
} satisfies Record<string, Entry>;
