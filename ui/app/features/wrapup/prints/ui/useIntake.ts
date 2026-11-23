import { useCallback, useRef, useState } from 'react';

import type { Translation } from '../../../../i18n/useTranslation';
import { checkImageFile } from '../capture/intake';
import { cropSuggestionFor } from '../capture/normalize';
import type { PrintStore } from '../store/usePrintStore';
import type { Rect, ShotSlot } from '../types';
import type { CropSuggestion } from './CropDialog';
import { intakeErrorText, titleOf } from './shared';

/**
 * One manual or guided print on its way in (3.2.7, spec §1.3 (a) and (c)): the bytes checked at
 * once (a wrong file is refused before any dialog), the navigation edge detected, the crop dialog,
 * then the store's intake (normalised once to the 1720×1080 master). One flow for the file picker,
 * paste, drop, "Substituir" and a frame of the shared tab.
 */

export interface PendingIntake {
  slot: ShotSlot;
  title: string;
  image: Blob;
  suggestion: CropSuggestion;
  source: 'manual' | 'tab-capture';
  confirmLabel?: string;
  onRetake?: () => void;
}

export interface IntakeFlow {
  pending: PendingIntake | null;
  /** Reading the image (size, navigation edge) before the dialog opens. */
  busy: boolean;
  /** The outcome of the last attempt: a print added, or why it was refused. */
  note: { kind: 'added' | 'error'; text: string } | null;
  start(slot: ShotSlot, image: Blob, source: 'manual' | 'tab-capture', opts?: { confirmLabel?: string; onRetake?: () => void; onDone?: () => void }): Promise<void>;
  confirm(crop: Rect): Promise<void>;
  cancel(): void;
  clearNote(): void;
}

export function useIntake(store: Pick<PrintStore, 'addManual'>, t: Translation['t']): IntakeFlow {
  const [pending, setPending] = useState<PendingIntake | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<IntakeFlow['note']>(null);
  const done = useRef<(() => void) | null>(null);

  const start = useCallback<IntakeFlow['start']>(
    async (slot, image, source, opts = {}) => {
      const title = titleOf(slot, t);
      setNote(null);
      setBusy(true);
      try {
        await checkImageFile(image);
        const suggestion = await cropSuggestionFor(image);
        done.current = opts.onDone ?? null;
        setPending({ slot, title, image, suggestion, source, confirmLabel: opts.confirmLabel, onRetake: opts.onRetake });
      } catch (error) {
        setNote({ kind: 'error', text: intakeErrorText(error, title, t) });
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const confirm = useCallback(
    async (crop: Rect) => {
      const current = pending;
      if (current === null) return;
      setPending(null);
      setBusy(true);
      try {
        await store.addManual(current.slot, current.image, crop, current.source);
        setNote({ kind: 'added', text: t('prt.cap.manual.added', { title: current.title }) });
        done.current?.();
      } catch (error) {
        setNote({ kind: 'error', text: intakeErrorText(error, current.title, t) });
      } finally {
        done.current = null;
        setBusy(false);
      }
    },
    [pending, store, t],
  );

  const cancel = useCallback(() => {
    done.current = null;
    setPending(null);
  }, []);

  const clearNote = useCallback(() => setNote(null), []);

  return { pending, busy, note, start, confirm, cancel, clearNote };
}
