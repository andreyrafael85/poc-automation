import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — top-up keys of work package WP7b of the real-prints deck (the print
 * editor and the crop dialog; keys not already in v327prints.ts or another fragment).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 *
 * - `prt.ed.*`: the editor's mode group and stage names, the how-to line of each mode, the notes
 *   for a letterboxed image, a screen in another language and a print outside the plan, the
 *   pin limits and the 72 px overlap guard, one pin's text field, the masks' and the detail's
 *   lists, the numbers panel's heading and its "different measures" state.
 * - `prt.crop.*`: the crop stage and its four edges (sliders), where the left edge came from
 *   (detected navigation or the 200/1920 default), the crop's size and how it becomes the
 *   1720 × 1080 print.
 */

export const v327Wp8Strings = {
  // ---- editor: frame
  'prt.ed.modes': { en: 'Editing mode', 'pt-BR': 'Modo de edição' },
  'prt.ed.stage': { en: 'Print being edited: {title}', 'pt-BR': 'Print em edição: {title}' },
  'prt.ed.saveNote': {
    en: 'Every change is saved as you make it; Esc closes the editor.',
    'pt-BR': 'Cada mudança é salva na hora; Esc fecha o editor.',
  },
  'prt.ed.hint.pins': {
    en: 'Click the print to add a pin; drag a pin to move it. Keyboard: “Add a pin” below, then Tab to a pin, arrows move it 4 px (Shift: 20 px), Enter edits its text, Delete removes it.',
    'pt-BR':
      'Clique no print para adicionar um pino; arraste um pino para movê-lo. Teclado: “Adicionar pino” abaixo, depois Tab até o pino, setas movem 4 px (Shift: 20 px), Enter edita o texto, Delete remove.',
  },
  'prt.ed.hint.masks': {
    en: 'Drag on the print to draw a mask (at least 8 × 8 px); drag a mask to move it. Keyboard: “Add a mask” below, then Tab to a mask, arrows move it (Shift: faster), Alt+arrows resize it, Delete removes it.',
    'pt-BR':
      'Arraste no print para desenhar uma tarja (pelo menos 8 × 8 px); arraste uma tarja para movê-la. Teclado: “Adicionar tarja” abaixo, depois Tab até a tarja, setas a movem (Shift: mais rápido), Alt+setas mudam o tamanho, Delete remove.',
  },
  'prt.ed.hint.focus': {
    en: 'Drag on the print to mark the detail to enlarge (up to 520 px wide); drag it to move it. Keyboard: Tab to the detail, arrows move it (Shift: faster), Alt+arrows resize it.',
    'pt-BR':
      'Arraste no print para marcar o detalhe a ampliar (até 520 px de largura); arraste-o para movê-lo. Teclado: Tab até o detalhe, setas o movem (Shift: mais rápido), Alt+setas mudam o tamanho.',
  },
  'prt.ed.partial': {
    en: 'This image does not fill the print (it has margins): the suggested pin positions are off, so place the pins yourself.',
    'pt-BR': 'Esta imagem não preenche o print (tem margens): as posições sugeridas dos pinos ficam desligadas, então posicione os pinos você mesmo.',
  },
  'prt.ed.uiLang': {
    en: 'This screen was captured in another language ({lang}): its labels were not matched, so the pins sit at estimated positions.',
    'pt-BR': 'Esta tela foi capturada em outro idioma ({lang}): os rótulos não foram reconhecidos, então os pinos ficam em posições estimadas.',
  },
  'prt.ed.orphan': {
    en: 'This print is outside the plan: use it in a screen of the plan before approving it.',
    'pt-BR': 'Este print está fora do roteiro: use-o em uma tela do roteiro antes de aprová-lo.',
  },
  'prt.ed.approval': { en: 'Approval', 'pt-BR': 'Aprovação' },

  // ---- editor: pins
  'prt.ed.pins.none': {
    en: 'No pin on this print yet: click where a pin should go.',
    'pt-BR': 'Ainda não há pino neste print: clique onde um pino deve ficar.',
  },
  'prt.ed.pins.limit': { en: 'A print holds at most {max} pins: remove one first.', 'pt-BR': 'Um print comporta no máximo {max} pinos: remova um antes.' },
  'prt.ed.pins.limitLupa': {
    en: 'With the enlarged detail on, a print holds at most {max} pins: remove one or turn the detail off.',
    'pt-BR': 'Com o detalhe ampliado ligado, um print comporta no máximo {max} pinos: remova um ou desligue o detalhe.',
  },
  'prt.ed.pins.overlap': {
    en: 'Pins closer than 72 px overlap on the slide: choose another spot.',
    'pt-BR': 'Pinos a menos de 72 px se sobrepõem no slide: escolha outro ponto.',
  },
  'prt.ed.pins.restoreAll': { en: 'Restore the suggested pins', 'pt-BR': 'Restaurar os pinos sugeridos' },
  'prt.ed.pins.add': { en: 'Add a pin', 'pt-BR': 'Adicionar pino' },
  'prt.ed.pin.title': { en: 'Pin {n}', 'pt-BR': 'Pino {n}' },
  'prt.ed.pin.edit': { en: 'Edit the text of pin {n}', 'pt-BR': 'Editar o texto do pino {n}' },
  'prt.ed.pin.text': { en: 'Text of pin {n}', 'pt-BR': 'Texto do pino {n}' },
  'prt.ed.pin.textHint': {
    en: 'Write it as “Name: what it shows”; the slide sets the name in bold.',
    'pt-BR': 'Escreva como “Nome: o que mostra”; o slide põe o nome em negrito.',
  },
  'prt.ed.pin.count': { en: '{count} of {max} characters', 'pt-BR': '{count} de {max} caracteres' },
  'prt.ed.pin.remove': { en: 'Remove pin {n}', 'pt-BR': 'Remover pino {n}' },
  'prt.ed.pin.noText': {
    en: 'no text yet: this pin stays off the slide until it has one',
    'pt-BR': 'sem texto: este pino fica fora do slide até ganhar um',
  },
  'prt.ed.pin.added': { en: 'Pin {n} added.', 'pt-BR': 'Pino {n} adicionado.' },
  'prt.ed.pin.removed': { en: 'Pin {n} removed.', 'pt-BR': 'Pino {n} removido.' },

  // ---- editor: masks
  'prt.ed.mask.aria': { en: 'Mask {n}: {reason}', 'pt-BR': 'Tarja {n}: {reason}' },
  'prt.ed.mask.remove': { en: 'Remove mask {n}', 'pt-BR': 'Remover tarja {n}' },
  'prt.ed.mask.added': { en: 'Mask added.', 'pt-BR': 'Tarja adicionada.' },
  'prt.ed.mask.tooSmall': {
    en: 'A mask needs at least 8 × 8 px: drag a larger rectangle.',
    'pt-BR': 'Uma tarja precisa de pelo menos 8 × 8 px: arraste um retângulo maior.',
  },
  'prt.ed.masks.suggested': { en: 'Suggested by the companion ({count})', 'pt-BR': 'Sugeridas pelo capturador ({count})' },
  'prt.ed.masks.accepted': { en: 'Masks on the print ({count})', 'pt-BR': 'Tarjas no print ({count})' },
  'prt.ed.masks.none': { en: 'No mask on this print yet.', 'pt-BR': 'Ainda não há tarja neste print.' },
  'prt.ed.masks.add': { en: 'Add a mask', 'pt-BR': 'Adicionar tarja' },

  // ---- editor: focus (lupa)
  'prt.ed.focus.aria': { en: 'Enlarged detail', 'pt-BR': 'Detalhe ampliado' },
  'prt.ed.focus.none': { en: 'No detail marked yet: draw one on the print.', 'pt-BR': 'Nenhum detalhe marcado: desenhe um no print.' },
  'prt.ed.focus.restore': { en: 'Use the suggested detail', 'pt-BR': 'Usar o detalhe sugerido' },
  'prt.ed.focus.tooSmall': {
    en: 'A detail needs at least 8 × 8 px: drag a larger rectangle.',
    'pt-BR': 'Um detalhe precisa de pelo menos 8 × 8 px: arraste um retângulo maior.',
  },
  'prt.ed.focus.add': { en: 'Mark a detail', 'pt-BR': 'Marcar um detalhe' },
  'prt.ed.focus.preview': { en: 'The enlarged detail as the slide shows it', 'pt-BR': 'O detalhe ampliado como o slide mostra' },
  'prt.ed.focus.pinsOver': {
    en: 'The enlarged detail fits with up to {max} pins; this print has {count}. Remove pins to use it.',
    'pt-BR': 'O detalhe ampliado cabe com até {max} pinos; este print tem {count}. Remova pinos para usá-lo.',
  },
  'prt.ed.focus.cut': {
    en: 'With the enlarged detail on, only the first {max} pins go on the slide.',
    'pt-BR': 'Com o detalhe ampliado ligado, só os {max} primeiros pinos vão para o slide.',
  },

  // ---- editor: numbers panel
  'prt.ed.numbers.title': { en: 'On screen and in Grail', 'pt-BR': 'Na tela e no Grail' },
  'prt.ed.numbers.differ': { en: 'different measures', 'pt-BR': 'medidas diferentes' },

  // ---- crop dialog
  'prt.crop.stage': { en: 'Image to crop: {title}', 'pt-BR': 'Imagem a recortar: {title}' },
  'prt.crop.edge.left': { en: 'Left edge of the crop', 'pt-BR': 'Borda esquerda do recorte' },
  'prt.crop.edge.right': { en: 'Right edge of the crop', 'pt-BR': 'Borda direita do recorte' },
  'prt.crop.edge.top': { en: 'Top edge of the crop', 'pt-BR': 'Borda superior do recorte' },
  'prt.crop.edge.bottom': { en: 'Bottom edge of the crop', 'pt-BR': 'Borda inferior do recorte' },
  'prt.crop.px': { en: '{value} px', 'pt-BR': '{value} px' },
  'prt.crop.keys': {
    en: 'Keyboard: Tab to an edge; arrows move it (Shift: faster).',
    'pt-BR': 'Teclado: Tab até uma borda; setas a movem (Shift: mais rápido).',
  },
  'prt.crop.detected': {
    en: 'The platform navigation was detected: the crop starts at {x} px.',
    'pt-BR': 'A navegação da plataforma foi detectada: o recorte começa em {x} px.',
  },
  'prt.crop.fallback': {
    en: 'The platform navigation was not detected: the crop starts at the usual {x} px (200 of every 1920).',
    'pt-BR': 'A navegação da plataforma não foi detectada: o recorte começa no padrão de {x} px (200 a cada 1920).',
  },
  'prt.crop.size': { en: 'Crop: {w} × {h} px of {width} × {height}', 'pt-BR': 'Recorte: {w} × {h} px de {width} × {height}' },
  'prt.crop.result': { en: 'Result: the print at 1720 × 1080', 'pt-BR': 'Resultado: o print em 1720 × 1080' },
  'prt.crop.fit.resized': { en: 'Fits the print: scaled to 1720 px wide.', 'pt-BR': 'Cabe no print: ajustado para 1720 px de largura.' },
  'prt.crop.fit.cut': {
    en: 'Scaled to 1720 px wide; the rows below 1080 are cut.',
    'pt-BR': 'Ajustado para 1720 px de largura; as linhas abaixo de 1080 são cortadas.',
  },
  'prt.crop.fit.pad': {
    en: 'Scaled to 1720 px wide; the bottom is completed with the page’s own colour.',
    'pt-BR': 'Ajustado para 1720 px de largura; o fim é completado com a cor da própria página.',
  },
  'prt.crop.fit.contain': {
    en: 'This shape is far from 1720 × 1080: the image gets margins and the suggested pin positions are turned off. Adjust the crop to fill the print.',
    'pt-BR':
      'Este formato está longe de 1720 × 1080: a imagem ganha margens e as posições sugeridas dos pinos ficam desligadas. Ajuste o recorte para preencher o print.',
  },
} as const satisfies Record<string, Entry>;
