import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Modal } from '@dynatrace/strato-components/overlays';
import { Heading, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';

import { Cluster, Stack } from '../../../../engine';
import type { StringKey } from '../../../../i18n/strings';
import { useTranslation } from '../../../../i18n/useTranslation';
import { clampCrop, planNormalization, type NormalizationPlan } from '../capture/normalize';
import type { Rect } from '../types';
import { CropResult, CropStage } from './editor/CropStage';
import type { CropEdge } from './editor/geometry';
import { useObjectUrl } from './editor/useObjectUrl';
import './editor/printEditor.css';

/**
 * The crop dialog of a manual or guided print (3.2.7, spec §7.2 "Manual and guided intake").
 *
 * FINAL PROPS (the tab codes against these):
 * - `show`: whether the dialog is open.
 * - `image`: the picture as it arrived (picked, pasted, dropped, or one frame of the shared tab).
 * - `suggestion`: `cropSuggestionFor(image)` — the image's natural size, the platform navigation's
 *   detected right edge (null when none was found) and the suggested crop, all in the image's own
 *   pixels.
 * - `title`: the translated title of the screen the print is for.
 * - `confirmLabel`: the confirm button's text (default "Usar este recorte"; guided capture passes
 *   "Manter").
 * - `onConfirm(crop)`: the crop chosen, in the image's own pixels (the store normalises it to 1720×1080).
 * - `onCancel()`: closed without a print.
 * - `onRetake`: guided capture only — "Refazer": discard this frame and grab another.
 * - `note` (optional, added by WP7b): a warning above the picture — the tab passes
 *   `t('prt.cap.manual.replaces')` when the screen already has a print that this one replaces.
 *
 * The SE drags the four edges of the crop (or moves them with the keyboard: each edge is a
 * slider); the left one starts where the platform's navigation ends. Below, the 1720×1080 print
 * the crop becomes, by the same plan the intake applies — fit to the width (cut or padded at the
 * bottom) or, far from the print's shape, letterboxed with the pins' suggested positions off.
 */

export interface CropSuggestion {
  width: number;
  height: number;
  edge: number | null;
  crop: Rect;
}

export interface CropDialogProps {
  show: boolean;
  image: Blob;
  suggestion: CropSuggestion;
  title: string;
  confirmLabel?: string;
  onConfirm: (crop: Rect) => void;
  onCancel: () => void;
  onRetake?: () => void;
  note?: string;
}

const EDGE_KEY: Readonly<Record<CropEdge, StringKey>> = {
  left: 'prt.crop.edge.left',
  right: 'prt.crop.edge.right',
  top: 'prt.crop.edge.top',
  bottom: 'prt.crop.edge.bottom',
};

/** How the crop becomes the print, as the line under the preview. */
export function fitKey(plan: Pick<NormalizationPlan, 'normalization' | 'padBottom' | 'source'>, crop: Rect): StringKey {
  if (plan.normalization === 'contain') return 'prt.crop.fit.contain';
  if (plan.padBottom) return 'prt.crop.fit.pad';
  if (plan.source.h < crop.h) return 'prt.crop.fit.cut';
  return 'prt.crop.fit.resized';
}

export const CropDialog = ({ show, image, suggestion, title, confirmLabel, onConfirm, onCancel, onRetake, note }: CropDialogProps) => {
  const { t, formatCount } = useTranslation();
  const url = useObjectUrl(image, show);
  const size = useMemo(() => ({ width: Math.max(1, Math.round(suggestion.width)), height: Math.max(1, Math.round(suggestion.height)) }), [suggestion.width, suggestion.height]);
  const suggested = useMemo(() => clampCrop(size.width, size.height, suggestion.crop), [size, suggestion.crop]);
  const [crop, setCrop] = useState<Rect>(suggested);

  // A new picture (another file, or "Refazer") starts again from its own suggestion.
  useEffect(() => setCrop(suggested), [suggested]);

  const plan = planNormalization(size.width, size.height, crop);
  const changed = crop.x !== suggested.x || crop.y !== suggested.y || crop.w !== suggested.w || crop.h !== suggested.h;
  const px = (value: number) => formatCount(Math.round(value));

  return (
    <Modal
      show={show}
      onDismiss={onCancel}
      size="large"
      title={t('prt.crop.title')}
      footer={
        <Cluster gap="tight" justify="end">
          <Button variant="default" onClick={onCancel}>
            {t('prt.tab.cancel')}
          </Button>
          {onRetake !== undefined && (
            <Button variant="default" onClick={onRetake}>
              {t('prt.cap.guided.retake')}
            </Button>
          )}
          <Button variant="accent" color="primary" onClick={() => onConfirm(crop)}>
            {confirmLabel ?? t('prt.crop.confirm')}
          </Button>
        </Cluster>
      }
    >
      <Stack gap="group">
        <Strong>{title}</Strong>
        {note !== undefined && note !== '' && (
          <MessageContainer variant="warning">
            <MessageContainer.Description>{note}</MessageContainer.Description>
          </MessageContainer>
        )}
        <Paragraph className="pvs-prose">{t('prt.crop.hint')}</Paragraph>
        <Text className="pvs-caption">
          {suggestion.edge !== null ? t('prt.crop.detected', { x: px(suggestion.edge) }) : t('prt.crop.fallback', { x: px(suggested.x) })}
        </Text>

        <CropStage
          url={url}
          title={title}
          stageLabel={t('prt.crop.stage', { title })}
          size={size}
          crop={crop}
          onCrop={setCrop}
          edgeLabel={(edge) => t(EDGE_KEY[edge])}
          valueText={(value) => t('prt.crop.px', { value: px(value) })}
        />
        <Cluster gap="tight" align="center">
          <Text className="pvs-caption">
            {t('prt.crop.size', { w: px(crop.w), h: px(crop.h), width: px(size.width), height: px(size.height) })} · {t('prt.crop.keys')}
          </Text>
          {changed && (
            <Button size="condensed" variant="default" onClick={() => setCrop(suggested)}>
              {t('prt.ed.restore')}
            </Button>
          )}
        </Cluster>

        <Stack gap="tight">
          <Heading level={6} as="h3">
            {t('prt.crop.result')}
          </Heading>
          <CropResult url={url} size={size} plan={plan} label={t('prt.crop.result')} />
          <Text className="pvs-caption" data-prt-crop-fit={plan.normalization}>
            {t(fitKey(plan, crop))}
          </Text>
        </Stack>
      </Stack>
    </Modal>
  );
};
