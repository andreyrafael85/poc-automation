import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { DeleteIcon, DownloadIcon, ImageIcon, PrintIcon } from '@dynatrace/strato-icons';

import { MAX_CAPTURES_PER_SECTION } from '../config/persistence';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { Cluster, Panel, Stack } from '../engine';
import {
  CAPTURE_REGISTRY,
  CaptureStage,
  captureOptionsBySection,
  resolveCaptureChoice,
  useCaptureTargets,
  type CaptureOutcome,
} from '../features/wrapup/captures';
import { sameRead, useCaptureStore, type CaptureRead, type StoredCapture, thisVersion } from '../features/wrapup/captureStore';
import { DeckPreview } from '../features/wrapup/DeckPreview';
import { DECK_PRINT_CSS, fileSlug } from '../features/wrapup/deckFiles';
import { useExportProfile } from '../features/wrapup/exportProfile';
import { DTFLOW_FONT_CSS } from '../features/wrapup/fonts';
import { buildTemplateDeck, loadBrandTemplate } from '../features/wrapup/pptxTemplate';
import { buildDeckSpec, type DeckCapture } from '../features/wrapup/spec';
import { useTemplateArt } from '../features/wrapup/templateArt';
import { useExecutiveInput } from '../features/wrapup/useExecutiveInput';
import { useWrapupViewModel } from '../features/wrapup/useWrapupViewModel';
import { useTranslation } from '../i18n/useTranslation';
import { DECK_VALUE_SECTIONS } from '../i18n/v333deck';

/**
 * Tech Wrapup (3.2.4): the Sales Engineer's leave-behind, on the Dynatrace corporate template.
 *
 * One specification (`buildDeckSpec`) decides the slides, their order and every cut; the preview
 * below draws it with the same geometry the PowerPoint writer uses, so what the SE reads here is
 * what the customer opens. The SE can drop sections, photograph the app's own panels onto the
 * slides ("Prepare captures"), download the `.pptx` or print the preview as a 16:9 PDF. The SE
 * Report's export profile decides whether commercial material may appear at all.
 *
 * 3.3.2: the panels come from one registry (`CAPTURE_REGISTRY`), up to two per section by the SE's
 * choice (kept in the private configuration); the pictures are kept with the read they belong to
 * (`captureStore.ts`), so leaving the tab or reloading no longer loses them silently; and a
 * readiness strip before the download says, per section, what the deck will carry.
 */

// The deck's print stylesheet and file-name slug moved to `features/wrapup/deckFiles.ts` (3.2.7),
// shared with the real-prints deck; re-exported here so existing imports keep working.
export { DECK_PRINT_CSS, fileSlug };

type DownloadState =
  | { phase: 'idle' }
  | { phase: 'busy' }
  | { phase: 'ready'; url: string; name: string }
  | { phase: 'failed'; reason: string };

type CaptureNote = { kind: 'done'; count: number; skipped: string[] } | { kind: 'failed' } | { kind: 'none' };

/** Where one chosen panel stands for the read on screen. */
export type CaptureState = 'current' | 'stale' | 'noData' | 'missing';
/** Where a section stands: every chosen panel captured, one to capture, one from another read, or no data at all. */
export type SectionReadiness = 'captured' | 'missing' | 'stale' | 'noData';

/** A section's readiness from its panels': anything left to capture first, then other reads, then done. */
export function sectionReadiness(states: readonly CaptureState[]): SectionReadiness {
  if (states.includes('missing')) return 'missing';
  if (states.includes('stale')) return 'stale';
  if (states.includes('current')) return 'captured';
  return 'noData';
}

const SECTION_OF = new Map(CAPTURE_REGISTRY.map((entry) => [entry.captureId, entry.sectionId]));
const OPTIONS = captureOptionsBySection();
const sectionOf = (captureId: string) => SECTION_OF.get(captureId);

