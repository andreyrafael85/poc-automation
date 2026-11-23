import { useEffect, useMemo, useRef, useState } from 'react';

import type { Translation } from '../../../../i18n/useTranslation';
import type { DeckProfile, DeckSpec } from '../../spec';
import { detectAnomalies } from '../analysis/anomalies';
import { buildCrossLinks } from '../analysis/crossLinks';
import { methodologyFor, methodologyGaps } from '../analysis/methodology';
import { analysisFor, customerSafe } from '../analysis/narrative';
import { pinsFor, placePins } from '../analysis/pins';
import { deckTimeZone, formatDayTime } from '../analysis/sourced';
import { storyFor } from '../analysis/story';
import { BakeCache, bakeAll, canonicalMasks, type BakeInput } from '../capture/bake';
import { PRINT_SPACE } from '../constants';
import { buildPrintDeckSpec, citedQueryIds, planPrintDeck, printDeckLabels, type PrintDeckShot } from '../deck/buildPrintDeckSpec';
import type { PrintImage } from '../deck/slides';
import { useEvidencePacks } from '../evidence/useEvidencePacks';
import { LAYOUTS } from '../plan/pinTemplates';
import type { AnalysisCtx, CrossCheck, EvidenceBundle, EvidencePack, ExecutedQuery, LinkEvidenceLevel, PrintAsset, PrintPin, PrintRecord, ShotPlan, ShotSlot } from '../types';
import { VIA_KEY, fallbackHeadlineOf, identityOk, isDeckPrint, titleOf, viewerTimeZone, whatOf, type Approvals } from './shared';
import type { PrintDeckIdentity } from './usePrintDeckIdentity';

/**
 * The real-prints deck as the tab shows and downloads it (3.2.7, spec §2.1, §5.3, §7.3).
 *
 * For every ticked screen of the plan that has a usable print: the evidence read over the same
 * entity and window (`useEvidencePacks`), the anomalies, the analysis and its customer-safe cut,
 * the pins and their legend, and the print's image BAKED — masks burned in; the master never
 * reaches the deck. Then the story and the methodology, and `buildPrintDeckSpec` for the active
 * export profile. Cross-link numbers follow that profile's own numbering (the Customer deck
 * reflows when an unapproved print turns into "Prova por DQL").
 *
 * The Customer deck keeps a print only when it is approved — the approval recomputed against the
 * image, masks and focus as they are now — and its screen identity holds (found on screen, or
 * confirmed by the SE; a forced probe-only address needs the on-screen check). A print whose
 * screen was not reached, or whose bytes no longer match, enters no deck at all.
 */

export interface DeckAssemblyInput {
  plan: ShotPlan;
  /** The usable print of each slot, by slot id. */
  records: ReadonlyMap<string, PrintRecord>;
  /** The baked image of each print, by print id (only images baked for the print as it is now). */
  images: ReadonlyMap<string, PrintImage>;
  approvals: Approvals;
  bundle: EvidenceBundle;
  executed: readonly ExecutedQuery[];
  profile: DeckProfile;
  translation: Pick<Translation, 't' | 'tCount' | 'locale'>;
  identity: Pick<PrintDeckIdentity, 'cover' | 'customerGeneratedAtLabel' | 'coverTitle' | 'seLabel' | 'watermark'>;
  /** The zone used when no kept print recorded one (tests pass 'UTC'). */
  viewerZone?: string;
  /** 3.5.5: the methodology and DQL appendix ("Incluir apêndice técnico"), off by default. */
  includeAppendix?: boolean;
}

export interface DeckAssembly {
  shots: PrintDeckShot[];
  spec: DeckSpec;
  /** The analysis context of this profile (the editor's pins and numbers use it too). */
  ctx: AnalysisCtx;
  /** The print slides' shot ids that enter this profile's deck with pixels, in deck order. */
  keptWithPrint: string[];
}

/** The slots of the deck: ticked, with a screen, in deck order. */
export const deckSlots = (plan: ShotPlan): ShotSlot[] => plan.slots.filter((slot) => slot.included && slot.chosen !== null);

const fraction = (rect: { x: number; y: number; w: number; h: number }) => ({
  x: rect.x / PRINT_SPACE.width,
  y: rect.y / PRINT_SPACE.height,
  w: rect.w / PRINT_SPACE.width,
  h: rect.h / PRINT_SPACE.height,
});

/**
 * The caption under a print: app, when, how, identity, link level and the screen's zone. The link
 * level is the slot's as it stands now (a capture or probe on this tenant lifts an observed address
 * to verified), not the level frozen into the print when it was taken.
 */
