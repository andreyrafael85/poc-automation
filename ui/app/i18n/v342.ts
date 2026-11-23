import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.2 — the Assessment before × after, as a file, and co-branded: keep a reading
 * and compare a later one with it (F-01), download it as JSON (F-02), the partner's logo on the PDF
 * cover (F-10). Owner's order of 2026-11-18: "Seguir com o próximo release com suas sugestões."
 * Merged in `strings.ts`.
 */

export const v342Strings = {
  // ---------------------------------------------------------------- before × after
  'p.asm.hist.title': { en: 'Before and after', 'pt-BR': 'Antes e depois' },
  'p.asm.hist.caption': {
    en: 'Keep this reading and compare a later one with it — at the end of the PoC or at the next health check. A kept reading holds only what was measured then, with its window and its moment; it is shared with the PoC team and cleared by “New PoC”.',
    'pt-BR': 'Guarde esta leitura e compare uma leitura posterior com ela — no fim da PoC ou no próximo health check. Uma leitura guardada traz só o que foi medido na hora, com a janela e o momento; ela é compartilhada com o time da PoC e apagada por “Nova PoC”.',
  },
  'p.asm.hist.save': { en: 'Keep this reading', 'pt-BR': 'Guardar esta leitura' },
  'p.asm.hist.compareWith': { en: 'Compare with', 'pt-BR': 'Comparar com' },
  'p.asm.hist.choose': { en: 'Choose a kept reading', 'pt-BR': 'Escolha uma leitura guardada' },
  'p.asm.hist.option': { en: '{date} · {window} · index {index}', 'pt-BR': '{date} · {window} · índice {index}' },
  'p.asm.hist.remove': { en: 'Delete this kept reading', 'pt-BR': 'Apagar esta leitura guardada' },
  'p.asm.hist.empty': {
    en: 'No reading kept yet. Keep this one to compare a later reading with it.',
    'pt-BR': 'Ainda sem leitura guardada. Guarde esta para comparar uma leitura posterior com ela.',
  },
  'p.asm.hist.status.loading': { en: 'Reading the kept readings…', 'pt-BR': 'Lendo as leituras guardadas…' },
  'p.asm.hist.status.saving': { en: 'Saving…', 'pt-BR': 'Salvando…' },
  'p.asm.hist.status.saved': { en: 'Reading kept on the tenant.', 'pt-BR': 'Leitura guardada no tenant.' },
  'p.asm.hist.status.removed': { en: 'Kept reading deleted.', 'pt-BR': 'Leitura guardada apagada.' },
  'p.asm.hist.status.offline': {
    en: 'Readings are kept on the tenant; this session has no App State.',
    'pt-BR': 'As leituras ficam no tenant; esta sessão não tem App State.',
  },
  'p.asm.hist.status.forbidden': {
    en: 'This identity cannot read or write the PoC’s shared state, so readings cannot be kept.',
    'pt-BR': 'Esta identidade não lê nem grava o estado compartilhado da PoC, por isso as leituras não podem ser guardadas.',
  },
  'p.asm.hist.status.too-large': {
    en: 'The kept readings no longer fit in App State; delete an older one first.',
    'pt-BR': 'As leituras guardadas não cabem mais no App State; apague uma mais antiga antes.',
  },
  'p.asm.hist.status.failed': { en: 'The kept readings could not be read or saved; try again.', 'pt-BR': 'Não foi possível ler ou salvar as leituras guardadas; tente de novo.' },
  'p.asm.hist.between': { en: 'Kept reading: {before} → now: {now}.', 'pt-BR': 'Leitura guardada: {before} → agora: {now}.' },
  'p.asm.hist.windowsDiffer': {
    en: 'The two readings cover different windows; part of a difference can come from that.',
    'pt-BR': 'As duas leituras cobrem janelas diferentes; parte de uma diferença pode vir disso.',
  },
  'p.asm.hist.indexBefore': { en: 'Index then', 'pt-BR': 'Índice antes' },
  'p.asm.hist.indexNow': { en: 'Index now', 'pt-BR': 'Índice agora' },
  'p.asm.hist.difference': { en: 'Difference', 'pt-BR': 'Diferença' },
  'p.asm.hist.points': { en: '{value} points', 'pt-BR': '{value} pontos' },
  'p.asm.hist.pp': { en: '{value} p.p.', 'pt-BR': '{value} p.p.' },
  'p.asm.hist.noDelta': { en: 'not comparable — one reading has no index', 'pt-BR': 'sem comparação — uma das leituras não tem índice' },
  'p.asm.hist.before': { en: 'Then', 'pt-BR': 'Antes' },
  'p.asm.hist.now': { en: 'Now', 'pt-BR': 'Agora' },
  'p.asm.hist.na': { en: 'does not apply', 'pt-BR': 'não se aplica' },
  'p.asm.hist.unread': { en: 'not read', 'pt-BR': 'sem leitura' },
  'p.asm.hist.capabilities': { en: 'Capabilities whose state changed', 'pt-BR': 'Capacidades que mudaram de estado' },
  'p.asm.hist.capabilitiesSame': { en: 'No capability changed state between the two readings.', 'pt-BR': 'Nenhuma capacidade mudou de estado entre as duas leituras.' },
  'p.asm.hist.capabilityChange': { en: '{name}: was {before}, now {now}', 'pt-BR': '{name}: era {before}, agora {now}' },
  'p.asm.hist.findingsByClass': { en: 'Findings by class', 'pt-BR': 'Achados por classe' },
  'p.asm.hist.resolved': { en: 'No longer raised: {count}', 'pt-BR': 'Não aparecem mais: {count}' },
  'p.asm.hist.raised': { en: 'New in this reading: {count}', 'pt-BR': 'Novos nesta leitura: {count}' },
  'p.asm.hist.none': { en: 'None.', 'pt-BR': 'Nenhum.' },
  'p.asm.hist.kept': { en: 'Raised in both readings: {count}.', 'pt-BR': 'Presentes nas duas leituras: {count}.' },

  // ---------------------------------------------------------------- JSON
  'p.asm.json.button': { en: 'Download JSON', 'pt-BR': 'Baixar JSON' },
  'p.asm.json.hint': {
    en: 'Every figure with its query, the DQL sent and the time it was read — for the SE and the partner, to re-run a number or put environments side by side.',
    'pt-BR': 'Cada número com a sua consulta, a DQL enviada e a hora da leitura — para o SE e o parceiro refazerem um número ou compararem ambientes.',
  },

  'help.whatsNew.i75': {
    en: '3.4.2 — the Coverage page before and after: keep a reading on the tenant and compare a later one with it — the index, each domain, the capabilities that changed and the findings no longer raised or new — for the end of the PoC or the next health check, printed in the PDF too; “Download JSON” gives the SE and the partner every figure with its query, DQL and read time; and the PDF cover carries the partner’s logo beside the customer’s.',
    'pt-BR': '3.4.2 — a página Cobertura antes e depois: guarde uma leitura no tenant e compare uma leitura posterior com ela — o índice, cada domínio, as capacidades que mudaram e os achados que não aparecem mais ou são novos — para o fim da PoC ou o próximo health check, também no PDF; “Baixar JSON” dá ao SE e ao parceiro cada número com a consulta, a DQL e a hora da leitura; e a capa do PDF leva o logo do parceiro ao lado do logo do cliente.',
  },
} satisfies Record<string, Entry>;
