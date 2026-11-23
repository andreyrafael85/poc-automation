/**
 * Value Evidence Experience — the engine.
 *
 * A composition and standardisation layer over Strato. Pages and shared
 * components import from here; nothing in the app reaches for a raw colour, a
 * pixel radius or a bespoke shadow. See `docs/v3.1/DESIGN-SYSTEM.md`.
 */

import './engine.css';
import './viz.css';

export { Callout, type CalloutKind, type CalloutProps } from './Callout';
export {
  EVIDENCE,
  EVIDENCE_ORDER,
  evidenceAttribute,
  type EvidenceClass,
  type EvidenceFamily,
} from './evidence';
export { Figure, type FigureProps, type FigureSize } from './Figure';
export {
  Cluster,
  Grid,
  PageCanvas,
  Split,
  Stack,
  type ClusterProps,
  type Gap,
  type GridProps,
  type PageCanvasProps,
} from './layout';
export { Panel, type PanelPadding, type PanelProps } from './Panel';
export {
  BORDER,
  BREAKPOINT,
  MOTION,
  RADIUS,
  SHADOW,
  SPACE,
  SPACE_PX,
  SURFACE,
  TONE,
} from './tokens';