function captionOf(record: PrintRecord, evidence: LinkEvidenceLevel, t: Translation['t'], locale: Translation['locale'], zone: string): string {
  const identity =
    record.identity === 'anchor' ? t('prt.deck.identity.anchor') : record.identity === 'se-confirmed' ? t('prt.deck.identity.confirmed') : t('prt.gallery.unverified');
  return t('prt.deck.caption', {
    app: t(LAYOUTS[record.layout].appLabelKey),
    at: formatDayTime(record.capturedAtIso, locale, record.captureTimeZone ?? zone),
    via: t(VIA_KEY[record.source]),
    identity,
    evidence: t(`prt.ev.${evidence}`),
    zoneNote: record.captureTimeZone === null ? t('prt.deck.zoneUnknown') : t('prt.deck.zone', { zone: record.captureTimeZone }),
  });
}

/**
 * Whether a print may show its pixels in this profile's deck at all (§5.7). The SE deck keeps a
 * companion print that reached its screen, and a manual or guided one only once the SE confirmed
 * the screen ("Esta é a tela de {nome}"): nothing proved which screen it is. The Customer deck's
 * own rule (approved, identity holding) is applied by the deck writer; an unconfirmed print there is
 * never approved, so its analysis stays as "Prova por DQL".
 */
export function showsPixels(record: Pick<PrintRecord, 'source' | 'identity'>, profile: DeckProfile): boolean {
  return profile !== 'se' || record.source === 'companion' || record.identity !== 'none';
}

/** Pure: the shots, the story, the methodology and the spec of one profile. */
export function assembleDeck(input: DeckAssemblyInput): DeckAssembly {
  const { plan, records, images, approvals, bundle, executed, profile, translation, identity } = input;
  const { t, tCount, locale } = translation;
  const slots = deckSlots(plan);

  // The deck zone: the most common capture zone of the prints that can stand in this profile.
  const candidates = slots.flatMap((slot) => {
    const record = records.get(slot.id);
    if (record === undefined) return [];
    return profile === 'se' ? (showsPixels(record, profile) ? [record] : []) : approvals.isApproved(record) && identityOk(record, slot) ? [record] : [];
  });
  const timeZone = deckTimeZone(candidates, input.viewerZone);
  const contextFor = (): AnalysisCtx => ({ locale, profile, t, tCount, timeZone, numbers: new Map() });

  const packOf = (slot: ShotSlot): EvidencePack | null => bundle[slot.id] ?? null;

  const shotFor = (slot: ShotSlot, ctx: AnalysisCtx, links: Parameters<typeof analysisFor>[3]): PrintDeckShot => {
    const pack = packOf(slot);
    const record = records.get(slot.id) ?? null;
    const anomalies = pack === null ? [] : detectAnomalies(pack, ctx, slot);
    const analysis = pack === null ? null : analysisFor(slot, pack, anomalies, links, ctx, plan.incident);
    const title = titleOf(slot, t);
    const image = record === null ? undefined : images.get(record.id);
    let print: PrintDeckShot['print'] = null;
    if (record !== null && image !== undefined && showsPixels(record, profile)) {
      const pinned = pinsFor(record, slot, pack, ctx, LAYOUTS[record.layout]);
      print = {
        image,
        pins: pinned.pins,
        legend: pinned.legend,
        notes: pinned.notes,
        focus: record.focus === null ? null : fraction(record.focus),
        lupaOn: record.lupaOn,
        caption: captionOf(record, slot.chosen?.evidence ?? record.linkEvidence, t, locale, timeZone),
        alt: t('prt.deck.alt', { title }),
        approved: approvals.isApproved(record),
        identityOk: identityOk(record, slot),
      };
    }
    return {
      slot: { id: slot.id, kind: slot.kind, order: slot.order },
      title,
      headline: analysis?.headline ?? fallbackHeadlineOf(slot.kind, t),
      what: whatOf(slot.kind, t),
      why: slot.chosen === null ? '' : t(slot.chosen.why.key, slot.chosen.why.params),
      print,
      analysis,
      analysisCustomerSafe: analysis === null ? null : customerSafe(analysis),
    };
  };

  // Pass 1 decides which shots enter and their numbers; pass 2 cites the links over that numbering.
  const first = slots.map((slot) => shotFor(slot, contextFor(), []));
  const present = planPrintDeck(first, profile).map((entry) => entry.shot.slot.id);
  const ctx = contextFor();
  const links = buildCrossLinks(bundle, present, plan, ctx);
  const shots = slots.map((slot) => shotFor(slot, ctx, links));

  const planned = planPrintDeck(shots, profile);
  const keptWithPrint = planned.filter((entry) => entry.mode === 'with-print').map((entry) => entry.shot.slot.id);
  const keptPrints = keptWithPrint.map((id) => records.get(id)).filter((record): record is PrintRecord => record !== undefined);
  const story = storyFor(bundle, plan, keptWithPrint, ctx);
  const methodology = methodologyFor(executed, keptPrints, methodologyGaps(plan, bundle), ctx, { tenantHost: plan.tenantHost, cited: citedQueryIds(shots, profile) });

  const spec = buildPrintDeckSpec({
    profile,
    identity: identity.cover,
    customerGeneratedAtLabel: identity.customerGeneratedAtLabel,
    coverTitle: identity.coverTitle,
    seLabel: identity.seLabel,
    watermark: identity.watermark,
    shots,
    story,
    methodology,
    labels: printDeckLabels(t),
    includeAppendix: input.includeAppendix === true,
  });
  return { shots, spec, ctx, keptWithPrint };
}

