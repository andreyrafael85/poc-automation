/**
 * The batch import's matcher (3.3.2): which planned screen each image of a batch is.
 *
 * The owner retired the capture companion (noVNC, notebook) and kept the import, manual or in a
 * batch "with the intelligence to know which print of the batch is which". Without a manifest
 * there is no certainty to read — only clues — so this proposes, ranks its own confidence
 * honestly, and never decides a tie. Nothing enters the print set until the SE confirms the review.
 *
 * In order:
 * 1. **high** — the file name carries the screen's id (`problem--p-123…`) or its number in the
 *    deck (`03-…`, `03_…`, `03 …`): the SE named it on purpose (the plan offers each screen's
 *    file name to copy).
 * 2. **medium** — the file name's words overlap one screen's words (its title in both languages,
 *    its entity, the Dynatrace app it opens) clearly better than any other screen's.
 * 3. **confirm** — what is left follows the order the images were taken in (a time stamp in the
 *    name, as the operating systems write it, then the file's own time, then the name in natural
 *    order) onto the screens still without a print, in deck order. It is right when the SE walks
 *    the plan top to bottom, which the plan asks for — and it says "to confirm", because it may
 *    not be.
 *
 * Duplicates (same bytes, by SHA-256) are set aside. Pure and synchronous: hashing and decoding
 * happen before, in the caller.
 */

export type MatchConfidence = 'high' | 'medium' | 'confirm';

export interface BatchImage {
  /** Caller's key (stable within the batch). */
  key: string;
  name: string;
  /** `File.lastModified` (ms), or null. */
  lastModified: number | null;
  sha256: string;
  width: number;
  height: number;
}

export interface MatchTarget {
  slotId: string;
  /** 1-based position in the deck order of the screens being captured. */
  position: number;
  /** Words that name the screen: its title (both languages), entity, app, kind. */
  terms: readonly string[];
  /** The screen already has a print: the order fill skips it. */
  hasPrint: boolean;
}

export interface MatchProposal {
  key: string;
  slotId: string | null;
  confidence: MatchConfidence | null;
  /** Why: `id`, `number`, `words`, `order`; `duplicate` / `unplaced` when no screen. */
  reason: 'id' | 'number' | 'words' | 'order' | 'duplicate' | 'unplaced';
  /** The key of the earlier image with the same bytes. */
  duplicateOf: string | null;
  /** Taller than wide by more than a fifth: probably a scrolled page, not a screen. */
  tall: boolean;
  /**
   * The proposed screen already has a print (review 3.3.2 #1). The review then starts this row at
   * "do not import": replacing an approved, masked print is the SE's explicit choice, never a default.
   */
  replaces: boolean;
}

/** Words that say nothing about which screen it is. */
const STOP = new Set([
  'screenshot',
  'screen',
  'shot',
  'captura',
  'tela',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'the',
  'and',
  'for',
  'with',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'image',
  'imagem',
  'print',
  'prints',
  'dynatrace',
  'apps',
  'app',
  'img',
  'copy',
  'copia',
  'pm',
  'am',
  'at',
  'as',
]);

/** Lower case, no accents, alphanumeric runs. */
export function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The meaningful words of a text: ≥ 3 letters, not a number, not a stop word. */
export function wordsOf(text: string): Set<string> {
  const out = new Set<string>();
  for (const word of slug(text).split('-')) {
    if (word.length < 3 || /^\d+$/.test(word) || STOP.has(word)) continue;
    out.add(word);
  }
  return out;
}

/** The name without its folder and extension. */
export function baseName(name: string): string {
  const file = name.split(/[\\/]/).pop() ?? name;
  return file.replace(/\.[a-z0-9]{2,5}$/i, '');
}

/** A leading deck number (`03-…`, `3_…`, `03 …`), never the start of a date (`2026-…`). */
export function leadingNumber(name: string): number | null {
  const base = baseName(name).trim();
  // "16-11-2026 10.22.png" is a date written day first (common in Brazil), not screen 16.
  if (/^\d{1,2}[-_.]\d{1,2}[-_.]\d{2,4}/.test(base)) return null;
  const match = /^(\d{1,2})(?:[\s._)-]|$)/.exec(base);
  if (match === null) return null;
  const n = Number(match[1]);
  return n >= 1 ? n : null;
}

/**
 * The time stamp operating systems and snipping tools write into a screenshot's name, in ms (local
 * clock read as UTC — only the order matters): "Screenshot 2026-11-16 at 10.22.33 PM",
 * "Captura de tela 2026-11-16 102233", "Screenshot_20261116_102233", "Screenshot 2026-11-16 10:22:33".
 */
export function nameTimestamp(name: string): number | null {
  const match = /(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})\D{0,6}?(\d{1,2})[.:_-]?(\d{2})[.:_-]?(\d{2})(?:\s*([ap])\.?m\.?)?/i.exec(baseName(name));
  if (match === null) return null;
  const [, y, mo, d, hRaw, mi, s, half] = match;
  let h = Number(hRaw);
  if (half !== undefined) {
    const pm = half.toLowerCase() === 'p';
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  }
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), h, Number(mi), Number(s));
  return Number.isFinite(ms) && h < 24 && Number(mi) < 60 && Number(s) < 60 ? ms : null;
}

