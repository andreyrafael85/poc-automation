import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.4 — strings of milestone M4 (the SE deck: one specification, the preview is
 * the file, captures of the app with numbered pins, the executive page and the export profiles).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 */

export const v324Strings = {
  // ------------------------------------------------------------------ export profile (SE Report)
  'profile.label': { en: 'Export profile', 'pt-BR': 'Perfil do material' },
  'profile.customer': { en: 'Customer', 'pt-BR': 'Cliente' },
  'profile.se': { en: 'SE (internal)', 'pt-BR': 'SE (interno)' },
  'profile.customer.help': {
    en: 'Ready to hand over: no licensing, DPS, consumption, rates or priced figures, in any tab or file.',
    'pt-BR': 'Pronto para entregar: sem licenciamento, DPS, consumo, taxas ou valores, em nenhuma aba ou arquivo.',
  },
  'profile.se.help': {
    en: 'Adds consumption, rates and priced figures, and marks every page and slide “SE internal”. Do not send it to the customer.',
    'pt-BR': 'Inclui consumo, taxas e valores, e marca cada página e slide como “uso interno SE”. Não envie ao cliente.',
  },
  'profile.se.locked': {
    en: 'The SE profile is unavailable in Executive mode, the presentation mode. Leave it to prepare the SE profile.',
    'pt-BR': 'O perfil SE fica indisponível no Modo executivo, o modo de apresentação. Saia dele para preparar o perfil SE.',
  },
  'profile.watermark': { en: 'SE INTERNAL — NOT FOR THE CUSTOMER', 'pt-BR': 'USO INTERNO SE — NÃO ENVIAR AO CLIENTE' },
  'profile.banner': {
    en: 'SE profile: this material contains commercial data. It is for the SE only.',
    'pt-BR': 'Perfil SE: este material contém dados comerciais. É só para o SE.',
  },

  // ------------------------------------------------------------------ SE Report tabs
  'sereport.tab.deck': { en: 'Tech Wrapup deck', 'pt-BR': 'Deck Tech Wrapup' },
  'sereport.tab.onepager': { en: 'Executive one-pager', 'pt-BR': 'Executivo (1 página)' },

  // ------------------------------------------------------------------ the deck page
  'deck.title': { en: 'Tech Wrapup — the deck the customer receives', 'pt-BR': 'Tech Wrapup — o deck que o cliente recebe' },
  'deck.subtitle': {
    en: 'Built on the Dynatrace corporate template from what this PoC measured. The preview below is the file: same slides, same cuts, same positions.',
    'pt-BR': 'Montado no template corporativo da Dynatrace a partir do que esta PoC mediu. A prévia abaixo é o arquivo: mesmos slides, mesmos cortes, mesmas posições.',
  },
  'deck.download.pptx': { en: 'Download PowerPoint', 'pt-BR': 'Baixar PowerPoint' },
  'deck.download.pdf': { en: 'Print PDF', 'pt-BR': 'Imprimir PDF' },
  'deck.download.generating': { en: 'Generating…', 'pt-BR': 'Gerando…' },
  'deck.download.ready': { en: 'File ready: {name}.', 'pt-BR': 'Arquivo pronto: {name}.' },
  'deck.download.fallback': {
    en: 'If the download did not start, save it from here.',
    'pt-BR': 'Se o download não começou, salve por aqui.',
  },
  'deck.download.failed.title': { en: 'The PowerPoint could not be generated', 'pt-BR': 'Não foi possível gerar o PowerPoint' },
  'deck.download.failed.body': {
    en: 'The corporate template could not be loaded or written in this browser ({reason}). The PDF still works: it prints this preview.',
    'pt-BR': 'O template corporativo não pôde ser carregado ou gravado neste navegador ({reason}). O PDF continua funcionando: ele imprime esta prévia.',
  },
  'deck.pdf.howTo': {
    en: 'In the print dialog choose “Save as PDF”; each slide prints as one 16:9 page.',
    'pt-BR': 'Na janela de impressão escolha “Salvar como PDF”; cada slide sai como uma página 16:9.',
  },
  'deck.sections.title': { en: 'Sections', 'pt-BR': 'Seções' },
  'deck.sections.body': {
    en: 'A section without measured data is left out on its own. Uncheck any other to drop it from the preview and the file.',
    'pt-BR': 'Uma seção sem dados medidos já fica de fora sozinha. Desmarque qualquer outra para tirá-la da prévia e do arquivo.',
  },
  'deck.preview.title': { en: 'Preview — {count} slides', 'pt-BR': 'Prévia — {count} slides' },
  'deck.preview.body': {
    en: 'Drawn from the same specification and geometry as the PowerPoint, over the template’s own cover, chrome and end slide.',
    'pt-BR': 'Desenhada a partir da mesma especificação e geometria do PowerPoint, sobre a capa, o cromo e o encerramento do próprio template.',
  },
  'deck.slideLabel': { en: 'Slide {n} of {total}: {title}', 'pt-BR': 'Slide {n} de {total}: {title}' },
  'deck.loading': {
    en: 'Some figures are still being read; the slides fill in as they arrive.',
    'pt-BR': 'Alguns números ainda estão sendo lidos; os slides se completam conforme chegam.',
  },
  'deck.capture.label': { en: 'In the app', 'pt-BR': 'No app' },
  // 3.5.6: the legend reads each pin (label, figure, technical reading, capability), as the v5 proposal drew it.
  'deck.capture.pins': { en: 'How to read', 'pt-BR': 'Como ler' },
  'deck.findings': { en: 'Key findings', 'pt-BR': 'Principais achados' },

  // ------------------------------------------------------------------ captures
  'deck.captures.title': { en: 'Captures of the app', 'pt-BR': 'Capturas do app' },
  'deck.captures.body': {
    en: 'Photographs the app’s own panels — one or two per section, as chosen below — and places them on their slides with numbered pins. Nothing leaves the browser; a panel without data keeps the drawn chart.',
    'pt-BR': 'Fotografa os painéis do próprio app — um ou dois por seção, conforme a escolha abaixo — e os coloca nos slides com marcadores numerados. Nada sai do navegador; um painel sem dados mantém o gráfico desenhado.',
  },
  'deck.captures.run': { en: 'Prepare captures', 'pt-BR': 'Preparar capturas' },
  'deck.captures.again': { en: 'Capture again', 'pt-BR': 'Capturar de novo' },
  'deck.captures.clear': { en: 'Remove captures', 'pt-BR': 'Remover capturas' },
  'deck.captures.progress': { en: 'Capturing {done} of {total}…', 'pt-BR': 'Capturando {done} de {total}…' },
  'deck.captures.done': {
    en: '{count} {count|capture|captures} on the slides.',
    'pt-BR': '{count} {count|captura|capturas} nos slides.',
  },
  'deck.captures.skipped': {
    en: 'No data to photograph for: {sections}. Those slides keep the drawn chart.',
    'pt-BR': 'Sem dados para fotografar em: {sections}. Esses slides mantêm o gráfico desenhado.',
  },
  'deck.captures.failed': {
    en: 'This browser could not draw the captures; the deck keeps the drawn charts.',
    'pt-BR': 'Este navegador não conseguiu gerar as capturas; o deck mantém os gráficos desenhados.',
  },
  'deck.captures.none': {
    en: 'None of the selected sections has a panel to photograph.',
    'pt-BR': 'Nenhuma das seções selecionadas tem um painel para fotografar.',
  },
  'cap.pin.peak': { en: 'Peak of {series}: {value} ({time})', 'pt-BR': 'Pico de {series}: {value} ({time})' },
  'cap.pin.headline': { en: 'In {series} — {label}: {value}', 'pt-BR': 'Em {series} — {label}: {value}' },
  'cap.pin.arrivals': {
    en: 'Busiest six hours: {value} problems began',
    'pt-BR': 'Seis horas mais carregadas: {value} problemas começaram',
  },
  'cap.pin.rca.problem': { en: 'The problem analysed: {name}', 'pt-BR': 'O problema analisado: {name}' },
  'cap.pin.rca.root': { en: 'Root cause named by Dynatrace Intelligence: {name}', 'pt-BR': 'Causa raiz apontada pela Dynatrace Intelligence: {name}' },
  'cap.pin.rca.affected': { en: 'Affected entity: {name}', 'pt-BR': 'Entidade afetada: {name}' },

  // ------------------------------------------------------------------ the executive page and one-pager
  'deck.exec.note': {
    en: '{generated}. Verdict lines are review conventions from the assumptions registry, not agreed objectives.',
    'pt-BR': '{generated}. As linhas do veredito são convenções do registro de premissas, não objetivos acordados.',
  },
  'onepager.title': { en: 'Executive one-pager', 'pt-BR': 'Executivo em 1 página' },
  'onepager.subtitle': {
    en: 'The page a director reads in two minutes: the verdict, three rings, five numbers and the next three steps — the executive slide of the deck, on its own.',
    'pt-BR': 'A página que um diretor lê em dois minutos: o veredito, três anéis, cinco números e os três próximos passos — o slide executivo do deck, sozinho.',
  },
  'onepager.print': { en: 'Print PDF', 'pt-BR': 'Imprimir PDF' },

  // ------------------------------------------------------------------ what's new
  'help.whatsNew.i27': {
    en: '3.2.4 — The SE deck has one specification: the preview is the file. Same slides, same text cuts and same positions in the PowerPoint and on screen, on the corporate template (cleaned of third-party metadata), in the template’s own fonts.',
    'pt-BR': '3.2.4 — O deck do SE tem uma única especificação: a prévia é o arquivo. Mesmos slides, mesmos cortes de texto e mesmas posições no PowerPoint e na tela, sobre o template corporativo (limpo de metadados de terceiros), nas fontes do próprio template.',
  },
  'help.whatsNew.i28': {
    en: '3.2.4 — “Prepare captures” photographs the app’s own panels and puts them on the slides with numbered pins and what each one shows.',
    'pt-BR': '3.2.4 — “Preparar capturas” fotografa os painéis do próprio app e os coloca nos slides com marcadores numerados e o que cada um mostra.',
  },
  'help.whatsNew.i29': {
    en: '3.2.4 — Export profiles in the SE Report: Customer (the default — no licensing, consumption or priced figure in any tab or file) and SE (internal, watermarked). An executive page opens the deck and prints on its own as a one-pager.',
    'pt-BR': '3.2.4 — Perfis de exportação no SE Report: Cliente (o padrão — nenhum licenciamento, consumo ou valor em nenhuma aba ou arquivo) e SE (interno, com marca d’água). Uma página executiva abre o deck e também sai sozinha como resumo de 1 página.',
  },
} as const satisfies Record<string, Entry>;
