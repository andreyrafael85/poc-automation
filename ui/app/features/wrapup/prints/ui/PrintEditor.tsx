import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip } from '@dynatrace/strato-components/content';
import { ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import { Modal } from '@dynatrace/strato-components/overlays';
import { Heading, Strong, Text } from '@dynatrace/strato-components/typography';

import { Cluster, Stack } from '../../../../engine';
import { useTranslation } from '../../../../i18n/useTranslation';
import { deckTimeZone } from '../analysis/sourced';
import { initialFocus } from '../capture/record';
import type { PrintPatch, PrintStore } from '../store/usePrintStore';
import type { AnalysisCtx, PrintAsset, PrintPin, Rect, ShotSlot } from '../types';
import { ApprovalPanel, type ApprovalPanelProps } from './ApprovalPanel';
import { FocusPanel, MaskPanel, NumbersPanel, PinPanel, REASON_KEY } from './editor/EditorPanels';
import { EditorStage, type EditorMode, type StageBlock } from './editor/EditorStage';
import {
  acceptAllSuggestions,
  acceptSuggestion,
  addMask,
  addPin,
  baseLegend,
  editablePins,
  freePinSpot,
  ignoreSuggestion,
  KEYBOARD_FOCUS,
  KEYBOARD_MASK,
  movePinTo,
  pinLimit,
  removeMask,
  removePin,
  replaceMask,
  restorePinLabel,
  uiLangOf,
  visiblePins,
  withPinLabel,
} from './editor/edits';
import type { Point } from './editor/geometry';
import { useObjectUrl } from './editor/useObjectUrl';
import { screenNameOf } from './shared';
import type { PinSuggestions } from './usePrintDeckModel';
import './editor/printEditor.css';

/**
 * The print editor: pins, masks and focus (3.2.7, spec §7.2).
 *
 * FINAL PROPS (the tab codes against these):
 * - `show`: whether the editor is open.
 * - `asset`: the print — its record and the unmasked master (the stage draws the masks over it;
 *   only the deck's bake burns them in).
 * - `slot`: the planned screen it stands for; null for a print outside the plan.
 * - `title`: the screen's translated title.
 * - `suggestions`: the app's pins for this print (`seeds`, print-space px, anchor-snapped or the
 *   layout's fallback), the legend line of each pin number, and the screen–Grail checks for the
 *   numbers panel ("Na tela / No Grail / Situação").
 * - `approval`: the approval controls (`ApprovalPanel`), shown inside the editor; null for an
 *   orphan (it is not approved until it is used in a slot).
 * - `onChange(patch)`: the store's `update` — pins, masks, mask suggestions, focus, lupa, identity.
 *   Every change to masks or focus withdraws a standing approval on its own (hash-bound).
 * - `onClose()`: Esc or "Fechar"; edits are saved as they happen.
 *
 * How it works:
 * - Modes Pinos / Tarjas / Foco over one SVG stage in print space (`editor/EditorStage.tsx`);
 *   the geometry and the edits are pure (`editor/geometry.ts`, `editor/edits.ts`) and tested.
 * - Pins: a click adds one (≤ 6, ≤ 4 with the lupa), a drag or the arrows move one (4 px, Shift
 *   20 px) under the 72 px overlap guard, Delete removes it. Each pin's text is a TextArea
 *   (≤ 130 characters, saved as typed, after a short pause); "Restaurar sugestão" drops the SE's
 *   text, "Restaurar os pinos sugeridos" brings back the app's pins.
 * - Masks: a drag draws one (≥ 8×8, solid `MASK_FILL`); the companion's suggestions are dashed,
 *   numbered, with their reason as a Chip (no id inside) and Aceitar / Ignorar / Aceitar todas.
 * - Focus: one region (≤ 520 px wide), the layout's default restorable; "Mostrar detalhe
 *   ampliado" while pins ≤ 4; a preview shows the detail as the slide enlarges it.
 * - Without a pointer: "Adicionar pino" / "Adicionar tarja" (and "Marcar um detalhe" where the
 *   layout suggests none) place one in the middle of the print and give it the focus, so the
 *   arrows move it (Alt+arrows resize a mask or the detail).
 * - Below: the numbers panel (`SimpleTable`), then the tab's own `ApprovalPanel`.
 * - Esc (or a click outside, or "Fechar") saves any pending text and closes.
 */

export interface PrintEditorProps {
  show: boolean;
  asset: PrintAsset;
  slot: ShotSlot | null;
  title: string;
  suggestions: PinSuggestions;
  approval: ApprovalPanelProps | null;
  onChange: (patch: Parameters<PrintStore['update']>[1]) => void;
  onClose: () => void;
}

/** A pin's text is saved this long after the last keystroke (and at once on blur, selection or close). */
const LABEL_SAVE_MS = 400;

interface PendingLabel {
  n: number;
  text: string;
}

export const PrintEditor = ({ show, asset, slot, title, suggestions, approval, onChange, onClose }: PrintEditorProps) => {
  const { t, tCount, locale } = useTranslation();
  const record = asset.record;
  const url = useObjectUrl(asset.master, show);
  const [mode, setMode] = useState<EditorMode>('pins');
  const [selected, setSelected] = useState<number | null>(null);
  // 3.5.5: the pin the next click on the print places (guided placement), or null for the usual add-a-pin click.
  const [placing, setPlacing] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [draft, setDraft] = useState<PendingLabel | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  // A pin, mask or detail added from a panel button takes the keyboard focus on the stage (then the arrows move it).
  const stageBox = useRef<HTMLDivElement | null>(null);
  const [stageFocus, setStageFocus] = useState<string | null>(null);
  useEffect(() => {
    if (stageFocus === null) return;
    setStageFocus(null);
    stageBox.current?.querySelector<SVGElement>(stageFocus)?.focus();
  }, [stageFocus]);

  const seeds = suggestions.seeds;
  const pins = editablePins(record.pins, seeds);
  const visible = visiblePins(pins).sort((a, b) => a.n - b.n);
  const limit = pinLimit(record);

  const numberOf = (pin: PrintPin) => visible.findIndex((item) => item.n === pin.n) + 1;
  const suggestedOf = (pin: PrintPin) => baseLegend(suggestions.legendByPin.get(pin.n), pin.anchorKey, suggestions.crossChecks);
  const labelOf = (pin: PrintPin) => pin.labelOverride ?? suggestedOf(pin);

  // ---- the pin text: typed into a draft, saved after a pause; pending text is never lost
  const latest = useRef({ pins, suggestedOf, onChange });
  latest.current = { pins, suggestedOf, onChange };
  const pending = useRef<PendingLabel | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** The typed text not yet saved, taken out of the queue. */
  const takePending = useCallback((): PendingLabel | null => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const value = pending.current;
    pending.current = null;
    return value;
  }, []);

  /** A pin list with the pending text applied: every pins write goes through here, so a drag never drops a word just typed. */
  const withPending = useCallback(
    (list: PrintPin[]): PrintPin[] => {
      const text = takePending();
      if (text === null) return list;
      const pin = list.find((item) => item.n === text.n);
      return pin === undefined ? list : withPinLabel(list, text.n, text.text, latest.current.suggestedOf(pin));
    },
    [takePending],
  );

  const flushLabel = useCallback(() => {
    if (pending.current === null) return;
    const current = latest.current.pins;
    const next = withPending(current);
    if (JSON.stringify(next) !== JSON.stringify(current)) latest.current.onChange({ pins: next });
  }, [withPending]);

  // Unmounting (the tab closes the editor) saves what was typed.
  useEffect(() => flushLabel, [flushLabel]);

  const commitPins = (list: PrintPin[]) => onChange({ pins: withPending(list) });

  const typeLabel = (n: number, text: string) => {
    setDraft({ n, text });
    pending.current = { n, text };
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(flushLabel, LABEL_SAVE_MS);
  };

  const select = (n: number | null, focusText = false) => {
    if (n !== selected) {
      flushLabel();
      setDraft(null);
    }
    setSelected(n);
    if (focusText && n !== null) setFocusRequest((count) => count + 1);
  };

  const close = () => {
    flushLabel();
    onClose();
  };

  // ---- pins
  const limitText = () =>
    record.lupaOn && record.focus !== null ? t('prt.ed.pins.limitLupa', { max: String(limit) }) : t('prt.ed.pins.limit', { max: String(limit) });

  /** The next pin still at its estimated spot after `n`, in slide order (wrapping), or null when none is left. */
  const nextEstimated = (list: readonly PrintPin[], n: number | null): number | null => {
    const left = list.filter((pin) => pin.hidden !== true && pin.origin === 'template').sort((a, b) => a.n - b.n);
    if (left.length === 0) return null;
    return (left.find((pin) => n === null || pin.n > n) ?? left[0])?.n ?? null;
  };

  /** Guided placement: the pin being placed goes where the SE clicked; the next estimated one is offered after it. */
  const placeAt = (n: number, at: Point): number | null => {
    const result = movePinTo(pins, n, at);
    if (!result.moved) {
      setStatus(result.blocked ? t('prt.ed.pins.overlap') : t('prt.ed.place.same'));
      return null;
    }
    const placed = result.pins.map((pin) => (pin.n === n ? { ...pin, origin: 'manual' as const } : pin));
    commitPins(placed);
    select(n);
    const next = nextEstimated(placed, n);
    setPlacing(next);
    const shown = (pin: number) => String(numberOf(placed.find((item) => item.n === pin) ?? { n: pin, x: 0, y: 0, origin: 'manual' }));
    setStatus(next === null ? t('prt.ed.place.done', { n: shown(n) }) : t('prt.ed.place.next', { n: shown(n), next: shown(next) }));
    return n;
  };

  /** "Está certo aqui": the estimated spot is right — the SE confirms it without moving the pin. */
  const confirmPin = (n: number) => {
    const list = pins.map((pin) => (pin.n === n ? { ...pin, origin: 'manual' as const } : pin));
    commitPins(list);
    if (placing === n) setPlacing(nextEstimated(list, n));
    setStatus(t('prt.ed.place.confirmed', { n: String(numberOf(list.find((pin) => pin.n === n) ?? pins[0] ?? { n, x: 0, y: 0, origin: 'manual' })) }));
  };

  const onAddPin = (at: Point): number | null => {
    if (placing !== null && pins.some((pin) => pin.n === placing)) return placeAt(placing, at);
    const result = addPin(pins, at, limit);
    if (!result.ok) {
      setStatus(result.reason === 'limit' ? limitText() : t('prt.ed.pins.overlap'));
      return null;
    }
    commitPins(result.pins);
    select(result.n);
    setStatus(t('prt.ed.pin.added', { n: String(visible.length + 1) }));
    return result.n;
  };

  /** "Adicionar pino": the free spot nearest the centre; the new pin takes the focus, so the arrows move it. */
  const onAddPinByKeyboard = () => {
    if (visible.length >= limit) {
      setStatus(limitText());
      return;
    }
    const spot = freePinSpot(pins);
    if (spot === null) {
      setStatus(t('prt.ed.pins.overlap'));
      return;
    }
    const n = onAddPin(spot);
    if (n !== null) setStageFocus(`[data-prt-pin="${n}"]`);
  };

  const onRemovePin = (n: number) => {
    const pin = pins.find((item) => item.n === n);
    if (pin === undefined) return;
    const shown = String(numberOf(pin));
    if (draft?.n === n) setDraft(null);
    if (pending.current?.n === n) takePending();
    commitPins(removePin(pins, n));
    if (selected === n) setSelected(null);
    setStatus(t('prt.ed.pin.removed', { n: shown }));
  };

  const onRestoreLabel = (n: number) => {
    if (pending.current?.n === n) takePending();
    setDraft(null);
    commitPins(restorePinLabel(pins, n));
  };

  const onRestoreAll =
    record.pins.length > 0 && seeds.length > 0
      ? () => {
          takePending();
          setDraft(null);
          setSelected(null);
          onChange({ pins: [] });
        }
      : null;

  const onBlocked = (reason: StageBlock) =>
    setStatus(reason === 'overlap' ? t('prt.ed.pins.overlap') : mode === 'focus' ? t('prt.ed.focus.tooSmall') : t('prt.ed.mask.tooSmall'));

  // ---- masks and focus (each change re-binds the approval check: the hashes no longer match)
  const patch = (value: PrintPatch) => onChange(value);
  const suggestedFocus = useMemo(() => initialFocus(record.layout, record.anchors), [record.layout, record.anchors]);

  // ---- the numbers panel reads Grail's window in the screen's own zone
  const ctx = useMemo<AnalysisCtx>(
    () => ({ locale, profile: 'se', t, tCount, timeZone: deckTimeZone([record]), numbers: new Map() }),
    [locale, t, tCount, record],
  );

  const selectedPin = selected === null ? null : (visible.find((pin) => pin.n === selected) ?? null);
  const draftText = selectedPin === null ? '' : draft?.n === selectedPin.n ? draft.text : (labelOf(selectedPin) ?? '');

  // With the lupa on, the slide keeps the first pins only: say so where the pins are edited too.
  const lupaCut = record.lupaOn && record.focus !== null && visible.length > limit;
  const uiLang = uiLangOf(record.warnings);
  const name = screenNameOf(record, t);
  const hint = mode === 'pins' ? t('prt.ed.hint.pins') : mode === 'masks' ? t('prt.ed.hint.masks') : t('prt.ed.hint.focus');

  return (
    <Modal
      show={show}
      onDismiss={close}
      size="large"
      title={t('prt.ed.title')}
      footer={
        <Cluster gap="tight" justify="end" align="center">
          <Text className="pvs-caption">{t('prt.ed.saveNote')}</Text>
          <Button variant="accent" color="primary" onClick={close} data-testid="prt-editor-close">
            {t('prt.tab.close')}
          </Button>
        </Cluster>
      }
    >
      <Stack gap="group">
        <Cluster gap="tight" align="center">
          <Strong>{title}</Strong>
          {record.identity === 'anchor' ? (
            <Chip size="condensed" color="success" className="pvs-prt-chip-wrap">
              {t('prt.gallery.verified', { name })}
            </Chip>
          ) : record.identity === 'se-confirmed' ? (
            <Chip size="condensed">{t('prt.deck.identity.confirmed')}</Chip>
          ) : (
            <Chip size="condensed" color="warning">
              {t('prt.gallery.unverified')}
            </Chip>
          )}
        </Cluster>
        {record.image.partial && <Text className="pvs-caption">{t('prt.ed.partial')}</Text>}
        {uiLang !== null && <Text className="pvs-caption">{t('prt.ed.uiLang', { lang: uiLang })}</Text>}

        <ToggleButtonGroup
          value={mode}
          onChange={(value: string) => {
            setMode(value === 'masks' ? 'masks' : value === 'focus' ? 'focus' : 'pins');
            setStatus('');
          }}
          aria-label={t('prt.ed.modes')}
        >
          <ToggleButtonGroup.Item value="pins">{t('prt.ed.mode.pins')}</ToggleButtonGroup.Item>
          <ToggleButtonGroup.Item value="masks">{t('prt.ed.mode.masks')}</ToggleButtonGroup.Item>
          <ToggleButtonGroup.Item value="focus">{t('prt.ed.mode.focus')}</ToggleButtonGroup.Item>
        </ToggleButtonGroup>
        <Text className="pvs-caption">{hint}</Text>

        <div ref={stageBox}>
          <EditorStage
            mode={mode}
            title={title}
            stageLabel={t('prt.ed.stage', { title })}
            url={url}
            pins={pins}
            selectedPin={selected}
            pinNumber={numberOf}
            pinName={(pin) => t('prt.ed.pinAria', { n: String(numberOf(pin)), label: labelOf(pin) ?? t('prt.ed.pin.noText') })}
            estimatedText={t('prt.ed.estimated')}
            masks={record.masks}
            maskName={(mask, index) => t('prt.ed.mask.aria', { n: String(index + 1), reason: t(REASON_KEY[mask.reason]) })}
            suggestions={record.maskSuggestions}
            focus={record.focus}
            focusName={t('prt.ed.focus.aria')}
            onAddPin={onAddPin}
            onPins={commitPins}
            onSelectPin={(n) => select(n)}
            onEditPin={(n) => select(n, true)}
            onRemovePin={onRemovePin}
            onAddMask={(rect: Rect) => {
              patch(addMask(record, rect));
              setStatus(t('prt.ed.mask.added'));
            }}
            onReplaceMask={(index, rect) => patch(replaceMask(record, index, rect))}
            onRemoveMask={(index) => patch(removeMask(record, index))}
            onFocus={(rect) => patch({ focus: rect })}
            onBlocked={onBlocked}
          />
        </div>
        <Text role="status" aria-live="polite" className="pvs-caption">
          {status}
        </Text>

        <Stack gap="tight">
          <Heading level={6} as="h3">
            {mode === 'pins' ? t('prt.ed.mode.pins') : mode === 'masks' ? t('prt.ed.mode.masks') : t('prt.ed.mode.focus')}
          </Heading>
          {mode === 'pins' && lupaCut && <Text className="pvs-caption">{t('prt.ed.focus.cut', { max: String(limit) })}</Text>}
          {mode === 'pins' && (
            <PinPanel
              pins={visible}
              numberOf={numberOf}
              labelOf={labelOf}
              suggestedOf={suggestedOf}
              selected={selectedPin}
              draftText={draftText}
              focusRequest={focusRequest}
              onAdd={onAddPinByKeyboard}
              placing={placing}
              onPlace={(n) => {
                setPlacing(n);
                select(n);
                setStatus(t('prt.ed.place.now', { n: String(numberOf(pins.find((pin) => pin.n === n) ?? { n, x: 0, y: 0, origin: 'manual' })) }));
              }}
              onConfirm={confirmPin}
              onSelect={(n) => select(n, true)}
              onText={(text) => {
                if (selectedPin !== null) typeLabel(selectedPin.n, text);
              }}
              onTextBlur={flushLabel}
              onRestoreLabel={onRestoreLabel}
              onRemove={onRemovePin}
              onRestoreAll={onRestoreAll}
            />
          )}
          {mode === 'masks' && (
            <MaskPanel
              masks={record.masks}
              suggestions={record.maskSuggestions}
              onAdd={() => {
                patch(addMask(record, KEYBOARD_MASK));
                setStatus(t('prt.ed.mask.added'));
                setStageFocus(`[data-prt-mask="${record.masks.length}"]`);
              }}
              onAccept={(index) => patch(acceptSuggestion(record, index))}
              onIgnore={(index) => patch(ignoreSuggestion(record, index))}
              onAcceptAll={() => patch(acceptAllSuggestions(record))}
              onRemove={(index) => patch(removeMask(record, index))}
            />
          )}
          {mode === 'focus' && (
            <FocusPanel
              focus={record.focus}
              lupaOn={record.lupaOn}
              pinCount={visible.length}
              suggested={suggestedFocus}
              url={url}
              masks={record.masks}
              onRestore={(rect) => patch({ focus: rect })}
              onAdd={() => {
                patch({ focus: KEYBOARD_FOCUS });
                setStageFocus('[data-prt-focus]');
              }}
              onLupa={(on) => patch({ lupaOn: on })}
            />
          )}
        </Stack>

        {suggestions.crossChecks.length > 0 && (
          <Stack gap="tight">
            <Heading level={6} as="h3">
              {t('prt.ed.numbers.title')}
            </Heading>
            <NumbersPanel checks={suggestions.crossChecks} pins={visible} numberOf={numberOf} ctx={ctx} />
          </Stack>
        )}

        <Stack gap="tight">
          <Heading level={6} as="h3">
            {t('prt.ed.approval')}
          </Heading>
          {approval !== null && slot !== null ? <ApprovalPanel {...approval} testIds={false} /> : <Text>{t('prt.ed.orphan')}</Text>}
        </Stack>
      </Stack>
    </Modal>
  );
};