/** Natural order ("2" before "10"). */
const natural = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** The order the images were taken in: name time stamp, then file time, then natural name order. */
export function captureOrder(images: readonly BatchImage[]): BatchImage[] {
  const stamped = images.map((image, index) => ({ image, index, at: nameTimestamp(image.name) ?? image.lastModified }));
  return stamped
    .sort((a, b) => {
      if (a.at !== null && b.at !== null && a.at !== b.at) return a.at - b.at;
      if ((a.at === null) !== (b.at === null)) return a.at === null ? 1 : -1;
      return natural.compare(a.image.name, b.image.name) || a.index - b.index;
    })
    .map((entry) => entry.image);
}

/** A file name that carries a screen id (`problem--p-123`), compared on slugs. */
function carriesId(name: string, slotId: string): boolean {
  const id = slug(slotId);
  return id.length >= 4 && slug(baseName(name)).includes(id);
}

/** Matches a batch onto the screens. Proposals come back in the batch's own order. */
export function matchBatch(images: readonly BatchImage[], targets: readonly MatchTarget[]): MatchProposal[] {
  const proposals = new Map<string, MatchProposal>();
  const taken = new Set<string>();
  const firstBySha = new Map<string, string>();
  const tallOf = (image: BatchImage) => image.height > image.width * 1.2;
  const place = (image: BatchImage, slotId: string | null, confidence: MatchConfidence | null, reason: MatchProposal['reason'], duplicateOf: string | null = null) => {
    const replaces = slotId !== null && (targets.find((target) => target.slotId === slotId)?.hasPrint ?? false);
    proposals.set(image.key, { key: image.key, slotId, confidence, reason, duplicateOf, tall: tallOf(image), replaces });
    if (slotId !== null) taken.add(slotId);
  };

  const live: BatchImage[] = [];
  for (const image of images) {
    const first = firstBySha.get(image.sha256);
    if (first !== undefined) place(image, null, null, 'duplicate', first);
    else {
      firstBySha.set(image.sha256, image.key);
      live.push(image);
    }
  }

  // 1. id, then deck number — only when exactly one image claims the screen.
  const claims = (pick: (image: BatchImage) => MatchTarget | undefined, reason: 'id' | 'number') => {
    const byTarget = new Map<string, BatchImage[]>();
    for (const image of live) {
      if (proposals.has(image.key)) continue;
      const target = pick(image);
      if (target === undefined || taken.has(target.slotId)) continue;
      byTarget.set(target.slotId, [...(byTarget.get(target.slotId) ?? []), image]);
    }
    for (const [slotId, claimants] of byTarget) if (claimants.length === 1) place(claimants[0]!, slotId, 'high', reason);
  };
  claims((image) => {
    const hits = targets.filter((target) => carriesId(image.name, target.slotId));
    return hits.length === 1 ? hits[0] : undefined;
  }, 'id');
  claims((image) => {
    // A name that carries a screen id the plan does not have (an older plan's "03-problem--p-old")
    // names another screen: its number is not trusted (review 3.3.2 #9).
    if (/[a-z0-9]--[a-z0-9]/.test(baseName(image.name).toLowerCase())) return undefined;
    const n = leadingNumber(image.name);
    return n === null ? undefined : targets.find((target) => target.position === n);
  }, 'number');

  // 2. words: a clear best (≥ 2 shared words, and ahead of the runner-up), one image per screen.
  const termWords = new Map(targets.map((target) => [target.slotId, new Set(target.terms.flatMap((term) => [...wordsOf(term)]))]));
  const scored: { image: BatchImage; slotId: string; score: number }[] = [];
  for (const image of live) {
    if (proposals.has(image.key)) continue;
    const words = wordsOf(baseName(image.name));
    if (words.size === 0) continue;
    const ranked = targets
      .filter((target) => !taken.has(target.slotId))
      .map((target) => {
        const own = termWords.get(target.slotId) ?? new Set<string>();
        let score = 0;
        for (const word of words) if (own.has(word)) score += 1;
        return { slotId: target.slotId, score };
      })
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1]?.score ?? 0;
    if (best !== undefined && best.score >= 2 && best.score > second) scored.push({ image, slotId: best.slotId, score: best.score });
  }
  for (const entry of scored.sort((a, b) => b.score - a.score)) {
    if (taken.has(entry.slotId) || proposals.has(entry.image.key)) continue;
    const rivals = scored.filter((other) => other.slotId === entry.slotId && other.image.key !== entry.image.key && other.score === entry.score);
    if (rivals.some((other) => !proposals.has(other.image.key))) continue;
    place(entry.image, entry.slotId, 'medium', 'words');
  }

  // 3. capture order onto the screens still open: first those without a print, in deck order.
  const open = [...targets]
    .filter((target) => !taken.has(target.slotId))
    .sort((a, b) => Number(a.hasPrint) - Number(b.hasPrint) || a.position - b.position);
  const rest = captureOrder(live.filter((image) => !proposals.has(image.key)));
  const withoutPrint = open.filter((target) => !target.hasPrint);
  // Only the screens without a print take the order fill: replacing a kept print is the SE's call.
  rest.forEach((image, index) => {
    const target = withoutPrint[index];
    if (target === undefined) place(image, null, null, 'unplaced');
    else place(image, target.slotId, 'confirm', 'order');
  });

  return images.map((image) => proposals.get(image.key)!);
}

/**
 * The name the plan offers for a screen's screenshot (`03-problem--p-123.png`): its number in the
 * plan, then its id — both of which `matchBatch` reads back with high confidence.
 */
export function suggestedFileName(position: number, slotId: string): string {
  return `${String(position).padStart(2, '0')}-${slotId}.png`;
}
