import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — top-up keys of work package WP4 of the real-prints deck (keys not already in v327prints.ts).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 *
 * - `prt.zip.*`: why a companion ZIP was refused, the `{detail}` of `prt.err.zip`.
 * - `prt.imp.*`: lines of the import report (another plan version, a probe, an image already
 *   kept, the 16-print cap).
 * - `prt.err.file.missing` / `.decode`: a referenced image absent from the ZIP; an image the
 *   browser could not decode.
 * - `prt.store.reason.*`: the `{reason}` of `prt.store.notSaved`; `prt.err.store.limit` and
 *   `prt.store.sizeWarning`: the 16-print cap and the 25 MB warning of the images document.
 * - `prt.diag.*`: diagnostics values the spec's set did not name (the store's 403/error, paste and
 *   drop received or not) and the two SE-only rows.
 * - `prt.guided.noSurface` / `.ended`: guided capture with nothing shared, and sharing stopped.
 */

export const v327Wp4Strings = {
  'prt.zip.notZip': { en: 'not a ZIP file', 'pt-BR': 'não é um arquivo ZIP' },
  'prt.zip.tooMany': { en: 'too many files', 'pt-BR': 'arquivos demais' },
  'prt.zip.badName': { en: 'unexpected file names', 'pt-BR': 'nomes de arquivo inesperados' },
  'prt.zip.tooLarge': { en: 'over the size limit', 'pt-BR': 'acima do limite de tamanho' },
  'prt.zip.badMethod': { en: 'unsupported compression or encryption', 'pt-BR': 'compressão ou criptografia não suportada' },
  'prt.zip.zip64': { en: 'ZIP64 archives are not supported', 'pt-BR': 'arquivos ZIP64 não são suportados' },
  'prt.zip.noManifest': { en: 'no manifest.json inside', 'pt-BR': 'sem manifest.json dentro' },
  'prt.zip.unreadable': { en: 'it could not be read', 'pt-BR': 'não pôde ser lido' },
  'prt.imp.planMismatch': {
    en: 'This ZIP was captured from another version of the shot plan; prints were matched by screen id and address.',
    'pt-BR': 'Este ZIP foi capturado com outra versão do roteiro; os prints foram associados pelo id e pelo endereço da tela.',
  },
  'prt.imp.probe': {
    en: 'Link check: {count} {count|address|addresses} checked on this tenant.',
    'pt-BR': 'Verificação de links: {count} {count|endereço verificado|endereços verificados} nesta tenant.',
  },
  'prt.imp.duplicate': { en: '{name}: already imported (same image).', 'pt-BR': '{name}: já importado (mesma imagem).' },
  'prt.imp.limit': {
    en: '{name}: the limit of {max} prints was reached; remove a print first.',
    'pt-BR': '{name}: o limite de {max} prints foi atingido; remova um print antes.',
  },
  'prt.err.file.missing': { en: 'the image is missing from the ZIP', 'pt-BR': 'a imagem não está no ZIP' },
  'prt.err.file.decode': { en: 'the image could not be decoded in this browser', 'pt-BR': 'a imagem não pôde ser decodificada neste navegador' },
  'prt.err.store.limit': {
    en: 'This deck already has 16 prints; remove one first.',
    'pt-BR': 'Este deck já tem 16 prints; remova um antes.',
  },
  'prt.store.sizeWarning': {
    en: 'The prints document is over 25 MB; new prints are refused above 45 MB.',
    'pt-BR': 'O documento de prints passou de 25 MB; acima de 45 MB novos prints são recusados.',
  },
  'prt.store.reason.forbidden': { en: 'no permission to save documents on the tenant', 'pt-BR': 'sem permissão para salvar documentos na tenant' },
  'prt.store.reason.tooLarge': { en: 'the prints document is too large', 'pt-BR': 'o documento de prints está grande demais' },
  'prt.store.reason.error': { en: 'the tenant did not answer', 'pt-BR': 'a tenant não respondeu' },
  'prt.guided.noSurface': { en: 'Nothing was shared; try again and pick the Dynatrace tab.', 'pt-BR': 'Nada foi compartilhado; tente de novo e escolha a aba do Dynatrace.' },
  'prt.guided.ended': {
    en: 'Sharing ended; share the tab again to keep capturing.',
    'pt-BR': 'O compartilhamento terminou; compartilhe a aba de novo para continuar capturando.',
  },
} as const satisfies Record<string, Entry>;
