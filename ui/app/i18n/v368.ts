import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.8 (the owner, 2026-11-22: "Seguir com a 3.6.8, porém valide estes pontos antes"):
 * Settings out of executive mode, a count column on the Logs console in the selected window, and the v6 wave 4's maps in
 * the v6 tones (the app's gradient areas kept, at the owner's choice). Merged in `strings.ts`.
 */

export const v368Strings = {
  // ------------------------------------------------------------------ the Logs console with a count
  'catalog.purpose.log.errors.grouped': {
    en: 'The error records of every readable bucket in the selected window, grouped by message — numbers written as # and ids as <id>, so a repeated error counts as one — with how many times each appeared, when it was last seen and on how many hosts. The 12 most recently seen; a list of counts, never summed.',
    'pt-BR':
      'Os registros de erro de todos os buckets legíveis na janela selecionada, agrupados pela mensagem — números escritos ' +
      'como # e ids como <id>, para que um erro repetido conte como um —, com quantas vezes cada um apareceu, quando foi ' +
      'visto pela última vez e em quantos hosts. Os 12 vistos mais recentemente; uma lista de contagens, nunca somada.',
  },
  'v6.logconsole.col.last': { en: 'Last seen', 'pt-BR': 'Última vez' },
  'v6.logconsole.col.origin': { en: 'Origin', 'pt-BR': 'Origem' },
  'v6.logconsole.col.message': { en: 'Message', 'pt-BR': 'Mensagem' },
  'v6.logconsole.col.count': { en: 'Count', 'pt-BR': 'Contagem' },
  'v6.logconsole.hosts': { en: '{n} hosts', 'pt-BR': '{n} hosts' },
  'v6.logconsole.countAria': { en: 'Appeared {n} times in the window', 'pt-BR': 'Apareceu {n} vezes na janela' },
  'v6.logconsole.atLeast': { en: '≥ {n}', 'pt-BR': '≥ {n}' },
  'v6.logconsole.noneWindow': {
    en: 'No error record in the selected window.',
    'pt-BR': 'Nenhum registro de erro na janela selecionada.',
  },
  'v6.logconsole.grouped': {
    en:
      'The {shown} errors seen most recently in the selected window, each with how many times it appeared (log.errors.grouped). ' +
      'Numbers in a message are written as # and ids as <id>, so a repeated error is counted together; the counts are not added up.',
    'pt-BR':
      'Os {shown} erros vistos mais recentemente na janela selecionada, cada um com quantas vezes apareceu (log.errors.grouped). ' +
      'Números na mensagem aparecem como # e ids como <id>, para que um erro repetido seja contado junto; as contagens não são somadas.',
  },
  'v6.logconsole.groupedTotal': {
    en:
      'The {shown} errors seen most recently in the selected window, each with how many times it appeared (log.errors.grouped). ' +
      'Numbers in a message are written as # and ids as <id>, so a repeated error is counted together; the counts are not added up. ' +
      'In the last 30 minutes: {total} error records in all (log.quality).',
    'pt-BR':
      'Os {shown} erros vistos mais recentemente na janela selecionada, cada um com quantas vezes apareceu (log.errors.grouped). ' +
      'Números na mensagem aparecem como # e ids como <id>, para que um erro repetido seja contado junto; as contagens não são somadas. ' +
      'Nos últimos 30 minutos: {total} registros de erro ao todo (log.quality).',
  },
  'assumption.consumption.lab.errorCountPerHour': {
    en: 'Lab tenant: log GiB the Logs console’s count reads per hour of window',
    'pt-BR': 'Tenant de laboratório: GiB de logs que a contagem do console de Logs lê por hora de janela',
  },
  'assumption.consumption.lab.errorCountPerHour.basis': {
    en: 'Measured on 2026-11-22: 1.72 GiB for 24 hours; grows with the window and the tenant’s logs per hour.',
    'pt-BR': 'Medido em 2026-11-22: 1,72 GiB em 24 horas; cresce com a janela e com os logs por hora do tenant.',
  },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i110': {
    en: '3.6.8 — Cleaner for the customer, closer to v6. Executive mode no longer shows Settings: the last stage leaves the menu, so the app shows the customer only its features. On Logs, each of the most recent errors now has a count of how many times it appeared in the selected window, with repeats grouped together. And the maps — the stack, who calls what, the RCA trail — take the v6 dashboards’ quiet tones, with the light and the root cause in turquoise.',
    'pt-BR': '3.6.8 — Mais limpo para o cliente, mais perto do v6. O modo executivo não mostra mais as Configurações: a última etapa sai do menu, e o app mostra ao cliente só as funcionalidades. Em Logs, cada um dos erros mais recentes ganha a contagem de quantas vezes apareceu na janela selecionada, com as repetições agrupadas. E os mapas — a pilha, quem chama quem, a trilha do RCA — ganham os tons calmos dos painéis v6, com a luz e a causa raiz em turquesa.',
  },
} satisfies Record<string, Entry>;
