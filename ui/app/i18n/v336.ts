import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.6 — the app moves to the id `my.poc.value.studio` (no version in the URL),
 * and Settings gains "Move this PoC": export the PoC to a file, import one. Merged in `strings.ts`.
 */

export const v336Strings = {
  'transfer.title': { en: 'Move this PoC', 'pt-BR': 'Levar esta PoC' },
  'transfer.body': {
    en: 'Save the PoC configured here to a file — customer, scope, logos, pillars, the PoC plan with its success criteria and dashboards, and your own working figures — and open it in another install of the app or another environment. The partner password is not included: set a new one under Access.',
    'pt-BR': 'Salve a PoC configurada aqui num arquivo — cliente, escopo, logos, pilares, o plano da PoC com os critérios de sucesso e os dashboards, e os seus números de trabalho — e abra-o em outra instalação do app ou em outro ambiente. A senha do parceiro fica de fora: defina uma nova em Acesso.',
  },
  'transfer.export': { en: 'Export this PoC', 'pt-BR': 'Exportar esta PoC' },
  'transfer.import': { en: 'Import a PoC…', 'pt-BR': 'Importar uma PoC…' },
  'transfer.failed.title': { en: 'This file cannot be imported', 'pt-BR': 'Este arquivo não pode ser importado' },
  'transfer.failed.notPocFile': {
    en: 'It is not a PoC exported by PoC Automation 3.0. Use the file "Export this PoC" saves.',
    'pt-BR': 'Ele não é uma PoC exportada pelo PoC Automation 3.0. Use o arquivo que o "Exportar esta PoC" salva.',
  },
  'transfer.failed.tooLarge': { en: 'It is larger than a PoC file can be (2 MB).', 'pt-BR': 'Ele é maior do que um arquivo de PoC pode ser (2 MB).' },
  'transfer.failed.newerFormat': {
    en: 'It was saved by a newer version of the app. Update this install, then import it again.',
    'pt-BR': 'Ele foi salvo por uma versão mais nova do app. Atualize esta instalação e importe de novo.',
  },
  'transfer.failed.empty': { en: 'It holds no customer, engagement or success criteria.', 'pt-BR': 'Ele não traz cliente, engajamento nem critérios de sucesso.' },
  'transfer.confirm.title': { en: 'Import the PoC of {customer}?', 'pt-BR': 'Importar a PoC de {customer}?' },
  'transfer.confirm.holds': {
    en: 'Engagement: {engagement} · {criteria} success criteria · {dashboards} dashboard references.',
    'pt-BR': 'Engajamento: {engagement} · {criteria} critérios de sucesso · {dashboards} referências de dashboard.',
  },
  'transfer.confirm.from': { en: 'Exported by version {version} on {at}.', 'pt-BR': 'Exportada pela versão {version} em {at}.' },
  'transfer.confirm.replaces': {
    en: 'It replaces the PoC configured on this environment, for everyone who opens the app here.',
    'pt-BR': 'Ela substitui a PoC configurada neste ambiente, para todos que abrem o app aqui.',
  },
  'transfer.confirm.go': { en: 'Import and replace', 'pt-BR': 'Importar e substituir' },
  'transfer.confirm.cancel': { en: 'Cancel', 'pt-BR': 'Cancelar' },
  'transfer.done.title': { en: 'The PoC of {customer} is here', 'pt-BR': 'A PoC de {customer} chegou' },
  'transfer.done.body': {
    en: 'It is saved on this environment in a moment. Set a partner password under Access if partners will use this install.',
    'pt-BR': 'Ela fica salva neste ambiente em instantes. Defina a senha do parceiro em Acesso se parceiros vão usar esta instalação.',
  },

  'help.whatsNew.i57': {
    en: '3.3.6 — The app now lives at /ui/apps/my.poc.value.studio, with no version in its address. Settings → "Move this PoC" exports the PoC to a file and imports it in another install or environment (the partner password stays behind).',
    'pt-BR': '3.3.6 — O app agora fica em /ui/apps/my.poc.value.studio, sem versão no endereço. Configurações → "Levar esta PoC" exporta a PoC para um arquivo e a importa em outra instalação ou ambiente (a senha do parceiro fica de fora).',
  },
} satisfies Record<string, Entry>;