/** True when the spec is only the frame (cover, agenda, end): the tab says why instead of offering a file. */
export function isFrameOnly(spec: DeckSpec): boolean {
  return spec.slides.every((slide) => slide.kind === 'cover' || slide.kind === 'agenda' || slide.kind === 'end');
}

/** The editor's starting point for a print: the suggested pins (print px), the legend of each, and the screen–Grail checks. */
export interface PinSuggestions {
  seeds: PrintPin[];
  legendByPin: ReadonlyMap<number, string>;
  crossChecks: CrossCheck[];
}

export function pinSuggestionsFor(record: PrintRecord, slot: ShotSlot | null, pack: EvidencePack | null, ctx: AnalysisCtx): PinSuggestions {
  if (slot === null) return { seeds: [], legendByPin: new Map(), crossChecks: [] };
  const layout = LAYOUTS[record.layout];
  const seeds = placePins({ ...record, pins: [] }, slot, pack, ctx, layout);
  // With the seeds as the record's own pins (none hidden, no lupa) the legend comes back in seed order, one line each.
  const sorted = [...seeds].sort((a, b) => a.n - b.n);
  const pinned = pinsFor({ ...record, pins: sorted, lupaOn: false }, slot, pack, ctx, layout);
  const legendByPin = new Map<number, string>();
  sorted.forEach((pin, index) => {
    const line = pinned.legend[index];
    if (line !== undefined) legendByPin.set(pin.n, line);
  });
  const own = pinsFor(record, slot, pack, ctx, layout);
  return { seeds, legendByPin, crossChecks: own.crossChecks };
}

// ------------------------------------------------------------------ the hook

export interface PrintDeckModel {
  spec: DeckSpec;
  /** Cover and end only (no print yet): `prt.deck.empty` instead of the download. */
  frameOnly: boolean;
  /** Evidence still being read (the analysis slides fill in as it arrives). */
  evidenceLoading: boolean;
  /**
   * Images still being baked, or a print of the deck still without its image: the preview and the
   * file would miss it, so the tab offers neither the download nor the PDF until it is in.
   */
  baking: boolean;
  /** Titles of prints whose image could not be prepared (they stay out of the deck). */
  bakeFailures: string[];
  bundle: EvidenceBundle;
  ctx: AnalysisCtx;
  /** Prints that can stand in a deck but not in the Customer one (not approved, or the screen not verified). */
  droppedForCustomer: number;
}

interface Baked {
  key: string;
  image: PrintImage;
}

/** A print whose image could not be prepared, for the bake key it was tried with. */
interface BakeFailure {
  id: string;
  key: string;
  title: string;
}

/** What a print's baked image depends on: its master and its masks. */
const bakeKeyOf = (record: PrintRecord) => `${record.image.sha256}|${canonicalMasks(record.masks)}`;

