import React, { createContext, useContext } from 'react';

/**
 * Where a Strato chart is being drawn (3.4.18, `docs/v3.4/DESIGN-STRATO-NATIVO-PLANO.md` §4.4).
 *
 * - `screen`: the platform's interactions — the toolbar (zoom, pan, "Download data"), the crosshair, the tooltip.
 * - `capture`: the Tech Wrapup's capture stage photographs the panel — no toolbar, no zoom, no pan, a fixed size.
 * - `print`: a printed page (the browser's PDF) — the same as `capture`.
 *
 * Every wrapper in `engine/strato/` reads it, so a page never decides it chart by chart.
 */
export type StratoMode = 'screen' | 'print' | 'capture';

const StratoModeContext = createContext<StratoMode>('screen');

export const StratoModeProvider = ({ mode, children }: { mode: StratoMode; children: React.ReactNode }) => (
  <StratoModeContext.Provider value={mode}>{children}</StratoModeContext.Provider>
);

export const useStratoMode = (): StratoMode => useContext(StratoModeContext);

/** True where the platform's chart interactions belong (the screen only). */
export const useInteractive = (): boolean => useStratoMode() === 'screen';

/**
 * Strato 3.18's XY charts (TimeseriesChart, CategoricalBarChart, TopList) draw their plot in an `<svg>` with no role or
 * name, beside a root that is already named (`aria-label`); the browser exposes that inner svg as an unnamed image.
 * The plot is decorative next to the named root and the figures the app writes in text, so the wrapper hides any
 * unnamed svg inside it from the accessibility tree — as the chart's own icons already are.
 */
export const useQuietPlotSvgs = (ref: React.RefObject<HTMLElement | null>): void => {
  React.useEffect(() => {
    const root = ref.current;
    if (root === null) return undefined;
    const quiet = () => {
      for (const svg of root.querySelectorAll('svg:not([aria-hidden]):not([role]):not([aria-label])')) svg.setAttribute('aria-hidden', 'true');
    };
    quiet();
    if (typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(quiet);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ref]);
};

/**
 * The width a canvas chart takes on a printed page (DN-8): fixed (the canvas does not follow the page when the browser
 * prints — a chart left at screen width made Chrome shrink the whole SE Report), never wider than the block it sits in
 * (a phone). `undefined` on screen and in a capture: the chart follows its container.
 */
export const usePrintWidth = (ref: React.RefObject<HTMLElement | null>, printWidth: number): number | undefined => {
  const mode = useStratoMode();
  const [room, setRoom] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (mode !== 'print' || element === null) return undefined;
    const measure = () => setRoom(element.clientWidth > 0 ? element.clientWidth : null);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mode, ref]);
  return mode === 'print' ? Math.min(printWidth, room ?? printWidth) : undefined;
};

/** jsdom (the unit tests) has no layout: every width reads 0 there, so charts are always drawn. */
const NO_LAYOUT = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

/**
 * Draws its children only once its block has a width (3.5.1): a Strato chart inside a hidden tab measures 0 px and
 * writes an invalid size (`<svg> width="-12"`, a console error on the Coverage page). The block is watched, so the
 * chart appears as soon as its tab is shown.
 */
export const WhenSized = ({ children, className, minHeight }: { children: React.ReactNode; className?: string; minHeight?: number }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [sized, setSized] = React.useState(NO_LAYOUT);
  React.useLayoutEffect(() => {
    if (NO_LAYOUT) return undefined;
    const element = ref.current;
    if (element === null) return undefined;
    const check = () => setSized(element.clientWidth > 0);
    check();
    if (typeof ResizeObserver === 'undefined') {
      setSized(true);
      return undefined;
    }
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    // Full width always: inside a centred grid or flex box an empty block shrinks to 0 px and would never be measured
    // wider (3.5.1's header gauges stayed blank on the tenant).
    <div ref={ref} className={className} style={{ width: '100%', ...(minHeight === undefined ? {} : { minHeight }) }}>
      {sized ? children : null}
    </div>
  );
};
