import React from 'react';

/**
 * Layout primitives.
 *
 * Thin wrappers that put the engine's four-step rhythm and its container-query
 * grid behind a typed prop, so a page asks for `gap="section"` instead of
 * inventing a number. They deliberately do **not** replace Strato's `Flex` and
 * `Grid`: those remain valid wherever a page already uses them. These exist for
 * the cases Strato's props cannot express — an auto-fitting grid that cannot
 * overflow a narrow container, a main-plus-aside split that stacks on its own,
 * and a canvas whose breakpoints follow the content width rather than the
 * viewport.
 */

export type Gap = 'tight' | 'group' | 'section' | 'chapter';

const GAP_VAR: Record<Gap, string> = {
  tight: 'var(--pvs-gap-tight)',
  group: 'var(--pvs-gap-group)',
  section: 'var(--pvs-gap-section)',
  chapter: 'var(--pvs-gap-chapter)',
};

type Tag = 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'ul' | 'ol' | 'nav' | 'main';

interface BoxProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  as?: Tag;
  gap?: Gap;
  children?: React.ReactNode;
}

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function box(baseClass: string, extraStyle?: (props: BoxProps) => React.CSSProperties) {
  const Component = ({ as: Element = 'div', gap, className, style, children, ...rest }: BoxProps) => {
    const merged: React.CSSProperties = {
      ...(gap !== undefined ? ({ '--pvs-gap': GAP_VAR[gap] } as React.CSSProperties) : {}),
      ...extraStyle?.({ gap, ...rest }),
      ...style,
    };
    return React.createElement(
      Element,
      { ...rest, className: cx(baseClass, className), style: merged },
      children,
    );
  };
  return Component;
}

/** Vertical flow with a rhythm gap. */
export const Stack = box('pvs-stack');

export interface ClusterProps extends BoxProps {
  align?: 'start' | 'center' | 'end' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between';
}

const ALIGN: Record<NonNullable<ClusterProps['align']>, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
};

const JUSTIFY: Record<NonNullable<ClusterProps['justify']>, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
};

/** Horizontal flow that wraps instead of overflowing. */
export const Cluster = ({ align, justify, style, ...rest }: ClusterProps) => {
  const inner = box('pvs-cluster');
  const merged: React.CSSProperties = {
    ...(align !== undefined ? ({ '--pvs-align': ALIGN[align] } as React.CSSProperties) : {}),
    ...(justify !== undefined ? ({ '--pvs-justify': JUSTIFY[justify] } as React.CSSProperties) : {}),
    ...style,
  };
  return inner({ ...rest, style: merged });
};

export interface GridProps extends BoxProps {
  /** Narrowest a cell may get, in pixels, before the grid drops a column. */
  min?: number;
}

/** An auto-fitting grid. Never overflows its container, however narrow. */
export const Grid = ({ min, style, ...rest }: GridProps) => {
  const inner = box('pvs-grid');
  const merged: React.CSSProperties = {
    ...(min !== undefined ? ({ '--pvs-min': `${min}px` } as React.CSSProperties) : {}),
    ...style,
  };
  return inner({ ...rest, style: merged });
};

/** A main column with a supporting aside; stacks when the content area is narrow. */
export const Split = box('pvs-split');

export interface PageCanvasProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  density?: 'default' | 'compact';
  children?: React.ReactNode;
}

/**
 * The content canvas of a page: a centred, width-capped column that establishes
 * the container every `@container pvs-page` rule in the stylesheet measures.
 */
export const PageCanvas = ({ density = 'default', className, children, ...rest }: PageCanvasProps) => (
  <div {...rest} className={cx('pvs-page', className)} data-density={density}>
    {children}
  </div>
);
