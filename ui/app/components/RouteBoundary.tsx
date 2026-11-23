import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { WarningIcon } from '@dynatrace/strato-icons';

import { Callout, Cluster, Stack } from '../engine';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The page that appears instead of a white screen (3.3.0, backlog TD-24 / A1).
 *
 * Until 3.2.7 a single render error anywhere below the shell unmounted the whole React tree: the
 * customer watched the app go blank in the middle of a meeting, with no way back but a reload that
 * loses the window and the scroll position. The two ways that happens in this app are a chunk that
 * fails to load (every page is `lazy()`, and after a redeploy the old chunk names are gone from the
 * CDN while the tab still holds the old index) and a page that trips over a shape the tenant
 * returned that no fixture had.
 *
 * The boundary is **per route**, not one around the app: the header, the navigation, the pager and
 * the footer keep working, so the recovery is one click on another stage rather than a reload.
 *
 * What it deliberately does not do: no telemetry (the app has no self-monitoring scope, TD-20) and
 * no error text from the exception in the body — a stack trace can carry an entity name or a URL
 * from the tenant. The message is shown only in the collapsed technical line, which is the same
 * text the browser console already has.
 */

interface RouteBoundaryProps {
  /** Changes when the route changes, so a boundary that caught an error is armed again. */
  resetKey: string;
  children: ReactNode;
}

interface RouteBoundaryState {
  failed: boolean;
  detail: string | null;
  /** The address the current state belongs to, so the reset happens during render, not after it. */
  seenKey: string;
}

/** The body of the fallback, split out so it can use hooks (a boundary has to be a class). */
const Fallback = ({ detail, onRetry }: { detail: string | null; onRetry: () => void }) => {
  const { t } = useTranslation();
  return (
    <Stack gap="section">
      <Callout kind="limitation">
        <Stack gap="tight">
          <Cluster gap="tight">
            <WarningIcon aria-hidden="true" />
            {/* The fallback replaces the whole route, so it carries the page's one h1. */}
            <Heading level={3} as="h1">
              {t('boundary.title')}
            </Heading>
          </Cluster>
          <Paragraph>{t('boundary.body')}</Paragraph>
          <Cluster>
            <Button variant="emphasized" onClick={onRetry}>
              {t('boundary.retry')}
            </Button>
            <Button onClick={() => window.location.reload()}>{t('boundary.reload')}</Button>
          </Cluster>
          {detail !== null && (
            <details>
              <summary>
                <Text as="span">{t('boundary.technical')}</Text>
              </summary>
              <Text className="pvs-caption pvs-wrap">{detail}</Text>
            </details>
          )}
        </Stack>
      </Callout>
    </Stack>
  );
};

export class RouteBoundary extends Component<RouteBoundaryProps, RouteBoundaryState> {
  override state: RouteBoundaryState = { failed: false, detail: null, seenKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<RouteBoundaryState> {
    const message = error instanceof Error ? error.message : String(error);
    return { failed: true, detail: message === '' ? null : message };
  }

  /**
   * Leaving the route that failed arms the boundary again, so the next page renders normally.
   *
   * This runs **during** render, not in `componentDidUpdate`: resetting afterwards meant the first
   * render for the new address still returned the fallback and React committed it, flashing "This
   * section could not be drawn" over a page that was fine and costing the new page a render pass
   * before it could mount.
   */
  static getDerivedStateFromProps(props: RouteBoundaryProps, state: RouteBoundaryState): Partial<RouteBoundaryState> | null {
    if (props.resetKey === state.seenKey) return null;
    return { failed: false, detail: null, seenKey: props.resetKey };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // The console is the only sink the app has; nothing is sent anywhere (the app declares no
    // self-monitoring, backlog TD-20).
    console.error('[PoC Automation 3.0] a page failed to render', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <Fallback detail={this.state.detail} onRetry={() => this.setState({ failed: false, detail: null })} />;
  }
}
