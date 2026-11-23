import React, { useRef, useState } from 'react';

import { PRINT_SPACE } from '../../constants';
import type { NormalizationPlan } from '../../capture/normalize';
import type { Rect } from '../../types';
import { CROP_EDGES, cropEdgeKey, cropEdgeRange, cropEdgeValue, screenToViewBox, withCropEdge, type CropEdge, type Size } from './geometry';
import { minTargetUnits, useDisplayScale } from './useDisplayScale';

/**
 * The crop dialog's picture (3.2.7, spec §7.2 "Manual and guided intake"): the image as it arrived,
 * in its own pixels (`viewBox = 0 0 width height`), with everything outside the crop shaded and
 * the crop's four edges as handles. Each edge is a `<g role="slider" tabIndex={0}>` with its own
 * focus outline — a drag moves it, and so do the arrows (Shift: faster) and Home / End. The left
 * edge starts where the platform's navigation ends (`detectNavEdge`, else 200/1920 of the width).
 *
 * `CropResult` draws what the crop becomes: the 1720×1080 print, by the same plan the intake
 * applies (`planNormalization`), so the SE sees the margins or the cut before confirming.
 */

export interface CropStageProps {
  url: string | null;
  /** The image's alt text. */
  title: string;
  stageLabel: string;
  size: Size;
  crop: Rect;
  onCrop: (crop: Rect) => void;
  edgeLabel: (edge: CropEdge) => string;
  valueText: (px: number) => string;
}

export const CropStage = ({ url, title, stageLabel, size, crop, onCrop, edgeLabel, valueText }: CropStageProps) => {
  const svg = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<CropEdge | null>(null);
  const { width: W, height: H } = size;
  // Handle sizes in image pixels, so they look the same on a 1280 px snip and on a 4K screenshot —
  // and never smaller on screen than a touch target (24 px to grab, a grip of 8 × 32 px to see).
  const scale = useDisplayScale(svg, W, H);
  const unit = Math.max(W, H) / 100;
  const hit = minTargetUnits(24, scale, unit * 3);
  const gripLong = minTargetUnits(32, scale, unit * 7);
  const gripShort = minTargetUnits(8, scale, unit * 1.6);

  const moveTo = (edge: CropEdge, clientX: number, clientY: number) => {
    const at = screenToViewBox(svg.current, clientX, clientY, size);
    if (at === null) return;
    const next = withCropEdge(crop, edge, edge === 'left' || edge === 'right' ? at.x : at.y, size);
    if (next.x !== crop.x || next.y !== crop.y || next.w !== crop.w || next.h !== crop.h) onCrop(next);
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    // Only the main button drags: a right click opens the context menu, and its release may never arrive.
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const edge = (event.target as Element).closest?.('[data-edge]')?.getAttribute('data-edge');
    if (edge !== 'left' && edge !== 'right' && edge !== 'top' && edge !== 'bottom') return;
    const element = event.currentTarget;
    if (typeof element.setPointerCapture === 'function') element.setPointerCapture(event.pointerId);
    setDragging(edge);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragging !== null) moveTo(dragging, event.clientX, event.clientY);
  };

  const stop = () => setDragging(null);

  const x0 = crop.x;
  const y0 = crop.y;
  const x1 = crop.x + crop.w;
  const y1 = crop.y + crop.h;
  const midX = crop.x + crop.w / 2;
  const midY = crop.y + crop.h / 2;

  const geometry: Record<CropEdge, { hit: Rect; grip: Rect }> = {
    left: { hit: { x: x0 - hit / 2, y: y0, w: hit, h: crop.h }, grip: { x: x0 - gripShort / 2, y: midY - gripLong / 2, w: gripShort, h: gripLong } },
    right: { hit: { x: x1 - hit / 2, y: y0, w: hit, h: crop.h }, grip: { x: x1 - gripShort / 2, y: midY - gripLong / 2, w: gripShort, h: gripLong } },
    top: { hit: { x: x0, y: y0 - hit / 2, w: crop.w, h: hit }, grip: { x: midX - gripLong / 2, y: y0 - gripShort / 2, w: gripLong, h: gripShort } },
    bottom: { hit: { x: x0, y: y1 - hit / 2, w: crop.w, h: hit }, grip: { x: midX - gripLong / 2, y: y1 - gripShort / 2, w: gripLong, h: gripShort } },
  };

  return (
    <div className="pvs-ped-crop" style={{ aspectRatio: `${W} / ${H}` }}>
      {url !== null && <img className="pvs-ped-crop__image" src={url} alt={title} draggable={false} />}
      <svg
        ref={svg}
        className="pvs-ped-crop__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={stageLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
      >
        <path className="pvs-ped-crop__shade" d={`M0 0H${W}V${H}H0Z M${x0} ${y0}H${x1}V${y1}H${x0}Z`} />
        <rect className="pvs-ped-crop__frame" x={x0} y={y0} width={crop.w} height={crop.h} />
        {CROP_EDGES.map((edge) => {
          const range = cropEdgeRange(crop, edge, size);
          const value = cropEdgeValue(crop, edge);
          const { hit: area, grip } = geometry[edge];
          return (
            <g
              key={edge}
              data-edge={edge}
              role="slider"
              tabIndex={0}
              aria-label={edgeLabel(edge)}
              aria-orientation={edge === 'left' || edge === 'right' ? 'horizontal' : 'vertical'}
              aria-valuemin={Math.round(range.min)}
              aria-valuemax={Math.round(range.max)}
              aria-valuenow={Math.round(value)}
              aria-valuetext={valueText(Math.round(value))}
              className={`pvs-ped-crop__edge${dragging === edge ? ' is-dragging' : ''}`}
              onKeyDown={(event) => {
                const next = cropEdgeKey(crop, edge, event.key, event.shiftKey, size);
                if (next === null) return;
                event.preventDefault();
                onCrop(withCropEdge(crop, edge, next, size));
              }}
            >
              <rect className="pvs-ped-crop__hit" x={area.x} y={area.y} width={Math.max(1, area.w)} height={Math.max(1, area.h)} />
              <rect className="pvs-ped-crop__grip" x={grip.x} y={grip.y} width={grip.w} height={grip.h} rx={gripShort / 2} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export interface CropResultProps {
  url: string | null;
  size: Size;
  plan: Pick<NormalizationPlan, 'source' | 'dest'>;
  label: string;
}

/** The print the crop becomes: the source region drawn where the intake will draw it in 1720×1080. */
export const CropResult = ({ url, size, plan, label }: CropResultProps) => {
  const { source, dest } = plan;
  return (
    <svg className="pvs-ped-result" viewBox={`0 0 ${PRINT_SPACE.width} ${PRINT_SPACE.height}`} role="img" aria-label={label} data-prt-crop-result="">
      <rect className="pvs-ped-result__pad" x={0} y={0} width={PRINT_SPACE.width} height={PRINT_SPACE.height} />
      {url !== null && (
        <svg x={dest.x} y={dest.y} width={dest.w} height={dest.h} viewBox={`${source.x} ${source.y} ${Math.max(1, source.w)} ${Math.max(1, source.h)}`} preserveAspectRatio="none">
          <image href={url} x={0} y={0} width={size.width} height={size.height} preserveAspectRatio="none" />
        </svg>
      )}
    </svg>
  );
};
