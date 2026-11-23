import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.2 — "Prints sem capturador".
 *
 * The owner retired the capture companion (noVNC, notebook) and the guided tab capture, and kept
 * the import: manual, or a batch the app matches to the planned screens (`capture/match.ts`).
 * These are the batch's strings and the plan's file-name hint. Merged in `strings.ts`.
 */

export const v332PrintsStrings = {
  // ------------------------------------------------------------------ the plan
  'prt.plan.howto': {
    en: 'Open each screen in order, take a screenshot and bring them all in at once under “Import”. Saving each one with the name shown below lets the app place it with high confidence.',
    'pt-BR': 'Abra cada tela na ordem, tire o print e traga todos de uma vez em “Importar”. Salvar cada um com o nome mostrado abaixo deixa o app colocá-lo com confiança alta.',
  },
  'prt.plan.fileName': { en: 'Save as {name}', 'pt-BR': 'Salvar como {name}' },
  'prt.plan.fileNameHint': {
    en: 'With this file name the batch import places the screenshot on this screen with high confidence.',
    'pt-BR': 'Com este nome de arquivo, a importação em lote coloca o print nesta tela com confiança alta.',
  },

  // ------------------------------------------------------------------ how it works
  'prt.how.batch.title': { en: 'Batch import', 'pt-BR': 'Importação em lote' },
  'prt.how.batch.body': {
    en: 'Save each screenshot with the name the plan shows (03-…png) and the app places it with high confidence; with any other name it reads the screen’s words, then the order the screenshots were taken in, and marks those “to confirm”. You review every guess, and nothing is added before you confirm.',
    'pt-BR': 'Salve cada print com o nome que o roteiro mostra (03-…png) e o app o coloca com confiança alta; com outro nome, ele lê as palavras da tela e depois a ordem em que os prints foram tirados, e marca esses como “a confirmar”. Você revisa cada palpite, e nada entra antes da sua confirmação.',
  },

  // ------------------------------------------------------------------ the batch
  'prt.batch.title': { en: 'Batch', 'pt-BR': 'Em lote' },
  'prt.batch.hint': {
    en: 'Select or drop the screenshots, or a ZIP with them. The app proposes a screen for each one and says how sure it is; nothing is added until you confirm. A ZIP from the former capture companion is still accepted.',
    'pt-BR': 'Selecione ou solte os prints, ou um ZIP com eles. O app propõe uma tela para cada um e diz o quanto tem certeza; nada entra antes da sua confirmação. Um ZIP do antigo capturador continua aceito.',
  },
  'prt.batch.pick': { en: 'Select screenshots', 'pt-BR': 'Selecionar prints' },
  'prt.batch.drop': { en: 'Drop screenshots or a ZIP here', 'pt-BR': 'Solte aqui os prints ou um ZIP' },
  'prt.batch.reading': { en: 'Reading {count} files…', 'pt-BR': 'Lendo {count} arquivos…' },
  'prt.batch.review': { en: 'Review of {count} images', 'pt-BR': 'Revisão de {count} imagens' },
  'prt.batch.coverage': { en: '{covered} of {total} screens with a print', 'pt-BR': '{covered} de {total} telas com print' },
  'prt.batch.skip': { en: 'Do not import', 'pt-BR': 'Não importar' },
  'prt.batch.conf.high': { en: 'High confidence', 'pt-BR': 'Confiança alta' },
  'prt.batch.conf.medium': { en: 'Medium confidence', 'pt-BR': 'Confiança média' },
  'prt.batch.conf.confirm': { en: 'To confirm', 'pt-BR': 'A confirmar' },
  'prt.batch.reason.id': { en: 'the file name carries the screen’s id', 'pt-BR': 'o nome do arquivo traz o id da tela' },
  'prt.batch.reason.number': { en: 'the file name starts with the screen’s number', 'pt-BR': 'o nome do arquivo começa pelo número da tela' },
  'prt.batch.reason.words': { en: 'the file name matches the screen’s words', 'pt-BR': 'o nome do arquivo combina com as palavras da tela' },
  'prt.batch.reason.order': { en: 'by the order the screenshots were taken', 'pt-BR': 'pela ordem em que os prints foram tirados' },
  'prt.batch.reason.duplicate': { en: 'same image as {name}', 'pt-BR': 'mesma imagem que {name}' },
  'prt.batch.reason.unplaced': { en: 'every open screen already has an image', 'pt-BR': 'todas as telas em aberto já têm imagem' },
  'prt.batch.reason.manual': { en: 'chosen by you', 'pt-BR': 'escolhida por você' },
  'prt.batch.tall': {
    en: 'Taller than a screen: check that it is the screen and not a scrolled page.',
    'pt-BR': 'Mais alta que uma tela: confira se é a tela e não uma página rolada.',
  },
  'prt.batch.proposedReplace': {
    en: 'Looks like “{title}”, which already has a print: choose it above to replace that print.',
    'pt-BR': 'Parece ser “{title}”, que já tem print: escolha a tela acima para substituir aquele print.',
  },
  'prt.batch.replaces': { en: 'Replaces this screen’s current print.', 'pt-BR': 'Substitui o print atual desta tela.' },
  'prt.batch.conflict': {
    en: 'Two images point to the same screen: choose one of them before importing.',
    'pt-BR': 'Duas imagens apontam para a mesma tela: escolha uma delas antes de importar.',
  },
  'prt.batch.confirm': { en: 'Import ({count})', 'pt-BR': 'Importar ({count})' },
  'prt.batch.cancel': { en: 'Cancel', 'pt-BR': 'Cancelar' },
  'prt.batch.done': {
    en: '{added} of {total} imported. Each one goes through your review before it reaches the deck.',
    'pt-BR': '{added} de {total} importados. Cada um passa pela sua revisão antes de chegar ao deck.',
  },
  'prt.batch.why.zip': { en: 'a ZIP this import does not read', 'pt-BR': 'um ZIP que esta importação não lê' },
  'prt.batch.why.nestedManifest': {
    en: 'a capture-companion ZIP packed again inside a folder; import the original ZIP so its tenant and hashes are checked',
    'pt-BR': 'um ZIP do capturador compactado de novo dentro de uma pasta; importe o ZIP original para que o tenant e os hashes sejam conferidos',
  },
  'prt.batch.why.tooMany': { en: 'beyond the {max} prints a set holds', 'pt-BR': 'além dos {max} prints que um conjunto comporta' },

  // ------------------------------------------------------------------ the SE deck (§17-g)
  'prt.deck.notApproved': { en: 'Not approved for the customer', 'pt-BR': 'Ainda sem aprovação para o cliente' },

  // ------------------------------------------------------------------ What's new (3.3.2)
  'help.whatsNew.i48': {
    en: '3.3.2 — The real-prints tab is now “Real proof”, and screenshots come in by import only. Drop a batch (or a ZIP) and the app proposes the screen for each one, saying how sure it is — high when the file carries the name the plan shows, “to confirm” when it only follows the order you took them in — and nothing is added before you confirm. The capture companion and the guided tab capture were retired; ZIPs they produced still import. In the SE deck, a print you have not approved says so in its caption.',
    'pt-BR': '3.3.2 — A aba de prints reais passa a se chamar “Provas reais”, e os prints entram só por importação. Solte um lote (ou um ZIP) e o app propõe a tela de cada um, dizendo o quanto tem certeza — alta quando o arquivo traz o nome que o roteiro mostra, “a confirmar” quando só segue a ordem em que foram tirados —, e nada entra antes da sua confirmação. O capturador e a captura guiada da aba saíram; os ZIPs que eles geraram continuam sendo importados. No deck SE, um print ainda sem aprovação diz isso na legenda.',
  },
  'help.whatsNew.i49': {
    en: '3.3.2 — Tech Wrapup: “Prepare captures” now covers every section of the deck, cloud, technologies and the executive page included, and you can pick up to two panels per section. Captures stay when you leave the tab or reload; a capture from an earlier read is marked as such, with a button to take it again, instead of disappearing. A readiness strip before the download shows what each section has.',
    'pt-BR': '3.3.2 — Tech Wrapup: “Preparar capturas” passa a cobrir todas as seções do deck, inclusive nuvem, tecnologias e a página executiva, e você escolhe até dois painéis por seção. As capturas ficam quando você sai da aba ou recarrega; uma captura de uma leitura anterior aparece marcada, com um botão para capturar de novo, em vez de sumir. Uma faixa de prontidão antes do download mostra o que cada seção tem.',
  },
} satisfies Record<string, Entry>;
