import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — top-up keys of work package WP7 of the real-prints deck (keys not already in v327prints.ts).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 *
 * The tab's own words beyond the spec's set (`features/wrapup/prints/ui/`):
 * - `prt.tab.*`: the generic Cancel / Close of its dialogs.
 * - `prt.plan.*`: the empty plan, a shot list that would be empty (the companion refuses one), the
 *   file just downloaded.
 * - `prt.cap.*`, `prt.imp.*`: the companion's command and guide, capture on hold (another PoC's
 *   prints, or the store still loading), the import waiting for the plan, the import report's
 *   table, the manual target, the guided capture's progress.
 * - `prt.ap.*`: why the approval switch is not there yet, a companion print that did not land, a
 *   forced probe-only screen that needs the on-screen check for the customer deck.
 * - `prt.diag.*`, `prt.gallery.*`, `prt.deck.*`: the diagnostics table and copy fallback, the empty
 *   gallery and the orphans' note, the deck panel's lead, reading/baking states and failure.
 * - `prt.how.*`: "Como funciona" — the flow, the VM and laptop runbooks (§6.9, §6.10), the manual
 *   path and the privacy notes.
 */

export const v327Wp7Strings = {
  // ---- dialogs
  'prt.tab.cancel': { en: 'Cancel', 'pt-BR': 'Cancelar' },
  'prt.tab.close': { en: 'Close', 'pt-BR': 'Fechar' },

  // ---- A · plan
  'prt.plan.empty': {
    en: "No screen could be planned from this PoC's data yet; the plan fills in as the reads arrive.",
    'pt-BR': 'Ainda não há tela planejada a partir dos dados desta PoC; o roteiro se completa conforme as leituras chegam.',
  },
  'prt.plan.reading': {
    en: 'Reading the data the plan is built from; the shot list is offered once it is in.',
    'pt-BR': 'Lendo os dados de que o roteiro depende; o roteiro para baixar aparece quando eles chegarem.',
  },

  // ---- B · capture
  'prt.cap.waitStore': { en: 'Reading your saved prints…', 'pt-BR': 'Lendo os seus prints salvos…' },
  'prt.cap.staleHold': {
    en: 'Capture and import wait until you decide about the prints of the other PoC, above.',
    'pt-BR': 'A captura e a importação aguardam a sua decisão sobre os prints da outra PoC, acima.',
  },
  'prt.cap.importWait': {
    en: 'The import opens once the plan is read: the prints attach to its screens.',
    'pt-BR': 'A importação abre quando o roteiro terminar de ser lido: os prints se ligam às telas dele.',
  },
  // 3.2.7 review UX-M6: while the plan's reads are out, a screen not yet chosen is being read, not "out of the plan".
  'prt.plan.rowReading': { en: 'Reading the data for this screen…', 'pt-BR': 'Lendo os dados desta tela…' },
  'prt.plan.statusReading': { en: 'Reading', 'pt-BR': 'Lendo' },
  'prt.imp.at': { en: 'Last import: {at}', 'pt-BR': 'Última importação: {at}' },
  'prt.imp.h.result': { en: 'Result', 'pt-BR': 'Resultado' },
  'prt.imp.h.count': { en: 'Screens', 'pt-BR': 'Telas' },
  'prt.imp.refused': { en: 'Refused', 'pt-BR': 'Recusados' },
  'prt.cap.manual.target': { en: 'Screen for this image', 'pt-BR': 'Tela desta imagem' },
  'prt.cap.manual.none': { en: 'Tick a screen in the plan to capture it.', 'pt-BR': 'Marque uma tela no roteiro para capturá-la.' },
  'prt.cap.manual.added': { en: 'Print added to “{title}”.', 'pt-BR': 'Print adicionado a “{title}”.' },
  'prt.cap.manual.replaces': {
    en: 'This screen already has a print: a new image replaces it, and its pins, masks and approval start over.',
    'pt-BR': 'Esta tela já tem um print: uma nova imagem o substitui, e pinos, tarjas e aprovação recomeçam.',
  },
  'prt.cap.manual.nothing': {
    en: 'No image arrived: paste a screenshot or drop an image file.',
    'pt-BR': 'Nenhuma imagem chegou: cole um print ou solte um arquivo de imagem.',
  },
  'prt.crop.working': { en: 'Preparing the image…', 'pt-BR': 'Preparando a imagem…' },
  // 3.2.7 review UX-L3: the bar counts the screens that already have a print, and a walk with nothing left says so.

  // ---- approval
  'prt.ap.needIdentity': {
    en: 'Confirm that this is the screen of {name} to approve it.',
    'pt-BR': 'Confirme que esta é a tela de {name} para poder aprovar.',
  },
  'prt.ap.needChecklist': { en: 'Tick the checklist to approve this print.', 'pt-BR': 'Marque o checklist para poder aprovar este print.' },
  'prt.ap.landing': {
    en: 'The companion did not reach this screen; capture it again.',
    'pt-BR': 'O capturador não chegou a esta tela; capture-a de novo.',
  },
  'prt.ap.forcedAnchor': {
    en: 'This address was only listed for a probe: the customer deck needs the on-screen check (“Verified screen”).',
    'pt-BR': 'Este endereço estava só na verificação de links: o deck do cliente pede a conferência na tela (“Tela verificada”).',
  },

  // ---- diagnostics

  // ---- C · prints
  'prt.gallery.empty': {
    en: 'No print yet: run the companion with the shot plan and import its ZIP, or bring a screenshot by hand.',
    'pt-BR': 'Ainda não há print: rode o capturador com o roteiro e importe o ZIP, ou traga um print manualmente.',
  },
  'prt.gallery.orphanHint': {
    en: 'These prints came in a ZIP but match no screen of this plan; nothing is re-bound on its own.',
    'pt-BR': 'Estes prints vieram em um ZIP mas não correspondem a nenhuma tela deste roteiro; nada é reassociado sozinho.',
  },

  // ---- D · deck
  'prt.deck.lead': {
    en: 'Each print comes with its DQL reading over the same entity and window. The preview below is the file: same slides, same order.',
    'pt-BR': 'Cada print vem com a sua leitura por DQL na mesma entidade e janela. A prévia abaixo é o arquivo: mesmos slides, mesma ordem.',
  },
  'prt.deck.reading': {
    en: 'Reading the evidence of the prints; the analysis slides fill in as it arrives.',
    'pt-BR': 'Lendo as evidências dos prints; os slides de análise se completam conforme chegam.',
  },
  'prt.deck.baking': { en: 'Preparing the images with their masks…', 'pt-BR': 'Preparando as imagens com as tarjas…' },
  'prt.deck.failed': {
    en: 'The deck file could not be built ({reason}). The PDF still works: it prints this preview.',
    'pt-BR': 'Não foi possível montar o arquivo do deck ({reason}). O PDF continua funcionando: ele imprime esta prévia.',
  },

  // ---- E · how it works
  'prt.how.title': { en: 'How it works', 'pt-BR': 'Como funciona' },
  'prt.how.flow.title': { en: 'The flow, step by step', 'pt-BR': 'O fluxo, passo a passo' },
  'prt.how.plan': {
    en: "1. The plan: the app picks the screen that proves each point from this PoC's own data, with the reason and the window of every number.",
    'pt-BR': '1. O roteiro: o app escolhe, pelos dados desta PoC, a tela que prova cada ponto, com o motivo e a janela de cada número.',
  },
  'prt.how.capture': {
    en: '2. Import: open each planned screen with “Open in Dynatrace”, take a screenshot and bring them in — one at a time, or all at once in a batch the app matches to the screens and shows for your review. Each print is fit to 1720 × 1080.',
    'pt-BR':
      '2. Importação: abra cada tela planejada com “Abrir no Dynatrace”, tire o print e traga para cá — um de cada vez, ou todos de uma vez num lote que o app casa com as telas e mostra para a sua revisão. Cada print é ajustado a 1720 × 1080.',
  },
  'prt.how.review': {
    en: '3. Review: check the screen, accept or ignore the suggested masks, tick the checklist and approve each print for the customer. Any change to the image, the masks or the focus withdraws the approval.',
    'pt-BR':
      '3. Revisão: confira a tela, aceite ou ignore as tarjas sugeridas, marque o checklist e aprove cada print para o cliente. Qualquer mudança na imagem, nas tarjas ou no foco retira a aprovação.',
  },
  'prt.how.deck': {
    en: '4. Deck: each print gets a reading in Grail over the same entity and window, then the story and the method. The Customer profile keeps only approved prints; an unapproved one stays as “Proof by DQL”, with no pixels.',
    'pt-BR':
      '4. Deck: cada print ganha uma leitura no Grail na mesma entidade e janela, depois a história e a metodologia. O perfil Cliente mantém só prints aprovados; um não aprovado fica como “Prova por DQL”, sem pixels.',
  },
  'prt.how.manual.title': { en: 'By hand', 'pt-BR': 'Manualmente' },
  'prt.how.manual.body': {
    en: 'Open the screen with “Open in Dynatrace”, take a screenshot (Win+Shift+S or Cmd+Shift+4), then upload, paste or drop it here, adjust the crop and confirm the screen before approving it.',
    'pt-BR':
      'Abra a tela com “Abrir no Dynatrace”, tire um print (Win+Shift+S ou Cmd+Shift+4), depois envie, cole ou solte aqui, ajuste o recorte e confirme a tela antes de aprová-la.',
  },
  'prt.how.privacy.title': { en: 'Privacy', 'pt-BR': 'Privacidade' },
  'prt.how.privacy.body': {
    en: 'Prints are private documents of your user on this tenant. Masks are solid fills burned into the deck image; the original never reaches the file. Licensing, consumption and cost screens never enter this deck.',
    'pt-BR':
      'Os prints são documentos privados do seu usuário nesta tenant. As tarjas são preenchimentos sólidos gravados na imagem do deck; o original nunca vai para o arquivo. Telas de licenciamento, consumo e custo nunca entram neste deck.',
  },
} as const satisfies Record<string, Entry>;