export const TechWrapup = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { t, tCount, locale } = useTranslation();
  const profile = useExportProfile();
  const scope = useQueryScope();
  const { captureChoice, setCaptureChoice } = useStudio();
  const { model, viewModel, excluded, toggleSection } = useWrapupViewModel();
  const { input: executive, loading: executiveLoading } = useExecutiveInput(viewModel.generatedAtLabel);
  const art = useTemplateArt();
  const targets = useCaptureTargets();

  const read = useMemo<CaptureRead>(() => ({ windowEnd: scope.globalWindow.endIso, locale }), [scope.globalWindow.endIso, locale]);
  const store = useCaptureStore({ sectionOf, read });
  const [captureRun, setCaptureRun] = useState<{ key: number; ids: string[]; read: CaptureRead } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [captureNote, setCaptureNote] = useState<CaptureNote | null>(null);
  const [download, setDownload] = useState<DownloadState>({ phase: 'idle' });
  const objectUrl = useRef<string | null>(null);

  // A note about a run belongs to the read it ran on; the pictures themselves stay, marked by read.
  useEffect(() => {
    setCaptureNote(null);
  }, [scope.refreshToken, scope.globalWindow.endIso, locale]);

  // The file's address lives until it is replaced or the page closes. Revoking it at once could
  // cancel the download in some browsers, silently (finding E5).
  useEffect(
    () => () => {
      if (objectUrl.current !== null) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  // ---------------------------------------------------------------- captures, by section
  const included = [...viewModel.technical, ...viewModel.business];
  const titleOf = (id: string) => included.find((section) => section.id === id)?.title ?? id;
  const capturable = included.filter((section) => OPTIONS.has(section.id));
  const chosen = new Map(capturable.map((section) => [section.id, resolveCaptureChoice(section.id, captureChoice)]));

  const byId = useMemo(() => new Map<string, StoredCapture>(store.snapshot.captures.map((entry) => [entry.captureId, entry])), [store.snapshot]);
  const stateOf = useCallback(
    (captureId: string): CaptureState => {
      const stored = byId.get(captureId);
      // 3.3.19: only a picture or a mark of this read *and this app version* counts; a panel can
      // change between versions under the same id, and an old "no data" must not block the new one.
      if (stored !== undefined && sameRead(stored, read) && thisVersion(stored)) return 'current';
      if (store.snapshot.noData.some((mark) => mark.captureId === captureId && sameRead(mark, read) && thisVersion(mark))) return 'noData';
      return stored === undefined ? 'missing' : 'stale';
    },
    [byId, store.snapshot, read],
  );

  // Only pictures of this read go on the slides, in the order the SE chose them.
  const deckCaptures: Record<string, DeckCapture[]> = {};
  for (const [sectionId, ids] of chosen) {
    const pictures = ids.filter((id) => stateOf(id) === 'current').map((id) => (byId.get(id) as StoredCapture).capture);
    if (pictures.length > 0) deckCaptures[sectionId] = pictures;
  }

  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const readiness = capturable.map((section) => {
    const ids = chosen.get(section.id) ?? [];
    const states = ids.map(stateOf);
    const status = sectionReadiness(states);
    // 3.3.19: a panel that had no data is tried again too — data can arrive between reads.
    const toCapture = ids.filter((_, index) => states[index] === 'missing' || states[index] === 'stale' || states[index] === 'noData');
    const times = ids.map((id) => byId.get(id)?.capturedAt).filter((at): at is string => at !== undefined);
    const latest = times.sort().at(-1);
    return { section, status, toCapture, latest };
  });
  const missingIds = readiness.flatMap((row) => row.toCapture);
  const readyCount = readiness.filter((row) => row.status === 'captured' || row.status === 'noData').length;

  const customer = viewModel.customerName.trim();
  const coverTitle = customer !== '' ? `TIP - ${customer} - Tech Wrapup` : t('twt.coverTitle');
  const valueLines = Object.fromEntries(DECK_VALUE_SECTIONS.map((id) => [id, [t(`deck.value.${id}.a`), t(`deck.value.${id}.b`)]]));
  const spec = buildDeckSpec(viewModel, {
    profile,
    captures: deckCaptures,
    executive,
    coverTitle,
    seLabel: t('twt.roleSe'),
    findingsLabel: t('deck.findings'),
    captureLabel: t('deck.capture.label'),
    pinsLabel: t('deck.capture.pins'),
    valueLabel: t('deck.value.label'),
    valueLines,
    agendaTitle: t('twt.agenda.title'),
    watermark: t('profile.watermark'),
  });

  const now = new Date();
  const monthName = now.toLocaleDateString(locale, { month: 'long' });
  const month = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const fileName = `TIP-Tech-Wrapup-Dynatrace-${fileSlug(customer || 'poc')}-${month}-${now.getFullYear()}${profile === 'se' ? '-SE-interno' : ''}.pptx`;

  const downloadPptx = async () => {
    setDownload({ phase: 'busy' });
    try {
      const template = await loadBrandTemplate();
      const blob = await buildTemplateDeck(spec, template, { dtLogo: viewModel.dtLogo, seName: viewModel.seName });
      if (objectUrl.current !== null) URL.revokeObjectURL(objectUrl.current);
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setDownload({ phase: 'ready', url, name: fileName });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setDownload({ phase: 'failed', reason: reason.slice(0, 160) });
    }
  };

  /** Photographs the given panels; with none given, every panel chosen for an included section. */
  const startCaptures = (only?: readonly string[]) => {
    // The stored captures are still being read back: a run now would overwrite them (review 3.3.2 #8).
    if (!store.loaded) return;
    const ids = only ?? [...chosen.values()].flat();
    const run = targets.filter((target) => ids.includes(target.captureId));
    if (run.length === 0) {
      setCaptureNote({ kind: 'none' });
      return;
    }
    setCaptureNote(null);
    setProgress({ done: 0, total: run.length });
    setCaptureRun({ key: Date.now(), ids: run.map((target) => target.captureId), read });
  };
  const finishCaptures = (outcome: CaptureOutcome) => {
    const runRead = captureRun?.read ?? read;
    setCaptureRun(null);
    setProgress(null);
    store.record({ captures: outcome.captures, noData: outcome.noData }, runRead);
    const sectionsOf = (ids: readonly string[]) => [...new Set(ids.map((id) => titleOf(sectionOf(id) ?? id)))];
    setCaptureNote(outcome.failed ? { kind: 'failed' } : { kind: 'done', count: Object.keys(outcome.captures).length, skipped: sectionsOf(outcome.skipped) });
  };
  const running = captureRun !== null;
  const anyStored = store.snapshot.captures.length > 0;

  /** Ticks or unticks one panel of a section: at least one, at most `MAX_CAPTURES_PER_SECTION`, in registry order. */
  const toggleChoice = (sectionId: string, captureId: string) => {
    const current = chosen.get(sectionId) ?? [];
    const next = current.includes(captureId) ? current.filter((id) => id !== captureId) : [...current, captureId];
    if (next.length === 0 || next.length > MAX_CAPTURES_PER_SECTION) return;
    const ordered = (OPTIONS.get(sectionId) ?? []).map((entry) => entry.captureId).filter((id) => next.includes(id));
    // The default alone is no choice at all: the stored document stays clean.
    const isDefault = ordered.length === 1 && ordered[0] === OPTIONS.get(sectionId)?.[0]?.captureId;
    setCaptureChoice(sectionId, isDefault ? [] : ordered);
  };
  const withChoice = capturable.filter((section) => (OPTIONS.get(section.id)?.length ?? 0) > 1);

  return (
    <Stack gap="section">
      <style>{DECK_PRINT_CSS}</style>
      <style>{DTFLOW_FONT_CSS}</style>

      <div data-wrap-hide>
        <Stack gap="tight">
          <Heading level={embedded ? 4 : 2} as={embedded ? 'h2' : 'h1'}>
            {t('deck.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('deck.subtitle')}</Paragraph>
        </Stack>
      </div>

      {readiness.length > 0 && (
        <div data-wrap-hide>
          <Panel pad="roomy" as="section" aria-label={t('deck.ready.title')}>
            <Stack gap="group">
              <Stack gap="tight">
                <Heading level={4} as="h3">
                  {t('deck.ready.title')}
                </Heading>
                <Text className="pvs-caption">
                  {t('deck.ready.summary', { done: String(readyCount), total: String(readiness.length) })}
                  {' · '}
                  {store.persisted ? t('deck.ready.persisted') : t('deck.ready.memoryOnly')}
                </Text>
              </Stack>
              <ul className="pvs-ready-strip" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                {readiness.map(({ section, status, toCapture, latest }) => (
                  <li key={section.id} data-section={section.id} data-readiness={status}>
                    <Cluster gap="group">
                      <Strong>{section.title}</Strong>
                      <Text className="pvs-caption">
                        {status === 'captured' && t('deck.ready.status.captured', { time: latest === undefined ? '—' : timeOf(latest) })}
                        {status === 'stale' && t('deck.ready.status.stale', { time: latest === undefined ? '—' : timeOf(latest) })}
                        {status === 'missing' && t('deck.ready.status.missing')}
                        {status === 'noData' && t('deck.ready.status.noData')}
                      </Text>
                      {toCapture.length > 0 && !running && (
                        <Button variant="default" size="condensed" onClick={() => startCaptures(toCapture)}>
                          {status === 'stale' ? t('deck.captures.again') : status === 'noData' ? t('deck.ready.retry') : t('deck.ready.captureSection')}
                        </Button>
                      )}
                    </Cluster>
                  </li>
                ))}
              </ul>
              <Cluster gap="group">
                {missingIds.length > 0 ? (
                  <Button variant="emphasized" onClick={() => startCaptures(missingIds)} disabled={running || !store.loaded}>
                    <Button.Prefix>
                      <ImageIcon />
                    </Button.Prefix>
                    {t('deck.ready.captureMissing', { count: String(missingIds.length) })}
                  </Button>
                ) : (
                  <Text className="pvs-caption">{t('deck.ready.allSet')}</Text>
                )}
              </Cluster>
            </Stack>
          </Panel>
        </div>
      )}

      <Cluster data-wrap-hide gap="group">
        <Button variant="accent" color="primary" onClick={() => void downloadPptx()} disabled={download.phase === 'busy' || running}>
          <Button.Prefix>
            <DownloadIcon />
          </Button.Prefix>
          {download.phase === 'busy' ? t('deck.download.generating') : t('deck.download.pptx')}
        </Button>
        <Button variant="emphasized" onClick={() => window.print()} disabled={running}>
          <Button.Prefix>
            <PrintIcon />
          </Button.Prefix>
          {t('deck.download.pdf')}
        </Button>
        <Text className="pvs-caption">{t('deck.pdf.howTo')}</Text>
      </Cluster>

      {download.phase === 'ready' && (
        <MessageContainer data-wrap-hide variant="success">
          <MessageContainer.Title>{t('deck.download.ready', { name: download.name })}</MessageContainer.Title>
          <MessageContainer.Description>
            <a href={download.url} download={download.name}>
              {t('deck.download.fallback')}
            </a>
          </MessageContainer.Description>
        </MessageContainer>
      )}
      {download.phase === 'failed' && (
        <MessageContainer data-wrap-hide variant="critical">
          <MessageContainer.Title>{t('deck.download.failed.title')}</MessageContainer.Title>
          <MessageContainer.Description>{t('deck.download.failed.body', { reason: download.reason })}</MessageContainer.Description>
        </MessageContainer>
      )}
      {executiveLoading && (
        <Text data-wrap-hide className="pvs-caption">
          {t('deck.loading')}
        </Text>
      )}

      <div data-wrap-hide className="pvs-deck-controls">
        {(model.technical.length > 0 || model.business.length > 0) && (
          <Panel pad="roomy">
            <Stack gap="group">
              <Stack gap="tight">
                <Heading level={4} as="h3">
                  {t('deck.sections.title')}
                </Heading>
                <Paragraph className="pvs-prose">{t('deck.sections.body')}</Paragraph>
              </Stack>
              <Cluster gap="group">
                {[...model.technical, ...model.business].map((section) => (
                  <Checkbox key={section.id} value={!excluded.has(section.id)} onChange={() => toggleSection(section.id)} disabled={running}>
                    <Text>{section.title}</Text>
                  </Checkbox>
                ))}
              </Cluster>
            </Stack>
          </Panel>
        )}

        <Panel pad="roomy">
          <Stack gap="group">
            <Stack gap="tight">
              <Heading level={4} as="h3">
                {t('deck.captures.title')}
              </Heading>
              <Paragraph className="pvs-prose">{t('deck.captures.body')}</Paragraph>
            </Stack>
            <Cluster gap="group">
              <Button variant="emphasized" onClick={() => startCaptures()} disabled={running || !store.loaded}>
                <Button.Prefix>
                  <ImageIcon />
                </Button.Prefix>
                {anyStored ? t('deck.captures.again') : t('deck.captures.run')}
              </Button>
              {anyStored && !running && (
                <Button
                  variant="default"
                  onClick={() => {
                    store.clear();
                    setCaptureNote(null);
                  }}
                >
                  <Button.Prefix>
                    <DeleteIcon />
                  </Button.Prefix>
                  {t('deck.captures.clear')}
                </Button>
              )}
              {progress !== null && (
                <Text role="status" className="pvs-caption">
                  {t('deck.captures.progress', { done: String(progress.done), total: String(progress.total) })}
                </Text>
              )}
            </Cluster>
            {captureNote?.kind === 'done' && (
              <Stack gap="tight">
                <Text>{tCount('deck.captures.done', captureNote.count, { count: String(captureNote.count) })}</Text>
                {captureNote.skipped.length > 0 && <Text className="pvs-caption">{t('deck.captures.skipped', { sections: captureNote.skipped.join(', ') })}</Text>}
              </Stack>
            )}
            {captureNote?.kind === 'failed' && <Text className="pvs-caption">{t('deck.captures.failed')}</Text>}
            {captureNote?.kind === 'none' && <Text className="pvs-caption">{t('deck.captures.none')}</Text>}

            {withChoice.length > 0 && (
              <Stack gap="group">
                <Stack gap="tight">
                  <Heading level={5} as="h4">
                    {t('deck.choice.title')}
                  </Heading>
                  <Paragraph className="pvs-caption">{t('deck.choice.body')}</Paragraph>
                </Stack>
                {withChoice.map((section) => {
                  const picked = chosen.get(section.id) ?? [];
                  return (
                    <div key={section.id} role="group" aria-label={t('deck.choice.aria', { section: section.title })} data-choice={section.id}>
                      <Cluster gap="group">
                        <Text className="pvs-label">{section.title}</Text>
                        {(OPTIONS.get(section.id) ?? []).map((entry) => {
                          const on = picked.includes(entry.captureId);
                          // Never disabled for the rules (a disabled label is greyed below AA contrast): `toggleChoice`
                          // keeps at least one and at most two panels, and the hint above says so.
                          return (
                            <Checkbox
                              key={entry.captureId}
                              data-testid={`cap-opt-${entry.captureId}`}
                              value={on}
                              onChange={() => toggleChoice(section.id, entry.captureId)}
                              disabled={running}
                            >
                              <Text>{t(entry.label)}</Text>
                            </Checkbox>
                          );
                        })}
                      </Cluster>
                    </div>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Panel>
      </div>

      <Stack gap="group">
        <Stack data-wrap-hide gap="tight">
          <Heading level={4} as="h3">
            {t('deck.preview.title', { count: String(spec.slides.length) })}
          </Heading>
          <Paragraph className="pvs-prose">{t('deck.preview.body')}</Paragraph>
        </Stack>
        <DeckPreview
          spec={spec}
          art={art}
          dtLogo={viewModel.dtLogo}
          slideLabel={(n, total, title) => t('deck.slideLabel', { n: String(n), total: String(total), title })}
        />
      </Stack>

      {captureRun !== null && (
        <CaptureStage
          key={captureRun.key}
          targets={targets.filter((target) => captureRun.ids.includes(target.captureId))}
          onProgress={(done, total) => setProgress({ done, total })}
          onDone={finishCaptures}
        />
      )}
    </Stack>
  );
};