export function usePrintDeckModel(args: {
  plan: ShotPlan;
  /** The working set, by print id. */
  assets: ReadonlyMap<string, PrintAsset>;
  approvals: Approvals;
  profile: DeckProfile;
  identity: PrintDeckIdentity;
  translation: Pick<Translation, 't' | 'tCount' | 'locale'>;
  /** 3.5.5: the methodology and DQL appendix, off by default. */
  includeAppendix?: boolean;
}): PrintDeckModel {
  const { plan, assets, approvals, profile, identity, translation } = args;
  const includeAppendix = args.includeAppendix === true;

  // Every print by its slot (the evidence engine reads by slot); the deck's own records are the usable ones.
  const bySlot = useMemo(() => new Map([...assets.values()].map((asset) => [asset.record.slotId, asset.record])), [assets]);
  const { bundle, executed, loading } = useEvidencePacks(plan, bySlot);

  const deckRecords = useMemo(() => {
    const out = new Map<string, PrintRecord>();
    for (const slot of deckSlots(plan)) {
      const record = bySlot.get(slot.id);
      if (record !== undefined && isDeckPrint(record)) out.set(slot.id, record);
    }
    return out;
  }, [plan, bySlot]);

  // ---------------------------------------------------------------- bake (masks burned in), one cache per tab
  const cache = useRef<BakeCache | null>(null);
  if (cache.current === null) cache.current = new BakeCache(12);
  const [baked, setBaked] = useState<ReadonlyMap<string, Baked>>(new Map());
  const [baking, setBaking] = useState(false);
  const [failures, setFailures] = useState<readonly BakeFailure[]>([]);
  const toBake = [...deckRecords.values()];
  const bakeSignature = toBake.map((record) => `${record.id}:${bakeKeyOf(record)}`).join('\n');
  const latest = useRef({ toBake, assets, t: translation.t });
  latest.current = { toBake, assets, t: translation.t };

  useEffect(() => {
    let alive = true;
    const { toBake: records, assets: working, t } = latest.current;
    const jobs = records.flatMap((record) => {
      const asset = working.get(record.id);
      return asset === undefined ? [] : [{ record, input: { key: bakeKeyOf(record), master: asset.master, masks: record.masks } satisfies BakeInput }];
    });
    if (jobs.length === 0) {
      setBaked(new Map());
      setFailures([]);
      setBaking(false);
      return;
    }
    setBaking(true);
    const bakeCache = cache.current ?? new BakeCache(12);
    const toImage = (result: Awaited<ReturnType<typeof bakeAll>>[number]['result']): PrintImage => ({
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height,
      mediaKey: result.sha256,
    });
    void (async () => {
      const next = new Map<string, Baked>();
      const failed: BakeFailure[] = [];
      try {
        const results = await bakeAll(
          jobs.map((job) => job.input),
          bakeCache,
        );
        results.forEach(({ result }, index) => {
          const job = jobs[index];
          if (job !== undefined) next.set(job.record.id, { key: job.input.key, image: toImage(result) });
        });
      } catch {
        // One image failed: bake them one by one, so the others still make it to the deck.
        for (const job of jobs) {
          try {
            next.set(job.record.id, { key: job.input.key, image: toImage(await bakeCache.get(job.input, 'q82')) });
          } catch {
            failed.push({ id: job.record.id, key: job.input.key, title: t(job.record.titleText.key, job.record.titleText.params) });
          }
        }
      }
      if (!alive) return;
      setBaked(next);
      setFailures(failed);
      setBaking(false);
    })();
    return () => {
      alive = false;
    };
  }, [bakeSignature]);

  // Only an image baked from the print as it is now (masks included) may be used.
  const images = useMemo(() => {
    const out = new Map<string, PrintImage>();
    for (const record of deckRecords.values()) {
      const entry = baked.get(record.id);
      if (entry !== undefined && entry.key === bakeKeyOf(record)) out.set(record.id, entry.image);
    }
    return out;
  }, [baked, deckRecords]);

  // The failures of the prints as they are now; any other print without its image is still on its way
  // (the bake starts after the render that added or changed it), so the deck is not complete yet.
  const currentFailures = useMemo(
    () => failures.filter((failure) => [...deckRecords.values()].some((record) => record.id === failure.id && bakeKeyOf(record) === failure.key)),
    [failures, deckRecords],
  );
  const imagesPending = useMemo(
    () => [...deckRecords.values()].some((record) => !images.has(record.id) && !currentFailures.some((failure) => failure.id === record.id)),
    [deckRecords, images, currentFailures],
  );

  const viewerZone = useMemo(viewerTimeZone, []);
  const assembly = useMemo(
    () =>
      assembleDeck({
        plan,
        records: deckRecords,
        images,
        approvals,
        bundle,
        executed,
        profile,
        translation,
        identity,
        viewerZone,
        includeAppendix,
      }),
    [plan, deckRecords, images, approvals, bundle, executed, profile, translation, identity, viewerZone, includeAppendix],
  );

  const droppedForCustomer = useMemo(() => {
    let count = 0;
    for (const slot of deckSlots(plan)) {
      const record = deckRecords.get(slot.id);
      if (record !== undefined && !(approvals.isApproved(record) && identityOk(record, slot))) count += 1;
    }
    return count;
  }, [plan, deckRecords, approvals]);

  return {
    spec: assembly.spec,
    frameOnly: isFrameOnly(assembly.spec),
    evidenceLoading: loading,
    baking: baking || imagesPending,
    bakeFailures: currentFailures.map((failure) => failure.title),
    bundle,
    ctx: assembly.ctx,
    droppedForCustomer,
  };
}
