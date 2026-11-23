import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { it } from 'vitest';

/**
 * The corporate PowerPoint template the Tech Wrapup deck is written into.
 *
 * Brand asset not included in this repository: `ui/assets/techwrapup-brand-template.pptx` is not
 * in this repository. The tests that open the template (the .pptx writer, the deck golden, the
 * prints deck package) run only when the file is present and are skipped otherwise, so the rest
 * of the suite stays green without it. Put your own cleaned template at that path to run them;
 * the golden hashes in `deckFingerprint.test.ts` and the template's pinned SHA-256 in
 * `pptxTemplate.test.ts` will then need re-pinning for your file.
 */
export const TEMPLATE_PATH = join(process.cwd(), 'ui/assets/techwrapup-brand-template.pptx');

export const HAS_TEMPLATE = existsSync(TEMPLATE_PATH);

/** The template's bytes, or an empty array when the file is absent (every user of it is skipped then). */
export const TEMPLATE: Uint8Array = HAS_TEMPLATE ? new Uint8Array(readFileSync(TEMPLATE_PATH)) : new Uint8Array();

/** `it`, skipped when the template is not in the repository. */
export const itWithTemplate: ReturnType<typeof it.skipIf> = it.skipIf(!HAS_TEMPLATE);
