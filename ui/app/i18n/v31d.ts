import { type Entry } from './locales';

/**
 * PoC Value Studio 3.1 — page strings, group D.
 *
 * One file per migration group so parallel work never edits the same file. Merged
 * into the single dictionary in `strings.ts`; both locales are required.
 *
 * Settings: the reasons a logo upload is refused. `utils/logo.ts` still returns
 * its English `reason` (and keeps its own tests); the page maps each refusal to
 * one of these keys so the operator reads it in the active language.
 */
export const v31DStrings = {
  // ------------------------------------------------------ settings: logo upload
  'settings.logo.err.svg': {
    en: 'SVG is not accepted, because an SVG file can contain script and this logo is rendered as markup. Export the logo as PNG and upload that.',
    'pt-BR':
      'SVG não é aceito, porque um arquivo SVG pode conter script e esta logo é renderizada como marcação. Exporte a logo como PNG e envie esse arquivo.',
  },
  'settings.logo.err.format': {
    en: 'Unsupported format "{type}". Use PNG, JPEG or WebP.',
    'pt-BR': 'Formato não suportado "{type}". Use PNG, JPEG ou WebP.',
  },
  'settings.logo.err.unknownType': { en: 'unknown', 'pt-BR': 'desconhecido' },
  'settings.logo.err.size': {
    en: 'The file is {size} kB. Keep it under {max} kB so it stays light in the report.',
    'pt-BR':
      'O arquivo tem {size} kB. Mantenha abaixo de {max} kB para que a logo fique leve no relatório.',
  },
  'settings.logo.err.empty': { en: 'The file is empty.', 'pt-BR': 'O arquivo está vazio.' },
  'settings.logo.err.notRaster': {
    en: 'The file could not be read as a raster image.',
    'pt-BR': 'Não foi possível ler o arquivo como uma imagem raster.',
  },
  'settings.logo.err.read': {
    en: 'The file could not be read.',
    'pt-BR': 'Não foi possível ler o arquivo.',
  },
  'settings.logo.alt.customer': { en: 'Customer logo', 'pt-BR': 'Logo do cliente' },
  'settings.logo.alt.customerNamed': { en: '{name} logo', 'pt-BR': 'Logo de {name}' },
  'settings.logo.alt.partner': { en: 'Partner logo', 'pt-BR': 'Logo do parceiro' },
  'settings.logo.alt.partnerNamed': { en: '{name} logo', 'pt-BR': 'Logo de {name}' },

  // --------------------------------------------- consumption: capability cells
  'p.cons.cell.notVolumeBased': { en: 'Not volume based', 'pt-BR': 'Não baseado em volume' },
  'p.cons.cell.sourceUnit': { en: '{value} (source unit)', 'pt-BR': '{value} (unidade de origem)' },
} as const satisfies Record<string, Entry>;
