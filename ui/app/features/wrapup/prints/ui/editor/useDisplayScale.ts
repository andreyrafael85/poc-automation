import { useEffect, useState, type RefObject } from 'react';

/**
 * Screen pixels per unit of an SVG's viewBox as it is drawn now (letterbox included), followed
 * through resizes; 0 until it is laid out (and in a test DOM). The stages use it to keep their
 * touch targets at least `minTargetUnits(…)` wide on a phone, where a 1720-wide print is drawn
 * ~330 px wide.
 */
export function useDisplayScale(ref: RefObject<Element | null>, width: number, height: number): number {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    const measure = () => {
      const box = element.getBoundingClientRect();
      const next = Math.min(box.width / Math.max(1, width), box.height / Math.max(1, height));
      setScale(Number.isFinite(next) && next > 0 ? next : 0);
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, width, height]);
  return scale;
}

/** `px` screen pixels in viewBox units at this scale, never less than `floor` units. */
export function minTargetUnits(px: number, scale: number, floor: number): number {
  return scale > 0 ? Math.max(floor, px / scale) : floor;
}
